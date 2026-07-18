-- মানারাহ — মাইগ্রেশন: অভিভাবক পোর্টাল
-- Supabase SQL Editor-এ আলাদাভাবে Run করুন (আগের মাইগ্রেশনগুলোর পরে)।

-- প্রতিটা শিক্ষার্থীর নিজস্ব পোর্টাল কোড (অভিভাবক এই কোড দিয়ে সন্তানের সাথে লিংক করবে)
alter table students add column if not exists portal_code text unique
  default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

-- বিদ্যমান শিক্ষার্থীদের জন্যও কোড বসিয়ে দিন (যাদের এখনও নেই)
update students set portal_code = upper(substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 6))
  where portal_code is null;

-- অভিভাবক ও শিক্ষার্থীর সংযোগ
create table if not exists guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references auth.users(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  institution_id uuid references institutions(id) on delete cascade,
  created_at timestamptz default now(),
  unique (guardian_id, student_id)
);

alter table guardian_links enable row level security;

create policy "guardian_links_select_own" on guardian_links for select using (guardian_id = auth.uid());
create policy "guardian_links_delete_own" on guardian_links for delete using (guardian_id = auth.uid());

-- পোর্টাল কোড দিয়ে নিরাপদে সংযোগ করার ফাংশন
-- (guardian সরাসরি students টেবিল ব্রাউজ করতে পারে না, শুধু সঠিক কোড দিয়ে লিংক করতে পারে)
create or replace function link_guardian_to_student(p_code text)
returns table (student_id uuid, student_name text) as $$
declare
  v_student_id uuid;
  v_institution_id uuid;
  v_name text;
begin
  select id, institution_id, name into v_student_id, v_institution_id, v_name
  from students where portal_code = upper(trim(p_code));

  if v_student_id is null then
    raise exception 'ভুল কোড — এই কোডে কোনো শিক্ষার্থী পাওয়া যায়নি';
  end if;

  insert into guardian_links (guardian_id, student_id, institution_id)
  values (auth.uid(), v_student_id, v_institution_id)
  on conflict (guardian_id, student_id) do nothing;

  return query select v_student_id, v_name;
end;
$$ language plpgsql security definer;

-- guardian-দের জন্য অতিরিক্ত (additive) read-only policy — নিজের লিংক করা সন্তানের তথ্য দেখতে পারবে
create policy "students_select_guardian" on students for select using (
  id in (select student_id from guardian_links where guardian_id = auth.uid())
);

create policy "attendance_select_guardian" on attendance for select using (
  student_id in (select student_id from guardian_links where guardian_id = auth.uid())
);
