import { useState } from "react";
import { supabase } from "../lib/supabase";

const DISCLAIMER_VERSION = "1.0"; // bump this to force re-acceptance

export async function hasAcceptedDisclaimer(userId) {
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from("disclaimer_acceptances")
      .select("id")
      .eq("user_id", userId)
      .eq("version", DISCLAIMER_VERSION)
      .maybeSingle();
    return !!data;
  } catch { return false; }
}

export async function recordDisclaimerAccepted(userId) {
  if (!userId) return;
  try {
    await supabase
      .from("disclaimer_acceptances")
      .upsert({ user_id: userId, version: DISCLAIMER_VERSION, accepted_at: new Date().toISOString() });
  } catch {}
}

export default function DisclaimerModal({ onAccept, userId }) {
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    await recordDisclaimerAccepted(userId);
    setSaving(false);
    onAccept();
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(6,8,15,0.92)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1rem", fontFamily:"'Outfit','DM Sans',system-ui,sans-serif",
    }}>
      <div style={{
        background:"#0d1228", border:"1px solid rgba(124,111,247,0.3)",
        borderRadius:24, maxWidth:580, width:"100%",
        boxShadow:"0 24px 80px rgba(0,0,0,0.6)",
        display:"flex", flexDirection:"column", maxHeight:"90vh",
      }}>

        {/* Header */}
        <div style={{
          padding:"1.5rem 1.8rem 1.2rem",
          borderBottom:"1px solid rgba(255,255,255,0.08)",
          flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#7c6ff7,#4ecdc4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>⚠️</div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(240,165,0,0.8)", marginBottom:2 }}>Important Notice</div>
              <div style={{ fontSize:"1.1rem", fontWeight:700, color:"#f0f0ff" }}>MindShift+ Disclaimer</div>
            </div>
          </div>
          <p style={{ fontSize:12, color:"rgba(240,240,255,0.45)", margin:0, lineHeight:1.5 }}>
            Please read carefully before continuing. Scroll to the bottom to acknowledge.
          </p>
        </div>

        {/* Scrollable content */}
        <div onScroll={handleScroll} style={{
          flex:1, overflowY:"auto", padding:"1.4rem 1.8rem",
          fontSize:13, color:"rgba(240,240,255,0.7)", lineHeight:1.8,
        }}>
          <p style={{ marginBottom:"1.2rem", color:"rgba(240,240,255,0.85)" }}>
            MindShift+ is a supportive wellness tool designed to complement your care at MindShift Wellness Clinic. It is <strong style={{color:"#f0f0ff"}}>not a substitute</strong> for professional medical advice, diagnosis, or treatment.
          </p>

          <Section title="🚨 Not for Emergencies" color="#f0a500">
            MindShift+ is <strong style={{color:"#f0f0ff"}}>not monitored in real time.</strong> Journal entries, messages, and other inputs are not continuously reviewed by your clinician. If you are experiencing a medical or mental health emergency — including thoughts of harming yourself or others — please:
            <ul style={{ marginTop:8, paddingLeft:20, display:"flex", flexDirection:"column", gap:4 }}>
              <li><strong style={{color:"#f0f0ff"}}>Call 911</strong> or go to the nearest emergency room immediately.</li>
              <li>Contact the <strong style={{color:"#f0f0ff"}}>Suicide &amp; Crisis Lifeline</strong> by dialing or texting <strong style={{color:"#4ecdc4"}}>988</strong> in the United States.</li>
            </ul>
          </Section>

          <Section title="📋 Limited Review of Entries" color="#a89cf5">
            Information entered into MindShift+ — including journal entries — may be reviewed <strong style={{color:"#f0f0ff"}}>only during scheduled appointments</strong> or at the discretion of your clinician. There is <strong style={{color:"#f0f0ff"}}>no guarantee of immediate or daily review.</strong>
          </Section>

          <Section title="🩺 No Provider-Patient Relationship Through the App Alone" color="#a89cf5">
            Use of MindShift+ does not, by itself, establish a provider-patient relationship. Clinical care is provided through <strong style={{color:"#f0f0ff"}}>scheduled appointments and direct communication</strong> with your clinician.
          </Section>

          <Section title="📌 Use at Your Own Discretion" color="#a89cf5">
            By using MindShift+, you acknowledge that it is a supplemental tool intended to support your wellness journey and that you should <strong style={{color:"#f0f0ff"}}>not rely on it for urgent or time-sensitive medical needs.</strong>
          </Section>

          <div style={{ background:"rgba(78,205,196,0.08)", border:"1px solid rgba(78,205,196,0.2)", borderRadius:12, padding:"1rem", marginTop:"0.5rem" }}>
            <p style={{ margin:0, fontSize:12, color:"rgba(78,205,196,0.9)", lineHeight:1.7 }}>
              If you have questions about your care, please contact MindShift Wellness Clinic directly at{" "}
              <a href="tel:5083061128" style={{ color:"#4ecdc4", textDecoration:"none", fontWeight:600 }}>(508) 306-1128</a>{" "}
              or{" "}
              <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:"#4ecdc4", textDecoration:"none" }}>info@mindshiftwellnessclinic.org</a>.
            </p>
          </div>

          {/* Scroll indicator */}
          {!scrolled && (
            <div style={{ textAlign:"center", marginTop:"1rem", color:"rgba(240,240,255,0.3)", fontSize:11, animation:"bounce 1.5s ease-in-out infinite" }}>
              ↓ Scroll to continue
            </div>
          )}
        </div>

        {/* Footer — checkbox + button */}
        <div style={{
          padding:"1.2rem 1.8rem 1.5rem",
          borderTop:"1px solid rgba(255,255,255,0.08)",
          flexShrink:0,
        }}>
          <label style={{
            display:"flex", alignItems:"flex-start", gap:10,
            cursor:"pointer", marginBottom:"1rem",
            opacity: scrolled ? 1 : 0.4,
            transition:"opacity .3s",
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e=>setChecked(e.target.checked)}
              disabled={!scrolled}
              style={{ width:18, height:18, marginTop:1, accentColor:"#7c6ff7", flexShrink:0, cursor: scrolled?"pointer":"not-allowed" }}
            />
            <span style={{ fontSize:13, color:"rgba(240,240,255,0.8)", lineHeight:1.6 }}>
              I have read and understand this disclaimer. I acknowledge that MindShift+ is a wellness support tool and not a substitute for professional medical care or emergency services.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked || !scrolled || saving}
            style={{
              width:"100%", padding:"13px",
              background: checked && scrolled ? "linear-gradient(135deg,#7c6ff7,#4ecdc4)" : "rgba(255,255,255,0.08)",
              border:"none", borderRadius:12,
              color: checked && scrolled ? "#fff" : "rgba(255,255,255,0.3)",
              fontSize:14, fontWeight:700,
              cursor: checked && scrolled && !saving ? "pointer" : "not-allowed",
              transition:"all .25s",
            }}
          >
            {saving ? "Saving…" : !scrolled ? "Scroll to read before continuing" : !checked ? "Check the box above to continue" : "I Understand — Enter MindShift+"}
          </button>

          <p style={{ textAlign:"center", fontSize:11, color:"rgba(240,240,255,0.25)", marginTop:10, margin:"10px 0 0" }}>
            MindShift Wellness Clinic · Version {DISCLAIMER_VERSION}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(4px)}
        }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
      `}</style>
    </div>
  );
}

function Section({ title, children, color }) {
  return (
    <div style={{ marginBottom:"1.2rem" }}>
      <div style={{ fontSize:12, fontWeight:700, color: color||"#a89cf5", marginBottom:6 }}>{title}</div>
      <p style={{ margin:0, lineHeight:1.8 }}>{children}</p>
    </div>
  );
}
