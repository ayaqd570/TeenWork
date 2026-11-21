/* Offline checks for the employer trust checks (employer-trust-v64.js) against a FAKE Supabase (no network):
   • A parent's application waiting for their OK shows the Employer check box: phone confirmed, stars and the latest
     reviews, teens hired, since when; "being switched on" before the database change; the practice parent gets an
     explanation, never made-up reviews.
   • A parent and a teen rate the employer on a hired job (stars, note, no phone numbers or links), and see
     "You rated ★★★★☆" afterwards. window.twEmployerTrust.review() is the same path the after-job wrap-up uses.
   • An employer: "Hired" is recorded on the server, the Trust checks panel confirms a phone number with a texted
     code (the employer-phone function is faked), and shows what parents see; "being switched on" while texting
     isn't set up.
   The database rules themselves are checked in tests/employer-trust-sql.mjs and the function in
   tests/employer-phone-function.mjs. Pictures go to TW_SHOTS (default: the system temp folder).
   Run: node tests/employer-trust-v64.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8164, ROOT = 'http://127.0.0.1:' + PORT + '/';
const SHOTS = process.env.TW_SHOTS || require('node:os').tmpdir();
const TEEN = { id: '11111111-1111-1111-1111-111111111111', email: 'teen@example.com' };
const MOM = { id: '22222222-2222-2222-2222-222222222222', email: 'mom@example.com' };
const BOSS = { id: '33333333-3333-3333-3333-333333333333', email: 'boss@example.com' };

const HISTORY = {
  key: 'boss@example.com', since: '2026-09-03', phone: true, phone_at: '2026-11-18', jobs_posted: 4, hires: 3, teens: 3, finished: 2,
  reviews: 3, avg: 4.7, held: 1,
  recent: [{ rating: 5, text: 'Met us first and explained the work. Paid on time.', role: 'parent', at: '2026-10-20' },
           { rating: 4, text: 'Friendly, gave me water breaks.', role: 'teen', at: '2026-10-02' }],
};

/* A pretend Supabase for one browser tab: user_data rows in memory, and the v64 rpc's. */
function fakeSupabase() {
  const F = window.__fake = { userData: [], session: null, missing: false, trust: {}, mine: [], reviews: [], hires: [], calls: [] };
  const ok = data => ({ data, error: null });
  const NOFN = name => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + name + ' in the schema cache' } });
  const match = (row, filters) => filters.every(([op, c, v]) => op === 'eq' ? String(row[c]) === String(v)
    : op === 'like' ? new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(String(row[c]))
    : op === 'in' ? v.map(String).includes(String(row[c])) : true);
  function run(q) {
    const one = list => (q.single || q.maybe ? ok(list[0] || null) : ok(list));
    if (q.table === 'user_data') {
      if (q.op === 'select') return one(F.userData.filter(r => match(r, q.filters)));
      if (q.op === 'upsert' || q.op === 'insert') {
        (Array.isArray(q.payload) ? q.payload : [q.payload]).forEach(p => { const i = F.userData.findIndex(r => r.email === p.email && r.key === p.key); if (i >= 0) F.userData[i] = { ...F.userData[i], ...p }; else F.userData.push({ ...p }); });
      }
      return ok(null);
    }
    return q.single || q.maybe ? ok(null) : ok([]);
  }
  function from(table) {
    const q = { table, op: 'select', filters: [], payload: null };
    const api = new Proxy({}, { get(_, prop) {
      if (prop === 'then') return (res, rej) => Promise.resolve().then(() => run(q)).then(res, rej);
      if (prop === 'select') return () => api;
      if (['upsert', 'insert', 'update'].includes(prop)) return p => { q.op = prop; q.payload = p; return api; };
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
    from,
    rpc: async (name, args) => {
      F.calls.push({ name, args });
      if (!/^tw_(employer_trust|review_employer|my_employer_reviews|record_hire)$/.test(name)) return ok(null);
      if (F.missing) return NOFN(name);
      if (!F.session) return ok(null);
      if (name === 'tw_employer_trust') return ok(args.p_keys.map(k => F.trust[k] ? { ...F.trust[k], key: k } : { key: k, since: null, phone: false, jobs_posted: 0, hires: 0, teens: 0, finished: 0, reviews: 0, avg: null, held: 0, recent: [] }));
      if (name === 'tw_my_employer_reviews') return ok(F.mine.slice());
      if (name === 'tw_record_hire') { F.hires.push(args); return ok({ ok: true }); }
      if (name === 'tw_review_employer') {
        F.reviews.push(args);
        F.mine = F.mine.filter(m => !(m.employer_key === args.p_employer && String(m.job_id) === args.p_job_id))
          .concat([{ employer_key: args.p_employer, job_id: Number(args.p_job_id), teen_key: args.p_teen || F.session.user.email, rating: args.p_rating, body: args.p_text }]);
        return ok({ ok: true, role: F.session.user.email === MOM_EMAIL ? 'parent' : 'teen', counts: true });
      }
    },
    storage: { from: () => ({ upload: async () => ok(null), createSignedUrls: async () => ok([]), remove: async () => ok([]) }) },
    auth: {
      getSession: async () => ok({ session: F.session }),
      getUser: async () => ok({ user: F.session && F.session.user }),
      onAuthStateChange: () => ok({ subscription: { unsubscribe() {} } }),
      signOut: async () => ({ error: null }), signInWithPassword: async () => ({ data: null, error: { message: 'offline test' } }),
      updateUser: async () => ok({ user: F.session && F.session.user }), signUp: async () => ({ data: null, error: { message: 'offline test' } }),
    },
    functions: { invoke: async () => ({ data: null, error: { message: 'offline test' } }) },
    channel: () => chan, removeChannel: () => {}, removeAllChannels: () => {},
  };
  var MOM_EMAIL = 'mom@example.com';
  window.supabase = { createClient: () => client };
}

async function open(browser, viewport, fake, phoneFn) {
  const context = await browser.newContext({ viewport });
  const outside = [];
  await context.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === '127.0.0.1') return r.continue(); outside.push(u.hostname); return r.abort(); });
  const fnCalls = [];
  if (phoneFn) await context.route('**/functions/v1/employer-phone', async r => {
    const body = JSON.parse(r.request().postData() || '{}'); fnCalls.push({ body, auth: r.request().headers().authorization });
    const out = phoneFn(body);
    return r.fulfill({ status: out.status || 200, contentType: 'application/json', body: JSON.stringify(out.body) });
  });
  if (fake) await context.addInitScript(fakeSupabase);
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twEmployerTrust);
  await p.waitForTimeout(300);
  return { context, p, errors, outside, fnCalls };
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const text = (p, sel) => p.locator(sel).first().evaluate(el => (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
async function skipIntro(p) {
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => { document.getElementById('featpack-install')?.classList.remove('open'); document.querySelectorAll('.tw-welcome-note,.tw54-share-note').forEach(n => n.remove()); });
}
async function signIn(p, user, extra) {
  await p.evaluate(({ user, extra }) => {
    window.__fake.session = { access_token: 'fake.jwt.token', user: { id: user.id, email: user.email } };
    Object.entries(extra.local || {}).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    _twLoginLocalAccount(Object.assign({ email: user.email }, extra.acct));
  }, { user, extra });
  await p.waitForTimeout(2200);
  await skipIntro(p);
}
const seedJobs = ({ TEEN, MOM, BOSS }) => {
  const F = window.__fake;
  F.userData.push(
    { email: BOSS.email, key: 'job_post:1700000000001', value: JSON.stringify({ id: 1700000000001, title: 'Rake leaves Saturday', type: 'yard work', pay: 40, payType: 'flat', city: 'Burlington', state: 'Vermont', employer: "Mike's Lawn", employerKey: BOSS.email, status: 'active', postedAt: Date.now() }) },
    { email: BOSS.email, key: 'job_post:1700000000002', value: JSON.stringify({ id: 1700000000002, title: 'Walk the dog', type: 'pet care', pay: 15, payType: 'hourly', city: 'Burlington', state: 'Vermont', employer: "Mike's Lawn", employerKey: BOSS.email, status: 'active', postedAt: Date.now() }) },
    { email: TEEN.email, key: 'parent_link', value: JSON.stringify({ status: 'approved', parentEmail: MOM.email, parentName: 'Dana Rivera', parents: [MOM.email] }) },
    { email: TEEN.email, key: 'job_app:1700000000001', value: JSON.stringify({ jobId: 1700000000001, employerKey: BOSS.email, status: 'pending-approval', teenKey: TEEN.email, teenName: 'Sam Rivera',
      job: { title: 'Rake leaves Saturday', type: 'yard work', pay: 40, payType: 'flat', city: 'Burlington', state: 'Vermont', employer: "Mike's Lawn", minAge: 13, maxHours: 4, desc: 'Rake the front yard and bag the leaves.' }, appliedAt: Date.now() }) },
    { email: TEEN.email, key: 'job_app:1700000000002', value: JSON.stringify({ jobId: 1700000000002, employerKey: BOSS.email, status: 'hired', teenKey: TEEN.email, teenName: 'Sam Rivera', parentEmail: MOM.email,
      job: { title: 'Walk the dog', type: 'pet care', pay: 15, payType: 'hourly', city: 'Burlington', state: 'Vermont', employer: "Mike's Lawn", minAge: 13, maxHours: 5 }, appliedAt: Date.now() - 864e5 * 10 }) });
};
const MOM_LOGIN = { acct: { name: 'Dana Rivera', type: 'parent' },
  local: { tw_mom_example_com_linked_teens: { teens: [{ key: TEEN.email, email: TEEN.email, name: 'Sam Rivera', linkedAt: Date.now() }], updatedAt: Date.now() } } };
async function parentApprovals(p) {
  await p.evaluate(() => { try { window._twJobBoard && window._twJobBoard.sync(); } catch (e) {} });
  await p.waitForFunction(() => (typeof demoJobs !== 'undefined') && demoJobs.some(j => j._jb && j.status === 'pending-approval'), null, { timeout: 9000 });
  await p.evaluate(() => switchDashTab(null, 'ptab-approvals'));
  await p.waitForTimeout(600);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const tag = viewport.width + 'px', phone = viewport.width < 600;

      /* 1. Parent: the Employer check box on the application waiting for their OK */
      {
        const { context, p, errors } = await open(browser, viewport, true);
        await p.evaluate(seedJobs, { TEEN, MOM, BOSS });
        await p.evaluate(h => { window.__fake.trust['boss@example.com'] = h; }, HISTORY);
        await signIn(p, MOM, MOM_LOGIN);
        await parentApprovals(p);
        await p.waitForFunction(() => /Phone number confirmed/.test((document.querySelector('#approval-jobs .twet-check') || {}).textContent || ''));
        const box = await text(p, '#approval-jobs .twet-check');
        assert.match(box, /Employer check: Mike.s Lawn/);
        assert.match(box, /Phone number confirmed by text \(Nov 2026\)/);
        assert.match(box, /4\.7 out of 5 from 3 reviews/);
        assert.match(box, /Hired 3 teens on TeenWork · 2 jobs finished/);
        assert.match(box, /On TeenWork since Sep 2026 · 4 jobs posted/);
        assert.match(box, /Parent · Oct 2026 .?Met us first and explained the work\. Paid on time\./);
        assert.match(box, /Teen · Oct 2026 .?Friendly, gave me water breaks\./);
        assert.match(box, /1 newer review stays private for up to 14 days/);
        assert.match(box, /TeenWork doesn't run background checks\. Meet the employer with your teen before the first job\./);
        assert.doesNotMatch(box, /boss@example\.com|mom@example\.com|teen@example\.com/, 'no emails in the box');
        // the made-up "Employer rating:" line is gone, the box sits above the Approve buttons
        assert.equal(await p.evaluate(() => [...document.querySelectorAll('#approval-jobs [id^="job-card-"] > div')].filter(d => /^Employer rating:/.test(d.textContent.trim()) && !d.hidden).length), 0);
        assert.equal(await p.evaluate(() => { const b = document.querySelector('#approval-jobs .twet-check'); return !!(b.nextElementSibling && b.nextElementSibling.classList.contains('job-actions')); }), true);
        assert.deepEqual(await p.evaluate(() => window.__fake.calls.filter(c => c.name === 'tw_employer_trust').map(c => c.args.p_keys)[0]), ['boss@example.com']);
        // redraws (the job board syncs every 30 s) use the copy already loaded: no flicker, no extra call per redraw
        const before = await p.evaluate(() => window.__fake.calls.filter(c => c.name === 'tw_employer_trust').length);
        await p.evaluate(() => { renderApprovalJobs(demoJobs); renderApprovalJobs(demoJobs); });
        await p.waitForTimeout(200);
        assert.match(await text(p, '#approval-jobs .twet-check'), /Phone number confirmed/);
        assert.equal(await p.evaluate(() => window.__fake.calls.filter(c => c.name === 'tw_employer_trust').length), before);
        assert(await noOverflow(p), tag + ': parent approvals overflow');
        await p.locator('#approval-jobs .job-card[id^="job-card-"]').first().scrollIntoViewIfNeeded();
        await p.locator('#approval-jobs .job-card[id^="job-card-"]').first().screenshot({ path: path.join(SHOTS, 'v64-parent-employer-check-' + (phone ? 'phone' : 'computer') + '.png') });

        /* 2. Parent rates the employer on the hired job (All Applications) */
        await p.evaluate(() => { renderAllApplications(); });
        await p.waitForFunction(() => !!document.querySelector('#all-applications .twet-rate'));
        assert.match(await text(p, '#all-applications .twet-rate'), /How was Mike.s Lawn to work for\? ⭐ Rate this employer/);
        await p.locator('#all-applications .twet-rate-btn').first().click();
        await p.waitForSelector('#twet-review');
        assert.match(await text(p, '#twet-review h2'), /Rate Mike.s Lawn/);
        assert.match(await text(p, '#twet-review'), /For “Walk the dog” · Sam.s job/);
        assert.match(await text(p, '#twet-review'), /only “Parent” and the month/);
        if (!phone) await p.screenshot({ path: path.join(SHOTS, 'v64-rate-window-computer.png') });
        await p.locator('#twet-rv-send').click();
        assert.match(await text(p, '#twet-rv-status'), /Tap 1 to 5 stars first/);
        await p.locator('.twet-star[data-n="4"]').click();
        assert.equal(await text(p, '#twet-rv-word'), 'Good');
        await p.fill('#twet-rv-text', 'Call me at 802-555-1234');
        await p.locator('#twet-rv-send').click();
        assert.match(await text(p, '#twet-rv-status'), /leave out phone numbers, email addresses and links/);
        await p.fill('#twet-rv-text', 'Clear about the work and checked in with me.');
        if (phone) await p.screenshot({ path: path.join(SHOTS, 'v64-rate-window-phone.png') });
        await p.locator('#twet-rv-send').click();
        await p.waitForSelector('#twet-review', { state: 'detached' });
        const sent = await p.evaluate(() => window.__fake.reviews.slice());
        assert.deepEqual(sent, [{ p_employer: 'boss@example.com', p_job_id: '1700000000002', p_teen: 'teen@example.com', p_rating: 4, p_text: 'Clear about the work and checked in with me.' }]);
        await p.waitForFunction(() => /You rated/.test((document.querySelector('#all-applications .twet-rate') || {}).textContent || ''));
        assert.match(await text(p, '#all-applications .twet-rate'), /You rated Mike.s Lawn ★★★★☆ Change rating/);
        // keyboard: Escape closes the window
        await p.locator('#all-applications .twet-rate-btn').first().click();
        await p.waitForSelector('#twet-review');
        assert.equal(await p.inputValue('#twet-rv-text'), 'Clear about the work and checked in with me.', 'the window opens on the saved note');
        await p.keyboard.press('Escape');
        await p.waitForSelector('#twet-review', { state: 'detached' });
        assert(await noOverflow(p), tag + ': all applications overflow');
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 3. Before the database change: says so plainly */
      {
        const { context, p, errors } = await open(browser, viewport, true);
        await p.evaluate(seedJobs, { TEEN, MOM, BOSS });
        await p.evaluate(() => { window.__fake.missing = true; });
        await signIn(p, MOM, MOM_LOGIN);
        await parentApprovals(p);
        await p.waitForFunction(() => /being switched on/.test((document.querySelector('#approval-jobs .twet-check') || {}).textContent || ''));
        assert.match(await text(p, '#approval-jobs .twet-check'), /Employer history \(phone check, reviews from past jobs, teens hired\) is being switched on/);
        assert.deepEqual(await p.evaluate(() => window.twEmployerTrust.review({ jobId: 1700000000002, employer: 'boss@example.com', teen: 'teen@example.com', rating: 5, text: '' })), { ok: false, error: 'not_set_up' });
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 4. Practice parent: what the box is for, no made-up reviews, nothing sent */
      {
        const { context, p, errors } = await open(browser, viewport, false);
        await p.evaluate(() => _directDemo('parent'));
        await p.waitForTimeout(2600);
        await skipIntro(p);
        await p.evaluate(() => {
          demoJobs.push({ id: 991, title: 'Practice job', employer: 'Practice Employer', city: 'Burlington', state: 'VT', type: 'yard work', pay: 20, payType: 'flat', minAge: 13, maxHours: 4, status: 'pending-approval', applied: 'Today', desc: '' });
          switchDashTab(null, 'ptab-approvals'); renderApprovalJobs(demoJobs);
        });
        await p.waitForTimeout(400);
        const box = await text(p, '#job-card-991 .twet-check');
        assert.match(box, /Practice account: for a real employer, this box shows whether they confirmed a phone number/);
        assert.doesNotMatch(box, /★/);
        assert.deepEqual(await p.evaluate(() => window.twEmployerTrust.review({ jobId: 991, employer: 'x@example.com', rating: 5 })), { ok: false, error: 'practice' });
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 5. Teen rates the employer on Applied; the wrap-up's hook gives the same result */
      {
        const { context, p, errors } = await open(browser, viewport, true);
        await p.evaluate(seedJobs, { TEEN, MOM, BOSS });
        await signIn(p, TEEN, { acct: { name: 'Sam Rivera', type: 'teen', dob: '2010-03-01', city: 'Burlington', state: 'Vermont' },
          local: { tw_parent_links: { [TEEN.email]: { status: 'approved', parentEmail: MOM.email, parentName: 'Dana Rivera', parents: [MOM.email] } } } });
        await p.waitForFunction(() => demoJobs.some(j => j._jb && j.status === 'accepted'), null, { timeout: 9000 });
        await p.evaluate(() => { switchDashTab(null, 'ttab-applications'); renderTeenApplications(); });
        await p.waitForFunction(() => !!document.querySelector('#teen-applications-list .twet-rate'));
        const cards = await p.evaluate(() => [...document.querySelectorAll('#teen-applications-list .job-card')].map(c => [c.querySelector('.job-title').textContent, !!c.querySelector('.twet-rate')]));
        assert.deepEqual(cards.sort(), [['Rake leaves Saturday', false], ['Walk the dog', true]], 'only the hired job can be rated');
        await p.locator('#teen-applications-list .twet-rate-btn').click();
        await p.waitForSelector('#twet-review');
        assert.match(await text(p, '#twet-review'), /only “Teen” and the month/);
        // arrow keys move the stars
        await p.locator('.twet-star[data-n="1"]').focus();
        for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowRight');
        assert.equal(await p.evaluate(() => document.querySelector('.twet-star[aria-checked="true"]').dataset.n), '5');
        await p.fill('#twet-rv-text', 'Email me at sam@example.com');
        await p.locator('#twet-rv-send').click();
        assert.match(await text(p, '#twet-rv-status'), /leave out phone numbers, email addresses and links/);
        await p.fill('#twet-rv-text', 'Paid on time and showed me what to do.');
        await p.locator('#twet-rv-send').click();
        await p.waitForSelector('#twet-review', { state: 'detached' });
        assert.deepEqual(await p.evaluate(() => window.__fake.reviews.slice()), [{ p_employer: 'boss@example.com', p_job_id: '1700000000002', p_teen: 'teen@example.com', p_rating: 5, p_text: 'Paid on time and showed me what to do.' }]);
        await p.waitForFunction(() => /You rated/.test((document.querySelector('#teen-applications-list .twet-rate') || {}).textContent || ''));
        // the after-job wrap-up calls the same hook
        const r = await p.evaluate(() => window.twEmployerTrust.review({ jobId: '1700000000002', employer: 'boss@example.com', rating: 4, text: 'Changed my mind a bit.' }));
        assert.equal(r.ok, true);
        assert.equal(await p.evaluate(() => window.__fake.reviews[1].p_teen), 'teen@example.com', 'a teen caller fills in their own key');
        assert.deepEqual(await p.evaluate(() => window.twEmployerTrust.review({ jobId: 'x', employer: 'boss@example.com', rating: 4 })), { ok: false, error: 'bad_request' });
        assert.deepEqual(await p.evaluate(() => window.twEmployerTrust.review({ jobId: 1, employer: 'boss@example.com', rating: 9 })), { ok: false, error: 'bad_rating' });
        assert(await noOverflow(p), tag + ': teen applied overflows');
        if (phone) await p.locator('#teen-applications-list .job-card').filter({ hasText: 'Walk the dog' }).screenshot({ path: path.join(SHOTS, 'v64-teen-rate-phone.png') });
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 6. Employer: Hired is recorded; Trust checks panel confirms a phone number */
      {
        let configured = true;
        const phoneFn = body => {
          if (body.action === 'ping') return { body: { ok: true, configured } };
          if (body.action === 'start') return body.phone.replace(/\D/g, '').length === 10 ? { body: { ok: true, sent: true, last4: body.phone.replace(/\D/g, '').slice(-4), minutes: 10 } } : { status: 400, body: { ok: false, code: 'bad_phone', error: 'Enter a 10-digit US or Canadian mobile number.' } };
          if (body.action === 'check') return body.code === '123456' ? { body: { ok: true, confirmed: true, last4: '1234' } } : { status: 400, body: { ok: false, code: 'wrong_code', error: 'That code doesn\'t match. Check the text and try again.', left: 4 } };
          return { body: { ok: true, removed: true } };
        };
        const { context, p, errors, fnCalls } = await open(browser, viewport, true, phoneFn);
        await p.evaluate(seedJobs, { TEEN, MOM, BOSS });
        await p.evaluate(h => { window.__fake.trust['boss@example.com'] = Object.assign({}, h, { phone: false, phone_at: null, mine: true, last4: null, pending: false }); }, HISTORY);
        // the parent already approved the dog-walking application; it's waiting for the employer
        await p.evaluate(({ TEEN }) => { const r = window.__fake.userData.find(x => x.email === TEEN.email && x.key === 'job_app:1700000000002'); const v = JSON.parse(r.value); v.status = 'applied'; r.value = JSON.stringify(v); }, { TEEN });
        await signIn(p, BOSS, { acct: { name: 'Mike Lawson', type: 'employer' } });
        await p.waitForFunction(() => demoApplicants.some(a => a._jb), null, { timeout: 9000 });
        await p.evaluate(() => { const i = demoApplicants.findIndex(a => a._jb); hireApplicant(i); });
        await p.waitForFunction(() => window.__fake.hires.length > 0);
        assert.deepEqual(await p.evaluate(() => window.__fake.hires[0]), { p_employer: 'boss@example.com', p_job_id: '1700000000002', p_teen: 'teen@example.com' });

        await p.evaluate(() => switchDashTab(null, 'etab-profile'));
        await p.waitForFunction(() => !!document.querySelector('#twet-tel'));
        assert.match(await text(p, '#twet-emp'), /Parents see these checks before they approve/);
        assert.equal(await text(p, '#twet-emp-badge'), 'Phone not confirmed');
        assert.match(await text(p, '#twet-emp-preview'), /Phone number not confirmed yet/);
        assert.match(await text(p, '#twet-emp-preview'), /4\.7 out of 5 from 3 reviews/);
        // the profile's own Reviews panel shows the real reviews
        assert.match(await text(p, '#emp-profile-reviews-list'), /Met us first and explained the work/);
        assert.match(await text(p, '#emp-profile-reviews-list'), /1 new review stays private for up to 14 days/);
        assert.equal(await text(p, '#emp-profile-review-count'), '3 reviews');
        assert.equal(await text(p, '#emp-profile-rating-badge'), '⭐ 4.7 (3 reviews)');
        await p.fill('#twet-tel', '555-1234');
        await p.locator('#twet-phone-form .twet-go').click();
        assert.match(await text(p, '#twet-phone .twet-status'), /Enter a 10-digit US or Canadian mobile number/);
        assert.equal(fnCalls.filter(c => c.body.action === 'start').length, 0, 'a short number is refused before anything is sent');
        if (phone) await p.locator('#twet-emp').screenshot({ path: path.join(SHOTS, 'v64-employer-trust-phone.png') });
        await p.fill('#twet-tel', '(802) 555-1234');
        await p.locator('#twet-phone-form .twet-go').click();
        await p.waitForSelector('#twet-code');
        assert.match(await text(p, '#twet-phone'), /We texted a code to the number ending in 1234\. It works for 10 minutes\./);
        const start = fnCalls.find(c => c.body.action === 'start');
        assert.deepEqual([start.body.account_key, start.body.phone, start.auth], ['boss@example.com', '(802) 555-1234', 'Bearer fake.jwt.token']);
        await p.fill('#twet-code', '000000');
        await p.locator('#twet-code-form .twet-go').click();
        await p.waitForFunction(() => /doesn't match/.test(document.querySelector('#twet-phone .twet-status').textContent));
        assert.match(await text(p, '#twet-phone .twet-status'), /4 tries left/);
        await p.evaluate(() => { const t = window.__fake.trust['boss@example.com']; t.phone = true; t.phone_at = '2026-11-18'; t.last4 = '1234'; });
        await p.fill('#twet-code', '123456');
        await p.locator('#twet-code-form .twet-go').click();
        await p.waitForFunction(() => /Confirmed: number ending in/.test(document.getElementById('twet-phone').textContent));
        assert.match(await text(p, '#twet-phone'), /Confirmed: number ending in 1234 on Nov 18, 2026/);
        assert.equal(await text(p, '#twet-emp-badge'), '📱 Phone confirmed');
        assert.match(await text(p, '#twet-emp-preview'), /Phone number confirmed by text \(Nov 2026\)/);
        assert.equal(await p.locator('#twet-phone-badge').count(), 1);
        assert(await noOverflow(p), tag + ': employer profile overflows');
        await p.locator('#twet-emp').scrollIntoViewIfNeeded();
        await p.locator('#twet-emp').screenshot({ path: path.join(SHOTS, 'v64-employer-trust-confirmed-' + (phone ? 'phone' : 'computer') + '.png') });
        assert.deepEqual(errors, []);
        await context.close();

        // texting not switched on yet: the panel says so and nothing can be sent
        configured = false;
        const o2 = await open(browser, viewport, true, phoneFn);
        await o2.p.evaluate(h => { window.__fake.trust['boss@example.com'] = Object.assign({}, h, { phone: false, mine: true }); }, HISTORY);
        await signIn(o2.p, BOSS, { acct: { name: 'Mike Lawson', type: 'employer' } });
        await o2.p.evaluate(() => switchDashTab(null, 'etab-profile'));
        await o2.p.waitForFunction(() => /being switched on/.test((document.getElementById('twet-phone') || {}).textContent || ''));
        assert.equal(await o2.p.locator('#twet-tel').count(), 0);
        assert.deepEqual(o2.errors, []);
        await o2.context.close();
      }
      console.log(tag + ': employer trust checks passed');
    }
    console.log('employer-trust-v64: all checks passed');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
