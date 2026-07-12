-- Configurable insurance payer list (Medicare, BCBS, etc.) for billing & patient charts

ALTER TABLE clinic_billing_settings
  ADD COLUMN IF NOT EXISTS insurance_payers jsonb NOT NULL DEFAULT '[
    {"name":"Medicare","category":"medicare"},
    {"name":"MassHealth (Medicaid)","category":"medicaid"},
    {"name":"Blue Cross Blue Shield of Massachusetts","category":"commercial"},
    {"name":"Harvard Pilgrim Health Care","category":"commercial"},
    {"name":"Aetna","category":"commercial"},
    {"name":"Cigna & Evernorth","category":"commercial"},
    {"name":"UnitedHealthcare (UHC / UBH)","category":"commercial"},
    {"name":"Tufts Health Plan","category":"commercial"},
    {"name":"Horizon BCBS","category":"commercial"},
    {"name":"Independence Blue Cross","category":"commercial"},
    {"name":"Meritain Health","category":"commercial"},
    {"name":"Quest Behavioral Health","category":"commercial"},
    {"name":"Carelon Behavioral Health","category":"commercial"},
    {"name":"1199SEIU","category":"commercial"},
    {"name":"Self-Pay (No Insurance)","category":"other"}
  ]'::jsonb;
