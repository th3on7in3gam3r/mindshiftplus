import { useState, useEffect } from "react";
import { EhrCard, EhrBadge, SectionHeader, Spinner } from "./EHRUI";
import { getReportingData } from "../../lib/ehrDb";
import { formatCents } from "../../lib/billingDb";

function ProgressBar({ label, value, total, color = "var(--ehr-accent)" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ehr-text)", fontWeight: 500, textTransform: "capitalize" }}>{label}</span>
        <span style={{ color: "var(--ehr-muted2)" }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 8, background: "var(--ehr-border)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 20, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "var(--ehr-accent)" }) {
  return (
    <div style={{
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      borderRadius: 16, padding: "1.2rem 1.4rem",
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function EHRReports({ clinician }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const result = await getReportingData();
      setData(result);
    } catch (e) {
      setError(e.message ?? "Failed to load reporting data.");
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: "2rem 2.5rem" }}><Spinner /></div>;

  if (error) return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)" }}>
        ⚠️ {error}
      </div>
    </div>
  );

  const { charts = [], appointments = [], claims = [], tasks = [] } = data ?? {};

  // Summary stats
  const totalPatients  = charts.length;
  const activePatients = charts.filter(c => c.status === "active").length;
  const totalBilled    = claims.reduce((s, c) => s + (c.amount_billed_cents ?? 0), 0);
  const totalCollected = claims.reduce((s, c) => s + (c.amount_paid_insurance_cents ?? 0), 0);
  const outstanding    = claims.filter(c => c.claim_status !== "paid")
    .reduce((s, c) => s + (c.patient_responsibility_cents ?? 0), 0);
  const openTasks      = tasks.filter(t => t.status === "open").length;

  // Appointment breakdown
  const apptStatuses = ["pending", "confirmed", "completed", "cancelled", "requested"];
  const apptCounts   = apptStatuses.reduce((acc, s) => {
    acc[s] = appointments.filter(a => a.status === s).length;
    return acc;
  }, {});

  // Claims breakdown
  const claimStatuses = ["draft", "submitted", "accepted", "denied", "paid"];
  const claimCounts   = claimStatuses.reduce((acc, s) => {
    acc[s] = claims.filter(c => c.claim_status === s).length;
    return acc;
  }, {});

  // Gender distribution
  const genders = {};
  charts.forEach(c => {
    const g = c.gender || "Unknown";
    genders[g] = (genders[g] ?? 0) + 1;
  });

  // Top diagnoses
  const diagCounts = {};
  charts.forEach(c => {
    if (c.primary_diagnosis) diagCounts[c.primary_diagnosis] = (diagCounts[c.primary_diagnosis] ?? 0) + 1;
  });
  const topDiags = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Monthly revenue (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }) };
  });
  const monthlyRevenue = months.map(m => ({
    ...m,
    billed: claims.filter(c => c.service_date?.startsWith(m.key)).reduce((s, c) => s + (c.amount_billed_cents ?? 0), 0),
    collected: claims.filter(c => c.service_date?.startsWith(m.key)).reduce((s, c) => s + (c.amount_paid_insurance_cents ?? 0), 0),
  }));
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.billed), 1);

  const APPT_COLORS = { pending: "var(--ehr-gold)", confirmed: "var(--ehr-teal)", completed: "var(--ehr-green)", cancelled: "var(--ehr-rose)", requested: "var(--ehr-accent)" };
  const CLAIM_COLORS = { draft: "var(--ehr-muted)", submitted: "var(--ehr-accent)", accepted: "var(--ehr-teal)", denied: "var(--ehr-rose)", paid: "var(--ehr-green)" };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader title="Reports & Insights" subtitle="Practice analytics overview" />

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: "1.5rem" }}>
        <StatCard icon="👥" label="Total Patients"   value={totalPatients}          color="var(--ehr-accent)" />
        <StatCard icon="✅" label="Active Patients"  value={activePatients}         color="var(--ehr-teal)" />
        <StatCard icon="💵" label="Total Billed"     value={formatCents(totalBilled)}    color="var(--ehr-gold)" />
        <StatCard icon="💰" label="Total Collected"  value={formatCents(totalCollected)} color="var(--ehr-green)" />
        <StatCard icon="⚠️" label="Outstanding"      value={formatCents(outstanding)}    color="var(--ehr-rose)" />
        <StatCard icon="📋" label="Open Tasks"       value={openTasks}              color="var(--ehr-purple)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Appointment breakdown */}
        <EhrCard>
          <SectionHeader title="Appointments by Status" subtitle={`${appointments.length} total`} />
          {appointments.length === 0 ? (
            <div style={{ color: "var(--ehr-muted)", fontSize: 13, textAlign: "center", padding: "1rem" }}>No appointment data.</div>
          ) : apptStatuses.map(s => (
            <ProgressBar key={s} label={s} value={apptCounts[s]} total={appointments.length} color={APPT_COLORS[s]} />
          ))}
        </EhrCard>

        {/* Claims breakdown */}
        <EhrCard>
          <SectionHeader title="Claims by Status" subtitle={`${claims.length} total`} />
          {claims.length === 0 ? (
            <div style={{ color: "var(--ehr-muted)", fontSize: 13, textAlign: "center", padding: "1rem" }}>No claims data.</div>
          ) : claimStatuses.map(s => (
            <ProgressBar key={s} label={s} value={claimCounts[s]} total={claims.length} color={CLAIM_COLORS[s]} />
          ))}
        </EhrCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Gender distribution */}
        <EhrCard>
          <SectionHeader title="Patient Demographics" subtitle="Gender distribution" />
          {Object.keys(genders).length === 0 ? (
            <div style={{ color: "var(--ehr-muted)", fontSize: 13, textAlign: "center", padding: "1rem" }}>No demographic data.</div>
          ) : Object.entries(genders).map(([g, count]) => (
            <ProgressBar key={g} label={g} value={count} total={totalPatients} color="var(--ehr-accent)" />
          ))}
        </EhrCard>

        {/* Top diagnoses */}
        <EhrCard>
          <SectionHeader title="Top Diagnoses" subtitle="By primary diagnosis (top 5)" />
          {topDiags.length === 0 ? (
            <div style={{ color: "var(--ehr-muted)", fontSize: 13, textAlign: "center", padding: "1rem" }}>No diagnosis data.</div>
          ) : topDiags.map(([diag, count]) => (
            <ProgressBar key={diag} label={diag} value={count} total={totalPatients} color="var(--ehr-purple)" />
          ))}
        </EhrCard>
      </div>

      {/* Monthly revenue trend */}
      <EhrCard>
        <SectionHeader title="Monthly Revenue Trend" subtitle="Last 6 months (from claims service date)" />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 140 }}>
          {monthlyRevenue.map(m => (
            <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, color: "var(--ehr-muted2)", fontWeight: 600 }}>{formatCents(m.billed)}</div>
              <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: 100 }}>
                <div style={{ flex: 1, background: "color-mix(in srgb,var(--ehr-accent) 60%,transparent)", borderRadius: "4px 4px 0 0", height: `${Math.round((m.billed / maxMonthly) * 100)}%`, minHeight: m.billed > 0 ? 4 : 0 }} title={`Billed: ${formatCents(m.billed)}`} />
                <div style={{ flex: 1, background: "var(--ehr-green)", borderRadius: "4px 4px 0 0", height: `${Math.round((m.collected / maxMonthly) * 100)}%`, minHeight: m.collected > 0 ? 4 : 0 }} title={`Collected: ${formatCents(m.collected)}`} />
              </div>
              <div style={{ fontSize: 10, color: "var(--ehr-muted2)" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "var(--ehr-muted2)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "color-mix(in srgb,var(--ehr-accent) 60%,transparent)", display: "inline-block" }} /> Billed
          </span>
          <span style={{ fontSize: 11, color: "var(--ehr-muted2)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ehr-green)", display: "inline-block" }} /> Collected
          </span>
        </div>
      </EhrCard>
    </div>
  );
}
