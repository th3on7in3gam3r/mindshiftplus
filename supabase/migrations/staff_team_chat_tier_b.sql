-- Tier B lite: @mentions on staff team chat

ALTER TABLE ehr_messages
  ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ehr_messages_mentions
  ON ehr_messages USING GIN (mentioned_user_ids);

ALTER TABLE clinician_roles
  ADD COLUMN IF NOT EXISTS email text;

CREATE POLICY "Staff update own roster email" ON clinician_roles
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
