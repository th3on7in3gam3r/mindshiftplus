import { useState, useRef, useEffect } from "react";
import { askStaffAssistant, STARTER_PROMPTS, buildStaffWelcomeMessage, STAFF_ASSISTANT_NAME } from "../../lib/staffAssistant";

const C = {
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text: "#f0f0ff",
  muted: "rgba(240,240,255,0.55)",
  muted2: "rgba(240,240,255,0.35)",
  accent: "#7c6ff7",
  teal: "#4ecdc4",
};

export default function StaffAssistant({ onBrowseDocs, onScrollToSection, welcomeMessage, variant = "panel" }) {
  const defaultWelcome = welcomeMessage || buildStaffWelcomeMessage(null);
  const [messages, setMessages] = useState([
    { role: "assistant", content: defaultWelcome },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setError("");

    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { reply, sources } = await askStaffAssistant(question, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply, sources }]);
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach the AI service. Check your connection, or browse the docs below. For urgent access issues, contact the site administrator.",
        },
      ]);
    }
    setLoading(false);
  };

  const embedded = variant === "embedded";

  return (
    <div style={{
      background: embedded ? "transparent" : "linear-gradient(135deg, rgba(124,111,247,0.14), rgba(78,205,196,0.08))",
      border: embedded ? "none" : "1px solid rgba(124,111,247,0.28)",
      borderRadius: embedded ? 0 : 20,
      marginBottom: embedded ? 0 : "1.5rem",
      overflow: "hidden",
    }}>
      {!embedded && (
      <div style={{ padding: "1.15rem 1.25rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
              {STAFF_ASSISTANT_NAME}
            </div>
            <h2 style={{ fontSize: "clamp(1.1rem, 3vw, 1.35rem)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Meet {STAFF_ASSISTANT_NAME} — your staff guide
            </h2>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.55, maxWidth: 560 }}>
              Like Mia helps patients, {STAFF_ASSISTANT_NAME} helps you with EHR, Schedule, Scribe, billing, and Staff Docs — step by step.
            </p>
          </div>
          {onBrowseDocs && (
            <button type="button" onClick={onBrowseDocs} style={chipBtn}>
              Browse all docs
            </button>
          )}
        </div>
      </div>
      )}

      <div style={{ padding: embedded ? "0" : "1rem 1.25rem", maxHeight: embedded ? 380 : 360, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "88%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? "rgba(124,111,247,0.25)" : C.surface,
              border: `1px solid ${m.role === "user" ? "rgba(124,111,247,0.35)" : C.border}`,
              fontSize: 13,
              lineHeight: 1.6,
              color: m.role === "user" ? C.text : C.muted,
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
              {m.sources?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Based on
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.sources.slice(0, 3).map((s, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => onScrollToSection?.(s.sectionId)}
                        style={{ ...chipBtn, fontSize: 11, padding: "4px 10px" }}
                      >
                        {s.sectionTitle}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 13, color: C.muted2, padding: "4px 0" }}>Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {!loading && messages.length <= 1 && (
        <div style={{ padding: embedded ? "0 0 0.75rem" : "0 1.25rem 0.75rem", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STARTER_PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => send(p)} style={chipBtn}>
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        style={{ padding: embedded ? "0.75rem 0 0" : "0.85rem 1.25rem 1.15rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How do I confirm a telehealth appointment?"
          disabled={loading}
          style={{
            flex: 1, padding: "11px 14px", borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: C.surface,
            color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit",
          }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: "11px 18px", borderRadius: 12, border: "none",
          background: loading || !input.trim() ? "rgba(124,111,247,0.3)" : C.accent,
          color: "#fff", fontWeight: 600, fontSize: 13, cursor: loading ? "default" : "pointer",
          fontFamily: "inherit",
        }}>
          Ask
        </button>
      </form>
      {error && (
        <div style={{ padding: "0 1.25rem 1rem", fontSize: 12, color: "#f093a0" }}>{error}</div>
      )}
    </div>
  );
}

const chipBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: "6px 12px",
  fontSize: 12,
  color: "rgba(240,240,255,0.8)",
  cursor: "pointer",
  fontFamily: "inherit",
};
