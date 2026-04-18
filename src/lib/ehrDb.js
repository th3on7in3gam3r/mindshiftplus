import { supabase } from "./supabase";

// ── AUTH HELPERS ───────────────────────────────────────────────────────────────
const ADMIN_EMAILS = [
  "info@mindshiftwellnessclinic.org",
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "rnakkazi@mindshiftwellnessclinic.org",
];

export async function getClinicianRole(userId) {
  const { data, error } = await supabase
    .from("clinician_roles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };
}

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// ── PATIENT CHARTS ─────────────────────────────────────────────────────────────
export async function getAllCharts() {
  const { data, error } = await supabase
    .from("ehr_charts")
    .select("*")
    .order("updated_at", { ascending: false });
  return { data, error };
}

export async function getChart(chartId) {
  const { data, error } = await supabase
    .from("ehr_charts")
    .select("*")
    .eq("id", chartId)
    .single();
  return { data, error };
}

export async function getChartByPatient(patientId) {
  const { data, error } = await supabase
    .from("ehr_charts")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  return { data, error };
}

export async function upsertChart(chartData) {
  // Allowed columns in ehr_charts — strip anything else to avoid 400 errors
  const ALLOWED = new Set([
    "id","patient_id","mrn","full_name","date_of_birth","gender","pronouns",
    "phone","address","emergency_contact_name","emergency_contact_phone",
    "insurance_provider","insurance_member_id","insurance_group",
    "primary_diagnosis","primary_diagnosis_label","secondary_diagnoses",
    "allergies","pharmacy","referral_source","intake_date","status","flags",
    "created_by","created_at","updated_at",
  ]);
  const safe = Object.fromEntries(
    Object.entries(chartData).filter(([k]) => ALLOWED.has(k))
  );
  const { data, error } = await supabase
    .from("ehr_charts")
    .upsert({ ...safe, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

// Generate simple sequential MRN
export function generateMRN() {
  const now = Date.now().toString(36).toUpperCase();
  return `MSW-${now}`;
}

// ── ENCOUNTER NOTES ────────────────────────────────────────────────────────────
export async function getNotes(chartId) {
  const { data, error } = await supabase
    .from("ehr_notes")
    .select("*")
    .eq("chart_id", chartId)
    .order("note_date", { ascending: false });
  return { data, error };
}

export async function getNote(noteId) {
  const { data, error } = await supabase
    .from("ehr_notes")
    .select("*")
    .eq("id", noteId)
    .single();
  return { data, error };
}

export async function upsertNote(noteData) {
  const { data, error } = await supabase
    .from("ehr_notes")
    .upsert({ ...noteData, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

export async function signNote(noteId) {
  const { data, error } = await supabase
    .from("ehr_notes")
    .update({ is_signed: true, signed_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  return { data, error };
}

export async function deleteNote(noteId) {
  const { error } = await supabase
    .from("ehr_notes")
    .delete()
    .eq("id", noteId);
  return { error };
}

// ── MEDICATIONS ────────────────────────────────────────────────────────────────
export async function getMedications(chartId) {
  const { data, error } = await supabase
    .from("ehr_medications")
    .select("*")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function upsertMedication(medData) {
  const { data, error } = await supabase
    .from("ehr_medications")
    .upsert(medData)
    .select()
    .single();
  return { data, error };
}

export async function deleteMedication(medId) {
  const { error } = await supabase
    .from("ehr_medications")
    .delete()
    .eq("id", medId);
  return { error };
}

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────
export async function getEhrDocuments(chartId) {
  const { data, error } = await supabase
    .from("ehr_documents")
    .select("*")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: false });
  return { data, error };
}

// ── APPOINTMENTS (patient-linked) ─────────────────────────────────────────────
export async function getPatientAppointments(patientId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });
  return { data, error };
}

// ── MESSAGES (read from portal_messages as clinician) ─────────────────────────
export async function getPatientMessages(patientId) {
  const { data, error } = await supabase
    .from("portal_messages")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function sendClinicianMessage(patientId, subject, body, threadId = null) {
  const id = threadId || crypto.randomUUID();
  const { data, error } = await supabase
    .from("portal_messages")
    .insert({
      patient_id: patientId,
      sender_role: "clinic",
      subject,
      body,
      thread_id: id,
    })
    .select()
    .single();
  return { data, error };
}

// ── DASHBOARD STATS ────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const [charts, appts] = await Promise.all([
    supabase.from("ehr_charts").select("id, status"),
    supabase
      .from("appointments")
      .select("id, status, scheduled_at, name, appointment_type")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10),
  ]);

  return {
    totalPatients: (charts.data ?? []).length,
    activePatients: (charts.data ?? []).filter((c) => c.status === "active").length,
    upcomingAppointments: appts.data ?? [],
    error: charts.error || appts.error,
  };
}

// ── TASKS ──────────────────────────────────────────────────────────────────────
export async function getTasks(filters = {}) {
  let q = supabase.from("ehr_tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.patient_id) q = q.eq("patient_id", filters.patient_id);
  const { data, error } = await q;
  return { data, error };
}
export async function upsertTask(task) {
  const { data, error } = await supabase.from("ehr_tasks").upsert({ ...task, updated_at: new Date().toISOString() }).select().single();
  return { data, error };
}
export async function deleteTask(id) {
  const { error } = await supabase.from("ehr_tasks").delete().eq("id", id);
  return { error };
}

// ── EHR MESSAGES ───────────────────────────────────────────────────────────────
export async function getEhrMessages() {
  const { data, error } = await supabase.from("ehr_messages").select("*").order("created_at", { ascending: false });
  return { data, error };
}
export async function sendEhrMessage(payload) {
  const { data, error } = await supabase.from("ehr_messages").insert(payload).select().single();
  return { data, error };
}
export async function markEhrMessageRead(id) {
  const { error } = await supabase.from("ehr_messages").update({ is_read: true }).eq("id", id);
  return { error };
}

// ── GIFT CARDS ─────────────────────────────────────────────────────────────────
export async function getGiftCards() {
  const { data, error } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
  return { data, error };
}
export async function createGiftCard(payload) {
  const code = "GC-" + Math.random().toString(36).toUpperCase().slice(2, 10);
  const { data, error } = await supabase.from("gift_cards").insert({ ...payload, code, balance_cents: payload.amount_cents }).select().single();
  return { data, error };
}
export async function updateGiftCard(id, patch) {
  const { data, error } = await supabase.from("gift_cards").update(patch).eq("id", id).select().single();
  return { data, error };
}

// ── REPORTING ──────────────────────────────────────────────────────────────────
export async function getReportingData() {
  const [charts, appts, claims, tasks] = await Promise.all([
    supabase.from("ehr_charts").select("id, status, created_at, gender, primary_diagnosis"),
    supabase.from("appointments").select("id, status, scheduled_at, appointment_type").order("scheduled_at", { ascending: false }).limit(200),
    supabase.from("billing_claims").select("id, claim_status, amount_billed_cents, amount_paid_insurance_cents, patient_responsibility_cents, service_date").order("service_date", { ascending: false }).limit(200),
    supabase.from("ehr_tasks").select("id, status, priority"),
  ]);
  return {
    charts: charts.data ?? [],
    appointments: appts.data ?? [],
    claims: claims.data ?? [],
    tasks: tasks.data ?? [],
  };
}
