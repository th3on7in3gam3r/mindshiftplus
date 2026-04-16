import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail } from "../../lib/ehrDb";
import EHRLogin from "./EHRLogin";
import EHRDashboard from "./EHRDashboard";
import EHRPatientChart from "./EHRPatientChart";
import { C, Spinner } from "./EHRUI";

// ── Main EHR module entry point ───────────────────────────────────────────────
export default function EHR({ onBack }) {
  const [session, setSession]       = useState(undefined); // undefined = loading
  const [clinician, setClinician]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // View state: dashboard | chart | new-chart
  const [view, setView]             = useState("dashboard");
  const [activeChartId, setActiveChartId] = useState(null);
  const [newPatientId, setNewPatientId]   = useState(null);

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
      setAuthLoading(false);
      return;
    }
    // Check clinician_roles table
    const { data } = await getClinicianRole(user.id);
    if (data) {
      setClinician({ ...data, email: user.email });
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
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      {/* Top navigation bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 2rem", height: 56,
        background: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize: 10, color: C.muted2, lineHeight: 1.2 }}>Electronic Health Records</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <button onClick={() => setView("dashboard")} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: view === "dashboard" ? C.lavender : C.muted, fontWeight: view === "dashboard" ? 600 : 400,
            fontFamily: "inherit", fontSize: 13,
          }}>Patients</button>
          {view === "chart" && (
            <>
              <span style={{ color: C.muted2 }}>›</span>
              <span style={{ color: C.lavender, fontWeight: 600 }}>Chart</span>
            </>
          )}
          {view === "new-chart" && (
            <>
              <span style={{ color: C.muted2 }}>›</span>
              <span style={{ color: C.lavender, fontWeight: 600 }}>New Patient</span>
            </>
          )}
        </div>

        {/* User info + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{clinician.full_name}</div>
            <div style={{ fontSize: 11, color: C.muted2 }}>{clinician.title}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
            {clinician.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
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
