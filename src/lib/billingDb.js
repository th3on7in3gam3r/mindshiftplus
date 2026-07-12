import { supabase } from "./supabase";

// ── CPT CODES ──────────────────────────────────────────────────────────────────
export const CPT_CODES = [
  { code: "90791", description: "Psychiatric diagnostic evaluation" },
  { code: "90792", description: "Psychiatric diagnostic evaluation with medical services" },
  { code: "90832", description: "Psychotherapy 30 min" },
  { code: "90834", description: "Psychotherapy 45 min" },
  { code: "90837", description: "Psychotherapy 60 min" },
  { code: "90847", description: "Family psychotherapy with patient present" },
  { code: "90853", description: "Group psychotherapy" },
  { code: "99213", description: "Office visit established patient low complexity" },
  { code: "99214", description: "Office visit established patient moderate complexity" },
  { code: "99215", description: "Office visit established patient high complexity" },
];

export const PLACE_OF_SERVICE = [
  { code: "11", label: "11 — Office" },
  { code: "02", label: "02 — Telehealth" },
  { code: "10", label: "10 — Telehealth (patient home)" },
];

/** Insurance payer categories for billing / superbills */
export const PAYER_CATEGORIES = [
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "commercial", label: "Commercial" },
  { value: "tricare", label: "TRICARE / Military" },
  { value: "other", label: "Other" },
];

export const DEFAULT_INSURANCE_PAYERS = [
  { name: "Medicare", category: "medicare" },
  { name: "MassHealth (Medicaid)", category: "medicaid" },
  { name: "Blue Cross Blue Shield of Massachusetts", category: "commercial" },
  { name: "Harvard Pilgrim Health Care", category: "commercial" },
  { name: "Aetna", category: "commercial" },
  { name: "Cigna & Evernorth", category: "commercial" },
  { name: "UnitedHealthcare (UHC / UBH)", category: "commercial" },
  { name: "Tufts Health Plan", category: "commercial" },
  { name: "Horizon BCBS", category: "commercial" },
  { name: "Independence Blue Cross", category: "commercial" },
  { name: "Meritain Health", category: "commercial" },
  { name: "Quest Behavioral Health", category: "commercial" },
  { name: "Carelon Behavioral Health", category: "commercial" },
  { name: "1199SEIU", category: "commercial" },
  { name: "Self-Pay (No Insurance)", category: "other" },
];

export const DEFAULT_BILLING_SETTINGS = {
  clinic_name: "MindShift Wellness Clinic",
  billing_address: "31 Granite St. Suite #2, Milford, MA 01757",
  phone: "(508) 306-1128",
  email: "info@mindshiftwellnessclinic.org",
  tax_id: "",
  providers: [
    { name: "Kenneth Mutegyeki", title: "PMHNP-BC", npi: "1487410999", taxonomy: "363LP0808X" },
    { name: "Rachel Nakkazi", title: "PMHNP-BC", npi: "", taxonomy: "363LP0808X" },
  ],
  insurance_payers: DEFAULT_INSURANCE_PAYERS,
};

export const CLAIM_TYPES = {
  insurance_claim: "Insurance Claim",
  patient_invoice: "Patient Invoice",
};

// ── PURE UTILITY FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Format integer cents as a dollar string, e.g. 12050 → "$120.50"
 */
export function formatCents(cents) {
  const n = typeof cents === "number" ? cents : 0;
  return "$" + (n / 100).toFixed(2);
}

/**
 * Parse a dollar string to integer cents, e.g. "120.50" → 12050.
 * Returns 0 for empty/null input. Clamps negative values to 0.
 */
export function parseDollars(str) {
  if (!str && str !== 0) return 0;
  const n = Math.round(parseFloat(str) * 100);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

/**
 * Filter CPT_CODES by case-insensitive substring match on code or description.
 * Empty query returns the full list.
 */
export function filterCptCodes(query) {
  if (!query) return CPT_CODES;
  const q = query.toLowerCase();
  return CPT_CODES.filter(
    (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
}

export function payerCategoryLabel(category) {
  return PAYER_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? "Other";
}

/** Normalize payer list from DB or form — falls back to clinic defaults when empty (load only). */
export function normalizeInsurancePayers(raw, { preserveEmpty = false } = {}) {
  if (!Array.isArray(raw) || !raw.length) {
    return preserveEmpty ? [] : [...DEFAULT_INSURANCE_PAYERS];
  }
  return raw
    .map((p) => ({
      name: String(p.name ?? "").trim(),
      category: PAYER_CATEGORIES.some((c) => c.value === p.category) ? p.category : "commercial",
    }))
    .filter((p) => p.name);
}

/** Sorted payer names for datalist / dropdowns (grouped by category in label). */
export function insurancePayerOptions(payers) {
  const list = normalizeInsurancePayers(payers);
  const order = PAYER_CATEGORIES.map((c) => c.value);
  return [...list].sort((a, b) => {
    const ai = order.indexOf(a.category);
    const bi = order.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function mergeBillingSettings(data) {
  if (!data) return { ...DEFAULT_BILLING_SETTINGS };
  return {
    clinic_name: data.clinic_name ?? DEFAULT_BILLING_SETTINGS.clinic_name,
    billing_address: data.billing_address ?? DEFAULT_BILLING_SETTINGS.billing_address,
    phone: data.phone ?? DEFAULT_BILLING_SETTINGS.phone,
    email: data.email ?? DEFAULT_BILLING_SETTINGS.email,
    tax_id: data.tax_id ?? "",
    providers: Array.isArray(data.providers) && data.providers.length
      ? data.providers
      : DEFAULT_BILLING_SETTINGS.providers,
    insurance_payers: normalizeInsurancePayers(data.insurance_payers),
  };
}

/**
 * Sum (patient_responsibility_cents - copay_collected_cents) for all non-paid claims.
 */
export function computePatientBalance(claims) {
  if (!Array.isArray(claims)) return 0;
  return claims
    .filter((c) => c.claim_status !== "paid")
    .reduce(
      (sum, c) =>
        sum + ((c.patient_responsibility_cents ?? 0) - (c.copay_collected_cents ?? 0)),
      0
    );
}

/**
 * Validate financial fields on a claim.
 * Returns a warning string if insurance + patient responsibility > billed.
 * Returns an error string if status is 'paid' and both payment fields are 0.
 * Returns null if valid.
 */
export function validateFinancials(claim) {
  const billed = claim.amount_billed_cents ?? 0;
  const paidIns = claim.amount_paid_insurance_cents ?? 0;
  const patResp = claim.patient_responsibility_cents ?? 0;
  const copay = claim.copay_collected_cents ?? 0;

  if (claim.claim_status === "paid" && paidIns === 0 && copay === 0) {
    return "A paid claim must have a non-zero insurance payment or copay collected.";
  }

  if (paidIns + patResp > billed) {
    return "Warning: insurance payment plus patient responsibility exceeds the billed amount.";
  }

  return null;
}

/** Resolve rendering provider from clinic settings by clinician name/email. */
export function resolveRenderingProvider(clinician, settings) {
  const providers = settings?.providers ?? DEFAULT_BILLING_SETTINGS.providers;
  if (!clinician) return providers[0] ?? null;
  const name = (clinician.full_name || "").toLowerCase();
  const match = providers.find((p) => name && p.name?.toLowerCase().includes(name.split(" ")[0]));
  return match ?? providers[0] ?? null;
}

/** Build ICD-10 array from note diagnoses or chart primary diagnosis. */
export function icd10FromNoteAndChart(note, chart) {
  if (Array.isArray(note?.diagnoses) && note.diagnoses.length) {
    return note.diagnoses.map((d) => ({ code: d.code, label: d.label ?? d.description ?? "" }));
  }
  if (chart?.primary_diagnosis) {
    return [{ code: chart.primary_diagnosis, label: chart.primary_diagnosis_label ?? "" }];
  }
  return [];
}

/** Build insurance claim draft payload from a signed note + chart. */
export function buildClaimPayloadFromNote({ note, chart, clinician, settings }) {
  const provider = resolveRenderingProvider(clinician, settings);
  return {
    claim_type: "insurance_claim",
    patient_id: chart.patient_id,
    chart_id: chart.id,
    note_id: note.id,
    appointment_id: note.appointment_id ?? null,
    service_date: note.note_date,
    cpt_codes: Array.isArray(note.cpt_codes) ? note.cpt_codes : [],
    icd10_codes: icd10FromNoteAndChart(note, chart),
    insurance_provider: chart.insurance_provider ?? null,
    insurance_member_id: chart.insurance_member_id ?? null,
    insurance_group: chart.insurance_group ?? null,
    rendering_provider_name: provider?.name ?? clinician?.full_name ?? "",
    rendering_provider_npi: provider?.npi ?? "",
    place_of_service: "11",
    claim_status: "draft",
    created_by: clinician.user_id,
    amount_billed_cents: 0,
    amount_paid_insurance_cents: 0,
    patient_responsibility_cents: 0,
    copay_collected_cents: 0,
    notes: null,
  };
}

export function superbillNumber(claim) {
  return `SB-${claim.id.slice(0, 8).toUpperCase()}`;
}

export function placeOfServiceLabel(code) {
  return PLACE_OF_SERVICE.find((p) => p.code === code)?.label ?? code ?? "—";
}

// ── VALID CLAIM STATUSES ───────────────────────────────────────────────────────
const VALID_STATUSES = ["draft", "submitted", "accepted", "denied", "paid"];

// ── SUPABASE QUERY FUNCTIONS ───────────────────────────────────────────────────

/**
 * Get all claims for a patient, ordered by service_date DESC.
 */
export async function getClaims(patientId) {
  if (!patientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("billing_claims")
    .select("*")
    .eq("patient_id", patientId)
    .order("service_date", { ascending: false });
  return { data, error };
}

/**
 * Get claims for a chart (used when no portal patient_id is linked).
 */
export async function getClaimsByChart(chartId) {
  if (!chartId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("billing_claims")
    .select("*")
    .eq("chart_id", chartId)
    .order("service_date", { ascending: false });
  return { data, error };
}

/** Resolve claims by patient_id or chart_id. */
export async function getClaimsForChart({ patientId, chartId }) {
  if (patientId) return getClaims(patientId);
  return getClaimsByChart(chartId);
}

/**
 * Get aggregate claims (clinician-only).
 * Optional statusFilter, claimType, and limit (default 50).
 */
export async function getAggregateClaims({ statusFilter, claimType, limit = 50 } = {}) {
  let query = supabase
    .from("billing_claims")
    .select("*")
    .order("service_date", { ascending: false })
    .limit(limit);

  if (statusFilter) query = query.eq("claim_status", statusFilter);
  if (claimType) query = query.eq("claim_type", claimType);

  const { data, error } = await query;
  if (error) return { data, error };

  const patientIds = [...new Set((data ?? []).map((c) => c.patient_id).filter(Boolean))];
  const chartIds = [...new Set((data ?? []).map((c) => c.chart_id).filter(Boolean))];
  let nameMap = {};
  if (patientIds.length) {
    const { data: charts } = await supabase
      .from("ehr_charts")
      .select("patient_id, full_name")
      .in("patient_id", patientIds);
    for (const c of charts ?? []) if (c.full_name) nameMap[c.patient_id] = c.full_name;
  }
  if (chartIds.length) {
    const { data: chartsById } = await supabase
      .from("ehr_charts")
      .select("id, full_name, patient_id")
      .in("id", chartIds);
    for (const c of chartsById ?? []) {
      if (c.full_name && c.patient_id) nameMap[c.patient_id] = c.full_name;
    }
  }

  return {
    data: (data ?? []).map((c) => ({ ...c, patient_name: nameMap[c.patient_id] ?? null })),
    error: null,
  };
}

/**
 * Insurance claims worklist with status counts (all insurance claims, not limited sample).
 */
export async function getInsuranceClaimsWorklist({ statusFilter } = {}) {
  let query = supabase
    .from("billing_claims")
    .select("*")
    .eq("claim_type", "insurance_claim")
    .order("service_date", { ascending: false });

  if (statusFilter) query = query.eq("claim_status", statusFilter);

  const { data, error } = await query;
  if (error) return { data, error, counts: {} };

  const patientIds = [...new Set((data ?? []).map((c) => c.patient_id).filter(Boolean))];
  let nameMap = {};
  if (patientIds.length) {
    const { data: charts } = await supabase
      .from("ehr_charts")
      .select("patient_id, full_name")
      .in("patient_id", patientIds);
    for (const c of charts ?? []) if (c.full_name) nameMap[c.patient_id] = c.full_name;
  }

  const claims = (data ?? []).map((c) => ({ ...c, patient_name: nameMap[c.patient_id] ?? null }));
  const counts = VALID_STATUSES.reduce((acc, s) => {
    acc[s] = claims.filter((c) => c.claim_status === s).length;
    return acc;
  }, {});

  return { data: claims, error: null, counts };
}

/**
 * Signed notes that do not yet have a billing claim.
 */
export async function getSignedNotesWithoutClaims() {
  const { data: notes, error: notesError } = await supabase
    .from("ehr_notes")
    .select("*, ehr_charts!inner(id, patient_id, full_name, insurance_provider, insurance_member_id, insurance_group, primary_diagnosis, primary_diagnosis_label)")
    .eq("is_signed", true)
    .order("note_date", { ascending: false });

  if (notesError) return { data: [], error: notesError };

  const noteIds = (notes ?? []).map((n) => n.id);
  if (!noteIds.length) return { data: [], error: null };

  const { data: linked, error: linkError } = await supabase
    .from("billing_claims")
    .select("note_id")
    .in("note_id", noteIds);

  if (linkError) return { data: [], error: linkError };

  const linkedSet = new Set((linked ?? []).map((r) => r.note_id));
  const ready = (notes ?? [])
    .filter((n) => !linkedSet.has(n.id))
    .map((n) => ({
      ...n,
      chart: n.ehr_charts,
      patient_name: n.ehr_charts?.full_name ?? "Unknown",
    }));

  return { data: ready, error: null };
}

/**
 * Signed notes for one chart without an existing claim.
 */
export async function getChartNotesReadyForClaim(chartId) {
  const { data: notes, error } = await supabase
    .from("ehr_notes")
    .select("*")
    .eq("chart_id", chartId)
    .eq("is_signed", true)
    .order("note_date", { ascending: false });

  if (error) return { data: [], error };

  const noteIds = (notes ?? []).map((n) => n.id);
  if (!noteIds.length) return { data: [], error: null };

  const { data: linked } = await supabase
    .from("billing_claims")
    .select("note_id")
    .in("note_id", noteIds);

  const linkedSet = new Set((linked ?? []).map((r) => r.note_id));
  return { data: (notes ?? []).filter((n) => !linkedSet.has(n.id)), error: null };
}

/** Load clinic billing settings (defaults if none saved). */
export async function getBillingSettings() {
  const { data, error } = await supabase
    .from("clinic_billing_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: DEFAULT_BILLING_SETTINGS, error };
  if (!data) return { data: { ...DEFAULT_BILLING_SETTINGS }, error: null };
  return { data: mergeBillingSettings(data), error: null };
}

/** Save clinic billing settings (upsert single row). */
export async function saveBillingSettings(payload, userId) {
  const { data: existing } = await supabase
    .from("clinic_billing_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = {
    clinic_name: payload.clinic_name,
    billing_address: payload.billing_address,
    phone: payload.phone,
    email: payload.email,
    tax_id: payload.tax_id || null,
    providers: payload.providers ?? DEFAULT_BILLING_SETTINGS.providers,
    insurance_payers: normalizeInsurancePayers(payload.insurance_payers, { preserveEmpty: true }),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("clinic_billing_settings")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();
    return { data: data ? mergeBillingSettings(data) : null, error };
  }

  const { data, error } = await supabase
    .from("clinic_billing_settings")
    .insert(row)
    .select()
    .single();
  return { data: data ? mergeBillingSettings(data) : null, error };
}

/**
 * Create insurance claim from signed note (pre-filled).
 */
export async function createClaimFromNote({ note, chart, clinician }) {
  const { data: settings } = await getBillingSettings();
  const payload = buildClaimPayloadFromNote({ note, chart, clinician, settings });
  return createClaim(payload);
}

/**
 * Create a new claim / invoice.
 * Manual invoices from EHR → Invoices do not require appointment_id or note_id.
 */
export async function createClaim(payload) {
  const row = {
    ...payload,
    claim_status: payload.claim_status ?? "draft",
    patient_id: payload.patient_id || null,
  };
  const { data, error } = await supabase
    .from("billing_claims")
    .insert(row)
    .select()
    .single();
  return { data, error };
}

/** Mark invoice visible to patient in portal (submitted). */
export async function sendInvoiceToPatient(id) {
  return updateClaim(id, { claim_status: "submitted" });
}

/**
 * Update an existing claim by id.
 * Validates claim_status enum if present.
 * Sets submitted_at when transitioning to 'submitted'.
 * Sets paid_at when transitioning to 'paid'.
 */
export async function updateClaim(id, patch) {
  if (patch.claim_status !== undefined && !VALID_STATUSES.includes(patch.claim_status)) {
    return { data: null, error: "Invalid claim status." };
  }

  const updates = { ...patch };

  if (patch.claim_status === "submitted") {
    updates.submitted_at = new Date().toISOString();
  } else if (patch.claim_status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("billing_claims")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a claim by id. Only draft claims may be deleted.
 */
export async function deleteClaim(id) {
  const { data: claim, error: fetchError } = await supabase
    .from("billing_claims")
    .select("claim_status")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError };

  if (claim.claim_status !== "draft") {
    return { error: "Only draft claims may be deleted." };
  }

  const { error } = await supabase.from("billing_claims").delete().eq("id", id);
  return { error };
}

/**
 * Get billing records for a patient (patient portal, read-only).
 * Only patient invoices — not internal insurance claim drafts.
 */
export async function getMyBilling(patientId) {
  const { data, error } = await supabase
    .from("billing_claims")
    .select("*")
    .eq("patient_id", patientId)
    .eq("claim_type", "patient_invoice")
    .order("service_date", { ascending: false });
  return { data, error };
}
