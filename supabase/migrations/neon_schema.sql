-- ── RUN THIS IN YOUR NEON DASHBOARD ──────────────────────────────────────────
-- MindShift Wellness Clinic — Clinic Database (Neon)

-- Patient profiles
create table if not exists patient_profiles (
  id text primary key, -- Supabase auth user ID
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

-- Appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id text,              -- Supabase user ID (null for public bookings)
  name text,                    -- For public bookings
  email text,
  phone text,
  reason text,
  provider_name text default 'Kenneth Mutegyeki, PMHNP',
  appointment_type text,
  scheduled_at timestamptz,
  duration_minutes int default 60,
  location text default 'Milford',
  status text default 'pending', -- pending | confirmed | cancelled | completed
  notes text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- Clinician availability (weekly recurring)
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  clinician_id text,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int default 60,
  location text default 'Milford',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Blocked times
create table if not exists blocked_times (
  id uuid primary key default gen_random_uuid(),
  clinician_id text,
  date date not null,
  start_time time,
  end_time time,
  reason text,
  all_day boolean default false,
  created_at timestamptz default now()
);

-- Secure messages
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  sender_role text not null, -- 'patient' | 'clinic'
  subject text,
  body text not null,
  thread_id uuid,
  read boolean default false,
  created_at timestamptz default now()
);

-- Documents
create table if not exists portal_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  name text not null,
  type text,
  file_url text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_appointments_scheduled on appointments(scheduled_at);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_availability_day on availability(day_of_week);
create index if not exists idx_blocked_times_date on blocked_times(date);
create index if not exists idx_messages_patient on portal_messages(patient_id);
