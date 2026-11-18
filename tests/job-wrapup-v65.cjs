/* Offline checks for v65 "after-job wrap-up and references" (job-wrapup-v65.js), with a teen, an employer and a
   parent in three separate browsers that share one pretend Supabase (user_data rows live in this Node process).
   • The teen is asked to wrap up a job they were hired for (home note, Applied card), fills hours / pay / rating,
     the part missing from the Work Log is added, and the rating goes to the employer trust hook when it exists.
   • The employer sees the teen's numbers, uses them, rates the teen and writes a reference from a template; closing
     a listing with a hire opens the wrap-up; an unsafe reference is refused; an applicant's shared references show.
   • Stars and references stay hidden until both sides wrap up (or 14 days pass); then the teen copies, prints and
     hides a reference, and a mismatch in hours or pay is shown to both sides and the parent.
   • The parent sees every wrap-up in Ratings and gets notices for new ones, mismatches and unpaid work.
   • Phones: the wrap-up window fits, its buttons are big enough. Practice accounts show nothing and nothing breaks.
   Run: node tests/job-wrapup-v65.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8165, ROOT = 'http://127.0.0.1:' + PORT + '/';
const DAY = 864e5, NOW = Date.now();
const TEEN = { email: 'sam@example.com', name: 'Sam Rivera', type: 'teen', dob: '2010-03-01', city: 'Burlington', state: 'Vermont' };
const BOSS = { email: 'boss@example.com', name: 'Mike Lawn', type: 'employer', city: 'Burlington', state: 'Vermont' };
const MOM = { email: 'mom@example.com', name: 'Dana Rivera', type: 'parent', city: 'Burlington', state: 'Vermont' };
const J1 = 1700000000000001, J2 = 1700000000000002, J3 = 1700000000000003, J4 = 1700000000000004, J9 = 1600000000000009;
const BIZ = "Mike's Lawn Care";

/* the shared database: user_data rows */
const DB = [];
const put = (email, key, value) => { const i = DB.findIndex(r => r.email === email && r.key === key); const row = { email, key, value: JSON.stringify(value) }; if (i >= 0) DB[i] = row; else DB.push(row); };
const get = (email, key) => { const r = DB.find(x => x.email === email && x.key === key); return r ? JSON.parse(r.value) : null; };
const job = (id, title, pay, payType, extra) => Object.assign({ id, title, type: 'Yard Work', pay, payType, city: 'Burlington', state: 'Vermont', minAge: 14, maxHours: 10, desc: 'Help needed', employer: BIZ, employerKey: BOSS.email, business: BIZ, status: 'active', postedAt: NOW - 3 * DAY, updatedAt: NOW - 3 * DAY, test: false }, extra || {});
const app = (teen, j, status, extra) => Object.assign({ jobId: j.id, employerKey: j.employerKey, job: { title: j.title, employer: j.employer, pay: j.pay, payType: j.payType, city: j.city, state: j.state, type: j.type },
  teenKey: teen.email, teenEmail: teen.email, teenName: teen.name, teenAge: 16, teenCity: 'Burlington', teenState: 'Vermont', skills: ['Yard work'], status, appliedAt: NOW - 3 * DAY, decidedAt: NOW - 2 * DAY, updatedAt: NOW - 2 * DAY, parentEmail: MOM.email }, extra || {});
function seed() {
  const j1 = job(J1, 'Rake leaves', 15, 'hourly'), j2 = job(J2, 'Walk dogs', 40, 'flat'), j3 = job(J3, 'Stack firewood', 16, 'hourly'), j4 = job(J4, 'Shovel snow', 20, 'flat');
  [j1, j2, j3, j4].forEach(j => put(BOSS.email, 'job_post:' + j.id, j));
  put(BOSS.email, 'emp_profile', { name: BIZ });
  put(TEEN.email, 'job_app:' + J1, app(TEEN, j1, 'hired'));
  put(TEEN.email, 'job_app:' + J2, app(TEEN, j2, 'hired', { decidedAt: NOW - 3 * 3600e3 }));       // hired 3 hours ago: no home note yet
  put(TEEN.email, 'job_app:' + J4, app(TEEN, j4, 'hired', { decidedAt: NOW - 20 * DAY }));
  // the employer wrapped up "Shovel snow" 15 days ago and Sam never did: it opens after 14 days
  put(BOSS.email, 'job_wrap:' + J4 + ':' + TEEN.email, { v: 1, jobId: J4, teenKey: TEEN.email, employerKey: BOSS.email, hours: 2, pay: 20, paid: true, stars: 5, rehire: true, strengths: ['On time'], text: 'Sam cleared the whole driveway before school.', at: NOW - 15 * DAY, edited: NOW - 15 * DAY, title: 'Shovel snow', business: BIZ, teenName: TEEN.name });
  // Jo applied to "Stack firewood" and has a reference from an earlier job with another employer
  const JO = { email: 'jo@example.com', name: 'Jo Park' };
  const old = job(J9, 'Paint fence', 14, 'hourly', { employer: 'Ana Lopez', employerKey: 'ana@example.com' });
  put(JO.email, 'job_app:' + J3, app(JO, j3, 'applied'));
  put(JO.email, 'job_app:' + J9, app(JO, old, 'hired'));
  put(JO.email, 'job_wrap:' + J9, { v: 1, jobId: J9, teenKey: JO.email, employerKey: 'ana@example.com', hours: 6, pay: 84, paid: true, stars: 5, again: true, note: '', at: NOW - 30 * DAY, edited: NOW - 30 * DAY, trust: 'sent' });
  put('ana@example.com', 'job_wrap:' + J9 + ':' + JO.email, { v: 1, jobId: J9, teenKey: JO.email, employerKey: 'ana@example.com', hours: 6, pay: 84, paid: true, stars: 5, rehire: true, strengths: ['Careful with details'], text: 'Jo painted our fence neatly and cleaned up after.', at: NOW - 29 * DAY, edited: NOW - 29 * DAY, title: 'Paint fence', business: 'Ana Lopez', teenName: JO.name });
  // parent link (both sides)
  put(TEEN.email, 'parent_link', { status: 'approved', parentEmail: MOM.email, parentName: MOM.name, parents: [MOM.email] });
  put(MOM.email, 'linked_teens', { teens: [{ key: TEEN.email, email: TEEN.email, name: TEEN.name, linkedAt: NOW - 10 * DAY }], updatedAt: NOW - 10 * DAY });
}

/* A pretend Supabase SDK: user_data goes to the Node-side DB above, everything else answers "nothing". */
function fakeSupabase() {
  const ok = data => ({ data, error: null });
  function from(table) {
    const q = { table, op: 'select', filters: [], payload: null };
    const api = new Proxy({}, { get(_, prop) {
      if (prop === 'then') return (res, rej) => Promise.resolve().then(async () => {
        if (table !== 'user_data') return q.single || q.maybe ? ok(null) : ok([]);
        if (window.__twOffline) return { data: null, error: { message: 'network error' } };
        const out = await window.__twDB(q.op, q.op === 'select' ? q.filters : q.payload);
        return q.single || q.maybe ? ok(out[0] || null) : ok(out);
      }).then(res, rej);
      if (prop === 'select') return () => api;
      if (['upsert', 'insert', 'update'].includes(prop)) return p => { q.op = prop === 'update' ? 'upsert' : 'upsert'; q.payload = p; return api; };
      if (prop === 'delete') return () => { q.op = 'delete'; return api; };
      if (['eq', 'like', 'in'].includes(prop)) return (c, v) => { q.filters.push([prop, c, v]); return api; };
      if (prop === 'single') return () => { q.single = true; return api; };
      if (prop === 'maybeSingle') return () => { q.maybe = true; return api; };
      return () => api;
    } });
    return api;
  }
  const chan = new Proxy({}, { get: (_, p) => (p === 'then' ? undefined : () => chan) });
  const client = {
    from, rpc: async () => ok(null),
    storage: { from: () => ({ upload: async () => ok(null), createSignedUrls: async () => ok([]), remove: async () => ok([]) }) },
    auth: {
      getSession: async () => ok({ session: null }), getUser: async () => ok({ user: null }),
      onAuthStateChange: () => ok({ subscription: { unsubscribe() {} } }), signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'offline test' } }), updateUser: async () => ok({ user: null }), signUp: async () => ({ data: null, error: { message: 'offline test' } }),
    },
    functions: { invoke: async () => ({ data: null, error: { message: 'offline test' } }) },
    channel: () => chan, removeChannel: () => {}, removeAllChannels: () => {},
  };
  window.supabase = { createClient: () => client };
  window.print = () => { const b = document.getElementById('tw65-print'); window.__printed = b ? b.innerText : null; window.__printClass = document.documentElement.classList.contains('tw65-printing'); };
  // no share note or "get the app" pop-up in the way
  try { ['sam_example_com', 'boss_example_com', 'mom_example_com'].forEach(k => { localStorage.setItem('tw54_share_nudge_' + k, JSON.stringify({ visits: 0, done: true })); localStorage.setItem('tw57_app_nudge_' + k, JSON.stringify({ never: true, last: Date.now(), count: 9 })); }); } catch (e) {}
}
function dbSelect(filters) {
  const like = v => new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$');
  return DB.filter(r => filters.every(([op, c, v]) => op === 'eq' ? String(r[c]) === String(v) : op === 'like' ? like(v).test(String(r[c])) : op === 'in' ? v.map(String).includes(String(r[c])) : true)).map(r => ({ ...r }));
}

async function open(browser, viewport, opts) {
  opts = opts || {};
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', deviceScaleFactor: process.env.TW_SHOTS ? 2 : 1 });   // pictures for people at 2×
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ROOT.slice(0, -1) });
  await context.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await context.exposeBinding('__twDB', (src, op, payload) => {
    if (op === 'select') return dbSelect(payload);
    if (op === 'upsert') { (Array.isArray(payload) ? payload : [payload]).forEach(p => { const i = DB.findIndex(r => r.email === p.email && r.key === p.key); const row = { email: p.email, key: p.key, value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value) }; if (i >= 0) DB[i] = row; else DB.push(row); }); return []; }
    return [];
  });
  await context.addInitScript(fakeSupabase);
  if (opts.trust) await context.addInitScript(() => { window.__trust = []; window.twEmployerTrust = { review: async x => { window.__trust.push(x); return { ok: true }; } }; });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(9000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twWrapUp && window._twJobBoard && window.twCleanMenu);
  await p.waitForTimeout(300);
  return { context, p, errors };
}
async function signIn(p, acct, local) {
  await p.evaluate(({ acct, local }) => {
    Object.entries(local || {}).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    _twLoginLocalAccount(acct);
  }, { acct, local });
  await p.waitForFunction(() => window.twWrapUp.state().loaded, null, { timeout: 12000 });
  await p.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
    for (const label of [/Skip for now/i, /Skip tour/i]) { const b = p.locator('button:visible', { hasText: label }); if (await b.count()) await b.first().click().catch(() => {}); }
    await p.waitForTimeout(200);
  }
  await p.evaluate(() => { document.getElementById('featpack-install')?.classList.remove('open'); document.querySelectorAll('.tw-welcome-note').forEach(n => n.remove()); });
}
const goTo = (p, id) => p.evaluate(id => switchDashTab(null, id), id).then(() => p.waitForTimeout(450));
const text = (p, sel) => p.locator(sel).first().evaluate(el => (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
const toastText = p => p.evaluate(() => (document.getElementById('global-toast') || {}).textContent || '');
const resync = async p => { await p.evaluate(() => window.twWrapUp.sync()); await p.waitForTimeout(500); };
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const TEEN_LOCAL = { tw_parent_links: { [TEEN.email]: { status: 'approved', parentEmail: MOM.email, parentName: MOM.name, parents: [MOM.email] } },
  tw_worklog: [{ id: 5, job: 'Rake leaves', date: new Date(NOW - DAY).toISOString().slice(0, 10), hours: 1, pay: 15, task: 'yard work', notes: '', source: 'cash' }] };
const MOM_LOCAL = { tw_mom_example_com_linked_teens: { teens: [{ key: TEEN.email, email: TEEN.email, name: TEEN.name, linkedAt: NOW - 10 * DAY }], updatedAt: NOW - 10 * DAY } };

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let n = 0;
  const ok = (cond, what) => { assert(cond, what); n++; };
  const shots = process.env.TW_SHOTS || '';
  const shot = async (p, name) => { if (shots) await p.screenshot({ path: path.join(shots, name + '.png') }); };
  try {
    seed();
    const DESK = { width: 1366, height: 900 }, PHONE = { width: 390, height: 844 };

    /* ── 1. teen: home note, Applied card, the wrap-up, the Work Log, the trust hook ───────── */
    const T = await open(browser, DESK, { trust: true });
    await signIn(T.p, TEEN, TEEN_LOCAL);
    let items = await T.p.evaluate(() => window.twWrapUp.items().map(i => [i.title, !!i.teen, !!i.emp]));
    ok(items.length === 3, 'teen: three hired jobs ' + JSON.stringify(items));
    await goTo(T.p, 'ttab-browse');
    let nudge = await text(T.p, '#tw65-nudge');
    ok(/Mike.s Lawn Care wrapped up “Shovel snow” and wrote you a reference\. It.s in References\./.test(nudge) && /\(1 more\)/.test(nudge), 'teen home note, most urgent first: ' + nudge);
    ok(await T.p.locator('#tw65-nudge [data-tw65="snooze"]').count() === 0, 'no "not finished" once the employer wrapped up');
    ok(!/Walk dogs/.test(nudge), 'a job hired 3 hours ago is not nagged about yet');
    await goTo(T.p, 'ttab-applications');
    await T.p.evaluate(() => renderTeenApplications());
    await T.p.waitForTimeout(200);
    const strips = await T.p.locator('#teen-applications-list .tw65-strip').count();
    ok(strips === 3, 'every hired job card has a wrap-up line: ' + strips);
    // "Not finished yet" waits a few days
    await T.p.evaluate(id => window.twWrapUp.open(id), J1 + '|' + TEEN.email);
    await T.p.waitForSelector('#tw65-modal');
    await T.p.locator('#tw65-notyet').click();
    await T.p.waitForSelector('#tw65-modal', { state: 'detached' });
    await goTo(T.p, 'ttab-browse');
    nudge = await text(T.p, '#tw65-nudge');
    ok(/Shovel snow/.test(nudge) && !/more\)/.test(nudge), 'snoozed job leaves the home note: ' + nudge);
    ok(await T.p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tw_sam_example_com_wu_snooze'))).every(z => z.until > Date.now() + 2.9 * 864e5)), 'snooze lasts 3 days');
    await T.p.evaluate(() => localStorage.removeItem('tw_sam_example_com_wu_snooze'));
    await T.p.evaluate(() => window.twWrapUp.sync()); await T.p.waitForTimeout(300);
    nudge = await text(T.p, '#tw65-nudge');
    ok(/\(1 more\)/.test(nudge), 'without the snooze it is back');
    await shot(T.p, 'teen-home-note');
    // the wrap-up from the Applied card
    await goTo(T.p, 'ttab-applications');
    await T.p.evaluate(() => renderTeenApplications());
    await T.p.locator('#teen-applications-list .tw65-strip [data-tw65="wrap"]').first().click();
    await T.p.waitForSelector('#tw65-modal');
    ok(/Wrap up: Rake leaves/.test(await text(T.p, '#tw65-h')), 'the window names the job');
    ok(await T.p.locator('#tw65-hours').inputValue() === '1', 'hours start from the Work Log (1 h)');
    ok(/Your Work Log already has 1 h and \$15\.00/.test(await text(T.p, '#tw65-modal .tw65-hint')), 'says what is already logged: ' + await text(T.p, '#tw65-modal'));
    ok(/Job pay: \$15\.00 an hour/.test(await text(T.p, '#tw65-modal .tw65-hint')), 'shows the job pay');
    await T.p.locator('.tw65-go').click();
    ok(/Say whether you.ve been paid in full/.test(await text(T.p, '#tw65-err')), 'paid in full is required');
    await T.p.locator('#tw65-hours').fill('3');
    await T.p.locator('#tw65-pay').fill('45');
    await T.p.locator('.tw65-pill', { hasText: 'Yes' }).first().click();
    await T.p.locator('.tw65-go').click();
    ok(/Pick 1 to 5 stars/.test(await text(T.p, '#tw65-err')), 'a rating is required');
    ok(/Add 2 h and \$30\.00 to my Work Log/.test(await text(T.p, '#tw65-log')), 'offers to add only the missing part: ' + await text(T.p, '#tw65-log'));
    await T.p.locator('.tw65-star').nth(4).click();
    ok(await T.p.locator('.tw65-star.on').count() === 5, 'five stars light up');
    await T.p.locator('.tw65-yn').nth(1).locator('.tw65-pill', { hasText: 'Yes' }).click();
    await T.p.locator('#tw65-note').fill('Clear instructions and paid on time.');
    await shot(T.p, 'teen-wrapup-window');
    await T.p.locator('.tw65-go').click();
    await T.p.waitForSelector('#tw65-modal', { state: 'detached' });
    const trow = get(TEEN.email, 'job_wrap:' + J1);
    ok(trow && trow.hours === 3 && trow.pay === 45 && trow.paid === true && trow.stars === 5 && trow.again === true && trow.employerKey === BOSS.email, 'teen row saved ' + JSON.stringify(trow));
    ok(/Added 2 h and \$30\.00 to your Work Log/.test(await toastText(T.p)), 'toast: ' + await toastText(T.p));
    let wl = await T.p.evaluate(() => JSON.parse(localStorage.getItem('tw_worklog')));
    let mineWl = wl.filter(e => e.wrapJobId === 1700000000000001);
    ok(mineWl.length === 1 && mineWl[0].hours === 2 && mineWl[0].pay === 30 && mineWl[0].source === 'wrapup' && wl.length === 2, 'Work Log gets one entry for the rest ' + JSON.stringify(wl));
    await T.p.waitForFunction(() => window.__trust.length === 1);
    const tr = await T.p.evaluate(() => window.__trust[0]);
    ok(tr.jobId === String(1700000000000001) && tr.employer === 'boss@example.com' && tr.rating === 5 && tr.text === 'Clear instructions and paid on time.', 'rating sent to the employer trust hook ' + JSON.stringify(tr));
    await T.p.waitForFunction(() => /"trust":"sent"/.test(JSON.stringify(window.twWrapUp.items())));
    ok(get(TEEN.email, 'job_wrap:' + J1).trust === 'sent', 'trust flag saved as sent');
    let line = await text(T.p, '#teen-applications-list .tw65-strip');
    ok(/Wrapped up \(3 h, \$45\.00\)\. Waiting for Mike.s Lawn Care\./.test(line), 'Applied line after: ' + line);
    // References: the 15-day-old reference is open, "Walk dogs" is still to wrap up
    await goTo(T.p, 'ttab-references');
    let refs = await text(T.p, '#tw65-refs');
    ok(/Shovel snow/.test(refs) && /Sam cleared the whole driveway before school\./.test(refs), 'a reference opens after 14 days without the teen: ' + refs);
    ok(/Jobs to wrap up/i.test(refs) && /Walk dogs/.test(refs), 'jobs still to wrap up are listed: ' + refs);
    ok(await T.p.evaluate(() => [...document.querySelectorAll('#ttab-references > .panel')].every(p => p.style.display === 'none')), 'the old sample panels are hidden');
    ok(/1 Reference · 5\.0★/.test(await text(T.p, '#teen-refs-badge')), 'badge counts references');
    ok(await T.p.evaluate(() => demoRatings.some(r => r._tw65 && r.stars === 5 && r.job === 'Shovel snow')), 'the rating reaches the Work Record');

    /* ── 2. employer: sees Sam's numbers, uses them, rates, writes a reference; closing a listing asks ── */
    const E = await open(browser, DESK);
    await signIn(E.p, BOSS, { tw_boss_example_com_emp_profile: { name: BIZ } });
    await E.p.waitForFunction(() => demoApplicants.filter(a => a._jb).length >= 3, null, { timeout: 12000 });
    await goTo(E.p, 'etab-post');
    await resync(E.p);
    const enote = await text(E.p, '#tw65-nudge');
    ok(/Sam wrapped up “Rake leaves”/.test(enote) && /\(3 h, \$45\.00\)/.test(enote) && /write a short reference/.test(enote), 'employer home note: ' + enote);
    ok(await E.p.locator('#tw65-nudge [data-tw65="snooze"]').count() === 0, 'no "not finished" when the teen already wrapped up');
    await goTo(E.p, 'etab-applicants');
    await E.p.evaluate(() => window.twWrapUp.applicantRefs());
    await E.p.waitForTimeout(400);
    const kst = await E.p.evaluate(() => [...document.querySelectorAll('#emp-kanban-board .tw65-kstrip')].map(s => s.innerText.replace(/\s+/g, ' ')));
    ok(kst.length === 3 && kst.some(s => /Sam wrapped up/.test(s) && /Wrap it up/.test(s)), 'hired cards in the pipeline: ' + JSON.stringify(kst));
    const jo = E.p.locator('#emp-kanban-board [data-tw65="aprefs"]');
    ok(await jo.count() === 1 && /📜 1 · 5\.0★/.test(await jo.textContent()), 'an applicant with a shared reference gets a button ' + JSON.stringify(await E.p.evaluate(() => ({ refs: window.twWrapUp.state().applicantRefs, apps: demoApplicants.map(a => [a.name, a._teenKey, a._jb, a.passed, a.hired]), cards: document.querySelectorAll('#emp-kanban-board [ondragstart]').length }))));
    await jo.click();
    await E.p.waitForSelector('#tw65-modal');
    const apr = await text(E.p, '#tw65-modal');
    ok(/References for Jo Park/.test(apr) && /Jo painted our fence neatly/.test(apr) && /Ana Lopez/.test(apr), 'applicant references: ' + apr);
    await E.p.keyboard.press('Escape');
    await E.p.waitForSelector('#tw65-modal', { state: 'detached' });
    // wrap up Rake leaves from the home note
    await goTo(E.p, 'etab-post');
    await E.p.locator('#tw65-nudge [data-tw65="wrap"]').click();
    await E.p.waitForSelector('#tw65-modal');
    ok(/Sam said 3 h and \$45\.00/.test(await text(E.p, '#tw65-modal .tw65-hint')), 'the employer sees the teen\'s numbers');
    ok(await E.p.locator('#tw65-hours').inputValue() === '3' && await E.p.locator('#tw65-pay').inputValue() === '45.00', 'and starts from them');
    await E.p.locator('[data-tw65-use]').click();
    await E.p.locator('.tw65-star').nth(3).click();
    await E.p.locator('.tw65-yn').nth(1).locator('.tw65-pill', { hasText: 'Yes' }).click();
    for (const s of ['On time', 'Hard worker', 'Communicates well']) await E.p.locator('.tw65-chip', { hasText: s }).click();
    await E.p.locator('#tw65-tpl').click();
    const tpl = await E.p.locator('#tw65-text').inputValue();
    ok(tpl === 'Sam worked for me on “Rake leaves” (3 hours). Sam showed up on time, worked hard and kept me in the loop. I would happily hire Sam again.', 'template: ' + tpl);
    // the safety check refuses a phone number
    await E.p.evaluate(() => { window.twCheckMessage = async t => (/\d{3}-\d{4}/.test(t) ? { allowed: false, title: 'Contact details blocked', message: 'Keep phone numbers out of references.' } : { allowed: true }); });
    await E.p.locator('#tw65-text').fill(tpl + ' Call me at 555-1234.');
    await E.p.locator('.tw65-go').click();
    await E.p.waitForFunction(() => /Contact details blocked/.test(document.getElementById('tw65-err').textContent));
    ok(!get(BOSS.email, 'job_wrap:' + J1 + ':' + TEEN.email), 'nothing saved while the text is refused');
    await E.p.locator('#tw65-text').fill(tpl);
    await shot(E.p, 'employer-wrapup-window');
    await E.p.locator('.tw65-go').click();
    await E.p.waitForSelector('#tw65-modal', { state: 'detached' });
    const erow = get(BOSS.email, 'job_wrap:' + J1 + ':' + TEEN.email);
    ok(erow && erow.hours === 3 && erow.pay === 45 && erow.stars === 4 && erow.rehire === true && erow.strengths.join() === 'On time,Hard worker,Communicates well' && erow.business === BIZ, 'employer row ' + JSON.stringify(erow));
    ok(/You can both see the ratings now/.test(await toastText(E.p)), 'employer toast: ' + await toastText(E.p));
    await goTo(E.p, 'etab-reviews');
    const rev = await text(E.p, '#tw65-emp');
    ok(/Wrapped up/i.test(rev) && /Sam rated working for you ★★★★★ and would work for you again/.test(rev) && /You both agree: 3 h, \$45\.00/.test(rev), 'Reviews tab: ' + rev);
    ok(await E.p.evaluate(() => [...document.querySelectorAll('#etab-reviews > .panel')].every(p => p.style.display === 'none')), 'the sample "Alex" review screen is hidden');
    await shot(E.p, 'employer-reviews');
    // closing "Walk dogs" (hired, not wrapped up) opens the wrap-up
    await goTo(E.p, 'etab-active');
    await E.p.evaluate(() => renderEmployerDashboard());
    await E.p.waitForTimeout(300);
    const jobsTxt = await text(E.p, '#employer-jobs-list');
    ok(/Sam Rivera · hired/.test(jobsTxt), 'Active Jobs lists the hired teen: ' + jobsTxt.slice(0, 200));
    await E.p.evaluate(() => { const i = employerPostedJobs.findIndex(j => j.title === 'Walk dogs'); closeJob(demoJobs.length + i); });
    await E.p.waitForSelector('#tw65-modal');
    ok(/Wrap up: Walk dogs/.test(await text(E.p, '#tw65-h')), 'closing the listing asks for the wrap-up');
    ok(await E.p.locator('#tw65-pay').inputValue() === '40.00', 'a flat job starts from its pay');
    await E.p.locator('#tw65-hours').fill('2');
    await E.p.locator('#tw65-pay').fill('30');
    await E.p.locator('.tw65-pill', { hasText: 'Not yet' }).first().click();
    await E.p.locator('.tw65-star').nth(2).click();
    await E.p.locator('.tw65-yn').nth(1).locator('.tw65-pill', { hasText: 'No' }).click();
    await E.p.locator('.tw65-go').click();
    await E.p.waitForSelector('#tw65-modal', { state: 'detached' });
    ok(get(BOSS.email, 'job_wrap:' + J2 + ':' + TEEN.email).paid === false, 'unpaid saved');

    /* ── 3. parent: sees what came in, then gets notices when the teen wraps up "Walk dogs" ── */
    const M = await open(browser, DESK);
    await signIn(M.p, MOM, MOM_LOCAL);
    await M.p.waitForFunction(() => window.twWrapUp.items().length === 3, null, { timeout: 12000 });
    await goTo(M.p, 'ptab-ratings');
    let par = await text(M.p, '#ratings-list');
    ok(/Rake leaves/.test(par) && /Both agree on the hours and pay/.test(par) && /Sam worked for me on “Rake leaves”/.test(par), 'parent sees the finished job with the reference: ' + par.slice(0, 300));
    ok(/Walk dogs/.test(par) && /rating of Sam shows once Sam wraps up too/.test(par) && /2 hours · \$30\.00 · not paid in full yet/.test(par), 'parent sees Walk dogs numbers but not the stars yet');
    ok(/Mike.s Lawn Care says hasn.t been paid|says Sam hasn.t been paid in full yet/.test(par), 'parent sees "not paid in full"');
    await shot(M.p, 'parent-ratings');

    /* ── 4. teen: the reference is open; copy, print, hide; a mismatch on "Walk dogs" ───────── */
    await resync(T.p);
    await goTo(T.p, 'ttab-references');
    refs = await text(T.p, '#tw65-refs');
    ok(/Sam worked for me on “Rake leaves”/.test(refs) && /★★★★☆/.test(refs) && /Would hire again/.test(refs) && /On time/.test(refs) && /3 hours \(both agreed\)/.test(refs), 'teen sees the reference: ' + refs.slice(0, 400));
    ok(/Mike.s Lawn Care wrote you a reference for “Walk dogs”\. Wrap up the job to see it\./.test(refs) && !/2 out of 5|★★★☆☆/.test(refs), 'the "Walk dogs" reference stays locked');
    await shot(T.p, 'teen-references');
    const card = T.p.locator('#tw65-refs .tw65-ref', { hasText: 'Rake leaves' });
    await card.locator('[data-tw65="copy"]').click();
    await T.p.waitForTimeout(250);
    const clip = await T.p.evaluate(() => navigator.clipboard.readText());
    ok(/^Reference for Sam Rivera\nFrom: Mike.s Lawn Care \(employer on TeenWork\)\nJob: Rake leaves, \w+ \d{4}, 3 hours\nRating: 4 out of 5, would hire again\nStrengths: On time, Hard worker, Communicates well\n"Sam worked for me/.test(clip) && /TeenWork does not check employers' identity\.$/.test(clip), 'copied text: ' + clip);
    await card.locator('[data-tw65="print"]').click();
    await T.p.waitForFunction(() => window.__printed != null);
    const printed = await T.p.evaluate(() => [window.__printed, window.__printClass]);
    ok(/Reference for Sam Rivera/.test(printed[0]) && /Sam worked for me/.test(printed[0]) && printed[1] === true, 'print shows only the reference');
    await card.locator('input[data-tw65="share"]').uncheck();
    await T.p.waitForTimeout(400);
    ok(JSON.stringify(get(TEEN.email, 'ref_hidden').jobIds) === JSON.stringify([J1]), 'hiding a reference is saved');
    // Walk dogs: Sam says 3 h / $40, paid
    await T.p.locator('#tw65-refs [data-tw65="wrap"]').first().click();
    await T.p.waitForSelector('#tw65-modal');
    ok(/Mike.s Lawn Care said 2 h and \$30\.00, not paid in full yet/.test(await text(T.p, '#tw65-modal .tw65-hint')), 'teen sees the employer\'s numbers');
    await T.p.locator('#tw65-hours').fill('3');
    await T.p.locator('#tw65-pay').fill('40');
    await T.p.locator('.tw65-pill', { hasText: 'Not yet' }).first().click();
    await T.p.locator('.tw65-star').nth(3).click();
    await T.p.locator('.tw65-yn').nth(1).locator('.tw65-pill', { hasText: 'Yes' }).click();
    await T.p.locator('.tw65-go').click();
    await T.p.waitForSelector('#tw65-modal', { state: 'detached' });
    ok(/don.t match theirs/.test(await toastText(T.p)), 'mismatch toast: ' + await toastText(T.p));
    await goTo(T.p, 'ttab-applications');
    await T.p.evaluate(() => renderTeenApplications());
    const walk = await T.p.evaluate(() => [...document.querySelectorAll('#teen-applications-list .job-card')].map(c => c.innerText.replace(/\s+/g, ' ')).find(t => /Walk dogs/.test(t)));
    ok(/Hours or pay don.t match\. You: 3 h, \$40\.00\. Mike.s Lawn Care: 2 h, \$30\.00\./.test(walk) && /Fix my hours and pay/.test(walk), 'mismatch on the Applied card: ' + walk);
    // fixing the numbers: rating stays, Work Log follows
    wl = await T.p.evaluate(() => JSON.parse(localStorage.getItem('tw_worklog')));
    ok(wl.filter(e => e.wrapJobId === 1700000000000002).length === 1 && wl.find(e => e.wrapJobId === 1700000000000002).hours === 3, 'Walk dogs added to the Work Log');
    await T.p.locator('#teen-applications-list .job-card', { hasText: 'Walk dogs' }).locator('[data-tw65="wrap"]').click();
    await T.p.waitForSelector('#tw65-modal');
    ok(await T.p.locator('#tw65-modal .tw65-star').count() === 0 && /You rated Mike.s Lawn Care ★★★★☆/.test(await text(T.p, '#tw65-modal')), 'editing keeps the rating as it was');
    await T.p.locator('[data-tw65-use]').click();
    await T.p.locator('.tw65-go').click();
    await T.p.waitForSelector('#tw65-modal', { state: 'detached' });
    wl = await T.p.evaluate(() => JSON.parse(localStorage.getItem('tw_worklog')));
    const wd = wl.find(e => e.wrapJobId === 1700000000000002);
    ok(wd && wd.hours === 2 && wd.pay === 30, 'Work Log entry follows the fixed numbers ' + JSON.stringify(wd));
    ok(get(TEEN.email, 'job_wrap:' + J2).stars === 4 && get(TEEN.email, 'job_wrap:' + J2).hours === 2, 'row keeps the stars, takes the new hours');

    /* ── 5. parent notices; employer sees the hidden reference disappear ──────────────── */
    await resync(M.p);
    const notes = await M.p.evaluate(() => demoNotifs.filter(x => x.type === 'job-wrapup').map(x => x.text));
    ok(notes.some(t => /Sam wrapped up “Walk dogs”: 2 hours, \$30\.00 \(not paid in full yet\)\./.test(t)) && notes.some(t => /rated Sam 3 of 5 for “Walk dogs”/.test(t)), 'parent notices: ' + JSON.stringify(notes));
    par = await text(M.p, '#ratings-list');
    ok(/Sam rated working for Mike.s Lawn Care ★★★★☆ and would work there again/.test(par), 'parent sees the teen\'s rating once open');
    put('jo@example.com', 'ref_hidden', { jobIds: [J9] });
    await E.p.evaluate(() => window.twWrapUp.applicantRefs());
    await E.p.waitForTimeout(300);
    await goTo(E.p, 'etab-applicants');
    ok(await E.p.locator('#emp-kanban-board [data-tw65="aprefs"]').count() === 0, 'a hidden reference is not shown to employers');

    /* ── 6. phones: the window fits; offline save says so ───────────────────────────── */
    const P = await open(browser, PHONE);
    await signIn(P.p, BOSS, { tw_boss_example_com_emp_profile: { name: BIZ } });
    await P.p.evaluate(id => window.twWrapUp.open(id), J4 + '|' + TEEN.email);
    await P.p.waitForSelector('#tw65-modal');
    ok(await noOverflow(P.p), 'phone: no sideways scrolling with the window open');
    const sizes = await P.p.evaluate(() => [...document.querySelectorAll('#tw65-modal button:not(.tw65-link),#tw65-modal .tw65-pill span,#tw65-modal .tw65-star')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)));
    ok(sizes.length && sizes.every(h => h >= 36), 'phone: buttons are big enough ' + JSON.stringify(sizes));
    const cardBox = await P.p.locator('.tw65-card').boundingBox();
    ok(cardBox.x >= 0 && cardBox.x + cardBox.width <= 391, 'phone: the window fits the screen');
    await shot(P.p, 'phone-wrapup-window');
    await P.p.evaluate(() => { window.__twOffline = true; });
    await P.p.locator('#tw65-hours').fill('2');
    await P.p.locator('.tw65-go').click();
    await P.p.waitForFunction(() => /Couldn.t save/.test(document.getElementById('tw65-err').textContent));
    ok(true, 'offline save is reported');

    /* ── 7. practice account: nothing to wrap up, nothing breaks ────────────────────── */
    const D = await open(browser, DESK);
    await D.p.evaluate(() => _directDemo('teen'));
    await D.p.waitForTimeout(3000);
    await D.p.evaluate(() => switchDashTab(null, 'ttab-references'));
    await D.p.waitForTimeout(800);
    ok(await D.p.locator('#tw65-nudge').count() === 0, 'practice: no home note');
    ok(/No references yet/.test(await text(D.p, '#ttab-references')), 'practice: empty References says how to get one');

    for (const [who, x] of [['teen', T], ['employer', E], ['parent', M], ['phone', P], ['practice', D]]) ok(x.errors.length === 0, who + ' page errors: ' + x.errors.join(' | '));
    for (const x of [T, E, M, P, D]) await x.context.close();
    console.log('job-wrapup-v65: ' + n + ' checks passed');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
