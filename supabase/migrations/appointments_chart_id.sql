-- Link appointments to EHR charts for billing, notes, and Open Chart from Schedule.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS chart_id uuid REFERENCES ehr_charts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_chart_id ON appointments(chart_id);
