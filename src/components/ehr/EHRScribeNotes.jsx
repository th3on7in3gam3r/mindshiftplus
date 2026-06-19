import { useState, useEffect } from "react";
import { getPatientScribeSessions } from "../../lib/aiScribeDb";
import { EhrStyles } from "./EHRUI";

export default function EHRScribeNotes({ patientId, patientChartId, mrn }) {
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [copiedId, setCopiedId]       = useState(null);

  useEffect(() => { loadSessions(); }, [patientId, patientChartId, mrn]);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await getPatientScribeSessions(patientId, patientChartId, mrn);
    setLoading(false);
    if (data) {
      setSessions(data.sort((a, b) =>
        new Date(b.date_of_service) - new Date(a.date_of_service)
      ));
    }
  };

  const handleCopy = (session) => {
    navigator.clipboard.writeText(session.generated_note || '');
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (session) => {
    const blob = new Blob([session.generated_note || ''], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `progress-note-${session.patient_id}-${session.date_of_service}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="ehr-root" style={{ padding: "3rem", textAlign: "center" }}>
      <EhrStyles />
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid var(--ehr-border)",
        borderTopColor: "var(--ehr-accent)",
        animation: "ehrSpin 0.8s linear infinite",
        margin: "0 auto 1rem"
      }} />
      <p style={{ color: "var(--ehr-muted)", fontSize: 14 }}>Loading AI Scribe notes…</p>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (sessions.length === 0) return (
    <div className="ehr-root">
      <EhrStyles />
      <div style={{
        background: "var(--ehr-card)", border: "1px solid var(--ehr-border)",
        borderRadius: 16, padding: "3rem 2rem", textAlign: "center",
        boxShadow: "var(--ehr-shadow)"
      }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>🎙️</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 8 }}>
          No AI Scribe Notes Yet
        </h3>
        <p style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
          Use the <strong>AI Scribe</strong> tool to record a session and generate a progress note.
          It will appear here automatically after pushing to EHR.
        </p>
        <div style={{
          marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: 8,
          background: "color-mix(in srgb, var(--ehr-accent) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ehr-accent) 20%, transparent)",
          borderRadius: 10, padding: "0.6rem 1rem", fontSize: 12, color: "var(--ehr-accent)"
        }}>
          Admin Menu → 🎙️ AI Scribe → Record → Push to EHR
        </div>
      </div>
    </div>
  );

  // ── Notes list ───────────────────────────────────────────────────────────────
  return (
    <div className="ehr-root">
      <EhrStyles />

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "1.25rem", flexWrap: "wrap", gap: 10
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ehr-text)", margin: 0 }}>
            🎙️ AI Scribe Notes
          </h2>
          <p style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 3 }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} documented
          </p>
        </div>
        <div style={{
          background: "color-mix(in srgb, var(--ehr-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ehr-accent) 25%, transparent)",
          borderRadius: 20, padding: "4px 14px",
          fontSize: 11, fontWeight: 700, color: "var(--ehr-accent)",
          letterSpacing: "0.04em", textTransform: "uppercase"
        }}>
          AI-Generated
        </div>
      </div>

      {/* Session cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sessions.map(session => {
          const isOpen = expandedId === session.id;
          const inEHR  = session.status === 'pushed_to_ehr';

          return (
            <div key={session.id} style={{
              background: "var(--ehr-card)",
              border: `1px solid ${isOpen ? "var(--ehr-accent)" : "var(--ehr-border)"}`,
              borderRadius: 16,
              boxShadow: isOpen ? "0 0 0 3px color-mix(in srgb, var(--ehr-accent) 12%, transparent)" : "var(--ehr-shadow)",
              overflow: "hidden",
              transition: "border-color .2s, box-shadow .2s"
            }}>

              {/* ── Card header (always visible) ── */}
              <div
                onClick={() => setExpandedId(isOpen ? null : session.id)}
                style={{
                  padding: "1rem 1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background: isOpen
                    ? "color-mix(in srgb, var(--ehr-accent) 5%, var(--ehr-card))"
                    : "var(--ehr-card)",
                  transition: "background .2s"
                }}
              >
                {/* Left: date + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)" }}>
                      {new Date(session.date_of_service + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>

                    {/* Status badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                      background: inEHR
                        ? "color-mix(in srgb, var(--ehr-teal) 15%, transparent)"
                        : "color-mix(in srgb, var(--ehr-gold) 15%, transparent)",
                      color: inEHR ? "var(--ehr-teal)" : "var(--ehr-gold)",
                      border: `1px solid ${inEHR
                        ? "color-mix(in srgb, var(--ehr-teal) 30%, transparent)"
                        : "color-mix(in srgb, var(--ehr-gold) 30%, transparent)"}`
                    }}>
                      {inEHR ? "✓ In EHR" : "Draft"}
                    </span>

                    {/* Quality badge */}
                    {session.quality_score && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                        background: "color-mix(in srgb, var(--ehr-green) 12%, transparent)",
                        color: "var(--ehr-green)",
                        border: "1px solid color-mix(in srgb, var(--ehr-green) 25%, transparent)"
                      }}>
                        ★ {session.quality_score}% quality
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--ehr-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>📋 {session.session_type}</span>
                    <span>📡 {session.modality}</span>
                    <span>👤 {session.provider_name}</span>
                    {session.duration_minutes && <span>⏱ {session.duration_minutes} min</span>}
                    {session.specialty && <span><img src="/logo.png" alt="" style={{width: 14, height: 14, verticalAlign: 'middle', display: 'inline-block'}} /> {session.specialty}</span>}
                  </div>
                </div>

                {/* Chevron */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--ehr-bg)",
                  border: "1px solid var(--ehr-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "var(--ehr-muted)", flexShrink: 0,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform .25s"
                }}>
                  ▼
                </div>
              </div>

              {/* ── Expanded content ── */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--ehr-border)" }}>

                  {/* ICD-10 codes */}
                  {session.icd10_codes?.length > 0 && (
                    <div style={{
                      padding: "0.75rem 1.25rem",
                      background: "var(--ehr-bg)",
                      borderBottom: "1px solid var(--ehr-border)",
                      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        ICD-10
                      </span>
                      {session.icd10_codes.map((code, i) => (
                        <span key={i} style={{
                          fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
                          background: "color-mix(in srgb, var(--ehr-teal) 12%, transparent)",
                          color: "var(--ehr-teal)",
                          border: "1px solid color-mix(in srgb, var(--ehr-teal) 25%, transparent)"
                        }}>
                          {code}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Clinical context */}
                  {session.clinical_context && (
                    <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--ehr-border)" }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.08em", color: "var(--ehr-muted2)", marginBottom: 6
                      }}>
                        Clinical Context
                      </div>
                      <p style={{
                        fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.65,
                        margin: 0, padding: "0.6rem 0.9rem",
                        background: "var(--ehr-bg)", borderRadius: 8,
                        border: "1px solid var(--ehr-border)"
                      }}>
                        {session.clinical_context}
                      </p>
                    </div>
                  )}

                  {/* Generated note */}
                  {session.generated_note ? (
                    <div style={{ padding: "1.25rem" }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.08em", color: "var(--ehr-muted2)", marginBottom: 10
                      }}>
                        Progress Note
                      </div>

                      {/* Note body — clean readable card */}
                      <div style={{
                        background: "var(--ehr-bg)",
                        border: "1px solid var(--ehr-border)",
                        borderRadius: 12,
                        padding: "1.25rem 1.5rem",
                        fontSize: 13.5,
                        lineHeight: 1.85,
                        color: "var(--ehr-text)",
                        whiteSpace: "pre-wrap",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        maxHeight: 480,
                        overflowY: "auto",
                        letterSpacing: "0.01em"
                      }}>
                        {session.generated_note}
                      </div>

                      {/* Action buttons */}
                      <div style={{
                        display: "flex", gap: "0.6rem", marginTop: "1rem",
                        flexWrap: "wrap"
                      }}>
                        <button
                          onClick={() => handleCopy(session)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 20,
                            border: "1.5px solid var(--ehr-border2)",
                            background: "var(--ehr-card)",
                            color: copiedId === session.id ? "var(--ehr-green)" : "var(--ehr-text)",
                            fontSize: 13, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit", transition: "all .15s"
                          }}
                        >
                          {copiedId === session.id ? "✓ Copied!" : "📋 Copy Note"}
                        </button>

                        <button
                          onClick={() => handleDownload(session)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 20,
                            border: "1.5px solid var(--ehr-border2)",
                            background: "var(--ehr-card)",
                            color: "var(--ehr-text)",
                            fontSize: 13, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit", transition: "all .15s"
                          }}
                        >
                          ⬇️ Download
                        </button>

                        {!inEHR && (
                          <span style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 20,
                            background: "color-mix(in srgb, var(--ehr-gold) 10%, transparent)",
                            border: "1.5px solid color-mix(in srgb, var(--ehr-gold) 30%, transparent)",
                            color: "var(--ehr-gold)", fontSize: 12, fontWeight: 600
                          }}>
                            ⚠️ Not yet pushed to EHR
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: "2rem", textAlign: "center",
                      color: "var(--ehr-muted)", fontSize: 13
                    }}>
                      No note generated for this session yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
