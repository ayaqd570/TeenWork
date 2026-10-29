/* Local, offline checks for the Parent and Employer dashboards on phones and desktop.
   Demo accounts only: no real accounts, API calls, messages or posts. Run: node tests/phone-layout.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');

// Every visible element of the open screen that pokes past the right or left edge
// (content inside a deliberate sideways scroller is allowed), and every text field under 16px.
function audit(phone) {
 const W = document.documentElement.clientWidth, page = document.querySelector('.page.active'), out = [], small = [];
 for (const el of page.querySelectorAll('*')) {
  const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
  const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
  let a = el.parentElement, scroller = false;
  while (a && a !== page) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth) { scroller = true; break; } a = a.parentElement; }
  if (!scroller && (b.right > W + 1 || b.left < -1)) out.push(el.tagName + '#' + el.id + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
  if (phone && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/^(checkbox|radio|range|color|file|hidden)$/.test(el.type) && parseFloat(cs.fontSize) < 16) small.push(el.id || el.tagName);
 }
 return {pageScroll: document.documentElement.scrollWidth > innerWidth, outside: out.slice(0, 8), small};
}
function overlaps(sel) {
 const note = document.querySelector('.page.active .tw-welcome-note'); if (!note) return [];
 const n = note.getBoundingClientRect();
 return [...document.querySelectorAll(sel)].filter(el => el.getClientRects().length).filter(el => {
  const r = el.getBoundingClientRect(); return r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top;
 }).map(el => el.id || el.className);
}

(async () => {
 const server = spawn('python3', ['-m', 'http.server', '8022'], {cwd: path.resolve(__dirname, '..'), stdio: 'ignore'});
 const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
 try {
  for (const viewport of [{width: 390, height: 844}, {width: 360, height: 740}, {width: 320, height: 720}, {width: 1440, height: 1000}]) {
   const phone = viewport.width < 769;
   const context = await browser.newContext({viewport, isMobile: phone, hasTouch: phone});
   await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
   const p = await context.newPage(), errors = []; p.setDefaultTimeout(7000); p.on('pageerror', e => errors.push(e.message));
   await p.goto('http://127.0.0.1:8022/', {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(300);
   const check = async (where) => {
    const a = await p.evaluate(audit, phone);
    assert.equal(a.pageScroll, false, where + ': page scrolls sideways');
    assert.deepEqual(a.outside, [], where + ': content past the screen edge');
    assert.deepEqual(a.small, [], where + ': fields under 16px make iPhone Safari zoom in');
   };
   const enter = async (role) => {
    await p.evaluate(r => _directDemo(r), role); await p.waitForTimeout(2200);
    if (await p.locator('#tw34-skip').isVisible()) await p.locator('#tw34-skip').click();
   };

   for (const role of ['parent', 'employer']) {
    await enter(role);
    // Welcome shows in the page, not as a floating toast over metrics, fields or the bottom nav.
    const toastShown = await p.evaluate(() => { const t = document.getElementById('global-toast'); return !!t && t.style.opacity !== '0'; });
    assert.equal(toastShown, false, role + ': welcome still shown as a floating toast');
    const note = p.locator('.page.active .tw-welcome-note');
    assert.equal(await note.count(), 1);
    const noteText = await note.textContent(), banner = await p.locator('.page.active #tw48-demo-banner').count();
    assert.match(noteText, /welcome|demo/i);
    // Demo stays labelled; when the banner says it, the notice doesn't repeat it.
    assert(banner === 1 || /demo/i.test(noteText), role + ': demo is not labelled');
    if (banner) assert.doesNotMatch(noteText, /sample data/i);
    assert.deepEqual(await p.evaluate(overlaps, '.stat-card, .page.active input, .page.active select, .page.active textarea, .mobile-nav, #twm-bottom, #tw48-demo-banner'), []);
    assert.match(await p.locator('#tw-welcome-live').textContent(), /welcome|demo/i);
    await p.getByRole('button', {name: 'Dismiss welcome message'}).click();
    assert.equal(await note.count(), 0);
   }

   // Parent Home and Approvals.
   await enter('parent');
   await p.evaluate(() => switchParentTab('ptab-overview', 'pdtab-overview')); await p.waitForTimeout(150);
   await check('parent home');
   assert.equal(await p.locator('#parent-awaiting-count').textContent(), '0');
   await p.evaluate(() => switchParentTab('ptab-approvals', 'pdtab-approvals')); await p.waitForTimeout(150);
   await check('parent approvals');
   assert.match(await p.locator('#approval-count-badge').textContent(), /^0 Pending/);

   // Employer form, all four steps, then the device draft.
   await enter('employer');
   await p.evaluate(() => switchEmployerTab('etab-post', 'edtab-post')); await p.waitForTimeout(150);
   const controls = async (where) => {
    for (const name of ['Back', 'Save draft on this device', 'Restore my device draft']) {
     const b = await p.getByRole('button', {name, exact: true}).boundingBox();
     assert(b && b.x >= 0 && b.x + b.width <= viewport.width && b.height >= (phone ? 44 : 30), where + ': ' + name + ' not fully usable');
    }
   };
   await check('employer step 1'); await controls('step 1');
   await p.locator('#emp-title').fill('Sample garden watering'); await p.locator('#emp-type').selectOption('yard work'); await p.locator('#emp-pay').fill('15'); await p.locator('#emp-desc').fill('Water garden plants with a watering can.');
   await p.getByRole('button', {name: 'Continue', exact: true}).click();
   assert.match(await p.locator('#tw-post-progress').textContent(), /Step 2 of 4/);
   await p.locator('#emp-state').selectOption('Vermont'); await p.locator('#emp-city').fill('Burlington');
   await check('employer step 2'); await controls('step 2');
   await p.getByRole('button', {name: 'Continue', exact: true}).click();
   assert.match(await p.locator('#tw-post-progress').textContent(), /Step 3 of 4/);
   await p.locator('#emp-min-age').fill('14'); await p.locator('#emp-max-hours').fill('3');
   await check('employer step 3'); await controls('step 3');
   await p.getByRole('button', {name: 'Continue', exact: true}).click();
   assert.match(await p.locator('#tw-post-progress').textContent(), /Step 4 of 4/);
   await check('employer step 4'); await controls('step 4');
   assert(await p.getByRole('button', {name: 'Post Job', exact: true}).isVisible());
   assert.match(await p.locator('#tw-post-preview').textContent(), /not a compliance approval/);
   if (phone) {
    // Back and Continue share one row evenly on phones.
    await p.getByRole('button', {name: 'Back', exact: true}).click();
    const [b, c] = await Promise.all(['Back', 'Continue'].map(n => p.getByRole('button', {name: n, exact: true}).boundingBox()));
    assert(Math.abs(b.y - c.y) < 2 && Math.abs(b.width - c.width) < 2 && c.x + c.width <= viewport.width);
   }
   await p.getByRole('button', {name: 'Save draft on this device', exact: true}).click();
   // Ordinary messages still use the floating toast, kept above the bottom nav.
   const pos = await p.evaluate(() => { const t = document.querySelector('#global-toast'), nav = [...document.querySelectorAll('.mobile-nav,#twm-bottom')].find(x => x.getBoundingClientRect().height); return {text: t.textContent, shown: t.style.opacity !== '0', bottom: t.getBoundingClientRect().bottom, navTop: nav ? nav.getBoundingClientRect().top : innerHeight}; });
   assert.match(pos.text, /Draft saved on this device/); assert(pos.shown); if (phone) assert(pos.bottom <= pos.navTop);
   await p.evaluate(() => { document.getElementById('emp-title').value = 'Changed'; });
   await p.getByRole('button', {name: 'Restore my device draft', exact: true}).click();
   assert.equal(await p.locator('#emp-title').inputValue(), 'Sample garden watering');
   assert.match(await p.locator('#tw-post-progress').textContent(), /Step 1 of 4/);

   assert.deepEqual(errors, []);
   console.log('PASS ' + viewport.width + 'x' + viewport.height + ': welcome notice in page, Parent home/approvals and all 4 Employer steps fit, 16px fields, draft save/restore');
   await context.close();
  }
 } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
