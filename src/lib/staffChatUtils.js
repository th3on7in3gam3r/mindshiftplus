/** Staff team chat helpers (EHR internal messaging). */

export const STAFF_CHANNELS = [
  { id: "general", label: "#general", description: "All staff — clinic-wide updates" },
  { id: "scheduling", label: "#scheduling", description: "Appointments, coverage, calendar" },
  { id: "billing", label: "#billing", description: "Superbills, payers, claims, invoices" },
  { id: "clinical", label: "#clinical", description: "Charts, notes, clinical questions" },
];

export function channelLabel(channelId) {
  return STAFF_CHANNELS.find((c) => c.id === channelId)?.label ?? "#general";
}

export function channelDescription(channelId) {
  return STAFF_CHANNELS.find((c) => c.id === channelId)?.description ?? "";
}

export function threadKey(message) {
  return message.thread_id || message.id;
}

/** Parse @FirstName or @Full Name mentions against the team roster. */
export function parseMentionedUserIds(body, team, currentUserId) {
  if (!body || !team?.length) return [];
  const lower = body.toLowerCase();
  const ids = new Set();

  for (const member of team) {
    if (!member?.user_id || member.user_id === currentUserId) continue;
    const name = (member.full_name || "").trim();
    if (!name) continue;
    const first = name.split(/\s+/)[0];
    const candidates = [`@${name.toLowerCase()}`, `@${first.toLowerCase()}`];
    if (candidates.some((token) => lower.includes(token))) {
      ids.add(member.user_id);
    }
  }

  return [...ids];
}

/** Split message text into plain + @mention segments for rendering. */
export function splitMentionParts(body, staffById = {}) {
  if (!body) return [{ text: "", mention: false }];
  const names = [...new Set(
    Object.values(staffById)
      .map((m) => m?.full_name)
      .filter(Boolean)
      .flatMap((full) => {
        const first = full.split(/\s+/)[0];
        return [full, first];
      })
  )].sort((a, b) => b.length - a.length);

  if (!names.length) return [{ text: body, mention: false }];

  const pattern = new RegExp(
    `@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );

  const parts = [];
  let lastIndex = 0;
  for (const match of body.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parts.push({ text: body.slice(lastIndex, match.index), mention: false });
    }
    parts.push({ text: match[0], mention: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push({ text: body.slice(lastIndex), mention: false });
  return parts.length ? parts : [{ text: body, mention: false }];
}

export function threadMatchesSearch(thread, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = [
    thread.subject,
    thread.patientContext,
    thread.otherName,
    thread.channel ? channelLabel(thread.channel) : "",
    ...thread.messages.flatMap((m) => [m.subject, m.body, m.from_name, m.patient_context, m.attachment_name]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function threadMentionsUser(thread, userId) {
  return thread.messages.some((m) => (m.mentioned_user_ids || []).includes(userId));
}

export function groupStaffThreads(messages, currentUserId, staffById = {}) {
  const buckets = messages.reduce((acc, m) => {
    const key = threadKey(m);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return Object.entries(buckets)
    .map(([id, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const latest = sorted[sorted.length - 1];
      const root = sorted[0];
      const isDirect = !!(root.to_user || sorted.some((m) => m.to_user));
      const otherUserId = root.from_user === currentUserId ? root.to_user : root.from_user;
      const otherName = staffById[otherUserId]?.full_name || (root.to_user ? "Direct message" : null);
      const channel = isDirect ? null : (root.channel || sorted.find((m) => m.channel)?.channel || "general");
      const subject = root.subject || latest.body?.slice(0, 60) || "Message";

      return {
        id,
        isDirect,
        isTeam: !isDirect,
        channel,
        subject,
        messages: sorted,
        latest,
        otherUserId,
        otherName,
        patientContext: root.patient_context || sorted.find((m) => m.patient_context)?.patient_context || null,
        hasUnread: sorted.some((m) => m.from_user !== currentUserId && !m.read_by_me),
        hasMention: threadMentionsUser({ messages: sorted }, currentUserId),
      };
    })
    .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
}

export function relativeChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (now - d < 604800000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function threadTitle(thread, currentUserId, staffById = {}) {
  if (thread.isTeam) {
    const ch = channelLabel(thread.channel);
    const subj = thread.subject;
    if (subj && !["Team message", "Message"].includes(subj)) return `${ch} · ${subj}`;
    return ch;
  }
  const otherId = thread.otherUserId;
  return thread.otherName || staffById[otherId]?.full_name || "Direct message";
}

/** Human-readable read receipt line for a sent message. */
export function formatReadReceipt(reads, staffById, currentUserId, { isDirect = false } = {}) {
  const others = (reads ?? []).filter((r) => r.user_id !== currentUserId);
  if (!others.length) return null;
  const names = others.map((r) => {
    const first = (staffById[r.user_id]?.full_name || "Staff").split(/\s+/)[0];
    return first;
  });
  if (isDirect) return others.length ? "Read" : null;
  if (names.length === 1) return `Seen by ${names[0]}`;
  if (names.length === 2) return `Seen by ${names[0]} and ${names[1]}`;
  return `Seen by ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** @mention autocomplete when typing @ in compose/reply. */
export function mentionSuggest(text, team, currentUserId) {
  const match = String(text || "").match(/@([\w'.-]*)$/);
  if (!match) return { open: false, suggestions: [] };
  const query = match[1].toLowerCase();
  const suggestions = team.filter((m) => {
    if (m.user_id === currentUserId) return false;
    const full = (m.full_name || "").toLowerCase();
    const first = full.split(/\s+/)[0] || "";
    return !query || full.includes(query) || first.startsWith(query);
  });
  return { open: suggestions.length > 0, suggestions };
}

export function insertMention(text, member) {
  const first = (member.full_name || "Staff").split(/\s+/)[0];
  return String(text || "").replace(/@([\w'.-]*)$/, `@${first} `);
}
