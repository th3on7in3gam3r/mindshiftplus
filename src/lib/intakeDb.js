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
