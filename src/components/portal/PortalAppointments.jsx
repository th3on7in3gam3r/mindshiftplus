import { useState, useEffect } from "react";
import { getAppointments, bookAppointment, cancelAppointment } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, Btn, Toast, Input, T } from "./PortalUI";

const TYPES = ["Follow-up","Medication Review","Telehealth","Initial Evaluation","Telehealth (Video)"];
const LOCATIONS = ["Milford — 31 Granite St. Suite #2","Telehealth (Video)"];

const STATUS_DOT = {
  upcoming:  { color: "#22c55e", label: "Upcoming" },
  confirmed: { color: "#22c55e", label: "Confirmed" },
  requested: { color: "#f0a500", label: "Requested" },
  pending:   { color: "#f0a500", label: "Pending" },
  completed: { color: "#4a6cf7", label: "Completed" },
  cancelled: { color: "#e05c7a", label: "Cancelled" },
};

// Available slots per day of week (matches PublicBooking)
const SLOTS_BY_DOW = {
  1: 2,  // Monday: 2 evening slots
  4: 2,  // Thursday: 2 evening slots
  5: 8,  // Friday: 8 slots
  6: 8,  // Saturday: 8 slots
};
const AVAIL_DAYS = [1, 4, 5, 6];

export function sessionWindowState(scheduledAt, telehealthUrl) {
  if (!telehealthUrl) return "no_url";
  const now = Date.now();
  const start = new Date(scheduledAt).getTime() - 10 * 60 * 1000;
  const end   = new Date(scheduledAt).getTime() + 60 * 60 * 1000;
  if (now < start) return "before_window";
  if (now > end)   return "after_window";
  return "in_window";
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
function AppointmentCalendar({ appointments, onDayClick, selectedDate, fullDays }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthLabel = view.toLocaleDateString("en-US", { month:"long", year:"numeric" });

  const toStr = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // Build a map of date → appointments
  const apptMap = {};
  appointments.forEach(a => {
    if (!a.scheduled_at) return;
    const ds = a.scheduled_at.slice(0,10);
    if (!apptMap[ds]) apptMap[ds] = [];
    apptMap[ds].push(a);
  });

  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  return (
    <div style={{ background:"#fff", borderRadius:20, border:`1px solid ${T.border}`, overflow:"hidden", boxShadow:"0 2px 16px rgba(74,108,247,0.07)" }}>
      {/* Calendar header */}
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.teal})`, padding:"1.2rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button onClick={()=>setView(new Date(year,month-1,1))} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:"#fff", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{monthLabel}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>
            {appointments.filter(a => a.scheduled_at?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length} appointment(s) this month
          </div>
        </div>
        <button onClick={()=>setView(new Date(year,month+1,1))} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:"#fff", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>

      <div style={{ padding:"1rem 1.2rem 1.4rem" }}>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:T.muted2, padding:"4px 0", letterSpacing:"0.04em" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const ds = toStr(d);
            const dayAppts = apptMap[ds] || [];
            const isToday = ds === today.toISOString().slice(0,10);
            const isSel = selectedDate === ds;
            const hasAppt = dayAppts.length > 0;
            const isFull = fullDays?.includes(ds);
            const dow = new Date(ds+"T12:00:00").getDay();
            const isAvailDay = AVAIL_DAYS.includes(dow);
            const isPast = new Date(ds) < today;

            return (
              <button key={d} onClick={() => onDayClick(ds)} style={{
                position:"relative", aspectRatio:"1", borderRadius:10, border:"none",
                background: isSel ? T.accent : isFull ? "#fef2f2" : isToday ? `${T.accent}12` : "transparent",
                color: isSel ? "#fff" : isFull ? "#fca5a5" : isToday ? T.accent : isPast ? T.muted2 : T.text,
                fontWeight: isSel || isToday ? 700 : 400,
                fontSize:13, cursor: "pointer",
                outline: isToday && !isSel ? `2px solid ${T.accent}40` : "none",
                transition:"all .15s",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
                opacity: isPast && !hasAppt ? 0.4 : 1,
              }}
                onMouseOver={e=>{ if(!isSel) e.currentTarget.style.background = isFull ? "#fee2e2" : `${T.accent}10`; }}
                onMouseOut={e=>{ if(!isSel) e.currentTarget.style.background = isFull ? "#fef2f2" : isToday ? `${T.accent}12` : "transparent"; }}
                title={isFull ? "Fully booked — choose another day" : hasAppt ? "View appointment" : isAvailDay && !isPast ? "Available for booking" : ""}
              >
                {d}
                {isFull && !hasAppt && (
                  <span style={{ fontSize:7, color:"#fca5a5", fontWeight:700, lineHeight:1 }}>FULL</span>
                )}
                {hasAppt && (
                  <div style={{ display:"flex", gap:2, justifyContent:"center" }}>
                    {dayAppts.slice(0,3).map((a,idx) => (
                      <span key={idx} style={{ width:5, height:5, borderRadius:"50%", background: isSel ? "rgba(255,255,255,0.8)" : (STATUS_DOT[a.status]?.color || T.accent), display:"inline-block" }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:14, marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}`, flexWrap:"wrap" }}>
          {Object.entries(STATUS_DOT).slice(0,4).map(([status, { color, label }]) => (
            <div key={status} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.muted }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }}/>
              {label}
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.muted }}>
            <span style={{ width:8, height:8, borderRadius:2, background:"#fca5a5", display:"inline-block" }}/>
            Fully Booked
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Selected day detail panel ──────────────────────────────────────────────────
function DayDetail({ date, appointments, onCancel, onClose, isFull }) {
  const dayAppts = appointments.filter(a => a.scheduled_at?.startsWith(date));
  const today = new Date(); today.setHours(0,0,0,0);
  const isPast = new Date(date+"T12:00:00") < today;

  // Format time properly in local timezone
  const fmtTime = iso => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true, timeZoneName:"short" });
  };
  const fmtDay = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const dow = new Date(date+"T12:00:00").getDay();
  const isAvailDay = AVAIL_DAYS.includes(dow);

  // Generate available time slots for this day
  const getAvailableSlots = () => {
    if (isPast || !isAvailDay) return [];
    const slots = [];
    const dayConfig = { 1: {start:18, end:20}, 4: {start:18, end:20}, 5: {start:8, end:17}, 6: {start:8, end:17} };
    const config = dayConfig[dow];
    if (!config) return [];
    
    const bookedTimes = dayAppts.map(a => new Date(a.scheduled_at).getHours());
    for (let h = config.start; h < config.end; h++) {
      if (!bookedTimes.includes(h)) {
        slots.push({ hour: h, time: `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}` });
      }
    }
    return slots;
  };

  const availableSlots = getAvailableSlots();

  return (
    <div style={{ background:`linear-gradient(135deg,${T.accent}08,${T.teal}05)`, border:`1px solid ${T.accent}20`, borderRadius:16, padding:"1.2rem 1.4rem", marginTop:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.accent }}>📅 {fmtDay(date)}</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
            {dayAppts.length > 0 ? `${dayAppts.length} appointment${dayAppts.length!==1?"s":""}` : isPast ? "No appointments" : isAvailDay ? `${availableSlots.length} slot${availableSlots.length!==1?"s":""}` : "Not a clinic day"}
          </div>
        </div>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:18, lineHeight:1 }}>✕</button>
      </div>

      {dayAppts.length === 0 && !isPast && isAvailDay && !isFull && availableSlots.length === 0 && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"0.9rem 1rem", fontSize:13, color:"#991b1b", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:16 }}>🚫</span>
          <div>All time slots are booked for this day. Please select another date.</div>
        </div>
      )}

      {dayAppts.length === 0 && !isPast && isAvailDay && !isFull && availableSlots.length === 0 && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"0.9rem 1rem", fontSize:13, color:"#991b1b", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:16 }}>🚫</span>
          <div>All time slots are booked for this day. Please select another date.</div>
        </div>
      )}

      {dayAppts.length === 0 && !isPast && !isAvailDay && (
        <div style={{ background:"#f9fafb", border:`1px solid ${T.border}`, borderRadius:10, padding:"0.9rem 1rem", fontSize:13, color:T.muted }}>
          The clinic is not open on this day. Available days: <strong>Mon & Thu evenings, Fri & Sat all day</strong>.
        </div>
      )}

      {dayAppts.map(a => {
        const isTelehealth = a.appointment_type === "telehealth";
        const winState = isTelehealth ? sessionWindowState(a.scheduled_at, a.telehealth_url) : null;
        return (
          <div key={a.id} style={{ background:"#fff", borderRadius:12, padding:"0.9rem 1rem", marginBottom:8, border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                  {a.appointment_type?.replace(/_/g," ")||"Appointment"}
                  {isTelehealth && <span title="Telehealth">📹</span>}
                </div>
                <div style={{ fontSize:12, color:T.muted, display:"flex", flexDirection:"column", gap:2 }}>
                  <span>🕐 {a.scheduled_at ? fmtTime(a.scheduled_at) : "Time TBD"}</span>
                  <span>📍 {a.location||"TBD"}</span>
                  <span>👨‍⚕️ {a.provider_name||"Clinician"}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <Badge status={a.status}/>
                {a.status==="upcoming"&&(
                  <button onClick={()=>onCancel(a.id)} style={{ background:"#fee2e2", border:"none", borderRadius:20, padding:"4px 12px", color:"#991b1b", fontSize:11, fontWeight:600, cursor:"pointer" }}>Cancel</button>
                )}
              </div>
            </div>
            {isTelehealth && (
              <div style={{ marginTop:8 }}>
                {winState === "in_window" && (
                  <button onClick={() => window.open(a.telehealth_url, "_blank")} style={{ background:T.accent, border:"none", borderRadius:20, padding:"6px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>📹 Join Video Session</button>
                )}
                {winState === "before_window" && (
                  <span style={{ fontSize:12, color:T.muted }}>Session opens 10 min before your appointment</span>
                )}
                {winState === "no_url" && (
                  <span style={{ fontSize:12, color:T.muted }}>Video link coming soon</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PortalAppointments({ userId, P }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [fullDays, setFullDays]         = useState([]);
  const [form, setForm]                 = useState({ appointment_type:"", location:"", notes:"", date:"", time:"" });
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast]               = useState("");
  const [view, setView]                 = useState("calendar"); // calendar | list

  const load = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth()-2, 1).toISOString();
    const to   = new Date(now.getFullYear(), now.getMonth()+6, 0).toISOString();
    try {
      const data = await getAppointments(from, to, userId);
      setAppointments(Array.isArray(data)?data:[]);
    } catch { setAppointments([]); }

    // Load ALL clinic appointments to detect full days
    try {
      const { supabase } = await import("../../lib/supabase.js");
      const { data: allAppts } = await supabase
        .from("appointments")
        .select("scheduled_at, status")
        .gte("scheduled_at", from)
        .lte("scheduled_at", to)
        .not("status", "in", '("cancelled","archived")');

      // Count bookings per day and compare to available slots
      const countByDay = {};
      (allAppts || []).forEach(a => {
        if (!a.scheduled_at) return;
        const ds = a.scheduled_at.slice(0,10);
        countByDay[ds] = (countByDay[ds] || 0) + 1;
      });

      const full = Object.entries(countByDay)
        .filter(([ds, count]) => {
          const dow = new Date(ds+"T12:00:00").getDay();
          const maxSlots = SLOTS_BY_DOW[dow] ?? 0;
          return maxSlots > 0 && count >= maxSlots;
        })
        .map(([ds]) => ds);

      setFullDays(full);
    } catch {}

    setLoading(false);
  };

  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),4000); };

  const handleRequest = async (e) => {
    e.preventDefault();
    if(!form.appointment_type) return;
    setSubmitting(true);
    try {
      const normalizedType = form.appointment_type === "Telehealth (Video)"
        ? "telehealth"
        : form.appointment_type.toLowerCase().replace(/ /g,"_");
      
      // Build scheduled_at from date and time if provided
      let scheduled_at = null;
      if (form.date && form.time) {
        const [hour] = form.time.split(':');
        scheduled_at = new Date(`${form.date}T${hour}:00:00`).toISOString();
      }
      
      await bookAppointment({ 
        patient_id:userId, 
        appointment_type:normalizedType, 
        location:form.location, 
        notes:form.notes, 
        status:"requested",
        scheduled_at: scheduled_at
      });
      showToast("✓ Request sent! We'll confirm within 1 business day.");
      setShowForm(false); 
      setForm({appointment_type:"",location:"",notes:"",date:"",time:""}); 
      load();
    } catch { showToast("Something went wrong. Please call (508) 306-1128."); }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    if(!confirm("Cancel this appointment?")) return;
    try { await cancelAppointment(id); } catch {}
    setSelectedDate(null);
    load();
  };

  const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Date TBD";
  const upcoming = appointments.filter(a=>["upcoming","requested","confirmed","pending"].includes(a.status));
  const past     = appointments.filter(a=>["completed","cancelled"].includes(a.status));

  // Block new requests if patient already has a confirmed/upcoming future appointment
  const now = new Date().toISOString();
  const confirmedUpcoming = appointments.find(a =>
    ["confirmed","upcoming"].includes(a.status) &&
    a.scheduled_at && a.scheduled_at > now
  );

  return (
    <div style={{ padding:"2rem", maxWidth:900, margin:"0 auto" }}>
      <Toast message={toast}/>

      <PageHeader
        icon="📅" label="Appointments"
        title="Your Appointments"
        subtitle="View your schedule and request new appointments"
        gradient={`linear-gradient(135deg,${T.accent}15,${T.teal}10)`}
        action={
          confirmedUpcoming
            ? <span style={{ fontSize:12, color:T.teal, fontWeight:600, background:`${T.teal}12`, border:`1px solid ${T.teal}30`, borderRadius:20, padding:"8px 16px" }}>✓ Appointment Confirmed</span>
            : <Btn onClick={()=>setShowForm(true)}>+ Request Appointment</Btn>
        }
      />

      {/* View toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:"1.5rem", background:"#f3f4f6", borderRadius:12, padding:4, width:"fit-content" }}>
        {[["calendar","📅 Calendar"],["list","☰ List"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{
            padding:"7px 18px", borderRadius:9, border:"none", fontSize:13, fontWeight:view===v?600:400,
            background:view===v?"#fff":  "transparent",
            color:view===v?T.accent:T.muted,
            cursor:"pointer", fontFamily:"inherit",
            boxShadow:view===v?"0 1px 4px rgba(0,0,0,0.08)":"none",
            transition:"all .15s",
          }}>{l}</button>
        ))}
      </div>

      {/* Confirmed appointment block banner */}
      {confirmedUpcoming && (
        <div style={{ background:`linear-gradient(135deg,${T.teal}12,${T.accent}08)`, border:`1px solid ${T.teal}30`, borderRadius:14, padding:"1rem 1.4rem", marginBottom:"1.2rem", display:"flex", gap:12, alignItems:"flex-start" }}>
          <span style={{ fontSize:22, flexShrink:0 }}>🔒</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.teal, marginBottom:3 }}>You already have a confirmed appointment</div>
            <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>
              You can request a new appointment after your confirmed visit on <strong>{fmt(confirmedUpcoming.scheduled_at)}</strong> has been completed.
              To reschedule, please call us at <strong>(508) 306-1128</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Request modal — only shown when no confirmed upcoming */}
      {showForm && !confirmedUpcoming && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:24, padding:"2rem", maxWidth:520, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <div>
                <h2 style={{ fontSize:"1.2rem", fontWeight:700, color:T.text, margin:0 }}>Request an Appointment</h2>
                <p style={{ fontSize:12, color:T.muted, margin:"3px 0 0" }}>We'll confirm within 1 business day</p>
              </div>
              <button onClick={()=>setShowForm(false)} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:32, height:32, fontSize:16, cursor:"pointer", color:T.muted }}>✕</button>
            </div>
            <form onSubmit={handleRequest} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Step 1: Select Date */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:T.text, display:"block", marginBottom:8 }}>📅 Preferred Date *</label>
                <input type="date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:14, color:T.text, background:"#fff", outline:"none", fontFamily:"inherit" }} required/>
              </div>

              {/* Step 2: Select Time (only if date is selected) */}
              {form.date && (() => {
                const dateObj = new Date(form.date + "T12:00:00");
                const dow = dateObj.getDay();
                const dayConfig = { 1: {start:18, end:20}, 4: {start:18, end:20}, 5: {start:8, end:17}, 6: {start:8, end:17} };
                const config = dayConfig[dow];
                
                if (!config) {
                  return <div style={{ background:"#f9fafb", border:`1px solid ${T.border}`, borderRadius:10, padding:"0.9rem 1rem", fontSize:13, color:T.muted }}>The clinic is not open on this day. Available days: <strong>Mon & Thu evenings, Fri & Sat all day</strong>.</div>;
                }
                
                const slots = [];
                for (let h = config.start; h < config.end; h++) {
                  slots.push({ hour: h, time: `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}` });
                }
                
                return (
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:T.text, display:"block", marginBottom:8 }}>🕐 Preferred Time *</label>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(90px, 1fr))", gap:8 }}>
                      {slots.map(slot => (
                        <button key={slot.hour} type="button" onClick={()=>setForm(f=>({...f,time:`${slot.hour}:00`}))} style={{
                          background: form.time === `${slot.hour}:00` ? T.accent : "#f3f4f6",
                          border: form.time === `${slot.hour}:00` ? `2px solid ${T.accent}` : `1.5px solid ${T.border}`,
                          borderRadius:8,
                          padding:"10px 8px",
                          fontSize:13,
                          fontWeight: form.time === `${slot.hour}:00` ? 700 : 500,
                          color: form.time === `${slot.hour}:00` ? "#fff" : T.text,
                          cursor:"pointer",
                          transition:"all .2s",
                        }}
                          onMouseOver={e => { if(form.time !== `${slot.hour}:00`) e.currentTarget.style.background = `${T.accent}15`; }}
                          onMouseOut={e => { if(form.time !== `${slot.hour}:00`) e.currentTarget.style.background = "#f3f4f6"; }}
                        >{slot.time}</button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <Input label="Appointment Type" value={form.appointment_type} onChange={v=>setForm(f=>({...f,appointment_type:v}))} options={TYPES} required/>
              <Input label="Preferred Location" value={form.location} onChange={v=>setForm(f=>({...f,location:v}))} options={LOCATIONS}/>
              <Input label="Notes (optional)" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Any specific concerns or requests…" rows={3}/>
              <Alert type="info" icon="ℹ️" title="For urgent needs, call (508) 306-1128 directly."/>
              <div style={{ display:"flex", gap:10 }}>
                <Btn type="submit" disabled={submitting} style={{ flex:1, justifyContent:"center" }}>{submitting?"Sending…":"Submit Request"}</Btn>
                <Btn variant="secondary" onClick={()=>setShowForm(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:T.muted }}>Loading your appointments…</div>
      ) : view === "calendar" ? (
        <>
          <AppointmentCalendar
            appointments={appointments}
            selectedDate={selectedDate}
            fullDays={fullDays}
            onDayClick={d => setSelectedDate(d === selectedDate ? null : d)}
          />
          {selectedDate && (
            <>
              {fullDays.includes(selectedDate) && (
                <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:14, padding:"1rem 1.4rem", marginTop:16, display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:20 }}>🚫</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#991b1b" }}>This day is fully booked</div>
                    <div style={{ fontSize:12, color:"#b91c1c", marginTop:2 }}>All available time slots for this day have been taken. Please select a different date or call us at (508) 306-1128.</div>
                  </div>
                </div>
              )}
              <DayDetail
                date={selectedDate}
                appointments={appointments}
                onCancel={handleCancel}
                onClose={() => setSelectedDate(null)}
                isFull={fullDays.includes(selectedDate)}
              />
            </>
          )}
          {appointments.length === 0 && (
            <EmptyState icon="📅" title="No appointments yet" subtitle="Request your first appointment above or call (508) 306-1128."
              action={<Btn onClick={()=>setShowForm(true)}>Request Appointment</Btn>}/>
          )}        </>
      ) : (
        <>
          {/* List view */}
          <SectionDivider label="Upcoming" color={T.accent}/>
          {upcoming.length===0 ? (
            <EmptyState icon="📅" title="No upcoming appointments" subtitle="Request an appointment above or call us at (508) 306-1128."
              action={!confirmedUpcoming ? <Btn onClick={()=>setShowForm(true)}>Request Appointment</Btn> : null}/>
          ) : upcoming.map(a=>{
            const isTelehealth = a.appointment_type === "telehealth";
            const winState = isTelehealth ? sessionWindowState(a.scheduled_at, a.telehealth_url) : null;
            return (
              <Card key={a.id} style={{ marginBottom:"0.75rem" }} accent={a.status==="requested"||a.status==="pending"?T.gold:T.green}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                      {a.appointment_type?.replace(/_/g," ")||"Appointment"}
                      {isTelehealth && <span title="Telehealth">📹</span>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      <span style={{ fontSize:12, color:T.muted }}>📅 {fmt(a.scheduled_at)}</span>
                      <span style={{ fontSize:12, color:T.muted }}>📍 {a.location||"Location TBD"}</span>
                      <span style={{ fontSize:12, color:T.muted }}>👨‍⚕️ {a.provider_name}</span>
                      {a.notes&&<span style={{ fontSize:11, color:T.muted2, fontStyle:"italic", marginTop:2 }}>"{a.notes}"</span>}
                    </div>
                    {isTelehealth && (
                      <div style={{ marginTop:8 }}>
                        {winState === "in_window" && (
                          <button onClick={() => window.open(a.telehealth_url, "_blank")} style={{ background:T.accent, border:"none", borderRadius:20, padding:"6px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>📹 Join Video Session</button>
                        )}
                        {winState === "before_window" && (
                          <span style={{ fontSize:12, color:T.muted }}>Session opens 10 min before your appointment</span>
                        )}
                        {winState === "no_url" && (
                          <span style={{ fontSize:12, color:T.muted }}>Video link coming soon</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                    <Badge status={a.status}/>
                    {a.status==="upcoming"&&<Btn variant="danger" small onClick={()=>handleCancel(a.id)}>Cancel</Btn>}
                  </div>
                </div>
              </Card>
            );
          })}

          {past.length>0&&(
            <>
              <SectionDivider label="Past Appointments" color={T.muted}/>
              {past.map(a=>(
                <Card key={a.id} style={{ marginBottom:"0.75rem", opacity:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{a.appointment_type?.replace(/_/g," ")||"Appointment"}</div>
                      <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>📅 {fmt(a.scheduled_at)} · {a.location||"—"}</div>
                    </div>
                    <Badge status={a.status}/>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
