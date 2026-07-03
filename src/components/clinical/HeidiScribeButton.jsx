import { useState } from "react";
import { openHeidiScribe } from "../../lib/heidiWidget";

/**
 * Launch Heidi AI scribe widget (pilot).
 * @param {object} props
 * @param {object} [props.patient] - { id, name, gender, dob }
 * @param {string} [props.context] - allergies, meds, diagnosis text for Heidi
 * @param {string} [props.label]
 * @param {object} [props.style]
 * @param {"scribe"|"ehr"} [props.variant]
 */
export default function HeidiScribeButton({
  patient,
  context,
  label = "Open Heidi Scribe",
  style = {},
  variant = "scribe",
  small = true,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setError("");
    setLoading(true);
    try {
      await openHeidiScribe({ patient, context });
    } catch (e) {
      const msg = e?.message || "Could not open Heidi";
      setError(msg);
      if (msg.includes("HEIDI_API_KEY")) {
        setError("Heidi is not configured yet. Add HEIDI_API_KEY in Supabase Edge Function secrets.");
      }
    }
    setLoading(false);
  };

  const baseStyle = variant === "ehr"
    ? {
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "linear-gradient(135deg, #0d9488, #6366f1)",
        border: "none", borderRadius: 20,
        padding: small ? "6px 14px" : "8px 18px",
        color: "#fff", fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
        opacity: loading ? 0.75 : 1,
        ...style,
      }
    : {
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(13,148,136,0.15)",
        border: "1px solid rgba(13,148,136,0.35)",
        borderRadius: 30,
        padding: small ? "8px 16px" : "10px 20px",
        color: "#5eead4",
        fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
        opacity: loading ? 0.75 : 1,
        ...style,
      };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button type="button" onClick={handleClick} disabled={loading} style={baseStyle} title="Heidi AI clinical scribe (pilot)">
        {loading ? "Opening Heidi…" : `🩺 ${label}`}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: "#f87171", maxWidth: 280, lineHeight: 1.4 }}>{error}</span>
      )}
    </span>
  );
}
