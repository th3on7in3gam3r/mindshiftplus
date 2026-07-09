import { supabase } from "./supabase";

// ── AUTH HELPERS ───────────────────────────────────────────────────────────────
const ADMIN_EMAILS = [
  "info@mindshiftwellnessclinic.org",
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "kmutegyeki@gmail.com",
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

/** Staff who may archive/delete portal messages after retention period. */
export const PORTAL_MESSAGE_RETENTION_DAYS = 90;

const PORTAL_MESSAGE_MANAGERS = [
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "kmutegyeki@gmail.com",
  "rnakkazi@mindshiftwellnessclinic.org",
];

export function canManageOldPortalMessages(email) {
  return PORTAL_MESSAGE_MANAGERS.includes(email?.toLowerCase());
}

export function isPortalMessageOldEnough(createdAt, days = PORTAL_MESSAGE_RETENTION_DAYS) {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= days * 24 * 60 * 60 * 1000;
}

export function daysUntilPortalMessageRetention(createdAt, days = PORTAL_MESSAGE_RETENTION_DAYS) {
  if (!createdAt) return days;
  const eligibleAt = new Date(createdAt).getTime() + days * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((eligibleAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

// ── PATIENT CHARTS ─────────────────────────────────────────────────────────────
export async function getAllCharts() {
  const { data, error } = await supabase
    .from("ehr_charts")
    .select("*")
    .order("updated_at", { ascending: false });
  return { data, error };
}

/** Display name for a chart row (picker, lists). */
export function chartDisplayName(chart) {
  return chart?.display_name || chart?.full_name?.trim() || chart?.mrn || "Unknown Patient";
}

/**
 * Charts for dropdowns — merges names from chart, intake, and patient profile.
 * Sorted A–Z by display name.
 */
export async function getChartsForPicker() {
  const { data: charts, error } = await supabase.from("ehr_charts").select("*");
  if (error) return { data: null, error };

  const patientIds = [...new Set((charts ?? []).map((c) => c.patient_id).filter(Boolean))];
  const intakeMap = {};
  const profileMap = {};

  if (patientIds.length) {
    const [{ data: intakes }, { data: profiles }] = await Promise.all([
      supabase.from("intake_submissions").select("patient_id, full_name, phone").in("patient_id", patientIds),
      supabase.from("patient_profiles").select("id, full_name, phone").in("id", patientIds),
    ]);
    for (const i of intakes ?? []) intakeMap[i.patient_id] = i;
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const enriched = (charts ?? []).map((c) => {
    const intake = intakeMap[c.patient_id];
    const profile = profileMap[c.patient_id];
    const display_name =
      c.full_name?.trim() ||
      intake?.full_name?.trim() ||
      profile?.full_name?.trim() ||
      c.mrn ||
      "Unknown Patient";
    return {
      ...c,
      display_name,
      phone: c.phone || intake?.phone || profile?.phone || null,
    };
  });

  enriched.sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" })
  );

  return { data: enriched, error: null };
}

/** Match patient search — each word must appear in name, MRN, or phone. */
export function matchesChartSearch(chart, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [
    chart.display_name,
    chart.full_name,
    chart.mrn,
    chart.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/**
 * Admin patient lookup — searches EHR charts (name/MRN), appointments, profiles, and intakes.
 * Returns unified rows with Supabase patient_id for Visit Notes, Rx, etc.
 */
export async function searchAdminPatients(query) {
  const q = query.trim();
  if (!q) return { data: [], error: null };

  const term = `%${q}%`;
  const byPatientId = new Map();

  const add = (patientId, row) => {
    if (!patientId || patientId === "Public booking (no account)") return;
    const existing = byPatientId.get(patientId);
    if (!existing) {
      byPatientId.set(patientId, row);
      return;
    }
    byPatientId.set(patientId, {
      ...existing,
      name: row.name || existing.name,
      mrn: row.mrn || existing.mrn,
      email: row.email && row.email !== "—" ? row.email : existing.email,
      phone: row.phone || existing.phone,
      chartId: row.chartId || existing.chartId,
      source: [existing.source, row.source].filter(Boolean).join(" · "),
    });
  };

  const [
    { data: charts, error: chartsErr },
    { data: byApptEmail },
    { data: byApptName },
    { data: byProfile },
    { data: byIntake },
  ] = await Promise.all([
    getChartsForPicker(),
    supabase.from("appointments").select("patient_id, name, email, phone").ilike("email", term).limit(30),
    supabase.from("appointments").select("patient_id, name, email, phone").ilike("name", term).limit(30),
    supabase.from("patient_profiles").select("id, full_name, phone").ilike("full_name", term).limit(30),
    supabase.from("intake_submissions").select("patient_id, full_name, phone").ilike("full_name", term).limit(30),
  ]);

  if (chartsErr) return { data: null, error: chartsErr };

  for (const chart of charts ?? []) {
    if (!matchesChartSearch(chart, q)) continue;
    add(chart.patient_id, {
      id: chart.patient_id,
      name: chartDisplayName(chart),
      mrn: chart.mrn || null,
      email: "—",
      phone: chart.phone || null,
      chartId: chart.id,
      source: "MindShift EHR",
    });
  }

  for (const a of [...(byApptEmail ?? []), ...(byApptName ?? [])]) {
    if (!a.patient_id) continue;
    add(a.patient_id, {
      id: a.patient_id,
      name: a.name || "Unknown Patient",
      mrn: null,
      email: a.email || "—",
      phone: a.phone || null,
      chartId: null,
      source: "Appointment",
    });
  }

  for (const p of byProfile ?? []) {
    add(p.id, {
      id: p.id,
      name: p.full_name || "Unknown Patient",
      mrn: null,
      email: "—",
      phone: p.phone || null,
      chartId: null,
      source: "Patient profile",
    });
  }

  for (const i of byIntake ?? []) {
    add(i.patient_id, {
      id: i.patient_id,
      name: i.full_name || "Unknown Patient",
      mrn: null,
      email: "—",
      phone: i.phone || null,
      chartId: null,
      source: "Intake",
    });
  }

  // Exact MRN or patient UUID match (paste-friendly)
  const compact = q.replace(/\s/g, "");
  if (compact.length >= 4) {
    const { data: byMrn } = await supabase
      .from("ehr_charts")
      .select("id, patient_id, mrn, full_name, phone")
      .ilike("mrn", `%${compact}%`)
      .limit(10);
    for (const c of byMrn ?? []) {
      add(c.patient_id, {
        id: c.patient_id,
        name: c.full_name || c.mrn || "Unknown Patient",
        mrn: c.mrn,
        email: "—",
        phone: c.phone || null,
        chartId: c.id,
        source: "MindShift EHR",
      });
    }
  }
  if (/^[0-9a-f-]{36}$/i.test(compact)) {
    const { data: byUuid } = await supabase
      .from("ehr_charts")
      .select("id, patient_id, mrn, full_name, phone")
      .eq("patient_id", compact)
      .limit(5);
    for (const c of byUuid ?? []) {
      add(c.patient_id, {
        id: c.patient_id,
        name: c.full_name || c.mrn || "Unknown Patient",
        mrn: c.mrn,
        email: "—",
        phone: c.phone || null,
        chartId: c.id,
        source: "MindShift EHR",
      });
    }
  }

  const results = [...byPatientId.values()].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  );

  return { data: results, error: null };
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
  const ALLOWED = new Set([
    "id","patient_id","mrn","full_name","date_of_birth","gender","pronouns",
    "phone","address","emergency_contact_name","emergency_contact_phone",
    "insurance_provider","insurance_member_id","insurance_group",
    "primary_diagnosis","primary_diagnosis_label","secondary_diagnoses",
    "allergies","pharmacy","referral_source","intake_date","status","flags",
    "created_by","created_at","updated_at",
  ]);
  const DATE_FIELDS = new Set(["date_of_birth", "intake_date"]);
  const NULLABLE_FIELDS = new Set(["patient_id", ...DATE_FIELDS]);

  const safe = {};
  for (const [key, value] of Object.entries(chartData ?? {})) {
    if (!ALLOWED.has(key)) continue;
    if (value === "" || value === undefined) {
      if (NULLABLE_FIELDS.has(key)) safe[key] = null;
      continue;
    }
    safe[key] = value;
  }

  if (!Array.isArray(safe.secondary_diagnoses)) safe.secondary_diagnoses = [];
  if (!Array.isArray(safe.flags)) safe.flags = [];
  if (!safe.mrn) safe.mrn = generateMRN();
  if (!safe.status) safe.status = "active";

  if (safe.patient_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safe.patient_id)) {
    return { data: null, error: { message: "Portal Patient ID must be a valid Supabase UUID." } };
  }

  const now = new Date().toISOString();

  if (safe.id) {
    const { id, ...updates } = safe;
    const { data, error } = await supabase
      .from("ehr_charts")
      .update({ ...updates, updated_at: now })
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  }

  const { data, error } = await supabase
    .from("ehr_charts")
    .insert({ ...safe, created_at: now, updated_at: now })
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
  if (!patientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });
  return { data, error };
}

// ── MESSAGES (patient portal secure messaging) ────────────────────────────────
export async function getPatientMessages(patientId) {
  if (!patientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("portal_messages")
    .select("*")
    .eq("patient_id", patientId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getAllPortalMessages({ includeArchived = false } = {}) {
  let q = supabase
    .from("portal_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (!includeArchived) q = q.is("archived_at", null);
  const { data: messages, error } = await q;
  if (error) return { data: null, error };

  const patientIds = [...new Set((messages ?? []).map((m) => m.patient_id).filter(Boolean))];
  let nameMap = {};
  if (patientIds.length) {
    const [{ data: profiles }, { data: charts }] = await Promise.all([
      supabase.from("patient_profiles").select("id, full_name").in("id", patientIds),
      supabase.from("ehr_charts").select("patient_id, full_name").in("patient_id", patientIds),
    ]);
    for (const p of profiles ?? []) if (p.full_name) nameMap[p.id] = p.full_name;
    for (const c of charts ?? []) if (c.full_name && !nameMap[c.patient_id]) nameMap[c.patient_id] = c.full_name;
  }

  return {
    data: (messages ?? []).map((m) => ({
      ...m,
      patient_name: nameMap[m.patient_id] ?? null,
    })),
    error: null,
  };
}

export async function getPortalPatientUnreadCount() {
  const { count, error } = await supabase
    .from("portal_messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_role", "patient")
    .eq("read", false)
    .is("archived_at", null);
  return { count: count ?? 0, error };
}

export async function markPortalMessageRead(id) {
  const { error } = await supabase.from("portal_messages").update({ read: true }).eq("id", id);
  return { error };
}

export async function deletePortalMessage(id) {
  const { error } = await supabase.from("portal_messages").delete().eq("id", id);
  return { error };
}

export async function deletePortalThread(threadId) {
  const { error } = await supabase.from("portal_messages").delete().eq("thread_id", threadId);
  return { error };
}

export async function archivePortalMessage(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("portal_messages")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function archivePortalThread(threadId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("portal_messages")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id ?? null,
    })
    .eq("thread_id", threadId)
    .is("archived_at", null)
    .select();
  return { data, error };
}

export async function restorePortalThread(threadId) {
  const { data, error } = await supabase
    .from("portal_messages")
    .update({ archived_at: null, archived_by: null })
    .eq("thread_id", threadId)
    .select();
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
