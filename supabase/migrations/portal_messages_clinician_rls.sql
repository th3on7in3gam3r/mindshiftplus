-- Allow clinic staff to read, reply to, and delete patient portal messages.
-- Patients keep existing access via "Patients access own messages" / "Own messages" policy.

DROP POLICY IF EXISTS "Clinicians manage portal_messages" ON portal_messages;

CREATE POLICY "Clinicians manage portal_messages" ON portal_messages
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
