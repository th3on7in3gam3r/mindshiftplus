// ── Shared EHR UI — theme-aware ───────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { useTokens } from "../../lib/ThemeContext";

// Re-export so all EHR components can use C as a hook-based alias
export function useC() { return useTokens(); }

// Static fallback (dark) for non-hook contexts — use useC() in components
export const C = {
  bg: "#080c18", surface: "#0d1225", card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
  accent: "#7c6ff7", teal: "#4ecdc4", rose: "#f093a0", gold: "#f5c842",
  green: "#4ade80", purple: "#a89cf5", lavender: "#a89cf5",
  text: "#eef0ff", muted: "#94a3b8", muted2: "#5a6a85",
  grad: "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
};

export const EhrStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    .ehr-root * { box-sizing: border-box; }
    .ehr-root { font-family: 'Inter', system-ui, sans-serif; }
    @keyframes ehrSpin { to { transform: rotate(360deg); } }
    @keyframes ehrFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ehrPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
    .ehr-stat-card { transition: transform .2s, box-shadow .2s; }
    .ehr-stat-card:hover { transform: translateY(-3px); }
    .ehr-patient-row { transition: border-color .18s, background .18s, transform .15s; }
    .ehr-patient-row:hover { transform: translateX(3px); }
    .ehr-tab-btn { transition: all .15s; }
  `}</style>
);

// ── Theme-aware components ─────────────────────────────────────────────────────

export function EhrCard({ children, style = {}, onClick, glow, accent }) {
  const t = useTokens();
  const isDark = t.bg === "#080c18";
  const base = {
    background: t.card,
    border: `1px solid ${accent ? accent + "30" : t.border}`,
    borderLeft: accent ? `4px solid ${accent}` : undefined,
    borderRadius: 16,
    padding: "1.3rem",
    boxShadow: glow
      ? `0 0 28px ${glow}18, ${t.shadow}`
      : t.shadow,
    cursor: onClick ? "pointer" : "default",
    backdropFilter: isDark ? "blur(10px)" : undefined,
    transition: "box-shadow .2s, border-color .2s",
    ...style,
  };
  return <div onClick={onClick} style={base}>{children}</div>;
}

export function EhrBtn({ children, variant = "primary", onClick, disabled = false, style = {}, small = false, type = "button" }) {
  const t = useTokens();
  const base = {
    border: "none", borderRadius: 20, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all .18s",
    display: "inline-flex", alignItems: "center", gap: 6,
    opacity: disabled ? 0.5 : 1,
    padding: small ? "7px 16px" : "11px 22px",
    fontSize: small ? 12 : 14,
    letterSpacing: "0.01em",
    ...style,
  };
  const variants = {
    primary:   { background: t.grad, color: "#fff", boxShadow: `0 4px 16px ${t.accent}35` },
    secondary: { background: t.bg === "#080c18" ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: t.text, border: `1px solid ${t.border2}` },
    danger:    { background: t.bg === "#080c18" ? "rgba(240,147,160,0.12)" : "#fff1f2", color: t.rose, border: `1px solid ${t.rose}40` },
    ghost:     { background: "transparent", color: t.accent, border: `1px solid ${t.accent}30` },
    teal:      { background: t.bg === "#080c18" ? "rgba(78,205,196,0.12)" : "#f0fdfa", color: t.teal, border: `1px solid ${t.teal}40` },
    green:     { background: t.bg === "#080c18" ? "rgba(74,222,128,0.1)" : "#f0fdf4", color: t.green, border: `1px solid ${t.green}40` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function EhrBadge({ children, color = "purple" }) {
  const t = useTokens();
  const isDark = t.bg === "#080c18";
  const map = {
    purple: { bg: isDark ? "rgba(124,111,247,0.15)" : "#ede9fe", txt: isDark ? "#a89cf5" : "#6d28d9", bdr: isDark ? "rgba(124,111,247,0.3)" : "#c4b5fd" },
    teal:   { bg: isDark ? "rgba(78,205,196,0.12)" : "#f0fdfa",  txt: isDark ? "#4ecdc4" : "#0f766e", bdr: isDark ? "rgba(78,205,196,0.3)"  : "#99f6e4" },
    rose:   { bg: isDark ? "rgba(240,147,160,0.12)" : "#fff1f2", txt: isDark ? "#f093a0" : "#be123c", bdr: isDark ? "rgba(240,147,160,0.3)" : "#fecdd3" },
    gold:   { bg: isDark ? "rgba(245,200,66,0.12)" : "#fffbeb",  txt: isDark ? "#f5c842" : "#b45309", bdr: isDark ? "rgba(245,200,66,0.3)"  : "#fde68a" },
    green:  { bg: isDark ? "rgba(74,222,128,0.12)" : "#f0fdf4",  txt: isDark ? "#4ade80" : "#15803d", bdr: isDark ? "rgba(74,222,128,0.3)"  : "#bbf7d0" },
    muted:  { bg: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", txt: isDark ? "#94a3b8" : "#64748b", bdr: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0" },
  };
  const m = map[color] ?? map.muted;
  return (
    <span style={{
      background: m.bg, color: m.txt, border: `1px solid ${m.bdr}`,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
      display: "inline-block",
    }}>{children}</span>
  );
}

export function EhrInput({ label, value, onChange, placeholder, type = "text", required = false, style = {}, rows }) {
  const t = useTokens();
  const inputStyle = {
    width: "100%", background: t.card,
    border: `1.5px solid ${t.border2}`, borderRadius: 10,
    padding: "10px 13px", color: t.text, fontSize: 14,
    fontFamily: "inherit", outline: "none",
    transition: "border-color .2s, box-shadow .2s",
    ...style,
  };
  const focus = (e) => { e.target.style.borderColor = t.accent; e.target.style.boxShadow = `0 0 0 3px ${t.accent}18`; };
  const blur  = (e) => { e.target.style.borderColor = t.border2; e.target.style.boxShadow = "none"; };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: t.rose }}> *</span>}
        </label>
      )}
      {rows ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
          required={required} style={{ ...inputStyle, resize: "vertical", minHeight: rows * 24 }}
          onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          required={required} style={inputStyle} onFocus={focus} onBlur={blur} />
      )}
    </div>
  );
}

export function EhrSelect({ label, value, onChange, options, required = false }) {
  const t = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: t.rose }}> *</span>}
        </label>
      )}
      <select value={value} onChange={onChange} required={required} style={{
        width: "100%", background: t.card, border: `1.5px solid ${t.border2}`, borderRadius: 10,
        padding: "10px 13px", color: value ? t.text : t.muted2,
        fontSize: 14, fontFamily: "inherit", outline: "none", cursor: "pointer",
      }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: t.surface, color: t.text }}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function SectionHeader({ title, action, subtitle }) {
  const t = useTokens();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: t.muted2, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = { active:"green", inactive:"muted", discharged:"muted", pending:"gold", upcoming:"teal", completed:"green", cancelled:"rose", requested:"gold", on_hold:"gold", discontinued:"rose" };
  return <EhrBadge color={map[status] ?? "muted"}>{status?.replace(/_/g, " ")}</EhrBadge>;
}

export function Divider({ style = {} }) {
  const t = useTokens();
  return <div style={{ height: 1, background: t.border, margin: "1rem 0", ...style }} />;
}

export function Spinner() {
  const t = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 14 }}>
      <div style={{ width: 34, height: 34, border: `3px solid ${t.border2}`, borderTopColor: t.accent, borderRadius: "50%", animation: "ehrSpin .7s linear infinite" }} />
      <span style={{ fontSize: 12, color: t.muted2, animation: "ehrPulse 1.5s ease infinite" }}>Loading…</span>
    </div>
  );
}

// ── ICD-10 Picker ─────────────────────────────────────────────────────────────
const ICD10_DB = [
  { code: "F32.0",  label: "Major depressive disorder, single episode, mild" },
  { code: "F32.1",  label: "Major depressive disorder, single episode, moderate" },
  { code: "F32.2",  label: "Major depressive disorder, single episode, severe without psychosis" },
  { code: "F32.3",  label: "Major depressive disorder, single episode, severe with psychosis" },
  { code: "F33.0",  label: "Major depressive disorder, recurrent, mild" },
  { code: "F33.1",  label: "Major depressive disorder, recurrent, moderate" },
  { code: "F33.2",  label: "Major depressive disorder, recurrent, severe without psychosis" },
  { code: "F33.3",  label: "Major depressive disorder, recurrent, severe with psychosis" },
  { code: "F41.0",  label: "Panic disorder without agoraphobia" },
  { code: "F41.1",  label: "Generalized anxiety disorder" },
  { code: "F41.3",  label: "Other mixed anxiety disorders" },
  { code: "F40.10", label: "Social anxiety disorder, unspecified" },
  { code: "F40.11", label: "Social anxiety disorder, generalized" },
  { code: "F40.01", label: "Agoraphobia with panic disorder" },
  { code: "F42.2",  label: "Mixed obsessional thoughts and acts (OCD)" },
  { code: "F43.10", label: "Post-traumatic stress disorder, unspecified" },
  { code: "F43.11", label: "Post-traumatic stress disorder, acute" },
  { code: "F43.12", label: "Post-traumatic stress disorder, chronic" },
  { code: "F43.21", label: "Adjustment disorder with depressed mood" },
  { code: "F43.22", label: "Adjustment disorder with anxiety" },
  { code: "F43.23", label: "Adjustment disorder with mixed anxiety and depressed mood" },
  { code: "F31.0",  label: "Bipolar disorder, current episode hypomanic" },
  { code: "F31.1",  label: "Bipolar I disorder, current episode manic without psychosis" },
  { code: "F31.2",  label: "Bipolar I disorder, current episode manic with psychosis" },
  { code: "F31.30", label: "Bipolar I disorder, current episode depressed, mild or moderate, unspecified" },
  { code: "F31.81", label: "Bipolar II disorder" },
  { code: "F34.0",  label: "Cyclothymic disorder" },
  { code: "F34.1",  label: "Dysthymic disorder (Persistent depressive disorder)" },
  { code: "F20.9",  label: "Schizophrenia, unspecified" },
  { code: "F25.0",  label: "Schizoaffective disorder, bipolar type" },
  { code: "F25.1",  label: "Schizoaffective disorder, depressive type" },
  { code: "F60.3",  label: "Borderline personality disorder" },
  { code: "F60.2",  label: "Antisocial personality disorder" },
  { code: "F60.4",  label: "Histrionic personality disorder" },
  { code: "F60.0",  label: "Paranoid personality disorder" },
  { code: "F60.1",  label: "Schizoid personality disorder" },
  { code: "F60.5",  label: "Obsessive-compulsive personality disorder" },
  { code: "F60.7",  label: "Dependent personality disorder" },
  { code: "F60.6",  label: "Anxious (avoidant) personality disorder" },
  { code: "F90.0",  label: "ADHD, predominantly inattentive presentation" },
  { code: "F90.1",  label: "ADHD, predominantly hyperactive-impulsive presentation" },
  { code: "F90.2",  label: "ADHD, combined presentation" },
  { code: "F84.0",  label: "Autism spectrum disorder" },
  { code: "F50.01", label: "Anorexia nervosa, restricting type" },
  { code: "F50.02", label: "Anorexia nervosa, binge eating/purging type" },
  { code: "F50.2",  label: "Bulimia nervosa" },
  { code: "F10.10", label: "Alcohol use disorder, mild" },
  { code: "F10.20", label: "Alcohol use disorder, moderate" },
  { code: "F10.21", label: "Alcohol use disorder, severe" },
  { code: "F11.20", label: "Opioid use disorder, moderate" },
  { code: "F12.20", label: "Cannabis use disorder, moderate" },
  { code: "F17.210","label": "Nicotine dependence, cigarettes, uncomplicated" },
  { code: "F51.01", label: "Primary insomnia" },
  { code: "F51.5",  label: "Nightmare disorder" },
  { code: "F45.1",  label: "Somatic symptom disorder" },
  { code: "F48.1",  label: "Depersonalization-derealization disorder" },
  { code: "F44.81", label: "Dissociative identity disorder" },
  { code: "Z03.89", label: "Encounter for observation for suspected disorder, ruled out" },
  { code: "Z71.1",  label: "Person with mental health concern seeking counseling" },
  { code: "Z13.89", label: "Encounter for screening for other disorder" },
];

export function ICD10Picker({ label = "Diagnosis (ICD-10)", value, onChange, required = false, placeholder = "Search by name or code…" }) {
  const t = useTokens();
  const [query, setQuery]     = useState(value?.label ? `${value.code} — ${value.label}` : "");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  const search = (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const matched = ICD10_DB.filter(d => d.code.toLowerCase().includes(lower) || d.label.toLowerCase().includes(lower)).slice(0, 10);
    setResults(matched);
    setOpen(matched.length > 0);
  };

  const pick = (item) => { onChange(item); setQuery(`${item.code} — ${item.label}`); setOpen(false); };
  const clear = () => { onChange(null); setQuery(""); setResults([]); setOpen(false); };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}{required && <span style={{ color: t.rose }}> *</span>}</label>}
      <div style={{ position: "relative" }}>
        <input value={query} onChange={e => search(e.target.value)} onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder} style={{ width: "100%", background: t.card, border: `1.5px solid ${t.border2}`, borderRadius: 10, padding: "10px 36px 10px 13px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
        {query && <button type="button" onClick={clear} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: t.muted2, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: t.surface, border: `1px solid ${t.accent}30`, borderRadius: 12, boxShadow: t.shadowMd, overflow: "hidden" }}>
          {results.map(item => (
            <button key={item.code} type="button" onClick={() => pick(item)} style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%", padding: "10px 14px", background: "transparent", border: "none", borderBottom: `1px solid ${t.border}`, cursor: "pointer", textAlign: "left", transition: "background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${t.accent}12`}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, flexShrink: 0, minWidth: 64 }}>{item.code}</span>
              <span style={{ fontSize: 13, color: t.muted }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
export function age(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
