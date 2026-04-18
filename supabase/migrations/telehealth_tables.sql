-- ── TELEHEALTH INTEGRATION MIGRATION ─────────────────────────────────────────
-- Phase 6: Add telehealth_url and reminder_sent columns to appointments,
-- enable pg_cron + pg_net extensions, and create the hourly reminder cron job.

-- Add telehealth columns to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS telehealth_url text,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls from within the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hourly cron job: send 24-hour telehealth reminder emails
SELECT cron.schedule(
  'send-telehealth-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://dhuswldjuuhtxejnmfla.supabase.co/functions/v1/send-email',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := json_build_object(
      'type', 'telehealth_reminder',
      'data', json_build_object(
        'name',           a.name,
        'email',          a.email,
        'date',           to_char(a.scheduled_at AT TIME ZONE 'America/New_York', 'Day, Month DD, YYYY'),
        'time',           to_char(a.scheduled_at AT TIME ZONE 'America/New_York', 'HH12:MI AM'),
        'clinician',      COALESCE(a.provider_name, 'Your Clinician'),
        'telehealth_url', a.telehealth_url
      )
    )::text
  )
  FROM appointments a
  WHERE a.appointment_type = 'telehealth'
    AND a.status           = 'confirmed'
    AND a.telehealth_url   IS NOT NULL
    AND a.reminder_sent    = false
    AND a.scheduled_at BETWEEN now() + interval '23 hours'
                           AND now() + interval '25 hours';

  UPDATE appointments
  SET    reminder_sent = true
  WHERE  appointment_type = 'telehealth'
    AND  status           = 'confirmed'
    AND  telehealth_url   IS NOT NULL
    AND  reminder_sent    = false
    AND  scheduled_at BETWEEN now() + interval '23 hours'
                          AND now() + interval '25 hours';
  $$
);
