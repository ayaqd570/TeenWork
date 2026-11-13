/* Offline checks that deleting or closing an account also deletes its profile photo (v55).
   No real accounts or network: Supabase is a fake fetch. Run: node --experimental-strip-types tests/delete-account-photos.mjs */
import assert from 'node:assert/strict';
import { makeHandler, ADMIN_EMAIL, PHOTO_BUCKET } from '../supabase/functions/delete-account/core.ts';

const env = { url: 'https://example.supabase.co', serviceKey: 'service-test', anonKey: 'anon-test', origin: '*' };
const UID = '11111111-1111-1111-1111-111111111111';
const TOKENS = {
  teen: { id: UID, email: 'teen@example.com', app_metadata: {}, user_metadata: { account_type: 'teen' } },
  admin: { id: 'u-admin', email: ADMIN_EMAIL, app_metadata: { tw_role: 'admin' }, user_metadata: {} },
};

function fake({ photoRow, files, tableMissing }) {
  const calls = [];
  async function fetchImpl(url, init = {}) {
    const u = new URL(url), method = init.method || 'GET';
    calls.push({ method, path: u.pathname, search: decodeURIComponent(u.search), body: init.body ? JSON.parse(init.body) : null });
    if (u.pathname === '/auth/v1/user') {
      const user = TOKENS[String(init.headers.Authorization).replace(/^Bearer /, '')];
      return user ? Response.json(user) : new Response('{}', { status: 401 });
    }
    if (u.pathname.startsWith('/auth/v1/admin/users')) return method === 'GET' ? Response.json({ users: [] }) : new Response(null, { status: 200 });
    if (u.pathname === '/rest/v1/tw_profile_photos' || u.pathname === '/rest/v1/rpc/tw_photo_forget_viewer') {
      if (tableMissing) return Response.json({ code: 'PGRST205', message: "Could not find the table 'public.tw_profile_photos' in the schema cache" }, { status: 404 });
      if (method === 'GET') return Response.json(photoRow ? [photoRow] : []);
      return new Response(null, { status: 204 });
    }
    if (u.pathname === `/storage/v1/object/list/${PHOTO_BUCKET}`) return Response.json(files.map(name => ({ name })));
    if (u.pathname === `/storage/v1/object/${PHOTO_BUCKET}` && method === 'DELETE') return Response.json([]);
    if (u.pathname.startsWith('/rest/v1/')) return method === 'GET' ? Response.json([]) : new Response(null, { status: 204 });
    return new Response('not faked: ' + u.pathname, { status: 500 });
  }
  return { calls, handle: makeHandler(env, fetchImpl) };
}
const post = (handle, token, body) => handle(new Request('https://fn.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }));

// 1. The teen deletes their own account: both of their main-account photo files go (not the #2 account's), then the row
{
  const f = fake({ photoRow: { owner_id: UID, path: `${UID}/p1-200.jpg` }, files: ['p1-100.jpg', 'p1-200.jpg', 'p2-300.jpg'] });
  const r = await post(f.handle, 'teen', { action: 'self', key: 'teen@example.com' });
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
  const del = f.calls.find(c => c.method === 'DELETE' && c.path === `/storage/v1/object/${PHOTO_BUCKET}`);
  assert(del, 'photo files were not deleted');
  assert.deepEqual(del.body.prefixes.sort(), [`${UID}/p1-100.jpg`, `${UID}/p1-200.jpg`]);
  assert(f.calls.some(c => c.method === 'DELETE' && c.path === '/rest/v1/tw_profile_photos' && c.search.includes('owner_key=eq.teen@example.com')), 'photo row not deleted');
  const forget = f.calls.find(c => c.path === '/rest/v1/rpc/tw_photo_forget_viewer');
  assert.deepEqual(forget && forget.body, { p_email: 'teen@example.com' });
}
// 2. The admin closes a parent account: the parent's email comes off teens' viewer lists right away
{
  const f = fake({ photoRow: null, files: [] });
  const r = await post(f.handle, 'admin', { action: 'close', key: 'mom@example.com' });
  assert.equal(r.status, 200);
  assert(!f.calls.some(c => c.path.startsWith('/storage/')), 'no photo, so Storage is not touched');
  assert.deepEqual(f.calls.find(c => c.path === '/rest/v1/rpc/tw_photo_forget_viewer').body, { p_email: 'mom@example.com' });
}
// 3. An extra account (#2) only takes its own files
{
  const f = fake({ photoRow: { owner_id: UID, path: `${UID}/p2-300.jpg` }, files: ['p1-100.jpg', 'p2-300.jpg'] });
  const r = await post(f.handle, 'admin', { action: 'close', key: 'teen@example.com#2' });
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.find(c => c.method === 'DELETE' && c.path === `/storage/v1/object/${PHOTO_BUCKET}`).body.prefixes, [`${UID}/p2-300.jpg`]);
}
// 4. Before the photo migration is applied, deleting an account still works
{
  const f = fake({ tableMissing: true, files: [] });
  const r = await post(f.handle, 'teen', { action: 'self', key: 'teen@example.com' });
  assert.equal(r.status, 200);
}
console.log('delete-account photo checks passed');
