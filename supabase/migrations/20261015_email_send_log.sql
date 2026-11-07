-- TeenWork: send limits for the send-email Edge Function (Resend). Already applied to the live project on 2026-10-15.
-- Only the Edge Function (service role) can touch this table or call these functions.
-- Rows keep hashes of the recipient and sender IP, never the addresses themselves.
-- Applied to project qocmpwimsfcnqijtfmki on 2026-10-15 as three migrations (table, functions, privileges).
-- The table grows by at most ~95 rows a day; to clear old rows: delete from public.email_send_log where created_at < now() - interval '30 days';

create table if not exists public.email_send_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash    text,
  to_hash    text,
  status     text not null default 'pending',   -- pending | sent | failed
  resend_id  text,
  error      text
);
create index if not exists email_send_log_created_at_idx on public.email_send_log (created_at);
alter table public.email_send_log enable row level security;   -- no policies: anon and signed-in users get nothing
revoke all on public.email_send_log from anon, authenticated;

-- Checks the limits and, if the email may go, records it as pending. Returns {ok, id} or {ok:false, reason}.
create or replace function public.tw_email_reserve(
  p_ip_hash text, p_to_hash text,
  p_max_ip_hour int, p_max_to_hour int, p_max_day int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('tw_email_reserve'));

  select count(*) into n from email_send_log where created_at > now() - interval '24 hours' and status <> 'failed';
  if n >= p_max_day then return jsonb_build_object('ok', false, 'reason', 'daily_limit'); end if;

  if p_ip_hash is not null then
    select count(*) into n from email_send_log where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if n >= p_max_ip_hour then return jsonb_build_object('ok', false, 'reason', 'sender_limit'); end if;
  end if;

  select count(*) into n from email_send_log where to_hash = p_to_hash and created_at > now() - interval '1 hour';
  if n >= p_max_to_hour then return jsonb_build_object('ok', false, 'reason', 'recipient_limit'); end if;

  insert into email_send_log (ip_hash, to_hash) values (p_ip_hash, p_to_hash) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

create or replace function public.tw_email_finish(p_id bigint, p_status text, p_resend_id text, p_error text)
returns void
language sql security definer set search_path = public as $$
  update email_send_log set status = p_status, resend_id = p_resend_id, error = left(p_error, 300) where id = p_id;
$$;

revoke all on function public.tw_email_reserve(text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.tw_email_finish(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.tw_email_reserve(text, text, int, int, int) to service_role;
grant execute on function public.tw_email_finish(bigint, text, text, text) to service_role;
