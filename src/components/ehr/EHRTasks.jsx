import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, SectionHeader, Spinner } from "./EHRUI";
import { getTasks, upsertTask, deleteTask } from "../../lib/ehrDb";

const PRIORITY_COLOR = { urgent: "rose", high: "gold", normal: "purple", low: "muted" };

function isOverdue(task) {
  return task.status === "open" && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
}

const EMPTY_FORM = { title: "", notes: "", due_date: "", priority: "normal", patient_name: "" };

export default function EHRTasks({ clinician }) {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getTasks();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load tasks.");
    else setTasks(data ?? []);
    setLoading(false);
  }

  const filtered = tasks.filter(t => tab === "all" || t.status === tab);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title ?? "",
      notes: task.notes ?? "",
      due_date: task.due_date ?? "",
      priority: task.priority ?? "normal",
      patient_name: task.patient_name ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      patient_name: form.patient_name.trim() || null,
      status: editing?.status ?? "open",
      created_by: clinician.user_id,
    };
    const { data, error: err } = await upsertTask(payload);
    setSaving(false);
    if (err) { setError(typeof err === "string" ? err : err.message ?? "Save failed."); return; }
    if (data) {
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === data.id);
        return idx >= 0 ? prev.map(t => t.id === data.id ? data : t) : [data, ...prev];
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  async function toggleDone(task) {
    const newStatus = task.status === "done" ? "open" : "done";
    const { data, error: err } = await upsertTask({ ...task, status: newStatus });
    if (!err && data) setTasks(prev => prev.map(t => t.id === data.id ? data : t));
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this task?")) return;
    const { error: err } = await deleteTask(id);
    if (!err) setTasks(prev => prev.filter(t => t.id !== id));
    else setError(typeof err === "string" ? err : err.message ?? "Delete failed.");
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 900, margin: "0 auto" }}>
      <SectionHeader
        title="Tasks & Reminders"
        subtitle="Manage clinician tasks and follow-ups"
        action={<EhrBtn small onClick={openNew}>+ New Task</EhrBtn>}
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.2rem" }}>
        {["all", "open", "done"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
            border: tab === t ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid var(--ehr-border)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? "var(--ehr-accent)" : "var(--ehr-muted)", cursor: "pointer", fontFamily: "inherit",
            textTransform: "capitalize",
          }}>
            {t} {t !== "all" && <span style={{ opacity: 0.7 }}>({tasks.filter(x => x.status === t).length})</span>}
          </button>
        ))}
      </div>

      {/* New/Edit form */}
      {showForm && (
        <EhrCard style={{ marginBottom: "1.2rem" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>
                {editing ? "Edit Task" : "New Task"}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <EhrBtn variant="secondary" small type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</EhrBtn>
                <EhrBtn small type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</EhrBtn>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <EhrInput label="Title" value={form.title} onChange={set("title")} placeholder="Task title…" required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <EhrInput label="Due Date" type="date" value={form.due_date} onChange={set("due_date")} />
                <EhrSelect label="Priority" value={form.priority} onChange={set("priority")} options={[
                  { value: "low", label: "Low" },
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]} />
                <EhrInput label="Patient (optional)" value={form.patient_name} onChange={set("patient_name")} placeholder="Patient name…" />
              </div>
              <EhrInput label="Notes" value={form.notes} onChange={set("notes")} rows={3} placeholder="Additional notes…" />
            </div>
          </form>
        </EhrCard>
      )}

      {/* Task list */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>
            {tab === "done" ? "No completed tasks." : "No tasks. You're all caught up!"}
          </div>
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(task => (
            <EhrCard key={task.id} style={{
              opacity: task.status === "done" ? 0.65 : 1,
              borderLeft: `4px solid var(--ehr-${PRIORITY_COLOR[task.priority] ?? "muted"})`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button onClick={() => toggleDone(task)} style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: task.status === "done" ? "var(--ehr-green)" : "transparent",
                  border: `2px solid ${task.status === "done" ? "var(--ehr-green)" : "var(--ehr-border2)"}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 12,
                }}>
                  {task.status === "done" ? "✓" : ""}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 600, color: "var(--ehr-text)",
                      textDecoration: task.status === "done" ? "line-through" : "none",
                    }}>{task.title}</span>
                    <EhrBadge color={PRIORITY_COLOR[task.priority] ?? "muted"}>{task.priority}</EhrBadge>
                    {task.status === "done" && <EhrBadge color="green">done</EhrBadge>}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ehr-muted2)" }}>
                    {task.due_date && (
                      <span style={{ color: isOverdue(task) ? "var(--ehr-rose)" : "var(--ehr-muted2)", fontWeight: isOverdue(task) ? 700 : 400 }}>
                        {isOverdue(task) ? "⚠️ " : "📅 "}Due {task.due_date}
                      </span>
                    )}
                    {task.patient_name && <span>👤 {task.patient_name}</span>}
                  </div>
                  {task.notes && (
                    <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 4, fontStyle: "italic" }}>{task.notes}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <EhrBtn variant="secondary" small onClick={() => openEdit(task)}>✏️</EhrBtn>
                  <EhrBtn variant="danger" small onClick={() => handleDelete(task.id)}>🗑</EhrBtn>
                </div>
              </div>
            </EhrCard>
          ))}
        </div>
      )}
    </div>
  );
}
