-- ── SCHEDULING SYSTEM TABLES ──────────────────────────────────────────────────

-- Drop and recreate appointments with full scheduling fields
-- (extends the portal appointments table)
alter table appointments
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists reason text,
  add column if not exists is_public boolean default false; -- true = booked without login

-- Allow public (unauthenticated) inserts for the public booking page
drop policy if exists "Patients access own appointments" on appointments;

create policy "Patients read own appointments" on appointments
  for select using (auth.uid() = patient_id);

create policy "Patients insert own appointments" on appointments
  for insert with check (auth.uid() = patient_id OR patient_id is null);

create policy "Patients update own appointments" on appointments
  for update using (auth.uid() = patient_id);

-- Public can insert (for /schedule page — no login required)
create policy "Public can book appointments" on appointments
  for insert with check (patient_id is null AND is_public = true);

-- Admin can read all appointments (service role bypasses RLS anyway)
create policy "Admin reads all appointments" on appointments
  for select using (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.uid() = patient_id
  );

-- Clinician availability (weekly recurring schedule)
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun, 1=Mon...
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int default 60,
  location text default 'Milford',
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table availability enable row level security;
create policy "Anyone can read availability" on availability for select using (true);
create policy "Admin manages availability" on availability
  for all using (auth.uid() = clinician_id);

-- Blocked times (specific dates/ranges that are unavailable)
create table if not exists blocked_times (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid references auth.users(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  reason text,
  all_day boolean default false,
  created_at timestamptz default now()
);
alter table blocked_times enable row level security;
create policy "Anyone can read blocked times" on blocked_times for select using (true);
create policy "Admin manages blocked times" on blocked_times
  for all using (auth.uid() = clinician_id);
