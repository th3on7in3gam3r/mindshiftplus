/** Staff team chat helpers (EHR internal messaging). */

export function threadKey(message) {
  return message.thread_id || message.id;
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
      const subject = root.subject || latest.body?.slice(0, 60) || "Message";

      return {
        id,
        isDirect,
        isTeam: !isDirect,
        subject,
        messages: sorted,
        latest,
        otherUserId,
        otherName,
        patientContext: root.patient_context || sorted.find((m) => m.patient_context)?.patient_context || null,
        hasUnread: sorted.some((m) => m.from_user !== currentUserId && !m.read_by_me),
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
  if (thread.isTeam) return thread.subject || "Team chat";
  const otherId = thread.otherUserId;
  const name = thread.otherName || staffById[otherId]?.full_name || "Direct message";
  return name;
}
