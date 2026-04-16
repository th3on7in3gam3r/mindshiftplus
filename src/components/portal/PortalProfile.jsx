import { useState, useEffect } from "react";
import { getPatientProfile, upsertPatientProfile } from "../../lib/clinicApi";
import { useAuth } from "../../lib/AuthContext";
import { Card, SectionDivider, Btn, Toast, Input, T } from "./PortalUI";

export default function PortalProfile({ userId, displayName, P }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name:"", date_of_birth:"", phone:"", address:"", emergency_contact_name:"", emergency_contact_phone:"", insurance_provider:"", insurance_member_id:"", insurance_group_number:"" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if(!userId) return;
    getPatientProfile(userId)
      .then(data=>{ if(data) setProfile(p=>({...p,...data})); else setProfile(p=>({...p,full_name:user?.user_metadata?.full_name||""})); })
      .catch(()=>setProfile(p=>({...p,full_name:user?.user_metadata?.full_name||""})))
      .finally(()=>setLoading(false));
  },[userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3500); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await upsertPatientProfile(userId, profile); showToast("✓ Profile saved successfully."); }
    catch { showToast("Failed to save. Please try again."); }
    setSaving(false);
  };
  const set = (key) => (val) => setProfile(p=>({...p,[key]:val}));
  const initials = (profile.full_name||displayName||"P").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  return (
    <div style={{ padding:"2rem", maxWidth:760, margin:"0 auto" }}>
      <Toast message={toast}/>

      {/* Profile hero */}
      <div style={{
        background:`linear-gradient(135deg,${T.accent},${T.teal})`,
        borderRadius:24, padding:"2rem", marginBottom:"1.8rem",
        display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"3px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff", flexShrink:0, zIndex:1 }}>{initials}</div>
        <div style={{ zIndex:1 }}>
          <h1 style={{ fontSize:"1.4rem", fontWeight:700, color:"#fff", margin:"0 0 4px" }}>{profile.full_name||displayName}</h1>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>{user?.email}</div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"3px 10px", marginTop:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }}/>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>Active Patient</span>
          </div>
        </div>
      </div>

      {loading ? <div style={{color:T.muted,fontSize:13}}>Loading…</div> : (
        <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:"1.2rem" }}>

          <Card>
            <SectionDivider label="Personal Information" color={T.accent}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Input label="Full Name" value={profile.full_name} onChange={set("full_name")} placeholder="Your full name"/>
              <Input label="Date of Birth" value={profile.date_of_birth} onChange={set("date_of_birth")} type="date"/>
              <Input label="Phone Number" value={profile.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel"/>
              <div style={{ gridColumn:"1/-1" }}>
                <Input label="Address" value={profile.address} onChange={set("address")} placeholder="Street, City, State, ZIP"/>
              </div>
            </div>
          </Card>

          <Card>
            <SectionDivider label="Emergency Contact" color={T.rose}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Input label="Contact Name" value={profile.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Full name"/>
              <Input label="Contact Phone" value={profile.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="(555) 000-0000" type="tel"/>
            </div>
          </Card>

          <Card>
            <SectionDivider label="Insurance Information" color={T.teal}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Input label="Insurance Provider" value={profile.insurance_provider} onChange={set("insurance_provider")} placeholder="e.g. Aetna"/>
              <Input label="Member ID" value={profile.insurance_member_id} onChange={set("insurance_member_id")} placeholder="Member ID"/>
              <Input label="Group Number" value={profile.insurance_group_number} onChange={set("insurance_group_number")} placeholder="Group number"/>
            </div>
          </Card>

          <Card style={{ background:"#f0fdfa", border:`1px solid ${T.teal}30` }}>
            <SectionDivider label="Account" color={T.teal}/>
            <div style={{ fontSize:13, color:T.muted }}>Email: <span style={{ color:T.text, fontWeight:500 }}>{user?.email}</span></div>
            <div style={{ fontSize:12, color:T.muted2, marginTop:4 }}>To change your email or password, contact us at info@mindshiftwellnessclinic.org</div>
          </Card>

          <Btn type="submit" disabled={saving} style={{ justifyContent:"center", padding:"13px", borderRadius:12, fontSize:15 }}>
            {saving?"Saving…":"Save Profile"}
          </Btn>
        </form>
      )}
    </div>
  );
}
