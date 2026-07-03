import { formatCents, superbillNumber, placeOfServiceLabel } from "../../lib/billingDb";

function providerTaxonomy(settings, claim) {
  const providers = settings?.providers ?? [];
  const match = providers.find((p) => p.name === claim.rendering_provider_name);
  return match?.taxonomy ?? "363LP0808X";
}

/** Printable insurance superbill for manual/clearinghouse submission. */
export default function SuperbillPrintView({
  claim,
  chart,
  settings,
  patientName,
  onClose,
  showActions = true,
}) {
  const sbNum = superbillNumber(claim);
  const clinic = settings ?? {};
  const icd10 = claim.icd10_codes ?? [];
  const cpt = claim.cpt_codes ?? [];

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#superbill-print-root) { display: none !important; }
          #superbill-print-root { display: block !important; position: static !important; }
          .superbill-modal-overlay { position: static !important; background: none !important; }
          .superbill-modal-close-btn { display: none !important; }
        }
      `}</style>
      <div id="superbill-print-root" className="superbill-modal-overlay" style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{
          background: "#fff", color: "#1a1f36", borderRadius: 16,
          width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto",
          padding: "2rem 2.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{clinic.clinic_name || "MindShift Wellness Clinic"}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, fontFamily: "system-ui, sans-serif" }}>
                {(clinic.billing_address || "").split(",").map((part, i) => (
                  <span key={i}>{part.trim()}{i === 0 ? <br /> : i < 2 ? ", " : ""}</span>
                ))}
                <br />
                {clinic.phone} · {clinic.email}
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: "system-ui, sans-serif" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b" }}>SUPERBILL</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#3b5bdb" }}>{sbNum}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Service: {claim.service_date}</div>
            </div>
          </div>

          <div style={{ height: 2, background: "#1a1f36", marginBottom: "1.25rem" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.25rem", fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Patient</div>
              <div style={{ fontWeight: 700 }}>{patientName || chart?.full_name || "—"}</div>
              {chart?.date_of_birth && <div style={{ color: "#64748b" }}>DOB: {chart.date_of_birth}</div>}
              {chart?.gender && <div style={{ color: "#64748b" }}>Gender: {chart.gender}</div>}
              {chart?.phone && <div style={{ color: "#64748b" }}>Phone: {chart.phone}</div>}
              {chart?.address && <div style={{ color: "#64748b" }}>{chart.address}</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Insurance</div>
              <div style={{ fontWeight: 700 }}>{claim.insurance_provider || chart?.insurance_provider || "—"}</div>
              <div style={{ color: "#64748b" }}>Member ID: {claim.insurance_member_id || chart?.insurance_member_id || "—"}</div>
              <div style={{ color: "#64748b" }}>Group: {claim.insurance_group || chart?.insurance_group || "—"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.25rem", fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Rendering Provider</div>
              <div style={{ fontWeight: 700 }}>{claim.rendering_provider_name || "—"}</div>
              <div style={{ color: "#64748b" }}>
                NPI: {claim.rendering_provider_npi || <span style={{ color: "#dc2626" }}>Not set — add in Billing Settings</span>}
              </div>
              <div style={{ color: "#64748b" }}>Taxonomy: {providerTaxonomy(settings, claim)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>Visit</div>
              <div style={{ color: "#64748b" }}>Place of Service: {placeOfServiceLabel(claim.place_of_service)}</div>
              <div style={{ color: "#64748b" }}>Status: {claim.claim_status}</div>
              {claim.amount_billed_cents > 0 && (
                <div style={{ fontWeight: 700, marginTop: 4 }}>Charges: {formatCents(claim.amount_billed_cents)}</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "1rem", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 8 }}>Diagnosis (ICD-10)</div>
            {icd10.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {icd10.map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700, width: 90 }}>{d.code}</td>
                      <td style={{ padding: "6px 8px", color: "#374151" }}>{d.label || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No diagnosis codes on file</div>
            )}
          </div>

          <div style={{ marginBottom: "1.25rem", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 8 }}>Procedures (CPT)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8faff" }}>
                  {["Date", "CPT", "Description", "Fee"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cpt.length ? cpt.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px" }}>{claim.service_date}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#3b5bdb" }}>{c.code}</td>
                    <td style={{ padding: "8px 10px" }}>{c.description ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{claim.amount_billed_cents > 0 && cpt.length === 1 ? formatCents(claim.amount_billed_cents) : "—"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 10px", color: "#94a3b8", fontStyle: "italic" }}>No CPT codes — add before submitting</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {claim.notes && (
            <div style={{ background: "#f8faff", borderRadius: 8, padding: "10px 12px", marginBottom: "1rem", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
              <strong>Notes:</strong> {claim.notes}
            </div>
          )}

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", marginTop: "1rem", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              <div>
                <div style={{ borderBottom: "1px solid #1a1f36", height: 36, marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: "#64748b" }}>Provider Signature</div>
              </div>
              <div>
                <div style={{ borderBottom: "1px solid #1a1f36", height: 36, marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: "#64748b" }}>Date</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: "1.25rem", fontFamily: "system-ui, sans-serif" }}>
            For insurance submission only. Not a patient invoice. Print and attach to CMS-1500 or upload to your clearinghouse portal.
          </div>

          {showActions && (
            <div className="superbill-modal-close-btn" style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1.25rem", fontFamily: "system-ui, sans-serif" }}>
              {onClose && (
                <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>
                  Close
                </button>
              )}
              <button type="button" onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#4a6cf7,#0ea5a0)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                🖨️ Print / Save PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
