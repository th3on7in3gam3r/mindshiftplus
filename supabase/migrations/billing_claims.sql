-- ── BILLING & CLAIMS MIGRATION ───────────────────────────────────────────────
-- Phase 5: Create billing_claims table with RLS, indexes, and add cpt_codes
-- column to ehr_notes.

-- billing_claims table
CREATE TABLE billing_claims (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                   uuid        NOT NULL REFERENCES auth.users(id),
  chart_id                     uuid        NOT NULL REFERENCES ehr_charts(id),
  appointment_id               uuid        REFERENCES appointments(id),
  note_id                      uuid        REFERENCES ehr_notes(id),
  cpt_codes                    jsonb       NOT NULL DEFAULT '[]',
  claim_status                 text        NOT NULL DEFAULT 'draft'
                                             CHECK (claim_status IN ('draft','submitted','accepted','denied','paid')),
  service_date                 date        NOT NULL,
  amount_billed_cents          integer     NOT NULL DEFAULT 0,
  amount_paid_insurance_cents  integer     NOT NULL DEFAULT 0,
  patient_responsibility_cents integer     NOT NULL DEFAULT 0,
  copay_collected_cents        integer     NOT NULL DEFAULT 0,
  submitted_at                 timestamptz,
  paid_at                      timestamptz,
  notes                        text,
  created_by                   uuid        NOT NULL REFERENCES auth.users(id),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

-- Add cpt_codes to ehr_notes
ALTER TABLE ehr_notes ADD COLUMN IF NOT EXISTS cpt_codes jsonb DEFAULT '[]';

-- Enable RLS
ALTER TABLE billing_claims ENABLE ROW LEVEL SECURITY;

-- Clinicians: full access
CREATE POLICY "clinicians_full_access" ON billing_claims
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinician_roles WHERE user_id = auth.uid()
    )
  );

-- Patients: read-only, own records only
CREATE POLICY "patients_read_own" ON billing_claims
  FOR SELECT
  USING (patient_id = auth.uid());

-- Indexes
CREATE INDEX idx_billing_claims_patient_id   ON billing_claims(patient_id);
CREATE INDEX idx_billing_claims_chart_id     ON billing_claims(chart_id);
CREATE INDEX idx_billing_claims_status       ON billing_claims(claim_status);
CREATE INDEX idx_billing_claims_service_date ON billing_claims(service_date DESC);
