import { EhrCard } from "../ehr/EHRUI";

/** Plain-language superbill explanation for clinicians — reusable on Billing Settings & Insurance Claims. */
export default function SuperbillGuide({ onDismiss, compact = false }) {
  const steps = [
    { n: 1, title: "Sign visit note", detail: "With CPT codes + diagnosis (ICD-10)" },
    { n: 2, title: "Create insurance claim", detail: "Finance → Insurance Claims" },
    { n: 3, title: "Print Superbill", detail: "Professional PDF for the payer" },
    { n: 4, title: "Submit to insurance", detail: "Clearinghouse, fax, or mail (outside MindShift for now)" },
  ];

  return (
    <EhrCard style={{
      marginBottom: "1rem",
      background: "linear-gradient(135deg, color-mix(in srgb,var(--ehr-teal) 8%,var(--ehr-card)), color-mix(in srgb,var(--ehr-accent) 6%,var(--ehr-card)))",
      border: "1px solid color-mix(in srgb,var(--ehr-teal) 22%,transparent)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 8 }}>
            What is a Superbill?
          </div>
          <p style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.7, margin: "0 0 12px" }}>
            A <strong>superbill</strong> (also called an HCFA-style itemized statement) is the document insurance companies need to pay for a visit.
            It lists the <strong>patient</strong>, <strong>insurance info</strong>, <strong>provider NPI</strong>, <strong>date of service</strong>,
            <strong> diagnosis codes (ICD-10)</strong>, and <strong>procedure codes (CPT)</strong> with charges.
            MindShift <strong>builds and prints</strong> this for you — it does <strong>not</strong> electronically submit to payers yet (Phase 1).
          </p>
          {!compact && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {steps.map((s) => (
                  <div key={s.n} style={{
                    flex: "1 1 120px",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "var(--ehr-bg)",
                    border: "1px solid var(--ehr-border)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ehr-teal)" }}>Step {s.n}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ehr-text)" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 2 }}>{s.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--ehr-muted2)", lineHeight: 1.55 }}>
                <strong>Not the same as Invoices:</strong> Invoices are for patient self-pay in the portal. Superbills are for <strong>insurance reimbursement</strong>.
                {" "}This page (Billing Settings) stores clinic address, Tax ID, and each provider&apos;s <strong>NPI</strong> — required on every superbill.
              </div>
            </>
          )}
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 18 }} aria-label="Dismiss">×</button>
        )}
      </div>
    </EhrCard>
  );
}
