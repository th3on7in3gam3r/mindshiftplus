import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrBadge, SectionHeader, Spinner } from "./EHRUI";
import { getAggregateClaims, formatCents } from "../../lib/billingDb";

const STATUS_COLOR = { draft: "muted", submitted: "purple", accepted: "teal", denied: "rose", paid: "green" };

const CLINIC = {
  name:    "MindShift Wellness Clinic",
  address: "31 Granite St. Suite #2, Milford, MA 01757",
  phone:   "(508) 306-1128",
  email:   "info@mindshiftwellnessclinic.org",
  website: "www.mindshiftwellnessclinic.org",
};

function InvoiceModal({ claim, onClose }) {
  const invNum = `INV-${claim.id.slice(0, 8).toUpperCase()}`;
  const totalDue = (claim.patient_responsibility_cents ?? 0) - (claim.copay_collected_cents ?? 0);

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; position: static !important; }
          .invoice-modal-overlay { position: static !important; background: none !important; }
          .invoice-modal-close-btn { display: none !important; }
        }
      `}</style>
      <div id="invoice-print-root" className="invoice-modal-overlay" style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{
          background: "#fff", color: "#1a1f36", borderRadius: 16,
          width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto",
          padding: "2.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1f36", marginBottom: 4 }}>{CLINIC.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                {CLINIC.address}<br />
                {CLINIC.phone} · {CLINIC.email}<br />
                {CLINIC.website}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#3b5bdb" }}>{invNum}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Date: {claim.service_date ?? new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#e2e8f0", marginBottom: "1.5rem" }} />

          {/* Patient info */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1f36" }}>Patient</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Service Date: {claim.service_date ?? "—"}</div>
          </div>

          {/* CPT codes table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["CPT Code", "Description", "Amount"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(claim.cpt_codes ?? []).length > 0 ? (claim.cpt_codes ?? []).map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#3b5bdb" }}>{c.code}</td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>{c.description ?? "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>—</td>
                </tr>
              )) : (
                <tr><td colSpan={3} style={{ padding: "8px 12px", color: "#94a3b8", fontStyle: "italic" }}>No CPT codes on file.</td></tr>
              )}
            </tbody>
          </table>

          {/* Amounts */}
          <div style={{ background: "#f8faff", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
            {[
              ["Amount Billed",          formatCents(claim.amount_billed_cents)],
              ["Insurance Paid",         formatCents(claim.amount_paid_insurance_cents)],
              ["Patient Responsibility", formatCents(claim.patient_responsibility_cents)],
              ["Copay Collected",        formatCents(claim.copay_collected_cents)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#1a1f36" }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 16, fontWeight: 800 }}>
              <span style={{ color: "#1a1f36" }}>Total Due</span>
              <span style={{ color: totalDue > 0 ? "#e05c7a" : "#16a34a" }}>{formatCents(Math.max(0, totalDue))}</span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: "1.5rem" }}>
            Thank you for choosing MindShift Wellness Clinic. Questions? Call {CLINIC.phone}.
          </div>

          {/* Actions */}
          <div className="invoice-modal-close-btn" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <EhrBtn variant="secondary" small onClick={onClose}>Close</EhrBtn>
            <EhrBtn variant="teal" small onClick={() => { alert("Invoice emailed (coming soon)."); }}>📧 Email Invoice</EhrBtn>
            <EhrBtn small onClick={() => window.print()}>🖨️ Print / Save PDF</EhrBtn>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EHRInvoices({ clinician }) {
  const [claims, setClaims]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getAggregateClaims({ limit: 100 });
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load claims.");
    else setClaims(data ?? []);
    setLoading(false);
  }

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeader title="Invoices" subtitle="Generate printable invoices from billing claims" />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? <Spinner /> : claims.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No claims found. Create billing claims first.</div>
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {claims.map(claim => (
            <EhrCard key={claim.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)" }}>
                      INV-{claim.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>{claim.service_date ?? "—"}</span>
                    {(claim.cpt_codes ?? []).map(c => (
                      <EhrBadge key={c.code} color="purple">{c.code}</EhrBadge>
                    ))}
                    <EhrBadge color={STATUS_COLOR[claim.claim_status] ?? "muted"}>{claim.claim_status}</EhrBadge>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--ehr-muted2)" }}>
                    <span>Billed: <strong style={{ color: "var(--ehr-text)" }}>{formatCents(claim.amount_billed_cents)}</strong></span>
                    <span>Ins. Paid: <strong style={{ color: "var(--ehr-text)" }}>{formatCents(claim.amount_paid_insurance_cents)}</strong></span>
                    <span>Patient Resp.: <strong style={{ color: "var(--ehr-text)" }}>{formatCents(claim.patient_responsibility_cents)}</strong></span>
                  </div>
                </div>
                <EhrBtn small onClick={() => setSelected(claim)}>🧾 Generate Invoice</EhrBtn>
              </div>
            </EhrCard>
          ))}
        </div>
      )}

      {selected && <InvoiceModal claim={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
