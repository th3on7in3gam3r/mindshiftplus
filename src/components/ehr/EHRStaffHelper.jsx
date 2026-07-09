import { useState } from "react";
import { createPortal } from "react-dom";
import StaffAssistant from "../clinical/StaffAssistant";
import { buildStaffWelcomeMessage, STAFF_ASSISTANT_NAME } from "../../lib/staffAssistant";

/**
 * Floating Milo — staff guide inside MindShift EHR.
 */
export default function EHRStaffHelper({ clinician, onOpenDocs }) {
  const [open, setOpen] = useState(false);

  if (!clinician) return null;

  const welcomeMessage = buildStaffWelcomeMessage(clinician);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${STAFF_ASSISTANT_NAME} — ask how to use EHR tools`}
        aria-label={`Open ${STAFF_ASSISTANT_NAME}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          background: open ? "color-mix(in srgb, var(--ehr-accent) 18%, transparent)" : "color-mix(in srgb, var(--ehr-accent) 10%, transparent)",
          border: open ? "1px solid color-mix(in srgb, var(--ehr-accent) 40%, transparent)" : "1px solid color-mix(in srgb, var(--ehr-accent) 28%, transparent)",
          borderRadius: "50%",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 16,
          lineHeight: 1,
          color: "var(--ehr-accent)",
          flexShrink: 0,
          transition: "transform .15s, box-shadow .15s",
          boxShadow: open ? "0 4px 16px color-mix(in srgb, var(--ehr-accent) 25%, transparent)" : "none",
        }}
      >
        💬
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={STAFF_ASSISTANT_NAME}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: "1rem",
            background: "rgba(6, 8, 15, 0.45)",
            backdropFilter: "blur(4px)",
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "min(420px, calc(100vw - 2rem))",
            maxHeight: "min(640px, calc(100vh - 2rem))",
            display: "flex",
            flexDirection: "column",
            background: "#0d1228",
            borderRadius: 20,
            border: "1px solid rgba(124,111,247,0.35)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            overflow: "hidden",
            color: "#f0f0ff",
            fontFamily: "Outfit, system-ui, sans-serif",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(135deg, rgba(124,111,247,0.2), rgba(78,205,196,0.08))",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg, #7c6ff7, #4ecdc4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>✦</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{STAFF_ASSISTANT_NAME}</div>
                  <div style={{ fontSize: 11, color: "rgba(240,240,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Staff guide · {clinician.full_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={`Close ${STAFF_ASSISTANT_NAME}`}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: "rgba(240,240,255,0.7)",
                  fontSize: 16,
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "0.75rem 0.85rem 0.85rem" }}>
              <StaffAssistant
                key={clinician.user_id}
                variant="embedded"
                welcomeMessage={welcomeMessage}
                onBrowseDocs={onOpenDocs ? () => { setOpen(false); onOpenDocs(); } : undefined}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
