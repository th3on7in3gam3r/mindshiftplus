// ── Clinic API — uses Supabase directly (Neon via Edge Function coming later) ──
import { supabase } from "./supabase";

// ── Appointments ───────────────────────────────────────────────────────────────
export async function bookAppointment(details) {
  const { data, error } = await supabase.from("appointments").insert(details).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getAppointments(from, to, patient_id) {
  let q = supabase.from("appointments").select("*").gte("scheduled_at", from).lte("scheduled_at", to).order("scheduled_at");
  if (patient_id) q = q.eq("patient_id", patient_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateApptStatus(id, status) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function cancelAppointment(id) {
  return updateApptStatus(id, "cancelled");
}

// ── Availability ───────────────────────────────────────────────────────────────
export async function getAvailability() {
  const { data, error } = await supabase.from("availability").select("*").eq("is_active", true).order("day_of_week");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertAvailability(clinician_id, slots) {
  await supabase.from("availability").delete().eq("clinician_id", clinician_id);
  if (!slots.length) return { success: true };
  const { error } = await supabase.from("availability").insert(slots.map(s => ({ ...s, clinician_id })));
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Blocked Times ──────────────────────────────────────────────────────────────
export async function getBlockedTimes(from, to) {
  const { data, error } = await supabase.from("blocked_times").select("*").gte("date", from).lte("date", to).order("date");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addBlockedTime(clinician_id, block) {
  const { data, error } = await supabase.from("blocked_times").insert({ clinician_id, ...block }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeBlockedTime(id) {
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Patient Profile ────────────────────────────────────────────────────────────
export async function getPatientProfile(user_id) {
  const { data, error } = await supabase.from("patient_profiles").select("*").eq("id", user_id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertPatientProfile(user_id, fields) {
  const { error } = await supabase.from("patient_profiles").upsert({ id: user_id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Messages ───────────────────────────────────────────────────────────────────
export async function getMessages(patient_id) {
  const { data, error } = await supabase.from("portal_messages").select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function sendMessage(patient_id, subject, body, thread_id) {
  const tid = thread_id || crypto.randomUUID();
  const { data, error } = await supabase.from("portal_messages").insert({ patient_id, sender_role: "patient", subject, body, thread_id: tid }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markMessageRead(id) {
  const { error } = await supabase.from("portal_messages").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Documents ──────────────────────────────────────────────────────────────────
export async function getDocuments(patient_id) {
  const { data, error } = await supabase.from("portal_documents").select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Visit Notes ────────────────────────────────────────────────────────────────
export async function getVisitNotes(patient_id) {
  const { data, error } = await supabase.from("visit_notes").select("*").eq("patient_id", patient_id).order("note_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addVisitNote(fields) {
  const { data, error } = await supabase.from("visit_notes").insert(fields).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Prescriptions ──────────────────────────────────────────────────────────────
export async function getPrescriptions(patient_id) {
  const { data, error } = await supabase.from("prescriptions").select("*").eq("patient_id", patient_id).order("prescribed_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addPrescription(fields) {
  const { data, error } = await supabase.from("prescriptions").insert(fields).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePrescriptionStatus(id, status) {
  const { error } = await supabase.from("prescriptions").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Patient Journal (portal) ───────────────────────────────────────────────────
export async function getPatientJournal(patient_id) {
  const { data, error } = await supabase.from("patient_journal_entries")
    .select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePatientJournalEntry(patient_id, entry) {
  if (entry.id) {
    const { data, error } = await supabase.from("patient_journal_entries")
      .update({ ...entry, updated_at: new Date().toISOString() }).eq("id", entry.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from("patient_journal_entries")
    .insert({ patient_id, ...entry }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePatientJournalEntry(id) {
  const { error } = await supabase.from("patient_journal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Clinician: get a specific patient's journal for appointment review
export async function getPatientJournalForReview(patient_id) {
  const { data, error } = await supabase.from("patient_journal_entries")
    .select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Document Upload ────────────────────────────────────────────────────────────
export async function uploadPatientDocument(patient_id, file, docType) {
  // Upload file to Supabase Storage
  const ext = file.name.split(".").pop();
  const path = `${patient_id}/${Date.now()}_${file.name.replace(/\s+/g,"-")}`;
  const { data: storageData, error: storageError } = await supabase.storage
    .from("patient-documents")
    .upload(path, file, { upsert: false });
  if (storageError) throw new Error(storageError.message);

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("patient-documents")
    .getPublicUrl(path);

  // Save record to DB
  const { data, error } = await supabase.from("portal_documents").insert({
    patient_id,
    name: file.name,
    type: docType || "other",
    file_url: publicUrl,
    status: "uploaded",
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePatientDocument(id, file_url) {
  // Remove from storage
  if (file_url) {
    const path = file_url.split("/patient-documents/")[1];
    if (path) await supabase.storage.from("patient-documents").remove([path]);
  }
  const { error } = await supabase.from("portal_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// Clinician: get all documents for a patient
export async function getAllPatientDocuments(patient_id) {
  const { data, error } = await supabase.from("portal_documents")
    .select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
