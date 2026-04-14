import { supabase } from "./supabase";

// ── USER PROFILE ───────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

// ── MOOD LOGS ──────────────────────────────────────────────────────────────────
export async function logMood(userId, mood, moodLabel) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Check if already logged today
  const { data: existing } = await supabase
    .from("mood_logs")
    .select("id")
    .eq("user_id", userId)
    .gte("logged_at", startOfDay.toISOString())
    .maybeSingle();

  if (existing) {
    // Update today's entry — no .select() to avoid RLS conflict
    const { error } = await supabase
      .from("mood_logs")
      .update({ mood, mood_label: moodLabel })
      .eq("id", existing.id);
    return { error };
  }

  // Insert — no .select() chained, avoids 409 RLS issue
  const { error } = await supabase
    .from("mood_logs")
    .insert({ user_id: userId, mood, mood_label: moodLabel });

  return { error };
}

export async function getMoodLogs(userId, limit = 30) {
  const { data, error } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function getTodayMood(userId) {
  // Build midnight in local time correctly for the query
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const { data, error } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

// ── STREAK ─────────────────────────────────────────────────────────────────────
export async function getStreak(userId) {
  const { data, error } = await supabase
    .from("mood_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (error || !data?.length) return 0;

  // Build unique local-date keys
  const uniqueDays = [...new Set(
    data.map(r => {
      const d = new Date(r.logged_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  )];

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  let streak = 0;
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(now);
    expected.setDate(now.getDate() - i);
    const expectedKey = `${expected.getFullYear()}-${expected.getMonth()}-${expected.getDate()}`;
    if (uniqueDays[i] === expectedKey) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── JOURNAL ────────────────────────────────────────────────────────────────────
export async function getJournalEntries(userId) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function saveJournalEntry(userId, entry) {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      title: entry.title || null,
      body: entry.body,
      mood: entry.mood || null,
      tags: entry.tags || [],
    })
    .select()
    .single();
  return { data, error };
}

export async function deleteJournalEntry(entryId) {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId);
  return { error };
}

// ── PROGRAMS ───────────────────────────────────────────────────────────────────
export async function getProgramProgress(userId) {
  const { data, error } = await supabase
    .from("program_progress")
    .select("*")
    .eq("user_id", userId);
  return { data, error };
}

export async function upsertProgramProgress(userId, programId, currentDay) {
  const { data, error } = await supabase
    .from("program_progress")
    .upsert({
      user_id: userId,
      program_id: programId,
      current_day: currentDay,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,program_id" })
    .select()
    .single();
  return { data, error };
}

// ── MIA MESSAGES ───────────────────────────────────────────────────────────────
export async function getMiaMessages(userId, limit = 50) {
  const { data, error } = await supabase
    .from("mia_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return { data, error };
}

export async function saveMiaMessage(userId, role, content) {
  const { data, error } = await supabase
    .from("mia_messages")
    .insert({ user_id: userId, role, content })
    .select()
    .single();
  return { data, error };
}

// ── AFFIRMATIONS ───────────────────────────────────────────────────────────────
export async function getSavedAffirmations(userId) {
  const { data, error } = await supabase
    .from("affirmations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function saveAffirmation(userId, content, mood, theme) {
  const { data, error } = await supabase
    .from("affirmations")
    .insert({ user_id: userId, content, mood, theme })
    .select()
    .single();
  return { data, error };
}

export async function deleteAffirmation(id) {
  const { error } = await supabase
    .from("affirmations")
    .delete()
    .eq("id", id);
  return { error };
}

// ── INSIGHTS ───────────────────────────────────────────────────────────────────
export async function getInsights(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [moodRes, journalRes, prevMoodRes] = await Promise.all([
    // This week's moods
    supabase.from("mood_logs").select("mood, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", weekAgo.toISOString())
      .order("logged_at", { ascending: true }),
    // All journal entries
    supabase.from("journal_entries").select("tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    // Previous week moods for comparison
    supabase.from("mood_logs").select("mood")
      .eq("user_id", userId)
      .gte("logged_at", twoWeeksAgo.toISOString())
      .lt("logged_at", weekAgo.toISOString()),
  ]);

  const weekMoods = moodRes.data ?? [];
  const allEntries = journalRes.data ?? [];
  const prevMoods = prevMoodRes.data ?? [];

  // Build 7-day mood chart — one value per day (avg), null if no entry
  const dayLabels = [];
  const moodChart = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    const label = d.toLocaleDateString("en-US", { weekday:"short" });
    dayLabels.push(label);
    const dayMoods = weekMoods.filter(m => {
      const md = new Date(m.logged_at);
      md.setHours(0,0,0,0);
      return md.toDateString() === d.toDateString();
    });
    moodChart.push(dayMoods.length
      ? Math.round(dayMoods.reduce((s,m) => s + m.mood, 0) / dayMoods.length)
      : null
    );
  }

  // Tag counts
  const TAG_COLORS = {
    Gratitude:"var(--teal)", Anxiety:"var(--lavender)", Stress:"var(--rose)",
    Breakthrough:"var(--purple)", Goals:"var(--gold)", Healing:"var(--teal)",
    Joy:"var(--gold)", Prayer:"var(--lavender)",
  };
  const tagCounts = {};
  allEntries.forEach(e => {
    (e.tags ?? []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a,b) => b[1] - a[1]).slice(0,5)
    .map(([name, count]) => ({ name, count, color: TAG_COLORS[name] ?? "var(--purple)" }));

  // Mood trend vs last week
  const thisAvg = weekMoods.length
    ? weekMoods.reduce((s,m) => s + m.mood, 0) / weekMoods.length : null;
  const prevAvg = prevMoods.length
    ? prevMoods.reduce((s,m) => s + m.mood, 0) / prevMoods.length : null;
  const moodTrend = thisAvg !== null && prevAvg !== null
    ? Math.round(((thisAvg - prevAvg) / 4) * 100) : null;

  // Positive vs stress tag ratio
  const positiveTags = ["Gratitude","Breakthrough","Healing","Goals","Joy"];
  const stressTags = ["Stress","Anxiety"];
  const positiveCount = allEntries.filter(e => e.tags?.some(t => positiveTags.includes(t))).length;
  const stressCount = allEntries.filter(e => e.tags?.some(t => stressTags.includes(t))).length;
  const total = allEntries.length;

  // What's improving vs needs care — derived from real data
  const improving = [];
  const needsCare = [];

  if(thisAvg !== null && thisAvg >= 2.5) improving.push("Emotional regulation");
  else if(thisAvg !== null) needsCare.push("Emotional regulation");

  if(positiveCount > stressCount) improving.push("Positive mindset");
  else if(stressCount > 0) needsCare.push("Stress management");

  const recentEntries = allEntries.filter(e => new Date(e.created_at) >= weekAgo);
  if(recentEntries.length >= 3) improving.push("Journal consistency");
  else needsCare.push("Journal consistency");

  if(tagCounts["Gratitude"] >= 2) improving.push("Gratitude practice");
  if(tagCounts["Anxiety"] >= 3) needsCare.push("Managing anxiety");
  if(tagCounts["Healing"] >= 1) improving.push("Healing journey");

  return {
    dayLabels, moodChart, topTags,
    moodTrend, positiveCount, stressCount, total,
    improving: improving.slice(0,4),
    needsCare: needsCare.slice(0,4),
    hasData: weekMoods.length > 0 || allEntries.length > 0,
    journalCount: allEntries.length,
    weekMoodCount: weekMoods.length,
  };
}


export async function getWellnessProgress(userId) {
  const [moodRes, journalRes] = await Promise.all([
    supabase
      .from("mood_logs")
      .select("mood, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(30),
    supabase
      .from("journal_entries")
      .select("tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const moods = moodRes.data ?? [];
  const entries = journalRes.data ?? [];

  // Emotional Regulation — % of moods that are Good (2), Great (3), Amazing (4)
  const emotionalReg = moods.length === 0 ? 0
    : Math.round((moods.filter(m => m.mood >= 2).length / moods.length) * 100);

  // Stress Management — starts at 100, reduced by stress/anxiety tags, boosted by positive tags
  const stressTags = ["Stress","Anxiety"];
  const positiveTags = ["Gratitude","Breakthrough","Healing","Goals","Joy"];
  let stressScore = 50; // baseline for new users
  if(entries.length > 0) {
    const stressCount = entries.filter(e => e.tags?.some(t => stressTags.includes(t))).length;
    const positiveCount = entries.filter(e => e.tags?.some(t => positiveTags.includes(t))).length;
    stressScore = Math.round(
      Math.min(100, Math.max(10,
        50 + (positiveCount / entries.length) * 50 - (stressCount / entries.length) * 30
      ))
    );
  }

  // Self-Awareness — based on journal consistency over last 30 days
  const last30Days = 30;
  const uniqueJournalDays = new Set(
    entries.map(e => new Date(e.created_at).toDateString())
  ).size;
  const selfAwareness = Math.round(Math.min(100, (uniqueJournalDays / last30Days) * 100));

  return {
    emotionalReg: moods.length === 0 ? null : emotionalReg,
    stressScore: entries.length === 0 ? null : stressScore,
    selfAwareness: entries.length === 0 ? null : selfAwareness,
    hasData: moods.length > 0 || entries.length > 0,
  };
}

export async function getDashboardStats(userId) {
  const [journalRes, moodRes, programRes] = await Promise.all([
    supabase.from("journal_entries").select("id", { count: "exact" }).eq("user_id", userId),
    supabase.from("mood_logs").select("mood, logged_at").eq("user_id", userId).order("logged_at", { ascending: false }).limit(30),
    supabase.from("program_progress").select("*").eq("user_id", userId),
  ]);

  const journalCount = journalRes.count ?? 0;
  const moods = moodRes.data ?? [];
  const avgMood = moods.length
    ? Math.round(moods.reduce((s, m) => s + m.mood, 0) / moods.length)
    : null;
  const moodEmojis = ["😔","😐","🙂","😊","🌟"];
  const avgMoodEmoji = avgMood !== null ? moodEmojis[avgMood] : "—";

  // Sessions this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = moods.filter(m => new Date(m.logged_at) >= weekAgo).length;

  return {
    journalCount,
    avgMoodEmoji,
    thisWeek: `${thisWeek}/7`,
    programs: programRes.data ?? [],
  };
}
