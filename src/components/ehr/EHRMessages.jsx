import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrInput, SectionHeader, Spinner } from "./EHRUI";
import { getEhrMessages, sendEhrMessage, markEhrMessageRead } from "../../lib/ehrDb";

const EMPTY_FORM = { subject: "", body: "", to_name: "All Staff", patient_context: "" };

export default function EHRMessages({ clinician }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [sending, setSending]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getEhrMessages();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load messages.");
    else setMessages(data ?? []);
    setLoading(false);
  }

  const unreadCount = messages.filter(m => !m.is_read).length;

  async function handleSend(e) {
    e.preventDefault();
    if (!form.body.trim()) return;
    setSending(true);
    const payload = {
      from_user: clinician.user_id,
      subject: form.subject.trim() || null,
      body: form.body.trim(),
      patient_context: form.patient_context.trim() || null,
    };
    const { data, error: err } = await sendEhrMessage(payload);
    setSending(false);
    if (err) { setError(typeof err === "string" ? err : err.message ?? "Send failed."); return; }
    if (data) setMessages(prev => [data, ...prev]);
    setShowCompose(false);
    setForm(EMPTY_FORM);
  }

  async function handleSelect(msg) {
    setSelected(msg);
    if (!msg.is_read) {
      await markEhrMessageRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeader
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Staff Messages
            {unreadCount > 0 && (
              <span style={{ background: "var(--ehr-rose)", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px" }}>
                {unreadCount} unread
              </span>
            )}
          </span>
        }
        subtitle="Internal staff communication"
        action={<EhrBtn small onClick={() => { setShowCompose(true); setSelected(null); }}>✉️ Compose</EhrBtn>}
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        {/* Inbox list */}
        <div>
          {loading ? <Spinner /> : messages.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "2.5rem" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 13 }}>No messages yet.</div>
            </EhrCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {messages.map(msg => (
                <div key={msg.id} onClick={() => handleSelect(msg)} style={{
                  padding: "0.85rem 1rem",
                  background: selected?.id === msg.id
                    ? "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"
                    : !msg.is_read ? "color-mix(in srgb,var(--ehr-teal) 8%,transparent)" : "var(--ehr-card)",
                  border: selected?.id === msg.id
                    ? "1px solid color-mix(in srgb,var(--ehr-accent) 35%,transparent)"
                    : "1px solid var(--ehr-border)",
                  borderRadius: 12, cursor: "pointer",
                  borderLeft: !msg.is_read ? "3px solid var(--ehr-teal)" : "1px solid var(--ehr-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    {!msg.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ehr-teal)", flexShrink: 0 }} />}
                    <span style={{ fontSize: 13, fontWeight: msg.is_read ? 500 : 700, color: "var(--ehr-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.subject || "(no subject)"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ehr-muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.body?.slice(0, 60)}{msg.body?.length > 60 ? "…" : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ehr-muted2)", marginTop: 4 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: compose or read */}
        <div>
          {showCompose ? (
            <EhrCard>
              <form onSubmit={handleSend}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>New Message</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <EhrBtn variant="secondary" small type="button" onClick={() => setShowCompose(false)}>Cancel</EhrBtn>
                    <EhrBtn small type="submit" disabled={sending}>{sending ? "Sending…" : "Send"}</EhrBtn>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <EhrInput label="To" value={form.to_name} onChange={set("to_name")} placeholder="All Staff or clinician name…" />
                  <EhrInput label="Subject" value={form.subject} onChange={set("subject")} placeholder="Subject…" />
                  <EhrInput label="Patient Context (optional)" value={form.patient_context} onChange={set("patient_context")} placeholder="Patient name for reference…" />
                  <EhrInput label="Message" value={form.body} onChange={set("body")} rows={6} placeholder="Write your message…" required />
                </div>
              </form>
            </EhrCard>
          ) : selected ? (
            <EhrCard>
              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 4px" }}>
                  {selected.subject || "(no subject)"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : ""}
                  {selected.patient_context && <span style={{ marginLeft: 12 }}>👤 Re: {selected.patient_context}</span>}
                </div>
              </div>
              <div style={{ height: 1, background: "var(--ehr-border)", marginBottom: "1rem" }} />
              <div style={{ fontSize: 14, color: "var(--ehr-text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {selected.body}
              </div>
            </EhrCard>
          ) : (
            <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>Select a message to read, or compose a new one.</div>
            </EhrCard>
          )}
        </div>
      </div>
    </div>
  );
}
