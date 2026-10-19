-- TeenWork homepage-trust-v48 (2026-10-18): live, counts-only numbers for the public homepage.
-- The homepage calls rpc('tw_public_counts') and gets numbers only, never names, emails or towns.
-- Counted from user_data:
--   accounts  = account_profile rows of type teen / parent / employer that are not deleted, not closed
--               (closed_accounts), not demo (@teenwork.demo), not test (*.test) and not the tester/admin inbox
--               (ayaquarrierdraper@gmail.com and its +name / dotted / googlemail spellings, as TESTER_INBOXES in the app).
--   open_jobs = job_post:* rows with status "active", not marked test, posted in the last 90 days, by an employer
--               that isn't closed or a tester (the same 90-day cutoff the job board uses).
create or replace function public.tw_try_jsonb(t text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
begin
  return t::jsonb;
exception when others then
  return null;
end;
$$;

create or replace function public.tw_public_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with src as (
    select lower(u.email) as k,
           lower(split_part(u.email, '#', 1)) as em,
           u.key,
           public.tw_try_jsonb(u.value) as v
    from public.user_data u
    where u.key = 'account_profile' or u.key like 'job_post:%'
  ), tagged as (
    select r.*,
           (r.em not like '%@%'
            or r.em like '%@teenwork.demo'
            or r.em ~ '\.test$'
            or (split_part(r.em, '@', 2) in ('gmail.com', 'googlemail.com')
                and replace(regexp_replace(split_part(r.em, '@', 1), '\+.*$', ''), '.', '') = 'ayaquarrierdraper')
            or exists (select 1 from public.closed_accounts c where lower(c.key) = r.k)) as skip
    from src r
    where r.v is not null and jsonb_typeof(r.v) = 'object'
  ), acc as (
    select v->>'type' as role from tagged
    where key = 'account_profile' and not skip
      and coalesce(v->>'deleted', 'false') <> 'true'
      and v->>'type' in ('teen', 'parent', 'employer')
  ), jobs as (
    select nullif(trim(v->>'state'), '') as state from tagged
    where key like 'job_post:%' and not skip
      and v->>'status' = 'active'
      and coalesce(v->>'test', 'false') <> 'true'
      and (case when v->>'postedAt' ~ '^[0-9]+(\.[0-9]+)?$' then (v->>'postedAt')::numeric else 0 end)
          >= extract(epoch from now() - interval '90 days') * 1000
  )
  select jsonb_build_object(
    'teens',     (select count(*) from acc where role = 'teen'),
    'parents',   (select count(*) from acc where role = 'parent'),
    'employers', (select count(*) from acc where role = 'employer'),
    'accounts',  (select count(*) from acc),
    'open_jobs', (select count(*) from jobs),
    'job_states', coalesce((select jsonb_agg(s order by s) from (select distinct state as s from jobs where state is not null) x), '[]'::jsonb),
    'as_of',     now()
  );
$$;

comment on function public.tw_public_counts() is 'TeenWork homepage: live counts only (no names/emails). See homepage-trust/supabase/migration-public-counts.sql.';
revoke all on function public.tw_public_counts() from public;
grant execute on function public.tw_public_counts() to anon, authenticated;
revoke all on function public.tw_try_jsonb(text) from public, anon, authenticated;
