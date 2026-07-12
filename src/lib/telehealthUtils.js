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
