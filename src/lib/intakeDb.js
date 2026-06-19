import { supabase } from "./supabase";

// ── PATIENT SIDE ──────────────────────────────────────────────────────────────
export async function getMyIntake(patientId) {
  const { data, error } = await supabase
    .from("intake_submissions")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  return { data, error };
}

export async function saveIntake(patientId, fields) {
  const { data, error } = await supabase
    .from("intake_submissions")
    .upsert({
      patient_id: patientId,
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  return { data, error };
}

export async function submitIntake(patientId, fields) {
  const { data, error } = await supabase
    .from("intake_submissions")
    .upsert({
      patient_id: patientId,
      ...fields,
      status: "pending",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  return { data, error };
}

// ── CLINICIAN SIDE ────────────────────────────────────────────────────────────
export async function getPendingIntakes() {
  const { data, error } = await supabase
    .from("intake_submissions")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  return { data, error };
}

export async function getAllIntakes() {
  const { data, error } = await supabase
    .from("intake_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  return { data, error };
}

/** Intakes that do not yet have an EHR chart (pending or reviewed only). */
export async function getIntakesWithoutCharts() {
  const [{ data: charts }, { data: intakes, error }] = await Promise.all([
    supabase.from("ehr_charts").select("patient_id"),
    supabase
      .from("intake_submissions")
      .select("id, patient_id, full_name, phone, status, submitted_at")
      .in("status", ["pending", "reviewed"])
      .order("full_name"),
  ]);
  if (error) return { data: null, error };

  const chartPatientIds = new Set((charts ?? []).map((c) => c.patient_id));
  const withoutChart = (intakes ?? []).filter((i) => i.patient_id && !chartPatientIds.has(i.patient_id));
  return { data: withoutChart, error: null };
}

export function matchesIntakeSearch(intake, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [intake.full_name, intake.phone].filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export async function markIntakeReviewed(intakeId, reviewerId) {
  const { data, error } = await supabase
    .from("intake_submissions")
    .update({
      status: "reviewed",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .select()
    .single();
  return { data, error };
}

export async function markIntakeChartCreated(intakeId) {
  const { data, error } = await supabase
    .from("intake_submissions")
    .update({ status: "chart_created" })
    .eq("id", intakeId)
    .select()
    .single();
  return { data, error };
}
