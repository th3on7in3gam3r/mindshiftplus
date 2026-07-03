import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrInput, SectionHeader, Spinner } from "../ehr/EHRUI";
import { getBillingSettings, saveBillingSettings, DEFAULT_BILLING_SETTINGS } from "../../lib/billingDb";

export default function EHRBillingSettings({ clinician }) {
  const [form, setForm] = useState({ ...DEFAULT_BILLING_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error: err } = await getBillingSettings();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load settings.");
    else setForm({
      clinic_name: data.clinic_name ?? DEFAULT_BILLING_SETTINGS.clinic_name,
      billing_address: data.billing_address ?? DEFAULT_BILLING_SETTINGS.billing_address,
      phone: data.phone ?? DEFAULT_BILLING_SETTINGS.phone,
      email: data.email ?? DEFAULT_BILLING_SETTINGS.email,
      tax_id: data.tax_id ?? "",
      providers: Array.isArray(data.providers) && data.providers.length
        ? data.providers
        : DEFAULT_BILLING_SETTINGS.providers,
    });
    setLoading(false);
  }

  const setProvider = (index, key, value) => {
    setForm((f) => {
      const providers = [...f.providers];
      providers[index] = { ...providers[index], [key]: value };
      return { ...f, providers };
    });
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: err } = await saveBillingSettings(form, clinician.user_id);
    setSaving(false);
    if (err) setError(typeof err === "string" ? err : err.message ?? "Save failed.");
    else setSaved(true);
  };

  if (loading) return <div style={{ padding: "2rem" }}><Spinner /></div>;

  const missingNpi = form.providers.some((p) => !p.npi?.trim());

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 720 }}>
      <SectionHeader
        title="Billing Settings"
        subtitle="Clinic info and provider NPI numbers for insurance superbills"
      />

      {missingNpi && (
        <EhrCard style={{ marginBottom: "1rem", background: "color-mix(in srgb, var(--ehr-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--ehr-gold) 30%, transparent)" }}>
          <div style={{ fontSize: 13, color: "var(--ehr-gold)" }}>
            ⚠️ Add NPI numbers for Kenneth and Rachel before printing superbills. You can save now and update NPIs later.
          </div>
        </EhrCard>
      )}

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--ehr-rose) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ehr-rose) 30%, transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {saved && (
        <div style={{ background: "color-mix(in srgb, var(--ehr-green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ehr-green) 30%, transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-green)", marginBottom: "1rem" }}>
          ✓ Settings saved
        </div>
      )}

      <form onSubmit={handleSave}>
        <EhrCard style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 1rem" }}>Clinic (Billing)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <EhrInput label="Clinic Name" value={form.clinic_name} onChange={(e) => { setForm({ ...form, clinic_name: e.target.value }); setSaved(false); }} required />
            <EhrInput label="Billing Address" value={form.billing_address} onChange={(e) => { setForm({ ...form, billing_address: e.target.value }); setSaved(false); }} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <EhrInput label="Phone" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setSaved(false); }} />
              <EhrInput label="Email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setSaved(false); }} />
            </div>
            <EhrInput label="Tax ID (optional)" value={form.tax_id} onChange={(e) => { setForm({ ...form, tax_id: e.target.value }); setSaved(false); }} placeholder="EIN" />
          </div>
        </EhrCard>

        <EhrCard style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 0.5rem" }}>Rendering Providers</h3>
          <p style={{ fontSize: 12, color: "var(--ehr-muted)", margin: "0 0 1rem" }}>
            NPI is required on superbills submitted to insurance companies.
          </p>
          {form.providers.map((p, i) => (
            <div key={i} style={{ padding: "1rem 0", borderTop: i > 0 ? "1px solid var(--ehr-border)" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--ehr-accent)" }}>{p.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <EhrInput label="Full Name" value={p.name} onChange={(e) => setProvider(i, "name", e.target.value)} />
                <EhrInput label="Title" value={p.title} onChange={(e) => setProvider(i, "title", e.target.value)} />
                <EhrInput label="NPI (10 digits)" value={p.npi} onChange={(e) => setProvider(i, "npi", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter when available" />
                <EhrInput label="Taxonomy" value={p.taxonomy} onChange={(e) => setProvider(i, "taxonomy", e.target.value)} placeholder="363LP0808X" />
              </div>
            </div>
          ))}
        </EhrCard>

        <EhrBtn type="submit" disabled={saving}>{saving ? "Saving…" : "Save Billing Settings"}</EhrBtn>
      </form>
    </div>
  );
}
