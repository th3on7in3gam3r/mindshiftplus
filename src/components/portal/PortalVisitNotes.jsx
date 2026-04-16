import { useState, useEffect } from "react";
import { getVisitNotes } from "../../lib/clinicApi";

function Card({ children, style={} }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

export default function PortalVisitNotes({ userId, P }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getVisitNotes(userId)
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const fmt = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : "—";

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.8rem" }}>
        <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Visit Notes</div>
        <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Your Visit Notes</h1>
        <p style={{ fontSize:13, color:P.muted, marginTop:4 }}>Notes from your appointments with Kenneth Mutegyeki, PMHNP. Read-only.</p>
      </div>

      {loading ? <div style={{ color:P.muted, fontSize:13 }}>Loading…</div>
      : notes.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
          <div style={{ fontWeight:600, color:P.text, marginBottom:6 }}>No visit notes yet</div>
          <div style={{ color:P.muted, fontSize:13 }}>Notes from your appointments will appear here after each visit.</div>
        </Card>
      ) : notes.map(n => (
        <Card key={n.id} style={{ marginBottom:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }} onClick={()=>setExpanded(expanded===n.id?null:n.id)}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:P.text, marginBottom:3 }}>{fmt(n.note_date)}</div>
              <div style={{ fontSize:12, color:P.muted }}>👨‍⚕️ {n.clinician_name}</div>
              {n.chief_complaint && <div style={{ fontSize:12, color:P.muted, marginTop:2 }}>Chief complaint: {n.chief_complaint}</div>}
            </div>
            <span style={{ color:P.accent, fontSize:18, flexShrink:0 }}>{expanded===n.id?"▲":"▼"}</span>
          </div>

          {expanded === n.id && (
            <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:`1px solid ${P.border}`, display:"flex", flexDirection:"column", gap:12 }}>
              {n.assessment && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.muted2, marginBottom:4 }}>Assessment</div>
                  <p style={{ fontSize:13, color:P.text, lineHeight:1.7 }}>{n.assessment}</p>
                </div>
              )}
              {n.plan && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.muted2, marginBottom:4 }}>Treatment Plan</div>
                  <p style={{ fontSize:13, color:P.text, lineHeight:1.7 }}>{n.plan}</p>
                </div>
              )}
              {n.follow_up && (
                <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.75rem 1rem" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#1d4ed8", marginBottom:4 }}>Follow-up</div>
                  <p style={{ fontSize:13, color:"#1e40af", lineHeight:1.7 }}>{n.follow_up}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      <Card style={{ marginTop:"1rem", background:"#f0fdfa", border:"1px solid #99f6e4" }}>
        <div style={{ fontSize:13, color:P.muted, lineHeight:1.7 }}>
          Questions about your visit notes? Contact us at <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:P.teal }}>info@mindshiftwellnessclinic.org</a> or call <a href="tel:5083061128" style={{ color:P.teal }}>(508) 306-1128</a>.
        </div>
      </Card>
    </div>
  );
}
