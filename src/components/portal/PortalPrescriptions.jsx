import { useState, useEffect } from "react";
import { getPrescriptions } from "../../lib/clinicApi";

function Card({ children, style={} }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function StatusBadge({ status }) {
  const map = {
    active:        { bg:"#dcfce7", color:"#166534", label:"Active" },
    discontinued:  { bg:"#fee2e2", color:"#991b1b", label:"Discontinued" },
    on_hold:       { bg:"#fef9c3", color:"#854d0e", label:"On Hold" },
  };
  const s = map[status] || map.active;
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{s.label}</span>;
}

export default function PortalPrescriptions({ userId, P }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getPrescriptions(userId)
      .then(data => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const fmt = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
  const active = prescriptions.filter(p => p.status === "active");
  const inactive = prescriptions.filter(p => p.status !== "active");

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.8rem" }}>
        <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Medications</div>
        <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:P.text }}>Your Prescriptions</h1>
        <p style={{ fontSize:13, color:P.muted, marginTop:4 }}>Current and past medications prescribed by your care team. Read-only.</p>
      </div>

      {/* Refill reminder */}
      {active.some(p => p.refills_remaining === 0) && (
        <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1.2rem", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"#92400e" }}>Refill needed</div>
            <div style={{ fontSize:12, color:"#b45309" }}>One or more medications have no refills remaining. Contact the clinic.</div>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:P.muted, fontSize:13 }}>Loading…</div>
      : prescriptions.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>💊</div>
          <div style={{ fontWeight:600, color:P.text, marginBottom:6 }}>No prescriptions on file</div>
          <div style={{ color:P.muted, fontSize:13 }}>Your medications will appear here once prescribed.</div>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.accent, marginBottom:10 }}>Current Medications</div>
              {active.map(p => (
                <Card key={p.id} style={{ marginBottom:"0.75rem", borderLeft:`4px solid #22c55e` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:18 }}>💊</span>
                        <div style={{ fontWeight:700, fontSize:15, color:P.text }}>{p.medication}</div>
                        <StatusBadge status={p.status}/>
                      </div>
                      {p.dosage && <div style={{ fontSize:13, color:P.muted, marginLeft:26 }}>Dosage: <strong style={{ color:P.text }}>{p.dosage}</strong></div>}
                      {p.frequency && <div style={{ fontSize:13, color:P.muted, marginLeft:26, marginTop:2 }}>Frequency: <strong style={{ color:P.text }}>{p.frequency}</strong></div>}
                      <div style={{ fontSize:12, color:P.muted2, marginLeft:26, marginTop:4 }}>
                        Prescribed: {fmt(p.prescribed_date)} · By {p.prescriber}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:P.muted2, marginBottom:2 }}>Refills remaining</div>
                      <div style={{ fontSize:"1.4rem", fontWeight:700, color: p.refills_remaining === 0 ? "#dc2626" : "#166534" }}>
                        {p.refills_remaining}
                      </div>
                      {p.refills_remaining === 0 && <div style={{ fontSize:10, color:"#dc2626", fontWeight:600 }}>Contact clinic</div>}
                    </div>
                  </div>
                  {p.notes && <div style={{ marginTop:8, padding:"8px 10px", background:"#f9fafb", borderRadius:8, fontSize:12, color:P.muted, fontStyle:"italic" }}>{p.notes}</div>}
                </Card>
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.muted, marginBottom:10 }}>Past Medications</div>
              {inactive.map(p => (
                <Card key={p.id} style={{ marginBottom:"0.75rem", opacity:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>💊</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:P.text }}>{p.medication}</div>
                        <div style={{ fontSize:12, color:P.muted }}>{p.dosage} · {fmt(p.prescribed_date)}</div>
                      </div>
                    </div>
                    <StatusBadge status={p.status}/>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Card style={{ marginTop:"1rem", background:"#eff6ff", border:"1px solid #bfdbfe" }}>
        <div style={{ fontSize:13, color:"#1e40af", lineHeight:1.7 }}>
          💊 Need a refill or have questions about your medications? Call us at <a href="tel:5083061128" style={{ color:"#1d4ed8", fontWeight:600 }}>(508) 306-1128</a> or message us through the portal.
        </div>
      </Card>
    </div>
  );
}
