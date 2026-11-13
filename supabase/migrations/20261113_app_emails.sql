-- TeenWork v57 (2026-11-13): occasional "get the app" reminder emails, and who already has the app.
-- Aya: "have a download app button and a popup try to get users to download and send emails about sometimes".
--
-- • tw_email_prefs: one row per Supabase user who got a reminder, opened TeenWork as an installed app, or
--   unsubscribed. Nobody in the app can read it. People change their own row only through the functions below.
-- • tw_app_installed(): the app calls it (signed in) when TeenWork runs from the home screen, so the reminders
--   stop for that person.
-- • tw_email_unsubscribe(token) / tw_email_resubscribe(token): the link at the bottom of every reminder
--   (https://teenwork.ayaqd.com/?unsub=<token>) and the one-click unsubscribe that mail apps offer.
-- • tw_app_email_claim(...): the app-emails Edge Function (service role only) picks who is due and marks them.
--   It runs at most once every 20 hours, whoever calls the function, so calling it again sends nothing new.
-- • A pg_cron job calls app-emails once a day at 22:00 UTC (5 pm in New York in winter, 6 pm in summer).
--
-- Who gets a reminder: a teen / parent / employer account that is at least 2 days old and hasn't opened the
-- installed app, hasn't unsubscribed and isn't closed. Never the admin, demo / .test addresses or Aya's tester
-- inboxes. At most 2 reminders per person ever, at least 21 days apart (the function's defaults).
--
-- Apply in the Supabase SQL editor (https://supabase.com/dashboard/project/qocmpwimsfcnqijtfmki/sql/new) or with
-- apply_migration. It only adds things; running it twice is safe.

create table if not exists public.tw_email_prefs (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  unsub_token       uuid not null default gen_random_uuid() unique,
  tips_off_at       timestamptz,          -- set = no reminder emails (unsubscribed)
  app_installed_at  timestamptz,          -- set = opened TeenWork as an installed app
  app_emails_sent   int not null default 0,
  last_app_email_at timestamptz,
  updated_at        timestamptz not null default now()
);
alter table public.tw_email_prefs enable row level security;   -- no policies: anon and signed-in users get nothing
revoke all on public.tw_email_prefs from anon, authenticated;

create table if not exists public.tw_job_runs (
  name        text primary key,
  last_run_at timestamptz
);
alter table public.tw_job_runs enable row level security;
revoke all on public.tw_job_runs from anon, authenticated;

-- Aya's tester inboxes, demo and .test addresses (same rule as tw_public_counts and TESTER_INBOXES in the app).
create or replace function public.tw_is_test_email(p_email text)
returns boolean
language sql immutable
set search_path = public
as $$
  select p_email is null
      or lower(p_email) like '%@teenwork.demo'
      or lower(p_email) ~ '\.test$'
      or (split_part(lower(p_email), '@', 2) in ('gmail.com', 'googlemail.com')
          and replace(regexp_replace(split_part(lower(p_email), '@', 1), '\+.*$', ''), '.', '') in ('ayaquarrierdraper', 'ayaqdteenwork'));
$$;

-- The app, signed in, running from the home screen.
create or replace function public.tw_app_installed()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  insert into public.tw_email_prefs (user_id, app_installed_at) values (uid, now())
  on conflict (user_id) do update
    set app_installed_at = coalesce(public.tw_email_prefs.app_installed_at, now()), updated_at = now();
  return true;
end $$;

-- The unsubscribe link. The token is a random uuid that only that person's emails carry.
create or replace function public.tw_email_unsubscribe(p_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.tw_email_prefs set tips_off_at = coalesce(tips_off_at, now()), updated_at = now()
    where unsub_token = p_token returning 1
  ) select exists (select 1 from u);
$$;

create or replace function public.tw_email_resubscribe(p_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.tw_email_prefs set tips_off_at = null, updated_at = now()
    where unsub_token = p_token returning 1
  ) select exists (select 1 from u);
$$;

-- Who is due a reminder now (newest accounts first). Service role only.
create or replace function public.tw_app_email_due(p_min_age interval, p_gap interval, p_max_per_user int)
returns table (user_id uuid, email text, first_name text, account_type text, created_at timestamptz, sent int, last_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id,
         u.email::text,
         left(nullif(trim(u.raw_user_meta_data->>'first_name'), ''), 40),
         coalesce(nullif(u.raw_user_meta_data->>'account_type', ''), u.raw_user_meta_data->'tw_accounts'->0->>'type'),
         u.created_at,
         coalesce(p.app_emails_sent, 0),
         p.last_app_email_at
  from auth.users u
  left join public.tw_email_prefs p on p.user_id = u.id
  where u.email is not null and u.email <> ''
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until < now())
    and u.created_at < now() - p_min_age
    and coalesce(u.raw_app_meta_data->>'tw_role', '') <> 'admin'
    and coalesce(nullif(u.raw_user_meta_data->>'account_type', ''), u.raw_user_meta_data->'tw_accounts'->0->>'type') in ('teen', 'parent', 'employer')
    and not public.tw_is_test_email(u.email)
    and not exists (select 1 from public.closed_accounts c where lower(c.key) = lower(u.email))
    and p.tips_off_at is null
    and p.app_installed_at is null
    and coalesce(p.app_emails_sent, 0) < p_max_per_user
    and (p.last_app_email_at is null or p.last_app_email_at < now() - p_gap)
  order by u.created_at desc;
$$;

-- Pick up to p_limit people who are due and mark them as emailed (count + 1, time = now).
-- Returns nothing when the job already ran in the last p_every (unless p_force).
create or replace function public.tw_app_email_claim(
  p_limit int default 25,
  p_min_age interval default '2 days',
  p_gap interval default '21 days',
  p_max_per_user int default 2,
  p_every interval default '20 hours',
  p_force boolean default false
) returns table (user_id uuid, email text, first_name text, account_type text, step int, unsub_token uuid, prev_last_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform pg_advisory_xact_lock(hashtext('tw_app_email_claim'));
  if not p_force and exists (select 1 from public.tw_job_runs j where j.name = 'app-emails' and j.last_run_at > now() - p_every) then
    return;
  end if;
  insert into public.tw_job_runs (name, last_run_at) values ('app-emails', now())
  on conflict (name) do update set last_run_at = excluded.last_run_at;

  return query
  with due as (
    select d.* from public.tw_app_email_due(p_min_age, p_gap, greatest(p_max_per_user, 0)) d
    limit greatest(0, least(coalesce(p_limit, 0), 200))
  ), up as (
    insert into public.tw_email_prefs as p (user_id, app_emails_sent, last_app_email_at, updated_at)
    select due.user_id, 1, now(), now() from due
    on conflict on constraint tw_email_prefs_pkey do update
      set app_emails_sent = p.app_emails_sent + 1, last_app_email_at = now(), updated_at = now()
    returning p.user_id as uid, p.app_emails_sent as n, p.unsub_token as tok
  )
  select due.user_id, due.email, due.first_name, due.account_type, up.n, up.tok, due.last_at
  from due join up on up.uid = due.user_id;
end $$;

-- A reminder that could not be sent: put the person back the way they were.
create or replace function public.tw_app_email_unclaim(p_user uuid, p_prev_last_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tw_email_prefs
     set app_emails_sent = greatest(app_emails_sent - 1, 0), last_app_email_at = p_prev_last_at, updated_at = now()
   where user_id = p_user;
$$;

revoke all on function public.tw_is_test_email(text) from public;
revoke all on function public.tw_app_installed() from public, anon;
revoke all on function public.tw_email_unsubscribe(uuid) from public;
revoke all on function public.tw_email_resubscribe(uuid) from public;
revoke all on function public.tw_app_email_due(interval, interval, int) from public, anon, authenticated;
revoke all on function public.tw_app_email_claim(int, interval, interval, int, interval, boolean) from public, anon, authenticated;
revoke all on function public.tw_app_email_unclaim(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.tw_is_test_email(text) to service_role;
grant execute on function public.tw_app_installed() to authenticated;
grant execute on function public.tw_email_unsubscribe(uuid) to anon, authenticated;
grant execute on function public.tw_email_resubscribe(uuid) to anon, authenticated;
grant execute on function public.tw_app_email_due(interval, interval, int) to service_role;
grant execute on function public.tw_app_email_claim(int, interval, interval, int, interval, boolean) to service_role;
grant execute on function public.tw_app_email_unclaim(uuid, timestamptz) to service_role;

-- Once a day. The function itself refuses to run twice within 20 hours and does nothing until Resend is set up.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'tw-app-emails',
  '0 22 * * *',
  $job$
    select net.http_post(
      url := 'https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/app-emails',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"action": "run"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);
-- To stop the reminders: select cron.unschedule('tw-app-emails');
