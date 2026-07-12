import { useState, useEffect } from "react";
import {
  getAppointments as getAllAppointments, updateApptStatus as updateAppointmentStatus,
  getAvailability, upsertAvailability,
  getBlockedTimes, addBlockedTime, removeBlockedTime,
} from "../../lib/clinicApi";
import { emailAppointmentConfirmed, emailAppointmentCancelled, emailTelehealthReminder } from "../../lib/emailService";
import { supabase } from "../../lib/supabase";
import { isAdminEmail, getClinicianRole, searchAdminPatients } from "../../lib/ehrDb";
import {
  DAY_NAMES, AVAIL_SUMMARY, OFF_SUMMARY,
  DEFAULT_AVAILABILITY_SLOTS, isAvailableDayOfWeek, isOffDayOfWeek,
} from "../../lib/schedulingConstants";

async function authorizeScheduleAdmin(user) {
  if (!user?.email) return false;
  if (isAdminEmail(user.email)) return true;
  const { data } = await getClinicianRole(user.id);
  return !!data;
}

const P = {
  bg:"#f7f8fc", bg2:"#fff", sidebar:"#1e2a4a",
  accent:"#4a6cf7", teal:"#0ea5a0", rose:"#e05c7a",
  gold:"#f0a500", success:"#22c55e",
  text:"#1a1f36", muted:"#6b7280", muted2:"#9ca3af",
  border:"#e5e7eb",
};

// ── Admin Login ────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Invalid credentials."); setLoading(false); return; }
    if (!(await authorizeScheduleAdmin(data.user))) {
      await supabase.auth.signOut({ scope: "local" });
      setError("Access denied. Clinic staff only.");
      setLoading(false); return;
    }
    onSuccess(data.user);
    setLoading(false);
  };

  const inputStyle = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:"1.5px solid #e5e7eb", fontSize:14, color:"#1a1f36",
    background:"#fff", outline:"none", fontFamily:"inherit",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#1e2a4a", display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ background:"#fff", borderRadius:20, padding:"2rem", maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:52, height:52, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" }}>
            <img src="/logo.png" alt="MindShift" style={{ width:52, height:52, borderRadius:14, objectFit:"contain", background:"#fff", padding:4 }}/>
          </div>
          <h2 style={{ fontSize:"1.3rem", fontWeight:700, color:"#1a1f36", marginBottom:4 }}>Admin Dashboard</h2>
          <p style={{ fontSize:13, color:"#6b7280" }}>MindShift Wellness Clinic · Clinician Access</p>
        </div>
        {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:14 }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Admin Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@clinic.com" required style={inputStyle}
              onFocus={e=>{ e.target.style.borderColor="#4a6cf7"; e.target.style.boxShadow="0 0 0 3px rgba(74,108,247,0.1)"; }}
              onBlur={e=>{ e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; }}/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
              onFocus={e=>{ e.target.style.borderColor="#4a6cf7"; e.target.style.boxShadow="0 0 0 3px rgba(74,108,247,0.1)"; }}
              onBlur={e=>{ e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; }}/>
          </div>
          <button type="submit" disabled={loading} style={{ background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none", borderRadius:10, padding:"13px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:loading?0.7:1 }}>
            {loading ? "Signing in…" : "Sign In to Admin"}
          </button>
        </form>
        <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", marginTop:"1.2rem" }}>
          🔒 Restricted access · Clinic staff only
        </p>
      </div>
    </div>
  );
}

const DAYS = DAY_NAMES;
const STATUS_COLORS = {
  pending:   { bg:"#fef9c3", color:"#854d0e", label:"Pending" },
  confirmed: { bg:"#dcfce7", color:"#166534", label:"Confirmed" },
  cancelled: { bg:"#fee2e2", color:"#991b1b", label:"Cancelled" },
  completed: { bg:"#dbeafe", color:"#1e40af", label:"Completed" },
  requested: { bg:"#fef9c3", color:"#854d0e", label:"Requested" },
  upcoming:  { bg:"#dcfce7", color:"#166534", label:"Upcoming" },
  archived:  { bg:"#f3f4f6", color:"#6b7280", label:"Archived" },
};

const VISIT_TYPES = [
  "Initial Evaluation",
  "Follow-Up",
  "Medication Management",
  "Telehealth",
  "Crisis / Urgent",
  "Other",
];

function Card({ children, style={} }) {
  return <div style={{ background:P.bg2, border:`1px solid ${P.border}`, borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{s.label}</span>;
}

function Tab({ label, active, onClick, count, icon }) {
  return (
    <button onClick={onClick} style={{
      padding:"8px 14px", borderRadius:9, border:"none", fontSize:13, fontWeight:active?600:400,
      background:active?P.accent:"transparent", color:active?"#fff":P.muted, cursor:"pointer",
      display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0,
    }}>
      {icon && <span style={{ fontSize:14 }}>{icon}</span>}
      {label}
      {count!=null&&<span style={{ background:active?"rgba(255,255,255,0.25)":"#e5e7eb", color:active?"#fff":P.muted, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:99 }}>{count}</span>}
    </button>
  );
}

const ADMIN_TAB_GROUPS = [
  {
    id: "schedule",
    label: "Schedule",
    icon: "📅",
    tabs: [
      { id: "appointments", label: "Appointments", icon: "📋" },
      { id: "availability", label: "Availability", icon: "🕐" },
      { id: "blocked", label: "Blocked Times", icon: "🚫" },
    ],
  },
  {
    id: "patients",
    label: "Patients & Records",
    icon: "👤",
    tabs: [
      { id: "patients", label: "Patient Lookup", icon: "🔍" },
      { id: "notes", label: "Visit Notes", icon: "📝" },
      { id: "rx", label: "Prescriptions", icon: "💊" },
      { id: "review", label: "Pre-Visit Review", icon: "📋" },
      { id: "docs", label: "Patient Documents", icon: "📄" },
    ],
  },
];

function findTabGroup(tabId) {
  return ADMIN_TAB_GROUPS.find(g => g.tabs.some(t => t.id === tabId)) || ADMIN_TAB_GROUPS[0];
}

// ── Schedule Calendar (matches public booking) ─────────────────────────────────
function AdminScheduleCalendar({ appointments, selectedDate, onSelectDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const toStr = d => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const apptMap = {};
  appointments.forEach(a => {
    if (!a.scheduled_at) return;
    const ds = a.scheduled_at.slice(0, 10);
    if (!apptMap[ds]) apptMap[ds] = [];
    apptMap[ds].push(a);
  });

  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Card style={{ marginBottom: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))} style={{ background: "transparent", border: `1px solid ${P.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: P.muted, fontSize: 16 }}>‹</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: P.text }}>{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} style={{ background: "transparent", border: `1px solid ${P.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: P.muted, fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, fontWeight: 600, padding: "4px 0",
            color: isOffDayOfWeek(idx) ? P.muted2 : P.muted,
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = toStr(d);
          const dow = new Date(`${ds}T12:00:00`).getDay();
          const off = isOffDayOfWeek(dow);
          const open = isAvailableDayOfWeek(dow);
          const sel = selectedDate === ds;
          const dayAppts = apptMap[ds] || [];
          const pending = dayAppts.filter(a => ["pending", "requested"].includes(a.status)).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(sel ? "" : ds)}
              title={off ? `${dayAppts.length ? dayAppts.length + " appointment(s) · " : ""}Clinic closed — click to view` : dayAppts.length ? `${dayAppts.length} appointment(s) — click to manage` : "Click to view this date"}
              style={{
                aspectRatio: "1", borderRadius: 10, border: "none", fontSize: 13,
                fontWeight: sel ? 700 : 400,
                background: sel ? P.accent : off ? "#f3f4f6" : "transparent",
                color: sel ? "#fff" : off ? P.muted2 : P.text,
                cursor: "pointer",
                opacity: off ? 0.65 : 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                transition: "all .15s",
              }}
              onMouseOver={e => { if (open && !sel) e.currentTarget.style.background = "#eef2ff"; }}
              onMouseOut={e => { if (open && !sel) e.currentTarget.style.background = "transparent"; }}
            >
              {d}
              {dayAppts.length > 0 && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  {pending > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? "#fff" : P.gold, display: "inline-block" }} />}
                  {dayAppts.length > pending && <span style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? "rgba(255,255,255,0.85)" : P.success, display: "inline-block" }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
        <strong>How to use:</strong> Click a date to view and manage that day&apos;s appointments below — confirm, cancel, complete, or archive from each card.
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: P.muted, display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        <span>{AVAIL_SUMMARY}</span>
        <span style={{ color: P.muted2 }}>· {OFF_SUMMARY}</span>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: P.muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.gold, display: "inline-block" }} /> Pending</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: P.success, display: "inline-block" }} /> Scheduled</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f3f4f6", border: `1px solid ${P.border}`, display: "inline-block" }} /> Closed</span>
      </div>
    </Card>
  );
}

// ── Appointment card (shared in list + day view) ───────────────────────────────
function AppointmentCard({ a, fmt, onStatus, P }) {
  return (
    <Card style={{ marginBottom:"0.75rem", opacity: a.status==="archived" ? 0.75 : 1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ fontWeight:700, fontSize:14, color:P.text }}>{a.name || "Portal Patient"}</div>
            <StatusBadge status={a.status}/>
            {a.appointment_type === "telehealth" && <span title="Telehealth" style={{ fontSize:14 }}>📹</span>}
          </div>
          <div style={{ color:P.muted, fontSize:12 }}>📅 {fmt(a.scheduled_at)} · {a.location||"—"}</div>
          {a.email&&<div style={{ color:P.muted, fontSize:12, marginTop:2 }}>✉️ {a.email}</div>}
          {a.phone&&<div style={{ color:P.muted, fontSize:12, marginTop:2 }}>📞 {a.phone}</div>}
          {a.reason&&<div style={{ color:P.muted2, fontSize:11, marginTop:4, fontStyle:"italic" }}>Reason: {a.reason}</div>}
          {a.notes&&<div style={{ color:P.muted2, fontSize:11, marginTop:2, fontStyle:"italic" }}>Notes: {a.notes}</div>}
        </div>
        <div className="admin-appt-actions" style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {["pending","requested","upcoming"].includes(a.status) && <>
            <button onClick={()=>onStatus(a.id,"confirmed")} style={{ background:"#dcfce7", border:"none", borderRadius:20, padding:"6px 14px", color:"#166534", fontSize:12, fontWeight:600, cursor:"pointer" }}>✓ Confirm</button>
            <button onClick={()=>onStatus(a.id,"cancelled")} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"6px 14px", color:"#991b1b", fontSize:12, fontWeight:600, cursor:"pointer" }}>✕ Cancel</button>
          </>}
          {a.status==="confirmed" && <>
            <button onClick={()=>onStatus(a.id,"completed")} style={{ background:"#dbeafe", border:"none", borderRadius:20, padding:"6px 14px", color:"#1e40af", fontSize:12, fontWeight:600, cursor:"pointer" }}>✓ Complete</button>
            <button onClick={()=>onStatus(a.id,"cancelled")} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"6px 14px", color:"#991b1b", fontSize:12, fontWeight:600, cursor:"pointer" }}>✕ Cancel</button>
          </>}
          {["completed","cancelled"].includes(a.status) && (
            <button onClick={()=>onStatus(a.id,"archived")} style={{ background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:20, padding:"6px 14px", color:"#6b7280", fontSize:12, fontWeight:600, cursor:"pointer" }}>🗄️ Archive</button>
          )}
          {a.status==="archived" && (
            <button onClick={()=>onStatus(a.id,"completed")} style={{ background:"#dbeafe", border:"none", borderRadius:20, padding:"6px 14px", color:"#1e40af", fontSize:12, fontWeight:600, cursor:"pointer" }}>↩ Restore</button>
          )}
        </div>
      </div>
      {a.appointment_type === "telehealth" && ["confirmed","pending","requested","upcoming"].includes(a.status) && (
        <div style={{ marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:`1px solid ${P.border}` }}>
          {a.telehealth_url
            ? <button onClick={() => window.open(a.telehealth_url, "_blank")} style={{ background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none", borderRadius:20, padding:"7px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>📹 Join Video Session</button>
            : <button onClick={()=>onStatus(a.id,"confirmed")} style={{ background:"#eef2ff", border:`1px solid ${P.accent}`, borderRadius:20, padding:"7px 16px", color:P.accent, fontSize:12, fontWeight:600, cursor:"pointer" }}>📹 Create Video Link</button>
          }
        </div>
      )}
    </Card>
  );
}

// ── Appointments Tab ───────────────────────────────────────────────────────────
function AppointmentsTab({ userId, onOpenEHRSchedule }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    const from = new Date(); from.setDate(from.getDate()-30);
    const to = new Date(); to.setDate(to.getDate()+90);
    try {
      const data = await getAllAppointments(from.toISOString(), to.toISOString());
      setAppointments(Array.isArray(data)?data:[]);
    } catch { setAppointments([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const handleStatus = async (id, status) => {
    const appt = appointments.find(a=>a.id===id);
    const emailData = appt ? {
      name: appt.name || "Patient",
      email: appt.email,
      date: appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "TBD",
      time: appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : "TBD",
      clinician: appt.provider_name || "Kenneth Mutegyeki, PMHNP-BC",
      location: appt.location || "Milford, MA",
    } : null;

    try {
      if (status === "confirmed" && appt?.appointment_type === "telehealth") {
        const scheduledAt = appt.scheduled_at || new Date().toISOString();
        const { data: response, error: fnErr } = await supabase.functions.invoke("telehealth", {
          body: { appointmentId: appt.id, scheduledAt },
        });
        if (fnErr) throw fnErr;
        if (response?.error) throw new Error(response.error);
        if (emailData?.email) {
          emailTelehealthReminder({ ...emailData, telehealth_url: response?.telehealth_url ?? null });
        }
      } else {
        await updateAppointmentStatus(id, status);
        if (emailData?.email) {
          if (status === "confirmed") emailAppointmentConfirmed(emailData);
          if (status === "cancelled") emailAppointmentCancelled(emailData);
        }
      }
      showToast(`✓ Appointment ${status}`);
      load();
    } catch (e) {
      showToast(`Failed: ${e.message || "Try again"}`);
    }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  const filtered = appointments.filter(a => {
    if (dateFilter && a.scheduled_at?.slice(0, 10) !== dateFilter) return false;
    if (dateFilter) return true;
    if (filter === "all") return a.status !== "archived";
    return a.status === filter;
  });
  const pending = appointments.filter(a=>["pending","requested"].includes(a.status));

  const actionBtn = (label, onClick, variant = "primary") => {
    const styles = {
      primary: { background:`linear-gradient(135deg,${P.accent},${P.teal})`, color:"#fff", border:"none" },
      secondary: { background:P.bg2, color:P.text, border:`1px solid ${P.border}` },
    };
    return (
      <button type="button" onClick={onClick} style={{
        ...styles[variant],
        borderRadius:20, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer",
      }}>{label}</button>
    );
  };

  return (
    <div>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}

      <Card style={{ marginBottom:"1.2rem", background:"#eff6ff", border:"1px solid #bfdbfe" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:12, color:"#1e40af", lineHeight:1.6, flex:1, minWidth:200 }}>
            <strong>Book & manage the full calendar in EHR.</strong> Use this tab to confirm telehealth (creates video link) and review upcoming visits.
          </div>
          {onOpenEHRSchedule && actionBtn("📅 Open EHR Schedule", () => onOpenEHRSchedule())}
        </div>
      </Card>

      {pending.length>0&&(
        <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1.2rem", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div style={{ fontSize:13, fontWeight:600, color:"#92400e" }}>{pending.length} appointment{pending.length>1?"s":""} awaiting confirmation</div>
        </div>
      )}

      <AdminScheduleCalendar
        appointments={appointments.filter(a => a.status !== "archived")}
        selectedDate={dateFilter}
        onSelectDate={setDateFilter}
      />

      {dateFilter && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1rem", flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:600, color:P.text }}>
            {new Date(dateFilter+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            {" · "}{filtered.length} appointment{filtered.length !== 1 ? "s" : ""}
          </span>
          <button onClick={()=>setDateFilter("")} style={{ background:"#eef2ff", border:"none", borderRadius:20, padding:"4px 12px", color:P.accent, fontSize:11, fontWeight:600, cursor:"pointer" }}>Show all dates</button>
          {onOpenEHRSchedule && (
            <button onClick={() => onOpenEHRSchedule(dateFilter)} style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:20, padding:"4px 14px", color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer" }}>+ Book in EHR</button>
          )}
        </div>
      )}

      {!dateFilter && (
      <div style={{ display:"flex", gap:6, marginBottom:"1.2rem", flexWrap:"wrap" }}>
        {[["all","All",null],["pending","Pending",pending.length],["confirmed","Confirmed",null],["cancelled","Cancelled",null],["completed","Completed",null],["archived","🗄️ Archived",null]].map(([v,l,c])=>(
          <Tab key={v} label={l} active={filter===v} onClick={()=>setFilter(v)} count={c}/>
        ))}
      </div>
      )}

      {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
      : filtered.length===0 ? (
        <Card style={{ textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
          <div style={{ color:P.muted, fontSize:13, marginBottom:8 }}>{filter==="archived" ? "No archived appointments." : dateFilter ? "No appointments on this date." : "No appointments found."}</div>
          {dateFilter && (
            <div style={{ color:P.muted2, fontSize:12, marginBottom:16 }}>
              {new Date(dateFilter+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} has no bookings yet.
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            {onOpenEHRSchedule && dateFilter && actionBtn(`+ Book on ${new Date(dateFilter+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} in EHR`, () => onOpenEHRSchedule(dateFilter))}
            {onOpenEHRSchedule && actionBtn("📅 Open EHR Schedule", () => onOpenEHRSchedule(), "secondary")}
            {dateFilter && actionBtn("Show all dates", () => setDateFilter(""), "secondary")}
          </div>
        </Card>
      ) : filtered.map(a=>(
        <AppointmentCard key={a.id} a={a} fmt={fmt} onStatus={handleStatus} P={P} />
      ))}
    </div>
  );
}

// ── Availability Tab ───────────────────────────────────────────────────────────
function AvailabilityTab({ userId }) {
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    getAvailability()
      .then(data => {
        if (Array.isArray(data) && data.length) setSlots(data);
        else setSlots(DEFAULT_AVAILABILITY_SLOTS.map(s => ({ ...s })));
      })
      .catch(() => setSlots(DEFAULT_AVAILABILITY_SLOTS.map(s => ({ ...s }))));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const update = (i, key, val) => setSlots(s => s.map((sl,idx) => idx===i ? {...sl,[key]:val} : sl));
  const addSlot = () => setSlots(s => [...s, { ...DEFAULT_AVAILABILITY_SLOTS[0], start_time:"09:00", end_time:"17:00" }]);
  const removeSlot = (i) => setSlots(s => s.filter((_,idx)=>idx!==i));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertAvailability(userId, slots.filter(s=>s.is_active));
      showToast("✓ Availability saved.");
    } catch { showToast("Failed to save. Try again."); }
    setSaving(false);
  };

  const inputStyle = { padding:"8px 10px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:13, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" };

  return (
    <div>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.2rem", flexWrap:"wrap", gap:8 }}>
        <p style={{ fontSize:13, color:P.muted, margin:0 }}>Weekly recurring availability. {AVAIL_SUMMARY} · {OFF_SUMMARY}.</p>
        <button onClick={addSlot} style={{ background:P.accent, border:"none", borderRadius:20, padding:"8px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>+ Add Slot</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", marginBottom:"1.2rem" }}>
        {slots.map((s,i)=>(
          <Card key={i} style={{ padding:"1rem" }}>
            <div className="admin-avail-row" style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <select value={s.day_of_week} onChange={e=>update(i,"day_of_week",Number(e.target.value))} style={{...inputStyle,minWidth:110}}>
                {DAYS.map((d,idx)=>(
                  <option key={d} value={idx} disabled={isOffDayOfWeek(idx)}>
                    {d}{isOffDayOfWeek(idx) ? " (Closed)" : ""}
                  </option>
                ))}
              </select>
              <input type="time" value={s.start_time} onChange={e=>update(i,"start_time",e.target.value)} style={inputStyle}/>
              <span style={{ color:P.muted, fontSize:13 }}>to</span>
              <input type="time" value={s.end_time} onChange={e=>update(i,"end_time",e.target.value)} style={inputStyle}/>
              <select value={s.slot_duration_minutes} onChange={e=>update(i,"slot_duration_minutes",Number(e.target.value))} style={inputStyle}>
                {[30,45,60,90].map(d=><option key={d} value={d}>{d} min</option>)}
              </select>
              <select value={s.location} onChange={e=>update(i,"location",e.target.value)} style={inputStyle}>
                {["Milford","Boston","Telehealth"].map(l=><option key={l}>{l}</option>)}
              </select>
              <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:P.muted, cursor:"pointer" }}>
                <input type="checkbox" checked={s.is_active} onChange={e=>update(i,"is_active",e.target.checked)}/> Active
              </label>
              <button onClick={()=>removeSlot(i)} style={{ background:"#fee2e2", border:"none", borderRadius:8, padding:"6px 10px", color:"#991b1b", fontSize:12, cursor:"pointer", marginLeft:"auto" }}>Remove</button>
            </div>
          </Card>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:12, padding:"12px 28px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
        {saving?"Saving…":"Save Availability"}
      </button>
    </div>
  );
}

// ── Blocked Times Tab ──────────────────────────────────────────────────────────
function BlockedTab({ userId }) {
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState({ date:"", start_time:"", end_time:"", reason:"", all_day:false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const from = new Date().toISOString().slice(0,10);
    const to = new Date(Date.now()+90*86400000).toISOString().slice(0,10);
    try {
      const data = await getBlockedTimes(from, to);
      setBlocks(Array.isArray(data)?data:[]);
    } catch { setBlocks([]); }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    setSaving(true);
    try {
      await addBlockedTime(userId, form);
      showToast("✓ Time blocked.");
      setForm({ date:"", start_time:"", end_time:"", reason:"", all_day:false });
      load();
    } catch { showToast("Failed. Try again."); }
    setSaving(false);
  };

  const handleRemove = async (id) => {
    try { await removeBlockedTime(id); } catch {}
    load();
  };

  const inputStyle = { padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit", width:"100%" };

  return (
    <div className="admin-blocked-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}

      <Card>
        <h3 style={{ fontSize:"1rem", fontWeight:700, color:P.text, marginBottom:"1rem" }}>Block Off Time</h3>
        <form onSubmit={handleAdd} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Date *</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required style={inputStyle}/>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:P.muted, cursor:"pointer" }}>
            <input type="checkbox" checked={form.all_day} onChange={e=>setForm(f=>({...f,all_day:e.target.checked}))}/>
            All day
          </label>
          {!form.all_day&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Start Time</label>
                <input type="time" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>End Time</label>
                <input type="time" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))} style={inputStyle}/>
              </div>
            </div>
          )}
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Reason (optional)</label>
            <input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Lunch, Conference, Holiday" style={inputStyle}/>
          </div>
          <button type="submit" disabled={saving} style={{ background:P.rose, border:"none", borderRadius:10, padding:"11px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":"Block This Time"}
          </button>
        </form>
      </Card>

      <div>
        <h3 style={{ fontSize:"1rem", fontWeight:700, color:P.text, marginBottom:"1rem" }}>Upcoming Blocked Times</h3>
        {blocks.length===0 ? (
          <Card style={{ textAlign:"center", padding:"2rem" }}>
            <div style={{ color:P.muted, fontSize:13 }}>No blocked times in the next 90 days.</div>
          </Card>
        ) : blocks.map(b=>(
          <Card key={b.id} style={{ marginBottom:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:P.text }}>{new Date(b.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
                <div style={{ fontSize:12, color:P.muted, marginTop:2 }}>
                  {b.all_day ? "All day" : `${b.start_time?.slice(0,5)||"—"} – ${b.end_time?.slice(0,5)||"—"}`}
                  {b.reason&&` · ${b.reason}`}
                </div>
              </div>
              <button onClick={()=>handleRemove(b.id)} style={{ background:"#fee2e2", border:"none", borderRadius:8, padding:"5px 10px", color:"#991b1b", fontSize:11, cursor:"pointer" }}>Remove</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Admin Visit Notes Tab ──────────────────────────────────────────────────────
function AdminNotesTab({ adminUser }) {
  const [patientId, setPatientId] = useState("");
  const [form, setForm] = useState({
    note_date: new Date().toISOString().slice(0, 10),
    visit_type: "Follow-Up",
    chief_complaint: "",
    assessment: "",
    plan: "",
    follow_up: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" };
  const taStyle = { ...inputStyle, resize:"vertical", minHeight:80 };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) { showToast("Enter a patient ID."); return; }
    setSaving(true);
    try {
      const { addVisitNote } = await import("../../lib/clinicApi");
      await addVisitNote({
        patient_id: patientId,
        clinician_name: adminUser?.user_metadata?.full_name || "Kenneth Mutegyeki, PMHNP-BC",
        ...form,
      });
      showToast("✓ Visit note saved.");
      setForm({
        note_date: new Date().toISOString().slice(0, 10),
        visit_type: "Follow-Up",
        chief_complaint: "",
        assessment: "",
        plan: "",
        follow_up: "",
      });
    } catch (e) { showToast("Failed: " + (e.message || "Try again.")); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth:700 }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}
      <p style={{ fontSize:13, color:P.muted, marginBottom:"1.2rem" }}>Add a visit note for a patient. They can view it (read-only) in their portal.</p>
      <Card>
        <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }} className="admin-form-grid">
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Patient ID (Supabase user ID) *</label>
              <input value={patientId} onChange={e=>setPatientId(e.target.value)} placeholder="uuid..." required style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Visit Date</label>
              <input type="date" value={form.note_date} onChange={e=>setForm(f=>({...f,note_date:e.target.value}))} style={inputStyle}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Visit Type</label>
            <select value={form.visit_type} onChange={e=>setForm(f=>({...f,visit_type:e.target.value}))} style={inputStyle}>
              {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Chief Complaint</label>
            <input value={form.chief_complaint} onChange={e=>setForm(f=>({...f,chief_complaint:e.target.value}))} placeholder="Patient's main concern..." style={inputStyle}/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Assessment</label>
            <textarea value={form.assessment} onChange={e=>setForm(f=>({...f,assessment:e.target.value}))} placeholder="Clinical assessment..." style={taStyle}/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Treatment Plan</label>
            <textarea value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} placeholder="Plan and next steps..." style={taStyle}/>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Follow-up Instructions</label>
            <input value={form.follow_up} onChange={e=>setForm(f=>({...f,follow_up:e.target.value}))} placeholder="e.g. Return in 4 weeks..." style={inputStyle}/>
          </div>
          <button type="submit" disabled={saving} style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":"Save Visit Note"}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ── Admin Prescriptions Tab ────────────────────────────────────────────────────
function AdminRxTab({ adminUser }) {
  const [patientId, setPatientId] = useState("");
  const [form, setForm] = useState({ medication:"", dosage:"", frequency:"", prescribed_date: new Date().toISOString().slice(0,10), refills_remaining:0, notes:"" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientId.trim() || !form.medication.trim()) { showToast("Patient ID and medication are required."); return; }
    setSaving(true);
    try {
      const { addPrescription } = await import("../../lib/clinicApi");
      await addPrescription({ patient_id: patientId, ...form });
      showToast("✓ Prescription saved.");
      setForm({ medication:"", dosage:"", frequency:"", prescribed_date: new Date().toISOString().slice(0,10), refills_remaining:0, notes:"" });
    } catch { showToast("Failed. Try again."); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth:700 }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}
      <p style={{ fontSize:13, color:P.muted, marginBottom:"1.2rem" }}>Add a prescription for a patient. They can view it in their portal.</p>
      <Card>
        <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Patient ID *</label>
            <input value={patientId} onChange={e=>setPatientId(e.target.value)} placeholder="uuid..." required style={inputStyle}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Medication *</label>
              <input value={form.medication} onChange={e=>setForm(f=>({...f,medication:e.target.value}))} placeholder="e.g. Sertraline" required style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Dosage</label>
              <input value={form.dosage} onChange={e=>setForm(f=>({...f,dosage:e.target.value}))} placeholder="e.g. 50mg" style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Frequency</label>
              <input value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))} placeholder="e.g. Once daily" style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Refills Remaining</label>
              <input type="number" min="0" value={form.refills_remaining} onChange={e=>setForm(f=>({...f,refills_remaining:Number(e.target.value)}))} style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Prescribed Date</label>
              <input type="date" value={form.prescribed_date} onChange={e=>setForm(f=>({...f,prescribed_date:e.target.value}))} style={inputStyle}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Notes (optional)</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional instructions..." style={inputStyle}/>
          </div>
          <button type="submit" disabled={saving} style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:10, padding:"12px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":"Save Prescription"}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ── Clinician view of a patient's portal care journal ─────────────────────────
function PortalJournalClinicianPanel({ patientId, patientName, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);
    import("../../lib/clinicApi").then(({ getPatientJournalForReview }) =>
      getPatientJournalForReview(patientId)
        .then((data) => {
          if (!cancelled) setEntries(Array.isArray(data) ? data : []);
        })
        .catch(() => { if (!cancelled) setEntries([]); })
        .finally(() => { if (!cancelled) setLoading(false); })
    );
    return () => { cancelled = true; };
  }, [patientId]);

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card style={{ marginTop: "1rem", marginBottom: "1rem", border: `2px solid ${P.teal}40` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>📓 Portal Care Journal</div>
          <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>{patientName || "Patient"} · review during scheduled care only</div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: P.muted }}>
            Close
          </button>
        )}
      </div>
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "8px 12px", marginBottom: "1rem", fontSize: 11, color: "#92400e", lineHeight: 1.55 }}>
        Private entries from <strong>Patient Portal → Care Journal</strong>. Not the same as MindShift+ wellness journal (Mia).
      </div>
      {loading ? (
        <div style={{ color: P.muted, fontSize: 13 }}>Loading journal…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", color: P.muted, fontSize: 13 }}>No portal journal entries for this patient.</div>
      ) : entries.map(e => (
        <Card key={e.id} style={{ marginBottom: "0.75rem", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 18 }}>{e.mood || "🙂"}</span>
                <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>{e.title || "Journal Entry"}</div>
              </div>
              <div style={{ fontSize: 11, color: P.muted2 }}>{fmt(e.created_at)}</div>
              {e.tags?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {e.tags.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(14,165,160,0.1)", color: P.teal }}>{t}</span>)}
                </div>
              )}
            </div>
            <span style={{ color: P.accent, fontSize: 14, flexShrink: 0 }}>{expanded === e.id ? "▲" : "▼"}</span>
          </div>
          {expanded === e.id && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${P.border}` }}>
              <p style={{ fontSize: 13, color: P.text, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{e.body}</p>
            </div>
          )}
        </Card>
      ))}
    </Card>
  );
}

// ── Pre-Visit Review Tab (appointments + portal journal) ───────────────────────
function AppointmentReviewTab({ initialPatientId, initialPatientName, onGoToPatientLookup }) {
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const [patientName, setPatientName] = useState(initialPatientName || "");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialPatientId) {
      setPatientId(initialPatientId);
      setPatientName(initialPatientName || "");
    }
  }, [initialPatientId, initialPatientName]);

  useEffect(() => {
    if (!initialPatientId) return;
    const load = async () => {
      setLoading(true);
      setSearched(true);
      try {
        const { getAppointmentsByPatient } = await import("../../lib/clinicApi");
        const apptData = await getAppointmentsByPatient(initialPatientId.trim());
        setAppointments(Array.isArray(apptData) ? apptData : []);
      } catch {
        setAppointments([]);
      }
      setLoading(false);
    };
    load();
  }, [initialPatientId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { getAppointmentsByPatient } = await import("../../lib/clinicApi");
      const apptData = await getAppointmentsByPatient(patientId.trim());
      setAppointments(Array.isArray(apptData) ? apptData : []);
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  };

  const apptFmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  return (
    <div style={{ maxWidth:760 }}>
      <p style={{ fontSize:13, color:P.muted, marginBottom:"1.2rem", lineHeight:1.6 }}>
        Review a patient&apos;s <strong>appointment history</strong> before a session.
        For journal entries, use <strong>Patient Lookup</strong> → search by name → <strong>View Portal Journal</strong>.
      </p>

      {onGoToPatientLookup && (
        <Card style={{ marginBottom:"1.2rem", background:"#f0fdfa", border:`1px solid ${P.teal}40` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:12, color:"#0f766e", lineHeight:1.6 }}>
              <strong>Tip:</strong> Search by patient name in Patient Lookup — no UUID typing needed.
            </div>
            <button type="button" onClick={onGoToPatientLookup} style={{ background:P.teal, border:"none", borderRadius:8, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Go to Patient Lookup →
            </button>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom:"1.5rem" }}>
        <h3 style={{ fontSize:"1rem", fontWeight:700, color:P.text, marginBottom:"1rem" }}>Load Appointments</h3>
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10 }}>
          <input
            value={patientId} onChange={e=>setPatientId(e.target.value)}
            placeholder="Patient Supabase ID (from Patient Lookup)…"
            style={{ flex:1, padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" }}
          />
          <button type="submit" style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Load
          </button>
        </form>
      </Card>

      {loading && <div style={{color:P.muted,fontSize:13}}>Loading…</div>}

      {searched && !loading && (
        <>
          <h3 style={{ fontSize:"0.95rem", fontWeight:700, color:P.text, marginBottom:"0.75rem" }}>📅 Appointments</h3>
          {appointments.length === 0 ? (
            <Card style={{ textAlign:"center", padding:"1.5rem", marginBottom:"1.5rem" }}>
              <div style={{ color:P.muted, fontSize:13 }}>No appointments found for this patient ID.</div>
            </Card>
          ) : appointments.slice(0, 12).map(a => (
            <Card key={a.id} style={{ marginBottom:"0.75rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:600, fontSize:14, color:P.text }}>{apptFmt(a.scheduled_at)}</span>
                    <StatusBadge status={a.status} />
                    {a.appointment_type === "telehealth" && <span>📹</span>}
                  </div>
                  <div style={{ fontSize:12, color:P.muted }}>{a.location || "—"} · {a.provider_name || "Clinic"}</div>
                  {a.reason && <div style={{ fontSize:11, color:P.muted2, marginTop:4 }}>Reason: {a.reason}</div>}
                </div>
                {a.telehealth_url && a.status === "confirmed" && (
                  <button type="button" onClick={() => window.open(a.telehealth_url, "_blank")} style={{ background:"#eef2ff", border:"none", borderRadius:20, padding:"6px 14px", color:P.accent, fontSize:11, fontWeight:600, cursor:"pointer" }}>Join Video</button>
                )}
              </div>
            </Card>
          ))}

          {patientId.trim() && (
            <PortalJournalClinicianPanel
              patientId={patientId.trim()}
              patientName={patientName || "Patient"}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Patient Lookup Tab ────────────────────────────────────────────────────────
function PatientLookupTab({ onOpenPreVisitReview }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [journalPatient, setJournalPatient] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const runSearch = async (query) => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await searchAdminPatients(q);
      if (error) throw new Error(error.message || String(error));
      setResults(data ?? []);
    } catch (e) {
      showToast("Search failed: " + e.message);
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => runSearch(q), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(search);
  };

  const copyText = (label, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      showToast(`✓ ${label} copied!`);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const inputStyle = { flex:1, padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ maxWidth:760 }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}

      <p style={{ fontSize:13, color:P.muted, marginBottom:"1.2rem", lineHeight:1.6 }}>
        Search by patient name, MRN, email, or Supabase patient ID.
        Click <strong>View Portal Journal</strong> to read a patient&apos;s care journal — no UUID typing needed.
      </p>

      <Card style={{ marginBottom:"1.5rem" }}>
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10 }}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Name, MRN, email, or patient UUID…"
            style={inputStyle}
            autoComplete="off"
          />
          <button type="submit" style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Search
          </button>
        </form>
      </Card>

      {loading && <div style={{color:P.muted,fontSize:13}}>Searching…</div>}

      {results.length === 0 && !loading && searched && (
        <Card style={{ textAlign:"center", padding:"2rem" }}>
          <div style={{ color:P.muted, fontSize:13, marginBottom:8 }}>No patients found for &ldquo;{search.trim()}&rdquo;.</div>
          <div style={{ color:P.muted2, fontSize:12 }}>Try the full MRN, first + last name, or create a chart in MindShift EHR first.</div>
        </Card>
      )}

      {results.map(p=>(
        <Card key={p.id || p.chartId} style={{ marginBottom:"0.75rem", border: p.noPortalId ? "1px solid #fed7aa" : undefined }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, color:P.text, marginBottom:3 }}>{p.name || "Unknown Patient"}</div>
              {p.noPortalId && (
                <div style={{ fontSize:11, color:"#92400e", background:"#fff7ed", padding:"6px 10px", borderRadius:8, marginBottom:8, lineHeight:1.5 }}>
                  <strong>No Portal Patient ID.</strong> Chart exists in EHR (use MRN in Scribe/EHR). To enable Visit Notes, Rx, and portal tools — open chart → Edit Chart → add Portal Patient ID.
                </div>
              )}
              {p.mrn && (
                <div style={{ fontSize:12, color:P.muted, marginBottom:4 }}>
                  MRN: <code style={{ fontSize:11, background:"#f3f4f6", padding:"2px 6px", borderRadius:4 }}>{p.mrn}</code>
                </div>
              )}
              {p.email && p.email !== "—" && (
                <div style={{ fontSize:12, color:P.muted, marginBottom:4 }}>✉️ {p.email}</div>
              )}
              {p.phone && (
                <div style={{ fontSize:12, color:P.muted, marginBottom:6 }}>📞 {p.phone}</div>
              )}
              <div style={{ fontSize:11, color:P.muted2, marginBottom:4 }}>Source: {p.source}</div>
              {p.id ? (
                <div style={{ marginBottom:4 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:P.muted2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>
                    Supabase Patient ID
                  </div>
                  <code style={{ fontSize:11, background:"#f3f4f6", padding:"4px 8px", borderRadius:6, color:P.text, fontFamily:"monospace", wordBreak:"break-all", display:"block" }}>{p.id}</code>
                </div>
              ) : null}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
              {p.id && (
                <>
                  <button
                    type="button"
                    onClick={() => setJournalPatient({ id: p.id, name: p.name || "Patient" })}
                    style={{
                      background: journalPatient?.id === p.id ? "#ccfbf1" : P.bg2,
                      border: journalPatient?.id === p.id ? `2px solid ${P.teal}` : `1px solid ${P.border}`,
                      borderRadius:20, padding:"8px 16px",
                      color: journalPatient?.id === p.id ? "#0f766e" : P.text,
                      fontSize:12, fontWeight:600, cursor:"pointer",
                    }}
                  >
                    {journalPatient?.id === p.id ? "📓 Viewing Journal" : "📓 View Portal Journal"}
                  </button>
                  <button
                    type="button"
                    onClick={()=>copyText("Patient ID", p.id)}
                    style={{
                      background: copied===p.id ? "#dcfce7" : `linear-gradient(135deg,${P.accent},${P.teal})`,
                      border:"none", borderRadius:20, padding:"8px 16px",
                      color: copied===p.id ? "#166534" : "#fff",
                      fontSize:12, fontWeight:600, cursor:"pointer",
                      transition:"all .2s",
                    }}
                  >
                    {copied===p.id ? "✓ Copied!" : "Copy Patient ID"}
                  </button>
                  {onOpenPreVisitReview && (
                    <button
                      type="button"
                      onClick={() => onOpenPreVisitReview(p.id, p.name)}
                      style={{
                        background: P.bg2, border:`1px solid ${P.border}`, borderRadius:20, padding:"8px 16px",
                        color: P.muted, fontSize:11, fontWeight:600, cursor:"pointer",
                      }}
                    >
                      Pre-Visit Review →
                    </button>
                  )}
                </>
              )}
              {p.mrn && (
                <button
                  type="button"
                  onClick={()=>copyText("MRN", p.mrn)}
                  style={{
                    background: copied===p.mrn ? "#dcfce7" : P.bg2,
                    border:`1px solid ${P.border}`, borderRadius:20, padding:"8px 16px",
                    color: copied===p.mrn ? "#166534" : P.text,
                    fontSize:12, fontWeight:600, cursor:"pointer",
                  }}
                >
                  {copied===p.mrn ? "✓ Copied!" : "Copy MRN"}
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {journalPatient?.id && (
        <PortalJournalClinicianPanel
          patientId={journalPatient.id}
          patientName={journalPatient.name}
          onClose={() => setJournalPatient(null)}
        />
      )}

      <Card style={{ background:"#eff6ff", border:"1px solid #bfdbfe", marginTop:"1rem" }}>
        <div style={{ fontSize:12, color:"#1e40af", lineHeight:1.7 }}>
          💡 <strong>Portal Care Journal:</strong> Search by name → <strong>View Portal Journal</strong>.
          Copy Patient ID for Visit Notes, Rx, and Documents. Manually added EHR charts without a portal link show MRN only — link Portal Patient ID in EHR to enable journal access.
        </div>
      </Card>
    </div>
  );
}

// ── Patient Documents Tab ──────────────────────────────────────────────────────
function PatientDocumentsTab() {
  const [patientId, setPatientId] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("other");
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 3000); };

  const loadDocs = async (id) => {
    const pid = (id || patientId).trim();
    if (!pid) return;
    setLoading(true);
    setSearched(true);
    try {
      const { getAllPatientDocuments } = await import("../../lib/clinicApi");
      const data = await getAllPatientDocuments(pid);
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      setDocuments([]);
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadDocs();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !patientId.trim()) {
      showToast("Enter patient ID and choose a file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File must be 10MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const { uploadClinicianDocument } = await import("../../lib/clinicApi");
      await uploadClinicianDocument(patientId.trim(), file, docType);
      showToast("✓ Document uploaded.");
      await loadDocs();
    } catch (err) {
      showToast("Upload failed: " + (err.message || "Check Supabase storage setup."));
    }
    setUploading(false);
    e.target.value = "";
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const TYPE_ICONS  = { intake_form:"📋", consent:"✍️", lab_result:"🧪", insurance:"🛡️", id_document:"🪪", visit_note:"📝", other:"📄" };
  const TYPE_LABELS = { intake_form:"Intake Form", consent:"Consent Form", lab_result:"Lab Result", insurance:"Insurance Card", id_document:"ID Document", visit_note:"Visit Note", other:"Document" };
  const inputStyle = { flex:1, padding:"10px 12px", borderRadius:8, border:`1.5px solid ${P.border}`, fontSize:14, color:P.text, background:P.bg2, outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ maxWidth:760 }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}
      <p style={{ fontSize:13, color:P.muted, marginBottom:"1.2rem", lineHeight:1.6 }}>
        View or upload documents for a patient. Enter their Supabase Patient ID from Patient Lookup.
        Patients can also upload from their portal — clinicians can share visit notes, forms, and files here.
      </p>
      <Card style={{ marginBottom:"1.5rem" }}>
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10, marginBottom:"1rem" }}>
          <input value={patientId} onChange={e=>setPatientId(e.target.value)} placeholder="Patient Supabase user ID…" style={inputStyle}/>
          <button type="submit" style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Load Documents
          </button>
        </form>
        {patientId.trim() && (
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", paddingTop:"0.75rem", borderTop:`1px solid ${P.border}` }}>
            <select value={docType} onChange={e=>setDocType(e.target.value)} style={{ ...inputStyle, flex:"0 0 auto", minWidth:160 }}>
              <option value="visit_note">Visit Note</option>
              <option value="consent">Consent Form</option>
              <option value="lab_result">Lab Result</option>
              <option value="insurance">Insurance Card</option>
              <option value="intake_form">Intake Form</option>
              <option value="id_document">ID Document</option>
              <option value="other">Other</option>
            </select>
            <label style={{ background: uploading ? P.muted2 : P.accent, color:"#fff", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:600, cursor: uploading ? "default" : "pointer" }}>
              {uploading ? "Uploading…" : "📤 Upload Document"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={handleUpload} disabled={uploading} style={{ display:"none" }} />
            </label>
            <span style={{ fontSize:11, color:P.muted2 }}>PDF, Word, JPEG, PNG · max 10MB</span>
          </div>
        )}
      </Card>

      {loading && <div style={{color:P.muted,fontSize:13}}>Loading…</div>}

      {searched && !loading && documents.length===0 && (
        <Card style={{ textAlign:"center", padding:"2rem" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
          <div style={{ color:P.muted, fontSize:13 }}>No documents found for this patient.</div>
        </Card>
      )}

      {documents.map(doc=>(
        <Card key={doc.id} style={{ marginBottom:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                {TYPE_ICONS[doc.type]||"📄"}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:P.text }}>{doc.name}</div>
                <div style={{ fontSize:12, color:P.muted, marginTop:2 }}>
                  {TYPE_LABELS[doc.type]||"Document"} · {fmt(doc.created_at)} · {doc.status}
                </div>
              </div>
            </div>
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, color:"#fff", padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                View / Download ↗
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Main Admin Schedule ────────────────────────────────────────────────────────
export default function AdminSchedule({ onBack, onOpenDocs, onOpenEHRSchedule }) {
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("appointments");
  const [tabGroup, setTabGroup] = useState("schedule");
  const [reviewPatientId, setReviewPatientId] = useState("");
  const [reviewPatientName, setReviewPatientName] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const user = session?.user;
      if (user && (await authorizeScheduleAdmin(user))) setAdminUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const user = session?.user;
      if (user && (await authorizeScheduleAdmin(user))) setAdminUser(user);
      else setAdminUser(null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setAdminUser(null);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight:"100vh", background:P.sidebar, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.5)", fontFamily:"'Inter',system-ui,sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (!adminUser) return <AdminLogin onSuccess={setAdminUser}/>;

  const activeGroup = findTabGroup(tab);
  const switchGroup = (groupId) => {
    const group = ADMIN_TAB_GROUPS.find(g => g.id === groupId) || ADMIN_TAB_GROUPS[0];
    setTabGroup(group.id);
    if (!group.tabs.some(t => t.id === tab)) setTab(group.tabs[0].id);
  };
  const selectTab = (tabId) => {
    setTab(tabId);
    setTabGroup(findTabGroup(tabId).id);
  };

  const goToPatientLookup = () => {
    setTabGroup("patients");
    setTab("patients");
  };

  const openPreVisitReview = (patientId, patientName) => {
    setReviewPatientId(patientId);
    setReviewPatientName(patientName || "");
    setTabGroup("patients");
    setTab("review");
  };

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @media(max-width:767px){
          .admin-header-email{display:none !important}
          .admin-tabs{overflow-x:auto !important; width:100% !important; flex-wrap:nowrap !important}
          .admin-tabs button{white-space:nowrap; padding:8px 12px !important; font-size:12px !important}
          .admin-blocked-grid{grid-template-columns:1fr !important}
          .admin-avail-row{flex-wrap:wrap !important}
          .admin-avail-row select, .admin-avail-row input{min-width:0 !important; width:100% !important}
          .admin-appt-actions{flex-direction:column !important; align-items:flex-start !important}
          .admin-form-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      {/* Header */}
      <div style={{ background:P.sidebar, padding:"0.9rem 4%", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}><img src="/logo.png" alt="" style={{width: 20, height: 20}} /></div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>MindShift Admin</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span className="admin-header-email" style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{adminUser?.email}</span>
          {onOpenDocs&&<button onClick={onOpenDocs} style={{ background:"rgba(245,200,66,0.15)", border:"1px solid rgba(245,200,66,0.35)", borderRadius:20, padding:"5px 12px", fontSize:11, color:"#fcd34d", cursor:"pointer" }}>📖 Docs</button>}
          <button onClick={handleSignOut} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"5px 12px", fontSize:11, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>Sign Out</button>
          {onBack&&<button onClick={onBack} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"5px 12px", fontSize:11, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>← Exit</button>}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.5rem 4%" }}>
        <div style={{ marginBottom:"1.2rem" }}>
          <h1 style={{ fontSize:"clamp(1.2rem,4vw,1.6rem)", fontWeight:700, color:P.text }}>Scheduling Dashboard</h1>
          <p style={{ fontSize:13, color:P.muted, marginTop:4 }}>Manage appointments, availability, and blocked times.</p>
        </div>

        {/* Group tabs + section tabs */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            {ADMIN_TAB_GROUPS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => switchGroup(g.id)}
                style={{
                  padding:"9px 16px", borderRadius:10, border:"none", fontSize:13, fontWeight:600, cursor:"pointer",
                  background: tabGroup === g.id ? P.sidebar : P.bg2,
                  color: tabGroup === g.id ? "#fff" : P.muted,
                  boxShadow: tabGroup === g.id ? "0 2px 8px rgba(30,42,74,0.2)" : "none",
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                <span>{g.icon}</span> {g.label}
              </button>
            ))}
          </div>
          <div className="admin-tabs" style={{ display:"flex", gap:4, background:P.bg2, padding:4, borderRadius:12, border:`1px solid ${P.border}`, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
            {activeGroup.tabs.map(t => (
              <Tab key={t.id} label={t.label} icon={t.icon} active={tab===t.id} onClick={() => selectTab(t.id)} />
            ))}
          </div>
        </div>

        {tab==="appointments" && <AppointmentsTab userId={adminUser?.id} onOpenEHRSchedule={onOpenEHRSchedule}/>}
        {tab==="patients"     && <PatientLookupTab onOpenPreVisitReview={openPreVisitReview}/>}
        {tab==="availability"  && <AvailabilityTab userId={adminUser?.id}/>}
        {tab==="blocked"       && <BlockedTab userId={adminUser?.id}/>}
        {tab==="notes"         && <AdminNotesTab adminUser={adminUser}/>}
        {tab==="rx"            && <AdminRxTab adminUser={adminUser}/>}
        {tab==="review"        && (
          <AppointmentReviewTab
            initialPatientId={reviewPatientId}
            initialPatientName={reviewPatientName}
            onGoToPatientLookup={goToPatientLookup}
          />
        )}
        {tab==="docs"          && <PatientDocumentsTab/>}
      </div>
    </div>
  );
}
