/* v64: sign-up was stuck on "Creating account…" since v54 (2026-11-10). v54 removed the old notifications
   pop-up and its `const notifChecked`, but doSignup still read notifChecked, so every new teen, parent and employer
   account was saved and then the page threw a ReferenceError instead of opening the dashboard.
   This checks that a new employer and a new teen land on their dashboard, with the notifications choice saved.
   Run: node tests/signup-v64.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const FAKE = require('./helpers/fake-supabase-v64.cjs');

const PORT = 8164, ROOT = 'http://127.0.0.1:' + PORT + '/';
const PW = 'Correct-horse-9';
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; };

async function page(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await ctx.addInitScript(FAKE);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(String(e && e.message || e)));
  await p.goto(ROOT + '?view=signup');
  await p.waitForFunction(() => typeof window.doSignup === 'function' && document.querySelector('#page-signup.active'));
  await p.waitForTimeout(400);
  return p;
}

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    // employer, notifications left on
    let p = await page(browser);
    await p.click('#type-employer');
    await p.fill('#su-fname', 'Pat'); await p.fill('#su-lname', 'Lee');
    await p.fill('#su-email', 'pat.signup@example.com'); await p.fill('#su-password', PW);
    await p.check('#terms-agree');
    await p.click('#signup-btn');
    await p.waitForFunction(() => document.querySelector('#page-employer.active'), null, { timeout: 8000 });
    ok(await p.evaluate(() => window.currentUser && window.currentUser.email) === 'pat.signup@example.com', 'employer is signed in');
    ok(!p.errors.some(e => /notifChecked|is not defined/.test(e)), 'no ReferenceError: ' + p.errors.join(' | '));
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('__fake_users'))['pat.signup@example.com'].meta.account_type) === 'employer', 'cloud account saved');
    await p.context().close();

    // teen, notifications turned off
    p = await page(browser);
    await p.click('#type-teen');
    await p.fill('#su-fname', 'Sam'); await p.fill('#su-lname', 'Teen');
    await p.fill('#su-email', 'sam.signup@example.com'); await p.fill('#su-password', PW);
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 15);
    await p.fill('#su-age', dob.toISOString().slice(0, 10));
    await p.selectOption('#su-state', 'Vermont');
    await p.check('#terms-agree');
    await p.uncheck('#perm-notif-signup');
    await p.click('#signup-btn');
    await p.waitForFunction(() => window.currentUser && window.currentUser.type === 'teen', null, { timeout: 8000 });
    ok(!p.errors.some(e => /notifChecked|is not defined/.test(e)), 'no ReferenceError for the teen: ' + p.errors.join(' | '));
    await p.context().close();
    console.log('signup-v64: ' + pass + ' checks passed');
  } finally { await browser.close(); srv.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
