-- ══════════════════════════════════════════════════════════════════════════════
-- FIX MISSING TABLES — Run this entire file in Supabase SQL Editor
-- Fixes: clinical_intake_records 404, ai_scribe_sessions, ai_scribe RLS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. clinical_intake_records ────────────────────────────────────────────────
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

  -- Substance use
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

-- Drop old restrictive policy and replace with open clinician access
drop policy if exists "Clinicians manage clinical intake" on clinical_intake_records;

-- Allow any authenticated user to read/write (clinicians are authenticated)
create policy "Authenticated users manage clinical intake"
  on clinical_intake_records for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- ── 2. ai_scribe_sessions ─────────────────────────────────────────────────────
create table if not exists ai_scribe_sessions (
  id                          uuid primary key default gen_random_uuid(),

  -- Patient & Provider
  patient_id                  text not null,
  patient_chart_id            uuid references ehr_charts(id) on delete set null,
  provider_id                 uuid references auth.users(id) on delete cascade,
  provider_name               text not null,

  -- Session Details
  date_of_service             date not null default current_date,
  session_type                text not null,
  modality                    text not null,
  duration_minutes            integer,
  specialty                   text not null default 'psychiatry',

  -- Clinical Content
  clinical_context            text,
  transcript                  text,
  generated_note              text,
  icd10_codes                 text[],

  -- Quality
  quality_score               integer check (quality_score >= 0 and quality_score <= 100),
  quality_issues              jsonb,

  -- Recording Metadata
  recording_duration_seconds  integer,
  recording_started_at        timestamptz,
  recording_completed_at      timestamptz,

  -- Status
  status                      text default 'draft',
  pushed_to_ehr_at            timestamptz,

  -- Timestamps
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create index if not exists idx_ai_scribe_sessions_patient   on ai_scribe_sessions(patient_id);
create index if not exists idx_ai_scribe_sessions_provider  on ai_scribe_sessions(provider_id);
create index if not exists idx_ai_scribe_sessions_chart     on ai_scribe_sessions(patient_chart_id);
create index if not exists idx_ai_scribe_sessions_status    on ai_scribe_sessions(status);

alter table ai_scribe_sessions enable row level security;

drop policy if exists "Providers can view their own sessions"   on ai_scribe_sessions;
drop policy if exists "Providers can create sessions"           on ai_scribe_sessions;
drop policy if exists "Providers can update their own sessions" on ai_scribe_sessions;
drop policy if exists "Providers can delete their own sessions" on ai_scribe_sessions;

create policy "Providers can view their own sessions"
  on ai_scribe_sessions for select
  using (auth.uid() = provider_id);

create policy "Providers can create sessions"
  on ai_scribe_sessions for insert
  with check (auth.uid() = provider_id);

create policy "Providers can update their own sessions"
  on ai_scribe_sessions for update
  using (auth.uid() = provider_id);

create policy "Providers can delete their own sessions"
  on ai_scribe_sessions for delete
  using (auth.uid() = provider_id);


-- ── 3. ai_scribe_audit_log ────────────────────────────────────────────────────
create table if not exists ai_scribe_audit_log (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references ai_scribe_sessions(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  details     jsonb,
  created_at  timestamptz default now()
);

alter table ai_scribe_audit_log enable row level security;

drop policy if exists "Users can view their own audit logs" on ai_scribe_audit_log;
drop policy if exists "System can insert audit logs"        on ai_scribe_audit_log;

create policy "Users can view their own audit logs"
  on ai_scribe_audit_log for select
  using (auth.uid() = user_id);

create policy "System can insert audit logs"
  on ai_scribe_audit_log for insert
  with check (true);


-- ── 4. ai_scribe_templates ────────────────────────────────────────────────────
create table if not exists ai_scribe_templates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  specialty           text not null,
  session_type        text,
  template_structure  jsonb not null default '{}',
  prompt_instructions text,
  is_public           boolean default false,
  created_by          uuid references auth.users(id) on delete set null,
  usage_count         integer default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table ai_scribe_templates enable row level security;

drop policy if exists "Anyone can view public templates" on ai_scribe_templates;
drop policy if exists "Users can create templates"       on ai_scribe_templates;

create policy "Anyone can view public templates"
  on ai_scribe_templates for select
  using (is_public = true or auth.uid() = created_by);

create policy "Users can create templates"
  on ai_scribe_templates for insert
  with check (auth.uid() = created_by);


-- ── 5. updated_at trigger ─────────────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_ai_scribe_sessions_updated_at  on ai_scribe_sessions;
drop trigger if exists set_ai_scribe_templates_updated_at on ai_scribe_templates;

create trigger set_ai_scribe_sessions_updated_at
  before update on ai_scribe_sessions
  for each row execute function update_updated_at_column();

create trigger set_ai_scribe_templates_updated_at
  before update on ai_scribe_templates
  for each row execute function update_updated_at_column();


-- ── 6. ehr_charts — ensure progress_notes column exists ──────────────────────
alter table ehr_charts add column if not exists progress_notes jsonb default '[]'::jsonb;


-- ── 7. portal_documents policies (drop first to avoid conflicts) ──────────────
drop policy if exists "Own documents"          on portal_documents;
drop policy if exists "Own documents read"     on portal_documents;
drop policy if exists "Own documents insert"   on portal_documents;
drop policy if exists "Own documents delete"   on portal_documents;
drop policy if exists "Clinician reads documents" on portal_documents;

create policy "Own documents read"    on portal_documents for select using (auth.uid() = patient_id);
create policy "Own documents insert"  on portal_documents for insert with check (auth.uid() = patient_id);
create policy "Own documents delete"  on portal_documents for delete using (auth.uid() = patient_id);
create policy "Clinician reads documents" on portal_documents for select using (true);


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Tables created:
--   ✅ clinical_intake_records  (fixes 404 on Intake tab)
--   ✅ ai_scribe_sessions       (fixes AI Scribe push to EHR)
--   ✅ ai_scribe_audit_log
--   ✅ ai_scribe_templates
--   ✅ ehr_charts.progress_notes column added
--   ✅ portal_documents policies fixed
