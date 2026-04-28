import { useState, useEffect } from "react";
import { getMessages, sendMessage, markMessageRead } from "../../lib/clinicApi";
import { emailNewMessage } from "../../lib/emailService";
import { PageHeader, Card, SectionDivider, EmptyState, Alert, Btn, Toast, Input, T } from "./PortalUI";
import CrisisModal from "../CrisisModal";

export default function PortalMessages({ userId, P }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try { const data = await getMessages(userId); setMessages(Array.isArray(data)?data:[]); }
    catch { setMessages([]); }
    setLoading(false);
  };
  useEffect(() => { if(userId) load(); }, [userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3500); };

  const handleSend = async (e) => {
    e.preventDefault();
    if(!body.trim()) return;

    // Crisis detection
    const { detectCrisisKeywords, logCrisisEvent, alertClinicians } = await import("../../lib/crisisDetection.js");
    const crisisCheck = detectCrisisKeywords(body);
    
    if (crisisCheck.detected) {
      setShowCrisisModal(true);
      // Log crisis event
      await logCrisisEvent(
        userId,
        'portal_message',
        body,
        crisisCheck.keywords,
        crisisCheck.severity
      );
      // Alert clinicians
      await alertClinicians(
        userId,
        P?.full_name || 'Unknown Patient',
        'Patient Portal Message',
        crisisCheck.severity
      );
    }

    setSending(true);
    try {
      await sendMessage(userId, subject||"General Inquiry", body);
      showToast("✓ Message sent. We'll respond within 1 business day.");
      setShowCompose(false); setSubject(""); setBody(""); load();
    } catch { showToast("Failed to send. Please try again."); }
    setSending(false);
  };

  const handleSelect = async (msg) => {
    setSelected(msg);
    if(!msg.read&&msg.sender_role==="clinic"){ try{ await markMessageRead(msg.id); }catch{} load(); }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

  const threads = messages.reduce((acc,m)=>{ const k=m.thread_id||m.id; if(!acc[k]) acc[k]=[]; acc[k].push(m); return acc; },{});
  const threadList = Object.entries(threads).map(([tid,msgs])=>({
    id:tid, messages:msgs.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),
    latest:msgs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0],
    hasUnread:msgs.some(m=>!m.read&&m.sender_role==="clinic"),
  })).sort((a,b)=>new Date(b.latest.created_at)-new Date(a.latest.created_at));

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <Toast message={toast}/>
      
      {/* Crisis Modal */}
      {showCrisisModal && <CrisisModal onClose={() => setShowCrisisModal(false)} />}

      <PageHeader
        icon="💬" label="Secure Messaging"
        title="Messages"
        subtitle="Communicate securely with your care team"
        gradient={`linear-gradient(135deg,${T.teal}15,${T.accent}10)`}
        action={<Btn onClick={()=>setShowCompose(true)}>+ New Message</Btn>}
      />

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:24, padding:"2rem", maxWidth:500, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:T.text, margin:0 }}>New Message</h2>
              <button onClick={()=>setShowCompose(false)} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:32, height:32, fontSize:16, cursor:"pointer", color:T.muted }}>✕</button>
            </div>
            <form onSubmit={handleSend} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Input label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Question about my medication"/>
              <Input label="Message" value={body} onChange={setBody} placeholder="Write your message here…" rows={5} required/>
              <Alert type="warning" icon="⚠️" title="For medical emergencies, call 911. For urgent needs, call (508) 306-1128."/>
              <div style={{ display:"flex", gap:10 }}>
                <Btn type="submit" disabled={sending} style={{ flex:1, justifyContent:"center" }}>{sending?"Sending…":"Send Message"}</Btn>
                <Btn variant="secondary" onClick={()=>setShowCompose(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thread view */}
      {selected ? (
        <div>
          <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:T.accent, fontSize:13, cursor:"pointer", marginBottom:"1rem", display:"flex", alignItems:"center", gap:6 }}>← Back to messages</button>
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:4 }}>{selected.subject||"Message"}</div>
            <SectionDivider label="Conversation" color={T.teal}/>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(threads[selected.thread_id||selected.id]||[selected]).map(m=>(
                <div key={m.id} style={{ display:"flex", justifyContent:m.sender_role==="patient"?"flex-end":"flex-start" }}>
                  <div style={{
                    maxWidth:"80%", padding:"10px 14px",
                    borderRadius:m.sender_role==="patient"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                    background:m.sender_role==="patient"?`linear-gradient(135deg,${T.accent},${T.teal})`:"#f3f4f6",
                    fontSize:13, lineHeight:1.65,
                    color:m.sender_role==="patient"?"#fff":T.text,
                  }}>
                    <div style={{ fontSize:10, color:m.sender_role==="patient"?"rgba(255,255,255,0.6)":T.muted2, marginBottom:4 }}>
                      {m.sender_role==="clinic"?<><img src="/logo.png" alt="" style={{width: 12, height: 12, verticalAlign: 'middle', display: 'inline-block'}} /> MindShift Clinic</>:"👤 You"} · {fmt(m.created_at)}
                    </div>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div>
          {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
          : threadList.length===0 ? (
            <EmptyState icon="💬" title="No messages yet" subtitle="Send us a message and we'll respond within 1 business day."
              action={<Btn onClick={()=>setShowCompose(true)}>Send a Message</Btn>}/>
          ) : threadList.map(t=>(
            <Card key={t.id} onClick={()=>handleSelect(t.latest)} style={{ marginBottom:"0.75rem", cursor:"pointer" }} accent={t.hasUnread?T.accent:undefined}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:38, height:38, borderRadius:12, background:t.latest.sender_role==="clinic"?`${T.teal}15`:`${T.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {t.latest.sender_role==="clinic"?<img src="/logo.png" alt="" style={{width: 20, height: 20}} />:"👤"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                    <div style={{ fontWeight:t.hasUnread?700:500, fontSize:14, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.latest.subject||"Message"}</div>
                    <div style={{ fontSize:11, color:T.muted2, flexShrink:0 }}>{fmt(t.latest.created_at)}</div>
                  </div>
                  <div style={{ fontSize:12, color:T.muted, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.latest.body}</div>
                </div>
                {t.hasUnread&&<span style={{ width:8, height:8, borderRadius:"50%", background:T.accent, flexShrink:0, marginTop:6 }}/>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
