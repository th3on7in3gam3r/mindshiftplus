-- Allow clinic staff (clinicians + admin emails) to view all AI Scribe sessions in EHR patient charts.

DROP POLICY IF EXISTS "Clinicians and admins view scribe sessions" ON ai_scribe_sessions;

CREATE POLICY "Clinicians and admins view scribe sessions" ON ai_scribe_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = provider_id
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
