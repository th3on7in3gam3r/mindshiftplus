// ── Clinic API — proxies through Supabase Edge Function to Neon ───────────────
const SUPABASE_PROJECT = "dhuswldjuuhtxejnmfla";
const BASE = import.meta.env.VITE_CLINIC_API_URL
  || `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/clinic-api`;
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function call(action, payload = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": KEY,
      "Authorization": `Bearer ${KEY}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// ── Appointments ───────────────────────────────────────────────────────────────
export const bookAppointment      = (details) => call("book_appointment", details);
export const getAppointments      = (from, to, patient_id) => call("get_appointments", { from, to, patient_id });
export const updateApptStatus     = (id, status) => call("update_appointment_status", { id, status });
export const cancelAppointment    = (id) => call("cancel_appointment", { id });

// ── Availability ───────────────────────────────────────────────────────────────
export const getAvailability      = () => call("get_availability");
export const upsertAvailability   = (clinician_id, slots) => call("upsert_availability", { clinician_id, slots });

// ── Blocked Times ──────────────────────────────────────────────────────────────
export const getBlockedTimes      = (from, to) => call("get_blocked_times", { from, to });
export const addBlockedTime       = (clinician_id, block) => call("add_blocked_time", { clinician_id, ...block });
export const removeBlockedTime    = (id) => call("remove_blocked_time", { id });

// ── Patient Profile ────────────────────────────────────────────────────────────
export const getPatientProfile    = (user_id) => call("get_patient_profile", { user_id });
export const upsertPatientProfile = (user_id, fields) => call("upsert_patient_profile", { user_id, ...fields });

// ── Messages ───────────────────────────────────────────────────────────────────
export const getMessages          = (patient_id) => call("get_messages", { patient_id });
export const sendMessage          = (patient_id, subject, body, thread_id) => call("send_message", { patient_id, subject, body, thread_id });
export const markMessageRead      = (id) => call("mark_message_read", { id });

// ── Documents ──────────────────────────────────────────────────────────────────
export const getDocuments         = (patient_id) => call("get_documents", { patient_id });

// ── Visit Notes ────────────────────────────────────────────────────────────────
export const getVisitNotes    = (patient_id) => call("get_visit_notes", { patient_id });
export const addVisitNote     = (fields) => call("add_visit_note", fields);

// ── Prescriptions ──────────────────────────────────────────────────────────────
export const getPrescriptions         = (patient_id) => call("get_prescriptions", { patient_id });
export const addPrescription          = (fields) => call("add_prescription", fields);
export const updatePrescriptionStatus = (id, status) => call("update_prescription_status", { id, status });
