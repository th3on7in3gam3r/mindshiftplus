import { useState, useEffect, useRef } from "react";
import { EhrBtn, EhrBadge, EhrInput, EhrSelect, Spinner } from "./EHRUI";
import { getAppointments, updateApptStatus } from "../../lib/clinicApi";
import { supabase } from "../../lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const SLOT_HEIGHT = 48;       // px per hour
const START_HOUR  = 7;        // 7am
const END_HOUR    = 20;       // 8pm
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAYS_SHORT  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Color palette per appointment type (matches the image's vibrant blocks)
const TYPE_COLORS = {
  therapy:       { bg: "#7c6ff7", text: "#fff" },
  evaluation:    { bg: "#f093a0", text: "#fff" },
  follow_up:     { bg: "#f0a500", text: "#fff" },
  telehealth:    { bg: "#0ea5a0", text: "#fff" },
  group_therapy: { bg: "#16a34a", text: "#fff" },
  consultation:  { bg: "#3b5bdb", text: "#fff" },
  initial_evaluation: { bg: "#e05c7a", text: "#fff" },
  medication_review:  { bg: "#7c3aed", text: "#fff" },
};
const STATUS_COLORS = {
  pending:   { bg: "#f0a500", text: "#fff" },
  requested: { bg: "#a89cf5", text: "#fff" },
  confirmed: { bg: "#3b5bdb", text: "#fff" },
  completed: { bg: "#16a34a", text: "#fff" },
  cancelled: { bg: "#94a3b8", text: "#fff" },
};

function getColor(appt) {
  const tc = TYPE_COLORS[appt.appointment_type];
  if (tc) return tc;
  return STATUS_COLORS[appt.status] ?? { bg: "#3b5bdb", text: "#fff" };
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
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
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmtTime12(h, m = 0) {
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return m === 0 ? `${hh}:00${ampm}` : `${hh}:${String(m).padStart(2,"0")}${ampm}`;
}

// ── Time grid helpers ─────────────────────────────────────────────────────────
function apptTopPct(iso) {
  const d = new Date(iso);
  const h = d.getHours() + d.getMinutes() / 60;
  return ((h - START_HOUR) / TOTAL_HOURS) * 100;
}
function apptHeightPct(durationMin = 60) {
  return (durationMin / 60 / TOTAL_HOURS) * 100;
}

const EMPTY_FORM = {
  name: "", email: "", phone: "",
  appointment_type: "therapy",
  scheduled_at: "", duration: "60",
  location: "Milford, MA", notes: "",
};

export default function EHRSchedule({ clinician }) {
  const [appts, setAppts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [viewMode, setViewMode]   = useState("week");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null);
  const [error, setError]         = useState(null);
  const gridRef = useRef(null);

  useEffect(() => { load(); }, [weekStart]);

  // Scroll to 8am on mount
  useEffect(() => {
    if (gridRef.current) {
      const scrollTo = ((8 - START_HOUR) / TOTAL_HOURS) * gridRef.current.scrollHeight;
      gridRef.current.scrollTop = scrollTo;
    }
  }, [loading]);

  async function load() {
    setLoading(true);
    try {
      const from = fmtDate(weekStart) + "T00:00:00";
      const to   = fmtDate(addDays(weekStart, 6)) + "T23:59:59";
      const data = await getAppointments(from, to);
      setAppts(data ?? []);
    } catch (e) {
      setError(e.message ?? "Failed to load.");
    }
    setLoading(false);
  }

  async function handleStatusChange(id, status) {
    try {
      await updateApptStatus(id, status);
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected(s => ({ ...s, status }));
    } catch (e) { setError(e.message); }
  }

  async function handleCreate(e) {
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
      if (data) setAppts(prev => [...prev, data]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  // Click on empty grid cell → pre-fill form with that day+time
  function handleGridClick(dayDate, e) {
    if (!gridRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = y / rect.height;
    const hour = START_HOUR + pct * TOTAL_HOURS;
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60 / 15) * 15;
    const dt = new Date(dayDate);
    dt.setHours(h, m, 0, 0);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm(f => ({ ...f, scheduled_at: local }));
    setShowForm(true);
    setSelected(null);
  }

  const weekDays = DAYS_SHORT.map((_, i) => addDays(weekStart, i));
  const todayStr = fmtDate(new Date());
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const weekLabel = `${weekStart.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})} – ${addDays(weekStart,6).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 58px)", background: "var(--ehr-bg)", fontFamily: "inherit" }}>

      {/* ── Top toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        background: "var(--ehr-surface)", borderBottom: "1px solid var(--ehr-border)",
        flexWrap: "wrap",
      }}>
        {/* View toggle */}
        <div style={{ display: "flex", background: "var(--ehr-card2)", borderRadius: 8, padding: 3, gap: 2 }}>
          {["week","list"].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: viewMode===v ? 700 : 400,
              background: viewMode===v ? "var(--ehr-surface)" : "transparent",
              color: viewMode===v ? "var(--ehr-accent)" : "var(--ehr-muted)",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: viewMode===v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>{v === "week" ? "Week" : "List"}</button>
          ))}
        </div>

        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekStart(d => addDays(d,-7))} style={{ width:28, height:28, borderRadius:6, border:"1px solid var(--ehr-border)", background:"var(--ehr-surface)", cursor:"pointer", fontSize:14, color:"var(--ehr-muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)", minWidth: 320, textAlign: "center" }}>{weekLabel}</span>
          <button onClick={() => setWeekStart(d => addDays(d,7))} style={{ width:28, height:28, borderRadius:6, border:"1px solid var(--ehr-border)", background:"var(--ehr-surface)", cursor:"pointer", fontSize:14, color:"var(--ehr-muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>

        <EhrBtn variant="secondary" small onClick={() => setWeekStart(getWeekStart(new Date()))}>Today</EhrBtn>

        <div style={{ marginLeft: "auto" }}>
          <EhrBtn small onClick={() => { setShowForm(s => !s); setSelected(null); }}>+ New Appointment</EhrBtn>
        </div>
      </div>

      {error && (
        <div style={{ background:"color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border:"1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius:8, padding:"8px 16px", fontSize:12, color:"var(--ehr-rose)", margin:"8px 16px 0" }}>
          ⚠️ {error} <button onClick={() => setError(null)} style={{ background:"transparent", border:"none", color:"var(--ehr-rose)", cursor:"pointer", marginLeft:8 }}>✕</button>
        </div>
      )}

      {/* ── New appointment form (slide-in panel) ── */}
      {showForm && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 380, zIndex: 200,
          background: "var(--ehr-surface)", borderLeft: "1px solid var(--ehr-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", padding: "1.5rem",
          overflowY: "auto", display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"var(--ehr-text)", margin:0 }}>New Appointment</h3>
            <button onClick={() => setShowForm(false)} style={{ background:"transparent", border:"none", fontSize:20, cursor:"pointer", color:"var(--ehr-muted)" }}>✕</button>
          </div>
          <form onSubmit={handleCreate} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <EhrInput label="Patient Name *" value={form.name} onChange={set("name")} placeholder="Full name…" required />
            <EhrInput label="Email" type="email" value={form.email} onChange={set("email")} placeholder="patient@email.com" />
            <EhrInput label="Phone" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" />
            <EhrInput label="Date & Time *" type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} required />
            <EhrSelect label="Type" value={form.appointment_type} onChange={set("appointment_type")} options={[
              { value:"therapy",            label:"Therapy" },
              { value:"evaluation",         label:"Evaluation" },
              { value:"initial_evaluation", label:"Initial Evaluation" },
              { value:"follow_up",          label:"Follow-up" },
              { value:"telehealth",         label:"Telehealth (Video)" },
              { value:"group_therapy",      label:"Group Therapy" },
              { value:"consultation",       label:"Consultation" },
              { value:"medication_review",  label:"Medication Review" },
            ]} />
            <EhrSelect label="Duration" value={form.duration} onChange={set("duration")} options={[
              { value:"30",  label:"30 min" },
              { value:"45",  label:"45 min" },
              { value:"60",  label:"60 min" },
              { value:"90",  label:"90 min" },
              { value:"120", label:"2 hours" },
            ]} />
            <EhrInput label="Location" value={form.location} onChange={set("location")} placeholder="Milford, MA" />
            <EhrInput label="Notes" value={form.notes} onChange={set("notes")} rows={3} placeholder="Optional notes…" />
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <EhrBtn type="submit" disabled={saving} style={{ flex:1, justifyContent:"center" }}>{saving ? "Saving…" : "Create Appointment"}</EhrBtn>
              <EhrBtn variant="secondary" type="button" onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</EhrBtn>
            </div>
          </form>
        </div>
      )}

      {/* ── Appointment detail panel ── */}
      {selected && !showForm && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 340, zIndex: 200,
          background: "var(--ehr-surface)", borderLeft: "1px solid var(--ehr-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", padding: "1.5rem",
          overflowY: "auto",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.2rem" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"var(--ehr-text)", margin:0 }}>Appointment</h3>
            <button onClick={() => setSelected(null)} style={{ background:"transparent", border:"none", fontSize:20, cursor:"pointer", color:"var(--ehr-muted)" }}>✕</button>
          </div>
          {/* Color bar */}
          <div style={{ height:6, borderRadius:3, background:getColor(selected).bg, marginBottom:"1rem" }} />
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--ehr-muted2)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Patient</div>
              <div style={{ fontSize:15, fontWeight:700, color:"var(--ehr-text)" }}>{selected.name || "—"}</div>
            </div>
            {[
              ["Date & Time", selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}) : "—"],
              ["Type", selected.appointment_type?.replace(/_/g," ") ?? "—"],
              ["Location", selected.location ?? "—"],
              ["Email", selected.email ?? "—"],
              ["Phone", selected.phone ?? "—"],
              ["Notes", selected.notes ?? "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--ehr-muted2)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:13, color:"var(--ehr-text)" }}>{val}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--ehr-muted2)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Status</div>
              <EhrBadge color={selected.status === "confirmed" ? "teal" : selected.status === "completed" ? "green" : selected.status === "cancelled" ? "rose" : "gold"}>{selected.status}</EhrBadge>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:"1.5rem" }}>
            {(selected.status === "pending" || selected.status === "requested") && (
              <EhrBtn variant="green" onClick={() => handleStatusChange(selected.id, "confirmed")} style={{ justifyContent:"center" }}>✓ Confirm</EhrBtn>
            )}
            {selected.status === "confirmed" && (
              <EhrBtn variant="teal" onClick={() => handleStatusChange(selected.id, "completed")} style={{ justifyContent:"center" }}>Mark Complete</EhrBtn>
            )}
            {selected.appointment_type === "telehealth" && selected.telehealth_url && (
              <EhrBtn variant="teal" onClick={() => window.open(selected.telehealth_url,"_blank")} style={{ justifyContent:"center" }}>📹 Join Video Session</EhrBtn>
            )}
            {selected.status !== "cancelled" && selected.status !== "completed" && (
              <EhrBtn variant="danger" onClick={() => { handleStatusChange(selected.id,"cancelled"); setSelected(null); }} style={{ justifyContent:"center" }}>Cancel Appointment</EhrBtn>
            )}
          </div>
        </div>
      )}

      {/* ── Main calendar area ── */}
      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}><Spinner /></div>
      ) : viewMode === "list" ? (
        <ListViewContent appts={appts} onSelect={setSelected} onStatusChange={handleStatusChange} />
      ) : (
        <WeekGrid
          weekDays={weekDays}
          appts={appts}
          todayStr={todayStr}
          gridRef={gridRef}
          onCellClick={handleGridClick}
          onApptClick={(a) => { setSelected(a); setShowForm(false); }}
        />
      )}
    </div>
  );
}

// ── Week Grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ weekDays, appts, todayStr, gridRef, onCellClick, onApptClick }) {
  const timeLabels = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    timeLabels.push(fmtTime12(h));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Day header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "56px repeat(7, 1fr)",
        borderBottom: "1px solid var(--ehr-border)",
        background: "var(--ehr-surface)",
        flexShrink: 0,
      }}>
        <div style={{ borderRight: "1px solid var(--ehr-border)" }} />
        {weekDays.map((day, i) => {
          const ds = fmtDate(day);
          const isToday = ds === todayStr;
          const dayApptCount = appts.filter(a => a.scheduled_at?.startsWith(ds)).length;
          return (
            <div key={i} style={{
              padding: "10px 8px",
              textAlign: "center",
              borderRight: i < 6 ? "1px solid var(--ehr-border)" : "none",
              background: isToday ? "color-mix(in srgb,var(--ehr-accent) 6%,transparent)" : "transparent",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--ehr-accent)" : "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {DAYS_SHORT[i]}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 2,
                color: isToday ? "#fff" : "var(--ehr-text)",
                background: isToday ? "var(--ehr-accent)" : "transparent",
                width: isToday ? 34 : "auto", height: isToday ? 34 : "auto",
                borderRadius: isToday ? "50%" : 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {day.getDate()}
              </div>
              {dayApptCount > 0 && (
                <div style={{ fontSize: 10, color: "var(--ehr-muted2)", marginTop: 2 }}>
                  {dayApptCount} appt{dayApptCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "56px repeat(7, 1fr)",
          height: `${TOTAL_HOURS * SLOT_HEIGHT}px`,
          position: "relative",
        }}>
          {/* Time labels column */}
          <div style={{ borderRight: "1px solid var(--ehr-border)", position: "relative" }}>
            {timeLabels.map((label, i) => (
              <div key={i} style={{
                position: "absolute",
                top: `${(i / TOTAL_HOURS) * 100}%`,
                right: 8,
                fontSize: 10,
                color: "var(--ehr-muted2)",
                fontWeight: 500,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const ds = fmtDate(day);
            const isToday = ds === todayStr;
            const dayAppts = appts.filter(a => a.scheduled_at?.startsWith(ds));

            return (
              <div
                key={di}
                onClick={(e) => onCellClick(day, e)}
                style={{
                  position: "relative",
                  borderRight: di < 6 ? "1px solid var(--ehr-border)" : "none",
                  background: isToday ? "color-mix(in srgb,var(--ehr-accent) 3%,transparent)" : "transparent",
                  cursor: "crosshair",
                }}
              >
                {/* Hour grid lines */}
                {timeLabels.map((_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: `${(i / TOTAL_HOURS) * 100}%`,
                    left: 0, right: 0,
                    borderTop: i === 0 ? "none" : "1px solid var(--ehr-border)",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* Half-hour lines */}
                {timeLabels.map((_, i) => (
                  <div key={`h${i}`} style={{
                    position: "absolute",
                    top: `${((i + 0.5) / TOTAL_HOURS) * 100}%`,
                    left: 0, right: 0,
                    borderTop: "1px dashed color-mix(in srgb,var(--ehr-border) 60%,transparent)",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const top = apptTopPct(appt.scheduled_at);
                  const height = apptHeightPct(appt.duration_minutes ?? 60);
                  const color = getColor(appt);
                  if (top < 0 || top > 100) return null;
                  return (
                    <div
                      key={appt.id}
                      onClick={(e) => { e.stopPropagation(); onApptClick(appt); }}
                      style={{
                        position: "absolute",
                        top: `${top}%`,
                        left: 3,
                        right: 3,
                        height: `${Math.max(height, 3)}%`,
                        minHeight: 22,
                        background: color.bg,
                        color: color.text,
                        borderRadius: 6,
                        padding: "3px 6px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        overflow: "hidden",
                        zIndex: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        transition: "opacity .15s, transform .15s",
                        lineHeight: 1.3,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.01)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
                      title={`${appt.name} — ${appt.appointment_type?.replace(/_/g," ")} @ ${new Date(appt.scheduled_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {appt.name || "Patient"}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {new Date(appt.scheduled_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
                        {appt.appointment_type ? ` · ${appt.appointment_type.replace(/_/g," ")}` : ""}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowH = now.getHours() + now.getMinutes() / 60;
                  if (nowH < START_HOUR || nowH > END_HOUR) return null;
                  const pct = ((nowH - START_HOUR) / TOTAL_HOURS) * 100;
                  return (
                    <div style={{
                      position: "absolute",
                      top: `${pct}%`,
                      left: 0, right: 0,
                      height: 2,
                      background: "var(--ehr-rose)",
                      zIndex: 3,
                      pointerEvents: "none",
                    }}>
                      <div style={{
                        position: "absolute",
                        left: -5, top: -4,
                        width: 10, height: 10,
                        borderRadius: "50%",
                        background: "var(--ehr-rose)",
                      }} />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListViewContent({ appts, onSelect, onStatusChange }) {
  const sorted = [...appts].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const upcoming = sorted.filter(a => !["cancelled","completed"].includes(a.status));
  const past     = sorted.filter(a =>  ["cancelled","completed"].includes(a.status));

  const Row = ({ appt }) => {
    const color = getColor(appt);
    return (
      <div onClick={() => onSelect(appt)} style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "0.9rem 1.2rem",
        background: "var(--ehr-surface)",
        border: "1px solid var(--ehr-border)",
        borderLeft: `4px solid ${color.bg}`,
        borderRadius: 12, cursor: "pointer", marginBottom: 6,
        transition: "background .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb,var(--ehr-accent) 4%,transparent)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--ehr-surface)"}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color.bg, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-text)" }}>{appt.name || "Patient"}</div>
          <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginTop: 2 }}>
            {appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "—"}
            {appt.appointment_type ? ` · ${appt.appointment_type.replace(/_/g," ")}` : ""}
            {appt.location ? ` · ${appt.location}` : ""}
          </div>
        </div>
        <EhrBadge color={appt.status === "confirmed" ? "teal" : appt.status === "completed" ? "green" : appt.status === "cancelled" ? "rose" : "gold"}>{appt.status}</EhrBadge>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.5rem" }}>
      {upcoming.length === 0 && past.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--ehr-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No appointments this week.</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Upcoming ({upcoming.length})</div>
              {upcoming.map(a => <Row key={a.id} appt={a} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted2)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "1.2rem 0 8px" }}>Past ({past.length})</div>
              {past.map(a => <Row key={a.id} appt={a} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}
