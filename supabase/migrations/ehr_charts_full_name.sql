-- Add full_name column to ehr_charts (was missing from original migration)
ALTER TABLE ehr_charts ADD COLUMN IF NOT EXISTS full_name text;
