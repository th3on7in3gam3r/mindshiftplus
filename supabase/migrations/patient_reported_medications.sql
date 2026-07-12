-- Patients can add medications from other providers (self-reported)

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'clinic'
  CHECK (source IN ('clinic', 'patient_reported'));

CREATE INDEX IF NOT EXISTS idx_prescriptions_source ON prescriptions(patient_id, source);

DROP POLICY IF EXISTS "Patient inserts self-reported rx" ON prescriptions;
CREATE POLICY "Patient inserts self-reported rx" ON prescriptions
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id AND source = 'patient_reported');

DROP POLICY IF EXISTS "Patient updates self-reported rx" ON prescriptions;
CREATE POLICY "Patient updates self-reported rx" ON prescriptions
  FOR UPDATE
  USING (auth.uid() = patient_id AND source = 'patient_reported');

DROP POLICY IF EXISTS "Patient deletes self-reported rx" ON prescriptions;
CREATE POLICY "Patient deletes self-reported rx" ON prescriptions
  FOR DELETE
  USING (auth.uid() = patient_id AND source = 'patient_reported');
