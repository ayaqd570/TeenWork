/* Checks the profile photo rules (supabase/migrations/20261107_profile_photos.sql, then the v58 parent and employer
   choices in 20261113_profile_photos_all_roles.sql) on a throwaway LOCAL
   Postgres with a small stand-in for Supabase's auth and storage schemas (tests/sql/supabase-stub.sql).
   It never touches the real project. Needs psql and a local server you can create databases on:
     TW_PG="host=/var/lib/postgresql port=55432 user=postgres" node tests/profile-photos-sql.mjs
   Without TW_PG it says so and stops. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const conn = process.env.TW_PG;
if (!conn) { console.log('profile-photos-sql: skipped (set TW_PG to a local Postgres, see the top of this file)'); process.exit(0); }
const here = path.dirname(fileURLToPath(import.meta.url));
const DB = 'tw_photos_test';

function psql(dbConn, script) {
  const r = spawnSync('psql', [dbConn, '-X', '-At', '-q', '-v', 'ON_ERROR_STOP=1'], { input: script, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const admin = psql(conn + ' dbname=postgres', `drop database if exists ${DB}; create database ${DB};`);
assert(admin.ok, admin.err);
const db = conn + ' dbname=' + DB;
const load = f => { const r = psql(db, readFileSync(f, 'utf8')); assert(r.ok, f + ': ' + r.err); };
load(path.join(here, 'sql/supabase-stub.sql'));
load(path.join(here, '../supabase/migrations/20261107_profile_photos.sql'));
load(path.join(here, '../supabase/migrations/20261107_profile_photos.sql'));   // running it twice is safe
load(path.join(here, '../supabase/migrations/20261113_profile_photos_all_roles.sql'));
load(path.join(here, '../supabase/migrations/20261113_profile_photos_all_roles.sql'));

const U = {
  teen: ['11111111-1111-1111-1111-111111111111', 'teen@example.com'],
  parent: ['22222222-2222-2222-2222-222222222222', 'parent@example.com'],
  boss: ['33333333-3333-3333-3333-333333333333', 'boss@example.com'],
  stranger: ['44444444-4444-4444-4444-444444444444', 'someone@example.com'],
};
assert(psql(db, 'insert into auth.users values ' + Object.values(U).map(([id, em]) => `('${id}','${em}')`).join(',') + ';').ok);

// Run SQL as a signed-in person (their Supabase token), as anon, or as the service role.
function as(who, sql) {
  let pre = 'begin;\n';
  if (who === 'anon') pre += "set local role anon; set local request.jwt.claims = '{\"role\":\"anon\"}';\n";
  else if (who === 'service') pre += "set local role service_role; set local request.jwt.claims = '{\"role\":\"service_role\"}';\n";
  else { const [id, em] = U[who]; pre += `set local role authenticated; set local request.jwt.claims = '{"sub":"${id}","email":"${em}","role":"authenticated"}';\n`; }
  return psql(db, pre + sql + '\ncommit;');
}
const rows = (who, sql) => { const r = as(who, sql); assert(r.ok, who + ': ' + r.err); return r.out ? r.out.split('\n') : []; };
const refused = (who, sql, why) => { const r = as(who, sql); assert(!r.ok, who + ' should be refused: ' + why); return r.err; };
const T = U.teen[0];
const seen = who => rows(who, "select owner_key || ' ' || path from public.tw_photo_paths(array['teen@example.com']);");
const files = who => rows(who, "select name from storage.objects where bucket_id = 'profile-photos';");

// The bucket is private, 1 MB, JPEG only
assert.deepEqual(rows('service', "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'profile-photos';"), ['f|1048576|{image/jpeg}']);

// The teen uploads into their own folder and saves who may see it
rows('teen', `insert into storage.objects (bucket_id, name) values ('profile-photos', '${T}/p1-100.jpg');`);
rows('teen', `insert into public.tw_profile_photos (owner_key, path, audience, parent_viewers, employer_viewers)
              values ('teen@example.com', '${T}/p1-100.jpg', 'parent', '{parent@example.com}', '{boss@example.com}');`);
// …but not into someone else's folder, not under someone else's account key, not pointing at another folder
refused('teen', `insert into storage.objects (bucket_id, name) values ('profile-photos', '${U.parent[0]}/p1-1.jpg');`, 'upload into another folder');
refused('stranger', `insert into public.tw_profile_photos (owner_key, audience) values ('teen@example.com#2', 'me');`, 'claim the teen\'s extra account key');
refused('stranger', `insert into public.tw_profile_photos (owner_key, owner_id) values ('someone@example.com', '${T}');`, 'row owned by the teen\'s id');
refused('stranger', `insert into public.tw_profile_photos (owner_key, path) values ('someone@example.com', '${T}/p1-100.jpg');`, 'point at the teen\'s file');
refused('teen', `insert into public.tw_profile_photos (owner_key, audience) values ('teen@example.com#2', 'everyone');`, 'unknown audience');
// the teen's second account on the same email is fine
rows('teen', `insert into public.tw_profile_photos (owner_key, audience) values ('teen@example.com#2', 'me');`);

// audience "parent": the teen and the linked parent; not the employer, a stranger or anon
assert.deepEqual(seen('teen'), [`teen@example.com ${T}/p1-100.jpg`]);
assert.deepEqual(seen('parent'), [`teen@example.com ${T}/p1-100.jpg`]);
assert.deepEqual(seen('boss'), []);
assert.deepEqual(seen('stranger'), []);
assert.match(refused('anon', "select * from public.tw_photo_paths(array['teen@example.com']);", 'anon'), /permission denied/);
assert.deepEqual(files('parent'), [`${T}/p1-100.jpg`]);
assert.deepEqual(files('boss'), []);
assert.deepEqual(files('stranger'), []);
assert.deepEqual(files('anon'), []);
// viewers never read the settings row itself (it lists other people's emails)
assert.deepEqual(rows('parent', 'select owner_key from public.tw_profile_photos;'), []);
assert.deepEqual(rows('teen', 'select owner_key from public.tw_profile_photos order by 1;'), ['teen@example.com', 'teen@example.com#2']);

// audience "employers": the parent still sees it, and so does the employer the teen's app listed
rows('teen', "update public.tw_profile_photos set audience = 'employers' where owner_key = 'teen@example.com';");
assert.deepEqual(seen('parent').length, 1);
assert.deepEqual(seen('boss'), [`teen@example.com ${T}/p1-100.jpg`]);
assert.deepEqual(files('boss'), [`${T}/p1-100.jpg`]);
assert.deepEqual(seen('stranger'), []);

// audience "me": nobody else
rows('teen', "update public.tw_profile_photos set audience = 'me' where owner_key = 'teen@example.com';");
assert.deepEqual(seen('parent'), []);
assert.deepEqual(seen('boss'), []);
assert.deepEqual(files('parent'), []);
assert.deepEqual(seen('teen').length, 1);
assert.deepEqual(files('teen'), [`${T}/p1-100.jpg`]);

// Nobody else can change the teen's choice, add themselves, or delete the photo
rows('teen', "update public.tw_profile_photos set audience = 'parent' where owner_key = 'teen@example.com';");
assert.deepEqual(rows('stranger', "update public.tw_profile_photos set parent_viewers = '{someone@example.com}' where owner_key = 'teen@example.com' returning 1;"), []);
assert.deepEqual(rows('parent', "update public.tw_profile_photos set audience = 'employers' where owner_key = 'teen@example.com' returning 1;"), []);
assert.deepEqual(rows('stranger', "delete from public.tw_profile_photos where owner_key = 'teen@example.com' returning 1;"), []);
assert.deepEqual(rows('parent', "delete from storage.objects where bucket_id = 'profile-photos' returning 1;"), []);
refused('teen', "update public.tw_profile_photos set owner_id = '" + U.stranger[0] + "' where owner_key = 'teen@example.com';", 'hand the row to someone else');
assert.deepEqual(seen('stranger'), []);
assert.deepEqual(seen('parent').length, 1);

// delete-account takes a closed account off viewer lists; only the service role may
assert.match(refused('teen', "select public.tw_photo_forget_viewer('parent@example.com');", 'forget as a user'), /permission denied/);
rows('service', "select public.tw_photo_forget_viewer('PARENT@example.com');");
assert.deepEqual(seen('parent'), []);

// The owner removes the photo
assert.deepEqual(rows('teen', "delete from storage.objects where bucket_id = 'profile-photos' returning 1;"), ['1']);
rows('teen', "update public.tw_profile_photos set path = null where owner_key = 'teen@example.com';");
assert.deepEqual(seen('teen'), []);

/* ── v58: parents and employers have a photo and a choice too ─────────────────────────────────── */
const P = U.parent[0], B = U.boss[0];
const seenOf = (who, key) => rows(who, `select path from public.tw_photo_paths(array['${key}']);`);
const filesOf = (who, folder) => rows(who, `select name from storage.objects where bucket_id = 'profile-photos' and name like '${folder}/%';`);

// The parent shows the photo to their teens; the employer of the teen's approved job only when the parent says so
rows('parent', `insert into storage.objects (bucket_id, name) values ('profile-photos', '${P}/p1-200.jpg');`);
rows('parent', `insert into public.tw_profile_photos (owner_key, path, audience, teen_viewers, employer_viewers)
                values ('parent@example.com', '${P}/p1-200.jpg', 'teens', '{teen@example.com}', '{boss@example.com}');`);
assert.deepEqual(seenOf('teen', 'parent@example.com'), [`${P}/p1-200.jpg`]);
assert.deepEqual(filesOf('teen', P), [`${P}/p1-200.jpg`]);
assert.deepEqual(seenOf('boss', 'parent@example.com'), []);
assert.deepEqual(filesOf('boss', P), []);
assert.deepEqual(seenOf('stranger', 'parent@example.com'), []);
rows('parent', "update public.tw_profile_photos set audience = 'teens_employers' where owner_key = 'parent@example.com';");
assert.deepEqual(seenOf('boss', 'parent@example.com'), [`${P}/p1-200.jpg`]);
assert.deepEqual(filesOf('boss', P), [`${P}/p1-200.jpg`]);
assert.deepEqual(seenOf('stranger', 'parent@example.com'), []);
rows('parent', "update public.tw_profile_photos set audience = 'me' where owner_key = 'parent@example.com';");
assert.deepEqual(seenOf('teen', 'parent@example.com'), []);
assert.deepEqual(filesOf('teen', P), []);
assert.deepEqual(seenOf('parent', 'parent@example.com'), [`${P}/p1-200.jpg`]);

// The employer shows the photo to teens who applied, and with 'teens_parents' to those teens' parents
rows('boss', `insert into storage.objects (bucket_id, name) values ('profile-photos', '${B}/p1-300.jpg');`);
rows('boss', `insert into public.tw_profile_photos (owner_key, path, audience, teen_viewers, parent_viewers)
              values ('boss@example.com', '${B}/p1-300.jpg', 'teens_parents', '{teen@example.com}', '{parent@example.com}');`);
assert.deepEqual(seenOf('teen', 'boss@example.com'), [`${B}/p1-300.jpg`]);
assert.deepEqual(seenOf('parent', 'boss@example.com'), [`${B}/p1-300.jpg`]);
assert.deepEqual(filesOf('parent', B), [`${B}/p1-300.jpg`]);
assert.deepEqual(seenOf('stranger', 'boss@example.com'), []);
assert.deepEqual(filesOf('stranger', B), []);
assert.deepEqual(filesOf('anon', B), []);
rows('boss', "update public.tw_profile_photos set audience = 'teens' where owner_key = 'boss@example.com';");
assert.deepEqual(seenOf('teen', 'boss@example.com'), [`${B}/p1-300.jpg`]);
assert.deepEqual(seenOf('parent', 'boss@example.com'), []);
// teen_viewers only counts for the teen choices, so a teen-style 'parent' choice on an adult's row never shows it to the teen list
rows('boss', "update public.tw_profile_photos set audience = 'parent', parent_viewers = '{}' where owner_key = 'boss@example.com';");
assert.deepEqual(seenOf('teen', 'boss@example.com'), []);

// Still nobody else writes the row, unknown choices and over-long lists are refused, other people's rows stay theirs
refused('boss', "update public.tw_profile_photos set audience = 'everyone' where owner_key = 'boss@example.com';", 'unknown audience');
refused('boss', `update public.tw_profile_photos set teen_viewers = (select array_agg('t' || g || '@example.com') from generate_series(1, 301) g) where owner_key = 'boss@example.com';`, 'over 300 teens');
assert.deepEqual(rows('stranger', "update public.tw_profile_photos set teen_viewers = '{someone@example.com}' where owner_key = 'boss@example.com' returning 1;"), []);
assert.deepEqual(rows('teen', "update public.tw_profile_photos set audience = 'teens' where owner_key = 'parent@example.com' returning 1;"), []);
assert.deepEqual(rows('parent', "select owner_key from public.tw_profile_photos order by 1;"), ['parent@example.com']);

// delete-account takes a closed teen off adults' teen lists too
rows('boss', "update public.tw_profile_photos set audience = 'teens' where owner_key = 'boss@example.com';");
assert.deepEqual(seenOf('teen', 'boss@example.com').length, 1);
rows('service', "select public.tw_photo_forget_viewer('Teen@Example.com');");
assert.deepEqual(seenOf('teen', 'boss@example.com'), []);
assert.deepEqual(rows('service', "select cardinality(teen_viewers) from public.tw_profile_photos where owner_key = 'boss@example.com';"), ['0']);

console.log('profile-photos SQL checks passed');
