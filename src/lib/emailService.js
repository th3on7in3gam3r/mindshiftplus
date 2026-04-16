// ── Email Service — calls Supabase Edge Function → Resend ─────────────────────
const EMAIL_FN = `https://dhuswldjuuhtxejnmfla.supabase.co/functions/v1/send-email`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function send(type, data) {
  try {
    await fetch(EMAIL_FN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Authorization": `Bearer ${KEY}`,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (e) {
    console.warn("Email send failed (non-blocking):", e.message);
  }
}

export const emailAppointmentRequested  = (data) => send("appointment_requested",  data);
export const emailAppointmentConfirmed  = (data) => send("appointment_confirmed",  data);
export const emailAppointmentCancelled  = (data) => send("appointment_cancelled",  data);
export const emailNewMessage            = (data) => send("new_message",            data);
export const emailAppointmentReminder   = (data) => send("appointment_reminder",   data);
