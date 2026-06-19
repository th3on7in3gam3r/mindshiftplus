import { useState, useEffect } from "react";
import { PageHeader, Card, Badge, EmptyState, Alert, SectionDivider, Btn, T } from "./PortalUI";
import { getMyBilling, computePatientBalance, formatCents } from "../../lib/billingDb";
import InvoicePrintView, { invoiceNumber, invoiceTotalDue } from "../billing/InvoicePrintView";

const STATUS_BADGE = {
  draft:     { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  submitted: { bg: "#ede9fe", color: "#5b21b6",  label: "Due" },
  accepted:  { bg: "#ccfbf1", color: "#0f766e",  label: "Accepted" },
  denied:    { bg: "#fee2e2", color: "#991b1b",  label: "Denied" },
  paid:      { bg: "#dcfce7", color: "#166534",  label: "Paid" },
};

export default function PortalBilling({ userId, P }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getMyBilling(userId).then(({ data, error: err }) => {
      if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load billing.");
      else setClaims((data ?? []).filter((c) => c.claim_status !== "draft"));
      setLoading(false);
    });
  }, [userId]);

  const balance = computePatientBalance(claims);

  if (loading) return (
    <div style={{ padding: "2rem", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", color: T.muted, fontSize: 14 }}>Loading billing…</div>
    </div>
  );

  return (
    <div style={{ padding: "1.5rem", fontFamily: "'Inter',system-ui,sans-serif", maxWidth: 860, margin: "0 auto" }}>
      <PageHeader
        icon="💳"
        label="Billing"
        title="My Billing"
        subtitle="View invoices from your care team"
      />

      {error && <Alert type="error" icon="⚠️" title="Error loading billing" subtitle={error} />}

      {balance > 0 && (
        <Alert
          type="warning"
          icon="💰"
          title={`Balance Due: ${formatCents(balance)}`}
          subtitle="Contact the clinic at (508) 306-1128 to arrange payment."
        />
      )}

      {claims.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No invoices yet"
          subtitle="When your clinician sends an invoice, it will appear here."
        />
      ) : (
        <>
          <SectionDivider label="Invoices" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {claims.map((claim) => (
              <ClaimSummaryRow key={claim.id} claim={claim} onView={() => setViewing(claim)} />
            ))}
          </div>
        </>
      )}

      {viewing && (
        <InvoicePrintView
          claim={viewing}
          patientName="You"
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function ClaimSummaryRow({ claim, onView }) {
  const badge = STATUS_BADGE[claim.claim_status] ?? STATUS_BADGE.submitted;
  const due = invoiceTotalDue(claim);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{invoiceNumber(claim)}</span>
            <span style={{ fontSize: 13, color: T.muted }}>{claim.service_date}</span>
            <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
              {badge.label}
            </span>
          </div>

          {claim.notes && (
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>{claim.notes}</div>
          )}

          {(claim.cpt_codes ?? []).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {claim.cpt_codes.map((c) => (
                <span key={c.code} style={{
                  background: `${T.accent}12`, color: T.accent,
                  border: `1px solid ${T.accent}25`,
                  borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                }}>
                  {c.code}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 14, fontWeight: 700, color: due > 0 ? "#e05c7a" : T.teal }}>
            {due > 0 ? `Amount Due: ${formatCents(due)}` : "Paid in full"}
          </div>
        </div>
        <Btn onClick={onView}>View Invoice</Btn>
      </div>

      {claim.claim_status === "denied" && (
        <div style={{
          marginTop: "0.8rem",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "8px 12px",
          fontSize: 12, color: "#991b1b",
        }}>
          ⚠️ This claim was denied. Please contact the clinic for assistance.
        </div>
      )}
    </Card>
  );
}
