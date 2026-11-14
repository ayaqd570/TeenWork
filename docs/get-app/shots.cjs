/* Pictures for the v57 "Get the TeenWork app" pull request (docs/get-app/*.jpg) and the app-store-style
   screenshots in manifest.json (assets/img/app-shot-*.jpg). Nothing real is called.
   Run from the repo root: node docs/get-app/shots.cjs */
const { chromium, devices } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PORT = 8261, ROOT = 'http://127.0.0.1:' + PORT + '/';
const OUT = (f) => path.join(__dirname, f);
const fakePrompt = (p) => p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });

async function page(browser, ctx, q = '') {
  const context = await browser.newContext(Object.assign({ serviceWorkers: 'block', deviceScaleFactor: 2 }, ctx));
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  const p = await context.newPage();
  await p.goto(ROOT + q, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.twGetApp && window._twDemoSandbox);
  await p.waitForTimeout(900);
  return { context, p };
}
async function member(p, type) {
  await p.evaluate((type) => { const u = { name: 'Sam Rivera', email: 'sam@example.com', type, emailVerified: true }; try { currentUser = u; } catch (e) {} window.currentUser = u; gotoPage(type); launchDashboard(); }, type);
  await p.waitForTimeout(900);
  const s = p.locator('button:visible', { hasText: /Skip tour/i }); if (await s.count()) await s.first().click();
  await p.waitForTimeout(300);
}
const settle = (p) => p.waitForTimeout(450);

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT_DIR, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const iphone = Object.assign({}, devices['iPhone 13']);
    const pixel = Object.assign({}, devices['Pixel 7']);
    { // computer: home page top bar, the window, the band
      const { context, p } = await page(browser, { viewport: { width: 1366, height: 800 } });
      await p.screenshot({ path: OUT('home-top-bar-computer.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1366, height: 70 } });
      await p.click('#tw57-nav-app'); await settle(p);
      await p.screenshot({ path: OUT('window-computer.jpg'), type: 'jpeg', quality: 82 });
      await p.keyboard.press('Escape');
      await p.locator('#tw57-app-band').scrollIntoViewIfNeeded(); await settle(p);
      const b = await p.locator('#tw57-app-band').boundingBox();
      await p.screenshot({ path: OUT('home-band-computer.jpg'), type: 'jpeg', quality: 82, clip: { x: b.x - 30, y: b.y - 20, width: b.width + 60, height: b.height + 40 } });
      await context.close();
    }
    { // iPhone: the steps, opened from an email / QR link
      const { context, p } = await page(browser, iphone, '?app=1'); await settle(p);
      await p.screenshot({ path: OUT('window-iphone.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    { // Android: the real install button
      const { context, p } = await page(browser, pixel); await fakePrompt(p);
      await p.evaluate(() => twGetApp({ source: 'shot' })); await settle(p);
      await p.screenshot({ path: OUT('window-android.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    { // Instagram's browser
      const ua = iphone.userAgent.replace('Safari/604.1', 'Instagram 309.0.0.0');
      const { context, p } = await page(browser, Object.assign({}, iphone, { userAgent: ua }), '?app=1'); await settle(p);
      await p.screenshot({ path: OUT('window-instagram.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    { // the pop-up on a member's dashboard (computer), the menu (phone)
      const { context, p } = await page(browser, { viewport: { width: 1366, height: 800 } });
      await member(p, 'parent');
      await p.evaluate(() => { twGetApp._t.first = 10; twOfferInstall(); }); await p.waitForSelector('#tw57-app'); await settle(p);
      await p.screenshot({ path: OUT('popup-dashboard-computer.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    {
      const { context, p } = await page(browser, iphone);
      await member(p, 'employer');
      await p.click('#twm-bottom [data-twm="menu"]'); await settle(p);
      await p.screenshot({ path: OUT('menu-phone.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    { // the reminder emails, as the app-emails function builds them
      const { buildEmail } = await import(path.join(ROOT_DIR, 'supabase/functions/app-emails/core.ts'));
      const context = await browser.newContext({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 2 });
      await context.route('**/*', r => { const u = r.request().url(); if (u.endsWith('/logo.png')) return r.fulfill({ body: fs.readFileSync(path.join(ROOT_DIR, 'logo.png')), contentType: 'image/png' }); return r.continue(); });
      const p = await context.newPage();
      for (const [file, role, step] of [['email-reminder-1.jpg', 'teen', 1], ['email-reminder-2.jpg', 'parent', 2], ['email-reminder-3.jpg', 'employer', 3]]) {
        const m = buildEmail({ first_name: 'Sam', account_type: role, step, unsub_token: '00000000-0000-4000-8000-000000000000' }, { site: 'https://teenwork.ayaqd.com', postal: '', contact: 'aqdteenwork@gmail.com' });
        await p.setContent('<body style="margin:0;background:#f5f0e8">' + m.html + '</body>'); await p.waitForTimeout(300);
        await p.screenshot({ path: OUT(file), fullPage: true, type: 'jpeg', quality: 82 });
      }
      await context.close();
    }
    { // unsubscribe page (Supabase answer faked)
      const context = await browser.newContext(Object.assign({}, iphone, { serviceWorkers: 'block' }));
      await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
      await context.addInitScript(() => { window.supabase = { createClient() { return new Proxy({}, { get(t, k) { if (k === 'then') return undefined; if (k === 'rpc') return async () => ({ data: true, error: null }); return () => ({ select() { return this; }, eq() { return this; }, then(a) { return Promise.resolve({ data: [], error: null }).then(a); } }); } }); } }; });
      const p = await context.newPage();
      await p.goto(ROOT + '?unsub=0f0e0d0c-0b0a-4908-8706-050403020100');
      await p.waitForFunction(() => /won’t get/.test(document.getElementById('tw57-app')?.innerText || ''));
      await settle(p);
      await p.screenshot({ path: OUT('unsubscribe-phone.jpg'), type: 'jpeg', quality: 82 });
      await context.close();
    }
    { // manifest.json screenshots: what Chrome shows in its install sheet
      const shot = async (ctx, file, fn) => {
        const context = await browser.newContext(Object.assign({ serviceWorkers: 'block' }, ctx));
        await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
        const p = await context.newPage();
        await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => window.twGetApp && window._twDemoSandbox); await p.waitForTimeout(900);
        if (fn) await fn(p);
        await p.screenshot({ path: path.join(ROOT_DIR, 'assets/img', file), type: 'jpeg', quality: 78 });
        await context.close();
      };
      const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
      await shot(phone, 'app-shot-home.jpg');
      await shot({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }, 'app-shot-wide.jpg');
    }
    console.log('pictures saved');
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
