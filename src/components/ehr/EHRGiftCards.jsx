import { useState, useEffect } from "react";
import { EhrCard, EhrBtn, EhrInput, EhrBadge, SectionHeader, Spinner } from "./EHRUI";
import { getGiftCards, createGiftCard, updateGiftCard } from "../../lib/ehrDb";
import { formatCents, parseDollars } from "../../lib/billingDb";

const STATUS_COLOR = { active: "green", redeemed: "teal", expired: "muted", cancelled: "rose" };

const EMPTY_FORM = { amount: "", issued_to: "", expires_at: "" };
const EMPTY_APPLY = { code: "", amount: "" };

export default function EHRGiftCards({ clinician }) {
  const [cards, setCards]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [applyForm, setApplyForm] = useState(EMPTY_APPLY);
  const [applyResult, setApplyResult] = useState(null);
  const [applying, setApplying]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => { load(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const { data, error: err } = await getGiftCards();
    if (err) setError(typeof err === "string" ? err : err.message ?? "Failed to load gift cards.");
    else setCards(data ?? []);
    setLoading(false);
  }

  async function handleIssue(e) {
    e.preventDefault();
    const amount_cents = parseDollars(form.amount);
    if (!amount_cents) return;
    setSaving(true);
    const payload = {
      amount_cents,
      issued_to: form.issued_to.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      issued_by: clinician.user_id,
    };
    const { data, error: err } = await createGiftCard(payload);
    setSaving(false);
    if (err) { setError(typeof err === "string" ? err : err.message ?? "Failed to create gift card."); return; }
    if (data) setCards(prev => [data, ...prev]);
    setShowIssue(false);
    setForm(EMPTY_FORM);
    showToast("Gift card issued successfully.");
  }

  async function handleCancel(card) {
    if (!window.confirm(`Cancel gift card ${card.code}?`)) return;
    const { data, error: err } = await updateGiftCard(card.id, { status: "cancelled" });
    if (!err && data) setCards(prev => prev.map(c => c.id === data.id ? data : c));
    else setError(typeof err === "string" ? err : err?.message ?? "Failed to cancel.");
  }

  async function handleLookup() {
    const code = applyForm.code.trim().toUpperCase();
    const found = cards.find(c => c.code === code);
    if (!found) { setApplyResult({ error: "Gift card not found." }); return; }
    setApplyResult(found);
  }

  async function handleApply() {
    if (!applyResult || applyResult.error) return;
    const deduct = parseDollars(applyForm.amount);
    if (!deduct || deduct > applyResult.balance_cents) {
      setApplyResult(prev => ({ ...prev, applyError: "Amount exceeds balance." }));
      return;
    }
    setApplying(true);
    const newBalance = applyResult.balance_cents - deduct;
    const newStatus  = newBalance <= 0 ? "redeemed" : "active";
    const { data, error: err } = await updateGiftCard(applyResult.id, {
      balance_cents: newBalance,
      status: newStatus,
      redeemed_by: clinician.user_id,
    });
    setApplying(false);
    if (!err && data) {
      setCards(prev => prev.map(c => c.id === data.id ? data : c));
      setApplyResult(data);
      setApplyForm(EMPTY_APPLY);
      showToast(`Applied ${formatCents(deduct)} from gift card.`);
    } else {
      setError(typeof err === "string" ? err : err?.message ?? "Apply failed.");
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setA = k => e => setApplyForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 80, right: 24, zIndex: 999,
          background: toast.type === "success" ? "var(--ehr-green)" : "var(--ehr-rose)",
          color: "#fff", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>{toast.msg}</div>
      )}

      <SectionHeader
        title="Gift Cards"
        subtitle="Issue and manage gift cards for patients"
        action={<EhrBtn small onClick={() => setShowIssue(s => !s)}>🎁 Issue Gift Card</EhrBtn>}
      />

      {error && (
        <div style={{ background: "color-mix(in srgb,var(--ehr-rose) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-rose) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--ehr-rose)", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div>
          {/* Issue form */}
          {showIssue && (
            <EhrCard style={{ marginBottom: "1.2rem" }}>
              <form onSubmit={handleIssue}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: 0 }}>Issue New Gift Card</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <EhrBtn variant="secondary" small type="button" onClick={() => setShowIssue(false)}>Cancel</EhrBtn>
                    <EhrBtn small type="submit" disabled={saving}>{saving ? "Issuing…" : "Issue"}</EhrBtn>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount ($) <span style={{ color: "var(--ehr-rose)" }}>*</span></label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ehr-muted2)", fontSize: 14 }}>$</span>
                      <input type="number" min="1" step="0.01" value={form.amount} onChange={set("amount")} required className="ehr-input" style={{ paddingLeft: 24 }} placeholder="0.00" />
                    </div>
                  </div>
                  <EhrInput label="Issued To (name/email)" value={form.issued_to} onChange={set("issued_to")} placeholder="Patient name or email…" />
                  <EhrInput label="Expires (optional)" type="date" value={form.expires_at} onChange={set("expires_at")} />
                </div>
              </form>
            </EhrCard>
          )}

          {/* Gift card list */}
          {loading ? <Spinner /> : cards.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎁</div>
              <div style={{ color: "var(--ehr-muted)", fontSize: 14 }}>No gift cards issued yet.</div>
            </EhrCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cards.map(card => (
                <EhrCard key={card.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ehr-accent)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{card.code}</span>
                        <EhrBadge color={STATUS_COLOR[card.status] ?? "muted"}>{card.status}</EhrBadge>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--ehr-muted2)", flexWrap: "wrap" }}>
                        <span>Amount: <strong style={{ color: "var(--ehr-text)" }}>{formatCents(card.amount_cents)}</strong></span>
                        <span>Balance: <strong style={{ color: card.balance_cents > 0 ? "var(--ehr-green)" : "var(--ehr-muted2)" }}>{formatCents(card.balance_cents)}</strong></span>
                        {card.issued_to && <span>To: {card.issued_to}</span>}
                        {card.expires_at && <span>Expires: {new Date(card.expires_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <EhrBtn variant="ghost" small onClick={() => { navigator.clipboard.writeText(card.code); showToast("Code copied!"); }}>📋 Copy</EhrBtn>
                      {card.status === "active" && (
                        <EhrBtn variant="danger" small onClick={() => handleCancel(card)}>Cancel</EhrBtn>
                      )}
                    </div>
                  </div>
                </EhrCard>
              ))}
            </div>
          )}
        </div>

        {/* Apply to billing panel */}
        <EhrCard>
          <SectionHeader title="Apply to Billing" subtitle="Look up and redeem a gift card" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={applyForm.code}
                onChange={setA("code")}
                placeholder="Enter gift card code…"
                className="ehr-input"
                style={{ flex: 1, textTransform: "uppercase" }}
              />
              <EhrBtn small onClick={handleLookup}>Look Up</EhrBtn>
            </div>

            {applyResult && (
              applyResult.error ? (
                <div style={{ fontSize: 13, color: "var(--ehr-rose)" }}>⚠️ {applyResult.error}</div>
              ) : (
                <div style={{ background: "color-mix(in srgb,var(--ehr-teal) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--ehr-teal) 25%,transparent)", borderRadius: 10, padding: "0.8rem 1rem" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ehr-text)", marginBottom: 4 }}>{applyResult.code}</div>
                  <div style={{ fontSize: 12, color: "var(--ehr-muted2)", marginBottom: 8 }}>
                    Balance: <strong style={{ color: "var(--ehr-green)" }}>{formatCents(applyResult.balance_cents)}</strong>
                    &nbsp;·&nbsp; Status: <EhrBadge color={STATUS_COLOR[applyResult.status] ?? "muted"}>{applyResult.status}</EhrBadge>
                  </div>
                  {applyResult.status === "active" && (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount to Apply ($)</label>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ehr-muted2)", fontSize: 14 }}>$</span>
                          <input type="number" min="0.01" step="0.01" value={applyForm.amount} onChange={setA("amount")} className="ehr-input" style={{ paddingLeft: 24 }} placeholder="0.00" />
                        </div>
                      </div>
                      {applyResult.applyError && <div style={{ fontSize: 12, color: "var(--ehr-rose)", marginBottom: 6 }}>⚠️ {applyResult.applyError}</div>}
                      <EhrBtn small onClick={handleApply} disabled={applying}>{applying ? "Applying…" : "Apply to Claim"}</EhrBtn>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        </EhrCard>
      </div>
    </div>
  );
}
