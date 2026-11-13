/* Offline checks for the app-emails Edge Function ("get the app" reminders). Nothing real is called: Supabase
   and Resend are a fake fetch. The database rules themselves are checked in tests/app-emails-sql.mjs.
   Run: node --experimental-strip-types tests/app-emails-function.mjs */
import assert from 'node:assert/strict';
import * as fn from '../supabase/functions/app-emails/core.ts';

const T1 = '11111111-1111-4111-8111-111111111111', T2 = '22222222-2222-4222-8222-222222222222', T3 = '33333333-3333-4333-8333-333333333333';
const base = fn.envFrom((k) => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-test', RESEND_API_KEY: 're_test', RESEND_FROM: 'hello@teenwork.ayaqd.com' })[k]);
base.pauseMs = 0;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

function world(opts = {}) {
  const w = { calls: [], sent: [], unclaimed: [], finished: [], reserveLeft: opts.reserveLeft ?? 99, resendStatus: opts.resendStatus || (() => 200), unsubscribed: [] };
  w.people = opts.people || [
    { user_id: 'u1', email: 'sam@example.com', first_name: 'Sam', account_type: 'teen', step: 1, unsub_token: T1, prev_last_at: null },
    { user_id: 'u2', email: 'mom@example.com', first_name: 'Dana<script>', account_type: 'parent', step: 2, unsub_token: T2, prev_last_at: '2026-10-20T00:00:00Z' },
    { user_id: 'u3', email: 'boss@example.com', first_name: null, account_type: 'employer', step: 1, unsub_token: T3, prev_last_at: null },
  ];
  w.fetch = async (url, init = {}) => {
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : null;
    w.calls.push({ url: String(url), headers: init.headers || {}, body });
    if (u.hostname === 'example.supabase.co') {
      assert.equal(init.headers.Authorization, 'Bearer service-test');
      const rpc = u.pathname.replace('/rest/v1/rpc/', '');
      if (rpc === 'tw_app_email_claim') { if (opts.claimFails) return new Response('no', { status: 500 }); w.claimArgs = body; return Response.json(w.people); }
      if (rpc === 'tw_email_reserve') { if (w.reserveLeft-- <= 0) return Response.json({ ok: false, reason: 'daily_limit' }); return Response.json({ ok: true, id: 100 + w.calls.length }); }
      if (rpc === 'tw_email_finish') { w.finished.push(body); return new Response(''); }
      if (rpc === 'tw_app_email_unclaim') { w.unclaimed.push(body); return new Response(''); }
      if (rpc === 'tw_email_unsubscribe') { w.unsubscribed.push(body.p_token); return Response.json(true); }
      return new Response('?', { status: 404 });
    }
    if (u.hostname === 'api.resend.com') {
      assert.equal(init.headers.Authorization, 'Bearer re_test');
      const status = w.resendStatus(body);
      if (status === 200) { w.sent.push({ body, headers: init.headers }); return Response.json({ id: 'em_' + w.sent.length }); }
      return Response.json({ message: 'nope' }, { status });
    }
    throw new Error('unexpected fetch ' + url);
  };
  return w;
}
const post = (h, body, headers = {}, q = '') => h(new Request('https://example.supabase.co/functions/v1/app-emails' + q, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }));

/* 1. a normal run */
{
  const w = world(), h = fn.makeHandler(base, w.fetch);
  const r = await (await post(h, { action: 'run' })).json();
  ok(r.ok && r.due === 3 && r.sent === 3 && r.failed === 0 && !r.stopped, 'run ' + JSON.stringify(r));
  ok(w.claimArgs.p_limit === 20 && w.claimArgs.p_min_age === '2 days' && w.claimArgs.p_gap === '21 days' && w.claimArgs.p_max_per_user === 2, 'claim args ' + JSON.stringify(w.claimArgs));
  const [a, b, c] = w.sent;
  ok(a.body.from === 'TeenWork <hello@teenwork.ayaqd.com>' && a.body.to.length === 1 && a.body.to[0] === 'sam@example.com', 'from / to');
  ok(a.headers['Idempotency-Key'] === 'app-email/u1/step-1' && b.headers['Idempotency-Key'] === 'app-email/u2/step-2', 'idempotency keys');
  ok(a.body.headers['List-Unsubscribe'] === `<https://example.supabase.co/functions/v1/app-emails?unsub=${T1}>` && a.body.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'one-click unsubscribe headers');
  ok(a.body.html.includes(`https://teenwork.ayaqd.com/?unsub=${T1}`) && a.body.text.includes(`https://teenwork.ayaqd.com/?unsub=${T1}`), 'unsubscribe link in the email');
  ok(a.body.html.includes('https://teenwork.ayaqd.com/?app=1') && a.body.text.includes('https://teenwork.ayaqd.com/?app=1'), 'Get the app link');
  ok(a.body.subject === 'Put TeenWork on your phone 📲' && b.body.subject === 'TeenWork is one tap away', 'subjects by step');
  ok(/Hi Sam,/.test(a.body.html) && /new jobs, messages and your work log/.test(a.body.html), 'teen wording');
  ok(/Hi Dana,/.test(b.body.html) && !/script/i.test(b.body.html) && /job requests and alerts/.test(b.body.html) && /last reminder/.test(b.body.html), 'parent wording, name cleaned, last reminder said');
  ok(/Hi there,/.test(c.body.html) && /new applicants/.test(c.body.html), 'employer wording, no name');
  for (const s of w.sent) {
    ok(!/🌱|&#127793;/.test(s.body.html), 'no leaf logo');
    ok(/logo\.png/.test(s.body.html) && /&#127795;/.test(s.body.html), 'tree logo and tree emoji');
    ok((s.body.html.match(/<img\b/g) || []).length === 1, 'one picture only (no tracking pixel)');
    const links = [...s.body.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    ok(links.every((l) => l.startsWith('https://teenwork.ayaqd.com/')), 'links only to the TeenWork site ' + links);
    ok(!/Vermont/.test(s.body.html), 'no Vermont in the header');
    ok(s.body.tags.some((t) => t.name === 'kind' && t.value === 'app_reminder'), 'tagged');
  }
  ok(w.finished.length === 3 && w.finished.every((f) => f.p_status === 'sent'), 'send log finished');
  const reserves = w.calls.filter((c) => /tw_email_reserve/.test(c.url)).map((c) => c.body);
  ok(reserves.every((x) => x.p_max_day === 60 && x.p_max_to_hour === 8 && /^[0-9a-f]{64}$/.test(x.p_to_hash) && !/example/.test(JSON.stringify(x))), 'reserve: day cap 60, hashes only');
  ok(w.unclaimed.length === 0, 'nothing put back');
}

/* 2. the daily budget runs out: the rest are put back for another day */
{
  const w = world({ reserveLeft: 1 }), h = fn.makeHandler(base, w.fetch);
  const r = await (await post(h, { action: 'run' })).json();
  ok(r.sent === 1 && r.stopped === 'daily_limit' && r.put_back === 2, 'budget ' + JSON.stringify(r));
  ok(w.unclaimed.map((u) => u.p_user).join() === 'u2,u3' && w.unclaimed[0].p_prev_last_at === '2026-10-20T00:00:00Z', 'put back with their old time');
}

/* 3. Resend refuses: that person is put back, a 429 / bad key stops the run */
{
  const w = world({ resendStatus: (b) => (b.to[0] === 'mom@example.com' ? 429 : 200) }), h = fn.makeHandler(base, w.fetch);
  const r = await (await post(h, { action: 'run' })).json();
  ok(r.sent === 1 && r.failed === 1 && r.stopped === 'resend_429' && r.put_back === 2, '429 ' + JSON.stringify(r));
  ok(w.finished.some((f) => f.p_status === 'failed'), 'failure logged');
  const w2 = world({ resendStatus: (b) => (b.to[0] === 'sam@example.com' ? 422 : 200) }), h2 = fn.makeHandler(base, w2.fetch);
  const r2 = await (await post(h2, { action: 'run' })).json();
  ok(r2.sent === 2 && r2.failed === 1 && !r2.stopped && r2.put_back === 1, 'a bad address does not stop the run ' + JSON.stringify(r2));
}

/* 4. not set up / switched off / secret: nothing is picked or sent */
for (const [label, env, code] of [
  ['no key', { ...base, resendKey: '' }, 'not_configured'],
  ['test sender', { ...base, resendFrom: 'onboarding@resend.dev' }, 'not_configured'],
  ['bad from', { ...base, resendFrom: 'TeenWork <hello@teenwork.ayaqd.com>' }, 'not_configured'],
]) {
  const w = world(), h = fn.makeHandler(env, w.fetch);
  const res = await post(h, { action: 'run' }), r = await res.json();
  ok(res.status === 503 && r.code === code && w.calls.length === 0, label + ' ' + JSON.stringify(r));
}
{
  const w = world(), h = fn.makeHandler({ ...base, off: true }, w.fetch);
  const r = await (await post(h, { action: 'run' })).json();
  ok(r.off && r.sent === 0 && w.calls.length === 0, 'APP_EMAILS_OFF');
  const w2 = world(), h2 = fn.makeHandler({ ...base, secret: 's3cret' }, w2.fetch);
  ok((await post(h2, { action: 'run' })).status === 401 && w2.calls.length === 0, 'secret required when set');
  ok((await (await post(h2, { action: 'run' }, { 'x-tw-cron': 's3cret' })).json()).sent === 3, 'secret accepted');
  const w3 = world({ claimFails: true }), h3 = fn.makeHandler(base, w3.fetch);
  ok((await post(h3, { action: 'run' })).status === 503 && !w3.sent.length, 'database down: nothing sent');
  const w4 = world({ people: [] }), h4 = fn.makeHandler(base, w4.fetch);
  const r4 = await (await post(h4, { action: 'run' })).json();
  ok(r4.ok && r4.due === 0 && r4.sent === 0, 'nobody due (or already ran today)');
}

/* 5. ping and preview send nothing */
{
  const w = world(), h = fn.makeHandler(base, w.fetch);
  const p = await (await post(h, { ping: true })).json();
  ok(p.ok && p.configured === true && p.from_domain === 'teenwork.ayaqd.com' && p.day_cap === 60 && !('due' in p), 'ping ' + JSON.stringify(p));
  const pv = await (await post(h, { action: 'preview', role: 'parent', step: 2, name: 'Dana' })).json();
  ok(pv.ok && pv.subject === 'TeenWork is one tap away' && /Hi Dana/.test(pv.html), 'preview');
  ok(w.calls.length === 0, 'ping / preview called nothing');
  ok((await h(new Request('https://example.supabase.co/functions/v1/app-emails', { method: 'GET' }))).status === 405, 'GET without unsub');
}

/* 6. unsubscribe links */
{
  const w = world(), h = fn.makeHandler(base, w.fetch);
  const g = await h(new Request(`https://example.supabase.co/functions/v1/app-emails?unsub=${T1.toUpperCase()}`, { method: 'GET' }));
  ok(g.status === 302 && g.headers.get('Location') === `https://teenwork.ayaqd.com/?unsub=${T1}`, 'GET goes to the page');
  ok(w.unsubscribed.length === 0, 'a GET (link scanners) does not unsubscribe by itself');
  const p = await h(new Request(`https://example.supabase.co/functions/v1/app-emails?unsub=${T2}`, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
  ok(p.status === 200 && /won't get/.test(await p.text()) && w.unsubscribed[0] === T2, 'one-click POST unsubscribes');
  const bad = await h(new Request('https://example.supabase.co/functions/v1/app-emails?unsub=../../x', { method: 'GET' }));
  ok(bad.status === 400 && w.unsubscribed.length === 1, 'bad token');
}

/* 7. env limits */
{
  const e = fn.envFrom((k) => ({ APP_EMAILS_PER_RUN: '500', APP_EMAILS_DAY_CAP: '500', APP_EMAILS_OFF: 'yes' })[k]);
  ok(e.perRun === 60 && e.dayCap === 90 && e.off && e.site === 'https://teenwork.ayaqd.com', 'caps can’t go past 60 a run / 90 a day');
  ok(fn.cleanName('  Zoë-Ann  Smith') === 'Zoë-Ann' && fn.cleanName('<b>x</b>') === '' && fn.cleanName('Dana<img src=x>') === 'Dana' && fn.cleanName(null) === '', 'cleanName');
}

console.log(`app-emails function: ${n} checks passed`);
