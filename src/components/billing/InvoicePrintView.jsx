import { formatCents } from "../../lib/billingDb";

export const CLINIC_INFO = {
  name: "MindShift Wellness Clinic",
  address: "31 Granite St. Suite #2, Milford, MA 01757",
  phone: "(508) 306-1128",
  email: "info@mindshiftwellnessclinic.org",
  website: "www.mindshiftwellnessclinic.org",
};

export function invoiceNumber(claim) {
  return `INV-${claim.id.slice(0, 8).toUpperCase()}`;
}

export function invoiceTotalDue(claim) {
  return Math.max(0, (claim.patient_responsibility_cents ?? 0) - (claim.copay_collected_cents ?? 0));
}

/** Shared printable invoice body (EHR + patient portal). */
export default function InvoicePrintView({ claim, patientName, onClose, showActions = true }) {
  const invNum = invoiceNumber(claim);
  const totalDue = invoiceTotalDue(claim);

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1f36", marginBottom: 4 }}>{CLINIC_INFO.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                {CLINIC_INFO.address}<br />
                {CLINIC_INFO.phone} · {CLINIC_INFO.email}<br />
                {CLINIC_INFO.website}
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

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1f36" }}>{patientName || "Patient"}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Service Date: {claim.service_date ?? "—"}</div>
          </div>

          {claim.notes && (
            <div style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", marginBottom: "1.5rem", fontSize: 13, color: "#374151" }}>
              {claim.notes}
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["CPT Code", "Description", "Amount"].map((h) => (
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
                <tr>
                  <td colSpan={3} style={{ padding: "8px 12px", color: "#94a3b8", fontStyle: "italic" }}>
                    {claim.notes ? "See description above" : "Office visit / clinical services"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ background: "#f8faff", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
            {[
              ["Amount Billed", formatCents(claim.amount_billed_cents)],
              ["Insurance Paid", formatCents(claim.amount_paid_insurance_cents)],
              ["Patient Responsibility", formatCents(claim.patient_responsibility_cents)],
              ["Copay Collected", formatCents(claim.copay_collected_cents)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#1a1f36" }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 16, fontWeight: 800 }}>
              <span style={{ color: "#1a1f36" }}>Total Due</span>
              <span style={{ color: totalDue > 0 ? "#e05c7a" : "#16a34a" }}>{formatCents(totalDue)}</span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: "1.5rem" }}>
            Thank you for choosing MindShift Wellness Clinic. Questions? Call {CLINIC_INFO.phone}.
          </div>

          {showActions && (
            <div className="invoice-modal-close-btn" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {onClose && <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Close</button>}
              <button type="button" onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#4a6cf7,#0ea5a0)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>🖨️ Print / Save PDF</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
