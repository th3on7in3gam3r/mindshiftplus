-- Archive + retention for portal_messages
-- Only designated staff may archive/delete messages older than 90 days.

ALTER TABLE portal_messages
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_portal_messages_archived ON portal_messages(archived_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);

-- Replace broad clinician FOR ALL policy with granular access
DROP POLICY IF EXISTS "Clinicians manage portal_messages" ON portal_messages;

CREATE POLICY "Clinicians read portal_messages" ON portal_messages
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

CREATE POLICY "Clinicians insert portal_messages" ON portal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'clinic'
    AND (
      EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
      OR lower(auth.email()) IN (
        'info@mindshiftwellnessclinic.org',
        'jerlessm@gmail.com',
        'kmutegyeki@mindshiftwellnessclinic.org',
        'kmutegyeki@gmail.com',
        'rnakkazi@mindshiftwellnessclinic.org'
      )
    )
  );

CREATE POLICY "Clinicians update portal_messages read" ON portal_messages
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
  WITH CHECK (true);

-- Retention managers: delete only messages 90+ days old
CREATE POLICY "Retention managers delete old portal_messages" ON portal_messages
  FOR DELETE
  TO authenticated
  USING (
    lower(auth.email()) IN (
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'kmutegyeki@gmail.com',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
    AND created_at < now() - interval '90 days'
  );

-- Enforce archive rules and block unauthorized deletes/updates at the DB layer
CREATE OR REPLACE FUNCTION portal_messages_retention_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  em text := lower(coalesce(auth.jwt()->>'email', ''));
  is_manager boolean := em IN (
    'jerlessm@gmail.com',
    'kmutegyeki@mindshiftwellnessclinic.org',
    'kmutegyeki@gmail.com',
    'rnakkazi@mindshiftwellnessclinic.org'
  );
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT is_manager THEN
      RAISE EXCEPTION 'Only designated clinic leadership can delete portal messages';
    END IF;
    IF OLD.created_at > now() - interval '90 days' THEN
      RAISE EXCEPTION 'Portal messages must be at least 90 days old before deletion';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    IF NOT is_manager THEN
      RAISE EXCEPTION 'Only designated clinic leadership can archive portal messages';
    END IF;
    IF NEW.archived_at IS NOT NULL AND OLD.created_at > now() - interval '90 days' THEN
      RAISE EXCEPTION 'Portal messages must be at least 90 days old before archiving';
    END IF;
    IF NEW.archived_at IS NOT NULL AND NEW.archived_by IS NULL THEN
      NEW.archived_by := auth.uid();
    END IF;
    IF NEW.archived_at IS NULL AND OLD.archived_at IS NOT NULL THEN
      NEW.archived_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_messages_retention_guard_trigger ON portal_messages;
CREATE TRIGGER portal_messages_retention_guard_trigger
  BEFORE UPDATE OR DELETE ON portal_messages
  FOR EACH ROW
  EXECUTE FUNCTION portal_messages_retention_guard();
