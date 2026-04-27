import { useState } from "react";
import { supabase } from "../../lib/supabase";

const P = {
  bg:     "#f7f8fc",
  bg2:    "#ffffff",
  accent: "#4a6cf7",
  teal:   "#0ea5a0",
  text:   "#1a1f36",
  muted:  "#6b7280",
  muted2: "#9ca3af",
  border: "#e5e7eb",
  error:  "#e05c7a",
};

function Input({ label, type="text", value, onChange, placeholder, required }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label style={{ fontSize:13, fontWeight:500, color:P.text }}>{label}</label>
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{
          padding:"11px 14px", borderRadius:10, border:`1.5px solid ${P.border}`,
          fontSize:14, color:P.text, background:P.bg2, outline:"none",
          transition:"border-color .2s, box-shadow .2s", fontFamily:"inherit",
        }}
        onFocus={e=>{ e.target.style.borderColor=P.accent; e.target.style.boxShadow=`0 0 0 3px rgba(74,108,247,0.12)`; }}
        onBlur={e=>{ e.target.style.borderColor=P.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

function Btn({ children, loading, type="submit", onClick, variant="primary" }) {
  const styles = {
    primary: { background:`linear-gradient(135deg,${P.accent},${P.teal})`, color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:P.accent, border:`1.5px solid ${P.accent}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={loading} style={{
      ...styles[variant],
      padding:"12px", borderRadius:10, fontSize:14, fontWeight:600,
      cursor: loading ? "not-allowed" : "pointer", width:"100%",
      opacity: loading ? 0.7 : 1, transition:"all .2s", fontFamily:"inherit",
    }}
    onMouseOver={e=>{ if(!loading && variant==="primary") e.currentTarget.style.opacity="0.9"; }}
    onMouseOut={e=>{ e.currentTarget.style.opacity="1"; }}
    >{loading ? "Please wait…" : children}</button>
  );
}

export default function PortalLogin({ onBack }) {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot | sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clear = () => setError("");

  const handleSignIn = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login")) setError("Incorrect email or password.");
      else if (error.message.includes("Email not confirmed")) setError("Please confirm your email — check your inbox.");
      else setError(error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); clear();
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() } }
    });
    if (error) setError(error.message);
    else setMode("sent");
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) setError(error.message);
    else setMode("sent");
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:"100vh", background:P.bg, display:"flex", alignItems:"stretch",
      fontFamily:"'Inter','DM Sans',system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        @media(max-width:767px){ .portal-login-panel { display:none !important; } .portal-login-form-col { padding: 2rem 1.5rem !important; } }
      `}</style>

      {/* Left panel — branding */}
      <div className="portal-login-panel" style={{
        width:"45%", background:`linear-gradient(160deg,#1e2a4a 0%,#2d3f6e 50%,#1a3a5c 100%)`,
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding:"3rem", position:"relative", overflow:"hidden",
      }}>
        {/* Background decoration */}
        <div style={{ position:"absolute", top:"-20%", right:"-20%", width:400, height:400, borderRadius:"50%", background:"rgba(74,108,247,0.15)", filter:"blur(60px)" }}/>
        <div style={{ position:"absolute", bottom:"-10%", left:"-10%", width:300, height:300, borderRadius:"50%", background:"rgba(14,165,160,0.12)", filter:"blur(50px)" }}/>

        {/* Logo */}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"3rem" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏥</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>MindShift Wellness Clinic</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Patient Portal</div>
            </div>
          </div>

          <h1 style={{ fontSize:"clamp(1.8rem,3vw,2.6rem)", fontWeight:300, color:"#fff", lineHeight:1.2, marginBottom:"1rem", letterSpacing:"-0.02em" }}>
            Your care,<br/><em style={{ fontStyle:"italic", color:"rgba(107,138,249,0.9)" }}>at your fingertips.</em>
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.55)", lineHeight:1.75, maxWidth:320 }}>
            Securely manage your appointments, messages, and health records — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ position:"relative", zIndex:1 }}>
          {[
            ["📅","View & request appointments"],
            ["💬","Secure messaging with your care team"],
            ["📄","Access forms and documents"],
            ["◎","Connect to MindShift+ wellness app"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{icon}</div>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.65)" }}>{text}</span>
            </div>
          ))}
          
          {/* HIPAA Compliance Badge */}
          <div style={{ 
            marginTop:"2rem", 
            marginBottom:"1.5rem",
            padding:"1.25rem", 
            background:"rgba(255,255,255,0.08)", 
            borderRadius:12, 
            border:"1px solid rgba(255,255,255,0.15)",
            display:"flex",
            alignItems:"center",
            gap:"1rem"
          }}>
            <div style={{
              width:60,
              height:60,
              borderRadius:12,
              background:"linear-gradient(135deg, rgba(74,108,247,0.2), rgba(14,165,160,0.2))",
              border:"2px solid rgba(255,255,255,0.2)",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              justifyContent:"center",
              flexShrink:0
            }}>
              <div style={{ fontSize:20, marginBottom:2 }}>🔒</div>
              <div style={{ fontSize:8, fontWeight:700, color:"rgba(255,255,255,0.9)", letterSpacing:"0.5px" }}>HIPAA</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.95)", marginBottom:4 }}>
                HIPAA Compliant
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
                Your health information is protected with bank-level encryption and strict privacy standards.
              </div>
            </div>
          </div>

          <div style={{ marginTop:"1rem", padding:"1rem", background:"rgba(255,255,255,0.06)", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>Need help? Contact us directly</div>
            <a href="tel:5083061128" style={{ fontSize:13, color:"rgba(255,255,255,0.7)", textDecoration:"none", display:"block" }}>📞 (508) 306-1128</a>
            <a href="mailto:info@mindshiftwellnessclinic.org" style={{ fontSize:12, color:"rgba(255,255,255,0.5)", textDecoration:"none", display:"block", marginTop:3 }}>✉️ info@mindshiftwellnessclinic.org</a>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="portal-login-form-col" style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"3rem 2.5rem", background:P.bg,
      }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {/* Back link */}
          <button onClick={onBack} style={{ background:"transparent", border:"none", color:P.muted, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:5, marginBottom:"2rem", padding:0 }}>
            ← Back to clinic site
          </button>

          {/* Sent confirmation */}
          {mode==="sent" && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:"1rem" }}>📬</div>
              <h2 style={{ fontSize:"1.4rem", fontWeight:700, color:P.text, marginBottom:8 }}>Check your email</h2>
              <p style={{ fontSize:14, color:P.muted, lineHeight:1.7, marginBottom:"1.5rem" }}>
                We sent a link to <strong>{email}</strong>. Click it to {mode==="sent" && password ? "confirm your account" : "reset your password"}.
              </p>
              <button onClick={()=>setMode("signin")} style={{ background:"transparent", border:"none", color:P.accent, fontSize:14, cursor:"pointer", fontWeight:500 }}>← Back to sign in</button>
            </div>
          )}

          {/* Sign In */}
          {mode==="signin" && (
            <>
              <div style={{ marginBottom:"2rem" }}>
                <h2 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text, marginBottom:6 }}>Welcome back</h2>
                <p style={{ fontSize:14, color:P.muted }}>Sign in to your patient portal</p>
              </div>
              {error && <div style={{ background:"rgba(224,92,122,0.08)", border:`1px solid rgba(224,92,122,0.25)`, borderRadius:10, padding:"10px 14px", fontSize:13, color:P.error, marginBottom:"1rem" }}>{error}</div>}
              <form onSubmit={handleSignIn} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Input label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required/>
                <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" required/>
                <div style={{ textAlign:"right", marginTop:-6 }}>
                  <button type="button" onClick={()=>{ clear(); setMode("forgot"); }} style={{ background:"transparent", border:"none", color:P.accent, fontSize:12, cursor:"pointer" }}>Forgot password?</button>
                </div>
                <Btn loading={loading}>Sign In to Portal</Btn>
              </form>
              <div style={{ textAlign:"center", marginTop:"1.5rem", fontSize:13, color:P.muted }}>
                New patient?{" "}
                <button onClick={()=>{ clear(); setMode("signup"); }} style={{ background:"transparent", border:"none", color:P.accent, fontSize:13, cursor:"pointer", fontWeight:600 }}>Create an account</button>
              </div>
            </>
          )}

          {/* Sign Up */}
          {mode==="signup" && (
            <>
              <div style={{ marginBottom:"2rem" }}>
                <h2 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text, marginBottom:6 }}>Create your account</h2>
                <p style={{ fontSize:14, color:P.muted }}>Join as a patient of MindShift Wellness Clinic</p>
              </div>
              {error && <div style={{ background:"rgba(224,92,122,0.08)", border:`1px solid rgba(224,92,122,0.25)`, borderRadius:10, padding:"10px 14px", fontSize:13, color:P.error, marginBottom:"1rem" }}>{error}</div>}
              <form onSubmit={handleSignUp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Input label="Full Name" value={name} onChange={setName} placeholder="Your full name" required/>
                <Input label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required/>
                <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required/>
                <p style={{ fontSize:11, color:P.muted2, lineHeight:1.6, marginTop:-4 }}>
                  By creating an account you agree to our privacy policy. Your data is protected and never shared without consent.
                </p>
                <Btn loading={loading}>Create Account</Btn>
              </form>
              <div style={{ textAlign:"center", marginTop:"1.5rem", fontSize:13, color:P.muted }}>
                Already have an account?{" "}
                <button onClick={()=>{ clear(); setMode("signin"); }} style={{ background:"transparent", border:"none", color:P.accent, fontSize:13, cursor:"pointer", fontWeight:600 }}>Sign in</button>
              </div>
            </>
          )}

          {/* Forgot */}
          {mode==="forgot" && (
            <>
              <div style={{ marginBottom:"2rem" }}>
                <h2 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text, marginBottom:6 }}>Reset password</h2>
                <p style={{ fontSize:14, color:P.muted }}>We'll send a reset link to your email</p>
              </div>
              {error && <div style={{ background:"rgba(224,92,122,0.08)", border:`1px solid rgba(224,92,122,0.25)`, borderRadius:10, padding:"10px 14px", fontSize:13, color:P.error, marginBottom:"1rem" }}>{error}</div>}
              <form onSubmit={handleForgot} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Input label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required/>
                <Btn loading={loading}>Send Reset Link</Btn>
              </form>
              <div style={{ textAlign:"center", marginTop:"1.5rem" }}>
                <button onClick={()=>{ clear(); setMode("signin"); }} style={{ background:"transparent", border:"none", color:P.accent, fontSize:13, cursor:"pointer" }}>← Back to sign in</button>
              </div>
            </>
          )}

          {/* HIPAA Security Badge */}
          {mode !== "sent" && (
            <div style={{ 
              marginTop:"2rem", 
              padding:"1rem 1.25rem", 
              background:"linear-gradient(135deg, rgba(74,108,247,0.08), rgba(14,165,160,0.05))", 
              border:`1.5px solid rgba(74,108,247,0.15)`, 
              borderRadius:12, 
              display:"flex", 
              gap:12, 
              alignItems:"center" 
            }}>
              <div style={{
                width:48,
                height:48,
                borderRadius:10,
                background:"linear-gradient(135deg, rgba(74,108,247,0.15), rgba(14,165,160,0.1))",
                border:"1.5px solid rgba(74,108,247,0.2)",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                flexShrink:0
              }}>
                <div style={{ fontSize:18, marginBottom:2 }}>🔒</div>
                <div style={{ fontSize:8, fontWeight:700, color:P.accent, letterSpacing:"0.5px" }}>HIPAA</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:P.text, marginBottom:3 }}>
                  HIPAA Compliant & Secure
                </div>
                <p style={{ fontSize:11, color:P.muted, lineHeight:1.6, margin:0 }}>
                  256-bit encryption • Secure authentication • Privacy protected • HIPAA standards
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
