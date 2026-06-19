-- Allow clinic admin emails to view and review crisis alerts (not only clinician_roles).

DROP POLICY IF EXISTS "Clinicians can view all crisis alerts" ON crisis_alerts;
DROP POLICY IF EXISTS "Clinicians can update crisis alerts" ON crisis_alerts;
DROP POLICY IF EXISTS "Clinicians and admins view crisis alerts" ON crisis_alerts;
DROP POLICY IF EXISTS "Clinicians and admins update crisis alerts" ON crisis_alerts;

CREATE POLICY "Clinicians and admins view crisis alerts" ON crisis_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

CREATE POLICY "Clinicians and admins update crisis alerts" ON crisis_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
