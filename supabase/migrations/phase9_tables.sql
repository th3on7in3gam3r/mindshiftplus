-- Phase 9: EHR extended features

-- Clinician tasks / reminders
CREATE TABLE IF NOT EXISTS ehr_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid REFERENCES auth.users(id) NOT NULL,
  patient_id  uuid REFERENCES auth.users(id),
  chart_id    uuid REFERENCES ehr_charts(id),
  title       text NOT NULL,
  notes       text,
  due_date    date,
  priority    text DEFAULT 'normal', -- low | normal | high | urgent
  status      text DEFAULT 'open',   -- open | done
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE ehr_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicians manage tasks" ON ehr_tasks FOR ALL
  USING (auth.email() IN ('info@mindshiftwellnessclinic.org','jerlessm@gmail.com','kmutegyeki@mindshiftwellnessclinic.org','rnakkazi@mindshiftwellnessclinic.org')
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid()));

-- Internal staff messages
CREATE TABLE IF NOT EXISTS ehr_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   uuid REFERENCES auth.users(id) NOT NULL,
  to_user     uuid REFERENCES auth.users(id),  -- null = broadcast to all staff
  patient_id  uuid REFERENCES auth.users(id),
  subject     text,
  body        text NOT NULL,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE ehr_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicians manage ehr_messages" ON ehr_messages FOR ALL
  USING (auth.email() IN ('info@mindshiftwellnessclinic.org','jerlessm@gmail.com','kmutegyeki@mindshiftwellnessclinic.org','rnakkazi@mindshiftwellnessclinic.org')
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid()));

-- Gift cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  balance_cents integer NOT NULL,
  issued_to   text,  -- patient name or email
  issued_by   uuid REFERENCES auth.users(id),
  redeemed_by uuid REFERENCES auth.users(id),
  status      text DEFAULT 'active', -- active | redeemed | expired | cancelled
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicians manage gift_cards" ON gift_cards FOR ALL
  USING (auth.email() IN ('info@mindshiftwellnessclinic.org','jerlessm@gmail.com','kmutegyeki@mindshiftwellnessclinic.org','rnakkazi@mindshiftwellnessclinic.org')
    OR EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid()));
