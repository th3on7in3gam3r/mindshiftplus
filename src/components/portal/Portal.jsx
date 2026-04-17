import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PortalDashboard from "./PortalDashboard";
import PortalAppointments from "./PortalAppointments";
import PortalMessages from "./PortalMessages";
import PortalDocuments from "./PortalDocuments";
import PortalPrescriptions from "./PortalPrescriptions";
import PortalVisitNotes from "./PortalVisitNotes";
import PortalProfile from "./PortalProfile";
import PortalJournal from "./PortalJournal";
import PortalIntake from "./PortalIntake";
import { getMyIntake } from "../../lib/intakeDb";

// ── Inline auth screen — stays on portal, no redirect ─────────────────────────
function PortalAuthScreen({ onBack }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const inp = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:"1.5px solid #e5e7eb", fontSize:14, color:"#1a1f36",
    background:"#fff", outline:"none", fontFamily:"inherit",
  };
  const focus = (e) => { e.target.style.borderColor="#4a6cf7"; e.target.style.boxShadow="0 0 0 3px rgba(74,108,247,0.1)"; };
  const blur  = (e) => { e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; };

  const handleSignIn = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message.includes("Invalid") ? "Incorrect email or password." : err.message);
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
    const { error: err } = await supabase.auth.signUp({ email, password, options:{ data:{ full_name: name.trim() } } });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f7f8fc", display:"flex", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      {/* Left branding panel */}
      <div style={{ width:"42%", background:"linear-gradient(160deg,#1e2a4a 0%,#2d3f6e 50%,#1a3a5c 100%)", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"3rem", position:"relative", overflow:"hidden" }} className="portal-auth-panel">
        {/* Background orbs */}
        <div style={{ position:"absolute", top:"-15%", right:"-15%", width:320, height:320, borderRadius:"50%", background:"rgba(74,108,247,0.18)", filter:"blur(60px)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"-10%", left:"-10%", width:260, height:260, borderRadius:"50%", background:"rgba(14,165,160,0.14)", filter:"blur(50px)", pointerEvents:"none" }}/>

        {/* Logo */}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"2.5rem" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🏥</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", lineHeight:1.2 }}>MindShift Wellness Clinic</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.2 }}>Patient Portal</div>
            </div>
          </div>

          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(1.8rem,3vw,2.6rem)", fontWeight:300, color:"#fff", lineHeight:1.15, marginBottom:"1rem", letterSpacing:"-0.02em" }}>
            Your care,<br/><em style={{ fontStyle:"italic", color:"rgba(107,138,249,0.95)" }}>at your fingertips.</em>
          </h2>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.75, marginBottom:"2rem" }}>
            Securely manage your health journey — appointments, messages, records, and more.
          </p>

          {/* Feature list */}
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:"2rem" }}>
            {[
              ["📅","Appointments","View, book & manage visits"],
              ["💬","Secure Messaging","Contact your care team directly"],
              ["📄","Documents & Forms","Access records & intake forms"],
              ["💊","Prescriptions","View medications & refill status"],
              ["📋","Visit Notes","Review notes from your clinician"],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)", lineHeight:1.2 }}>{title}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.4 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Accepting badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"5px 12px", marginBottom:"1.5rem" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block" }}/>
            <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)", letterSpacing:"0.05em" }}>Now accepting new patients</span>
          </div>
        </div>

        {/* Bottom contact */}
        <div style={{ position:"relative", zIndex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"1rem 1.2rem" }}>
          <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Need help?</div>
          <a href="tel:5083061128" style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"rgba(255,255,255,0.7)", textDecoration:"none", marginBottom:5 }}>📞 (508) 306-1128</a>
          <a href="mailto:info@mindshiftwellnessclinic.org" style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,0.45)", textDecoration:"none" }}>✉️ info@mindshiftwellnessclinic.org</a>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"3rem 2rem" }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          {onBack && <button onClick={onBack} style={{ background:"transparent", border:"none", color:"#6b7280", fontSize:13, cursor:"pointer", marginBottom:"2rem", padding:0, display:"flex", alignItems:"center", gap:5 }}>← Back to clinic site</button>}

          {sent ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:"1rem" }}>📬</div>
              <h2 style={{ fontSize:"1.3rem", fontWeight:700, color:"#1a1f36", marginBottom:8 }}>Check your email</h2>
              <p style={{ fontSize:14, color:"#6b7280", lineHeight:1.7, marginBottom:"1.5rem" }}>We sent a link to <strong>{email}</strong>.</p>
              <button onClick={()=>{ setSent(false); setMode("signin"); }} style={{ background:"transparent", border:"none", color:"#4a6cf7", fontSize:14, cursor:"pointer" }}>← Back to sign in</button>
            </div>
          ) : mode === "signin" ? (
            <>
              <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#1a1f36", marginBottom:6 }}>Welcome back</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:"1.5rem" }}>Sign in to your patient portal</p>
              {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 }}>{error}</div>}
              <form onSubmit={handleSignIn} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div><label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required style={inp} onFocus={focus} onBlur={blur}/></div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:"#374151" }}>Password</label>
                    <button type="button" onClick={()=>{ setError(""); setMode("forgot"); }} style={{ background:"transparent", border:"none", color:"#4a6cf7", fontSize:12, cursor:"pointer", padding:0 }}>Forgot?</button>
                  </div>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={inp} onFocus={focus} onBlur={blur}/>
                </div>
                <button type="submit" disabled={loading} style={{ background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none", borderRadius:10, padding:"13px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:loading?0.7:1 }}>{loading?"Signing in…":"Sign In to Portal"}</button>
              </form>
              <p style={{ textAlign:"center", marginTop:"1.2rem", fontSize:13, color:"#6b7280" }}>New patient? <button onClick={()=>{ setError(""); setMode("signup"); }} style={{ background:"transparent", border:"none", color:"#4a6cf7", fontSize:13, cursor:"pointer", fontWeight:600 }}>Create account</button></p>
            </>
          ) : mode === "signup" ? (
            <>
              <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#1a1f36", marginBottom:6 }}>Create your account</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:"1.5rem" }}>Join as a patient of MindShift Wellness Clinic</p>
              {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 }}>{error}</div>}
              <form onSubmit={handleSignUp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div><label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required style={inp} onFocus={focus} onBlur={blur}/></div>
                <div><label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required style={inp} onFocus={focus} onBlur={blur}/></div>
                <div><label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} style={inp} onFocus={focus} onBlur={blur}/></div>
                <button type="submit" disabled={loading} style={{ background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none", borderRadius:10, padding:"13px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:loading?0.7:1 }}>{loading?"Creating…":"Create Account"}</button>
              </form>
              <p style={{ textAlign:"center", marginTop:"1.2rem", fontSize:13, color:"#6b7280" }}>Already have an account? <button onClick={()=>{ setError(""); setMode("signin"); }} style={{ background:"transparent", border:"none", color:"#4a6cf7", fontSize:13, cursor:"pointer", fontWeight:600 }}>Sign in</button></p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#1a1f36", marginBottom:6 }}>Reset password</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:"1.5rem" }}>We'll send a reset link to your email</p>
              {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 }}>{error}</div>}
              <form onSubmit={handleForgot} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div><label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required style={inp} onFocus={focus} onBlur={blur}/></div>
                <button type="submit" disabled={loading} style={{ background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none", borderRadius:10, padding:"13px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:loading?0.7:1 }}>{loading?"Sending…":"Send Reset Link"}</button>
              </form>
              <p style={{ textAlign:"center", marginTop:"1.2rem" }}><button onClick={()=>{ setError(""); setMode("signin"); }} style={{ background:"transparent", border:"none", color:"#4a6cf7", fontSize:13, cursor:"pointer" }}>← Back to sign in</button></p>
            </>
          )}

          <div style={{ marginTop:"1.5rem", padding:"0.9rem 1rem", background:"rgba(74,108,247,0.05)", border:"1px solid rgba(74,108,247,0.12)", borderRadius:10, display:"flex", gap:8 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>🔒</span>
            <p style={{ fontSize:11, color:"#6b7280", lineHeight:1.6, margin:0 }}>Secure, encrypted connection. Your health information is protected in accordance with HIPAA privacy standards.</p>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:767px){ .portal-auth-panel{ display:none !important } }`}</style>
    </div>
  );
}

const P = {
  bg:"#f7f8fc", bg2:"#ffffff", bg3:"#eef0f7",
  sidebar:"#1e2a4a", sidebarActive:"#3b4f82",
  accent:"#4a6cf7", teal:"#0ea5a0",
  text:"#1a1f36", muted:"#6b7280", muted2:"#9ca3af",
  border:"#e5e7eb",
};

const NAV = [
  { id:"dashboard",     icon:"🏠", label:"Dashboard" },
  { id:"intake",        icon:"📋", label:"Patient Intake", highlight: true },
  { id:"appointments",  icon:"📅", label:"Appointments" },
  { id:"messages",      icon:"💬", label:"Messages" },
  { id:"journal",       icon:"📓", label:"My Journal" },
  { id:"documents",     icon:"📄", label:"Documents" },
  { id:"prescriptions", icon:"💊", label:"Medications" },
  { id:"visit-notes",   icon:"📋", label:"Visit Notes" },
  { id:"profile",       icon:"👤", label:"My Profile" },
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
  const [session, setSession] = useState(undefined);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intakeStatus, setIntakeStatus] = useState(null);
  const [userId, setUserId] = useState(null);

  // Auth session — always runs
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUserId(s?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load intake status — always runs, guards internally
  useEffect(() => {
    if (!userId) return;
    getMyIntake(userId).then(({ data }) => {
      setIntakeStatus(data?.status ?? "none");
    });
  }, [userId]);

  // Loading
  if (session === undefined) return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 12px" }}>🏥</div>
        <div style={{ fontSize:13, color:P.muted }}>Loading portal…</div>
      </div>
    </div>
  );

  // Not logged in
  if (!session) return <PortalAuthScreen onBack={onExit}/>;

  const user = session.user;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";
  const intakeComplete = intakeStatus === "pending" || intakeStatus === "reviewed" || intakeStatus === "chart_created";

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
            const showBadge = n.id === "intake" && !intakeComplete;
            return (
              <button key={n.id} className="pnav-btn" onClick={()=>{ setPage(n.id); setSidebarOpen(false); }} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10,
                background: active ? P.sidebarActive : showBadge ? "rgba(74,108,247,0.12)" : "transparent",
                border: showBadge && !active ? "1px solid rgba(74,108,247,0.25)" : "none",
                color: active ? "#fff" : showBadge ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                fontSize:13.5, fontWeight: active || showBadge ? 600 : 400,
                cursor:"pointer", textAlign:"left", width:"100%",
                borderLeft: active ? `3px solid ${P.accent}` : showBadge ? `3px solid ${P.accent}` : "3px solid transparent",
                transition:"all .15s",
              }}>
                <span style={{ fontSize:16, width:20, textAlign:"center" }}>{n.icon}</span>
                {n.label}
                {showBadge && (
                  <span style={{ marginLeft:"auto", background:P.accent, color:"#fff", fontSize:10, fontWeight:700, borderRadius:20, padding:"2px 7px" }}>
                    Action Required
                  </span>
                )}
                {n.id === "intake" && intakeComplete && (
                  <span style={{ marginLeft:"auto", fontSize:13 }}>✓</span>
                )}
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
          {/* HIPAA Disclaimer Banner — always visible */}
          <div style={{
            background:"#fffbeb", borderBottom:"1px solid #fde68a",
            padding:"8px 1.5rem", display:"flex", alignItems:"flex-start",
            gap:8, fontSize:12, color:"#92400e", lineHeight:1.6,
          }}>
            <span style={{ flexShrink:0, fontSize:14 }}>⚠️</span>
            <span>
              <strong>Important:</strong> This portal is not monitored in real time. It is not for emergencies.
              If you are experiencing a crisis or emergency, call <strong>911</strong> or the{" "}
              <strong>988 Suicide &amp; Crisis Lifeline (call or text 988)</strong>.
              Portal content is reviewed only during scheduled appointments.
              Use of this portal does not establish a provider-patient relationship on its own.
            </span>
          </div>
          {/* Intake banner — shown until intake is submitted */}
          {!intakeComplete && page === "dashboard" && (
            <div style={{
              margin:"1rem 1.5rem 0",
              background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)",
              borderRadius:16, padding:"1rem 1.4rem",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:12, flexWrap:"wrap",
              boxShadow:"0 4px 20px rgba(74,108,247,0.3)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:26 }}>📋</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Complete Your Patient Intake</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:2 }}>Required before your first appointment. Takes about 5–10 minutes.</div>
                </div>
              </div>
              <button onClick={() => setPage("intake")} style={{
                background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.35)",
                borderRadius:10, padding:"9px 18px", color:"#fff", fontSize:13,
                fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                backdropFilter:"blur(8px)",
              }}>Start Intake →</button>
            </div>
          )}
          {page==="dashboard"     && <PortalDashboard user={user} displayName={displayName} setPage={setPage} P={P}/>}
          {page==="intake"        && <PortalIntake userId={user?.id} displayName={displayName} onComplete={() => { setIntakeStatus("pending"); setPage("dashboard"); }} />}
          {page==="appointments"  && <PortalAppointments userId={user?.id} P={P}/>}
          {page==="messages"      && <PortalMessages userId={user?.id} P={P}/>}
          {page==="journal"       && <PortalJournal userId={user?.id} P={P}/>}
          {page==="documents"     && <PortalDocuments userId={user?.id} P={P}/>}
          {page==="prescriptions" && <PortalPrescriptions userId={user?.id} P={P}/>}
          {page==="visit-notes"   && <PortalVisitNotes userId={user?.id} P={P}/>}
          {page==="profile"       && <PortalProfile userId={user?.id} displayName={displayName} P={P}/>}
        </div>

        {/* Footer */}
        <div style={{ padding:"1rem 1.5rem", borderTop:`1px solid ${P.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, background:P.bg2 }}>
          <span style={{ fontSize:11, color:P.muted2 }}>© 2026 MindShift Wellness Clinic · Secure Patient Portal</span>
          <div style={{ display:"flex", gap:"1rem" }}>
            <a href="tel:5083061128" style={{ fontSize:11, color:P.muted, textDecoration:"none" }}>📞 (508) 306-1128</a>
            <a href="mailto:info@mindshiftwellnessclinic.org" style={{ fontSize:11, color:P.muted, textDecoration:"none" }}>✉️ Email Us</a>
          </div>
        </div>
      </main>
    </div>
  );
}
