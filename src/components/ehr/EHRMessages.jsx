import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { EhrCard, EhrBtn, EhrInput, EhrSelect, SectionHeader, Spinner } from "./EHRUI";
import {
  getStaffTeam,
  getStaffChatMessages,
  sendStaffChatMessage,
  markStaffMessagesRead,
  getStaffMessageReadReceipts,
  uploadStaffChatAttachment,
} from "../../lib/ehrDb";
import {
  groupStaffThreads,
  relativeChatTime,
  threadTitle,
  threadMatchesSearch,
  splitMentionParts,
  mentionSuggest,
  insertMention,
  STAFF_CHANNELS,
  channelLabel,
  channelDescription,
  formatReadReceipt,
} from "../../lib/staffChatUtils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "team", label: "Channels" },
  { id: "direct", label: "Direct" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
];

function FilterPill({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        border: `1.5px solid ${active ? "var(--ehr-accent)" : "var(--ehr-border)"}`,
        background: active ? "color-mix(in srgb,var(--ehr-accent) 12%,transparent)" : "var(--ehr-card)",
        color: active ? "var(--ehr-accent)" : "var(--ehr-muted)",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
      {count > 0 && (
        <span style={{
          background: "var(--ehr-rose)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          borderRadius: 20,
          padding: "1px 6px",
          minWidth: 18,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function StaffTeamChatGuide({ onDismiss }) {
  const steps = [
    {
      side: "dark",
      label: "EHR Team (you are here)",
      detail: "Team → New → pick #general, #scheduling, #billing, or #clinical · or DM a colleague",
      icon: "👥",
      tag: "Staff · Clinical Suite",
    },
    {
      side: "light",
      label: "Colleagues see it here",
      detail: "EHR → Team → same thread · DMs & @mentions also email if offline · patients never see this",
      icon: "💬",
      tag: "Staff · Team tab",
    },
  ];
  return (
    <div style={{
      marginBottom: "1rem",
      padding: "14px 16px",
      borderRadius: 12,
      background: "linear-gradient(135deg, color-mix(in srgb,var(--ehr-accent) 8%,var(--ehr-card)), color-mix(in srgb,var(--ehr-teal) 6%,var(--ehr-card)))",
      border: "1px solid color-mix(in srgb,var(--ehr-accent) 22%,transparent)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 4 }}>
            How staff Team Chat works
          </div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted)", lineHeight: 1.55 }}>
            Internal clinic messaging only — <strong>not</strong> Patient Messages. Post to a channel, DM a colleague, attach files, or type <strong>@Name</strong> to mention someone (they get an email if offline).
          </div>
        </div>
        <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 18, lineHeight: 1 }} aria-label="Dismiss">×</button>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px" }}>
            <div style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              background: s.side === "dark" ? "color-mix(in srgb,var(--ehr-text) 92%,transparent)" : "var(--ehr-card)",
              border: s.side === "light" ? "1px solid var(--ehr-border)" : "none",
              color: s.side === "dark" ? "#fff" : "var(--ehr-text)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.75, marginBottom: 4 }}>
                {s.icon} {s.tag}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.45 }}>{s.detail}</div>
            </div>
            {i === 0 && (
              <div style={{ fontSize: 18, color: "var(--ehr-muted2)", flexShrink: 0 }} aria-hidden>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageAttachment({ url, name, type }) {
  if (!url) return null;
  const isImage = type?.startsWith("image/");
  return (
    <div style={{ marginTop: 8 }}>
      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={name || "Attachment"}
            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block" }}
          />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ehr-accent)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          📎 {name || "Download attachment"}
        </a>
      )}
    </div>
  );
}

function MessageBody({ body, staffById }) {
  const parts = splitMentionParts(body, staffById);
  return (
    <span>
      {parts.map((part, i) => (
        part.mention ? (
          <span key={i} style={{ color: "var(--ehr-accent)", fontWeight: 700 }}>{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      ))}
    </span>
  );
}

function MentionField({ value, onChange, team, currentUserId, placeholder, rows = 2 }) {
  const { open, suggestions } = mentionSuggest(value, team, currentUserId);
  return (
    <div style={{ position: "relative" }}>
      <EhrInput
        label=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      {open && (
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "100%",
          marginBottom: 4,
          background: "var(--ehr-surface, #fff)",
          border: "1px solid var(--ehr-border)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 20,
          maxHeight: 160,
          overflowY: "auto",
        }}>
          {suggestions.map((member) => (
            <button
              key={member.user_id}
              type="button"
              onClick={() => onChange(insertMention(value, member))}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--ehr-text)",
              }}
            >
              <strong>{member.full_name}</strong>
              {member.title && <span style={{ color: "var(--ehr-muted2)", marginLeft: 6 }}>{member.title}</span>}
            </button>
          ))}
        </div>
      )}
      <p style={{ fontSize: 10, color: "var(--ehr-muted2)", margin: "4px 0 0" }}>
        Type <strong>@</strong> to mention a colleague
      </p>
    </div>
  );
}

export default function EHRMessages({ clinician, onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [reply, setReply] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showTeamGuide, setShowTeamGuide] = useState(true);
  const [readReceipts, setReadReceipts] = useState({});
  const [compose, setCompose] = useState({
    to_user: "",
    channel: "general",
    subject: "",
    body: "",
    patient_context: "",
    file: null,
  });
  const bottomRef = useRef(null);

  const staffById = useMemo(
    () => Object.fromEntries(team.map((m) => [m.user_id, m])),
    [team]
  );

  const threads = useMemo(
    () => groupStaffThreads(messages, clinician.user_id, staffById),
    [messages, clinician.user_id, staffById]
  );

  const mentionCount = useMemo(
    () => threads.filter((t) => t.hasMention && t.hasUnread).length,
    [threads]
  );

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (filter === "team") list = list.filter((t) => t.isTeam);
    if (filter === "direct") list = list.filter((t) => t.isDirect);
    if (filter === "unread") list = list.filter((t) => t.hasUnread);
    if (filter === "mentions") list = list.filter((t) => t.hasMention);
    if (channelFilter) list = list.filter((t) => t.isTeam && t.channel === channelFilter);
    if (search.trim()) list = list.filter((t) => threadMatchesSearch(t, search));
    return list;
  }, [threads, filter, channelFilter, search]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;
  const unreadCount = messages.filter((m) => m.from_user !== clinician.user_id && !m.read_by_me).length;

  const load = useCallback(async () => {
    const [{ data: msgs, error: msgErr }, { data: roster }] = await Promise.all([
      getStaffChatMessages(clinician.user_id),
      getStaffTeam(),
    ]);
    if (msgErr) {
      setError(typeof msgErr === "string" ? msgErr : msgErr.message ?? "Failed to load team chat.");
    } else {
      setMessages(msgs ?? []);
      onUnreadChange?.((msgs ?? []).filter((m) => m.from_user !== clinician.user_id && !m.read_by_me).length);
    }
    setTeam(roster ?? []);
    setLoading(false);
  }, [clinician.user_id, onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("staff-team-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ehr_messages" },
        (payload) => {
          const m = payload.new;
          const visible = !m.to_user
            || m.to_user === clinician.user_id
            || m.from_user === clinician.user_id;
          if (!visible) return;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            const read_by_me = m.from_user === clinician.user_id;
            return [...prev, { ...m, read_by_me }];
          });
          if (m.from_user !== clinician.user_id) {
            onUnreadChange?.((c) => (c ?? 0) + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinician.user_id, onUnreadChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length, activeThreadId]);

  useEffect(() => {
    if (!activeThread?.messages?.length) {
      setReadReceipts({});
      return;
    }
    const ids = activeThread.messages.map((m) => m.id);
    getStaffMessageReadReceipts(ids).then(({ data }) => setReadReceipts(data ?? {}));
  }, [activeThread?.id, activeThread?.messages?.length]);

  async function markThreadRead(thread) {
    if (!thread) return;
    const unreadIds = thread.messages
      .filter((m) => m.from_user !== clinician.user_id && !m.read_by_me)
      .map((m) => m.id);
    if (!unreadIds.length) return;
    await markStaffMessagesRead(unreadIds, clinician.user_id);
    setMessages((prev) =>
      prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_by_me: true } : m))
    );
    onUnreadChange?.(Math.max(0, unreadCount - unreadIds.length));
  }

  async function openThread(thread) {
    setActiveThreadId(thread.id);
    setShowCompose(false);
    await markThreadRead(thread);
    const ids = thread.messages.map((m) => m.id);
    const { data } = await getStaffMessageReadReceipts(ids);
    setReadReceipts(data ?? {});
  }

  async function handleReply(e) {
    e.preventDefault();
    if ((!reply.trim() && !replyFile) || !activeThread) return;
    setSending(true);
    setError(null);
    const root = activeThread.messages[0];
    let toUser = null;
    if (activeThread.isDirect) {
      toUser = root.from_user === clinician.user_id ? root.to_user : root.from_user;
      if (!toUser) {
        const other = activeThread.messages.find((m) => m.from_user !== clinician.user_id);
        toUser = other?.from_user ?? null;
      }
    }
    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    if (replyFile) {
      const upload = await uploadStaffChatAttachment(replyFile, clinician.user_id);
      if (upload.error) {
        setSending(false);
        setError(upload.error);
        return;
      }
      attachmentUrl = upload.url;
      attachmentName = upload.name;
      attachmentType = upload.type;
    }
    const { data, error: err } = await sendStaffChatMessage({
      fromUser: clinician.user_id,
      fromName: clinician.full_name,
      toUser,
      channel: activeThread.isDirect ? null : (root.channel || activeThread.channel || "general"),
      threadId: activeThread.id,
      subject: root.subject,
      body: reply.trim() || (attachmentName ? `📎 ${attachmentName}` : ""),
      patientContext: root.patient_context,
      attachmentUrl,
      attachmentName,
      attachmentType,
      team,
    });
    setSending(false);
    if (err) {
      setError(typeof err === "string" ? err : err.message ?? "Send failed.");
      return;
    }
    if (data) {
      setMessages((prev) => [...prev, { ...data, read_by_me: true }]);
      setReply("");
      setReplyFile(null);
    }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!compose.body.trim() && !compose.file) return;
    setSending(true);
    setError(null);
    const toUser = compose.to_user || null;
    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;
    if (compose.file) {
      const upload = await uploadStaffChatAttachment(compose.file, clinician.user_id);
      if (upload.error) {
        setSending(false);
        setError(upload.error);
        return;
      }
      attachmentUrl = upload.url;
      attachmentName = upload.name;
      attachmentType = upload.type;
    }
    const { data, error: err } = await sendStaffChatMessage({
      fromUser: clinician.user_id,
      fromName: clinician.full_name,
      toUser,
      channel: toUser ? null : (compose.channel || "general"),
      threadId: null,
      subject: compose.subject.trim() || (toUser ? "Direct message" : `${channelLabel(compose.channel)} message`),
      body: compose.body.trim() || (attachmentName ? `📎 ${attachmentName}` : ""),
      patientContext: compose.patient_context.trim() || null,
      attachmentUrl,
      attachmentName,
      attachmentType,
      team,
    });
    setSending(false);
    if (err) {
      setError(typeof err === "string" ? err : err.message ?? "Send failed.");
      return;
    }
    if (data) {
      setMessages((prev) => [...prev, { ...data, read_by_me: true }]);
      setShowCompose(false);
      setCompose({ to_user: "", channel: "general", subject: "", body: "", patient_context: "", file: null });
      setActiveThreadId(data.thread_id || data.id);
    }
  }

  const teamOptions = [
    { value: "", label: "— Channel (pick below) —" },
    ...team
      .filter((m) => m.user_id !== clinician.user_id)
      .map((m) => ({ value: m.user_id, label: `${m.full_name}${m.title ? ` · ${m.title}` : ""}` })),
  ];

  const channelOptions = STAFF_CHANNELS.map((c) => ({
    value: c.id,
    label: `${c.label} — ${c.description}`,
  }));

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Team Chat
            {unreadCount > 0 && (
              <span style={{ background: "var(--ehr-rose)", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px" }}>
                {unreadCount} unread
              </span>
            )}
          </span>
        }
        subtitle="Channels, DMs, @mentions, attachments, and read receipts — email alerts when offline"
        action={
          <EhrBtn small onClick={() => { setShowCompose(true); setActiveThreadId(null); }}>
            ✉️ New
          </EhrBtn>
        }
      />

      {showTeamGuide && <StaffTeamChatGuide onDismiss={() => setShowTeamGuide(false)} />}

      <div style={{ marginBottom: "0.75rem" }}>
        <EhrInput
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search messages, subjects, patient context…"
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "0.75rem" }}>
        {FILTERS.map((f) => (
          <FilterPill
            key={f.id}
            active={filter === f.id && !channelFilter}
            onClick={() => { setFilter(f.id); setChannelFilter(""); }}
            count={f.id === "unread" ? unreadCount : f.id === "mentions" ? mentionCount : 0}
          >
            {f.label}
          </FilterPill>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "1rem" }}>
        {STAFF_CHANNELS.map((ch) => (
          <FilterPill
            key={ch.id}
            active={channelFilter === ch.id}
            onClick={() => {
              setChannelFilter((prev) => (prev === ch.id ? "" : ch.id));
              if (channelFilter !== ch.id) setFilter("team");
            }}
          >
            {ch.label}
          </FilterPill>
        ))}
      </div>

      {error && (
        <div style={{
          background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)",
          border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--ehr-rose)",
          marginBottom: "1rem",
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", gap: 16, alignItems: "start", minHeight: 480 }}>
        <div>
          {loading ? <Spinner /> : filteredThreads.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 13 }}>
                {search.trim() ? "No threads match your search." : "No conversations yet."}
              </div>
            </EhrCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredThreads.map((thread) => {
                const title = threadTitle(thread, clinician.user_id, staffById);
                const active = activeThreadId === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => openThread(thread)}
                    style={{
                      padding: "0.85rem 1rem",
                      background: active
                        ? "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"
                        : thread.hasUnread
                          ? "color-mix(in srgb,var(--ehr-teal) 8%,transparent)"
                          : "var(--ehr-card)",
                      border: active
                        ? "1px solid color-mix(in srgb,var(--ehr-accent) 35%,transparent)"
                        : "1px solid var(--ehr-border)",
                      borderRadius: 12,
                      cursor: "pointer",
                      borderLeft: thread.hasUnread ? "3px solid var(--ehr-teal)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12 }}>{thread.isTeam ? "📢" : "💬"}</span>
                      {thread.isTeam && thread.channel && (
                        <span style={{ fontSize: 10, color: "var(--ehr-gold)", fontWeight: 700 }}>
                          {channelLabel(thread.channel)}
                        </span>
                      )}
                      {thread.hasMention && <span style={{ fontSize: 10, color: "var(--ehr-accent)", fontWeight: 700 }}>@</span>}
                      <span style={{
                        fontSize: 13,
                        fontWeight: thread.hasUnread ? 700 : 500,
                        color: "var(--ehr-text)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {title}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ehr-muted2)", flexShrink: 0 }}>
                        {relativeChatTime(thread.latest.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ehr-muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {thread.latest.from_name ? `${thread.latest.from_name}: ` : ""}
                      {thread.latest.body?.slice(0, 55)}{thread.latest.body?.length > 55 ? "…" : ""}
                    </div>
                    {thread.patientContext && (
                      <div style={{ fontSize: 10, color: "var(--ehr-gold)", marginTop: 4 }}>👤 {thread.patientContext}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ minHeight: 480, display: "flex", flexDirection: "column" }}>
          {showCompose ? (
            <EhrCard>
              <form onSubmit={handleCompose}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>New conversation</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <EhrBtn variant="secondary" small type="button" onClick={() => setShowCompose(false)}>Cancel</EhrBtn>
                    <EhrBtn small type="submit" disabled={sending}>{sending ? "Sending…" : "Send"}</EhrBtn>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <EhrSelect
                    label="To"
                    value={compose.to_user}
                    onChange={(e) => setCompose((c) => ({ ...c, to_user: e.target.value }))}
                    options={teamOptions}
                  />
                  {!compose.to_user && (
                    <EhrSelect
                      label="Channel"
                      value={compose.channel}
                      onChange={(e) => setCompose((c) => ({ ...c, channel: e.target.value }))}
                      options={channelOptions}
                    />
                  )}
                  <EhrInput label="Subject (optional)" value={compose.subject} onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))} placeholder="e.g. Coverage for Friday" />
                  <EhrInput label="Patient context (optional)" value={compose.patient_context} onChange={(e) => setCompose((c) => ({ ...c, patient_context: e.target.value }))} placeholder="Patient name for reference" />
                  <MentionField
                    value={compose.body}
                    onChange={(body) => setCompose((c) => ({ ...c, body }))}
                    team={team}
                    currentUserId={clinician.user_id}
                    placeholder="Write your message… use @ to mention"
                    rows={5}
                  />
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ehr-muted)", display: "block", marginBottom: 6 }}>
                      Attachment (optional, max 10 MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      onChange={(e) => setCompose((c) => ({ ...c, file: e.target.files?.[0] ?? null }))}
                    />
                    {compose.file && (
                      <p style={{ fontSize: 11, color: "var(--ehr-muted2)", margin: "4px 0 0" }}>
                        📎 {compose.file.name}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </EhrCard>
          ) : activeThread ? (
            <EhrCard style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 480 }}>
              <div style={{ marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--ehr-border)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                  {threadTitle(activeThread, clinician.user_id, staffById)}
                </h3>
                <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>
                  {activeThread.isTeam ? (
                    <>
                      {channelLabel(activeThread.channel)}
                      {channelDescription(activeThread.channel) && (
                        <span> — {channelDescription(activeThread.channel)}</span>
                      )}
                    </>
                  ) : "Direct message"}
                  {activeThread.patientContext && <span> · 👤 {activeThread.patientContext}</span>}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem", maxHeight: 360 }}>
                {activeThread.messages.map((m) => {
                  const mine = m.from_user === clinician.user_id;
                  const receipt = mine
                    ? formatReadReceipt(readReceipts[m.id], staffById, clinician.user_id, { isDirect: activeThread.isDirect })
                    : null;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "78%",
                        padding: "10px 14px",
                        borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: mine
                          ? "color-mix(in srgb,var(--ehr-accent) 18%,var(--ehr-card))"
                          : "var(--ehr-bg)",
                        border: "1px solid var(--ehr-border)",
                      }}>
                        {!mine && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-teal)", marginBottom: 4 }}>
                            {m.from_name || staffById[m.from_user]?.full_name || "Staff"}
                          </div>
                        )}
                        {m.body && (
                          <div style={{ fontSize: 14, color: "var(--ehr-text)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                            <MessageBody body={m.body} staffById={staffById} />
                          </div>
                        )}
                        <MessageAttachment url={m.attachment_url} name={m.attachment_name} type={m.attachment_type} />
                        <div style={{ fontSize: 10, color: "var(--ehr-muted2)", marginTop: 6, textAlign: mine ? "right" : "left" }}>
                          {relativeChatTime(m.created_at)}
                          {receipt && (
                            <span style={{ marginLeft: 8, color: "var(--ehr-teal)", fontWeight: 600 }}>
                              · {receipt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleReply} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <MentionField
                      value={reply}
                      onChange={setReply}
                      team={team}
                      currentUserId={clinician.user_id}
                      placeholder="Reply in thread…"
                      rows={2}
                    />
                  </div>
                  <EhrBtn type="submit" disabled={sending || (!reply.trim() && !replyFile)} small>
                    {sending ? "…" : "Send"}
                  </EhrBtn>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                    style={{ fontSize: 11 }}
                  />
                  {replyFile && (
                    <span style={{ fontSize: 11, color: "var(--ehr-muted2)" }}>📎 {replyFile.name}</span>
                  )}
                </div>
              </form>
            </EhrCard>
          ) : (
            <EhrCard style={{ flex: 1, textAlign: "center", padding: "3rem", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 480 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
              <div style={{ color: "var(--ehr-text)", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Staff team chat</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 13, lineHeight: 1.6 }}>
                Select a conversation or start a new message.<br />
                Post to <strong>#scheduling</strong>, <strong>#billing</strong>, or DM a colleague.<br />
                Use <strong>@Name</strong> to mention someone — they&apos;ll get an email if offline.
              </div>
            </EhrCard>
          )}
        </div>
      </div>
    </div>
  );
}
