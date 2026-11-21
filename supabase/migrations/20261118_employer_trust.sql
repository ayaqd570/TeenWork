-- TeenWork v64 · employer trust checks (Aya 2026-11-18: "The app says plainly that employers aren't verified.
-- Adding a confirmed phone number, reviews from past jobs, and an employer history parents can see before
-- approving would make the safety story much stronger.")
--
-- Three new records, each written only through a rule that checks who is asking (never through the open
-- user_data table, which anyone with the app's key can write):
--   tw_employer_phone    an employer account's phone number was confirmed with a texted code. Written only by
--                        the employer-phone Edge Function (service role). Keeps the last 4 digits and a keyed
--                        hash of the number (to count accounts per number), never the number itself.
--   tw_employer_hires    the employer said "Hired" for a teen's application. Written only by the employer's own
--                        signed-in account (tw_record_hire), and only for an application to that employer's job.
--   tw_employer_reviews  a teen who worked the job, or that teen's linked parent, rated the employer (1-5 stars
--                        and an optional note). One review per person per job; it can be changed later.
-- A review only counts once the employer's own account has recorded the hire, so nobody can review an employer
-- by writing a fake "hired" application. Each review's stars and note stay hidden from everyone for 14 days, or
-- until the employer has rated the teen for that job in the after-job wrap-up (user_data row
-- <employer>/job_wrap:<job id>:<teen>), so nobody rates to get even; the totals include it right away.
--
-- tw_employer_trust(keys) answers what a signed-in parent, teen or employer may see about up to 50 employer
-- accounts: on TeenWork since, phone confirmed (and when), jobs posted, teens hired, jobs finished, review count,
-- average and the latest released reviews (stars, note, "teen" or "parent", date; never names or emails).
-- The employer also sees their own last 4 digits and a code that is waiting.
--
-- Apply once in the SQL editor (or with the Supabase CLI). Running it again is safe. Needs tw_my_email()
-- (20261107_profile_photos.sql), tw_is_admin() (20261030_admin_role.sql) and closed_accounts (20261018).

-- The account key format used everywhere: email, or email#N for an extra account on the same email.
create or replace function public.tw_valid_key(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null and length(p) <= 254 and p ~ '^[^[:space:]@#,()"*<>]+@[^[:space:]@#,()"*<>]+\.[^[:space:]@#,()"*<>]+(#[0-9]{1,3})?$';
$$;
revoke all on function public.tw_valid_key(text) from public;
grant execute on function public.tw_valid_key(text) to anon, authenticated, service_role;

-- 1. Phone confirmations ──────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tw_employer_phone (
  account_key     text primary key check (account_key = lower(account_key) and public.tw_valid_key(account_key)),
  user_id         uuid not null references auth.users (id) on delete cascade,
  confirmed_hash  text check (confirmed_hash is null or confirmed_hash ~ '^[0-9a-f]{64}$'),
  confirmed_last4 text check (confirmed_last4 is null or confirmed_last4 ~ '^[0-9]{4}$'),
  confirmed_at    timestamptz,
  pending_hash    text check (pending_hash is null or pending_hash ~ '^[0-9a-f]{64}$'),
  pending_last4   text check (pending_last4 is null or pending_last4 ~ '^[0-9]{4}$'),
  pending_sid     text check (pending_sid is null or pending_sid ~ '^[A-Za-z0-9]{1,64}$'),
  pending_at      timestamptz,
  pending_checks  integer not null default 0 check (pending_checks between 0 and 100),
  updated_at      timestamptz not null default now()
);
create index if not exists tw_employer_phone_user_idx on public.tw_employer_phone (user_id);
create index if not exists tw_employer_phone_hash_idx on public.tw_employer_phone (confirmed_hash);
alter table public.tw_employer_phone enable row level security;
revoke all on public.tw_employer_phone from public, anon, authenticated;

-- Every code TeenWork texts, for the limits below (texts cost money, so they are capped).
create table if not exists public.tw_phone_sends (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  phone_hash text not null check (phone_hash ~ '^[0-9a-f]{64}$'),
  sent_at    timestamptz not null default now()
);
create index if not exists tw_phone_sends_user_idx on public.tw_phone_sends (user_id, sent_at);
create index if not exists tw_phone_sends_hash_idx on public.tw_phone_sends (phone_hash, sent_at);
create index if not exists tw_phone_sends_time_idx on public.tw_phone_sends (sent_at);
alter table public.tw_phone_sends enable row level security;
revoke all on public.tw_phone_sends from public, anon, authenticated;

-- Used by the employer-phone function before it texts a code: 'ok' (and the send is counted), or which limit
-- was reached in the last 24 hours: 'user_limit' (this sign-in), 'phone_limit' (this number), 'day_limit' (all).
create or replace function public.tw_phone_send_ok(p_user uuid, p_hash text, p_user_max integer, p_phone_max integer, p_day_max integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('tw_phone_sends'));
  if (select count(*) from public.tw_phone_sends where user_id = p_user and sent_at > now() - interval '24 hours') >= p_user_max then return 'user_limit'; end if;
  if (select count(*) from public.tw_phone_sends where phone_hash = p_hash and sent_at > now() - interval '24 hours') >= p_phone_max then return 'phone_limit'; end if;
  if (select count(*) from public.tw_phone_sends where sent_at > now() - interval '24 hours') >= p_day_max then return 'day_limit'; end if;
  insert into public.tw_phone_sends (user_id, phone_hash) values (p_user, p_hash);
  delete from public.tw_phone_sends where sent_at < now() - interval '30 days';
  return 'ok';
end;
$$;
revoke all on function public.tw_phone_send_ok(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tw_phone_send_ok(uuid, text, integer, integer, integer) to service_role;

-- 2. Hires the employer recorded ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.tw_employer_hires (
  employer_key text not null check (employer_key = lower(employer_key) and public.tw_valid_key(employer_key)),
  job_id       bigint not null check (job_id > 0),
  teen_key     text not null check (teen_key = lower(teen_key) and public.tw_valid_key(teen_key)),
  employer_id  uuid not null references auth.users (id) on delete cascade,
  hired_at     timestamptz not null default now(),
  primary key (employer_key, job_id, teen_key)
);
create index if not exists tw_employer_hires_teen_idx on public.tw_employer_hires (teen_key);
alter table public.tw_employer_hires enable row level security;
revoke all on public.tw_employer_hires from public, anon, authenticated;

-- One user_data row's value as JSON (null when missing or not JSON). user_data keys are stored lowercase, but
-- the raw spelling is tried too.
create or replace function public.tw_ud(p_email text, p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.tw_try_jsonb(u.value)
    from public.user_data u
   where u.email = any (array[p_email, lower(p_email)]) and u.key = p_key
   order by (u.email = lower(p_email)) desc
   limit 1;
$$;
revoke all on function public.tw_ud(text, text) from public, anon, authenticated;

-- The employer's own account says "Hired" for a teen's application to one of its jobs.
create or replace function public.tw_record_hire(p_employer text, p_job_id text, p_teen text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me  text := public.tw_my_email();
  v_emp text := lower(trim(coalesce(p_employer, '')));
  v_teen text := lower(trim(coalesce(p_teen, '')));
  v_app jsonb;
begin
  if auth.uid() is null or v_me is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if not public.tw_valid_key(v_emp) or not public.tw_valid_key(v_teen) or coalesce(p_job_id, '') !~ '^[0-9]{1,16}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if split_part(v_emp, '#', 1) <> v_me then return jsonb_build_object('ok', false, 'error', 'not_yours'); end if;
  if public.tw_ud(v_emp, 'job_post:' || p_job_id) is null then return jsonb_build_object('ok', false, 'error', 'no_job'); end if;
  v_app := public.tw_ud(v_teen, 'job_app:' || p_job_id);
  if v_app is null or lower(coalesce(v_app ->> 'employerKey', '')) <> v_emp or coalesce(v_app ->> 'status', '') not in ('applied', 'hired') then
    return jsonb_build_object('ok', false, 'error', 'no_application');
  end if;
  insert into public.tw_employer_hires (employer_key, job_id, teen_key, employer_id)
  values (v_emp, p_job_id::bigint, v_teen, auth.uid())
  on conflict (employer_key, job_id, teen_key) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.tw_record_hire(text, text, text) from public, anon;
grant execute on function public.tw_record_hire(text, text, text) to authenticated;

-- 3. Reviews of employers ─────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tw_employer_reviews (
  id            bigserial primary key,
  employer_key  text not null check (employer_key = lower(employer_key) and public.tw_valid_key(employer_key)),
  job_id        bigint not null check (job_id > 0),
  teen_key      text not null check (teen_key = lower(teen_key) and public.tw_valid_key(teen_key)),
  reviewer_id   uuid not null references auth.users (id) on delete cascade,
  reviewer_key  text not null check (reviewer_key = lower(reviewer_key) and public.tw_valid_key(reviewer_key)),
  reviewer_role text not null check (reviewer_role in ('teen', 'parent')),
  rating        integer not null check (rating between 1 and 5),
  body          text not null default '' check (char_length(body) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  hidden        boolean not null default false,
  unique (reviewer_key, employer_key, job_id, teen_key)
);
create index if not exists tw_employer_reviews_employer_idx on public.tw_employer_reviews (employer_key);
create index if not exists tw_employer_reviews_reviewer_idx on public.tw_employer_reviews (reviewer_id, updated_at);
alter table public.tw_employer_reviews enable row level security;
revoke all on public.tw_employer_reviews from public, anon, authenticated;

-- A teen who was hired for the job, or a parent linked to that teen, rates the employer.
-- p_teen: the teen's account key (a teen may leave it empty: their own email is used).
create or replace function public.tw_review_employer(p_employer text, p_job_id text, p_teen text, p_rating integer, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   text := public.tw_my_email();
  v_emp  text := lower(trim(coalesce(p_employer, '')));
  v_teen text := lower(trim(coalesce(nullif(p_teen, ''), public.tw_my_email(), '')));
  v_app  jsonb;
  v_link jsonb;
  v_role text;
  v_key  text;
  v_body text;
  v_id   bigint;
begin
  if auth.uid() is null or v_me is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if p_rating is null or p_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'bad_rating'); end if;
  if not public.tw_valid_key(v_emp) or not public.tw_valid_key(v_teen) or coalesce(p_job_id, '') !~ '^[0-9]{1,16}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if split_part(v_emp, '#', 1) = v_me then return jsonb_build_object('ok', false, 'error', 'not_allowed'); end if;

  -- who is asking: the teen, or a parent linked to the teen (or the parent who approved this application)
  v_app := public.tw_ud(v_teen, 'job_app:' || p_job_id);
  if split_part(v_teen, '#', 1) = v_me then
    v_role := 'teen'; v_key := v_teen;
  else
    v_link := public.tw_ud(v_teen, 'parent_link');
    if (v_link ->> 'status' = 'approved' and (lower(coalesce(v_link ->> 'parentEmail', '')) = v_me
          or exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(v_link -> 'parents') = 'array' then v_link -> 'parents' else '[]'::jsonb end) x where lower(x) = v_me)))
       or lower(coalesce(v_app ->> 'parentEmail', '')) = v_me then
      v_role := 'parent'; v_key := v_me;
    else
      return jsonb_build_object('ok', false, 'error', 'not_allowed');
    end if;
  end if;

  -- the teen worked this job: the application says hired, or the employer recorded the hire
  if not (exists (select 1 from public.tw_employer_hires h where h.employer_key = v_emp and h.job_id = p_job_id::bigint and h.teen_key = v_teen)
          or (v_app is not null and lower(coalesce(v_app ->> 'employerKey', '')) = v_emp and v_app ->> 'status' = 'hired')) then
    return jsonb_build_object('ok', false, 'error', 'not_hired');
  end if;

  if (select count(*) from public.tw_employer_reviews r where r.reviewer_id = auth.uid() and r.updated_at > now() - interval '24 hours') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  -- plain text only: no control characters, angle brackets or runs of spaces, at most 500 characters
  v_body := left(btrim(regexp_replace(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]<>]+', ' ', 'g'), ' {2,}', ' ', 'g')), 500);

  insert into public.tw_employer_reviews (employer_key, job_id, teen_key, reviewer_id, reviewer_key, reviewer_role, rating, body)
  values (v_emp, p_job_id::bigint, v_teen, auth.uid(), v_key, v_role, p_rating, v_body)
  on conflict (reviewer_key, employer_key, job_id, teen_key)
  do update set rating = excluded.rating, body = excluded.body, reviewer_id = excluded.reviewer_id, updated_at = now()
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'role', v_role,
    'counts', exists (select 1 from public.tw_employer_hires h where h.employer_key = v_emp and h.job_id = p_job_id::bigint and h.teen_key = v_teen));
end;
$$;
revoke all on function public.tw_review_employer(text, text, text, integer, text) from public, anon;
grant execute on function public.tw_review_employer(text, text, text, integer, text) to authenticated;

-- The signed-in person's own reviews (to show "You rated this employer ★4" and fill the form again).
create or replace function public.tw_my_employer_reviews()
returns table (employer_key text, job_id bigint, teen_key text, rating integer, body text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.employer_key, r.job_id, r.teen_key, r.rating, r.body, r.updated_at
    from public.tw_employer_reviews r
   where r.reviewer_id = auth.uid()
   order by r.updated_at desc
   limit 200;
$$;
revoke all on function public.tw_my_employer_reviews() from public, anon;
grant execute on function public.tw_my_employer_reviews() to authenticated;

-- 4. What a signed-in person may see about employers ─────────────────────────────────────────────────────────
create or replace function public.tw_employer_trust(p_keys text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me  text := public.tw_my_email();
  v_out jsonb := '[]'::jsonb;
  v_key text;
  v_ph  public.tw_employer_phone;
  v_obj jsonb;
  v_n   integer;
  v_avg numeric;
  v_released integer;
begin
  if auth.uid() is null or v_me is null then return v_out; end if;
  for v_key in
    select x.k from (
      select lower(trim(t.k)) as k, min(t.n) as n from unnest(coalesce(p_keys, '{}'::text[])) with ordinality as t(k, n)
       where t.n <= 50 and public.tw_valid_key(lower(trim(t.k)))
       group by 1) x
     order by x.n
  loop
    if exists (select 1 from public.closed_accounts c where lower(c.key) = v_key) then
      v_out := v_out || jsonb_build_array(jsonb_build_object('key', v_key, 'closed', true));
      continue;
    end if;
    select * into v_ph from public.tw_employer_phone p where p.account_key = v_key;

    -- reviews that count: not hidden by the admin, and the employer recorded the hire
    with counted as (
      select r.* from public.tw_employer_reviews r
       where r.employer_key = v_key and not r.hidden
         and exists (select 1 from public.tw_employer_hires h where h.employer_key = r.employer_key and h.job_id = r.job_id and h.teen_key = r.teen_key)
    )
    select count(*), round(avg(rating)::numeric, 1),
           count(*) filter (where created_at < now() - interval '14 days'
                              or exists (select 1 from public.user_data u where u.email = r2.employer_key and u.key = 'job_wrap:' || r2.job_id || ':' || r2.teen_key))
      into v_n, v_avg, v_released
      from counted r2;

    v_obj := jsonb_build_object(
      'key', v_key,
      'since', (select min(a.created_at)::date from auth.users a where lower(a.email) = split_part(v_key, '#', 1)),
      'phone', v_ph.confirmed_at is not null,
      'phone_at', v_ph.confirmed_at::date,
      'jobs_posted', (select count(*) from public.user_data u where u.email = v_key and u.key like 'job_post:%'),
      'hires', (select count(*) from public.tw_employer_hires h where h.employer_key = v_key),
      'teens', (select count(distinct h.teen_key) from public.tw_employer_hires h where h.employer_key = v_key),
      'finished', (select count(*) from public.user_data u where u.email = v_key and u.key like 'job_wrap:%'),
      'reviews', v_n,
      'avg', v_avg,
      'held', v_n - v_released,
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object('rating', x.rating, 'text', x.body, 'role', x.reviewer_role, 'at', x.created_at::date) order by x.created_at desc)
          from (
            select r.rating, r.body, r.reviewer_role, r.created_at
              from public.tw_employer_reviews r
             where r.employer_key = v_key and not r.hidden
               and exists (select 1 from public.tw_employer_hires h where h.employer_key = r.employer_key and h.job_id = r.job_id and h.teen_key = r.teen_key)
               and (r.created_at < now() - interval '14 days'
                    or exists (select 1 from public.user_data u where u.email = r.employer_key and u.key = 'job_wrap:' || r.job_id || ':' || r.teen_key))
             order by r.created_at desc
             limit 5) x), '[]'::jsonb));
    if split_part(v_key, '#', 1) = v_me then
      v_obj := v_obj || jsonb_build_object('mine', true, 'last4', v_ph.confirmed_last4,
        'pending', v_ph.pending_sid is not null and v_ph.pending_at > now() - interval '10 minutes', 'pending_last4', v_ph.pending_last4);
    end if;
    v_out := v_out || jsonb_build_array(v_obj);
  end loop;
  return v_out;
end;
$$;
revoke all on function public.tw_employer_trust(text[]) from public, anon;
grant execute on function public.tw_employer_trust(text[]) to authenticated;

-- 5. The admin can read and hide reviews (for example one with someone's phone number in it) ───────────────
create or replace function public.tw_admin_employer_reviews(p_limit integer default 100)
returns table (id bigint, employer_key text, job_id bigint, teen_key text, reviewer_key text, reviewer_role text,
               rating integer, body text, created_at timestamptz, hidden boolean, hire_recorded boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.employer_key, r.job_id, r.teen_key, r.reviewer_key, r.reviewer_role, r.rating, r.body, r.created_at, r.hidden,
         exists (select 1 from public.tw_employer_hires h where h.employer_key = r.employer_key and h.job_id = r.job_id and h.teen_key = r.teen_key)
    from public.tw_employer_reviews r
   where public.tw_is_admin()
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;
revoke all on function public.tw_admin_employer_reviews(integer) from public, anon;
grant execute on function public.tw_admin_employer_reviews(integer) to authenticated;

create or replace function public.tw_hide_employer_review(p_id bigint, p_hidden boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.tw_is_admin() then raise exception 'Only the TeenWork admin can hide reviews' using errcode = '42501'; end if;
  update public.tw_employer_reviews set hidden = coalesce(p_hidden, true) where id = p_id;
  return found;
end;
$$;
revoke all on function public.tw_hide_employer_review(bigint, boolean) from public, anon;
grant execute on function public.tw_hide_employer_review(bigint, boolean) to authenticated;

-- 6. delete-account (service role) removes an account's trust records when the account is deleted or closed:
--    its phone confirmation, hires it recorded or was part of, reviews it wrote and reviews about it.
create or replace function public.tw_employer_trust_forget(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tw_employer_phone where account_key = lower(p_key);
  delete from public.tw_employer_hires where employer_key = lower(p_key) or teen_key = lower(p_key);
  delete from public.tw_employer_reviews where employer_key = lower(p_key) or teen_key = lower(p_key) or reviewer_key = lower(p_key);
$$;
revoke all on function public.tw_employer_trust_forget(text) from public, anon, authenticated;
grant execute on function public.tw_employer_trust_forget(text) to service_role;
