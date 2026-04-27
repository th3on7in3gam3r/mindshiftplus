import { useState, useEffect } from "react";
import {
  getChart, getNotes, getMedications, getEhrDocuments,
  getPatientAppointments, getPatientMessages, upsertChart,
  upsertNote, upsertMedication, deleteMedication, signNote,
  deleteNote, generateMRN, sendClinicianMessage,
} from "../../lib/ehrDb";
import {
  EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, ICD10Picker,
  StatusBadge, SectionHeader, Divider, Spinner, EhrStyles,
  formatDate, formatDateTime, age,
} from "./EHRUI";
import { useTokens } from "../../lib/ThemeContext";
import EHRClinicalAI from "./EHRClinicalAI";
import EHRBilling, { CptPicker } from "./EHRBilling";
import EHRClinicalIntake from "./EHRClinicalIntake";
import EHRScribeNotes from "./EHRScribeNotes";

const TABS = [
  { id: "overview",     label: "Overview",     icon: "🏠" },
  { id: "intake",       label: "Intake",       icon: "📋" },
  { id: "notes",        label: "Notes",        icon: "📝" },
  { id: "scribe",       label: "AI Scribe",    icon: "🎙️" },
  { id: "medications",  label: "Medications",  icon: "💊" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "messages",     label: "Messages",     icon: "💬" },
  { id: "documents",    label: "Documents",    icon: "📄" },
  { id: "billing",      label: "Billing",      icon: "💰" },
  { id: "ai",           label: "AI Assistant", icon: "🤖" },
];

export default function EHRPatientChart({ chartId, clinician, onBack, isNew = false, newPatientId = null }) {
  const [tab, setTab]           = useState("overview");
  const [chart, setChart]       = useState(null);
  const [notes, setNotes]       = useState([]);
  const [meds, setMeds]         = useState([]);
  const [docs, setDocs]         = useState([]);
  const [appts, setAppts]       = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editChart, setEditChart]       = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showMedForm, setShowMedForm]   = useState(false);
  const [showMsgForm, setShowMsgForm]   = useState(false);
  const [editingNote, setEditingNote]   = useState(null);
  const [editingMed, setEditingMed]     = useState(null);

  useEffect(() => {
    if (isNew) {
      setChart({ patient_id: newPatientId, status: "active", mrn: generateMRN(), secondary_diagnoses: [], flags: [] });
      setEditChart(true);
      setLoading(false);
    } else {
      loadAll();
    }
  }, [chartId]);

  async function loadAll() {
    setLoading(true);
    const { data } = await getChart(chartId);
    if (!data) { setLoading(false); return; }
    setChart(data);
    const [n, m, d, a, msg] = await Promise.all([
      getNotes(data.id), getMedications(data.id), getEhrDocuments(data.id),
      getPatientAppointments(data.patient_id), getPatientMessages(data.patient_id),
    ]);
    setNotes(n.data ?? []); setMeds(m.data ?? []); setDocs(d.data ?? []);
    setAppts(a.data ?? []); setMessages(msg.data ?? []);
    setLoading(false);
  }

  const patientName = chart?.full_name || "New Patient";
  const patientAge  = age(chart?.date_of_birth);

  if (loading) return <Spinner />;

  return (
    <div className="ehr-root" style={{ fontFamily: "inherit", minHeight: "100vh", background: "var(--ehr-bg)" }}>
      <EhrStyles />

      {/* Patient header */}
      <div style={{
        background: localStorage.getItem('msw_theme') === 'dark'
          ? "linear-gradient(135deg,rgba(124,111,247,0.1),rgba(78,205,196,0.05))"
          : `linear-gradient(135deg,#3b5bdb10,#0ea5a008)`,
        borderBottom: `1px solid rgba(226,232,240,0.8)`,
        padding: "1.2rem 2rem",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <button onClick={onBack} style={{ background: localStorage.getItem('msw_theme') === 'dark' ? "rgba(255,255,255,0.05)" : "#f1f5f9", border: `1px solid #cbd5e1`, borderRadius: 8, padding: "6px 12px", color: "var(--ehr-muted)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", flexShrink: 0 }}>← Patients</button>
        <div style={{ width: 1, height: 24, background: "var(--ehr-border)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ehr-text)", letterSpacing: "-0.02em" }}>{patientName}</div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {chart?.mrn && <span style={{ color: "var(--ehr-accent)", fontWeight: 600 }}>MRN: {chart.mrn}</span>}
            {patientAge && <span>{patientAge} yrs</span>}
            {chart?.gender && <span>{chart.gender}</span>}
            {chart?.primary_diagnosis && <span style={{ color: "var(--ehr-teal)" }}>{chart.primary_diagnosis} — {chart.primary_diagnosis_label}</span>}
          </div>
        </div>
        <StatusBadge status={chart?.status ?? "active"} />
        {!editChart && <EhrBtn variant="secondary" small onClick={() => setEditChart(true)}>✏️ Edit Chart</EhrBtn>}
      </div>

      {/* Tabs — hidden when creating a new chart (no chart ID yet) */}
      {!isNew && (
        <div style={{ display: "flex", gap: 4, padding: "0.6rem 2rem", borderBottom: `1px solid rgba(226,232,240,0.8)`, background: "var(--ehr-surface)", overflowX: "auto" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} className="ehr-tab-btn" style={{
              background: tab === tb.id ? `#3b5bdb15` : "transparent",
              border: tab === tb.id ? `1px solid #3b5bdb35` : "1px solid transparent",
              borderRadius: 10, padding: "8px 16px",
              color: tab === tb.id ? "var(--ehr-accent)" : "var(--ehr-muted)",
              fontSize: 13, fontWeight: tab === tb.id ? 700 : 400,
              cursor: "pointer", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
            }}>
              <span>{tb.icon}</span>{tb.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "1.8rem 2.5rem", maxWidth: 1100 }}>
        {editChart ? (
          <ChartEditForm chart={chart} clinician={clinician} saving={saving}
            onSave={async (updated) => {
              setSaving(true);
              const { data } = await upsertChart(updated);
              if (data) { setChart(data); setEditChart(false); if (isNew) onBack(); }
              setSaving(false);
            }}
            onCancel={() => { setEditChart(false); if (isNew) onBack(); }}
          />
        ) : tab === "overview" ? (
          <OverviewTab chart={chart} notes={notes} meds={meds} appts={appts} />
        ) : tab === "intake" ? (
          <EHRClinicalIntake chart={chart} clinician={clinician} />
        ) : tab === "notes" ? (
          <NotesTab notes={notes} chart={chart} clinician={clinician}
            showForm={showNoteForm} editingNote={editingNote}
            onNew={() => { setEditingNote(null); setShowNoteForm(true); }}
            onEdit={(n) => { setEditingNote(n); setShowNoteForm(true); }}
            onSaved={async (noteData) => {
              const { data } = await upsertNote({ ...noteData, chart_id: chart.id, clinician_id: clinician.user_id, clinician_name: `${clinician.full_name}, ${clinician.title}` });
              if (data) setNotes(prev => { const idx = prev.findIndex(n => n.id === data.id); return idx >= 0 ? prev.map(n => n.id === data.id ? data : n) : [data, ...prev]; });
              setShowNoteForm(false); setEditingNote(null);
            }}
            onSign={async (id) => { const { data } = await signNote(id); if (data) setNotes(prev => prev.map(n => n.id === id ? data : n)); }}
            onDelete={async (id) => { await deleteNote(id); setNotes(prev => prev.filter(n => n.id !== id)); }}
            onClose={() => { setShowNoteForm(false); setEditingNote(null); }}
          />
        ) : tab === "medications" ? (
          <MedicationsTab meds={meds} chart={chart} clinician={clinician}
            showForm={showMedForm} editingMed={editingMed}
            onNew={() => { setEditingMed(null); setShowMedForm(true); }}
            onEdit={(m) => { setEditingMed(m); setShowMedForm(true); }}
            onSaved={async (medData) => {
              const { data } = await upsertMedication({ ...medData, chart_id: chart.id });
              if (data) setMeds(prev => { const idx = prev.findIndex(m => m.id === data.id); return idx >= 0 ? prev.map(m => m.id === data.id ? data : m) : [data, ...prev]; });
              setShowMedForm(false); setEditingMed(null);
            }}
            onDelete={async (id) => { await deleteMedication(id); setMeds(prev => prev.filter(m => m.id !== id)); }}
            onClose={() => { setShowMedForm(false); setEditingMed(null); }}
          />
        ) : tab === "appointments" ? (
          <AppointmentsTab appts={appts} />
        ) : tab === "messages" ? (
          <MessagesTab messages={messages} chart={chart} clinician={clinician}
            showForm={showMsgForm}
            onNew={() => setShowMsgForm(true)}
            onSent={async (subject, body, threadId) => {
              const { data } = await sendClinicianMessage(chart.patient_id, subject, body, threadId);
              if (data) setMessages(prev => [data, ...prev]);
              setShowMsgForm(false);
            }}
            onClose={() => setShowMsgForm(false)}
          />
        ) : tab === "documents" ? (
          <DocumentsTab docs={docs} />
        ) : tab === "scribe" ? (
          <EHRScribeNotes patientId={chart.patient_id} patientChartId={chart.id} />
        ) : tab === "billing" ? (
          <EHRBilling patientId={chart.patient_id} chartId={chart.id} clinician={clinician} />
        ) : tab === "ai" ? (
          <EHRClinicalAI
            chart={chart}
            notes={notes}
            meds={meds}
            appts={appts}
            clinician={clinician}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Chart Edit Form ────────────────────────────────────────────────────────────
function ChartEditForm({ chart, clinician, saving, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: chart?.id, patient_id: chart?.patient_id,
    mrn: chart?.mrn ?? "", full_name: chart?.full_name ?? "",
    date_of_birth: chart?.date_of_birth ?? "", gender: chart?.gender ?? "",
    pronouns: chart?.pronouns ?? "", phone: chart?.phone ?? "", address: chart?.address ?? "",
    emergency_contact_name: chart?.emergency_contact_name ?? "",
    emergency_contact_phone: chart?.emergency_contact_phone ?? "",
    insurance_provider: chart?.insurance_provider ?? "",
    insurance_member_id: chart?.insurance_member_id ?? "",
    insurance_group: chart?.insurance_group ?? "",
    primary_diagnosis: chart?.primary_diagnosis ?? "",
    primary_diagnosis_label: chart?.primary_diagnosis_label ?? "",
    allergies: chart?.allergies ?? "", pharmacy: chart?.pharmacy ?? "",
    referral_source: chart?.referral_source ?? "", intake_date: chart?.intake_date ?? "",
    status: chart?.status ?? "active", created_by: chart?.created_by ?? clinician?.user_id,
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>{form.id ? "Edit Patient Chart" : "New Patient Chart"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <EhrBtn variant="secondary" onClick={onCancel} type="button">Cancel</EhrBtn>
          <EhrBtn type="submit" disabled={saving}>{saving ? "Saving…" : "Save Chart"}</EhrBtn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <EhrCard style={{ gridColumn: "1 / -1" }} glow="var(--ehr-accent)">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-accent)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Demographics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <EhrInput label="Full Name" value={form.full_name} onChange={set("full_name")} required />
            <EhrInput label="Date of Birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
            <EhrInput label="MRN" value={form.mrn} onChange={set("mrn")} placeholder="MSW-XXXXXX" />
            <EhrSelect label="Gender" value={form.gender} onChange={set("gender")} options={[
              { value: "", label: "Select…" }, { value: "Male", label: "Male" },
              { value: "Female", label: "Female" }, { value: "Non-binary", label: "Non-binary" },
              { value: "Transgender Male", label: "Transgender Male" },
              { value: "Transgender Female", label: "Transgender Female" },
              { value: "Other", label: "Other" }, { value: "Prefer not to say", label: "Prefer not to say" },
            ]} />
            <EhrInput label="Pronouns" value={form.pronouns} onChange={set("pronouns")} placeholder="e.g. she/her" />
            <EhrInput label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
            <EhrInput label="Address" value={form.address} onChange={set("address")} style={{ gridColumn: "1 / -1" }} />
          </div>
        </EhrCard>

        <EhrCard>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-accent)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Contact</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <EhrInput label="Name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
            <EhrInput label="Phone" type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
          </div>
        </EhrCard>

        <EhrCard>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-accent)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Insurance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <EhrInput label="Provider" value={form.insurance_provider} onChange={set("insurance_provider")} />
            <EhrInput label="Member ID" value={form.insurance_member_id} onChange={set("insurance_member_id")} />
            <EhrInput label="Group #" value={form.insurance_group} onChange={set("insurance_group")} />
          </div>
        </EhrCard>

        <EhrCard style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-accent)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Clinical</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <ICD10Picker
                label="Primary Diagnosis (ICD-10)"
                value={form.primary_diagnosis ? { code: form.primary_diagnosis, label: form.primary_diagnosis_label } : null}
                onChange={(item) => setForm(f => ({ ...f, primary_diagnosis: item?.code ?? "", primary_diagnosis_label: item?.label ?? "" }))}
              />
            </div>
            <EhrInput label="Allergies" value={form.allergies} onChange={set("allergies")} placeholder="NKA or list" />
            <EhrInput label="Pharmacy" value={form.pharmacy} onChange={set("pharmacy")} />
            <EhrInput label="Referral Source" value={form.referral_source} onChange={set("referral_source")} />
            <EhrInput label="Intake Date" type="date" value={form.intake_date} onChange={set("intake_date")} />
            <EhrSelect label="Status" value={form.status} onChange={set("status")} options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "discharged", label: "Discharged" },
            ]} />
          </div>
        </EhrCard>
      </div>
    </form>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ chart, notes, meds, appts }) {
  const patientAge = age(chart?.date_of_birth);
  const activeMeds = meds.filter(m => m.status === "active");
  const recentNote = notes[0];
  const nextAppt   = appts.find(a => a.status === "upcoming" && a.scheduled_at > new Date().toISOString());

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <EhrCard>
        <SectionHeader title="Patient Demographics" />
        {[
          ["DOB",      chart.date_of_birth ? `${formatDate(chart.date_of_birth)} (${patientAge} yrs)` : "—"],
          ["Gender",   chart.gender || "—"],
          ["Pronouns", chart.pronouns || "—"],
          ["Phone",    chart.phone || "—"],
          ["Address",  chart.address || "—"],
          ["Intake",   formatDate(chart.intake_date)],
          ["Referral", chart.referral_source || "—"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "var(--ehr-muted2)", width: 90, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "var(--ehr-text)" }}>{val}</span>
          </div>
        ))}
      </EhrCard>

      <EhrCard>
        <SectionHeader title="Clinical Summary" />
        {[
          ["Primary Dx", chart.primary_diagnosis ? `${chart.primary_diagnosis} — ${chart.primary_diagnosis_label}` : "—"],
          ["Allergies",  chart.allergies || "—"],
          ["Pharmacy",   chart.pharmacy  || "—"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "var(--ehr-muted2)", width: 90, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "var(--ehr-text)" }}>{val}</span>
          </div>
        ))}
        {(chart.secondary_diagnoses ?? []).length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginBottom: 4 }}>Secondary Diagnoses</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {chart.secondary_diagnoses.map(d => <EhrBadge key={d.code} color="purple">{d.code}</EhrBadge>)}
            </div>
          </div>
        )}
      </EhrCard>

      <EhrCard>
        <SectionHeader title="Insurance & Contact" />
        {[
          ["Insurer",      chart.insurance_provider   || "—"],
          ["Member ID",    chart.insurance_member_id  || "—"],
          ["Group #",      chart.insurance_group      || "—"],
          ["Emerg. Name",  chart.emergency_contact_name  || "—"],
          ["Emerg. Phone", chart.emergency_contact_phone || "—"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "var(--ehr-muted2)", width: 100, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "var(--ehr-text)" }}>{val}</span>
          </div>
        ))}
      </EhrCard>

      <EhrCard>
        <SectionHeader title="At a Glance" />
        {[
          { label: "Active Medications", color: "var(--ehr-accent)", content: activeMeds.length === 0 ? "None on file" : activeMeds.slice(0, 3).map(m => `${m.medication} ${m.dosage} — ${m.frequency}`).join(", ") },
          { label: "Most Recent Note",   color: "var(--ehr-teal)",   content: recentNote ? `${formatDate(recentNote.note_date)} — ${recentNote.note_type}` : "No notes yet" },
          { label: "Next Appointment",   color: "var(--ehr-gold)",   content: nextAppt ? formatDateTime(nextAppt.scheduled_at) : "None scheduled" },
        ].map(item => (
          <div key={item.label} style={{ background: `${item.color}10`, borderRadius: 10, padding: "0.8rem", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--ehr-muted2)", marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: "var(--ehr-text)" }}>{item.content}</div>
          </div>
        ))}
      </EhrCard>
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────
function NotesTab({ notes, chart, clinician, showForm, editingNote, onNew, onEdit, onSaved, onSign, onDelete, onClose }) {
  if (showForm) return <NoteForm note={editingNote} chart={chart} clinician={clinician} onSaved={onSaved} onCancel={onClose} />;
  return (
    <div>
      <SectionHeader title={`Clinical Notes (${notes.length})`} action={<EhrBtn small onClick={onNew}>+ New Note</EhrBtn>} />
      {notes.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No clinical notes yet.</div>
        </EhrCard>
      ) : notes.map(n => (
        <NoteCard key={n.id} note={n} onEdit={() => onEdit(n)} onSign={() => onSign(n.id)} onDelete={() => { if (window.confirm("Delete this note?")) onDelete(n.id); }} />
      ))}
    </div>
  );
}

function NoteCard({ note, onEdit, onSign, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const TYPE_LABEL = { intake: "Intake Eval", progress: "Progress Note", discharge: "Discharge", phone: "Phone Contact" };
  return (
    <EhrCard style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>{formatDate(note.note_date)}</span>
            <EhrBadge color="purple">{TYPE_LABEL[note.note_type] ?? note.note_type}</EhrBadge>
            {note.is_signed && <EhrBadge color="green">✓ Signed</EhrBadge>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted2)" }}>{note.clinician_name}</div>
          {!expanded && note.presenting_concerns && (
            <div style={{ fontSize: 13, color: "var(--ehr-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
              {note.presenting_concerns}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {!note.is_signed && <EhrBtn small variant="green" onClick={onSign}>Sign</EhrBtn>}
          {!note.is_signed && <EhrBtn small variant="secondary" onClick={onEdit}>Edit</EhrBtn>}
          {!note.is_signed && <EhrBtn small variant="danger" onClick={onDelete}>Delete</EhrBtn>}
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: "1rem" }}>
          <Divider />
          {[
            ["Presenting Concerns", note.presenting_concerns],
            ["Subjective",  note.subjective],
            ["Objective",   note.objective],
            ["Assessment",  note.assessment],
            ["Plan",        note.plan],
            ["Follow-up",   note.follow_up_instructions],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--ehr-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</div>
            </div>
          ))}
          {note.diagnoses?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Diagnoses</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {note.diagnoses.map(d => <EhrBadge key={d.code} color="purple">{d.code} — {d.label}</EhrBadge>)}
              </div>
            </div>
          )}
          {note.risk_assessment && (
            <div style={{ marginTop: 10, background: `#e05c7a10`, borderRadius: 8, padding: "0.8rem" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-rose)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Risk Assessment</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(note.risk_assessment).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, color: "var(--ehr-muted)" }}>
                    <span style={{ color: "var(--ehr-muted2)" }}>{k.replace(/_/g, " ")}: </span>{v}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </EhrCard>
  );
}

function NoteForm({ note, chart, clinician, onSaved, onCancel }) {
  const [form, setForm] = useState({
    id: note?.id, note_date: note?.note_date ?? new Date().toISOString().slice(0, 10),
    note_type: note?.note_type ?? "progress",
    presenting_concerns: note?.presenting_concerns ?? "",
    subjective: note?.subjective ?? "", objective: note?.objective ?? "",
    assessment: note?.assessment ?? "", plan: note?.plan ?? "",
    follow_up_instructions: note?.follow_up_instructions ?? "",
    follow_up_date: note?.follow_up_date ?? "",
    diagnoses: note?.diagnoses ?? [],
    cpt_codes: note?.cpt_codes ?? [],
    risk_assessment: note?.risk_assessment ?? { suicidal_ideation: "", homicidal_ideation: "", self_harm: "", substance_use: "", protective_factors: "" },
  });
  const [saving, setSaving] = useState(false);
  const [icdSearch, setIcdSearch] = useState(null);
  const [cptWarn, setCptWarn] = useState(false);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setRisk = (key) => (e) => setForm(f => ({ ...f, risk_assessment: { ...f.risk_assessment, [key]: e.target.value } }));

  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); if (form.cpt_codes.length === 0) setCptWarn(true); await onSaved(form); setSaving(false); };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>{note ? "Edit Note" : "New Clinical Note"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <EhrBtn variant="secondary" onClick={onCancel} type="button">Cancel</EhrBtn>
          <EhrBtn type="submit" disabled={saving}>{saving ? "Saving…" : "Save Note"}</EhrBtn>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EhrInput label="Note Date" type="date" value={form.note_date} onChange={set("note_date")} required />
          <EhrSelect label="Note Type" value={form.note_type} onChange={set("note_type")} options={[
            { value: "intake", label: "Intake Evaluation" }, { value: "progress", label: "Progress Note" },
            { value: "discharge", label: "Discharge Summary" }, { value: "phone", label: "Phone Contact" },
          ]} />
        </div>
        <EhrInput label="Presenting Concerns" value={form.presenting_concerns} onChange={set("presenting_concerns")} rows={3} placeholder="Chief complaint and presenting concerns…" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EhrInput label="Subjective (S)" value={form.subjective} onChange={set("subjective")} rows={4} placeholder="Patient's report, symptoms, mood…" />
          <EhrInput label="Objective (O)"  value={form.objective}  onChange={set("objective")}  rows={4} placeholder="MSE, observations, vitals…" />
          <EhrInput label="Assessment (A)" value={form.assessment} onChange={set("assessment")} rows={4} placeholder="Clinical impressions, diagnoses…" />
          <EhrInput label="Plan (P)"       value={form.plan}       onChange={set("plan")}       rows={4} placeholder="Interventions, medications, referrals…" />
        </div>
        <EhrCard style={{ padding: "1rem" }}>
          <SectionHeader title="Note Diagnoses (ICD-10)" action={<EhrBtn small variant="secondary" type="button" onClick={() => setIcdSearch({})}>+ Add</EhrBtn>} />          {icdSearch !== null && (
            <div style={{ marginBottom: 10 }}>
              <ICD10Picker label="" value={icdSearch} onChange={(item) => { if (item) setForm(f => ({ ...f, diagnoses: [...(f.diagnoses ?? []).filter(d => d.code !== item.code), item] })); setIcdSearch(null); }} />
            </div>
          )}
          {(form.diagnoses?.length === 0) && <div style={{ fontSize: 13, color: "var(--ehr-muted2)" }}>No diagnoses added</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {form.diagnoses?.map(d => (
              <span key={d.code} style={{ display: "flex", alignItems: "center", gap: 4, background: `#3b5bdb15`, border: `1px solid #3b5bdb30`, borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "var(--ehr-accent)" }}>
                {d.code} — {d.label}
                <button type="button" onClick={() => setForm(f => ({ ...f, diagnoses: f.diagnoses.filter(x => x.code !== d.code) }))} style={{ background: "transparent", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
              </span>
            ))}
          </div>
        </EhrCard>
        <EhrCard style={{ padding: "1rem" }}>
          <div style={{ marginBottom: 8 }}>
            <CptPicker
              value={form.cpt_codes}
              onChange={codes => setForm(f => ({ ...f, cpt_codes: codes }))}
            />
          </div>
          {cptWarn && form.cpt_codes.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--ehr-gold)", marginTop: 4 }}>
              ⚠️ No CPT codes selected. Consider adding billing codes before saving.
            </div>
          )}
        </EhrCard>
        <EhrCard style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-rose)", marginBottom: "1rem" }}>Risk Assessment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["suicidal_ideation","Suicidal Ideation"],["homicidal_ideation","Homicidal Ideation"],["self_harm","Self-Harm"],["substance_use","Substance Use"],["protective_factors","Protective Factors"]].map(([key, label]) => (
              <EhrInput key={key} label={label} value={form.risk_assessment[key] ?? ""} onChange={setRisk(key)} placeholder="Denied / Present / Details…" />
            ))}
          </div>
        </EhrCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EhrInput label="Follow-up Instructions" value={form.follow_up_instructions} onChange={set("follow_up_instructions")} rows={2} />
          <EhrInput label="Follow-up Date" type="date" value={form.follow_up_date} onChange={set("follow_up_date")} />
        </div>
      </div>
    </form>
  );
}

// ── Medications Tab ───────────────────────────────────────────────────────────
function MedicationsTab({ meds, chart, clinician, showForm, editingMed, onNew, onEdit, onSaved, onDelete, onClose }) {
  if (showForm) return <MedForm med={editingMed} chart={chart} clinician={clinician} onSaved={onSaved} onCancel={onClose} />;
  const active   = meds.filter(m => m.status === "active");
  const inactive = meds.filter(m => m.status !== "active");
  return (
    <div>
      <SectionHeader title={`Medications (${meds.length})`} action={<EhrBtn small onClick={onNew}>+ Add Medication</EhrBtn>} />
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ehr-teal)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Active</div>
          {active.map(m => <MedRow key={m.id} med={m} onEdit={() => onEdit(m)} onDelete={() => { if (window.confirm("Remove medication?")) onDelete(m.id); }} />)}
        </>
      )}
      {inactive.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "1rem 0 8px" }}>Discontinued / On Hold</div>
          {inactive.map(m => <MedRow key={m.id} med={m} onEdit={() => onEdit(m)} onDelete={() => { if (window.confirm("Remove medication?")) onDelete(m.id); }} />)}
        </>
      )}
      {meds.length === 0 && (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💊</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No medications on file.</div>
        </EhrCard>
      )}
    </div>
  );
}

function MedRow({ med, onEdit, onDelete }) {
  return (
    <EhrCard style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ehr-text)" }}>{med.medication}</div>
        <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 3, display: "flex", gap: 10 }}>
          {med.dosage && <span>{med.dosage}</span>}
          {med.frequency && <span>{med.frequency}</span>}
          {med.route && <span>{med.route}</span>}
          {med.refills != null && <span>Refills: {med.refills}</span>}
        </div>
        {med.notes && <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 4 }}>{med.notes}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <StatusBadge status={med.status} />
        <div style={{ fontSize: 11, color: "var(--ehr-muted2)" }}>Since {formatDate(med.prescribed_date)}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <EhrBtn small variant="secondary" onClick={onEdit}>Edit</EhrBtn>
        <EhrBtn small variant="danger" onClick={onDelete}>Remove</EhrBtn>
      </div>
    </EhrCard>
  );
}

function MedForm({ med, chart, clinician, onSaved, onCancel }) {
  const [form, setForm] = useState({
    id: med?.id, medication: med?.medication ?? "", dosage: med?.dosage ?? "",
    frequency: med?.frequency ?? "", route: med?.route ?? "oral",
    prescribed_date: med?.prescribed_date ?? new Date().toISOString().slice(0, 10),
    end_date: med?.end_date ?? "",
    prescriber: med?.prescriber ?? `${clinician?.full_name}, ${clinician?.title}`,
    refills: med?.refills ?? 0, status: med?.status ?? "active", notes: med?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); await onSaved(form); setSaving(false); };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>{med ? "Edit Medication" : "Add Medication"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <EhrBtn variant="secondary" onClick={onCancel} type="button">Cancel</EhrBtn>
          <EhrBtn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</EhrBtn>
        </div>
      </div>
      <EhrCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <EhrInput label="Medication Name" value={form.medication} onChange={set("medication")} required style={{ gridColumn: "1 / -1" }} />
          <EhrInput label="Dosage" value={form.dosage} onChange={set("dosage")} placeholder="e.g. 10mg" />
          <EhrInput label="Frequency" value={form.frequency} onChange={set("frequency")} placeholder="e.g. once daily" />
          <EhrSelect label="Route" value={form.route} onChange={set("route")} options={[
            { value: "oral", label: "Oral" }, { value: "sublingual", label: "Sublingual" },
            { value: "topical", label: "Topical" }, { value: "injection", label: "Injection" },
            { value: "inhaled", label: "Inhaled" }, { value: "other", label: "Other" },
          ]} />
          <EhrInput label="Prescribed Date" type="date" value={form.prescribed_date} onChange={set("prescribed_date")} />
          <EhrInput label="End Date" type="date" value={form.end_date} onChange={set("end_date")} />
          <EhrInput label="Prescriber" value={form.prescriber} onChange={set("prescriber")} />
          <EhrInput label="Refills" type="number" value={form.refills} onChange={set("refills")} />
          <EhrSelect label="Status" value={form.status} onChange={set("status")} options={[
            { value: "active", label: "Active" }, { value: "discontinued", label: "Discontinued" }, { value: "on_hold", label: "On Hold" },
          ]} />
          <EhrInput label="Notes" value={form.notes} onChange={set("notes")} rows={2} style={{ gridColumn: "1 / -1" }} />
        </div>
      </EhrCard>
    </form>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────────────────
function AppointmentsTab({ appts }) {
  return (
    <div>
      <SectionHeader title={`Appointment History (${appts.length})`} />
      {appts.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No appointments on file.</div>
        </EhrCard>
      ) : appts.map(a => (
        <EhrCard key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ehr-text)", display: "flex", alignItems: "center", gap: 6 }}>
                {formatDateTime(a.scheduled_at)}
                {a.appointment_type === "telehealth" && <span title="Telehealth">📹</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 3, display: "flex", gap: 10 }}>
                {a.appointment_type && <span>{a.appointment_type.replace(/_/g, " ")}</span>}
                {a.location && <span>{a.location}</span>}
                {a.provider_name && <span>{a.provider_name}</span>}
              </div>
              {a.reason && <div style={{ fontSize: 13, color: "var(--ehr-muted)", marginTop: 5 }}>{a.reason}</div>}
              {a.notes  && <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 4, fontStyle: "italic" }}>{a.notes}</div>}
              {a.appointment_type === "telehealth" && a.status === "confirmed" && a.telehealth_url && (
                <button
                  onClick={() => window.open(a.telehealth_url, "_blank")}
                  style={{ marginTop: 8, background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
                >
                  📹 Join Video Session
                </button>
              )}
            </div>
            <StatusBadge status={a.status} />
          </div>
        </EhrCard>
      ))}
    </div>
  );
}

// ── Messages Tab ──────────────────────────────────────────────────────────────
function MessagesTab({ messages, chart, clinician, showForm, onNew, onSent, onClose }) {
  const [subj, setSubj]     = useState("");
  const [body, setBody]     = useState("");
  const [sending, setSending] = useState(false);

  if (showForm) {
    const handleSend = async (e) => {
      e.preventDefault(); setSending(true);
      await onSent(subj, body, null);
      setSubj(""); setBody(""); setSending(false);
    };
    return (
      <form onSubmit={handleSend}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>Send Message to Patient</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <EhrBtn variant="secondary" onClick={onClose} type="button">Cancel</EhrBtn>
            <EhrBtn type="submit" disabled={sending || !body.trim()}>{sending ? "Sending…" : "Send Message"}</EhrBtn>
          </div>
        </div>
        <EhrCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <EhrInput label="Subject" value={subj} onChange={e => setSubj(e.target.value)} placeholder="Message subject…" />
            <EhrInput label="Message" value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Write your message…" required />
          </div>
        </EhrCard>
      </form>
    );
  }

  return (
    <div>
      <SectionHeader title={`Messages (${messages.length})`} action={<EhrBtn small onClick={onNew}>+ Send Message</EhrBtn>} />
      {messages.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No messages yet.</div>
        </EhrCard>
      ) : messages.map(m => (
        <EhrCard key={m.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <EhrBadge color={m.sender_role === "clinic" ? "teal" : "purple"}>
                  {m.sender_role === "clinic" ? "Clinic" : "Patient"}
                </EhrBadge>
                {m.subject && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ehr-text)" }}>{m.subject}</span>}
              </div>
              <div style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.6 }}>{m.body}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ehr-muted2)", flexShrink: 0 }}>{formatDateTime(m.created_at)}</div>
          </div>
        </EhrCard>
      ))}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ docs }) {
  return (
    <div>
      <SectionHeader title={`Documents (${docs.length})`} />
      {docs.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No documents on file.</div>
        </EhrCard>
      ) : docs.map(d => (
        <EhrCard key={d.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 24 }}>📄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ehr-text)" }}>{d.name}</div>
            <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>
              {d.doc_type && <span style={{ marginRight: 8 }}>{d.doc_type}</span>}
              {formatDate(d.created_at)}
            </div>
            {d.notes && <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 4 }}>{d.notes}</div>}
          </div>
          {d.file_url && (
            <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <EhrBtn small variant="secondary">View</EhrBtn>
            </a>
          )}
        </EhrCard>
      ))}
    </div>
  );
}
