import { useState, useEffect } from "react";
import { getAppointments, getMessages } from "../../lib/clinicApi";
import { Card, Alert, EmptyState, SectionDivider, Badge, T } from "./PortalUI";

export default function PortalDashboard({ user, displayName, setPage, P }) {
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingIcon = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

  useEffect(() => {
    if (!user?.id) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString();
    const to   = new Date(now.getFullYear(), now.getMonth()+3, 0).toISOString();
    Promise.all([
      getAppointments(from, to, user.id).catch(()=>[]),
      getMessages(user.id).catch(()=>[]),
    ]).then(([appts, msgs]) => {
      setAppointments(Array.isArray(appts) ? appts : []);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setLoading(false);
    });
  }, [user?.id]);

  const upcoming = appointments.filter(a => ["upcoming","requested"].includes(a.status));
  const unread = messages.filter(m => !m.read && m.sender_role === "clinic");
  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "TBD";

  return (
    <div style={{ padding:"2rem", maxWidth:960, margin:"0 auto" }}>

      {/* Hero greeting */}
      <div style={{
        background:`linear-gradient(135deg,${T.accent},${T.teal})`,
        borderRadius:24, padding:"2rem 2.5rem", marginBottom:"1.5rem",
        color:"#fff", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
        <div style={{ position:"absolute", bottom:-30, right:60, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:28, marginBottom:6 }}>{greetingIcon}</div>
          <h1 style={{ fontSize:"clamp(1.3rem,3vw,1.8rem)", fontWeight:700, margin:"0 0 4px", color:"#fff" }}>{greeting}, {displayName}</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.75)", margin:0 }}>Welcome to your MindShift Wellness Clinic patient portal.</p>
        </div>
      </div>

      {/* Unread alert */}
      {unread.length > 0 && (
        <Alert type="info" icon="💬" title={`${unread.length} unread message${unread.length>1?"s":""} from the clinic`} subtitle="Tap to view your messages" onClick={()=>setPage("messages")}/>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"0.9rem", marginBottom:"1.5rem" }}>
        {[
          { icon:"📅", val:upcoming.length, label:"Upcoming", color:T.accent, page:"appointments" },
          { icon:"💬", val:unread.length,   label:"Unread",   color:T.teal,   page:"messages" },
          { icon:"✅", val:appointments.filter(a=>a.status==="completed").length, label:"Completed", color:"#22c55e", page:"appointments" },
        ].map(s=>(
          <Card key={s.label} onClick={()=>setPage(s.page)} style={{ textAlign:"center", padding:"1.2rem", cursor:"pointer" }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:"1.8rem", fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:4, fontWeight:500 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Next appointment */}
      <Card style={{ marginBottom:"1.2rem", background:`linear-gradient(135deg,${T.cream},#f0fdfa)`, border:`1px solid ${T.accent}20` }}>
        <SectionDivider label="Next Appointment" color={T.accent}/>
        {loading ? <div style={{color:T.muted,fontSize:13}}>Loading…</div>
        : upcoming.length > 0 ? (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:4 }}>{upcoming[0].appointment_type?.replace(/_/g," ")||"Appointment"}</div>
              <div style={{ color:T.muted, fontSize:13 }}>📅 {fmt(upcoming[0].scheduled_at)}</div>
              <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>📍 {upcoming[0].location||"TBD"}</div>
              <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>👨‍⚕️ {upcoming[0].provider_name}</div>
            </div>
            <Badge status={upcoming[0].status}/>
          </div>
        ) : (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div style={{ color:T.muted, fontSize:13 }}>No upcoming appointments scheduled.</div>
            <button onClick={()=>setPage("appointments")} style={{ background:`linear-gradient(135deg,${T.accent},${T.teal})`, border:"none", borderRadius:20, padding:"8px 18px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Book Now →</button>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <SectionDivider label="Quick Actions" color={T.teal}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.9rem", marginBottom:"1.5rem" }}>
        {[
          { icon:"📅", label:"Appointments", sub:"View & book", color:T.accent,  page:"appointments" },
          { icon:"💬", label:"Messages",     sub:"Contact clinic", color:T.teal,  page:"messages" },
          { icon:"📄", label:"Documents",    sub:"Forms & records", color:T.gold, page:"documents" },
          { icon:"💊", label:"Prescriptions",sub:"Your medications", color:"#8b5cf6", page:"prescriptions" },
          { icon:"📋", label:"Visit Notes",  sub:"Clinician notes", color:"#0ea5a0", page:"visit-notes" },
          { icon:"👤", label:"My Profile",   sub:"Update info", color:T.rose,    page:"profile" },
        ].map(a=>(
          <Card key={a.label} onClick={()=>setPage(a.page)} style={{ cursor:"pointer", padding:"1.2rem", textAlign:"center" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${a.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, margin:"0 auto 8px" }}>{a.icon}</div>
            <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{a.label}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{a.sub}</div>
          </Card>
        ))}
      </div>

      {/* Recent messages */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <SectionDivider label="Recent Messages" color={T.accent}/>
          <button onClick={()=>setPage("messages")} style={{ background:"transparent", border:"none", color:T.accent, fontSize:12, cursor:"pointer", fontWeight:500, flexShrink:0 }}>View all →</button>
        </div>
        {loading ? <div style={{color:T.muted,fontSize:13}}>Loading…</div>
        : messages.length === 0 ? (
          <div style={{ color:T.muted, fontSize:13, padding:"0.5rem 0" }}>No messages yet. Send us a message anytime.</div>
        ) : messages.slice(0,3).map(m=>(
          <div key={m.id} onClick={()=>setPage("messages")} style={{ display:"flex", gap:10, padding:"0.75rem 0", borderBottom:`1px solid ${T.border}`, cursor:"pointer", alignItems:"flex-start" }}>
            <div style={{ width:32, height:32, borderRadius:10, background:m.sender_role==="clinic"?`${T.teal}15`:`${T.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
              {m.sender_role==="clinic"?"🏥":"👤"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:m.read?400:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.subject||"Message"}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.body}</div>
            </div>
            {!m.read&&m.sender_role==="clinic"&&<span style={{ width:8, height:8, borderRadius:"50%", background:T.accent, flexShrink:0, marginTop:4 }}/>}
          </div>
        ))}
      </Card>

      {/* MindShift+ banner */}
      <Card style={{ marginTop:"1.2rem", background:`linear-gradient(135deg,#f5f3ff,#eff6ff)`, border:`1px solid #ddd6fe` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#4a6cf7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>◎</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:"#5b21b6" }}>MindShift+ Wellness App</div>
              <div style={{ fontSize:12, color:"#7c3aed", marginTop:2 }}>Support your mental wellness between appointments.</div>
            </div>
          </div>
          <button onClick={()=>window.open("/","_blank")} style={{ background:"#7c3aed", border:"none", borderRadius:20, padding:"8px 18px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Open App ↗</button>
        </div>
      </Card>
    </div>
  );
}
