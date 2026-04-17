import { useState, useEffect } from "react";
import { bookAppointment } from "../../lib/clinicApi";
import { emailAppointmentRequested } from "../../lib/emailService";
import { supabase } from "../../lib/supabase";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  pearl:  "#f5f0ee", cream: "#ede8e3", ink: "#06080f", txt: "#1a1c2e",
  muted:  "#6b6d80", muted2: "#9b9dae",
  violet: "#6b5fcf", lilac: "#9d8ff0", teal: "#2a9d8f", sage: "#52b788",
  blush:  "#e07a8f", border: "#e5e0da",
  serif:  "'Cormorant Garamond',Georgia,serif",
  sans:   "'DM Sans',system-ui,sans-serif",
};

const REASONS = [
  "Initial Evaluation", "Medication Management", "Follow-up Visit",
  "Telehealth Consultation", "Anxiety / Depression", "ADHD Evaluation",
  "Trauma / PTSD", "Bipolar / Mood Disorder", "Other",
];

const CLINICIANS = [
  { name: "Kenneth Mutegyeki, PMHNP-BC", emoji: "👨🏾‍⚕️" },
  { name: "Rachel Nakkazi, PMHNP-BC",    emoji: "👩🏾‍⚕️" },
];

// Available days: Mon(1), Thu(4), Fri(5), Sat(6)
const AVAIL_DAYS = [1, 4, 5, 6];
const SLOTS_BY_DOW = {
  1: ["6:00 PM", "7:00 PM"],
  4: ["6:00 PM", "7:00 PM"],
  5: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"],
  6: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"],
};

function fmtDate(d) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : "";
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:20, padding:"1.8rem", boxShadow:"0 2px 12px rgba(107,95,207,0.07)", ...style }}>
      {children}
    </div>
  );
}

function Inp({ label, type="text", value, onChange, placeholder, required, options }) {
  const base = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.txt, background:"#fff", outline:"none", fontFamily:C.sans, transition:"border-color .2s" };
  const focus = e => { e.target.style.borderColor=C.violet; e.target.style.boxShadow=`0 0 0 3px rgba(107,95,207,0.1)`; };
  const blur  = e => { e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; };
  return (
    <div>
      <label style={{ fontSize:12, fontWeight:500, color:C.txt, display:"block", marginBottom:5 }}>
        {label}{required && <span style={{ color:C.blush }}> *</span>}
      </label>
      {options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} required={required} style={base} onFocus={focus} onBlur={blur}>
          <option value="">Select…</option>
          {options.map(o=><option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} style={base} onFocus={focus} onBlur={blur}/>
      )}
    </div>
  );
}

function Steps({ current }) {
  const steps = ["Date", "Time", "Details", "Confirm"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:"2rem" }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background: done ? C.teal : active ? C.violet : C.cream, border:`2px solid ${done ? C.teal : active ? C.violet : C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color: done||active ? "#fff" : C.muted2, transition:"all .3s" }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize:10, fontWeight: active ? 600 : 400, color: active ? C.violet : C.muted2, whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex:1, height:2, background: done ? C.teal : C.border, margin:"0 6px", marginBottom:16, transition:"background .3s" }}/>}
          </div>
        );
      })}
    </div>
  );
}

function Calendar({ selected, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const toStr = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const isPast  = d => new Date(toStr(d)) < today;
  const isAvail = d => AVAIL_DAYS.includes(new Date(toStr(d)+"T12:00:00").getDay()) && !isPast(d);
  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button onClick={()=>setView(new Date(year,month-1,1))} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, width:32, height:32, cursor:"pointer", color:C.muted, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <span style={{ fontFamily:C.serif, fontSize:"1.1rem", fontWeight:600, color:C.txt }}>{view.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
        <button onClick={()=>setView(new Date(year,month+1,1))} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, width:32, height:32, cursor:"pointer", color:C.muted, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:C.muted2, padding:"4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d,i) => {
          if (!d) return <div key={`e${i}`}/>;
          const ds = toStr(d), avail = isAvail(d), sel = selected === ds;
          return (
            <button key={d} onClick={()=>avail&&onSelect(ds)} disabled={!avail} style={{ aspectRatio:"1", borderRadius:10, border:"none", fontSize:13, fontWeight: sel ? 700 : 400, background: sel ? C.violet : "transparent", color: sel ? "#fff" : avail ? C.txt : C.muted2, cursor: avail ? "pointer" : "default", opacity: avail ? 1 : 0.3, transition:"all .15s" }}
              onMouseOver={e=>{ if(avail&&!sel) e.currentTarget.style.background=C.cream; }}
              onMouseOut={e=>{ if(avail&&!sel) e.currentTarget.style.background="transparent"; }}
            >{d}</button>
          );
        })}
      </div>
      <div style={{ marginTop:12, fontSize:11, color:C.muted2 }}>
        Available: Mon & Thu evenings · Fri & Sat all day
      </div>
    </div>
  );
}

function TimeSlots({ date, selected, onSelect, bookedTimes }) {
  const dow = date ? new Date(date+"T12:00:00").getDay() : 1;
  const times = SLOTS_BY_DOW[dow] || [];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8 }}>
      {times.map(t => {
        const isBooked = bookedTimes.includes(t);
        const isSel = selected === t;
        return (
          <button key={t} onClick={()=>!isBooked&&onSelect(t)} disabled={isBooked} style={{ padding:"10px 6px", borderRadius:10, fontSize:13, fontWeight: isSel ? 700 : 500, border: isSel ? `2px solid ${C.violet}` : `1.5px solid ${C.border}`, background: isSel ? C.violet : isBooked ? C.cream : "#fff", color: isSel ? "#fff" : isBooked ? C.muted2 : C.txt, cursor: isBooked ? "not-allowed" : "pointer", transition:"all .15s", textDecoration: isBooked ? "line-through" : "none" }}
            onMouseOver={e=>{ if(!isBooked&&!isSel) e.currentTarget.style.borderColor=C.violet; }}
            onMouseOut={e=>{ if(!isBooked&&!isSel) e.currentTarget.style.borderColor=C.border; }}
          >{t}</button>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PublicBooking({ onBack }) {
  const [step, setStep]   = useState(1);
  const [date, setDate]   = useState("");
  const [time, setTime]   = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm]   = useState({ name:"", email:"", phone:"", reason:"", clinician: CLINICIANS[0].name, notes:"" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone]   = useState(false);

  // Pre-fill if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setForm(f => ({
          ...f,
          name:  f.name  || session.user.user_metadata?.full_name || "",
          email: f.email || session.user.email || "",
        }));
      }
    });
  }, []);

  // Load already-booked slots when date changes
  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    const from = `${date}T00:00:00`;
    const to   = `${date}T23:59:59`;
    supabase.from("appointments")
      .select("scheduled_at")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to)
      .not("status", "eq", "cancelled")
      .then(({ data }) => {
        const taken = (data || []).map(a => {
          const h = new Date(a.scheduled_at).getHours();
          const m = new Date(a.scheduled_at).getMinutes();
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
        });
        setBookedTimes(taken);
        setLoadingSlots(false);
      });
  }, [date]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError("Please fill in your name and email."); return; }
    setSubmitting(true); setError("");

    // Convert "8:00 AM" → "08:00" for ISO datetime
    const timeToISO = (t) => {
      const [timePart, ampm] = t.split(" ");
      let [h, m] = timePart.split(":").map(Number);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    };

    try {
      await bookAppointment({
        name:             form.name,
        email:            form.email,
        phone:            form.phone,
        reason:           form.reason,
        notes:            form.notes,
        scheduled_at:     `${date}T${timeToISO(time)}:00`,
        duration_minutes: 60,
        location:         "Milford",
        appointment_type: form.reason?.toLowerCase().replace(/\s+/g,"_") || "consultation",
        provider_name:    form.clinician,
        patient_id:       null,
        is_public:        true,
        status:           "pending",
      });

      // Non-blocking email
      emailAppointmentRequested({
        name: form.name, email: form.email,
        date: fmtDate(date), time, clinician: form.clinician,
        reason: form.reason, location: "Milford, MA",
      }).catch(() => {});

      setDone(true);
    } catch (err) {
      setError(`Booking failed: ${err.message}. Please call (508) 306-1128.`);
    }
    setSubmitting(false);
  };

  // ── Confirmation ─────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight:"100vh", background:C.pearl, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:C.sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box}`}</style>
      <Card style={{ maxWidth:520, width:"100%", textAlign:"center", padding:"3rem" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(82,183,136,0.12)", border:`2px solid ${C.sage}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 1.5rem" }}>✓</div>
        <div style={{ fontFamily:C.serif, fontSize:"1.8rem", fontWeight:300, color:C.txt, marginBottom:8 }}>Request Received!</div>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.8, marginBottom:"1.5rem" }}>
          Thank you, <strong>{form.name}</strong>.<br/>
          Your appointment request for <strong>{fmtDate(date)}</strong> at <strong>{time}</strong><br/>
          with <strong>{form.clinician}</strong> has been submitted.
        </p>
        <div style={{ background:"rgba(82,183,136,0.08)", border:`1px solid rgba(82,183,136,0.25)`, borderRadius:12, padding:"1rem 1.2rem", marginBottom:"1.5rem", fontSize:13, color:"#166534", lineHeight:1.7, textAlign:"left" }}>
          <div style={{ fontWeight:600, marginBottom:4 }}>What happens next?</div>
          <div>📧 Confirmation sent to <strong>{form.email}</strong></div>
          <div>📞 We'll confirm within 1 business day</div>
          <div>🏥 Location: 31 Granite St. Suite #2, Milford, MA</div>
        </div>
        <p style={{ fontSize:12, color:C.muted2, marginBottom:"1.5rem" }}>
          Questions? Call <a href="tel:5083061128" style={{ color:C.violet, textDecoration:"none" }}>(508) 306-1128</a>
        </p>
        {onBack && (
          <button onClick={onBack} style={{ background:C.violet, border:"none", borderRadius:30, padding:"11px 28px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            ← Back to Clinic Site
          </button>
        )}
      </Card>
    </div>
  );

  // ── Main booking flow ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.pearl, fontFamily:C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        @media(max-width:767px){
          .bk-grid{grid-template-columns:1fr !important}
          .bk-summary{display:none !important}
        }
      `}</style>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"1rem 5%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg,${C.violet},${C.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏥</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.txt }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize:11, color:C.muted }}>Book an Appointment</div>
          </div>
        </div>
        {onBack && <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:20, padding:"7px 16px", fontSize:13, color:C.muted, cursor:"pointer" }}>← Back</button>}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"2rem 5%" }}>
        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <h1 style={{ fontFamily:C.serif, fontSize:"clamp(1.8rem,4vw,2.6rem)", fontWeight:300, color:C.txt, marginBottom:8 }}>
            Book Your <em style={{ fontStyle:"italic", color:C.violet }}>Appointment</em>
          </h1>
          <p style={{ fontSize:14, color:C.muted }}>No account needed — just pick a time and we'll confirm within 1 business day.</p>
        </div>

        <Steps current={step} />

        <div className="bk-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, alignItems:"start" }}>

          {/* Left: step content */}
          <div>
            {/* Step 1: Pick date */}
            {step === 1 && (
              <Card>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.violet, marginBottom:16 }}>Step 1 — Choose a Date</div>
                <Calendar selected={date} onSelect={d => { setDate(d); setTime(""); }} />
                <div style={{ marginTop:"1.5rem", display:"flex", justifyContent:"flex-end" }}>
                  <button onClick={()=>setStep(2)} disabled={!date} style={{ background: date ? C.violet : C.cream, border:"none", borderRadius:30, padding:"11px 28px", color: date ? "#fff" : C.muted2, fontSize:14, fontWeight:600, cursor: date ? "pointer" : "not-allowed", transition:"all .2s" }}>
                    Next: Choose Time →
                  </button>
                </div>
              </Card>
            )}

            {/* Step 2: Pick time */}
            {step === 2 && (
              <Card>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.violet, marginBottom:4 }}>Step 2 — Choose a Time</div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{fmtDate(date)}</div>
                {loadingSlots ? (
                  <div style={{ textAlign:"center", padding:"2rem", color:C.muted }}>Loading available times…</div>
                ) : (
                  <TimeSlots date={date} selected={time} onSelect={setTime} bookedTimes={bookedTimes} />
                )}
                <div style={{ marginTop:"1.5rem", display:"flex", justifyContent:"space-between" }}>
                  <button onClick={()=>setStep(1)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:30, padding:"11px 22px", fontSize:13, color:C.muted, cursor:"pointer" }}>← Back</button>
                  <button onClick={()=>setStep(3)} disabled={!time} style={{ background: time ? C.violet : C.cream, border:"none", borderRadius:30, padding:"11px 28px", color: time ? "#fff" : C.muted2, fontSize:14, fontWeight:600, cursor: time ? "pointer" : "not-allowed", transition:"all .2s" }}>
                    Next: Your Details →
                  </button>
                </div>
              </Card>
            )}

            {/* Step 3: Patient details */}
            {step === 3 && (
              <Card>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.violet, marginBottom:16 }}>Step 3 — Your Information</div>
                <form onSubmit={e => { e.preventDefault(); setStep(4); }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                    <Inp label="Full Name" value={form.name} onChange={set("name")} placeholder="Your full name" required />
                    <Inp label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
                    <Inp label="Phone Number" type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" />
                    <Inp label="Reason for Visit" value={form.reason} onChange={set("reason")} options={REASONS} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <Inp label="Preferred Clinician" value={form.clinician} onChange={set("clinician")} options={CLINICIANS.map(c=>c.name)} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:C.txt, display:"block", marginBottom:5 }}>Additional Notes (optional)</label>
                    <textarea value={form.notes} onChange={e=>set("notes")(e.target.value)} placeholder="Anything else you'd like us to know…" rows={3} style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.txt, background:"#fff", outline:"none", fontFamily:C.sans, resize:"vertical" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <button type="button" onClick={()=>setStep(2)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:30, padding:"11px 22px", fontSize:13, color:C.muted, cursor:"pointer" }}>← Back</button>
                    <button type="submit" style={{ background:C.violet, border:"none", borderRadius:30, padding:"11px 28px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>Review & Confirm →</button>
                  </div>
                </form>
              </Card>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <Card>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.violet, marginBottom:16 }}>Step 4 — Confirm Your Appointment</div>
                {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:14 }}>{error}</div>}

                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:"1.5rem" }}>
                  {[
                    ["📅", "Date & Time", `${fmtDate(date)} at ${time}`],
                    ["👨‍⚕️", "Clinician",   form.clinician],
                    ["👤", "Name",        form.name],
                    ["✉️", "Email",       form.email],
                    ["📞", "Phone",       form.phone || "—"],
                    ["🩺", "Reason",      form.reason || "—"],
                    ["🏥", "Location",    "31 Granite St. Suite #2, Milford, MA"],
                  ].map(([icon, label, val]) => (
                    <div key={label} style={{ display:"flex", gap:12, padding:"10px 14px", background:"rgba(107,95,207,0.04)", borderRadius:10 }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                        <div style={{ fontSize:14, color:C.txt, marginTop:2 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#92400e", marginBottom:"1.5rem", lineHeight:1.6 }}>
                  ⚠️ This is a <strong>request</strong> — not a confirmed appointment. We'll contact you within 1 business day to confirm.
                </div>

                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <button onClick={()=>setStep(3)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:30, padding:"11px 22px", fontSize:13, color:C.muted, cursor:"pointer" }}>← Edit</button>
                  <button onClick={handleSubmit} disabled={submitting} style={{ background:`linear-gradient(135deg,${C.violet},${C.teal})`, border:"none", borderRadius:30, padding:"13px 32px", color:"#fff", fontSize:14, fontWeight:700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow:"0 4px 16px rgba(107,95,207,0.3)" }}>
                    {submitting ? "Submitting…" : "✓ Confirm Appointment Request"}
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: summary sidebar */}
          <div className="bk-summary">
            <Card style={{ position:"sticky", top:24 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.violet, marginBottom:14 }}>Your Selection</div>
              {date ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:13, color:C.txt }}><span style={{ color:C.muted, display:"block", fontSize:11 }}>Date</span>{fmtDate(date)}</div>
                  {time && <div style={{ fontSize:13, color:C.txt }}><span style={{ color:C.muted, display:"block", fontSize:11 }}>Time</span>{time}</div>}
                  {form.clinician && <div style={{ fontSize:13, color:C.txt }}><span style={{ color:C.muted, display:"block", fontSize:11 }}>Clinician</span>{form.clinician}</div>}
                  {form.name && <div style={{ fontSize:13, color:C.txt }}><span style={{ color:C.muted, display:"block", fontSize:11 }}>Patient</span>{form.name}</div>}
                </div>
              ) : (
                <div style={{ fontSize:13, color:C.muted2 }}>Select a date to get started.</div>
              )}
              <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Need help?</div>
                <a href="tel:5083061128" style={{ display:"block", fontSize:13, color:C.violet, textDecoration:"none", marginBottom:4 }}>📞 (508) 306-1128</a>
                <a href="mailto:info@mindshiftwellnessclinic.org" style={{ display:"block", fontSize:12, color:C.muted, textDecoration:"none" }}>✉️ info@mindshiftwellnessclinic.org</a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
