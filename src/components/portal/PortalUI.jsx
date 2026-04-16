// ── Shared Portal UI Components ────────────────────────────────────────────────
// Consistent, polished design system for all portal pages

export const T = {
  accent:  "#4a6cf7",
  accent2: "#6b8af9",
  teal:    "#0ea5a0",
  rose:    "#e05c7a",
  gold:    "#f0a500",
  green:   "#22c55e",
  text:    "#1a1f36",
  muted:   "#6b7280",
  muted2:  "#9ca3af",
  border:  "#e5e7eb",
  bg:      "#f7f8fc",
  bg2:     "#fff",
  cream:   "#f0f4ff",
};

// Gradient page header with icon, title, subtitle and optional action
export function PageHeader({ icon, label, title, subtitle, action, gradient }) {
  const g = gradient || `linear-gradient(135deg, ${T.accent}18, ${T.teal}10)`;
  return (
    <div style={{
      background: g,
      borderRadius: 20,
      padding: "1.8rem 2rem",
      marginBottom: "1.8rem",
      border: `1px solid ${T.accent}20`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "1rem",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg,${T.accent},${T.teal})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
          boxShadow: `0 4px 14px ${T.accent}30`,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent, marginBottom:3 }}>{label}</div>
          <h1 style={{ fontSize:"clamp(1.2rem,3vw,1.6rem)", fontWeight:700, color:T.text, lineHeight:1.2, margin:0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:T.muted, marginTop:3, margin:0 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Card with hover lift effect
export function Card({ children, style={}, onClick, accent }) {
  return (
    <div onClick={onClick} style={{
      background: T.bg2,
      border: `1px solid ${accent ? accent+"30" : T.border}`,
      borderRadius: 16,
      padding: "1.4rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(74,108,247,0.04)",
      cursor: onClick ? "pointer" : "default",
      transition: "all .2s ease",
      borderLeft: accent ? `4px solid ${accent}` : undefined,
      ...style,
    }}
    onMouseOver={e=>{ if(onClick||accent) { e.currentTarget.style.boxShadow="0 4px 20px rgba(74,108,247,0.12)"; e.currentTarget.style.transform="translateY(-1px)"; }}}
    onMouseOut={e=>{ e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(74,108,247,0.04)"; e.currentTarget.style.transform="none"; }}
    >{children}</div>
  );
}

// Section divider with label
export function SectionDivider({ label, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"1.5rem 0 1rem" }}>
      <div style={{ width:3, height:16, borderRadius:2, background:color||T.accent }}/>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:color||T.accent }}>{label}</span>
      <div style={{ flex:1, height:1, background:`${color||T.accent}20` }}/>
    </div>
  );
}

// Status badge
export function Badge({ status, custom }) {
  const map = {
    upcoming:      { bg:"#dcfce7", color:"#166534", label:"Upcoming" },
    requested:     { bg:"#fef9c3", color:"#854d0e", label:"Requested" },
    completed:     { bg:"#dbeafe", color:"#1e40af", label:"Completed" },
    cancelled:     { bg:"#fee2e2", color:"#991b1b", label:"Cancelled" },
    pending:       { bg:"#fef9c3", color:"#854d0e", label:"Action Required" },
    uploaded:      { bg:"#dbeafe", color:"#1e40af", label:"Uploaded" },
    active:        { bg:"#dcfce7", color:"#166534", label:"Active" },
    discontinued:  { bg:"#fee2e2", color:"#991b1b", label:"Discontinued" },
    on_hold:       { bg:"#fef9c3", color:"#854d0e", label:"On Hold" },
  };
  const s = custom || map[status] || map.pending;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:99, whiteSpace:"nowrap" }}>{s.label}</span>;
}

// Empty state
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      textAlign:"center", padding:"3.5rem 2rem",
      background:`linear-gradient(135deg,${T.cream},#f0fdfa)`,
      borderRadius:20, border:`1px dashed ${T.accent}30`,
    }}>
      <div style={{ fontSize:48, marginBottom:"1rem", filter:"grayscale(0.2)" }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:6 }}>{title}</div>
      <div style={{ color:T.muted, fontSize:13, lineHeight:1.7, maxWidth:320, margin:"0 auto" }}>{subtitle}</div>
      {action && <div style={{ marginTop:"1.2rem" }}>{action}</div>}
    </div>
  );
}

// Alert banner
export function Alert({ type="info", icon, title, subtitle, onClick }) {
  const map = {
    info:    { bg:"#eff6ff", border:"#bfdbfe", color:"#1d4ed8" },
    warning: { bg:"#fff7ed", border:"#fed7aa", color:"#92400e" },
    success: { bg:"#f0fdf4", border:"#bbf7d0", color:"#166534" },
    error:   { bg:"#fef2f2", border:"#fecaca", color:"#991b1b" },
  };
  const s = map[type];
  return (
    <div onClick={onClick} style={{
      background:s.bg, border:`1px solid ${s.border}`, borderRadius:14,
      padding:"0.9rem 1.2rem", marginBottom:"1.2rem",
      display:"flex", alignItems:"center", gap:10,
      cursor:onClick?"pointer":"default",
    }}>
      <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:s.color }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:s.color, opacity:0.8, marginTop:2 }}>{subtitle}</div>}
      </div>
      {onClick && <span style={{ color:s.color, fontSize:18 }}>›</span>}
    </div>
  );
}

// Primary button
export function Btn({ children, onClick, variant="primary", small=false, disabled=false, type="button" }) {
  const styles = {
    primary: { background:`linear-gradient(135deg,${T.accent},${T.teal})`, color:"#fff", border:"none" },
    secondary: { background:"#f3f4f6", color:T.text, border:`1px solid ${T.border}` },
    danger: { background:"#fee2e2", color:"#991b1b", border:"1px solid #fecaca" },
    ghost: { background:"transparent", color:T.accent, border:`1.5px solid ${T.accent}30` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "7px 14px" : "10px 20px",
      borderRadius: 20, fontSize: small ? 12 : 13,
      fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1, transition:"all .2s",
      fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6,
    }}
    onMouseOver={e=>{ if(!disabled) e.currentTarget.style.opacity="0.88"; }}
    onMouseOut={e=>{ e.currentTarget.style.opacity="1"; }}
    >{children}</button>
  );
}

// Toast
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:"#1a1f36", borderRadius:30, padding:"10px 20px",
      fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap",
      boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
      animation:"slideUp .25s ease",
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {message}
    </div>
  );
}

// Input field
export function Input({ label, type="text", value, onChange, placeholder, required, options, rows }) {
  const base = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1.5px solid ${T.border}`, fontSize:14,
    color:T.text, background:T.bg2, outline:"none",
    fontFamily:"inherit", transition:"border-color .2s, box-shadow .2s",
  };
  const focus = (e) => { e.target.style.borderColor=T.accent; e.target.style.boxShadow=`0 0 0 3px ${T.accent}18`; };
  const blur  = (e) => { e.target.style.borderColor=T.border; e.target.style.boxShadow="none"; };
  return (
    <div>
      {label && <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>{label}{required&&<span style={{color:T.rose}}> *</span>}</label>}
      {options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} required={required} style={base} onFocus={focus} onBlur={blur}>
          <option value="">Select…</option>
          {options.map(o=><option key={o}>{o}</option>)}
        </select>
      ) : rows ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}} onFocus={focus} onBlur={blur}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} style={base} onFocus={focus} onBlur={blur}/>
      )}
    </div>
  );
}
