-- Allow clinic staff to read patient names for EHR pickers (AI Scribe, invoices, etc.).

DROP POLICY IF EXISTS "Clinicians and admins read patient profiles" ON patient_profiles;

CREATE POLICY "Clinicians and admins read patient profiles" ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
