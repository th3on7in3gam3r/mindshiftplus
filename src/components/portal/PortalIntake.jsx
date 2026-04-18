import { useState, useEffect } from "react";
import { getMyIntake, saveIntake, submitIntake } from "../../lib/intakeDb";
import { emailIntakeSubmitted } from "../../lib/emailService";
import { supabase } from "../../lib/supabase";
import { T, PageHeader, Card, Alert, Btn } from "./PortalUI";

const STEPS = [
  { id: "demographics", label: "Personal Info",     icon: "👤", desc: "Basic information about you" },
  { id: "emergency",    label: "Emergency & Insurance", icon: "🛡️", desc: "Emergency contact & coverage" },
  { id: "medical",      label: "Medical History",   icon: "🩺", desc: "Health background & medications" },
  { id: "mentalhealth", label: "Mental Health",      icon: "🧠", desc: "Your mental health history" },
  { id: "consent",      label: "Consent & Sign",     icon: "✍️", desc: "Review and sign your intake" },
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

function TextArea({ label, value, onChange, placeholder, rows = 3, required }) {
  return (
    <Field label={label} required={required}>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={rows} required={required} style={{ ...inp(), resize: "vertical", minHeight: rows * 24 }}
        onFocus={focus} onBlur={blur} />
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

function YesNo({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 10 }}>
        {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
          <button key={l} type="button" onClick={() => onChange(v)} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${value === v ? T.accent : T.border}`,
            background: value === v ? `${T.accent}10` : "#fff",
            color: value === v ? T.accent : T.muted, fontWeight: value === v ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit", fontSize: 14, transition: "all .15s",
          }}>{l}</button>
        ))}
      </div>
    </Field>
  );
}

export default function PortalIntake({ userId, displayName, onComplete }) {
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [autoSaved, setAutoSaved]   = useState(false);

  // Form data — all fields
  const [form, setForm] = useState({
    // Step 1
    full_name: displayName || "", date_of_birth: "", gender: "", pronouns: "", phone: "", address: "",
    // Step 2
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
    insurance_provider: "", insurance_member_id: "", insurance_group: "",
    // Step 3
    primary_care_provider: "", pharmacy: "", current_medications: "", allergies: "",
    medical_conditions: "", hospitalizations: "", surgeries: "",
    // Step 4
    reason_for_visit: "", symptoms_duration: "", previous_therapy: false, previous_psychiatry: false,
    previous_treatment_notes: "", previous_diagnoses: "", family_mental_health: "", substance_use: "",
    // Step 5
    suicidal_ideation: "no", self_harm: "no", safety_plan: "",
    consent_treatment: false, consent_privacy: false, consent_telehealth: false, signature: "",
  });

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));
  const setE = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Load existing draft on mount
  useEffect(() => {
    getMyIntake(userId).then(({ data }) => {
      if (data) {
        if (data.status === "pending" || data.status === "reviewed" || data.status === "chart_created") {
          setSubmitted(true);
          return;
        }
        // Pre-fill with saved draft
        setForm(f => ({
          ...f,
          ...Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && k in f)),
        }));
      }
    });
  }, [userId]);

  // Auto-save draft every time step changes
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
    if (!form.signature.trim()) {
      alert("Please add your digital signature.");
      return;
    }
    setSubmitting(true);
    const { error } = await submitIntake(userId, form);
    setSubmitting(false);
    if (!error) {
      // Get patient email from session for notification
      supabase.auth.getSession().then(({ data: { session } }) => {
        emailIntakeSubmitted({
          patient_name:     form.full_name || "Patient",
          patient_email:    session?.user?.email,
          reason_for_visit: form.reason_for_visit,
          submitted_at:     new Date().toISOString(),
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
        subtitle="Complete your intake before your first appointment. Your answers help us provide the best care."
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
        {/* Step dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: i <= step ? "pointer" : "default" }} onClick={() => i < step && setStep(i)}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: i < step ? `linear-gradient(135deg,${T.accent},${T.teal})` : i === step ? `${T.accent}20` : T.border,
                border: `2px solid ${i <= step ? T.accent : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, transition: "all .2s",
                color: i < step ? "#fff" : i === step ? T.accent : T.muted,
                fontWeight: 700,
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

          {/* ── Step 3: Medical History ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeading icon="🩺" title="Medical History" desc="Help us understand your overall health background" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <TextInput label="Primary Care Provider" value={form.primary_care_provider} onChange={set("primary_care_provider")} placeholder="Doctor's name (if any)" />
                <TextInput label="Preferred Pharmacy" value={form.pharmacy} onChange={set("pharmacy")} placeholder="Pharmacy name & location" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <TextArea label="Current Medications" value={form.current_medications} onChange={set("current_medications")} placeholder="List all current medications, dosages, and how often you take them. Write 'None' if not applicable." rows={3} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <TextArea label="Known Allergies" value={form.allergies} onChange={set("allergies")} placeholder="Medications, foods, environmental allergies. Write 'NKA' if none known." rows={2} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <TextArea label="Current / Chronic Medical Conditions" value={form.medical_conditions} onChange={set("medical_conditions")} placeholder="e.g. Diabetes, hypertension, thyroid issues, chronic pain…" rows={3} />
                </div>
                <TextArea label="Past Hospitalizations" value={form.hospitalizations} onChange={set("hospitalizations")} placeholder="Include dates and reasons if known" rows={2} />
                <TextArea label="Past Surgeries" value={form.surgeries} onChange={set("surgeries")} placeholder="Include dates and types if known" rows={2} />
              </div>
            </div>
          )}

          {/* ── Step 4: Mental Health History ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeading icon="🧠" title="Mental Health History" desc="This helps us understand your needs and provide the right support" />
              <Alert type="info" icon="💙" title="Everything you share is confidential and protected by HIPAA. There are no wrong answers." />
              <TextArea label="Primary Reason for Seeking Care" value={form.reason_for_visit} onChange={set("reason_for_visit")} placeholder="What brings you to MindShift Wellness Clinic? What are you hoping to work on?" rows={4} required />
              <SelectInput label="How long have you been experiencing these concerns?" value={form.symptoms_duration} onChange={set("symptoms_duration")} options={[
                { value: "", label: "Select…" },
                { value: "Less than 1 month", label: "Less than 1 month" },
                { value: "1–3 months", label: "1–3 months" },
                { value: "3–6 months", label: "3–6 months" },
                { value: "6–12 months", label: "6–12 months" },
                { value: "1–2 years", label: "1–2 years" },
                { value: "More than 2 years", label: "More than 2 years" },
                { value: "Most of my life", label: "Most of my life" },
              ]} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <YesNo label="Have you seen a therapist or counselor before?" value={form.previous_therapy} onChange={set("previous_therapy")} />
                <YesNo label="Have you seen a psychiatrist or been on psychiatric medication before?" value={form.previous_psychiatry} onChange={set("previous_psychiatry")} />
              </div>
              {(form.previous_therapy || form.previous_psychiatry) && (
                <TextArea label="Tell us about your previous treatment" value={form.previous_treatment_notes} onChange={set("previous_treatment_notes")} placeholder="What worked? What didn't? Any medications tried?" rows={3} />
              )}
              <TextArea label="Any prior mental health diagnoses?" value={form.previous_diagnoses} onChange={set("previous_diagnoses")} placeholder="e.g. Depression, anxiety, ADHD… Write 'None' if unknown." rows={2} />
              <TextArea label="Family mental health history (optional)" value={form.family_mental_health} onChange={set("family_mental_health")} placeholder="Any mental health conditions in immediate family members?" rows={2} />
              <TextArea label="Substance use (alcohol, cannabis, other)" value={form.substance_use} onChange={set("substance_use")} placeholder="Current or past use? Frequency? Any concerns?" rows={2} />
            </div>
          )}

          {/* ── Step 5: Safety & Consent ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <StepHeading icon="✍️" title="Safety Check & Consent" desc="A few important questions and your digital signature" />

              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "1rem 1.2rem" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>⚠️ Safety Assessment</div>
                <div style={{ fontSize: 12, color: "#9a3412", marginBottom: 12 }}>If you are in immediate danger, call 911. For mental health crisis, call or text 988 (Suicide & Crisis Lifeline).</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <SelectInput label="Are you currently experiencing thoughts of suicide or self-harm?" value={form.suicidal_ideation} onChange={set("suicidal_ideation")} options={[
                    { value: "no", label: "No" },
                    { value: "past", label: "In the past, but not currently" },
                    { value: "current", label: "Yes, currently" },
                  ]} />
                  <SelectInput label="Do you have a history of self-harm?" value={form.self_harm} onChange={set("self_harm")} options={[
                    { value: "no", label: "No" },
                    { value: "past", label: "In the past, but not currently" },
                    { value: "current", label: "Yes, currently" },
                  ]} />
                  {(form.suicidal_ideation === "current" || form.self_harm === "current") && (
                    <TextArea label="Please share more so your clinician can help you stay safe" value={form.safety_plan} onChange={set("safety_plan")} rows={3} />
                  )}
                </div>
              </div>

              {/* Consents */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Consents & Agreements</div>
                {[
                  { key: "consent_treatment", label: "Consent to Treatment", desc: "I consent to receive psychiatric evaluation and treatment from MindShift Wellness Clinic clinicians.", required: true },
                  { key: "consent_privacy",   label: "Privacy Policy (HIPAA)", desc: "I acknowledge I have been informed of MindShift Wellness Clinic's HIPAA privacy practices and how my health information is used.", required: true },
                  { key: "consent_telehealth", label: "Telehealth Consent (Optional)", desc: "I consent to receive telehealth services via secure video platform when applicable.", required: false },
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

          {/* Navigation buttons */}
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
                  {submitting ? "Submitting…" : "Submit Intake ✓"}
                </Btn>
              )}
            </div>
          </div>
        </form>
      </Card>
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{
        background: "#fff", borderRadius: 28, padding: "2.5rem 2rem",
        maxWidth: 520, width: "100%", textAlign: "center",
        boxShadow: "0 24px 80px rgba(74,108,247,0.18)",
        animation: "fadeUp .35s ease",
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ fontSize: 64, marginBottom: "1rem" }}>🌱</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: T.text, marginBottom: 10 }}>
          Thank you for taking this step, {displayName}
        </h1>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.8, marginBottom: "1.5rem" }}>
          Taking care of yourself takes courage — and you just did something meaningful.
          Your intake has been received and your care team will review it before your first visit.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.8rem", textAlign: "left" }}>
          {[
            ["📋", "Your intake is securely on file"],
            ["👨‍⚕️", "Your clinician will review it before your visit"],
            ["📅", "No further action needed — just show up"],
            ["💬", "Questions? Message us through the portal"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", background: `${T.accent}08`, borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 13, color: T.text }}>{text}</span>
            </div>
          ))}
        </div>
        <Btn onClick={onBack} style={{ width: "100%", justifyContent: "center" }}>
          Back to Dashboard →
        </Btn>
      </div>
    </div>
  );
}
