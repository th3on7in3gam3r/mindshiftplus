-- Auto-enroll whitelisted staff into clinician_roles on first EHR login (client upsert)

CREATE POLICY "Staff self-enroll clinician_roles" ON clinician_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND lower(auth.email()) IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
