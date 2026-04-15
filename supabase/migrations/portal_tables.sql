-- ── PATIENT PORTAL TABLES ─────────────────────────────────────────────────────

-- Patient profiles (extends auth.users)
create table if not exists patient_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  phone text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_member_id text,
  insurance_group_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table patient_profiles enable row level security;
create policy "Patients access own profile" on patient_profiles
  for all using (auth.uid() = id);

-- Appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  provider_name text default 'Kenneth Mutegyeki, PMHNP',
  appointment_type text, -- 'initial_evaluation' | 'follow_up' | 'telehealth'
  scheduled_at timestamptz,
  duration_minutes int default 60,
  location text, -- 'Milford' | 'Boston' | 'Telehealth'
  status text default 'upcoming', -- 'upcoming' | 'completed' | 'cancelled' | 'requested'
  notes text,
  created_at timestamptz default now()
);
alter table appointments enable row level security;
create policy "Patients access own appointments" on appointments
  for all using (auth.uid() = patient_id);

-- Messages (secure messaging)
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  sender_role text not null, -- 'patient' | 'clinic'
  subject text,
  body text not null,
  thread_id uuid, -- groups messages into threads
  read boolean default false,
  created_at timestamptz default now()
);
alter table portal_messages enable row level security;
create policy "Patients access own messages" on portal_messages
  for all using (auth.uid() = patient_id);

-- Documents
create table if not exists portal_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text, -- 'intake_form' | 'consent' | 'lab_result' | 'other'
  file_url text,
  status text default 'pending', -- 'pending' | 'completed' | 'uploaded'
  created_at timestamptz default now()
);
alter table portal_documents enable row level security;
create policy "Patients access own documents" on portal_documents
  for all using (auth.uid() = patient_id);
