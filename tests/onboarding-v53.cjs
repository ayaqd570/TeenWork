/* Offline checks for v53 (Aya's Nov 2 report, items 5–10): empty-feed next steps, First Job Checklist
   (required vs optional), Messages dialog accessibility + "Something feels wrong", profile photo note,
   verification statuses, demo buttons in the first phone screen, one practice notice.
   Practice accounts only. No real accounts, network calls, alerts sent or posts.
   Run: node tests/onboarding-v53.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8024, ROOT = 'http://127.0.0.1:' + PORT + '/';
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1440, height: 1000 }];

async function open(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const outside = [];
  await context.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === '127.0.0.1') return r.continue(); outside.push(u.hostname); return r.abort(); });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twTeenSteps && window._twOnboardingV53);
  await p.waitForTimeout(400);
  return { context, p, errors, outside };
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const text = (p, sel) => p.locator(sel).first().evaluate(el => (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
const active = (p, id) => p.evaluate(id => !!document.getElementById(id)?.classList.contains('active'), id);
const focusedIn = (p, sel) => p.evaluate(sel => { const b = document.querySelector(sel); return !!b && b.contains(document.activeElement) && document.activeElement !== document.body; }, sel);
async function enter(p, role) {
  await p.evaluate(r => _directDemo(r), role);
  await p.waitForTimeout(2600);
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => document.getElementById('featpack-install')?.classList.remove('open'));
}
const tab = (p, id) => p.evaluate(id => switchDashTab(document.querySelector('[data-twm="' + id + '"]'), id), id).then(() => p.waitForTimeout(500));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    /* 10. Home page: the three no-signup demos are in the first screen on phones, at every phone width */
    for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 780 }, { width: 320, height: 640 }, { width: 1440, height: 1000 }]) {
      const { context, p, errors } = await open(browser, viewport);
      const w = viewport.width;
      assert(await noOverflow(p), w + ': homepage overflows');
      const demos = await p.evaluate(() => [...document.querySelectorAll('#tw48-demo button[onclick^="_directDemo"]')].map(b => { const r = b.getBoundingClientRect(); return { name: b.getAttribute('aria-label'), text: b.innerText.trim(), top: r.top, bottom: r.bottom, h: r.height, left: r.left, right: r.right }; }));
      assert.deepEqual(demos.map(d => d.name), ['Teen demo', 'Parent demo', 'Employer demo']);
      assert(demos.every(d => d.h >= 44 && d.left >= 0 && d.right <= w), w + ': a demo button is too small or off screen');
      if (w <= 600) {
        if (w === 390) assert(demos.every(d => d.bottom <= viewport.height), w + ': demo buttons start below the first screen (' + demos.map(d => Math.round(d.bottom)).join(',') + ')');
        if (w >= 360) assert(demos.every(d => d.top === demos[0].top), w + ': demo buttons are not in one row');
        assert.deepEqual(demos.map(d => d.text), ['Teen', 'Parent', 'Employer']);
      } else assert.deepEqual(demos.map(d => d.text), ['Teen Demo', 'Parent Demo', 'Employer Demo']);
      // Sign Up stays first, the trust line is still there with the same words.
      const order = await p.evaluate(() => { const y = s => document.querySelector(s).getBoundingClientRect().top; const su = [...document.querySelectorAll('#tw48-hero button')].find(b => /Sign Up Free/.test(b.textContent)); return { signup: su.getBoundingClientRect().top, demo: y('#tw48-demo'), trust: y('#tw51-trust') }; });
      assert(order.signup < order.demo, w + ': demos above Sign Up');
      if (w <= 600) assert(order.demo < order.trust, w + ': trust line still pushes the demos down');
      else assert(order.trust < order.demo, w + ': desktop order changed');
      assert.equal(await text(p, '#tw51-trust'), 'Parents approve every application · Free · No cut of pay');
      assert.deepEqual(errors, []);
      await context.close();
    }

    for (const viewport of VIEWPORTS) {
      const tag = viewport.width + 'px', phone = viewport.width < 769;
      const { context, p, errors, outside } = await open(browser, viewport);
      const storeBefore = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()));

      /* One practice notice in the Teen and Parent demos, no extra welcome notes (PR #15) */
      for (const role of ['parent', 'teen']) {
        await enter(p, role);
        await p.waitForTimeout(2500);
        const n = await p.evaluate(() => ({ banners: [...document.querySelectorAll('#tw49-demo-banner, #tw48-demo-banner')].filter(e => e.getClientRects().length).length,
          notes: [...document.querySelectorAll('.tw-welcome-note')].filter(e => e.getClientRects().length).length,
          toast: (() => { const t = document.getElementById('global-toast'); return t && getComputedStyle(t).opacity !== '0' && /demo|practice|sample/i.test(t.textContent) ? t.textContent : ''; })() }));
        assert.deepEqual(n, { banners: 1, notes: 0, toast: '' }, tag + ' ' + role + ' practice notices repeat: ' + JSON.stringify(n));
      }

      /* 5. Empty job feed: next steps with real buttons */
      assert(await noOverflow(p), tag + ' teen overflows');
      await p.locator('#tw53-next').waitFor();
      const next = await text(p, '#tw53-next');
      assert.match(next, /While you wait for jobs/);
      assert.match(next, /Complete your profile 60% complete\. Still to add: a short bio, 2 or more skills\./);
      assert.match(next, /Workplace Safety Basics Recommended first lesson · 0 of 12 lessons done/);
      assert.match(next, /Link a parent Skipped in this practice account\./);
      assert.match(next, /Job-match alerts On: in the app and by email/);
      assert.deepEqual(await p.locator('#tw53-next [data-tw53-act]').evaluateAll(b => b.map(x => x.textContent.trim())),
        ['Complete profile', 'Start lesson', 'See how linking works', 'Alert settings', 'See the First Job Checklist']);
      assert(await p.locator('#tw53-next .tw53-btn').evaluateAll(b => b.every(x => x.getBoundingClientRect().height >= 44)), tag + ' next-step buttons under 44px');
      assert.equal(await p.evaluate(() => computeProfileCompletion()), 60);

      await p.locator('#tw53-next [data-tw53-act="profile"]').click(); await p.waitForTimeout(700);
      assert(await active(p, 'ttab-resume'), tag + ' Complete profile did not open the profile');
      assert(await p.evaluate(() => ['profile-bio-input', 'skills-input'].includes(document.activeElement.id)), tag + ' profile field not focused');
      await tab(p, 'ttab-browse');
      await p.locator('#tw53-next [data-tw53-act="safety"]').click(); await p.waitForTimeout(400);
      assert.match(await text(p, '#tw34l'), /Workplace Safety Basics/);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      if (await p.locator('#tw34l').count()) await p.evaluate(() => document.getElementById('tw34l').remove());
      await p.locator('#tw53-next [data-tw53-act="link"]').click(); await p.waitForTimeout(300);
      assert(await p.locator('#tw35-modal').isVisible(), tag + ' link window did not open');
      await p.evaluate(() => twCloseLinkModal());
      await p.locator('#tw53-next [data-tw53-act="alerts"]').click(); await p.waitForTimeout(800);
      assert(await active(p, 'ttab-resume'));
      assert.equal(await p.evaluate(() => document.activeElement.id), 'ctrl-inapp-match', tag + ' alert setting not focused');
      await tab(p, 'ttab-browse');
      await p.locator('#tw53-next [data-tw53-act="checklist"]').click(); await p.waitForTimeout(600);
      assert(await active(p, 'ttab-firstjob'), tag + ' checklist link');

      /* Profile % counts bio and skills, never a photo */
      await p.evaluate(() => { userActivity.bio = 'I like dogs and yard work and I show up on time.'; currentUser.skills = ['pet care', 'yard work']; });
      assert.equal(await p.evaluate(() => computeProfileCompletion()), 100);
      await p.evaluate(() => { userActivity.bio = 'Hardworking 16-year-old from Burlington, Vermont.'; });
      assert.equal(await p.evaluate(() => computeProfileCompletion()), 80, 'the old sample bio counted');
      await p.evaluate(() => { userActivity.bio = ''; currentUser.skills = []; });

      /* Lessons: Workplace Safety Basics is first and marked "Start here" */
      await tab(p, 'ttab-lessons'); await p.waitForTimeout(300);
      assert.match(await text(p, '#lessons-grid .lesson-card:first-child'), /Start here.*Workplace Safety Basics/i);

      /* 6. First Job Checklist: required gates first, worked out, optional prep separate, items link to screens */
      await tab(p, 'ttab-firstjob');
      const fj = await p.evaluate(() => {
        const g = document.getElementById('tw53-fj-gates'), prog = document.getElementById('firstjob-bar').closest('div[style*="border-radius:14px"]');
        return { first: !!(g && prog && (g.compareDocumentPosition(prog) & Node.DOCUMENT_POSITION_FOLLOWING)), gates: g.querySelectorAll('.tw53-gate').length,
          text: g.innerText.replace(/\s+/g, ' '), heads: [...document.querySelectorAll('#firstjob-sections .panel-head h2')].map(h => h.textContent.trim()),
          ticks: document.querySelectorAll('#firstjob-sections .tw53-fj-check[role="checkbox"]').length, badge: document.getElementById('firstjob-progress-badge').textContent,
          all: document.getElementById('ttab-firstjob').textContent };
      });
      assert(fj.first, tag + ' required box is not above the progress card');
      assert.equal(fj.gates, 3);
      assert.match(fj.text, /Required before you can apply/);
      assert.match(fj.text, /This practice account skips the parent steps/);
      assert.match(fj.text, /1\. Link a parent or guardian Skipped in this practice account/);
      assert.match(fj.text, /2\. Your linked parent agrees, from their own account Skipped in this practice account/);
      assert.match(fj.text, /3\. A work permit, only if your state or the employer needs one Not needed at 16 in Vermont/);
      assert.match(fj.text, /After you apply, your parent approves each application before the employer sees it\./);
      assert.deepEqual(fj.heads, ['💡 Helpful prep (optional)', '🤝 Before Your First Day', '⭐ During the Job', '🏆 After the Job']);
      assert.equal(fj.ticks, 17); assert.equal(fj.badge, '0 / 17 tips done');
      assert.doesNotMatch(fj.all, /Ask a parent or guardian to approve your account|Before You Apply|professional photo/);
      assert.match(fj.all, /None of these are needed to apply/);
      const box = p.locator('.tw53-fj-check').first();
      await box.focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150);
      assert.equal(await p.locator('.tw53-fj-check').first().getAttribute('aria-checked'), 'true', tag + ' keyboard tick');
      assert.equal(await text(p, '#firstjob-progress-badge'), '1 / 17 tips done');
      assert(await p.evaluate(() => document.activeElement.classList.contains('tw53-fj-check')), 'focus lost after ticking');
      await p.keyboard.press('Space'); await p.waitForTimeout(150);
      assert.equal(await text(p, '#firstjob-progress-badge'), '0 / 17 tips done');
      await p.locator('#firstjob-sections [data-tw53-act="worklog"]').click(); await p.waitForTimeout(500);
      assert(await active(p, 'ttab-worklog'), tag + ' Work Log link');

      /* The gates for a teen who isn't in a practice account (the rules, not the screen) */
      const g = await p.evaluate(() => {
        const d = new Date(); d.setFullYear(d.getFullYear() - 15); d.setMonth(d.getMonth() - 2);
        const base = { type: 'teen', email: 'gate.check@example.org', name: 'Gate Check', dob: d.toISOString().slice(0, 10), age: 15, state: 'Pennsylvania', city: 'Erie' };
        const a = twTeenSteps.gates(base), b = twTeenSteps.gates(Object.assign({}, base, { parentLinked: { status: 'approved', parentName: 'Robin' } }));
        const vt = twTeenSteps.gates(Object.assign({}, base, { state: 'Vermont' }));
        return { a: a.list.map(s => s.state + ':' + s.status), aok: a.ok, b: b.list.map(s => s.state + ':' + s.status), vt: vt.list[2].state + ':' + vt.list[2].status,
          s3locked: twPermitStepStatus(false, base), s3open: twPermitStepStatus(true, base), s3vt: twPermitStepStatus(true, Object.assign({}, base, { state: 'Vermont' })) };
      });
      assert.deepEqual(g.a, ['todo:Not linked yet', 'todo:After your parent is linked', 'todo:Needed at 15 in Pennsylvania']);
      assert.equal(g.aok, false);
      assert.deepEqual(g.b, ['done:Linked to Robin', 'waiting:Waiting for your parent to agree', 'todo:Needed at 15 in Pennsylvania']);
      assert.equal(g.vt, 'na:Not needed at 15 in Vermont');
      assert.deepEqual(g.s3locked, { kind: 'locked', label: '🔒 After parent consent' });
      assert.deepEqual(g.s3open, { kind: 'active', label: 'Needed: add your permit' });
      assert.deepEqual(g.s3vt, { kind: 'done', label: '✓ Not needed at 15 in Vermont' });

      /* 8. Profile photo: optional, who sees it, default avatar, no fake upload button */
      await tab(p, 'ttab-resume');
      const photo = await text(p, '.tw53-photo');
      assert.match(photo, /You don't need a photo\. You can apply for jobs/);
      assert.match(photo, /Who can see it: photo upload isn't turned on yet, so nobody sees a photo of you/);
      assert.match(photo, /doesn't show your school name, your house or street/);
      assert.equal(await text(p, '#tw53-avatar'), 'DT');
      assert.equal(await p.locator('#ttab-resume button', { hasText: 'Upload Photo' }).count(), 0);
      assert.doesNotMatch(await p.evaluate(() => document.getElementById('ttab-resume').innerHTML), /would open file picker in production/);

      /* 7. Messages dialog */
      const chatBtn = phone ? '#twm-bottom [data-twm="chat"], #twm-bottom button:has-text("Chat")' : '#twm-side [data-twm="chat"], #twm-side button:has-text("Messages")';
      const opener = p.locator(chatBtn).first();
      await opener.click(); await p.waitForTimeout(400);
      assert(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')), tag + ' Messages did not open from the menu');
      const dlg = await p.evaluate(() => { const b = document.querySelector('#msgModal .msg-modal'); return { role: b.getAttribute('role'), modal: b.getAttribute('aria-modal'), label: b.getAttribute('aria-label') }; });
      assert.deepEqual(dlg, { role: 'dialog', modal: 'true', label: 'Messages' });
      assert(await focusedIn(p, '#msgModal') || await p.evaluate(() => document.activeElement === document.querySelector('#msgModal .msg-modal')), tag + ' focus did not move into Messages');
      const close = p.getByRole('button', { name: 'Close messages' });
      assert(await close.isVisible()); assert.match(await close.innerText(), /Close/);
      const sos = p.locator('#tw53-msg-sos');
      const geo = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const s = r('#tw53-msg-sos'), c = r('#tw53-msg-close'), m = r('#msgModal .msg-modal');
        return { inView: s.top >= 0 && s.bottom <= innerHeight && s.left >= 0 && s.right <= innerWidth && c.right <= innerWidth && c.top >= 0, inside: s.top >= m.top && c.right <= m.right + 1, apart: s.right <= c.left, h: Math.min(s.height, c.height),
          fab: getComputedStyle(document.getElementById('featpack-emergency')).display, top: document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2)?.closest('#tw53-msg-sos') !== null }; });
      assert(geo.h >= 44, tag + ' Close / Something feels wrong under 44px');
      delete geo.h;
      assert.deepEqual(geo, { inView: true, inside: true, apart: true, fab: 'none', top: true }, tag + ' emergency/close placement ' + JSON.stringify(geo));
      assert.equal(await sos.innerText(), '⚠️ Something feels wrong');
      // Tab stays inside, both ways
      for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); assert(await focusedIn(p, '#msgModal .msg-modal'), tag + ' Tab left Messages at step ' + i); }
      await sos.focus(); await p.keyboard.press('Shift+Tab');
      assert(await focusedIn(p, '#msgModal .msg-modal'), tag + ' Shift+Tab left Messages');
      // Escape closes even while typing in the search box, and focus goes back to the menu button
      await p.locator('#msg-search-input').focus();
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      assert.equal(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')), false, tag + ' Escape did not close Messages');
      assert(await p.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !!a.closest('#twm-bottom, #twm-side'); }), tag + ' focus did not return to the menu');
      assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('featpack-emergency')).display), 'none');
      // The Close button closes too; with a chat open the old ✕ is gone and Send isn't covered
      await p.evaluate(() => openMsgModal('Sample Employer', 'employer')); await p.waitForTimeout(400);
      assert.equal(await p.locator('#msgModal .msg-header-close').isVisible(), false);
      assert(await p.evaluate(() => { const b = document.querySelector('#msg-main-area .msg-send-btn').getBoundingClientRect(); return b.bottom <= innerHeight && document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('.msg-send-btn') !== null; }), tag + ' Send is covered');
      assert(await noOverflow(p), tag + ' Messages overflows');
      // "Something feels wrong" opens on top (it used to stay hidden), focus in the note, Escape closes only it
      const reqBefore = outside.length;
      await sos.click(); await p.waitForTimeout(250);
      const alertWin = await p.evaluate(() => { const t = document.getElementById('feels-wrong-note').getBoundingClientRect(); return { shown: getComputedStyle(document.getElementById('feelsWrongModal')).display, onTop: document.elementFromPoint(t.left + 10, t.top + 10)?.id, focus: document.activeElement.id }; });
      assert.deepEqual(alertWin, { shown: 'flex', onTop: 'feels-wrong-note', focus: 'feels-wrong-note' }, tag + ' alert window ' + JSON.stringify(alertWin));
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('feelsWrongModal')).display), 'none');
      assert(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')), tag + ' Escape closed Messages too');
      assert.equal(await p.evaluate(() => document.activeElement.id), 'tw53-msg-sos', tag + ' focus did not come back to the button');
      await sos.click(); await p.waitForTimeout(150);
      await p.locator('#feelsWrongModal button', { hasText: 'Cancel' }).click(); await p.waitForTimeout(150);
      assert.equal(outside.length, reqBefore, 'opening the alert window sent something');
      await close.click(); await p.waitForTimeout(200);
      assert.equal(await p.locator('#msgModal').evaluate(el => el.classList.contains('open')), false, tag + ' Close button');

      /* 9. Verification: precise permit status, the screening note once, no fourth "Unavailable" tier */
      await p.evaluate(() => showVerifyPage()); await p.waitForTimeout(1200);
      const v = await p.evaluate(() => ({
        s3: document.querySelector('#tw-ver-step-3 .tw-ver-step-status').textContent.trim(),
        d3: document.querySelector('#tw-ver-step-3 .tw-ver-step-desc').textContent.trim(),
        s2: document.getElementById('tw-ver-s2-status').textContent.trim(),
        prog: document.getElementById('tw-ver-role-progress').textContent.trim(),
        tiers: [...document.querySelectorAll('#page-verify .tw-ver-tier-name')].filter(e => e.getClientRects().length).map(e => e.textContent.trim()),
        page: document.getElementById('page-verify').textContent.replace(/\s+/g, ' '),
        cap: document.getElementById('tw53-badge-cap').textContent }));
      assert.equal(v.s3, '✓ Not needed at 16 in Vermont');
      assert.match(v.d3, /You don't need a work permit for most jobs\. An employer can still ask for one/);
      assert.equal(v.s2, 'Skipped in practice');
      assert.equal(v.prog, '2 of 3 steps done');
      assert.deepEqual(v.tiers, ['Basic', 'Parent consent', 'Permit status']);
      assert.equal(v.page.split('ID and background checks are not offered').length - 1, 1);
      assert.doesNotMatch(v.page, /Screening is not available|\bReady\b|Unavailable|Optional \(tester\)|Tester account/);
      assert.match(v.page, /does not check ID documents or run criminal background checks on anyone: teens, parents or employers/);
      assert.match(v.page, /Practice account: parent steps are skipped/);
      assert.match(v.cap, /At 16 in Vermont you don't need the Work Permit badge, unless an employer asks for a permit/);
      assert(await noOverflow(p), tag + ' verification overflows');

      /* Leaving the practice account leaves nothing behind */
      await p.evaluate(() => gotoPage('landing')); await p.waitForTimeout(900);
      assert.equal(await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => k !== 'tw_landmarks_v1' && k !== 'tw_geo_cache_v1').sort())), storeBefore, 'practice account left storage behind');
      assert.deepEqual(outside.filter(h => !/fonts\.(googleapis|gstatic)\.com|unpkg|jsdelivr|cdnjs|emailjs|supabase/.test(h)), [], 'unexpected outside requests: ' + outside.join(','));
      assert.deepEqual(errors, []);
      console.log('PASS ' + tag + ': demos in first phone screen, one practice notice, empty-feed next steps + buttons, profile % (bio/skills, no photo), safety lesson first, checklist gates vs optional + links + keyboard ticks, gate rules (PA 15 / VT 15 / linked), photo note, Messages dialog (role, Close, focus in/out, Tab trap, Escape while typing), alert window on top, verification statuses + one screening note');
      await context.close();
    }
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
