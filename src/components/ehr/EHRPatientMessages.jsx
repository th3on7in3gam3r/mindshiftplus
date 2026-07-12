import { useState, useEffect, useRef, useMemo } from "react";
import {
  EhrBtn, EhrBadge, SectionHeader, Spinner, formatDateTime,
} from "./EHRUI";
import {
  getAllPortalMessages,
  getChartsForPicker,
  sendClinicianMessage,
  deletePortalMessage,
  deletePortalThread,
  archivePortalMessage,
  archivePortalThread,
  restorePortalThread,
  markPortalMessageRead,
  canManageOldPortalMessages,
  isPortalMessageOldEnough,
  PORTAL_MESSAGE_RETENTION_DAYS,
  daysUntilPortalMessageRetention,
} from "../../lib/ehrDb";

function initials(name) {
  return (name || "P").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "P";
}

function relativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupThreads(messages, chartByPatient) {
  const threads = messages.reduce((acc, m) => {
    const k = m.thread_id || m.id;
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});

  return Object.entries(threads)
    .map(([id, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const latest = sorted[sorted.length - 1];
      const patientId = msgs[0].patient_id;
      const patientName = msgs.find((m) => m.patient_name)?.patient_name ?? "Patient";
      return {
        id,
        patient_id: patientId,
        patient_name: patientName,
        chart_id: chartByPatient[patientId] ?? null,
        subject: msgs.find((m) => m.subject)?.subject ?? "Message",
        messages: sorted,
        latest,
        hasUnread: msgs.some((m) => !m.read && m.sender_role === "patient"),
        isArchived: msgs.every((m) => m.archived_at),
      };
    })
    .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
}

function threadEligibleForRetention(thread) {
  return thread.messages.every((m) => isPortalMessageOldEnough(m.created_at));
}

function FilterPill({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        border: `1.5px solid ${active ? "var(--ehr-accent)" : "var(--ehr-border)"}`,
        background: active ? "color-mix(in srgb,var(--ehr-accent) 12%,transparent)" : "transparent",
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
          background: active ? "var(--ehr-accent)" : "var(--ehr-muted2)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          borderRadius: 10,
          padding: "1px 6px",
          minWidth: 18,
          textAlign: "center",
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function PatientPathGuide({ onDismiss }) {
  const steps = [
    { side: "dark", label: "Clinical Suite (you are here)", detail: "EHR → Messages → select thread → Send reply", icon: "⚕️" },
    { side: "light", label: "Patient Portal (they see it here)", detail: "Sign in → left sidebar 💬 Messages → tap the thread", icon: "🏥" },
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
            Where patients see your replies
          </div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted)", lineHeight: 1.55 }}>
            Same secure thread — <strong>Clinical Suite</strong> on your side, <strong>Patient Portal → Messages</strong> on theirs. Unread replies also show on the patient Dashboard.
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
                {s.icon} {s.side === "dark" ? "Staff · Clinical Suite" : "Patient · Portal"}
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

export default function EHRPatientMessages({ clinician, onOpenChart }) {
  const [messages, setMessages] = useState([]);
  const [chartByPatient, setChartByPatient] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showPatientPath, setShowPatientPath] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [composePatient, setComposePatient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  const portalPatients = useMemo(
    () => patients.filter((p) => p.patient_id),
    [patients]
  );
  const ehrOnlyPatients = useMemo(
    () => patients.filter((p) => !p.patient_id),
    [patients]
  );
  const selectedComposePatient = useMemo(() => {
    if (!composePatient) return null;
    if (composePatient.startsWith("chart:")) {
      const chartId = composePatient.slice(6);
      return patients.find((p) => p.id === chartId) ?? null;
    }
    return patients.find((p) => p.patient_id === composePatient) ?? null;
  }, [composePatient, patients]);
  const composePortalPatientId = selectedComposePatient?.patient_id ?? null;

  const messagesEndRef = useRef(null);
  const replyRef = useRef(null);
  const isManager = canManageOldPortalMessages(clinician?.email);
  const clinicianFirst = clinician?.full_name?.split(" ")[0] ?? "Clinic";

  async function loadCharts() {
    const { data } = await getChartsForPicker();
    const map = {};
    for (const c of data ?? []) {
      if (c.patient_id) map[c.patient_id] = c.id;
    }
    setChartByPatient(map);
    setPatients(data ?? []);
  }

  async function load(includeArchived = showArchived) {
    setLoading(true);
    const { data, error: err } = await getAllPortalMessages({ includeArchived });
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load messages.");
    else {
      setMessages(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCharts();
    load(showArchived);
  }, [showArchived]);

  const threads = useMemo(() => groupThreads(messages, chartByPatient), [messages, chartByPatient]);

  const unreadCount = messages.filter((m) => !m.read && m.sender_role === "patient" && !m.archived_at).length;

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.hasUnread);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        t.patient_name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.latest.body?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [threads, filter, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread?.messages?.length, selectedThread?.id]);

  async function openThread(thread) {
    setComposeOpen(false);
    setReply("");
    const unread = thread.messages.filter((m) => !m.read && m.sender_role === "patient");
    if (unread.length) {
      await Promise.all(unread.map((m) => markPortalMessageRead(m.id)));
      setMessages((prev) =>
        prev.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, read: true } : m))
      );
    }
    setSelectedThread({
      ...thread,
      messages: thread.messages.map((m) =>
        unread.some((u) => u.id === m.id) ? { ...m, read: true } : m
      ),
      hasUnread: false,
    });
    setTimeout(() => replyRef.current?.focus(), 100);
  }

  async function handleReply(e) {
    e?.preventDefault();
    if (!reply.trim() || !selectedThread || selectedThread.isArchived) return;
    setSending(true);
    const subject = selectedThread.subject?.startsWith("Re:")
      ? selectedThread.subject
      : `Re: ${selectedThread.subject || "Message"}`;
    const { data, error: err } = await sendClinicianMessage(
      selectedThread.patient_id,
      subject,
      reply.trim(),
      selectedThread.id
    );
    setSending(false);
    if (err) {
      setError(typeof err === "string" ? err : err.message ?? "Failed to send reply.");
      return;
    }
    if (data) {
      const updated = { ...data, patient_name: selectedThread.patient_name };
      setMessages((prev) => [...prev, updated]);
      setSelectedThread((prev) => ({
        ...prev,
        messages: [...prev.messages, updated],
        latest: updated,
      }));
      setReply("");
    }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!composePortalPatientId || !composeBody.trim()) return;
    setComposeSending(true);
    const patient = patients.find((p) => p.patient_id === composePortalPatientId);
    const { data, error: err } = await sendClinicianMessage(
      composePortalPatientId,
      composeSubject.trim() || "Message from your care team",
      composeBody.trim(),
      null
    );
    setComposeSending(false);
    if (err) {
      setError(typeof err === "string" ? err : err.message ?? "Failed to send message.");
      return;
    }
    if (data) {
      const enriched = {
        ...data,
        patient_name: patient?.display_name ?? patient?.full_name ?? "Patient",
      };
      const allMsgs = [...messages, enriched];
      setMessages(allMsgs);
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      setComposePatient("");
      const thread = groupThreads(allMsgs, chartByPatient).find((t) => t.id === data.thread_id);
      if (thread) openThread(thread);
    }
  }

  function guardRetentionAction(threadOrMessage, actionLabel) {
    if (!isManager) {
      setError(`Only clinic leadership can ${actionLabel} messages.`);
      return false;
    }
    const createdAt = threadOrMessage.created_at ?? threadOrMessage.oldestAt;
    if (!isPortalMessageOldEnough(createdAt)) {
      const daysLeft = daysUntilPortalMessageRetention(createdAt);
      setError(`Messages must be at least ${PORTAL_MESSAGE_RETENTION_DAYS} days old. Try again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`);
      return false;
    }
    return true;
  }

  async function handleDeleteMessage(id, createdAt) {
    if (!guardRetentionAction({ created_at: createdAt }, "delete")) return;
    if (!confirm("Permanently delete this message? This cannot be undone.")) return;
    const { error: err } = await deletePortalMessage(id);
    if (err) { setError(err.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedThread?.messages.some((m) => m.id === id)) {
      const remaining = selectedThread.messages.filter((m) => m.id !== id);
      if (!remaining.length) setSelectedThread(null);
      else setSelectedThread({ ...selectedThread, messages: remaining });
    }
  }

  async function handleArchiveMessage(id, createdAt) {
    if (!guardRetentionAction({ created_at: createdAt }, "archive")) return;
    if (!confirm("Archive this message? It will be hidden from the patient portal.")) return;
    const { error: err } = await archivePortalMessage(id);
    if (err) { setError(err.message); return; }
    await load(showArchived);
    setSelectedThread(null);
  }

  async function handleDeleteThread() {
    if (!selectedThread || !guardRetentionAction(selectedThread.messages[0], "delete")) return;
    if (!confirm("Permanently delete this entire conversation? This cannot be undone.")) return;
    const { error: err } = await deletePortalThread(selectedThread.id);
    if (err) { setError(err.message); return; }
    setMessages((prev) => prev.filter((m) => (m.thread_id || m.id) !== selectedThread.id));
    setSelectedThread(null);
  }

  async function handleArchiveThread() {
    if (!selectedThread || !threadEligibleForRetention(selectedThread)) {
      if (isManager) {
        setError(`All messages in the thread must be at least ${PORTAL_MESSAGE_RETENTION_DAYS} days old to archive.`);
      }
      return;
    }
    if (!guardRetentionAction(selectedThread.messages[0], "archive")) return;
    if (!confirm("Archive this conversation? It will be hidden from the patient portal.")) return;
    const { error: err } = await archivePortalThread(selectedThread.id);
    if (err) { setError(err.message); return; }
    await load(showArchived);
    setSelectedThread(null);
  }

  async function handleRestoreThread() {
    if (!selectedThread || !isManager) return;
    const { error: err } = await restorePortalThread(selectedThread.id);
    if (err) { setError(err.message); return; }
    await load(showArchived);
    setSelectedThread(null);
  }

  const panelHeight = "calc(100vh - 180px)";

  return (
    <div style={{ padding: "1.5rem 2rem 2rem", maxWidth: 1280, margin: "0 auto" }}>
      <SectionHeader
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Patient Messages
            {unreadCount > 0 && (
              <span style={{ background: "var(--ehr-teal)", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px" }}>
                {unreadCount} unread
              </span>
            )}
          </span>
        }
        subtitle={
          isManager
            ? `Reply to patients here — no need to open the Patient Portal · Archive/delete after ${PORTAL_MESSAGE_RETENTION_DAYS} days (leadership only)`
            : "Reply to patients directly from the EHR — messages appear in their Patient Portal inbox"
        }
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <EhrBtn small onClick={() => { setComposeOpen(true); setSelectedThread(null); }}>
              ✉️ New Message
            </EhrBtn>
            {isManager && (
              <EhrBtn small variant="secondary" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? "Hide archived" : "Show archived"}
              </EhrBtn>
            )}
            <EhrBtn small variant="secondary" onClick={() => load(showArchived)}>↻ Refresh</EhrBtn>
          </div>
        }
      />

      {showPatientPath && <PatientPathGuide onDismiss={() => setShowPatientPath(false)} />}

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>Dismiss</button>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 340px) 1fr",
        gap: 0,
        height: panelHeight,
        minHeight: 520,
        border: "1px solid var(--ehr-border)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--ehr-surface)",
        boxShadow: "var(--ehr-shadow)",
      }}>
        {/* ── Thread list ── */}
        <div style={{ borderRight: "1px solid var(--ehr-border)", display: "flex", flexDirection: "column", background: "var(--ehr-card2)" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ehr-border)" }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients or subjects…"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 10,
                border: "1.5px solid var(--ehr-border)",
                background: "var(--ehr-card)",
                fontSize: 13,
                color: "var(--ehr-text)",
                outline: "none",
                fontFamily: "inherit",
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <FilterPill active={filter === "all"} onClick={() => setFilter("all")} count={0}>All</FilterPill>
              <FilterPill active={filter === "unread"} onClick={() => setFilter("unread")} count={unreadCount}>Unread</FilterPill>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {loading ? (
              <div style={{ padding: "2rem" }}><Spinner /></div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ehr-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                {search ? "No conversations match your search." : showArchived ? "No archived conversations." : "No patient messages yet."}
              </div>
            ) : (
              filteredThreads.map((t) => {
                const selected = selectedThread?.id === t.id;
                const fromClinic = t.latest.sender_role === "clinic";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openThread(t)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 12px",
                      marginBottom: 4,
                      borderRadius: 12,
                      border: selected ? "1px solid color-mix(in srgb,var(--ehr-accent) 40%,transparent)" : "1px solid transparent",
                      background: selected
                        ? "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"
                        : t.hasUnread
                          ? "color-mix(in srgb,var(--ehr-teal) 8%,var(--ehr-card))"
                          : "var(--ehr-card)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: t.isArchived ? 0.8 : 1,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: t.hasUnread ? "linear-gradient(135deg,var(--ehr-teal),var(--ehr-accent))" : "var(--ehr-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                        color: t.hasUnread ? "#fff" : "var(--ehr-muted)",
                      }}>
                        {initials(t.patient_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
                          <span style={{ fontSize: 13, fontWeight: t.hasUnread ? 700 : 600, color: "var(--ehr-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.patient_name}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--ehr-muted2)", flexShrink: 0 }}>{relativeTime(t.latest.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: t.hasUnread ? 600 : 500, color: "var(--ehr-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                          {t.hasUnread && <span style={{ color: "var(--ehr-teal)", marginRight: 4 }}>●</span>}
                          {t.subject}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {fromClinic ? `You: ` : ""}{t.latest.body}
                        </div>
                        {t.isArchived && <span style={{ marginTop: 4, display: "inline-block" }}><EhrBadge color="muted">Archived</EhrBadge></span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Conversation panel ── */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {composeOpen ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ehr-text)" }}>New message to patient</h3>
                <EhrBtn small variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</EhrBtn>
              </div>
              <form onSubmit={handleCompose} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Patient</label>
                  <select
                    value={composePatient}
                    onChange={(e) => setComposePatient(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--ehr-border)", background: "var(--ehr-card)", fontSize: 14, fontFamily: "inherit" }}
                  >
                    <option value="">Select a patient…</option>
                    {portalPatients.length > 0 && (
                      <optgroup label="Portal patients — can receive messages">
                        {portalPatients.map((p) => (
                          <option key={p.patient_id} value={p.patient_id}>
                            {p.display_name || p.full_name || p.mrn}{p.mrn ? ` (${p.mrn})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {ehrOnlyPatients.length > 0 && (
                      <optgroup label="EHR charts (manual) — link Portal ID to message">
                        {ehrOnlyPatients.map((p) => (
                          <option key={p.id} value={`chart:${p.id}`}>
                            {p.display_name || p.full_name || p.mrn}{p.mrn ? ` (${p.mrn})` : ""} — no portal yet
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {selectedComposePatient && !composePortalPatientId ? (
                    <div style={{
                      marginTop: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "color-mix(in srgb,var(--ehr-gold) 10%,transparent)",
                      border: "1px solid color-mix(in srgb,var(--ehr-gold) 35%,transparent)",
                      fontSize: 12,
                      color: "var(--ehr-text)",
                      lineHeight: 1.6,
                    }}>
                      <strong>{selectedComposePatient.display_name || selectedComposePatient.mrn}</strong> was added manually in the EHR and does not have a Portal Patient ID yet.
                      Portal messages require a linked portal login. Open their chart → <strong>Edit Chart</strong> → add the patient&apos;s Portal Patient ID once they sign up.
                      {selectedComposePatient.id && onOpenChart && (
                        <div style={{ marginTop: 10 }}>
                          <EhrBtn small variant="secondary" type="button" onClick={() => onOpenChart(selectedComposePatient.id)}>
                            Open chart to link Portal ID
                          </EhrBtn>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 6, lineHeight: 1.5 }}>
                      All EHR patients are listed. Only those with a linked Portal Patient ID can receive secure messages ({portalPatients.length} ready · {ehrOnlyPatients.length} EHR-only).
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Subject</label>
                  <input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. Appointment reminder"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--ehr-border)", background: "var(--ehr-card)", fontSize: 14, fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    required
                    rows={6}
                    placeholder="Write your message to the patient…"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--ehr-border)", background: "var(--ehr-card)", fontSize: 14, fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <EhrBtn type="submit" disabled={composeSending || !composePortalPatientId || !composeBody.trim()}>
                    {composeSending ? "Sending…" : "Send to Patient Portal →"}
                  </EhrBtn>
                </div>
              </form>
            </div>
          ) : !selectedThread ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.9 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 8px" }}>Select a conversation</h3>
              <p style={{ fontSize: 13, color: "var(--ehr-muted)", maxWidth: 320, lineHeight: 1.65, margin: "0 0 1.25rem" }}>
                Choose a thread on the left to read and reply. Your reply goes directly to the patient&apos;s portal — no need to sign in as them.
              </p>
              <EhrBtn small onClick={() => setComposeOpen(true)}>✉️ Start new message</EhrBtn>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ehr-border)", background: "var(--ehr-card)", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,var(--ehr-accent),var(--ehr-teal))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                    }}>
                      {initials(selectedThread.patient_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedThread.subject}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>{selectedThread.patient_name}</div>
                      {selectedThread.isArchived && (
                        <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 4 }}>Archived — hidden from patient until restored</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedThread.chart_id && onOpenChart && (
                      <EhrBtn small variant="secondary" onClick={() => onOpenChart(selectedThread.chart_id)}>
                        Open chart
                      </EhrBtn>
                    )}
                    {isManager && (
                      selectedThread.isArchived ? (
                        <EhrBtn small variant="secondary" onClick={handleRestoreThread}>Restore</EhrBtn>
                      ) : threadEligibleForRetention(selectedThread) && (
                        <>
                          <EhrBtn small variant="secondary" onClick={handleArchiveThread}>Archive</EhrBtn>
                          <EhrBtn small variant="danger" onClick={handleDeleteThread}>Delete</EhrBtn>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, background: "var(--ehr-bg)" }}>
                {selectedThread.messages.map((m) => {
                  const isClinic = m.sender_role === "clinic";
                  const canRetain = isManager && isPortalMessageOldEnough(m.created_at);
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isClinic ? "flex-end" : "flex-start",
                        maxWidth: "78%",
                        minWidth: 120,
                      }}
                    >
                      <div style={{
                        padding: "11px 14px",
                        borderRadius: isClinic ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isClinic
                          ? "linear-gradient(135deg,color-mix(in srgb,var(--ehr-accent) 18%,transparent),color-mix(in srgb,var(--ehr-teal) 12%,transparent))"
                          : "var(--ehr-card)",
                        border: "1px solid var(--ehr-border)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isClinic ? "var(--ehr-accent)" : "var(--ehr-teal)" }}>
                            {isClinic ? clinicianFirst : "Patient"}
                          </span>
                          {isManager && !selectedThread.isArchived && canRetain && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button type="button" onClick={() => handleArchiveMessage(m.id, m.created_at)} style={{ background: "none", border: "none", color: "var(--ehr-muted)", fontSize: 10, cursor: "pointer" }}>Archive</button>
                              <button type="button" onClick={() => handleDeleteMessage(m.id, m.created_at)} style={{ background: "none", border: "none", color: "var(--ehr-rose)", fontSize: 10, cursor: "pointer" }}>Delete</button>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: "var(--ehr-text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.body}</div>
                        <div style={{ fontSize: 10, color: "var(--ehr-muted2)", marginTop: 6 }}>{formatDateTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply composer — sticky bottom */}
              {!selectedThread.isArchived ? (
                <div style={{
                  padding: "14px 18px",
                  borderTop: "1px solid var(--ehr-border)",
                  background: "var(--ehr-card)",
                  flexShrink: 0,
                }}>
                  <form onSubmit={handleReply}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Reply to {selectedThread.patient_name}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <textarea
                        ref={replyRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                        rows={3}
                        placeholder="Type your reply… (⌘/Ctrl + Enter to send)"
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1.5px solid var(--ehr-border)",
                          background: "var(--ehr-bg)",
                          fontSize: 14,
                          fontFamily: "inherit",
                          resize: "none",
                          lineHeight: 1.55,
                          outline: "none",
                        }}
                      />
                      <EhrBtn type="submit" disabled={sending || !reply.trim()} style={{ flexShrink: 0, alignSelf: "stretch", minWidth: 100 }}>
                        {sending ? "…" : "Send ↵"}
                      </EhrBtn>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 8, marginBottom: 0 }}>
                      Delivered securely to the patient&apos;s portal inbox. Not for emergencies — patients should call 911 in crisis.
                    </p>
                  </form>
                </div>
              ) : (
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--ehr-border)", fontSize: 13, color: "var(--ehr-muted)", fontStyle: "italic", background: "var(--ehr-card)" }}>
                  This thread is archived. Restore it to send new replies.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
