/* Offline checks for who may close an account in the delete-account function (brief T2).
   No real accounts or network: Supabase is a fake fetch. Run: node --experimental-strip-types tests/delete-account-auth.mjs */
import assert from 'node:assert/strict';
import { makeHandler, ADMIN_EMAIL } from '../supabase/functions/delete-account/core.ts';

const env = { url: 'https://example.supabase.co', serviceKey: 'service-test', anonKey: 'anon-test', origin: '*' };
const TOKENS = {
  admin: { id: 'u-admin', email: ADMIN_EMAIL, app_metadata: { tw_role: 'admin' }, user_metadata: {} },
  // the role in user_metadata (which anyone can set on their own account) must not count
  selfMade: { id: 'u-teen', email: 'teen@example.com', app_metadata: {}, user_metadata: { tw_role: 'admin' } },
  // the admin's email without the role (before the migration ran) is not the admin either
  noRole: { id: 'u-admin', email: ADMIN_EMAIL, app_metadata: {}, user_metadata: {} },
};
const calls = [];
async function fakeFetch(url, init = {}) {
  const u = new URL(url), method = init.method || 'GET';
  calls.push(method + ' ' + u.pathname);
  if (u.pathname === '/auth/v1/user') {
    const user = TOKENS[String(init.headers.Authorization).replace(/^Bearer /, '')];
    return user ? Response.json(user) : new Response('{"msg":"invalid JWT"}', { status: 401 });
  }
  if (u.pathname.startsWith('/rest/v1/')) return method === 'GET' ? Response.json([]) : new Response(null, { status: 204 });
  return new Response('not faked: ' + u.pathname, { status: 500 });
}
const handle = makeHandler(env, fakeFetch);
const close = async (token) => {
  calls.length = 0;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await handle(new Request('https://fn.test/', { method: 'POST', headers, body: JSON.stringify({ action: 'close', key: 'someone@example.com' }) }));
  return { status: r.status, body: await r.json(), wrote: calls.some(c => /^(DELETE|PATCH|POST) \/rest\//.test(c)) };
};

let r = await close(null);
assert.equal(r.status, 401); assert.equal(r.body.code, 'sign_in'); assert.equal(r.wrote, false);
r = await close('anon-test');
assert.equal(r.status, 401); assert.equal(r.body.code, 'sign_in'); assert.equal(r.wrote, false);
r = await close('selfMade');
assert.equal(r.status, 403); assert.equal(r.body.code, 'admin_only'); assert.equal(r.wrote, false);
r = await close('noRole');
assert.equal(r.status, 403); assert.equal(r.body.code, 'admin_only'); assert.equal(r.wrote, false);
// The old body field is ignored: there is no admin password any more.
calls.length = 0;
const old = await handle(new Request('https://fn.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', key: 'someone@example.com', adminPassword: 'anything' }) }));
assert.equal(old.status, 401);
r = await close('admin');
assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.equal(r.body.closed_by, 'admin'); assert.equal(r.wrote, true);
console.log('delete-account auth checks passed');
