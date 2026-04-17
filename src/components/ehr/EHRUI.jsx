// ── Shared EHR UI primitives (theme via CSS vars) ─────────────────────────────
import { useState, useRef, useEffect } from "react";
import { useTokens } from "../../lib/ThemeContext";

export { useTokens };

export const EhrStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    :root {
      --ehr-bg:#f4f6fb; --ehr-surface:#fff; --ehr-card:#fff; --ehr-card2:#f8faff;
      --ehr-border:#e2e8f0; --ehr-border2:#cbd5e1;
      --ehr-accent:#3b5bdb; --ehr-accent2:#4a6cf7; --ehr-teal:#0ea5a0;
      --ehr-rose:#e05c7a; --ehr-gold:#f0a500; --ehr-green:#16a34a; --ehr-purple:#7c3aed;
      --ehr-text:#0f172a; --ehr-muted:#64748b; --ehr-muted2:#94a3b8;
      --ehr-grad:linear-gradient(135deg,#3b5bdb,#0ea5a0);
      --ehr-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(59,91,219,0.06);
    }
    [data-theme="dark"] {
      --ehr-bg:#080c18; --ehr-surface:#0d1225; --ehr-card:rgba(255,255,255,0.03); --ehr-card2:rgba(255,255,255,0.06);
      --ehr-border:rgba(255,255,255,0.08); --ehr-border2:rgba(255,255,255,0.14);
      --ehr-accent:#7c6ff7; --ehr-accent2:#a89cf5; --ehr-teal:#4ecdc4;
      --ehr-rose:#f093a0; --ehr-gold:#f5c842; --ehr-green:#4ade80; --ehr-purple:#a89cf5;
      --ehr-text:#eef0ff; --ehr-muted:#94a3b8; --ehr-muted2:#5a6a85;
      --ehr-grad:linear-gradient(135deg,#7c6ff7,#4ecdc4);
      --ehr-shadow:0 2px 12px rgba(0,0,0,0.4);
    }
    .ehr-root * { box-sizing: border-box; }
    .ehr-root { font-family: 'Inter', system-ui, sans-serif; background: var(--ehr-bg); color: var(--ehr-text); }
    @keyframes ehrSpin { to { transform: rotate(360deg); } }
    @keyframes ehrFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ehrPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
    .ehr-stat-card { transition: transform .2s, box-shadow .2s; }
    .ehr-stat-card:hover { transform: translateY(-3px); }
    .ehr-patient-row { transition: border-color .18s, background .18s, transform .15s; }
    .ehr-patient-row:hover { transform: translateX(3px); }
    .ehr-tab-btn { transition: all .15s; }
    .ehr-card {
      background: var(--ehr-card); border: 1px solid var(--ehr-border);
      border-radius: 16px; padding: 1.3rem;
      box-shadow: var(--ehr-shadow); transition: box-shadow .2s, border-color .2s;
    }
    .ehr-input {
      width: 100%; background: var(--ehr-card); border: 1.5px solid var(--ehr-border2);
      border-radius: 10px; padding: 10px 13px; color: var(--ehr-text);
      font-size: 14px; font-family: inherit; outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .ehr-input:focus { border-color: var(--ehr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ehr-accent) 15%, transparent); }
    .ehr-btn-primary {
      background: var(--ehr-grad); color: #fff; border: none;
      border-radius: 20px; padding: 11px 22px; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--ehr-accent) 35%, transparent);
      transition: opacity .18s;
    }
    .ehr-btn-primary:hover { opacity: .88; }
    .ehr-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  `}</style>
);

// ── Pure CSS-var based primitives (no hooks needed) ──────────────────────────

export function EhrCard({ children, style = {}, onClick, glow, accent }) {
  return (
    <div onClick={onClick} className="ehr-card" style={{
      borderLeft: accent ? `4px solid ${accent}` : undefined,
      cursor: onClick ? "pointer" : "default",
      boxShadow: glow ? `0 0 28px ${glow}18, var(--ehr-shadow)` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

const BTN_VARIANTS = {
  primary:   "background:var(--ehr-grad);color:#fff;border:none;box-shadow:0 4px 16px color-mix(in srgb,var(--ehr-accent) 35%,transparent)",
  secondary: "background:rgba(128,128,128,0.08);color:var(--ehr-text);border:1.5px solid var(--ehr-border2)",
  danger:    "background:color-mix(in srgb,var(--ehr-rose) 12%,transparent);color:var(--ehr-rose);border:1px solid color-mix(in srgb,var(--ehr-rose) 35%,transparent)",
  ghost:     "background:transparent;color:var(--ehr-accent);border:1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)",
  teal:      "background:color-mix(in srgb,var(--ehr-teal) 12%,transparent);color:var(--ehr-teal);border:1px solid color-mix(in srgb,var(--ehr-teal) 35%,transparent)",
  green:     "background:color-mix(in srgb,var(--ehr-green) 12%,transparent);color:var(--ehr-green);border:1px solid color-mix(in srgb,var(--ehr-green) 35%,transparent)",
};

export function EhrBtn({ children, variant = "primary", onClick, disabled = false, style = {}, small = false, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      borderRadius: 20, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "all .18s",
      display: "inline-flex", alignItems: "center", gap: 6,
      opacity: disabled ? 0.5 : 1,
      padding: small ? "7px 16px" : "11px 22px",
      fontSize: small ? 12 : 14,
      ...(Object.fromEntries((BTN_VARIANTS[variant] || BTN_VARIANTS.primary).split(";").filter(Boolean).map(s => { const [k, ...v] = s.split(":"); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(":").trim()]; }))),
      ...style,
    }}>
      {children}
    </button>
  );
}

export function EhrBadge({ children, color = "purple" }) {
  const cssVar = { purple:"accent", teal:"teal", rose:"rose", gold:"gold", green:"green", muted:"muted" }[color] ?? "muted";
  return (
    <span style={{
      background: `color-mix(in srgb, var(--ehr-${cssVar}) 15%, transparent)`,
      color: `var(--ehr-${cssVar})`,
      border: `1px solid color-mix(in srgb, var(--ehr-${cssVar}) 30%, transparent)`,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", display: "inline-block",
    }}>{children}</span>
  );
}

export function EhrInput({ label, value, onChange, placeholder, type = "text", required = false, style = {}, rows }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: "var(--ehr-rose)" }}> *</span>}
        </label>
      )}
      {rows ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
          required={required} className="ehr-input"
          style={{ resize: "vertical", minHeight: rows * 24, ...style }} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          required={required} className="ehr-input" style={style} />
      )}
    </div>
  );
}

export function EhrSelect({ label, value, onChange, options, required = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: "var(--ehr-rose)" }}> *</span>}
        </label>
      )}
      <select value={value} onChange={onChange} required={required} className="ehr-input" style={{ cursor: "pointer" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function SectionHeader({ title, action, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>{subtitle}</p>}
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
  return <div style={{ height: 1, background: "var(--ehr-border)", margin: "1rem 0", ...style }} />;
}

export function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 14 }}>
      <div style={{ width: 34, height: 34, border: "3px solid var(--ehr-border2)", borderTopColor: "var(--ehr-accent)", borderRadius: "50%", animation: "ehrSpin .7s linear infinite" }} />
      <span style={{ fontSize: 12, color: "var(--ehr-muted2)", animation: "ehrPulse 1.5s ease infinite" }}>Loading…</span>
    </div>
  );
}

// ── ICD-10 Picker ─────────────────────────────────────────────────────────────
const ICD10_DB = [
  { code:"F32.0", label:"Major depressive disorder, single episode, mild" },
  { code:"F32.1", label:"Major depressive disorder, single episode, moderate" },
  { code:"F32.2", label:"Major depressive disorder, single episode, severe without psychosis" },
  { code:"F32.3", label:"Major depressive disorder, single episode, severe with psychosis" },
  { code:"F33.0", label:"Major depressive disorder, recurrent, mild" },
  { code:"F33.1", label:"Major depressive disorder, recurrent, moderate" },
  { code:"F33.2", label:"Major depressive disorder, recurrent, severe without psychosis" },
  { code:"F33.3", label:"Major depressive disorder, recurrent, severe with psychosis" },
  { code:"F41.0", label:"Panic disorder without agoraphobia" },
  { code:"F41.1", label:"Generalized anxiety disorder" },
  { code:"F41.3", label:"Other mixed anxiety disorders" },
  { code:"F40.10",label:"Social anxiety disorder, unspecified" },
  { code:"F40.11",label:"Social anxiety disorder, generalized" },
  { code:"F40.01",label:"Agoraphobia with panic disorder" },
  { code:"F42.2", label:"Mixed obsessional thoughts and acts (OCD)" },
  { code:"F43.10",label:"Post-traumatic stress disorder, unspecified" },
  { code:"F43.11",label:"Post-traumatic stress disorder, acute" },
  { code:"F43.12",label:"Post-traumatic stress disorder, chronic" },
  { code:"F43.21",label:"Adjustment disorder with depressed mood" },
  { code:"F43.22",label:"Adjustment disorder with anxiety" },
  { code:"F43.23",label:"Adjustment disorder with mixed anxiety and depressed mood" },
  { code:"F31.0", label:"Bipolar disorder, current episode hypomanic" },
  { code:"F31.1", label:"Bipolar I disorder, current episode manic without psychosis" },
  { code:"F31.2", label:"Bipolar I disorder, current episode manic with psychosis" },
  { code:"F31.30",label:"Bipolar I disorder, current episode depressed, mild or moderate, unspecified" },
  { code:"F31.81",label:"Bipolar II disorder" },
  { code:"F34.0", label:"Cyclothymic disorder" },
  { code:"F34.1", label:"Dysthymic disorder (Persistent depressive disorder)" },
  { code:"F20.9", label:"Schizophrenia, unspecified" },
  { code:"F25.0", label:"Schizoaffective disorder, bipolar type" },
  { code:"F25.1", label:"Schizoaffective disorder, depressive type" },
  { code:"F60.3", label:"Borderline personality disorder" },
  { code:"F60.2", label:"Antisocial personality disorder" },
  { code:"F60.4", label:"Histrionic personality disorder" },
  { code:"F60.0", label:"Paranoid personality disorder" },
  { code:"F60.1", label:"Schizoid personality disorder" },
  { code:"F60.5", label:"Obsessive-compulsive personality disorder" },
  { code:"F60.7", label:"Dependent personality disorder" },
  { code:"F60.6", label:"Anxious (avoidant) personality disorder" },
  { code:"F90.0", label:"ADHD, predominantly inattentive presentation" },
  { code:"F90.1", label:"ADHD, predominantly hyperactive-impulsive presentation" },
  { code:"F90.2", label:"ADHD, combined presentation" },
  { code:"F84.0", label:"Autism spectrum disorder" },
  { code:"F50.01",label:"Anorexia nervosa, restricting type" },
  { code:"F50.02",label:"Anorexia nervosa, binge eating/purging type" },
  { code:"F50.2", label:"Bulimia nervosa" },
  { code:"F10.10",label:"Alcohol use disorder, mild" },
  { code:"F10.20",label:"Alcohol use disorder, moderate" },
  { code:"F10.21",label:"Alcohol use disorder, severe" },
  { code:"F11.20",label:"Opioid use disorder, moderate" },
  { code:"F12.20",label:"Cannabis use disorder, moderate" },
  { code:"F17.210",label:"Nicotine dependence, cigarettes, uncomplicated" },
  { code:"F51.01",label:"Primary insomnia" },
  { code:"F51.5", label:"Nightmare disorder" },
  { code:"F45.1", label:"Somatic symptom disorder" },
  { code:"F48.1", label:"Depersonalization-derealization disorder" },
  { code:"F44.81",label:"Dissociative identity disorder" },
  { code:"Z03.89",label:"Encounter for observation for suspected disorder, ruled out" },
  { code:"Z71.1", label:"Person with mental health concern seeking counseling" },
  { code:"Z13.89",label:"Encounter for screening for other disorder" },
];

export function ICD10Picker({ label = "Diagnosis (ICD-10)", value, onChange, required = false, placeholder = "Search by name or code…" }) {
  const [query, setQuery]     = useState(value?.label ? `${value.code} — ${value.label}` : "");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
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
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: "var(--ehr-rose)" }}> *</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input value={query} onChange={e => search(e.target.value)} onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder} className="ehr-input" style={{ paddingRight: 36 }} />
        {query && (
          <button type="button" onClick={clear} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--ehr-surface)", border: "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>
          {results.map(item => (
            <button key={item.code} type="button" onClick={() => pick(item)}
              style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--ehr-border)", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ehr-accent)", flexShrink: 0, minWidth: 64 }}>{item.code}</span>
              <span style={{ fontSize: 13, color: "var(--ehr-muted)" }}>{item.label}</span>
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
