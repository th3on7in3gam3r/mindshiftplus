import { useState, useEffect, useRef, useMemo } from "react";
import { getAllCharts, getDashboardStats } from "../../lib/ehrDb";
import {
  EhrCard, EhrBtn, EhrBadge, StatusBadge,
  Spinner, EhrStyles, formatDate, formatDateTime, age,
} from "./EHRUI";
import { EHRBillingAggregate } from "./EHRBilling";

const PAGE_SIZE = 10;

function chartDisplayName(c) {
  return c.full_name || c.patient?.raw_user_meta_data?.full_name || c.patient?.email || "Unknown Patient";
}

export default function EHRDashboard({ clinician, onOpenChart, onNewChart, onNavigateView, onOpenTool, onOpenClinicalSuite }) {
  const [charts, setCharts]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [page, setPage]       = useState(1);
  const patientListRef = useRef(null);
  const upcomingRef    = useRef(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (charts ?? [])
      .filter((c) => {
        const name = chartDisplayName(c).toLowerCase();
        const matchesSearch = !q || name.includes(q) || (c.mrn?.toLowerCase().includes(q) ?? false);
        const matchesFilter = filter === "all" || c.status === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => chartDisplayName(a).localeCompare(chartDisplayName(b)));
  }, [charts, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagePatients = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const upcomingAppts = stats?.upcomingAppointments ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = clinician?.full_name?.split(" ")[0] ?? "Clinician";

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statCards = [
    {
      label: "Total Patients",
      value: stats?.totalPatients ?? 0,
      icon: "👥",
      color: "#a89cf5",
      grad: "rgba(124,111,247,0.15)",
      glow: "#7c6ff7",
      hint: "View all patient charts",
      onClick: () => {
        setFilter("all");
        setSearch("");
        scrollToRef(patientListRef);
      },
    },
    {
      label: "Active Patients",
      value: stats?.activePatients ?? 0,
      icon: "✅",
      color: "#4ecdc4",
      grad: "rgba(78,205,196,0.12)",
      glow: "#4ecdc4",
      hint: "Filter to active patients",
      onClick: () => {
        setFilter("active");
        setSearch("");
        scrollToRef(patientListRef);
      },
    },
    {
      label: "Upcoming Appts",
      value: upcomingAppts.length,
      icon: "📅",
      color: "#f5c842",
      grad: "rgba(245,200,66,0.12)",
      glow: "#f5c842",
      hint: "Open Schedule",
      onClick: () => {
        if (onNavigateView) onNavigateView("schedule");
        else scrollToRef(upcomingRef);
      },
    },
    {
      label: "In View",
      value: filtered.length,
      icon: "📋",
      color: "#f093a0",
      grad: "rgba(240,147,160,0.12)",
      glow: "#f093a0",
      hint: "Jump to filtered patient list",
      onClick: () => scrollToRef(patientListRef),
    },
  ];

  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: "var(--ehr-bg)" }}>
      <EhrStyles />

      {/* Hero header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,111,247,0.12) 0%, rgba(78,205,196,0.06) 50%, rgba(240,147,160,0.04) 100%)",
        borderBottom: `1px solid rgba(226,232,240,0.8)`,
        padding: "2rem 2.5rem 1.8rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position:"absolute", top:"-60px", right:"10%", width:280, height:280, borderRadius:"50%", background:"rgba(124,111,247,0.08)", filter:"blur(60px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-40px", left:"5%", width:200, height:200, borderRadius:"50%", background:"rgba(78,205,196,0.06)", filter:"blur(50px)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:13, color: "var(--ehr-muted)", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background: "var(--ehr-green)", display:"inline-block", boxShadow:`0 0 8px #16a34a` }} />
              {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric", year:"numeric" })}
            </div>
            <h1 style={{ fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, color: "var(--ehr-text)", margin:0, letterSpacing:"-0.03em", lineHeight:1.1 }}>
              {greeting}, <span style={{ background:"linear-gradient(135deg,#a89cf5,#4ecdc4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{firstName}</span>
            </h1>
            <p style={{ fontSize:14, color: "var(--ehr-muted)", marginTop:6 }}>
              {stats?.totalPatients ?? 0} patients · {upcomingAppts.length} upcoming today
            </p>
          </div>
          <EhrBtn onClick={onNewChart} style={{ boxShadow: "0 6px 24px rgba(124,111,247,0.4)" }}>
            <span style={{ fontSize: 16 }}>+</span> New Patient Chart
          </EhrBtn>
        </div>
      </div>

      <div style={{ padding:"1.8rem 2.5rem", maxWidth:1300, margin:"0 auto" }}>

        {/* Quick tools */}
        {onOpenTool && (
          <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => onOpenTool("ehr-schedule")} className="ehr-stat-card" style={{
              flex: "1 1 180px", display: "flex", alignItems: "center", gap: 12,
              background: "rgba(74,108,247,0.08)", border: "1px solid rgba(74,108,247,0.22)",
              borderRadius: 16, padding: "1rem 1.2rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <span style={{ fontSize: 22 }}>🔍</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>Patient Lookup</div>
                <div style={{ fontSize: 11, color: "var(--ehr-muted)", marginTop: 2 }}>Portal ID, notes, Rx, documents</div>
              </div>
            </button>
            <button type="button" onClick={() => onOpenTool("ai-scribe")} className="ehr-stat-card" style={{
              flex: "1 1 180px", display: "flex", alignItems: "center", gap: 12,
              background: "rgba(14,165,160,0.08)", border: "1px solid rgba(14,165,160,0.22)",
              borderRadius: 16, padding: "1rem 1.2rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <span style={{ fontSize: 22 }}>🎙️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>MindShift Scribe</div>
                <div style={{ fontSize: 11, color: "var(--ehr-muted)", marginTop: 2 }}>Record session → push note to EHR</div>
              </div>
            </button>
            {onOpenClinicalSuite && (
              <button type="button" onClick={onOpenClinicalSuite} className="ehr-stat-card" style={{
                flex: "1 1 160px", display: "flex", alignItems: "center", gap: 12,
                background: "rgba(124,111,247,0.06)", border: "1px solid rgba(124,111,247,0.18)",
                borderRadius: 16, padding: "1rem 1.2rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}>
                <span style={{ fontSize: 22 }}>⚕️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>Clinical Suite</div>
                  <div style={{ fontSize: 11, color: "var(--ehr-muted)", marginTop: 2 }}>All clinic tools hub</div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:"2rem" }}>
          {statCards.map(s => (
            <button
              key={s.label}
              type="button"
              title={s.hint}
              onClick={s.onClick}
              className="ehr-stat-card"
              style={{
                background: s.grad,
                border: `1px solid ${s.glow}30`,
                borderRadius: 20,
                padding: "1.3rem 1.4rem",
                position: "relative", overflow: "hidden",
                boxShadow: `0 4px 24px ${s.glow}18`,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`${s.glow}15`, filter:"blur(20px)" }} />
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:32, fontWeight:800, color: s.color, lineHeight:1, letterSpacing:"-0.03em" }}>{s.value}</div>
              <div style={{ fontSize:12, color: "var(--ehr-muted)", marginTop:4, fontWeight:500 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Billing aggregate */}
        <EHRBillingAggregate />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>
          {/* Left: Patient list */}
          <div ref={patientListRef} style={{ scrollMarginTop: 72 }}>
            <EhrCard style={{ padding: "1.25rem 1.35rem" }}>
              {/* Toolbar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>Patients</h2>
                  <span style={{ fontSize: 12, color: "var(--ehr-muted)" }}>
                    {filtered.length === 0
                      ? "No matches"
                      : filtered.length <= PAGE_SIZE
                        ? `${filtered.length} patient${filtered.length !== 1 ? "s" : ""}`
                        : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.45 }}>🔍</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or MRN…"
                      className="ehr-input"
                      style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4, background: "var(--ehr-card2)", border: "1px solid var(--ehr-border)", borderRadius: 10, padding: 3 }}>
                    {["all", "active", "inactive", "discharged"].map((f) => (
                      <button key={f} type="button" onClick={() => setFilter(f)} style={{
                        background: filter === f ? "color-mix(in srgb, var(--ehr-accent) 18%, transparent)" : "transparent",
                        border: filter === f ? "1px solid color-mix(in srgb, var(--ehr-accent) 35%, transparent)" : "1px solid transparent",
                        borderRadius: 7, padding: "5px 12px",
                        color: filter === f ? "var(--ehr-accent)" : "var(--ehr-muted)",
                        fontSize: 12, fontWeight: filter === f ? 600 : 400,
                        cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit",
                      }}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? <Spinner /> : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.35 }}>📂</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ehr-muted)", marginBottom: 6 }}>
                    {search || filter !== "all" ? "No patients match your search." : "No patient charts yet."}
                  </div>
                  {!search && filter === "all" && (
                    <>
                      <div style={{ fontSize: 13, color: "var(--ehr-muted2)", marginBottom: 16 }}>Create your first chart to get started.</div>
                      <EhrBtn onClick={onNewChart}>+ Create First Chart</EhrBtn>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pagePatients.map((c) => (
                      <PatientRow key={c.id} chart={c} onClick={() => onOpenChart(c.id)} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--ehr-border)",
                      flexWrap: "wrap",
                    }}>
                      <span style={{ fontSize: 12, color: "var(--ehr-muted)" }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <EhrBtn
                          variant="secondary"
                          small
                          disabled={currentPage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          ← Previous
                        </EhrBtn>
                        <EhrBtn
                          variant="secondary"
                          small
                          disabled={currentPage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next →
                        </EhrBtn>
                      </div>
                    </div>
                  )}
                </>
              )}
            </EhrCard>
          </div>

          {/* Right: Upcoming appointments */}
          <div ref={upcomingRef} style={{ display:"flex", flexDirection:"column", gap:14, scrollMarginTop: 72 }}>
            <EhrCard glow="#7c6ff7" style={{ padding:"1.4rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1.2rem" }}>
                <div style={{ width:30, height:30, borderRadius:8, background:"rgba(124,111,247,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📅</div>
                <h3 style={{ fontSize:14, fontWeight:700, color: "var(--ehr-text)", margin:0 }}>Upcoming Appointments</h3>
              </div>
              {upcomingAppts.length === 0 ? (
                <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
                  <div style={{ fontSize:28, marginBottom:8, opacity:0.3 }}>📅</div>
                  <div style={{ fontSize:13, color: "var(--ehr-muted2)" }}>No upcoming appointments</div>
                </div>
              ) : upcomingAppts.map((a, i) => (
                <div key={a.id} style={{
                  padding:"0.85rem", marginBottom: i < upcomingAppts.length-1 ? 8 : 0,
                  background:"rgba(255,255,255,0.03)", borderRadius:12,
                  border:`1px solid rgba(226,232,240,0.8)`,
                }}>
                  <div style={{ fontSize:13, fontWeight:600, color: "var(--ehr-text)", marginBottom:3 }}>{a.name || "Patient"}</div>
                  <div style={{ fontSize:12, color: "var(--ehr-muted2)", marginBottom:6 }}>{formatDateTime(a.scheduled_at)}</div>
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
                  <div style={{ fontSize:14, fontWeight:700, color: "var(--ehr-text)" }}>{clinician?.full_name}</div>
                  <div style={{ fontSize:12, color: "var(--ehr-muted)" }}>{clinician?.title}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color: "var(--ehr-muted2)", lineHeight:1.6 }}>
                MindShift Wellness Clinic · MindShift EHR
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientRow({ chart, onClick }) {
  const name = chartDisplayName(chart);
  const patientAge = age(chart.date_of_birth);
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const gradients = [
    "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
    "linear-gradient(135deg,#f093a0,#7c6ff7)",
    "linear-gradient(135deg,#4ecdc4,#f5c842)",
    "linear-gradient(135deg,#a89cf5,#f093a0)",
  ];
  const grad = gradients[(name.charCodeAt(0) ?? 0) % gradients.length];

  const meta = [
    chart.mrn && `MRN ${chart.mrn}`,
    patientAge && `${patientAge} yrs`,
    chart.gender,
  ].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      className="ehr-patient-row"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        background: "var(--ehr-card2)",
        border: "1px solid var(--ehr-border)",
        borderRadius: 12, padding: "0.75rem 1rem",
        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: grad,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "#fff",
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 2 }}>{name}</div>
        {meta && <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>{meta}</div>}
        {chart.primary_diagnosis && (
          <div style={{ fontSize: 11, color: "var(--ehr-teal)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {chart.primary_diagnosis}{chart.primary_diagnosis_label ? ` — ${chart.primary_diagnosis_label}` : ""}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <StatusBadge status={chart.status} />
        <span style={{ color: "var(--ehr-muted2)", fontSize: 16 }}>›</span>
      </div>
    </button>
  );
}
