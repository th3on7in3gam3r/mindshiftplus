import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { EhrCard, EhrBtn, EhrStyles, SectionHeader, Spinner } from "./EHRUI";

// ── Helpers ───────────────────────────────────────────────────────────────────
const T = {
  accent: "#4a6cf7", teal: "#0ea5a0", rose: "#f04060",
  text: "#1a1f36", muted: "#6b7280", border: "#e5e7eb",
  purple: "#7c3aed", gold: "#d97706",
};

const inp = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text,
  background: "var(--ehr-surface,#fff)", outline: "none", fontFamily: "inherit",
  transition: "border-color .2s",
};

function CField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

function CTextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <CField label={label}>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={rows} style={{ ...inp, resize: "vertical" }} />
    </CField>
  );
}

function CYesNo({ label, sub, value, onChange }) {
  return (
    <div style={{ padding: "0.8rem 1rem", background: "var(--ehr-bg,#f8faff)", border: `1.5px solid ${value ? T.accent : T.border}`, borderRadius: 10, transition: "border-color .15s" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ehr-text)", marginBottom: sub ? 3 : 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginBottom: 8, lineHeight: 1.5 }}>{sub}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        {[{ v: "yes", l: "Yes" }, { v: "no", l: "No" }].map(({ v, l }) => (
          <button key={v} type="button" onClick={() => onChange(value === v ? "" : v)} style={{
            flex: 1, padding: "8px", borderRadius: 8,
            border: `1.5px solid ${value === v ? T.accent : T.border}`,
            background: value === v ? `${T.accent}12` : "transparent",
            color: value === v ? T.accent : "var(--ehr-muted)",
            fontWeight: value === v ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all .15s",
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function CSection({ title, color = T.accent, desc, children }) {
  return (
    <EhrCard style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        {title}
      </div>
      {desc && <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginBottom: 12, lineHeight: 1.5 }}>{desc}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </EhrCard>
  );
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function loadClinicalIntake(patientId) {
  const { data } = await supabase
    .from("clinical_intake_records")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  return data;
}

async function saveClinicalIntake(patientId, fields, clinicianId) {
  const { data, error } = await supabase
    .from("clinical_intake_records")
    .upsert({ patient_id: patientId, ...fields, updated_by: clinicianId, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EHRClinicalIntake({ chart, clinician }) {
  const [form, setForm] = useState({
    // Mental health history
    mh_reason: "",
    mh_psych_diagnosis: "", mh_psych_professional: "",
    mh_psych_medications: "", mh_psych_hospitalized: "",
    // Medical history
    med_has_allergies: "", med_allergies_detail: "",
    med_has_medications: "", med_medications_detail: "",
    med_has_conditions: "", med_conditions_detail: "",
    sex_assigned_at_birth: "",
    // Substance use
    sub_alcohol: "", sub_tobacco: "", sub_cannabis: "",
    sub_cocaine: "", sub_hallucinogens: "", sub_opioids: "", sub_meth: "",
    sub_notes: "",
    // Social context
    social_relationships: "", social_upbringing: "", social_other: "",
    // SCOFF
    scoff_sick: "", scoff_control: "", scoff_stone: "", scoff_fat: "", scoff_food: "",
    // Life situation
    living_situation: "",
    housing_concerns: [], financial_struggles: [], food_insecurity: "",
    transportation_barrier: [], daily_living_help: "", stress_level: "",
    help_needed: [], survey_completed_by: "Clinician",
    // Notes
    clinician_notes: "",
  });

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeTab, setActiveTab] = useState("biopsych");

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    loadClinicalIntake(chart.patient_id).then(data => {
      if (data) setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && k in f)) }));
      setLoading(false);
    });
  }, [chart.patient_id]);

  const handleSave = async () => {
    setSaving(true);
    await saveClinicalIntake(chart.patient_id, form, clinician.user_id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleArr = (key, val) => setForm(f => ({
    ...f, [key]: (f[key] || []).includes(val)
      ? (f[key] || []).filter(x => x !== val)
      : [...(f[key] || []), val],
  }));

  if (loading) return <Spinner />;

  const TABS = [
    { id: "biopsych",  label: "Biopsychosocial", icon: "🔬" },
    { id: "scoff",     label: "SCOFF",           icon: "🥗" },
    { id: "life",      label: "Life Situation",  icon: "🏠" },
    { id: "notes",     label: "Clinician Notes", icon: "📝" },
  ];

  return (
    <div className="ehr-root">
      <EhrStyles />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ehr-text)", margin: 0 }}>Clinical Intake</h2>
          <p style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>Completed by clinician during appointment — {chart.full_name}</p>
        </div>
        <EhrBtn onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </EhrBtn>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.2rem", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(226,232,240,0.8)`, borderRadius: 12, padding: "4px", width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? "rgba(74,108,247,0.15)" : "transparent",
            border: activeTab === t.id ? "1px solid rgba(74,108,247,0.3)" : "1px solid transparent",
            borderRadius: 8, padding: "7px 14px",
            color: activeTab === t.id ? T.accent : "var(--ehr-muted)",
            fontSize: 12, fontWeight: activeTab === t.id ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── Biopsychosocial ── */}
      {activeTab === "biopsych" && (
        <div>
          <CSection title="What Brings You to Treatment?" color={T.accent}>
            <CTextArea label="Reason for seeking care" value={form.mh_reason} onChange={set("mh_reason")} placeholder="Patient's own words about what brings them in…" rows={4} />
          </CSection>

          <CSection title="Mental Health History" color={T.accent} desc="Guide future conversations and care decisions.">
            {[
              { key: "mh_psych_diagnosis",    label: "Has the patient received a psychiatric diagnosis?",                    sub: "Including any past diagnoses, even if temporary or uncertain." },
              { key: "mh_psych_professional", label: "Has the patient seen a mental health professional in the past?",       sub: "Including both therapists and psychiatrists." },
              { key: "mh_psych_medications",  label: "Has the patient taken any psychiatric medications before?",            sub: "Medications for mental health, mood, anxiety, sleep, or focus." },
              { key: "mh_psych_hospitalized", label: "Has the patient ever stayed in a hospital or facility for mental health reasons?", sub: "Any times when a higher level of support was needed." },
            ].map(({ key, label, sub }) => (
              <CYesNo key={key} label={label} sub={sub} value={form[key]} onChange={set(key)} />
            ))}
          </CSection>

          <CSection title="Medical History" color={T.teal} desc="Important details to recommend the best treatment.">
            <CYesNo label="Does the patient have any allergies?" sub="Including medication, food, or environmental allergies." value={form.med_has_allergies} onChange={set("med_has_allergies")} />
            {form.med_has_allergies === "yes" && <CTextArea label="Allergy details" value={form.med_allergies_detail} onChange={set("med_allergies_detail")} placeholder="List allergies…" rows={2} />}
            <CYesNo label="Is the patient currently taking any medications?" sub="Include prescription and over-the-counter medications." value={form.med_has_medications} onChange={set("med_has_medications")} />
            {form.med_has_medications === "yes" && <CTextArea label="Medication details" value={form.med_medications_detail} onChange={set("med_medications_detail")} placeholder="List medications, dosages…" rows={2} />}
            <CYesNo label="Does the patient have any medical conditions or chronic diseases?" sub="Blood pressure, heart, kidneys, liver, diabetes, high cholesterol, stroke, cancer, gout, etc." value={form.med_has_conditions} onChange={set("med_has_conditions")} />
            {form.med_has_conditions === "yes" && <CTextArea label="Condition details" value={form.med_conditions_detail} onChange={set("med_conditions_detail")} placeholder="List conditions…" rows={2} />}
            <CField label="Sex Assigned at Birth">
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "Female", l: "Female" }, { v: "Male", l: "Male" }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, sex_assigned_at_birth: f.sex_assigned_at_birth === v ? "" : v }))} style={{
                    flex: 1, padding: "8px", borderRadius: 8,
                    border: `1.5px solid ${form.sex_assigned_at_birth === v ? T.teal : T.border}`,
                    background: form.sex_assigned_at_birth === v ? `${T.teal}12` : "transparent",
                    color: form.sex_assigned_at_birth === v ? T.teal : "var(--ehr-muted)",
                    fontWeight: form.sex_assigned_at_birth === v ? 700 : 400,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all .15s",
                  }}>{l}</button>
                ))}
              </div>
            </CField>
          </CSection>

          <CSection title="Alcohol & Substance Use" color={T.purple} desc="How alcohol or substance use might be impacting wellbeing.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { key: "sub_alcohol",      label: "Alcohol",                                     sub: "Including past and present use." },
                { key: "sub_tobacco",      label: "Tobacco / Nicotine",                          sub: "Including past and present use." },
                { key: "sub_cannabis",     label: "Cannabis (marijuana / pot / weed)",            sub: "Including past and present use." },
                { key: "sub_cocaine",      label: "Cocaine",                                     sub: "Including past and present use." },
                { key: "sub_hallucinogens",label: "Hallucinogens (LSD / acid, psilocybin)",      sub: "Including past and present use." },
                { key: "sub_opioids",      label: "Opioids (heroin, oxycodone, fentanyl)",       sub: "Including past and present use." },
                { key: "sub_meth",         label: "Methamphetamine",                             sub: "Including past and present use." },
              ].map(({ key, label, sub }) => (
                <CYesNo key={key} label={label} sub={sub} value={form[key]} onChange={set(key)} />
              ))}
            </div>
            <CTextArea label="Additional notes on substance use" value={form.sub_notes} onChange={set("sub_notes")} placeholder="Frequency, duration, context…" rows={2} />
          </CSection>

          <CSection title="Social Context" color={T.teal} desc="Parts of the patient's life and environment that affect their health.">
            <CTextArea label="Current relationships with important people in their life" value={form.social_relationships} onChange={set("social_relationships")} placeholder="Friends, partners, family…" rows={3} />
            <CTextArea label="Upbringing, childhood, or early life experiences" value={form.social_upbringing} onChange={set("social_upbringing")} placeholder="Anything the provider should know…" rows={3} />
            <CTextArea label="Anything else the provider should know?" value={form.social_other} onChange={set("social_other")} rows={2} />
          </CSection>
        </div>
      )}

      {/* ── SCOFF ── */}
      {activeTab === "scoff" && (
        <div>
          <CSection title="SCOFF Questionnaire — Dietary Habits Screening" color={T.teal}
            desc="Citation: Morgan JF, Reid F, Lacey JH. West J Med. 2000 Mar;172(3):164-5.">
            {[
              { key: "scoff_sick",    q: "1. Do you make yourself sick because you feel uncomfortably full?" },
              { key: "scoff_control", q: "2. Do you worry that you have lost control over how much you eat?" },
              { key: "scoff_stone",   q: "3. Have you recently lost more than one stone (14 lb) in a 3-month period?" },
              { key: "scoff_fat",     q: "4. Do you believe yourself to be fat when others say you are too thin?" },
              { key: "scoff_food",    q: "5. Would you say that food dominates your life?" },
            ].map(({ key, q }) => (
              <CYesNo key={key} label={q} value={form[key]} onChange={set(key)} />
            ))}
            {(() => {
              const score = ["scoff_sick","scoff_control","scoff_stone","scoff_fat","scoff_food"].filter(k => form[k] === "yes").length;
              return score > 0 ? (
                <div style={{ background: score >= 2 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${score >= 2 ? "#fca5a5" : "#86efac"}`, borderRadius: 10, padding: "0.8rem 1rem", fontSize: 13 }}>
                  <strong>SCOFF Score: {score}/5</strong> — {score >= 2 ? "⚠️ Score ≥ 2 suggests possible eating disorder — consider further assessment." : "✓ Score below clinical threshold."}
                </div>
              ) : null;
            })()}
          </CSection>
        </div>
      )}

      {/* ── Life Situation ── */}
      {activeTab === "life" && (
        <div>
          <CSection title="Your Current Life Situation (SDOH)" color={T.gold} desc="Social determinants of health — originally developed by Kaiser Permanente.">
            <CField label="1. Current living situation">
              <select value={form.living_situation} onChange={e => setForm(f => ({ ...f, living_situation: e.target.value }))} style={inp}>
                {[["", "Select…"], ["Live alone", "Live alone in my own home"], ["Live with others", "Live in a household with other people"], ["Residential facility", "Live in a residential facility"], ["Temporarily with family/friend", "Temporarily staying with a relative or friend"], ["Shelter/homeless", "Temporarily staying in a shelter or homeless"], ["Other", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </CField>

            <CField label="2. Concerns about current living situation?">
              {["Condition of housing", "Lack of more permanent housing", "Ability to pay for housing or utilities", "Feeling safe"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ehr-text)", marginTop: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form.housing_concerns || []).includes(opt)} onChange={() => toggleArr("housing_concerns", opt)} style={{ accentColor: T.accent }} />
                  {opt}
                </label>
              ))}
            </CField>

            <CField label="3. Trouble paying for any of the following in the past 3 months?">
              {["Food", "Housing", "Heat and electricity", "Medical needs", "Transportation", "Childcare", "Debts", "None of these"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ehr-text)", marginTop: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form.financial_struggles || []).includes(opt)} onChange={() => toggleArr("financial_struggles", opt)} style={{ accentColor: T.accent }} />
                  {opt}
                </label>
              ))}
            </CField>

            <CField label="4. How often did you worry food would run out before you had money to buy more?">
              <select value={form.food_insecurity} onChange={e => setForm(f => ({ ...f, food_insecurity: e.target.value }))} style={inp}>
                {[["", "Select…"], ["Never", "Never"], ["Sometimes", "Sometimes"], ["Often", "Often"], ["Very often", "Very often"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </CField>

            <CField label="5. Has lack of transportation kept you from medical appointments or daily living?">
              {["Kept me from medical appointments or getting medications", "Kept me from doing things needed for daily living", "Not a problem for me"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ehr-text)", marginTop: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form.transportation_barrier || []).includes(opt)} onChange={() => toggleArr("transportation_barrier", opt)} style={{ accentColor: T.accent }} />
                  {opt}
                </label>
              ))}
            </CField>

            <CField label="6. Help with daily activities (bathing, meals, shopping, finances)?">
              <select value={form.daily_living_help} onChange={e => setForm(f => ({ ...f, daily_living_help: e.target.value }))} style={inp}>
                {[["", "Select…"], ["I don't need any help", "I don't need any help"], ["I get all the help I need", "I get all the help I need"], ["I could use a little more help", "I could use a little more help"], ["I need a lot more help", "I need a lot more help"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </CField>

            <CField label="7. In the last month, how often have you felt difficulties were piling up so high you could not overcome them?">
              <select value={form.stress_level} onChange={e => setForm(f => ({ ...f, stress_level: e.target.value }))} style={inp}>
                {[["", "Select…"], ["Never", "Never"], ["Almost never", "Almost never"], ["Sometimes", "Sometimes"], ["Fairly often", "Fairly often"], ["Very often", "Very often"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </CField>

            <CField label="8. Which of the following would the patient like to receive help with?">
              {["Food", "Housing", "Transportation", "Utilities (heat, electricity, water)", "Medical care / medicine", "Dental services", "Vision services", "Applying for public benefits (WIC, SSI, SNAP)", "More help with daily activities", "Childcare / child-related issues", "Debt / loan repayment", "Legal issues", "Employment", "I don't want help with any of these"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ehr-text)", marginTop: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form.help_needed || []).includes(opt)} onChange={() => toggleArr("help_needed", opt)} style={{ accentColor: T.accent }} />
                  {opt}
                </label>
              ))}
            </CField>

            <CField label="9. Who completed these questions?">
              <select value={form.survey_completed_by} onChange={e => setForm(f => ({ ...f, survey_completed_by: e.target.value }))} style={inp}>
                {[["Clinician", "Clinician (during appointment)"], ["Patient alone", "Patient alone"], ["Patient with help", "Patient with someone's help"], ["Family/caregiver", "Family member, friend, or caregiver of patient"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </CField>
          </CSection>
        </div>
      )}

      {/* ── Clinician Notes ── */}
      {activeTab === "notes" && (
        <CSection title="Clinician Notes" color={T.accent} desc="Additional observations, follow-up questions, or clinical impressions from this intake.">
          <CTextArea label="Notes" value={form.clinician_notes} onChange={set("clinician_notes")} placeholder="Any additional clinical observations, follow-up items, or notes from the intake conversation…" rows={10} />
        </CSection>
      )}

      {/* Save button bottom */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <EhrBtn onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Clinical Intake"}
        </EhrBtn>
      </div>
    </div>
  );
}
