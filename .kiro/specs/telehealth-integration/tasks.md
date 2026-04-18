# Implementation Plan: Telehealth Integration

## Overview

Implement Phase 6 telehealth video sessions using Whereby. The work spans four layers: a database migration adding two columns and a pg_cron reminder job, a new `telehealth` Supabase Edge Function that proxies the Whereby REST API, a new email type in the existing `send-email` Edge Function, and UI changes to three existing React components.

## Tasks

- [x] 1. Database migration — add telehealth columns and pg_cron reminder job
  - Create `supabase/migrations/telehealth_tables.sql`
  - `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telehealth_url text`
  - `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false`
  - `CREATE EXTENSION IF NOT EXISTS pg_cron` and `CREATE EXTENSION IF NOT EXISTS pg_net`
  - Add `cron.schedule('send-telehealth-reminders', '0 * * * *', ...)` with the `net.http_post` body that queries appointments where `appointment_type = 'telehealth'`, `status = 'confirmed'`, `telehealth_url IS NOT NULL`, `reminder_sent = false`, and `scheduled_at BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'`, then sets `reminder_sent = true`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

- [-] 2. New `telehealth` Supabase Edge Function
  - [x] 2.1 Create `supabase/functions/telehealth/index.ts`
    - Copy CORS headers pattern from `ai-proxy/index.ts`
    - Read `WHEREBY_API_KEY` from `Deno.env.get`; return HTTP 500 `{ error: "WHEREBY_API_KEY is not configured" }` if missing
    - Parse `{ appointmentId, scheduledAt }` from POST body
    - Compute `endDate` as `new Date(new Date(scheduledAt).getTime() + 24 * 60 * 60 * 1000).toISOString()`
    - `POST https://api.whereby.dev/v1/meetings` with `{ endDate, roomMode: "group", isLocked: false }` and `Authorization: Bearer <WHEREBY_API_KEY>`
    - On success: use Supabase service-role client to `UPDATE appointments SET telehealth_url = roomUrl, status = 'confirmed'` where `id = appointmentId`; return `{ telehealth_url, status: "confirmed" }`
    - On Whereby failure: log error, update `status = 'confirmed'` only (leave `telehealth_url` null), return `{ telehealth_url: null, status: "confirmed" }`
    - Never include `WHEREBY_API_KEY` value in any response body
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 8.1, 8.2, 8.3, 8.4_

  - [ ] 2.2 Write property test for endDate calculation (Property 4)
    - **Property 4: endDate is always 24 hours after scheduled_at**
    - Use `fc.date()` to generate random timestamps; extract the `endDate` computation into a pure helper `computeEndDate(scheduledAt: string): string`; assert `new Date(endDate).getTime() - new Date(scheduledAt).getTime() === 86400000` for all inputs
    - **Validates: Requirements 3.5**

  - [ ] 2.3 Write property test for Whereby API call conditionality (Property 3)
    - **Property 3: Whereby API call conditionality**
    - Use `fc.constantFrom('telehealth', 'in-person', 'follow-up', 'medication_review')` to generate appointment types; mock `fetch`; assert Whereby API is called iff `appointment_type === 'telehealth'`
    - **Validates: Requirements 3.1, 3.4**

  - [ ] 2.4 Write property test for API key not leaked in response (Property 11)
    - **Property 11: WHEREBY_API_KEY never appears in any Edge Function response**
    - Generate various request scenarios (success, Whereby failure, missing key); assert response body string does not contain the `WHEREBY_API_KEY` value
    - **Validates: Requirements 8.2**

- [x] 3. Checkpoint — verify migration and Edge Function structure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add `telehealth_reminder` email type to `send-email` Edge Function
  - [x] 4.1 Modify `supabase/functions/send-email/index.ts`
    - Add `case "telehealth_reminder":` to the switch statement before the `default:` case
    - Destructure `{ name, email, date, time, clinician, telehealth_url }` from `data`
    - Guard with `if (!email) break`
    - Call `sendEmail(email, "Your Telehealth Session is Tomorrow — MindShift Wellness Clinic", base(...))` using the `badge-purple` badge, a `<h1>` heading, a `<table class="dt">` with date/time/clinician/location rows, an `<a href="${telehealth_url}" class="btn">📹 Join Video Session</a>` CTA, and an `<div class="info">` with join instructions
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 4.2 Write property test for email template rendering (Property 8)
    - **Property 8: Telehealth reminder email contains all required fields**
    - Use `fc.record({ name: fc.string(), email: fc.emailAddress(), date: fc.string(), time: fc.string(), clinician: fc.string(), telehealth_url: fc.webUrl() })` to generate inputs; extract the template rendering into a pure function; assert the output HTML contains an `<a>` with `href` equal to `telehealth_url`, the `date` string, the `time` string, and the `clinician` string
    - **Validates: Requirements 7.2, 7.3**

- [x] 5. Add `emailTelehealthReminder` to `emailService.js`
  - Modify `src/lib/emailService.js` — append `export const emailTelehealthReminder = (data) => send("telehealth_reminder", data);`
  - _Requirements: 7.4_

- [x] 6. Update `PortalAppointments.jsx` — telehealth type, session window, badges
  - [x] 6.1 Add `sessionWindowState` pure helper and "Telehealth (Video)" type option
    - Add `"Telehealth (Video)"` to the `TYPES` array
    - In `handleRequest`, normalize the submitted type: if `form.appointment_type === "Telehealth (Video)"`, store `appointment_type: 'telehealth'`
    - Add the `sessionWindowState(scheduledAt, telehealthUrl)` pure function (returns `"no_url" | "before_window" | "in_window" | "after_window"`) as defined in the design
    - _Requirements: 1.1, 1.2_

  - [ ] 6.2 Write property test for sessionWindowState (Property 5)
    - **Property 5: Session window state is a total function of time and URL**
    - Use `fc.record({ scheduledAt: fc.date().map(d => d.toISOString()), telehealthUrl: fc.option(fc.webUrl()) })` to generate inputs; assert the function always returns exactly one of the four valid states and never throws; assert boundary conditions: `now < start → "before_window"`, `start ≤ now ≤ end → "in_window"`, `now > end → "after_window"`, `!telehealthUrl → "no_url"`
    - **Validates: Requirements 4.1, 4.3, 4.4**

  - [ ] 6.3 Write property test for appointment type normalization (Property 1)
    - **Property 1: Telehealth appointment type normalization**
    - Use `fc.constantFrom("Telehealth (Video)", "Follow-up", "Medication Review", "Initial Evaluation")` to generate form submission types; run through the normalization logic; assert that `"Telehealth (Video)"` always maps to `'telehealth'` and other types are lowercased/underscored as before
    - **Validates: Requirements 1.2**

  - [x] 6.4 Render telehealth badge and session window UI in `DayDetail` and list view
    - In `DayDetail`: for each appointment where `a.appointment_type === 'telehealth'`, show a 📹 badge next to the appointment type label
    - In `DayDetail`: below the appointment details, call `sessionWindowState(a.scheduled_at, a.telehealth_url)` and render: `"in_window"` → `<button onClick={() => window.open(a.telehealth_url, '_blank')}>📹 Join Video Session</button>`; `"before_window"` → `<span>Session opens 10 min before your appointment</span>`; `"no_url"` → `<span>Video link coming soon</span>`; `"after_window"` → nothing
    - In the list view `upcoming.map(...)` card: same 📹 badge and session window UI
    - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1_

  - [ ] 6.5 Write property test for join button conditionality in portal (Property 5 — UI layer)
    - **Property 5 (UI): Portal renders correct element for each session window state**
    - Generate appointments with varying `appointment_type`, `telehealth_url`, and `scheduled_at`; render `DayDetail` with `@testing-library/react`; assert join button present iff `sessionWindowState` returns `"in_window"`, pre-window message present iff `"before_window"`, placeholder present iff `"no_url"`, nothing rendered iff `"after_window"`
    - **Validates: Requirements 4.1, 4.3, 4.4**

- [x] 7. Checkpoint — verify portal telehealth UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update `AdminSchedule.jsx` — telehealth confirmation flow, join button, badge
  - [x] 8.1 Modify `handleStatus` in `AppointmentsTab` to call the `telehealth` Edge Function on confirm
    - When `status === "confirmed"` and `a.appointment_type === "telehealth"`: call `supabase.functions.invoke('telehealth', { body: { appointmentId: a.id, scheduledAt: a.scheduled_at } })` instead of calling `updateAppointmentStatus` directly
    - After the Edge Function responds, call `emailTelehealthReminder({ name, email, date, time, clinician, telehealth_url: response.telehealth_url })` (import `emailTelehealthReminder` from `emailService`)
    - For non-telehealth confirmations, keep the existing `updateAppointmentStatus` + `emailAppointmentConfirmed` flow unchanged
    - _Requirements: 3.1, 7.5_

  - [x] 8.2 Render telehealth badge and join button on appointment cards
    - In the appointment card render: for `a.appointment_type === 'telehealth'`, show a 📹 badge next to the patient name / `StatusBadge`
    - For confirmed telehealth appointments: if `a.telehealth_url` is set, show `<button onClick={() => window.open(a.telehealth_url, '_blank')}>📹 Join Video Session</button>`; if `a.telehealth_url` is null, show `<span>Generating link…</span>`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.2_

  - [ ] 8.3 Write property test for admin join button conditionality (Property 6)
    - **Property 6: Admin join button appears if and only if telehealth + URL present**
    - Use `fc.record({ appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up'), telehealth_url: fc.option(fc.webUrl()), status: fc.constantFrom('confirmed', 'pending', 'cancelled') })` to generate appointment objects; render the appointment card; assert join button present iff `appointment_type === 'telehealth' && telehealth_url != null`
    - **Validates: Requirements 5.1, 5.4**

- [x] 9. Update `EHRPatientChart.jsx` — telehealth badge and join button in `AppointmentsTab`
  - [x] 9.1 Modify `AppointmentsTab` component to show telehealth badge and join button
    - For each appointment where `a.appointment_type === 'telehealth'`: show a 📹 badge next to the appointment type/date
    - For appointments where `a.appointment_type === 'telehealth'` AND `a.status === 'confirmed'` AND `a.telehealth_url` is non-null: show `<button onClick={() => window.open(a.telehealth_url, '_blank')}>📹 Join Video Session</button>`
    - _Requirements: 6.1, 6.2, 6.3, 9.3_

  - [ ] 9.2 Write property test for EHR join button conditionality (Property 7)
    - **Property 7: EHR join button appears if and only if telehealth + confirmed + URL present**
    - Use `fc.record({ appointment_type: fc.constantFrom('telehealth', 'in-person'), status: fc.constantFrom('confirmed', 'pending', 'cancelled', 'completed'), telehealth_url: fc.option(fc.webUrl()) })` to generate appointment objects; render `AppointmentsTab`; assert join button present iff all three conditions hold
    - **Validates: Requirements 6.1, 6.3**

- [ ] 10. Write property test for telehealth badge in all three views (Property 12)
  - [ ] 10.1 Write property test for telehealth badge across all views (Property 12)
    - **Property 12: Telehealth badge appears in all three views for any telehealth appointment**
    - Use `fc.record({ appointment_type: fc.constantFrom('telehealth', 'in-person', 'follow-up'), ...otherFields })` to generate appointments; render `DayDetail` (portal), the admin appointment card, and `AppointmentsTab` (EHR); assert 📹 badge present iff `appointment_type === 'telehealth'` in each view
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 11. Write property test for URL round-trip preservation (Property 2)
  - [ ] 11.1 Write property test for telehealth URL round-trip (Property 2)
    - **Property 2: Telehealth URL round-trip preservation**
    - Use `fc.webUrl()` with `fc.string()` path segments to generate URLs of varying length and structure; mock the Supabase client `update` call to capture the stored value; assert the retrieved value equals the input without truncation or modification
    - **Validates: Requirements 2.2**

- [ ] 12. Write property test for reminder cron idempotency (Property 10)
  - [ ] 12.1 Write property test for reminder cron idempotency (Property 10)
    - **Property 10: Reminder cron job is idempotent — reminder_sent prevents duplicates**
    - Extract the cron filter predicate into a pure JS function `shouldSendReminder(appt, now)`; use `fc.record({ appointment_type: fc.string(), status: fc.string(), telehealth_url: fc.option(fc.webUrl()), reminder_sent: fc.boolean(), scheduled_at: fc.date().map(d => d.toISOString()) })` to generate appointment rows; assert that any row with `reminder_sent = true` is never selected, and that only rows matching all five criteria are selected
    - **Validates: Requirements 7.8, 7.10**

- [x] 13. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with Vitest (`fc` arbitraries)
- Each property test references its property number from the design document for traceability
- The `sessionWindowState` function must be extracted as a standalone export so it can be tested independently of React
- The `computeEndDate` helper in the Edge Function should similarly be extracted for unit testing
- The `shouldSendReminder` predicate mirrors the SQL WHERE clause and should be kept in sync with the migration
