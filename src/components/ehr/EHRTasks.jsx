import { useState, useEffect, useMemo } from "react";
import { EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, SectionHeader, Spinner } from "./EHRUI";
import { getTasks, upsertTask, deleteTask, getChartsForPicker } from "../../lib/ehrDb";

const PRIORITY_COLOR = { urgent: "rose", high: "gold", normal: "purple", low: "muted" };

const QUICK_TEMPLATES = [
  { title: "Review lab results", priority: "high", notes: "Check portal/EHR for new labs and contact patient if needed." },
  { title: "Sign visit note", priority: "normal", notes: "Finalize and sign SOAP note from last session." },
  { title: "Prior authorization follow-up", priority: "high", notes: "Check insurance portal for PA status." },
  { title: "Return patient call", priority: "normal", notes: "Patient left voicemail — return call during business hours." },
  { title: "Refill request review", priority: "normal", notes: "Review medication refill request and respond in portal." },
  { title: "Send portal message", priority: "low", notes: "Follow up with patient via secure portal message." },
];

function isOverdue(task) {
  return task.status === "open" && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
}

const EMPTY_FORM = { title: "", notes: "", due_date: "", priority: "normal", chart_id: "" };

export default function EHRTasks({ clinician, onOpenChart }) {
  const [tasks, setTasks] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const chartMap = useMemo(() => {
    const m = {};
    for (const c of charts) m[c.id] = c;
    return m;
  }, [charts]);

  useEffect(() => {
    load();
    getChartsForPicker().then(({ data }) => setCharts(data ?? []));
  }, []);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getTasks();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load tasks.");
    else setTasks(data ?? []);
    setLoading(false);
  }

  function chartLabel(chartId) {
    const c = chartMap[chartId];
    if (!c) return null;
    return c.display_name || c.full_name || c.mrn || "Patient";
  }

  const openCount = tasks.filter((t) => t.status === "open").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter(isOverdue).length;

  const filtered = useMemo(() => {
    let list = tasks;
    if (tab === "open") list = list.filter((t) => t.status === "open");
    else if (tab === "done") list = list.filter((t) => t.status === "done");
    else if (tab === "overdue") list = list.filter(isOverdue);
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      if (isOverdue(a) && !isOverdue(b)) return -1;
      if (!isOverdue(a) && isOverdue(b)) return 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [tasks, tab]);

  function openNew(template) {
    setEditing(null);
    setForm(template ? { ...EMPTY_FORM, ...template } : EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title ?? "",
      notes: task.notes ?? "",
      due_date: task.due_date ?? "",
      priority: task.priority ?? "normal",
      chart_id: task.chart_id ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const chart = form.chart_id ? chartMap[form.chart_id] : null;
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      chart_id: form.chart_id || null,
      patient_id: chart?.patient_id || null,
      status: editing?.status ?? "open",
      created_by: editing?.created_by ?? clinician.user_id,
    };
    const { data, error: err } = await upsertTask(payload);
    setSaving(false);
    if (err) { setError(typeof err === "string" ? err : err.message ?? "Save failed."); return; }
    if (data) {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === data.id);
        return idx >= 0 ? prev.map((t) => (t.id === data.id ? data : t)) : [data, ...prev];
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  async function toggleDone(task) {
    const newStatus = task.status === "done" ? "open" : "done";
    const { data, error: err } = await upsertTask({ ...task, status: newStatus });
    if (!err && data) setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this task?")) return;
    const { error: err } = await deleteTask(id);
    if (!err) setTasks((prev) => prev.filter((t) => t.id !== id));
    else setError(typeof err === "string" ? err : err.message ?? "Delete failed.");
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "1.5rem 2rem 2rem", maxWidth: 920, margin: "0 auto" }}>
      <SectionHeader
        title="Tasks & Reminders"
        subtitle="Your clinic to-do list — follow-ups, chart work, and patient callbacks in one place"
        action={<EhrBtn small onClick={() => openNew()}>+ New Task</EhrBtn>}
      />

      {showHelp && (
        <EhrCard style={{ marginBottom: "1.2rem", background: "color-mix(in srgb,var(--ehr-accent) 6%,var(--ehr-card))", border: "1px solid color-mix(in srgb,var(--ehr-accent) 20%,transparent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 8 }}>
                What is this for?
              </div>
              <p style={{ fontSize: 13, color: "var(--ehr-muted)", lineHeight: 1.7, margin: "0 0 10px" }}>
                This is your <strong>internal clinic checklist</strong> — not patient-facing. Use it when something needs to happen later:
                sign a note, call a patient back, check prior auth, review labs, or send a portal message.
                Tasks are shared with all authorized staff in the EHR.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--ehr-muted2)" }}>
                <span>📋 Chart work</span>
                <span>·</span>
                <span>📞 Callbacks</span>
                <span>·</span>
                <span>💊 Refills &amp; PA</span>
                <span>·</span>
                <span>🔬 Labs</span>
                <span>·</span>
                <span>💬 Portal follow-ups</span>
              </div>
            </div>
            <button type="button" onClick={() => setShowHelp(false)} style={{ background: "none", border: "none", color: "var(--ehr-muted2)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }} aria-label="Dismiss">×</button>
          </div>
        </EhrCard>
      )}

      {overdueCount > 0 && tab !== "done" && (
        <div style={{
          marginBottom: "1rem",
          padding: "10px 14px",
          borderRadius: 10,
          background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)",
          border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)",
          fontSize: 13,
          color: "var(--ehr-rose)",
          fontWeight: 600,
        }}>
          ⚠️ {overdueCount} overdue task{overdueCount === 1 ? "" : "s"} — review the Overdue tab
        </div>
      )}

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { id: "open", label: "Open", count: openCount },
          { id: "overdue", label: "Overdue", count: overdueCount },
          { id: "done", label: "Done", count: doneCount },
          { id: "all", label: "All", count: tasks.length },
        ].map(({ id, label, count }) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            background: tab === id ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
            border: tab === id ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid var(--ehr-border)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: tab === id ? 700 : 400,
            color: tab === id ? "var(--ehr-accent)" : "var(--ehr-muted)", cursor: "pointer", fontFamily: "inherit",
          }}>
            {label} <span style={{ opacity: 0.75 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Quick add */}
      {!showForm && (
        <div style={{ marginBottom: "1.2rem" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Quick add
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => openNew(t)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--ehr-border)",
                  background: "var(--ehr-card)",
                  fontSize: 12,
                  color: "var(--ehr-text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <EhrBtn small type="submit" disabled={saving}>{saving ? "Saving…" : "Save Task"}</EhrBtn>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <EhrInput label="What needs to be done?" value={form.title} onChange={set("title")} placeholder="e.g. Call John back about refill" required />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <EhrInput label="Due date" type="date" value={form.due_date} onChange={set("due_date")} />
                <EhrSelect label="Priority" value={form.priority} onChange={set("priority")} options={[
                  { value: "low", label: "Low" },
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]} />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Patient (optional)
                  </label>
                  <select
                    value={form.chart_id}
                    onChange={set("chart_id")}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--ehr-border2)", background: "var(--ehr-card)", fontSize: 14, fontFamily: "inherit" }}
                  >
                    <option value="">No specific patient</option>
                    {charts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || c.full_name || c.mrn}{c.mrn ? ` (${c.mrn})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <EhrInput label="Notes" value={form.notes} onChange={set("notes")} rows={3} placeholder="Details, phone number, insurance info…" />
            </div>
          </form>
        </EhrCard>
      )}

      {/* Task list */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{tab === "done" ? "✅" : "📋"}</div>
          <div style={{ color: "var(--ehr-text)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {tab === "done" ? "No completed tasks yet" : tab === "overdue" ? "Nothing overdue — nice work" : "No open tasks"}
          </div>
          <div style={{ color: "var(--ehr-muted)", fontSize: 13, lineHeight: 1.65, maxWidth: 400, margin: "0 auto 1rem" }}>
            {tab === "open" || tab === "all"
              ? "When you finish a visit and think “I need to call them tomorrow” or “sign that note this week” — add it here so it doesn’t slip through the cracks."
              : "Completed tasks appear here when you check them off."}
          </div>
          {(tab === "open" || tab === "all") && !showForm && (
            <EhrBtn small onClick={() => openNew()}>+ Add your first task</EhrBtn>
          )}
        </EhrCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task) => {
            const patientLabel = task.chart_id ? chartLabel(task.chart_id) : null;
            const overdue = isOverdue(task);
            return (
              <EhrCard key={task.id} style={{
                opacity: task.status === "done" ? 0.65 : 1,
                borderLeft: `4px solid var(--ehr-${PRIORITY_COLOR[task.priority] ?? "muted"})`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <button type="button" onClick={() => toggleDone(task)} title={task.status === "done" ? "Mark open" : "Mark done"} style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 2,
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
                      {overdue && <EhrBadge color="rose">overdue</EhrBadge>}
                      {task.status === "done" && <EhrBadge color="green">done</EhrBadge>}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ehr-muted2)", alignItems: "center" }}>
                      {task.due_date && (
                        <span style={{ color: overdue ? "var(--ehr-rose)" : "var(--ehr-muted2)", fontWeight: overdue ? 700 : 400 }}>
                          {overdue ? "⚠️ " : "📅 "}Due {task.due_date}
                        </span>
                      )}
                      {patientLabel && (
                        <>
                          <span>👤 {patientLabel}</span>
                          {task.chart_id && onOpenChart && (
                            <button type="button" onClick={() => onOpenChart(task.chart_id)} style={{ background: "none", border: "none", color: "var(--ehr-accent)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                              Open chart →
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {task.notes && (
                      <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 6, lineHeight: 1.55 }}>{task.notes}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <EhrBtn variant="secondary" small onClick={() => openEdit(task)}>Edit</EhrBtn>
                    <EhrBtn variant="danger" small onClick={() => handleDelete(task.id)}>Delete</EhrBtn>
                  </div>
                </div>
              </EhrCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
