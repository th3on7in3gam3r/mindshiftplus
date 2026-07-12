-- Tier A staff team chat: threads, DMs, per-user read tracking, realtime

ALTER TABLE ehr_messages
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES ehr_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_context text,
  ADD COLUMN IF NOT EXISTS from_name text;

CREATE INDEX IF NOT EXISTS idx_ehr_messages_thread ON ehr_messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_ehr_messages_to_user ON ehr_messages (to_user);
CREATE INDEX IF NOT EXISTS idx_ehr_messages_created ON ehr_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS ehr_message_reads (
  message_id uuid NOT NULL REFERENCES ehr_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE ehr_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own message reads" ON ehr_message_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff mark messages read" ON ehr_message_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      auth.email() IN (
        'info@mindshiftwellnessclinic.org',
        'jerlessm@gmail.com',
        'kmutegyeki@mindshiftwellnessclinic.org',
        'kmutegyeki@gmail.com',
        'rnakkazi@mindshiftwellnessclinic.org'
      )
      OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    )
  );

-- Team roster for DM picker
DROP POLICY IF EXISTS "Clinicians read team roster" ON clinician_roles;
CREATE POLICY "Clinicians read team roster" ON clinician_roles
  FOR SELECT USING (
    auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
  );

-- Replace broad message policy with visibility-aware rules
DROP POLICY IF EXISTS "Clinicians manage ehr_messages" ON ehr_messages;

CREATE POLICY "Staff read chat messages" ON ehr_messages
  FOR SELECT USING (
    (
      auth.email() IN (
        'info@mindshiftwellnessclinic.org',
        'jerlessm@gmail.com',
        'kmutegyeki@mindshiftwellnessclinic.org',
        'kmutegyeki@gmail.com',
        'rnakkazi@mindshiftwellnessclinic.org'
      )
      OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    )
    AND (to_user IS NULL OR from_user = auth.uid() OR to_user = auth.uid())
  );

CREATE POLICY "Staff send chat messages" ON ehr_messages
  FOR INSERT WITH CHECK (
    from_user = auth.uid()
    AND (
      auth.email() IN (
        'info@mindshiftwellnessclinic.org',
        'jerlessm@gmail.com',
        'kmutegyeki@mindshiftwellnessclinic.org',
        'kmutegyeki@gmail.com',
        'rnakkazi@mindshiftwellnessclinic.org'
      )
      OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    )
  );

-- Realtime: new messages appear without refresh
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ehr_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
