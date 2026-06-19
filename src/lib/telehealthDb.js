import { supabase } from "./supabase";
import { sendClinicianMessage } from "./ehrDb";
import { emailInstantTelehealth } from "./emailService";
export async function ensureAppointmentTelehealthRoom(appointmentId, scheduledAt) {
  const { data, error } = await supabase.functions.invoke("telehealth", {
    body: { appointmentId, scheduledAt },
  });
  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: data.error };
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
