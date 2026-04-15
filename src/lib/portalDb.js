import { supabase } from "./supabase";

// ── PATIENT PROFILE ────────────────────────────────────────────────────────────
export async function getPatientProfile(userId) {
  const { data, error } = await supabase
    .from("patient_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return { data, error };
}

export async function upsertPatientProfile(userId, updates) {
  const { data, error } = await supabase
    .from("patient_profiles")
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

// ── APPOINTMENTS ───────────────────────────────────────────────────────────────
export async function getAppointments(userId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", userId)
    .order("scheduled_at", { ascending: true });
  return { data, error };
}

export async function requestAppointment(userId, details) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({ patient_id: userId, status: "requested", ...details })
    .select()
    .single();
  return { data, error };
}

export async function cancelAppointment(appointmentId) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  return { error };
}

// ── MESSAGES ───────────────────────────────────────────────────────────────────
export async function getMessages(userId) {
  const { data, error } = await supabase
    .from("portal_messages")
    .select("*")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function sendMessage(userId, subject, body, threadId = null) {
  const id = threadId || crypto.randomUUID();
  const { data, error } = await supabase
    .from("portal_messages")
    .insert({ patient_id: userId, sender_role: "patient", subject, body, thread_id: id })
    .select()
    .single();
  return { data, error };
}

export async function markMessageRead(messageId) {
  const { error } = await supabase
    .from("portal_messages")
    .update({ read: true })
    .eq("id", messageId);
  return { error };
}

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────
export async function getDocuments(userId) {
  const { data, error } = await supabase
    .from("portal_documents")
    .select("*")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}
