-- মানারাহ — মাইগ্রেশন: নোটিফিকেশন সিস্টেম
-- Supabase SQL Editor-এ এটা আলাদাভাবে Run করুন (supabase_schema.sql-এর পরে)।

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  title text not null,
  message text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table profiles add column if not exists last_seen_notifications_at timestamptz default now();

alter table notifications enable row level security;

create policy "notifications_select_same_institution" on notifications for select using (institution_id = current_institution_id());
create policy "notifications_insert_admin" on notifications for insert with check (institution_id = current_institution_id() and is_admin());

alter publication supabase_realtime add table notifications;
