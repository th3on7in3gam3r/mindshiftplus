import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PortalLogin from "./PortalLogin";
import PortalDashboard from "./PortalDashboard";
import PortalAppointments from "./PortalAppointments";
import PortalMessages from "./PortalMessages";
import PortalDocuments from "./PortalDocuments";
import PortalProfile from "./PortalProfile";

const P = {
  bg:"#f7f8fc", bg2:"#ffffff", bg3:"#eef0f7",
  sidebar:"#1e2a4a", sidebarActive:"#3b4f82",
  accent:"#4a6cf7", teal:"#0ea5a0",
  text:"#1a1f36", muted:"#6b7280", muted2:"#9ca3af",
  border:"#e5e7eb",
};

const NAV = [
  { id:"dashboard",    icon:"🏠", label:"Dashboard" },
  { id:"appointments", icon:"📅", label:"Appointments" },
  { id:"messages",     icon:"💬", label:"Messages" },
  { id:"documents",    icon:"📄", label:"Documents" },
  { id:"profile",      icon:"👤", label:"My Profile" },
];

function Avatar({ name="P", size=36 }) {
  const initials = name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  );
}

export default function Portal({ onExit }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Portal has its own independent auth session check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Loading
  if (session === undefined) return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 12px" }}>🏥</div>
        <div style={{ fontSize:13, color:P.muted }}>Loading portal…</div>
      </div>
    </div>
  );

  // Not logged in — show portal login
  if (!session) return <PortalLogin onBack={onExit}/>;

  const user = session.user;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:P.bg, fontFamily:"'Inter','DM Sans',system-ui,sans-serif", color:P.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .pnav-btn:hover{background:rgba(255,255,255,0.08) !important}
        @media(max-width:767px){
          .p-sidebar{transform:translateX(-100%) !important}
          .p-sidebar.open{transform:translateX(0) !important}
          .p-overlay.open{display:block !important}
          .p-main{margin-left:0 !important}
          .p-topbar{display:flex !important}
        }
        @media(min-width:768px){
          .p-sidebar{transform:translateX(0) !important}
          .p-topbar{display:none !important}
        }
      `}</style>

      {/* Mobile overlay */}
      <div className={`p-overlay${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}
        style={{ display:"none", position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:199 }}/>

      {/* Sidebar */}
      <aside className={`p-sidebar${sidebarOpen?" open":""}`} style={{
        width:260, background:P.sidebar, display:"flex", flexDirection:"column",
        position:"fixed", top:0, left:0, height:"100vh", zIndex:200,
        transition:"transform .28s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Logo */}
        <div style={{ padding:"1.4rem 1.4rem 1.2rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏥</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff", lineHeight:1.2 }}>MindShift Wellness</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.2 }}>Patient Portal</div>
            </div>
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(74,108,247,0.2)", border:"1px solid rgba(74,108,247,0.3)", borderRadius:20, padding:"3px 10px" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }}/>
            <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.65)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Secure Session</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"1rem 0.8rem", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} className="pnav-btn" onClick={()=>{ setPage(n.id); setSidebarOpen(false); }} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10,
                background: active ? P.sidebarActive : "transparent", border:"none",
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                fontSize:13.5, fontWeight: active ? 600 : 400,
                cursor:"pointer", textAlign:"left", width:"100%",
                borderLeft: active ? `3px solid ${P.accent}` : "3px solid transparent",
                transition:"all .15s",
              }}>
                <span style={{ fontSize:16, width:20, textAlign:"center" }}>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
          <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"8px 0" }}/>
          <button className="pnav-btn" onClick={()=>window.open("/","_blank")} style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10,
            background:"transparent", border:"none", color:"rgba(255,255,255,0.4)",
            fontSize:13.5, cursor:"pointer", textAlign:"left", width:"100%",
            borderLeft:"3px solid transparent",
          }}>
            <span style={{ fontSize:16, width:20, textAlign:"center" }}>◎</span>
            MindShift+ App
            <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.25)" }}>↗</span>
          </button>
        </nav>

        {/* User footer */}
        <div style={{ padding:"1rem 1.2rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <Avatar name={displayName} size={34}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayName}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{
            width:"100%", padding:"8px", borderRadius:8,
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            color:"rgba(255,255,255,0.45)", fontSize:12, cursor:"pointer",
          }}
          onMouseOver={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color="#fff"; }}
          onMouseOut={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.45)"; }}
          >Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="p-main" style={{ flex:1, marginLeft:260, minHeight:"100vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Mobile topbar */}
        <div className="p-topbar" style={{
          display:"none", alignItems:"center", justifyContent:"space-between",
          padding:"0.9rem 1.2rem", background:P.bg2,
          borderBottom:`1px solid ${P.border}`,
          position:"sticky", top:0, zIndex:100,
          boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <button onClick={()=>setSidebarOpen(true)} style={{ background:"transparent", border:"none", fontSize:22, cursor:"pointer", color:P.text, padding:4 }}>☰</button>
          <div style={{ fontSize:14, fontWeight:700, color:P.text }}>Patient Portal</div>
          <Avatar name={displayName} size={30}/>
        </div>

        {/* Pages */}
        <div style={{ flex:1 }}>
          {page==="dashboard"    && <PortalDashboard user={user} displayName={displayName} setPage={setPage} P={P}/>}
          {page==="appointments" && <PortalAppointments userId={user?.id} P={P}/>}
          {page==="messages"     && <PortalMessages userId={user?.id} P={P}/>}
          {page==="documents"    && <PortalDocuments userId={user?.id} P={P}/>}
          {page==="profile"      && <PortalProfile userId={user?.id} displayName={displayName} P={P}/>}
        </div>

        {/* Footer */}
        <div style={{ padding:"1rem 1.5rem", borderTop:`1px solid ${P.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, background:P.bg2 }}>
          <span style={{ fontSize:11, color:P.muted2 }}>© 2026 MindShift Wellness Clinic · Secure Patient Portal</span>
          <div style={{ display:"flex", gap:"1rem" }}>
            <a href="tel:5086191044" style={{ fontSize:11, color:P.muted, textDecoration:"none" }}>📞 (508) 619-1044</a>
            <a href="mailto:info@mindshiftwellnessclinic.org" style={{ fontSize:11, color:P.muted, textDecoration:"none" }}>✉️ Email Us</a>
          </div>
        </div>
      </main>
    </div>
  );
}
