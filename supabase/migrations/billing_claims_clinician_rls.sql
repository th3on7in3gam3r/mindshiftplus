-- Allow clinic admin emails to manage billing_claims (not only clinician_roles rows).

DROP POLICY IF EXISTS "clinicians_full_access" ON billing_claims;
DROP POLICY IF EXISTS "Clinicians and admins manage billing_claims" ON billing_claims;

CREATE POLICY "Clinicians and admins manage billing_claims" ON billing_claims
  FOR ALL
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
