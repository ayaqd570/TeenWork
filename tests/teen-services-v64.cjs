/* Offline checks for v64 teen service profiles (Aya's review of Nov 18, 2026, item 5): a teen lists what they offer,
   their linked parent approves it from their own account, employers browse approved teens and ask one to help, the teen
   says yes, the parent says OK, and only then do they become contacts. Each role is its own browser (its own device);
   they share one pretend Supabase `user_data` table held here in Node. Nothing real is called.
   Run: node tests/teen-services-v64.cjs            (add --shots to save pictures in docs/teen-services-v64/) */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = 8164, ROOT = 'http://127.0.0.1:' + PORT + '/';
const SHOTS = process.argv.includes('--shots') ? path.resolve(__dirname, '..', 'docs', 'teen-services-v64') : '';
const TEEN = { email: 'riley.adams@example.com', name: 'Riley Adams', type: 'teen', dob: '2010-05-01', city: 'Guilford', state: 'Vermont' };
const PARENT = { email: 'pat.parent@example.com', name: 'Pat Adams', type: 'parent', city: 'Guilford', state: 'Vermont' };
const OTHER_PARENT = { email: 'not.linked@example.com', name: 'Someone Else', type: 'parent' };
const EMP = { email: 'erin.boss@example.com', name: 'Erin Boss', type: 'employer', city: 'Guilford', state: 'Vermont', business: 'Green Yard Co' };
const T_TEEN = { email: 'ayaquarrierdraper+kid64@gmail.com', name: 'Tess Tester', type: 'teen', dob: '2009-02-02', city: 'Brattleboro', state: 'Vermont' };
const T_EMP = { email: 'ayaquarrierdraper+boss64@gmail.com', name: 'Tom Tester', type: 'employer', city: 'Brattleboro', state: 'Vermont' };
const slug = e => e.toLowerCase().replace(/[^a-z0-9]/g, '_');

/* ── the pretend cloud ─────────────────────────────────────────────── */
const db = { user_data: [] };
const like = (p, v) => new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$').test(String(v));
function runQuery(q) {
  const table = db[q.table] || (db[q.table] = []);
  const hit = r => q.filters.every(f => f.op === 'eq' ? String(r[f.col]) === String(f.val) : f.op === 'in' ? (f.val || []).map(String).includes(String(r[f.col]))
    : f.op === 'like' ? r[f.col] != null && like(f.val, r[f.col]) : f.op === 'neq' ? String(r[f.col]) !== String(f.val) : true);
  if (q.mode === 'upsert' || q.mode === 'insert') {
    (Array.isArray(q.payload) ? q.payload : [q.payload]).filter(Boolean).forEach(it => {
      const i = q.table === 'user_data' ? table.findIndex(r => r.email === it.email && r.key === it.key) : -1;
      if (i >= 0) table[i] = Object.assign({}, table[i], it); else table.push(Object.assign({}, it));
    });
    return { data: null, error: null };
  }
  if (q.mode === 'delete') { for (let i = table.length - 1; i >= 0; i--) if (hit(table[i])) table.splice(i, 1); return { data: null, error: null }; }
  if (q.mode === 'update') { table.filter(hit).forEach(r => Object.assign(r, q.payload)); return { data: null, error: null }; }
  let out = table.filter(hit);
  if (q.limit != null) out = out.slice(0, q.limit);
  out = JSON.parse(JSON.stringify(out));
  return q.single ? { data: out[0] || null, error: null } : { data: out, error: null, count: out.length };
}
const row = (email, key) => { const r = db.user_data.find(x => x.email === email && x.key === key); return r ? JSON.parse(r.value) : null; };
const rowsLike = prefix => db.user_data.filter(x => x.key.indexOf(prefix) === 0).map(x => ({ email: x.email, key: x.key, v: JSON.parse(x.value) }));
const putRow = (email, key, value) => runQuery({ table: 'user_data', mode: 'upsert', payload: { email, key, value: JSON.stringify(value) } });

// A pretend Supabase SDK: every user_data query goes to Node through window.__tw64db.
const FAKE_SUPABASE = `(() => {
  const OPS = ['eq', 'neq', 'in', 'like', 'ilike', 'gt', 'gte', 'lt', 'lte', 'is'];
  function query(table) {
    const q = { table, mode: 'select', filters: [], payload: null, limit: null, single: false };
    const chain = new Proxy({}, { get(_, k) {
      if (k === 'then' || k === 'catch' || k === 'finally') { const p = window.__tw64db(JSON.stringify(q)).then(s => JSON.parse(s)); return p[k].bind(p); }
      if (typeof k === 'symbol') return undefined;
      if (OPS.includes(k)) return (c, v) => { q.filters.push({ op: k, col: c, val: v }); return chain; };
      if (k === 'limit') return n => { q.limit = n; return chain; };
      if (k === 'single' || k === 'maybeSingle') return () => { q.single = true; return chain; };
      if (k === 'upsert' || k === 'insert') return p => { q.mode = k; q.payload = p; return chain; };
      if (k === 'update') return p => { q.mode = 'update'; q.payload = p; return chain; };
      if (k === 'delete') return () => { q.mode = 'delete'; return chain; };
      return () => chain;                                   // select, order, range, or …
    } });
    return chain;
  }
  const stub = new Proxy(function () {}, { get(t, k) { return k === 'then' || typeof k === 'symbol' ? undefined : stub; }, apply() { return stub; } });
  const auth = new Proxy({}, { get(t, k) {
    if (k === 'getSession') return async () => ({ data: { session: null }, error: null });
    if (k === 'getUser') return async () => ({ data: { user: null }, error: null });
    if (k === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe() {} } } });
    return async () => ({ data: {}, error: null });
  } });
  window.supabase = { createClient() { return new Proxy({}, { get(t, k) {
    if (k === 'then') return undefined;
    if (k === 'from') return query;
    if (k === 'rpc') return async () => ({ data: null, error: null });
    if (k === 'auth') return auth;
    if (k === 'functions') return { invoke: async () => ({ data: null, error: { message: 'offline test' } }) };
    if (k === 'storage') return { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }), upload: async () => ({ error: { message: 'offline test' } }) }) };
    return stub;
  } }); } };
})();`;
const QUIET = emails => `try { ${JSON.stringify(emails.map(slug))}.forEach(function (k) {
  localStorage.setItem('tw54_share_nudge_' + k, JSON.stringify({ visits: 1, done: true }));
  localStorage.setItem('tw57_app_nudge_' + k, JSON.stringify({ never: true, last: Date.now(), count: 9 }));
}); setInterval(function () { try { if (document.getElementById('tw34-tour')) tourSkip(); } catch (e) {} }, 150); } catch (e) {}`;

async function device(browser, who, viewport, seed) {
  const context = await browser.newContext({ viewport: viewport || { width: 1366, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await context.exposeBinding('__tw64db', (src, json) => JSON.stringify(runQuery(JSON.parse(json))));
  await context.addInitScript(FAKE_SUPABASE);
  await context.addInitScript(QUIET([who.email]));
  if (seed) await context.addInitScript(seed);
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.twServices && window.twCleanMenu && window._twContacts && window._twRealData);
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.__toasts = []; const o = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); return o.apply(this, arguments); }; });
  await p.evaluate(w => {
    const u = Object.assign({ emailVerified: true }, w);
    if (w.type === 'teen' && w.linkedTo) u.parentLinked = { status: 'approved', parentEmail: w.linkedTo };
    try { currentUser = u; } catch (e) {} window.currentUser = u;
    gotoPage(w.type); launchDashboard();
  }, who);
  await p.waitForTimeout(1800);
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => { document.querySelectorAll('#featpack-install,.tw44c-banner').forEach(e => e.classList && e.classList.remove('open')); });
  return { context, p, errors };
}
const go = async (p, id) => { await p.click('#twm-side [data-twm="' + id + '"]').catch(async () => { await p.evaluate(id => switchDashTab(null, id), id); }); await p.waitForTimeout(500); };
const openGroupAndGo = async (p, gid, id) => {
  const tog = p.locator('#twm-side [data-twm-tog="' + gid + '"]');
  if (await tog.count() && (await tog.getAttribute('aria-expanded')) !== 'true') await tog.click();
  await p.click('#twm-side [data-twm="' + id + '"]'); await p.waitForTimeout(500);
};
const sync = async p => { await p.evaluate(() => window.twServices.sync()); await p.waitForTimeout(500); };
const toasts = p => p.evaluate(() => window.__toasts.splice(0).join(' | '));
const text = (p, sel) => p.evaluate(sel => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; }, sel);
const wide = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const shot = async (p, name, sel) => {
  if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true });
  await p.evaluate(() => document.querySelectorAll('#global-toast,.toast').forEach(e => { e.dataset.tw64v = e.style.visibility; e.style.visibility = 'hidden'; }));
  const el = sel ? p.locator(sel).first() : p; await el.screenshot({ path: path.join(SHOTS, name + '.png') });
  await p.evaluate(() => document.querySelectorAll('#global-toast,.toast').forEach(e => { e.style.visibility = e.dataset.tw64v || ''; }));
};

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  const ok = (cond, what) => { assert(cond, what); n++; };
  const all = [];
  try {
    // Riley's parent link, as real-data-v43 saves it (teen side) and the parent's linked teens list
    putRow(TEEN.email, 'parent_link', { status: 'approved', parentEmail: PARENT.email, parentName: PARENT.name, parents: [PARENT.email], approvedAt: new Date().toISOString(), teenEmail: TEEN.email });
    putRow(PARENT.email, 'linked_teens', { teens: [{ key: TEEN.email, email: TEEN.email, name: TEEN.name, dob: TEEN.dob, city: TEEN.city, state: TEEN.state, code: '', linkedAt: Date.now() }], updatedAt: Date.now() });
    const teenSeed = `try { var m = JSON.parse(localStorage.getItem('tw_parent_links') || '{}'); m[${JSON.stringify(TEEN.email)}] = { status: 'approved', parentEmail: ${JSON.stringify(PARENT.email)}, parentName: ${JSON.stringify(PARENT.name)}, parents: [${JSON.stringify(PARENT.email)}] }; localStorage.setItem('tw_parent_links', JSON.stringify(m)); } catch (e) {}`;
    const parentSeed = `try { localStorage.setItem('tw_' + ${JSON.stringify(slug(PARENT.email))} + '_linked_teens', ${JSON.stringify(JSON.stringify({ teens: [{ key: TEEN.email, email: TEEN.email, name: TEEN.name, dob: TEEN.dob, city: TEEN.city, state: TEEN.state, code: '', linkedAt: 1 }], updatedAt: Date.now() }))}); } catch (e) {}`;

    /* ── 1. the teen fills in Offer Services ─────────────────────────── */
    const T = await device(browser, Object.assign({ linkedTo: PARENT.email }, TEEN), null, teenSeed); all.push(T);
    const t = T.p;
    ok(await t.locator('#tw64-promo').isVisible(), 'Find Jobs shows the "Offer your own services" card to a teen with no listing');
    await shot(t, 'teen-find-jobs-card-computer', '#tw64-promo');
    await t.click('#tw64-promo [data-tw64="go-services"]'); await t.waitForTimeout(500);
    ok(await t.evaluate(() => document.getElementById('ttab-services').classList.contains('active')), 'the card opens Offer Services');
    ok(/my-services/.test(await t.evaluate(() => location.search)), 'Offer Services has its own address: ' + await t.evaluate(() => location.search));
    const head = await t.evaluate(() => document.querySelector('#page-teen .dash-header h1').firstChild.nodeValue.trim());
    ok(head === 'Offer Services', 'the page title is the menu name: ' + head);
    await openGroupAndGo(t, 'jobs', 'ttab-services');
    ok(/Not listed yet/.test(await text(t, '#tw64-t-status')), 'status says not listed yet');
    ok(/first name, last initial, age and town/.test(await text(t, '#ttab-services .tw64-intro')), 'the page says what employers will see');
    ok(/Pick what you can do/.test(await text(t, '#tw64-preview')), 'empty preview asks for services');
    await t.click('#tw64-save'); await t.waitForTimeout(300);
    ok(/Pick at least one/.test(await text(t, '#tw64-form-msg')), 'saving with nothing picked asks for a service');
    await t.click('label.tw64-pick:has(input[value="Yard work"])');
    await t.click('label.tw64-pick:has(input[value="Dog walking"])');
    await t.fill('#tw64-other', 'Raking leaves');
    await t.fill('#tw64-about', 'I am on time and I love dogs. Text me at 802-555-0134!');
    await t.fill('#tw64-rate', '15');
    await t.click('label.tw64-pick:has(input[value="weekend"])');
    await t.click('label.tw64-pick:has(input[value="bike"])');
    await t.waitForTimeout(200);
    const prev = await text(t, '#tw64-preview');
    ok(/Riley A\., 1[56]/.test(prev) && /Guilford, Vermont/.test(prev) && /Yard work/.test(prev) && /Raking leaves/.test(prev) && /\$15\/hour/.test(prev) && /Weekends/.test(prev) && /Can bike/.test(prev), 'the preview shows the listing as employers will see it: ' + prev);
    ok(!/Adams|riley\.adams|@/.test(prev), 'the preview has no last name or email');
    await t.click('#tw64-save'); await t.waitForTimeout(400);
    ok(/emails, phone numbers/.test(await text(t, '#tw64-form-msg')), 'a phone number in the listing is refused');
    ok(!row(TEEN.email, 'svc_profile'), 'nothing was saved with a phone number in it');
    await t.fill('#tw64-about', 'I am on time and I love dogs. I help my neighbors with yard work every fall.');
    await t.click('#tw64-save'); await t.waitForTimeout(700);
    let prof = row(TEEN.email, 'svc_profile');
    ok(prof && prof.listed && prof.listing.services.join(',') === 'Yard work,Dog walking,Raking leaves' && prof.listing.rate === 15 && prof.listing.rateType === 'hour', 'the listing is saved to the account ' + JSON.stringify(prof && prof.listing));
    ok(prof.listing.first === 'Riley' && prof.listing.initial === 'A' && !JSON.stringify(prof.listing).includes('Adams'), 'only first name and last initial are in the listing');
    ok(/Sent to your parent/.test(await toasts(t)), 'the teen is told it went to their parent');
    ok(/Waiting for Pat Adams/.test(await text(t, '#tw64-t-status')), 'status: waiting for the parent: ' + await text(t, '#tw64-t-status'));
    ok(/Needs your parent.s OK/.test(await text(t, '#tw64-preview')) && !/Parent approved/.test(await text(t, '#tw64-preview')), 'the preview doesn\'t say "Parent approved" before the parent did');
    ok(!(await t.locator('#ttab-services h1, #ttab-services h2').count()), 'no second page heading under the page title (like the Work Log one)');
    await shot(t, 'teen-offer-services-computer', '#ttab-services');
    await go(t, 'ttab-browse');
    ok(!(await t.locator('#tw64-promo').count()), 'the Find Jobs card goes away once there is a listing');

    /* ── 2. employers can't see it yet; a self-made or stranger "approval" doesn't count ── */
    const E = await device(browser, EMP); all.push(E);
    const e = E.p;
    await go(e, 'etab-teens'); await sync(e);
    ok(/No teen listings yet/.test(await text(e, '#tw64-e-list')), 'before a parent approves, employers see no listing');
    ok(/Find Teens/.test(await e.evaluate(() => document.querySelector('#page-employer .dash-header h1').textContent)), 'the employer page is called Find Teens');
    const fake = { v: 1, teenKey: TEEN.email, approved: { listing: prof.listing, at: Date.now() }, last: { decision: 'approved', at: Date.now() } };
    putRow(TEEN.email, 'svc_ok:' + TEEN.email, fake);                 // the teen "approving" themselves
    putRow(OTHER_PARENT.email, 'svc_ok:' + TEEN.email, fake);         // a parent who isn't linked
    putRow('riley.adams+mom@example.com', 'svc_ok:' + TEEN.email, fake);   // not on the teen's link either
    await sync(e);
    ok(/No teen listings yet/.test(await text(e, '#tw64-e-list')), 'approvals from the teen or an unlinked parent don\'t make the listing visible');
    db.user_data = db.user_data.filter(r => !(r.key === 'svc_ok:' + TEEN.email));

    /* ── 3. the parent asks for a change, the teen updates, the parent approves ── */
    const P = await device(browser, PARENT, null, parentSeed); all.push(P);
    const pp = P.p;
    await pp.waitForTimeout(800); await sync(pp);
    ok(/wants to offer services/.test(await toasts(pp)), 'the parent is told the teen wants to list services');
    await go(pp, 'ptab-approvals');
    let pbox = await text(pp, '#tw64-parent');
    ok(/Riley wants to offer services/.test(pbox) && /Riley A\./.test(pbox) && /1 waiting/.test(pbox), 'Approvals shows the listing to review: ' + pbox.slice(0, 160));
    ok(/never shown/.test(pbox), 'the parent is told what employers will and won\'t see');
    await shot(pp, 'parent-approvals-computer', '#tw64-parent');
    await pp.click('#tw64-parent [data-tw64="p-changes"]');
    await pp.fill('#tw64-parent textarea', 'Please add that you can shovel snow too.');
    await pp.click('#tw64-parent [data-tw64="p-changes-send"]'); await pp.waitForTimeout(600);
    let ok1 = row(PARENT.email, 'svc_ok:' + TEEN.email);
    ok(ok1 && ok1.last.decision === 'changes' && !ok1.approved, 'the change request is saved under the parent\'s account');
    ok(/You asked Riley for changes/.test(await text(pp, '#tw64-parent')), 'the parent sees it is waiting for the teen');
    await go(t, 'ttab-services'); await sync(t);
    ok(/asked for changes/.test(await text(t, '#tw64-t-status')) && /shovel snow/.test(await text(t, '#tw64-t-status')), 'the teen sees the parent\'s note: ' + await text(t, '#tw64-t-status'));
    ok(/asked for changes/.test(await toasts(t)), 'the teen gets a heads-up about the change request');
    await t.click('label.tw64-pick:has(input[value="Snow shoveling"])');
    await t.click('#tw64-save'); await t.waitForTimeout(600);
    prof = row(TEEN.email, 'svc_profile');
    ok(prof.listing.services.includes('Snow shoveling'), 'the updated listing is saved');
    await sync(pp);
    pbox = await text(pp, '#tw64-parent');
    ok(/Snow shoveling/.test(pbox) && /Approve listing/.test(pbox), 'the parent sees the updated listing to approve');
    await pp.click('#tw64-parent [data-tw64="p-ok"]'); await pp.waitForTimeout(600);
    ok1 = row(PARENT.email, 'svc_ok:' + TEEN.email);
    ok(ok1.approved && ok1.approved.listing.services.includes('Snow shoveling'), 'the approval saves the exact listing the parent saw');
    ok(/listing is live/.test(await text(pp, '#tw64-parent')), 'the parent sees it is live');
    await sync(t);
    ok(/Live\./.test(await text(t, '#tw64-t-status')) && /Pat Adams/.test(await text(t, '#tw64-t-status')), 'the teen sees it is live: ' + await text(t, '#tw64-t-status'));
    ok(/approved your services listing/.test(await toasts(t)), 'the teen is told it was approved');
    ok(/Parent approved/.test(await text(t, '#tw64-preview')), 'once approved, the preview says "Parent approved"');

    /* ── 4. the employer finds Riley and asks ───────────────────────── */
    await sync(e);
    let list = await text(e, '#tw64-e-list');
    ok(/Riley A\., 1[56]/.test(list) && /Parent approved/.test(list) && /Snow shoveling/.test(list) && /Ask Riley to help/.test(list), 'the employer sees Riley\'s approved listing: ' + list);
    ok(!/riley\.adams|Adams|@example/.test(await e.evaluate(() => document.getElementById('etab-teens').innerHTML)), 'no email or last name anywhere in Find Teens');
    await e.selectOption('#tw64-f-svc', 'Babysitting'); await e.waitForTimeout(200);
    ok(/No listings match/.test(await text(e, '#tw64-e-list')), 'the service filter hides teens who don\'t offer it');
    await e.selectOption('#tw64-f-svc', 'Dog walking'); await e.fill('#tw64-f-town', 'guil'); await e.waitForTimeout(200);
    ok(/Riley A\./.test(await text(e, '#tw64-e-list')) && /1 of 1 listing/.test(await text(e, '#tw64-e-count')), 'service and town filters find Riley');
    await shot(e, 'employer-find-teens-computer', '#etab-teens');
    await e.click('#tw64-e-list [data-tw64="ask"]'); await e.waitForTimeout(300);
    ok(await e.locator('#tw64-ask [role="dialog"]').isVisible() && await e.evaluate(() => document.activeElement.id) === 'tw64-a-when', 'Ask opens a window with the cursor in "When?"');
    await e.selectOption('#tw64-a-svc', 'Dog walking');
    await e.fill('#tw64-a-when', 'Saturday Nov 22, 9 to 10 am');
    ok(await e.inputValue('#tw64-a-where') === 'Guilford' && await e.inputValue('#tw64-a-pay') === '15', 'town and pay start from the employer\'s town and the teen\'s rate');
    await e.fill('#tw64-a-note', 'Call me at (802) 555-0199 first');
    await shot(e, 'employer-ask-computer', '#tw64-ask .tw64-dialog');
    await e.click('#tw64-a-send'); await e.waitForTimeout(400);
    ok(/emails, phone numbers/.test(await text(e, '#tw64-a-msg')) && !rowsLike('svc_req:').length, 'a phone number in the request is refused');
    await e.fill('#tw64-a-note', 'Two friendly labs, leash and bags by the door.');
    await e.click('#tw64-a-send'); await e.waitForTimeout(600);
    let reqs = rowsLike('svc_req:');
    ok(reqs.length === 1 && reqs[0].email === TEEN.email && reqs[0].v.status === 'waiting-teen' && reqs[0].v.service === 'Dog walking' && reqs[0].v.pay === 15, 'the request is saved for Riley: ' + JSON.stringify(reqs[0] && reqs[0].v));
    ok(!(await e.locator('#tw64-ask').count()) && /Request sent to Riley/.test(await toasts(e)), 'the window closes and says it was sent');
    ok(/Request sent/.test(await text(e, '#tw64-e-list')) && /Waiting for Riley/.test(await text(e, '#tw64-e-sent')), 'the card and "Requests you sent" show it is waiting');
    const id = reqs[0].v.id;
    await e.click('#tw64-e-list').catch(() => {});
    // a second request to the same teen waits for the first
    const again = await e.evaluate(() => { const b = document.querySelector('#tw64-e-list [data-tw64="ask"]'); return !!b; });
    ok(!again, 'no second Ask button while a request is waiting');

    /* ── 5. the teen says yes, the parent says OK ──────────────────── */
    await sync(t);
    ok(/Green Yard Co asked you about Dog walking/.test(await toasts(t)), 'the teen is told about the request');
    let treq = await text(t, '#tw64-t-reqs');
    ok(/Green Yard Co/.test(treq) && /Saturday Nov 22/.test(treq) && /\$15\/hour/.test(treq) && /Two friendly labs/.test(treq), 'the teen sees the request: ' + treq);
    await shot(t, 'teen-request-computer', '#tw64-t-reqs');
    await sync(pp);
    ok(/Waiting for Riley.s answer/.test(await text(pp, '#tw64-parent')), 'the parent sees the request too, waiting for Riley');
    await t.click('#tw64-t-reqs [data-tw64="yes"]'); await t.waitForTimeout(600);
    ok(row(TEEN.email, 'svc_req:' + id).status === 'waiting-parent', 'yes from the teen sends it to the parent');
    ok(/Waiting for your parent/.test(await text(t, '#tw64-t-reqs')), 'the teen sees it waits for the parent');
    await sync(e);
    ok(/waiting for their parent/.test(await text(e, '#tw64-e-sent')), 'the employer sees the teen said yes');
    ok(!(await e.evaluate(() => window._twContacts.list().map(c => c.key))).includes(TEEN.email), 'no contact before the parent says OK');
    await sync(pp);
    ok(/needs your OK/.test(await toasts(pp)), 'the parent is told the request needs their OK');
    await shot(pp, 'parent-request-computer', '#tw64-parent');
    await pp.click('#tw64-parent [data-tw64="p-req-ok"]'); await pp.waitForTimeout(700);
    const done = row(TEEN.email, 'svc_req:' + id);
    ok(done.status === 'accepted' && done.parentEmail === PARENT.email, 'the parent\'s OK accepts the request');

    /* ── 6. now they are contacts ───────────────────────────────────── */
    await sync(e); await e.evaluate(() => window._twContacts.sync()); await e.waitForTimeout(800);
    const etoast = await toasts(e);
    ok(/Riley A\. and their parent said yes/.test(etoast), 'the employer is told it was accepted: ' + etoast);
    const ec = await e.evaluate(() => window._twContacts.list().map(c => c.key + '|' + c.role));
    ok(ec.includes(TEEN.email + '|teen') && ec.includes(PARENT.email + '|parent'), 'the employer now has Riley and Pat as contacts: ' + ec);
    await sync(t); await t.evaluate(() => window._twContacts.sync()); await t.waitForTimeout(800);
    ok((await t.evaluate(() => window._twContacts.list().map(c => c.key))).includes(EMP.email), 'Riley now has the employer as a contact');
    ok(/Message Green Yard Co/.test(await text(t, '#tw64-t-reqs')), 'the teen gets a Message button');
    await t.click('#tw64-t-reqs [data-tw64="msg"]'); await t.waitForTimeout(700);
    ok(await t.evaluate(() => document.getElementById('msgModal').classList.contains('open')), 'Message opens Messages');
    await t.evaluate(() => closeMsgModal()); await t.waitForTimeout(200);

    /* ── 7. edits wait for the parent; hiding takes it down ─────────── */
    await go(t, 'ttab-services');
    await t.fill('#tw64-about', 'New text the parent has not seen yet.');
    await t.click('#tw64-save'); await t.waitForTimeout(600);
    ok(/Employers keep seeing your approved listing/.test(await toasts(t)), 'editing a live listing keeps the approved version up');
    await sync(e);
    list = await text(e, '#tw64-e-list');
    ok(/neighbors with yard work/.test(list) && !/has not seen/.test(list), 'employers still see the approved text, not the unapproved edit');
    await sync(pp);
    ok(/Employers see the version you approved/.test(await text(pp, '#tw64-parent')), 'the parent is told the old version stays up meanwhile');
    await t.click('#tw64-pause [data-tw64="hide"]'); await t.waitForTimeout(600);
    ok(row(TEEN.email, 'svc_profile').listed === false && /Hidden/.test(await text(t, '#tw64-t-status')), 'the teen can hide the listing');
    await sync(e);
    ok(/No teen listings yet/.test(await text(e, '#tw64-e-list')), 'a hidden listing is gone for employers');
    await t.click('#tw64-t-status [data-tw64="show"]'); await t.waitForTimeout(600);
    await sync(e);
    ok(/neighbors with yard work/.test(await text(e, '#tw64-e-list')), 'showing it again brings back the approved version');
    await sync(pp);
    await pp.click('#tw64-parent [data-tw64="p-down"]'); await pp.waitForTimeout(600);
    await sync(e);
    ok(/No teen listings yet/.test(await text(e, '#tw64-e-list')), 'the parent can take the listing down');

    /* ── 8. testers stay with testers ───────────────────────────────── */
    const TT = await device(browser, T_TEEN); all.push(TT);
    await go(TT.p, 'ttab-services');
    ok(/Save and show my listing/.test(await text(TT.p, '#tw64-save')), 'a tester teen with no parent can show the listing straight away');
    await TT.p.click('label.tw64-pick:has(input[value="Tutoring"])');
    await TT.p.selectOption('#tw64-rate-type', 'ask');
    await TT.p.click('#tw64-save'); await TT.p.waitForTimeout(600);
    ok(/tester employers/.test(await text(TT.p, '#tw64-t-status')), 'the tester listing is live for tester employers only');
    const TE = await device(browser, T_EMP); all.push(TE);
    await go(TE.p, 'etab-teens'); await sync(TE.p);
    list = await text(TE.p, '#tw64-e-list');
    ok(/Tess T\./.test(list) && /Tester listing/.test(list) && /let.s talk/.test(list) && !/Riley/.test(list), 'a tester employer sees only tester teens: ' + list);
    await sync(e);
    ok(!/Tess/.test(await text(e, '#tw64-e-list')), 'real employers never see tester teens');

    /* ── 9. phones ───────────────────────────────────────────────────── */
    const back = row(TEEN.email, 'svc_profile');
    back.listing.about = 'I am on time and I love dogs. I help my neighbors with yard work every fall.'; back.listed = true; back.updatedAt = Date.now();
    putRow(TEEN.email, 'svc_profile', back);
    putRow(PARENT.email, 'svc_ok:' + TEEN.email, Object.assign({}, row(PARENT.email, 'svc_ok:' + TEEN.email), { approved: { listing: back.listing, at: Date.now() } }));
    const TP = await device(browser, Object.assign({ linkedTo: PARENT.email }, TEEN), { width: 390, height: 844 }, teenSeed); all.push(TP);
    await TP.p.evaluate(() => switchDashTab(null, 'ttab-services')); await TP.p.waitForTimeout(600); await sync(TP.p);
    ok(!(await wide(TP.p)), 'phone: Offer Services fits the screen');
    ok(await TP.p.evaluate(() => getComputedStyle(document.getElementById('tw64-about')).fontSize) === '16px', 'phone: fields are 16px so iPhones don\'t zoom');
    await shot(TP.p, 'teen-offer-services-phone');
    const EP = await device(browser, EMP, { width: 390, height: 844 }); all.push(EP);
    await EP.p.evaluate(() => switchDashTab(null, 'etab-teens')); await EP.p.waitForTimeout(500); await sync(EP.p);
    ok(/Riley A\./.test(await text(EP.p, '#tw64-e-list')) && !(await wide(EP.p)), 'phone: Find Teens shows the listing and fits');
    await shot(EP.p, 'employer-find-teens-phone');
    const ask = EP.p.locator('#tw64-e-list [data-tw64="ask"]');
    if (await ask.count()) {
      await ask.first().click(); await EP.p.waitForTimeout(300);
      const box = await EP.p.evaluate(() => { const r = document.querySelector('#tw64-ask .tw64-dialog').getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
      ok(box.l >= 0 && box.r <= box.w + 0.5 && box.b <= box.h + 0.5, 'phone: the Ask window fits the screen ' + JSON.stringify(box));
      await shot(EP.p, 'employer-ask-phone');
      await EP.p.keyboard.press('Escape'); await EP.p.waitForTimeout(200);
      ok(!(await EP.p.locator('#tw64-ask').count()), 'Escape closes the Ask window');
    } else ok(/Request sent/.test(await text(EP.p, '#tw64-e-list')), 'phone: the open request is shown instead of Ask');
    const PP = await device(browser, PARENT, { width: 390, height: 844 }, parentSeed); all.push(PP);
    await PP.p.waitForTimeout(800); await PP.p.evaluate(() => switchDashTab(null, 'ptab-approvals')); await sync(PP.p);
    ok(!(await wide(PP.p)), 'phone: Approvals with the services box fits');

    for (const d of all) ok(d.errors.length === 0, 'no page errors: ' + d.errors.join(' / '));
    console.log('teen-services-v64: all ' + n + ' checks passed');
  } catch (err) {
    console.error('FAILED after ' + n + ' checks:', err.message);
    for (const d of all) if (d.errors.length) console.error('page errors:', d.errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
})();
