import { useState, useEffect } from "react";
import { getAppointments, getMessages } from "../../lib/clinicApi";

function Card({ children, style={}, onClick }) {
  return (
    <div className="portal-card" onClick={onClick} style={{
      background:"#fff", border:"1px solid #e5e7eb", borderRadius:16,
      padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>{children}</div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <Card style={{ textAlign:"center", padding:"1.2rem" }}>
      <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:"1.6rem", fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>{label}</div>
    </Card>
  );
}

export default function PortalDashboard({ user, displayName, setPage, P }) {
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "Date TBD";

  return (
    <div style={{ padding:"2rem", maxWidth:960, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:"1.8rem" }}>
        <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Patient Dashboard</div>
        <h1 style={{ fontSize:"clamp(1.4rem,3vw,1.9rem)", fontWeight:700, color:P.text }}>{greeting}, {displayName} 👋</h1>
        <p style={{ fontSize:14, color:P.muted, marginTop:4 }}>Here's an overview of your care at MindShift Wellness Clinic.</p>
      </div>

      {/* Unread alert */}
      {unread.length > 0 && (
        <div onClick={()=>setPage("messages")} style={{
          background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12,
          padding:"0.9rem 1.2rem", marginBottom:"1.2rem",
          display:"flex", alignItems:"center", gap:10, cursor:"pointer",
        }}>
          <span style={{ fontSize:18 }}>💬</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1d4ed8" }}>
              {unread.length} unread message{unread.length>1?"s":""} from the clinic
            </div>
            <div style={{ fontSize:11, color:"#3b82f6" }}>Click to view</div>
          </div>
          <span style={{ color:"#3b82f6", fontSize:18 }}>›</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"0.9rem", marginBottom:"1.5rem" }}>
        <StatCard icon="📅" value={upcoming.length} label="Upcoming appts" color={P.accent}/>
        <StatCard icon="💬" value={unread.length} label="Unread messages" color={P.teal}/>
        <StatCard icon="📄" value={appointments.filter(a=>a.status==="completed").length} label="Past visits" color={P.muted}/>
      </div>

      {/* Next appointment */}
      <Card style={{ marginBottom:"1.2rem", background:"linear-gradient(135deg,#eff6ff,#f0fdfa)", border:"1px solid #bfdbfe" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.accent, marginBottom:10 }}>Next Appointment</div>
        {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
        : upcoming.length > 0 ? (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:P.text }}>{upcoming[0].appointment_type?.replace(/_/g," ") || "Appointment"}</div>
              <div style={{ color:P.muted, fontSize:13, marginTop:4 }}>📅 {fmt(upcoming[0].scheduled_at)}</div>
              <div style={{ color:P.muted, fontSize:13, marginTop:2 }}>📍 {upcoming[0].location || "Location TBD"}</div>
              <div style={{ color:P.muted, fontSize:13, marginTop:2 }}>👨‍⚕️ {upcoming[0].provider_name}</div>
            </div>
            <span style={{
              background: upcoming[0].status==="requested" ? "#fef9c3" : "#dcfce7",
              color: upcoming[0].status==="requested" ? "#854d0e" : "#166534",
              fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:99,
            }}>{upcoming[0].status}</span>
          </div>
        ) : (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div style={{ color:P.muted, fontSize:13 }}>No upcoming appointments scheduled.</div>
            <button onClick={()=>setPage("appointments")} style={{
              background:P.accent, border:"none", borderRadius:20, padding:"7px 16px",
              color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
            }}>Book Now</button>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.9rem", marginBottom:"1.5rem" }}>
        {[
          { icon:"📅", label:"Appointments", sub:"View & book", color:P.accent, page:"appointments" },
          { icon:"💬", label:"Messages",     sub:"Contact clinic", color:P.teal,   page:"messages" },
          { icon:"📄", label:"Documents",    sub:"Forms & records", color:P.gold,  page:"documents" },
          { icon:"👤", label:"My Profile",   sub:"Update info", color:"#8b5cf6",   page:"profile" },
        ].map(a => (
          <Card key={a.label} onClick={()=>setPage(a.page)} style={{ cursor:"pointer", padding:"1.2rem", textAlign:"center" }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{a.icon}</div>
            <div style={{ fontWeight:600, fontSize:13, color:P.text }}>{a.label}</div>
            <div style={{ fontSize:11, color:P.muted, marginTop:2 }}>{a.sub}</div>
          </Card>
        ))}
      </div>

      {/* Recent messages */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontWeight:600, fontSize:14, color:P.text }}>Recent Messages</div>
          <button onClick={()=>setPage("messages")} style={{ background:"transparent", border:"none", color:P.accent, fontSize:12, cursor:"pointer", fontWeight:500 }}>View all →</button>
        </div>
        {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
        : messages.length === 0 ? (
          <div style={{ color:P.muted, fontSize:13, padding:"0.5rem 0" }}>No messages yet. Send us a message anytime.</div>
        ) : messages.slice(0,3).map(m => (
          <div key={m.id} onClick={()=>setPage("messages")} style={{
            display:"flex", gap:10, padding:"0.75rem 0",
            borderBottom:`1px solid ${P.border}`, cursor:"pointer", alignItems:"flex-start",
          }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{m.sender_role==="clinic" ? "🏥" : "👤"}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight: m.read ? 400 : 600, color:P.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.subject || "Message"}</div>
              <div style={{ fontSize:11, color:P.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.body}</div>
            </div>
            {!m.read && m.sender_role==="clinic" && <span style={{ width:8, height:8, borderRadius:"50%", background:P.accent, flexShrink:0, marginTop:4 }}/>}
          </div>
        ))}
      </Card>

      {/* MindShift+ banner */}
      <Card style={{ marginTop:"1.2rem", background:"linear-gradient(135deg,#f5f3ff,#eff6ff)", border:"1px solid #ddd6fe" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#5b21b6", marginBottom:3 }}>◎ MindShift+ Wellness App</div>
            <div style={{ fontSize:12, color:"#7c3aed" }}>Support your mental wellness between appointments.</div>
          </div>
          <button onClick={()=>window.open("/","_blank")} style={{ background:"#7c3aed", border:"none", borderRadius:20, padding:"8px 18px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Open App ↗</button>
        </div>
      </Card>
    </div>
  );
}
