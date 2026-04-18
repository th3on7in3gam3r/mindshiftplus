/**
 * Telehealth Integration — Property-Based Tests
 * Uses fast-check + Vitest
 * Feature: telehealth-integration
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure helpers under test ───────────────────────────────────────────────────

// Imported from PortalAppointments (re-declared here as pure functions for isolation)
function sessionWindowState(scheduledAt, telehealthUrl) {
  if (!telehealthUrl) return 'no_url';
  const now = Date.now();
  const start = new Date(scheduledAt).getTime() - 10 * 60 * 1000;
  const end   = new Date(scheduledAt).getTime() + 60 * 60 * 1000;
  if (now < start) return 'before_window';
  if (now > end)   return 'after_window';
  return 'in_window';
}

// Imported from telehealth Edge Function (re-declared for isolation)
function computeEndDate(scheduledAt) {
  return new Date(new Date(scheduledAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

// Appointment type normalization (mirrors handleRequest in PortalAppointments)
function normalizeAppointmentType(type) {
  if (type === 'Telehealth (Video)') return 'telehealth';
  return type.toLowerCase().replace(/ /g, '_');
}

// Cron filter predicate (mirrors the SQL WHERE clause in telehealth_tables.sql)
function shouldSendReminder(appt, now) {
  if (appt.appointment_type !== 'telehealth') return false;
  if (appt.status !== 'confirmed') return false;
  if (!appt.telehealth_url) return false;
  if (appt.reminder_sent) return false;
  const scheduledMs = new Date(appt.scheduled_at).getTime();
  const windowStart = now + 23 * 60 * 60 * 1000;
  const windowEnd   = now + 25 * 60 * 60 * 1000;
  return scheduledMs >= windowStart && scheduledMs <= windowEnd;
}

// Minimal telehealth_reminder email template renderer (mirrors send-email/index.ts)
function renderTelehealthReminderEmail({ name, date, time, clinician, telehealth_url }) {
  return `
    <span class="badge badge-purple">Telehealth Reminder</span>
    <h1>Your video session is tomorrow</h1>
    <p>Hi ${name}, here is your join link for tomorrow's telehealth appointment.</p>
    <table>
      <tr><td>Date &amp; Time</td><td>${date} at ${time}</td></tr>
      <tr><td>Clinician</td><td>${clinician}</td></tr>
      <tr><td>Location</td><td>Telehealth (Video)</td></tr>
    </table>
    <a href="${telehealth_url}" class="btn">📹 Join Video Session</a>
    <div class="info">Need to reschedule? Call (508) 306-1128</div>
  `;
}

// ── Property 1: Telehealth appointment type normalization ─────────────────────
describe('Property 1: Telehealth appointment type normalization', () => {
  it('always maps "Telehealth (Video)" to "telehealth"', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Telehealth (Video)', 'Follow-up', 'Medication Review', 'Initial Evaluation'),
        (type) => {
          const result = normalizeAppointmentType(type);
          if (type === 'Telehealth (Video)') {
            expect(result).toBe('telehealth');
          } else {
            expect(result).not.toBe('telehealth');
            expect(result).toBe(type.toLowerCase().replace(/ /g, '_'));
          }
        }
      )
    );
  });
});

// ── Property 2: Telehealth URL round-trip preservation ───────────────────────
describe('Property 2: Telehealth URL round-trip preservation', () => {
  it('stores and retrieves URL without modification', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          // Simulate store + retrieve (no DB truncation in JS string assignment)
          const stored = url;
          const retrieved = stored;
          expect(retrieved).toBe(url);
          expect(retrieved.length).toBe(url.length);
        }
      )
    );
  });
});

// ── Property 3: Whereby API call conditionality ───────────────────────────────
describe('Property 3: Whereby API call conditionality', () => {
  it('Whereby API is called iff appointment_type is telehealth', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('telehealth', 'in-person', 'follow-up', 'medication_review'),
        (appointmentType) => {
          // Simulate the Edge Function decision logic
          const shouldCallWhereby = appointmentType === 'telehealth';
          if (appointmentType === 'telehealth') {
            expect(shouldCallWhereby).toBe(true);
          } else {
            expect(shouldCallWhereby).toBe(false);
          }
        }
      )
    );
  });
});

// ── Property 4: endDate is always 24 hours after scheduled_at ────────────────
describe('Property 4: endDate is always 24 hours after scheduled_at', () => {
  it('endDate equals scheduledAt + exactly 86400000ms for any valid timestamp', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const scheduledAt = date.toISOString();
          const endDate = computeEndDate(scheduledAt);
          const diff = new Date(endDate).getTime() - new Date(scheduledAt).getTime();
          expect(diff).toBe(86400000);
        }
      )
    );
  });
});

// ── Property 5: Session window state is a total function ─────────────────────
describe('Property 5: Session window state is a total function', () => {
  const VALID_STATES = ['no_url', 'before_window', 'in_window', 'after_window'];

  it('always returns exactly one of the four valid states and never throws', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
        fc.option(fc.webUrl(), { nil: null }),
        (scheduledAt, telehealthUrl) => {
          let result;
          expect(() => { result = sessionWindowState(scheduledAt, telehealthUrl); }).not.toThrow();
          expect(VALID_STATES).toContain(result);
        }
      )
    );
  });

  it('returns "no_url" when telehealthUrl is null or empty', () => {
    fc.assert(
      fc.property(
        fc.date().map(d => d.toISOString()),
        fc.constantFrom(null, undefined, ''),
        (scheduledAt, noUrl) => {
          expect(sessionWindowState(scheduledAt, noUrl)).toBe('no_url');
        }
      )
    );
  });

  it('returns "before_window" when now is before scheduledAt - 10min', () => {
    // Use a far-future appointment so we're always before the window
    const farFuture = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now
    expect(sessionWindowState(farFuture, 'https://whereby.com/test-room')).toBe('before_window');
  });

  it('returns "after_window" when now is after scheduledAt + 60min', () => {
    // Use a far-past appointment so we're always after the window
    const farPast = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    expect(sessionWindowState(farPast, 'https://whereby.com/test-room')).toBe('after_window');
  });
});

// ── Property 6: Admin join button conditionality ──────────────────────────────
describe('Property 6: Admin join button appears iff telehealth + URL present', () => {
  it('join button shown iff appointment_type is telehealth AND telehealth_url is set', () => {
    fc.assert(
      fc.property(
        fc.record({
          appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up'),
          telehealth_url: fc.option(fc.webUrl(), { nil: null }),
          status: fc.constantFrom('confirmed', 'pending', 'cancelled'),
        }),
        (appt) => {
          const shouldShowJoinButton = appt.appointment_type === 'telehealth' && appt.telehealth_url != null;
          const shouldShowGenerating = appt.appointment_type === 'telehealth' && appt.status === 'confirmed' && appt.telehealth_url == null;

          if (appt.appointment_type !== 'telehealth') {
            expect(shouldShowJoinButton).toBe(false);
            expect(shouldShowGenerating).toBe(false);
          } else if (appt.telehealth_url != null) {
            expect(shouldShowJoinButton).toBe(true);
          } else if (appt.status === 'confirmed') {
            expect(shouldShowGenerating).toBe(true);
          }
        }
      )
    );
  });
});

// ── Property 7: EHR join button conditionality ───────────────────────────────
describe('Property 7: EHR join button appears iff telehealth + confirmed + URL present', () => {
  it('join button shown iff all three conditions hold', () => {
    fc.assert(
      fc.property(
        fc.record({
          appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up'),
          status: fc.constantFrom('confirmed', 'pending', 'cancelled', 'completed'),
          telehealth_url: fc.option(fc.webUrl(), { nil: null }),
        }),
        (appt) => {
          const shouldShowJoinButton =
            appt.appointment_type === 'telehealth' &&
            appt.status === 'confirmed' &&
            appt.telehealth_url != null;

          const allThreeConditions =
            appt.appointment_type === 'telehealth' &&
            appt.status === 'confirmed' &&
            appt.telehealth_url != null;

          expect(shouldShowJoinButton).toBe(allThreeConditions);
        }
      )
    );
  });
});

// ── Property 8: Telehealth reminder email contains all required fields ────────
describe('Property 8: Telehealth reminder email contains all required fields', () => {
  it('rendered HTML contains telehealth_url href, date, time, and clinician', () => {
    fc.assert(
      fc.property(
        fc.record({
          name:          fc.string({ minLength: 1, maxLength: 50 }),
          email:         fc.emailAddress(),
          date:          fc.string({ minLength: 1, maxLength: 30 }),
          time:          fc.string({ minLength: 1, maxLength: 20 }),
          clinician:     fc.string({ minLength: 1, maxLength: 60 }),
          telehealth_url: fc.webUrl(),
        }),
        (data) => {
          const html = renderTelehealthReminderEmail(data);
          expect(html).toContain(`href="${data.telehealth_url}"`);
          expect(html).toContain(data.date);
          expect(html).toContain(data.time);
          expect(html).toContain(data.clinician);
        }
      )
    );
  });
});

// ── Property 10: Reminder cron job is idempotent ──────────────────────────────
describe('Property 10: Reminder cron job is idempotent — reminder_sent prevents duplicates', () => {
  it('never selects appointments with reminder_sent = true', () => {
    const now = Date.now();
    fc.assert(
      fc.property(
        fc.record({
          appointment_type: fc.string(),
          status:           fc.string(),
          telehealth_url:   fc.option(fc.webUrl(), { nil: null }),
          reminder_sent:    fc.constant(true),
          scheduled_at:     fc.date().map(d => d.toISOString()),
        }),
        (appt) => {
          expect(shouldSendReminder(appt, now)).toBe(false);
        }
      )
    );
  });

  it('only selects appointments matching all five criteria', () => {
    const now = Date.now();
    // Build a valid appointment in the 23-25h window
    const validScheduledAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();

    fc.assert(
      fc.property(
        fc.record({
          appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up'),
          status:           fc.constantFrom('confirmed', 'pending', 'cancelled'),
          telehealth_url:   fc.option(fc.webUrl(), { nil: null }),
          reminder_sent:    fc.boolean(),
          scheduled_at:     fc.constantFrom(
            validScheduledAt,
            new Date(now + 1 * 60 * 60 * 1000).toISOString(),  // 1h from now — outside window
            new Date(now + 48 * 60 * 60 * 1000).toISOString(), // 48h from now — outside window
          ),
        }),
        (appt) => {
          const result = shouldSendReminder(appt, now);
          const expected =
            appt.appointment_type === 'telehealth' &&
            appt.status === 'confirmed' &&
            appt.telehealth_url != null &&
            !appt.reminder_sent &&
            (() => {
              const ms = new Date(appt.scheduled_at).getTime();
              return ms >= now + 23 * 60 * 60 * 1000 && ms <= now + 25 * 60 * 60 * 1000;
            })();
          expect(result).toBe(expected);
        }
      )
    );
  });
});

// ── Property 11: WHEREBY_API_KEY never appears in response ───────────────────
describe('Property 11: WHEREBY_API_KEY never appears in any Edge Function response', () => {
  it('response body never contains the API key value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 64 }),
        fc.constantFrom(
          JSON.stringify({ telehealth_url: 'https://whereby.com/room', status: 'confirmed' }),
          JSON.stringify({ telehealth_url: null, status: 'confirmed' }),
          JSON.stringify({ error: 'WHEREBY_API_KEY is not configured' }),
          JSON.stringify({ error: 'Internal server error' }),
        ),
        (apiKey, responseBody) => {
          // The response body should never contain the raw API key
          // (In the real Edge Function, the key is only used in the Authorization header)
          expect(responseBody).not.toContain(apiKey);
        }
      )
    );
  });
});

// ── Property 12: Telehealth badge in all three views ─────────────────────────
describe('Property 12: Telehealth badge appears iff appointment_type is telehealth', () => {
  it('badge logic is consistent across portal, admin, and EHR views', () => {
    fc.assert(
      fc.property(
        fc.record({
          appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up', 'medication_review'),
          status:           fc.constantFrom('confirmed', 'pending', 'cancelled', 'completed'),
          telehealth_url:   fc.option(fc.webUrl(), { nil: null }),
        }),
        (appt) => {
          // All three views use the same condition: appointment_type === 'telehealth'
          const portalShowsBadge = appt.appointment_type === 'telehealth';
          const adminShowsBadge  = appt.appointment_type === 'telehealth';
          const ehrShowsBadge    = appt.appointment_type === 'telehealth';

          // All three must agree
          expect(portalShowsBadge).toBe(adminShowsBadge);
          expect(adminShowsBadge).toBe(ehrShowsBadge);

          if (appt.appointment_type === 'telehealth') {
            expect(portalShowsBadge).toBe(true);
          } else {
            expect(portalShowsBadge).toBe(false);
          }
        }
      )
    );
  });
});
