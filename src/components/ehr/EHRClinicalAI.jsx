import { useState } from "react";
import { EhrCard, EhrBtn, EhrBadge, EhrStyles, Spinner, formatDate } from "./EHRUI";

import { callAiProxy } from "../../lib/aiProxy.js";

async function askClinicalAI(system, userMessage, maxTokens = 1200) {
  return (await callAiProxy({
    system,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: maxTokens,
  })) ?? "No response generated.";
}

// Build a clinical context string from chart data
function buildChartContext(chart, notes, meds, appts) {
  const lines = [];

  lines.push(`PATIENT: ${chart.full_name || "Unknown"}, ${chart.date_of_birth ? `DOB: ${chart.date_of_birth}` : ""} ${chart.gender ? `| Gender: ${chart.gender}` : ""}`);
  if (chart.primary_diagnosis) lines.push(`PRIMARY DIAGNOSIS: ${chart.primary_diagnosis} — ${chart.primary_diagnosis_label}`);
  if (chart.allergies) lines.push(`ALLERGIES: ${chart.allergies}`);

  if (meds.length > 0) {
    lines.push("\nCURRENT MEDICATIONS:");
    meds.filter(m => m.status === "active").forEach(m => {
      lines.push(`  - ${m.medication} ${m.dosage || ""} ${m.frequency || ""}`);
    });
  }

  if (notes.length > 0) {
    lines.push("\nRECENT CLINICAL NOTES (last 3):");
    notes.slice(0, 3).forEach(n => {
      lines.push(`  [${formatDate(n.note_date)} — ${n.note_type}]`);
      if (n.presenting_concerns) lines.push(`  Presenting: ${n.presenting_concerns}`);
      if (n.subjective)  lines.push(`  S: ${n.subjective}`);
      if (n.objective)   lines.push(`  O: ${n.objective}`);
      if (n.assessment)  lines.push(`  A: ${n.assessment}`);
      if (n.plan)        lines.push(`  P: ${n.plan}`);
      if (n.risk_assessment) {
        const risks = Object.entries(n.risk_assessment).filter(([,v]) => v && v !== "Denied" && v.toLowerCase() !== "no" && v.toLowerCase() !== "denied");
        if (risks.length) lines.push(`  RISK: ${risks.map(([k,v]) => `${k}: ${v}`).join(", ")}`);
      }
    });
  }

  if (appts.length > 0) {
    const recent = appts.slice(0, 3);
    lines.push("\nRECENT APPOINTMENTS:");
    recent.forEach(a => lines.push(`  - ${formatDate(a.scheduled_at)} | ${a.appointment_type || "visit"} | ${a.status}`));
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a clinical AI assistant for MindShift Wellness Clinic, supporting licensed PMHNPs (Psychiatric Mental Health Nurse Practitioners). You assist with documentation, clinical reasoning, and pattern recognition — you do NOT make diagnoses or treatment decisions. All output is for clinician review only. Be concise, clinically precise, and use standard psychiatric terminology. Always note that your output requires clinician review before use.`;

const TOOLS = [
  {
    id: "summarize",
    icon: "📋",
    label: "Chart Summary",
    desc: "Generate a concise clinical summary of this patient",
    color: "var(--ehr-accent)",
    bgColor: "color-mix(in srgb,var(--ehr-accent) 10%,transparent)",
  },
  {
    id: "icd10",
    icon: "🔍",
    label: "Suggest ICD-10",
    desc: "Suggest relevant diagnosis codes based on chart data",
    color: "var(--ehr-teal)",
    bgColor: "color-mix(in srgb,var(--ehr-teal) 10%,transparent)",
  },
  {
    id: "treatment",
    icon: "📝",
    label: "Draft Treatment Plan",
    desc: "Generate a SOAP-structured treatment plan draft",
    color: "var(--ehr-purple)",
    bgColor: "color-mix(in srgb,var(--ehr-purple) 10%,transparent)",
  },
  {
    id: "risk",
    icon: "⚠️",
    label: "Risk Assessment",
    desc: "Scan notes for risk indicators and safety concerns",
    color: "var(--ehr-rose)",
    bgColor: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)",
  },
];

export default function EHRClinicalAI({ chart, notes, meds, appts, clinician }) {
  const [activeTool, setActiveTool] = useState(null);
  const [result, setResult]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const context = buildChartContext(chart, notes, meds, appts);

  const run = async (toolId, custom = "") => {
    setActiveTool(toolId);
    setResult(""); setError(""); setLoading(true); setCopied(false);

    const prompts = {
      summarize: `Based on the following patient chart data, write a concise clinical summary (3-5 sentences) suitable for a psychiatric progress note. Include: primary diagnosis, current medications, recent presenting concerns, and any notable risk factors.\n\nCHART DATA:\n${context}`,

      icd10: `Based on the following patient chart data, suggest the most clinically appropriate ICD-10-CM diagnosis codes. For each code, provide: the code, full description, and a brief clinical rationale (1 sentence). List primary diagnosis first, then secondary/comorbid conditions. Format as a numbered list.\n\nCHART DATA:\n${context}`,

      treatment: `Based on the following patient chart data, draft a SOAP-structured psychiatric treatment plan. Include:\n- S (Subjective): Patient's reported concerns\n- O (Objective): Clinical observations and MSE summary\n- A (Assessment): Clinical impressions and diagnosis\n- P (Plan): Specific interventions, medication considerations, follow-up timeline, and safety planning if indicated\n\nNote: This is a draft for clinician review and modification.\n\nCHART DATA:\n${context}`,

      risk: `Review the following patient chart data and identify any risk indicators or safety concerns. Assess:\n1. Suicidal ideation (current/historical)\n2. Self-harm (current/historical)\n3. Homicidal ideation\n4. Substance use concerns\n5. Medication safety concerns\n6. Protective factors present\n\nFor each area, state: Present / Historical / Not documented. Flag any items requiring immediate clinical attention. End with an overall risk level: Low / Moderate / High.\n\nCHART DATA:\n${context}`,

      custom: custom,
    };

    try {
      const text = await askClinicalAI(SYSTEM_PROMPT, prompts[toolId] || custom, 1500);
      setResult(text);
    } catch (e) {
      setError(`AI error: ${e.message}`);
    }
    setLoading(false);
  };

  const handleCustom = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    run("custom", `${customPrompt}\n\nCHART DATA:\n${context}`);
    setShowCustom(false);
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="ehr-root">
      <EhrStyles />

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>Clinical AI Assistant</h2>
            <p style={{ fontSize: 12, color: "var(--ehr-muted2)", margin: 0 }}>Powered by Claude · For clinician review only</p>
          </div>
        </div>
        <div style={{ background: "color-mix(in srgb,var(--ehr-gold) 12%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-gold) 30%,transparent)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--ehr-gold)", display: "flex", gap: 8 }}>
          <span>⚠️</span>
          <span>AI output is for clinical decision support only. All suggestions require review and approval by a licensed clinician before use in patient care.</span>
        </div>
      </div>

      {/* Tool grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.2rem" }}>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => run(tool.id)} disabled={loading} style={{
            background: activeTool === tool.id && result ? tool.bgColor : "var(--ehr-card)",
            border: `1px solid ${activeTool === tool.id && result ? tool.color : "var(--ehr-border)"}`,
            borderRadius: 14, padding: "1rem", cursor: loading ? "not-allowed" : "pointer",
            textAlign: "left", transition: "all .18s", opacity: loading && activeTool !== tool.id ? 0.5 : 1,
            fontFamily: "inherit",
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = tool.color; }}
            onMouseLeave={e => { if (activeTool !== tool.id || !result) e.currentTarget.style.borderColor = "var(--ehr-border)"; }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{tool.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 3 }}>{tool.label}</div>
            <div style={{ fontSize: 11, color: "var(--ehr-muted2)", lineHeight: 1.4 }}>{tool.desc}</div>
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div style={{ marginBottom: "1.2rem" }}>
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} style={{ background: "transparent", border: `1px dashed var(--ehr-border2)`, borderRadius: 12, padding: "10px 16px", width: "100%", cursor: "pointer", fontSize: 13, color: "var(--ehr-muted)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <span>✏️</span> Ask a custom clinical question…
          </button>
        ) : (
          <form onSubmit={handleCustom} style={{ display: "flex", gap: 8 }}>
            <input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="e.g. What medication interactions should I watch for?"
              autoFocus
              style={{ flex: 1, background: "var(--ehr-card)", border: "1.5px solid var(--ehr-border2)", borderRadius: 10, padding: "10px 13px", color: "var(--ehr-text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <EhrBtn type="submit" disabled={loading || !customPrompt.trim()} small>Ask</EhrBtn>
            <EhrBtn type="button" variant="secondary" small onClick={() => { setShowCustom(false); setCustomPrompt(""); }}>✕</EhrBtn>
          </form>
        )}
      </div>

      {/* Result panel */}
      {loading && (
        <EhrCard style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--ehr-border2)", borderTopColor: "var(--ehr-accent)", borderRadius: "50%", animation: "ehrSpin .7s linear infinite" }} />
            <div style={{ fontSize: 13, color: "var(--ehr-muted2)" }}>Analyzing patient chart…</div>
          </div>
        </EhrCard>
      )}

      {error && !loading && (
        <EhrCard style={{ background: "color-mix(in srgb,var(--ehr-rose) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 25%,transparent)" }}>
          <div style={{ fontSize: 13, color: "var(--ehr-rose)" }}>⚠️ {error}</div>
        </EhrCard>
      )}

      {result && !loading && (
        <EhrCard>
          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{TOOLS.find(t => t.id === activeTool)?.icon || "🤖"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>
                {TOOLS.find(t => t.id === activeTool)?.label || "AI Response"}
              </span>
              <EhrBadge color="muted">Draft — Clinician Review Required</EhrBadge>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <EhrBtn small variant="secondary" onClick={copyResult}>
                {copied ? "✓ Copied" : "Copy"}
              </EhrBtn>
              <EhrBtn small variant="secondary" onClick={() => { setResult(""); setActiveTool(null); }}>Clear</EhrBtn>
            </div>
          </div>

          {/* Result content */}
          <div style={{
            background: "var(--ehr-card)",
            border: "1px solid var(--ehr-border)",
            borderRadius: 10,
            padding: "1rem 1.2rem",
            fontSize: 13,
            color: "var(--ehr-text)",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            maxHeight: 500,
            overflowY: "auto",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {result}
          </div>

          {/* Disclaimer */}
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--ehr-muted2)", display: "flex", gap: 6 }}>
            <span>🔒</span>
            <span>Generated by Claude AI for {clinician?.full_name} · {new Date().toLocaleDateString()} · Not for direct patient use without clinician review</span>
          </div>
        </EhrCard>
      )}

      {/* Context preview (collapsed) */}
      {!result && !loading && (
        <details style={{ marginTop: "1rem" }}>
          <summary style={{ fontSize: 12, color: "var(--ehr-muted2)", cursor: "pointer", userSelect: "none" }}>
            📊 View chart context being sent to AI
          </summary>
          <div style={{ marginTop: 8, background: "var(--ehr-card)", border: "1px solid var(--ehr-border)", borderRadius: 10, padding: "0.8rem 1rem", fontSize: 11, color: "var(--ehr-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", fontFamily: "monospace" }}>
            {context || "No chart data available yet."}
          </div>
        </details>
      )}
    </div>
  );
}
