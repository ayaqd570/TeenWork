-- Service-only quota storage; no client can reset counters or choose its own plan.
create table if not exists public.tw_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null default 0,
  day_start timestamptz not null,
  day_count integer not null default 0
);
alter table public.tw_ai_usage enable row level security;
revoke all on table public.tw_ai_usage from public, anon, authenticated;

create or replace function public.tw_consume_ai_quota(p_user_id uuid, p_plan text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  t timestamptz := now();
  m timestamptz := date_trunc('minute', t);
  d timestamptz := date_trunc('day', t at time zone 'UTC') at time zone 'UTC';
  daily_limit integer := case when p_plan = 'pro' then 500 else 100 end;
  accepted uuid;
begin
  insert into public.tw_ai_usage as usage (user_id, minute_start, minute_count, day_start, day_count)
  values (p_user_id, m, 1, d, 1)
  on conflict (user_id) do update set
    minute_start = m,
    minute_count = case when usage.minute_start = m then usage.minute_count + 1 else 1 end,
    day_start = d,
    day_count = case when usage.day_start = d then usage.day_count + 1 else 1 end
  where (usage.minute_start <> m or usage.minute_count < 10)
    and (usage.day_start <> d or usage.day_count < daily_limit)
  returning user_id into accepted;
  return accepted is not null;
end;
$$;
revoke all on function public.tw_consume_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.tw_consume_ai_quota(uuid, text) to service_role;
