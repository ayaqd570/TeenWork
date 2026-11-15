-- TeenWork v55 · teen profile photos (Aya 2026-11-07: "store them in supabase also let them choose who can see it").
--
-- A teen's photo is one file in the PRIVATE Storage bucket "profile-photos", inside a folder named after the
-- teen's Supabase sign-in id: <auth uid>/p<slot>-<time>.jpg (slot 1 = the main account, 2… = extra accounts on
-- the same email). There are no public links: a viewer's app asks for a one-hour signed link, and Storage only
-- gives one when the rules below say that viewer may see the photo.
--
-- Who may see it is decided only by the teen's own row in public.tw_profile_photos, which only the teen's own
-- signed-in account can write (never by the open user_data table):
--   audience 'me'         the teen only
--   audience 'parent'     the teen + parent_viewers (emails of the parents linked to the teen)
--   audience 'employers'  the above + employer_viewers (employers whose job the teen applied to, after a parent
--                         approved that application)
-- The teen's app fills parent_viewers / employer_viewers from the teen's parent link and applications and keeps
-- them up to date. A viewer is recognised by the email on their own Supabase sign-in token.
-- Apply once in the SQL editor (or with the Supabase CLI). Running it again is safe.
-- Applied to project qocmpwimsfcnqijtfmki on 2026-11-09 (with Aya's OK).

-- 1. The bucket: private, at most 1 MB, JPEG only. The app shrinks every photo to 400×400 and saves it again as
--    JPEG, which also drops the hidden data (like GPS location) that phone cameras add.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2. Each account's photo and who may see it.
create table if not exists public.tw_profile_photos (
  owner_key        text primary key
                   check (owner_key = lower(owner_key) and owner_key ~ '^[^[:space:]@#]+@[^[:space:]@#]+\.[^[:space:]@#]+(#[0-9]{1,3})?$'),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path             text check (path is null or (path like owner_id::text || '/%' and length(path) <= 200)),
  audience         text not null default 'parent' check (audience in ('me', 'parent', 'employers')),
  parent_viewers   text[] not null default '{}' check (cardinality(parent_viewers) <= 10),
  employer_viewers text[] not null default '{}' check (cardinality(employer_viewers) <= 200),
  updated_at       timestamptz not null default now()
);
create index if not exists tw_profile_photos_owner_id_idx on public.tw_profile_photos (owner_id);
create index if not exists tw_profile_photos_path_idx on public.tw_profile_photos (path);
alter table public.tw_profile_photos enable row level security;

-- The email on the signed-in token; null for anon (the app's public key) and for anyone not signed in.
create or replace function public.tw_my_email()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
$$;
revoke all on function public.tw_my_email() from public;
grant execute on function public.tw_my_email() to anon, authenticated;

-- Only the owner reads or writes the row (it holds other people's emails, so viewers never read it directly).
-- The account key must belong to the signed-in email, so nobody can claim someone else's account key.
drop policy if exists "owner reads own photo settings" on public.tw_profile_photos;
create policy "owner reads own photo settings" on public.tw_profile_photos
  for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists "owner adds own photo settings" on public.tw_profile_photos;
create policy "owner adds own photo settings" on public.tw_profile_photos
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and split_part(owner_key, '#', 1) = (select public.tw_my_email()));
drop policy if exists "owner changes own photo settings" on public.tw_profile_photos;
create policy "owner changes own photo settings" on public.tw_profile_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and split_part(owner_key, '#', 1) = (select public.tw_my_email()));
drop policy if exists "owner removes own photo settings" on public.tw_profile_photos;
create policy "owner removes own photo settings" on public.tw_profile_photos
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 3. The one rule for "may the signed-in person see this photo?".
create or replace function public.tw_photo_viewer_ok(p_owner uuid, p_audience text, p_parents text[], p_employers text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and (
       p_owner = auth.uid()
    or (p_audience in ('parent', 'employers') and public.tw_my_email() = any (p_parents))
    or (p_audience = 'employers' and public.tw_my_email() = any (p_employers)));
$$;
revoke all on function public.tw_photo_viewer_ok(uuid, text, text[], text[]) from public, anon;
grant execute on function public.tw_photo_viewer_ok(uuid, text, text[], text[]) to authenticated;

-- The photos (file paths only) the signed-in person may see, for up to 100 account keys at once.
create or replace function public.tw_photo_paths(p_keys text[])
returns table (owner_key text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.owner_key, p.path
    from public.tw_profile_photos p
   where p.owner_key = any (p_keys[1:100])
     and p.path is not null
     and public.tw_photo_viewer_ok(p.owner_id, p.audience, p.parent_viewers, p.employer_viewers);
$$;
revoke all on function public.tw_photo_paths(text[]) from public, anon;
grant execute on function public.tw_photo_paths(text[]) to authenticated;

-- Used by the Storage rule below: may the signed-in person open this file?
create or replace function public.tw_photo_object_ok(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tw_profile_photos p
     where p.path = p_name
       and public.tw_photo_viewer_ok(p.owner_id, p.audience, p.parent_viewers, p.employer_viewers));
$$;
revoke all on function public.tw_photo_object_ok(text) from public, anon;
grant execute on function public.tw_photo_object_ok(text) to authenticated;

-- delete-account (service role) takes a deleted or closed account's email off everyone's viewer lists.
create or replace function public.tw_photo_forget_viewer(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tw_profile_photos
     set parent_viewers = array_remove(parent_viewers, lower(p_email)),
         employer_viewers = array_remove(employer_viewers, lower(p_email)),
         updated_at = now()
   where lower(p_email) = any (parent_viewers) or lower(p_email) = any (employer_viewers);
$$;
revoke all on function public.tw_photo_forget_viewer(text) from public, anon, authenticated;
grant execute on function public.tw_photo_forget_viewer(text) to service_role;

-- 4. Storage rules for the bucket. Owners upload, replace and delete only inside their own folder; a file can be
--    opened (signed link) by its owner and by the people the owner's audience allows.
drop policy if exists "profile photos: owner uploads" on storage.objects;
create policy "profile photos: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "profile photos: owner replaces" on storage.objects;
create policy "profile photos: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "profile photos: owner deletes" on storage.objects;
create policy "profile photos: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "profile photos: owner and chosen people view" on storage.objects;
create policy "profile photos: owner and chosen people view" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos'
         and ((storage.foldername(name))[1] = (select auth.uid()::text) or public.tw_photo_object_ok(name)));
