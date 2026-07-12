import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { CLINICIAN_EMAILS } from "../../lib/ehrDb";

export default function EHRLogin({ onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [mode, setMode]         = useState("signin"); // signin | forgot
  const [sent, setSent]         = useState(false);

  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #334155", fontSize: 14, color: "#e2e8f0",
    background: "rgba(255,255,255,0.05)", outline: "none", fontFamily: "inherit",
  };
  const focus = (e) => { e.target.style.borderColor = "#7c6ff7"; e.target.style.boxShadow = "0 0 0 3px rgba(124,111,247,0.15)"; };
  const blur  = (e) => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; };

  const handleSignIn = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    // Soft gate — warn but allow (RLS is the real guard)
    if (!CLINICIAN_EMAILS.includes(normalizedEmail)) {
      setError("Access restricted to MindShift Wellness Clinic clinicians.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (err) {
      setError(err.message.includes("Invalid") ? "Incorrect email or password." : err.message);
    }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/?page=ehr` }
    );
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      fontFamily: "'Inter', system-ui, sans-serif",
      background: "#0a0e1a",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      {/* Left branding panel */}
      <div style={{
        width: "42%", minWidth: 340,
        background: "linear-gradient(160deg,#0d1228 0%,#131b3a 50%,#0a1628 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "3rem", position: "relative", overflow: "hidden",
      }} className="ehr-login-panel">
        <div style={{ position: "absolute", top: "-15%", right: "-15%", width: 320, height: 320, borderRadius: "50%", background: "rgba(124,111,247,0.12)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: 260, height: 260, borderRadius: "50%", background: "rgba(78,205,196,0.10)", filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2.5rem" }}>
            <img src="/logo.png" alt="MindShift Wellness Clinic" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "contain", flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2 }}>MindShift Wellness Clinic</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>MindShift EHR</div>
            </div>
          </div>

          <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 300, color: "#e2e8f0", lineHeight: 1.15, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Clinical tools,<br /><span style={{ fontStyle: "italic", color: "#a89cf5" }}>built for care.</span>
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: "2rem" }}>
            Secure MindShift EHR access for licensed clinicians and authorized staff of MindShift Wellness Clinic.
          </p>

          {[
            ["📋", "Patient Charts",     "Full demographics, diagnoses & history"],
            ["📝", "Clinical Notes",     "SOAP & psychiatric encounter documentation"],
            ["💊", "Medications",        "Prescriptions, dosages & refill tracking"],
            ["📅", "Appointments",       "Linked encounter history per patient"],
            ["🔒", "HIPAA-Compliant",    "Role-based access, encrypted at rest"],
          ].map(([icon, title, sub]) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>{title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1rem 1.2rem" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Clinicians</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>Kenneth Mutegyeki, PMHNP-BC</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Rachel Nakkazi, PMHNP-BC</div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", background: "#0f1629" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: "2rem", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
              ← Back
            </button>
          )}

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: "1rem" }}>📬</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Check your email</h2>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: "1.5rem" }}>We sent a reset link to <strong style={{ color: "#a89cf5" }}>{email}</strong>.</p>
              <button onClick={() => { setSent(false); setMode("signin"); }} style={{ background: "transparent", border: "none", color: "#7c6ff7", fontSize: 14, cursor: "pointer" }}>← Back to sign in</button>
            </div>
          ) : mode === "signin" ? (
            <>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Clinician Sign In</h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: "1.5rem" }}>MindShift EHR — restricted to authorized personnel</p>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", display: "block", marginBottom: 5 }}>Work Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinician@mindshiftwellnessclinic.org" required style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>Password</label>
                    <button type="button" onClick={() => { setError(""); setMode("forgot"); }} style={{ background: "transparent", border: "none", color: "#7c6ff7", fontSize: 12, cursor: "pointer", padding: 0 }}>Forgot?</button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Signing in…" : "Sign In to MindShift EHR"}
                </button>
              </form>

              <div style={{ marginTop: "1.5rem", padding: "0.9rem 1rem", background: "rgba(124,111,247,0.06)", border: "1px solid rgba(124,111,247,0.15)", borderRadius: 10, display: "flex", gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                  This system is for authorized MindShift Wellness Clinic personnel only. All access is logged. Unauthorized use is prohibited under HIPAA.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Reset Password</h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: "1.5rem" }}>Enter your work email to receive a reset link</p>
              {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 12 }}>{error}</div>}
              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", display: "block", marginBottom: 5 }}>Work Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinician@mindshiftwellnessclinic.org" required style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <p style={{ textAlign: "center", marginTop: "1.2rem" }}>
                <button onClick={() => { setError(""); setMode("signin"); }} style={{ background: "transparent", border: "none", color: "#7c6ff7", fontSize: 13, cursor: "pointer" }}>← Back to sign in</button>
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`@media(max-width:767px){ .ehr-login-panel{ display:none !important } }`}</style>
    </div>
  );
}
