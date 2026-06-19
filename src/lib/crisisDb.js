import { supabase } from "./supabase";

async function enrichWithPatientNames(alerts) {
  const userIds = [...new Set((alerts ?? []).map((a) => a.user_id).filter(Boolean))];
  let nameMap = {};
  let emailMap = {};
  if (userIds.length) {
    const [{ data: profiles }, { data: charts }] = await Promise.all([
      supabase.from("patient_profiles").select("id, full_name").in("id", userIds),
      supabase.from("ehr_charts").select("patient_id, full_name").in("patient_id", userIds),
    ]);
    for (const p of profiles ?? []) {
      if (p.full_name) nameMap[p.id] = p.full_name;
    }
    for (const c of charts ?? []) {
      if (c.full_name && !nameMap[c.patient_id]) nameMap[c.patient_id] = c.full_name;
    }
  }
  return (alerts ?? []).map((a) => ({
    ...a,
    patient_name: nameMap[a.user_id] ?? "Unknown Patient",
    patient_email: emailMap[a.user_id] ?? null,
  }));
}

export async function getCrisisAlerts({ filter = "unreviewed" } = {}) {
  let query = supabase
    .from("crisis_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter === "unreviewed") query = query.eq("reviewed", false);
  else if (filter === "high" || filter === "moderate") query = query.eq("severity", filter);

  const { data, error } = await query;
  if (error) return { data: null, error };
  return { data: await enrichWithPatientNames(data), error: null };
}

export async function getUnreviewedCrisisCount() {
  const { count, error } = await supabase
    .from("crisis_alerts")
    .select("*", { count: "exact", head: true })
    .eq("reviewed", false);
  return { count: count ?? 0, error };
}

export async function markCrisisReviewed(alertId, notes = "") {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("crisis_alerts")
    .update({
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
      notes: notes.trim() || null,
    })
    .eq("id", alertId)
    .select()
    .single();
  return { data, error };
}

export function crisisSourceLabel(source) {
  const labels = {
    mia: "💬 Mia Chat",
    journal: "📔 Journal",
    portal_message: "✉️ Portal Message",
  };
  return labels[source] ?? source;
}
