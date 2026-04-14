import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot" | "check-email"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => setError("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Friendly messages
      if (error.message.includes("Email not confirmed"))
        setError("Please confirm your email first — check your inbox.");
      else if (error.message.includes("Invalid login"))
        setError("Incorrect email or password.");
      else
        setError(error.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    reset();
    if (!name.trim()) { setError("Please enter your name."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } }
    });
    if (error) setError(error.message);
    else setMode("check-email");
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setMode("check-email");
    setLoading(false);
  };

  const resendConfirmation = async () => {
    setLoading(true);
    await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(6,8,15,0.85)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{
        background: "linear-gradient(160deg,#0d1228,#131b3a)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24, padding: "2.5rem",
        width: "100%", maxWidth: 420,
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        position: "relative",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "1.2rem", right: "1.2rem",
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)", width: 32, height: 32,
          borderRadius: "50%", cursor: "pointer", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Logo */}
        <div style={{
          fontSize: 20, fontWeight: 700, marginBottom: "0.3rem",
          background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>MindShift+</div>

        {/* ── CHECK EMAIL SCREEN ── */}
        {mode === "check-email" && (
          <div style={{ textAlign: "center", paddingTop: "1rem" }}>
            <div style={{ fontSize: 52, marginBottom: "1rem" }}>📬</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 8, color: "#f0f0ff" }}>
              Check your inbox
            </h2>
            <p style={{ color: "rgba(240,240,255,0.5)", fontSize: 13, lineHeight: 1.7, marginBottom: "1.5rem" }}>
              We sent a confirmation link to<br/>
              <strong style={{ color: "#a89cf5" }}>{email}</strong><br/>
              Click it to activate your account, then come back and sign in.
            </p>
            <button
              onClick={() => { setMode("signin"); reset(); }}
              style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
                border: "none", borderRadius: 30, color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                marginBottom: "1rem",
              }}
            >← Back to Sign In</button>
            <div style={{ fontSize: 12, color: "rgba(240,240,255,0.3)" }}>
              Didn't get it?{" "}
              <span
                onClick={resendConfirmation}
                style={{ color: "#a89cf5", cursor: "pointer" }}
              >
                {loading ? "Sending…" : "Resend email"}
              </span>
            </div>
          </div>
        )}

        {/* ── SIGN IN / SIGN UP / FORGOT ── */}
        {mode !== "check-email" && (
          <>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.4rem", color: "#f0f0ff" }}>
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
            </h2>
            <p style={{ color: "rgba(240,240,255,0.45)", fontSize: 13, marginBottom: "1.8rem", lineHeight: 1.6 }}>
              {mode === "signin" && "Your wellness journey continues here."}
              {mode === "signup" && "A safe space to reflect, breathe, and grow."}
              {mode === "forgot" && "We'll send a reset link to your email."}
            </p>

            <form onSubmit={mode === "signin" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgot}>
              {mode === "signup" && (
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your first name" required style={inputStyle}/>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" required style={inputStyle}/>
              {mode !== "forgot" && (
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password" required minLength={6} style={inputStyle}/>
              )}

              {error && (
                <div style={{ color: "#f093a0", fontSize: 13, marginBottom: "1rem", padding: "10px 14px", background: "rgba(240,147,160,0.1)", borderRadius: 10, border: "1px solid rgba(240,147,160,0.2)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px",
                background: loading ? "rgba(124,111,247,0.4)" : "linear-gradient(135deg,#7c6ff7,#4ecdc4)",
                border: "none", borderRadius: 30, color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                transition: "all .2s", marginBottom: "1.2rem",
              }}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              </button>
            </form>

            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(240,240,255,0.4)" }}>
              {mode === "signin" && (
                <>
                  <span onClick={() => { setMode("forgot"); reset(); }}
                    style={{ color: "rgba(168,156,245,0.7)", cursor: "pointer", display: "block", marginBottom: 8 }}>
                    Forgot password?
                  </span>
                  Don't have an account?{" "}
                  <span onClick={() => { setMode("signup"); reset(); }}
                    style={{ color: "#a89cf5", cursor: "pointer", fontWeight: 600 }}>Sign up</span>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <span onClick={() => { setMode("signin"); reset(); }}
                    style={{ color: "#a89cf5", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
                </>
              )}
              {mode === "forgot" && (
                <span onClick={() => { setMode("signin"); reset(); }}
                  style={{ color: "#a89cf5", cursor: "pointer", fontWeight: 600 }}>← Back to sign in</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", marginBottom: "1rem",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12, padding: "12px 16px",
  color: "#f0f0ff", fontSize: 14, outline: "none",
};
