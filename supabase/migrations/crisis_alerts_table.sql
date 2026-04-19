-- Crisis Alerts Table
-- Stores detected crisis language for clinician review

CREATE TABLE IF NOT EXISTS crisis_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL, -- 'mia', 'journal', 'portal_message'
  content_excerpt text NOT NULL,
  keywords_detected text[] NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high', 'moderate')),
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast clinician queries
CREATE INDEX idx_crisis_alerts_reviewed ON crisis_alerts(reviewed, created_at DESC);
CREATE INDEX idx_crisis_alerts_user ON crisis_alerts(user_id, created_at DESC);
CREATE INDEX idx_crisis_alerts_severity ON crisis_alerts(severity, reviewed, created_at DESC);

-- RLS Policies
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;

-- Clinicians can view all crisis alerts
CREATE POLICY "Clinicians can view all crisis alerts"
  ON crisis_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinician_roles
      WHERE clinician_roles.user_id = auth.uid()
    )
  );

-- Clinicians can update crisis alerts (mark as reviewed)
CREATE POLICY "Clinicians can update crisis alerts"
  ON crisis_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinician_roles
      WHERE clinician_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinician_roles
      WHERE clinician_roles.user_id = auth.uid()
    )
  );

-- System can insert crisis alerts
CREATE POLICY "System can insert crisis alerts"
  ON crisis_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE crisis_alerts IS 'Crisis keyword detection alerts for clinician review. Monitors patient communications for safety concerns.';
