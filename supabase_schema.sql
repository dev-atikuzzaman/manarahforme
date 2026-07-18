-- মানারাহ — Supabase স্কিমা
-- Supabase ড্যাশবোর্ড → SQL Editor-এ পুরোটা পেস্ট করে Run করুন।

-- ==========================================================
-- ১. প্রতিষ্ঠান (Multi-tenant root)
-- ==========================================================
create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

-- ==========================================================
-- ২. প্রোফাইল (auth.users এর সাথে ১:১, role + institution)
-- ==========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  institution_id uuid references institutions(id) on delete cascade,
  role text not null default 'viewer' check (role in ('super_admin', 'branch_admin', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- রিকার্শন এড়াতে security definer হেল্পার ফাংশন
create or replace function current_institution_id() returns uuid as $$
  select institution_id from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function current_role() returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function is_admin() returns boolean as $$
  select current_role() in ('super_admin', 'branch_admin')
$$ language sql security definer stable;

-- ==========================================================
-- ৩. শিক্ষার্থী/সদস্য
-- ==========================================================
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  name text not null,
  guardian_name text,
  phone text,
  class_name text,
  monthly_fee numeric,
  created_at timestamptz default now()
);

-- ==========================================================
-- ৪. উপস্থিতি ও হিফজ অগ্রগতি
-- ==========================================================
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  date date not null,
  status text check (status in ('present', 'absent', 'leave')),
  hifz_progress text,
  created_at timestamptz default now(),
  unique (student_id, date)
);

-- ==========================================================
-- ৫. দান / যাকাত / ফিতরা / ওয়াকফ
-- ==========================================================
create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  donor_name text not null,
  amount numeric not null,
  purpose text default 'সাধারণ দান',
  note text,
  created_at timestamptz default now()
);

-- ==========================================================
-- ৬. কুরবানি ভাগ ব্যবস্থাপনা (পরবর্তী ধাপের জন্য প্রস্তুত)
-- ==========================================================
create table if not exists qurbani_shares (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  year int not null,
  animal_label text,
  share_holder_name text,
  phone text,
  amount_due numeric,
  amount_paid numeric default 0,
  meat_collected boolean default false,
  created_at timestamptz default now()
);

-- ==========================================================
-- ৭. একাউন্টিং — আয়/ব্যয় (পরবর্তী ধাপের জন্য প্রস্তুত)
-- ==========================================================
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  entry_type text check (entry_type in ('income', 'expense')),
  category text,
  amount numeric not null,
  note text,
  entry_date date default current_date,
  created_at timestamptz default now()
);

-- ==========================================================
-- Row Level Security চালু করুন
-- ==========================================================
alter table institutions enable row level security;
alter table profiles enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;
alter table donations enable row level security;
alter table qurbani_shares enable row level security;
alter table ledger_entries enable row level security;

-- ---- institutions ----
create policy "institutions_select_authenticated" on institutions for select using (auth.role() = 'authenticated');
create policy "institutions_insert_authenticated" on institutions for insert with check (auth.role() = 'authenticated');
create policy "institutions_update_admin" on institutions for update using (id = current_institution_id() and is_admin());

-- ---- profiles ----
create policy "profiles_select_own_or_same_institution" on profiles for select using (
  id = auth.uid() or institution_id = current_institution_id()
);
create policy "profiles_insert_self" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_self_or_admin" on profiles for update using (
  id = auth.uid() or (institution_id = current_institution_id() and is_admin())
);

-- ---- students ----
create policy "students_select_same_institution" on students for select using (institution_id = current_institution_id());
create policy "students_write_admin" on students for insert with check (institution_id = current_institution_id() and is_admin());
create policy "students_update_admin" on students for update using (institution_id = current_institution_id() and is_admin());
create policy "students_delete_admin" on students for delete using (institution_id = current_institution_id() and is_admin());

-- ---- attendance ----
create policy "attendance_select_same_institution" on attendance for select using (institution_id = current_institution_id());
create policy "attendance_write_admin" on attendance for insert with check (institution_id = current_institution_id() and is_admin());
create policy "attendance_update_admin" on attendance for update using (institution_id = current_institution_id() and is_admin());

-- ---- donations ----
create policy "donations_select_same_institution" on donations for select using (institution_id = current_institution_id());
create policy "donations_write_admin" on donations for insert with check (institution_id = current_institution_id() and is_admin());

-- ---- qurbani_shares ----
create policy "qurbani_select_same_institution" on qurbani_shares for select using (institution_id = current_institution_id());
create policy "qurbani_write_admin" on qurbani_shares for all using (institution_id = current_institution_id() and is_admin());

-- ---- ledger_entries ----
create policy "ledger_select_same_institution" on ledger_entries for select using (institution_id = current_institution_id());
create policy "ledger_write_admin" on ledger_entries for all using (institution_id = current_institution_id() and is_admin());

-- ==========================================================
-- রিয়েল-টাইম সিঙ্ক চালু করুন
-- ==========================================================
alter publication supabase_realtime add table students;
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table donations;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table qurbani_shares;
alter publication supabase_realtime add table ledger_entries;
