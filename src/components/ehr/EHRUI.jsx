// ── Shared EHR UI primitives ──────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";

export const C = {
  bg:       "#0a0e1a",
  surface:  "#0f1629",
  card:     "#131b3a",
  card2:    "#161e3f",
  border:   "rgba(255,255,255,0.08)",
  border2:  "rgba(255,255,255,0.14)",
  purple:   "#7c6ff7",
  lavender: "#a89cf5",
  teal:     "#4ecdc4",
  rose:     "#f093a0",
  gold:     "#f5c842",
  green:    "#4ade80",
  text:     "#e2e8f0",
  muted:    "#94a3b8",
  muted2:   "#64748b",
};

export function EhrCard({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "1.2rem",
      transition: "border-color .2s",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function EhrBtn({ children, variant = "primary", onClick, disabled = false, style = {}, small = false, type = "button" }) {
  const base = {
    border: "none", borderRadius: 8, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all .2s", display: "inline-flex",
    alignItems: "center", gap: 6, opacity: disabled ? 0.55 : 1,
    padding: small ? "7px 14px" : "10px 20px",
    fontSize: small ? 12 : 14,
    ...style,
  };
  const variants = {
    primary:   { background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.06)", color: C.text,  border: `1px solid ${C.border2}` },
    danger:    { background: "rgba(240,147,160,0.12)", color: C.rose,  border: "1px solid rgba(240,147,160,0.25)" },
    ghost:     { background: "transparent", color: C.lavender },
    teal:      { background: "rgba(78,205,196,0.15)", color: C.teal,   border: "1px solid rgba(78,205,196,0.25)" },
    green:     { background: "rgba(74,222,128,0.12)", color: C.green,  border: "1px solid rgba(74,222,128,0.25)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function EhrBadge({ children, color = "purple" }) {
  const map = {
    purple: { bg: "rgba(124,111,247,0.15)", txt: C.lavender },
    teal:   { bg: "rgba(78,205,196,0.15)",  txt: C.teal },
    rose:   { bg: "rgba(240,147,160,0.15)", txt: C.rose },
    gold:   { bg: "rgba(245,200,66,0.15)",  txt: C.gold },
    green:  { bg: "rgba(74,222,128,0.15)",  txt: C.green },
    muted:  { bg: "rgba(255,255,255,0.06)", txt: C.muted },
  };
  return (
    <span style={{
      background: map[color]?.bg, color: map[color]?.txt,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
    }}>{children}</span>
  );
}

export function EhrInput({ label, value, onChange, placeholder, type = "text", required = false, style = {}, rows }) {
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: `1px solid ${C.border2}`, borderRadius: 8,
    padding: "10px 12px", color: C.text, fontSize: 14,
    fontFamily: "inherit", outline: "none",
    transition: "border-color .2s",
    ...style,
  };
  const focus = (e) => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = "0 0 0 2px rgba(124,111,247,0.15)"; };
  const blur  = (e) => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = "none"; };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>{label}{required && <span style={{ color: C.rose }}> *</span>}</label>}
      {rows ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} required={required} style={{ ...inputStyle, resize: "vertical", minHeight: rows * 22 }} onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={inputStyle} onFocus={focus} onBlur={blur} />
      )}
    </div>
  );
}

export function EhrSelect({ label, value, onChange, options, required = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>{label}{required && <span style={{ color: C.rose }}> *</span>}</label>}
      <select value={value} onChange={onChange} required={required} style={{
        width: "100%", background: "#131b3a",
        border: `1px solid ${C.border2}`, borderRadius: 8,
        padding: "10px 12px", color: value ? C.text : C.muted2, fontSize: 14,
        fontFamily: "inherit", outline: "none", cursor: "pointer",
      }}>
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "#131b3a", color: C.text }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h3>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active:      "green",
    inactive:    "muted",
    discharged:  "muted",
    pending:     "gold",
    upcoming:    "teal",
    completed:   "green",
    cancelled:   "rose",
    requested:   "gold",
    "on_hold":   "gold",
    discontinued:"rose",
  };
  return <EhrBadge color={map[status] ?? "muted"}>{status?.replace(/_/g, " ")}</EhrBadge>;
}

export function Divider({ style = {} }) {
  return <div style={{ height: 1, background: C.border, margin: "1rem 0", ...style }} />;
}

export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.border2}`, borderTopColor: C.purple, borderRadius: "50%", animation: "ehrSpin .7s linear infinite" }} />
      <style>{`@keyframes ehrSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── ICD-10 Searchable Dropdown ────────────────────────────────────────────────
// Common psychiatric / mental health ICD-10 codes
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
  { code: "F68.10", label: "Factitious disorder imposed on self, unspecified" },
  { code: "Z03.89", label: "Encounter for observation for suspected disorder, ruled out" },
  { code: "Z71.1",  label: "Person with mental health concern seeking counseling" },
  { code: "Z13.89", label: "Encounter for screening for other disorder" },
];

export function ICD10Picker({ label = "Diagnosis (ICD-10)", value, onChange, required = false, placeholder = "Search diagnosis or code…" }) {
  const [query, setQuery] = useState(value?.label ? `${value.code} — ${value.label}` : "");
  const [open, setOpen]   = useState(false);
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
    const matched = ICD10_DB.filter(
      d => d.code.toLowerCase().includes(lower) || d.label.toLowerCase().includes(lower)
    ).slice(0, 10);
    setResults(matched);
    setOpen(matched.length > 0);
  };

  const pick = (item) => {
    onChange(item);
    setQuery(`${item.code} — ${item.label}`);
    setOpen(false);
  };

  const clear = () => { onChange(null); setQuery(""); setResults([]); setOpen(false); };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>{label}{required && <span style={{ color: C.rose }}> *</span>}</label>}
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder}
          style={{
            width: "100%", background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border2}`, borderRadius: 8,
            padding: "10px 36px 10px 12px", color: C.text, fontSize: 14,
            fontFamily: "inherit", outline: "none",
          }}
        />
        {query && (
          <button type="button" onClick={clear} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "transparent", border: "none", color: C.muted2, cursor: "pointer", fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#131b3a", border: `1px solid ${C.border2}`, borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
        }}>
          {results.map(item => (
            <button key={item.code} type="button" onClick={() => pick(item)} style={{
              display: "flex", alignItems: "baseline", gap: 10,
              width: "100%", padding: "10px 14px", background: "transparent",
              border: "none", borderBottom: `1px solid ${C.border}`,
              cursor: "pointer", textAlign: "left", transition: "background .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,111,247,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: C.lavender, flexShrink: 0, minWidth: 64 }}>{item.code}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{item.label}</span>
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
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
