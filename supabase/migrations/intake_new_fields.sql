-- ── Add new intake fields: SCOFF, biopsychosocial, social context ─────────────

-- SCOFF questionnaire
alter table intake_submissions
  add column if not exists scoff_sick     text,
  add column if not exists scoff_control  text,
  add column if not exists scoff_stone    text,
  add column if not exists scoff_fat      text,
  add column if not exists scoff_food     text;

-- Biopsychosocial — reason for treatment
alter table intake_submissions
  add column if not exists biopsych_reason text;

-- Biopsychosocial — mental health history (yes/no)
alter table intake_submissions
  add column if not exists biopsych_psych_diagnosis    text,
  add column if not exists biopsych_psych_professional text,
  add column if not exists biopsych_psych_medications  text,
  add column if not exists biopsych_psych_hospitalized text;

-- Biopsychosocial — medical history (yes/no)
alter table intake_submissions
  add column if not exists biopsych_has_allergies   text,
  add column if not exists biopsych_has_medications text,
  add column if not exists biopsych_has_conditions  text;

-- Biopsychosocial — substance use (yes/no)
alter table intake_submissions
  add column if not exists substance_alcohol       text,
  add column if not exists substance_tobacco       text,
  add column if not exists substance_cannabis      text,
  add column if not exists substance_cocaine       text,
  add column if not exists substance_hallucinogens text,
  add column if not exists substance_opioids       text,
  add column if not exists substance_meth          text;

-- Biopsychosocial — social context
alter table intake_submissions
  add column if not exists social_relationships   text,
  add column if not exists social_upbringing      text,
  add column if not exists social_other           text,
  add column if not exists sex_assigned_at_birth  text;

-- Life situation / SDOH survey
alter table intake_submissions
  add column if not exists living_situation       text,
  add column if not exists housing_concerns       jsonb,
  add column if not exists financial_struggles    jsonb,
  add column if not exists food_insecurity        text,
  add column if not exists transportation_barrier jsonb,
  add column if not exists daily_living_help      text,
  add column if not exists stress_level           text,
  add column if not exists help_needed            jsonb,
  add column if not exists survey_completed_by    text default 'Patient alone';

-- Financial consents
alter table intake_submissions
  add column if not exists consent_assignment_of_benefits    boolean default false,
  add column if not exists consent_financial_responsibility  boolean default false;
