/* Offline checks for v63 "Remember me" (Aya, 2026-11-17: "make teenwork remember you so you dont always have to
   sign in if you leave and come back quickly maybe have a remember me botten also").
   A pretend Supabase keeps its sign-in in localStorage the way supabase-js does, so closing a tab and opening a new
   one (same browser) is real. Time passing is done by moving the saved times back.
   Nothing real is called: every outside request is blocked.
   Run: node tests/remember-me-v63.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8163, ROOT = 'http://127.0.0.1:' + PORT + '/';
const PW = 'Correct-horse-9';
const BOSS = 'boss@example.com', TEEN = 'ayaquarrierdraper+rm@gmail.com', ADMIN = 'ayaquarrierdraper@gmail.com', OTHER = 'someone@example.com';
const USERS = {
  [BOSS]: { password: PW, meta: { first_name: 'Mike', last_name: 'Boss', account_type: 'employer', city: 'Burlington', state: 'VT' } },
  [TEEN]: { password: PW, meta: { first_name: 'Aya', last_name: 'Test', account_type: 'teen', dob: '2010-03-04', city: 'Burlington', state: 'VT' } },
  [ADMIN]: { password: PW, meta: {}, app: { tw_role: 'admin' } },
  [OTHER]: { password: PW, meta: { first_name: 'Other', last_name: 'Person', account_type: 'employer' } },
};
const MIN = 60 * 1000, DAY = 24 * 60 * MIN;

// A pretend Supabase SDK that saves its sign-in like the real one (sb-<project>-auth-token in localStorage).
const FAKE_SUPABASE = `(() => {
  const KEY = 'sb-qocmpwimsfcnqijtfmki-auth-token';
  const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  if (!localStorage.getItem('__fake_users')) localStorage.setItem('__fake_users', ${JSON.stringify(JSON.stringify(USERS))});
  const log = ev => { const l = J('__fake_log', []); l.push(ev); localStorage.setItem('__fake_log', JSON.stringify(l)); };
  const sess = () => J(KEY, null);
  const chain = () => { const f = function () { return p; }; const p = new Proxy(f, { get(t, k) { if (k === 'then') return (a, b) => Promise.resolve({ data: [], error: null, count: 0 }).then(a, b); return f; }, apply() { return p; } }); return p; };
  const userOf = em => { const u = J('__fake_users', {})[em]; return u && { id: 'id-' + em, email: em, user_metadata: u.meta || {}, app_metadata: u.app || {}, created_at: '2026-10-01T00:00:00Z' }; };
  const auth = {
    async signInWithPassword({ email, password }) {
      const em = String(email).toLowerCase(), u = J('__fake_users', {})[em];
      if (!u || u.password !== password) return { data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } };
      const user = userOf(em);
      const s = { access_token: 'at-' + Math.random().toString(36).slice(2), refresh_token: 'rt-' + Math.random().toString(36).slice(2), expires_at: Math.floor(Date.now() / 1000) + 3600, user };
      localStorage.setItem(KEY, JSON.stringify(s)); log({ op: 'signin', email: em });
      return { data: { user, session: s }, error: null };
    },
    async signUp() { return { data: { user: null, session: null }, error: { status: 422, code: 'user_already_exists', message: 'User already registered' } }; },
    async getSession() {
      const s = sess(); if (!s) return { data: { session: null }, error: null };
      if (J('__fake_ended', []).indexOf(s.refresh_token) >= 0) { localStorage.removeItem(KEY); return { data: { session: null }, error: { status: 400, code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' } }; }
      return { data: { session: s }, error: null };
    },
    async getUser() {
      const s = sess(); if (!s) return { data: { user: null }, error: { status: 401, message: 'Auth session missing!' } };
      if (localStorage.getItem('__fake_offline')) return { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } };
      if (J('__fake_gone', []).indexOf(s.refresh_token) >= 0) return { data: { user: null }, error: { status: 403, code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist' } };
      return { data: { user: s.user }, error: null };
    },
    async refreshSession() { const s = sess(); return { data: { session: s, user: s && s.user }, error: null }; },
    async updateUser() { const s = sess(); return { data: { user: s && s.user }, error: null }; },
    async signOut(opts) { log({ op: 'signout', scope: (opts && opts.scope) || 'global (default)' }); localStorage.removeItem(KEY); return { error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  };
  window.supabase = { createClient() { const c = chain(); return new Proxy({}, { get(t, k) {
    if (k === 'then') return undefined;
    if (k === 'rpc') return async () => ({ data: null, error: null });
    if (k === 'auth') return auth;
    return c;
  } }); } };
})();`;
// No tours or one-time pop-ups in the way.
const QUIET = `try { ${JSON.stringify([BOSS, TEEN, OTHER])}.forEach(function (e) {
  var k = e.toLowerCase().replace(/[^a-z0-9]/g, '_');
  localStorage.setItem('tw_tour34_' + e, '1');
  localStorage.setItem('tw54_share_nudge_' + k, JSON.stringify({ visits: 1, done: true }));
  localStorage.setItem('tw57_app_nudge_' + k, JSON.stringify({ never: true, last: Date.now(), count: 9 }));
}); } catch (e) {}`;

async function browserContext(browser, viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await context.addInitScript(FAKE_SUPABASE);
  await context.addInitScript(QUIET);
  context.errors = [];
  return context;
}
// A new tab, as if the person typed the address again
async function tab(context, address) {
  const p = await context.newPage();
  p.setDefaultTimeout(9000);
  p.on('pageerror', e => context.errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT + (address || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.twRememberMe && window.twUrlViews && window.__twUrlViewsBooted);
  await p.waitForTimeout(1500);
  return p;
}
// Change what the browser has saved, between visits (a page that runs no TeenWork code)
async function stored(context, fn, arg) {
  const p = await context.newPage();
  await p.goto(ROOT + 'README.md');
  const out = await p.evaluate(fn, arg);
  await p.close();
  return out;
}
const mark = context => stored(context, () => JSON.parse(localStorage.getItem('tw_remember') || 'null'));
const age = (context, ms, field) => stored(context, ([ms, field]) => {
  const m = JSON.parse(localStorage.getItem('tw_remember'));
  (field ? [field] : ['at', 'seen']).forEach(f => { m[f] = Date.now() - ms; });
  if (!field) m.at = Math.min(m.at, m.seen);
  localStorage.setItem('tw_remember', JSON.stringify(m));
}, [ms, field]);
const fakeLog = context => stored(context, () => JSON.parse(localStorage.getItem('__fake_log') || '[]'));
const clearLog = context => stored(context, () => localStorage.removeItem('__fake_log'));
const token = context => stored(context, () => JSON.parse(localStorage.getItem('sb-qocmpwimsfcnqijtfmki-auth-token') || 'null'));

const state = p => p.evaluate(() => {
  const u = window.currentUser;
  const act = document.querySelector('.page.active');
  return { user: u ? (u.isAdmin ? 'admin' : u.email) : null, type: u ? u.type : null, page: act ? act.id : '', admin: !!document.getElementById('tw-admin-panel'),
    url: location.search, alert: (document.getElementById('li-alert') || {}).textContent || '' };
});
async function signIn(p, email, remember) {
  await p.evaluate(() => gotoPage('login'));
  await p.waitForTimeout(300);
  await p.fill('#li-email', email);
  await p.fill('#li-password', PW);
  if (remember) await p.check('#li-remember');
  await p.click('#page-login .form-submit');
  await p.waitForFunction(() => window.currentUser && (document.querySelector('#page-employer.active,#page-teen.active,#page-parent.active') || document.getElementById('tw-admin-panel')), null, { timeout: 15000 });
  await p.waitForTimeout(1600);   // the 1 s watcher writes the mark
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  const ok = (cond, what) => { assert(cond, what); n++; };
  try {
    /* ── 1. the box on Sign In (computer and phone) ─────────────────── */
    for (const vp of [{ width: 1280, height: 860 }, { width: 390, height: 844 }]) {
      const context = await browserContext(browser, vp);
      const p = await tab(context, '?view=login');
      const box = await p.evaluate(() => {
        const b = document.getElementById('li-remember'), row = b && b.closest('.tw63-remember');
        const btn = document.querySelector('#page-login .form-submit'), r = row && row.getBoundingClientRect();
        return b && { checked: b.checked, text: row.textContent.replace(/\s+/g, ' ').trim(), beforeButton: !!(row.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING),
          label: document.querySelector('label[for="li-remember"]') && document.querySelector('label[for="li-remember"]').getBoundingClientRect().height,
          wide: document.documentElement.scrollWidth > innerWidth + 1, inside: r.right <= innerWidth };
      });
      ok(box && !box.checked, vp.width + ': the box is there and starts off');
      ok(/Remember me for 30 days/.test(box.text) && /shared or school computer/.test(box.text) && /30 minutes/.test(box.text), vp.width + ': box text: ' + box.text);
      ok(box.beforeButton && box.inside && !box.wide, vp.width + ': sits above Sign In and fits the screen ' + JSON.stringify(box));
      ok(box.label >= 36, vp.width + ': the label is easy to tap (' + box.label + 'px)');
      if (vp.width === 390) await p.screenshot({ path: path.resolve(__dirname, '..', 'docs/remember-me-v63/sign-in-phone.png') });
      else await p.locator('#page-login .auth-card').screenshot({ path: path.resolve(__dirname, '..', 'docs/remember-me-v63/sign-in-computer.png') });
      await context.close();
    }

    /* ── 2. box off: back within 30 minutes, not after ──────────────── */
    {
      const context = await browserContext(browser);
      let p = await tab(context);
      await signIn(p, BOSS, false);
      let m = await mark(context);
      ok(m && m.kind === 'real' && m.k === BOSS && m.t === 'employer' && m.long === false, 'box off: a short mark ' + JSON.stringify(m));
      ok(!/password|token|hash/i.test(JSON.stringify(m)), 'the mark holds no password or token');

      // refresh on the homepage (used to sign out)
      await p.goto(ROOT, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1800);
      let s = await state(p);
      ok(s.user === BOSS && s.page === 'page-employer', 'a refresh on the homepage keeps them signed in ' + JSON.stringify(s));
      await p.close();

      await age(context, 20 * MIN);
      p = await tab(context);
      s = await state(p);
      ok(s.user === BOSS && s.page === 'page-employer' && /view=post-job/.test(s.url), 'closed the tab, back after 20 minutes on "/": signed in on the dashboard ' + JSON.stringify(s));
      const log = await p.evaluate(() => JSON.parse(localStorage.getItem('tw_signin_log') || '[]')[0]);
      ok(log && log.event === 'remembered', 'the sign-in log says "remembered": ' + JSON.stringify(log));
      await p.close();

      // a dashboard address in a new tab opens that section
      p = await tab(context, '?view=applicants');
      s = await state(p);
      await p.waitForTimeout(1500); s = await state(p);
      ok(s.user === BOSS && /view=applicants/.test(s.url) && await p.evaluate(() => document.getElementById('etab-applicants').classList.contains('active')), 'a dashboard address opens that section ' + JSON.stringify(s));
      await p.close();

      // the Sign In address goes to the dashboard
      p = await tab(context, '?view=login');
      s = await state(p);
      ok(s.user === BOSS && s.page === 'page-employer' && !/view=login/.test(s.url), 'the Sign In address opens the dashboard ' + JSON.stringify(s));
      await p.close();

      // 31 minutes away: sign in again, and the old Supabase sign-in is dropped
      await age(context, 31 * MIN);
      await clearLog(context);
      p = await tab(context);
      await p.waitForTimeout(800);
      s = await state(p);
      ok(s.user === null && s.page === 'page-landing', 'back after 31 minutes: signed out, on the homepage ' + JSON.stringify(s));
      ok(!(await mark(context)), 'the old mark is gone');
      ok(!(await token(context)), 'the leftover Supabase sign-in is dropped');
      const lg = await fakeLog(context);
      ok(lg.some(e => e.op === 'signout' && e.scope === 'local'), 'dropped on this device only ' + JSON.stringify(lg));
      ok(context.errors.length === 0, 'no page errors: ' + context.errors.join(' | '));
      await context.close();
    }

    /* ── 3. box on: 30 days ─────────────────────────────────────────── */
    {
      const context = await browserContext(browser);
      let p = await tab(context);
      await signIn(p, BOSS, true);
      let m = await mark(context);
      ok(m && m.long === true, 'box on: a 30-day mark ' + JSON.stringify(m));
      await p.close();
      await age(context, 29 * DAY);
      p = await tab(context);
      let s = await state(p);
      ok(s.user === BOSS && s.page === 'page-employer', 'box on, back after 29 days: still signed in ' + JSON.stringify(s));
      m = await p.evaluate(() => window.twRememberMe.mark());
      ok(m.long === true && Date.now() - m.at > 28 * DAY && Date.now() - m.seen < MIN, 'coming back keeps the 30 days from the sign-in, not from now');
      await p.close();
      await age(context, 31 * DAY, 'at');
      p = await tab(context);
      s = await state(p);
      ok(s.user === null && s.page === 'page-landing', 'box on, 31 days after signing in: sign in again ' + JSON.stringify(s));
      ok(!(await token(context)), 'and the Supabase sign-in is dropped');

      // signing in again with the box off makes it short again
      await signIn(p, BOSS, true);
      await p.evaluate(() => doLogout()); await p.waitForTimeout(1300);
      await signIn(p, BOSS, false);
      m = await mark(context);
      ok(m && m.long === false, 'signing in again with the box off: back to 30 minutes ' + JSON.stringify(m));
      ok(context.errors.length === 0, 'no page errors: ' + context.errors.join(' | '));
      await context.close();
    }

    /* ── 4. Sign out ends it (this device only), in every tab ───────── */
    {
      const context = await browserContext(browser);
      const p1 = await tab(context);
      await signIn(p1, BOSS, true);
      const p2 = await tab(context);                 // a second tab comes back signed in
      let s2 = await state(p2);
      ok(s2.user === BOSS, 'a second tab opens signed in ' + JSON.stringify(s2));
      await clearLog(context);
      await p1.evaluate(() => { document.querySelector('#page-employer button[onclick*="signOut"]') ? document.querySelector('#page-employer button[onclick*="signOut"]').click() : signOut(); });
      await p1.waitForTimeout(1500);
      const s1 = await state(p1);
      ok(s1.user === null, 'signed out ' + JSON.stringify(s1));
      ok(!(await mark(context)), 'Sign out removes the mark');
      const lg = await fakeLog(context);
      ok(lg.some(e => e.op === 'signout') && lg.filter(e => e.op === 'signout').every(e => e.scope === 'local'), 'Sign out ends only this device\'s Supabase sign-in ' + JSON.stringify(lg));
      await p2.waitForTimeout(500);
      s2 = await state(p2);
      ok(s2.user === null, 'the other open tab signs out too ' + JSON.stringify(s2));
      await p1.evaluate(() => gotoPage('login')); await p1.waitForTimeout(300);
      ok(!(await p1.isChecked('#li-remember')), 'the box is off again for the next person');
      await p1.close(); await p2.close();
      const p3 = await tab(context);
      const s3 = await state(p3);
      ok(s3.user === null && s3.page === 'page-landing', 'after Sign out a new tab asks to sign in ' + JSON.stringify(s3));
      ok(context.errors.length === 0, 'no page errors: ' + context.errors.join(' | '));
      await context.close();
    }

    /* ── 5. safety checks on coming back ────────────────────────────── */
    {
      const context = await browserContext(browser);
      let p = await tab(context);
      await signIn(p, BOSS, true);
      await p.close();
      // the server ended this sign-in (signed out everywhere, password changed …)
      await stored(context, () => { const s = JSON.parse(localStorage.getItem('sb-qocmpwimsfcnqijtfmki-auth-token')); localStorage.setItem('__fake_gone', JSON.stringify([s.refresh_token])); });
      p = await tab(context);
      await p.waitForTimeout(1200);
      let s = await state(p);
      ok(s.user === null && s.page === 'page-login' && /sign in again/i.test(s.alert), 'a sign-in the server ended: asked to sign in again ' + JSON.stringify(s));
      ok(!(await mark(context)), 'and the mark is gone');
      await p.close();

      // the browser's Supabase sign-in is someone else's: the saved mark isn't trusted
      p = await tab(context);
      await signIn(p, BOSS, true);
      await p.close();
      await stored(context, other => { const k = 'sb-qocmpwimsfcnqijtfmki-auth-token'; const s = JSON.parse(localStorage.getItem(k)); s.user.email = other; localStorage.setItem(k, JSON.stringify(s)); }, OTHER);
      p = await tab(context);
      s = await state(p);
      ok(s.user === null && s.page === 'page-landing', 'Supabase signed in as another email: not signed back in ' + JSON.stringify(s));
      await p.close();

      // a mark pointing at an account this device doesn't know
      await stored(context, () => localStorage.setItem('tw_remember', JSON.stringify({ v: 1, kind: 'real', k: 'nobody@example.com', t: 'employer', long: true, at: Date.now(), seen: Date.now() })));
      p = await tab(context);
      s = await state(p);
      ok(s.user === null && !(await mark(context)), 'an unknown account in the mark: nobody is signed in ' + JSON.stringify(s));

      // the server can't be reached: the saved copy still opens (like an offline sign-in)
      await signIn(p, BOSS, true);
      await p.close();
      await stored(context, () => { localStorage.setItem('__fake_offline', '1'); });
      p = await tab(context);
      await p.waitForTimeout(1200);
      s = await state(p);
      ok(s.user === BOSS && s.page === 'page-employer', 'offline: the remembered account still opens ' + JSON.stringify(s));
      await stored(context, () => { localStorage.removeItem('__fake_offline'); });
      ok(context.errors.length === 0, 'no page errors: ' + context.errors.join(' | '));
      await context.close();
    }

    /* ── 6. a teen (tester account), the admin, and demos ───────────── */
    {
      const context = await browserContext(browser);
      let p = await tab(context);
      await signIn(p, TEEN, false);
      await p.close();
      p = await tab(context, '?view=work-log');
      await p.waitForTimeout(1500);
      let s = await state(p);
      ok(s.user === TEEN && s.page === 'page-teen' && /view=work-log/.test(s.url), 'a teen comes back to Work Log ' + JSON.stringify(s));
      await p.evaluate(() => doLogout()); await p.waitForTimeout(1300);

      await signIn(p, ADMIN, true);
      let m = await mark(context);
      ok(m && m.kind === 'admin' && m.k === '' && m.long === true, 'the admin is remembered too ' + JSON.stringify(m));
      await p.close();
      p = await tab(context);
      await p.waitForTimeout(600);
      s = await state(p);
      ok(s.user === 'admin' && s.admin, 'the admin comes back to the admin panel ' + JSON.stringify(s));
      await p.evaluate(() => doLogout()); await p.waitForTimeout(1300);

      await p.waitForFunction(() => typeof window.twStartDemo === 'function');
      await p.evaluate(() => window.twStartDemo('teen'));
      await p.waitForTimeout(1800);
      s = await state(p);
      ok(s.user && /sandbox/.test(s.user), 'a demo is open ' + JSON.stringify(s));
      ok(!(await mark(context)), 'a demo is never remembered');
      await p.close();
      p = await tab(context);
      s = await state(p);
      ok(s.user === null && s.page === 'page-landing', 'after a demo, a new tab is signed out ' + JSON.stringify(s));

      // signed in, then a demo: ending the demo doesn't bring "Remember me" back
      await signIn(p, BOSS, true);
      await p.evaluate(() => window.twStartDemo('employer'));
      await p.waitForTimeout(1800);
      ok(!(await mark(context)), 'starting a demo signs the real account out of "Remember me"');
      await p.evaluate(() => gotoPage('landing')); await p.waitForTimeout(1500);   // ends the demo, storage is put back
      ok(!(await mark(context)), 'ending the demo does not bring the mark back');
      await p.close();
      ok(context.errors.length === 0, 'no page errors: ' + context.errors.join(' | '));
      await context.close();
    }
    console.log('remember-me-v63: ' + n + ' checks passed');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
