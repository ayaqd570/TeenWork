/* Offline checks for the employer-phone Edge Function (v64): an employer confirms a phone number with a texted code.
   Nothing real is called: Twilio Verify and Supabase are a fake fetch, and the database's send limits follow the same
   rule as tw_phone_send_ok in supabase/migrations/20261118_employer_trust.sql (checked for real in employer-trust-sql.mjs).
   Run: node --experimental-strip-types tests/employer-phone-function.mjs */
import assert from 'node:assert/strict';
import * as fn from '../supabase/functions/employer-phone/core.ts';

const env = {
  url: 'https://example.supabase.co', serviceKey: 'service-test', anonKey: 'anon-test', origin: '*',
  twilioSid: 'AC123', twilioToken: 'twilio-token', verifySid: 'VA123', hashSecret: 'pepper', dailyCap: 50,
};
const USERS = {
  'tok.en.boss': { id: 'u-boss', email: 'Boss@Example.com', user_metadata: { account_type: 'employer', tw_accounts: [{ slot: 2, type: 'teen' }] } },
  'tok.en.teen': { id: 'u-teen', email: 'teen@example.com', user_metadata: { account_type: 'teen' } },
};
for (let i = 1; i <= 4; i++) USERS['tok.en.e' + i] = { id: 'u-e' + i, email: `e${i}@example.com`, user_metadata: { account_type: 'employer' } };

let db, calls, nowMs, codes, twilioDown;
function reset() {
  db = { tw_employer_phone: [], sends: [], user_data: [{ email: 'boss@example.com#3', key: 'account_profile', value: JSON.stringify({ type: 'employer' }) }] };
  calls = []; nowMs = Date.UTC(2026, 10, 18, 16, 0, 0); codes = {}; twilioDown = false;
}
const form = b => Object.fromEntries(new URLSearchParams(b || ''));
async function fakeFetch(url, init = {}) {
  const u = new URL(url), method = init.method || 'GET';
  calls.push({ method, host: u.hostname, path: u.pathname + u.search, body: init.body });
  if (u.hostname === 'verify.twilio.com') {
    assert.equal(init.headers.Authorization, 'Basic ' + btoa('AC123:twilio-token'));
    if (twilioDown) return Response.json({ code: 20500, message: 'down' }, { status: 500 });
    const f = form(init.body);
    if (u.pathname === '/v2/Services/VA123/Verifications') {
      if (f.To === '+18025550000') return Response.json({ code: 60200, message: 'Invalid parameter `To`' }, { status: 400 });
      const sid = 'VE' + (Object.keys(codes).length + 1);
      codes[sid] = { to: f.To, code: '123456', tries: 0, done: false };
      assert.equal(f.Channel, 'sms');
      return Response.json({ sid, status: 'pending', to: f.To }, { status: 201 });
    }
    if (u.pathname === '/v2/Services/VA123/VerificationCheck') {
      const v = codes[f.VerificationSid];
      if (!v || v.done || v.tries >= 5) return Response.json({ code: 20404, message: 'not found' }, { status: 404 });
      v.tries++;
      if (f.Code === v.code) { v.done = true; return Response.json({ status: 'approved', valid: true }); }
      return Response.json({ status: 'pending', valid: false });
    }
    return Response.json({ message: 'not faked' }, { status: 500 });
  }
  if (u.pathname === '/auth/v1/user') {
    const tok = String(init.headers.Authorization).replace(/^Bearer /, '');
    return USERS[tok] ? Response.json(USERS[tok]) : new Response('{"msg":"bad jwt"}', { status: 401 });
  }
  assert.equal(init.headers.Authorization, 'Bearer service-test');
  if (u.pathname === '/rest/v1/rpc/tw_phone_send_ok') {
    const b = JSON.parse(init.body), day = r => nowMs - r.at < 864e5;
    const mine = db.sends.filter(r => day(r) && r.user === b.p_user).length, num = db.sends.filter(r => day(r) && r.hash === b.p_hash).length;
    const out = mine >= b.p_user_max ? 'user_limit' : num >= b.p_phone_max ? 'phone_limit' : db.sends.filter(day).length >= b.p_day_max ? 'day_limit' : 'ok';
    if (out === 'ok') db.sends.push({ user: b.p_user, hash: b.p_hash, at: nowMs });
    return Response.json(out);
  }
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (m && db[m[1]]) {
    const rows = db[m[1]];
    const filt = [...u.searchParams].filter(([k]) => !['select', 'limit', 'on_conflict'].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, '')]);
    const hit = r => filt.every(([k, v]) => String(r[k]) === v);
    if (method === 'GET') return Response.json(rows.filter(hit));
    if (method === 'DELETE') { db[m[1]] = rows.filter(r => !hit(r)); return new Response(null, { status: 204 }); }
    if (method === 'POST') {
      const p = JSON.parse(init.body), i = rows.findIndex(r => r.account_key === p.account_key);
      if (i >= 0) rows[i] = { ...rows[i], ...p }; else rows.push({ pending_checks: 0, ...p });
      return new Response(null, { status: 201 });
    }
  }
  if (m) return Response.json({ code: 'PGRST205', message: `Could not find the table 'public.${m[1]}' in the schema cache` }, { status: 404 });
  return Response.json({ message: 'not faked ' + u.pathname }, { status: 500 });
}
const handler = (e = env) => fn.makeHandler(e, fakeFetch, () => nowMs);
async function post(body, token, e) {
  const r = await handler(e)(new Request('https://fn.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }));
  return { status: r.status, body: await r.json() };
}
const row = key => db.tw_employer_phone.find(r => r.account_key === key);

// Phone numbers: only real-looking US / Canadian numbers
assert.equal(fn.normalizePhone('(802) 555-1234'), '+18025551234');
assert.equal(fn.normalizePhone('+1 802.555.1234'), '+18025551234');
assert.equal(fn.normalizePhone('1-802-555-1234'), '+18025551234');
for (const bad of ['', '555-1234', '(102) 555-1234', '(802) 155-1234', '+44 20 7946 0958', '802555123x', '802-555-0123', '8025551234567', null])
  assert.equal(fn.normalizePhone(bad), '', 'should refuse ' + bad);
assert.equal((await fn.phoneHash('pepper', '+18025551234')).length, 64);
assert.notEqual(await fn.phoneHash('pepper', '+18025551234'), await fn.phoneHash('other', '+18025551234'), 'the hash is keyed');

// Not switched on yet: says so plainly and calls nobody
reset();
let r = await post({ action: 'ping' }, null, { ...env, verifySid: '' });
assert.deepEqual(r.body, { ok: true, configured: false });
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.boss', { ...env, twilioToken: '' });
assert.deepEqual([r.status, r.body.code], [503, 'not_configured']);
assert.equal(calls.length, 0);

// Who may ask
reset();
assert.equal((await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' })).body.code, 'sign_in');
assert.equal((await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.e1')).body.code, 'not_yours');
assert.equal((await post({ action: 'start', account_key: 'teen@example.com', phone: '8025551234' }, 'tok.en.teen')).body.code, 'not_employer');
assert.equal((await post({ action: 'start', account_key: 'boss@example.com#2', phone: '8025551234' }, 'tok.en.boss')).body.code, 'not_employer', 'the #2 account is a teen');
assert.equal((await post({ action: 'start', account_key: 'not a key', phone: '8025551234' }, 'tok.en.boss')).body.code, 'bad_key');
assert.equal((await post({ action: 'start', account_key: 'boss@example.com', phone: '12345' }, 'tok.en.boss')).body.code, 'bad_phone');
assert(!calls.some(c => c.host === 'verify.twilio.com'), 'no text was sent');

// The happy path: send, a wrong code, the right code
reset();
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '(802) 555-1234' }, 'tok.en.boss');
assert.deepEqual(r.body, { ok: true, sent: true, last4: '1234', minutes: 10 });
let p = row('boss@example.com');
assert.deepEqual([p.user_id, p.pending_last4, p.pending_sid, p.pending_checks, p.confirmed_at], ['u-boss', '1234', 'VE1', 0, undefined]);
assert.match(p.pending_hash, /^[0-9a-f]{64}$/);
assert(!JSON.stringify(db).includes('8025551234'), 'the number itself is never stored');
r = await post({ action: 'check', account_key: 'boss@example.com', code: '000000' }, 'tok.en.boss');
assert.deepEqual([r.status, r.body.code, r.body.left], [400, 'wrong_code', 4]);
r = await post({ action: 'check', account_key: 'boss@example.com', code: 'abc' }, 'tok.en.boss');
assert.equal(r.body.code, 'bad_code');
r = await post({ action: 'check', account_key: 'BOSS@example.com', code: '123 456' }, 'tok.en.boss');
assert.deepEqual(r.body, { ok: true, confirmed: true, last4: '1234' });
p = row('boss@example.com');
assert.deepEqual([p.confirmed_last4, p.confirmed_at, p.pending_sid, p.pending_hash], ['1234', '2026-11-18T16:00:00.000Z', null, null]);
// asking again for the same number doesn't send another text
const sent = calls.filter(c => c.host === 'verify.twilio.com').length;
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '802-555-1234' }, 'tok.en.boss');
assert.equal(r.body.already, true);
assert.equal(calls.filter(c => c.host === 'verify.twilio.com').length, sent);
// an extra employer account on the same email (its profile row says employer) can use the same number
r = await post({ action: 'start', account_key: 'boss@example.com#3', phone: '802-555-1234' }, 'tok.en.boss');
assert.equal(r.body.sent, true);
// removing it
r = await post({ action: 'remove', account_key: 'boss@example.com' }, 'tok.en.boss');
assert.equal(r.body.ok, true);
assert.equal(row('boss@example.com'), undefined);

// Codes run out after 10 minutes and after 5 tries
reset();
await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.boss');
nowMs += 11 * 60_000;
r = await post({ action: 'check', account_key: 'boss@example.com', code: '123456' }, 'tok.en.boss');
assert.deepEqual([r.status, r.body.code], [410, 'expired']);
await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.boss');
for (let i = 0; i < 5; i++) assert.equal((await post({ action: 'check', account_key: 'boss@example.com', code: '999999' }, 'tok.en.boss')).body.code, 'wrong_code');
r = await post({ action: 'check', account_key: 'boss@example.com', code: '123456' }, 'tok.en.boss');
assert.equal(r.body.code, 'expired', 'the right code after 5 wrong tries is refused');
assert.equal(row('boss@example.com').confirmed_at, undefined);

// Limits: 5 codes a day per sign-in, per number, and a daily cap for all of TeenWork
reset();
for (let i = 0; i < 5; i++) assert.equal((await post({ action: 'start', account_key: 'boss@example.com', phone: '802555123' + i }, 'tok.en.boss')).body.sent, true);
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551239' }, 'tok.en.boss');
assert.deepEqual([r.status, r.body.code], [429, 'too_many']);
reset();
r = await post({ action: 'start', account_key: 'e1@example.com', phone: '8025551234' }, 'tok.en.e1', { ...env, dailyCap: 1 });
assert.equal(r.body.sent, true);
r = await post({ action: 'start', account_key: 'e2@example.com', phone: '8025551299' }, 'tok.en.e2', { ...env, dailyCap: 1 });
assert.deepEqual([r.status, r.body.code], [429, 'busy']);
assert.match(r.body.error, /tomorrow/);

// One number can confirm accounts of at most 3 different people
reset();
for (const n of [1, 2, 3]) {
  await post({ action: 'start', account_key: `e${n}@example.com`, phone: '8025551234' }, 'tok.en.e' + n);
  assert.equal((await post({ action: 'check', account_key: `e${n}@example.com`, code: '123456' }, 'tok.en.e' + n)).body.confirmed, true);
}
r = await post({ action: 'start', account_key: 'e4@example.com', phone: '8025551234' }, 'tok.en.e4');
assert.deepEqual([r.status, r.body.code], [409, 'phone_in_use']);

// Twilio refuses the number, or is down
reset();
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '8025550000' }, 'tok.en.boss');
assert.deepEqual([r.status, r.body.code], [400, 'bad_phone']);
twilioDown = true;
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.boss');
assert.deepEqual([r.status, r.body.code], [502, 'send_failed']);
assert.equal(row('boss@example.com'), undefined, 'nothing pending when the text failed');

// Database part not applied yet: says so
reset();
delete db.tw_employer_phone;
r = await post({ action: 'start', account_key: 'boss@example.com', phone: '8025551234' }, 'tok.en.boss');
assert.equal(r.body.code, 'not_set_up');

console.log('employer-phone function: all checks passed');
