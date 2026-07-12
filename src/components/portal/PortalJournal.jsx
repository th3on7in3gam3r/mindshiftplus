import { useState, useEffect } from "react";
import { getPatientJournal, savePatientJournalEntry, deletePatientJournalEntry } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, EmptyState, Btn, Toast, Input, T } from "./PortalUI";
import CrisisModal from "../CrisisModal";

const MOODS = ["😔","😐","🙂","😊","🌟"];
const MOOD_LABELS = ["Low","Okay","Good","Great","Amazing"];
const TAGS = ["Anxiety","Gratitude","Stress","Healing","Prayer","Goals","Breakthrough","Joy","Medication","Sleep"];

export default function PortalJournal({ userId, P, patientName }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title:"", body:"", mood:"🙂", tags:[] });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  const load = async () => {
    try { const data = await getPatientJournal(userId); setEntries(Array.isArray(data)?data:[]); }
    catch { setEntries([]); }
    setLoading(false);
  };
  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const toggleTag = (t) => setDraft(d=>({ ...d, tags: d.tags.includes(t) ? d.tags.filter(x=>x!==t) : [...d.tags,t] }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!draft.body.trim()) return;

    const { detectCrisisKeywords, logCrisisEvent, alertClinicians } = await import("../../lib/crisisDetection.js");
    const crisisCheck = detectCrisisKeywords(draft.body);
    if (crisisCheck.detected) {
      setShowCrisisModal(true);
      await logCrisisEvent(
        userId,
        "portal_journal",
        draft.body,
        crisisCheck.keywords,
        crisisCheck.severity
      );
      await alertClinicians(
        userId,
        patientName || "Portal Patient",
        "Portal Care Journal",
        crisisCheck.severity
      );
    }

    setSaving(true);
    try {
      await savePatientJournalEntry(userId, draft);
      showToast("✓ Entry saved.");
      setDraft({ title:"", body:"", mood:"🙂", tags:[] });
      setEditing(false);
      load();
    } catch { showToast("Failed to save. Please try again."); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    try { await deletePatientJournalEntry(id); load(); }
    catch { showToast("Failed to delete."); }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <Toast message={toast}/>
      {showCrisisModal && <CrisisModal onClose={() => setShowCrisisModal(false)} />}

      <PageHeader
        icon="📓" label="My Journal"
        title="Your Journal"
        subtitle="A private space to reflect between appointments"
        gradient={`linear-gradient(135deg,#f5f3ff,#eff6ff)`}
        action={!editing && <Btn onClick={()=>setEditing(true)}>+ New Entry</Btn>}
      />

      {/* HIPAA disclaimer */}
      <div style={{
        background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12,
        padding:"10px 14px", marginBottom:"1.5rem",
        display:"flex", gap:8, alignItems:"flex-start",
      }}>
        <span style={{ fontSize:14, flexShrink:0 }}>🔒</span>
        <p style={{ fontSize:12, color:"#92400e", lineHeight:1.65, margin:0 }}>
          <strong>Your journal is private.</strong> Concerning language may trigger a safety alert to your care team (same as Mia chat and portal messages).
          Entries are reviewed by your clinician <strong>during scheduled appointments</strong>.
          Do not use this journal to report emergencies — call <strong>911</strong> or text/call <strong>988</strong> if you are in crisis.
        </p>
      </div>

      {/* New entry form */}
      {editing && (
        <Card style={{ marginBottom:"1.5rem", border:`1px solid ${T.accent}30` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.2rem" }}>
            <div style={{ fontWeight:700, fontSize:15, color:T.text }}>New Journal Entry</div>
            <button onClick={()=>{ setEditing(false); setDraft({title:"",body:"",mood:"🙂",tags:[]}); }} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:28, height:28, fontSize:14, cursor:"pointer", color:T.muted }}>✕</button>
          </div>
          <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Title (optional)" value={draft.title} onChange={v=>setDraft(d=>({...d,title:v}))} placeholder="What's on your mind today?"/>

            {/* Mood picker */}
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:8 }}>How are you feeling?</label>
              <div style={{ display:"flex", gap:8 }}>
                {MOODS.map((m,i)=>(
                  <button key={m} type="button" onClick={()=>setDraft(d=>({...d,mood:m}))} style={{
                    fontSize:22, padding:"6px 10px", borderRadius:10, border:`2px solid ${draft.mood===m?T.accent:T.border}`,
                    background:draft.mood===m?`${T.accent}10`:"#fff", cursor:"pointer", transition:"all .15s",
                  }} title={MOOD_LABELS[i]}>{m}</button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:8 }}>Tags (optional)</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {TAGS.map(t=>(
                  <button key={t} type="button" onClick={()=>toggleTag(t)} style={{
                    padding:"4px 12px", borderRadius:20, fontSize:12, cursor:"pointer", transition:"all .15s",
                    border:`1px solid ${draft.tags.includes(t)?T.teal:T.border}`,
                    background:draft.tags.includes(t)?`${T.teal}12`:"#fff",
                    color:draft.tags.includes(t)?T.teal:T.muted,
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <Input label="Entry *" value={draft.body} onChange={v=>setDraft(d=>({...d,body:v}))} placeholder="Write freely — this is your space…" rows={6} required/>

            <div style={{ display:"flex", gap:10 }}>
              <Btn type="submit" disabled={saving} style={{ flex:1, justifyContent:"center" }}>{saving?"Saving…":"Save Entry"}</Btn>
              <Btn variant="secondary" onClick={()=>{ setEditing(false); setDraft({title:"",body:"",mood:"🙂",tags:[]}); }} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Entries list */}
      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : entries.length===0 ? (
        <EmptyState icon="📓" title="No journal entries yet" subtitle="Start writing — your entries are private and only reviewed during your appointments."
          action={<Btn onClick={()=>setEditing(true)}>Write Your First Entry</Btn>}/>
      ) : (
        <>
          <SectionDivider label={`${entries.length} Entr${entries.length===1?"y":"ies"}`} color={T.accent}/>
          {entries.map(e=>(
            <Card key={e.id} style={{ marginBottom:"0.75rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }} onClick={()=>setExpanded(expanded===e.id?null:e.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:18 }}>{e.mood||"🙂"}</span>
                    <div style={{ fontWeight:600, fontSize:14, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {e.title || "Journal Entry"}
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:T.muted2 }}>{fmt(e.created_at)}</div>
                  {e.tags?.length>0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                      {e.tags.map(t=>(
                        <span key={t} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${T.teal}10`, color:T.teal, border:`1px solid ${T.teal}20` }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ color:T.accent, fontSize:16, flexShrink:0, marginLeft:8, transition:"transform .2s", transform:expanded===e.id?"rotate(180deg)":"none", display:"inline-block" }}>▼</span>
              </div>

              {expanded===e.id && (
                <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:14, color:T.text, lineHeight:1.8, whiteSpace:"pre-wrap", marginBottom:"1rem" }}>{e.body}</p>
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <Btn variant="danger" small onClick={()=>handleDelete(e.id)}>Delete Entry</Btn>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
