-- Keep a single clinic_billing_settings row (fixes stale payer list from duplicate rows)

DELETE FROM clinic_billing_settings
WHERE id NOT IN (
  SELECT id FROM clinic_billing_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1
);
