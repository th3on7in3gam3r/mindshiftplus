export default function PortalPlaceholder({ onExit }) {
  return (
    <div style={{
      minHeight:"100vh", background:"#f7f8fc",
      fontFamily:"'Inter','DM Sans',system-ui,sans-serif",
      display:"flex", flexDirection:"column",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      {/* Nav */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #e5e7eb",
        padding:"1rem 5%", display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
            <img src="/logo.png" alt="MindShift" style={{ width:36, height:36, borderRadius:10, objectFit:"contain", background:"#fff", padding:2 }}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1f36" }}>MindShift Wellness Clinic</div>
            <div style={{ fontSize:11, color:"#9ca3af" }}>Patient Portal</div>
          </div>
        </div>
        <button onClick={onExit} style={{ background:"transparent", border:"1px solid #e5e7eb", borderRadius:20, padding:"6px 14px", fontSize:12, color:"#6b7280", cursor:"pointer" }}>
          ← Back to site
        </button>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"3rem 5%" }}>
        <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>

          {/* Icon */}
          <div style={{
            width:80, height:80, borderRadius:24,
            background:"linear-gradient(135deg,rgba(74,108,247,0.12),rgba(14,165,160,0.08))",
            border:"1px solid rgba(74,108,247,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 1.5rem",
          }}>
            <img src="/logo.png" alt="MindShift" style={{ width:56, height:56, borderRadius:14, objectFit:"contain", background:"#fff", padding:4 }}/>
          </div>

          {/* Coming soon badge */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            background:"rgba(74,108,247,0.08)", border:"1px solid rgba(74,108,247,0.2)",
            borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600,
            color:"#4a6cf7", marginBottom:"1.2rem",
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#4a6cf7", display:"inline-block", animation:"pulse 2s ease-in-out infinite" }}/>
            Coming Soon
          </div>

          <h1 style={{ fontSize:"clamp(1.6rem,4vw,2.2rem)", fontWeight:700, color:"#1a1f36", marginBottom:"0.75rem", lineHeight:1.2 }}>
            Patient Portal
          </h1>
          <p style={{ fontSize:15, color:"#6b7280", lineHeight:1.75, marginBottom:"2rem" }}>
            We're building a secure, dedicated Patient Portal for MindShift Wellness Clinic. It will allow you to manage appointments, view records, message your care team, and more — all in one place.
          </p>

          {/* Feature preview */}
          <div style={{
            background:"#fff", border:"1px solid #e5e7eb", borderRadius:16,
            padding:"1.5rem", marginBottom:"2rem", textAlign:"left",
            boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#9ca3af", marginBottom:"1rem" }}>What's coming</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                ["📅","Appointment scheduling & management"],
                ["💬","Secure messaging with your care team"],
                ["📄","Forms, documents & records"],
                ["👤","Personal health profile"],
                ["◎","MindShift+ wellness app integration"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#374151" }}>
                  <span style={{ fontSize:16, width:24, textAlign:"center" }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Contact in the meantime */}
          <div style={{
            background:"linear-gradient(135deg,#eff6ff,#f0fdfa)",
            border:"1px solid #bfdbfe", borderRadius:16, padding:"1.2rem",
            marginBottom:"1.5rem",
          }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#4a6cf7", marginBottom:8 }}>In the meantime, reach us directly</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <a href="tel:5083061128" style={{ fontSize:13, color:"#6b7280", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>📞 (508) 306-1128</a>
              <a href="mailto:info@mindshiftwellnessclinic.org" style={{ fontSize:13, color:"#6b7280", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>✉️ info@mindshiftwellnessclinic.org</a>
            </div>
          </div>

          <button onClick={onExit} style={{
            background:"linear-gradient(135deg,#4a6cf7,#0ea5a0)", border:"none",
            borderRadius:12, padding:"12px 28px", color:"#fff",
            fontSize:14, fontWeight:600, cursor:"pointer", width:"100%",
          }}>
            Return to Clinic Site
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}`}</style>

      {/* Footer */}
      <div style={{ padding:"1rem 5%", borderTop:"1px solid #e5e7eb", textAlign:"center" }}>
        <span style={{ fontSize:11, color:"#9ca3af" }}>© 2026 MindShift Wellness Clinic · Patient Portal — Coming Soon</span>
      </div>
    </div>
  );
}
