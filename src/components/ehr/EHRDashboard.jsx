import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getAllCharts, getDashboardStats } from "../../lib/ehrDb";
import {
  C, EhrCard, EhrBtn, EhrBadge, StatusBadge,
  Spinner, formatDate, formatDateTime, age,
} from "./EHRUI";

export default function EHRDashboard({ clinician, onOpenChart, onNewChart }) {
  const [charts, setCharts]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all"); // all | active | inactive | discharged

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "inherit", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>EHR Dashboard</h1>
          <p style={{ fontSize: 13, color: C.muted2, marginTop: 3 }}>Welcome back, {clinician?.full_name ?? "Clinician"}</p>
        </div>
        <EhrBtn onClick={onNewChart}>+ New Patient Chart</EhrBtn>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "Total Patients",    value: stats?.totalPatients   ?? 0, color: C.lavender, icon: "👥" },
          { label: "Active Patients",   value: stats?.activePatients  ?? 0, color: C.teal,     icon: "✅" },
          { label: "Upcoming Appts",    value: upcomingAppts.length,        color: C.gold,     icon: "📅" },
          { label: "Charts Today",      value: filtered.length,             color: C.rose,     icon: "📋" },
        ].map(s => (
          <EhrCard key={s.label} style={{ padding: "1rem 1.2rem" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.muted2, marginTop: 2 }}>{s.label}</div>
          </EhrCard>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,320px)", gap: 16, alignItems: "start" }}>
        {/* Patient list */}
        <div>
          {/* Search + filter bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or MRN…"
              style={{
                flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border2}`, borderRadius: 8,
                padding: "9px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
              }}
            />
            {["all", "active", "inactive", "discharged"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? "rgba(124,111,247,0.2)" : "rgba(255,255,255,0.04)",
                border: filter === f ? `1px solid rgba(124,111,247,0.4)` : `1px solid ${C.border}`,
                borderRadius: 8, padding: "9px 14px",
                color: filter === f ? C.lavender : C.muted,
                fontSize: 12, fontWeight: filter === f ? 600 : 400, cursor: "pointer",
                textTransform: "capitalize",
              }}>{f}</button>
            ))}
          </div>

          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <div style={{ color: C.muted, fontSize: 14 }}>
                {search ? "No patients match your search." : "No patient charts yet. Create one above."}
              </div>
            </EhrCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(c => (
                <PatientRow key={c.id} chart={c} onClick={() => onOpenChart(c.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: upcoming appointments */}
        <div>
          <EhrCard>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: "1rem" }}>Upcoming Appointments</h3>
            {upcomingAppts.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted2, textAlign: "center", padding: "1.5rem 0" }}>No upcoming appointments</div>
            ) : (
              upcomingAppts.map(a => (
                <div key={a.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: "0.8rem", marginBottom: "0.8rem" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.name || "Patient"}</div>
                  <div style={{ fontSize: 12, color: C.muted2, marginTop: 2 }}>{formatDateTime(a.scheduled_at)}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    <StatusBadge status={a.status} />
                    {a.appointment_type && <EhrBadge color="purple">{a.appointment_type.replace(/_/g, " ")}</EhrBadge>}
                  </div>
                </div>
              ))
            )}
          </EhrCard>
        </div>
      </div>
    </div>
  );
}

function PatientRow({ chart, onClick }) {
  const name = chart.full_name || chart.patient?.raw_user_meta_data?.full_name || "Unknown Patient";
  const email = chart.patient?.email ?? "";
  const patientAge = age(chart.date_of_birth);

  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "0.9rem 1.1rem",
      cursor: "pointer", transition: "border-color .2s, background .2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,111,247,0.35)"; e.currentTarget.style.background = "#161e3f"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, fontWeight: 700, color: "#fff",
      }}>
        {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{name}</div>
        <div style={{ fontSize: 12, color: C.muted2, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chart.mrn && <span>MRN: {chart.mrn}</span>}
          {patientAge && <span>{patientAge}y</span>}
          {chart.gender && <span>{chart.gender}</span>}
          {email && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{email}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <StatusBadge status={chart.status} />
        {chart.primary_diagnosis && (
          <span style={{ fontSize: 11, color: C.muted2 }}>{chart.primary_diagnosis}</span>
        )}
      </div>
      <span style={{ color: C.muted2, fontSize: 16 }}>›</span>
    </div>
  );
}
