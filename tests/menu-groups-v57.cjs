/* Local, offline checks for the simpler dashboard menu (v57, Aya 2026-11-13: "make it so side bar doesn't
   have tons of buttons"). Uses the empty practice accounts; nothing leaves the page. Run: node tests/menu-groups-v57.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8033, URL0 = 'http://127.0.0.1:' + PORT + '/';
// Most buttons a role's side menu may show before any group is opened (main places + group buttons + footer).
const MAX_SHOWN = { teen: 13, parent: 11, employer: 11 };
const skipTour = p => p.addInitScript(() => setInterval(() => { try { if (document.getElementById('tw34-tour')) tourSkip(); } catch (e) {} }, 150));

async function start(browser, viewport, role) {
  const context = await browser.newContext({ viewport });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(7000);
  p.on('pageerror', e => errors.push(e.message));
  await skipTour(p);
  await p.goto(URL0, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(300);
  await p.evaluate(r => _directDemo(r), role); await p.waitForTimeout(2500);
  return { context, p, errors };
}
// The menu buttons a person can see right now.
const shown = (p, root) => p.evaluate(root => [...document.querySelectorAll(root + ' button')].filter(b => {
  const r = b.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(b).visibility !== 'hidden';
}).map(b => b.getAttribute('data-twm') || 'group:' + b.getAttribute('data-twm-tog')), root);
const expanded = (p, root, g) => p.locator(root + ' [data-twm-tog="' + g + '"]').getAttribute('aria-expanded');

async function desktop(browser, role) {
  const { context, p, errors } = await start(browser, { width: 1280, height: 800 }, role);
  const menu = await p.evaluate(r => { const m = twCleanMenu.menu[r]; return { main: m.main.map(i => i[0]), groups: m.groups.map(g => ({ id: g.id, items: g.items.map(i => i[0]) })) }; }, role);

  // Few buttons until a group is opened; the main places, every group and the footer are there.
  const before = await shown(p, '#twm-side');
  assert(before.length <= MAX_SHOWN[role], role + ': ' + before.length + ' menu buttons showing: ' + before.join(', '));
  for (const id of menu.main) assert(before.includes(id) || !(await p.locator('#' + id).count()), role + ': main place ' + id + ' is not showing');
  for (const g of menu.groups.concat([{ id: 'help' }])) assert(before.includes('group:' + g.id), role + ': group ' + g.id + ' is missing');
  for (const id of ['share', 'out']) assert(before.includes(id), role + ': footer ' + id + ' is missing');
  for (const id of ['help', 'tour', 'rate']) assert(!before.includes(id), role + ': ' + id + ' should be inside Help & feedback');

  // Every dashboard section still has a way in (a menu item, open or tucked in a group).
  const orphans = await p.evaluate(r => [...document.querySelectorAll('#page-' + r + ' .tab-panel[id]')].map(x => x.id)
    .filter(id => /^[pte]tab-/.test(id) && !document.querySelector('#twm-side [data-twm="' + id + '"]')), role);
  assert.deepEqual(orphans, [], role + ': sections with no menu item');

  // One click opens a group and shows its items; one more opens a section; it is remembered after a reload.
  const g = menu.groups[menu.groups.length - 1], first = g.items.find(id => id !== 'verify');
  assert.equal(await expanded(p, '#twm-side', g.id), 'false');
  await p.click('#twm-side [data-twm-tog="' + g.id + '"]');
  assert.equal(await expanded(p, '#twm-side', g.id), 'true');
  assert(await p.locator('#twm-side [data-twm="' + first + '"]').isVisible(), role + ': ' + first + ' hidden after opening ' + g.id);
  await p.click('#twm-side [data-twm="' + first + '"]'); await p.waitForTimeout(250);
  assert(await p.locator('#' + first).evaluate(el => el.classList.contains('active')), role + ': ' + first + ' did not open');
  assert.equal(await p.locator('#twm-side [data-twm="' + first + '"]').getAttribute('aria-current'), 'page');
  assert.equal(await p.evaluate(r => localStorage.getItem('twm_open_' + r), role), JSON.stringify([g.id]));
  // closing the group that holds the open section keeps it closed, and its count turns green
  await p.click('#twm-side [data-twm-tog="' + g.id + '"]'); await p.waitForTimeout(100);
  assert.equal(await expanded(p, '#twm-side', g.id), 'false');
  assert(await p.locator('#twm-side [data-twm-tog="' + g.id + '"]').evaluate(b => b.classList.contains('has-on')));
  await p.click('#twm-side [data-twm="' + menu.main[0] + '"]'); await p.waitForTimeout(250);
  assert.equal(await expanded(p, '#twm-side', g.id), 'false', role + ': group reopened by itself');

  // Landing on a section inside a closed group from somewhere else (a link, the address) opens that group.
  const other = menu.groups[0], target = other.items.find(id => /^[pte]tab-/.test(id));
  assert.equal(await expanded(p, '#twm-side', other.id), 'false');
  await p.evaluate(id => document.querySelector('#twm-side [data-twm="' + id + '"]').click(), target); await p.waitForTimeout(250);
  assert.equal(await expanded(p, '#twm-side', other.id), 'true', role + ': ' + other.id + ' did not open for ' + target);
  assert(await p.locator('#twm-side [data-twm="' + target + '"]').isVisible());

  // Help & feedback: Get help, App tour and Rate the app still work.
  await p.click('#twm-side [data-twm-tog="help"]');
  for (const id of ['help', 'tour', 'rate']) assert(await p.locator('#twm-side [data-twm="' + id + '"]').isVisible(), id + ' hidden in Help & feedback');
  await p.click('#twm-side [data-twm="help"]'); await p.waitForTimeout(250);
  assert(await p.locator('#support-modal-overlay, #tw-sup-fallback').first().isVisible(), role + ': Get help opened nothing');
  assert.match(await p.locator('#support-modal-overlay, #tw-sup-fallback').first().textContent(), /Contact Support/);
  await p.evaluate(() => { if (typeof closeSupportModal === 'function') closeSupportModal(); document.querySelectorAll('#support-modal-overlay, #tw-sup-fallback').forEach(m => { m.style.display = 'none'; }); });

  // The app tour still finds a visible button for every step that points at the menu.
  const missing = await p.evaluate(r => {
    const words = { teen: ['jobs', 'work', 'chat', 'account'], parent: ['home', 'approve', 'safety', 'chat'], employer: ['post', 'hiring', 'chat', 'grow'] }[r];
    return words.filter(w => ![...document.querySelectorAll('#twm-side [data-tour-key]')].some(b => (b.getAttribute('data-tour-key') + ' ' + b.textContent).toLowerCase().includes(w) && b.getBoundingClientRect().height > 4));
  }, role);
  assert.deepEqual(missing, [], role + ': tour words with no visible menu button');

  // Download the app: only once the get-app script is there, first in the footer, and not when installed.
  assert.equal(await p.locator('#twm-side [data-twm="app"]').isVisible(), false, 'Download shows without window.twGetApp');
  await p.evaluate(() => { window.__got = []; window.twGetApp = o => window.__got.push(o); window.twCleanMenu.sync(); });
  assert(await p.locator('#twm-side [data-twm="app"]').isVisible(), 'Download the app is not showing');
  assert.equal(await p.locator('#twm-side .twm-foot > button:not([hidden])').first().getAttribute('data-twm'), 'app');
  await p.click('#twm-side [data-twm="app"]');
  assert.deepEqual(await p.evaluate(() => window.__got), [{ source: 'menu' }]);
  await p.evaluate(() => { window.twGetApp.installed = () => true; window.twCleanMenu.sync(); });
  assert.equal(await p.locator('#twm-side [data-twm="app"]').isVisible(), false, 'Download shows when the app is installed');

  // The choice is remembered on this device.
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(300);
  await p.evaluate(r => _directDemo(r), role); await p.waitForTimeout(2200);
  assert.equal(await expanded(p, '#twm-side', other.id), 'true', role + ': open group forgotten after reload');
  assert.equal(await expanded(p, '#twm-side', g.id), 'false', role + ': closed group opened after reload');

  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, role + ': page scrolls sideways');
  assert.deepEqual(errors, []);
  await context.close();
}

async function phone(browser, role, viewport) {
  const { context, p, errors } = await start(browser, viewport, role);
  const bar = await p.locator('#twm-bottom > button').count();
  assert.equal(bar, 5, role + ': bottom bar should have 4 places + Menu');
  await p.click('#twm-bottom [data-twm="menu"]'); await p.waitForTimeout(400);
  const list = await shown(p, '#twm-sheet .twm-sheet-body, #twm-sheet .twm-sheet-foot');
  assert(list.length <= MAX_SHOWN[role], role + ' phone: ' + list.length + ' buttons in the menu');
  const g = await p.evaluate(r => { const x = twCleanMenu.menu[r].groups[0]; return { id: x.id, items: x.items.map(i => i[0]) }; }, role);
  const tog = p.locator('#twm-sheet [data-twm-tog="' + g.id + '"]');
  assert((await tog.boundingBox()).height >= 44, 'group button is too small to tap');
  await tog.click();
  assert.equal(await tog.getAttribute('aria-expanded'), 'true');
  const item = g.items.find(id => /^[pte]tab-/.test(id));
  const box = await p.locator('#twm-sheet [data-twm="' + item + '"]').boundingBox();
  assert(box && box.y + box.height <= viewport.height, item + ' is off the screen after opening its group');
  await p.click('#twm-sheet [data-twm="' + item + '"]'); await p.waitForTimeout(400);
  assert.equal(await p.locator('#twm-sheet').count(), 0, 'menu did not close');
  assert(await p.locator('#' + item).evaluate(el => el.classList.contains('active')));
  assert(await p.locator('#twm-bottom [data-twm="menu"]').evaluate(b => b.classList.contains('on')), 'Menu is not lit for a section outside the bar');
  // the side menu shares the choice: reopening the sheet shows that group open
  await p.click('#twm-bottom [data-twm="menu"]'); await p.waitForTimeout(400);
  assert.equal(await p.locator('#twm-sheet [data-twm-tog="' + g.id + '"]').getAttribute('aria-expanded'), 'true');
  assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('#twm-sheet *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className + ' ' + e.textContent.slice(0, 30))), [], role + ': menu wider than the screen');
  assert.deepEqual(errors, []);
  await context.close();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    await new Promise(r => setTimeout(r, 600));
    for (const role of ['teen', 'parent', 'employer']) {
      await desktop(browser, role);
      await phone(browser, role, { width: 390, height: 844 });
      await phone(browser, role, { width: 320, height: 640 });
    }
    console.log('v57 menu checks passed');
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
