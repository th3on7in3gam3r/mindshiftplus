import { supabase } from "./supabase";
import { sendClinicianMessage } from "./ehrDb";
import { emailInstantTelehealth } from "./emailService";

/** Create a fresh Whereby room without linking to a patient portal account. */
export async function createTelehealthRoomOnly(scheduledAt) {
  const { data, error } = await supabase.functions.invoke("telehealth", {
    body: { scheduledAt: scheduledAt || new Date().toISOString() },
  });
  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: data.error };
  if (!data?.telehealth_url) {
    return {
      data: null,
      error: data?.error || "Could not create video room. Check WHEREBY_API_KEY in Supabase secrets.",
    };
  }
  return { data, error: null };
}

export async function ensureAppointmentTelehealthRoom(appointmentId, scheduledAt) {
  const { data, error } = await supabase.functions.invoke("telehealth", {
    body: { appointmentId, scheduledAt },
  });
  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: data.error };
  if (!data?.telehealth_url) {
    return {
      data: null,
      error: data?.error || "Whereby did not return a room URL. Check WHEREBY_API_KEY in Supabase secrets.",
    };
  }
  return { data, error: null };
}

/**
 * Start an immediate telehealth session (no prior appointment required).
 * Creates a confirmed telehealth appointment + Whereby room and notifies the patient.
 */
export async function startInstantTelehealthSession({
  patientUuid,
  patientName,
  providerName,
}) {
  if (!patientUuid) {
    return { data: null, error: "Select a patient first." };
  }

  const scheduledAt = new Date().toISOString();

  const { data, error } = await supabase.functions.invoke("telehealth", {
    body: {
      mode: "instant",
      patientId: patientUuid,
      patientName: patientName || "Patient",
      providerName: providerName || "MindShift Wellness Clinic",
      scheduledAt,
    },
  });

  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: data.error };

  const telehealth_url = data?.telehealth_url;
  if (!telehealth_url) {
    return { data: null, error: "Could not create video room. Please try again or check Whereby configuration." };
  }

  const msgBody =
    `Your clinician has started a telehealth session and is ready for you.\n\n` +
    `Join here: ${telehealth_url}\n\n` +
    `This link is active for the next 24 hours. You can also find it under Appointments in your patient portal.`;

  await sendClinicianMessage(patientUuid, "Join your telehealth session now", msgBody);

  if (data.patientEmail) {
    emailInstantTelehealth({
      name: patientName || "Patient",
      email: data.patientEmail,
      clinician: providerName || "MindShift Wellness Clinic",
      telehealth_url,
    });
  }

  return {
    data: {
      telehealth_url,
      appointmentId: data.appointmentId,
      patientNotified: true,
    },
    error: null,
  };
}

/** Set clinician-chosen session length (minutes) on a telehealth appointment. */
export async function setAppointmentSessionDuration(appointmentId, minutes) {
  if (!appointmentId || !minutes) return { data: null, error: "Missing appointment or duration." };
  const { data, error } = await supabase
    .from("appointments")
    .update({ session_duration_minutes: minutes })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Patient joined — start countdown once (idempotent). */
export async function startSessionTimerOnPatientJoin(appointmentId) {
  if (!appointmentId) return { data: null, error: "Missing appointment." };
  const { data: existing, error: readErr } = await supabase
    .from("appointments")
    .select("session_duration_minutes, session_timer_started_at")
    .eq("id", appointmentId)
    .single();
  if (readErr) return { data: null, error: readErr.message };
  if (!existing?.session_duration_minutes) {
    return { data: existing, error: null };
  }
  if (existing.session_timer_started_at) {
    return { data: existing, error: null };
  }
  const { data, error } = await supabase
    .from("appointments")
    .update({ session_timer_started_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Clinician manually starts timer (e.g. patient already on the call). */
export async function startSessionTimerNow(appointmentId) {
  if (!appointmentId) return { data: null, error: "Missing appointment." };
  const { data, error } = await supabase
    .from("appointments")
    .update({ session_timer_started_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function fetchAppointmentTimer(appointmentId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, session_duration_minutes, session_timer_started_at, telehealth_url, scheduled_at, appointment_type, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
