import { useState, useEffect } from "react";
import { getVisitNotes } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, EmptyState, T } from "./PortalUI";

export default function PortalVisitNotes({ userId, P }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if(!userId) return;
    getVisitNotes(userId).then(data=>setNotes(Array.isArray(data)?data:[])).catch(()=>setNotes([])).finally(()=>setLoading(false));
  }, [userId]);

  const fmt = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "—";

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <PageHeader
        icon="📋" label="Visit Notes"
        title="Your Visit Notes"
        subtitle="Notes from your appointments — read only"
        gradient={`linear-gradient(135deg,${T.teal}15,#f0fdfa)`}
      />

      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : notes.length===0 ? (
        <EmptyState icon="📋" title="No visit notes yet" subtitle="Notes from your appointments will appear here after each visit."/>
      ) : notes.map(n=>(
        <Card key={n.id} style={{ marginBottom:"0.75rem" }} accent={expanded===n.id?T.teal:undefined}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }} onClick={()=>setExpanded(expanded===n.id?null:n.id)}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${T.teal}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📋</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{fmt(n.note_date)}</div>
                  <div style={{ fontSize:12, color:T.muted }}>👨‍⚕️ {n.clinician_name}</div>
                </div>
              </div>
              {n.chief_complaint&&<div style={{ fontSize:12, color:T.muted, marginLeft:46 }}>Chief complaint: <em>{n.chief_complaint}</em></div>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:11, color:T.accent, fontWeight:500 }}>{expanded===n.id?"Hide":"View"}</span>
              <span style={{ color:T.accent, fontSize:16, transition:"transform .2s", transform:expanded===n.id?"rotate(180deg)":"none", display:"inline-block" }}>▼</span>
            </div>
          </div>

          {expanded===n.id&&(
            <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:14 }}>
              {n.assessment&&(
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:T.muted2, marginBottom:6 }}>Assessment</div>
                  <p style={{ fontSize:13, color:T.text, lineHeight:1.75, margin:0, padding:"10px 14px", background:"#f9fafb", borderRadius:10 }}>{n.assessment}</p>
                </div>
              )}
              {n.plan&&(
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:T.muted2, marginBottom:6 }}>Treatment Plan</div>
                  <p style={{ fontSize:13, color:T.text, lineHeight:1.75, margin:0, padding:"10px 14px", background:"#f9fafb", borderRadius:10 }}>{n.plan}</p>
                </div>
              )}
              {n.follow_up&&(
                <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#1d4ed8", marginBottom:6 }}>Follow-up Instructions</div>
                  <p style={{ fontSize:13, color:"#1e40af", lineHeight:1.75, margin:0 }}>{n.follow_up}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      <Card style={{ marginTop:"1rem", background:"#f0fdfa", border:`1px solid ${T.teal}30` }}>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.7 }}>
          Questions about your visit notes? Contact us at <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:T.teal }}>info@mindshiftwellnessclinic.org</a> or call <a href="tel:5083061128" style={{ color:T.teal }}>(508) 306-1128</a>.
        </div>
      </Card>
    </div>
  );
}
