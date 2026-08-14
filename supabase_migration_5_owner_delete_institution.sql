-- মানারাহ — মাইগ্রেশন ৫: ওনার প্যানেল থেকে প্রতিষ্ঠান স্থায়ীভাবে মুছার অনুমতি
-- Supabase ড্যাশবোর্ড → SQL Editor-এ পেস্ট করে Run করুন (আগের মাইগ্রেশনগুলোর পরে)।
--
-- সমস্যা: institutions টেবিলে কোনো DELETE পলিসি নেই (শুধু select/insert/update
-- আছে)। Row Level Security ডিফল্টভাবে সব অ্যাকশন বন্ধ রাখে যতক্ষণ না স্পষ্ট
-- পলিসি দেওয়া হয় — তাই ওনার প্যানেলের "স্থায়ীভাবে মুছুন" বাটনে ক্লিক করলে
-- ডিলিট কার্যকর হয় না (নিজের প্রতিষ্ঠান হোক বা অন্য কারো), যদিও কোনো এরর
-- নাও দেখাতে পারে। এই মাইগ্রেশন প্ল্যাটফর্ম ওনারদের (platform_admins) জন্য
-- ডিলিট পলিসি যোগ করে।
--
-- নোট: এপ ওনারের নিজস্ব প্রতিষ্ঠান থাকা বাধ্যতামূলক না — platform_admins
-- এন্ট্রি আর institution-এর মালিকানা সম্পূর্ণ আলাদা জিনিস। ওনার চাইলে কোনো
-- প্রতিষ্ঠান ছাড়াই শুধু প্ল্যাটফর্ম পরিচালনা করতে পারবেন।

-- ইতিমধ্যে platform_admins টেবিল না থাকলে (যেমন যদি মাইগ্রেশন ৫ আগে কখনো
-- আলাদাভাবে চালানো না হয়ে থাকে), নিরাপদভাবে তৈরি করে দেয় — আগে থেকে থাকলে
-- এই অংশ কিছু পরিবর্তন করবে না।
create table if not exists platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table platform_admins enable row level security;

drop policy if exists "platform_admins_select_self" on platform_admins;
create policy "platform_admins_select_self" on platform_admins
  for select using (id = auth.uid());

-- রিকার্শন এড়াতে security definer হেল্পার ফাংশন (is_admin() এর মতো প্যাটার্ন)
create or replace function is_platform_admin() returns boolean as $$
  select exists (select 1 from platform_admins where id = auth.uid())
$$ language sql security definer stable;

-- আসল ফিক্স: প্ল্যাটফর্ম ওনাররা যেকোনো প্রতিষ্ঠান (নিজেরটাসহ) স্থায়ীভাবে
-- মুছতে পারবেন। institutions-এ ক্যাসকেড রেফারেন্সের কারণে সেই প্রতিষ্ঠানের
-- students/profiles/donations/attendance ইত্যাদি সব ডেটাও স্বয়ংক্রিয়ভাবে
-- মুছে যাবে।
drop policy if exists "institutions_delete_platform_admin" on institutions;
create policy "institutions_delete_platform_admin" on institutions
  for delete using (is_platform_admin());
