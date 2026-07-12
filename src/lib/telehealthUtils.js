/** Shared telehealth helpers (Whereby video sessions on appointments). */

/** Whereby rooms expire ~25h after scheduledAt (24h endDate + 1h deactivation). */
export function isTelehealthRoomExpired(scheduledAt) {
  if (!scheduledAt) return true;
  const expiresAt = new Date(scheduledAt).getTime() + 25 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export function isUsableTelehealthUrl(url, scheduledAt) {
  return !!url && !isTelehealthRoomExpired(scheduledAt);
}

export function sessionWindowState(scheduledAt, telehealthUrl) {
  if (!telehealthUrl) return "no_url";
  const now = Date.now();
  const start = new Date(scheduledAt).getTime() - 10 * 60 * 1000;
  const end = new Date(scheduledAt).getTime() + 60 * 60 * 1000;
  if (now < start) return "before_window";
  if (now > end) return "after_window";
  return "in_window";
}

export function isTelehealthAppointment(appt) {
  const t = String(appt?.appointment_type ?? "").toLowerCase();
  return t === "telehealth" || t.includes("telehealth");
}

/** Best telehealth appointment for AI Scribe / clinician join — prefers date of service, then nearest upcoming. */
export function pickTelehealthAppointment(appointments, serviceDate) {
  const tele = (appointments ?? []).filter(
    (a) => isTelehealthAppointment(a) && a.status !== "cancelled"
  );
  if (!tele.length) return null;

  if (serviceDate) {
    const sameDay = tele.filter((a) => a.scheduled_at?.slice(0, 10) === serviceDate);
    const withUrl = sameDay.filter((a) => isUsableTelehealthUrl(a.telehealth_url, a.scheduled_at));
    if (withUrl.length) {
      return withUrl.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];
    }
    if (sameDay.length) {
      return sameDay.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];
    }
  }

  const now = Date.now();
  const upcoming = tele
    .filter((a) => new Date(a.scheduled_at).getTime() >= now - 70 * 60 * 1000)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (upcoming.length) return upcoming[0];

  return tele.find((a) => isUsableTelehealthUrl(a.telehealth_url, a.scheduled_at)) ?? tele[0];
}

export function formatApptDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Common telehealth session lengths (minutes) — clinician picks in Scribe. */
export const SESSION_DURATION_OPTIONS = [30, 45, 50, 60, 90];

export const DEFAULT_SESSION_DURATION_MINUTES = 45;

export function formatCountdownMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Countdown state for clinician + patient UI. */
export function getSessionTimerState(appt, nowMs = Date.now()) {
  const durationMin = appt?.session_duration_minutes;
  if (!durationMin || durationMin <= 0) {
    return { phase: "no_duration", durationMin: null, remainingMs: null, label: null };
  }
  const startedAt = appt?.session_timer_started_at;
  if (!startedAt) {
    return {
      phase: "waiting",
      durationMin,
      remainingMs: durationMin * 60 * 1000,
      label: `${durationMin} min reserved`,
      hint: "Timer starts when the patient joins the video session.",
    };
  }
  const endMs = new Date(startedAt).getTime() + durationMin * 60 * 1000;
  const remainingMs = endMs - nowMs;
  if (remainingMs <= 0) {
    return {
      phase: "ended",
      durationMin,
      remainingMs: 0,
      label: "Session time complete",
      hint: "Wrap up or extend the visit as needed.",
    };
  }
  return {
    phase: "active",
    durationMin,
    remainingMs,
    label: formatCountdownMs(remainingMs),
    hint: "Time remaining in this session.",
  };
}

