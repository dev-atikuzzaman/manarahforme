-- মানারাহ — মাইগ্রেশন: সেটিংস (প্রতিষ্ঠানের লোগো)
-- Supabase SQL Editor-এ আলাদাভাবে Run করুন (আগের মাইগ্রেশনগুলোর পরে)।

alter table institutions add column if not exists logo_url text;

-- পাবলিক স্টোরেজ বাকেট — লোগো ছবি সরাসরি URL দিয়ে দেখানো যাবে
insert into storage.buckets (id, name, public)
values ('institution-logos', 'institution-logos', true)
on conflict (id) do nothing;

-- প্রতিটা প্রতিষ্ঠান নিজের institution_id নামের ফোল্ডারে আপলোড করবে, যেমন: <institution_id>/logo.png
create policy "logo_read_public" on storage.objects
  for select using (bucket_id = 'institution-logos');

create policy "logo_upload_admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1] = current_institution_id()::text
    and is_admin()
  );

create policy "logo_update_admin" on storage.objects
  for update using (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1] = current_institution_id()::text
    and is_admin()
  );

create policy "logo_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'institution-logos'
    and (storage.foldername(name))[1] = current_institution_id()::text
    and is_admin()
  );
