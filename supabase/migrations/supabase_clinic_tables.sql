-- ── RUN THIS IN YOUR SUPABASE SQL EDITOR ─────────────────────────────────────
-- MindShift Wellness Clinic — Portal tables on Supabase

create table if not exists patient_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, date_of_birth date, phone text, address text,
  emergency_contact_name text, emergency_contact_phone text,
  insurance_provider text, insurance_member_id text, insurance_group_number text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table patient_profiles enable row level security;
create policy "Own profile" on patient_profiles for all using (auth.uid() = id);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade,
  name text, email text, phone text, reason text,
  provider_name text default 'Kenneth Mutegyeki, PMHNP',
  appointment_type text, scheduled_at timestamptz,
  duration_minutes int default 60, location text default 'Milford',
  status text default 'pending', notes text, is_public boolean default false,
  created_at timestamptz default now()
);
alter table appointments enable row level security;
create policy "Own appointments" on appointments for all using (auth.uid() = patient_id);
create policy "Public insert" on appointments for insert with check (patient_id is null and is_public = true);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null, end_time time not null,
  slot_duration_minutes int default 60, location text default 'Milford',
  is_active boolean default true, created_at timestamptz default now()
);
alter table availability enable row level security;
create policy "Anyone reads availability" on availability for select using (true);
create policy "Admin manages availability" on availability for all using (auth.uid() = clinician_id);

create table if not exists blocked_times (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid references auth.users(id) on delete cascade,
  date date not null, start_time time, end_time time,
  reason text, all_day boolean default false, created_at timestamptz default now()
);
alter table blocked_times enable row level security;
create policy "Anyone reads blocked" on blocked_times for select using (true);
create policy "Admin manages blocked" on blocked_times for all using (auth.uid() = clinician_id);

create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  sender_role text not null, subject text, body text not null,
  thread_id uuid, read boolean default false, created_at timestamptz default now()
);
alter table portal_messages enable row level security;
create policy "Own messages" on portal_messages for all using (auth.uid() = patient_id);

create table if not exists portal_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  name text not null, type text, file_url text,
  status text default 'pending', created_at timestamptz default now()
);
alter table portal_documents enable row level security;
create policy "Own documents" on portal_documents for all using (auth.uid() = patient_id);

create table if not exists visit_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  clinician_name text default 'Kenneth Mutegyeki, PMHNP',
  appointment_id uuid references appointments(id) on delete set null,
  note_date date not null default current_date,
  chief_complaint text, assessment text, plan text, follow_up text,
  created_at timestamptz default now()
);
alter table visit_notes enable row level security;
create policy "Own visit notes" on visit_notes for select using (auth.uid() = patient_id);
create policy "Admin inserts notes" on visit_notes for insert with check (true);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  medication text not null, dosage text, frequency text,
  prescribed_date date default current_date, refills_remaining int default 0,
  status text default 'active', prescriber text default 'Kenneth Mutegyeki, PMHNP',
  notes text, created_at timestamptz default now()
);
alter table prescriptions enable row level security;
create policy "Own prescriptions" on prescriptions for select using (auth.uid() = patient_id);
create policy "Admin inserts rx" on prescriptions for insert with check (true);
