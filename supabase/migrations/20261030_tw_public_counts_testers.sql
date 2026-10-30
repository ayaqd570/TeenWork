-- TeenWork tester accounts (2026-10-30): ayaqdteenwork@gmail.com is a tester inbox too (Aya: "let
-- ayaqdteenwork@gmail.com have unlimited acounts"), so its accounts and job posts stay out of the homepage
-- counts the same way ayaquarrierdraper@gmail.com's do. Same function as 20261018_tw_public_counts.sql with
-- one change: the tester check matches both inboxes (+name / dotted / googlemail spellings included), as
-- TESTER_INBOXES in assets/js/tester-accounts-v44.js.
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
                and replace(regexp_replace(split_part(r.em, '@', 1), '\+.*$', ''), '.', '') in ('ayaquarrierdraper', 'ayaqdteenwork'))
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
