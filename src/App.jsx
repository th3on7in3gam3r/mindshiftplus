import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./lib/AuthContext";
import AuthModal from "./components/AuthModal";
import Portal from "./components/portal/Portal";
import PublicBooking from "./components/scheduling/PublicBooking";
import AdminSchedule from "./components/scheduling/AdminSchedule";
import DisclaimerModal, { hasAcceptedDisclaimer } from "./components/DisclaimerModal";
import CrisisModal from "./components/CrisisModal";
import EHR from "./components/ehr/EHR";
import AIScribe from "./components/AIScribe";
import StaffDocs from "./components/clinical/StaffDocs";
import { STAFF_ASSISTANT_NAME } from "./lib/staffAssistant";
import {
  fetchClinicPatientContext,
  getHomeModePreference,
  setHomeModePreference,
  resolveHomeMode,
  openPortalPage,
} from "./lib/patientMode";

// ── Fonts ──────────────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --navy:#0a0e1a;--midnight:#0d1228;--indigo:#131b3a;--card:#161e3f;
      --card2:#1a2247;--glass:rgba(255,255,255,0.04);--glass2:rgba(255,255,255,0.07);
      --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.14);
      --purple:#6b5fcf;--lavender:#9d8ff0;--teal:#2a9d8f;--rose:#e07a8f;
      --gold:#c9a84c;--pearl:#f5f0ee;--cream:rgba(245,240,238,0.92);
      --white:#f0f0ff;--muted:rgba(240,240,255,0.55);
      --muted2:rgba(240,240,255,0.32);--success:#4ade80;
      --grad1:linear-gradient(135deg,#6b5fcf,#2a9d8f);
      --grad2:linear-gradient(135deg,#9d8ff0,#6b5fcf);
      --grad3:linear-gradient(135deg,#e07a8f,#6b5fcf);
      --font:'DM Sans',system-ui,sans-serif;--serif:'Cormorant Garamond',Georgia,serif;
    }
    body{
      background:linear-gradient(165deg,#0a0e1a 0%,#0f1428 45%,#12102a 100%);
      color:var(--white);font-family:var(--font);min-height:100vh;overflow-x:hidden;
    }
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
    button{cursor:pointer;font-family:var(--font)}
    input,textarea{font-family:var(--font)}

    /* ── DESKTOP: sidebar always visible ── */
    @media(min-width:768px){
      .sidebar{transform:translateX(0) !important;}
      .mobile-only{display:none !important;}
      .mobile-topbar{display:none !important;}
      .mobile-bottomnav{display:none !important;}
      .main-content.has-sidebar{margin-left:230px !important;}
    }

    /* ── MOBILE: sidebar is a drawer ── */
    @media(max-width:767px){
      .sidebar{transform:var(--sidebar-transform, translateX(-100%));}
      .main-content{margin-left:0 !important;}
      .main-content > div[style*="padding"]{padding-bottom:80px !important;}
      .main-content{overflow-x:hidden;}
    }
  `}</style>
);

// ── Helpers ────────────────────────────────────────────────────────────────────
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

// ── TOAST ──────────────────────────────────────────────────────────────────────
function Toast({message,type="info",onDone}){
  useEffect(()=>{
    const t=setTimeout(onDone,3000);
    return()=>clearTimeout(t);
  },[]);
  const colors={info:"var(--purple)",success:"var(--teal)",warn:"var(--gold)"};
  return(
    <div style={{
      position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",
      zIndex:9999,background:"rgba(13,18,40,0.97)",backdropFilter:"blur(16px)",
      border:`1px solid ${colors[type]}44`,borderRadius:30,
      padding:"10px 20px",fontSize:13,color:"var(--white)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.4)",whiteSpace:"nowrap",
      animation:"toastIn .25s ease",
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {message}
    </div>
  );
}

function useToast(){
  const [toast,setToast]=useState(null);
  const show=(message,type="info")=>setToast({message,type,key:Date.now()});
  const el=toast?<Toast key={toast.key} message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>:null;
  return{show,el};
}

function GlassCard({children,style={},className="",onClick}){
  return(
    <div onClick={onClick} className={className} style={{
      background:style.premium?"linear-gradient(135deg,rgba(124,111,247,0.15),rgba(78,205,196,0.1))":"var(--glass2)",
      border:`1px solid ${style.premium?"rgba(124,111,247,0.3)":"var(--border)"}`,
      borderRadius:20,backdropFilter:"blur(12px)",padding:"1.4rem",
      transition:"all .25s",cursor:onClick?"pointer":"default",
      ...style
    }}>{children}</div>
  );
}

function Badge({children,color="purple"}){
  const cols={purple:"rgba(124,111,247,0.2)",teal:"rgba(78,205,196,0.2)",rose:"rgba(240,147,160,0.2)",gold:"rgba(245,200,66,0.2)"};
  const txt={purple:"#a89cf5",teal:"#4ecdc4",rose:"#f093a0",gold:"#f5c842"};
  return<span style={{background:cols[color],color:txt[color],padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:500}}>{children}</span>
}

function Btn({children,variant="primary",onClick,style={},small=false}){
  const base={border:"none",borderRadius:30,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",transition:"all .2s",display:"inline-flex",alignItems:"center",gap:6,...style};
  const v={
    primary:{background:"var(--grad1)",color:"#fff",padding:small?"8px 18px":"12px 28px",fontSize:small?13:15},
    secondary:{background:"var(--glass2)",color:"var(--white)",border:"1px solid var(--border2)",padding:small?"8px 18px":"12px 28px",fontSize:small?13:15},
    ghost:{background:"transparent",color:"var(--lavender)",padding:small?"6px 14px":"10px 20px",fontSize:small?13:14},
    danger:{background:"rgba(240,147,160,0.2)",color:"var(--rose)",border:"1px solid rgba(240,147,160,0.3)",padding:"8px 18px",fontSize:13}
  };
  return<button onClick={onClick} style={{...base,...v[variant]}}>{children}</button>
}

function ProgressBar({value,color="var(--grad1)",height=6}){
  return(
    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:99,height,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${clamp(value,0,100)}%`,background:color,borderRadius:99,transition:"width .6s ease"}}/>
    </div>
  )
}

function Avatar({name="U",size=38}){
  const initials=name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  return<div style={{width:size,height:size,borderRadius:"50%",background:"var(--grad2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"#fff",flexShrink:0}}>{initials}</div>
}

// ── Nav ────────────────────────────────────────────────────────────────────────
// Hardcoded owner/super-admin emails — always have full access
const OWNER_EMAILS = ["info@mindshiftwellnessclinic.org", "jerlessm@gmail.com", "kmutegyeki@gmail.com"];

// Hook: checks if current user is a clinician (owner OR has clinician_roles row)
function useIsClinicianOrAdmin(user) {
  const [isClinician, setIsClinician] = useState(false);

  useEffect(() => {
    if (!user) { setIsClinician(false); return; }
    // Owners always have access
    if (OWNER_EMAILS.includes(user.email)) { setIsClinician(true); return; }
    // Check clinician_roles table for any other staff (PMHNP, therapist, etc.)
    import("./lib/supabase.js").then(({ supabase }) => {
      supabase
        .from("clinician_roles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setIsClinician(!!data));
    });
  }, [user?.id]);

  return isClinician;
}

const primaryNavItems = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "mia", icon: "💬", label: "Mia" },
  { id: "journal", icon: "📓", label: "Journal" },
  { id: "breathe", icon: "🌬️", label: "Breathe" },
  { id: "programs", icon: "📚", label: "Programs" },
  { id: "portal", icon: "🏥", label: "Patient Portal" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

const exploreNavItems = [
  { id: "constellation", icon: "✨", label: "Constellation" },
  { id: "dailyLight", icon: "☀️", label: "Daily Light" },
  { id: "insights", icon: "📊", label: "Insights" },
  { id: "premium", icon: "✦", label: "Premium", badge: "PRO" },
];

const clinicNavItems = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "portal", icon: "🏥", label: "Patient Portal", portalPage: "dashboard" },
  { id: "portal-messages", icon: "💬", label: "Messages", portalPage: "messages", badgeKey: "unread" },
  { id: "portal-appointments", icon: "📅", label: "Appointments", portalPage: "appointments" },
  { id: "portal-journal", icon: "📓", label: "Care journal", portalPage: "journal" },
  { id: "portal-documents", icon: "📄", label: "Documents", portalPage: "documents" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

function HomeModeToggle({ mode, onChange, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      display: "flex", gap: 4, background: "var(--glass2)", borderRadius: 10,
      padding: 3, marginBottom: "1rem", border: "1px solid var(--border)",
    }}>
      {[{ id: "clinic", label: "My care" }, { id: "wellness", label: "Wellness" }].map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          style={{
            flex: 1, padding: "7px 12px", borderRadius: 8, border: "none",
            background: mode === m.id ? "var(--grad1)" : "transparent",
            color: mode === m.id ? "#fff" : "var(--muted)",
            fontSize: 12, fontWeight: mode === m.id ? 700 : 500,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function usePatientHome(authUser, isClinician) {
  const [preference, setPreference] = useState(getHomeModePreference);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.id) {
      setContext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchClinicPatientContext(authUser.id).then((ctx) => {
      setContext(ctx);
      setLoading(false);
    });
  }, [authUser?.id]);

  const effectiveMode = resolveHomeMode(preference, context, isClinician);

  const setMode = (mode) => {
    setPreference(mode);
    setHomeModePreference(mode);
  };

  return { preference, effectiveMode, setMode, context, loading };
}

function SidebarBrand({ compact = false }) {
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <img src="/logo.png" alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "contain", background: "#fff", padding: 2, flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--pearl)", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
          MindShift<span style={{ color: "var(--lavender)" }}>+</span>
        </span>
      </div>
    );
  }
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", background: "#fff", padding: 2, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--pearl)" }}>
            MindShift<span style={{ color: "var(--lavender)" }}>+</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>
            Wellness Clinic
          </div>
        </div>
      </div>
      <p style={{ margin: "10px 0 0", paddingLeft: 42, fontSize: 10, lineHeight: 1.45, color: "var(--muted2)", fontStyle: "italic" }}>
        Where minds shift &amp; healing begins
      </p>
    </div>
  );
}

// Clinical tools — launched from Clinical Suite hub (not listed individually in sidebar)
const clinicalTools = [
  {
    id: "ehr",
    title: "MindShift EHR",
    shortTitle: "EHR",
    description: "Patient charts, schedule, clinical notes, medications, and billing.",
    icon: "logo",
    accent: "#7c6ff7",
    glow: "rgba(124,111,247,0.35)",
    gradient: "linear-gradient(145deg, rgba(124,111,247,0.22) 0%, rgba(78,205,196,0.1) 100%)",
  },
  {
    id: "ehr-schedule",
    title: "Patient Lookup & Tools",
    shortTitle: "Lookup",
    description: "Portal Patient ID lookup, visit notes, prescriptions, and documents. Use EHR → Schedule for the calendar.",
    icon: "🔍",
    accent: "#4a6cf7",
    glow: "rgba(74,108,247,0.35)",
    gradient: "linear-gradient(145deg, rgba(74,108,247,0.22) 0%, rgba(14,165,160,0.1) 100%)",
  },
  {
    id: "ai-scribe",
    title: "MindShift Scribe",
    shortTitle: "Scribe",
    description: "AI-powered session recording and progress note generation.",
    icon: "🎙️",
    accent: "#0ea5a0",
    glow: "rgba(14,165,160,0.35)",
    gradient: "linear-gradient(145deg, rgba(14,165,160,0.22) 0%, rgba(124,111,247,0.1) 100%)",
  },
  {
    id: "staff-docs",
    title: "Staff Docs & Help",
    shortTitle: "Docs",
    description: "How-to guides plus Milo — AI staff guide for EHR, Admin, Scribe, and billing.",
    icon: "📖",
    accent: "#f5c842",
    glow: "rgba(245,200,66,0.35)",
    gradient: "linear-gradient(145deg, rgba(245,200,66,0.2) 0%, rgba(124,111,247,0.08) 100%)",
  },
];

function ClinicalSuite({ setPage, userName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (userName || "Clinician").split(" ")[0];
  const [miloIntroDismissed, setMiloIntroDismissed] = useState(
    () => localStorage.getItem("milo_intro_dismissed") === "1"
  );

  const dismissMiloIntro = () => {
    localStorage.setItem("milo_intro_dismissed", "1");
    setMiloIntroDismissed(true);
  };

  const showMiloIntroAgain = () => {
    localStorage.removeItem("milo_intro_dismissed");
    setMiloIntroDismissed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 920, margin: "0 auto", paddingBottom: "90px" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
          Staff workspace
        </div>
        <h1 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: 520 }}>
          Choose a clinical tool below. These modules are for authorized MindShift Wellness Clinic staff only.
        </p>
      </div>

      {!miloIntroDismissed && (
        <GlassCard style={{
          marginBottom: "1.25rem",
          padding: "1.15rem 1.25rem",
          background: "linear-gradient(135deg, rgba(124,111,247,0.18), rgba(78,205,196,0.1))",
          border: "1px solid rgba(124,111,247,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
                New — meet {STAFF_ASSISTANT_NAME}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.01em" }}>
                Your staff guide, like Mia for patients
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: 520 }}>
                {STAFF_ASSISTANT_NAME} answers how-to questions from Staff Docs — scheduling, EHR, Scribe, billing, and more.
                Open <strong style={{ color: "var(--white)" }}>Staff Docs → {STAFF_ASSISTANT_NAME}</strong>, or tap <strong style={{ color: "var(--white)" }}>💬</strong> in the EHR toolbar anytime.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setPage("staff-docs")}
                  style={{
                    padding: "8px 14px", borderRadius: 10, border: "none",
                    background: "var(--lavender)", color: "#fff", fontWeight: 600,
                    fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
                  }}
                >
                  Open {STAFF_ASSISTANT_NAME}
                </button>
                <button
                  type="button"
                  onClick={dismissMiloIntro}
                  style={{
                    padding: "8px 14px", borderRadius: 10,
                    border: "1px solid var(--border2)", background: "transparent",
                    color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)",
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, var(--lavender), var(--teal))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>✦</div>
          </div>
        </GlassCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {clinicalTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setPage(tool.id)}
            style={{
              textAlign: "left",
              background: tool.gradient,
              border: `1px solid ${tool.glow}`,
              borderRadius: 20,
              padding: "1.35rem 1.4rem",
              cursor: "pointer",
              fontFamily: "var(--font)",
              color: "var(--white)",
              transition: "transform .2s, box-shadow .2s, border-color .2s",
              boxShadow: `0 8px 32px ${tool.glow.replace("0.35", "0.12")}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 168,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 14px 40px ${tool.glow.replace("0.35", "0.2")}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 8px 32px ${tool.glow.replace("0.35", "0.12")}`;
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {tool.icon === "logo" ? (
                  <img src="/logo.png" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 22 }}>{tool.icon}</span>
                )}
              </div>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>→</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: tool.accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {tool.shortTitle}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.01em" }}>{tool.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{tool.description}</div>
            </div>
          </button>
        ))}
      </div>

      <GlassCard style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--white)" }}>Tip:</strong> Use <strong style={{ color: "var(--lavender)" }}>EHR</strong> for patients, schedule, charts, and billing,{" "}
          <strong style={{ color: "var(--lavender)" }}>Scribe</strong> to record sessions and push notes, and{" "}
          <strong style={{ color: "var(--gold)" }}>Docs</strong> for step-by-step guides and <strong style={{ color: "var(--gold)" }}>{STAFF_ASSISTANT_NAME}</strong> (your AI staff guide).
          {miloIntroDismissed && (
            <>
              {" "}
              <button
                type="button"
                onClick={showMiloIntroAgain}
                style={{
                  marginLeft: 4, padding: 0, border: "none", background: "none",
                  color: "var(--teal)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                  fontSize: 12, textDecoration: "underline",
                }}
              >
                Show {STAFF_ASSISTANT_NAME} intro again
              </button>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function Sidebar({ page, setPage, user, onSignOut, open, onClose, isClinician, homeMode, patientContext, onOpenPortal }) {
  const clinicalActive = ["clinical", "ehr-schedule", "ehr", "ai-scribe", "staff-docs"].includes(page);
  const mainNav = homeMode === "clinic" ? clinicNavItems : primaryNavItems;

  const handleNav = (n) => {
    if (n.portalPage) onOpenPortal(n.portalPage);
    else setPage(n.id);
    onClose();
  };
  return(
    <>
      {/* Mobile overlay — only shows on small screens when drawer is open */}
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:99}} className="mobile-only"/>}
      <aside className="sidebar" style={{
        width:230,background:var_("--midnight"),borderRight:"1px solid var(--border)",
        display:"flex",flexDirection:"column",
        position:"fixed",top:0,left:0,height:"100vh",zIndex:100,padding:"1.5rem 0",
        transition:"transform .25s ease",
        // Mobile: controlled by open state. Desktop: CSS overrides to translateX(0)
        transform: open ? "translateX(0)" : "translateX(-100%)",
      }}>
        <div style={{ padding: "0 1.2rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <SidebarBrand />
          <button onClick={onClose} className="mobile-only" style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", padding: 4, flexShrink: 0, marginTop: 2 }}>✕</button>
        </div>
        <nav style={{flex:1,padding:"1rem 0.8rem",display:"flex",flexDirection:"column",gap:4,overflowY:"auto"}}>
          {mainNav.map(n=>(
            <button key={n.id} type="button" onClick={() => handleNav(n)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:12,
              background:page===n.id?"var(--glass2)":"transparent",
              border:page===n.id?"1px solid var(--border2)":"1px solid transparent",
              color:page===n.id?"var(--white)":"var(--muted)",fontSize:14,fontWeight:page===n.id?600:400,
              cursor:"pointer",textAlign:"left",transition:"all .15s"
            }}>
              <span style={{fontSize:16,width:20,textAlign:"center"}}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badgeKey === "unread" && (patientContext?.unreadCount ?? 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "var(--rose)", color: "#fff", padding: "2px 7px", borderRadius: 99 }}>
                  {patientContext.unreadCount}
                </span>
              )}
            </button>
          ))}
          {homeMode === "wellness" && (
          <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted2)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 14px 4px", marginTop: 4 }}>
            Explore
          </div>
          {exploreNavItems.map(n=>(
            <button key={n.id} type="button" onClick={()=>{setPage(n.id);onClose();}} style={{
              display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderRadius:12,
              background:page===n.id?"var(--glass2)":"transparent",
              border:page===n.id?"1px solid var(--border2)":"1px solid transparent",
              color:page===n.id?"var(--white)":"var(--muted2)",fontSize:13,fontWeight:page===n.id?600:400,
              cursor:"pointer",textAlign:"left",transition:"all .15s", fontFamily: "inherit",
            }}>
              <span style={{fontSize:15,width:20,textAlign:"center"}}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ fontSize: 9, background: "var(--grad1)", padding: "2px 7px", borderRadius: 99, color: "#fff", fontWeight: 700 }}>{n.badge}</span>}
            </button>
          ))}
          </>
          )}
          {homeMode === "clinic" && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted2)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 14px 4px", marginTop: 4 }}>
                Wellness
              </div>
              {[
                { id: "mia", icon: "💬", label: "Talk to Mia" },
                { id: "breathe", icon: "🌬️", label: "Breathe" },
                { id: "programs", icon: "📚", label: "Programs" },
              ].map((n) => (
                <button key={n.id} type="button" onClick={() => { setPage(n.id); onClose(); }} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 12,
                  background: page === n.id ? "var(--glass2)" : "transparent",
                  border: page === n.id ? "1px solid var(--border2)" : "1px solid transparent",
                  color: page === n.id ? "var(--white)" : "var(--muted2)", fontSize: 13,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </>
          )}
          {user && isClinician && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "8px 0 6px" }} />
              <button
                onClick={() => { setPage("clinical"); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14,
                  background: clinicalActive
                    ? "linear-gradient(135deg, rgba(124,111,247,0.18), rgba(14,165,160,0.1))"
                    : "rgba(255,255,255,0.03)",
                  border: clinicalActive
                    ? "1px solid rgba(124,111,247,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                  color: clinicalActive ? "var(--white)" : "var(--muted)",
                  fontSize: 13, fontWeight: clinicalActive ? 600 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all .15s", width: "100%",
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: clinicalActive ? "var(--grad1)" : "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff",
                }}>⚕</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", lineHeight: 1.25 }}>Clinical Suite</span>
                  <span style={{ display: "block", fontSize: 10, color: "var(--muted2)", fontWeight: 400, marginTop: 2 }}>
                    EHR · Admin · Scribe · Docs
                  </span>
                </span>
              </button>
            </>
          )}
        </nav>
        {user&&(
          <div style={{padding:"1rem 1.2rem",borderTop:"1px solid var(--border)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <Avatar name={user.name} size={34}/>
              <div><div style={{fontSize:13,fontWeight:600}}>{user.name}</div><div style={{fontSize:11,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{user.email}</div></div>
            </div>
            <button onClick={onSignOut} style={{width:"100%",padding:"7px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"var(--muted)",fontSize:12,cursor:"pointer",transition:"all .15s"}}>Sign Out</button>
          </div>
        )}
      </aside>
    </>
  );
}

// ── MOBILE BOTTOM NAV ──────────────────────────────────────────────────────────
const bottomNavItems = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "mia", icon: "💬", label: "Mia" },
  { id: "journal", icon: "📓", label: "Journal" },
  { id: "breathe", icon: "🌬️", label: "Breathe" },
  { id: "portal", icon: "🏥", label: "Portal" },
];

function BottomNav({ page, setPage, homeMode, patientContext, onOpenPortal }) {
  const clinicBottom = [
    { id: "dashboard", icon: "🏠", label: "Home" },
    { id: "messages", icon: "💬", label: "Messages", portalPage: "messages", badge: patientContext?.unreadCount },
    { id: "appointments", icon: "📅", label: "Appts", portalPage: "appointments" },
    { id: "portal", icon: "🏥", label: "Portal", portalPage: "dashboard" },
    { id: "settings", icon: "⚙️", label: "Settings", navPage: "settings" },
  ];
  const items = homeMode === "clinic" ? clinicBottom : bottomNavItems;

  return(
    <nav style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:90,
      background:"rgba(13,18,40,0.97)",backdropFilter:"blur(20px)",
      borderTop:"1px solid var(--border)",
      display:"flex",alignItems:"center",justifyContent:"space-around",
      padding:"8px 0 max(12px, env(safe-area-inset-bottom))",
    }}>
      {items.map(n=>(
        <button key={n.id} type="button" onClick={() => {
          if (n.portalPage) onOpenPortal(n.portalPage);
          else setPage(n.navPage || n.id);
        }} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          background:"transparent",border:"none",
          color:page===n.id?"var(--lavender)":"var(--muted2)",
          fontSize:10,fontWeight:page===n.id?600:400,
          cursor:"pointer",padding:"4px 10px",borderRadius:10,
          transition:"all .15s",minWidth:52, position: "relative", fontFamily: "inherit",
        }}>
          <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
          {n.label}
          {(n.badge ?? 0) > 0 && (
            <span style={{
              position: "absolute", top: 0, right: 4, minWidth: 16, height: 16, borderRadius: 99,
              background: "var(--rose)", color: "#fff", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
            }}>
              {n.badge > 9 ? "9+" : n.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

function var_(v){return`var(${v})`}

// ── LANDING ────────────────────────────────────────────────────────────────────
function Landing(){
  return(
    <div style={{height:"100vh"}}>
      <iframe
        title="MindShift+ Site"
        src="/site-main.html"
        style={{border:"none",width:"100%",height:"100%",display:"block",background:"#f5f0ee"}}
      />
    </div>
  )
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────────
function Onboarding({setPage,setUser}){
  const [step,setStep]=useState(0);
  const [data,setData]=useState({name:"",goals:[],style:[]});
  const goals=["Anxiety","Stress","Confidence","Emotional balance","Overthinking","Healing","Daily motivation"];
  const styles=["Journaling","Breathing","AI Coaching","Guided programs"];
  const toggle=(key,val)=>setData(d=>({...d,[key]:d[key].includes(val)?d[key].filter(x=>x!==val):[...d[key],val]}));
  const finish=()=>{setUser({name:data.name||"Friend",goals:data.goals,style:data.style});setPage("dashboard")};
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",background:"radial-gradient(ellipse at 60% 30%,rgba(124,111,247,0.12) 0%,transparent 60%)"}}>
      <div style={{maxWidth:500,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:22,fontWeight:700,background:"var(--grad1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>MindShift+</div>
          <ProgressBar value={((step+1)/5)*100}/>
          <div style={{color:"var(--muted2)",fontSize:12,marginTop:6}}>Step {step+1} of 5</div>
        </div>
        {step===0&&(
          <GlassCard>
            <h2 style={{marginBottom:8}}>Welcome. You're in the right place.</h2>
            <p style={{color:"var(--muted)",marginBottom:"1.5rem",lineHeight:1.7}}>This is a space just for you — no judgment, no pressure. Let's take a gentle moment to get to know you.</p>
            <Btn onClick={()=>setStep(1)} style={{width:"100%",justifyContent:"center"}}>Let's Begin →</Btn>
          </GlassCard>
        )}
        {step===1&&(
          <GlassCard>
            <h2 style={{marginBottom:8}}>What should we call you?</h2>
            <p style={{color:"var(--muted)",marginBottom:"1.2rem"}}>Your name makes this feel a little more personal.</p>
            <input value={data.name} onChange={e=>setData(d=>({...d,name:e.target.value}))} placeholder="Your first name" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid var(--border2)",borderRadius:12,padding:"12px 16px",color:"var(--white)",fontSize:15,marginBottom:"1.2rem",outline:"none"}}/>
            <Btn onClick={()=>setStep(2)} style={{width:"100%",justifyContent:"center"}}>Continue →</Btn>
          </GlassCard>
        )}
        {step===2&&(
          <GlassCard>
            <h2 style={{marginBottom:8}}>What brings you here?</h2>
            <p style={{color:"var(--muted)",marginBottom:"1.2rem"}}>Choose everything that resonates. There's no wrong answer.</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:"1.5rem"}}>
              {goals.map(g=>(
                <button key={g} onClick={()=>toggle("goals",g)} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${data.goals.includes(g)?"var(--purple)":"var(--border)"}`,background:data.goals.includes(g)?"rgba(124,111,247,0.2)":"transparent",color:data.goals.includes(g)?"var(--lavender)":"var(--muted)",fontSize:13,cursor:"pointer",transition:"all .15s"}}>{g}</button>
              ))}
            </div>
            <Btn onClick={()=>setStep(3)} style={{width:"100%",justifyContent:"center"}}>Continue →</Btn>
          </GlassCard>
        )}
        {step===3&&(
          <GlassCard>
            <h2 style={{marginBottom:8}}>How do you like to grow?</h2>
            <p style={{color:"var(--muted)",marginBottom:"1.2rem"}}>Select all that appeal to you. We'll personalize your experience.</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:"1.5rem"}}>
              {styles.map(s=>(
                <button key={s} onClick={()=>toggle("style",s)} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${data.style.includes(s)?"var(--teal)":"var(--border)"}`,background:data.style.includes(s)?"rgba(78,205,196,0.2)":"transparent",color:data.style.includes(s)?"var(--teal)":"var(--muted)",fontSize:13,cursor:"pointer",transition:"all .15s"}}>{s}</button>
              ))}
            </div>
            <Btn onClick={()=>setStep(4)} style={{width:"100%",justifyContent:"center"}}>Continue →</Btn>
          </GlassCard>
        )}
        {step===4&&(
          <GlassCard style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:"1rem"}}>✦</div>
            <h2 style={{marginBottom:8}}>You're all set, {data.name||"friend"}. 🌿</h2>
            <p style={{color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Your personalized wellness space is ready. Today is a new chance to reset, reflect, and grow. We're with you every step of the way.</p>
            <Btn onClick={finish} style={{width:"100%",justifyContent:"center",fontSize:15,padding:"14px"}}>Enter MindShift+ →</Btn>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({
  user, setPage, isClinician, homeMode, onHomeModeChange, patientContext,
  patientContextLoading, onOpenPortal, showModeToggle,
}) {
  const { user: authUser } = useAuth();
  const { show: showToast, el: toastEl } = useToast();
  const [mood, setMood] = useState(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ journalCount:0, avgMoodEmoji:"—", thisWeek:"0/7" });
  const [wellness, setWellness] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const moods = ["😔","😐","🙂","😊","🌟"];
  const moodLabels = ["Low","Okay","Good","Great","Amazing"];
  const quotes = ["Today is a new chance to reset.","Take a breath — you're doing better than you think.","Your growth is happening, even when it feels slow.","Small steps still move you forward."];
  const quote = quotes[new Date().getDay()%quotes.length];

  useEffect(()=>{
    if(!authUser) return;
    const load = async () => {
      const { getStreak, getDashboardStats, getTodayMood, getWellnessProgress } = await import("./lib/db.js");
      const [s, st, todayMood, w] = await Promise.all([
        getStreak(authUser.id),
        getDashboardStats(authUser.id),
        getTodayMood(authUser.id),
        getWellnessProgress(authUser.id),
      ]);
      setStreak(s);
      setStats(st);
      setWellness(w);
      if(todayMood.data) {
        setMood(todayMood.data.mood);
        setMoodSaved(true);
      }
      setLoadingStats(false);
    };
    load();
  },[authUser]);

  const handleMood = async (i) => {
    if(!authUser) return;
    if(moodSaved) {
      showToast("✓ Mood already logged for today","warn");
      return;
    }
    setMood(i);
    setMoodSaved(true);
    const { logMood, getStreak } = await import("./lib/db.js");
    const { error } = await logMood(authUser.id, i, moodLabels[i]);
    if(error) {
      showToast("✓ Mood already logged for today","warn");
    } else {
      showToast("✓ Mood logged!","success");
    }
    const s = await getStreak(authUser.id);
    setStreak(s);
  };

  return(
    <div style={{padding:"1.25rem 1.35rem",maxWidth:720,margin:"0 auto",paddingBottom:"90px"}}>
      {toastEl}

      {/* Header */}
      <div style={{marginBottom:"1.35rem"}}>
        <div style={{ fontSize: 12, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: "var(--serif)", fontSize: "clamp(1.5rem, 5vw, 2rem)",
              fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em", margin: 0,
            }}>
              {greeting}, {user?.name || "Friend"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, lineHeight: 1.55, maxWidth: 420 }}>{quote}</p>
          </div>
          <GlassCard style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, borderRadius: 14 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "var(--gold)", lineHeight: 1 }}>{streak}</div>
              <div style={{ color: "var(--muted2)", fontSize: 10 }}>day streak</div>
            </div>
          </GlassCard>
        </div>
      </div>

      {isClinician && (
        <GlassCard
          onClick={() => setPage("clinical")}
          style={{
            marginBottom: "1rem", cursor: "pointer", padding: "1rem 1.15rem",
            background: "linear-gradient(135deg, rgba(107,95,207,0.16), rgba(42,157,143,0.08))",
            border: "1px solid rgba(107,95,207,0.28)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: "var(--grad1)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "#fff",
              }}>⚕</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Clinical Suite</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>EHR · Admin · Scribe · Staff Docs</div>
              </div>
            </div>
            <span style={{ color: "var(--lavender)", fontSize: 18, flexShrink: 0 }}>→</span>
          </div>
        </GlassCard>
      )}

      <HomeModeToggle
        mode={homeMode}
        onChange={onHomeModeChange}
        visible={showModeToggle}
      />

      {/* Mood Check-in */}
      <GlassCard style={{ marginBottom: "1rem", background: "linear-gradient(135deg,rgba(107,95,207,0.1),rgba(42,157,143,0.06))", padding: "1.15rem 1.2rem" }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>How are you feeling right now?</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {moods.map((m, i) => (
            <button key={i} onClick={() => handleMood(i)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 4px", borderRadius: 12,
              border: `1px solid ${mood === i ? "var(--purple)" : "var(--border)"}`,
              background: mood === i ? "rgba(107,95,207,0.18)" : "var(--glass)",
              cursor: moodSaved ? "default" : "pointer", transition: "all .15s",
              opacity: moodSaved && mood !== i ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 22 }}>{m}</span>
              <span style={{ fontSize: 10, color: mood === i ? "var(--lavender)" : "var(--muted)" }}>{moodLabels[i]}</span>
            </button>
          ))}
        </div>
        {moodSaved && <p style={{ color: "var(--teal)", fontSize: 12, marginTop: 8 }}>✓ Mood logged. Thank you for checking in.</p>}
      </GlassCard>

      {homeMode === "clinic" ? (
        <>
          {(patientContext?.unreadCount ?? 0) > 0 && (
            <GlassCard
              onClick={() => onOpenPortal("messages")}
              style={{
                marginBottom: "1rem", cursor: "pointer", padding: "1rem 1.15rem",
                background: "linear-gradient(135deg, rgba(224,122,143,0.12), rgba(107,95,207,0.08))",
                border: "1px solid rgba(224,122,143,0.28)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>💬 {patientContext.unreadCount} unread message{patientContext.unreadCount !== 1 ? "s" : ""} from the clinic</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Tap to open your secure messages</div>
            </GlassCard>
          )}

          <GlassCard style={{ marginBottom: "1rem", padding: "1.15rem 1.2rem", background: "linear-gradient(135deg, rgba(107,95,207,0.12), rgba(42,157,143,0.08))" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--lavender)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              MindShift Wellness Clinic
            </div>
            {patientContextLoading ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading your care…</div>
            ) : patientContext?.nextAppointment ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Next appointment</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                  {patientContext.nextAppointment.appointment_type?.replace(/_/g, " ") || "Visit"}<br />
                  📅 {patientContext.nextAppointment.scheduled_at
                    ? new Date(patientContext.nextAppointment.scheduled_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : "TBD"}
                  {patientContext.nextAppointment.provider_name && (
                    <><br />👨‍⚕️ {patientContext.nextAppointment.provider_name.split(",")[0]}</>
                  )}
                </div>
                <Btn small onClick={() => onOpenPortal("appointments")} style={{ marginTop: 12 }}>View appointments</Btn>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No upcoming appointments</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>Book or view your visits in the patient portal.</div>
                <Btn small onClick={() => onOpenPortal("appointments")}>Open appointments</Btn>
              </>
            )}
            {patientContext?.mrn && (
              <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 12 }}>Chart MRN: {patientContext.mrn}</div>
            )}
          </GlassCard>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Your care
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.65rem", marginBottom: "1.1rem" }}>
            {[
              { icon: "💬", label: "Messages", sub: "Contact your care team", portal: "messages" },
              { icon: "📅", label: "Appointments", sub: "View & book visits", portal: "appointments" },
              { icon: "📄", label: "Documents", sub: "Forms & records", portal: "documents" },
              { icon: "📓", label: "Care journal", sub: "Session journal", portal: "journal" },
            ].map((a) => (
              <GlassCard key={a.label} onClick={() => onOpenPortal(a.portal)} style={{ cursor: "pointer", padding: "0.9rem 1rem", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div style={{ textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{a.sub}</div>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard onClick={() => onOpenPortal("dashboard")} style={{ marginBottom: "1rem", cursor: "pointer", padding: "1rem 1.15rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Open full patient portal</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>Billing, prescriptions, intake, and profile</div>
              </div>
              <span style={{ color: "var(--lavender)", fontSize: 18 }}>→</span>
            </div>
          </GlassCard>

          {showModeToggle && (
            <button
              type="button"
              onClick={() => onHomeModeChange("wellness")}
              style={{
                width: "100%", marginBottom: "1rem", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 14, padding: "0.75rem 1rem",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>🌿 Wellness tools</div>
              <div style={{ color: "var(--muted2)", fontSize: 11, marginTop: 2 }}>Mia, breathe, programs, and insights</div>
            </button>
          )}
        </>
      ) : (
        <>
      {/* Primary actions — wellness */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Start here
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem", marginBottom: "1.1rem" }}>
        {[
          { icon: "💬", label: "Talk to Mia", sub: "AI wellness coach", page: "mia" },
          { icon: "📓", label: "Journal", sub: "Reflect & grow", page: "journal" },
          { icon: "🏥", label: "Portal", sub: "Care & messages", page: "portal" },
        ].map((a) => (
          <GlassCard key={a.label} onClick={() => setPage(a.page)} style={{ cursor: "pointer", textAlign: "center", padding: "1rem 0.65rem", borderRadius: 16 }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{a.label}</div>
            <div style={{ color: "var(--muted)", fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>{a.sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* Wellness tools */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Wellness tools
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.65rem", marginBottom: "1.1rem" }}>
        {[
          { icon: "🌬️", label: "Breathe", sub: "Calm your nervous system", page: "breathe" },
          { icon: "📚", label: "Programs", sub: "Guided journeys", page: "programs" },
          { icon: "📊", label: "Insights", sub: "Your patterns", page: "insights" },
          { icon: "✨", label: "Explore", sub: "More activities", page: "constellation" },
        ].map((a) => (
          <GlassCard key={a.label} onClick={() => setPage(a.page)} style={{ cursor: "pointer", padding: "0.9rem 1rem", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{a.sub}</div>
            </div>
          </GlassCard>
        ))}
      </div>
        </>
      )}

      {/* Stats Row — both modes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem", marginBottom: "1rem" }}>
        {[
          { label: "Journal entries", val: loadingStats ? "…" : stats.journalCount, icon: "📓" },
          { label: "Mood avg", val: loadingStats ? "…" : stats.avgMoodEmoji, icon: "◎" },
          { label: "This week", val: loadingStats ? "…" : stats.thisWeek, icon: "📅" },
        ].map((s) => (
          <GlassCard key={s.label} style={{ textAlign: "center", padding: "0.85rem 0.5rem", borderRadius: 14 }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{s.val}</div>
            <div style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.3 }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Wellness Progress */}
      <GlassCard style={{ marginBottom: "0.85rem", padding: "1.15rem 1.2rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.8rem", fontSize: 14 }}>Your wellness progress</div>
        {!wellness?.hasData ? (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "0.6rem 0", lineHeight: 1.6 }}>
            Log your mood and write journal entries to start tracking progress.
          </div>
        ) : (
          [
            { label: "Emotional regulation", pct: wellness.emotionalReg, color: "var(--purple)" },
            { label: "Stress management", pct: wellness.stressScore, color: "var(--teal)" },
            { label: "Self-awareness", pct: wellness.selfAwareness, color: "var(--lavender)" },
          ].map((p) => (
            <div key={p.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span>{p.label}</span>
                <span style={{ color: "var(--muted)" }}>{p.pct === null ? "—" : `${p.pct}%`}</span>
              </div>
              <ProgressBar value={p.pct ?? 0} color={p.color} />
            </div>
          ))
        )}
      </GlassCard>

      {homeMode === "wellness" && showModeToggle && (
        <button
          type="button"
          onClick={() => onHomeModeChange("clinic")}
          style={{
            width: "100%", marginBottom: "0.85rem", background: "rgba(107,95,207,0.08)",
            border: "1px solid rgba(107,95,207,0.22)", borderRadius: 14, padding: "0.85rem 1rem",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--cream)" }}>🏥 MindShift clinic patient?</div>
          <div style={{ color: "var(--muted2)", fontSize: 11, marginTop: 2 }}>Switch to My care for appointments and messages</div>
        </button>
      )}

      {homeMode === "wellness" && (
      <button
        type="button"
        onClick={() => setPage("premium")}
        style={{
          width: "100%", background: "transparent", border: "1px dashed var(--border2)",
          borderRadius: 14, padding: "0.85rem 1rem", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--cream)" }}>MindShift+ Premium</div>
          <div style={{ color: "var(--muted2)", fontSize: 11, marginTop: 2 }}>Deeper insights & unlimited Mia</div>
        </div>
        <span style={{ color: "var(--lavender)", fontSize: 13, fontWeight: 600 }}>Learn more →</span>
      </button>
      )}
    </div>
  );
}

// ── MIA (AI COACH) ─────────────────────────────────────────────────────────────
function Mia(){
  const { user: authUser } = useAuth();
  const WELCOME = {role:"assistant",content:"Hi there 🌿 I'm Mia, your personal wellness coach. This is your safe space — you can share anything. How are you feeling today?"};
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const bottomRef = useRef(null);
  const prompts = ["Help me calm down","I feel stuck today","Help me process something","Give me a confidence reset","I'm feeling anxious","I need motivation"];

  // Load conversation history on mount
  useEffect(()=>{
    if(!authUser) return;
    import("./lib/db.js").then(({ getMiaMessages })=>{
      getMiaMessages(authUser.id).then(({ data })=>{
        if(data && data.length > 0){
          setMessages(data.map(m=>({ role:m.role, content:m.content })));
        }
        setLoadingHistory(false);
      });
    });
  },[authUser]);

  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),[messages,loading]);

  const send = async (text=input) => {
    if(!text.trim() || loading) return;

    // Crisis detection
    const { detectCrisisKeywords, logCrisisEvent, alertClinicians } = await import("./lib/crisisDetection.js");
    const crisisCheck = detectCrisisKeywords(text);
    
    if (crisisCheck.detected) {
      setShowCrisisModal(true);
      // Log crisis event
      if (authUser) {
        await logCrisisEvent(
          authUser.id,
          'mia',
          text,
          crisisCheck.keywords,
          crisisCheck.severity
        );
        // Alert clinicians
        await alertClinicians(
          authUser.id,
          authUser.user_metadata?.full_name || 'Unknown Patient',
          'Mia Chat',
          crisisCheck.severity
        );
      }
    }

    const userMsg = { role:"user", content:text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Save user message to Supabase
    if(authUser){
      const { saveMiaMessage } = await import("./lib/db.js");
      await saveMiaMessage(authUser.id, "user", text);
    }

    try{
      const { callAiProxy } = await import("./lib/aiProxy.js");
      // Only send last 20 messages to API to keep context manageable
      const contextMessages = newMessages.slice(-20).map(m=>({ role:m.role, content:m.content }));
      const reply = await callAiProxy({
        max_tokens:1000,
        system:`You are Mia, a warm, emotionally intelligent AI wellness coach for MindShift+. You are calm, supportive, compassionate, and wise — never clinical or robotic. You help users with stress, anxiety, confidence, emotional processing, and personal growth. Keep responses concise (2-4 sentences), warm, and focused on emotional support. Use gentle language and occasional affirmations. Never give medical advice.`,
        messages: contextMessages
      }) || "I'm here with you. Take a breath — what would feel most helpful right now?";
      setMessages(m=>[...m,{role:"assistant",content:reply}]);

      // Save Mia's reply to Supabase
      if(authUser){
        const { saveMiaMessage } = await import("./lib/db.js");
        await saveMiaMessage(authUser.id, "assistant", reply);
      }
    } catch(e){
      console.error("[Mia] Error:", e.message);
      const fallback = `Something went wrong: ${e.message}`;
      setMessages(m=>[...m,{role:"assistant",content:fallback}]);
      if(authUser){
        const { saveMiaMessage } = await import("./lib/db.js");
        await saveMiaMessage(authUser.id, "assistant", fallback);
      }
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    if(!authUser || !confirm("Clear your conversation with Mia? This can't be undone.")) return;
    setClearing(true);
    const { supabase } = await import("./lib/supabase.js");
    await supabase.from("mia_messages").delete().eq("user_id", authUser.id);
    setMessages([WELCOME]);
    setClearing(false);
  };

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",padding:"1.5rem",maxWidth:750,margin:"0 auto"}}>
      {/* Crisis Modal */}
      {showCrisisModal && <CrisisModal onClose={() => setShowCrisisModal(false)} />}
      
      {/* ⚠️ Crisis disclaimer — always visible */}
      <div style={{background:"rgba(240,165,0,0.08)",border:"1px solid rgba(240,165,0,0.25)",borderRadius:10,padding:"8px 12px",marginBottom:"0.75rem",fontSize:11,color:"var(--gold)",lineHeight:1.6}}>
        ⚠️ <strong>Mia is an AI wellness tool — not a crisis service.</strong> Conversations are not monitored in real time. If you are in crisis, call <strong>911</strong> or text/call <strong>988</strong>.
      </div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:"1.2rem",paddingBottom:"1rem",borderBottom:"1px solid var(--border)"}}>
        <div style={{width:44,height:44,borderRadius:"50%",background:"var(--grad2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>◎</div>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>Mia</div>
          <div style={{color:"var(--teal)",fontSize:12}}>● Online — Here for you</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <Badge color="purple">AI Coach</Badge>
          {!loadingHistory && messages.length > 1 &&(
            <button onClick={clearHistory} disabled={clearing} style={{background:"transparent",border:"1px solid var(--border)",color:"var(--muted2)",fontSize:11,padding:"4px 10px",borderRadius:20,cursor:"pointer",transition:"all .15s"}}>
              {clearing ? "…" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,paddingRight:4}}>
        {loadingHistory ? (
          <div style={{textAlign:"center",padding:"2rem",color:"var(--muted)",fontSize:13}}>Loading your conversation…</div>
        ) : (
          messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
              {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:"50%",background:"var(--grad2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>◎</div>}
              <div style={{maxWidth:"80%",padding:"10px 15px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"var(--grad1)":"var(--card2)",fontSize:14,lineHeight:1.65,color:"#fff"}}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading&&(
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--grad2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>◎</div>
            <div style={{padding:"10px 16px",borderRadius:"18px 18px 18px 4px",background:"var(--card2)",display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:"var(--lavender)",animation:"pulse 1.2s infinite",animationDelay:`${j*0.2}s`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>

      {/* Suggested prompts */}
      <div style={{padding:"0.8rem 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
        {prompts.map(p=><button key={p} onClick={()=>send(p)} style={{whiteSpace:"nowrap",padding:"6px 14px",borderRadius:20,border:"1px solid var(--border2)",background:"transparent",color:"var(--muted)",fontSize:12,cursor:"pointer",flexShrink:0,transition:"all .15s"}}>{p}</button>)}
      </div>
      {/* Input */}
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Share what's on your mind..." style={{flex:1,background:"var(--card2)",border:"1px solid var(--border2)",borderRadius:14,padding:"12px 16px",color:"var(--white)",fontSize:14,outline:"none"}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:14,background:input.trim()&&!loading?"var(--grad1)":"var(--card2)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,transition:"all .2s"}}>↑</button>
      </div>
    </div>
  )
}

// ── JOURNAL ────────────────────────────────────────────────────────────────────
function Journal(){
  const { user: authUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [draft, setDraft] = useState({title:"",body:"",mood:"🙂",tags:[]});
  const allTags = ["Gratitude","Anxiety","Prayer","Stress","Breakthrough","Goals","Healing","Joy"];
  const moods = ["😔","😐","🙂","😊","🌟"];
  const prompts = [
    "What's one thing you're carrying today that you're ready to set down?",
    "What are you grateful for right now, even if it's small?",
    "What emotion have you been avoiding acknowledging lately?",
    "What would you tell a friend going through what you're going through?",
  ];
  const prompt = prompts[new Date().getDay() % prompts.length];

  useEffect(()=>{
    if(!authUser) return;
    import("./lib/db.js").then(({ getJournalEntries }) => {
      getJournalEntries(authUser.id).then(({ data }) => {
        if(data) setEntries(data);
        setLoading(false);
      });
    });
  },[authUser]);

  const save = async () => {
    if(!draft.body.trim() || !authUser) return;

    // Crisis detection
    const { detectCrisisKeywords, logCrisisEvent, alertClinicians } = await import("./lib/crisisDetection.js");
    const crisisCheck = detectCrisisKeywords(draft.body);
    
    if (crisisCheck.detected) {
      setShowCrisisModal(true);
      // Log crisis event
      await logCrisisEvent(
        authUser.id,
        'journal',
        draft.body,
        crisisCheck.keywords,
        crisisCheck.severity
      );
      // Alert clinicians
      await alertClinicians(
        authUser.id,
        authUser.user_metadata?.full_name || 'Unknown Patient',
        'Journal Entry',
        crisisCheck.severity
      );
    }

    setSaving(true);
    const { saveJournalEntry } = await import("./lib/db.js");
    const { data } = await saveJournalEntry(authUser.id, draft);
    if(data) setEntries(e => [data, ...e]);
    setDraft({title:"",body:"",mood:"🙂",tags:[]});
    setEditing(false);
    setSaving(false);
  };

  const remove = async (id) => {
    const { deleteJournalEntry } = await import("./lib/db.js");
    await deleteJournalEntry(id);
    setEntries(e => e.filter(x => x.id !== id));
  };

  const toggleTag = (t) => setDraft(d=>({...d,tags:d.tags.includes(t)?d.tags.filter(x=>x!==t):[...d.tags,t]}));

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  return(
    <div style={{padding:"2rem",maxWidth:800,margin:"0 auto"}}>
      {/* Crisis Modal */}
      {showCrisisModal && <CrisisModal onClose={() => setShowCrisisModal(false)} />}
      
      {/* ⚠️ Mandatory disclaimer */}
      <div style={{background:"rgba(240,165,0,0.1)",border:"1px solid rgba(240,165,0,0.3)",borderRadius:12,padding:"10px 14px",marginBottom:"1.2rem",display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
        <p style={{fontSize:12,color:"var(--gold)",lineHeight:1.65,margin:0}}>
          <strong>Your journal is private and not monitored between appointments.</strong> Entries are reviewed only during your scheduled sessions. If you are in crisis, call <strong>911</strong> or the <strong>988 Suicide &amp; Crisis Lifeline (call or text 988)</strong>.
        </p>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:10}}>
        <div><h1 style={{fontSize:"1.8rem",fontWeight:700}}>Your Journal</h1><p style={{color:"var(--muted)",fontSize:14,marginTop:2}}>A private space to reflect and grow.</p></div>
        <Btn onClick={()=>setEditing(true)}>+ New Entry</Btn>
      </div>
      {editing&&(
        <GlassCard style={{marginBottom:"1.5rem",border:"1px solid rgba(124,111,247,0.3)"}}>
          <input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Entry title (optional)" style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid var(--border)",padding:"8px 0",color:"var(--white)",fontSize:16,fontWeight:600,outline:"none",marginBottom:12}}/>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {moods.map(m=><button key={m} onClick={()=>setDraft(d=>({...d,mood:m}))} style={{fontSize:20,background:draft.mood===m?"rgba(124,111,247,0.2)":"transparent",border:`1px solid ${draft.mood===m?"var(--purple)":"transparent"}`,borderRadius:10,padding:6,cursor:"pointer"}}>{m}</button>)}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {allTags.map(t=><button key={t} onClick={()=>toggleTag(t)} style={{padding:"4px 12px",borderRadius:20,fontSize:12,border:`1px solid ${draft.tags.includes(t)?"var(--teal)":"var(--border)"}`,background:draft.tags.includes(t)?"rgba(78,205,196,0.15)":"transparent",color:draft.tags.includes(t)?"var(--teal)":"var(--muted)",cursor:"pointer"}}>{t}</button>)}
          </div>
          <textarea value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))} rows={5} placeholder="What's on your mind today? Let it flow…" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:12,padding:12,color:"var(--white)",fontSize:14,lineHeight:1.7,outline:"none",resize:"vertical",marginBottom:12}}/>
          <p style={{color:"var(--muted2)",fontSize:12,marginBottom:10,fontStyle:"italic"}}>Prompt: {prompt}</p>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={save} disabled={saving}>{saving?"Saving…":"Save Entry"}</Btn>
            <Btn variant="ghost" onClick={()=>setEditing(false)}>Cancel</Btn>
          </div>
        </GlassCard>
      )}
      {loading ? (
        <div style={{textAlign:"center",padding:"3rem",color:"var(--muted)"}}>Loading your entries…</div>
      ) : entries.length === 0 && !editing ? (
        <GlassCard style={{textAlign:"center",padding:"3rem"}}>
          <div style={{fontSize:32,marginBottom:12}}>◈</div>
          <div style={{fontWeight:600,marginBottom:8}}>Your journal is empty</div>
          <div style={{color:"var(--muted)",fontSize:14,marginBottom:"1.5rem"}}>Write your first entry — no pressure, just you.</div>
          <Btn onClick={()=>setEditing(true)}>+ Write Something</Btn>
        </GlassCard>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {entries.map(e=>(
            <GlassCard key={e.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:15}}>{e.title||"Untitled"} <span style={{fontSize:16}}>{e.mood}</span></div>
                  <div style={{color:"var(--muted2)",fontSize:12,marginTop:2}}>{formatDate(e.created_at)}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {e.tags?.map(t=><Badge key={t} color="teal">{t}</Badge>)}
                  </div>
                  <button onClick={()=>remove(e.id)} style={{background:"transparent",border:"none",color:"var(--muted2)",cursor:"pointer",fontSize:14,padding:"2px 6px",borderRadius:6,transition:"color .15s"}} title="Delete">✕</button>
                </div>
              </div>
              <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.7}}>{e.body}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BREATHE ────────────────────────────────────────────────────────────────────
function Breathe(){
  const [selectedMode, setSelectedMode] = useState('box');
  const [selectedDuration, setSelectedDuration] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customModes, setCustomModes] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [currentDrone, setCurrentDrone] = useState(null);

  const breathingModes = {
    box: {
      name: 'Box Breathing',
      pattern: '4 · 4 · 4 · 4',
      phases: [
        { name: 'Inhale', duration: 4, color: '#6b5fcf' },
        { name: 'Hold', duration: 4, color: '#9d8ff0' },
        { name: 'Exhale', duration: 4, color: '#c5bff8' },
        { name: 'Hold', duration: 4, color: '#9d8ff0' }
      ],
      description: 'Equal sides. Builds focus and grounding. Used by Navy SEALs.',
      icon: '◻',
      frequencies: [174, 220, 262]
    },
    '478': {
      name: '4-7-8 Breathing',
      pattern: '4 · 7 · 8',
      phases: [
        { name: 'Inhale', duration: 4, color: '#2a9d8f' },
        { name: 'Hold', duration: 7, color: '#4ecdc4' },
        { name: 'Exhale', duration: 8, color: '#a8e6e2' }
      ],
      description: 'Deep calm. Activates the parasympathetic nervous system instantly.',
      icon: '◑',
      frequencies: [136, 174, 207]
    },
    calm: {
      name: 'Calm Reset',
      pattern: '4 · 6',
      phases: [
        { name: 'Inhale', duration: 4, color: '#8b5cf6' },
        { name: 'Exhale', duration: 6, color: '#a78bfa' }
      ],
      description: 'Extended exhale. Slows the heart rate. Best for anxiety.',
      icon: '〜',
      frequencies: [396, 440, 528]
    },
    sleep: {
      name: 'Sleep Wind-Down',
      pattern: '4 · 4 · 8',
      phases: [
        { name: 'Inhale', duration: 4, color: '#1e3a5f' },
        { name: 'Hold', duration: 4, color: '#2d6a9f' },
        { name: 'Exhale', duration: 8, color: '#7eb8e8' }
      ],
      description: 'Wind down the mind. Prepares body for deep rest.',
      icon: '◌',
      frequencies: [174, 196, 220]
    },
    ...customModes.reduce((acc, mode) => ({ ...acc, [mode.id]: mode }), {})
  };

  const currentMode = breathingModes[selectedMode];
  const currentPhaseData = currentMode.phases[currentPhase];

  // Audio functions
  const initAudio = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  };

  const startDrone = (mode) => {
    if (!soundEnabled) return;
    stopDrone();
    
    const ctx = initAudio();
    const frequencies = mode.frequencies || [174, 220, 262];
    
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    masterGain.connect(ctx.destination);

    const oscillators = frequencies.map((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = i === 0 ? 1 : 0.3 - i * 0.1;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      return { osc, gain };
    });

    // Add subtle LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain);
    oscillators.forEach(({ osc }) => lfoGain.connect(osc.frequency));
    lfo.start();

    setCurrentDrone({ oscillators, masterGain, lfo });
  };

  const stopDrone = () => {
    if (!currentDrone) return;
    try {
      const ctx = audioContext || initAudio();
      currentDrone.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        try {
          currentDrone.oscillators.forEach(({ osc }) => osc.stop());
          currentDrone.lfo.stop();
        } catch (e) {}
      }, 1100);
    } catch (e) {}
    setCurrentDrone(null);
  };

  const playTick = (phaseName) => {
    if (!soundEnabled) return;
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const freqMap = { Inhale: 528, Hold: 396, Exhale: 396 };
    osc.frequency.value = freqMap[phaseName] || 440;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  // Load custom modes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breathe_custom_modes');
      if (saved) {
        setCustomModes(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Save custom modes to localStorage
  const saveCustomModes = (modes) => {
    setCustomModes(modes);
    localStorage.setItem('breathe_custom_modes', JSON.stringify(modes));
  };

  useEffect(() => {
    let interval;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Move to next phase
            setCurrentPhase(prevPhase => {
              const nextPhase = (prevPhase + 1) % currentMode.phases.length;
              if (nextPhase === 0) {
                setCycles(prevCycles => prevCycles + 1);
              }
              // Play tick sound for new phase
              playTick(currentMode.phases[nextPhase].name);
              return nextPhase;
            });
            return currentMode.phases[(currentPhase + 1) % currentMode.phases.length].duration;
          }
          return prev - 1;
        });
        
        setTimeElapsed(prev => prev + 1);
        
        // Check if session is complete
        if (timeElapsed >= selectedDuration * 60) {
          setIsActive(false);
          setCurrentPhase(0);
          setCountdown(0);
          stopDrone();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, currentPhase, currentMode.phases, selectedDuration, timeElapsed, soundEnabled]);

  const startSession = () => {
    setIsActive(true);
    setCurrentPhase(0);
    setCountdown(currentMode.phases[0].duration);
    setCycles(0);
    setTimeElapsed(0);
    setIsPaused(false);
    startDrone(currentMode);
    playTick(currentMode.phases[0].name);
  };

  const stopSession = () => {
    setIsActive(false);
    setCurrentPhase(0);
    setCountdown(0);
    setCycles(0);
    setTimeElapsed(0);
    setIsPaused(false);
    stopDrone();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      stopDrone();
    } else {
      startDrone(currentMode);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOrbScale = () => {
    if (!isActive) return 1;
    if (currentPhaseData.name === 'Inhale') return 1.3;
    if (currentPhaseData.name === 'Exhale') return 0.7;
    return 1.1;
  };

  // Custom Builder Component
  const CustomBuilder = () => {
    const [name, setName] = useState('');
    const [phases, setPhases] = useState([
      { name: 'Inhale', duration: 4, enabled: true },
      { name: 'Hold', duration: 4, enabled: true },
      { name: 'Exhale', duration: 4, enabled: true },
      { name: 'Hold 2', duration: 4, enabled: false }
    ]);
    const [selectedColor, setSelectedColor] = useState(0);

    const colors = [
      { colors: ['#6b5fcf', '#9d8ff0', '#c5bff8'], frequencies: [174, 220, 262] },
      { colors: ['#2a9d8f', '#4ecdc4', '#a8e6e2'], frequencies: [136, 174, 207] },
      { colors: ['#be185d', '#f472b6', '#fce7f3'], frequencies: [396, 440, 528] },
      { colors: ['#b45309', '#f59e0b', '#fef3c7'], frequencies: [174, 196, 220] }
    ];

    const saveCustom = () => {
      if (!name.trim()) return;
      
      const enabledPhases = phases.filter(p => p.enabled).map((p, i) => ({
        name: p.name === 'Hold 2' ? 'Hold' : p.name,
        duration: p.duration,
        color: colors[selectedColor].colors[i % colors[selectedColor].colors.length]
      }));

      const newMode = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        pattern: enabledPhases.map(p => p.duration).join(' · '),
        phases: enabledPhases,
        description: 'Your custom pattern.',
        icon: '✦',
        frequencies: colors[selectedColor].frequencies,
        isCustom: true
      };

      const updated = [...customModes, newMode];
      saveCustomModes(updated);
      setShowCustomBuilder(false);
      setName('');
    };

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,6,15,0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: '#0d1228',
          border: '1px solid rgba(157,143,240,0.3)',
          borderRadius: '24px',
          maxWidth: '500px',
          width: '100%',
          padding: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              Create Custom Pattern
            </h2>
            <button
              onClick={() => setShowCustomBuilder(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.7)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Pattern name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: '#fff',
              fontSize: '1rem',
              marginBottom: '1.5rem'
            }}
          />

          {phases.map((phase, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 60px 40px',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                {phase.name}
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={phase.duration}
                onChange={(e) => {
                  const updated = [...phases];
                  updated[i].duration = parseInt(e.target.value);
                  setPhases(updated);
                }}
                disabled={!phase.enabled}
                style={{
                  width: '100%',
                  accentColor: '#9d8ff0'
                }}
              />
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                {phase.duration}s
              </div>
              <button
                onClick={() => {
                  const updated = [...phases];
                  updated[i].enabled = !updated[i].enabled;
                  setPhases(updated);
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: phase.enabled ? 'rgba(107,95,207,0.3)' : 'rgba(255,255,255,0.1)',
                  border: phase.enabled ? '1px solid rgba(157,143,240,0.5)' : '1px solid rgba(255,255,255,0.2)',
                  color: phase.enabled ? '#c5bff8' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '0.7rem'
                }}
              >
                {phase.enabled ? '✓' : '+'}
              </button>
            </div>
          ))}

          <div style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            color: '#9d8ff0',
            padding: '0.75rem',
            background: 'rgba(157,143,240,0.1)',
            borderRadius: '12px',
            margin: '1.5rem 0',
            letterSpacing: '0.1em'
          }}>
            {phases.filter(p => p.enabled).map(p => p.duration).join(' · ')}
          </div>

          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '2rem'
          }}>
            {colors.map((color, i) => (
              <div
                key={i}
                onClick={() => setSelectedColor(i)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: color.colors[1],
                  cursor: 'pointer',
                  border: selectedColor === i ? '3px solid #fff' : '2px solid transparent',
                  transform: selectedColor === i ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={saveCustom}
              disabled={!name.trim()}
              style={{
                flex: 1,
                background: name.trim() ? 'linear-gradient(135deg, #6b5fcf, #9d8ff0)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.5
              }}
            >
              Save Pattern
            </button>
            <button
              onClick={() => setShowCustomBuilder(false)}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.7)',
                padding: '0.75rem',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isActive) {
    return (
      <div style={{
        height: "100vh",
        background: "linear-gradient(135deg, #04060f, #0d1228)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        padding: "1rem",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{
          position: "absolute",
          top: "1.5rem",
          left: "1.5rem",
          right: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10
        }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, opacity: 0.7 }}>
            MindShift<span style={{ color: "#9d8ff0" }}>+</span>
          </div>
          <button
            onClick={stopSession}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              padding: "0.5rem 1rem",
              borderRadius: "2rem",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            ← End Session
          </button>
        </div>

        {/* Phase Indicators */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          {currentMode.phases.map((phase, index) => (
            <div
              key={index}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: index === currentPhase ? phase.color : "rgba(255,255,255,0.2)",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </div>

        {/* Main Orb */}
        <div style={{
          width: "min(60vw, 280px)",
          height: "min(60vw, 280px)",
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, ${currentPhaseData.color}aa, ${currentPhaseData.color}66, ${currentPhaseData.color}33)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${getOrbScale()})`,
          transition: "all 1s ease-in-out",
          boxShadow: `0 0 60px ${currentPhaseData.color}44`,
          marginBottom: "2rem",
          position: "relative"
        }}>
          <div style={{
            fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
            fontWeight: 300,
            marginBottom: "0.5rem",
            opacity: 0.9
          }}>
            {currentPhaseData.name}
          </div>
          <div style={{
            fontSize: "clamp(2.5rem, 8vw, 4rem)",
            fontWeight: 300,
            lineHeight: 1
          }}>
            {countdown}
          </div>
        </div>

        {/* Phase Strip */}
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "2rem",
          overflow: "hidden",
          marginBottom: "2rem",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          {currentMode.phases.map((phase, index) => (
            <div
              key={index}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.75rem",
                color: index === currentPhase ? "#fff" : "rgba(255,255,255,0.4)",
                background: index === currentPhase ? "rgba(107,95,207,0.3)" : "transparent",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap"
              }}
            >
              {phase.name}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
          flexWrap: "wrap"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 300 }}>{cycles}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cycles</div>
          </div>
          <div style={{ width: "1px", height: "28px", background: "rgba(255,255,255,0.2)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 300 }}>{formatTime(timeElapsed)}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Elapsed</div>
          </div>
          <div style={{ width: "1px", height: "28px", background: "rgba(255,255,255,0.2)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 300 }}>{formatTime(Math.max(0, selectedDuration * 60 - timeElapsed))}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Remaining</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          position: "absolute",
          bottom: "2rem",
          right: "2rem",
          display: "flex",
          gap: "0.5rem"
        }}>
          <button
            onClick={togglePause}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem"
            }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: soundEnabled ? "rgba(107,95,207,0.3)" : "rgba(255,255,255,0.1)",
              border: soundEnabled ? "1px solid rgba(157,143,240,0.5)" : "1px solid rgba(255,255,255,0.2)",
              color: soundEnabled ? "#c5bff8" : "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem"
            }}
          >
            {soundEnabled ? '♪' : '♩'}
          </button>
        </div>

        {/* Ambient Sound Label */}
        {soundEnabled && (
          <div style={{
            position: "absolute",
            bottom: "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <div style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "rgba(157,143,240,0.6)",
              animation: "pulse 2s ease-in-out infinite"
            }} />
            Ambient tones active
          </div>
        )}

        {/* Instruction */}
        <div style={{
          position: "absolute",
          bottom: "4rem",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "1rem",
          fontStyle: "italic",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
          maxWidth: "80%"
        }}>
          Follow the orb. Let your breath do the rest.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #04060f, #0d1228)",
      color: "#fff",
      padding: "2rem 1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "3rem",
        maxWidth: "600px"
      }}>
        <div style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#9d8ff0",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem"
        }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(157,143,240,0.3)" }} />
          Breathe
          <div style={{ flex: 1, height: "1px", background: "rgba(157,143,240,0.3)" }} />
        </div>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 300,
          lineHeight: 1.1,
          marginBottom: "0.5rem",
          letterSpacing: "-0.02em"
        }}>
          Choose your <em style={{ fontStyle: "italic", color: "#c5bff8" }}>breath</em>
        </h1>
        <p style={{
          fontSize: "0.9rem",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.7,
          marginBottom: "0"
        }}>
          Each technique is a different doorway to calm.<br />
          Pick what your body is asking for right now.
        </p>
      </div>

      {/* Mode Selection */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1rem",
        maxWidth: "900px",
        width: "100%",
        marginBottom: "1rem"
      }}>
        {Object.entries(breathingModes).map(([key, mode]) => (
          <div
            key={key}
            onClick={() => setSelectedMode(key)}
            style={{
              background: selectedMode === key ? "rgba(107,95,207,0.15)" : "rgba(255,255,255,0.04)",
              border: selectedMode === key ? "1px solid rgba(157,143,240,0.7)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "1.5rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              transform: selectedMode === key ? "translateY(-2px)" : "translateY(0)",
              position: "relative"
            }}
          >
            {mode.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const updated = customModes.filter(m => m.id !== key);
                  saveCustomModes(updated);
                  if (selectedMode === key) setSelectedMode('box');
                }}
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(220,50,50,0.2)",
                  border: "1px solid rgba(220,50,50,0.4)",
                  color: "#ff8080",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            )}
            <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{mode.icon}</div>
            <div style={{
              fontSize: "1.1rem",
              fontWeight: 400,
              color: "rgba(255,255,255,0.9)",
              marginBottom: "0.3rem"
            }}>
              {mode.name}
            </div>
            <div style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem"
            }}>
              {mode.pattern}
            </div>
            <div style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5
            }}>
              {mode.description}
            </div>
          </div>
        ))}
        
        {/* Create Custom Button */}
        <div
          onClick={() => setShowCustomBuilder(true)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "2px dashed rgba(157,143,240,0.3)",
            borderRadius: "20px",
            padding: "1.5rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem", color: "rgba(157,143,240,0.5)" }}>+</div>
          <div style={{
            fontSize: "1.1rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            marginBottom: "0.3rem"
          }}>
            Create Custom
          </div>
          <div style={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.5
          }}>
            Build your own breathing pattern
          </div>
        </div>
      </div>

      {/* Duration Selection */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "2.5rem",
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <span style={{
          fontSize: "0.8rem",
          color: "rgba(255,255,255,0.5)",
          marginRight: "0.5rem"
        }}>
          Duration
        </span>
        {[3, 5, 10].map(duration => (
          <button
            key={duration}
            onClick={() => setSelectedDuration(duration)}
            style={{
              background: selectedDuration === duration ? "rgba(107,95,207,0.25)" : "rgba(255,255,255,0.05)",
              border: selectedDuration === duration ? "1px solid rgba(157,143,240,0.5)" : "1px solid rgba(255,255,255,0.1)",
              color: selectedDuration === duration ? "#c5bff8" : "rgba(255,255,255,0.6)",
              padding: "0.5rem 1.2rem",
              borderRadius: "2rem",
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {duration} min
          </button>
        ))}
      </div>

      {/* Start Button */}
      <button
        onClick={startSession}
        style={{
          background: "linear-gradient(135deg, #6b5fcf, #9d8ff0)",
          color: "#fff",
          border: "none",
          padding: "1rem 3rem",
          borderRadius: "3rem",
          fontSize: "1rem",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.3s ease",
          letterSpacing: "0.02em",
          boxShadow: "0 8px 32px rgba(107,95,207,0.4)"
        }}
        onMouseOver={(e) => {
          e.target.style.transform = "translateY(-3px) scale(1.03)";
          e.target.style.boxShadow = "0 16px 40px rgba(107,95,207,0.5)";
        }}
        onMouseOut={(e) => {
          e.target.style.transform = "translateY(0) scale(1)";
          e.target.style.boxShadow = "0 8px 32px rgba(107,95,207,0.4)";
        }}
      >
        Begin Session →
      </button>

      {/* Custom Builder Modal */}
      {showCustomBuilder && <CustomBuilder />}

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── CONSTELLATION ──────────────────────────────────────────────────────────────
function Constellation(){
  const [key,setKey]=useState(0);
  const reload=useCallback(()=>setKey(k=>k+1),[]);
  return(
    <div style={{height:"calc(100vh - 60px)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontWeight:700,fontSize:16}}>Constellation</div>
        <div style={{color:"var(--muted)",fontSize:13}}>Mood constellation</div>
        <div style={{marginLeft:"auto"}}><Btn variant="secondary" small onClick={reload}>Reload</Btn></div>
      </div>
      <div style={{flex:1,minHeight:0}}>
        <iframe key={key} title="MindShift+ Constellation" src="/constellation.html"
          style={{border:"none",width:"100%",height:"100%",display:"block",background:"#020409"}}/>
      </div>
    </div>
  )
}

// ── DAILY LIGHT ────────────────────────────────────────────────────────────────
function DailyLight(){
  const [key,setKey]=useState(0);
  const reload=useCallback(()=>setKey(k=>k+1),[]);
  return(
    <div style={{height:"calc(100vh - 60px)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontWeight:700,fontSize:16}}>Daily Light</div>
        <div style={{color:"var(--muted)",fontSize:13}}>Daily card + emotional weather</div>
        <div style={{marginLeft:"auto"}}><Btn variant="secondary" small onClick={reload}>Reload</Btn></div>
      </div>
      <div style={{flex:1,minHeight:0}}>
        <iframe key={key} title="MindShift+ Daily Light" src="/daily-light.html"
          style={{border:"none",width:"100%",height:"100%",display:"block",background:"#04060f"}}/>
      </div>
    </div>
  )
}

// ── PROGRAMS ───────────────────────────────────────────────────────────────────
const PROGRAMS = [
  {id:1,title:"7-Day Anxiety Reset",desc:"Gently rewire your nervous system response with daily mindfulness exercises and reflections.",days:7,icon:"🌊",color:"var(--teal)"},
  {id:2,title:"Confidence Rebuild",desc:"Reconnect with your inner strength through powerful daily affirmations, reflections, and challenges.",days:14,icon:"⚡",color:"var(--gold)"},
  {id:3,title:"30-Day Mind Renewal",desc:"A transformative month-long journey to shift your mindset and build lasting wellbeing habits.",days:30,icon:"🌅",color:"var(--purple)"},
  {id:4,title:"Letting Go & Healing",desc:"Release what no longer serves you. A compassionate program for processing grief, loss, and change.",days:10,icon:"🍃",color:"var(--rose)"},
];

const PROGRAM_CONTENT = {
  1:[
    {title:"Acknowledge What You Feel",lesson:"Our feelings aren't weaknesses — they're information. Today, we practice simply noticing what's present, without trying to fix or change it.",exercise:"Sit quietly for 5 minutes. Notice any emotions present without judgment. Name them gently: 'I notice anxiety.' 'I notice tension.'",prompt:"What emotion have you been avoiding acknowledging lately? What might it be trying to tell you?"},
    {title:"Breathe Through It",lesson:"Your breath is the fastest path to your nervous system. When anxiety rises, your breath is always there — a quiet anchor.",exercise:"Try the 4-7-8 technique: inhale for 4, hold for 7, exhale for 8. Repeat 4 times.",prompt:"When did you last feel truly calm? What was happening around you?"},
    {title:"Name the Story",lesson:"Anxiety often comes from a story we're telling ourselves. Today we learn to separate the story from the facts.",exercise:"Write down one anxious thought. Then write: 'The fact is…' and 'The story I'm adding is…'",prompt:"What story have you been telling yourself that might not be entirely true?"},
    {title:"Ground Yourself",lesson:"Grounding brings you back to the present moment — out of the future where anxiety lives.",exercise:"Try the 5-4-3-2-1 method: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",prompt:"What does it feel like to be fully present, even for a moment?"},
    {title:"Release the Need to Control",lesson:"Much of anxiety comes from trying to control what we can't. Today we practice letting go.",exercise:"Write a list of things worrying you. Circle only what you can control. Let the rest go — literally cross them out.",prompt:"What would change if you trusted that things will work out, even if not perfectly?"},
    {title:"Compassion for Yourself",lesson:"You wouldn't speak to a friend the way you speak to yourself. Today, we change that.",exercise:"Write yourself a letter from the perspective of your most compassionate friend.",prompt:"What do you need to hear right now that you haven't been saying to yourself?"},
    {title:"Your New Baseline",lesson:"You've done the work. Today we celebrate and set an intention for carrying this forward.",exercise:"Reflect on the past 7 days. Write 3 things that shifted, even slightly.",prompt:"What is one thing you'll carry from this week into the rest of your life?"},
  ],
  2:[{title:"Know Your Worth",lesson:"Confidence isn't something you find — it's something you build, one small act at a time.",exercise:"Write 5 things you've done that you're genuinely proud of, no matter how small.",prompt:"When do you feel most like yourself?"}],
  3:[{title:"The First Step",lesson:"A 30-day journey begins with a single honest moment. Today, we just show up.",exercise:"Write one sentence about where you are right now — no judgment, just truth.",prompt:"What does 'renewal' mean to you personally?"}],
  4:[{title:"What Are You Carrying?",lesson:"Healing begins when we name what we're holding. You don't have to carry it alone.",exercise:"Write down everything you're holding onto — grief, anger, disappointment. Just get it out.",prompt:"What would it feel like to set one of these things down, even temporarily?"}],
};

function Programs(){
  const { user: authUser } = useAuth();
  const [progress, setProgress] = useState({}); // { programId: currentDay }
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(()=>{
    if(!authUser) return;
    import("./lib/db.js").then(({ getProgramProgress })=>{
      getProgramProgress(authUser.id).then(({ data })=>{
        if(data){
          const map = {};
          data.forEach(r => { map[r.program_id] = r.current_day; });
          setProgress(map);
        }
        setLoading(false);
      });
    });
  },[authUser]);

  const startProgram = async (programId) => {
    if(!authUser) return;
    const { upsertProgramProgress } = await import("./lib/db.js");
    await upsertProgramProgress(authUser.id, programId, 0);
    setProgress(p => ({ ...p, [programId]: 0 }));
    setActive(programId);
  };

  const markComplete = async () => {
    if(!authUser || active === null) return;
    setCompleting(true);
    const prog = PROGRAMS.find(p => p.id === active);
    const currentDay = progress[active] ?? 0;
    const nextDay = Math.min(currentDay + 1, prog.days);
    const { upsertProgramProgress } = await import("./lib/db.js");
    await upsertProgramProgress(authUser.id, active, nextDay);
    setProgress(p => ({ ...p, [active]: nextDay }));
    setCompleting(false);
    if(nextDay >= prog.days) setActive(null); // finished
  };

  const prog = PROGRAMS.find(p => p.id === active);
  const currentDay = active ? (progress[active] ?? 0) : 0;
  const dayContent = active ? (PROGRAM_CONTENT[active]?.[currentDay] ?? PROGRAM_CONTENT[active]?.[0]) : null;

  if(active && prog && dayContent){
    const isComplete = currentDay >= prog.days;
    return(
      <div style={{padding:"2rem",maxWidth:700,margin:"0 auto"}}>
        <button onClick={()=>setActive(null)} style={{background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer",marginBottom:"1rem",display:"flex",alignItems:"center",gap:6,fontSize:14}}>← Back to Programs</button>
        <GlassCard style={{border:"1px solid rgba(124,111,247,0.3)",marginBottom:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontSize:32}}>{prog.icon}</span>
            <div>
              <h2 style={{fontWeight:700,fontSize:"1.2rem"}}>{prog.title}</h2>
              <div style={{color:"var(--muted)",fontSize:13}}>
                {isComplete ? "✓ Completed!" : `Day ${currentDay + 1} of ${prog.days}`}
              </div>
            </div>
          </div>
          <ProgressBar value={(currentDay / prog.days) * 100} color={prog.color}/>
        </GlassCard>
        {isComplete ? (
          <GlassCard style={{textAlign:"center",padding:"2.5rem",border:"1px solid rgba(78,205,196,0.3)"}}>
            <div style={{fontSize:48,marginBottom:12}}>🌟</div>
            <h3 style={{fontWeight:700,marginBottom:8}}>You completed {prog.title}!</h3>
            <p style={{color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>That took real commitment. Be proud of yourself.</p>
            <Btn onClick={()=>setActive(null)}>← Back to Programs</Btn>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={{marginBottom:"1rem"}}><div style={{color:"var(--lavender)",fontSize:12,fontWeight:600,marginBottom:6}}>TODAY'S LESSON</div><h3 style={{fontWeight:600,marginBottom:8}}>{dayContent.title}</h3><p style={{color:"var(--muted)",lineHeight:1.7,fontSize:14}}>{dayContent.lesson}</p></GlassCard>
            <GlassCard style={{marginBottom:"1rem"}}><div style={{color:"var(--teal)",fontSize:12,fontWeight:600,marginBottom:6}}>EXERCISE</div><p style={{color:"var(--muted)",lineHeight:1.7,fontSize:14}}>{dayContent.exercise}</p></GlassCard>
            <GlassCard style={{marginBottom:"1.5rem"}}><div style={{color:"var(--rose)",fontSize:12,fontWeight:600,marginBottom:6}}>REFLECTION PROMPT</div><p style={{color:"var(--muted)",lineHeight:1.7,fontSize:14,fontStyle:"italic"}}>"{dayContent.prompt}"</p></GlassCard>
            <Btn onClick={markComplete} disabled={completing} style={{width:"100%",justifyContent:"center",padding:14}}>
              {completing ? "Saving…" : `✓ Mark Day ${currentDay + 1} Complete`}
            </Btn>
          </>
        )}
      </div>
    );
  }

  return(
    <div style={{padding:"2rem",maxWidth:800,margin:"0 auto"}}>
      <h1 style={{fontSize:"1.8rem",fontWeight:700,marginBottom:4}}>Wellness Programs</h1>
      <p style={{color:"var(--muted)",marginBottom:"1.5rem"}}>Structured journeys to help you grow, one day at a time.</p>
      {loading ? (
        <div style={{textAlign:"center",padding:"3rem",color:"var(--muted)"}}>Loading your programs…</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem"}}>
          {PROGRAMS.map(p=>{
            const done = progress[p.id] ?? null;
            const started = done !== null;
            const finished = done >= p.days;
            return(
              <GlassCard key={p.id} style={{cursor:"pointer"}} onClick={()=>started ? setActive(p.id) : null}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <span style={{fontSize:28}}>{p.icon}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {finished && <Badge color="teal">✓ Done</Badge>}
                    <Badge color={p.color===var_("--teal")?"teal":p.color===var_("--rose")?"rose":p.color===var_("--gold")?"gold":"purple"}>{p.days} days</Badge>
                  </div>
                </div>
                <h3 style={{fontWeight:700,marginBottom:6,fontSize:15}}>{p.title}</h3>
                <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.6,marginBottom:12}}>{p.desc}</p>
                {started && !finished &&(
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:"var(--muted)"}}>Progress</span>
                      <span style={{color:"var(--muted)"}}>{done}/{p.days} days</span>
                    </div>
                    <ProgressBar value={(done/p.days)*100} color={p.color}/>
                  </div>
                )}
                <Btn small variant={started && !finished?"primary":"secondary"} style={{width:"100%",justifyContent:"center"}}
                  onClick={(e)=>{ e.stopPropagation(); started ? setActive(p.id) : startProgram(p.id); }}>
                  {finished ? "Review Program" : started ? "Continue →" : "Start Program"}
                </Btn>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── INSIGHTS ───────────────────────────────────────────────────────────────────
// ── INSIGHTS ───────────────────────────────────────────────────────────────────
function Insights({ setPage }){
  const { user: authUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if(!authUser) return;
    import("./lib/db.js").then(({ getInsights })=>{
      getInsights(authUser.id).then(res => { setData(res); setLoading(false); });
    });
  },[authUser]);

  if(loading) return(
    <div style={{padding:"2rem",maxWidth:900,margin:"0 auto"}}>
      <h1 style={{fontSize:"1.8rem",fontWeight:700,marginBottom:4}}>Your Insights</h1>
      <div style={{textAlign:"center",padding:"4rem",color:"var(--muted)"}}>Loading your insights…</div>
    </div>
  );

  if(!data?.hasData) return(
    <div style={{padding:"2rem",maxWidth:900,margin:"0 auto"}}>
      <h1 style={{fontSize:"1.8rem",fontWeight:700,marginBottom:4}}>Your Insights</h1>
      <GlassCard style={{textAlign:"center",padding:"3rem"}}>
        <div style={{fontSize:36,marginBottom:12}}>◐</div>
        <div style={{fontWeight:600,marginBottom:8}}>No data yet</div>
        <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.7}}>Log your mood and write journal entries to start seeing your patterns here.</p>
      </GlassCard>
    </div>
  );

  const maxMood = 4;
  const moodEmojis = ["😔","😐","🙂","😊","🌟"];

  return(
    <div style={{padding:"2rem",maxWidth:900,margin:"0 auto"}}>
      <h1 style={{fontSize:"1.8rem",fontWeight:700,marginBottom:4}}>Your Insights</h1>
      <p style={{color:"var(--muted)",marginBottom:"1.5rem"}}>Patterns, growth, and what your data reveals about you.</p>

      {/* Mood chart */}
      <GlassCard style={{marginBottom:"1.2rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div style={{fontWeight:600}}>Mood This Week</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{data.weekMoodCount} check-in{data.weekMoodCount!==1?"s":""}</div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100}}>
          {data.dayLabels.map((day,i)=>{
            const val = data.moodChart[i];
            return(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                {val !== null ? (
                  <div title={moodEmojis[val]} style={{width:"100%",background:"linear-gradient(180deg,var(--purple),var(--teal))",borderRadius:"4px 4px 0 0",height:`${(val/maxMood)*80}px`,transition:"height .5s ease",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:2,fontSize:10}}>
                    {moodEmojis[val]}
                  </div>
                ) : (
                  <div style={{width:"100%",background:"rgba(255,255,255,0.05)",borderRadius:"4px 4px 0 0",height:4}}/>
                )}
                <div style={{fontSize:11,color:"var(--muted2)"}}>{day}</div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1rem",marginBottom:"1.2rem"}}>
        {/* Tags */}
        <GlassCard>
          <div style={{fontWeight:600,marginBottom:12}}>Journal Tags</div>
          {data.topTags.length === 0 ? (
            <div style={{color:"var(--muted)",fontSize:13}}>No tags yet — add tags when writing journal entries.</div>
          ) : (
            data.topTags.map(t=>{
              const max = data.topTags[0].count;
              return(
                <div key={t.name} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                    <span>{t.name}</span><span style={{color:"var(--muted)"}}>{t.count}×</span>
                  </div>
                  <ProgressBar value={(t.count/max)*100} color={t.color}/>
                </div>
              );
            })
          )}
        </GlassCard>

        {/* Mia's Insight */}
        <GlassCard style={{background:"linear-gradient(135deg,rgba(124,111,247,0.1),rgba(78,205,196,0.07))"}}>
          <div style={{fontWeight:600,marginBottom:8}}>✦ Your Numbers</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {label:"Journal entries",val:data.journalCount,color:"var(--lavender)"},
              {label:"Mood check-ins",val:data.weekMoodCount,color:"var(--teal)"},
              {label:"Positive tags",val:data.positiveCount,color:"var(--teal)"},
              {label:"Stress tags",val:data.stressCount,color:"var(--rose)"},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center",padding:"8px",borderRadius:10,background:"rgba(255,255,255,0.04)"}}>
                <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{s.label}</div>
              </div>
            ))}
          </div>
          {data.moodTrend !== null && (
            <div style={{textAlign:"center",padding:"8px",borderRadius:10,background:data.moodTrend>=0?"rgba(78,205,196,0.1)":"rgba(240,147,160,0.1)"}}>
              <div style={{fontSize:18,fontWeight:700,color:data.moodTrend>=0?"var(--teal)":"var(--rose)"}}>
                {data.moodTrend>=0?"↑":"↓"} {Math.abs(data.moodTrend)}%
              </div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Mood vs last week</div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* What's improving / needs care */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"1rem"}}>
        <GlassCard style={{border:"1px solid rgba(78,205,196,0.3)"}}>
          <div style={{color:"var(--teal)",fontWeight:600,marginBottom:10}}>✓ What's Improving</div>
          {data.improving.length === 0 ? (
            <div style={{color:"var(--muted)",fontSize:13}}>Keep logging to see your progress here.</div>
          ) : (
            data.improving.map(x=>(
              <div key={x} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:13,color:"var(--muted)"}}>
                <span style={{color:"var(--teal)"}}>✓</span>{x}
              </div>
            ))
          )}
        </GlassCard>
        <GlassCard style={{border:"1px solid rgba(240,147,160,0.3)"}}>
          <div style={{color:"var(--rose)",fontWeight:600,marginBottom:10}}>◈ Needs Some Care</div>
          {data.needsCare.length === 0 ? (
            <div style={{color:"var(--muted)",fontSize:13}}>Nothing flagged — you're doing great.</div>
          ) : (
            data.needsCare.map(x=>(
              <div key={x} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:13,color:"var(--muted)"}}>
                <span style={{color:"var(--rose)"}}>◈</span>{x}
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* Mia Reflection — emotional pattern detection from journal tags */}
      <GlassCard style={{marginTop:"1.2rem",background:"linear-gradient(135deg,rgba(124,111,247,0.12),rgba(78,205,196,0.07))",border:"1px solid rgba(124,111,247,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"var(--grad2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>◎</div>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>Mia's Reflection</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Emotional patterns from your journal</div>
          </div>
        </div>
        {data.topTags.length === 0 ? (
          <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.7}}>
            Start adding tags to your journal entries and I'll reflect on the emotional patterns I notice. Tags like <em>Anxiety</em>, <em>Gratitude</em>, and <em>Stress</em> help me understand what you're working through.
          </p>
        ) : (
          <>
            <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.7,marginBottom:12}}>
              {(()=>{
                const topTag = data.topTags[0]?.name;
                const stressTags = data.topTags.filter(t=>["Anxiety","Stress"].includes(t.name));
                const positiveTags = data.topTags.filter(t=>["Gratitude","Joy","Breakthrough","Healing"].includes(t.name));
                const hasStress = stressTags.length > 0;
                const hasPositive = positiveTags.length > 0;
                if(hasStress && hasPositive){
                  return `I'm noticing a mix of tension and growth in your entries — you're carrying some ${stressTags.map(t=>t.name.toLowerCase()).join(" and ")}, but also moments of ${positiveTags.map(t=>t.name.toLowerCase()).join(" and ")}. That balance takes real awareness.`;
                } else if(hasStress){
                  return `Your recent entries show a pattern around ${stressTags.map(t=>t.name.toLowerCase()).join(" and ")}. That's worth acknowledging — you're not ignoring it, and that matters. Consider bringing this up with your clinician or exploring it with me.`;
                } else if(hasPositive){
                  return `There's a lot of ${positiveTags.map(t=>t.name.toLowerCase()).join(" and ")} showing up in your journal lately. That's meaningful — you're actively noticing the good, even when things are hard.`;
                } else {
                  return `Your most frequent theme is "${topTag}" — you're showing up consistently and that's the foundation of real growth. Keep writing.`;
                }
              })()}
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {data.topTags.slice(0,5).map(t=>(
                <span key={t.name} style={{padding:"4px 12px",borderRadius:20,fontSize:12,background:"rgba(124,111,247,0.15)",color:"var(--lavender)",border:"1px solid rgba(124,111,247,0.25)"}}>
                  {t.name} <span style={{opacity:0.6}}>×{t.count}</span>
                </span>
              ))}
            </div>
            <button onClick={()=>{ if(typeof setPage==="function") setPage("mia"); }} style={{background:"transparent",border:"1px solid rgba(124,111,247,0.4)",borderRadius:20,padding:"6px 16px",color:"var(--lavender)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Talk to Mia about this →
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}

// ── PREMIUM ────────────────────────────────────────────────────────────────────
function Premium(){
  const freeFeats=["Daily mood check-in","5 journal entries/month","Basic breathing (2 modes)","Limited Mia chat (10/day)","1 wellness program"];
  const proFeats=["Unlimited Mia AI coaching","Advanced journal insights & AI patterns","Full emotional trend analytics","Complete breathing library (all modes)","All wellness programs","Premium audio content","Secure journal vault","Ad-free, distraction-free experience","Export your journal","Priority support"];
  const [yearly,setYearly]=useState(true);
  return(
    <div style={{padding:"2rem",maxWidth:800,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <Badge color="purple">◆ Premium</Badge>
        <h1 style={{fontSize:"2rem",fontWeight:700,margin:"1rem 0 0.5rem"}}>Invest in your wellbeing</h1>
        <p style={{color:"var(--muted)",maxWidth:480,margin:"0 auto",lineHeight:1.7}}>Unlock the full MindShift+ experience — deeper insights, unlimited support, and everything you need to thrive.</p>
        <div style={{display:"inline-flex",marginTop:"1.5rem",background:"var(--card)",borderRadius:30,padding:4,gap:4}}>
          <button onClick={()=>setYearly(false)} style={{padding:"8px 20px",borderRadius:26,border:"none",background:!yearly?"var(--card2)":"transparent",color:!yearly?"var(--white)":"var(--muted)",fontSize:13,cursor:"pointer",transition:"all .2s"}}>Monthly</button>
          <button onClick={()=>setYearly(true)} style={{padding:"8px 20px",borderRadius:26,border:"none",background:yearly?"var(--grad1)":"transparent",color:yearly?"#fff":"var(--muted)",fontSize:13,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>Yearly <span style={{fontSize:10,background:"rgba(255,255,255,0.2)",padding:"2px 7px",borderRadius:20}}>Save 40%</span></button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:"1.5rem",marginBottom:"2rem"}}>
        {/* Free */}
        <GlassCard>
          <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>Free</div>
          <div style={{fontSize:32,fontWeight:700,marginBottom:4}}>$0<span style={{fontSize:14,color:"var(--muted)",fontWeight:400}}>/forever</span></div>
          <div style={{color:"var(--muted)",fontSize:13,marginBottom:"1.5rem"}}>A gentle start to your wellness journey.</div>
          {freeFeats.map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,fontSize:13,color:"var(--muted)"}}><span style={{color:"var(--teal)"}}>✓</span>{f}</div>)}
          <Btn variant="secondary" style={{width:"100%",justifyContent:"center",marginTop:"1.5rem"}}>Current Plan</Btn>
        </GlassCard>
        {/* Premium */}
        <GlassCard style={{border:"1px solid rgba(124,111,247,0.5)",background:"linear-gradient(160deg,rgba(124,111,247,0.15),rgba(78,205,196,0.08))",premium:true}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{fontWeight:700,fontSize:18}}>Premium</div>
            <Badge color="purple">Most Popular</Badge>
          </div>
          <div style={{fontSize:32,fontWeight:700,marginBottom:4}}>{yearly?"$7.99":"$12.99"}<span style={{fontSize:14,color:"var(--muted)",fontWeight:400}}>/month</span></div>
          {yearly&&<div style={{color:"var(--teal)",fontSize:12,marginBottom:4}}>Billed $95.88/year · Save $62</div>}
          <div style={{color:"var(--muted)",fontSize:13,marginBottom:"1.5rem"}}>The complete toolkit for lasting change.</div>
          {proFeats.map(f=><div key={f} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,fontSize:13}}><span style={{color:"var(--lavender)"}}>◆</span>{f}</div>)}
          <Btn style={{width:"100%",justifyContent:"center",marginTop:"1.5rem",padding:14,fontSize:15}}>Start 7-Day Free Trial</Btn>
          <div style={{color:"var(--muted2)",fontSize:11,textAlign:"center",marginTop:8}}>No payment until trial ends. Cancel anytime.</div>
        </GlassCard>
      </div>
    </div>
  )
}

// ── SETTINGS ───────────────────────────────────────────────────────────────────
// ── SETTINGS ───────────────────────────────────────────────────────────────────
function Settings({user,setPage,onSignOut}){
  const { user: authUser } = useAuth();
  const { show: showToast, el: toastEl } = useToast();

  // Profile editing
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name||"");
  const [savingName, setSavingName] = useState(false);

  // Notifications — persisted in localStorage
  const [notifs, setNotifs] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("ms_notifs")||"null") || {daily:true,reminders:true,insights:false}; }
    catch{ return {daily:true,reminders:true,insights:false}; }
  });

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const toggleNotif = (k) => {
    const updated = {...notifs,[k]:!notifs[k]};
    setNotifs(updated);
    localStorage.setItem("ms_notifs", JSON.stringify(updated));
    showToast(updated[k] ? "Notification enabled" : "Notification disabled", "info");
  };

  const saveName = async () => {
    if(!nameVal.trim() || !authUser) return;
    setSavingName(true);
    const { updateProfile } = await import("./lib/db.js");
    const { error } = await updateProfile(authUser.id, { full_name: nameVal.trim() });
    // Also update Supabase auth metadata
    const { supabase } = await import("./lib/supabase.js");
    await supabase.auth.updateUser({ data: { full_name: nameVal.trim() } });
    if(!error) showToast("Name updated ✓", "success");
    setSavingName(false);
    setEditingName(false);
  };

  const exportData = async () => {
    if(!authUser) return;
    showToast("Preparing your data…", "info");
    const { supabase } = await import("./lib/supabase.js");
    const [moods, journal, programs, mia] = await Promise.all([
      supabase.from("mood_logs").select("*").eq("user_id", authUser.id),
      supabase.from("journal_entries").select("*").eq("user_id", authUser.id),
      supabase.from("program_progress").select("*").eq("user_id", authUser.id),
      supabase.from("mia_messages").select("*").eq("user_id", authUser.id),
    ]);
    const exportObj = {
      exported_at: new Date().toISOString(),
      user: { name: user?.name, email: user?.email },
      mood_logs: moods.data || [],
      journal_entries: journal.data || [],
      program_progress: programs.data || [],
      mia_conversations: mia.data || [],
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mindshift-plus-data.json"; a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported ✓", "success");
  };

  const deleteAccount = async () => {
    if(deleteInput !== "DELETE" || !authUser) return;
    setDeleting(true);
    const { supabase } = await import("./lib/supabase.js");
    // Delete all user data
    await Promise.all([
      supabase.from("mood_logs").delete().eq("user_id", authUser.id),
      supabase.from("journal_entries").delete().eq("user_id", authUser.id),
      supabase.from("program_progress").delete().eq("user_id", authUser.id),
      supabase.from("mia_messages").delete().eq("user_id", authUser.id),
      supabase.from("affirmations").delete().eq("user_id", authUser.id),
      supabase.from("users").delete().eq("id", authUser.id),
    ]);
    await onSignOut();
    setDeleting(false);
  };

  const memberSince = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString("en-US",{month:"long",year:"numeric"})
    : "Recently";

  const Toggle = ({on, onToggle}) => (
    <button onClick={onToggle} style={{
      width:44,height:24,borderRadius:12,flexShrink:0,cursor:"pointer",
      background:on?"var(--purple)":"var(--card2)",
      border:`1px solid ${on?"var(--purple)":"var(--border)"}`,
      position:"relative",transition:"all .2s",
    }}>
      <div style={{position:"absolute",top:2,left:on?22:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
    </button>
  );

  return(
    <div style={{padding:"1.5rem",maxWidth:600,margin:"0 auto",paddingBottom:100}}>
      {toastEl}
      <h1 style={{fontSize:"1.6rem",fontWeight:700,marginBottom:"1.5rem"}}>Settings</h1>

      {/* Profile */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--muted)",fontSize:11,letterSpacing:1}}>PROFILE</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <Avatar name={user?.name||"U"} size={50}/>
          <div style={{flex:1,minWidth:0}}>
            {editingName ? (
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input
                  value={nameVal}
                  onChange={e=>setNameVal(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&saveName()}
                  autoFocus
                  style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid var(--border2)",borderRadius:10,padding:"8px 12px",color:"var(--white)",fontSize:14,outline:"none"}}
                />
                <Btn small onClick={saveName} disabled={savingName}>{savingName?"…":"Save"}</Btn>
                <Btn small variant="ghost" onClick={()=>{setEditingName(false);setNameVal(user?.name||"");}}>✕</Btn>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontWeight:600,fontSize:16}}>{user?.name||"Friend"}</div>
                <button onClick={()=>setEditingName(true)} style={{background:"transparent",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer",padding:"2px 6px"}}>Edit</button>
              </div>
            )}
            <div style={{color:"var(--muted)",fontSize:12,marginTop:2}}>{user?.email}</div>
            <div style={{color:"var(--muted2)",fontSize:11,marginTop:1}}>Member since {memberSince}</div>
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--muted)",fontSize:11,letterSpacing:1}}>NOTIFICATIONS</div>
        {[
          {key:"daily",  label:"Daily check-in reminder", sub:"Gentle nudge each morning"},
          {key:"reminders", label:"Session reminders",    sub:"Before scheduled sessions"},
          {key:"insights",  label:"Weekly insights",      sub:"Your weekly growth summary"},
        ].map(({key,label,sub})=>(
          <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>{label}</div>
              <div style={{color:"var(--muted)",fontSize:12}}>{sub}</div>
            </div>
            <Toggle on={notifs[key]} onToggle={()=>toggleNotif(key)}/>
          </div>
        ))}
      </GlassCard>

      {/* Subscription */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--muted)",fontSize:11,letterSpacing:1}}>SUBSCRIPTION</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:600}}>Free Plan</div>
            <div style={{color:"var(--muted)",fontSize:13}}>Limited features</div>
          </div>
          <Btn onClick={()=>setPage("premium")} small>Upgrade →</Btn>
        </div>
      </GlassCard>

      {/* Data */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--muted)",fontSize:11,letterSpacing:1}}>YOUR DATA</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>Export my data</div>
              <div style={{color:"var(--muted)",fontSize:12}}>Download all your journal entries, moods, and conversations</div>
            </div>
            <Btn variant="secondary" small onClick={exportData}>Export</Btn>
          </div>
        </div>
      </GlassCard>

      {/* Account */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--muted)",fontSize:11,letterSpacing:1}}>ACCOUNT</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Btn variant="secondary" small style={{justifyContent:"flex-start"}} onClick={onSignOut}>Sign Out</Btn>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard style={{border:"1px solid rgba(240,147,160,0.25)"}}>
        <div style={{fontWeight:600,marginBottom:12,color:"var(--rose)",fontSize:11,letterSpacing:1}}>DANGER ZONE</div>
        {!showDeleteConfirm ? (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>Delete account</div>
              <div style={{color:"var(--muted)",fontSize:12}}>Permanently delete all your data. This cannot be undone.</div>
            </div>
            <Btn variant="danger" small onClick={()=>setShowDeleteConfirm(true)}>Delete</Btn>
          </div>
        ) : (
          <div>
            <p style={{color:"var(--muted)",fontSize:13,marginBottom:12,lineHeight:1.6}}>
              This will permanently delete your account and all data. Type <strong style={{color:"var(--rose)"}}>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={e=>setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(240,147,160,0.3)",borderRadius:10,padding:"10px 14px",color:"var(--white)",fontSize:14,outline:"none",marginBottom:10}}
            />
            <div style={{display:"flex",gap:8}}>
              <Btn variant="danger" small onClick={deleteAccount} disabled={deleteInput!=="DELETE"||deleting}>
                {deleting?"Deleting…":"Confirm Delete"}
              </Btn>
              <Btn variant="ghost" small onClick={()=>{setShowDeleteConfirm(false);setDeleteInput("");}}>Cancel</Btn>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Legal / Disclaimer */}
      <GlassCard>
        <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>Legal &amp; Disclaimer</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <a href="/privacy.html" target="_blank" style={{fontSize:13,color:"var(--lavender)",textDecoration:"none"}}>Privacy Policy ↗</a>
          <a href="/terms.html" target="_blank" style={{fontSize:13,color:"var(--lavender)",textDecoration:"none"}}>Terms of Service ↗</a>
          <button
            onClick={async()=>{
              const { supabase } = await import("./lib/supabase.js");
              const { data:{ user } } = await supabase.auth.getUser();
              if(user){ await supabase.from("disclaimer_acceptances").delete().eq("user_id",user.id); window.location.reload(); }
            }}
            style={{background:"transparent",border:"none",color:"var(--muted)",fontSize:13,cursor:"pointer",textAlign:"left",padding:0}}
          >
            View MindShift+ Disclaimer / Re-read
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ── ABOUT ──────────────────────────────────────────────────────────────────────
function About(){
  const credentials=[
    {icon:"🎓",label:"Education",value:"Walden University (MSN) · Framingham State University (2022)"},
    {icon:"📋",label:"License",value:"Psychiatric Mental Health Nurse Practitioner (PMHNP-BC) · MA License RN2267715 · Exp. 2028-02"},
    {icon:<img src="/logo.png" alt="" style={{width: 16, height: 16, verticalAlign: 'middle'}} />,label:"Role",value:"Psychiatric Mental Health Nurse Practitioner (PMHNP-BC)"},
    {icon:"📍",label:"Locations",value:"31 Granite St. Suite #2, Milford, MA 01757 · 100 Cambridge St. 14th Fl, Boston, MA 02114"},
    {icon:"📞",label:"Phone",value:"(508) 306-1128"},
    {icon:"✉️",label:"Email",value:"info@mindshiftwellnessclinic.org"},
    {icon:"💳",label:"Session Fee",value:"$150 per session · Initial: $400"},
  ];

  const specialties=[
    "Anxiety","Depression","Trauma","ADHD","Addiction","Anger Management",
    "Bipolar Disorder","BPD","OCD","Mood Disorders","Life Transitions",
    "Medication Management","Personality Disorders","Relationship Issues",
  ];

  const therapyTypes=[
    "Cognitive Behavioral (CBT)","Dialectical Behavior (DBT)","Christian Counseling",
    "Compassion Focused","Culturally Sensitive","Family / Marital",
    "Interpersonal","Motivational Interviewing",
  ];

  const insurance=[
    "Aetna","Cigna & Evernorth","Horizon BCBS","Independence Blue Cross",
    "Meritain Health","Quest Behavioral Health","UnitedHealthcare UHC | UBH",
    "1199SEIU","Carelon Behavioral Health","Coventry","GEHA",
  ];

  return(
    <div style={{padding:"1.5rem",maxWidth:860,margin:"0 auto",paddingBottom:100}}>
      {/* Hero card */}
      <GlassCard style={{
        background:"linear-gradient(135deg,rgba(124,111,247,0.15),rgba(78,205,196,0.1))",
        border:"1px solid rgba(124,111,247,0.3)",
        marginBottom:"1.2rem",
        display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap",
      }}>
        <div style={{
          width:80,height:80,borderRadius:"50%",
          background:"var(--grad2)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:36,flexShrink:0,
        }}>👨🏾‍⚕️</div>
        <div style={{flex:1,minWidth:200}}>
          <h1 style={{fontSize:"clamp(1.3rem,4vw,1.8rem)",fontWeight:700,marginBottom:4}}>Kenneth Mutegyeki</h1>
          <div style={{color:"var(--lavender)",fontSize:14,marginBottom:8}}>Psychiatric Mental Health Nurse Practitioner (PMHNP-BC)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            <Badge color="purple">PMHNP-BC</Badge>
            <Badge color="teal">15+ Years Experience</Badge>
            <Badge color="gold">Verified by Psychology Today</Badge>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
          <Btn small onClick={()=>setPage("schedule")}>Book a Session →</Btn>
          <div style={{color:"var(--teal)",fontSize:12}}>✓ Accepting new clients</div>
          <div style={{color:"var(--muted)",fontSize:11}}>Free 15-min intro call available</div>
        </div>
      </GlassCard>

      {/* Personal statement */}
      <GlassCard style={{marginBottom:"1.2rem"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:"var(--lavender)"}}>Personal Statement</div>
        <p style={{color:"var(--muted)",lineHeight:1.8,fontSize:14,fontFamily:"var(--serif)",fontStyle:"italic"}}>
          "I am a compassionate PMHNP with 15 years of diverse nursing experience, specializing in psychiatric assessment, diagnosis, and evidence-based treatment. I provide culturally competent, trauma-informed care, supporting holistic wellness, recovery, and improved quality of life across the lifespan."
        </p>
        <p style={{color:"var(--muted)",lineHeight:1.8,fontSize:14,marginTop:12}}>
          My ideal clients are children up to adults facing anxiety, depression, trauma, mood disorders, or life transitions. I help with assessment, medication management, and supportive therapy — focused on helping you feel heard, understood, and empowered while building practical tools for lasting emotional wellness.
        </p>
      </GlassCard>

      {/* Credentials grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"0.75rem",marginBottom:"1.2rem"}}>
        {credentials.map(c=>(
          <GlassCard key={c.label} style={{padding:"1rem"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:20,flexShrink:0}}>{c.icon}</span>
              <div>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{c.label}</div>
                <div style={{fontSize:13,lineHeight:1.5}}>{c.value}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Specialties */}
      <GlassCard style={{marginBottom:"1.2rem"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"var(--lavender)"}}>Specialties &amp; Expertise</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {specialties.map(s=>(
            <span key={s} style={{
              padding:"5px 12px",borderRadius:20,fontSize:12,
              background:"rgba(124,111,247,0.15)",color:"var(--lavender)",
              border:"1px solid rgba(124,111,247,0.25)",
            }}>{s}</span>
          ))}
        </div>
      </GlassCard>

      {/* Therapy types */}
      <GlassCard style={{marginBottom:"1.2rem"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"var(--teal)"}}>Treatment Approaches</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {therapyTypes.map(t=>(
            <span key={t} style={{
              padding:"5px 12px",borderRadius:20,fontSize:12,
              background:"rgba(78,205,196,0.12)",color:"var(--teal)",
              border:"1px solid rgba(78,205,196,0.25)",
            }}>{t}</span>
          ))}
        </div>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:12,lineHeight:1.6}}>
          Evidence-based treatments including medication management, supportive therapy, CBT-informed care, and trauma-informed approaches. Your experience will be collaborative, respectful, and personalized.
        </p>
      </GlassCard>

      {/* Client focus */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"0.75rem",marginBottom:"1.2rem"}}>
        <GlassCard>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--gold)"}}>Who I Work With</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
            Individuals · Couples · Families<br/>
            Toddlers through Elders (65+)<br/>
            Faith Orientation: Christian<br/>
            Black &amp; African American · Hispanic &amp; Latino
          </div>
        </GlassCard>
        <GlassCard>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--gold)"}}>Availability</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
            ✓ Accepting new clients<br/>
            ✓ In-person &amp; online sessions<br/>
            ✓ Flexible weekday evenings<br/>
            ✓ Free 15-min intro call
          </div>
        </GlassCard>
      </div>

      {/* Insurance */}
      <GlassCard style={{marginBottom:"1.2rem"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"var(--rose)"}}>Insurance Accepted</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {insurance.map(ins=>(
            <span key={ins} style={{
              padding:"5px 12px",borderRadius:20,fontSize:12,
              background:"rgba(240,147,160,0.12)",color:"var(--rose)",
              border:"1px solid rgba(240,147,160,0.25)",
            }}>{ins}</span>
          ))}
        </div>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:12}}>
          Also accepts: American Express, Cash, Check, Discover, HSA, Mastercard, Venmo, Visa, Zelle. Self-pay options available.
        </p>
      </GlassCard>

      {/* CTA */}
      <GlassCard style={{
        background:"linear-gradient(135deg,rgba(124,111,247,0.2),rgba(240,147,160,0.15))",
        border:"1px solid rgba(124,111,247,0.3)",
        textAlign:"center",padding:"2rem",
      }}>
        <div style={{fontSize:32,marginBottom:8}}>🌿</div>
        <h2 style={{marginBottom:8,fontSize:"1.2rem"}}>Ready to take the first step?</h2>
        <p style={{color:"var(--muted)",fontSize:13,marginBottom:"1.2rem",lineHeight:1.7}}>
          Reach out today to schedule your free 15-minute intro call. Your journey toward lasting emotional wellness starts here.
        </p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn onClick={()=>setPage("schedule")}>Book a Session →</Btn>
          <Btn variant="secondary" onClick={()=>window.location.href="mailto:info@mindshiftwellnessclinic.org"}>Send an Email</Btn>
        </div>
      </GlassCard>
    </div>
  );
}

// ── APP SHELL ──────────────────────────────────────────────────────────────────
export default function App(){
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState("landing");
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Role-based access: owners + any clinician_roles member
  const isClinician = useIsClinicianOrAdmin(user);
  const patientHome = usePatientHome(user, isClinician);
  const handleOpenPortal = useCallback((subPage) => openPortalPage(setPage, subPage), []);

  // Check disclaimer acceptance when user logs in
  useEffect(()=>{
    if (!user) { setDisclaimerChecked(false); return; }
    hasAcceptedDisclaimer(user.id).then(accepted => {
      if (!accepted) setShowDisclaimer(true);
      else setDisclaimerChecked(true);
    });
  },[user?.id]);

  // Derive display name from Supabase user metadata
  const appUser = user ? {
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Friend",
    email: user.email,
  } : null;

  // Once signed in go to dashboard; only redirect to landing after loading is confirmed done
  useEffect(()=>{
    if(loading) return; // wait — don't act until session is resolved
    if(user && (page==="landing" || page==="onboarding")){
      // Check if there was an intent stored before login
      try{
        const intent = sessionStorage.getItem('ms_intent');
        if(intent==='portal'){ sessionStorage.removeItem('ms_intent'); setPage('portal'); return; }
        if(intent==='schedule'){ sessionStorage.removeItem('ms_intent'); setPage('schedule'); return; }
      }catch{}
      setPage("dashboard");
      setShowAuth(false);
    }    if(!user && !["landing","portal","schedule"].includes(page)){
      setPage("landing");
    }
  },[user, loading]);

  // Listen for iframe navigation messages + sessionStorage intent from mindshiftplus.html
  useEffect(()=>{
    const onMsg=(e)=>{
      const data=e?.data;
      if(!data||typeof data!=="object")return;
      if(data.type==="mindshift-plus:openAuth") setShowAuth(true);
      if(data.type==="mindshift-plus:navigate") {
        if(data.page==="portal"){
          setPage("portal"); // no auth required — just shows placeholder
        } else if(data.page==="schedule"){
          setPage("schedule");
        } else {
          setPage(data.page);
        }
      }    };
    window.addEventListener("message",onMsg);
    // Check if user came from mindshiftplus.html or patient-portal.html with an intent
    try{
      const intent = sessionStorage.getItem('ms_intent');
      if(intent){
        sessionStorage.removeItem('ms_intent');
        if(intent === 'portal') setPage('portal'); // Portal handles its own auth
        else if(intent === 'schedule') setPage('schedule');
        else setShowAuth(true);
      }
    }catch{}
    return()=>window.removeEventListener("message",onMsg);
  },[]);

  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--navy)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--pearl)", marginBottom: 12 }}>
          MindShift<span style={{ color: "var(--lavender)" }}>+</span>
        </div>
        <div style={{color:"rgba(240,240,255,0.3)",fontSize:13}}>Loading…</div>
      </div>
    </div>
  );

  const needsSidebar = user && !["landing","onboarding"].includes(page);

  // Portal — placeholder, no auth required
  if(page==="portal"){
    return(
      <>
        <GlobalStyles/>
        <Portal onExit={()=>setPage("landing")}/>
      </>
    );
  }

  // Public booking page — no auth required
  if(page==="schedule"){
    return(
      <>
        <GlobalStyles/>
        <PublicBooking onBack={()=>setPage("landing")}/>
      </>
    );
  }

  // MindShift Admin — lookup, notes, Rx, documents (scheduling calendar is in EHR → Schedule)
  if(user && page==="ehr-schedule"){
    return(
      <>
        <GlobalStyles/>
        <AdminSchedule onBack={()=>setPage("clinical")} onOpenDocs={()=>setPage("staff-docs")}/>
      </>
    );
  }

  // EHR — clinician-only Electronic Health Records
  if(page==="ehr"){
    return(
      <>
        <GlobalStyles/>
        <EHR onBack={()=>setPage("clinical")} onOpenDocs={()=>setPage("staff-docs")}/>
      </>
    );
  }

  // AI Scribe — clinician-only AI-powered clinical documentation
  if(page==="ai-scribe"){
    return(
      <>
        <GlobalStyles/>
        <AIScribe onBack={()=>setPage("clinical")} onOpenDocs={()=>setPage("staff-docs")}/>
      </>
    );
  }

  // Staff documentation & help
  if(user && page==="staff-docs"){
    return(
      <>
        <GlobalStyles/>
        <StaffDocs onBack={()=>setPage("clinical")} onOpenTool={(id)=>setPage(id)}/>
      </>
    );
  }

  return(
    <>
      <GlobalStyles/>
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)}/>}
      {/* Disclaimer modal — blocks app until accepted */}
      {showDisclaimer && user && (
        <DisclaimerModal
          userId={user.id}
          onAccept={()=>{ setShowDisclaimer(false); setDisclaimerChecked(true); }}
        />
      )}
      <div style={{display:"flex",minHeight:"100vh"}}>
        {needsSidebar&&(
          <Sidebar
            page={page} setPage={setPage} user={appUser} onSignOut={signOut}
            open={sidebarOpen} onClose={()=>setSidebarOpen(false)}
            isClinician={isClinician}
            homeMode={patientHome.effectiveMode}
            patientContext={patientHome.context}
            onOpenPortal={handleOpenPortal}
          />
        )}
        <main className={`main-content${needsSidebar?" has-sidebar":""}`} style={{
          flex:1, minHeight:"100vh", overflowY:"auto",
        }}>
          {/* Mobile top bar */}
          {needsSidebar&&(
            <div className="mobile-topbar mobile-only" style={{
              position:"sticky",top:0,zIndex:80,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0.9rem 1.2rem",
              background:"rgba(13,18,40,0.97)",backdropFilter:"blur(20px)",
              borderBottom:"1px solid var(--border)",
            }}>
              <button onClick={()=>setSidebarOpen(true)} style={{background:"transparent",border:"none",color:"var(--white)",fontSize:20,cursor:"pointer",padding:4}}>☰</button>
              <SidebarBrand compact />
              <Avatar name={appUser?.name||"U"} size={30}/>
            </div>
          )}
          {(!user || page==="landing") && <Landing/>}
          {user && page==="onboarding" && <Onboarding setPage={setPage} setUser={()=>{}}/>}
          {user && page==="dashboard" && (
            <Dashboard
              user={appUser}
              setPage={setPage}
              isClinician={isClinician}
              homeMode={patientHome.effectiveMode}
              onHomeModeChange={patientHome.setMode}
              patientContext={patientHome.context}
              patientContextLoading={patientHome.loading}
              onOpenPortal={handleOpenPortal}
              showModeToggle={!isClinician && !!patientHome.context?.isClinicPatient}
            />
          )}
          {user && page==="clinical" && isClinician && <ClinicalSuite setPage={setPage} userName={appUser?.name}/>}
          {user && page==="mia" && <Mia/>}
          {user && page==="journal" && <Journal/>}
          {user && page==="breathe" && <Breathe/>}
          {user && page==="constellation" && <Constellation/>}
          {user && page==="dailyLight" && <DailyLight/>}
          {user && page==="programs" && <Programs/>}
          {user && page==="insights" && <Insights setPage={setPage}/>}
          {user && page==="premium" && <Premium/>}
          {user && page==="settings" && <Settings user={appUser} setPage={setPage} onSignOut={signOut}/>}        </main>
        {/* Mobile bottom nav */}
        {needsSidebar&&(
          <div className="mobile-only mobile-bottomnav">
            <BottomNav
              page={page}
              setPage={setPage}
              homeMode={patientHome.effectiveMode}
              patientContext={patientHome.context}
              onOpenPortal={handleOpenPortal}
            />
          </div>
        )}
      </div>
    </>
  )
}
