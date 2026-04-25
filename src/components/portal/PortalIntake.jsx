import { useState, useEffect } from "react";
import { getMyIntake, saveIntake, submitIntake } from "../../lib/intakeDb";
import { emailIntakeSubmitted } from "../../lib/emailService";
import { supabase } from "../../lib/supabase";
import { T, PageHeader, Card, Alert, Btn } from "./PortalUI";

// Patient-facing steps: personal info, emergency/insurance, consents & signature
const STEPS = [
  { id: "demographics", label: "Personal Info",         icon: "👤", desc: "Basic information about you" },
  { id: "emergency",    label: "Emergency & Insurance", icon: "🛡️", desc: "Emergency contact & coverage" },
  { id: "consent",      label: "Consent & Sign",        icon: "✍️", desc: "Review and sign your consent forms" },
];

const inp = (extra = {}) => ({
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text,
  background: "#fff", outline: "none", fontFamily: "inherit",
  transition: "border-color .2s, box-shadow .2s",
  ...extra,
});
const focus = (e) => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}18`; };
const blur  = (e) => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; };

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: T.rose }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <Field label={label} required={required}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        required={required} style={inp()} onFocus={focus} onBlur={blur} />
    </Field>
  );
}

function SelectInput({ label, value, onChange, options, required }) {
  return (
    <Field label={label} required={required}>
      <select value={value} onChange={e => onChange(e.target.value)} required={required}
        style={{ ...inp(), cursor: "pointer" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export default function PortalIntake({ userId, displayName, onComplete }) {
  const [step, setStep]             = useState(0);
  const [saving, setSaving]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [autoSaved, setAutoSaved]   = useState(false);

  const [form, setForm] = useState({
    // Step 1 — Demographics
    full_name: displayName || "", date_of_birth: "", gender: "", pronouns: "", phone: "", address: "",
    // Step 2 — Emergency & Insurance
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
    insurance_provider: "", insurance_member_id: "", insurance_group: "",
    // Step 3 — Consents
    consent_assignment_of_benefits: false, consent_financial_responsibility: false,
    consent_treatment: false, consent_privacy: false, consent_telehealth: false,
    signature: "",
  });

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    getMyIntake(userId).then(({ data }) => {
      if (data) {
        if (data.status === "pending" || data.status === "reviewed" || data.status === "chart_created") {
          setSubmitted(true);
          return;
        }
        setForm(f => ({
          ...f,
          ...Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && k in f)),
        }));
      }
    });
  }, [userId]);

  const autoSave = async (fields = form) => {
    setSaving(true);
    await saveIntake(userId, fields);
    setSaving(false);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  };

  const goNext = async () => {
    await autoSave();
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consent_treatment || !form.consent_privacy) {
      alert("Please review and accept the required consents.");
      return;
    }
    if (!form.consent_assignment_of_benefits || !form.consent_financial_responsibility) {
      alert("Please review and accept the financial responsibility and consent to treat agreements.");
      return;
    }
    if (!form.signature.trim()) {
      alert("Please add your digital signature.");
      return;
    }
    setSubmitting(true);
    const { error } = await submitIntake(userId, form);
    setSubmitting(false);
    if (!error) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        emailIntakeSubmitted({
          patient_name:  form.full_name || "Patient",
          patient_email: session?.user?.email,
          submitted_at:  new Date().toISOString(),
        }).catch(() => {});
      });
      setSubmitted(true);
    }
  };

  if (submitted) return <SubmittedScreen displayName={displayName} onBack={onComplete} />;

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ padding: "2rem", maxWidth: 760, margin: "0 auto" }}>
      <PageHeader
        icon="📋" label="Patient Intake"
        title="New Patient Intake Form"
        subtitle="Complete your intake before your first appointment. Your clinician will go over the rest with you in person."
        gradient={`linear-gradient(135deg,${T.accent}15,${T.teal}10)`}
      />

      {/* Progress bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Step {step + 1} of {STEPS.length} — {STEPS[step].label}</span>
          <span style={{ fontSize: 12, color: T.muted }}>{Math.round(progress)}% complete{saving ? " · Saving…" : autoSaved ? " · Saved ✓" : ""}</span>
        </div>
        <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${T.accent},${T.teal})`, borderRadius: 99, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: i < step ? "pointer" : "default" }} onClick={() => i < step && setStep(i)}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: i < step ? `linear-gradient(135deg,${T.accent},${T.teal})` : i === step ? `${T.accent}20` : T.border,
                border: `2px solid ${i <= step ? T.accent : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, transition: "all .2s",
                color: i < step ? "#fff" : i === step ? T.accent : T.muted, fontWeight: 700,
              }}>
                {i < step ? "✓" : s.icon}
              </div>
              <span style={{ fontSize: 10, color: i === step ? T.accent : T.muted, fontWeight: i === step ? 600 : 400, whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Card style={{ padding: "1.8rem 2rem" }}>
        <form onSubmit={step === STEPS.length - 1 ? handleSubmit : e => { e.preventDefault(); goNext(); }}>

          {/* ── Step 1: Demographics ── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeading icon="👤" title="Personal Information" desc="Tell us about yourself" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <TextInput label="Full Legal Name" value={form.full_name} onChange={set("full_name")} placeholder="First Middle Last" required />
                </div>
                <TextInput label="Date of Birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} required />
                <SelectInput label="Gender Identity" value={form.gender} onChange={set("gender")} options={[
                  { value: "", label: "Select…" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Non-binary", label: "Non-binary / non-conforming" },
                  { value: "Transgender Male", label: "Transgender Male" },
                  { value: "Transgender Female", label: "Transgender Female" },
                  { value: "Other", label: "Other" },
                  { value: "Prefer not to say", label: "Prefer not to say" },
                ]} />
                <TextInput label="Pronouns" value={form.pronouns} onChange={set("pronouns")} placeholder="e.g. she/her, they/them" />
                <TextInput label="Phone Number" type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" required />
                <div style={{ gridColumn: "1 / -1" }}>
                  <TextInput label="Home Address" value={form.address} onChange={set("address")} placeholder="Street, City, State, ZIP" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Emergency & Insurance ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <StepHeading icon="🛡️" title="Emergency Contact & Insurance" desc="Who should we contact in an emergency, and how are you covered?" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Emergency Contact</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <TextInput label="Contact Name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Full name" required />
                  <TextInput label="Phone Number" type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="(555) 000-0000" required />
                  <TextInput label="Relationship" value={form.emergency_contact_relationship} onChange={set("emergency_contact_relationship")} placeholder="e.g. Spouse, Parent, Friend" />
                </div>
              </div>
              <div style={{ height: 1, background: T.border }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.teal, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Insurance Information</div>
                <Alert type="info" icon="ℹ️" title="If you don't have insurance, leave these blank — we'll discuss options at your appointment." />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
                  <TextInput label="Insurance Provider" value={form.insurance_provider} onChange={set("insurance_provider")} placeholder="e.g. BlueCross, Aetna" />
                  <TextInput label="Member ID" value={form.insurance_member_id} onChange={set("insurance_member_id")} placeholder="Member or policy number" />
                  <TextInput label="Group Number" value={form.insurance_group} onChange={set("insurance_group")} placeholder="Group number (if applicable)" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Consents & Signature ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <StepHeading icon="✍️" title="Consents, Policies & Signature" desc="Please read each document carefully, then acknowledge and sign below" />

              {/* Informed Consent */}
              <ConsentDoc title="📄 Informed Consent for Psychotherapy Services" color={T.accent}>
                <p><strong>About Psychotherapy Services</strong><br />Psychotherapy is a working cooperative relationship between you and your therapist. Your therapist will contribute their knowledge, expertise, and clinical skills. You, as the client, have the responsibility to bring an attitude of collaboration and a commitment to the therapeutic process.</p>
                <p>Please note that psychotherapy is not an emergency service. If you are experiencing suicidal or homicidal thoughts, are in crisis, or need immediate help, please call 911 or go to the nearest emergency department.</p>
                <p><strong>Benefits and Risks</strong><br />Psychotherapy has both benefits and risks. Risks may include experiencing uncomfortable feelings such as sadness, guilt, anxiety, anger, frustration, loneliness, and helplessness. However, therapy often leads to a significant reduction in feelings of distress, increased satisfaction in interpersonal relationships, greater personal awareness and insight, and increased skills for managing stress.</p>
                <p><strong>Appointments and Cancellations</strong><br />You may cancel appointments in advance free of charge, as long as sufficient advance notice is provided. For no-shows or last-minute cancellations, a fee may be charged.</p>
                <p><strong>Confidentiality</strong><br />Communication between you and your counselor is confidential. Your counselor has an ethical and legal obligation to break confidentiality only under specific circumstances: (1) suspected child, elder, or dependent adult abuse or neglect; (2) serious intent to harm yourself, someone else, or property; (3) a court order for release of records.</p>
                <p><strong>Additional Rights</strong><br />You have the right to end counseling at any time, to question any aspect of your treatment, to expect professional and ethical boundaries, and to considerate and respectful care without discrimination.</p>
              </ConsentDoc>

              {/* Practice Policies */}
              <ConsentDoc title="📋 Practice Policies" color={T.teal}>
                <p><strong>Appointments and Cancellations</strong><br />Appointments are scheduled in advance at a cadence agreed upon based on your goals, treatment needs, and mutual availability. For no-shows or last-minute cancellations, a fee may be charged.</p>
                <p><strong>Availability and After-Hours Emergencies</strong><br />Providers check voicemail during normal business hours. Messages left outside of normal hours will be picked up the next business day. If you are in crisis, please call 911 or go to the nearest emergency department.</p>
                <p><strong>Contacting Your Provider</strong><br />Providers are often not immediately available by telephone. You may leave a message on the confidential voicemail and your call will be returned, but it may take a day or two for non-urgent matters.</p>
                <p><strong>Discharge Process</strong><br />If our professional relationship ends, the reasons will be discussed with you first, and a list of other qualified providers will be offered upon request.</p>
              </ConsentDoc>

              {/* Notice of Privacy Practices */}
              <ConsentDoc title="🔒 Notice of Privacy Practices (HIPAA)" color="#c2410c" subtitle="Last Updated: July 22, 2025">
                <p>This Notice describes how medical information about you may be used and disclosed. We are required by law to keep your health information private and follow the terms of this notice.</p>
                <p><strong>How Your Information Is Used</strong><br />We may use and disclose your health information for treatment, payment, and healthcare operations — including referring you to other providers, verifying insurance, submitting claims, and reviewing treatment procedures.</p>
                <p><strong>Disclosures Without Authorization</strong><br />We may disclose your information without authorization in emergencies, for judicial proceedings, for public health activities, in cases of suspected child or elder abuse, and to business associates under confidentiality agreements.</p>
                <p><strong>Your Individual Rights</strong><br />(1) Right to inspect and copy your health information. (2) Right to request amendment. (3) Right to an accounting of disclosures. (4) Right to request restrictions. (5) Right to file complaints at compliance@headway.co or (833) 384-1044.</p>
              </ConsentDoc>

              {/* Financial & Telehealth */}
              <ConsentDoc title="💳 Assignment of Benefits & Financial Responsibility" color="#7c3aed">
                <p><strong>Payment of Fees:</strong> I agree to pay for charges for services as described. Payment for sessions is due after each session.</p>
                <p><strong>Insurance:</strong> If MindShift Wellness Clinic participates in my plan, I agree to pay all applicable deductibles, co-payments, and co-insurances.</p>
                <p><strong>Assignment of Insurance Fees:</strong> I agree to allow my insurance plan to pay MindShift Wellness Clinic directly.</p>
                <p><strong>Telehealth Consent:</strong> I consent to participate in telemental health services. I understand I have the right to refuse telehealth and be informed of alternative services. Risks include technology failure and reduced visibility of non-verbal cues.</p>
              </ConsentDoc>

              {/* Checkboxes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Acknowledgements — please check each box</div>
                {[
                  { key: "consent_treatment",              label: "Informed Consent for Psychotherapy",                    desc: "I have read and agree to the Informed Consent for Psychotherapy Services.", required: true },
                  { key: "consent_privacy",                label: "Practice Policies & Notice of Privacy Practices (HIPAA)", desc: "I have read and acknowledge MindShift Wellness Clinic's Practice Policies and HIPAA Notice of Privacy Practices.", required: true },
                  { key: "consent_assignment_of_benefits", label: "Assignment of Benefits & Financial Responsibility",      desc: "I have read and agree to the payment terms and insurance assignment.", required: true },
                  { key: "consent_financial_responsibility", label: "Consent to Treat & Telehealth",                       desc: "I consent to receive behavioral health and telehealth services from MindShift Wellness Clinic.", required: true },
                  { key: "consent_telehealth",             label: "Telehealth Consent (Optional)",                         desc: "I consent to receive telehealth services via secure video platform when applicable.", required: false },
                ].map(c => (
                  <label key={c.key} style={{ display: "flex", gap: 12, padding: "1rem 1.2rem", borderRadius: 12, border: `1.5px solid ${form[c.key] ? T.accent : T.border}`, background: form[c.key] ? `${T.accent}08` : "#fff", cursor: "pointer", transition: "all .15s" }}>
                    <input type="checkbox" checked={form[c.key]} onChange={e => setForm(f => ({ ...f, [c.key]: e.target.checked }))} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: T.accent }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.label}{c.required && <span style={{ color: T.rose }}> *</span>}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{c.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Signature */}
              <div>
                <Field label="Digital Signature — Type Your Full Legal Name" required>
                  <input value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))}
                    placeholder={form.full_name || "Your full legal name"}
                    required style={{ ...inp(), fontFamily: "cursive", fontSize: 18, color: T.accent, letterSpacing: "0.03em" }}
                    onFocus={focus} onBlur={blur} />
                </Field>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>
                  By typing your name above, you agree this constitutes your legal digital signature on today's date ({new Date().toLocaleDateString()}).
                </div>
              </div>

              <Alert type="info" icon="🔒" title="Your intake is encrypted and protected under HIPAA. Only your care team at MindShift Wellness Clinic can access it." />
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${T.border}` }}>
            <Btn variant="secondary" onClick={goPrev} type="button" style={{ visibility: step === 0 ? "hidden" : "visible" }}>← Back</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => autoSave()} type="button" style={{ fontSize: 12 }}>
                {saving ? "Saving…" : "Save Draft"}
              </Btn>
              {step < STEPS.length - 1 ? (
                <Btn type="submit">Continue →</Btn>
              ) : (
                <Btn type="submit" disabled={submitting} style={{ background: `linear-gradient(135deg,${T.accent},${T.teal})` }}>
                  {submitting ? "Submitting…" : "Submit ✓"}
                </Btn>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ConsentDoc({ title, color, subtitle, children }) {
  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ background: `${color}0d`, padding: "0.9rem 1.5rem", borderBottom: `1px solid ${color}20` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle} · MindShift Wellness Clinic</div>}
        {!subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>MindShift Wellness Clinic</div>}
      </div>
      <div style={{ padding: "1.2rem 1.5rem", maxHeight: 240, overflowY: "auto", fontSize: 12, color: T.muted, lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 8, background: "#fff" }}>
        {children}
      </div>
    </div>
  );
}

function StepHeading({ icon, title, desc }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: T.text, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{desc}</p>
    </div>
  );
}

function SubmittedScreen({ displayName, onBack }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ background: "#fff", borderRadius: 28, padding: "2.5rem 2rem", maxWidth: 520, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(74,108,247,0.18)", animation: "fadeUp .35s ease" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ fontSize: 64, marginBottom: "1rem" }}>🌱</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: T.text, marginBottom: 10 }}>
          Thank you, {displayName}
        </h1>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.8, marginBottom: "1.5rem" }}>
          Your forms have been received. Your clinician will go over the rest with you at your first appointment.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.8rem", textAlign: "left" }}>
          {[
            ["✅", "Your consents are securely on file"],
            ["👨‍⚕️", "Your clinician will review before your visit"],
            ["📅", "No further action needed — just show up"],
            ["💬", "Questions? Message us through the portal"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", background: `${T.accent}08`, borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 13, color: T.text }}>{text}</span>
            </div>
          ))}
        </div>
        <Btn onClick={onBack} style={{ width: "100%" }}>Back to Portal</Btn>
      </div>
    </div>
  );
}
