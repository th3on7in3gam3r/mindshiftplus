import { useId } from "react";
import { payerCategoryLabel } from "../../lib/billingDb";

/** Payer picker — select from clinic list or type a custom insurer name. */
export default function InsurancePayerInput({ label = "Insurance Payer", value, onChange, payers = [], placeholder = "Medicare, BCBS, Aetna…" }) {
  const listId = useId();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ehr-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
      )}
      <input
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="ehr-input"
      />
      <datalist id={listId}>
        {payers.map((p) => (
          <option key={p.name} value={p.name}>
            {payerCategoryLabel(p.category)}
          </option>
        ))}
      </datalist>
    </div>
  );
}
