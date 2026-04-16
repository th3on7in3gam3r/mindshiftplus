import { useState, useEffect, useRef } from "react";
import { getDocuments, uploadPatientDocument, deletePatientDocument } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, Btn, Toast, T } from "./PortalUI";

const TYPE_ICONS  = { intake_form:"📋", consent:"✍️", lab_result:"🧪", insurance:"🛡️", id_document:"🪪", other:"📄" };
const TYPE_LABELS = { intake_form:"Intake Form", consent:"Consent Form", lab_result:"Lab Result", insurance:"Insurance Card", id_document:"ID Document", other:"Document" };
const UPLOAD_TYPES = ["insurance","id_document","intake_form","consent","lab_result","other"];

export default function PortalDocuments({ userId, P }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState("other");
  const [toast, setToast] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try { const data = await getDocuments(userId); setDocuments(Array.isArray(data)?data:[]); }
    catch { setDocuments([]); }
    setLoading(false);
  };
  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),4000); };

  const handleUpload = async (file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) { showToast("File too large. Maximum size is 10MB."); return; }
    const allowed = ["application/pdf","image/jpeg","image/png","image/webp","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { showToast("File type not supported. Use PDF, JPG, PNG, or Word."); return; }
    setUploading(true);
    try {
      await uploadPatientDocument(userId, file, docType);
      showToast("✓ Document uploaded successfully.");
      setShowUpload(false); setDocType("other");
      load();
    } catch (e) {
      showToast(`Upload failed: ${e.message}`);
    }
    setUploading(false);
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try { await deletePatientDocument(doc.id, doc.file_url); load(); showToast("Document deleted."); }
    catch { showToast("Failed to delete. Please try again."); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const pending   = documents.filter(d=>d.status==="pending");
  const uploaded  = documents.filter(d=>d.status==="uploaded");
  const completed = documents.filter(d=>d.status==="completed");

  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:14, color:T.text, background:"#fff", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <Toast message={toast}/>

      <PageHeader
        icon="📄" label="Documents & Forms"
        title="Your Documents"
        subtitle="Upload and manage your health documents"
        gradient={`linear-gradient(135deg,${T.gold}15,${T.accent}08)`}
        action={<Btn onClick={()=>setShowUpload(!showUpload)}>{showUpload?"Cancel":"+ Upload Document"}</Btn>}
      />

      {/* Upload panel */}
      {showUpload && (
        <Card style={{ marginBottom:"1.5rem", border:`1px solid ${T.accent}30` }}>
          <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:"1rem" }}>Upload a Document</div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>Document Type</label>
            <select value={docType} onChange={e=>setDocType(e.target.value)} style={inputStyle}>
              {UPLOAD_TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
            onDragLeave={()=>setDragOver(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver?T.accent:T.border}`,
              borderRadius:14, padding:"2.5rem 1rem", textAlign:"center",
              background:dragOver?`${T.accent}06`:"#fafafa",
              cursor:"pointer", transition:"all .2s",
            }}
          >
            <div style={{ fontSize:36, marginBottom:8 }}>📁</div>
            <div style={{ fontWeight:600, fontSize:14, color:T.text, marginBottom:4 }}>
              {uploading ? "Uploading…" : "Drop file here or click to browse"}
            </div>
            <div style={{ fontSize:12, color:T.muted }}>PDF, JPG, PNG, Word · Max 10MB</div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display:"none" }}
              onChange={e=>{ if(e.target.files[0]) handleUpload(e.target.files[0]); }}/>
          </div>

          <p style={{ fontSize:11, color:T.muted2, marginTop:10, lineHeight:1.6 }}>
            🔒 Your documents are securely stored and only accessible to you and your care team at MindShift Wellness Clinic.
          </p>
        </Card>
      )}

      {/* Action required */}
      {pending.length>0&&(
        <Alert type="warning" icon="⚠️" title={`${pending.length} form${pending.length>1?"s":""} need${pending.length===1?"s":""} your attention`} subtitle="Please complete the forms below"/>
      )}

      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : documents.length===0 ? (
        <EmptyState icon="📄" title="No documents yet"
          subtitle="Upload your insurance card, ID, or any forms requested by the clinic."
          action={<Btn onClick={()=>setShowUpload(true)}>Upload Your First Document</Btn>}/>
      ) : (
        <>
          {/* Pending (clinic-sent forms) */}
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

          {/* Patient-uploaded documents */}
          {uploaded.length>0&&(
            <>
              <SectionDivider label="Your Uploads" color={T.teal}/>
              {uploaded.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem" }} accent={T.teal}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:`${T.teal}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{TYPE_ICONS[doc.type]||"📄"}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{doc.name}</div>
                        <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>{TYPE_LABELS[doc.type]||"Document"} · Uploaded {fmt(doc.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <Badge status="uploaded" custom={{bg:"#dbeafe",color:"#1e40af",label:"Uploaded"}}/>
                      {doc.file_url&&<a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ background:"#f3f4f6", border:`1px solid ${T.border}`, color:T.muted, padding:"6px 14px", borderRadius:20, fontSize:12, textDecoration:"none" }}>View</a>}
                      <Btn variant="danger" small onClick={()=>handleDelete(doc)}>Delete</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* Completed (clinic-processed) */}
          {completed.length>0&&(
            <>
              <SectionDivider label="Completed" color={T.muted}/>
              {completed.map(doc=>(
                <Card key={doc.id} style={{ marginBottom:"0.75rem", opacity:0.75 }}>
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
          📋 Need to submit a specific form? Email <a href="mailto:info@mindshiftwellnessclinic.org" style={{ color:T.teal }}>info@mindshiftwellnessclinic.org</a> or call <a href="tel:5083061128" style={{ color:T.teal }}>(508) 306-1128</a>.
        </div>
      </Card>
    </div>
  );
}
