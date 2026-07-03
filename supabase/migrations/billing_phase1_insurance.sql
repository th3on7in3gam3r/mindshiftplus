-- Phase 1: Insurance billing prep — clinic settings, enriched claims, claim types

-- Clinic billing configuration (NPI, providers, billing address)
CREATE TABLE IF NOT EXISTS clinic_billing_settings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name       text        NOT NULL DEFAULT 'MindShift Wellness Clinic',
  billing_address   text        NOT NULL DEFAULT '31 Granite St. Suite #2, Milford, MA 01757',
  phone             text        NOT NULL DEFAULT '(508) 306-1128',
  email             text        NOT NULL DEFAULT 'info@mindshiftwellnessclinic.org',
  tax_id            text,
  providers         jsonb       NOT NULL DEFAULT '[
    {"name":"Kenneth Mutegyeki","title":"PMHNP-BC","npi":"1487410999","taxonomy":"363LP0808X"},
    {"name":"Rachel Nakkazi","title":"PMHNP-BC","npi":"","taxonomy":"363LP0808X"}
  ]'::jsonb,
  updated_by        uuid        REFERENCES auth.users(id),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinic_billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinicians_manage_billing_settings" ON clinic_billing_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.jwt() ->> 'email' IN (
      'jerlessm@gmail.com',
      'info@mindshiftwellnessclinic.org'
    )
  );

-- Enrich billing_claims for insurance superbills
ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS claim_type text NOT NULL DEFAULT 'insurance_claim'
    CHECK (claim_type IN ('insurance_claim', 'patient_invoice'));

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS icd10_codes jsonb NOT NULL DEFAULT '[]';

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS insurance_provider text;

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS insurance_member_id text;

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS insurance_group text;

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS rendering_provider_name text;

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS rendering_provider_npi text;

ALTER TABLE billing_claims
  ADD COLUMN IF NOT EXISTS place_of_service text NOT NULL DEFAULT '11';

CREATE INDEX IF NOT EXISTS idx_billing_claims_claim_type ON billing_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_billing_claims_note_id ON billing_claims(note_id);

-- Existing rows created via Invoices are patient invoices
UPDATE billing_claims
SET claim_type = 'patient_invoice'
WHERE note_id IS NULL AND appointment_id IS NULL;
