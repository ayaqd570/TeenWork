/* Offline checks for v60 "account pages" (Aya's list of Nov 15, 2026), as a signed-in teen, parent and employer:
   every page has its own title, the share note is on the home section only, Messages shows Attach / Reply / Safe
   only while a chat is open, Profile & Settings opens on the profile card with a bio that really saves,
   the Activity Digest stays away until there is something to show, and Work Log money always has cents.
   Nothing real is called: Supabase is faked and every outside request is blocked.
   Run: node tests/account-pages-v60.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8160, ROOT = 'http://127.0.0.1:' + PORT + '/';
const BASE_TITLE = /TeenWork/;
// The teen is a tester account (the +name trick), so no parent link is needed and every page opens.
const EMAIL = { teen: 'ayaquarrierdraper+v60@gmail.com', parent: 'mom@example.com', employer: 'boss@example.com' };
const slug = e => e.toLowerCase().replace(/[^a-z0-9]/g, '_');

// A pretend Supabase SDK (the real one comes from a CDN, which is blocked here).
const FAKE_SUPABASE = `(() => {
  const chain = () => { const f = function () { return p; }; const p = new Proxy(f, { get(t, k) { if (k === 'then') return (a, b) => Promise.resolve({ data: [], error: null, count: 0 }).then(a, b); return f; }, apply() { return p; } }); return p; };
  const auth = new Proxy({}, { get(t, k) {
    if (k === 'getSession') return async () => ({ data: { session: null }, error: null });
    if (k === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe() {} } } });
    return async () => ({ data: {}, error: null });
  } });
  window.supabase = { createClient() { const c = chain(); return new Proxy({}, { get(t, k) {
    if (k === 'then') return undefined;
    if (k === 'rpc') return async () => ({ data: true, error: null });
    if (k === 'auth') return auth;
    return c;
  } }); } };
})();`;
// The share note shows from the 3rd visit: start these accounts at 5. The "get the app" pop-up stays away.
const SEEN = `try { ${JSON.stringify(Object.values(EMAIL).map(slug))}.forEach(function (k) {
  if (!localStorage.getItem('tw54_share_nudge_' + k)) localStorage.setItem('tw54_share_nudge_' + k, JSON.stringify({ visits: 5, done: false }));
  localStorage.setItem('tw57_app_nudge_' + k, JSON.stringify({ never: true, last: Date.now(), count: 9 }));
}); } catch (e) {}`;

async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await context.addInitScript(FAKE_SUPABASE);
  await context.addInitScript(SEEN);
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twShare && window._twAccountPagesV60 && window.twCleanMenu);
  await p.waitForTimeout(400);
  return { context, p, errors };
}
async function member(p, type) {
  await p.evaluate(([type, email]) => {
    const u = { name: 'Aya Test', email, type, emailVerified: true, age: 16, state: 'VT', city: 'Burlington', dob: '2010-03-04' };
    try { currentUser = u; } catch (e) {} window.currentUser = u;
    gotoPage(type); launchDashboard();
  }, [type, EMAIL[type]]);
  await p.waitForTimeout(1500);
  for (const label of [/Skip for now/i, /Skip tour/i]) {
    const b = p.locator('button:visible', { hasText: label });
    if (await b.count()) { await b.first().click(); await p.waitForTimeout(500); }
  }
  await p.waitForTimeout(3200);                       // the share note comes 2.5 s after the dashboard opens
  const s = p.locator('button:visible', { hasText: /Skip tour/i }); if (await s.count()) await s.first().click();
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => document.getElementById('featpack-install')?.classList.remove('open'));
  await p.waitForTimeout(300);
}
const goTo = (p, id) => p.evaluate(id => switchDashTab(null, id), id).then(() => p.waitForTimeout(350));
// What the menu calls each section of this role's dashboard: [[id, label], ...]
const menuOf = (p, role) => p.evaluate(role => {
  const m = window.twCleanMenu.menu[role]; let items = m.main.slice();
  (m.groups || []).forEach(g => { items = items.concat(g.items || []); });
  return items.filter(i => /^[tpe]tab-/.test(i[0]) && document.getElementById(i[0])).map(i => [i[0], i[2]]);
}, role);
// The header of the open dashboard, as a person sees it.
const header = (p, role) => p.evaluate(role => {
  const vis = el => !!el && el.getClientRects().length > 0;
  const h1 = document.querySelector('#page-' + role + ' .dash-header h1'), wrap = h1.parentElement;
  return {
    h1: (h1.firstChild && h1.firstChild.nodeType === 3 ? h1.firstChild.nodeValue : '').trim(),
    lines: [...wrap.children].filter(c => c.tagName === 'P' && vis(c)).map(c => c.textContent.replace(/\s+/g, ' ').trim()),
    tab: document.title,
    notes: [...document.querySelectorAll('.tw54-share-note')].filter(vis).length,
    wide: document.documentElement.scrollWidth > innerWidth + 1,
  };
}, role);
const toastText = p => p.evaluate(() => (document.getElementById('global-toast') || {}).textContent || '');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  const ok = (cond, what) => { assert(cond, what); n++; };
  try {
    /* ── the teen's pages, on a computer and on a phone ─────────────── */
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const tag = vp.width + ': ';
      const { context, p, errors } = await open(browser, vp);
      const base = await p.title();
      ok(BASE_TITLE.test(base), tag + 'the public page has its own tab title');
      await member(p, 'teen');

      // 1. page titles
      const menu = await menuOf(p, 'teen'), names = Object.fromEntries(menu);
      ok(menu.length >= 8, tag + 'teen menu sections found: ' + menu.length);
      ok(names['ttab-worklog'] === 'Work Log' && names['ttab-resume'] === 'Profile & Settings' && names['ttab-applications'] === 'Applied', tag + 'menu names ' + JSON.stringify(names));
      const home = await header(p, 'teen');
      ok(home.h1 === names['ttab-browse'] && home.tab === names['ttab-browse'] + ' · TeenWork', tag + 'home title ' + JSON.stringify(home));
      ok(home.lines.length === 1 && /Find your next job/.test(home.lines[0]), tag + 'the greeting is on the home section: ' + home.lines);
      ok(home.notes === 1, tag + 'the share note is on the home section');
      const seen = new Set();
      for (const [id, label] of menu) {
        await goTo(p, id);
        const h = await header(p, 'teen');
        ok(h.h1 === label && h.tab === label + ' · TeenWork', tag + id + ' title ' + JSON.stringify(h));
        ok(!seen.has(h.h1), tag + id + ' has a title of its own'); seen.add(h.h1);
        ok(!/Teen Dashboard/.test(h.h1), tag + id + ' is not called "Teen Dashboard"');
        if (id !== 'ttab-browse') {
          ok(!h.lines.some(l => /Find your next job/.test(l)), tag + id + ' has no home greeting: ' + h.lines);
          ok(h.lines.length <= 1, tag + id + ' has one line under the title at most: ' + h.lines);
          ok(h.notes === 0, tag + id + ' has no share note');                                   // 2. share note
        }
        ok(!h.wide, tag + id + ' fits the screen');
      }
      await goTo(p, 'ttab-browse');
      ok((await header(p, 'teen')).notes === 1, tag + 'back home, the share note is there again');

      // 3. Messages: Attach, Reply and Safe wait for an open chat
      const tools = () => p.evaluate(() => {
        const t = document.getElementById('msg-sidebar-tools');
        return { shown: !!t && t.getClientRects().length > 0, chat: !!document.querySelector('#msg-main-area .msg-input-bar'), names: t ? [...t.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).join(' | ') : '' };
      });
      await p.evaluate(() => openMsgModal()); await p.waitForTimeout(600);
      let t = await tools();
      ok(!t.chat && !t.shown, tag + 'no chat open: Messages tools are hidden ' + JSON.stringify(t));
      await p.evaluate(() => closeMsgModal()); await p.waitForTimeout(250);
      await p.evaluate(() => openMsgModal('Green Thumb Gardens', 'employer')); await p.waitForTimeout(600);
      t = await tools();
      ok(t.chat && t.shown && /Attach/.test(t.names) && /Reply/.test(t.names) && /Safe/.test(t.names), tag + 'chat open: Messages tools show ' + JSON.stringify(t));
      await p.evaluate(() => { document.getElementById('msg-main-area').innerHTML = '<p>Pick a chat</p>'; }); await p.waitForTimeout(150);
      t = await tools();
      ok(!t.chat && !t.shown, tag + 'the chat is gone: tools are hidden again ' + JSON.stringify(t));
      await p.evaluate(() => closeMsgModal()); await p.waitForTimeout(250);

      // 4. Profile & Settings opens on the profile card, bio first, and the bio really saves
      await goTo(p, 'ttab-resume'); await p.waitForTimeout(500);
      const prof = await p.evaluate(() => {
        const panel = document.getElementById('ttab-resume'), card = document.getElementById('teen-profile-card'), box = document.getElementById('profile-bio-input');
        const top = el => el.getBoundingClientRect().top;
        const link = document.getElementById('tw-link-card');
        const todo = document.getElementById('tw60-profile-todo');
        return { first: panel.firstElementChild.id, value: box.value, sample: /Hardworking 16-year-old/.test(panel.textContent), boxInCard: card.contains(box),
          aboveLink: !link || !link.getClientRects().length || top(box) < top(link), todo: todo.hidden ? '' : todo.textContent, pct: computeProfileCompletion() };
      });
      ok(prof.first === 'teen-profile-card' && prof.boxInCard && prof.aboveLink, tag + 'the profile card with the bio box is first ' + JSON.stringify(prof));
      ok(prof.value === '' && !prof.sample, tag + 'the bio box starts empty, with no sample bio');
      ok(/^Profile \d+% complete\./.test(prof.todo) && /bio/i.test(prof.todo), tag + 'the card says what is missing: ' + prof.todo);
      await p.locator('#teen-profile-card button', { hasText: 'Save Bio' }).click(); await p.waitForTimeout(250);
      ok(/Write a sentence or two/.test(await toastText(p)), tag + 'Save Bio with an empty box asks for a bio');
      const BIO = 'I am on time, I like dogs and I work hard outside.';
      await p.locator('#profile-bio-input').click();
      await p.keyboard.type(BIO);
      await p.waitForTimeout(1300);                    // it saves by itself 0.9 s after the last key
      const typed = await p.evaluate(() => ({ db: _DB.load('bio', null), app: userActivity.bio, said: document.getElementById('tw60-bio-saved').textContent, pct: computeProfileCompletion() }));
      ok(typed.db === BIO && typed.app === BIO && typed.said === 'Saved', tag + 'a typed bio is saved to the account ' + JSON.stringify(typed));
      ok(typed.pct > prof.pct, tag + 'the profile is more complete with a bio: ' + prof.pct + ' → ' + typed.pct);
      ok(errors.length === 0, tag + 'typing a bio makes no errors: ' + errors);
      await p.locator('#teen-profile-card button', { hasText: 'Save Bio' }).click(); await p.waitForTimeout(250);
      ok(/Bio saved/.test(await toastText(p)), tag + 'Save Bio says it saved: ' + await toastText(p));
      await p.locator('#profile-bio-input').blur();
      await p.evaluate(() => { document.getElementById('profile-bio-input').value = ''; window._twAccountPagesV60.syncProfile(); });
      ok(await p.locator('#profile-bio-input').inputValue() === BIO, tag + 'the saved bio comes back into the box');
      await p.locator('#skills-input').fill('dog walking, yard work'); await p.locator('#skills-input').dispatchEvent('input'); await p.waitForTimeout(400);
      await goTo(p, 'ttab-browse'); await goTo(p, 'ttab-resume'); await p.waitForTimeout(300);
      const done = await p.evaluate(() => ({ pct: computeProfileCompletion(), hidden: document.getElementById('tw60-profile-todo').hidden }));
      ok(done.pct < 100 || done.hidden, tag + 'a finished profile has no "still to add" note ' + JSON.stringify(done));

      // 5. the Activity Digest waits for activity
      await goTo(p, 'ttab-applications'); await p.waitForTimeout(400);
      const digest = () => p.evaluate(() => { const c = document.getElementById('teen-activity-digest'); return { shown: c.getClientRects().length > 0, text: c.innerText.replace(/\s+/g, ' ') }; });
      let d = await digest();
      ok(!d.shown, tag + 'nothing done yet: no digest ' + JSON.stringify(d));

      // 6. Work Log money always has cents
      await goTo(p, 'ttab-worklog'); await p.waitForTimeout(400);
      const wl = () => p.evaluate(() => ({ earned: document.getElementById('wl-total-earned').textContent.trim(), avg: document.getElementById('wl-avg-rate').textContent.trim(),
        cards: document.getElementById('worklog-job-cards').innerText.replace(/\s+/g, ' '), rows: document.getElementById('worklog-sessions-list').innerText.replace(/\s+/g, ' '),
        wide: document.documentElement.scrollWidth > innerWidth + 1, cut: [...document.querySelectorAll('#worklog-stat-strip>div>div:first-child')].some(e => e.scrollWidth > e.clientWidth + 1) }));
      let w = await wl();
      ok(w.earned === '$0.00' && w.avg === '$0.00', tag + 'an empty Work Log shows $0.00 twice ' + JSON.stringify(w));
      for (const [job, hours, pay] of [['Green Thumb', '2.5', '31.25'], ['Dog walks', '1', '12.5'], ['Green Thumb', '3', '1200']]) {
        await p.evaluate(() => openAddWorkLogModal()); await p.waitForTimeout(200);
        await p.fill('#wl-job', job); await p.fill('#wl-hours', hours); await p.fill('#wl-pay', pay);
        await p.evaluate(() => { const el = document.getElementById('wl-date'); if (el && !el.value) el.value = new Date().toISOString().slice(0, 10); });
        await p.evaluate(() => saveWorkLogEntry()); await p.waitForTimeout(300);
      }
      await p.waitForTimeout(400);
      w = await wl();
      ok(w.earned === '$1,243.75' && w.avg === '$191.35', tag + 'totals with cents and a comma ' + JSON.stringify(w));
      const money = (w.cards + ' ' + w.rows).match(/-?\$[\d,.]+/g) || [];
      ok(money.length >= 5 && money.every(m => /^-?\$\d{1,3}(,\d{3})*\.\d\d$/.test(m)), tag + 'every amount on the page has cents: ' + money);
      ok(/\$1,231\.25/.test(w.cards) && /\$12\.50/.test(w.cards + w.rows), tag + 'job cards add up with cents: ' + w.cards.slice(0, 200));
      ok(!w.wide && !w.cut, tag + 'the Work Log numbers fit the screen ' + JSON.stringify({ wide: w.wide, cut: w.cut }));
      await goTo(p, 'ttab-resume'); await p.waitForTimeout(500);
      const earned = await p.evaluate(() => document.getElementById('t-stat-earned').closest('.stat-card').innerText.replace(/\s+/g, ' '));
      ok(/\$1,243\.75/.test(earned) && !/\$\d[\d,]*(?!\.\d\d)(?![\d,.])/.test(earned), tag + 'the profile shows the same amount, with cents: ' + earned);

      // 5 again: now there are hours, so the digest is there, and it does not call totals "a week"
      await goTo(p, 'ttab-applications'); await p.waitForTimeout(500);
      d = await digest();
      ok(d.shown && /Activity Digest/.test(d.text) && /6\.5h/.test(d.text), tag + 'hours logged: the digest shows ' + JSON.stringify(d));
      ok(!/Week of|Weekly|this week/i.test(d.text), tag + 'the digest does not call its totals a week: ' + d.text);

      ok(errors.length === 0, tag + 'no page errors: ' + [...new Set(errors)]);

      // signing out puts the public tab title back
      await p.evaluate(() => window.signOut()); await p.waitForTimeout(900);
      ok(await p.title() === base, tag + 'signed out: tab title is "' + await p.title() + '"');
      await context.close();
    }

    /* ── parents and employers get the same titles ──────────────────── */
    for (const role of ['parent', 'employer']) {
      const tag = role + ': ';
      const { context, p, errors } = await open(browser, { width: 1440, height: 900 });
      const base = await p.title();
      await member(p, role);
      const menu = await menuOf(p, role);
      ok(menu.length >= 5, tag + 'menu sections found: ' + menu.length);
      const homeId = await p.evaluate(role => document.querySelector('#page-' + role + ' .dashboard > .tab-panel').id, role);
      const homeLines = (await header(p, role)).lines;
      ok((await header(p, role)).notes === 1, tag + 'the share note is on the home section');
      const seen = new Set();
      for (const [id, label] of menu) {
        await goTo(p, id);
        const h = await header(p, role);
        ok(h.h1 === label && h.tab === label + ' · TeenWork', tag + id + ' title ' + JSON.stringify(h));
        ok(!seen.has(h.h1) && !/Dashboard/.test(h.h1), tag + id + ' has a title of its own'); seen.add(h.h1);
        ok(h.notes === (id === homeId ? 1 : 0), tag + id + ' share note count ' + h.notes);
        // a parent's "whose account is this" line stays on every page; an employer's greeting is on the home section only
        if (role === 'parent') ok(JSON.stringify(h.lines) === JSON.stringify(homeLines), tag + id + ' keeps the parent line: ' + h.lines);
        else if (id !== homeId) ok(homeLines.every(l => !h.lines.includes(l)) && h.lines.length <= 1, tag + id + ' has no home greeting: ' + h.lines);
      }
      ok(errors.length === 0, tag + 'no page errors: ' + [...new Set(errors)]);
      await p.evaluate(() => window.signOut()); await p.waitForTimeout(900);
      ok(await p.title() === base, tag + 'signed out: tab title is "' + await p.title() + '"');
      await context.close();
    }
    console.log(`account-pages-v60: ${n} checks passed`);
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
