import { useState, useEffect } from "react";
import { getDocuments } from "../../lib/clinicApi";

function Card({ children, style={} }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

const TYPE_ICONS = { intake_form:"📋", consent:"✍️", lab_result:"🧪", other:"📄" };
const TYPE_LABELS = { intake_form:"Intake Form", consent:"Consent Form", lab_result:"Lab Result", other:"Document" };

function StatusBadge({ status }) {
  const map = { pending:{bg:"#fef9c3",color:"#854d0e",label:"Action Required"}, completed:{bg:"#dcfce7",color:"#166534",label:"Completed"}, uploaded:{bg:"#dbeafe",color:"#1e40af",label:"Uploaded"} };
  const s = map[status]||map.pending;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{s.label}</span>;
}

export default function PortalDocuments({ userId, P }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!userId) return;
    getDocuments(userId)
      .then(data => { setDocuments(Array.isArray(data)?data:[]); })
      .catch(()=>setDocuments([]))
      .finally(()=>setLoading(false));
  }, [userId]);

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const pending = documents.filter(d=>d.status==="pending");
  const completed = documents.filter(d=>d.status!=="pending");

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.8rem" }}>
        <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Documents & Forms</div>
        <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Your Documents</h1>
      </div>

      {pending.length>0&&(
        <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1.2rem", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"#92400e" }}>Action Required</div>
            <div style={{ fontSize:12, color:"#b45309" }}>{pending.length} form{pending.length>1?"s":""} need{pending.length===1?"s":""} to be completed.</div>
          </div>
        </div>
      )}

      {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
      : documents.length===0 ? (
        <Card style={{ textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
          <div style={{ fontWeight:600, color:P.text, marginBottom:6 }}>No documents yet</div>
          <div style={{ color:P.muted, fontSize:13 }}>Forms and documents shared by the clinic will appear here.</div>
        </Card>
      ) : (
        <>
          {pending.length>0&&(
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#b45309", marginBottom:10 }}>Needs Attention</div>
              {pending.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem", borderColor:"#fed7aa" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ fontSize:24 }}>{TYPE_ICONS[doc.type]||"📄"}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:P.text }}>{doc.name}</div>
                        <div style={{ color:P.muted, fontSize:12, marginTop:2 }}>{TYPE_LABELS[doc.type]||"Document"} · Added {fmt(doc.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <StatusBadge status={doc.status}/>
                      {doc.file_url&&<a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ background:P.accent, color:"#fff", padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, textDecoration:"none" }}>Open →</a>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {completed.length>0&&(
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.muted, marginBottom:10 }}>Completed</div>
              {completed.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem", opacity:0.8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ fontSize:24 }}>{TYPE_ICONS[doc.type]||"📄"}</span>
                      <div>
                        <div style={{ fontWeight:500, fontSize:14, color:P.text }}>{doc.name}</div>
                        <div style={{ color:P.muted, fontSize:12, marginTop:2 }}>{TYPE_LABELS[doc.type]||"Document"} · {fmt(doc.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <StatusBadge status={doc.status}/>
                      {doc.file_url&&<a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ background:"#f3f4f6", border:"1px solid #e5e7eb", color:P.muted, padding:"6px 14px", borderRadius:20, fontSize:12, textDecoration:"none" }}>View</a>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Card style={{ marginTop:"1rem", background:"#f0fdfa", border:"1px solid #99f6e4" }}>
        <div style={{ fontSize:13, color:P.muted, lineHeight:1.7 }}>
          📋 Need to submit a document? Email it to <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:P.teal }}>info@mindshiftwellnessclinic.org</a> or bring it to your next appointment.
        </div>
      </Card>
    </div>
  );
}
