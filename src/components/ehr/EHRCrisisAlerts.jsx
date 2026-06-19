import { useState, useEffect } from "react";
import {
  getCrisisAlerts,
  markCrisisReviewed,
  crisisSourceLabel,
} from "../../lib/crisisDb";

const SEVERITY = {
  high: { color: "#dc2626", bg: "#fef2f2", label: "HIGH — contact patient ASAP" },
  moderate: { color: "#d97706", bg: "#fffbeb", label: "MODERATE — review soon" },
};

export default function EHRCrisisAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unreviewed");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    const { data } = await getCrisisAlerts({ filter });
    setAlerts(data ?? []);
    setLoading(false);
  }

  async function handleReview() {
    if (!selected) return;
    setSaving(true);
    const { error } = await markCrisisReviewed(selected.id, notes);
    setSaving(false);
    if (error) {
      alert("Could not save. Please try again.");
      return;
    }
    setSelected(null);
    setNotes("");
    load();
  }

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 960, margin: "0 auto", fontFamily: "inherit" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
          🚨 Patient Safety Alerts
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 12px", lineHeight: 1.6 }}>
          Alerts appear when concerning language is detected in a patient&apos;s <strong>Mia chat</strong>, <strong>journal</strong>, or <strong>portal message</strong>.
          The patient is shown 988 / 911 resources. You also receive an email alert.
        </p>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#1e40af", lineHeight: 1.6 }}>
          <strong>What to do:</strong> Review the excerpt → call the patient if high risk → document in notes → mark as reviewed.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { value: "unreviewed", label: "Needs Review" },
          { value: "high", label: "High Risk" },
          { value: "moderate", label: "Moderate" },
          { value: "all", label: "All" },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            style={{
              padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === value ? "#1e2a4a" : "#f3f4f6",
              color: filter === value ? "#fff" : "#4b5563",
              fontSize: 13, fontWeight: filter === value ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Loading…</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#f0fdf4", borderRadius: 16, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 600, color: "#166534" }}>No alerts in this view</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {filter === "unreviewed" ? "All caught up — no patients waiting for review." : "Try another filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map((alert) => {
            const sev = SEVERITY[alert.severity] ?? SEVERITY.moderate;
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => { setSelected(alert); setNotes(""); }}
                style={{
                  textAlign: "left", width: "100%", cursor: "pointer",
                  background: "#fff",
                  border: `2px solid ${alert.reviewed ? "#e5e7eb" : sev.color + "55"}`,
                  borderRadius: 16, padding: "1.25rem",
                  opacity: alert.reviewed ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{alert.patient_name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {crisisSourceLabel(alert.source)} · {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: sev.bg, color: sev.color }}>
                      {sev.label}
                    </span>
                    {alert.reviewed && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#f0fdf4", color: "#166534" }}>
                        ✓ Reviewed
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#374151", background: "#f9fafb", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>
                  {alert.content_excerpt.slice(0, 180)}{alert.content_excerpt.length > 180 ? "…" : ""}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  Keywords: {alert.keywords_detected.join(", ")}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{selected.patient_name}</h2>
              <button type="button" onClick={() => setSelected(null)} style={{ border: "none", background: "#f3f4f6", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: "1rem" }}>
              {crisisSourceLabel(selected.source)} · {(SEVERITY[selected.severity] ?? SEVERITY.moderate).label}
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem", fontSize: 14, lineHeight: 1.65, marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {selected.content_excerpt}
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#991b1b", marginBottom: "1rem" }}>
              Emergency: patient was shown <strong>988</strong> and <strong>911</strong>. High risk → contact within 1 hour.
            </div>

            {!selected.reviewed ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Review notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Called patient at 2pm, safety plan discussed…"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", marginBottom: "1rem", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleReview}
                  style={{ width: "100%", padding: "12px", border: "none", borderRadius: 12, background: "linear-gradient(135deg,#4a6cf7,#0ea5a0)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Saving…" : "Mark as Reviewed"}
                </button>
              </>
            ) : (
              selected.notes && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px", fontSize: 13 }}>
                  <strong>Notes:</strong> {selected.notes}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
