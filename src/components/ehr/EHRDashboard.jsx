import { useState, useEffect } from "react";
import { getAllCharts, getDashboardStats } from "../../lib/ehrDb";
import {
  EhrCard, EhrBtn, EhrBadge, StatusBadge,
  Spinner, EhrStyles, formatDate, formatDateTime, age,
} from "./EHRUI";
import { useTokens } from "../../lib/ThemeContext";

export default function EHRDashboard({ clinician, onOpenChart, onNewChart }) {
  const t = useTokens();
  const [charts, setCharts]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: chartsData }, statsData] = await Promise.all([
      getAllCharts(),
      getDashboardStats(),
    ]);
    setCharts(chartsData ?? []);
    setStats(statsData);
    setLoading(false);
  }

  const filtered = (charts ?? []).filter(c => {
    const name = c.full_name || c.patient?.raw_user_meta_data?.full_name || c.patient?.email || "";
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || (c.mrn?.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const upcomingAppts = stats?.upcomingAppointments ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = clinician?.full_name?.split(" ")[0] ?? "Clinician";

  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: C.bg }}>
      <EhrStyles />

      {/* Hero header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,111,247,0.12) 0%, rgba(78,205,196,0.06) 50%, rgba(240,147,160,0.04) 100%)",
        borderBottom: `1px solid ${C.border}`,
        padding: "2rem 2.5rem 1.8rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position:"absolute", top:"-60px", right:"10%", width:280, height:280, borderRadius:"50%", background:"rgba(124,111,247,0.08)", filter:"blur(60px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-40px", left:"5%", width:200, height:200, borderRadius:"50%", background:"rgba(78,205,196,0.06)", filter:"blur(50px)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:13, color: C.muted, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background: C.green, display:"inline-block", boxShadow:`0 0 8px ${C.green}` }} />
              {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric", year:"numeric" })}
            </div>
            <h1 style={{ fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, color: C.text, margin:0, letterSpacing:"-0.03em", lineHeight:1.1 }}>
              {greeting}, <span style={{ background:"linear-gradient(135deg,#a89cf5,#4ecdc4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{firstName}</span>
            </h1>
            <p style={{ fontSize:14, color: C.muted, marginTop:6 }}>
              {stats?.totalPatients ?? 0} patients · {upcomingAppts.length} upcoming today
            </p>
          </div>
          <EhrBtn onClick={onNewChart} style={{ boxShadow:"0 6px 24px rgba(124,111,247,0.4)" }}>
            <span style={{ fontSize:16 }}>+</span> New Patient Chart
          </EhrBtn>
        </div>
      </div>

      <div style={{ padding:"1.8rem 2.5rem", maxWidth:1300, margin:"0 auto" }}>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:"2rem" }}>
          {[
            { label:"Total Patients",  value: stats?.totalPatients  ?? 0, icon:"👥", color:"#a89cf5", grad:"rgba(124,111,247,0.15)", glow:"#7c6ff7" },
            { label:"Active Patients", value: stats?.activePatients ?? 0, icon:"✅", color:"#4ecdc4", grad:"rgba(78,205,196,0.12)",  glow:"#4ecdc4" },
            { label:"Upcoming Appts",  value: upcomingAppts.length,       icon:"📅", color:"#f5c842", grad:"rgba(245,200,66,0.12)",  glow:"#f5c842" },
            { label:"In View",         value: filtered.length,            icon:"📋", color:"#f093a0", grad:"rgba(240,147,160,0.12)", glow:"#f093a0" },
          ].map(s => (
            <div key={s.label} className="ehr-stat-card" style={{
              background: s.grad,
              border: `1px solid ${s.glow}30`,
              borderRadius: 20,
              padding: "1.3rem 1.4rem",
              position: "relative", overflow: "hidden",
              boxShadow: `0 4px 24px ${s.glow}18`,
            }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`${s.glow}15`, filter:"blur(20px)" }} />
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:32, fontWeight:800, color: s.color, lineHeight:1, letterSpacing:"-0.03em" }}>{s.value}</div>
              <div style={{ fontSize:12, color: C.muted, marginTop:4, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>

          {/* Left: Patient list */}
          <div>
            {/* Search + filters */}
            <div style={{ display:"flex", gap:10, marginBottom:"1.2rem", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:220, position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.4 }}>🔍</span>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or MRN…"
                  style={{
                    width:"100%", background:"rgba(255,255,255,0.04)",
                    border:`1px solid ${C.border2}`, borderRadius:12,
                    padding:"10px 12px 10px 36px",
                    color: C.text, fontSize:14, fontFamily:"inherit", outline:"none",
                  }}
                />
              </div>
              <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:12, padding:"4px" }}>
                {["all","active","inactive","discharged"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter===f ? "rgba(124,111,247,0.2)" : "transparent",
                    border: filter===f ? "1px solid rgba(124,111,247,0.35)" : "1px solid transparent",
                    borderRadius:8, padding:"6px 14px",
                    color: filter===f ? C.lavender : C.muted,
                    fontSize:12, fontWeight: filter===f ? 600 : 400,
                    cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit",
                    transition:"all .15s",
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? <Spinner /> : filtered.length === 0 ? (
              <div style={{
                textAlign:"center", padding:"4rem 2rem",
                background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}`,
                borderRadius:20,
              }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>📂</div>
                <div style={{ fontSize:16, fontWeight:600, color: C.muted, marginBottom:6 }}>
                  {search ? "No patients match your search." : "No patient charts yet."}
                </div>
                {!search && <div style={{ fontSize:13, color: C.muted2, marginBottom:20 }}>Create your first chart to get started.</div>}
                {!search && <EhrBtn onClick={onNewChart}>+ Create First Chart</EhrBtn>}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, animation:"ehrFadeUp .3s ease" }}>
                <div style={{ fontSize:12, color: C.muted2, marginBottom:4, paddingLeft:4 }}>
                  {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
                </div>
                {filtered.map(c => <PatientRow key={c.id} chart={c} onClick={() => onOpenChart(c.id)} />)}
              </div>
            )}
          </div>

          {/* Right: Upcoming appointments */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <EhrCard glow="#7c6ff7" style={{ padding:"1.4rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1.2rem" }}>
                <div style={{ width:30, height:30, borderRadius:8, background:"rgba(124,111,247,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📅</div>
                <h3 style={{ fontSize:14, fontWeight:700, color: C.text, margin:0 }}>Upcoming Appointments</h3>
              </div>
              {upcomingAppts.length === 0 ? (
                <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
                  <div style={{ fontSize:28, marginBottom:8, opacity:0.3 }}>📅</div>
                  <div style={{ fontSize:13, color: C.muted2 }}>No upcoming appointments</div>
                </div>
              ) : upcomingAppts.map((a, i) => (
                <div key={a.id} style={{
                  padding:"0.85rem", marginBottom: i < upcomingAppts.length-1 ? 8 : 0,
                  background:"rgba(255,255,255,0.03)", borderRadius:12,
                  border:`1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:600, color: C.text, marginBottom:3 }}>{a.name || "Patient"}</div>
                  <div style={{ fontSize:12, color: C.muted2, marginBottom:6 }}>{formatDateTime(a.scheduled_at)}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    <StatusBadge status={a.status} />
                    {a.appointment_type && <EhrBadge color="purple">{a.appointment_type.replace(/_/g," ")}</EhrBadge>}
                  </div>
                </div>
              ))}
            </EhrCard>

            {/* Clinician card */}
            <div style={{
              background:"linear-gradient(135deg,rgba(124,111,247,0.15) 0%,rgba(78,205,196,0.1) 100%)",
              border:"1px solid rgba(124,111,247,0.2)",
              borderRadius:20, padding:"1.4rem",
              boxShadow:"0 4px 24px rgba(124,111,247,0.1)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"0.8rem" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#7c6ff7,#4ecdc4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff", flexShrink:0 }}>
                  {clinician?.full_name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color: C.text }}>{clinician?.full_name}</div>
                  <div style={{ fontSize:12, color: C.muted }}>{clinician?.title}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color: C.muted2, lineHeight:1.6 }}>
                MindShift Wellness Clinic · EHR System
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientRow({ chart, onClick }) {
  const t = useTokens();
  const name = chart.full_name || chart.patient?.raw_user_meta_data?.full_name || "Unknown Patient";
  const email = chart.patient?.email ?? "";
  const patientAge = age(chart.date_of_birth);
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

  // Pick a consistent avatar gradient per patient
  const gradients = [
    "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
    "linear-gradient(135deg,#f093a0,#7c6ff7)",
    "linear-gradient(135deg,#4ecdc4,#f5c842)",
    "linear-gradient(135deg,#a89cf5,#f093a0)",
  ];
  const grad = gradients[(name.charCodeAt(0) ?? 0) % gradients.length];

  return (
    <div className="ehr-patient-row" onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14,
      background:"rgba(255,255,255,0.03)",
      border:`1px solid ${C.border}`,
      borderRadius:16, padding:"0.95rem 1.2rem",
      cursor:"pointer",
    }}>
      <div style={{ width:44, height:44, borderRadius:"50%", flexShrink:0, background:grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff", boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}>
        {initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color: C.text, marginBottom:3 }}>{name}</div>
        <div style={{ fontSize:12, color: C.muted2, display:"flex", gap:10, flexWrap:"wrap" }}>
          {chart.mrn && <span style={{ color: C.muted }}>MRN: {chart.mrn}</span>}
          {patientAge && <span>{patientAge} yrs</span>}
          {chart.gender && <span>{chart.gender}</span>}
          {email && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{email}</span>}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
        <StatusBadge status={chart.status} />
        {chart.primary_diagnosis && (
          <span style={{ fontSize:11, color: C.lavender, fontWeight:500 }}>{chart.primary_diagnosis}</span>
        )}
      </div>
      <span style={{ color:"rgba(124,111,247,0.5)", fontSize:18, fontWeight:300 }}>›</span>
    </div>
  );
}
