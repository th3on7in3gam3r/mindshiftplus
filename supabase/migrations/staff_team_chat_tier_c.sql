-- Tier C staff team chat: channels, file attachments, read receipts per person
-- Prerequisites: ehr_messages table. If Tier A/B were skipped, this file also
-- ensures read-tracking exists before adding the read-receipt policy.

ALTER TABLE ehr_messages
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES ehr_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_context text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE INDEX IF NOT EXISTS idx_ehr_messages_thread ON ehr_messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_ehr_messages_channel ON ehr_messages (channel)
  WHERE channel IS NOT NULL;

-- Read-tracking table (Tier A) — required for read receipts
CREATE TABLE IF NOT EXISTS ehr_message_reads (
  message_id uuid NOT NULL REFERENCES ehr_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE ehr_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read own message reads" ON ehr_message_reads;
CREATE POLICY "Staff read own message reads" ON ehr_message_reads
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff mark messages read" ON ehr_message_reads;
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

-- Backfill legacy team-wide posts as #general
UPDATE ehr_messages
SET channel = 'general'
WHERE to_user IS NULL AND channel IS NULL;

-- Staff can see read receipts on messages they can view (not just their own reads)
DROP POLICY IF EXISTS "Staff read receipts on visible messages" ON ehr_message_reads;
CREATE POLICY "Staff read receipts on visible messages" ON ehr_message_reads
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
    AND EXISTS (
      SELECT 1 FROM ehr_messages m
      WHERE m.id = message_id
        AND (m.to_user IS NULL OR m.from_user = auth.uid() OR m.to_user = auth.uid())
    )
  );

-- Storage bucket for staff chat attachments (PDF, images, common office docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-chat-attachments',
  'staff-chat-attachments',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Staff read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read staff chat attachments" ON storage.objects;

CREATE POLICY "Staff upload chat attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'staff-chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
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

CREATE POLICY "Staff read chat attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'staff-chat-attachments'
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

CREATE POLICY "Public read staff chat attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'staff-chat-attachments');
