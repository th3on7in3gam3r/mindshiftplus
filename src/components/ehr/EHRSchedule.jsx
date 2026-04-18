import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrBadge, EhrInput, EhrSelect, SectionHeader, Spinner } from "./EHRUI";
import { getAppointments, updateApptStatus } from "../../lib/clinicApi";
import { supabase } from "../../lib/supabase";

const STATUS_COLOR = { pending: "gold", confirmed: "teal", completed: "green", cancelled: "rose", requested: "purple" };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const EMPTY_FORM = {
  name: "", email: "", phone: "", appointment_type: "therapy",
  scheduled_at: "", location: "Milford, MA", notes: "",
};

export default function EHRSchedule({ clinician }) {
  const [appts, setAppts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [viewMode, setViewMode]   = useState("week"); // week | list
  const [statusFilter, setFilter] = useState("all");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => { load(); }, [weekStart]);

  async function load() {
    setLoading(true);
    try {
      const from = fmtDate(weekStart);
      const to   = fmtDate(addDays(weekStart, viewMode === "week" ? 6 : 90));
      const data = await getAppointments(from + "T00:00:00", to + "T23:59:59");
      setAppts(data ?? []);
    } catch (e) {
      setError(e.message ?? "Failed to load appointments.");
    }
    setLoading(false);
  }

  async function handleStatusChange(id, status) {
    try {
      await updateApptStatus(id, status);
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      setError(e.message ?? "Update failed.");
    }
  }

  async function handleNewAppt(e) {
    e.preventDefault();
    if (!form.name || !form.scheduled_at) return;
    setSaving(true);
    try {
      const { data, error: err } = await supabase.from("appointments").insert({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        appointment_type: form.appointment_type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        location: form.location,
        notes: form.notes || null,
        status: "confirmed",
      }).select().single();
      if (err) throw new Error(err.message);
      if (data) setAppts(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e.message ?? "Failed to create appointment.");
    }
    setSaving(false);
  }

  const filtered = appts.filter(a => statusFilter === "all" || a.status === statusFilter);

  // Week columns
  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1300, margin: "0 auto" }}>
      <SectionHeader
        title="Schedule"
        subtitle="Appointment management"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <EhrBtn variant="secondary" small onClick={() => setWeekStart(getWeekStart(new Date()))}>Today</EhrBtn>
            <EhrBtn small onClick={() => setShowForm(s => !s)}>+ New Appointment</EhrBtn>
          </div>
        }
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* New appointment form */}
      {showForm && (
        <EhrCard style={{ marginBottom: "1.2rem" }}>
          <form onSubmit={handleNewAppt}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>New Appointment</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <EhrBtn variant="secondary" small type="button" onClick={() => setShowForm(false)}>Cancel</EhrBtn>
                <EhrBtn small type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</EhrBtn>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <EhrInput label="Patient Name" value={form.name} onChange={set("name")} required placeholder="Full name…" />
              <EhrInput label="Email" type="email" value={form.email} onChange={set("email")} placeholder="patient@email.com" />
              <EhrInput label="Phone" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" />
              <EhrInput label="Date & Time" type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} required />
              <EhrSelect label="Type" value={form.appointment_type} onChange={set("appointment_type")} options={[
                { value: "therapy",       label: "Therapy" },
                { value: "evaluation",    label: "Evaluation" },
                { value: "follow_up",     label: "Follow-up" },
                { value: "telehealth",    label: "Telehealth" },
                { value: "group_therapy", label: "Group Therapy" },
                { value: "consultation",  label: "Consultation" },
              ]} />
              <EhrInput label="Location" value={form.location} onChange={set("location")} placeholder="Milford, MA" />
            </div>
            <div style={{ marginTop: 12 }}>
              <EhrInput label="Notes" value={form.notes} onChange={set("notes")} rows={2} placeholder="Optional notes…" />
            </div>
          </form>
        </EhrCard>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, background: "var(--ehr-card)", border: "1px solid var(--ehr-border)", borderRadius: 10, padding: 3 }}>
          {["week", "list"].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              background: viewMode === v ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
              border: viewMode === v ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid transparent",
              borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: viewMode === v ? 700 : 400,
              color: viewMode === v ? "var(--ehr-accent)" : "var(--ehr-muted)", cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>{v === "week" ? "📅 Week" : "📋 List"}</button>
          ))}
        </div>

        {/* Week nav */}
        {viewMode === "week" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <EhrBtn variant="secondary" small onClick={() => setWeekStart(d => addDays(d, -7))}>‹</EhrBtn>
            <span style={{ fontSize: 13, color: "var(--ehr-text)", fontWeight: 600 }}>
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <EhrBtn variant="secondary" small onClick={() => setWeekStart(d => addDays(d, 7))}>›</EhrBtn>
          </div>
        )}

        {/* Status filter */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {["all", "pending", "confirmed", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              background: statusFilter === s ? `color-mix(in srgb,var(--ehr-${STATUS_COLOR[s] ?? "accent"}) 14%,transparent)` : "transparent",
              border: `1px solid ${statusFilter === s ? `color-mix(in srgb,var(--ehr-${STATUS_COLOR[s] ?? "accent"}) 30%,transparent)` : "var(--ehr-border)"}`,
              borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: statusFilter === s ? 700 : 400,
              color: statusFilter === s ? `var(--ehr-${STATUS_COLOR[s] ?? "accent"})` : "var(--ehr-muted)",
              cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : viewMode === "week" ? (
        /* Week view */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
          {weekDays.map((day, i) => {
            const dayStr = fmtDate(day);
            const isToday = dayStr === fmtDate(new Date());
            const dayAppts = filtered.filter(a => a.scheduled_at?.startsWith(dayStr));
            return (
              <div key={i}>
                <div style={{
                  textAlign: "center", padding: "6px 4px", marginBottom: 6,
                  background: isToday ? "color-mix(in srgb,var(--ehr-accent) 14%,transparent)" : "transparent",
                  border: isToday ? "1px solid color-mix(in srgb,var(--ehr-accent) 30%,transparent)" : "1px solid transparent",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--ehr-accent)" : "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{DAYS[i]}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? "var(--ehr-accent)" : "var(--ehr-text)" }}>{day.getDate()}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 80 }}>
                  {dayAppts.length === 0 ? (
                    <div style={{ fontSize: 10, color: "var(--ehr-muted2)", textAlign: "center", paddingTop: 8 }}>—</div>
                  ) : dayAppts.map(a => (
                    <ApptCard key={a.id} appt={a} compact onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        filtered.length === 0 ? (
          <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
            <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No appointments found.</div>
          </EhrCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(a => <ApptCard key={a.id} appt={a} onStatusChange={handleStatusChange} />)}
          </div>
        )
      )}
    </div>
  );
}

function ApptCard({ appt, compact = false, onStatusChange }) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <div onClick={() => setOpen(o => !o)} style={{
        background: `color-mix(in srgb,var(--ehr-${STATUS_COLOR[appt.status] ?? "muted"}) 12%,transparent)`,
        border: `1px solid color-mix(in srgb,var(--ehr-${STATUS_COLOR[appt.status] ?? "muted"}) 25%,transparent)`,
        borderRadius: 8, padding: "5px 7px", cursor: "pointer", fontSize: 11,
      }}>
        <div style={{ fontWeight: 700, color: "var(--ehr-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.name || "Patient"}</div>
        <div style={{ color: "var(--ehr-muted2)" }}>{fmtTime(appt.scheduled_at)}</div>
        {open && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            <EhrBadge color={STATUS_COLOR[appt.status] ?? "muted"}>{appt.status}</EhrBadge>
            {appt.appointment_type && <div style={{ color: "var(--ehr-muted2)", fontSize: 10 }}>{appt.appointment_type.replace(/_/g, " ")}</div>}
            <ActionButtons appt={appt} onStatusChange={onStatusChange} />
          </div>
        )}
      </div>
    );
  }

  return (
    <EhrCard>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>{appt.name || "Patient"}</span>
            <EhrBadge color={STATUS_COLOR[appt.status] ?? "muted"}>{appt.status}</EhrBadge>
            {appt.appointment_type && <EhrBadge color="purple">{appt.appointment_type.replace(/_/g, " ")}</EhrBadge>}
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ehr-muted2)", flexWrap: "wrap" }}>
            <span>📅 {appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</span>
            {appt.location && <span>📍 {appt.location}</span>}
            {appt.email && <span>✉️ {appt.email}</span>}
          </div>
        </div>
        <ActionButtons appt={appt} onStatusChange={onStatusChange} />
      </div>
    </EhrCard>
  );
}

function ActionButtons({ appt, onStatusChange }) {
  const isTelehealth = appt.appointment_type === "telehealth";
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
      {isTelehealth && appt.telehealth_url && (
        <EhrBtn variant="teal" small onClick={() => window.open(appt.telehealth_url, "_blank")}>📹 Join</EhrBtn>
      )}
      {appt.status === "pending" || appt.status === "requested" ? (
        <EhrBtn variant="green" small onClick={() => onStatusChange(appt.id, "confirmed")}>✓ Confirm</EhrBtn>
      ) : null}
      {appt.status === "confirmed" && (
        <EhrBtn variant="teal" small onClick={() => onStatusChange(appt.id, "completed")}>Complete</EhrBtn>
      )}
      {appt.status !== "cancelled" && appt.status !== "completed" && (
        <EhrBtn variant="danger" small onClick={() => onStatusChange(appt.id, "cancelled")}>Cancel</EhrBtn>
      )}
    </div>
  );
}
