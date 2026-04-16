import { useState, useEffect } from "react";
import { getAppointments, bookAppointment, cancelAppointment } from "../../lib/clinicApi";

const TYPES = ["Follow-up","Medication Review","Telehealth","Initial Evaluation"];
const LOCATIONS = ["Milford — 31 Granite St. Suite #2","Boston — 100 Cambridge St. 14th Fl","Telehealth (Video)"];

function Card({ children, style={} }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function StatusBadge({ status }) {
  const map = {
    upcoming:  { bg:"#dcfce7", color:"#166534", label:"Upcoming" },
    requested: { bg:"#fef9c3", color:"#854d0e", label:"Requested" },
    completed: { bg:"#dbeafe", color:"#1e40af", label:"Completed" },
    cancelled: { bg:"#fee2e2", color:"#991b1b", label:"Cancelled" },
  };
  const s = map[status] || map.upcoming;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{s.label}</span>;
}

export default function PortalAppointments({ userId, P }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ appointment_type:"", location:"", notes:"" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString();
    const to   = new Date(now.getFullYear(), now.getMonth()+3, 0).toISOString();
    try {
      const data = await getAppointments(from, to, userId);
      setAppointments(Array.isArray(data) ? data : []);
    } catch { setAppointments([]); }
    setLoading(false);
  };
  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),4000); };

  const handleRequest = async (e) => {
    e.preventDefault();
    if(!form.appointment_type) return;
    setSubmitting(true);
    try {
      await bookAppointment({ patient_id: userId, appointment_type:form.appointment_type.toLowerCase().replace(/ /g,"_"), location:form.location, notes:form.notes, status:"requested" });
      showToast("✓ Request sent! We'll confirm within 1 business day.");
      setShowForm(false); setForm({appointment_type:"",location:"",notes:""}); load();
    } catch { showToast("Something went wrong. Please call (508) 306-1128."); }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    if(!confirm("Cancel this appointment?")) return;
    try { await cancelAppointment(id); } catch {}
    load();
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Date TBD";
  const upcoming = appointments.filter(a=>["upcoming","requested"].includes(a.status));
  const past = appointments.filter(a=>["completed","cancelled"].includes(a.status));

  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, color:"#1a1f36", background:"#fff", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      {toast && <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>{toast}</div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.8rem", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Appointments</div>
          <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Your Appointments</h1>
        </div>
        <button onClick={()=>setShowForm(true)} style={{ background:P.accent, border:"none", borderRadius:24, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Request Appointment</button>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", maxWidth:480, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ fontSize:"1.2rem", fontWeight:700, color:P.text }}>Request an Appointment</h2>
              <button onClick={()=>setShowForm(false)} style={{ background:"transparent", border:"none", fontSize:20, cursor:"pointer", color:P.muted }}>✕</button>
            </div>
            <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Appointment Type *</label>
                <select value={form.appointment_type} onChange={e=>setForm(f=>({...f,appointment_type:e.target.value}))} required style={inputStyle}>
                  <option value="">Select type…</option>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Preferred Location</label>
                <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={inputStyle}>
                  <option value="">No preference</option>
                  {LOCATIONS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Any specific concerns…" style={{...inputStyle,resize:"vertical"}}/>
              </div>
              <p style={{ fontSize:11, color:P.muted, lineHeight:1.6 }}>We'll contact you within 1 business day to confirm. For urgent needs, call (508) 306-1128.</p>
              <div style={{ display:"flex", gap:10 }}>
                <button type="submit" disabled={submitting} style={{ flex:1, background:P.accent, border:"none", borderRadius:20, padding:"11px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>{submitting?"Sending…":"Submit Request"}</button>
                <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:20, padding:"11px", color:P.muted, fontSize:14, cursor:"pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div style={{ marginBottom:"1.5rem" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.accent, marginBottom:10 }}>Upcoming</div>
        {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
        : upcoming.length===0 ? (
          <Card style={{ textAlign:"center", padding:"2.5rem" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
            <div style={{ fontWeight:600, color:P.text, marginBottom:6 }}>No upcoming appointments</div>
            <div style={{ color:P.muted, fontSize:13 }}>Request one above or call us at (508) 306-1128.</div>
          </Card>
        ) : upcoming.map(a=>(
          <Card key={a.id} style={{ marginBottom:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:P.text, marginBottom:4 }}>{a.appointment_type?.replace(/_/g," ")||"Appointment"}</div>
                <div style={{ color:P.muted, fontSize:12 }}>📅 {fmt(a.scheduled_at)}</div>
                <div style={{ color:P.muted, fontSize:12, marginTop:2 }}>📍 {a.location||"Location TBD"}</div>
                <div style={{ color:P.muted, fontSize:12, marginTop:2 }}>👨‍⚕️ {a.provider_name}</div>
                {a.notes&&<div style={{ color:P.muted2, fontSize:11, marginTop:4, fontStyle:"italic" }}>"{a.notes}"</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <StatusBadge status={a.status}/>
                {a.status==="upcoming"&&<button onClick={()=>handleCancel(a.id)} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"5px 12px", color:"#991b1b", fontSize:11, cursor:"pointer", fontWeight:600 }}>Cancel</button>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {past.length>0&&(
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.muted, marginBottom:10 }}>Past Appointments</div>
          {past.map(a=>(
            <Card key={a.id} style={{ marginBottom:"0.75rem", opacity:0.75 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:P.text }}>{a.appointment_type?.replace(/_/g," ")||"Appointment"}</div>
                  <div style={{ color:P.muted, fontSize:12, marginTop:2 }}>📅 {fmt(a.scheduled_at)} · {a.location||"—"}</div>
                </div>
                <StatusBadge status={a.status}/>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card style={{ marginTop:"1rem", background:"#f0fdfa", border:"1px solid #99f6e4", textAlign:"center" }}>
        <div style={{ fontSize:13, color:P.muted, marginBottom:10 }}>Book directly through our scheduling partner:</div>
        <a href="#" onClick={(e)=>{ e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-schedule')); }}
          style={{ display:"inline-flex", alignItems:"center", gap:6, background:P.teal, color:"#fff", padding:"9px 20px", borderRadius:20, fontSize:13, fontWeight:600, textDecoration:"none" }}>
          Book via Our Scheduler ↗
        </a>
      </Card>
    </div>
  );
}
