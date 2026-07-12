import { useState, useEffect, useMemo } from "react";
import { getAllIntakes, markIntakeReviewed, markIntakeChartCreated } from "../../lib/intakeDb";
import { upsertChart, generateMRN } from "../../lib/ehrDb";
import {
  EhrCard, EhrBtn, EhrBadge, EhrStyles, SectionHeader, Spinner,
  formatDate, formatDateTime, age,
} from "./EHRUI";

const STATUS_COLOR = { pending: "gold", reviewed: "teal", chart_created: "green" };
const STATUS_LABEL = { pending: "Awaiting Review", reviewed: "Reviewed", chart_created: "Chart Created" };

/** Form packages — extend when Dr. Kenneth's Word forms go live in the portal */
const FORM_PACKAGES = {
  portal_v1: {
    label: "Patient Portal · Intake v1",
    description: "Demographics, emergency/insurance, consents & signature",
    live: true,
  },
  comprehensive_psych: {
    label: "Comprehensive Psychiatric Evaluation",
    description: "Dr. Kenneth's full 4-page clinical intake (medical, psych, family history)",
    live: false,
  },
  consent_treat: {
    label: "Consent to Treat & Payment",
    description: "Standalone treatment and financial consent",
    live: false,
  },
  psychotherapy_consent: {
    label: "Psychotherapy Informed Consent",
    description: "Detailed psychotherapy consent document",
    live: false,
  },
  practice_policies: {
    label: "Practice Policies",
    description: "Appointments, cancellations, emergencies, discharge",
    live: false,
  },
};

const WORKFLOW = [
  { id: "pending", step: 1, title: "Patient submits", detail: "Portal → Patient Intake → Submit" },
  { id: "reviewed", step: 2, title: "You review", detail: "Mark Reviewed after reading forms" },
  { id: "chart_created", step: 3, title: "Chart created", detail: "Create MindShift EHR Chart" },
];

function IntakeGuide({ onDismiss, pendingCount }) {
  return (
    <EhrCard style={{
      marginBottom: "1.2rem",
      background: "linear-gradient(135deg, color-mix(in srgb,var(--ehr-gold) 8%,var(--ehr-card)), color-mix(in srgb,var(--ehr-accent) 6%,var(--ehr-card)))",
      border: "1px solid color-mix(in srgb,var(--ehr-gold) 25%,transparent)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 8 }}>
            What is Patient Intakes?
          </div>
          <p style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.7, margin: "0 0 12px" }}>
            This is <strong>not</strong> where patients create login accounts. It is where <strong>submitted intake paperwork</strong> from the
            Patient Portal lands for your review — demographics, consents, signatures, and (soon) Dr. Kenneth&apos;s full clinical forms.
            Patients you add manually in <strong>Patients → New Patient</strong> do not appear here.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {WORKFLOW.map((w) => (
              <div key={w.id} style={{
                flex: "1 1 140px",
                padding: "8px 12px",
                borderRadius: 10,
                background: w.id === "pending" && pendingCount > 0 ? "color-mix(in srgb,var(--ehr-gold) 15%,var(--ehr-card))" : "var(--ehr-bg)",
                border: "1px solid var(--ehr-border)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ehr-muted2)", marginBottom: 2 }}>Step {w.step}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ehr-text)" }}>{w.title}</div>
                <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 2 }}>{w.detail}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted2)", lineHeight: 1.55 }}>
            <strong>Form packages:</strong>{" "}
            {Object.values(FORM_PACKAGES).filter((p) => p.live).map((p) => p.label).join(" · ")}
            {" "}— additional Kenneth forms will appear here automatically once deployed in the portal.
          </div>
        </div>
        <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 18 }} aria-label="Dismiss">×</button>
      </div>
    </EhrCard>
  );
}

function ConsentSummary({ intake }) {
  const items = [
    { key: "consent_treatment", label: "Informed Consent / Treatment" },
    { key: "consent_privacy", label: "HIPAA & Practice Policies" },
    { key: "consent_assignment_of_benefits", label: "Assignment of Benefits" },
    { key: "consent_financial_responsibility", label: "Financial Responsibility & Telehealth" },
    { key: "consent_telehealth", label: "Telehealth (optional)", optional: true },
  ];
  const signed = items.filter((i) => intake[i.key]);
  return (
    <EhrCard style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-teal)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Forms & consents in this submission
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((i) => (
          <div key={i.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: intake[i.key] ? "var(--ehr-green)" : i.optional ? "var(--ehr-muted2)" : "var(--ehr-rose)" }}>
              {intake[i.key] ? "✓" : i.optional ? "—" : "✗"}
            </span>
            <span style={{ color: "var(--ehr-text)" }}>{i.label}</span>
          </div>
        ))}
      </div>
      {intake.signature && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ehr-border)", fontSize: 12, color: "var(--ehr-muted)" }}>
          Digital signature: <span style={{ fontFamily: "cursive", fontSize: 16, color: "var(--ehr-accent)" }}>{intake.signature}</span>
        </div>
      )}
      {!FORM_PACKAGES.comprehensive_psych.live && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--ehr-bg)", fontSize: 11, color: "var(--ehr-muted2)", lineHeight: 1.5 }}>
          📋 <strong>Coming soon:</strong> {FORM_PACKAGES.comprehensive_psych.label} — full medical &amp; psychiatric history from Dr. Kenneth&apos;s forms.
        </div>
      )}
    </EhrCard>
  );
}

export default function EHRIntakes({ clinician, onOpenChart }) {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [showHelp, setShowHelp] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await getAllIntakes();
    setIntakes(data ?? []);
    setLoading(false);
  }

  const filtered = useMemo(
    () => intakes.filter((i) => filter === "all" || i.status === filter),
    [intakes, filter]
  );
  const pendingCount = intakes.filter((i) => i.status === "pending").length;
  const reviewedCount = intakes.filter((i) => i.status === "reviewed").length;
  const chartCount = intakes.filter((i) => i.status === "chart_created").length;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  async function handleMarkReviewed(intake) {
    setWorking(true);
    const { data } = await markIntakeReviewed(intake.id, clinician.user_id);
    if (data) setIntakes((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    setSelected(data ?? selected);
    setWorking(false);
  }

  async function handleCreateChart(intake) {
    setWorking(true);
    const chartData = {
      patient_id: intake.patient_id,
      mrn: generateMRN(),
      full_name: intake.full_name,
      date_of_birth: intake.date_of_birth,
      gender: intake.gender,
      pronouns: intake.pronouns,
      phone: intake.phone,
      address: intake.address,
      emergency_contact_name: intake.emergency_contact_name,
      emergency_contact_phone: intake.emergency_contact_phone,
      insurance_provider: intake.insurance_provider,
      insurance_member_id: intake.insurance_member_id,
      insurance_group: intake.insurance_group,
      allergies: intake.allergies,
      pharmacy: intake.pharmacy,
      intake_date: new Date().toISOString().slice(0, 10),
      status: "active",
      created_by: clinician.user_id,
    };
    const { data: chart, error } = await upsertChart(chartData);
    if (chart) {
      await markIntakeChartCreated(intake.id);
      setIntakes((prev) => prev.map((i) => (i.id === intake.id ? { ...i, status: "chart_created" } : i)));
      setSelected((s) => (s?.id === intake.id ? { ...s, status: "chart_created" } : s));
      if (onOpenChart) onOpenChart(chart.id);
    } else {
      showToast(`Failed to create chart: ${error?.message || "Unknown error"}`);
    }
    setWorking(false);
  }

  if (selected) {
    return (
      <>
        {toast && <Toast message={toast} />}
        <IntakeDetail
          intake={selected}
          working={working}
          onBack={() => setSelected(null)}
          onReview={() => handleMarkReviewed(selected)}
          onCreateChart={() => handleCreateChart(selected)}
        />
      </>
    );
  }

  return (
    <div className="ehr-root" style={{ padding: "1.5rem 2rem 2rem", maxWidth: 960, margin: "0 auto" }}>
      <EhrStyles />
      {toast && <Toast message={toast} />}

      <SectionHeader
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Patient Intakes
            {pendingCount > 0 && (
              <span style={{ background: "var(--ehr-gold)", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px" }}>
                {pendingCount} pending
              </span>
            )}
          </span>
        }
        subtitle="Review portal intake forms & consents → create the official EHR chart"
        action={<EhrBtn small variant="secondary" onClick={loadData}>↻ Refresh</EhrBtn>}
      />

      {showHelp && <IntakeGuide onDismiss={() => setShowHelp(false)} pendingCount={pendingCount} />}

      {/* Filters + counts */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.2rem", flexWrap: "wrap" }}>
        {[
          ["pending", "Pending", pendingCount],
          ["reviewed", "Reviewed", reviewedCount],
          ["chart_created", "Chart Created", chartCount],
          ["all", "All", intakes.length],
        ].map(([v, l, count]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} style={{
            background: filter === v ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
            border: filter === v ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid var(--ehr-border)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: filter === v ? 700 : 400,
            color: filter === v ? "var(--ehr-accent)" : "var(--ehr-muted)", cursor: "pointer", fontFamily: "inherit",
          }}>
            {l} <span style={{ opacity: 0.75 }}>({count})</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 8 }}>
            {filter === "pending" ? "No pending intakes" : "No intakes in this category"}
          </div>
          <p style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 1rem" }}>
            {filter === "pending"
              ? "When a portal patient completes Patient Intake and hits Submit, their forms appear here as Pending. Signup alone does not create an intake — they must finish the intake form."
              : "Try another filter or wait for new portal submissions."}
          </p>
          <div style={{ fontSize: 12, color: "var(--ehr-muted2)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            <strong>Patient path:</strong> Portal sign-in → sidebar 📋 Patient Intake → Submit<br />
            <strong>Your path:</strong> Review here → Mark Reviewed → Create EHR Chart
          </div>
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setSelected(i)}
              style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
                background: "var(--ehr-card)", border: "1px solid var(--ehr-border)",
                borderRadius: 14, padding: "1rem 1.2rem", cursor: "pointer", fontFamily: "inherit",
                borderLeft: `4px solid var(--ehr-${STATUS_COLOR[i.status] ?? "muted"})`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,var(--ehr-accent),var(--ehr-teal))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#fff",
              }}>
                {(i.full_name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>{i.full_name || "Unknown"}</div>
                <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {i.date_of_birth && <span>{age(i.date_of_birth)} yrs</span>}
                  {i.gender && <span>{i.gender}</span>}
                  {i.phone && <span>{i.phone}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 4 }}>
                  Submitted {formatDateTime(i.submitted_at)} · {FORM_PACKAGES.portal_v1.label}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <EhrBadge color={STATUS_COLOR[i.status] ?? "muted"}>{STATUS_LABEL[i.status] ?? i.status}</EhrBadge>
                {i.signature && <span style={{ fontSize: 10, color: "var(--ehr-green)" }}>✓ Signed</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "var(--ehr-text)", borderRadius: 30, padding: "10px 20px",
      fontSize: 13, color: "#fff", zIndex: 9999, whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

function IntakeDetail({ intake, working, onBack, onReview, onCreateChart }) {
  const patientAge = age(intake.date_of_birth);

  const Section = ({ title, color = "var(--ehr-accent2)", children }) => (
    <EhrCard style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>{children}</div>
    </EhrCard>
  );

  const Row = ({ label, value, wide }) => (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value != null && value !== "" ? "var(--ehr-text)" : "var(--ehr-muted2)", fontStyle: value == null || value === "" ? "italic" : "normal" }}>
        {value == null || value === "" ? "Not provided" : String(value)}
      </div>
    </div>
  );

  const hasBiopsych = [
    "biopsych_reason", "substance_alcohol", "social_relationships", "living_situation",
  ].some((k) => intake[k]);

  return (
    <div className="ehr-root" style={{ padding: "1.5rem 2rem 2rem", maxWidth: 920, margin: "0 auto" }}>
      <EhrStyles />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EhrBtn variant="secondary" small onClick={onBack}>← Intakes</EhrBtn>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ehr-text)", margin: 0 }}>{intake.full_name || "Intake Review"}</h2>
            <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>
              Submitted {formatDateTime(intake.submitted_at)}
              {patientAge != null && ` · ${patientAge} yrs`}
              {" · "}{FORM_PACKAGES.portal_v1.label}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <EhrBadge color={STATUS_COLOR[intake.status] ?? "muted"}>{STATUS_LABEL[intake.status] ?? intake.status}</EhrBadge>
          {intake.status === "pending" && (
            <EhrBtn variant="secondary" onClick={onReview} disabled={working}>
              {working ? "Saving…" : "Mark Reviewed"}
            </EhrBtn>
          )}
          {intake.status !== "chart_created" && (
            <EhrBtn onClick={onCreateChart} disabled={working}>
              {working ? "Creating…" : "Create EHR Chart →"}
            </EhrBtn>
          )}
        </div>
      </div>

      {(intake.suicidal_ideation === "current" || intake.self_harm === "current") && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 12%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 35%,transparent)", borderRadius: 14, padding: "1rem 1.4rem", marginBottom: 14, display: "flex", gap: 10 }}>
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

      <ConsentSummary intake={intake} />

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

      {(intake.primary_care_provider || intake.current_medications || intake.allergies || intake.medical_conditions) && (
        <Section title="Medical History" color="var(--ehr-gold)">
          <Row label="Primary Care Provider" value={intake.primary_care_provider} />
          <Row label="Pharmacy" value={intake.pharmacy} />
          <Row label="Current Medications" value={intake.current_medications} wide />
          <Row label="Allergies" value={intake.allergies} wide />
          <Row label="Medical Conditions" value={intake.medical_conditions} wide />
          <Row label="Hospitalizations" value={intake.hospitalizations} />
          <Row label="Surgeries" value={intake.surgeries} />
        </Section>
      )}

      {(intake.reason_for_visit || intake.previous_therapy != null) && (
        <Section title="Mental Health History" color="var(--ehr-purple)">
          <Row label="Reason for Visit" value={intake.reason_for_visit} wide />
          <Row label="Duration of Symptoms" value={intake.symptoms_duration} />
          <Row label="Previous Therapy" value={intake.previous_therapy === true ? "Yes" : intake.previous_therapy === false ? "No" : null} />
          <Row label="Previous Psychiatry" value={intake.previous_psychiatry === true ? "Yes" : intake.previous_psychiatry === false ? "No" : null} />
          <Row label="Prior Treatment Notes" value={intake.previous_treatment_notes} wide />
          <Row label="Prior Diagnoses" value={intake.previous_diagnoses} wide />
          <Row label="Family Mental Health History" value={intake.family_mental_health} wide />
          <Row label="Substance Use" value={intake.substance_use} wide />
        </Section>
      )}

      {hasBiopsych && (
        <Section title="Biopsychosocial & Social Determinants" color="var(--ehr-teal)">
          <Row label="Reason for Treatment" value={intake.biopsych_reason} wide />
          <Row label="Living Situation" value={intake.living_situation} />
          <Row label="Food Insecurity" value={intake.food_insecurity} />
          <Row label="Stress Level" value={intake.stress_level} />
          <Row label="Social Relationships" value={intake.social_relationships} wide />
          <Row label="Substance — Alcohol" value={intake.substance_alcohol} />
          <Row label="Substance — Tobacco" value={intake.substance_tobacco} />
          <Row label="Substance — Cannabis" value={intake.substance_cannabis} />
        </Section>
      )}

      {!hasBiopsych && !intake.reason_for_visit && (
        <EhrCard style={{ marginBottom: 14, background: "var(--ehr-bg)", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ehr-text)", marginBottom: 6 }}>
            Comprehensive clinical intake — coming soon
          </div>
          <p style={{ fontSize: 12, color: "var(--ehr-muted)", lineHeight: 1.65, margin: 0 }}>
            When Dr. Kenneth&apos;s full <strong>Psychiatric Evaluation Intake</strong> is live in the portal, this review will include
            medical history, medications, psychiatric history, family history, substance use, sleep, education, and telehealth agreements — all in one place.
          </p>
        </EhrCard>
      )}

      <Section title="Safety Screening" color="var(--ehr-rose)">
        <Row label="Suicidal Ideation" value={intake.suicidal_ideation || "Not answered"} />
        <Row label="Self-Harm" value={intake.self_harm || "Not answered"} />
        {intake.safety_plan && <Row label="Safety Notes" value={intake.safety_plan} wide />}
      </Section>
    </div>
  );
}
