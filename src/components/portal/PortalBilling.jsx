import { useState, useEffect } from "react";
import { PageHeader, Card, Badge, EmptyState, Alert, SectionDivider, T } from "./PortalUI";
import { getMyBilling, computePatientBalance, formatCents } from "../../lib/billingDb";

const STATUS_BADGE = {
  draft:     { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  submitted: { bg: "#ede9fe", color: "#5b21b6",  label: "Submitted" },
  accepted:  { bg: "#ccfbf1", color: "#0f766e",  label: "Accepted" },
  denied:    { bg: "#fee2e2", color: "#991b1b",  label: "Denied" },
  paid:      { bg: "#dcfce7", color: "#166534",  label: "Paid" },
};

export default function PortalBilling({ userId, P }) {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!userId) return;
    getMyBilling(userId).then(({ data, error: err }) => {
      if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load billing.");
      else setClaims(data ?? []);
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
        subtitle="View your claims and balance"
      />

      {error && (
        <Alert type="error" icon="⚠️" title="Error loading billing" subtitle={error} />
      )}

      {/* Balance banner */}
      {balance > 0 && (
        <Alert
          type="warning"
          icon="💰"
          title={`Balance Due: ${formatCents(balance)}`}
          subtitle="You have an outstanding balance. Please contact the clinic to arrange payment."
        />
      )}

      {claims.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No billing records"
          subtitle="Your billing history will appear here once claims are processed."
        />
      ) : (
        <>
          <SectionDivider label="Claims" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {claims.map(claim => (
              <ClaimSummaryRow key={claim.id} claim={claim} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ClaimSummaryRow({ claim }) {
  const badge = STATUS_BADGE[claim.claim_status] ?? STATUS_BADGE.draft;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          {/* Date + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{claim.service_date}</span>
            <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
              {badge.label}
            </span>
          </div>

          {/* CPT codes */}
          {(claim.cpt_codes ?? []).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {claim.cpt_codes.map(c => (
                <span key={c.code} style={{
                  background: `${T.accent}12`, color: T.accent,
                  border: `1px solid ${T.accent}25`,
                  borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                }}>
                  {c.code} — {c.description}
                </span>
              ))}
            </div>
          )}

          {/* Financial breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
            {[
              ["Billed",           claim.amount_billed_cents],
              ["Insurance Paid",   claim.amount_paid_insurance_cents],
              ["Your Responsibility", claim.patient_responsibility_cents],
              ["Copay Collected",  claim.copay_collected_cents],
            ].map(([label, cents]) => (
              <div key={label} style={{ fontSize: 12 }}>
                <span style={{ color: T.muted }}>{label}: </span>
                <span style={{ fontWeight: 600, color: T.text }}>{formatCents(cents ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Denied notice */}
      {claim.claim_status === "denied" && (
        <div style={{
          marginTop: "0.8rem",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "8px 12px",
          fontSize: 12, color: "#991b1b",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>⚠️</span>
          <span>This claim was denied. Please <strong>contact the clinic</strong> for assistance.</span>
        </div>
      )}
    </Card>
  );
}
