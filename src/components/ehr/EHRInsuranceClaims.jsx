import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrBadge, SectionHeader, Spinner } from "./EHRUI";
import {
  getInsuranceClaimsWorklist,
  getSignedNotesWithoutClaims,
  createClaimFromNote,
  updateClaim,
  getBillingSettings,
  formatCents,
} from "../../lib/billingDb";
import { getChart } from "../../lib/ehrDb";
import SuperbillPrintView from "../billing/SuperbillPrintView";

const STATUS_COLOR = {
  draft: "muted",
  submitted: "purple",
  accepted: "teal",
  denied: "rose",
  paid: "green",
};

export default function EHRInsuranceClaims({ clinician, onOpenSettings }) {
  const [claims, setClaims] = useState([]);
  const [readyNotes, setReadyNotes] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const [error, setError] = useState(null);
  const [printClaim, setPrintClaim] = useState(null);
  const [printChart, setPrintChart] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const [claimsRes, notesRes, settingsRes] = await Promise.all([
      getInsuranceClaimsWorklist({ statusFilter }),
      getSignedNotesWithoutClaims(),
      getBillingSettings(),
    ]);
    if (claimsRes.error) setError(typeof claimsRes.error === "string" ? claimsRes.error : claimsRes.error.message ?? "Failed to load claims.");
    else {
      setClaims(claimsRes.data ?? []);
      setCounts(claimsRes.counts ?? {});
    }
    if (!notesRes.error) setReadyNotes(notesRes.data ?? []);
    setSettings(settingsRes.data);
    setLoading(false);
  }

  async function handleCreateFromNote(note) {
    setCreating(note.id);
    setError(null);
    const chart = note.chart ?? note.ehr_charts;
    if (!chart?.patient_id) {
      setError("Chart missing patient link.");
      setCreating(null);
      return;
    }
    const { data, error: err } = await createClaimFromNote({ note, chart, clinician });
    setCreating(null);
    if (err) setError(typeof err === "string" ? err : err.message ?? "Could not create claim.");
    else {
      setReadyNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (data) setClaims((prev) => [{ ...data, patient_name: chart.full_name }, ...prev]);
    }
  }

  async function handleMarkSubmitted(id) {
    const { data, error: err } = await updateClaim(id, { claim_status: "submitted" });
    if (err) setError(typeof err === "string" ? err : err.message ?? "Update failed.");
    else if (data) setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }

  async function handlePrint(claim) {
    const { data: chart } = await getChart(claim.chart_id);
    setPrintChart(chart);
    setPrintClaim(claim);
  }

  const statuses = ["draft", "submitted", "accepted", "denied", "paid"];

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "1rem" }}>
        <SectionHeader
          title="Insurance Claims"
          subtitle="Create claims from signed notes, print superbills, track submission status"
        />
        {onOpenSettings && (
          <EhrBtn variant="secondary" small onClick={onOpenSettings}>⚙️ Billing Settings</EhrBtn>
        )}
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--ehr-rose) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ehr-rose) 30%, transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {statuses.map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(statusFilter === s ? null : s)} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: statusFilter === s ? `color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 20%, transparent)` : "var(--ehr-card2)",
            border: `1px solid color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 35%, transparent)`,
            borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600,
            color: `var(--ehr-${STATUS_COLOR[s]})`, cursor: "pointer", fontFamily: "inherit",
          }}>
            {s}
            <span style={{ background: `color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 20%, transparent)`, borderRadius: 20, padding: "1px 7px", fontSize: 11 }}>
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Ready to bill */}
      {readyNotes.length > 0 && (
        <EhrCard style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ehr-teal)" }}>
            Ready to Bill ({readyNotes.length})
          </h3>
          <p style={{ fontSize: 12, color: "var(--ehr-muted)", margin: "0 0 1rem" }}>
            Signed visit notes without an insurance claim yet.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {readyNotes.slice(0, 15).map((note) => {
              const chart = note.chart ?? note.ehr_charts;
              const cptCount = (note.cpt_codes ?? []).length;
              return (
                <div key={note.id} style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "0.75rem 1rem", background: "var(--ehr-card2)", borderRadius: 10,
                  border: "1px solid var(--ehr-border)",
                }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{chart?.full_name ?? note.patient_name}</div>
                    <div style={{ fontSize: 12, color: "var(--ehr-muted)" }}>
                      {note.note_date} · {note.clinician_name}
                      {cptCount ? ` · ${cptCount} CPT` : " · ⚠️ no CPT"}
                    </div>
                  </div>
                  <EhrBtn
                    small
                    disabled={creating === note.id}
                    onClick={() => handleCreateFromNote(note)}
                  >
                    {creating === note.id ? "Creating…" : "+ Create Claim"}
                  </EhrBtn>
                </div>
              );
            })}
          </div>
        </EhrCard>
      )}

      {/* Claims list */}
      <EhrCard>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 1rem" }}>
          Claims {statusFilter ? `(${statusFilter})` : ""}
        </h3>
        {loading ? <Spinner /> : claims.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--ehr-muted)", fontSize: 14 }}>
            No insurance claims yet. Sign a visit note with CPT codes, then create a claim above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {claims.map((claim) => (
              <div key={claim.id} style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "0.75rem 1rem", background: "var(--ehr-card2)", borderRadius: 10,
                border: "1px solid var(--ehr-border)", fontSize: 13,
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{claim.patient_name ?? "Patient"}</div>
                  <div style={{ color: "var(--ehr-muted)", fontSize: 12 }}>
                    {claim.service_date}
                    <span style={{ display: "inline-flex", gap: 4, marginLeft: 6, flexWrap: "wrap" }}>
                      {(claim.cpt_codes ?? []).map((c) => (
                        <EhrBadge key={c.code} color="purple">{c.code}</EhrBadge>
                      ))}
                    </span>
                  </div>
                  {claim.insurance_provider && (
                    <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginTop: 2 }}>{claim.insurance_provider}</div>
                  )}
                </div>
                {claim.amount_billed_cents > 0 && (
                  <span style={{ fontWeight: 600 }}>{formatCents(claim.amount_billed_cents)}</span>
                )}
                <EhrBadge color={STATUS_COLOR[claim.claim_status] ?? "muted"}>{claim.claim_status}</EhrBadge>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <EhrBtn small variant="secondary" onClick={() => handlePrint(claim)}>🖨 Superbill</EhrBtn>
                  {claim.claim_status === "draft" && (
                    <EhrBtn small onClick={() => handleMarkSubmitted(claim.id)}>Mark Submitted</EhrBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </EhrCard>

      {printClaim && (
        <SuperbillPrintView
          claim={printClaim}
          chart={printChart}
          settings={settings}
          patientName={printChart?.full_name ?? printClaim.patient_name}
          onClose={() => { setPrintClaim(null); setPrintChart(null); }}
        />
      )}
    </div>
  );
}
