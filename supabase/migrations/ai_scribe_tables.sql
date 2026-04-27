-- AI Scribe Tables for Clinical Documentation
-- Stores AI-generated clinical notes and integrates with EHR

-- ============================================================================
-- AI Scribe Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_scribe_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patient & Provider Info
  patient_id TEXT NOT NULL,
  patient_chart_id UUID REFERENCES ehr_charts(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  
  -- Session Details
  date_of_service DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type TEXT NOT NULL, -- 'Initial Evaluation', 'Follow-up', 'Medication Management', 'Therapy', 'Combined'
  modality TEXT NOT NULL, -- 'Telehealth', 'In-Person'
  duration_minutes INTEGER,
  specialty TEXT NOT NULL, -- 'psychiatry', 'psychology', 'primary-care', 'pediatrics'
  
  -- Clinical Content
  clinical_context TEXT,
  transcript TEXT,
  generated_note TEXT,
  
  -- ICD-10 Codes
  icd10_codes TEXT[], -- Array of ICD-10 codes
  
  -- Quality Metrics
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_issues JSONB, -- Array of quality issues detected
  
  -- Recording Metadata
  recording_duration_seconds INTEGER,
  recording_started_at TIMESTAMPTZ,
  recording_completed_at TIMESTAMPTZ,
  
  -- Status & Workflow
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'pushed_to_ehr', 'archived'
  pushed_to_ehr_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_session_type CHECK (session_type IN ('Initial Evaluation', 'Follow-up', 'Medication Management', 'Therapy', 'Combined')),
  CONSTRAINT valid_modality CHECK (modality IN ('Telehealth', 'In-Person')),
  CONSTRAINT valid_specialty CHECK (specialty IN ('psychiatry', 'psychology', 'primary-care', 'pediatrics')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'completed', 'pushed_to_ehr', 'archived'))
);

-- Indexes for performance
CREATE INDEX idx_ai_scribe_sessions_patient ON ai_scribe_sessions(patient_id);
CREATE INDEX idx_ai_scribe_sessions_provider ON ai_scribe_sessions(provider_id);
CREATE INDEX idx_ai_scribe_sessions_date ON ai_scribe_sessions(date_of_service DESC);
CREATE INDEX idx_ai_scribe_sessions_status ON ai_scribe_sessions(status);
CREATE INDEX idx_ai_scribe_sessions_chart ON ai_scribe_sessions(patient_chart_id);

-- ============================================================================
-- AI Scribe Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_scribe_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  specialty TEXT NOT NULL,
  session_type TEXT,
  
  -- Template Content
  template_structure JSONB NOT NULL, -- JSON structure for note sections
  prompt_instructions TEXT, -- Instructions for AI generation
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_template_specialty CHECK (specialty IN ('psychiatry', 'psychology', 'primary-care', 'pediatrics', 'general'))
);

CREATE INDEX idx_ai_scribe_templates_specialty ON ai_scribe_templates(specialty);
CREATE INDEX idx_ai_scribe_templates_public ON ai_scribe_templates(is_public);

-- ============================================================================
-- AI Scribe Audit Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_scribe_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  session_id UUID REFERENCES ai_scribe_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Action Details
  action TEXT NOT NULL, -- 'created', 'updated', 'pushed_to_ehr', 'downloaded', 'copied', 'archived'
  details JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_scribe_audit_session ON ai_scribe_audit_log(session_id);
CREATE INDEX idx_ai_scribe_audit_user ON ai_scribe_audit_log(user_id);
CREATE INDEX idx_ai_scribe_audit_created ON ai_scribe_audit_log(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_scribe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scribe_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scribe_audit_log ENABLE ROW LEVEL SECURITY;

-- AI Scribe Sessions Policies
CREATE POLICY "Providers can view their own sessions"
  ON ai_scribe_sessions FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can create sessions"
  ON ai_scribe_sessions FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update their own sessions"
  ON ai_scribe_sessions FOR UPDATE
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete their own sessions"
  ON ai_scribe_sessions FOR DELETE
  USING (auth.uid() = provider_id);

-- Templates Policies
CREATE POLICY "Anyone can view public templates"
  ON ai_scribe_templates FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create templates"
  ON ai_scribe_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON ai_scribe_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON ai_scribe_templates FOR DELETE
  USING (auth.uid() = created_by);

-- Audit Log Policies
CREATE POLICY "Users can view their own audit logs"
  ON ai_scribe_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON ai_scribe_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_scribe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ai_scribe_sessions
CREATE TRIGGER update_ai_scribe_sessions_updated_at
  BEFORE UPDATE ON ai_scribe_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_scribe_updated_at();

-- Trigger for ai_scribe_templates
CREATE TRIGGER update_ai_scribe_templates_updated_at
  BEFORE UPDATE ON ai_scribe_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_scribe_updated_at();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_scribe_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Insert Default Templates
-- ============================================================================

INSERT INTO ai_scribe_templates (name, description, specialty, session_type, template_structure, is_public) VALUES
(
  'Psychiatric Progress Note',
  'Standard psychiatric follow-up note template',
  'psychiatry',
  'Follow-up',
  '{
    "sections": [
      {"name": "Chief Complaint", "required": true},
      {"name": "History of Present Illness", "required": true},
      {"name": "Mental Status Examination", "required": true},
      {"name": "Assessment", "required": true},
      {"name": "Plan", "required": true}
    ]
  }'::jsonb,
  true
),
(
  'Initial Psychiatric Evaluation',
  'Comprehensive initial psychiatric assessment',
  'psychiatry',
  'Initial Evaluation',
  '{
    "sections": [
      {"name": "Chief Complaint", "required": true},
      {"name": "History of Present Illness", "required": true},
      {"name": "Psychiatric History", "required": true},
      {"name": "Medical History", "required": true},
      {"name": "Social History", "required": true},
      {"name": "Family History", "required": true},
      {"name": "Mental Status Examination", "required": true},
      {"name": "Assessment", "required": true},
      {"name": "Plan", "required": true}
    ]
  }'::jsonb,
  true
),
(
  'Therapy Session Note',
  'Psychotherapy session documentation',
  'psychology',
  'Therapy',
  '{
    "sections": [
      {"name": "Session Focus", "required": true},
      {"name": "Interventions Used", "required": true},
      {"name": "Patient Response", "required": true},
      {"name": "Progress Toward Goals", "required": true},
      {"name": "Plan for Next Session", "required": true}
    ]
  }'::jsonb,
  true
),
(
  'Medication Management Visit',
  'Medication review and management note',
  'psychiatry',
  'Medication Management',
  '{
    "sections": [
      {"name": "Current Medications", "required": true},
      {"name": "Medication Efficacy", "required": true},
      {"name": "Side Effects", "required": true},
      {"name": "Adherence", "required": true},
      {"name": "Mental Status Examination", "required": true},
      {"name": "Assessment", "required": true},
      {"name": "Medication Changes", "required": true},
      {"name": "Plan", "required": true}
    ]
  }'::jsonb,
  true
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_scribe_sessions IS 'Stores AI-generated clinical documentation sessions';
COMMENT ON TABLE ai_scribe_templates IS 'Note templates for different specialties and session types';
COMMENT ON TABLE ai_scribe_audit_log IS 'Audit trail for AI Scribe actions';

COMMENT ON COLUMN ai_scribe_sessions.quality_score IS 'AI-generated quality score from 0-100';
COMMENT ON COLUMN ai_scribe_sessions.quality_issues IS 'JSON array of detected quality issues';
COMMENT ON COLUMN ai_scribe_sessions.status IS 'Workflow status: draft, completed, pushed_to_ehr, archived';
