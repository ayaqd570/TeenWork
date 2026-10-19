-- TeenWork v47: closed (deleted) accounts.
-- One row per account that was deleted by its owner or closed by the TeenWork admin. The app reads it to
-- hide closed accounts everywhere and to tell people an account they worked with was closed.
-- Only the delete-account Edge Function (service role) writes it: there is no insert/update/delete policy.
create table if not exists public.closed_accounts (
  key         text primary key,                 -- the account's user_data key: email, or email#2 for extra accounts
  type        text,                             -- teen | parent | employer ('' when unknown)
  closed_by   text not null default 'self' check (closed_by in ('self', 'admin')),
  closed_at   timestamptz not null default now(),
  purge_after timestamptz,                      -- admin closes: the person can download their records until then
  purged_at   timestamptz                       -- when everything left was deleted
);

alter table public.closed_accounts enable row level security;
-- (no "drop policy if exists" here: Supabase's apply_migration waits on a hidden confirm box for it)

create policy "teenwork app read closed accounts" on public.closed_accounts
  for select to anon, authenticated using (true);
