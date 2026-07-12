import { supabase } from "./supabase";
import { emailStaffTeamMessage } from "./emailService";
import { parseMentionedUserIds } from "./staffChatUtils";

// ── AUTH HELPERS ───────────────────────────────────────────────────────────────
export const CLINICIAN_EMAILS = [
  "info@mindshiftwellnessclinic.org",
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "kmutegyeki@gmail.com",
  "rnakkazi@mindshiftwellnessclinic.org",
];

const ADMIN_EMAILS = CLINICIAN_EMAILS;

/** Default roster profile when a whitelisted staff member logs into the EHR for the first time. */
export const STAFF_ENROLLMENT_PROFILES = {
  "kmutegyeki@gmail.com": { full_name: "Kenneth Mutegyeki", title: "PMHNP-BC", is_admin: true },
  "kmutegyeki@mindshiftwellnessclinic.org": { full_name: "Kenneth Mutegyeki", title: "PMHNP-BC", is_admin: true },
  "rnakkazi@mindshiftwellnessclinic.org": { full_name: "Rachel Nakkazi", title: "PMHNP-BC", is_admin: false },
  "jerlessm@gmail.com": { full_name: "Jerless", title: "Administrator", is_admin: true },
  "info@mindshiftwellnessclinic.org": { full_name: "MindShift Clinic", title: "Administrator", is_admin: true },
};

export function staffEnrollmentProfile(user) {
  const email = user.email?.toLowerCase();
  const preset = STAFF_ENROLLMENT_PROFILES[email];
  if (preset) return preset;
  return {
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Staff",
    title: "Staff",
    is_admin: false,
  };
}

export async function getClinicianRole(userId) {
  const { data, error } = await supabase
    .from("clinician_roles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };
}

/** Create clinician_roles row on first EHR login for whitelisted staff (no-op if already enrolled). */
export async function ensureClinicianEnrollment(user) {
  const email = user?.email?.toLowerCase();
  if (!email || !isAdminEmail(email)) {
    return { data: null, error: null, enrolled: false };
  }

  const { data: existing } = await getClinicianRole(user.id);
  if (existing) {
    if (!existing.email && email) {
      await supabase.from("clinician_roles").update({ email }).eq("user_id", user.id);
      return { data: { ...existing, email }, error: null, enrolled: false };
    }
    return { data: existing, error: null, enrolled: false };
  }

  const profile = staffEnrollmentProfile(user);
  const row = {
    user_id: user.id,
    full_name: profile.full_name,
    title: profile.title,
    is_admin: profile.is_admin ?? false,
    email,
  };

  const { data, error } = await supabase
    .from("clinician_roles")
    .upsert(row, { onConflict: "user_id", ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) return { data: null, error, enrolled: false };
  if (data) return { data, error: null, enrolled: true };

  const { data: afterInsert } = await getClinicianRole(user.id);
  return { data: afterInsert, error: null, enrolled: !!afterInsert };
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
  const byChartOnly = new Map();

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

  const addChartOnly = (chart) => {
    if (chart.patient_id) return;
    if (!chart.id) return;
    if (byChartOnly.has(chart.id)) return;
    byChartOnly.set(chart.id, {
      id: null,
      chartId: chart.id,
      name: chartDisplayName(chart),
      mrn: chart.mrn || null,
      email: "—",
      phone: chart.phone || null,
      source: "MindShift EHR",
      noPortalId: true,
    });
  };

  const [
    { data: charts, error: chartsErr },
    { data: byChartName },
    { data: byApptEmail },
    { data: byApptName },
    { data: byProfile },
    { data: byIntake },
  ] = await Promise.all([
    getChartsForPicker(),
    supabase.from("ehr_charts").select("id, patient_id, mrn, full_name, phone").or(`full_name.ilike.${term},mrn.ilike.${term}`).limit(40),
    supabase.from("appointments").select("patient_id, name, email, phone").ilike("email", term).limit(30),
    supabase.from("appointments").select("patient_id, name, email, phone").ilike("name", term).limit(30),
    supabase.from("patient_profiles").select("id, full_name, phone").ilike("full_name", term).limit(30),
    supabase.from("intake_submissions").select("patient_id, full_name, phone").ilike("full_name", term).limit(30),
  ]);

  if (chartsErr) return { data: null, error: chartsErr };

  for (const chart of charts ?? []) {
    if (!matchesChartSearch(chart, q)) continue;
    if (chart.patient_id) {
      add(chart.patient_id, {
        id: chart.patient_id,
        name: chartDisplayName(chart),
        mrn: chart.mrn || null,
        email: "—",
        phone: chart.phone || null,
        chartId: chart.id,
        source: "MindShift EHR",
      });
    } else {
      addChartOnly(chart);
    }
  }

  for (const chart of byChartName ?? []) {
    if (chart.patient_id) {
      add(chart.patient_id, {
        id: chart.patient_id,
        name: chart.full_name || chart.mrn || "Unknown Patient",
        mrn: chart.mrn || null,
        email: "—",
        phone: chart.phone || null,
        chartId: chart.id,
        source: "MindShift EHR",
      });
    } else {
      addChartOnly(chart);
    }
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
      if (c.patient_id) {
        add(c.patient_id, {
          id: c.patient_id,
          name: c.full_name || c.mrn || "Unknown Patient",
          mrn: c.mrn,
          email: "—",
          phone: c.phone || null,
          chartId: c.id,
          source: "MindShift EHR",
        });
      } else {
        addChartOnly(c);
      }
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

  const results = [...byPatientId.values(), ...byChartOnly.values()].sort((a, b) =>
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

// ── EHR MESSAGES (staff team chat) ─────────────────────────────────────────────
export function staffEmailForMember(member) {
  if (member?.email) return member.email;
  const name = member?.full_name;
  if (!name) return null;
  const match = Object.entries(STAFF_ENROLLMENT_PROFILES).find(([, profile]) => profile.full_name === name);
  return match?.[0] ?? null;
}

export async function getStaffTeam() {
  const { data, error } = await supabase
    .from("clinician_roles")
    .select("user_id, full_name, title, is_admin, email")
    .order("full_name");
  return { data: data ?? [], error };
}

export async function getStaffChatMessages(currentUserId) {
  const { data: messages, error } = await supabase
    .from("ehr_messages")
    .select("*")
    .or(`to_user.is.null,to_user.eq.${currentUserId},from_user.eq.${currentUserId}`)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error };

  const { data: reads } = await supabase
    .from("ehr_message_reads")
    .select("message_id")
    .eq("user_id", currentUserId);

  const readSet = new Set((reads ?? []).map((r) => r.message_id));
  const enriched = (messages ?? []).map((m) => ({
    ...m,
    read_by_me: m.from_user === currentUserId || readSet.has(m.id),
  }));

  return { data: enriched, error: null };
}

export async function getStaffChatUnreadCount(currentUserId) {
  const { data } = await getStaffChatMessages(currentUserId);
  return data.filter((m) => m.from_user !== currentUserId && !m.read_by_me).length;
}

export async function sendStaffChatMessage({
  fromUser,
  fromName,
  toUser = null,
  channel = null,
  threadId = null,
  subject = null,
  body,
  patientContext = null,
  mentionedUserIds = null,
  attachmentUrl = null,
  attachmentName = null,
  attachmentType = null,
  team = [],
}) {
  const mentionIds = mentionedUserIds ?? parseMentionedUserIds(body, team, fromUser);
  const payload = {
    from_user: fromUser,
    from_name: fromName,
    to_user: toUser || null,
    channel: toUser ? null : (channel || "general"),
    thread_id: threadId || null,
    subject: subject?.trim() || null,
    body: body.trim(),
    patient_context: patientContext?.trim() || null,
    mentioned_user_ids: mentionIds.length ? mentionIds : [],
    attachment_url: attachmentUrl || null,
    attachment_name: attachmentName || null,
    attachment_type: attachmentType || null,
  };
  const { data, error } = await supabase.from("ehr_messages").insert(payload).select().single();
  if (!error && data) {
    notifyStaffChatRecipients({ message: data, team, fromUser }).catch(() => {});
  }
  return { data, error };
}

/** Email DMs and @mentions only — not team-wide All Staff posts. */
export async function notifyStaffChatRecipients({ message, team, fromUser }) {
  const recipientIds = new Set();
  if (message.to_user) recipientIds.add(message.to_user);
  for (const id of message.mentioned_user_ids || []) recipientIds.add(id);
  recipientIds.delete(fromUser);

  const emails = [...recipientIds]
    .map((id) => staffEmailForMember(team.find((m) => m.user_id === id)))
    .filter(Boolean);

  if (!emails.length) return;

  await emailStaffTeamMessage({
    to_emails: emails,
    from_name: message.from_name || "Staff",
    subject: message.subject || (message.to_user ? "Direct message" : "Team mention"),
    body_preview: message.body?.slice(0, 120) || "",
    is_direct: !!message.to_user,
  });
}

export async function markStaffMessagesRead(messageIds, userId) {
  const ids = [...new Set((messageIds ?? []).filter(Boolean))];
  if (!ids.length) return { error: null };
  const rows = ids.map((message_id) => ({ message_id, user_id: userId }));
  const { error } = await supabase
    .from("ehr_message_reads")
    .upsert(rows, { onConflict: "message_id,user_id", ignoreDuplicates: true });
  return { error };
}

export async function getStaffMessageReadReceipts(messageIds) {
  const ids = [...new Set((messageIds ?? []).filter(Boolean))];
  if (!ids.length) return { data: {}, error: null };
  const { data, error } = await supabase
    .from("ehr_message_reads")
    .select("message_id, user_id, read_at")
    .in("message_id", ids);
  if (error) return { data: {}, error };
  const byMessage = {};
  for (const row of data ?? []) {
    if (!byMessage[row.message_id]) byMessage[row.message_id] = [];
    byMessage[row.message_id].push(row);
  }
  return { data: byMessage, error: null };
}

const STAFF_CHAT_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export async function uploadStaffChatAttachment(file, userId) {
  if (!file || !userId) return { error: "Missing file or user." };
  if (file.size > 10 * 1024 * 1024) return { error: "File must be 10 MB or smaller." };
  if (STAFF_CHAT_ATTACHMENT_TYPES.length && file.type && !STAFF_CHAT_ATTACHMENT_TYPES.includes(file.type)) {
    return { error: "File type not allowed. Use PDF, image, Word, Excel, or text." };
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from("staff-chat-attachments")
    .upload(path, file, { upsert: false });
  if (uploadErr) return { error: uploadErr.message ?? "Upload failed." };
  const { data: urlData } = supabase.storage.from("staff-chat-attachments").getPublicUrl(path);
  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type || null,
    error: null,
  };
}

/** @deprecated use getStaffChatMessages */
export async function getEhrMessages() {
  return getStaffChatMessages((await supabase.auth.getUser()).data.user?.id);
}

/** @deprecated use sendStaffChatMessage */
export async function sendEhrMessage(payload) {
  return sendStaffChatMessage({
    fromUser: payload.from_user,
    fromName: payload.from_name,
    toUser: payload.to_user,
    threadId: payload.thread_id,
    subject: payload.subject,
    body: payload.body,
    patientContext: payload.patient_context,
  });
}

/** @deprecated use markStaffMessagesRead */
export async function markEhrMessageRead(id) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  return markStaffMessagesRead([id], userId);
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
