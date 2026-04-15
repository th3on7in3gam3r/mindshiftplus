import { useState, useEffect } from "react";
import { getPatientProfile, upsertPatientProfile } from "../../lib/clinicApi";
import { useAuth } from "../../lib/AuthContext";

function Card({ children, style={} }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"1.4rem", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...style }}>{children}</div>;
}

function Field({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div>
      <label style={{ fontSize:12, fontWeight:500, color:"#374151", display:"block", marginBottom:5 }}>{label}</label>
      <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, color:"#1a1f36", background:"#fff", outline:"none", fontFamily:"inherit", transition:"border-color .2s" }}
        onFocus={e=>{ e.target.style.borderColor="#4a6cf7"; e.target.style.boxShadow="0 0 0 3px rgba(74,108,247,0.1)"; }}
        onBlur={e=>{ e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

export default function PortalProfile({ userId, displayName, P }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name:"", date_of_birth:"", phone:"", address:"", emergency_contact_name:"", emergency_contact_phone:"", insurance_provider:"", insurance_member_id:"", insurance_group_number:"" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if(!userId) return;
    getPatientProfile(userId)
      .then(data => {
        if(data) setProfile(p=>({...p,...data}));
        else setProfile(p=>({...p,full_name:user?.user_metadata?.full_name||""}));
      })
      .catch(()=>setProfile(p=>({...p,full_name:user?.user_metadata?.full_name||""})))
      .finally(()=>setLoading(false));
  },[userId]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3500); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await upsertPatientProfile(userId, profile);
      showToast("✓ Profile saved successfully.");
    } catch { showToast("Failed to save. Please try again."); }
    setSaving(false);
  };
  const set = (key) => (val) => setProfile(p=>({...p,[key]:val}));
  const initials = (profile.full_name||displayName||"P").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  return (
    <div style={{ padding:"2rem", maxWidth:760, margin:"0 auto" }}>
      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1a1f36", borderRadius:30, padding:"10px 20px", fontSize:13, color:"#fff", zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>{toast}</div>}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"1.2rem", marginBottom:"1.8rem" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${P.accent},${P.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials}</div>
        <div>
          <div style={{ fontSize:12, color:P.muted2, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>My Profile</div>
          <h1 style={{ fontSize:"1.5rem", fontWeight:700, color:P.text }}>{profile.full_name||displayName}</h1>
          <div style={{ color:P.muted, fontSize:13 }}>{user?.email}</div>
        </div>
      </div>

      {loading ? <div style={{color:P.muted,fontSize:13}}>Loading…</div> : (
        <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:"1.2rem" }}>
          <Card>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.accent, marginBottom:"1rem" }}>Personal Information</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Field label="Full Name" value={profile.full_name} onChange={set("full_name")} placeholder="Your full name"/>
              <Field label="Date of Birth" value={profile.date_of_birth} onChange={set("date_of_birth")} type="date"/>
              <Field label="Phone Number" value={profile.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel"/>
              <div style={{ gridColumn:"1/-1" }}>
                <Field label="Address" value={profile.address} onChange={set("address")} placeholder="Street, City, State, ZIP"/>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#dc2626", marginBottom:"1rem" }}>Emergency Contact</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Field label="Contact Name" value={profile.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Full name"/>
              <Field label="Contact Phone" value={profile.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="(555) 000-0000" type="tel"/>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.teal, marginBottom:"1rem" }}>Insurance Information</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              <Field label="Insurance Provider" value={profile.insurance_provider} onChange={set("insurance_provider")} placeholder="e.g. Aetna"/>
              <Field label="Member ID" value={profile.insurance_member_id} onChange={set("insurance_member_id")} placeholder="Member ID"/>
              <Field label="Group Number" value={profile.insurance_group_number} onChange={set("insurance_group_number")} placeholder="Group number"/>
            </div>
          </Card>

          <Card style={{ background:"#f0fdfa", border:"1px solid #99f6e4" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:P.teal, marginBottom:6 }}>Account</div>
            <div style={{ fontSize:13, color:P.muted }}>Email: <span style={{ color:P.text, fontWeight:500 }}>{user?.email}</span></div>
            <div style={{ fontSize:12, color:P.muted2, marginTop:4 }}>To change your email or password, contact us at info@mindshiftwellnessclinic.org</div>
          </Card>

          <button type="submit" disabled={saving} style={{ background:`linear-gradient(135deg,${P.accent},${P.teal})`, border:"none", borderRadius:12, padding:"14px", color:"#fff", fontSize:15, fontWeight:600, cursor:"pointer", opacity:saving?0.7:1, transition:"opacity .2s" }}>
            {saving?"Saving…":"Save Profile"}
          </button>
        </form>
      )}
    </div>
  );
}
