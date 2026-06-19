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

// ── VALID CLAIM STATUSES ───────────────────────────────────────────────────────
const VALID_STATUSES = ["draft", "submitted", "accepted", "denied", "paid"];

// ── SUPABASE QUERY FUNCTIONS ───────────────────────────────────────────────────

/**
 * Get all claims for a patient, ordered by service_date DESC.
 */
export async function getClaims(patientId) {
  const { data, error } = await supabase
    .from("billing_claims")
    .select("*")
    .eq("patient_id", patientId)
    .order("service_date", { ascending: false });
  return { data, error };
}

/**
 * Get aggregate claims (clinician-only).
 * Optional statusFilter and limit (default 10).
 */
export async function getAggregateClaims({ statusFilter, limit = 10 } = {}) {
  let query = supabase
    .from("billing_claims")
    .select("*")
    .order("service_date", { ascending: false })
    .limit(limit);

  if (statusFilter) {
    query = query.eq("claim_status", statusFilter);
  }

  const { data, error } = await query;
  if (error) return { data, error };

  const patientIds = [...new Set((data ?? []).map((c) => c.patient_id).filter(Boolean))];
  let nameMap = {};
  if (patientIds.length) {
    const { data: charts } = await supabase
      .from("ehr_charts")
      .select("patient_id, full_name")
      .in("patient_id", patientIds);
    for (const c of charts ?? []) if (c.full_name) nameMap[c.patient_id] = c.full_name;
  }

  return {
    data: (data ?? []).map((c) => ({ ...c, patient_name: nameMap[c.patient_id] ?? null })),
    error: null,
  };
}

/**
 * Create a new claim / invoice.
 * Manual invoices from EHR → Invoices do not require appointment_id or note_id.
 */
export async function createClaim(payload) {
  const { data, error } = await supabase
    .from("billing_claims")
    .insert({ ...payload, claim_status: payload.claim_status ?? "draft" })
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
 */
export async function getMyBilling(patientId) {
  const { data, error } = await supabase
    .from("billing_claims")
    .select("*")
    .eq("patient_id", patientId)
    .order("service_date", { ascending: false });
  return { data, error };
}
