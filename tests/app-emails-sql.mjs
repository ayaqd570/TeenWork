// Checks supabase/migrations/20261113_app_emails.sql on a local, throw-away Postgres with a pretend Supabase
// (auth.users, auth.uid(), the anon / authenticated / service_role roles, closed_accounts, cron + net stubs).
// Run: TW_PG="-h /var/lib/postgresql/pg57 -p 54357 -U postgres" node tests/app-emails-sql.mjs
// (start one with: initdb -D <dir> -A trust -U postgres; pg_ctl -D <dir> -o "-p 54357 -k <dir>" start, as user postgres)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const conn = (process.env.TW_PG || '-h /var/lib/postgresql/pg57 -p 54357 -U postgres').split(/\s+/).filter(Boolean);
const DB = 'tw_app_emails_test';
const psql = (sql, db = DB) => execFileSync('psql', [...conn, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-F', '|'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const fails = (sql) => { try { psql(sql); return false; } catch (e) { return String(e.stderr || e.message); } };
const rows = (sql) => { const out = psql(sql); return out ? out.split('\n').map((l) => l.split('|')) : []; };

psql(`drop database if exists ${DB}`, 'postgres');
psql(`create database ${DB}`, 'postgres');

// a pretend Supabase
psql(`
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now(),
  deleted_at timestamptz, banned_until timestamptz,
  raw_user_meta_data jsonb not null default '{}', raw_app_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.closed_accounts (key text primary key);
create schema cron; create schema net;
create table cron.job (jobname text primary key, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $f$ insert into cron.job values (n, s, c) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command; select 1::bigint $f$;
`);

const migration = readFileSync(new URL('../supabase/migrations/20261113_app_emails.sql', import.meta.url), 'utf8')
  .replace(/create extension if not exists pg_cron;/, '').replace(/create extension if not exists pg_net;/, '');
psql(migration);
psql(migration);   // running it twice is safe
psql('grant select, insert, update, delete on all tables in schema public to service_role;');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

// the cron job is there and calls the function
const job = rows(`select schedule, regexp_replace(command, '[[:space:]]+', ' ', 'g') from cron.job where jobname = 'tw-app-emails'`);
ok(job.length === 1 && job[0][0] === '0 22 * * *' && /functions\/v1\/app-emails/.test(job[0][1]) && /"action": "run"/.test(job[0][1]), 'cron job');

// people
const ago = (d) => `now() - interval '${d} days'`;
const add = (email, days, meta, app = {}, extra = '') => psql(`insert into auth.users (email, created_at, raw_user_meta_data, raw_app_meta_data${extra ? ', ' + extra.split('=')[0] : ''}) values ('${email}', ${ago(days)}, '${JSON.stringify(meta)}', '${JSON.stringify(app)}'${extra ? ', ' + extra.split('=')[1] : ''}) returning id`);
const id = {};
id.newTeen = add('new.teen@example.com', 1, { account_type: 'teen', first_name: 'Nia' });
id.teen = add('sam@example.com', 3, { account_type: 'teen', first_name: 'Sam' });
id.parent = add('mom@example.com', 10, { account_type: 'parent', first_name: 'Dana' });
id.extra = add('shop@example.com', 5, { account_type: '', tw_accounts: [{ slot: 2, type: 'employer' }] });
id.off = add('nope@example.com', 5, { account_type: 'employer', first_name: 'Off' });
id.admin = add('boss@example.com', 30, { account_type: 'parent' }, { tw_role: 'admin' });
id.tester1 = add('ayaquarrierdraper+teen2@gmail.com', 30, { account_type: 'teen' });
id.tester2 = add('a.yaqd.teenwork@googlemail.com', 30, { account_type: 'parent' });
id.demo = add('teen@teenwork.demo', 30, { account_type: 'teen' });
id.dotTest = add('x@school.test', 30, { account_type: 'teen' });
id.closed = add('Gone@Example.com', 30, { account_type: 'teen' });
id.installed = add('app@example.com', 30, { account_type: 'teen' });
id.noType = add('who@example.com', 30, { first_name: 'Who' });
id.deleted = add('del@example.com', 30, { account_type: 'teen' }, {}, 'deleted_at=now()');
id.banned = add('ban@example.com', 30, { account_type: 'teen' }, {}, "banned_until=now() + interval '9 days'");
psql(`insert into closed_accounts values ('gone@example.com')`);
psql(`insert into tw_email_prefs (user_id, tips_off_at) values ('${id.off}', now())`);
psql(`insert into tw_email_prefs (user_id, app_installed_at) values ('${id.installed}', now())`);

// who is due: only the 3 real, older, reachable accounts, newest first
const due = rows(`select email, account_type, first_name from tw_app_email_due('2 days', '21 days', 2)`);
assert.deepEqual(due.map((r) => r[0]), ['sam@example.com', 'shop@example.com', 'mom@example.com'], 'due list ' + JSON.stringify(due)); n++;
ok(due[1][1] === 'employer' && due[1][2] === '', 'an account with its type only in tw_accounts');

// the first run picks them and marks them; a second run within 20 hours gets nobody
const claim = (args = '') => rows(`select email, step, unsub_token, coalesce(prev_last_at::text, '') from tw_app_email_claim(${args})`);
const first = claim('p_limit => 2');
ok(first.length === 2 && first[0][0] === 'sam@example.com' && first[1][0] === 'shop@example.com' && first.every((r) => r[1] === '1' && r[3] === ''), 'first run ' + JSON.stringify(first));
ok(new Set(first.map((r) => r[2])).size === 2, 'tokens differ');
ok(claim().length === 0, 'a second run within 20 hours sends nothing');
const forced = claim('p_force => true');
ok(forced.length === 1 && forced[0][0] === 'mom@example.com', 'forced run picks only who is left ' + JSON.stringify(forced));
ok(claim('p_force => true').length === 0, 'nobody gets a 2nd email before 21 days');

// 22 days later: the second reminder, and they keep coming (no cap) until the person unsubscribes
psql(`update tw_email_prefs set last_app_email_at = now() - interval '22 days' where app_emails_sent > 0; update tw_job_runs set last_run_at = now() - interval '21 hours'`);
const second = claim();
ok(second.length === 3 && second.every((r) => r[1] === '2' && r[3] !== ''), 'second reminder ' + JSON.stringify(second));
for (let k = 3; k <= 6; k++) {
  psql(`update tw_email_prefs set last_app_email_at = now() - interval '22 days' where app_emails_sent > 0`);
  const more = claim('p_force => true');
  ok(more.length === 3 && more.every((r) => r[1] === String(k)), `reminder ${k}: no cap ` + JSON.stringify(more));
}
ok(claim('p_force => true').length === 0, 'still never twice within 21 days');
// a cap still works when one is asked for (APP_EMAILS_MAX_PER_PERSON)
psql(`update tw_email_prefs set last_app_email_at = now() - interval '60 days' where app_emails_sent > 0`);
ok(claim('p_force => true, p_max_per_user => 6').length === 0, 'an optional cap is respected');
ok(rows(`select count(*) from tw_app_email_due('2 days', '21 days', 0)`)[0][0] === '3', '0 = no cap');
// whoever has had the fewest reminders goes first, so new accounts are not crowded out
psql(`update tw_email_prefs set app_emails_sent = 9 where user_id = '${id.teen}'`);
ok(rows(`select email from tw_app_email_due('2 days', '21 days', 0)`)[2][0] === 'sam@example.com', 'most-emailed person goes last');
psql(`update tw_email_prefs set app_emails_sent = 2, last_app_email_at = now() where app_emails_sent > 0`);

// a failed send is put back
psql(`select tw_app_email_unclaim('${id.teen}', now() - interval '22 days')`);
ok(rows(`select app_emails_sent from tw_email_prefs where user_id = '${id.teen}'`)[0][0] === '1', 'unclaim takes the count back');
const again = claim('p_force => true');
ok(again.length === 1 && again[0][0] === 'sam@example.com' && again[0][1] === '2', 'retried after unclaim');

// unsubscribe / resubscribe with the token, as anyone
const tok = rows(`select unsub_token from tw_email_prefs where user_id = '${id.parent}'`)[0][0];
psql(`update tw_email_prefs set app_emails_sent = 1, last_app_email_at = now() - interval '30 days' where user_id = '${id.parent}'`);
ok(psql(`set role anon; select tw_email_unsubscribe('${tok}')`) === 't', 'unsubscribe');
ok(psql(`set role anon; select tw_email_unsubscribe('${tok}')`) === 't', 'unsubscribe twice is fine');
ok(psql(`set role anon; select tw_email_unsubscribe('00000000-0000-4000-8000-000000000000')`) === 'f', 'unknown token');
ok(!rows(`select email from tw_app_email_due('2 days', '21 days', 2)`).some((r) => r[0] === 'mom@example.com'), 'unsubscribed people are not due');
ok(psql(`set role anon; select tw_email_resubscribe('${tok}')`) === 't', 'resubscribe');
ok(rows(`select email from tw_app_email_due('2 days', '21 days', 2)`).some((r) => r[0] === 'mom@example.com'), 'resubscribed people are due again');

// the installed app tells Supabase (signed in only)
ok(psql(`set role authenticated; set request.jwt.claim.sub = '${id.newTeen}'; select tw_app_installed()`) === 't', 'installed');
ok(rows(`select app_installed_at is not null from tw_email_prefs where user_id = '${id.newTeen}'`)[0][0] === 't', 'installed is saved');
ok(psql(`set role authenticated; set request.jwt.claim.sub = ''; select tw_app_installed()`) === 'f', 'no sign-in, nothing saved');
psql(`update auth.users set created_at = now() - interval '9 days' where id = '${id.newTeen}'`);
ok(!rows(`select email from tw_app_email_due('2 days', '21 days', 2)`).some((r) => r[0] === 'new.teen@example.com'), 'people with the app are never due');

// nobody but the service role can read the table or pick people
for (const role of ['anon', 'authenticated']) {
  ok(/permission denied/.test(fails(`set role ${role}; select * from tw_email_prefs`)), role + ' reads tw_email_prefs');
  ok(/permission denied/.test(fails(`set role ${role}; select * from tw_app_email_claim()`)), role + ' calls claim');
  ok(/permission denied/.test(fails(`set role ${role}; select * from tw_app_email_due('0 days', '0 days', 9)`)), role + ' calls due');
  ok(/permission denied/.test(fails(`set role ${role}; select tw_app_email_unclaim('${id.teen}', null)`)), role + ' calls unclaim');
  ok(/permission denied/.test(fails(`set role ${role}; select * from tw_job_runs`)), role + ' reads tw_job_runs');
}
ok(/permission denied/.test(fails(`set role anon; select tw_app_installed()`)), 'anon calls tw_app_installed');
ok(psql(`set role service_role; select count(*) >= 0 from tw_app_email_claim(p_force => true)`) === 't', 'service role may claim');

psql(`drop database ${DB}`, 'postgres');
console.log(`app-emails SQL: ${n} checks passed`);
