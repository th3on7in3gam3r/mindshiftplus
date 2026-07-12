import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail, getTasks, getPortalPatientUnreadCount } from "../../lib/ehrDb";
import { getUnreviewedCrisisCount } from "../../lib/crisisDb";
import { getPendingIntakes } from "../../lib/intakeDb";
import EHRLogin from "./EHRLogin";
import EHRDashboard from "./EHRDashboard";
import EHRPatientChart from "./EHRPatientChart";
import EHRIntakes from "./EHRIntakes";
import EHRSchedule from "./EHRSchedule";
import EHRTasks from "./EHRTasks";
import EHRMessages from "./EHRMessages";
import EHRPatientMessages from "./EHRPatientMessages";
import EHRReports from "./EHRReports";
import EHRGiftCards from "./EHRGiftCards";
import EHRInvoices from "./EHRInvoices";
import EHRInsuranceClaims from "./EHRInsuranceClaims";
import EHRBillingSettings from "./EHRBillingSettings";
import EHRCrisisAlerts from "./EHRCrisisAlerts";
import EHRStaffHelper from "./EHRStaffHelper";
import { Spinner, EhrStyles } from "./EHRUI";
import { consumeEHRIntent } from "../../lib/clinicalNav";

export default function EHR({ onBack, onOpenDocs, initialView }) {
  // ── ALL hooks must be declared unconditionally at the top ──────────────────
  const [session, setSession]         = useState(undefined);
  const [clinician, setClinician]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]               = useState(initialView || "dashboard");
  const [activeChartId, setActiveChartId] = useState(null);
  const [chartContext, setChartContext] = useState(null);
  const [scheduleFocusDate, setScheduleFocusDate] = useState(null);
  const [pendingIntakes, setPendingIntakes] = useState(0);
  const [taskCount, setTaskCount]     = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [crisisCount, setCrisisCount] = useState(0);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [financeMenuPos, setFinanceMenuPos] = useState({ top: 0, left: 0 });
  const financeBtnRef = useRef(null);
  const financeMenuRef = useRef(null);

  const financeViews = ["insurance-claims", "invoices", "reports", "giftcards", "billing-settings"];
  const isFinanceView = financeViews.includes(view);

  const FINANCE_LINKS = [
    { key: "insurance-claims", label: "Insurance Claims", color: "gold" },
    { key: "invoices", label: "Patient Invoices", color: "accent" },
    { key: "reports", label: "Reports", color: "purple" },
    { key: "giftcards", label: "Gift Cards", color: "green" },
    { key: "billing-settings", label: "Billing Setup", color: "muted" },
  ];

  const openFinanceMenu = () => {
    const btn = financeBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setFinanceMenuPos({ top: r.bottom + 6, left: Math.max(8, r.left) });
    }
    setFinanceOpen(true);
  };

  useEffect(() => {
    if (!financeOpen) return;
    const close = (e) => {
      if (financeBtnRef.current?.contains(e.target)) return;
      if (financeMenuRef.current?.contains(e.target)) return;
      setFinanceOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", close);
    };
  }, [financeOpen]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
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

  useEffect(() => {
    const { view: ehrView, scheduleDate } = consumeEHRIntent();
    if (ehrView) setView(ehrView);
    if (scheduleDate) setScheduleFocusDate(scheduleDate);
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
      getTasks({ status: "open" }).then(({ data }) => { if (mounted) setTaskCount(data?.length ?? 0); });
      getPortalPatientUnreadCount().then(({ count }) => { if (mounted) setUnreadCount(count ?? 0); });
      getUnreviewedCrisisCount().then(({ count }) => { if (mounted) setCrisisCount(count ?? 0); });
      setAuthLoading(false);
      return;
    }
    const { data } = await getClinicianRole(user.id);
    if (!mounted) return;
    if (data) {
      setClinician({ ...data, email: user.email });
      getPendingIntakes().then(({ data: d }) => { if (mounted) setPendingIntakes(d?.length ?? 0); });
      getTasks({ status: "open" }).then(({ data: d }) => { if (mounted) setTaskCount(d?.length ?? 0); });
      getPortalPatientUnreadCount().then(({ count: c }) => { if (mounted) setUnreadCount(c ?? 0); });
      getUnreviewedCrisisCount().then(({ count: c }) => { if (mounted) setCrisisCount(c ?? 0); });
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

  const navBtn = (key, label, { color = "accent", badge = 0, icon = null } = {}) => {
    const active = view === key;
    return (
      <button key={key} onClick={() => { setView(key); setFinanceOpen(false); }} style={{
        background: active ? `color-mix(in srgb,var(--ehr-${color}) 14%,transparent)` : "transparent",
        border: active ? `1px solid color-mix(in srgb,var(--ehr-${color}) 30%,transparent)` : "1px solid transparent",
        borderRadius: 8, padding: "5px 11px", cursor: "pointer",
        color: active ? `var(--ehr-${color})` : "var(--ehr-muted)",
        fontWeight: active ? 600 : 400, fontFamily: "inherit", fontSize: 13,
        display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {icon && <span>{icon}</span>}{label}
        {badge > 0 && (
          <span style={{ background: `var(--ehr-${color})`, color: color === "gold" ? "#000" : "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 6px" }}>{badge}</span>
        )}
      </button>
    );
  };

  // ── Authenticated shell ────────────────────────────────────────────────────
  return (
    <div className="ehr-root" style={{ minHeight: "100vh", background: "var(--ehr-bg)", color: "var(--ehr-text)" }}>
      <EhrStyles />

      {/* Top nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 1.25rem", height: 56,
        background: "var(--ehr-surface)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--ehr-border)",
        boxShadow: "var(--ehr-shadow)",
        overflow: "visible",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, minWidth: 0 }}>
          <img src="/logo.png" alt="MindShift" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain" }}/>
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ehr-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>MindShift EHR</div>
            {(view === "chart" && chartContext?.patientName) ? (
              <div style={{ fontSize: 10, color: "var(--ehr-teal)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                {chartContext.tabLabel ? `${chartContext.patientName} · ${chartContext.tabLabel}` : chartContext.patientName}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "var(--ehr-muted2)" }}>Clinical Suite</div>
            )}
          </div>
        </div>

        {/* Primary nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0, overflow: "visible" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, overflowX: "auto", minWidth: 0, scrollbarWidth: "none" }}>
            {navBtn("dashboard", "Patients")}
            {navBtn("intakes", "Intakes", { color: "gold", badge: pendingIntakes })}
            {navBtn("schedule", "Schedule", { color: "teal" })}
            {navBtn("messages", "Messages", { color: "teal", badge: unreadCount })}
            {navBtn("tasks", "Tasks", { color: "rose", badge: taskCount })}
            {navBtn("crisis", "Crisis", { color: "rose", badge: crisisCount, icon: "🚨" })}
          </div>

          {/* Finance dropdown — outside scroll clip */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              ref={financeBtnRef}
              type="button"
              onClick={() => (financeOpen ? setFinanceOpen(false) : openFinanceMenu())}
              style={{
                background: isFinanceView || financeOpen ? "color-mix(in srgb,var(--ehr-gold) 14%,transparent)" : "transparent",
                border: isFinanceView || financeOpen ? "1px solid color-mix(in srgb,var(--ehr-gold) 30%,transparent)" : "1px solid transparent",
                borderRadius: 8, padding: "5px 11px", cursor: "pointer",
                color: isFinanceView || financeOpen ? "var(--ehr-gold)" : "var(--ehr-muted)",
                fontWeight: isFinanceView || financeOpen ? 600 : 400, fontFamily: "inherit", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
              }}
            >
              Finance <span style={{ fontSize: 10, opacity: 0.7 }}>{financeOpen ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>

        {/* Clinician + utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <EHRStaffHelper clinician={clinician} onOpenDocs={onOpenDocs} />
          {onOpenDocs && (
            <button onClick={onOpenDocs} title="Staff Docs" style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.3)", borderRadius: 20, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#ca8a04" }}>
              📖
            </button>
          )}
          <button
            title="Toggle theme"
            onClick={() => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
            try { localStorage.setItem("msw_theme", isDark ? "light" : "dark"); } catch {}
          }} style={{ display: "flex", alignItems: "center", background: "rgba(128,128,128,0.1)", border: "1px solid rgba(128,128,128,0.2)", borderRadius: 20, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--ehr-muted)" }}>
            🌙
          </button>
          <div style={{ width: 1, height: 22, background: "var(--ehr-border)" }} />
          <div style={{ textAlign: "right", display: "none" }} className="ehr-nav-user-name">
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ehr-text)" }}>{clinician.full_name}</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ehr-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }} title={clinician.full_name}>
            {clinician.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <button onClick={signOut} style={{ background: "transparent", border: "1px solid var(--ehr-border)", borderRadius: 8, padding: "5px 10px", color: "var(--ehr-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Sign Out
          </button>
        </div>
      </div>

      {financeOpen && createPortal(
        <div
          ref={financeMenuRef}
          style={{
            position: "fixed",
            top: financeMenuPos.top,
            left: financeMenuPos.left,
            zIndex: 10000,
            minWidth: 200,
            background: "var(--ehr-surface, #fff)",
            border: "1px solid var(--ehr-border, #e2e8f0)",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            padding: 6,
          }}
        >
          {FINANCE_LINKS.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setView(key); setFinanceOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 12px", border: "none", borderRadius: 8,
                background: view === key ? `color-mix(in srgb,var(--ehr-${color}) 12%,transparent)` : "transparent",
                color: view === key ? `var(--ehr-${color})` : "var(--ehr-text, #1a1f36)",
                fontWeight: view === key ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { if (view !== key) e.currentTarget.style.background = "var(--ehr-card2, #f8fafc)"; }}
              onMouseLeave={(e) => { if (view !== key) e.currentTarget.style.background = "transparent"; }}
            >
              {label}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Content */}
      <div style={{ minHeight: "calc(100vh - 58px)" }}>
        {view === "dashboard" && (
          <EHRDashboard
            clinician={clinician}
            onOpenChart={(id) => { setActiveChartId(id); setView("chart"); }}
            onNewChart={() => { setActiveChartId(null); setView("new-chart"); }}
            onNavigateView={setView}
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
            onChartContext={setChartContext}
            onBack={() => { setChartContext(null); setView("dashboard"); setActiveChartId(null); }}
          />
        )}
        {view === "new-chart" && (
          <EHRPatientChart
            isNew
            newPatientId={null}
            clinician={clinician}
            onBack={() => setView("dashboard")}
            onCreated={(id) => { setActiveChartId(id); setView("chart"); }}
          />
        )}
        {view === "schedule"  && (
          <EHRSchedule
            clinician={clinician}
            onOpenChart={(id) => { setActiveChartId(id); setView("chart"); }}
            initialFocusDate={scheduleFocusDate}
            onFocusDateConsumed={() => setScheduleFocusDate(null)}
          />
        )}
        {view === "tasks"     && <EHRTasks     clinician={clinician} />}
        {view === "messages"  && <EHRPatientMessages clinician={clinician} />}
        {view === "staff-messages" && <EHRMessages clinician={clinician} />}
        {view === "reports"   && <EHRReports   clinician={clinician} />}
        {view === "crisis"    && <EHRCrisisAlerts />}
        {view === "giftcards" && <EHRGiftCards clinician={clinician} />}
        {view === "invoices"  && <EHRInvoices  clinician={clinician} />}
        {view === "insurance-claims" && (
          <EHRInsuranceClaims clinician={clinician} onOpenSettings={() => setView("billing-settings")} />
        )}
        {view === "billing-settings" && <EHRBillingSettings clinician={clinician} />}
      </div>
    </div>
  );
}
