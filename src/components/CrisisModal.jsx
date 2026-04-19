import { useState } from 'react';

export default function CrisisModal({ onClose }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(6,8,15,0.95)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", fontFamily: "'Outfit','DM Sans',system-ui,sans-serif",
    }}>
      <div style={{
        background: "#0d1228", border: "2px solid #f0a500",
        borderRadius: 24, maxWidth: 520, width: "100%",
        boxShadow: "0 24px 80px rgba(240,165,0,0.4)",
        display: "flex", flexDirection: "column", maxHeight: "90vh",
      }}>

        {/* Header */}
        <div style={{
          padding: "1.5rem 1.8rem 1.2rem",
          borderBottom: "1px solid rgba(240,165,0,0.3)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 10, 
              background: "rgba(240,165,0,0.2)", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 20, flexShrink: 0, border: "2px solid #f0a500"
            }}>🚨</div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f0a500" }}>
                We're Here for You
              </div>
              <div style={{ fontSize: 12, color: "rgba(240,240,255,0.6)", marginTop: 2 }}>
                Immediate support is available
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "1.4rem 1.8rem",
          fontSize: 14, color: "rgba(240,240,255,0.85)", lineHeight: 1.7,
        }}>
          <p style={{ marginBottom: "1.2rem", fontSize: 15 }}>
            It sounds like you might be going through a really difficult time right now. 
            <strong style={{ color: "#f0f0ff" }}> Please know that help is available immediately.</strong>
          </p>

          <div style={{ 
            background: "rgba(240,165,0,0.1)", 
            border: "1px solid rgba(240,165,0,0.3)", 
            borderRadius: 12, 
            padding: "1rem", 
            marginBottom: "1rem" 
          }}>
            <div style={{ fontWeight: 700, color: "#f0a500", marginBottom: 8, fontSize: 13 }}>
              🆘 IMMEDIATE HELP
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, color: "#f0f0ff", marginBottom: 2 }}>
                  988 Suicide & Crisis Lifeline
                </div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.7)" }}>
                  Call or text <strong style={{ color: "#4ecdc4" }}>988</strong> — 24/7 confidential support
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: "#f0f0ff", marginBottom: 2 }}>
                  Emergency Services
                </div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.7)" }}>
                  Call <strong style={{ color: "#4ecdc4" }}>911</strong> — For immediate danger
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: "#f0f0ff", marginBottom: 2 }}>
                  Crisis Text Line
                </div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.7)" }}>
                  Text <strong style={{ color: "#4ecdc4" }}>HOME to 741741</strong> — 24/7 text support
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: "#f0f0ff", marginBottom: 2 }}>
                  MindShift Wellness Clinic
                </div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.7)" }}>
                  Call <strong style={{ color: "#4ecdc4" }}>(508) 306-1128</strong> — During business hours
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", fontStyle: "italic" }}>
            Your safety is the top priority. These services are confidential and here to help. 
            Your care team has been notified and will follow up with you.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: "1.2rem 1.8rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            cursor: "pointer", marginBottom: "1rem",
          }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              style={{ 
                width: 18, height: 18, marginTop: 1, 
                accentColor: "#f0a500", flexShrink: 0, cursor: "pointer" 
              }}
            />
            <span style={{ fontSize: 13, color: "rgba(240,240,255,0.8)", lineHeight: 1.6 }}>
              I understand these resources are available to me right now.
            </span>
          </label>

          <button
            onClick={onClose}
            disabled={!acknowledged}
            style={{
              width: "100%", padding: "13px",
              background: acknowledged ? "#f0a500" : "rgba(255,255,255,0.08)",
              border: "none", borderRadius: 12,
              color: acknowledged ? "#0d1228" : "rgba(255,255,255,0.3)",
              fontSize: 14, fontWeight: 700,
              cursor: acknowledged ? "pointer" : "not-allowed",
              transition: "all .25s",
            }}
          >
            {acknowledged ? "I Understand" : "Please acknowledge to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
