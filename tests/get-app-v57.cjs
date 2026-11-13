/* Offline checks for v57 "Get the TeenWork app": the Download the app window on each kind of device, the buttons
   (home page, dashboard menu), the install pop-up and its limits, ?app=1 and ?unsub= links, the installed app.
   Nothing real is called: the browser's install prompt and Supabase are faked, every outside request is blocked.
   Run: node tests/get-app-v57.cjs */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8057 + 100, ROOT = 'http://127.0.0.1:' + PORT + '/';
const UA = {
  iphoneSafari: devices['iPhone 13'].userAgent,
  iphoneChrome: devices['iPhone 13'].userAgent.replace(/Version\/[\d.]+ /, 'CriOS/120.0.6099.119 '),
  iphoneInstagram: devices['iPhone 13'].userAgent.replace('Safari/604.1', 'Instagram 309.0.0.0 (iPhone14,5; iOS 17_0)'),
  androidChrome: devices['Pixel 7'].userAgent,
  androidSamsung: devices['Galaxy S9+'].userAgent.replace(/Chrome\/[\d.]+/, 'SamsungBrowser/23.0 Chrome/115.0.0.0'),
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
};

// A pretend Supabase SDK (the real one comes from a CDN, which is blocked here): records rpc calls.
const FAKE_SUPABASE = `(() => {
  window.__rpc = [];
  const chain = () => { const f = function () { return p; }; const p = new Proxy(f, { get(t, k) { if (k === 'then') return (a, b) => Promise.resolve({ data: [], error: null, count: 0 }).then(a, b); return f; }, apply() { return p; } }); return p; };
  const auth = new Proxy({}, { get(t, k) {
    if (k === 'getSession') return async () => ({ data: { session: null }, error: null });
    if (k === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe() {} } } });
    return async () => ({ data: {}, error: null });
  } });
  window.supabase = { createClient() { const c = chain(); return new Proxy({}, { get(t, k) {
    if (k === 'then') return undefined;
    if (k === 'rpc') return async (fn, args) => { window.__rpc.push([fn, args || null]); return (window.__rpcAnswer || {})[fn] || { data: true, error: null }; };
    if (k === 'auth') return auth;
    return c;
  } }); } };
})();`;
const STANDALONE = `(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); })();`;

async function open(browser, o = {}) {
  const context = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' }, o.ctx || {}));
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ROOT.slice(0, -1) });
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  if (o.fakeSupabase) await context.addInitScript(FAKE_SUPABASE);
  if (o.standalone) await context.addInitScript(STANDALONE);
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT + (o.query || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.twGetApp && window._twDemoSandbox);
  await p.waitForTimeout(400);
  return { context, p, errors };
}
const fakePrompt = (p, outcome = 'accepted') => p.evaluate(outcome => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.prompt = () => { window.__prompted = (window.__prompted || 0) + 1; };
  e.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(e);
}, outcome);
async function member(p, type, email) {
  await p.evaluate(([type, email]) => {
    const u = { name: 'Sam Test', email, type, emailVerified: true };
    try { currentUser = u; } catch (e) {} window.currentUser = u;
    gotoPage(type); launchDashboard();
  }, [type, email]);
  await p.waitForTimeout(600);
}
const skipTour = async (p) => { const s = p.locator('button:visible', { hasText: /Skip tour/i }); if (await s.count()) await s.first().click(); await p.waitForTimeout(200); };
const winText = p => p.evaluate(() => document.getElementById('tw57-app')?.innerText || '');
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function bigEnough(p, w, tag) {
  await p.waitForTimeout(300);   // after the opening animation
  const boxes = await p.evaluate(() => [...document.querySelectorAll('#tw57-app button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, l: r.left, r: r.right }; }));
  assert(boxes.every(b => b.h >= 44 && b.l >= 0 && b.r <= w + 0.5), tag + ': buttons ' + JSON.stringify(boxes));
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  try {
    /* 1. Visitors on a computer: top bar, band, footer; the window with steps + QR code; no email button */
    {
      const { context, p, errors } = await open(browser);
      ok(await p.locator('#tw57-nav-app').isVisible(), 'top bar button');
      ok(await p.locator('#tw57-app-band button').count() === 1 && await p.locator('#tw57-foot-app button').count() === 1, 'band + footer');
      ok(await p.evaluate(() => document.getElementById('featpack-install') && getComputedStyle(document.getElementById('featpack-install')).display === 'none'), 'old install sheet hidden');
      await p.click('#tw57-nav-app');
      await p.waitForSelector('#tw57-app');
      const t = await winText(p);
      ok(/Get the TeenWork app/.test(t) && /install icon/.test(t) && /On your phone/.test(t), 'desktop chrome window ' + t);
      ok(await p.locator('#tw57-app .tw57-qr').isVisible() && await p.evaluate(() => document.querySelector('#tw57-app .tw57-qr').naturalWidth > 0), 'QR code shows');
      ok(await p.locator('#tw57-app [data-tw57="email"]').count() === 0, 'visitors get no email button');
      ok(await p.locator('#tw57-app .tw57-foot').count() === 0, 'no Not now / Don’t ask again when opened by a button');
      await bigEnough(p, 1440, 'desktop');
      await p.keyboard.press('Escape');
      ok(await p.locator('#tw57-app').count() === 0, 'Escape closes');
      ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'tw57-nav-app', 'focus back on the button');
      // with the browser's install prompt: a real install button; accepting it remembers the install
      await fakePrompt(p, 'dismissed');
      await p.locator('#tw57-app-band button').click();
      ok(/Install on this computer/.test(await winText(p)), 'prompt → install button');
      ok(await p.evaluate(() => document.activeElement && document.activeElement.className) === 'tw57-go', 'focus on the install button');
      await p.click('.tw57-go'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => window.__prompted) === 1, 'prompt shown');
      ok(/install icon/.test(await winText(p)) && !(await p.evaluate(() => twGetApp.installed())), 'said no → manual steps, not installed');
      await p.keyboard.press('Escape');
      await fakePrompt(p, 'accepted');
      await p.evaluate(() => twGetApp({ source: 'test' }));
      await p.click('.tw57-go'); await p.waitForTimeout(200);
      ok(/TeenWork is installed/.test(await winText(p)) && await p.evaluate(() => twGetApp.installed() && localStorage.getItem('tw57_app_installed') === 'true'), 'accepted → installed');
      ok(await noOverflow(p), 'no sideways scroll');
      ok(errors.length === 0, 'errors ' + errors);
      await context.close();
    }

    /* 2. Phones and other browsers: the right steps for each */
    const cases = [
      ['iphoneSafari', devices['iPhone 13'], /Share[\s\S]*bottom of Safari[\s\S]*Add to Home Screen[\s\S]*Tap Add/],
      ['iphoneChrome', devices['iPhone 13'], /next to the address bar[\s\S]*Add to Home Screen[\s\S]*Open teenwork\.ayaqd\.com in Safari/],
      ['iphoneInstagram', devices['iPhone 13'], /inside another app[\s\S]*Open in Safari/],
      ['androidChrome', devices['Pixel 7'], /menu[\s\S]*Install app[\s\S]*Add to Home screen/],
      ['androidSamsung', devices['Galaxy S9+'], /Add page to[\s\S]*Home screen/],
      ['macSafari', null, /File[\s\S]*Add to Dock[\s\S]*On your phone/],
      ['winFirefox', null, /Firefox can’t install apps on computers[\s\S]*On your phone/],
      ['winEdge', null, /Apps[\s\S]*Install this site as an app/],
    ];
    for (const [name, dev, re] of cases) {
      const ctx = dev ? Object.assign({}, dev, { userAgent: UA[name] }) : { userAgent: UA[name], viewport: { width: 1280, height: 800 } };
      const { context, p, errors } = await open(browser, { ctx, query: '?app=1&utm_source=qr' });
      await p.waitForSelector('#tw57-app', { timeout: 4000 });
      const t = await winText(p);
      ok(re.test(t), name + ': ' + t);
      ok(await p.evaluate(() => location.search) === '?utm_source=qr', name + ': ?app=1 removed, other parts kept');
      if (dev) {
        ok(!(await p.locator('#tw57-nav-app').isVisible()), name + ': no top bar button on phones');
        ok(await p.locator('#tw57-app .tw57-qr').count() === 0, name + ': no QR code on a phone');
        await bigEnough(p, dev.viewport.width, name);
      }
      if (name === 'iphoneInstagram') {
        await p.click('[data-tw57="copy"]'); await p.waitForTimeout(200);
        ok(/Link copied/.test(await winText(p)), 'copy link');
      }
      ok(await noOverflow(p), name + ': sideways scroll');
      ok(errors.length === 0, name + ' errors ' + errors);
      await context.close();
    }

    /* 3. Members: the menu button (until clean-menu has its own), Email me the link */
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const tag = viewport.width + 'px', phone = viewport.width < 769;
      const { context, p, errors } = await open(browser, { ctx: { viewport } });
      await member(p, 'parent', 'mom@example.com');
      await skipTour(p);
      // clean-menu's own [data-twm="app"] item (the sidebar PR) or, without it, the button this file adds
      const foot = phone ? '#twm-sheet .twm-sheet-foot' : '#twm-side .twm-foot';
      if (phone) { await p.click('#twm-bottom [data-twm="menu"]'); await p.waitForSelector('#twm-sheet .twm-sheet-foot'); }
      await p.waitForTimeout(150);
      const theirs = await p.locator(foot + ' [data-twm="app"]').count() > 0;
      const sel = foot + (theirs ? ' [data-twm="app"]' : ' .tw57-menu-app');
      ok(await p.locator(foot + ' [data-twm="app"], ' + foot + ' .tw57-menu-app').count() === 1, tag + ': exactly one Download the app button');
      const box = await p.locator(sel).boundingBox();
      ok(box && box.height >= 40 && box.x >= 0 && box.x + box.width <= viewport.width, tag + ': menu button ' + JSON.stringify(box));
      ok(await p.locator(sel).innerText() === '📲Download the app' || /Download the app/.test(await p.locator(sel).innerText()), tag + ': label');
      await p.click(sel);
      await p.waitForSelector('#tw57-app');
      await p.waitForTimeout(350);
      ok(await p.locator('#twm-sheet').count() === 0 && await p.locator('#tw57-app').count() === 1, tag + ': phone menu closed first');
      ok(/See your teen’s job requests/.test(await winText(p)), tag + ': parent wording');
      if (!phone) {
        await p.evaluate(() => { window.__mail = []; window.twSendEmail = (to, subject, html, o) => { window.__mail.push({ to, subject, html, o }); return Promise.resolve(true); }; });
        await p.click('[data-tw57="email"]'); await p.waitForTimeout(200);
        const mail = await p.evaluate(() => window.__mail);
        ok(mail.length === 1 && mail[0].to === 'mom@example.com' && mail[0].html.includes('https://teenwork.ayaqd.com/?app=1') && /Sam/.test(mail[0].html), 'email me the link ' + JSON.stringify(mail));
        ok(/Sent to mom@example.com/.test(await winText(p)), 'sent message');
        await p.click('[data-tw57="email"]'); await p.waitForTimeout(100);
        ok((await p.evaluate(() => window.__mail.length)) === 1 && /already emailed/.test(await winText(p)), 'once a day');
      }
      await p.keyboard.press('Escape');
      // clean-menu's own [data-twm="app"] item (the sidebar change) takes over: ours steps aside
      if (!phone && !theirs) {
        await p.evaluate(() => { const f = document.querySelector('#twm-side .twm-foot'); const b = document.createElement('button'); b.className = 'twm-item'; b.setAttribute('data-twm', 'app'); b.textContent = 'Download the app'; f.prepend(b); document.body.appendChild(document.createElement('i')); });
        await p.waitForTimeout(100);
        ok(await p.locator('#twm-side .tw57-menu-app').count() === 0 && await p.locator('#twm-side [data-twm="app"]').count() === 1, 'one menu button only');
        await p.evaluate(() => { localStorage.setItem('tw57_app_installed', 'true'); document.body.appendChild(document.createElement('i')); });
        await p.waitForTimeout(100);
        ok(await p.evaluate(() => document.querySelector('#twm-side [data-twm="app"]').hidden), 'hidden once installed');
      }
      if (!phone && theirs) {
        await p.evaluate(() => { localStorage.setItem('tw57_app_installed', 'true'); window.twCleanMenu && twCleanMenu.sync && twCleanMenu.sync(); document.body.appendChild(document.createElement('i')); });
        await p.waitForTimeout(150);
        ok(await p.evaluate(() => { const b = document.querySelector('#twm-side [data-twm="app"]'); return !b || b.hidden || getComputedStyle(b).display === 'none'; }), 'menu item hidden once installed');
      }
      ok(await noOverflow(p), tag + ': sideways scroll');
      ok(errors.length === 0, tag + ' errors ' + errors);
      await context.close();
    }

    /* 4. The pop-up: after the tour, at most 3 times, 14 days apart, Don't ask again; never for demos / admin / visitors */
    {
      const { context, p, errors } = await open(browser);
      await p.evaluate(() => { twGetApp._t.first = 300; twGetApp._t.retry = 300; });
      await member(p, 'teen', 'ayaquarrierdraper+t@gmail.com');   // a tester teen opens the dashboard without a parent link
      await p.evaluate(() => twOfferInstall());
      await p.waitForTimeout(900);
      const tourUp = await p.locator('button:visible', { hasText: /Skip tour/i }).count();
      if (tourUp) ok(await p.locator('#tw57-app').count() === 0, 'waits while the tour is open');
      await skipTour(p);
      await p.waitForSelector('#tw57-app.tw57-is-nudge', { timeout: 3000 });
      ok(/Find jobs, answer messages/.test(await winText(p)) && await p.locator('.tw57-later').isVisible() && await p.locator('.tw57-never').isVisible(), 'pop-up with Not now + Don’t ask again');
      const key = 'tw57_app_nudge_ayaquarrierdraper_t_gmail_com';
      ok((await p.evaluate(k => JSON.parse(localStorage.getItem(k)).n, key)) === 1, 'counted');
      await p.click('.tw57-later');
      ok(await p.locator('#tw57-app').count() === 0, 'Not now closes');
      ok(await p.evaluate(() => twOfferInstall()) === false, 'not again for 14 days');
      await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.last = Date.now() - 15 * 864e5; localStorage.setItem(k, JSON.stringify(s)); }, key);
      ok(await p.evaluate(() => twOfferInstall()) === true, 'again after 14 days');
      await p.waitForSelector('#tw57-app.tw57-is-nudge', { timeout: 3000 });
      await p.click('.tw57-never');
      ok((await p.evaluate(k => JSON.parse(localStorage.getItem(k)), key)).never === true, 'Don’t ask again saved');
      await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.last = 0; localStorage.setItem(k, JSON.stringify(s)); }, key);
      ok(await p.evaluate(() => twOfferInstall()) === false, 'never again');
      await p.evaluate(k => localStorage.setItem(k, JSON.stringify({ n: 3, last: 1, never: false })), key);
      ok(await p.evaluate(() => twOfferInstall()) === false, 'at most 3 times');
      // a visitor on the home page, a demo, the admin: no pop-up
      await p.evaluate(() => { try { doLogout(); } catch (e) {} });
      await p.waitForTimeout(500);
      ok(await p.evaluate(() => twOfferInstall()) === false, 'visitor');
      await p.evaluate(() => twStartDemo('teen'));
      await p.waitForTimeout(1200);
      ok(await p.evaluate(() => twOfferInstall()) === false, 'demo');
      await p.evaluate(() => { try { doLogout(); } catch (e) {} });
      await p.waitForTimeout(500);
      await p.evaluate(() => { const u = { name: 'Admin', email: 'boss@example.com', type: 'admin', isAdmin: true }; try { currentUser = u; } catch (e) {} window.currentUser = u; });
      ok(await p.evaluate(() => twOfferInstall()) === false, 'admin');
      ok(errors.length === 0, 'errors ' + errors);
      await context.close();
    }

    /* 5. The installed app: opens Sign In, no buttons, tells Supabase once a week (members only) */
    {
      const { context, p, errors } = await open(browser, { standalone: true, fakeSupabase: true, ctx: { viewport: { width: 390, height: 844 } } });
      await p.waitForTimeout(400);
      ok(await p.evaluate(() => document.querySelector('.page.active').id) === 'page-login', 'opens Sign In');
      ok(await p.evaluate(() => twGetApp.installed()), 'installed');
      ok(await p.evaluate(() => ['tw57-nav-app', 'tw57-app-band', 'tw57-foot-app'].every(id => document.getElementById(id).hidden)), 'home page buttons hidden');
      ok((await p.evaluate(() => window.__rpc.filter(c => c[0] === 'tw_app_installed').length)) === 0, 'nobody signed in: nothing told');
      await member(p, 'employer', 'boss@example.com');
      await skipTour(p);
      await p.evaluate(() => twOfferInstall());
      await p.waitForTimeout(300);
      ok((await p.evaluate(() => window.__rpc.filter(c => c[0] === 'tw_app_installed').length)) === 1, 'member: Supabase told');
      ok(await p.locator('#tw57-app').count() === 0, 'no pop-up in the app');
      await p.evaluate(() => twOfferInstall()); await p.waitForTimeout(300);
      ok((await p.evaluate(() => window.__rpc.filter(c => c[0] === 'tw_app_installed').length)) === 1, 'only once a week');
      await p.evaluate(() => twGetApp({ source: 'test' }));
      ok(/using the TeenWork app/.test(await winText(p)), 'the window says it is the app');
      ok(errors.length === 0, 'errors ' + errors);
      await context.close();
    }

    /* 6. Unsubscribe links */
    {
      const T = '0f0e0d0c-0b0a-4908-8706-050403020100';
      const { context, p, errors } = await open(browser, { fakeSupabase: true, query: '?unsub=' + T });
      await p.waitForFunction(() => /won’t get TeenWork reminder emails/.test(document.getElementById('tw57-app')?.innerText || ''), null, { timeout: 4000 });
      ok(await p.evaluate(() => location.search) === '', 'token removed from the address');
      const mine = () => p.evaluate(() => window.__rpc.filter(c => /^tw_email_/.test(c[0])));
      ok(JSON.stringify(await mine()) === JSON.stringify([['tw_email_unsubscribe', { p_token: T }]]), 'unsubscribe rpc');
      await p.click('#tw57-unsub-undo'); await p.waitForTimeout(200);
      ok(/back on/.test(await winText(p)) && (await mine())[1][0] === 'tw_email_resubscribe', 'undo');
      await context.close();
      const bad = await open(browser, { fakeSupabase: true, query: '?unsub=nope' });
      await bad.p.waitForTimeout(700);
      ok(await bad.p.locator('#tw57-app').count() === 0 && (await bad.p.evaluate(() => window.__rpc.filter(c => /^tw_email_/.test(c[0])).length)) === 0, 'a bad token is ignored');
      await bad.context.close();
      ok(errors.length === 0 && bad.errors.length === 0, 'errors ' + errors + bad.errors);
    }
    {
      const T = '0f0e0d0c-0b0a-4908-8706-050403020100';
      const context = await browser.newContext({ serviceWorkers: 'block' });
      await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
      await context.addInitScript(FAKE_SUPABASE + ';window.__rpcAnswer = { tw_email_unsubscribe: { data: false, error: null } };');
      const p = await context.newPage();
      await p.goto(ROOT + '?unsub=' + T);
      await p.waitForFunction(() => /expired or isn’t valid/.test(document.getElementById('tw57-app')?.innerText || ''), null, { timeout: 4000 });
      ok(true, 'unknown token message');
      await context.close();
    }
    console.log(`get-app-v57: ${n} checks passed`);
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
