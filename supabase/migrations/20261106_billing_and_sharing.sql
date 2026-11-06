-- TeenWork v54 (2026-11-06, Aya: "add stripe setup … have a share button … try to get people to share it").
-- 1. Stripe billing records, written only by the billing Edge Function (service role).
-- 2. Once Paid Launch is on, only a payment (or the admin) can put an account on Pro.
-- 3. A count-only function for "N people joined with your share link".
-- Safe to run more than once.

-- ── 1. Billing ──────────────────────────────────────────────────────────────
create table if not exists public.tw_billing (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id   text unique,
  subscription_id      text,
  account_key          text,          -- the TeenWork account that gets Pro (email, or email#2)
  plan                 text,          -- teen_pro | employer_pro
  status               text,          -- none | active | trialing | past_due | canceled | unpaid | …
  price_id             text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at           timestamptz not null default now()
);
comment on table public.tw_billing is 'TeenWork billing (Stripe). One row per Supabase user. Only the billing Edge Function (service role) writes it; a signed-in person can read their own row.';
alter table public.tw_billing enable row level security;
revoke all on public.tw_billing from anon, authenticated;
grant select on public.tw_billing to authenticated;
drop policy if exists "people read their own billing row" on public.tw_billing;
create policy "people read their own billing row" on public.tw_billing
  for select to authenticated using ((select auth.uid()) = user_id);

-- Stripe event ids already handled, so a retried webhook is not applied twice.
create table if not exists public.tw_stripe_events (
  id          text primary key,
  type        text,
  received_at timestamptz not null default now()
);
comment on table public.tw_stripe_events is 'TeenWork billing: Stripe webhook events already handled. Service role only.';
alter table public.tw_stripe_events enable row level security;   -- no policies: service role only
revoke all on public.tw_stripe_events from anon, authenticated;

-- ── 2. Pro only through a payment once Paid Launch is on ──────────────────────
-- Paid Launch lives in the admin's shared plan_settings row (plan-limits-v40). Before it is on,
-- the pricing page still lets anyone switch to Pro for free (testing), so nothing changes until then.
create or replace function public.tw_paid_launch_on()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v text;
begin
  select value into v from public.user_data
   where key = 'plan_settings' and lower(email) = 'ayaquarrierdraper@gmail.com'
   limit 1;
  return coalesce((v::jsonb ->> 'launchPaid')::boolean, false);
exception when others then
  return false;
end $$;
revoke all on function public.tw_paid_launch_on() from public;
grant execute on function public.tw_paid_launch_on() to anon, authenticated;

drop policy if exists "pro only through billing once paid (insert)" on public.user_data;
create policy "pro only through billing once paid (insert)" on public.user_data
  as restrictive for insert to anon, authenticated
  with check (key <> 'plan' or value not like '%pro%' or public.tw_is_admin() or not public.tw_paid_launch_on());

drop policy if exists "pro only through billing once paid (update)" on public.user_data;
create policy "pro only through billing once paid (update)" on public.user_data
  as restrictive for update to anon, authenticated
  using (true)
  with check (key <> 'plan' or value not like '%pro%' or public.tw_is_admin() or not public.tw_paid_launch_on());

-- ── 3. Share links ───────────────────────────────────────────────────────────
-- A share link is https://teenwork.ayaqd.com/?ref=CODE. Someone who signs up after opening it gets a
-- user_data row key 'referred_by' = "CODE". This counts them (distinct emails, practice accounts and
-- closed accounts left out) and returns only the number.
create or replace function public.tw_referral_count(p_code text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_code ~ '^[A-Z0-9]{6,10}$' then (
    select count(distinct lower(split_part(d.email, '#', 1)))::int
      from public.user_data d
     where d.key = 'referred_by'
       and d.value = '"' || p_code || '"'
       and d.email not ilike '%.test'
       and d.email not ilike '%.test#%'
       and not exists (select 1 from public.closed_accounts c where lower(c.key) = lower(d.email))
  ) else 0 end;
$$;
revoke all on function public.tw_referral_count(text) from public;
grant execute on function public.tw_referral_count(text) to anon, authenticated;
