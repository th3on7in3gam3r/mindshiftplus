// ── Email Service — calls Supabase Edge Function → Resend ─────────────────────
const EMAIL_FN = `https://dhuswldjuuhtxejnmfla.supabase.co/functions/v1/send-email`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function send(type, data) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    await fetch(EMAIL_FN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Authorization": `Bearer ${KEY}`,
      },
      body: JSON.stringify({ type, data }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (e) {
    // Non-blocking — email failure never stops the main action
    console.warn("Email send failed (non-blocking):", e.message);
  }
}

export const emailAppointmentRequested  = (data) => send("appointment_requested",  data);
export const emailAppointmentConfirmed  = (data) => send("appointment_confirmed",  data);
export const emailAppointmentCancelled  = (data) => send("appointment_cancelled",  data);
export const emailNewMessage            = (data) => send("new_message",            data);
export const emailPatientMessageReceived = (data) => send("patient_message_received", data);
export const emailAppointmentReminder   = (data) => send("appointment_reminder",   data);
export const emailIntakeSubmitted       = (data) => send("intake_submitted",       data);
export const emailTelehealthReminder    = (data) => send("telehealth_reminder",    data);
export const emailInstantTelehealth     = (data) => send("telehealth_instant",     data);
