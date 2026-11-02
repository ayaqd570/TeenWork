/* Local, offline checks for v51 (Build Brief step 2): the home screen, the quick app fixes and the admin sign-in.
   No real accounts, API calls, messages or posts; Supabase is a fake inside the page. Run: node tests/home-v51.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Files: the hero picture is small image files, not text inside the page, and no admin password or hash is left (T2).
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /data:image\/(jpeg|png|webp);base64,.{20000}/, 'a big picture is still inside index.html');
for (const f of ['hero-640.avif', 'hero-960.avif', 'hero-1254.avif', 'hero-640.webp', 'hero-960.webp'])
 assert(fs.statSync(path.join(root, 'assets/img', f)).size < 150 * 1024, f + ' is over 150 KB');
const code = [html, ...[...walk(path.join(root, 'assets/js')), ...walk(path.join(root, 'supabase'))].map(f => fs.readFileSync(f, 'utf8'))].join('\n');
assert.doesNotMatch(code, /ADMIN_PW_(HASH|SALT)|adminPassword|adminHash|adminSalt|changeAdminPassword/);
// Applying is free and unlimited on every plan.
assert.doesNotMatch(html, /Up to 5 active applications|applicationsPerMonth/);
assert.match(fs.readFileSync(path.join(root, 'assets/js/plan-limits-v40.js'), 'utf8'), /function limitFor\(kind\) \{ return \(kind === 'apps' \|\| isPro\(\)\) \? 0/);

const PORT = 8023, URL0 = 'http://127.0.0.1:' + PORT + '/';
const visible = (p, sel) => p.locator(sel).first().isVisible().catch(() => false);
const skipTour = p => p.addInitScript(() => setInterval(() => { try { if (document.getElementById('tw34-tour')) tourSkip(); } catch (e) {} }, 150));

async function home(browser, viewport) {
 const context = await browser.newContext({viewport});
 await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
 const p = await context.newPage(), errors = []; p.setDefaultTimeout(7000); p.on('pageerror', e => errors.push(e.message));
 await p.goto(URL0, {waitUntil: 'load'}); await p.waitForTimeout(400);
 const w = viewport.width;

 // H2: no rotating headlines or Pause button. H3: the trust line under the buttons. No emoji on Sign Up.
 assert.equal(await visible(p, '#tw-slogan-wrap'), false, w + ': rotating headlines still show');
 assert.equal(await p.locator('#tw51-pause').count(), 0);
 assert.equal((await p.locator('#tw51-trust').textContent()).trim(), 'Parents approve every application · Free · No cut of pay');
 assert(await visible(p, '#tw51-trust'));
 assert.equal((await p.locator('#tw48-hero button', {hasText: 'Sign Up'}).first().textContent()).trim(), 'Sign Up Free');

 // The picture: a small file, on top, whole (a square box, so nothing is cropped), with the title under it.
 const hero = await p.evaluate(() => {
  const img = document.getElementById('tw-hero-img'), b = img.getBoundingClientRect(), h1 = document.getElementById('tw48-h1').getBoundingClientRect();
  const su = [...document.querySelectorAll('#tw48-hero button')].find(x => /Sign Up/.test(x.textContent)).getBoundingClientRect();
  return {src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0, ratio: b.width / b.height, natural: img.naturalWidth / img.naturalHeight, imgBottom: b.bottom, imgWidth: b.width, h1Top: h1.top, signupBottom: su.bottom, alt: img.alt};
 });
 assert.match(hero.src, /\/assets\/img\/hero-\d+\.(avif|webp)$/);
 assert(hero.loaded, w + ': hero picture did not load');
 assert(Math.abs(hero.ratio - hero.natural) < 0.02, w + ': hero picture is cropped (' + hero.ratio + ')');
 assert(hero.imgBottom <= hero.h1Top, w + ': title is not under the picture');
 assert.equal(hero.alt, 'TeenWork — safe teen jobs');
 // A big square across the page on every screen, never a small one in the middle (Aya, Oct 31).
 assert(hero.imgWidth >= Math.min(w, 1212) - 40, w + ': picture is not across the page (' + hero.imgWidth + 'px)');

 // H6: "For employers" in the top bar goes to the employer card. Schools is in the footer.
 assert.equal(await p.locator('#page-landing > nav').getByRole('button', {name: 'Schools'}).count(), 0);
 assert.equal(await p.locator('#page-landing footer, #page-landing .landing-footer').getByRole('button', {name: 'For schools'}).count() +
  await p.locator('#page-landing').getByRole('button', {name: 'For schools'}).count() > 0, true);
 await p.locator('#tw51-nav-employers').click(); await p.waitForTimeout(900);
 const emp = await p.evaluate(() => { const r = document.getElementById('tw-for-employers').getBoundingClientRect(); return {inView: r.top >= 0 && r.top < innerHeight, focused: document.activeElement && document.activeElement.id}; });
 assert(emp.inView, w + ': employer card not in view'); assert.equal(emp.focused, 'tw-for-employers');

 // H15: the Pro banner closes, stays closed on this device, and comes back from the footer.
 assert(await visible(p, '#tw48-pro'));
 assert.match(await p.locator('#tw48-pro').textContent(), /Applying to jobs is always free and unlimited/);
 await p.locator('#tw51-pro-close').click();
 assert.equal(await visible(p, '#tw48-pro'), false); assert(await visible(p, '#tw51-pro-show'));
 await p.reload({waitUntil: 'load'}); await p.waitForTimeout(300);
 assert.equal(await visible(p, '#tw48-pro'), false, w + ': Pro banner came back after a reload');
 await p.locator('#tw51-pro-show').click();
 assert(await visible(p, '#tw48-pro')); assert.equal(await visible(p, '#tw51-pro-show'), false);
 await p.reload({waitUntil: 'load'}); await p.waitForTimeout(300);
 assert(await visible(p, '#tw48-pro'));

 // H14: "Where TeenWork is today" waits for 10 open jobs; the About story stays. H13: reviews wait for 3 real ones.
 const proof = async jobs => { await p.evaluate(n => dispatchEvent(new CustomEvent('tw-public-counts', {detail: {open_jobs: n}})), jobs); return p.evaluate(() => ({no: document.getElementById('tw48-proof').classList.contains('tw51-no-stats'), grid: !!document.querySelector('#tw48-proof > .tw48-proof-grid')?.getClientRects().length, label: document.getElementById('tw48-proof').getAttribute('aria-label')})); };
 let s = await proof(2); assert.equal(s.no, true); assert.equal(s.grid, false); assert.equal(s.label, 'About TeenWork');
 s = await proof(12); assert.equal(s.no, false); assert.equal(s.label, 'Where TeenWork is today');
 assert(await visible(p, '#tw48-proof .tw48-founder'), 'About story is hidden');
 assert.equal(await visible(p, '#tw48-reviews'), false, 'reviews card shows without reviews');
 await p.evaluate(() => { document.getElementById('tw49-reviews-feed').innerHTML = '<article class="tw49-review">a</article>'.repeat(3); });
 await p.waitForTimeout(50); assert(await visible(p, '#tw48-reviews'));
 assert.equal(await visible(p, '#featpack-testimonials'), false); assert.equal(await visible(p, '#tw-community-section'), false);

 assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, w + ': page scrolls sideways');
 assert.deepEqual(errors, []);
 await context.close();
}

async function app(browser, viewport) {
 const phone = viewport.width < 769;
 const context = await browser.newContext({viewport});
 let hangMap = null;
 await context.route('**/*', r => {
  const u = new URL(r.request().url());
  if (u.hostname === '127.0.0.1') return r.continue();
  if (/leaflet\.js$/.test(u.pathname)) { hangMap = r; return; }   // the map library never arrives (A2)
  return r.abort();
 });
 const p = await context.newPage(), errors = []; p.setDefaultTimeout(7000); p.on('pageerror', e => errors.push(e.message));
 await skipTour(p);
 await p.goto(URL0, {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(300);
 await p.evaluate(() => _directDemo('teen')); await p.waitForTimeout(2500);
 if (await p.locator('#tw34-skip').isVisible()) await p.locator('#tw34-skip').click();

 // A5: no "Start your streak!" before a first lesson or job.
 assert.equal(await visible(p, '#teen-streak-badge'), false, 'streak badge shows for a new account');
 await p.evaluate(() => { userActivity.streak = 3; renderStreakBadge(); });
 assert(await visible(p, '#teen-streak-badge')); assert.match(await p.locator('#teen-streak-badge').textContent(), /3 day streak/);
 await p.evaluate(() => { userActivity.streak = 0; userActivity.lessonsCompleted = []; userActivity.jobsAccepted = []; renderStreakBadge(); });
 assert.equal(await visible(p, '#teen-streak-badge'), false);

 // T7: a "Loading…" still on screen after 8 seconds gets a message and Try again.
 await p.evaluate(() => { const el = document.createElement('p'); el.id = 't7-probe'; el.textContent = 'Loading jobs…'; document.querySelector('.page.active .tab-panel.active, .page.active').prepend(el); });
 await p.evaluate(() => { const f = window._twAppFixesV51, real = Date.now; f.scan(); Date.now = () => real() + f.SLOW_MS + 100; try { f.scan(); } finally { Date.now = real; } });
 assert.match(await p.locator('#t7-probe .tw51-slow').textContent(), /taking longer than usual/);
 assert(await visible(p, '#t7-probe .tw51-retry'));
 await p.evaluate(() => document.getElementById('t7-probe').remove());

 // A4: with Messages open, one click on a menu item opens that screen.
 const target = phone ? '#twm-bottom [data-twm="ttab-browse"]' : '#twm-side [data-twm="ttab-earnings"]';
 const panel = phone ? 'ttab-browse' : 'ttab-earnings';
 await p.evaluate(() => switchDashTab(document.querySelector('[data-twm="ttab-worklog"]'), 'ttab-worklog'));
 await p.evaluate(() => openMsgModal()); await p.waitForTimeout(200);
 assert(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')));
 const box = await p.locator(target).boundingBox();
 await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(300);
 assert.equal(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')), false, 'Messages is still open');
 assert(await p.locator('#' + panel).evaluate(el => el.classList.contains('active')), 'one click did not open ' + panel);

 // A2: the Job Map says so when the map is slow, with Try again (fully visible, not cut off).
 if (phone) {
  await p.evaluate(() => switchDashTab(document.querySelector('[data-twm="ttab-map"]'), 'ttab-map'));
  await p.evaluate(() => renderJobMap('job-map-container'));
  assert.match(await p.locator('#ttab-map .twlm-status').textContent(), /Loading the map/);
  await p.waitForTimeout(8400);
  assert.match(await p.locator('#ttab-map .twlm-status').textContent(), /taking longer than usual/);
  const fit = await p.evaluate(() => { const s = document.querySelector('#ttab-map .twlm-status'), b = s.querySelector('button'); const r = s.getBoundingClientRect(), q = b.getBoundingClientRect(); return q.right <= r.right + 1 && q.left >= r.left - 1 && r.right <= innerWidth; });
  assert(fit, 'Try again is cut off');
 }

 // A1: a demo's note goes when the demo ends and never sits on a real account.
 await p.evaluate(() => { const n = document.createElement('div'); n.className = 'tw-welcome-note'; n.id = 'a1-probe'; n.textContent = 'This demo starts empty.'; document.querySelector('.page.active').prepend(n); });
 await p.evaluate(() => window._twAppFixesV51.scan());
 assert.equal(await p.locator('#a1-probe').count(), 1, 'demo note removed during the demo');
 await p.evaluate(() => window._twDemoSandbox.end()); await p.waitForTimeout(300);
 await p.evaluate(() => { const n = document.createElement('div'); n.className = 'tw-welcome-note'; n.id = 'a1-probe2'; n.textContent = 'Welcome to the demo. Nothing is saved.'; document.body.prepend(n); window._twAppFixesV51.scan(); });
 assert.equal(await p.locator('.tw-welcome-note', {hasText: /demo/i}).count(), 0, 'demo note left after the demo ended');

 if (hangMap) await hangMap.abort().catch(() => {});
 assert.deepEqual(errors, []);
 await context.close();
}

async function admin(browser) {
 const context = await browser.newContext({viewport: {width: 1280, height: 900}});
 await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
 const p = await context.newPage(), errors = []; p.setDefaultTimeout(7000); p.on('pageerror', e => errors.push(e.message));
 await skipTour(p);
 await p.goto(URL0, {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(300);
 // A fake Supabase: only "right-pass" signs in, as whichever user the step sets up.
 await p.evaluate(() => {
  window.__sb = {calls: 0, user: null};
  window._twCloudClient = async () => ({auth: {
   signInWithPassword: async ({email, password}) => { __sb.calls++; return password === 'right-pass' ? {data: {user: Object.assign({email}, __sb.user), session: {access_token: 'fake'}}, error: null} : {data: {user: null, session: null}, error: {code: 'invalid_credentials', message: 'Invalid login credentials'}}; },
   getSession: async () => ({data: {session: null}, error: null}), signOut: async () => ({error: null})}});
 });
 const as = (user) => p.evaluate(u => { __sb.calls = 0; __sb.user = u; currentUser = null; window.currentUser = null; }, user);
 const login = (email, pw) => p.evaluate(([e, w]) => _twAdminLogin(e, w), [email, pw]);
 const ADMIN = await p.evaluate(() => ADMIN_EMAIL);
 const role = {app_metadata: {tw_role: 'admin'}, user_metadata: {}};

 await as(role);
 assert.equal(await login('admin', 'wrong'), false);
 assert.equal(await login('admin', 'wrong'), false);
 assert.equal(await p.evaluate(() => __sb.calls), 1, 'each sign-in attempt should ask Supabase once');
 // the role must come from app_metadata (set by Supabase only), never from user_metadata
 await as({app_metadata: {}, user_metadata: {tw_role: 'admin'}});
 assert.equal(await login(ADMIN, 'right-pass'), false);
 assert.equal(await login('someone@example.com', 'right-pass'), false);
 // the admin with no accounts of their own goes straight to the admin panel
 await as(role);
 assert.equal(await login('admin', 'right-pass'), true);
 assert.equal(await p.evaluate(() => window.currentUser && window.currentUser.type), 'admin');
 assert(await visible(p, '#tw-admin-panel'));
 await p.evaluate(() => doLogout()); await p.waitForTimeout(300);
 // the admin's email also owns a teen account: ask which to open
 await as({app_metadata: {tw_role: 'admin'}, user_metadata: {account_type: 'teen', first_name: 'Aya'}});
 await p.waitForTimeout(3100);   // past the "no" memory of the earlier attempt with this email and password
 for (const [pick, result, isAdmin] of [['Cancel', true, false], ['My TeenWork accounts', false, false], ['Admin panel', true, true]]) {
  const r = login(ADMIN, 'right-pass');
  await p.locator('#tw-admin-choice').waitFor();
  await p.locator('#tw-admin-choice').getByRole('button', {name: pick, exact: true}).click();
  assert.equal(await r, result, pick);
  assert.equal(await p.evaluate(() => !!(window.currentUser && window.currentUser.isAdmin)), isAdmin, pick);
  if (isAdmin) { await p.evaluate(() => doLogout()); await p.waitForTimeout(300); }
  await as({app_metadata: {tw_role: 'admin'}, user_metadata: {account_type: 'teen', first_name: 'Aya'}});
  await p.waitForTimeout(3100);   // past the "no" memory of the previous attempt
 }
 // A refresh reopens the admin panel only while this browser holds an admin Supabase sign-in.
 assert.equal(await p.evaluate(() => _twStoredAdminSession()), false);
 await p.evaluate(() => { const ref = new URL(SUPABASE_URL).hostname.split('.')[0]; localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify({refresh_token: 'r', user: {app_metadata: {tw_role: 'admin'}}})); });
 assert.equal(await p.evaluate(() => _twStoredAdminSession()), true);
 await p.evaluate(() => { const ref = new URL(SUPABASE_URL).hostname.split('.')[0]; localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify({refresh_token: 'r', user: {user_metadata: {tw_role: 'admin'}}})); });
 assert.equal(await p.evaluate(() => _twStoredAdminSession()), false);
 assert.equal(await p.evaluate(() => localStorage.getItem('tw_admin_pw')), null);
 assert.deepEqual(errors, []);
 await context.close();
}

(async () => {
 const server = spawn('python3', ['-m', 'http.server', String(PORT)], {cwd: root, stdio: 'ignore'});
 const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
 try {
  await new Promise(r => setTimeout(r, 600));
  for (const viewport of [{width: 390, height: 844}, {width: 320, height: 720}, {width: 1280, height: 800}]) await home(browser, viewport);
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 800}]) await app(browser, viewport);
  await admin(browser);
  console.log('v51 home, app and admin checks passed');
 } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
