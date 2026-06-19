import { useState, useEffect } from "react";
import {
  EhrCard, EhrBtn, EhrInput, EhrBadge, SectionHeader, Spinner, formatDateTime,
} from "./EHRUI";
import {
  getAllPortalMessages,
  sendClinicianMessage,
  deletePortalMessage,
  deletePortalThread,
  markPortalMessageRead,
} from "../../lib/ehrDb";

function groupThreads(messages) {
  const threads = messages.reduce((acc, m) => {
    const k = m.thread_id || m.id;
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});
  return Object.entries(threads)
    .map(([id, msgs]) => ({
      id,
      patient_id: msgs[0].patient_id,
      patient_name: msgs.find((m) => m.patient_name)?.patient_name ?? "Patient",
      subject: msgs.find((m) => m.subject)?.subject ?? "Message",
      messages: msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      latest: msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
      hasUnread: msgs.some((m) => !m.read && m.sender_role === "patient"),
    }))
    .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
}

export default function EHRPatientMessages({ clinician }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getAllPortalMessages();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load messages.");
    else {
      setMessages(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const threads = groupThreads(messages);
  const unreadCount = messages.filter((m) => !m.read && m.sender_role === "patient").length;

  async function openThread(thread) {
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
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim() || !selectedThread) return;
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
      }));
      setReply("");
    }
  }

  async function handleDeleteMessage(id) {
    if (!confirm("Delete this message?")) return;
    const { error: err } = await deletePortalMessage(id);
    if (err) { setError(err.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedThread?.messages.some((m) => m.id === id)) {
      const remaining = selectedThread.messages.filter((m) => m.id !== id);
      if (!remaining.length) setSelectedThread(null);
      else setSelectedThread({ ...selectedThread, messages: remaining });
    }
  }

  async function handleDeleteThread() {
    if (!selectedThread || !confirm("Delete this entire conversation? This cannot be undone.")) return;
    const { error: err } = await deletePortalThread(selectedThread.id);
    if (err) { setError(err.message); return; }
    setMessages((prev) => prev.filter((m) => (m.thread_id || m.id) !== selectedThread.id));
    setSelectedThread(null);
  }

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto" }}>
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
        subtitle="Secure messages from the patient portal — visible to all clinic staff"
        action={<EhrBtn small variant="secondary" onClick={load}>↻ Refresh</EhrBtn>}
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", gap: 16, alignItems: "start" }}>
        <div>
          {loading ? <Spinner /> : threads.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "2.5rem" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 13 }}>No patient messages yet.</div>
            </EhrCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {threads.map((t) => (
                <div key={t.id} onClick={() => openThread(t)} style={{
                  padding: "0.85rem 1rem",
                  background: selectedThread?.id === t.id
                    ? "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"
                    : t.hasUnread ? "color-mix(in srgb,var(--ehr-teal) 8%,transparent)" : "var(--ehr-card)",
                  border: selectedThread?.id === t.id
                    ? "1px solid color-mix(in srgb,var(--ehr-accent) 35%,transparent)"
                    : "1px solid var(--ehr-border)",
                  borderRadius: 12, cursor: "pointer",
                  borderLeft: t.hasUnread ? "3px solid var(--ehr-teal)" : undefined,
                }}>
                  <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginBottom: 2 }}>{t.patient_name}</div>
                  <div style={{ fontSize: 13, fontWeight: t.hasUnread ? 700 : 500, color: "var(--ehr-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.subject}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.latest.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {!selectedThread ? (
            <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>Select a conversation to read and reply.</div>
            </EhrCard>
          ) : (
            <EhrCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 4px" }}>{selectedThread.subject}</h3>
                  <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>👤 {selectedThread.patient_name}</div>
                </div>
                <EhrBtn small variant="danger" onClick={handleDeleteThread}>Delete thread</EhrBtn>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem", maxHeight: 420, overflowY: "auto" }}>
                {selectedThread.messages.map((m) => (
                  <div key={m.id} style={{
                    alignSelf: m.sender_role === "clinic" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: m.sender_role === "clinic" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.sender_role === "clinic"
                      ? "color-mix(in srgb,var(--ehr-accent) 15%,transparent)"
                      : "color-mix(in srgb,var(--ehr-teal) 10%,transparent)",
                    border: "1px solid var(--ehr-border)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <EhrBadge color={m.sender_role === "clinic" ? "teal" : "purple"}>
                        {m.sender_role === "clinic" ? clinician.full_name?.split(" ")[0] ?? "Clinic" : "Patient"}
                      </EhrBadge>
                      <button type="button" onClick={() => handleDeleteMessage(m.id)} style={{ background: "none", border: "none", color: "var(--ehr-muted2)", fontSize: 11, cursor: "pointer" }} title="Delete message">✕</button>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ehr-text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.body}</div>
                    <div style={{ fontSize: 10, color: "var(--ehr-muted2)", marginTop: 6 }}>{formatDateTime(m.created_at)}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply}>
                <EhrInput label="Reply to patient" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Write your reply…" required />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <EhrBtn type="submit" disabled={sending || !reply.trim()}>{sending ? "Sending…" : "Send Reply"}</EhrBtn>
                </div>
              </form>
            </EhrCard>
          )}
        </div>
      </div>
    </div>
  );
}
