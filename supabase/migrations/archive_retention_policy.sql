-- Archive Retention Policy Migration
-- Auto-delete archived appointments after 2 years
-- Keeps medical records compliant with HIPAA (7-year minimum for active records)

-- Add updated_at column to appointments table if it doesn't exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to automatically update updated_at on any change
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_updated_at_trigger ON appointments;
CREATE TRIGGER appointments_updated_at_trigger
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_appointments_updated_at();

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to delete archived appointments older than 2 years
-- Runs daily at 2 AM UTC
SELECT cron.schedule(
  'delete-old-archived-appointments',
  '0 2 * * *',
  $$
  DELETE FROM appointments
  WHERE status = 'archived'
    AND updated_at < NOW() - INTERVAL '2 years';
  $$
);

-- Add comment documenting the retention policy
COMMENT ON TABLE appointments IS 'Appointments table. Archived appointments are automatically deleted after 2 years per retention policy.';
