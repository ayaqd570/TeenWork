-- TeenWork v51 (Build Brief B4/T2, Aya 2026-10-30: "Yes, switch to a real Supabase sign-in").
-- The admin is ADMIN_EMAIL's own Supabase account, marked with app_metadata.tw_role = 'admin'. Only the service
-- role (this migration, the Supabase dashboard) can change app_metadata, so nobody can make themselves admin from
-- the app, and the app no longer holds an admin password or hash. Apply together with the v51 frontend and the
-- v51 delete-account function: the v50 admin panel signs in without Supabase and would be refused below.

-- 1. Who the admin is. The admin signs in again after this runs, so the new token carries the role.
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tw_role', 'admin')
 where lower(email) = 'ayaquarrierdraper@gmail.com';

-- 2. The role check, for policies and functions. Reads the signed-in token; anon and other users get false.
create or replace function public.tw_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'tw_role') = 'admin', false);
$$;
revoke all on function public.tw_is_admin() from public;
grant execute on function public.tw_is_admin() to anon, authenticated;

-- 3. What only the admin may write. These are RESTRICTIVE policies: they are added on top of the existing
--    "teenwork app …" policies, so everything else in user_data and messages keeps working as before
--    (a full row-level security pass is brief item T1, in the next release).
--    • user_data row 'plan_settings': the Free/Pro limits and Paid Launch switch every device reads.
--    • messages sent as "TeenWork Admin" (from_key / from_role 'admin').
drop policy if exists "only the admin writes plan settings (insert)" on public.user_data;
create policy "only the admin writes plan settings (insert)" on public.user_data
  as restrictive for insert to anon, authenticated
  with check (key <> 'plan_settings' or public.tw_is_admin());

drop policy if exists "only the admin writes plan settings (update)" on public.user_data;
create policy "only the admin writes plan settings (update)" on public.user_data
  as restrictive for update to anon, authenticated
  using (key <> 'plan_settings' or public.tw_is_admin())
  with check (key <> 'plan_settings' or public.tw_is_admin());

drop policy if exists "only the admin sends as TeenWork Admin" on public.messages;
create policy "only the admin sends as TeenWork Admin" on public.messages
  as restrictive for insert to anon, authenticated
  with check ((coalesce(from_key, '') <> 'admin' and coalesce(from_role, '') <> 'admin') or public.tw_is_admin());
