import { useState, useEffect } from "react";
import { getAppointments, bookAppointment, cancelAppointment } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, Btn, Toast, Input, T } from "./PortalUI";

const TYPES = ["Follow-up","Medication Review","Telehealth","Initial Evaluation"];
const LOCATIONS = ["Milford — 31 Granite St. Suite #2","Telehealth (Video)"];

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
    try { const data = await getAppointments(from, to, userId); setAppointments(Array.isArray(data)?data:[]); }
    catch { setAppointments([]); }
    setLoading(false);
  };
  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),4000); };

  const handleRequest = async (e) => {
    e.preventDefault();
    if(!form.appointment_type) return;
    setSubmitting(true);
    try {
      await bookAppointment({ patient_id:userId, appointment_type:form.appointment_type.toLowerCase().replace(/ /g,"_"), location:form.location, notes:form.notes, status:"requested" });
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

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <Toast message={toast}/>

      <PageHeader
        icon="📅" label="Appointments"
        title="Your Appointments"
        subtitle="View upcoming visits and request new appointments"
        gradient={`linear-gradient(135deg,${T.accent}15,${T.teal}10)`}
        action={<Btn onClick={()=>setShowForm(true)}>+ Request Appointment</Btn>}
      />

      {/* Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:24, padding:"2rem", maxWidth:480, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <div>
                <h2 style={{ fontSize:"1.2rem", fontWeight:700, color:T.text, margin:0 }}>Request an Appointment</h2>
                <p style={{ fontSize:12, color:T.muted, margin:"3px 0 0" }}>We'll confirm within 1 business day</p>
              </div>
              <button onClick={()=>setShowForm(false)} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:32, height:32, fontSize:16, cursor:"pointer", color:T.muted }}>✕</button>
            </div>
            <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Input label="Appointment Type" value={form.appointment_type} onChange={v=>setForm(f=>({...f,appointment_type:v}))} options={TYPES} required/>
              <Input label="Preferred Location" value={form.location} onChange={v=>setForm(f=>({...f,location:v}))} options={LOCATIONS}/>
              <Input label="Notes (optional)" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Any specific concerns or requests…" rows={3}/>
              <Alert type="info" icon="ℹ️" title="For urgent needs, call (508) 306-1128 directly."/>
              <div style={{ display:"flex", gap:10 }}>
                <Btn type="submit" disabled={submitting} style={{ flex:1, justifyContent:"center" }}>{submitting?"Sending…":"Submit Request"}</Btn>
                <Btn variant="secondary" onClick={()=>setShowForm(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <SectionDivider label="Upcoming" color={T.accent}/>
      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : upcoming.length===0 ? (
        <EmptyState icon="📅" title="No upcoming appointments" subtitle="Request an appointment above or call us at (508) 306-1128."
          action={<Btn onClick={()=>setShowForm(true)}>Request Appointment</Btn>}/>
      ) : upcoming.map(a=>(
        <Card key={a.id} style={{ marginBottom:"0.75rem" }} accent={a.status==="requested"?T.gold:T.green}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:6 }}>{a.appointment_type?.replace(/_/g," ")||"Appointment"}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:12, color:T.muted }}>📅 {fmt(a.scheduled_at)}</span>
                <span style={{ fontSize:12, color:T.muted }}>📍 {a.location||"Location TBD"}</span>
                <span style={{ fontSize:12, color:T.muted }}>👨‍⚕️ {a.provider_name}</span>
                {a.notes&&<span style={{ fontSize:11, color:T.muted2, fontStyle:"italic", marginTop:2 }}>"{a.notes}"</span>}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
              <Badge status={a.status}/>
              {a.status==="upcoming"&&<Btn variant="danger" small onClick={()=>handleCancel(a.id)}>Cancel</Btn>}
            </div>
          </div>
        </Card>
      ))}

      {/* Past */}
      {past.length>0&&(
        <>
          <SectionDivider label="Past Appointments" color={T.muted}/>
          {past.map(a=>(
            <Card key={a.id} style={{ marginBottom:"0.75rem", opacity:0.7 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{a.appointment_type?.replace(/_/g," ")||"Appointment"}</div>
                  <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>📅 {fmt(a.scheduled_at)} · {a.location||"—"}</div>
                </div>
                <Badge status={a.status}/>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
