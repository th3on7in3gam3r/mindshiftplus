import { useState, useEffect } from "react";
import {
  getAppointments as getAllAppointments, updateApptStatus as updateAppointmentStatus,
  getAvailability, upsertAvailability,
  getBlockedTimes, addBlockedTime, removeBlockedTime,
} from "../../lib/clinicApi";
import { supabase } from "../../lib/supabase";

// Admin emails allowed to access this dashboard
const ADMIN_EMAILS = ["info@mindshiftwellnessclinic.org"];

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
    if (!ADMIN_EMAILS.includes(data.user?.email)) {
      await supabase.auth.signOut();
      setError("Access denied. Admin accounts only.");
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
    <div style={{ minHeight:"100vh", background:"#1e2a4a", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ background:"#fff", borderRadius:20, padding:"2.5rem", maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 1rem" }}>🏥</div>
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

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const STATUS_COLORS = {
  pending:   { bg:"#fef9c3", color:"#854d0e", label:"Pending" },
  confirmed: { bg:"#dcfce7", color:"#166534", label:"Confirmed" },
  cancelled: { bg:"#fee2e2", color:"#991b1b", label:"Cancelled" },
  completed: { bg:"#dbeafe", color:"#1e40af", label:"Completed" },
  requested: { bg:"#fef9c3", color:"#854d0e", label:"Requested" },
  upcoming:  { bg:"#dcfce7", color:"#166534", label:"Upcoming" },
};

function Card({ children, style={} }) {
  return <div style={{ background:P.bg2, border:`1px solid ${P.border}`, borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{s.label}</span>;
}

function Tab({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding:"8px 16px", borderRadius:8, border:"none", fontSize:13, fontWeight:active?600:400,
      background:active?P.accent:"transparent", color:active?"#fff":P.muted, cursor:"pointer",
      display:"flex", alignItems:"center", gap:6,
    }}>
      {label}
      {count!=null&&<span style={{ background:active?"rgba(255,255,255,0.25)":"#e5e7eb", color:active?"#fff":P.muted, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:99 }}>{count}</span>}
    </button>
  );
}

// ── Appointments Tab ───────────────────────────────────────────────────────────
function AppointmentsTab({ userId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
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
    try { await updateAppointmentStatus(id, status); } catch {}
    showToast(`✓ Appointment ${status}`);
    load();
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  const filtered = filter==="all" ? appointments : appointments.filter(a=>a.status===filter);
  const pending = appointments.filter(a=>["pending","requested"].includes(a.status));

  return (
    <div>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}

      {pending.length>0&&(
        <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1.2rem", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div style={{ fontSize:13, fontWeight:600, color:"#92400e" }}>{pending.length} appointment{pending.length>1?"s":""} awaiting confirmation</div>
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:"1.2rem", flexWrap:"wrap" }}>
        {[["all","All",null],["pending","Pending",pending.length],["confirmed","Confirmed",null],["cancelled","Cancelled",null],["completed","Completed",null]].map(([v,l,c])=>(
          <Tab key={v} label={l} active={filter===v} onClick={()=>setFilter(v)} count={c}/>
        ))}
      </div>

      {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
      : filtered.length===0 ? (
        <Card style={{ textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
          <div style={{ color:P.muted, fontSize:13 }}>No appointments found.</div>
        </Card>
      ) : filtered.map(a=>(
        <Card key={a.id} style={{ marginBottom:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ fontWeight:700, fontSize:14, color:P.text }}>{a.name || "Portal Patient"}</div>
                <StatusBadge status={a.status}/>
              </div>
              <div style={{ color:P.muted, fontSize:12 }}>📅 {fmt(a.scheduled_at)} · {a.location||"—"}</div>
              {a.email&&<div style={{ color:P.muted, fontSize:12, marginTop:2 }}>✉️ {a.email}</div>}
              {a.phone&&<div style={{ color:P.muted, fontSize:12, marginTop:2 }}>📞 {a.phone}</div>}
              {a.reason&&<div style={{ color:P.muted2, fontSize:11, marginTop:4, fontStyle:"italic" }}>Reason: {a.reason}</div>}
              {a.notes&&<div style={{ color:P.muted2, fontSize:11, marginTop:2, fontStyle:"italic" }}>Notes: {a.notes}</div>}
            </div>
            {["pending","requested","upcoming"].includes(a.status)&&(
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>handleStatus(a.id,"confirmed")} style={{ background:"#dcfce7", border:"none", borderRadius:20, padding:"6px 14px", color:"#166534", fontSize:12, fontWeight:600, cursor:"pointer" }}>✓ Confirm</button>
                <button onClick={()=>handleStatus(a.id,"cancelled")} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"6px 14px", color:"#991b1b", fontSize:12, fontWeight:600, cursor:"pointer" }}>✕ Cancel</button>
                {a.status==="confirmed"&&<button onClick={()=>handleStatus(a.id,"completed")} style={{ background:"#dbeafe", border:"none", borderRadius:20, padding:"6px 14px", color:"#1e40af", fontSize:12, fontWeight:600, cursor:"pointer" }}>✓ Complete</button>}
              </div>
            )}
            {a.status==="confirmed"&&(
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>handleStatus(a.id,"completed")} style={{ background:"#dbeafe", border:"none", borderRadius:20, padding:"6px 14px", color:"#1e40af", fontSize:12, fontWeight:600, cursor:"pointer" }}>Mark Complete</button>
                <button onClick={()=>handleStatus(a.id,"cancelled")} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"6px 14px", color:"#991b1b", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              </div>
            )}
          </div>
        </Card>
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
        else setSlots(DAYS.slice(1,6).map((_,i) => ({ day_of_week:i+1, start_time:"09:00", end_time:"17:00", slot_duration_minutes:60, location:"Milford", is_active:true })));
      })
      .catch(() => setSlots(DAYS.slice(1,6).map((_,i) => ({ day_of_week:i+1, start_time:"09:00", end_time:"17:00", slot_duration_minutes:60, location:"Milford", is_active:true }))));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const update = (i, key, val) => setSlots(s => s.map((sl,idx) => idx===i ? {...sl,[key]:val} : sl));
  const addSlot = () => setSlots(s => [...s, { day_of_week:1, start_time:"09:00", end_time:"17:00", slot_duration_minutes:60, location:"Milford", is_active:true }]);
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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.2rem" }}>
        <p style={{ fontSize:13, color:P.muted }}>Define your weekly recurring availability. Patients will only see slots that are open.</p>
        <button onClick={addSlot} style={{ background:P.accent, border:"none", borderRadius:20, padding:"8px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>+ Add Slot</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", marginBottom:"1.2rem" }}>
        {slots.map((s,i)=>(
          <Card key={i} style={{ padding:"1rem" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <select value={s.day_of_week} onChange={e=>update(i,"day_of_week",Number(e.target.value))} style={{...inputStyle,minWidth:110}}>
                {DAYS.map((d,idx)=><option key={d} value={idx}>{d}</option>)}
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
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
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

// ── Main Admin Schedule ────────────────────────────────────────────────────────
export default function AdminSchedule({ onBack }) {
  const [adminUser, setAdminUser] = useState(null);
  const [tab, setTab] = useState("appointments");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  // Show admin login if not authenticated as admin
  if (!adminUser) return <AdminLogin onSuccess={setAdminUser}/>;

  const tabs = [
    { id:"appointments", label:"Appointments" },
    { id:"availability",  label:"Availability" },
    { id:"blocked",       label:"Blocked Times" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background:P.sidebar, padding:"1rem 5%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏥</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Scheduling Dashboard · Admin</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{adminUser?.email}</span>
          <button onClick={handleSignOut} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"6px 14px", fontSize:12, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>Sign Out</button>
          {onBack&&<button onClick={onBack} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"6px 14px", fontSize:12, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>← Exit</button>}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"2rem 5%" }}>
        <div style={{ marginBottom:"1.5rem" }}>
          <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Scheduling Dashboard</h1>
          <p style={{ fontSize:13, color:P.muted, marginTop:4 }}>Manage appointments, availability, and blocked times.</p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:"1.5rem", background:P.bg2, padding:4, borderRadius:12, border:`1px solid ${P.border}`, width:"fit-content" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"8px 18px", borderRadius:9, border:"none", fontSize:13, fontWeight:tab===t.id?600:400,
              background:tab===t.id?P.accent:"transparent", color:tab===t.id?"#fff":P.muted, cursor:"pointer",
            }}>{t.label}</button>
          ))}
        </div>

        {tab==="appointments" && <AppointmentsTab userId={adminUser?.id}/>}
        {tab==="availability"  && <AvailabilityTab userId={adminUser?.id}/>}
        {tab==="blocked"       && <BlockedTab userId={adminUser?.id}/>}
      </div>
    </div>
  );
}
