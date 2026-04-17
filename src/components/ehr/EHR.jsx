import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail } from "../../lib/ehrDb";
import { getPendingIntakes } from "../../lib/intakeDb";
import EHRLogin from "./EHRLogin";
import EHRDashboard from "./EHRDashboard";
import EHRPatientChart from "./EHRPatientChart";
import EHRIntakes from "./EHRIntakes";
import { C, Spinner, EhrStyles } from "./EHRUI";
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
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  // ── Not logged in ──
  if (!session || !clinician) {
    return <EHRLogin onBack={onBack} />;
  }

  // ── Authenticated — render EHR shell ──
  const t = useTokens();
  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
      <EhrStyles />

      {/* Top navigation bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 2rem", height: 58,
        background: t.bg === "#080c18" ? "rgba(8,12,24,0.94)" : t.surface,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${t.border}`,
        boxShadow: t.shadow,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: `0 4px 12px ${t.accent}40` }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, background: t.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize: 10, color: t.muted2, lineHeight: 1.2, letterSpacing: "0.04em" }}>ELECTRONIC HEALTH RECORDS</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button onClick={() => setView("dashboard")} style={{
            background: view === "dashboard" ? `${t.accent}14` : "transparent",
            border: view === "dashboard" ? `1px solid ${t.accent}30` : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px",
            cursor: "pointer", color: view === "dashboard" ? t.accent : t.muted,
            fontWeight: view === "dashboard" ? 600 : 400,
            fontFamily: "inherit", fontSize: 13, transition: "all .15s",
          }}>Patients</button>
          <button onClick={() => setView("intakes")} style={{
            background: view === "intakes" ? `${t.gold}14` : "transparent",
            border: view === "intakes" ? `1px solid ${t.gold}30` : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px",
            cursor: "pointer", color: view === "intakes" ? t.gold : t.muted,
            fontWeight: view === "intakes" ? 600 : 400,
            fontFamily: "inherit", fontSize: 13, transition: "all .15s",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Intakes
            {pendingIntakes > 0 && (
              <span style={{ background: t.gold, color: "#000", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 7px" }}>{pendingIntakes}</span>
            )}
          </button>
          {(view === "chart" || view === "new-chart") && (
            <>
              <span style={{ color: t.muted2, fontSize: 16 }}>›</span>
              <span style={{ background: `${t.teal}14`, border: `1px solid ${t.teal}30`, borderRadius: 8, padding: "5px 12px", color: t.teal, fontSize: 13, fontWeight: 600 }}>
                {view === "new-chart" ? "New Patient" : "Chart"}
              </span>
            </>
          )}
        </div>

        {/* Toggle + Clinician + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <div style={{ width: 1, height: 24, background: t.border }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{clinician.full_name}</div>
            <div style={{ fontSize: 10, color: t.muted2, letterSpacing: "0.03em" }}>{clinician.title}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", boxShadow: `0 4px 12px ${t.accent}35` }}>
            {clinician.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <button onClick={signOut} style={{ background: t.bg === "#080c18" ? "rgba(255,255,255,0.04)" : "#f1f5f9", border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", color: t.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
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
