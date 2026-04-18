import { useState, useEffect, useRef } from "react";
import {
  EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, SectionHeader, Spinner,
} from "./EHRUI";
import {
  getClaims, getAggregateClaims, createClaim, updateClaim, deleteClaim,
  formatCents, parseDollars, filterCptCodes, computePatientBalance, validateFinancials,
} from "../../lib/billingDb";

// ── Status badge colors ────────────────────────────────────────────────────────
const STATUS_COLOR = {
  draft:     "muted",
  submitted: "purple",
  accepted:  "teal",
  denied:    "rose",
  paid:      "green",
};

function ClaimStatusBadge({ status }) {
  return <EhrBadge color={STATUS_COLOR[status] ?? "muted"}>{status}</EhrBadge>;
}

// ── CptPicker ─────────────────────────────────────────────────────────────────
export function CptPicker({ value = [], onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  const results = filterCptCodes(query).filter(c => !value.some(v => v.code === c.code));

  useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  const add = (item) => {
    onChange([...value, item]);
    setQuery("");
    setOpen(false);
  };

  const remove = (code) => onChange(value.filter(v => v.code !== code));

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        CPT Codes
      </label>
      {/* Selected chips */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
          {value.map(c => (
            <span key={c.code} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "color-mix(in srgb, var(--ehr-accent) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ehr-accent) 30%, transparent)",
              borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "var(--ehr-accent)",
            }}>
              <strong>{c.code}</strong>
              <span style={{ color: "var(--ehr-muted)", fontSize: 11 }}>{c.description}</span>
              <button type="button" onClick={() => remove(c.code)} style={{
                background: "transparent", border: "none", color: "var(--ehr-muted2)",
                cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0, marginLeft: 2,
              }}>×</button>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search CPT codes…"
          className="ehr-input"
          style={{ paddingRight: 36 }}
        />
        {open && results.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300,
            background: "var(--ehr-surface)", border: "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)",
            borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden",
          }}>
            {results.slice(0, 8).map(item => (
              <button key={item.code} type="button" onClick={() => add(item)}
                style={{
                  display: "flex", alignItems: "baseline", gap: 10, width: "100%",
                  padding: "10px 14px", background: "transparent", border: "none",
                  borderBottom: "1px solid var(--ehr-border)", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb,var(--ehr-accent) 10%,transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ehr-accent)", flexShrink: 0, minWidth: 56 }}>{item.code}</span>
                <span style={{ fontSize: 13, color: "var(--ehr-muted)" }}>{item.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BalanceSummary ─────────────────────────────────────────────────────────────
export function BalanceSummary({ claims }) {
  const balance = computePatientBalance(claims);
  const hasBalance = balance > 0;

  return (
    <div style={{
      padding: "0.9rem 1.2rem",
      borderRadius: 12,
      background: hasBalance
        ? "color-mix(in srgb, var(--ehr-gold) 12%, transparent)"
        : "color-mix(in srgb, var(--ehr-green) 10%, transparent)",
      border: `1px solid color-mix(in srgb, ${hasBalance ? "var(--ehr-gold)" : "var(--ehr-green)"} 30%, transparent)`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 20 }}>{hasBalance ? "⚠️" : "✅"}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: hasBalance ? "var(--ehr-gold)" : "var(--ehr-green)" }}>
          Patient Balance
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: hasBalance ? "var(--ehr-rose)" : "var(--ehr-green)" }}>
          {hasBalance ? formatCents(balance) : "No Balance Due"}
        </div>
      </div>
    </div>
  );
}

// ── Dollar input helper ────────────────────────────────────────────────────────
function DollarInput({ label, valueCents, onChange }) {
  const [raw, setRaw] = useState((valueCents / 100).toFixed(2));

  useEffect(() => {
    setRaw((valueCents / 100).toFixed(2));
  }, [valueCents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ehr-muted2)", fontSize: 14 }}>$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={raw}
          onChange={e => { setRaw(e.target.value); onChange(parseDollars(e.target.value)); }}
          className="ehr-input"
          style={{ paddingLeft: 24 }}
        />
      </div>
    </div>
  );
}

// ── ClaimForm ─────────────────────────────────────────────────────────────────
function ClaimForm({ claim, chartId, patientId, createdBy, onSaved, onCancel }) {
  const [form, setForm] = useState({
    id: claim?.id,
    service_date: claim?.service_date ?? new Date().toISOString().slice(0, 10),
    cpt_codes: claim?.cpt_codes ?? [],
    amount_billed_cents: claim?.amount_billed_cents ?? 0,
    amount_paid_insurance_cents: claim?.amount_paid_insurance_cents ?? 0,
    patient_responsibility_cents: claim?.patient_responsibility_cents ?? 0,
    copay_collected_cents: claim?.copay_collected_cents ?? 0,
    claim_status: claim?.claim_status ?? "draft",
    notes: claim?.notes ?? "",
    chart_id: chartId,
    patient_id: patientId,
    created_by: createdBy,
    appointment_id: claim?.appointment_id ?? null,
    note_id: claim?.note_id ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);

  const set = (key) => (val) => setForm(f => {
    const updated = { ...f, [key]: val };
    setWarning(validateFinancials(updated));
    return updated;
  });

  const setE = (key) => (e) => set(key)(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const w = validateFinancials(form);
    if (w && form.claim_status === "paid") {
      setWarning(w);
      return;
    }
    setSaving(true);
    // Ensure at least appointment_id or note_id — use a placeholder note_id if neither set
    const payload = { ...form };
    if (!payload.appointment_id && !payload.note_id) {
      payload.note_id = "00000000-0000-0000-0000-000000000000";
    }
    let result;
    if (form.id) {
      result = await updateClaim(form.id, payload);
    } else {
      result = await createClaim(payload);
    }
    setSaving(false);
    if (!result.error) onSaved(result.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>
          {form.id ? "Edit Claim" : "New Claim"}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <EhrBtn variant="secondary" onClick={onCancel} type="button" small>Cancel</EhrBtn>
          <EhrBtn type="submit" disabled={saving} small>{saving ? "Saving…" : "Save Claim"}</EhrBtn>
        </div>
      </div>

      {warning && (
        <div style={{
          background: "color-mix(in srgb, var(--ehr-gold) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ehr-gold) 35%, transparent)",
          borderRadius: 10, padding: "10px 14px", fontSize: 13,
          color: "var(--ehr-gold)", marginBottom: "1rem",
        }}>
          ⚠️ {warning}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EhrInput label="Service Date" type="date" value={form.service_date} onChange={e => set("service_date")(e.target.value)} required />
          <EhrSelect label="Claim Status" value={form.claim_status} onChange={e => set("claim_status")(e.target.value)} options={[
            { value: "draft",     label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "accepted",  label: "Accepted" },
            { value: "denied",    label: "Denied" },
            { value: "paid",      label: "Paid" },
          ]} />
        </div>

        <CptPicker value={form.cpt_codes} onChange={set("cpt_codes")} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DollarInput label="Amount Billed" valueCents={form.amount_billed_cents} onChange={set("amount_billed_cents")} />
          <DollarInput label="Amount Paid (Insurance)" valueCents={form.amount_paid_insurance_cents} onChange={set("amount_paid_insurance_cents")} />
          <DollarInput label="Patient Responsibility" valueCents={form.patient_responsibility_cents} onChange={set("patient_responsibility_cents")} />
          <DollarInput label="Copay Collected" valueCents={form.copay_collected_cents} onChange={set("copay_collected_cents")} />
        </div>

        <EhrInput label="Notes" value={form.notes} onChange={setE("notes")} rows={3} placeholder="Optional notes…" />
      </div>
    </form>
  );
}

// ── ClaimRow ──────────────────────────────────────────────────────────────────
function ClaimRow({ claim, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <EhrCard style={{ marginBottom: 8 }}>
      {/* Collapsed header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)" }}>{claim.service_date}</span>
            {(claim.cpt_codes ?? []).map(c => (
              <EhrBadge key={c.code} color="purple">{c.code}</EhrBadge>
            ))}
            <span style={{ fontSize: 13, color: "var(--ehr-muted)", marginLeft: "auto" }}>
              {formatCents(claim.amount_billed_cents)}
            </span>
            <ClaimStatusBadge status={claim.claim_status} />
          </div>
        </div>
        <span style={{ color: "var(--ehr-muted2)", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--ehr-border)", paddingTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
            {[
              ["Billed",              formatCents(claim.amount_billed_cents)],
              ["Paid (Insurance)",    formatCents(claim.amount_paid_insurance_cents)],
              ["Patient Resp.",       formatCents(claim.patient_responsibility_cents)],
              ["Copay Collected",     formatCents(claim.copay_collected_cents)],
              ["Submitted At",        claim.submitted_at ? new Date(claim.submitted_at).toLocaleString() : "—"],
              ["Paid At",             claim.paid_at      ? new Date(claim.paid_at).toLocaleString()      : "—"],
              ["Created At",          claim.created_at   ? new Date(claim.created_at).toLocaleString()   : "—"],
              ["Updated At",          claim.updated_at   ? new Date(claim.updated_at).toLocaleString()   : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 12 }}>
                <span style={{ color: "var(--ehr-muted2)" }}>{label}: </span>
                <span style={{ color: "var(--ehr-text)", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
          {claim.notes && (
            <div style={{ fontSize: 13, color: "var(--ehr-muted)", marginBottom: "0.8rem", fontStyle: "italic" }}>
              {claim.notes}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {claim.claim_status !== "paid" && (
              <EhrBtn small variant="secondary" onClick={e => { e.stopPropagation(); onEdit(claim); }}>✏️ Edit</EhrBtn>
            )}
            {claim.claim_status === "draft" && (
              <EhrBtn small variant="danger" onClick={e => { e.stopPropagation(); onDelete(claim.id); }}>🗑 Delete</EhrBtn>
            )}
          </div>
        </div>
      )}
    </EhrCard>
  );
}

// ── ClaimList ─────────────────────────────────────────────────────────────────
function ClaimList({ claims, onNew, onEdit, onDelete }) {
  return (
    <div>
      <SectionHeader
        title={`Claims (${claims.length})`}
        action={<EhrBtn small onClick={onNew}>+ New Claim</EhrBtn>}
      />
      {claims.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No claims on file.</div>
        </EhrCard>
      ) : claims.map(c => (
        <ClaimRow key={c.id} claim={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── EHRBilling (default export) ───────────────────────────────────────────────
export default function EHRBilling({ patientId, chartId, clinician }) {
  const [claims, setClaims]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => { load(); }, [patientId]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getClaims(patientId);
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load claims.");
    else setClaims(data ?? []);
    setLoading(false);
  }

  const handleSaved = (saved) => {
    if (saved) {
      setClaims(prev => {
        const idx = prev.findIndex(c => c.id === saved.id);
        return idx >= 0 ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
      });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this claim?")) return;
    const { error: err } = await deleteClaim(id);
    if (err) setError(typeof err === "string" ? err : err.message ?? "Delete failed.");
    else setClaims(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {error && (
        <div style={{
          background: "color-mix(in srgb, var(--ehr-rose) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ehr-rose) 30%, transparent)",
          borderRadius: 10, padding: "10px 14px", fontSize: 13,
          color: "var(--ehr-rose)", marginBottom: "1rem",
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginBottom: "1.2rem" }}>
        <BalanceSummary claims={claims} />
      </div>

      {showForm ? (
        <EhrCard>
          <ClaimForm
            claim={editing}
            chartId={chartId}
            patientId={patientId}
            createdBy={clinician?.user_id}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </EhrCard>
      ) : (
        <ClaimList
          claims={claims}
          onNew={() => { setEditing(null); setShowForm(true); }}
          onEdit={(c) => { setEditing(c); setShowForm(true); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ── EHRBillingAggregate (named export) ────────────────────────────────────────
export function EHRBillingAggregate() {
  const [claims, setClaims]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setFilter] = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getAggregateClaims({ statusFilter, limit: 10 });
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load.");
    else setClaims(data ?? []);
    setLoading(false);
  }

  const statuses = ["draft", "submitted", "accepted", "denied", "paid"];

  // Count per status across loaded claims
  const counts = statuses.reduce((acc, s) => {
    acc[s] = claims.filter(c => c.claim_status === s).length;
    return acc;
  }, {});

  const totalOutstanding = computePatientBalance(claims);

  return (
    <EhrCard style={{ marginBottom: "1.5rem" }}>
      <SectionHeader title="Billing Overview" subtitle="Recent claims across all patients" />

      {error && (
        <div style={{ fontSize: 13, color: "var(--ehr-rose)", marginBottom: "0.8rem" }}>⚠️ {error}</div>
      )}

      {/* Status count pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
        {statuses.map(s => (
          <button key={s} type="button" onClick={() => setFilter(statusFilter === s ? null : s)} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: statusFilter === s
              ? `color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 20%, transparent)`
              : "var(--ehr-card2)",
            border: `1px solid color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 35%, transparent)`,
            borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600,
            color: `var(--ehr-${STATUS_COLOR[s]})`, cursor: "pointer", fontFamily: "inherit",
          }}>
            {s}
            <span style={{
              background: `color-mix(in srgb, var(--ehr-${STATUS_COLOR[s]}) 20%, transparent)`,
              borderRadius: 20, padding: "1px 7px", fontSize: 11,
            }}>{counts[s]}</span>
          </button>
        ))}
        {statusFilter && (
          <button type="button" onClick={() => setFilter(null)} style={{
            background: "transparent", border: "1px solid var(--ehr-border2)",
            borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "var(--ehr-muted)",
            cursor: "pointer", fontFamily: "inherit",
          }}>✕ Clear</button>
        )}
      </div>

      {/* Total outstanding */}
      <div style={{
        background: totalOutstanding > 0
          ? "color-mix(in srgb, var(--ehr-gold) 10%, transparent)"
          : "color-mix(in srgb, var(--ehr-green) 8%, transparent)",
        border: `1px solid color-mix(in srgb, ${totalOutstanding > 0 ? "var(--ehr-gold)" : "var(--ehr-green)"} 25%, transparent)`,
        borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{totalOutstanding > 0 ? "💰" : "✅"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: totalOutstanding > 0 ? "var(--ehr-gold)" : "var(--ehr-green)" }}>
          Total Outstanding (shown): {formatCents(totalOutstanding)}
        </span>
      </div>

      {/* Recent claims list */}
      {loading ? <Spinner /> : claims.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--ehr-muted)", fontSize: 14 }}>
          No claims found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {claims.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              padding: "0.7rem 0.9rem",
              background: "var(--ehr-card2)", borderRadius: 10,
              border: "1px solid var(--ehr-border)",
              fontSize: 13,
            }}>
              <span style={{ color: "var(--ehr-muted2)", minWidth: 90 }}>{c.service_date}</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                {(c.cpt_codes ?? []).map(code => (
                  <EhrBadge key={code.code} color="purple">{code.code}</EhrBadge>
                ))}
              </div>
              <span style={{ color: "var(--ehr-text)", fontWeight: 600 }}>{formatCents(c.amount_billed_cents)}</span>
              <ClaimStatusBadge status={c.claim_status} />
            </div>
          ))}
        </div>
      )}
    </EhrCard>
  );
}
