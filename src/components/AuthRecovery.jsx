import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/** Canonical redirect target for Supabase password-reset emails. */
export function getPasswordResetRedirectTo() {
  return `${window.location.origin}/auth/reset-password`;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1.25rem",
    fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    border: "1.5px solid #e5e7eb",
    padding: "2rem 1.75rem",
    boxShadow: "0 8px 30px rgba(26,31,54,0.06)",
  },
  title: { fontSize: "1.45rem", fontWeight: 700, color: "#1a1f36", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", lineHeight: 1.65, marginBottom: "1.35rem" },
  label: { fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 5 },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 14,
    color: "#1a1f36",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
  },
  btn: {
    width: "100%",
    marginTop: 4,
    background: "linear-gradient(135deg,#4a6cf7,#0ea5a0)",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  err: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 12,
  },
  ok: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#166534",
    marginBottom: 12,
  },
};

function focusInput(e) {
  e.target.style.borderColor = "#4a6cf7";
  e.target.style.boxShadow = "0 0 0 3px rgba(74,108,247,0.1)";
}
function blurInput(e) {
  e.target.style.borderColor = "#e5e7eb";
  e.target.style.boxShadow = "none";
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
      <img
        src="/logo.png"
        alt="MindShift Wellness Clinic"
        style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 2 }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1f36" }}>MindShift Wellness Clinic</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>Secure password reset</div>
      </div>
    </div>
  );
}

/** Exchanges email template token_hash links (PKCE / custom templates). */
export function AuthConfirm({ onDone }) {
  const [status, setStatus] = useState("working"); // working | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type") || "recovery";
      const next = params.get("next") || "/auth/reset-password";

      if (!token_hash) {
        if (!cancelled) {
          setStatus("error");
          setError("This reset link is missing required information. Please request a new password reset email.");
        }
        return;
      }

      const { error: err } = await supabase.auth.verifyOtp({ token_hash, type });
      if (cancelled) return;

      if (err) {
        setStatus("error");
        setError(err.message || "This reset link is invalid or has expired. Please request a new one.");
        return;
      }

      const dest = next.startsWith("/") ? next : "/auth/reset-password";
      if (onDone) onDone(dest.includes("reset") ? "auth-reset" : "portal");
      else window.location.replace(dest);
    })();

    return () => { cancelled = true; };
  }, [onDone]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Brand />
        {status === "working" ? (
          <>
            <h1 style={styles.title}>Confirming your link…</h1>
            <p style={styles.sub}>Please wait while we verify your password reset request.</p>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Link could not be verified</h1>
            <div style={styles.err}>{error}</div>
            <p style={styles.sub}>
              Return to the patient portal and use <strong>Forgot password?</strong> to send a fresh link.
            </p>
            <button type="button" style={styles.btn} onClick={() => (onDone ? onDone("portal") : (window.location.href = "/portal"))}>
              Go to Patient Portal
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Set a new password after Supabase recovery redirect / PASSWORD_RECOVERY. */
export function AuthResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) {
        setReady(true);
        setChecking(false);
      }
    };

    // Hash tokens (implicit) or PKCE ?code= are picked up by the client; recovery fires this event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") markReady();
    });

    (async () => {
      // Exchange PKCE code if present (older clients / edge cases)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (err) {
          setError(err.message || "Could not complete password reset. Please request a new link.");
          setChecking(false);
          return;
        }
        // Clean the code from the URL without losing the path
        window.history.replaceState({}, "", "/auth/reset-password");
        markReady();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) markReady();
      else {
        setChecking(false);
        setError("This reset session is missing or expired. Please request a new password reset email.");
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Brand />
        {done ? (
          <>
            <h1 style={styles.title}>Password updated</h1>
            <div style={styles.ok}>Your password has been changed. You can now sign in with your new password.</div>
            <button
              type="button"
              style={styles.btn}
              onClick={() => (onDone ? onDone("portal") : (window.location.href = "/portal"))}
            >
              Continue to Patient Portal
            </button>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Choose a new password</h1>
            <p style={styles.sub}>Enter a new password for your MindShift patient portal account.</p>
            {error && <div style={styles.err}>{error}</div>}
            {checking ? (
              <p style={styles.sub}>Verifying your reset link…</p>
            ) : ready ? (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={styles.label}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    style={styles.input}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    style={styles.input}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Saving…" : "Update password"}
                </button>
              </form>
            ) : (
              <button type="button" style={styles.btn} onClick={() => (onDone ? onDone("portal") : (window.location.href = "/portal"))}>
                Back to Patient Portal
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
