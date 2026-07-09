import { useState, useEffect } from "react";
import {
  getAvailability, upsertAvailability,
  getBlockedTimes, addBlockedTime, removeBlockedTime,
} from "../../lib/clinicApi";
import {
  DAY_NAMES, AVAIL_SUMMARY, OFF_SUMMARY,
  DEFAULT_AVAILABILITY_SLOTS, isOffDayOfWeek,
} from "../../lib/schedulingConstants";
import { EhrBtn, EhrCard, EhrInput, Spinner } from "./EHRUI";

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "var(--ehr-text)", borderRadius: 30, padding: "10px 20px",
      fontSize: 13, color: "#fff", zIndex: 9999, whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

export function EHRAvailabilityPanel({ clinician }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const userId = clinician?.user_id ?? "";

  useEffect(() => {
    setLoading(true);
    getAvailability()
      .then((data) => setSlots(Array.isArray(data) && data.length ? data : DEFAULT_AVAILABILITY_SLOTS.map((s) => ({ ...s }))))
      .catch(() => setSlots(DEFAULT_AVAILABILITY_SLOTS.map((s) => ({ ...s }))))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const update = (i, key, val) => setSlots((s) => s.map((sl, idx) => (idx === i ? { ...sl, [key]: val } : sl)));
  const addSlot = () => setSlots((s) => [...s, { ...DEFAULT_AVAILABILITY_SLOTS[0], start_time: "09:00", end_time: "17:00" }]);
  const removeSlot = (i) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!userId) { showToast("Sign in as a clinician to save availability."); return; }
    setSaving(true);
    try {
      await upsertAvailability(userId, slots.filter((s) => s.is_active));
      showToast("✓ Availability saved.");
    } catch {
      showToast("Failed to save. Try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>;
  }

  const inputStyle = {
    padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ehr-border)",
    fontSize: 13, color: "var(--ehr-text)", background: "var(--ehr-surface)",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.5rem", maxWidth: 900 }}>
      <Toast message={toast} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 13, color: "var(--ehr-muted)", margin: 0 }}>
          Weekly recurring availability. {AVAIL_SUMMARY} · {OFF_SUMMARY}.
        </p>
        <EhrBtn variant="secondary" small onClick={addSlot}>+ Add Slot</EhrBtn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
        {slots.map((s, i) => (
          <EhrCard key={i} style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select value={s.day_of_week} onChange={(e) => update(i, "day_of_week", Number(e.target.value))} style={{ ...inputStyle, minWidth: 120 }}>
                {DAY_NAMES.map((d, idx) => (
                  <option key={d} value={idx} disabled={isOffDayOfWeek(idx)}>
                    {d}{isOffDayOfWeek(idx) ? " (Closed)" : ""}
                  </option>
                ))}
              </select>
              <input type="time" value={s.start_time} onChange={(e) => update(i, "start_time", e.target.value)} style={inputStyle} />
              <span style={{ color: "var(--ehr-muted)", fontSize: 13 }}>to</span>
              <input type="time" value={s.end_time} onChange={(e) => update(i, "end_time", e.target.value)} style={inputStyle} />
              <select value={s.slot_duration_minutes} onChange={(e) => update(i, "slot_duration_minutes", Number(e.target.value))} style={inputStyle}>
                {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
              <select value={s.location} onChange={(e) => update(i, "location", e.target.value)} style={inputStyle}>
                {["Milford", "Boston", "Telehealth"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ehr-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={s.is_active} onChange={(e) => update(i, "is_active", e.target.checked)} />
                Active
              </label>
              <EhrBtn variant="danger" small onClick={() => removeSlot(i)} style={{ marginLeft: "auto" }}>Remove</EhrBtn>
            </div>
          </EhrCard>
        ))}
      </div>
      <EhrBtn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Availability"}</EhrBtn>
    </div>
  );
}

export function EHRBlockedPanel({ clinician }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", start_time: "", end_time: "", reason: "", all_day: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const userId = clinician?.user_id ?? "";

  const load = async () => {
    setLoading(true);
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    try {
      const data = await getBlockedTimes(from, to);
      setBlocks(Array.isArray(data) ? data : []);
    } catch {
      setBlocks([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    if (!userId) { showToast("Sign in as a clinician to block time."); return; }
    setSaving(true);
    try {
      await addBlockedTime(userId, form);
      showToast("✓ Time blocked.");
      setForm({ date: "", start_time: "", end_time: "", reason: "", all_day: false });
      load();
    } catch {
      showToast("Failed. Try again.");
    }
    setSaving(false);
  };

  const handleRemove = async (id) => {
    try { await removeBlockedTime(id); } catch { /* ignore */ }
    load();
  };

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.5rem" }}>
      <Toast message={toast} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", maxWidth: 960 }}>
        <EhrCard>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 1rem" }}>Block Off Time</h3>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <EhrInput label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ehr-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.all_day} onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))} />
              All day
            </label>
            {!form.all_day && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <EhrInput label="Start" type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
                <EhrInput label="End" type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
            )}
            <EhrInput label="Reason (optional)" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Holiday, conference…" />
            <EhrBtn type="submit" variant="danger" disabled={saving} style={{ justifyContent: "center" }}>
              {saving ? "Saving…" : "Block This Time"}
            </EhrBtn>
          </form>
        </EhrCard>

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ehr-text)", margin: "0 0 1rem" }}>Upcoming Blocked Times</h3>
          {blocks.length === 0 ? (
            <EhrCard style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ color: "var(--ehr-muted)", fontSize: 13 }}>No blocked times in the next 90 days.</div>
            </EhrCard>
          ) : blocks.map((b) => (
            <EhrCard key={b.id} style={{ marginBottom: 8, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ehr-text)" }}>
                    {new Date(`${b.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ehr-muted)", marginTop: 2 }}>
                    {b.all_day ? "All day" : `${b.start_time?.slice(0, 5) || "—"} – ${b.end_time?.slice(0, 5) || "—"}`}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </div>
                </div>
                <EhrBtn variant="danger" small onClick={() => handleRemove(b.id)}>Remove</EhrBtn>
              </div>
            </EhrCard>
          ))}
        </div>
      </div>
    </div>
  );
}
