-- Telehealth session countdown (doctor sets duration; timer starts when patient joins)

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS session_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS session_timer_started_at timestamptz;

COMMENT ON COLUMN appointments.session_duration_minutes IS 'Clinician-set session length for telehealth countdown (minutes)';
COMMENT ON COLUMN appointments.session_timer_started_at IS 'When the patient joined video — countdown starts from this timestamp';
