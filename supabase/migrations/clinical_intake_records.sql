-- ── Clinical Intake Records — filled by clinician during appointment ──────────

create table if not exists clinical_intake_records (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references auth.users(id) on delete cascade not null unique,

  -- Mental health history
  mh_reason               text,
  mh_psych_diagnosis      text,
  mh_psych_professional   text,
  mh_psych_medications    text,
  mh_psych_hospitalized   text,

  -- Medical history
  med_has_allergies       text,
  med_allergies_detail    text,
  med_has_medications     text,
  med_medications_detail  text,
  med_has_conditions      text,
  med_conditions_detail   text,
  sex_assigned_at_birth   text,

  -- Substance use (yes/no)
  sub_alcohol             text,
  sub_tobacco             text,
  sub_cannabis            text,
  sub_cocaine             text,
  sub_hallucinogens       text,
  sub_opioids             text,
  sub_meth                text,
  sub_notes               text,

  -- Social context
  social_relationships    text,
  social_upbringing       text,
  social_other            text,

  -- SCOFF questionnaire
  scoff_sick              text,
  scoff_control           text,
  scoff_stone             text,
  scoff_fat               text,
  scoff_food              text,

  -- Life situation / SDOH
  living_situation        text,
  housing_concerns        jsonb,
  financial_struggles     jsonb,
  food_insecurity         text,
  transportation_barrier  jsonb,
  daily_living_help       text,
  stress_level            text,
  help_needed             jsonb,
  survey_completed_by     text default 'Clinician',

  -- Clinician notes
  clinician_notes         text,

  -- Metadata
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

alter table clinical_intake_records enable row level security;

-- Only clinicians can read/write
create policy "Clinicians manage clinical intake" on clinical_intake_records
  for all using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );
