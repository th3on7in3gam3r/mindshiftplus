import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail } from "../../lib/ehrDb";
import { getPendingIntakes } from "../../lib/intakeDb";
import EHRLogin from "./EHRLogin";
import EHRDashboard from "./EHRDashboard";
import EHRPatientChart from "./EHRPatientChart";
import EHRIntakes from "./EHRIntakes";
import { Spinner, EhrStyles } from "./EHRUI";

export default function EHR({ onBack }) {
  // ── ALL hooks must be declared unconditionally at the top ──────────────────
  const [session, setSession]         = useState(undefined);
  const [clinician, setClinician]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]               = useState("dashboard");
  const [activeChartId, setActiveChartId] = useState(null);
  const [pendingIntakes, setPendingIntakes] = useState(0);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) loadClinician(s.user, mounted);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) loadClinician(s.user, mounted);
      else { setClinician(null); setAuthLoading(false); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function loadClinician(user, mounted = true) {
    if (!mounted) return;
    setAuthLoading(true);
    if (isAdminEmail(user.email)) {
      if (!mounted) return;
      setClinician({
        user_id:   user.id,
        full_name: user.user_metadata?.full_name || user.email.split("@")[0],
        title:     "Administrator",
        is_admin:  true,
        email:     user.email,
      });
      getPendingIntakes().then(({ data }) => { if (mounted) setPendingIntakes(data?.length ?? 0); });
      setAuthLoading(false);
      return;
    }
    const { data } = await getClinicianRole(user.id);
    if (!mounted) return;
    if (data) {
      setClinician({ ...data, email: user.email });
      getPendingIntakes().then(({ data: d }) => { if (mounted) setPendingIntakes(d?.length ?? 0); });
    } else {
      // Not authorized — clear session locally without calling signOut (avoids 403)
      setClinician(null);
      setSession(null);
    }
    setAuthLoading(false);
  }

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut({ scope: "local" }); } catch {}
    setClinician(null);
    setSession(null);
    setView("dashboard");
  }, []);

  // ── Render logic (no hooks below this line) ────────────────────────────────
  if (authLoading || session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ehr-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EhrStyles />
        <Spinner />
      </div>
    );
  }

  if (!session || !clinician) {
    return <EHRLogin onBack={onBack} />;
  }

  // ── Authenticated shell ────────────────────────────────────────────────────
  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: "var(--ehr-bg)", color: "var(--ehr-text)" }}>
      <EhrStyles />

      {/* Top nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 2rem", height: 58,
        background: "var(--ehr-surface)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--ehr-border)",
        boxShadow: "var(--ehr-shadow)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, background: "var(--ehr-grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize: 10, color: "var(--ehr-muted2)", lineHeight: 1.2, letterSpacing: "0.04em" }}>ELECTRONIC HEALTH RECORDS</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button onClick={() => setView("dashboard")} style={{
            background: view === "dashboard" ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
            border: view === "dashboard" ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
            color: view === "dashboard" ? "var(--ehr-accent)" : "var(--ehr-muted)",
            fontWeight: view === "dashboard" ? 600 : 400, fontFamily: "inherit", fontSize: 13,
          }}>Patients</button>
          <button onClick={() => setView("intakes")} style={{
            background: view === "intakes" ? "color-mix(in srgb,var(--ehr-gold) 14%,transparent)" : "transparent",
            border: view === "intakes" ? "1px solid color-mix(in srgb,var(--ehr-gold) 30%,transparent)" : "1px solid transparent",
            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
            color: view === "intakes" ? "var(--ehr-gold)" : "var(--ehr-muted)",
            fontWeight: view === "intakes" ? 600 : 400, fontFamily: "inherit", fontSize: 13,
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
              <span style={{ background: "color-mix(in srgb,var(--ehr-teal) 14%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-teal) 30%,transparent)", borderRadius: 8, padding: "5px 12px", color: "var(--ehr-teal)", fontSize: 13, fontWeight: 600 }}>
                {view === "new-chart" ? "New Patient" : "Chart"}
              </span>
            </>
          )}
        </div>

        {/* Clinician + theme + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
            try { localStorage.setItem("msw_theme", isDark ? "light" : "dark"); } catch {}
          }} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(128,128,128,0.1)", border: "1px solid rgba(128,128,128,0.2)", borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "var(--ehr-muted)" }}>
            🌙 Theme
          </button>
          <div style={{ width: 1, height: 24, background: "var(--ehr-border)" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ehr-text)" }}>{clinician.full_name}</div>
            <div style={{ fontSize: 10, color: "var(--ehr-muted2)", letterSpacing: "0.03em" }}>{clinician.title}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
            {clinician.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <button onClick={signOut} style={{ background: "rgba(128,128,128,0.08)", border: "1px solid var(--ehr-border)", borderRadius: 8, padding: "7px 14px", color: "var(--ehr-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ minHeight: "calc(100vh - 58px)" }}>
        {view === "dashboard" && (
          <EHRDashboard
            clinician={clinician}
            onOpenChart={(id) => { setActiveChartId(id); setView("chart"); }}
            onNewChart={() => { setActiveChartId(null); setView("new-chart"); }}
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
            newPatientId={null}
            clinician={clinician}
            onBack={() => setView("dashboard")}
          />
        )}
      </div>
    </div>
  );
}
