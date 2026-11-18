/* Offline checks for v64 (Aya's review of 2026-11-18, items 7 and 8):
   7. Work Log has one title. The dashboard header says "Work Log" (account-pages-v60), and the page itself no longer
      starts with a second title ("⏱️ Hours & Work Record"). The intro line, Export and Log Hours stay.
   8. The home page leads with parent approval: the headline, the line under it, the top-bar line on computers,
      "How parent approval works", the For parents card first and the Parent demo first.
   1. (asked the same day) On computers the hero picture is about half the screen tall, whole, with the headline and
      Sign Up beside it on the first screen. Phones and tablets keep the big picture with the headline under it.
   Nothing real is called: Supabase is faked and every outside request is blocked.
   Run: node tests/parent-first-v64.cjs   (add --scan to print every dashboard page's title and first heading) */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8164, ROOT = 'http://127.0.0.1:' + PORT + '/';
const SCAN = process.argv.includes('--scan');
// The teen is a tester account (the +name trick), so no parent link is needed and every page opens.
const EMAIL = { teen: 'ayaquarrierdraper+v64@gmail.com', parent: 'mom@example.com', employer: 'boss@example.com' };
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
// Keep the share note and the "get the app" pop-up away.
const SEEN = `try { ${JSON.stringify(Object.values(EMAIL).map(slug))}.forEach(function (k) {
  localStorage.setItem('tw54_share_nudge_' + k, JSON.stringify({ visits: 1, done: true }));
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
  await p.waitForFunction(() => window._twDemoSandbox && window._twAccountPagesV60 && window.twCleanMenu && document.getElementById('tw50-details'));
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
  await p.waitForTimeout(1200);
  const s = p.locator('button:visible', { hasText: /Skip tour/i }); if (await s.count()) await s.first().click();
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => document.getElementById('featpack-install')?.classList.remove('open'));
  await p.waitForTimeout(300);
}
const goTo = (p, id) => p.evaluate(id => switchDashTab(null, id), id).then(() => p.waitForTimeout(450));
const menuOf = (p, role) => p.evaluate(role => {
  const m = window.twCleanMenu.menu[role]; let items = m.main.slice();
  (m.groups || []).forEach(g => { items = items.concat(g.items || []); });
  return items.filter(i => /^[tpe]tab-/.test(i[0]) && document.getElementById(i[0])).map(i => [i[0], i[2]]);
}, role);
// The page title in the header, and the first heading a person sees inside the open page.
const titles = (p, role, id) => p.evaluate(([role, id]) => {
  const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const h1 = document.querySelector('#page-' + role + ' .dash-header h1');
  const panel = document.getElementById(id);
  const heads = panel ? [...panel.querySelectorAll('h1,h2,h3')].filter(vis) : [];
  const first = heads[0] || null;
  return {
    h1: (h1.firstChild && h1.firstChild.nodeType === 3 ? h1.firstChild.nodeValue : '').trim(),
    first: first ? first.textContent.replace(/\s+/g, ' ').trim() : '',
    firstTop: first ? Math.round(first.getBoundingClientRect().top - panel.getBoundingClientRect().top) : null,
    wide: document.documentElement.scrollWidth > innerWidth + 1,
  };
}, [role, id]);

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  const ok = (cond, what) => { assert(cond, what); n++; };
  try {
    /* ── 8. the home page leads with parent approval ─────────────────── */
    for (const vp of [{ width: 1920, height: 960 }, { width: 1440, height: 900 }, { width: 1366, height: 650 }, { width: 1024, height: 700 }, { width: 900, height: 600 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const w = vp.width + ': ';
      const { context, p, errors } = await open(browser, vp);
      const home = await p.evaluate(() => {
        const t = s => (document.querySelector(s) || {}).textContent ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : '';
        const vis = el => !!el && el.getClientRects().length > 0;
        const img = document.getElementById('tw-hero-img').getBoundingClientRect();
        return {
          h1: t('#tw48-h1'), lead: t('#tw48-hero .landing-lead'), trust: t('#tw51-trust'),
          tag: [...document.querySelectorAll('#tw59-tag b, #tw59-tag span')].map(e => e.textContent.trim()),
          howTitle: t('#tw48-how h2'), howLine: t('#tw48-how .landing-section-head p'),
          cards: [...document.querySelectorAll('#tw48-how .landing-audience-tag')].map(e => e.textContent.trim()),
          demos: [...document.querySelectorAll('#tw48-demo button[onclick^="_directDemo"]')].map(b => b.getAttribute('aria-label')),
          finalLine: t('.landing-final-copy p'),
          img: { w: img.width, h: img.height }, natural: document.getElementById('tw-hero-img').naturalWidth,
          beside: (h => img.right <= h.left && h.top >= img.top && h.bottom <= img.bottom)(document.getElementById('tw48-h1').getBoundingClientRect()),
          under: img.bottom <= document.getElementById('tw48-h1').getBoundingClientRect().top,
          signupOnScreen: [...document.querySelectorAll('#tw48-hero button')].some(b => /Sign Up Free/.test(b.textContent) && b.getBoundingClientRect().bottom <= innerHeight),
          h1Visible: vis(document.getElementById('tw48-h1')),
          wide: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      ok(home.h1 === 'The teen job app where parents say yes first', w + 'headline ' + home.h1);
      ok(/^TeenWork is a free teen job finder for ages 13–17\. A teen can’t apply until a parent links accounts and agrees, and each application waits for the parent’s OK before an employer sees it\.$/.test(home.lead), w + 'lead ' + home.lead);
      ok(!/vermont/i.test(home.h1 + home.lead), w + 'Vermont stays a second mention');
      ok(home.trust === 'Free to join · No cut of pay · Chats stay in the app', w + 'trust line ' + home.trust);
      ok(home.tag[0] === 'Parent-approved jobs for teens 13–17' && home.tag[1] === 'No application goes out without a parent’s OK · Free to join', w + 'top-bar line ' + home.tag);
      ok(home.howTitle === 'How parent approval works' && /^Parents say yes twice/.test(home.howLine), w + 'how it works ' + home.howTitle);
      ok(home.cards.join('|') === 'For parents|For teens|For employers', w + 'cards ' + home.cards);
      ok(home.demos.join('|') === 'Parent demo|Teen demo|Employer demo', w + 'demos ' + home.demos);
      ok(/^Free for parents and teens\./.test(home.finalLine), w + 'last call ' + home.finalLine);
      // The picture: square and whole. Computers: about half the screen tall, headline and Sign Up beside it on the
      // first screen. Phones and tablets: across the page, as before.
      ok(Math.abs(home.img.w - home.img.h) <= 2, w + 'hero picture is square ' + JSON.stringify(home.img));
      if (vp.width >= 900) ok(home.img.h <= vp.height * 0.6 && home.img.h >= Math.min(300, vp.height * 0.45) && home.beside && home.signupOnScreen, w + 'half-screen picture with the headline beside it ' + JSON.stringify(home));
      else ok(home.img.w >= Math.min(vp.width, 1212) - 40 && home.under, w + 'picture across the page, headline under it ' + JSON.stringify(home.img));
      ok(home.h1Visible && !home.wide, w + 'headline shows and nothing is wider than the screen');
      // Honesty: no new safety promises.
      const page = await p.evaluate(() => document.getElementById('page-landing').innerText);
      ok(!/verified employer|background[- ]checked employer|100% safe|guarantee[ds]? (?:a )?safe/i.test(page), w + 'no new safety claims');
      ok(errors.length === 0, w + 'page errors ' + errors.join(' | '));
      await context.close();
    }

    /* ── 7. Work Log has one title ───────────────────────────────────── */
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const w = vp.width + ': ';
      const { context, p, errors } = await open(browser, vp);
      await member(p, 'teen');
      await goTo(p, 'ttab-worklog');
      const t = await titles(p, 'teen', 'ttab-worklog');
      ok(t.h1 === 'Work Log', w + 'header ' + t.h1);
      const top = await p.evaluate(() => {
        const panel = document.getElementById('ttab-worklog'), row = panel.firstElementChild;
        const vis = el => !!el && el.getClientRects().length > 0;
        const btn = re => [...row.querySelectorAll('button')].find(b => re.test(b.textContent) && vis(b));
        return {
          words: panel.innerText.includes('Hours & Work Record'),
          headsInRow: row.querySelectorAll('h1,h2,h3').length,
          intro: (row.querySelector('p') || {}).textContent || '',
          exp: !!btn(/Export/), log: !!btn(/Log Hours/),
        };
      });
      ok(!top.words && top.headsInRow === 0, w + 'second title is gone');
      ok(/^Track every shift/.test(top.intro), w + 'intro line stays');
      ok(top.exp && top.log, w + 'Export and Log Hours stay');
      ok(t.first !== 'Work Log' && !/Work Record/.test(t.first), w + 'first heading in the page ' + t.first);
      ok(!t.wide, w + 'Work Log is not wider than the screen');
      await p.locator('#ttab-worklog button', { hasText: 'Log Hours' }).first().click();
      await p.waitForTimeout(400);
      ok(await p.evaluate(() => { const m = document.getElementById('addWorkLogModal'); return !!m && m.getClientRects().length > 0; }), w + 'Log Hours still opens its window');
      await p.evaluate(() => { document.getElementById('addWorkLogModal').style.display = 'none'; });
      if (SCAN) {
        for (const role of ['teen', 'parent', 'employer']) {
          if (role !== 'teen') await member(p, role);
          for (const [id, label] of await menuOf(p, role)) {
            await goTo(p, id);
            const s = await titles(p, role, id);
            console.log(vp.width, role, id, JSON.stringify(s.h1), '→', JSON.stringify(s.first), s.firstTop);
          }
        }
      }
      ok(errors.length === 0, w + 'page errors ' + errors.join(' | '));
      await context.close();
    }
    console.log('parent-first-v64: ' + n + ' checks passed');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
