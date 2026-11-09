/* Offline checks for the billing (Stripe) and send-email (Resend) Edge Functions.
   Nothing real is called: Stripe, Resend and Supabase are a fake fetch, and the Stripe signatures are made
   here with a test secret. Run: node --experimental-strip-types tests/billing-and-email-functions.mjs */
import assert from 'node:assert/strict';
import * as billing from '../supabase/functions/billing/core.ts';
import * as mail from '../supabase/functions/send-email/core.ts';

/* ───────────────────────── billing ───────────────────────── */
const env = {
  url: 'https://example.supabase.co', serviceKey: 'service-test', anonKey: 'anon-test', origin: '*', site: 'https://teenwork.ayaqd.com',
  stripeKey: 'sk_test_fake', webhookSecret: 'whsec_test', prices: { teen_pro: 'price_teen', employer_pro: 'price_emp' },
};
const USERS = {
  'tok.en.teen': { id: 'u-teen', email: 'Teen@Example.com', app_metadata: {} },
  'tok.en.emp': { id: 'u-emp', email: 'boss@example.com', app_metadata: {} },
};
let db, calls, subs, nowMs;
function reset() {
  db = { tw_billing: [], tw_stripe_events: [], user_data: [] }; calls = []; nowMs = Date.UTC(2026, 10, 6, 20, 0, 0);
  subs = {};
}
const form = (b) => Object.fromEntries(new URLSearchParams(b || ''));
async function fakeFetch(url, init = {}) {
  const u = new URL(url), method = init.method || 'GET';
  calls.push({ method, path: u.pathname + u.search, headers: init.headers || {}, body: init.body });
  if (u.hostname === 'api.stripe.com') {
    assert.equal(init.headers.Authorization, 'Bearer sk_test_fake');
    const f = form(init.body);
    if (u.pathname === '/v1/customers' && method === 'POST') return Response.json({ id: 'cus_1', email: f.email });
    if (u.pathname === '/v1/checkout/sessions' && method === 'POST') return Response.json({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1', _form: f });
    if (u.pathname === '/v1/billing_portal/sessions' && method === 'POST') return Response.json({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/1' });
    const m = u.pathname.match(/^\/v1\/subscriptions\/(.+)$/);
    if (m && method === 'GET') return subs[m[1]] ? Response.json(subs[m[1]]) : Response.json({ error: { message: 'No such subscription' } }, { status: 404 });
    return Response.json({ error: { message: 'not faked ' + u.pathname } }, { status: 500 });
  }
  if (u.pathname === '/auth/v1/user') {
    const tok = String(init.headers.Authorization).replace(/^Bearer /, '');
    return USERS[tok] ? Response.json(USERS[tok]) : new Response('{"msg":"bad jwt"}', { status: 401 });
  }
  const am = u.pathname.match(/^\/auth\/v1\/admin\/users\/(.+)$/);
  if (am && method === 'PUT') { assert.equal(init.headers.Authorization, 'Bearer service-test'); (db.auth ||= {})[am[1]] = JSON.parse(init.body).app_metadata; return Response.json({ id: am[1] }); }
  const rm = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (rm) {
    const t = rm[1], rows = db[t];
    if (method === 'GET') {
      const filt = [...u.searchParams].filter(([k]) => !['select', 'limit'].includes(k));
      return Response.json(rows.filter(r => filt.every(([k, v]) => String(r[k]) === v.replace(/^eq\./, ''))));
    }
    if (method === 'POST') {
      const row = JSON.parse(init.body), pk = t === 'tw_billing' ? ['user_id'] : t === 'user_data' ? ['email', 'key'] : ['id'];
      const i = rows.findIndex(r => pk.every(k => r[k] === row[k]));
      const prefer = String(init.headers.Prefer || '');
      if (i >= 0 && /ignore-duplicates/.test(prefer)) return Response.json([]);
      if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push(row);
      return /return=representation/.test(prefer) ? Response.json([row]) : new Response(null, { status: 201 });
    }
    if (method === 'DELETE') { const id = u.searchParams.get('id')?.replace(/^eq\./, ''); db[t] = rows.filter(r => r.id !== id); return new Response(null, { status: 204 }); }
  }
  return new Response('not faked ' + u.pathname, { status: 500 });
}
const handle = billing.makeHandler(env, fakeFetch, () => nowMs);
const call = async (body, token, path = '/functions/v1/billing') => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await handle(new Request('https://fn.test' + path, { method: 'POST', headers, body: JSON.stringify(body) }));
  return { status: r.status, body: await r.json() };
};
async function hook(event, { secret = 'whsec_test', t = Math.floor(nowMs / 1000), tamper = false } = {}) {
  const raw = JSON.stringify(event);
  const sig = await billing.hmacHex(secret, `${t}.${raw}`);
  const r = await handle(new Request('https://fn.test/functions/v1/billing/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${t},v1=${sig}` }, body: tamper ? raw.replace('u-teen', 'u-evil') : raw }));
  return { status: r.status, body: await r.json() };
}
const sub = (id, status, price = 'price_teen', meta = { supabase_user_id: 'u-teen', account_key: 'Teen@Example.com' }) =>
  ({ id, object: 'subscription', customer: 'cus_1', status, cancel_at_period_end: false, metadata: meta, items: { data: [{ price: { id: price }, current_period_end: 1765000000 }] } });

reset();
// form encoding Stripe understands
assert.equal(decodeURIComponent(billing.formEncode({ line_items: [{ price: 'p', quantity: 1 }], metadata: { a: 'b c' } })), 'line_items[0][price]=p&line_items[0][quantity]=1&metadata[a]=b c');

// ping needs no sign-in and shows the mode
let r = await call({ action: 'ping' });
assert.deepEqual(r.body, { ok: true, configured: true, mode: 'test', prices: { teen_pro: true, employer_pro: true }, webhook: true });
const off = billing.makeHandler({ ...env, stripeKey: '', webhookSecret: '' }, fakeFetch);
r = await off(new Request('https://fn.test/', { method: 'POST', body: JSON.stringify({ action: 'checkout', plan: 'teen_pro' }) }));
assert.equal(r.status, 503);

// checkout: sign-in required, account must belong to the sign-in, plan must be known
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'teen@example.com' });
assert.equal(r.status, 401); assert.equal(r.body.code, 'sign_in');
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'teen@example.com' }, 'anon-test');
assert.equal(r.status, 401);
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'boss@example.com' }, 'tok.en.teen');
assert.equal(r.status, 403); assert.equal(r.body.code, 'wrong_account');
r = await call({ action: 'checkout', plan: 'gold', account_key: 'teen@example.com' }, 'tok.en.teen');
assert.equal(r.status, 400);
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'Teen@Example.com#2', return_view: 'jobs' }, 'tok.en.teen');
assert.equal(r.status, 200); assert.equal(r.body.url, 'https://checkout.stripe.com/c/pay/cs_1');
const cs = form(calls.find(c => c.path === '/v1/checkout/sessions').body);
assert.equal(cs.mode, 'subscription'); assert.equal(cs.customer, 'cus_1'); assert.equal(cs['line_items[0][price]'], 'price_teen');
assert.equal(cs.client_reference_id, 'u-teen'); assert.equal(cs['subscription_data[metadata][account_key]'], 'Teen@Example.com#2');
assert.equal(cs.success_url, 'https://teenwork.ayaqd.com/?view=jobs&checkout=success');
assert.equal(cs.cancel_url, 'https://teenwork.ayaqd.com/?view=jobs&checkout=cancel');
assert.equal(db.tw_billing[0].stripe_customer_id, 'cus_1');
// a bad return view is dropped, the customer is reused
calls = [];
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'teen@example.com', return_view: 'x"><script>' }, 'tok.en.teen');
assert.equal(form(calls.find(c => c.path === '/v1/checkout/sessions').body).success_url, 'https://teenwork.ayaqd.com/?checkout=success');
assert.equal(calls.filter(c => c.path === '/v1/customers').length, 0);

// webhook: bad / old / tampered signatures are refused and change nothing
subs.sub_1 = sub('sub_1', 'active');
const done = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1', client_reference_id: 'u-teen', metadata: { account_key: 'Teen@Example.com' } } } };
r = await hook(done, { secret: 'whsec_wrong' }); assert.equal(r.status, 400); assert.equal(r.body.code, 'bad_signature');
r = await hook(done, { t: Math.floor(nowMs / 1000) - 600 }); assert.equal(r.status, 400);
r = await hook(done, { tamper: true }); assert.equal(r.status, 400);
assert.equal(db.tw_stripe_events.length, 0); assert.equal(db.auth, undefined);

// a paid checkout turns Pro on everywhere
r = await hook(done);
assert.equal(r.status, 200); assert.equal(r.body.plan, 'pro');
assert.deepEqual(db.auth['u-teen'], { tw_plan: 'pro', tw_ai_plan: 'pro', tw_billing_status: 'active' });
assert.deepEqual(db.user_data.map(x => [x.email, x.key, x.value]), [['Teen@Example.com', 'plan', '"pro"']]);
const row = db.tw_billing.find(x => x.user_id === 'u-teen');
assert.equal(row.status, 'active'); assert.equal(row.plan, 'teen_pro'); assert.equal(row.subscription_id, 'sub_1'); assert.equal(row.current_period_end, new Date(1765000000 * 1000).toISOString());
// the same event again is skipped
calls = [];
r = await hook(done); assert.equal(r.body.duplicate, true); assert(!calls.some(c => c.path.startsWith('/v1/subscriptions')));

// status for the app
r = await call({ action: 'status' }, 'tok.en.teen');
assert.equal(r.body.plan, 'pro'); assert.equal(r.body.status, 'active'); assert.equal(r.body.has_billing, true);
// a second checkout while Pro is refused, the billing page opens instead
r = await call({ action: 'checkout', plan: 'teen_pro', account_key: 'teen@example.com' }, 'tok.en.teen');
assert.equal(r.status, 409); assert.equal(r.body.code, 'already_pro');
r = await call({ action: 'portal', return_view: 'pricing' }, 'tok.en.teen');
assert.equal(r.body.url, 'https://billing.stripe.com/p/session/1');
assert.equal(form(calls.find(c => c.path === '/v1/billing_portal/sessions').body).return_url, 'https://teenwork.ayaqd.com/?view=pricing');
r = await call({ action: 'portal' }, 'tok.en.emp'); assert.equal(r.status, 404);

// canceling (an event without our metadata: found through the customer id) turns Pro off; the event is read fresh
subs.sub_1 = sub('sub_1', 'canceled', 'price_teen', {});
r = await hook({ id: 'evt_2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', status: 'active' } } });
assert.equal(r.body.plan, 'free');
assert.equal(db.auth['u-teen'].tw_ai_plan, 'free');
assert.equal(db.user_data.find(x => x.key === 'plan').value, '"free"');
// past_due keeps Pro while Stripe retries the card; an unknown price never gives Pro
assert.equal(billing.planFromSubscription(sub('s', 'past_due'), env.prices).pro, true);
assert.equal(billing.planFromSubscription(sub('s', 'active', 'price_other'), env.prices).pro, false);
assert.equal(billing.planFromSubscription({ status: 'active', current_period_end: 1765000000, items: { data: [{ price: { id: 'price_emp' } }] } }, env.prices).kind, 'employer_pro');
// a failing Stripe call lets Stripe retry (the event is not remembered)
r = await hook({ id: 'evt_3', type: 'customer.subscription.updated', data: { object: { id: 'sub_missing' } } });
assert.equal(r.status, 500); assert(!db.tw_stripe_events.some(e => e.id === 'evt_3'));
// other events are accepted and ignored
r = await hook({ id: 'evt_4', type: 'invoice.paid', data: { object: {} } }); assert.equal(r.status, 200); assert.equal(r.body.ignored, 'invoice.paid');
console.log('billing function checks passed');

/* ───────────────────────── send-email ───────────────────────── */
const menv = { ...mail.envFrom(() => ''), url: 'https://example.supabase.co', serviceKey: 'service-test', anonKey: 'anon-test', resendKey: 're_fake', resendFrom: 'hello@ayaqd.com' };
let sent = [], reserves = [];
async function mailFetch(url, init = {}) {
  const u = new URL(url);
  if (u.pathname === '/auth/v1/user') {
    const tok = String(init.headers.Authorization).replace(/^Bearer /, '');
    return USERS[tok] ? Response.json(USERS[tok]) : new Response('{}', { status: 401 });
  }
  if (u.pathname.endsWith('/tw_email_reserve')) { reserves.push(JSON.parse(init.body)); return Response.json({ ok: true, id: reserves.length }); }
  if (u.pathname.endsWith('/tw_email_finish')) return new Response('', { status: 204 });
  if (u.hostname === 'api.resend.com') { sent.push(JSON.parse(init.body)); return Response.json({ id: 'em_' + sent.length }); }
  return new Response('not faked', { status: 500 });
}
const mh = mail.makeHandler(menv, mailFetch);
const send = async (body, token) => {
  const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await mh(new Request('https://fn.test/', { method: 'POST', headers, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};
const html = '<p>Hi</p><a href="https://teenwork.ayaqd.com/?share=AB12CD">Share TeenWork</a> <a href="https://evil.example/login">Sign in</a> ' +
  '<a href="mailto:?subject=Hi">Email a friend</a> <img src="https://evil.example/x.png"> <script>alert(1)</script>' +
  '<a href="https://teenwork.ayaqd.com.evil.example/">x</a><a href="javascript:alert(1)">js</a><p onclick="x()">ok</p>';

let m = await send({ ping: true });
assert.equal(m.body.configured, true); assert.equal(m.body.testing, false); assert.equal(m.body.from_domain, 'ayaqd.com');
// signed in: TeenWork links and mailto stay, everything else becomes text
m = await send({ to: 'friend@example.com', subject: 'Hi', html }, 'tok.en.teen');
assert.equal(m.status, 200);
let h = sent.at(-1).html;
assert(h.includes('href="https://teenwork.ayaqd.com/?share=AB12CD"'), 'TeenWork link kept');
assert(h.includes('href="mailto:?subject=Hi"'), 'mailto kept');
assert(!/evil\.example|<img|<script|javascript:|onclick/i.test(h), 'unsafe parts left: ' + h);
assert(h.includes('<span>Sign in</span>'), 'outside link turned into text');
assert.equal(sent.at(-1).from, 'TeenWork <hello@ayaqd.com>');
assert.equal(reserves.at(-1).p_max_ip_hour, 20, 'signed-in people get the per-person limit');
// not signed in: no links at all, per-IP limit
m = await send({ to: 'friend@example.com', subject: 'Hi', html, from_name: 'Your Bank' }, 'anon-test');
h = sent.at(-1).html;
assert(!/<a\b/i.test(h), 'anonymous email still has a link');
assert.equal(sent.at(-1).from, 'TeenWork <hello@ayaqd.com>');
assert.equal(reserves.at(-1).p_max_ip_hour, 15);
assert.notEqual(reserves.at(-1).p_ip_hash, reserves.at(-2).p_ip_hash);
// a forged token counts as not signed in
m = await send({ to: 'friend@example.com', subject: 'Hi', html }, 'a.b.c');
assert(!/<a\b/i.test(sent.at(-1).html));
// basic checks still hold
assert.equal((await send({ to: 'not-an-email', subject: 'x', html: '<p>x</p>' })).status, 400);
assert.equal((await send({ to: 'a@b.co', subject: 'x', html: '' })).status, 400);
assert.equal(mail.linkAllowed('https://teenwork.ayaqd.com:8443/', 'https://teenwork.ayaqd.com', true), false);
assert.equal(mail.linkAllowed('https://user@teenwork.ayaqd.com/', 'https://teenwork.ayaqd.com', true), false);
assert.equal(mail.linkAllowed('http://teenwork.ayaqd.com/', 'https://teenwork.ayaqd.com', true), false);
console.log('send-email function checks passed');

// ── billing: the live prices are the default only with a live key ──
{
  const e = (o) => billing.envFrom((k) => o[k]);
  assert.deepEqual(e({ STRIPE_SECRET_KEY: 'sk_live_x' }).prices, billing.LIVE_PRICES);
  assert.deepEqual(e({ STRIPE_SECRET_KEY: 'rk_live_x' }).prices, billing.LIVE_PRICES);
  assert.deepEqual(e({ STRIPE_SECRET_KEY: 'sk_test_x' }).prices, { teen_pro: '', employer_pro: '' });
  assert.deepEqual(e({}).prices, { teen_pro: '', employer_pro: '' });
  assert.equal(e({ STRIPE_SECRET_KEY: 'sk_live_x', STRIPE_PRICE_TEEN_PRO: 'price_other' }).prices.teen_pro, 'price_other');
  assert.match(billing.LIVE_PRICES.teen_pro, /^price_/); assert.match(billing.LIVE_PRICES.employer_pro, /^price_/);
  console.log('billing price defaults passed');
}
