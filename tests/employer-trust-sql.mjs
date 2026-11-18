/* Checks the employer trust rules (supabase/migrations/20261118_employer_trust.sql) on a throwaway LOCAL Postgres
   with a small stand-in for Supabase's auth schema (tests/sql/supabase-stub.sql). It never touches the real project.
   Needs psql and a local server you can create databases on:
     TW_PG="host=/var/lib/postgresql port=55432 user=postgres" node tests/employer-trust-sql.mjs
   Without TW_PG it says so and stops. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const conn = process.env.TW_PG;
if (!conn) { console.log('employer-trust-sql: skipped (set TW_PG to a local Postgres, see the top of this file)'); process.exit(0); }
const here = path.dirname(fileURLToPath(import.meta.url));
const DB = 'tw_employer_trust_test';

function psql(dbConn, script) {
  const r = spawnSync('psql', [dbConn, '-X', '-At', '-q', '-v', 'ON_ERROR_STOP=1'], { input: script, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
assert(psql(conn + ' dbname=postgres', `drop database if exists ${DB}; create database ${DB};`).ok);
const db = conn + ' dbname=' + DB;
const run = (sql, what) => { const r = psql(db, sql); assert(r.ok, (what || 'sql') + ': ' + r.err); return r; };
const load = f => run(readFileSync(f, 'utf8'), f);
load(path.join(here, 'sql/supabase-stub.sql'));
// what the earlier migrations give the real project: user_data, closed_accounts, tw_try_jsonb, tw_my_email, tw_is_admin
run(`alter table auth.users add column if not exists created_at timestamptz not null default now();
     create table if not exists public.user_data (email text not null, key text not null, value text, updated_at timestamptz default now(), primary key (email, key));
     alter table public.user_data enable row level security;
     create policy "teenwork app" on public.user_data for all to anon, authenticated using (true) with check (true);
     create table if not exists public.messages (id bigserial primary key);`);
load(path.join(here, '../supabase/migrations/20261018_closed_accounts.sql'));
load(path.join(here, '../supabase/migrations/20261018_tw_public_counts.sql'));
load(path.join(here, '../supabase/migrations/20261107_profile_photos.sql'));
run(`create or replace function public.tw_is_admin() returns boolean language sql stable set search_path = '' as $$
       select coalesce((auth.jwt() -> 'app_metadata' ->> 'tw_role') = 'admin', false); $$;
     grant execute on function public.tw_is_admin() to anon, authenticated;`);
const MIG = path.join(here, '../supabase/migrations/20261118_employer_trust.sql');
load(MIG);
load(MIG);   // running it twice is safe

const U = {
  boss: ['33333333-3333-3333-3333-333333333333', 'boss@example.com'],
  teen: ['11111111-1111-1111-1111-111111111111', 'teen@example.com'],
  mom: ['22222222-2222-2222-2222-222222222222', 'mom@example.com'],
  other: ['44444444-4444-4444-4444-444444444444', 'otherteen@example.com'],
  stranger: ['55555555-5555-5555-5555-555555555555', 'stranger@example.com'],
  admin: ['66666666-6666-6666-6666-666666666666', 'ayaquarrierdraper@gmail.com'],
};
run('insert into auth.users (id, email, created_at) values ' + Object.values(U).map(([id, em]) => `('${id}','${em}', '2026-09-03T12:00:00Z')`).join(',') + ';');

function as(who, sql) {
  let pre = 'begin;\n';
  if (who === 'anon') pre += "set local role anon; set local request.jwt.claims = '{\"role\":\"anon\"}';\n";
  else if (who === 'service') pre += "set local role service_role; set local request.jwt.claims = '{\"role\":\"service_role\"}';\n";
  else {
    const [id, em] = U[who], meta = who === 'admin' ? ',"app_metadata":{"tw_role":"admin"}' : '';
    pre += `set local role authenticated; set local request.jwt.claims = '{"sub":"${id}","email":"${em}","role":"authenticated"${meta}}';\n`;
  }
  return psql(db, pre + sql + '\ncommit;');
}
const one = (who, sql) => { const r = as(who, sql); assert(r.ok, who + ': ' + r.err); return r.out; };
const json = (who, sql) => JSON.parse(one(who, sql));
const refused = (who, sql, why) => { const r = as(who, sql); assert(!r.ok, who + ' should be refused: ' + why); return r.err; };
const ud = (email, key, value) => run(`insert into public.user_data (email, key, value) values ('${email}', '${key}', '${JSON.stringify(value).replace(/'/g, "''")}')
                                       on conflict (email, key) do update set value = excluded.value;`);
const trust = (who, keys) => json(who, `select public.tw_employer_trust(array[${keys.map(k => `'${k}'`).join(',')}])::text;`);
const hire = (who, emp, job, teen) => json(who, `select public.tw_record_hire('${emp}', '${job}', '${teen}')::text;`);
const review = (who, emp, job, teen, stars, text) =>
  json(who, `select public.tw_review_employer('${emp}', '${job}', ${teen == null ? 'null' : `'${teen}'`}, ${stars == null ? 'null' : stars}, '${String(text || '').replace(/'/g, "''")}')::text;`);

// The tables are closed to the app's key and to signed-in people: only the rules below reach them
for (const t of ['tw_employer_phone', 'tw_phone_sends', 'tw_employer_hires', 'tw_employer_reviews']) {
  refused('anon', `select * from public.${t};`, 'anon reads ' + t);
  refused('stranger', `select * from public.${t};`, 'signed-in reads ' + t);
  refused('boss', `insert into public.${t} default values;`, 'signed-in writes ' + t);
}
refused('anon', `select public.tw_employer_trust(array['boss@example.com']);`, 'anon asks for employer history');
refused('boss', `select public.tw_phone_send_ok('${U.boss[0]}', '${'a'.repeat(64)}', 5, 5, 100);`, 'only the phone function counts texts');
refused('boss', `select public.tw_employer_trust_forget('boss@example.com');`, 'only delete-account forgets');
refused('stranger', `select public.tw_ud('teen@example.com', 'job_app:1');`, 'tw_ud is internal');

// A brand-new employer: nothing yet, but "on TeenWork since" and jobs posted are known
ud('boss@example.com', 'job_post:1700000000001', { id: 1700000000001, title: 'Rake leaves', employerKey: 'boss@example.com', status: 'active' });
ud('boss@example.com', 'job_post:1700000000002', { id: 1700000000002, title: 'Walk dogs', employerKey: 'boss@example.com', status: 'closed' });
let t = trust('mom', ['boss@example.com', 'BOSS@example.com', 'not a key', 'nobody@example.com'])
assert.equal(t.length, 2, 'keys are lowercased, de-duplicated and checked');
assert.deepEqual(t[0], { key: 'boss@example.com', since: '2026-09-03', phone: false, phone_at: null, jobs_posted: 2, hires: 0, teens: 0, finished: 0, reviews: 0, avg: null, held: 0, recent: [] });
assert.equal(t[1].since, null, 'an unknown employer has no sign-up date');
assert.equal(t[0].mine, undefined, 'a parent does not get the employer-only fields');
const own = trust('boss', ['boss@example.com'])[0];
assert.deepEqual([own.mine, own.last4, own.pending], [true, null, false]);

// The teen applied; the parent approved (applied); the employer hires
ud('teen@example.com', 'parent_link', { status: 'approved', parentEmail: 'mom@example.com', parents: ['mom@example.com'] });
ud('teen@example.com', 'job_app:1700000000001', { jobId: 1700000000001, employerKey: 'boss@example.com', status: 'applied', parentEmail: 'mom@example.com' });
assert.deepEqual(hire('stranger', 'boss@example.com', '1700000000001', 'teen@example.com'), { ok: false, error: 'not_yours' }, 'only the employer records a hire');
assert.deepEqual(hire('boss', 'boss@example.com', '1700000000009', 'teen@example.com'), { ok: false, error: 'no_job' });
assert.deepEqual(hire('boss', 'boss@example.com', '1700000000002', 'teen@example.com'), { ok: false, error: 'no_application' }, 'no application to that job');
assert.deepEqual(hire('boss', 'boss@example.com', 'drop table', 'teen@example.com'), { ok: false, error: 'bad_request' });
refused('anon', "select public.tw_record_hire('boss@example.com', '1700000000001', 'teen@example.com');", 'anon records a hire');
// before the parent's OK the employer can't record it
ud('otherteen@example.com', 'job_app:1700000000001', { jobId: 1700000000001, employerKey: 'boss@example.com', status: 'pending-approval' });
assert.deepEqual(hire('boss', 'boss@example.com', '1700000000001', 'otherteen@example.com'), { ok: false, error: 'no_application' }, 'waiting for the parent');

// Reviews before the job: refused
assert.deepEqual(review('teen', 'boss@example.com', '1700000000001', null, 5, 'Great'), { ok: false, error: 'not_hired' });
assert.deepEqual(review('mom', 'boss@example.com', '1700000000001', 'teen@example.com', 5, 'Great'), { ok: false, error: 'not_hired' });

assert.deepEqual(hire('boss', 'boss@example.com', '1700000000001', 'teen@example.com'), { ok: true });
assert.deepEqual(hire('boss', 'boss@example.com', '1700000000001', 'TEEN@example.com'), { ok: true }, 'recording it again is fine');
ud('teen@example.com', 'job_app:1700000000001', { jobId: 1700000000001, employerKey: 'boss@example.com', status: 'hired', parentEmail: 'mom@example.com' });
t = trust('mom', ['boss@example.com'])[0];
assert.deepEqual([t.hires, t.teens], [1, 1]);

// Who may review: the teen, the linked parent; not the employer, a stranger, or with a bad rating
assert.deepEqual(review('stranger', 'boss@example.com', '1700000000001', 'teen@example.com', 1, 'Bad'), { ok: false, error: 'not_allowed' });
assert.deepEqual(review('boss', 'boss@example.com', '1700000000001', 'teen@example.com', 5, 'Me!'), { ok: false, error: 'not_allowed' });
assert.deepEqual(review('teen', 'boss@example.com', '1700000000001', null, 6, 'x'), { ok: false, error: 'bad_rating' });
assert.deepEqual(review('teen', 'boss@example.com', '1700000000001', null, null, 'x'), { ok: false, error: 'bad_rating' });
refused('anon', "select public.tw_review_employer('boss@example.com', '1700000000001', null, 5, 'x');", 'anon reviews');
let r = review('teen', 'boss@example.com', '1700000000001', null, 4, '  Paid on time <b>and</b>\n\nfriendly.  ');
assert.deepEqual([r.ok, r.role, r.counts], [true, 'teen', true]);
r = review('mom', 'boss@example.com', '1700000000001', 'teen@example.com', 5, 'Met us first and explained everything.');
assert.deepEqual([r.ok, r.role], [true, 'parent']);
assert.equal(one('service', "select body from public.tw_employer_reviews where reviewer_role = 'teen';"), 'Paid on time b and /b friendly.', 'plain text only');
assert.equal(one('service', "select count(*) from public.tw_employer_reviews where body ~ '[<>]';"), '0');
// changing a review keeps one row
r = review('teen', 'boss@example.com', '1700000000001', 'teen@example.com', 5, 'Paid on time and friendly.');
assert.equal(r.ok, true);
assert.equal(one('service', 'select count(*) from public.tw_employer_reviews;'), '2');
assert.equal(one('service', "select rating from public.tw_employer_reviews where reviewer_role = 'teen';"), '5');
assert.equal(review('teen', 'boss@example.com', '1700000000001', null, 3, 'x'.repeat(900)).ok, true);
assert.equal(one('service', "select char_length(body) from public.tw_employer_reviews where reviewer_role = 'teen';"), '500', 'notes are cut at 500 characters');
review('teen', 'boss@example.com', '1700000000001', null, 5, 'Paid on time and friendly.');
// my own reviews
assert.equal(one('teen', 'select rating || \'|\' || body from public.tw_my_employer_reviews();'), '5|Paid on time and friendly.');
assert.equal(one('stranger', 'select count(*) from public.tw_my_employer_reviews();'), '0');

// Totals right away; the stars and notes stay hidden for 14 days (or until the employer's wrap-up)
t = trust('mom', ['boss@example.com'])[0];
assert.deepEqual([t.reviews, Number(t.avg), t.held, t.recent.length], [2, 5, 2, 0]);
ud('boss@example.com', 'job_wrap:1700000000001:teen@example.com', { hours: 3, stars: 5 });
t = trust('stranger', ['boss@example.com'])[0];
assert.deepEqual([t.reviews, t.held, t.recent.length, t.finished], [2, 0, 2, 1]);
assert.deepEqual(t.recent.map(x => [x.rating, x.role]).sort(), [[5, 'parent'], [5, 'teen']]);
assert(!JSON.stringify(t).includes('@example.com"') || !/teen@example|mom@example/.test(JSON.stringify(t.recent)), 'no reviewer emails');
assert.doesNotMatch(JSON.stringify(t.recent), /teen@example|mom@example|reviewer/);
run("delete from public.user_data where key like 'job_wrap:%';");
run("update public.tw_employer_reviews set created_at = now() - interval '15 days' where reviewer_role = 'parent';");
t = trust('mom', ['boss@example.com'])[0];
assert.deepEqual([t.held, t.recent.length, t.recent[0].role, t.recent[0].text], [1, 1, 'parent', 'Met us first and explained everything.']);

// A review counts only when the employer recorded the hire: a forged "hired" application does nothing
ud('boss@example.com', 'job_post:1700000000003', { id: 1700000000003, employerKey: 'boss@example.com', status: 'active' });
ud('stranger@example.com', 'job_app:1700000000003', { jobId: 1700000000003, employerKey: 'boss@example.com', status: 'hired' });
r = review('stranger', 'boss@example.com', '1700000000003', null, 1, 'Fake review');
assert.deepEqual([r.ok, r.counts], [true, false], 'accepted, but it does not count');
t = trust('mom', ['boss@example.com'])[0];
assert.equal(t.reviews, 2, 'the forged review is not counted');
run("update public.tw_employer_reviews set created_at = now() - interval '20 days';");
assert.doesNotMatch(JSON.stringify(trust('mom', ['boss@example.com'])[0].recent), /Fake review/);
// a parent who is not linked to that teen can't review for them
assert.deepEqual(review('mom', 'boss@example.com', '1700000000003', 'stranger@example.com', 1, 'x'), { ok: false, error: 'not_allowed' });

// The admin reads and hides reviews; nobody else can
const list = json('admin', "select coalesce(json_agg(x), '[]')::text from public.tw_admin_employer_reviews(50) x;");
assert.equal(list.length, 3);
assert.deepEqual(list.map(x => x.hire_recorded).sort(), [false, true, true]);
assert.equal(one('mom', 'select count(*) from public.tw_admin_employer_reviews(50);'), '0', 'only the admin lists reviews');
refused('mom', "select public.tw_hide_employer_review(1, true);", 'only the admin hides');
const parentId = list.find(x => x.reviewer_role === 'parent').id;
assert.equal(one('admin', `select public.tw_hide_employer_review(${parentId}, true);`), 't');
t = trust('mom', ['boss@example.com'])[0];
assert.deepEqual([t.reviews, t.recent.length], [1, 1], 'a hidden review drops out of the totals');
one('admin', `select public.tw_hide_employer_review(${parentId}, false);`);

// Rate limit: 20 reviews a day per person
run(`insert into public.tw_employer_reviews (employer_key, job_id, teen_key, reviewer_id, reviewer_key, reviewer_role, rating)
     select 'boss@example.com', g, 'teen@example.com', '${U.teen[0]}', 'teen@example.com', 'teen', 5 from generate_series(100, 119) g;`);
assert.deepEqual(review('teen', 'boss@example.com', '1700000000001', null, 4, 'again'), { ok: false, error: 'too_many' });
run("delete from public.tw_employer_reviews where job_id between 100 and 119;");

// Phone: only the service role writes it; the employer sees their last 4 digits, others only "confirmed"
const H = 'b'.repeat(64);
one('service', `insert into public.tw_employer_phone (account_key, user_id, confirmed_hash, confirmed_last4, confirmed_at) values ('boss@example.com', '${U.boss[0]}', '${H}', '0142', '2026-11-18T10:00:00Z');`);
t = trust('mom', ['boss@example.com'])[0];
assert.deepEqual([t.phone, t.phone_at, t.last4], [true, '2026-11-18', undefined]);
assert.doesNotMatch(JSON.stringify(t), /0142/);
assert.equal(trust('boss', ['boss@example.com'])[0].last4, '0142');
refused('service', `insert into public.tw_employer_phone (account_key, user_id) values ('Bad Key', '${U.boss[0]}');`, 'bad key');
refused('service', `update public.tw_employer_phone set confirmed_last4 = '12a4';`, 'last4 must be 4 digits');

// Text limits: per sign-in, per number, per day
const send = (u, h) => one('service', `select public.tw_phone_send_ok('${u}', '${h}', 3, 2, 4);`);
assert.deepEqual([send(U.boss[0], H), send(U.boss[0], H), send(U.boss[0], H)], ['ok', 'ok', 'phone_limit']);
assert.equal(send(U.boss[0], 'c'.repeat(64)), 'ok', 'another number still works');
assert.equal(send(U.boss[0], 'f'.repeat(64)), 'user_limit');
assert.equal(send(U.mom[0], 'd'.repeat(64)), 'ok');
assert.equal(send(U.teen[0], 'e'.repeat(64)), 'day_limit');

// Closed accounts show only that they are closed
run("insert into public.closed_accounts (key, type) values ('boss@example.com', 'employer');");
assert.deepEqual(trust('mom', ['boss@example.com']), [{ key: 'boss@example.com', closed: true }]);
run("delete from public.closed_accounts;");

// delete-account forgets everything about the account
one('service', "select public.tw_employer_trust_forget('teen@example.com');");
assert.equal(one('service', "select count(*) from public.tw_employer_reviews where teen_key = 'teen@example.com';"), '0');
assert.equal(one('service', "select count(*) from public.tw_employer_hires;"), '0');
one('service', "select public.tw_employer_trust_forget('boss@example.com');");
assert.equal(one('service', 'select (select count(*) from public.tw_employer_phone) + (select count(*) from public.tw_employer_reviews);'), '0');

// Extra accounts on one email (boss@example.com#2) are their own employer
ud('boss@example.com#2', 'job_post:1700000000005', { id: 1700000000005, employerKey: 'boss@example.com#2', status: 'active' });
ud('teen@example.com', 'job_app:1700000000005', { jobId: 1700000000005, employerKey: 'boss@example.com#2', status: 'applied' });
assert.deepEqual(hire('boss', 'boss@example.com#2', '1700000000005', 'teen@example.com'), { ok: true });
t = trust('mom', ['boss@example.com', 'boss@example.com#2']);
assert.deepEqual(t.map(x => [x.key, x.hires]), [['boss@example.com', 0], ['boss@example.com#2', 1]]);

console.log('employer-trust-sql: all checks passed');
psql(conn + ' dbname=postgres', `drop database if exists ${DB};`);
