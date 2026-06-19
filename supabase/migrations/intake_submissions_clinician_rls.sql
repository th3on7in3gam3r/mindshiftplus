-- Ensure all clinic admin emails (incl. Kenneth gmail) can read intakes for AI Scribe picker.

DROP POLICY IF EXISTS "Clinicians read all intakes" ON intake_submissions;
DROP POLICY IF EXISTS "Clinicians and admins read all intakes" ON intake_submissions;

CREATE POLICY "Clinicians and admins read all intakes" ON intake_submissions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
