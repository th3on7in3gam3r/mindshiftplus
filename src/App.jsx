import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./lib/AuthContext";
import AuthModal from "./components/AuthModal";

// ── Fonts ──────────────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --navy:#0a0e1a;--midnight:#0d1228;--indigo:#131b3a;--card:#161e3f;
      --card2:#1a2247;--glass:rgba(255,255,255,0.04);--glass2:rgba(255,255,255,0.07);
      --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.14);
      --purple:#7c6ff7;--lavender:#a89cf5;--teal:#4ecdc4;--rose:#f093a0;
      --gold:#f5c842;--white:#f0f0ff;--muted:rgba(240,240,255,0.5);
      --muted2:rgba(240,240,255,0.3);--success:#4ade80;
      --grad1:linear-gradient(135deg,#7c6ff7,#4ecdc4);
      --grad2:linear-gradient(135deg,#a89cf5,#7c6ff7);
      --grad3:linear-gradient(135deg,#f093a0,#7c6ff7);
      --font:Outfit,sans-serif;--serif:Lora,serif;
    }
    body{background:var(--navy);color:var(--white);font-family:var(--font);min-height:100vh;overflow-x:hidden}
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
const navItems=[
  {id:"dashboard",icon:"⊞",label:"Dashboard"},
  {id:"mia",icon:"◎",label:"Mia"},
  {id:"journal",icon:"◈",label:"Journal"},
  {id:"breathe",icon:"◉",label:"Breathe"},
  {id:"constellation",icon:"✶",label:"Constellation"},
  {id:"dailyLight",icon:"☀",label:"Daily Light"},
  {id:"programs",icon:"◧",label:"Programs"},
  {id:"insights",icon:"◐",label:"Insights"},
  {id:"premium",icon:"◆",label:"Premium"},
  {id:"settings",icon:"◎",label:"Settings"},
];

function Sidebar({page,setPage,user,onSignOut,open,onClose}){
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
        <div style={{padding:"0 1.2rem 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,background:"var(--grad1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MindShift Wellness Clinic</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Where Minds Shift and Healing Begins.</div>
          </div>
          {/* Close button only visible on mobile */}
          <button onClick={onClose} className="mobile-only" style={{background:"transparent",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:4}}>✕</button>
        </div>
        <nav style={{flex:1,padding:"1rem 0.8rem",display:"flex",flexDirection:"column",gap:4,overflowY:"auto"}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);onClose();}} style={{
              display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:12,
              background:page===n.id?"var(--glass2)":"transparent",
              border:page===n.id?"1px solid var(--border2)":"1px solid transparent",
              color:page===n.id?"var(--white)":"var(--muted)",fontSize:14,fontWeight:page===n.id?600:400,
              cursor:"pointer",textAlign:"left",transition:"all .15s"
            }}>
              <span style={{fontSize:15}}>{n.icon}</span>{n.label}
              {n.id==="premium"&&<span style={{marginLeft:"auto",fontSize:10,background:"var(--grad1)",padding:"2px 7px",borderRadius:99,color:"#fff"}}>PRO</span>}
            </button>
          ))}
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
  {id:"dashboard",icon:"⊞",label:"Home"},
  {id:"journal",icon:"◈",label:"Journal"},
  {id:"breathe",icon:"◉",label:"Breathe"},
  {id:"mia",icon:"◎",label:"Mia"},
  {id:"insights",icon:"◐",label:"Insights"},
];

function BottomNav({page,setPage}){
  return(
    <nav style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:90,
      background:"rgba(13,18,40,0.97)",backdropFilter:"blur(20px)",
      borderTop:"1px solid var(--border)",
      display:"flex",alignItems:"center",justifyContent:"space-around",
      padding:"8px 0 max(12px, env(safe-area-inset-bottom))",
    }}>
      {bottomNavItems.map(n=>(
        <button key={n.id} onClick={()=>setPage(n.id)} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          background:"transparent",border:"none",
          color:page===n.id?"var(--lavender)":"var(--muted2)",
          fontSize:10,fontWeight:page===n.id?600:400,
          cursor:"pointer",padding:"4px 12px",borderRadius:10,
          transition:"all .15s",minWidth:52,
        }}>
          <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
          {n.label}
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
function Dashboard({user,setPage}){
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
    <div style={{padding:"1.2rem",maxWidth:900,margin:"0 auto",paddingBottom:"90px"}}>
      {toastEl}
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.2rem",gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{color:"var(--muted)",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{quote}</div>
          <h1 style={{fontSize:"clamp(1.2rem,5vw,1.8rem)",fontWeight:700,marginTop:4}}>{greeting}, {user?.name||"Friend"} ✦</h1>
        </div>
        <GlassCard style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:18}}>🔥</span>
          <div><div style={{fontWeight:700,fontSize:16,color:"var(--gold)"}}>{streak}</div><div style={{color:"var(--muted2)",fontSize:10}}>day streak</div></div>
        </GlassCard>
      </div>

      {/* Mood Check-in */}
      <GlassCard style={{marginBottom:"1rem",background:"linear-gradient(135deg,rgba(124,111,247,0.12),rgba(78,205,196,0.08))"}}>
        <div style={{fontWeight:600,marginBottom:10,fontSize:14}}>How are you feeling right now?</div>
        <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
          {moods.map((m,i)=>(
            <button key={i} onClick={()=>handleMood(i)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"8px 4px",borderRadius:12,
              border:`1px solid ${mood===i?"var(--purple)":"var(--border)"}`,
              background:mood===i?"rgba(124,111,247,0.2)":"var(--glass)",
              cursor:moodSaved?"default":"pointer",transition:"all .15s",
              opacity:moodSaved&&mood!==i?0.4:1,
            }}>
              <span style={{fontSize:22}}>{m}</span>
              <span style={{fontSize:10,color:mood===i?"var(--lavender)":"var(--muted)"}}>{moodLabels[i]}</span>
            </button>
          ))}
        </div>
        {moodSaved&&<p style={{color:"var(--teal)",fontSize:12,marginTop:8}}>✓ Mood logged. Thank you for checking in.</p>}
      </GlassCard>

      {/* Quick Actions */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
        {[
          {icon:"◎",label:"Talk to Mia",sub:"Your AI coach",page:"mia",color:"var(--purple)"},
          {icon:"◈",label:"Journal",sub:"Reflect & grow",page:"journal",color:"var(--teal)"},
          {icon:"◉",label:"Breathe",sub:"Find your calm",page:"breathe",color:"var(--lavender)"},
          {icon:"◧",label:"Programs",sub:"Continue journey",page:"programs",color:"var(--rose)"},
        ].map(a=>(
          <GlassCard key={a.label} onClick={()=>setPage(a.page)} style={{cursor:"pointer",textAlign:"center",padding:"1rem"}}>
            <div style={{fontSize:24,marginBottom:6,color:a.color}}>{a.icon}</div>
            <div style={{fontWeight:600,fontSize:13}}>{a.label}</div>
            <div style={{color:"var(--muted)",fontSize:11,marginTop:2}}>{a.sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* Stats Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
        {[
          {label:"Journal",val:loadingStats?"…":stats.journalCount,icon:"◈"},
          {label:"Mood avg",val:loadingStats?"…":stats.avgMoodEmoji,icon:"◎"},
          {label:"This week",val:loadingStats?"…":stats.thisWeek,icon:"◧"},
        ].map(s=>(
          <GlassCard key={s.label} style={{textAlign:"center",padding:"0.8rem"}}>
            <div style={{fontSize:18,marginBottom:3,color:"var(--lavender)"}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:3}}>{s.val}</div>
            <div style={{color:"var(--muted)",fontSize:11}}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Wellness Progress */}
      <GlassCard style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:600,marginBottom:"0.8rem",fontSize:14}}>Your Wellness Progress</div>
        {!wellness?.hasData ? (
          <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"0.8rem 0"}}>
            Log your mood and write journal entries to start tracking your progress.
          </div>
        ) : (
          [
            {label:"Emotional Regulation", pct:wellness.emotionalReg, color:"var(--purple)"},
            {label:"Stress Management",    pct:wellness.stressScore,   color:"var(--teal)"},
            {label:"Self-Awareness",       pct:wellness.selfAwareness, color:"var(--lavender)"},
          ].map(p=>(
            <div key={p.label} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                <span>{p.label}</span>
                <span style={{color:"var(--muted)"}}>{p.pct===null?"—":`${p.pct}%`}</span>
              </div>
              <ProgressBar value={p.pct??0} color={p.color}/>
            </div>
          ))
        )}
      </GlassCard>

      {/* Premium Banner */}
      <GlassCard style={{background:"linear-gradient(135deg,rgba(124,111,247,0.2),rgba(240,147,160,0.15))",border:"1px solid rgba(124,111,247,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>◆ Unlock MindShift+ Premium</div>
            <div style={{color:"var(--muted)",fontSize:12}}>Deeper insights, unlimited Mia, and more.</div>
          </div>
          <Btn onClick={()=>setPage("premium")} small>Upgrade</Btn>
        </div>
      </GlassCard>
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
      // Only send last 20 messages to API to keep context manageable
      const contextMessages = newMessages.slice(-20).map(m=>({ role:m.role, content:m.content }));
      const res = await fetch(import.meta.env.VITE_AI_PROXY_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          max_tokens:1000,
          system:`You are Mia, a warm, emotionally intelligent AI wellness coach for MindShift+. You are calm, supportive, compassionate, and wise — never clinical or robotic. You help users with stress, anxiety, confidence, emotional processing, and personal growth. Keep responses concise (2-4 sentences), warm, and focused on emotional support. Use gentle language and occasional affirmations. Never give medical advice.`,
          messages: contextMessages
        })
      });
      const data = await res.json();
      const reply = data.content?.find(c=>c.type==="text")?.text || "I'm here with you. Take a breath — what would feel most helpful right now?";
      setMessages(m=>[...m,{role:"assistant",content:reply}]);

      // Save Mia's reply to Supabase
      if(authUser){
        const { saveMiaMessage } = await import("./lib/db.js");
        await saveMiaMessage(authUser.id, "assistant", reply);
      }
    } catch(e){
      const fallback = "I'm here with you. Take a gentle breath — and tell me what's on your mind.";
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
  const [key,setKey]=useState(0);
  const reload=useCallback(()=>setKey(k=>k+1),[]);
  return(
    <div style={{height:"calc(100vh - 60px)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontWeight:700,fontSize:16}}>Breathe</div>
        <div style={{color:"var(--muted)",fontSize:13}}>Immersive breathing session</div>
        <div style={{marginLeft:"auto"}}><Btn variant="secondary" small onClick={reload}>Reload</Btn></div>
      </div>
      <div style={{flex:1,minHeight:0}}>
        <iframe key={key} title="MindShift+ Breathe" src="/breathe.html"
          style={{border:"none",width:"100%",height:"100%",display:"block",background:"#04060f"}}
          allow="autoplay"/>
      </div>
    </div>
  )
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
function Insights(){
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
    </div>
  );
}

// ── ABOUT ──────────────────────────────────────────────────────────────────────
function About(){
  const credentials=[
    {icon:"🎓",label:"Education",value:"Walden University (MSN) · Framingham State University (2022)"},
    {icon:"📋",label:"License",value:"Psychiatric Nurse Practitioner · MA License RN2267715 · Exp. 2028-02"},
    {icon:"🏥",label:"Role",value:"Psychiatric Nurse Practitioner, BC, BSN, MSN"},
    {icon:"📍",label:"Locations",value:"31 Granite St. Suite #2, Milford, MA 01757 · 100 Cambridge St. 14th Fl, Boston, MA 02114"},
    {icon:"📞",label:"Phone",value:"(508) 619-1044"},
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
          <div style={{color:"var(--lavender)",fontSize:14,marginBottom:8}}>Psychiatric Nurse Practitioner, BC, BSN, MSN</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            <Badge color="purple">PMHNP</Badge>
            <Badge color="teal">15+ Years Experience</Badge>
            <Badge color="gold">Verified by Psychology Today</Badge>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
          <Btn small onClick={()=>window.open("https://care.headway.co/providers/kenneth-mutegyeki","_blank")}>Book a Session →</Btn>
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
          <Btn onClick={()=>window.open("https://care.headway.co/providers/kenneth-mutegyeki","_blank")}>Book a Session →</Btn>
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

  // Derive display name from Supabase user metadata
  const appUser = user ? {
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Friend",
    email: user.email,
  } : null;

  // Once signed in go to dashboard; only redirect to landing after loading is confirmed done
  useEffect(()=>{
    if(loading) return; // wait — don't act until session is resolved
    if(user && (page==="landing" || page==="onboarding")){
      setPage("dashboard");
      setShowAuth(false);
    }
    if(!user && !["landing"].includes(page)){
      setPage("landing");
    }
  },[user, loading]);

  // Listen for iframe navigation messages + sessionStorage intent from mindshiftplus.html
  useEffect(()=>{
    const onMsg=(e)=>{
      const data=e?.data;
      if(!data||typeof data!=="object")return;
      if(data.type==="mindshift-plus:openAuth") setShowAuth(true);
      if(data.type==="mindshift-plus:navigate") setPage(data.page);
    };
    window.addEventListener("message",onMsg);
    // Check if user came from mindshiftplus.html with an intent
    try{
      const intent = sessionStorage.getItem('ms_intent');
      if(intent){ sessionStorage.removeItem('ms_intent'); setShowAuth(true); }
    }catch{}
    return()=>window.removeEventListener("message",onMsg);
  },[]);

  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--navy)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:700,background:"linear-gradient(135deg,#7c6ff7,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:12}}>MindShift Wellness Clinic</div>
        <div style={{color:"rgba(240,240,255,0.3)",fontSize:13}}>Loading…</div>
      </div>
    </div>
  );

  const needsSidebar = user && !["landing","onboarding"].includes(page);

  return(
    <>
      <GlobalStyles/>
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)}/>}
      <div style={{display:"flex",minHeight:"100vh"}}>
        {needsSidebar&&(
          <Sidebar
            page={page} setPage={setPage} user={appUser} onSignOut={signOut}
            open={sidebarOpen} onClose={()=>setSidebarOpen(false)}
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
              <div style={{fontSize:14,fontWeight:700,background:"var(--grad1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MindShift Wellness Clinic</div>
              <Avatar name={appUser?.name||"U"} size={30}/>
            </div>
          )}
          {(!user || page==="landing") && <Landing/>}
          {user && page==="onboarding" && <Onboarding setPage={setPage} setUser={()=>{}}/>}
          {user && page==="dashboard" && <Dashboard user={appUser} setPage={setPage}/>}
          {user && page==="mia" && <Mia/>}
          {user && page==="journal" && <Journal/>}
          {user && page==="breathe" && <Breathe/>}
          {user && page==="constellation" && <Constellation/>}
          {user && page==="dailyLight" && <DailyLight/>}
          {user && page==="programs" && <Programs/>}
          {user && page==="insights" && <Insights/>}
          {user && page==="premium" && <Premium/>}
          {user && page==="settings" && <Settings user={appUser} setPage={setPage} onSignOut={signOut}/>}
        </main>
        {/* Mobile bottom nav */}
        {needsSidebar&&(
          <div className="mobile-only mobile-bottomnav">
            <BottomNav page={page} setPage={setPage}/>
          </div>
        )}
      </div>
    </>
  )
}
