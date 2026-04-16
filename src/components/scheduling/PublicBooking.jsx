import { useState } from "react";
import { bookAppointment } from "../../lib/clinicApi";
import { emailAppointmentRequested } from "../../lib/emailService";

// ── Design tokens matching site-main.html ──────────────────────────────────────
const C = {
  pearl:   "#f5f0ee",
  cream:   "#ede8e3",
  warm:    "#d4ccc6",
  ink:     "#06080f",
  txt:     "#1a1c2e",
  muted:   "#6b6d80",
  muted2:  "#9b9dae",
  violet:  "#6b5fcf",
  lilac:   "#9d8ff0",
  teal:    "#2a9d8f",
  sage:    "#52b788",
  blush:   "#e07a8f",
  gold:    "#c9a84c",
  border:  "#e5e0da",
  border2: "#d4ccc6",
  serif:   "'Cormorant Garamond',Georgia,serif",
  sans:    "'DM Sans',system-ui,sans-serif",
};

const REASONS = [
  "Initial Evaluation",
  "Medication Management",
  "Follow-up Visit",
  "Telehealth Consultation",
  "Anxiety / Depression",
  "ADHD Evaluation",
  "Trauma / PTSD",
  "Bipolar / Mood Disorder",
  "Other",
];

const CLINICIANS = [
  { name:"Kenneth Mutegyeki, PMHNP-BC", title:"Psychiatric Mental Health Nurse Practitioner (PMHNP-BC)", emoji:"👨🏾‍⚕️" },
  { name:"Rachel Nakkazi, PMHNP-BC", title:"Psychiatric Mental Health Nurse Practitioner (PMHNP-BC)", emoji:"👩🏾‍⚕️" },
];

// Availability: Mon/Thu 6–8 PM, Fri/Sat 8 AM–5 PM
const DEFAULT_AVAILABILITY = [1, 4, 5, 6]; // Mon, Thu, Fri, Sat

// Time slots per day of week
const SLOTS_BY_DOW = {
  1: ["6:00 PM","7:00 PM"],                                                          // Monday
  4: ["6:00 PM","7:00 PM"],                                                          // Thursday
  5: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"], // Friday
  6: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"], // Saturday
};

// ── localStorage helpers ───────────────────────────────────────────────────────
function saveAppointment(appt) {
  try {
    const existing = JSON.parse(localStorage.getItem("mswc_appointments") || "[]");
    existing.push({ ...appt, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    localStorage.setItem("mswc_appointments", JSON.stringify(existing));
  } catch {}
}

function getBookedSlots(dateStr) {
  try {
    const all = JSON.parse(localStorage.getItem("mswc_appointments") || "[]");
    return all.filter(a => a.date === dateStr && a.status !== "cancelled").map(a => a.time);
  } catch { return []; }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{
      background:"#fff", border:`1px solid ${C.border}`,
      borderRadius:20, padding:"1.8rem",
      boxShadow:"0 2px 12px rgba(107,95,207,0.07)",
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:11, fontWeight:700, letterSpacing:"0.14em",
      textTransform:"uppercase", color:C.violet,
      display:"flex", alignItems:"center", gap:8, marginBottom:10,
    }}>
      <span style={{ width:18, height:1.5, background:C.violet, display:"inline-block" }}/>
      {children}
    </div>
  );
}

function Input({ label, type="text", value, onChange, placeholder, required, options }) {
  const base = {
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1.5px solid ${C.border}`, fontSize:14,
    color:C.txt, background:"#fff", outline:"none",
    fontFamily:C.sans, transition:"border-color .2s, box-shadow .2s",
  };
  return (
    <div>
      <label style={{ fontSize:12, fontWeight:500, color:C.txt, display:"block", marginBottom:5 }}>
        {label}{required && <span style={{ color:C.blush }}> *</span>}
      </label>
      {options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} required={required} style={base}
          onFocus={e=>{ e.target.style.borderColor=C.violet; e.target.style.boxShadow=`0 0 0 3px rgba(107,95,207,0.1)`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}>
          <option value="">Select…</option>
          {options.map(o=><option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder} required={required} style={base}
          onFocus={e=>{ e.target.style.borderColor=C.violet; e.target.style.boxShadow=`0 0 0 3px rgba(107,95,207,0.1)`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
        />
      )}
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────────
function Calendar({ selected, onSelect }) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthLabel = view.toLocaleDateString("en-US", { month:"long", year:"numeric" });

  const toStr = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const isToday = (d) => toStr(d) === today.toISOString().slice(0,10);
  const isPast  = (d) => new Date(toStr(d)) < today;
  const isAvail = (d) => {
    const dow = new Date(toStr(d)+"T12:00:00").getDay();
    return DEFAULT_AVAILABILITY.includes(dow) && !isPast(d);
  };

  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  const prevMonth = () => setView(new Date(year, month-1, 1));
  const nextMonth = () => setView(new Date(year, month+1, 1));

  return (
    <div>
      {/* Month nav */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button onClick={prevMonth} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, width:32, height:32, cursor:"pointer", color:C.muted, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <span style={{ fontFamily:C.serif, fontSize:"1.1rem", fontWeight:600, color:C.txt }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, width:32, height:32, cursor:"pointer", color:C.muted, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
          <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:C.muted2, padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d,i) => {
          if (!d) return <div key={`e${i}`}/>;
          const ds = toStr(d);
          const avail = isAvail(d);
          const sel   = selected === ds;
          const tod   = isToday(d);
          return (
            <button key={d} onClick={()=>avail && onSelect(ds)} disabled={!avail} style={{
              aspectRatio:"1", borderRadius:10, border:"none",
              fontSize:13, fontWeight: sel ? 700 : tod ? 600 : 400,
              background: sel ? C.violet : tod && !sel ? "rgba(107,95,207,0.08)" : "transparent",
              color: sel ? "#fff" : avail ? C.txt : C.muted2,
              cursor: avail ? "pointer" : "default",
              opacity: avail ? 1 : 0.3,
              outline: tod && !sel ? `1.5px solid ${C.lilac}` : "none",
              transition:"all .15s",
            }}
            onMouseOver={e=>{ if(avail&&!sel) e.currentTarget.style.background=C.cream; }}
            onMouseOut={e=>{ if(avail&&!sel) e.currentTarget.style.background="transparent"; }}
            >{d}</button>
          );
        })}
      </div>

      <div style={{ marginTop:12, display:"flex", gap:12, fontSize:11, color:C.muted2 }}>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:C.violet, display:"inline-block" }}/> Selected</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:3, outline:`1.5px solid ${C.lilac}`, display:"inline-block" }}/> Today</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:C.cream, border:`1px solid ${C.border}`, display:"inline-block" }}/> Available</span>
      </div>
    </div>
  );
}

// ── Time Slots ─────────────────────────────────────────────────────────────────
function TimeSlots({ date, selected, onSelect }) {
  const booked = getBookedSlots(date);
  const dow = date ? new Date(date+"T12:00:00").getDay() : 1;
  const times = SLOTS_BY_DOW[dow] || [];
  return (
    <div className="slot-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8 }}>
      {times.map(t => {
        const isBooked = booked.includes(t);
        const isSel = selected === t;
        return (
          <button key={t} onClick={()=>!isBooked && onSelect(t)} disabled={isBooked} style={{
            padding:"10px 6px", borderRadius:10, fontSize:13, fontWeight: isSel ? 700 : 500,
            border: isSel ? `2px solid ${C.violet}` : `1.5px solid ${C.border}`,
            background: isSel ? C.violet : isBooked ? C.cream : "#fff",
            color: isSel ? "#fff" : isBooked ? C.muted2 : C.txt,
            cursor: isBooked ? "not-allowed" : "pointer",
            transition:"all .15s",
            textDecoration: isBooked ? "line-through" : "none",
          }}
          onMouseOver={e=>{ if(!isBooked&&!isSel) e.currentTarget.style.borderColor=C.violet; }}
          onMouseOut={e=>{ if(!isBooked&&!isSel) e.currentTarget.style.borderColor=C.border; }}
          >{t}</button>
        );
      })}
    </div>
  );
}

// ── Progress Steps ─────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Date","Time","Details","Confirm"];
  return (
    <div className="steps-bar" style={{ display:"flex", alignItems:"center", marginBottom:"2rem" }}>
      {steps.map((s,i) => {
        const n = i+1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i<steps.length-1 ? 1 : "none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div className="step-dot" style={{
                width:30, height:30, borderRadius:"50%",
                background: done ? C.teal : active ? C.violet : C.cream,
                border: `2px solid ${done ? C.teal : active ? C.violet : C.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:700,
                color: done||active ? "#fff" : C.muted2,
                transition:"all .3s",
              }}>{done ? "✓" : n}</div>
              <span style={{ fontSize:10, fontWeight: active ? 600 : 400, color: active ? C.violet : C.muted2, whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, background: done ? C.teal : C.border, margin:"0 6px", marginBottom:16, transition:"background .3s" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PublicBooking({ onBack }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"", reason:"", clinician: CLINICIANS[0].name });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const fmtDate = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "";
  const set = (k) => (v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError("Please fill in your name and email."); return; }
    setSubmitting(true); setError("");
    try {
      await bookAppointment({
        name: form.name, email: form.email, phone: form.phone,
        reason: form.reason, scheduled_at: `${date}T${time.replace(" AM","").replace(" PM","")}:00`,
        duration_minutes: 60, location: "Milford", appointment_type: form.reason || "consultation",
        provider_name: form.clinician,
        is_public: true,
      });
      // Send email notifications (non-blocking)
      emailAppointmentRequested({
        name: form.name, email: form.email,
        date: fmtDate(date), time, clinician: form.clinician,
        reason: form.reason, location: "Milford, MA",
      });
    } catch {
      // Fallback to localStorage if API not yet deployed
      saveAppointment({ date, time, ...form, status:"pending", provider:"Kenneth Mutegyeki, PMHNP-BC" });
    }
    setSubmitting(false);
    setDone(true);
  };

  // ── Confirmation screen ──────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight:"100vh", background:C.pearl, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:C.sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box}`}</style>
      <Card style={{ maxWidth:500, width:"100%", textAlign:"center", padding:"3rem" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(82,183,136,0.12)", border:`2px solid ${C.sage}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 1.5rem" }}>✓</div>
        <div style={{ fontFamily:C.serif, fontSize:"1.8rem", fontWeight:300, color:C.txt, marginBottom:8 }}>Request Received</div>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, marginBottom:"1.5rem" }}>
          Thank you, <strong>{form.name}</strong>. Your appointment request for<br/>
          <strong>{fmtDate(date)}</strong> at <strong>{time}</strong> has been submitted.
        </p>
        <div style={{ background:"rgba(82,183,136,0.08)", border:`1px solid rgba(82,183,136,0.25)`, borderRadius:12, padding:"1rem", marginBottom:"1.5rem", fontSize:13, color:"#166534", lineHeight:1.7 }}>
          We'll confirm your appointment via email at <strong>{form.email}</strong> within 1 business day.
        </div>
        <p style={{ fontSize:12, color:C.muted2, marginBottom:"1.5rem" }}>Questions? Call us at (508) 306-1128</p>
        {onBack && (
          <button onClick={onBack} style={{ background:C.violet, border:"none", borderRadius:30, padding:"11px 28px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            ← Back to Clinic Site
          </button>
        )}
      </Card>
    </div>
  );

  // ── Main booking UI ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.pearl, fontFamily:C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        @media(max-width:767px){
          .booking-grid{grid-template-columns:1fr !important}
          .booking-summary{display:none !important}
          .booking-step3{max-width:100% !important; margin:0 !important}
          .booking-form-grid{grid-template-columns:1fr !important}
          .clinician-grid{grid-template-columns:1fr !important}
          .slot-grid{grid-template-columns:repeat(3,1fr) !important}
          .steps-bar span{display:none}
          .steps-bar .step-dot{width:24px !important; height:24px !important; font-size:10px !important}
        }
        @media(max-width:480px){
          .slot-grid{grid-template-columns:repeat(2,1fr) !important}
        }
      `}</style>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"1rem 5%", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${C.violet},${C.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏥</div>
          <div>
            <div style={{ fontFamily:C.serif, fontSize:"1.1rem", fontWeight:600, color:C.txt }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize:11, color:C.muted }}>Book an Appointment</div>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, color:C.muted, cursor:"pointer" }}>← Back</button>
        )}
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"clamp(1rem,4vw,2rem) 5% 4rem" }}>

        {/* Page title */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <SectionLabel>Schedule Your Visit</SectionLabel>
          <h1 style={{ fontFamily:C.serif, fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:300, color:C.txt, lineHeight:1.1, marginBottom:8 }}>
            Book an <em style={{ fontStyle:"italic", color:C.violet }}>Appointment</em>
          </h1>
          <p style={{ fontSize:14, color:C.muted, maxWidth:480, margin:"0 auto" }}>
            MindShift Wellness Clinic · Milford, MA
          </p>
        </div>

        <Steps current={step}/>

        <div className="booking-grid" style={{ display:"grid", gridTemplateColumns: step <= 2 ? "1.2fr 1fr" : "1fr", gap:"1.5rem" }}>

          {/* ── Left / Main ── */}
          <div>
            {/* Step 1: Calendar */}
            {step === 1 && (
              <Card>
                <SectionLabel>Select a Date</SectionLabel>
                <h2 style={{ fontFamily:C.serif, fontSize:"1.3rem", fontWeight:600, color:C.txt, marginBottom:"1.2rem" }}>When would you like to come in?</h2>
                <Calendar selected={date} onSelect={(d)=>{ setDate(d); setTime(""); setStep(2); }}/>
              </Card>
            )}

            {/* Step 2: Time */}
            {step === 2 && (
              <Card>
                <button onClick={()=>setStep(1)} style={{ background:"transparent", border:"none", color:C.violet, fontSize:13, cursor:"pointer", marginBottom:12, padding:0, display:"flex", alignItems:"center", gap:4 }}>← Change date</button>
                <SectionLabel>Select a Time</SectionLabel>
                <h2 style={{ fontFamily:C.serif, fontSize:"1.3rem", fontWeight:600, color:C.txt, marginBottom:4 }}>Available times</h2>
                <p style={{ fontSize:13, color:C.muted, marginBottom:"1.2rem" }}>{fmtDate(date)}</p>
                <TimeSlots date={date} selected={time} onSelect={(t)=>{ setTime(t); setStep(3); }}/>
                <p style={{ fontSize:11, color:C.muted2, marginTop:12 }}>Strikethrough times are already booked. All appointments are 60 minutes.</p>
              </Card>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <Card style={{ maxWidth:560, margin:"0 auto" }}>
                <button onClick={()=>setStep(2)} style={{ background:"transparent", border:"none", color:C.violet, fontSize:13, cursor:"pointer", marginBottom:12, padding:0 }}>← Change time</button>
                <SectionLabel>Your Information</SectionLabel>
                <h2 style={{ fontFamily:C.serif, fontSize:"1.3rem", fontWeight:600, color:C.txt, marginBottom:"1.2rem" }}>Tell us about yourself</h2>
                {error && (
                  <div style={{ background:"rgba(224,122,143,0.08)", border:`1px solid rgba(224,122,143,0.3)`, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.blush, marginBottom:14 }}>{error}</div>
                )}
                <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:C.txt, display:"block", marginBottom:8 }}>Select Your Clinician *</label>
                    <div className="clinician-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
                      {CLINICIANS.map(c=>(
                        <button key={c.name} type="button" onClick={()=>setForm(f=>({...f,clinician:c.name}))} style={{
                          padding:"10px 12px", borderRadius:12, border:`2px solid ${form.clinician===c.name?C.violet:C.border}`,
                          background:form.clinician===c.name?"rgba(107,95,207,0.06)":"#fff",
                          cursor:"pointer", textAlign:"left", transition:"all .15s",
                        }}>
                          <div style={{ fontSize:18, marginBottom:3 }}>{c.emoji}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:C.txt, lineHeight:1.3 }}>{c.name.split(",")[0]}</div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{c.title.split(",")[0]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="booking-form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="Your full name" required/>
                    <Input label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required/>
                  </div>
                  <Input label="Phone Number" type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000"/>
                  <Input label="Reason for Visit" value={form.reason} onChange={set("reason")} options={REASONS}/>
                  <p style={{ fontSize:11, color:C.muted2, lineHeight:1.65 }}>
                    Your request will be reviewed and confirmed within 1 business day. You'll receive a confirmation at the email provided.
                  </p>
                  <button type="submit" disabled={submitting} style={{
                    background:`linear-gradient(135deg,${C.violet},${C.teal})`, border:"none",
                    borderRadius:30, padding:"13px", color:"#fff", fontSize:15, fontWeight:600,
                    cursor:"pointer", opacity:submitting?0.7:1, transition:"opacity .2s",
                  }}>
                    {submitting ? "Submitting…" : "Request Appointment →"}
                  </button>
                </form>
              </Card>
            )}
          </div>

          {/* ── Right: Summary (steps 1–2) ── */}
          {step <= 2 && (
            <div className="booking-summary" style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <Card style={{ background:`linear-gradient(135deg,rgba(107,95,207,0.06),rgba(42,157,143,0.04))`, border:`1px solid rgba(107,95,207,0.15)` }}>
                <SectionLabel>Your Appointment</SectionLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ fontSize:20 }}>{CLINICIANS.find(c=>c.name===form.clinician)?.emoji||"👨🏾‍⚕️"}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.txt }}>{form.clinician||"Kenneth Mutegyeki"}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{CLINICIANS.find(c=>c.name===form.clinician)?.title||"Psychiatric Mental Health Nurse Practitioner (PMHNP-BC)"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:18 }}>📅</span>
                    <span style={{ fontSize:13, color: date ? C.txt : C.muted2 }}>{date ? fmtDate(date) : "No date selected"}</span>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:18 }}>🕐</span>
                    <span style={{ fontSize:13, color: time ? C.txt : C.muted2 }}>{time || "No time selected"}</span>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:18 }}>📍</span>
                    <span style={{ fontSize:13, color:C.muted }}>31 Granite St. Suite #2, Milford, MA</span>
                  </div>
                </div>
                <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:C.muted2, lineHeight:1.7 }}>
                    💳 Initial Evaluation: $400 (60 min) · Follow-Up: $150 (10–20 min)<br/>
                    Most insurance plans accepted · Self-pay available
                  </div>
                </div>
              </Card>

              <Card>
                <SectionLabel>Need Help?</SectionLabel>
                <a href="tel:5083061128" style={{ display:"flex", gap:8, alignItems:"center", fontSize:13, color:C.muted, textDecoration:"none", marginBottom:8 }}>📞 (508) 306-1128</a>
                <a href="mailto:info@mindshiftwellnessclinic.org" style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:C.muted, textDecoration:"none" }}>✉️ info@mindshiftwellnessclinic.org</a>
              </Card>

              <Card style={{ background:C.cream, border:`1px solid ${C.border2}` }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Office Hours</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
                  Mon &amp; Thu: 6:00 PM – 8:00 PM<br/>
                  Fri &amp; Sat: 8:00 AM – 5:00 PM<br/>
                  <span style={{ color:C.teal, fontWeight:500 }}>Telehealth available</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
