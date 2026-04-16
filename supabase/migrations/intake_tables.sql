-- ── PATIENT INTAKE TABLES — Phase 8 ──────────────────────────────────────────

create table if not exists intake_submissions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references auth.users(id) on delete cascade not null unique,
  -- Step 1: Demographics
  full_name       text,
  date_of_birth   date,
  gender          text,
  pronouns        text,
  phone           text,
  address         text,
  -- Step 2: Emergency & Insurance
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  insurance_provider      text,
  insurance_member_id     text,
  insurance_group         text,
  -- Step 3: Medical history
  primary_care_provider   text,
  pharmacy                text,
  current_medications     text,
  allergies               text,
  medical_conditions      text,
  hospitalizations        text,
  surgeries               text,
  -- Step 4: Mental health history
  reason_for_visit        text,
  symptoms_duration       text,
  previous_therapy        boolean default false,
  previous_psychiatry     boolean default false,
  previous_treatment_notes text,
  previous_diagnoses      text,
  family_mental_health    text,
  substance_use           text,
  -- Step 5: Safety & consent
  suicidal_ideation       text default 'no',   -- no | past | current
  self_harm               text default 'no',
  safety_plan             text,
  consent_treatment       boolean default false,
  consent_privacy         boolean default false,
  consent_telehealth      boolean default false,
  signature               text,
  -- Metadata
  status    text default 'pending',  -- pending | reviewed | chart_created
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table intake_submissions enable row level security;

-- Patients can read/write their own intake
create policy "Patient manages own intake" on intake_submissions
  for all using (auth.uid() = patient_id);

-- Clinicians can read all intakes
create policy "Clinicians read all intakes" on intake_submissions
  for select using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );

-- Clinicians can update status/reviewed_by
create policy "Clinicians update intake status" on intake_submissions
  for update using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );
