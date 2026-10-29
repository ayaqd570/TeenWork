-- Demo AI allowance: demos have no sign-in, so groq-chat counts them per visitor (a salted hash of the
-- visitor's address, never the address itself) and for all demos together. Service-only, like tw_ai_usage.
create table if not exists public.tw_demo_ai_usage (
  client_key text primary key,
  minute_start timestamptz not null,
  minute_count integer not null default 0,
  day_start timestamptz not null,
  day_count integer not null default 0
);
alter table public.tw_demo_ai_usage enable row level security;
revoke all on table public.tw_demo_ai_usage from public, anon, authenticated;

-- One visitor: 6 a minute and 25 a day (the demo shows 5 tries; job safety checks also use AI and
-- aren't counted there). All demos together: 1500 a day, so the Free key can't be used up by demos.
create or replace function public.tw_consume_demo_ai_quota(p_client text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  t timestamptz := now();
  m timestamptz := date_trunc('minute', t);
  d timestamptz := date_trunc('day', t at time zone 'UTC') at time zone 'UTC';
  accepted text;
begin
  if p_client is null or p_client !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.tw_demo_ai_usage as usage (client_key, minute_start, minute_count, day_start, day_count)
  values (p_client, m, 1, d, 1)
  on conflict (client_key) do update set
    minute_start = m,
    minute_count = case when usage.minute_start = m then usage.minute_count + 1 else 1 end,
    day_start = d,
    day_count = case when usage.day_start = d then usage.day_count + 1 else 1 end
  where (usage.minute_start <> m or usage.minute_count < 6)
    and (usage.day_start <> d or usage.day_count < 25)
  returning client_key into accepted;
  if accepted is null then return false; end if;
  accepted := null;
  insert into public.tw_demo_ai_usage as usage (client_key, minute_start, minute_count, day_start, day_count)
  values ('all-demos', m, 1, d, 1)
  on conflict (client_key) do update set
    minute_start = m,
    minute_count = case when usage.minute_start = m then usage.minute_count + 1 else 1 end,
    day_start = d,
    day_count = case when usage.day_start = d then usage.day_count + 1 else 1 end
  where usage.day_start <> d or usage.day_count < 1500
  returning client_key into accepted;
  return accepted is not null;
end;
$$;
revoke all on function public.tw_consume_demo_ai_quota(text) from public, anon, authenticated;
grant execute on function public.tw_consume_demo_ai_quota(text) to service_role;
