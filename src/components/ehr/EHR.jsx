import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail } from "../../lib/ehrDb";
import { getPendingIntakes } from "../../lib/intakeDb";
import EHRLogin from "./EHRLogin";
import EHRDashboard from "./EHRDashboard";
import EHRPatientChart from "./EHRPatientChart";
import EHRIntakes from "./EHRIntakes";
import { Spinner, EhrStyles } from "./EHRUI";
import { useTokens, ThemeToggle } from "../../lib/ThemeContext";

// ── Main EHR module entry point ───────────────────────────────────────────────
export default function EHR({ onBack }) {
  const [session, setSession]       = useState(undefined); // undefined = loading
  const [clinician, setClinician]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // View state: dashboard | chart | new-chart
  const [view, setView]             = useState("dashboard");
  const [activeChartId, setActiveChartId] = useState(null);
  const [newPatientId, setNewPatientId]   = useState(null);
  const [pendingIntakes, setPendingIntakes] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadClinician(s.user);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) loadClinician(s.user);
      else { setClinician(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadClinician(user) {
    setAuthLoading(true);
    // Allow admin emails even if not in clinician_roles table
    if (isAdminEmail(user.email)) {
      setClinician({
        user_id:   user.id,
        full_name: user.user_metadata?.full_name || user.email.split("@")[0],
        title:     "Administrator",
        is_admin:  true,
        email:     user.email,
      });
      // Load pending intake count
      getPendingIntakes().then(({ data }) => setPendingIntakes(data?.length ?? 0));
      setAuthLoading(false);
      return;
    }
    // Check clinician_roles table
    const { data } = await getClinicianRole(user.id);
    if (data) {
      setClinician({ ...data, email: user.email });
      getPendingIntakes().then(({ data: d }) => setPendingIntakes(d?.length ?? 0));
    } else {
      // Not authorized — sign out silently
      await supabase.auth.signOut();
      setClinician(null);
    }
    setAuthLoading(false);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setClinician(null);
    setView("dashboard");
  };

  // ── Loading ──
  if (authLoading || session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ehr-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  // ── Not logged in ──
  if (!session || !clinician) {
    return <EHRLogin onBack={onBack} />;
  }

  // ── Authenticated — render EHR shell ──
  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: "var(--ehr-bg)", color: "var(--ehr-text)" }}>
      <EhrStyles />

      {/* Top navigation bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 2rem", height: 58,
        background: localStorage.getItem('msw_theme') === 'dark' ? "rgba(8,12,24,0.94)" : "var(--ehr-surface)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(226,232,240,0.8)`,
        boxShadow: "var(--ehr-shadow)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: `0 4px 12px #3b5bdb40` }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, background: "var(--ehr-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize: 10, color: "var(--ehr-muted2)", lineHeight: 1.2, letterSpacing: "0.04em" }}>ELECTRONIC HEALTH RECORDS</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button onClick={() => setView("dashboard")} style={{
            background: view === "dashboard" ? `#3b5bdb14` : "transparent",
            border: view === "dashboard" ? `1px solid #3b5bdb30` : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px",
            cursor: "pointer", color: view === "dashboard" ? "var(--ehr-accent)" : "var(--ehr-muted)",
            fontWeight: view === "dashboard" ? 600 : 400,
            fontFamily: "inherit", fontSize: 13, transition: "all .15s",
          }}>Patients</button>
          <button onClick={() => setView("intakes")} style={{
            background: view === "intakes" ? `#f0a50014` : "transparent",
            border: view === "intakes" ? `1px solid #f0a50030` : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px",
            cursor: "pointer", color: view === "intakes" ? "var(--ehr-gold)" : "var(--ehr-muted)",
            fontWeight: view === "intakes" ? 600 : 400,
            fontFamily: "inherit", fontSize: 13, transition: "all .15s",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Intakes
            {pendingIntakes > 0 && (
              <span style={{ background: "var(--ehr-gold)", color: "#000", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 7px" }}>{pendingIntakes}</span>
            )}
          </button>
          {(view === "chart" || view === "new-chart") && (
            <>
              <span style={{ color: "var(--ehr-muted2)", fontSize: 16 }}>›</span>
              <span style={{ background: `#0ea5a014`, border: `1px solid #0ea5a030`, borderRadius: 8, padding: "5px 12px", color: "var(--ehr-teal)", fontSize: 13, fontWeight: 600 }}>
                {view === "new-chart" ? "New Patient" : "Chart"}
              </span>
            </>
          )}
        </div>

        {/* Toggle + Clinician + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <div style={{ width: 1, height: 24, background: "var(--ehr-border)" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ehr-text)" }}>{clinician.full_name}</div>
            <div style={{ fontSize: 10, color: "var(--ehr-muted2)", letterSpacing: "0.03em" }}>{clinician.title}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", boxShadow: `0 4px 12px #3b5bdb35` }}>
            {clinician.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <button onClick={signOut} style={{ background: localStorage.getItem('msw_theme') === 'dark' ? "rgba(255,255,255,0.04)" : "#f1f5f9", border: `1px solid rgba(226,232,240,0.8)`, borderRadius: 8, padding: "7px 14px", color: "var(--ehr-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* View content */}
      <div style={{ minHeight: "calc(100vh - 56px)" }}>
        {view === "dashboard" && (
          <EHRDashboard
            clinician={clinician}
            onOpenChart={(id) => { setActiveChartId(id); setView("chart"); }}
            onNewChart={() => { setNewPatientId(null); setView("new-chart"); }}
          />
        )}
        {view === "intakes" && (
          <EHRIntakes
            clinician={clinician}
            onOpenChart={(id) => { setActiveChartId(id); setView("chart"); setPendingIntakes(n => Math.max(0, n - 1)); }}
          />
        )}
        {view === "chart" && activeChartId && (
          <EHRPatientChart
            chartId={activeChartId}
            clinician={clinician}
            onBack={() => { setView("dashboard"); setActiveChartId(null); }}
          />
        )}
        {view === "new-chart" && (
          <EHRPatientChart
            isNew
            newPatientId={newPatientId}
            clinician={clinician}
            onBack={() => { setView("dashboard"); }}
          />
        )}
      </div>
    </div>
  );
}
