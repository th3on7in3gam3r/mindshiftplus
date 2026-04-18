import { useState, useEffect } from "react";
import { getAllIntakes, markIntakeReviewed, markIntakeChartCreated } from "../../lib/intakeDb";
import { upsertChart, generateMRN } from "../../lib/ehrDb";
import {
  EhrCard, EhrBtn, EhrBadge, EhrStyles,
  Divider, Spinner, formatDate, formatDateTime, age,
} from "./EHRUI";

const STATUS_COLOR = { pending: "gold", reviewed: "teal", chart_created: "green" };
const STATUS_LABEL = { pending: "Awaiting Review", reviewed: "Reviewed", chart_created: "Chart Created" };

export default function EHRIntakes({ clinician, onOpenChart }) {
  const [intakes, setIntakes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [working, setWorking]   = useState(false);
  const [filter, setFilter]     = useState("pending");
  const [toast, setToast]       = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await getAllIntakes();
    setIntakes(data ?? []);
    setLoading(false);
  }

  const filtered = intakes.filter(i => filter === "all" || i.status === filter);
  const pendingCount = intakes.filter(i => i.status === "pending").length;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  async function handleMarkReviewed(intake) {
    setWorking(true);
    const { data } = await markIntakeReviewed(intake.id, clinician.user_id);
    if (data) setIntakes(prev => prev.map(i => i.id === data.id ? data : i));
    setSelected(data ?? selected);
    setWorking(false);
  }

  async function handleCreateChart(intake) {
    setWorking(true);
    // Build chart from intake data
    const chartData = {
      patient_id:               intake.patient_id,
      mrn:                      generateMRN(),
      full_name:                intake.full_name,
      date_of_birth:            intake.date_of_birth,
      gender:                   intake.gender,
      pronouns:                 intake.pronouns,
      phone:                    intake.phone,
      address:                  intake.address,
      emergency_contact_name:   intake.emergency_contact_name,
      emergency_contact_phone:  intake.emergency_contact_phone,
      insurance_provider:       intake.insurance_provider,
      insurance_member_id:      intake.insurance_member_id,
      insurance_group:          intake.insurance_group,
      allergies:                intake.allergies,
      pharmacy:                 intake.pharmacy,
      intake_date:              new Date().toISOString().slice(0, 10),
      status:                   "active",
      created_by:               clinician.user_id,
    };
    const { data: chart, error } = await upsertChart(chartData);
    if (chart) {
      await markIntakeChartCreated(intake.id);
      setIntakes(prev => prev.map(i => i.id === intake.id ? { ...i, status: "chart_created" } : i));
      setSelected(s => s?.id === intake.id ? { ...s, status: "chart_created" } : s);
      if (onOpenChart) onOpenChart(chart.id);
    } else {
      showToast(`❌ Failed to create chart: ${error?.message || "Unknown error"}`);
    }
    setWorking(false);
  }

  if (selected) {
    return (
      <>
        {toast && <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}
        <IntakeDetail intake={selected} clinician={clinician} working={working}
          onBack={() => setSelected(null)}
          onReview={() => handleMarkReviewed(selected)}
          onCreateChart={() => handleCreateChart(selected)} />
      </>
    );
  }

  return (
    <div className="ehr-root" style={{ padding: "1.8rem 2.5rem", maxWidth: 1000 }}>
      <EhrStyles />
      {toast && <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap" }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ehr-text)", margin: 0, letterSpacing: "-0.02em" }}>
            Patient Intakes
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: "#f5c84222", border: "1px solid #f5c84244", borderRadius: 20, padding: "2px 10px", fontSize: 13, color: "var(--ehr-gold)", fontWeight: 700 }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: "var(--ehr-muted2)", marginTop: 3 }}>Review submitted patient intake forms and create EHR charts</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.2rem", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(226,232,240,0.8)`, borderRadius: 12, padding: "4px", width: "fit-content" }}>
        {[["pending", "Pending"], ["reviewed", "Reviewed"], ["chart_created", "Chart Created"], ["all", "All"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            background: filter === v ? "rgba(124,111,247,0.2)" : "transparent",
            border: filter === v ? "1px solid rgba(124,111,247,0.35)" : "1px solid transparent",
            borderRadius: 8, padding: "7px 16px",
            color: filter === v ? "var(--ehr-accent)" : "var(--ehr-muted)",
            fontSize: 12, fontWeight: filter === v ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ehr-muted)" }}>
            {filter === "pending" ? "No pending intakes — you're all caught up!" : "No intakes in this category."}
          </div>
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(i => (
            <div key={i.id} onClick={() => setSelected(i)} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "rgba(255,255,255,0.03)", border: `1px solid rgba(226,232,240,0.8)`,
              borderRadius: 16, padding: "1rem 1.2rem", cursor: "pointer",
              borderLeft: i.status === "pending" ? `3px solid #f0a500` : i.status === "reviewed" ? `3px solid #0ea5a0` : `3px solid #16a34a`,
              transition: "background .15s, border-color .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,111,247,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" }}>
                {(i.full_name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>{i.full_name || "Unknown"}</div>
                <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2, display: "flex", gap: 10 }}>
                  {i.date_of_birth && <span>{age(i.date_of_birth)} yrs</span>}
                  {i.gender && <span>{i.gender}</span>}
                  {i.phone && <span>{i.phone}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>Submitted: {formatDateTime(i.submitted_at)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                <EhrBadge color={STATUS_COLOR[i.status] ?? "muted"}>{STATUS_LABEL[i.status] ?? i.status}</EhrBadge>
                {i.reason_for_visit && (
                  <div style={{ fontSize: 11, color: "var(--ehr-muted2)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                    {i.reason_for_visit}
                  </div>
                )}
              </div>
              <span style={{ color: "rgba(124,111,247,0.5)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Full intake detail view ───────────────────────────────────────────────────
function IntakeDetail({ intake, clinician, working, onBack, onReview, onCreateChart }) {
  const patientAge = age(intake.date_of_birth);

  const Section = ({ title, color = "var(--ehr-accent2)", children }) => (
    <EhrCard style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>
    </EhrCard>
  );

  const Row = ({ label, value, wide }) => (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--ehr-text)" : "var(--ehr-muted2)", fontStyle: !value ? "italic" : "normal" }}>{value || "Not provided"}</div>
    </div>
  );

  return (
    <div className="ehr-root" style={{ padding: "1.8rem 2.5rem", maxWidth: 900 }}>
      <EhrStyles />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid #cbd5e1`, borderRadius: 8, padding: "7px 12px", color: "var(--ehr-muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Intakes</button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ehr-text)", margin: 0 }}>{intake.full_name || "Intake Review"}</h2>
            <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>
              Submitted: {formatDateTime(intake.submitted_at)}
              {patientAge && ` · ${patientAge} yrs`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <EhrBadge color={STATUS_COLOR[intake.status] ?? "muted"}>{STATUS_LABEL[intake.status] ?? intake.status}</EhrBadge>
          {intake.status === "pending" && (
            <EhrBtn variant="secondary" onClick={onReview} disabled={working}>
              {working ? "Saving…" : "Mark Reviewed"}
            </EhrBtn>
          )}
          {intake.status !== "chart_created" && (
            <EhrBtn onClick={onCreateChart} disabled={working}>
              {working ? "Creating…" : "✨ Create EHR Chart"}
            </EhrBtn>
          )}
        </div>
      </div>

      {/* Safety alert if current risk */}
      {(intake.suicidal_ideation === "current" || intake.self_harm === "current") && (
        <div style={{ background: "rgba(240,147,160,0.12)", border: "1px solid rgba(240,147,160,0.35)", borderRadius: 14, padding: "1rem 1.4rem", marginBottom: 14, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-rose)", marginBottom: 4 }}>Active Safety Concern</div>
            <div style={{ fontSize: 13, color: "var(--ehr-muted)" }}>
              {intake.suicidal_ideation === "current" && <div>Patient reports current suicidal ideation.</div>}
              {intake.self_harm === "current" && <div>Patient reports current self-harm.</div>}
              {intake.safety_plan && <div style={{ marginTop: 4 }}><strong>Patient note:</strong> {intake.safety_plan}</div>}
            </div>
          </div>
        </div>
      )}

      <Section title="Demographics" color="var(--ehr-accent)">
        <Row label="Full Name" value={intake.full_name} />
        <Row label="Date of Birth" value={intake.date_of_birth ? `${formatDate(intake.date_of_birth)} (${patientAge} yrs)` : null} />
        <Row label="Gender" value={intake.gender} />
        <Row label="Pronouns" value={intake.pronouns} />
        <Row label="Phone" value={intake.phone} />
        <Row label="Address" value={intake.address} wide />
      </Section>

      <Section title="Emergency Contact & Insurance" color="var(--ehr-teal)">
        <Row label="Emergency Contact" value={intake.emergency_contact_name} />
        <Row label="Relationship" value={intake.emergency_contact_relationship} />
        <Row label="Emergency Phone" value={intake.emergency_contact_phone} />
        <Row label="Insurance Provider" value={intake.insurance_provider} />
        <Row label="Member ID" value={intake.insurance_member_id} />
        <Row label="Group #" value={intake.insurance_group} />
      </Section>

      <Section title="Medical History" color="var(--ehr-gold)">
        <Row label="Primary Care Provider" value={intake.primary_care_provider} />
        <Row label="Pharmacy" value={intake.pharmacy} />
        <Row label="Current Medications" value={intake.current_medications} wide />
        <Row label="Allergies" value={intake.allergies} wide />
        <Row label="Medical Conditions" value={intake.medical_conditions} wide />
        <Row label="Hospitalizations" value={intake.hospitalizations} />
        <Row label="Surgeries" value={intake.surgeries} />
      </Section>

      <Section title="Mental Health History" color="var(--ehr-purple)">
        <Row label="Reason for Visit" value={intake.reason_for_visit} wide />
        <Row label="Duration of Symptoms" value={intake.symptoms_duration} />
        <Row label="Previous Therapy" value={intake.previous_therapy ? "Yes" : "No"} />
        <Row label="Previous Psychiatry" value={intake.previous_psychiatry ? "Yes" : "No"} />
        <Row label="Prior Treatment Notes" value={intake.previous_treatment_notes} wide />
        <Row label="Prior Diagnoses" value={intake.previous_diagnoses} wide />
        <Row label="Family Mental Health History" value={intake.family_mental_health} wide />
        <Row label="Substance Use" value={intake.substance_use} wide />
      </Section>

      <Section title="Safety & Consents" color="var(--ehr-rose)">
        <Row label="Suicidal Ideation" value={intake.suicidal_ideation} />
        <Row label="Self-Harm" value={intake.self_harm} />
        {intake.safety_plan && <Row label="Safety Notes" value={intake.safety_plan} wide />}
        <Row label="Consent to Treatment" value={intake.consent_treatment ? "✓ Signed" : "Not signed"} />
        <Row label="HIPAA / Privacy" value={intake.consent_privacy ? "✓ Signed" : "Not signed"} />
        <Row label="Telehealth Consent" value={intake.consent_telehealth ? "✓ Signed" : "Declined / N/A"} />
        <Row label="Digital Signature" value={intake.signature} />
      </Section>
    </div>
  );
}
