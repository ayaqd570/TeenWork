/* Offline checks for v64 "Post a small job" (quick-job-v64.js). Aya's 2026-11-18 list, item 4: "Let a neighbour
   post a small job ('rake leaves Saturday, $40') from a shared link in under a minute, without setting up a full
   business profile."
   A pretend Supabase (tests/helpers/fake-supabase-v64.cjs) keeps accounts and user_data rows in this browser's
   localStorage, so the neighbor, the teen and the parent below share one "server", one after the other.
   Nothing real is called: every outside request is blocked, and emails are caught instead of sent.
   Run: node tests/quick-job-v64.cjs        (SHOTS=1 also saves pictures to docs/quick-job-v64/) */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const FAKE = require('./helpers/fake-supabase-v64.cjs');

const PORT = 8165, ROOT = 'http://127.0.0.1:' + PORT + '/';
const PW = 'Correct-horse-9';
const NEIGHBOR = 'pat.neighbor@example.com', NEIGHBOR2 = 'lee.next@example.com', TEEN = 'sam.teen@example.com', PARENT = 'jo.parent@example.com';
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', 'docs', 'quick-job-v64') : '';
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: true, hasTouch: true };
const LAPTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: SHOTS ? 2 : 1 };
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; };
const users = p => p.evaluate(() => JSON.parse(localStorage.getItem('__fake_users') || '{}'));
const rows = p => p.evaluate(() => JSON.parse(localStorage.getItem('__fake_table_user_data') || '[]'));
const jobRows = async p => (await rows(p)).filter(r => /^job_post:/.test(r.key)).map(r => Object.assign({ _email: r.email }, JSON.parse(r.value)));
const shot = async (p, name, full) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }); };

async function newContext(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block' }, opts || PHONE));
  await ctx.route('**/*', r => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await ctx.addInitScript(FAKE);
  // emails are caught here instead of sent
  await ctx.addInitScript(() => {
    window.__mails = [];
    const catchMail = () => { window.twSendEmail = function (to, subject, html, opts) { window.__mails.push({ to, subject, html, opts }); return Promise.resolve(true); }; };
    document.addEventListener('DOMContentLoaded', () => { catchMail(); setTimeout(catchMail, 0); setTimeout(catchMail, 500); });
  });
  return ctx;
}
async function open(ctx, address) {
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(String(e && e.message || e)));
  await p.goto(ROOT + (address || ''));
  await p.waitForFunction(() => window.twQuickJob && window.__twUrlViewsBooted);
  await p.waitForTimeout(700);
  return p;
}
async function signOut(p) {
  await p.evaluate(() => { if (window.signOut) window.signOut(); });
  await p.waitForFunction(() => !window.currentUser);
  await p.waitForTimeout(300);
}
async function fillJob(p, o) {
  await p.fill('#tw64-what', o.what);
  if (o.whenChip != null) await p.click('#tw64-when-chips button >> nth=' + o.whenChip); else await p.fill('#tw64-when', o.when);
  await p.fill('#tw64-pay', String(o.pay));
  if (o.hourly) await p.click('.tw64-seg label:nth-child(2)');
  await p.fill('#tw64-city', o.city || 'Burlington');
  if (o.details) await p.fill('#tw64-details', o.details);
}
async function fillYou(p, o) {
  if (o.name != null) await p.fill('#tw64-name', o.name);
  await p.fill('#tw64-email', o.email);
  await p.fill('#tw64-pw', o.password);
  if (o.terms) await p.check('#tw64-terms');
}
const alertText = p => p.evaluate(() => { const a = document.getElementById('tw64-alert'); return a && a.classList.contains('show') ? a.textContent : ''; });
const activePage = p => p.evaluate(() => (document.querySelector('.page.active') || {}).id);

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    const ctx = await newContext(browser, PHONE);

    /* 1. the shared link opens the page */
    let p = await open(ctx, '?view=quick-job&ref=ABCDEF23');
    ok(await activePage(p) === 'page-quick-job', 'the link opens Post a small job');
    ok(new URL(p.url()).search === '?view=quick-job', 'the address keeps ?view=quick-job (ref code taken off): ' + p.url());
    ok((await p.evaluate(() => JSON.parse(localStorage.getItem('tw_ref_from') || 'null'))).code === 'ABCDEF23', 'the share code is kept for sign-up');
    ok(await p.evaluate(() => document.body.classList.contains('tw64-page')), 'page flag for hiding the floating buttons');
    ok(!(await p.isVisible('#v17-support-fab')) && !(await p.isVisible('#v17-rate-fab')), 'Help / Rate buttons are not over the form');
    const noScroll = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(noScroll, 'no sideways scrolling on a phone');
    ok(!(await p.isVisible('#tw64-who')) && await p.isVisible('#tw64-name'), 'a visitor sees the About you fields');
    await shot(p, 'phone-form', true);

    /* 2. checks before anything is made */
    await p.click('#tw64-go');
    ok(/what needs doing/i.test(await alertText(p)), 'empty form: asks what needs doing');
    await fillJob(p, { what: 'Cut down a tree with a chainsaw', whenChip: 0, pay: 60 });
    await fillYou(p, { name: 'Pat Lee', email: NEIGHBOR, password: PW, terms: true });
    await p.click('#tw64-go');
    await p.waitForTimeout(300);
    ok(/can’t be posted for teens/.test(await alertText(p)), 'hazardous job refused by the app\'s own rules: ' + await alertText(p));
    ok(!(await users(p))[NEIGHBOR], 'a refused job makes no account');
    await p.fill('#tw64-what', ''); await p.fill('#tw64-pw', 'short');
    await p.fill('#tw64-what', 'Rake leaves in the front yard');
    await p.fill('#tw64-pay', '40');
    ok(await p.evaluate(() => (document.querySelector('input[name="tw64-kind"]:checked') || {}).value) === 'yard work', 'kind of job picked from the words (rake → Yard or snow)');
    await p.click('#tw64-go');
    ok(/8 characters/.test(await alertText(p)), 'short password caught');
    await p.fill('#tw64-pw', PW);
    await p.uncheck('#tw64-terms');
    await p.click('#tw64-go');
    ok(/18 or older/.test(await alertText(p)), 'terms box needed');
    await p.check('#tw64-terms');

    /* 3. post: account + job in one go */
    const t0 = Date.now();
    await p.click('#tw64-go');
    await p.waitForSelector('#tw64-done', { timeout: 20000 });
    const took = Date.now() - t0;
    ok(took < 20000, 'posted in ' + took + ' ms');
    const u1 = (await users(p))[NEIGHBOR];
    ok(u1 && u1.meta.account_type === 'employer' && u1.meta.first_name === 'Pat' && u1.meta.last_name === 'Lee', 'an employer account was made for the neighbor');
    ok(await p.evaluate(() => window.currentUser && window.currentUser.type === 'employer'), 'the neighbor is signed in');
    ok(!(await p.$('#tw34-tour')), 'no app tour over the "posted" window');
    let jobs = await jobRows(p);
    ok(jobs.length === 1, 'one job row in the cloud');
    const j1 = jobs[0];
    ok(j1._email === NEIGHBOR && j1.employerKey === NEIGHBOR, 'saved under the neighbor\'s account');
    ok(j1.neighbor === true && j1.notify === true, 'marked as a neighbor job, email on');
    ok(j1.title === 'Rake leaves in the front yard' && j1.type === 'yard work' && j1.pay === 40 && j1.payType === 'flat', 'title / kind / pay saved: ' + JSON.stringify(j1));
    ok(/^When: (Today, )?[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}\. Takes 2 to 3 hours\.$/.test(j1.desc) && j1.maxHours === 3 && j1.city === 'Burlington' && j1.state === 'Vermont', 'when / how long / town in the job: ' + j1.desc);
    // share-v54 saves the code a moment after sign-up, so give it a few seconds
    const credited = await p.waitForFunction(n => JSON.parse(localStorage.getItem('__fake_table_user_data') || '[]').some(r => r.email === n && r.key === 'referred_by' && JSON.parse(r.value) === 'ABCDEF23'), NEIGHBOR, { timeout: 5000 }).then(() => true, () => false);
    ok(credited, 'the share code is credited');
    const done = await p.textContent('#tw64-done');
    ok(/Your job is posted/.test(done) && /\$40 for the job/.test(done) && new RegExp(NEIGHBOR.replace(/\./g, '\\.')).test(done), 'the "posted" window sums it up and says where the email goes');
    ok(await p.evaluate(() => document.querySelector('#tw64-done').getBoundingClientRect().width <= window.innerWidth), 'the window fits the phone');
    await shot(p, 'phone-posted');
    await p.click('#tw64-done [data-tw64="done"]');
    await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('etab-active').classList.contains('active')), 'Done opens Active Jobs');
    ok(/Rake leaves in the front yard/.test(await p.textContent('#employer-jobs-list')), 'the job is listed for the neighbor');
    ok(p.errors.length === 0, 'no page errors: ' + p.errors.join(' | '));

    /* 4. an employer who is already signed in posts straight away */
    await p.evaluate(() => window.twQuickJob.open());
    await p.waitForTimeout(200);
    ok(await p.isVisible('#tw64-who') && /Posting as/.test(await p.textContent('#tw64-who')) && !(await p.isVisible('#tw64-name')), 'signed-in employer: no account fields');
    ok(await p.inputValue('#tw64-city') === 'Burlington', 'town filled from the account');
    await fillJob(p, { what: 'Walk our dog after school', when: 'Weekdays around 4', pay: 12, hourly: true });
    await p.uncheck('#tw64-notify');
    await p.click('#tw64-go');
    await p.waitForSelector('#tw64-done', { timeout: 20000 });
    jobs = await jobRows(p);
    const j2 = jobs.find(j => /dog/.test(j.title));
    ok(j2 && j2.type === 'pet care' && j2.payType === 'hourly' && j2.neighbor === true && !j2.notify, 'second job: pet care, hourly, no email');
    ok(/^When: Weekdays around 4\./.test(j2.desc), 'typed "when" kept');
    await p.click('#tw64-done [data-tw64="done"]');

    /* 4b. a third job this month: the free plan's limit (2 posts) explains itself, nothing is posted */
    await p.evaluate(() => window.twQuickJob.open());
    await fillJob(p, { what: 'Stack firewood', whenChip: 2, pay: 30 });
    await p.click('#tw64-go');
    await p.waitForSelector('#tw-plan-modal', { timeout: 15000 });
    ok((await jobRows(p)).length === 2, 'third post not saved');
    ok(await p.evaluate(() => document.getElementById('emp-title').value) === 'Stack firewood', 'the Post a Job form keeps the job for later');
    await p.evaluate(() => { const m = document.getElementById('tw-plan-modal'); if (m) m.remove(); document.getElementById('emp-title').value = ''; });
    await signOut(p);

    /* 5. the same email again: told to sign in, and signing in posts the job */
    await p.evaluate(() => window.twQuickJob.open());
    await fillJob(p, { what: 'Help carry boxes to the basement', whenChip: 3, pay: 25 });
    await fillYou(p, { name: 'Lee Next', email: NEIGHBOR2, password: PW, terms: true });
    await p.click('#tw64-go');
    await p.waitForSelector('#tw64-done', { timeout: 20000 });
    await p.click('#tw64-done [data-tw64="done"]');
    await signOut(p);
    await p.evaluate(() => window.twQuickJob.open());
    await fillJob(p, { what: 'Shovel the driveway', whenChip: 3, pay: 25 });
    await fillYou(p, { name: 'Lee Next', email: NEIGHBOR2, password: PW, terms: true });
    await p.click('#tw64-go');
    await p.waitForFunction(() => /already has a TeenWork account/.test(document.getElementById('tw64-alert').textContent), null, { timeout: 15000 });
    ok(await activePage(p) === 'page-quick-job', 'still on the page after "already has an account"');
    ok(!(await p.isVisible('#tw64-name')) && /Sign in and post/.test(await p.textContent('#tw64-go')), 'switched to Sign in');
    ok(await p.inputValue('#tw64-what') === 'Shovel the driveway', 'the job is kept');
    await p.fill('#tw64-pw', 'wrong-password-1');
    await p.click('#tw64-go');
    await p.waitForFunction(() => /isn’t right|isn't right|couldn’t sign/i.test(document.getElementById('tw64-alert').textContent), null, { timeout: 15000 });
    ok(true, 'wrong password: ' + await alertText(p));
    await p.fill('#tw64-pw', PW);
    await p.click('#tw64-go');
    await p.waitForSelector('#tw64-done', { timeout: 20000 });
    ok((await jobRows(p)).some(j => j.title === 'Shovel the driveway' && j._email === NEIGHBOR2 && j.neighbor), 'signed in and posted under the same account');
    ok((await jobRows(p)).some(j => j.title === 'Help carry boxes to the basement' && j.type === 'moving help'), 'carry boxes → Moving help');
    await p.click('#tw64-done [data-tw64="done"]');
    await signOut(p);

    /* 6. home page link */
    await p.evaluate(() => window.gotoPage('landing'));
    await p.waitForTimeout(300);
    const link = p.locator('#tw-for-employers .tw64-home-link');
    ok(await link.count() === 1, 'For employers card links to the quick post');
    await link.click();
    ok(await activePage(p) === 'page-quick-job', 'and it opens the page');
    await p.waitForTimeout(300);
    ok(new URL(p.url()).search === '?view=quick-job', 'address follows: ' + p.url());

    /* 7. a teen sees the job with the Neighbor tag, and their share link points here */
    await p.evaluate(() => { window.selectType('teen'); });
    await p.evaluate(() => window.gotoPage('signup'));
    await p.click('#type-teen');
    await p.fill('#su-fname', 'Sam'); await p.fill('#su-lname', 'Teen'); await p.fill('#su-email', TEEN); await p.fill('#su-password', PW);
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 15);
    await p.fill('#su-age', dob.toISOString().slice(0, 10));
    await p.selectOption('#su-state', 'Vermont'); await p.fill('#su-city', 'Burlington');
    await p.check('#terms-agree');
    await p.click('#signup-btn');
    await p.waitForFunction(() => window.currentUser && window.currentUser.type === 'teen', null, { timeout: 15000 });
    await p.evaluate(() => { const o = document.getElementById('tw34-tour'); if (o && window.tourSkip) window.tourSkip(); });
    await p.evaluate(() => window._twJobBoard.sync());
    await p.evaluate(() => { const b = document.querySelector('#twm-side [data-twm="ttab-browse"]'); if (b) b.click(); });
    await p.waitForFunction(() => document.querySelectorAll('#browse-jobs-list .browse-card .tw64-nb').length >= 1, null, { timeout: 10000 });
    const tags = await p.$$eval('#browse-jobs-list .browse-card', cs => cs.map(c => ({ t: (c.querySelector('.browse-title') || {}).textContent, nb: !!c.querySelector('.tw64-nb') })));
    ok(tags.filter(x => x.nb).length === tags.length && tags.length >= 2, 'every neighbor job has the 🏡 tag: ' + JSON.stringify(tags));
    if (SHOTS) {   // for the picture: past the "Link a parent" screen, on Find Jobs
      await p.evaluate(() => { if (window.twSkipLink) window.twSkipLink(); });
      await p.waitForTimeout(400);
      await p.evaluate(() => { const g = document.getElementById('global-toast'); if (g) g.style.opacity = '0'; window.switchTeenTab('ttab-browse'); const c = [...document.querySelectorAll('#browse-jobs-list .browse-card')].find(x => /Rake/.test(x.textContent)); if (c) c.scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(300);
    }
    await shot(p, 'phone-teen-card');
    const shareLink = await p.evaluate(() => { window.twShare({ source: 'test', audience: 'employer', sheet: true }); const v = (document.getElementById('tw54-link-input') || {}).value; window.twShareClose(); return v; });
    ok(/^https:\/\/teenwork\.ayaqd\.com\/\?view=quick-job(&ref=[A-Z0-9]{6,10})?$/.test(shareLink), '"Ask someone to post a job" shares the quick post link: ' + shareLink);
    // a signed-in teen who opens the link is asked to sign out first
    await p.evaluate(() => window.twQuickJob.open());
    ok(/sign out first/i.test(await p.textContent('#tw64-who')) && !(await p.isVisible('#tw64-name')), 'teen account: asked to sign out first');
    await signOut(p);

    /* 8. a parent approves: the neighbor gets one email, read from the neighbor's own job row */
    await p.evaluate(() => window.gotoPage('signup'));
    await p.click('#type-parent');
    await p.fill('#su-fname', 'Jo'); await p.fill('#su-lname', 'Parent'); await p.fill('#su-email', PARENT); await p.fill('#su-password', PW);
    const pdob = new Date(); pdob.setFullYear(pdob.getFullYear() - 42);
    await p.fill('#su-dob', pdob.toISOString().slice(0, 10));
    await p.waitForTimeout(200);
    // answer the "are you an adult" question
    await p.click('#verify-answers [onclick*=",true)"]');
    await p.check('#terms-agree');
    await p.click('#signup-btn');
    await p.waitForFunction(() => window.currentUser && window.currentUser.type === 'parent', null, { timeout: 15000 });
    await p.evaluate(() => { if (document.getElementById('tw34-tour') && window.tourSkip) window.tourSkip(); });
    const parentOk = await p.evaluate(async ([rake, dog, teen]) => {
      // the shared job board puts linked teens' applications in this list; this one is put in by hand
      const mk = (job, n) => ({ id: 3e15 + n, title: job.title, employer: job.employer, type: job.type, pay: job.pay, payType: job.payType, city: job.city, state: job.state, minAge: 14, maxHours: job.maxHours,
        desc: job.desc, neighbor: true, notify: !!job.notify, status: 'pending-approval', applied: 'Today by Sam', parentApproved: false,
        _jb: true, _owner: window.currentUser.email, _appKey: teen + '|' + job.id, _teenKey: teen, _jobId: job.id, _teenName: 'Sam Teen', _employerKey: job.employerKey });
      window.__mk64 = () => [mk(rake, 1), mk(dog, 2)];
      demoJobs.push(...window.__mk64());
      window.renderApprovalJobs(demoJobs);
      await new Promise(r => setTimeout(r, 200));
      const card = document.getElementById('job-card-' + (3e15 + 1));
      return { tag: !!(card && card.querySelector('.tw64-nb')), note: card && (card.querySelector('.tw64-nb-note') || {}).textContent };
    }, [j1, j2, TEEN]);
    ok(parentOk.tag && /A neighbor posted this, not a business/.test(parentOk.note || '') && /doesn’t check who posts jobs/.test(parentOk.note || ''), 'parent card: 🏡 tag + plain note: ' + JSON.stringify(parentOk));
    if (SHOTS) {
      await p.evaluate(() => {
        const g = document.getElementById('global-toast'); if (g) g.style.opacity = '0';
        window.switchParentTab('ptab-approvals', 'pdtab-approvals');
      });
      await p.waitForTimeout(1200);   // let the parent sync that the tab switch starts finish first
      await p.evaluate(() => {
        window.__mk64().forEach(e => { if (!demoJobs.some(x => x.id === e.id)) demoJobs.push(e); });
        window.renderApprovalJobs(demoJobs);
      });
      await p.waitForTimeout(300);
      await p.evaluate(() => { const c = document.getElementById('job-card-' + (3e15 + 1)); if (c) c.scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(200);
    }
    await shot(p, 'phone-parent-card');
    // the parent sync drops hand-made entries for teens who aren't linked, so put them back if the picture took long
    await p.evaluate(() => { window.__mails.length = 0; window.__mk64().forEach(e => { if (!demoJobs.some(x => x.id === e.id)) demoJobs.push(e); }); window.parentApproveJob(3e15 + 1); window.parentApproveJob(3e15 + 2); });
    await p.waitForFunction(() => window.__mails.length >= 1, null, { timeout: 8000 });
    await p.waitForTimeout(800);
    const mails = await p.evaluate(() => window.__mails);
    ok(mails.length === 1, 'one email (the dog job asked for none): ' + mails.map(m => m.to + ' ' + m.subject).join(' | '));
    ok(mails[0].to === NEIGHBOR && /A teen applied for “Rake leaves in the front yard” on TeenWork/.test(mails[0].subject), 'to the neighbor, about the right job: ' + mails[0].subject);
    ok(/<strong>Sam<\/strong> applied/.test(mails[0].html) && !/Teen<\/strong>/.test(mails[0].html) && /\?view=applicants/.test(mails[0].html), 'first name only, link to Applicants');
    // approving again (another tab, a retry) doesn't send it twice
    await p.evaluate(([rake, teen]) => {
      window.__mails.length = 0;
      demoJobs.push({ id: 3e15 + 9, title: rake.title, pay: rake.pay, payType: rake.payType, city: rake.city, state: rake.state, neighbor: true, notify: true, status: 'pending-approval',
        _jb: true, _owner: window.currentUser.email, _appKey: teen + '|' + rake.id, _teenKey: teen, _jobId: rake.id, _teenName: 'Sam Teen', _employerKey: rake.employerKey });
      window.parentApproveJob(3e15 + 9);
    }, [j1, TEEN]);
    await p.waitForTimeout(800);
    ok((await p.evaluate(() => window.__mails.length)) === 0, 'no second email for the same application');
    ok(p.errors.length === 0, 'no page errors: ' + p.errors.join(' | '));
    await ctx.close();

    /* 9. laptop look */
    const lap = await newContext(browser, LAPTOP);
    p = await open(lap, '?view=quick-job');
    ok(await activePage(p) === 'page-quick-job', 'laptop: page opens');
    const card = await p.evaluate(() => { const r = document.querySelector('#page-quick-job .tw64-card').getBoundingClientRect(); return { w: r.width, x: r.x }; });
    ok(card.w <= 560 && card.x > 300, 'laptop: one centred column: ' + JSON.stringify(card));
    await shot(p, 'laptop-form', true);
    await lap.close();

    console.log('quick-job-v64: ' + pass + ' checks passed');
  } finally { await browser.close(); srv.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
