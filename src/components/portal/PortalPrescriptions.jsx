import { useState, useEffect } from "react";
import {
  getPrescriptions,
  addPatientReportedMedication,
  updatePatientReportedMedication,
  deletePatientReportedMedication,
} from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, Btn, Input, T } from "./PortalUI";

const EMPTY_FORM = {
  medication: "",
  dosage: "",
  frequency: "",
  prescribed_date: "",
  prescriber: "",
  notes: "",
  status: "active",
};

function isPatientReported(p) {
  return p.source === "patient_reported";
}

function setField(setForm, key) {
  return (val) => setForm((f) => ({ ...f, [key]: val }));
}

function MedForm({ form, setForm, onSubmit, onCancel, saving, submitLabel }) {
  return (
    <Card style={{ marginBottom: "1rem", background: "#f8fafc" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <Input label="Medication name *" value={form.medication} onChange={setField(setForm, "medication")} placeholder="e.g. Sertraline, Lisinopril" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Dosage" value={form.dosage} onChange={setField(setForm, "dosage")} placeholder="e.g. 50 mg" />
          <Input label="How often" value={form.frequency} onChange={setField(setForm, "frequency")} placeholder="e.g. Once daily" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Prescribing doctor (optional)" value={form.prescriber} onChange={setField(setForm, "prescriber")} placeholder="Another provider's name" />
          <Input label="Started / prescribed date" type="date" value={form.prescribed_date} onChange={setField(setForm, "prescribed_date")} />
        </div>
        <Input label="Notes (optional)" value={form.notes} onChange={setField(setForm, "notes")} placeholder="Pharmacy, reason, or anything your care team should know" rows={2} />
        <Input
          label="Status"
          value={form.status}
          onChange={setField(setForm, "status")}
          options={["active", "discontinued"]}
        />
        <div style={{ fontSize: 11, color: T.muted, marginTop: -4 }}>
          {form.status === "active" ? "Currently taking this medication" : "Stopped / past medication"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={onSubmit} disabled={saving || !form.medication.trim()}>{saving ? "Saving…" : submitLabel}</Btn>
          {onCancel && <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>}
        </div>
      </div>
    </Card>
  );
}

function ReportedMedCard({ med, fmt, onEdit, onDelete, deleting }) {
  return (
    <Card key={med.id} style={{ marginBottom: "0.75rem" }} accent="#6366f1">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{med.medication}</div>
              <Badge status={med.status} custom={med.status === "active" ? { bg: "#eef2ff", color: "#4338ca", label: "You added" } : undefined} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 6 }}>
            {med.dosage && <div style={{ fontSize: 12, color: T.muted }}>Dosage: <strong style={{ color: T.text }}>{med.dosage}</strong></div>}
            {med.frequency && <div style={{ fontSize: 12, color: T.muted }}>Frequency: <strong style={{ color: T.text }}>{med.frequency}</strong></div>}
            {med.prescribed_date && <div style={{ fontSize: 12, color: T.muted }}>Date: {fmt(med.prescribed_date)}</div>}
            {med.prescriber && <div style={{ fontSize: 12, color: T.muted }}>Prescriber: {med.prescriber}</div>}
          </div>
          {med.notes && <div style={{ marginTop: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: T.muted }}>{med.notes}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant="secondary" onClick={() => onEdit(med)}>Edit</Btn>
          <Btn small variant="secondary" onClick={() => onDelete(med.id)} disabled={deleting}>Remove</Btn>
        </div>
      </div>
    </Card>
  );
}

export default function PortalPrescriptions({ userId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    if (!userId) return;
    setLoading(true);
    getPrescriptions(userId)
      .then((data) => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userId]);

  const fmt = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const clinicMeds = prescriptions.filter((p) => !isPatientReported(p));
  const reportedMeds = prescriptions.filter(isPatientReported);
  const clinicActive = clinicMeds.filter((p) => p.status === "active");
  const clinicInactive = clinicMeds.filter((p) => p.status !== "active");
  const reportedActive = reportedMeds.filter((p) => p.status === "active");
  const reportedInactive = reportedMeds.filter((p) => p.status !== "active");

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const startEdit = (med) => {
    setForm({
      medication: med.medication || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      prescribed_date: med.prescribed_date || "",
      prescriber: med.prescriber === "Self-reported" ? "" : (med.prescriber || ""),
      notes: med.notes || "",
      status: med.status || "active",
    });
    setEditingId(med.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.medication.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updatePatientReportedMedication(editingId, userId, form);
      } else {
        await addPatientReportedMedication(userId, form);
      }
      resetForm();
      load();
    } catch (e) {
      setError(e.message || "Could not save medication.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this medication from your list?")) return;
    setDeletingId(id);
    try {
      await deletePatientReportedMedication(id, userId);
      if (editingId === id) resetForm();
      load();
    } catch (e) {
      setError(e.message || "Could not remove medication.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 860, margin: "0 auto" }}>
      <PageHeader
        icon="💊"
        label="Medications"
        title="Your Medications"
        subtitle="Prescriptions from MindShift and meds you add from other doctors"
        gradient="linear-gradient(135deg,#f5f3ff,#eff6ff)"
        action={!showForm && (
          <Btn onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); setError(""); }}>
            + Add Medication
          </Btn>
        )}
      />

      <Alert
        type="info"
        icon="ℹ️"
        title="Forgot to mention a medication at intake?"
        subtitle="Add anything you take now or were prescribed elsewhere — your care team will see it here."
      />

      {error && <Alert type="error" icon="⚠️" title={error} />}

      {showForm && (
        <>
          <SectionDivider label={editingId ? "Edit medication" : "Add a medication"} color="#6366f1" />
          <MedForm
            form={form}
            setForm={setForm}
            onSubmit={handleSave}
            onCancel={resetForm}
            saving={saving}
            submitLabel={editingId ? "Save changes" : "Add medication"}
          />
        </>
      )}

      {loading ? (
        <div style={{ color: T.muted, fontSize: 13, padding: "1rem 0" }}>Loading…</div>
      ) : (
        <>
          {(reportedActive.length > 0 || reportedInactive.length > 0) && (
            <>
              <SectionDivider label="Medications You Added" color="#6366f1" />
              {reportedActive.map((p) => (
                <ReportedMedCard key={p.id} med={p} fmt={fmt} onEdit={startEdit} onDelete={handleDelete} deleting={deletingId === p.id} />
              ))}
              {reportedInactive.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: T.muted, margin: "0.5rem 0 0.75rem" }}>Past / stopped</div>
                  {reportedInactive.map((p) => (
                    <ReportedMedCard key={p.id} med={p} fmt={fmt} onEdit={startEdit} onDelete={handleDelete} deleting={deletingId === p.id} />
                  ))}
                </>
              )}
            </>
          )}

          {!showForm && reportedMeds.length === 0 && clinicMeds.length === 0 && (
            <EmptyState
              icon="💊"
              title="No medications on file yet"
              subtitle="Add medications you take from other doctors, or wait for prescriptions from your MindShift care team."
              action={<Btn onClick={() => setShowForm(true)}>+ Add Medication</Btn>}
            />
          )}

          {clinicMeds.length > 0 && (
            <>
              <SectionDivider label="From Your MindShift Care Team" color="#22c55e" />
              {clinicActive.some((p) => p.refills_remaining === 0) && (
                <Alert type="warning" icon="⚠️" title="Refill needed" subtitle="One or more medications have no refills remaining. Contact the clinic." />
              )}
              {clinicActive.map((p) => (
                <Card key={p.id} style={{ marginBottom: "0.75rem" }} accent="#22c55e">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💊</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{p.medication}</div>
                          <Badge status={p.status} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 6 }}>
                        {p.dosage && <div style={{ fontSize: 12, color: T.muted }}>Dosage: <strong style={{ color: T.text }}>{p.dosage}</strong></div>}
                        {p.frequency && <div style={{ fontSize: 12, color: T.muted }}>Frequency: <strong style={{ color: T.text }}>{p.frequency}</strong></div>}
                        <div style={{ fontSize: 12, color: T.muted }}>Prescribed: {fmt(p.prescribed_date)}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{p.prescriber}</div>
                      </div>
                      {p.notes && <div style={{ marginTop: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: T.muted, fontStyle: "italic" }}>{p.notes}</div>}
                    </div>
                    <div style={{ textAlign: "center", minWidth: 70 }}>
                      <div style={{ fontSize: 11, color: T.muted2, marginBottom: 4 }}>Refills</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: p.refills_remaining === 0 ? "#dc2626" : "#166534", lineHeight: 1 }}>{p.refills_remaining}</div>
                    </div>
                  </div>
                </Card>
              ))}
              {clinicInactive.map((p) => (
                <Card key={p.id} style={{ marginBottom: "0.75rem", opacity: 0.7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💊</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{p.medication}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{p.dosage} · {fmt(p.prescribed_date)}</div>
                      </div>
                    </div>
                    <Badge status={p.status} />
                  </div>
                </Card>
              ))}
            </>
          )}

          {!showForm && reportedMeds.length === 0 && clinicMeds.length > 0 && (
            <Card style={{ marginTop: "1rem", background: "#eef2ff", border: "1px solid #c7d2fe" }}>
              <div style={{ fontSize: 13, color: "#3730a3", lineHeight: 1.7 }}>
                Taking other medications too? <button type="button" onClick={() => setShowForm(true)} style={{ background: "none", border: "none", color: "#4338ca", fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Add them here</button> so your care team has the full picture.
              </div>
            </Card>
          )}
        </>
      )}

      <Card style={{ marginTop: "1rem", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.7 }}>
          💊 Need a refill from MindShift? Call <a href="tel:5083061128" style={{ color: "#1d4ed8", fontWeight: 600 }}>(508) 306-1128</a> or send us a message through the portal.
        </div>
      </Card>
    </div>
  );
}
