import { useState, useEffect } from "react";
import { getPrescriptions } from "../../lib/clinicApi";
import { PageHeader, Card, SectionDivider, Badge, EmptyState, Alert, T } from "./PortalUI";

export default function PortalPrescriptions({ userId, P }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!userId) return;
    getPrescriptions(userId).then(data=>setPrescriptions(Array.isArray(data)?data:[])).catch(()=>setPrescriptions([])).finally(()=>setLoading(false));
  }, [userId]);

  const fmt = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
  const active   = prescriptions.filter(p=>p.status==="active");
  const inactive = prescriptions.filter(p=>p.status!=="active");

  return (
    <div style={{ padding:"2rem", maxWidth:860, margin:"0 auto" }}>
      <PageHeader
        icon="💊" label="Medications"
        title="Your Prescriptions"
        subtitle="Current and past medications from your care team"
        gradient="linear-gradient(135deg,#f5f3ff,#eff6ff)"
      />

      {active.some(p=>p.refills_remaining===0)&&(
        <Alert type="warning" icon="⚠️" title="Refill needed" subtitle="One or more medications have no refills remaining. Contact the clinic."/>
      )}

      {loading ? <div style={{color:T.muted,fontSize:13,padding:"1rem 0"}}>Loading…</div>
      : prescriptions.length===0 ? (
        <EmptyState icon="💊" title="No prescriptions on file" subtitle="Your medications will appear here once prescribed by your clinician."/>
      ) : (
        <>
          {active.length>0&&(
            <>
              <SectionDivider label="Current Medications" color="#22c55e"/>
              {active.map(p=>(
                <Card key={p.id} style={{ marginBottom:"0.75rem" }} accent="#22c55e">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:"#dcfce7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💊</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{p.medication}</div>
                          <Badge status={p.status}/>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:6 }}>
                        {p.dosage&&<div style={{ fontSize:12, color:T.muted }}>💉 Dosage: <strong style={{color:T.text}}>{p.dosage}</strong></div>}
                        {p.frequency&&<div style={{ fontSize:12, color:T.muted }}>🔄 Frequency: <strong style={{color:T.text}}>{p.frequency}</strong></div>}
                        <div style={{ fontSize:12, color:T.muted }}>📅 Prescribed: {fmt(p.prescribed_date)}</div>
                        <div style={{ fontSize:12, color:T.muted }}>👨‍⚕️ {p.prescriber}</div>
                      </div>
                      {p.notes&&<div style={{ marginTop:8, padding:"8px 10px", background:"#f9fafb", borderRadius:8, fontSize:12, color:T.muted, fontStyle:"italic" }}>{p.notes}</div>}
                    </div>
                    <div style={{ textAlign:"center", minWidth:70 }}>
                      <div style={{ fontSize:11, color:T.muted2, marginBottom:4 }}>Refills</div>
                      <div style={{ fontSize:"2rem", fontWeight:800, color:p.refills_remaining===0?"#dc2626":"#166534", lineHeight:1 }}>{p.refills_remaining}</div>
                      {p.refills_remaining===0&&<div style={{ fontSize:10, color:"#dc2626", fontWeight:600, marginTop:2 }}>Contact clinic</div>}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
          {inactive.length>0&&(
            <>
              <SectionDivider label="Past Medications" color={T.muted}/>
              {inactive.map(p=>(
                <Card key={p.id} style={{ marginBottom:"0.75rem", opacity:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💊</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{p.medication}</div>
                        <div style={{ fontSize:12, color:T.muted }}>{p.dosage} · {fmt(p.prescribed_date)}</div>
                      </div>
                    </div>
                    <Badge status={p.status}/>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      <Card style={{ marginTop:"1rem", background:"#eff6ff", border:`1px solid #bfdbfe` }}>
        <div style={{ fontSize:13, color:"#1e40af", lineHeight:1.7 }}>
          💊 Need a refill? Call <a href="tel:5083061128" style={{ color:"#1d4ed8", fontWeight:600 }}>(508) 306-1128</a> or send us a message through the portal.
        </div>
      </Card>
    </div>
  );
}
