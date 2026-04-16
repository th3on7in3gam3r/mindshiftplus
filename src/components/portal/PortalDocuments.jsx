import { useState, useEffect } from "react";
import { getDocuments } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, T } from "./PortalUI";

const TYPE_ICONS  = { intake_form:"📋", consent:"✍️", lab_result:"🧪", other:"📄" };
const TYPE_LABELS = { intake_form:"Intake Form", consent:"Consent Form", lab_result:"Lab Result", other:"Document" };

export default function PortalDocuments({ userId, P }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!userId) return;
    getDocuments(userId).then(data=>setDocuments(Array.isArray(data)?data:[])).catch(()=>setDocuments([])).finally(()=>setLoading(false));
  }, [userId]);

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const pending   = documents.filter(d=>d.status==="pending");
  const completed = documents.filter(d=>d.status!=="pending");

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <PageHeader
        icon="📄" label="Documents & Forms"
        title="Your Documents"
        subtitle="Intake forms, consent documents, and records"
        gradient={`linear-gradient(135deg,${T.gold}15,${T.accent}08)`}
      />

      {pending.length>0&&<Alert type="warning" icon="⚠️" title={`${pending.length} form${pending.length>1?"s":""} need${pending.length===1?"s":""} your attention`} subtitle="Please complete the forms below"/>}

      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : documents.length===0 ? (
        <EmptyState icon="📄" title="No documents yet" subtitle="Forms and documents shared by the clinic will appear here."/>
      ) : (
        <>
          {pending.length>0&&(
            <>
              <SectionDivider label="Needs Attention" color={T.gold}/>
              {pending.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem" }} accent={T.gold}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:`${T.gold}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{TYPE_ICONS[doc.type]||"📄"}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{doc.name}</div>
                        <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>{TYPE_LABELS[doc.type]||"Document"} · Added {fmt(doc.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <Badge status={doc.status}/>
                      {doc.file_url&&<a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ background:`linear-gradient(135deg,${T.accent},${T.teal})`, color:"#fff", padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, textDecoration:"none" }}>Open →</a>}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
          {completed.length>0&&(
            <>
              <SectionDivider label="Completed" color={T.muted}/>
              {completed.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem", opacity:0.8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{TYPE_ICONS[doc.type]||"📄"}</div>
                      <div>
                        <div style={{ fontWeight:500, fontSize:14, color:T.text }}>{doc.name}</div>
                        <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>{TYPE_LABELS[doc.type]||"Document"} · {fmt(doc.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <Badge status={doc.status}/>
                      {doc.file_url&&<a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ background:"#f3f4f6", border:`1px solid ${T.border}`, color:T.muted, padding:"6px 14px", borderRadius:20, fontSize:12, textDecoration:"none" }}>View</a>}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      <Card style={{ marginTop:"1rem", background:"#f0fdfa", border:`1px solid ${T.teal}30` }}>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.7 }}>
          📋 Need to submit a document? Email <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:T.teal }}>info@mindshiftwellnessclinic.org</a> or bring it to your next appointment.
        </div>
      </Card>
    </div>
  );
}
