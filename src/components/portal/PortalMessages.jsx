import { useState, useEffect } from "react";
import { getMessages, sendMessage, markMessageRead } from "../../lib/clinicApi";

function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", cursor:onClick?"pointer":"default", ...style }}>{children}</div>;
}

export default function PortalMessages({ userId, P }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
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
    if(!msg.read && msg.sender_role==="clinic"){ try{ await markMessageRead(msg.id); }catch{} load(); }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

  const threads = messages.reduce((acc,m)=>{ const k=m.thread_id||m.id; if(!acc[k]) acc[k]=[]; acc[k].push(m); return acc; },{});
  const threadList = Object.entries(threads).map(([tid,msgs])=>({
    id:tid, messages:msgs.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),
    latest:msgs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0],
    hasUnread:msgs.some(m=>!m.read&&m.sender_role==="clinic"),
  })).sort((a,b)=>new Date(b.latest.created_at)-new Date(a.latest.created_at));

  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, color:"#1a1f36", background:"#fff", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      {toast && <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>{toast}</div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.8rem", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Secure Messaging</div>
          <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Messages</h1>
        </div>
        <button onClick={()=>setShowCompose(true)} style={{ background:P.accent, border:"none", borderRadius:24, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New Message</button>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", maxWidth:500, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:P.text }}>New Message</h2>
              <button onClick={()=>setShowCompose(false)} style={{ background:"transparent", border:"none", fontSize:20, cursor:"pointer", color:P.muted }}>✕</button>
            </div>
            <form onSubmit={handleSend} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Subject</label>
                <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Question about my medication" style={inputStyle}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:P.text, display:"block", marginBottom:5 }}>Message *</label>
                <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} required placeholder="Write your message here…" style={{...inputStyle,resize:"vertical"}}/>
              </div>
              <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#92400e", lineHeight:1.6 }}>
                ⚠️ For medical emergencies, call 911. For urgent needs, call (508) 619-1044 directly.
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button type="submit" disabled={sending} style={{ flex:1, background:P.accent, border:"none", borderRadius:20, padding:"11px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>{sending?"Sending…":"Send Message"}</button>
                <button type="button" onClick={()=>setShowCompose(false)} style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:20, padding:"11px", color:P.muted, fontSize:14, cursor:"pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thread view */}
      {selected ? (
        <div>
          <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:P.accent, fontSize:13, cursor:"pointer", marginBottom:"1rem", display:"flex", alignItems:"center", gap:6 }}>← Back to messages</button>
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:P.text, marginBottom:4 }}>{selected.subject||"Message"}</div>
            <div style={{ fontSize:11, color:P.muted, marginBottom:"1.2rem" }}>Conversation thread</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(threads[selected.thread_id||selected.id]||[selected]).map(m=>(
                <div key={m.id} style={{ display:"flex", justifyContent:m.sender_role==="patient"?"flex-end":"flex-start" }}>
                  <div style={{
                    maxWidth:"80%", padding:"10px 14px",
                    borderRadius:m.sender_role==="patient"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                    background:m.sender_role==="patient"?`linear-gradient(135deg,${P.accent},${P.teal})`:"#f3f4f6",
                    fontSize:13, lineHeight:1.65,
                    color:m.sender_role==="patient"?"#fff":P.text,
                  }}>
                    <div style={{ fontSize:10, color:m.sender_role==="patient"?"rgba(255,255,255,0.6)":P.muted2, marginBottom:4 }}>
                      {m.sender_role==="clinic"?"🏥 MindShift Clinic":"👤 You"} · {fmt(m.created_at)}
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
          {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div>
          : threadList.length===0 ? (
            <Card style={{ textAlign:"center", padding:"2.5rem" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
              <div style={{ fontWeight:600, color:P.text, marginBottom:6 }}>No messages yet</div>
              <div style={{ color:P.muted, fontSize:13 }}>Send us a message and we'll respond within 1 business day.</div>
            </Card>
          ) : threadList.map(t=>(
            <Card key={t.id} onClick={()=>handleSelect(t.latest)} style={{ marginBottom:"0.75rem", borderColor:t.hasUnread?"#bfdbfe":"#e5e7eb" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{t.latest.sender_role==="clinic"?"🏥":"👤"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                    <div style={{ fontWeight:t.hasUnread?700:500, fontSize:14, color:P.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.latest.subject||"Message"}</div>
                    <div style={{ fontSize:11, color:P.muted2, flexShrink:0 }}>{fmt(t.latest.created_at)}</div>
                  </div>
                  <div style={{ fontSize:12, color:P.muted, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.latest.body}</div>
                </div>
                {t.hasUnread&&<span style={{ width:8, height:8, borderRadius:"50%", background:P.accent, flexShrink:0, marginTop:6 }}/>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
