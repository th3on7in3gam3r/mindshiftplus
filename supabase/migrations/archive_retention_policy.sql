-- Archive Retention Policy Migration
-- Auto-delete archived appointments after 2 years
-- Keeps medical records compliant with HIPAA (7-year minimum for active records)

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
