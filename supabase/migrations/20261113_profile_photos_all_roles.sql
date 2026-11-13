-- TeenWork v58 · profile photos for parents and employers too (Aya 2026-11-13: "get the photo upload to work and
-- let them choose who gets to see it"). Builds on 20261107_profile_photos.sql (same bucket, same table, same
-- "only the owner writes the row" rules). Running it again is safe.
--
-- Who may see a photo is still decided only by the owner's own row in public.tw_profile_photos:
--   teen      'me' · 'parent' (+ parent_viewers) · 'employers' (+ parent_viewers + employer_viewers)   (unchanged)
--   parent    'me' · 'teens' (+ teen_viewers: their linked teens)
--                  · 'teens_employers' (+ teen_viewers + employer_viewers: employers of jobs the parent approved)
--   employer  'me' · 'teens' (+ teen_viewers: teens whose application reached them after a parent's OK)
--                  · 'teens_parents' (+ teen_viewers + parent_viewers: those teens and the parents who approved)
-- The owner's app fills the lists from its own records. A viewer is recognised by the email on their sign-in token.

-- 1. A list for teens, and room for an employer's applicants' parents.
alter table public.tw_profile_photos add column if not exists teen_viewers text[] not null default '{}';

alter table public.tw_profile_photos drop constraint if exists tw_profile_photos_audience_check;
alter table public.tw_profile_photos add constraint tw_profile_photos_audience_check
  check (audience in ('me', 'parent', 'employers', 'teens', 'teens_employers', 'teens_parents'));

alter table public.tw_profile_photos drop constraint if exists tw_profile_photos_parent_viewers_check;
alter table public.tw_profile_photos add constraint tw_profile_photos_parent_viewers_check
  check (cardinality(parent_viewers) <= 300);

alter table public.tw_profile_photos drop constraint if exists tw_profile_photos_teen_viewers_check;
alter table public.tw_profile_photos add constraint tw_profile_photos_teen_viewers_check
  check (cardinality(teen_viewers) <= 300);

-- 2. The one rule for "may the signed-in person see this photo?", now with the teen list.
create or replace function public.tw_photo_viewer_ok(p_owner uuid, p_audience text, p_parents text[], p_employers text[], p_teens text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and (
       p_owner = auth.uid()
    or (p_audience in ('parent', 'employers', 'teens_parents') and public.tw_my_email() = any (p_parents))
    or (p_audience in ('employers', 'teens_employers') and public.tw_my_email() = any (p_employers))
    or (p_audience in ('teens', 'teens_employers', 'teens_parents') and public.tw_my_email() = any (p_teens)));
$$;
revoke all on function public.tw_photo_viewer_ok(uuid, text, text[], text[], text[]) from public, anon;
grant execute on function public.tw_photo_viewer_ok(uuid, text, text[], text[], text[]) to authenticated;

-- The first version (without the teen list) answers the same way, so nothing that still calls it can disagree.
create or replace function public.tw_photo_viewer_ok(p_owner uuid, p_audience text, p_parents text[], p_employers text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.tw_photo_viewer_ok(p_owner, p_audience, p_parents, p_employers, '{}'::text[]);
$$;

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
     and public.tw_photo_viewer_ok(p.owner_id, p.audience, p.parent_viewers, p.employer_viewers, p.teen_viewers);
$$;

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
       and public.tw_photo_viewer_ok(p.owner_id, p.audience, p.parent_viewers, p.employer_viewers, p.teen_viewers));
$$;

-- 3. delete-account (service role) takes a deleted or closed account's email off every list.
create or replace function public.tw_photo_forget_viewer(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tw_profile_photos
     set parent_viewers = array_remove(parent_viewers, lower(p_email)),
         employer_viewers = array_remove(employer_viewers, lower(p_email)),
         teen_viewers = array_remove(teen_viewers, lower(p_email)),
         updated_at = now()
   where lower(p_email) = any (parent_viewers) or lower(p_email) = any (employer_viewers) or lower(p_email) = any (teen_viewers);
$$;

-- Same grants as the first migration (create or replace keeps them; repeated here so a fresh project matches).
revoke all on function public.tw_photo_paths(text[]) from public, anon;
grant execute on function public.tw_photo_paths(text[]) to authenticated;
revoke all on function public.tw_photo_object_ok(text) from public, anon;
grant execute on function public.tw_photo_object_ok(text) to authenticated;
revoke all on function public.tw_photo_forget_viewer(text) from public, anon, authenticated;
grant execute on function public.tw_photo_forget_viewer(text) to service_role;
