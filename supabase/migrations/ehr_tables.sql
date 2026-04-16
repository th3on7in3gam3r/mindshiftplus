-- ── EHR TABLES — MindShift Wellness Clinic ────────────────────────────────────
-- Phase 4: Electronic Health Records for clinician use only

-- Clinician roles (maps Supabase auth user → clinician role)
create table if not exists clinician_roles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  title     text not null default 'PMHNP-BC',
  is_admin  boolean default false,
  created_at timestamptz default now()
);
alter table clinician_roles enable row level security;
create policy "Clinicians read own role" on clinician_roles
  for select using (auth.uid() = user_id);
create policy "Service role manages clinician_roles" on clinician_roles
  for all using (true);

-- EHR patient charts (clinician-created, one per patient)
create table if not exists ehr_charts (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references auth.users(id) on delete cascade not null,
  mrn             text unique, -- Medical Record Number
  date_of_birth   date,
  gender          text,
  pronouns        text,
  phone           text,
  address         text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  insurance_provider      text,
  insurance_member_id     text,
  insurance_group         text,
  primary_diagnosis       text,  -- ICD-10 code
  primary_diagnosis_label text,
  secondary_diagnoses     jsonb default '[]',  -- [{code, label}]
  allergies               text,
  pharmacy                text,
  referral_source         text,
  intake_date             date,
  status                  text default 'active', -- active | inactive | discharged
  flags                   jsonb default '[]',    -- [{type, note}]
  created_by              uuid references auth.users(id),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
alter table ehr_charts enable row level security;
create policy "Clinicians manage ehr_charts" on ehr_charts
  for all using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );

-- Clinical encounter notes (SOAP/psychiatric)
create table if not exists ehr_notes (
  id              uuid primary key default gen_random_uuid(),
  chart_id        uuid references ehr_charts(id) on delete cascade not null,
  appointment_id  uuid references appointments(id) on delete set null,
  clinician_id    uuid references auth.users(id) not null,
  clinician_name  text not null,
  note_date       date not null default current_date,
  note_type       text default 'progress', -- intake | progress | discharge | phone
  -- SOAP structure
  subjective      text,
  objective       text,
  assessment      text,
  plan            text,
  -- Psychiatric-specific
  presenting_concerns   text,
  mental_status_exam    jsonb, -- {appearance, behavior, speech, mood, affect, thought_process, thought_content, cognition, insight, judgment}
  risk_assessment       jsonb, -- {suicidal_ideation, homicidal_ideation, self_harm, substance_use, protective_factors}
  diagnoses             jsonb default '[]', -- [{code, label}]
  follow_up_date        date,
  follow_up_instructions text,
  -- Metadata
  is_signed       boolean default false,
  signed_at       timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table ehr_notes enable row level security;
create policy "Clinicians manage ehr_notes" on ehr_notes
  for all using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );

-- Medication management (clinician-managed)
create table if not exists ehr_medications (
  id              uuid primary key default gen_random_uuid(),
  chart_id        uuid references ehr_charts(id) on delete cascade not null,
  medication      text not null,
  dosage          text,
  frequency       text,
  route           text default 'oral',
  prescribed_date date default current_date,
  end_date        date,
  prescriber      text,
  refills         int default 0,
  status          text default 'active', -- active | discontinued | on_hold
  notes           text,
  created_at      timestamptz default now()
);
alter table ehr_medications enable row level security;
create policy "Clinicians manage ehr_medications" on ehr_medications
  for all using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );

-- Lab / document results
create table if not exists ehr_documents (
  id          uuid primary key default gen_random_uuid(),
  chart_id    uuid references ehr_charts(id) on delete cascade not null,
  name        text not null,
  doc_type    text, -- lab | imaging | consent | intake_form | other
  file_url    text,
  uploaded_by uuid references auth.users(id),
  notes       text,
  created_at  timestamptz default now()
);
alter table ehr_documents enable row level security;
create policy "Clinicians manage ehr_documents" on ehr_documents
  for all using (
    exists (select 1 from clinician_roles where user_id = auth.uid())
  );

-- ── SEED: Register clinicians ──────────────────────────────────────────────────
-- Run after clinicians sign up via Supabase Auth.
-- Replace UUIDs with actual auth.users IDs from Supabase Dashboard.
--
-- insert into clinician_roles (user_id, full_name, title, is_admin) values
--   ('<kenneth-uuid>', 'Kenneth Mutegyeki', 'PMHNP-BC', true),
--   ('<rachel-uuid>',  'Rachel Nakkazi',    'PMHNP-BC', false);
--
-- Admin emails also allowed: info@mindshiftwellnessclinic.org, jerlessm@gmail.com
-- Those are whitelisted in ADMIN_EMAILS const in App.jsx and EHRLogin.jsx.
