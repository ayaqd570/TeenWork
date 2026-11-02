/* Offline checks for the 2026-11-02 practice-account fixes (work rules, landmark fallback,
   sample scenario, one practice notice, tour choice). No real accounts, network calls or posts:
   every request that isn't to the local server is answered by a stub or blocked.
   Run: node tests/practice-v52.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8023, ROOT = 'http://127.0.0.1:' + PORT + '/';
// Town → [lon, lat]; far apart so each town needs its own landmark lookup.
const TOWNS = { burlington: [-73.2121, 44.4759], rutland: [-72.9726, 43.6106], montpelier: [-72.5754, 44.2601] };
const geo = q => { const k = Object.keys(TOWNS).find(t => q.toLowerCase().includes(t)); return { features: k ? [{ geometry: { coordinates: TOWNS[k] }, properties: { countrycode: 'US' } }] : [] }; };
// Two made-up landmarks in the middle of whatever box the app asks about.
function landmarks(body) {
  const m = /bbox:([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(decodeURIComponent(String(body || '').replace(/\+/g, ' ')));
  const lat = m ? (+m[1] + +m[3]) / 2 : 44.4765, lon = m ? (+m[2] + +m[4]) / 2 : -73.2110;
  return { elements: [
    { type: 'node', id: 1, lat: lat + 0.001, lon: lon + 0.001, tags: { name: 'Sample Library', amenity: 'library' } },
    { type: 'node', id: 2, lat: lat - 0.001, lon: lon - 0.001, tags: { name: 'Sample Park', leisure: 'park' } },
  ] };
}

async function page(browser, viewport, overpass) {
  const context = await browser.newContext({ viewport });
  const outside = [];
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname === '127.0.0.1') return r.continue();
    outside.push(u.hostname);
    if (u.hostname === 'photon.komoot.io') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(geo(u.searchParams.get('q') || '')) });
    if (/overpass/.test(u.hostname)) {
      const mode = overpass.mode;
      if (mode === 'slow') return;                                   // never answers
      if (mode === 'fail') return r.fulfill({ status: 504, body: 'busy' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(landmarks(r.request().postData())) });
    }
    return r.abort();
  });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twWorkRules && window._twSampleScenario);
  return { context, p, errors, outside };
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const text = (p, sel) => p.locator(sel).evaluate(el => el.textContent.replace(/\s+/g, ' ').trim());
async function enter(p, role) {
  await p.evaluate(r => _directDemo(r), role);
  await p.waitForTimeout(2600);
  if (await p.locator('#tw34-skip').isVisible()) await p.locator('#tw34-skip').click();
}
async function setTeen(p, age, state) {
  await p.evaluate(([age, state]) => {
    const d = new Date(); d.setFullYear(d.getFullYear() - age); d.setMonth(d.getMonth() - 2);
    const ymd = d.toISOString().slice(0, 10);
    window.currentUser.dob = ymd; window.currentUser.age = age; window.currentUser.state = state;
    twRenderLaborSummary(document.getElementById('teen-state-rules-banner'));
    twWorkRules.renderWorkLogRules();
  }, [age, state]);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const overpass = { mode: 'ok' };
      const { context, p, errors, outside } = await page(browser, viewport, overpass);
      const tag = viewport.width + 'px';

      /* Homepage */
      assert(await noOverflow(p), tag + ' homepage overflows');
      assert(await p.locator('#tw52-home-sample').isVisible(), tag + ' no sample scenario button');
      const storeBefore = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()));

      /* Teen, age 16 in Vermont: Find Jobs and Work Log tell the same story */
      await enter(p, 'teen');
      assert(await noOverflow(p), tag + ' teen overflows');
      assert.equal(await p.locator('#tw34-tour').count(), 0, tag + ' tour opened by itself in a practice account');
      const find = await text(p, '#teen-state-rules-banner');
      assert.match(find, /Age 16 · Vermont: no hour limits for most jobs/);
      const permitSentence = 'Vermont only needs a work permit for teens under 16 working during school hours';
      assert.equal(find.split(permitSentence).length - 1, 1, tag + ' permit sentence not shown exactly once');
      assert.match(find, /Checked against .*29 CFR 570\.35.*21 V\.S\.A\. § 434.* on Nov 2, 2026/);
      assert.match(find, /weekly goal is 15 h: a personal target you can change in Work Log, not a law/);
      await p.evaluate(() => (window._navfix_go || switchTab)('teen', 'ttab-worklog'));
      await p.waitForTimeout(700);
      const wl = await text(p, '#tw52-wl-rules');
      assert.match(wl, /Age 16 · Vermont: no hour limits for most jobs/);
      assert.match(wl, /Legal weekly limit\s*None for most jobs at 16 in Vermont/);
      assert.match(wl, /No legal weekly hour limit applies at 16 in Vermont/);
      assert.doesNotMatch(wl, /18 h|18 hrs|within limits/);
      const now = await text(p, '[data-mh-now]');
      assert.match(now, /15 h left of your 15 h weekly goal\. It's a personal target, not a law\./);
      assert.doesNotMatch(await text(p, '#page-teen'), /max 18 hrs\/week|within limits|15 h weekly limit|over the 18 h school-year limit/i);
      // The calendar's shift check (ai-shift-finder) uses the same under-16 numbers as the rules file.
      assert(await p.evaluate(() => { const a = window._twShiftFinder.rules.JOB_RULE_UNDER_16, f = twWorkRules.FED.under16, v = twWorkRules.STATES.Vermont.under16;
        return a.schoolDayMax === f.schoolDay && a.schoolWeekMax === f.schoolWeek && a.nonSchoolDayMax === f.nonSchoolDay && a.nonSchoolWeekMax === f.nonSchoolWeek
          && v.schoolDay === f.schoolDay && v.schoolWeek === f.schoolWeek && STATE_DATA.Vermont.schoolWeekMax === v.schoolWeek && STATE_DATA.Vermont.summerMax === v.nonSchoolWeek; }), 'shift-finder numbers differ from the rules file');
      assert(await noOverflow(p), tag + ' work log overflows');

      /* The goal is the teen's own and can be turned off */
      await p.locator('#tw52-goal').selectOption('999');
      await p.waitForTimeout(300);
      assert.match(await text(p, '[data-mh-now]'), /No weekly goal set/);
      await p.locator('#tw52-goal').selectOption('10');
      await p.waitForTimeout(300);
      assert.match(await text(p, '[data-mh-now]'), /10 h left of your 10 h weekly goal/);

      /* Age 15 in Vermont: the legal school-week limit shows everywhere, from the same rules */
      await setTeen(p, 15, 'Vermont');
      await p.evaluate(() => twMoneyRedraw());
      await p.waitForTimeout(200);
      assert.match(await text(p, '#teen-state-rules-banner'), /Age 15 · Vermont: outside school hours, up to 3 h on a school day and 18 h in a school week/);
      assert.match(await text(p, '#teen-state-rules-banner'), /No more than 6 days a week \(Vermont\)/);
      assert.match(await text(p, '#tw52-wl-rules'), /Legal weekly limit\s*18 h in a week when school is in session, 40 h when school is out/);
      assert.match(await text(p, '#wl-law-status'), /within the 18 h school-week limit/);
      assert.equal(await p.evaluate(() => twWorkRules.weekTarget().hours), 10, 'goal 10 h is lower than 18 h');
      await p.locator('#tw52-goal').selectOption('25');
      assert.deepEqual(await p.evaluate(() => { const t = twWorkRules.weekTarget(); return [t.hours, t.kind]; }), [18, 'legal']);
      assert.match(await p.evaluate(() => twWorkRules.weekStatusHTML(19)), /over 18 h: the legal limit for a week when school is in session/);

      /* Every state has its own rules now (US DOL state table, July 15, 2025), the stricter of federal and state counts */
      const all = await p.evaluate(() => {
        const R = twWorkRules, bad = [];
        Object.keys(STATE_DATA).forEach(s => {
          if (!R.STATES[s]) bad.push(s + ': no rules');
          if (!STATE_DATA[s].__tw52 || STATE_DATA[s].schoolWeekMax !== R.STATES[s].under16.schoolWeek) bad.push(s + ': STATE_DATA not in step');
          [13, 14, 15, 16, 17].forEach(a => { const r = R.forTeen(a, s); if (!r.verified || !r.summary || /not re-checked/.test(r.summary)) bad.push(s + ' ' + a); });
        });
        return { bad, n: Object.keys(R.STATES).length };
      });
      assert.deepEqual(all.bad, [], 'states without rules: ' + all.bad.join(', '));
      assert.equal(all.n, 51, 'all 50 states and DC');
      await setTeen(p, 16, 'Ohio');
      const oh = await text(p, '#teen-state-rules-banner');
      assert.match(oh, /Age 16 · Ohio: no hour limits for most jobs at 16, but Ohio limits late-night work/);
      assert.match(oh, /no work after 11 p\.m\. before a school day/);
      assert.match(oh, /US DOL state child labor table \(July 15, 2025\)/);
      assert.doesNotMatch(oh, /not re-checked/);
      // Washington 15: the state's 16 h school week is stricter than the federal 18 h, so 16 h counts everywhere
      await setTeen(p, 15, 'WA');
      assert.match(await text(p, '#teen-state-rules-banner'), /Age 15 · Washington: outside school hours, up to 3 h on a school day and 16 h in a school week/);
      assert.match(await text(p, '#tw52-wl-rules'), /Legal weekly limit\s*16 h in a week when school is in session, 40 h when school is out/);
      assert.deepEqual(await p.evaluate(() => { const t = twWorkRules.weekTarget(); return [t.hours, t.kind]; }), [16, 'legal']);
      assert.match(await p.evaluate(() => twWorkRules.weekTarget().why), /Washington law limits 14- and 15-year-olds to 16 h/);
      // Pennsylvania 16: state limits for 16–17 (28 h school week) become the legal weekly limit
      await setTeen(p, 16, 'Pennsylvania');
      assert.match(await text(p, '#teen-state-rules-banner'), /up to 8 h on a school day and 28 h in a school week/);
      assert.deepEqual(await p.evaluate(() => { const t = twWorkRules.weekTarget(); return [t.hours, t.kind]; }), [25, 'goal']);
      await p.locator('#tw52-goal').selectOption('30');
      assert.deepEqual(await p.evaluate(() => { const t = twWorkRules.weekTarget(); return [t.hours, t.kind]; }), [28, 'legal']);
      // California 16: California's own Labor Commissioner figures (the DOL table's "3-18" for 16–17 doesn't match them)
      assert.deepEqual(await p.evaluate(() => { const r = twWorkRules.forTeen(16, 'CA'); return [r.day.school, r.day.out, r.week.school, r.sources.some(x => /California DLSE/.test(x.label))]; }), [4, 8, 48, true]);
      // Arkansas: the 16-year-old rules don't apply at 17
      assert.match(await p.evaluate(() => twWorkRules.forTeen(16, 'AR').summary), /10 hours in a row/);
      assert.match(await p.evaluate(() => twWorkRules.forTeen(17, 'AR').summary), /no hour limits for most jobs at 17 under federal or Arkansas law/);

      /* A linked parent's weekly limit reaches the teen; nobody else's does */
      await setTeen(p, 16, 'Vermont');
      await p.locator('#tw52-goal').selectOption('15');
      const lim = await p.evaluate(async () => {
        const u = currentUser, key = u.dataKey || u.email, db = (typeof _twCloudClient === 'function' && await _twCloudClient(3000)) || sbClient;
        const row = (pe, hours, name) => ({ email: pe, key: 'hour_limit:' + key, value: JSON.stringify({ v: 1, status: 'set', hours, teenKey: key, parentKey: pe, parentEmail: pe, parentName: name, at: new Date().toISOString() }) });
        await db.from('user_data').upsert([row('jordan.sample@example.com', 10, 'Jordan Sample'), row('stranger@example.com', 2, 'Not A Parent')], { onConflict: 'email,key' });
        const links = JSON.parse(localStorage.getItem('tw_parent_links') || '{}');
        links[String(u.email).toLowerCase()] = { status: 'approved', parents: ['jordan.sample@example.com'], parentName: 'Jordan Sample' };
        localStorage.setItem('tw_parent_links', JSON.stringify(links));
        await window._twParentHours.checkTeen();
        const t = twWorkRules.weekTarget();
        return { p: window.twParentHourLimit(), t: [t.hours, t.kind, t.label] };
      });
      assert.equal(lim.p && lim.p.hours, 10, 'linked parent limit not read (the stranger\'s 2 h must be ignored)');
      assert.deepEqual(lim.t, [10, 'parent', 'Weekly limit set by Jordan (not a law)']);
      await p.evaluate(() => { twWorkRules.renderWorkLogRules(); twMoneyRedraw(); });
      assert.match(await text(p, '#tw52-wl-rules'), /Parent's limit\s*10 h a week, set by Jordan\. A family rule, not a law\. Only Jordan can change it/);
      assert.match(await text(p, '#tw52-wl-rules'), /Jordan's 10 h limit is lower, so it's the one that counts/);
      assert.match(await text(p, '[data-mh-now]'), /10 h left of the 10 h weekly limit Jordan set\. It's a family rule, not a law\./);
      await p.evaluate(() => _showHourLimitModal('Sample job', 10, 10, twWorkRules.weekTarget()));
      const pm = await text(p, '#hour-limit-modal');
      assert.match(pm, /Your parent's weekly limit reached/); assert.match(pm, /Jordan set a 10-hour weekly limit for you/);
      await p.evaluate(() => document.getElementById('hour-limit-modal').remove());
      // the parent turns it off: the teen's goal counts again
      await p.evaluate(async () => {
        const u = currentUser, key = u.dataKey || u.email, db = (typeof _twCloudClient === 'function' && await _twCloudClient(3000)) || sbClient;
        await db.from('user_data').upsert({ email: 'jordan.sample@example.com', key: 'hour_limit:' + key, value: JSON.stringify({ v: 1, status: 'off', hours: null, teenKey: key, parentEmail: 'jordan.sample@example.com', at: new Date().toISOString() }) }, { onConflict: 'email,key' });
        await window._twParentHours.checkTeen();
      });
      assert.equal(await p.evaluate(() => window.twParentHourLimit()), null);
      assert.deepEqual(await p.evaluate(() => { const t = twWorkRules.weekTarget(); return [t.hours, t.kind]; }), [15, 'goal']);

      /* Hour-goal notice no longer claims a parent was told */
      await p.evaluate(() => _showHourLimitModal('Sample job', 10, 10, { kind: 'goal', hours: 10 }));
      const modal = await text(p, '#hour-limit-modal');
      assert.match(modal, /Weekly goal reached/); assert.match(modal, /not a law/); assert.doesNotMatch(modal, /parent has been notified/i);
      await p.evaluate(() => document.getElementById('hour-limit-modal').remove());

      /* Verification "check a job" grid uses the same rules */
      await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; }; set('tw-ver-age', '16'); set('tw-ver-state', 'VT'); window.callClaudeAI = () => Promise.resolve('stub'); return TW_Verify.runComplianceCheck(); });
      const grid = await text(p, '#tw-ver-law-grid');
      assert.match(grid, /Weekly hours\s*No legal limit for most jobs/); assert.match(grid, /Federal \+ Vermont · Nov 2, 2026/);
      assert.equal(await p.evaluate(() => browsableJobs.length + demoJobs.length), 0, 'teen practice account is not empty');

      /* Employer: one notice, landmark lookup never sticks, review never blocked */
      await enter(p, 'employer');
      assert(await noOverflow(p), tag + ' employer overflows');
      assert.equal(await p.locator('.page.active #tw49-demo-banner').count(), 1);
      assert.equal(await p.locator('.page.active .tw-welcome-note').count(), 0, 'practice notice repeated');
      const fillTo = async (city) => {
        await p.evaluate(() => switchEmployerTab('etab-post', 'edtab-post'));
        await p.locator('#emp-title').fill('Sample garden watering'); await p.locator('#emp-type').selectOption('yard work');
        await p.locator('#emp-pay').fill('15'); await p.locator('#emp-desc').fill('Water garden plants with a watering can.');
        await p.getByRole('button', { name: 'Continue', exact: true }).click();
        await p.locator('#emp-state').selectOption('Vermont'); await p.locator('#emp-city').fill(city); await p.locator('#emp-city').blur();
      };
      const status = () => p.evaluate(() => { const s = document.getElementById('emp-landmark-status'); return { state: s.dataset.state, text: s.textContent }; });
      // success
      await fillTo('Burlington');
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'ok');
      assert.match((await status()).text, /2 landmarks near Burlington, Vermont/);
      assert.equal(await p.locator('#emp-landmark option').count(), 3);
      assert.match(await text(p, '.twlm-pick'), /Your address is never shown/);
      // failure: says so at once, offers Try again, and Try again recovers
      overpass.mode = 'fail';
      await p.locator('#emp-city').fill('Montpelier'); await p.locator('#emp-city').blur();
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'failed', null, { timeout: 12000 });
      assert.match((await status()).text, /couldn’t load right now\. You can continue without one/);
      overpass.mode = 'ok';
      await p.locator('#emp-landmark-status button', { hasText: 'Try again' }).click();
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'ok', null, { timeout: 12000 });
      // slow (the map service never answers): after the wait it offers to continue without one, and Try again
      overpass.mode = 'slow';
      await p.locator('#emp-city').fill('Rutland'); await p.locator('#emp-city').blur();
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'loading');
      assert.equal(await p.locator('#emp-landmark').inputValue(), '');
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'slow', null, { timeout: 12000 });
      assert.match((await status()).text, /taking too long\. You can continue without one: teens will see the town, never your address/);
      // the review step is not blocked and shows no loading text
      await p.getByRole('button', { name: 'Continue', exact: true }).click();
      await p.locator('#emp-min-age').fill('14'); await p.locator('#emp-max-hours').fill('3');
      await p.getByRole('button', { name: 'Continue', exact: true }).click();
      const preview = await text(p, '#tw-post-preview');
      assert.match(preview, /Nearby landmark\s*No landmark \(teens see the town only\)/);
      assert.doesNotMatch(preview, /Finding landmarks/);
      assert(await p.getByRole('button', { name: 'Post Job', exact: true }).isVisible());   // shown, never pressed
      assert(await noOverflow(p), tag + ' review overflows');
      // Try again doesn't wait behind the stuck request
      await p.getByRole('button', { name: 'Back', exact: true }).click(); await p.getByRole('button', { name: 'Back', exact: true }).click();
      overpass.mode = 'ok';
      await p.locator('#emp-landmark-status button', { hasText: 'Try again' }).click();
      await p.waitForFunction(() => document.getElementById('emp-landmark-status').dataset.state === 'ok', null, { timeout: 5000 });

      /* Tour: offered, not opened; Start and Skip are remembered for this tab */
      assert.equal(await p.locator('#tw34-tour').count(), 0);
      await p.locator('#tw49-demo-banner button', { hasText: 'Skip tour' }).click();
      assert.equal(await p.locator('.tw52-tour-ask').count(), 0);
      await enter(p, 'parent');
      assert.equal(await p.locator('#tw34-tour').count(), 0);
      assert.equal(await p.locator('.tw52-tour-ask').count(), 0, 'skip was not remembered');
      assert(await noOverflow(p), tag + ' parent overflows');

      /* Parent: the Weekly Hour Limit is saved for each linked teen */
      await p.waitForFunction(() => { const s = document.getElementById('ctrl-max-hours'); return s && s.__tw52; });
      assert.equal(await p.locator('#ctrl-max-hours').inputValue(), '999', 'a parent who never chose a limit should see "No limit"');
      assert.match(await p.locator('#ctrl-max-hours option[value="999"]').textContent(), /No limit \(state law only\)/);
      const saved = await p.evaluate(async () => {
        window._twRealData.linkedTeens = () => [{ key: 'sam.sample@example.com', email: 'sam.sample@example.com', name: 'Sam Sample' }];
        await window._twParentHours.choose('8');
        const db = (typeof _twCloudClient === 'function' && await _twCloudClient(3000)) || sbClient, me = currentUser.dataKey || currentUser.email;
        const r = await db.from('user_data').select('email,key,value').eq('email', me).eq('key', 'hour_limit:sam.sample@example.com');
        return r.data && r.data[0] ? JSON.parse(r.data[0].value) : null;
      });
      assert(saved && saved.status === 'set' && saved.hours === 8 && saved.teenKey === 'sam.sample@example.com', 'parent limit not saved for the teen');
      assert.equal(await p.locator('#ctrl-max-hours').inputValue(), '8');
      assert.match(await text(p, '#page-parent'), /Applies to your linked teens\. They see it in Work Log and can't change it/);
      assert.match(await text(p, '#tw49-demo-banner'), /See a sample scenario/);
      await p.evaluate(() => sessionStorage.removeItem('tw52_tour_answer'));
      await p.waitForTimeout(900);
      await p.locator('#tw49-demo-banner button', { hasText: 'Take the 6-step tour' }).click();
      assert.equal(await p.locator('#tw34-tour').count(), 1);
      await p.locator('#tw34-skip').click();

      /* Sample scenario from the parent practice account: fake, resettable, never stored or sent */
      const reqBefore = outside.length;
      await p.locator('#tw49-demo-banner button', { hasText: 'See a sample scenario' }).click();
      const sd = p.locator('#tw52-sample');
      assert(await sd.isVisible());
      assert.match(await text(p, '#tw52-sample'), /Made-up people and a made-up job\. Nothing here is saved, sent or shown to anyone/);
      assert.match(await text(p, '#tw52-view'), /Nothing waiting/);          // opens on the parent's view
      await sd.getByRole('tab', { name: /Teen/ }).click();
      await sd.getByRole('button', { name: 'Apply (needs parent OK)' }).click();
      assert.match(await text(p, '#tw52-view'), /Waiting for your parent’s OK/);
      await sd.getByRole('tab', { name: /Employer/ }).click();
      assert.match(await text(p, '#tw52-view'), /a parent hasn’t approved it yet, so it isn’t shown to you/);
      await sd.getByRole('tab', { name: /Parent/ }).click();
      assert.match(await text(p, '#tw52-view'), /Work rules check: 1\.5 h a week on Saturday mornings fits the 18 h school-week limit/);
      await sd.getByRole('button', { name: 'Approve', exact: true }).click();
      await sd.getByRole('button', { name: /Show the employer/ }).click();
      await sd.getByRole('button', { name: 'Hire', exact: true }).click();
      assert.deepEqual(await p.evaluate(() => window._twSampleScenario.state), { stage: 'hired', view: 'employer' });
      assert.equal(await p.locator('.tw52-step.done').count(), 4);
      assert(await p.evaluate(() => { const s = document.querySelector('#tw52-sample .tw52-sheet'); return s.scrollWidth <= s.clientWidth; }), tag + ' sample sheet overflows');
      await sd.getByRole('button', { name: /Start over/ }).click();
      assert.deepEqual(await p.evaluate(() => window._twSampleScenario.state), { stage: 'browse', view: 'teen' });
      await p.keyboard.press('Escape');
      assert.equal(await p.locator('#tw52-sample').count(), 0);
      assert.equal(outside.length, reqBefore, 'the sample scenario made a network request');
      assert.equal(await p.evaluate(() => demoJobs.length + demoApplicants.length + employerPostedJobs.length), 0, 'sample data leaked into the practice account');

      /* Leaving the practice account puts this browser's storage back */
      await p.evaluate(() => gotoPage('landing')); await p.waitForTimeout(900);
      assert.equal(await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => k !== 'tw_landmarks_v1' && k !== 'tw_geo_cache_v1').sort())), storeBefore, 'practice account left storage behind');
      assert.deepEqual(errors, []);
      console.log('PASS ' + tag + ': work rules (all 51, VT/OH/WA/PA/CA/AR), goal vs law vs parent limit, parent limit saved, verify grid, landmark ok/slow/fail/retry + review, one notice, tour choice, sample scenario + reset, storage restored');
      await context.close();
    }
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
