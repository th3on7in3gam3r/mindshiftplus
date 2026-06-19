import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, SectionHeader, Spinner } from "./EHRUI";
import {
  getAggregateClaims, createClaim, sendInvoiceToPatient, deleteClaim,
  formatCents, parseDollars, CPT_CODES,
} from "../../lib/billingDb";
import { getAllCharts } from "../../lib/ehrDb";
import InvoicePrintView, { invoiceNumber } from "../billing/InvoicePrintView";

const STATUS_COLOR = { draft: "muted", submitted: "purple", accepted: "teal", denied: "rose", paid: "green" };

function SimpleInvoiceForm({ charts, clinician, onSaved, onCancel }) {
  const [chartId, setChartId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountDue, setAmountDue] = useState("");
  const [description, setDescription] = useState("");
  const [cptCode, setCptCode] = useState("90834");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedChart = charts.find((c) => c.id === chartId);

  const buildPayload = (sendToPatient) => {
    const cents = parseDollars(amountDue);
    const cpt = CPT_CODES.find((c) => c.code === cptCode);
    return {
      patient_id: selectedChart.patient_id,
      chart_id: selectedChart.id,
      service_date: serviceDate,
      amount_billed_cents: cents,
      patient_responsibility_cents: cents,
      amount_paid_insurance_cents: 0,
      copay_collected_cents: 0,
      cpt_codes: cpt ? [{ code: cpt.code, description: cpt.description }] : [],
      notes: description.trim() || null,
      created_by: clinician.user_id,
      claim_status: sendToPatient ? "submitted" : "draft",
      ...(sendToPatient ? { submitted_at: new Date().toISOString() } : {}),
    };
  };

  const handleSave = async (sendToPatient) => {
    setError(null);
    if (!chartId) { setError("Please select a patient."); return; }
    if (!amountDue || parseDollars(amountDue) <= 0) { setError("Please enter an amount due."); return; }
    setSaving(true);
    const { data, error: err } = await createClaim(buildPayload(sendToPatient));
    setSaving(false);
    if (err) {
      setError(typeof err === "string" ? err : err.message ?? "Failed to save invoice.");
      return;
    }
    onSaved({ ...data, patient_name: selectedChart.full_name });
  };

  return (
    <EhrCard style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 1rem" }}>+ New Invoice</h3>
      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <EhrSelect
          label="Patient"
          value={chartId}
          onChange={(e) => setChartId(e.target.value)}
          options={[
            { value: "", label: "Select patient…" },
            ...charts.map((c) => ({
              value: c.id,
              label: `${c.full_name || "Unknown"}${c.mrn ? ` (${c.mrn})` : ""}`,
            })),
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EhrInput label="Service Date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
          <EhrInput label="Amount Due ($)" type="number" min="0" step="0.01" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} placeholder="150.00" required />
        </div>
        <EhrSelect
          label="Service (CPT)"
          value={cptCode}
          onChange={(e) => setCptCode(e.target.value)}
          options={CPT_CODES.map((c) => ({ value: c.code, label: `${c.code} — ${c.description}` }))}
        />
        <EhrInput label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Follow-up psychotherapy session" rows={2} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <EhrBtn type="button" disabled={saving} onClick={() => handleSave(false)}>{saving ? "Saving…" : "Save as Draft"}</EhrBtn>
          <EhrBtn type="button" disabled={saving} onClick={() => handleSave(true)}>Save &amp; Send to Patient</EhrBtn>
          <EhrBtn type="button" variant="secondary" onClick={onCancel}>Cancel</EhrBtn>
        </div>
        <p style={{ fontSize: 12, color: "var(--ehr-muted2)", margin: 0 }}>
          <strong>Save &amp; Send to Patient</strong> makes the invoice visible in their Patient Portal → Billing.
        </p>
      </div>
    </EhrCard>
  );
}

export default function EHRInvoices({ clinician }) {
  const [claims, setClaims] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: claimsData, error: claimsErr }, { data: chartsData }] = await Promise.all([
      getAggregateClaims({ limit: 100 }),
      getAllCharts(),
    ]);
    if (claimsErr) setError(typeof claimsErr === "string" ? claimsErr : claimsErr.message ?? "Failed to load invoices.");
    else setClaims(claimsData ?? []);
    setCharts((chartsData ?? []).filter((c) => c.patient_id));
    setLoading(false);
  }

  async function handleSendToPatient(claim) {
    const { data, error: err } = await sendInvoiceToPatient(claim.id);
    if (err) { setError(err.message); return; }
    if (data) setClaims((prev) => prev.map((c) => (c.id === data.id ? { ...data, patient_name: claim.patient_name } : c)));
  }

  async function handleDelete(claim) {
    if (!confirm("Delete this draft invoice?")) return;
    const { error: err } = await deleteClaim(claim.id);
    if (err) { setError(typeof err === "string" ? err : err.message); return; }
    setClaims((prev) => prev.filter((c) => c.id !== claim.id));
  }

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeader
        title="Invoices"
        subtitle="Create an invoice for a patient — they’ll see it in Patient Portal → Billing"
        action={<EhrBtn small onClick={() => setShowForm((v) => !v)}>{showForm ? "Close Form" : "+ New Invoice"}</EhrBtn>}
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <SimpleInvoiceForm
          charts={charts}
          clinician={clinician}
          onCancel={() => setShowForm(false)}
          onSaved={(saved) => {
            setClaims((prev) => [saved, ...prev]);
            setShowForm(false);
            setError(null);
          }}
        />
      )}

      {loading ? <Spinner /> : claims.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14, marginBottom: 12 }}>No invoices yet.</div>
          <EhrBtn small onClick={() => setShowForm(true)}>+ Create First Invoice</EhrBtn>
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {claims.map((claim) => (
            <EhrCard key={claim.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 4 }}>
                    {claim.patient_name || "Patient"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ehr-muted)" }}>{invoiceNumber(claim)}</span>
                    <span style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>{claim.service_date ?? "—"}</span>
                    <EhrBadge color={STATUS_COLOR[claim.claim_status] ?? "muted"}>{claim.claim_status}</EhrBadge>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>
                    Due: <strong style={{ color: "var(--ehr-text)" }}>{formatCents(claim.patient_responsibility_cents)}</strong>
                    {claim.notes && <span> · {claim.notes}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <EhrBtn small onClick={() => setSelected(claim)}>🧾 View / Print</EhrBtn>
                  {claim.claim_status === "draft" && (
                    <>
                      <EhrBtn small variant="teal" onClick={() => handleSendToPatient(claim)}>📤 Send to Patient</EhrBtn>
                      <EhrBtn small variant="danger" onClick={() => handleDelete(claim)}>Delete</EhrBtn>
                    </>
                  )}
                </div>
              </div>
            </EhrCard>
          ))}
        </div>
      )}

      {selected && (
        <InvoicePrintView
          claim={selected}
          patientName={selected.patient_name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
