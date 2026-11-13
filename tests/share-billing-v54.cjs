/* Offline checks for v54: the Share TeenWork window, share links and the "joined" count, the share box in
   emails, team emails through EmailJS, and Pro checkout with Stripe (before and after Paid Launch).
   Nothing real is called: Supabase, the billing / send-email functions and Stripe's pages are faked, and
   every other outside request is blocked. Run: node tests/share-billing-v54.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8031, ROOT = 'http://127.0.0.1:' + PORT + '/';
const FN = 'https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/';

async function open(browser, viewport, query = '', fake = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ROOT.slice(0, -1) });
  const calls = [];
  const billing = Object.assign({ ping: { ok: true, configured: true, mode: 'test', prices: { teen_pro: true, employer_pro: true }, webhook: true }, status: { ok: true, plan: 'free', status: 'none', has_billing: false } }, fake);
  await context.route('**/*', async r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname === '127.0.0.1') return r.continue();
    if (req.url().startsWith(FN)) {
      const fn = u.pathname.split('/').pop();
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      calls.push({ fn, body, auth: req.headers()['authorization'] || '' });
      if (req.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: 'ok' });
      const json = v => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(v) });
      if (fn === 'billing') {
        const a = body && body.action;
        if (a === 'ping') return json(billing.ping);
        if (a === 'status') return json(typeof billing.status === 'function' ? billing.status() : billing.status);
        if (a === 'checkout') return json({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
        if (a === 'portal') return json({ ok: true, url: 'https://billing.stripe.com/p/session/test_1' });
      }
      if (fn === 'send-email') return json(body && body.ping ? { ok: true, configured: true, testing: false } : (fake.sendEmail ? fake.sendEmail(body) : { ok: true, id: 'em_1' }));
      return json({ ok: false });
    }
    if (u.hostname === 'checkout.stripe.com' || u.hostname === 'billing.stripe.com') return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stripe</title>' + u.hostname });
    return r.abort();
  });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT + query, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twShare && window.twBilling && window.twPlan);
  await p.waitForTimeout(500);
  return { context, p, errors, calls };
}
// A real (not practice) account on screen, with a fake Supabase sign-in.
async function member(p, type, email) {
  await p.evaluate(([type, email]) => {
    const u = { name: 'Sam Test', email, type, emailVerified: true };
    try { currentUser = u; } catch (e) {} window.currentUser = u;
    const chain = { select() { return chain; }, eq() { return chain; }, in() { return chain; }, limit() { return chain; }, upsert() { return Promise.resolve({ error: null }); }, then(f) { return Promise.resolve({ data: [], error: null, count: 0 }).then(f); } };
    const fake = {
      auth: { getSession: async () => ({ data: { session: { access_token: 'tok.en.' + type, user: { email: window.currentUser.email } } } }), refreshSession: async () => ({ data: {} }) },
      rpc: async (fn, args) => (fn === 'tw_referral_count' ? { data: args.p_code === window.twShareCode() ? 2 : 0, error: null } : { data: null, error: { message: 'no' } }),
      from: () => chain,
    };
    window._twCloudClient = async () => fake;
  }, [type, email]);
}
const sheetLink = p => p.evaluate(() => document.querySelector('#tw54-share input')?.value || null);
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const paid = (p, on) => p.evaluate(on => { const s = JSON.parse(localStorage.getItem('tw_plan_settings') || '{}'); s.launchPaid = on; localStorage.setItem('tw_plan_settings', JSON.stringify(s)); }, on);

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const tag = viewport.width + 'px', phone = viewport.width < 769;

      /* 1. Visitors: arriving with a share link, the home page share band, the share window */
      {
        const { context, p, errors } = await open(browser, viewport, '?ref=abcd2345');
        assert.equal(await p.evaluate(() => location.search), '', tag + ': ?ref stays in the address');
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw_ref_from')).code), 'ABCD2345');
        const band = p.locator('#tw54-share-band button');
        await band.scrollIntoViewIfNeeded();
        const bb = await band.boundingBox();
        assert(bb.height >= 44 && bb.x >= 0 && bb.x + bb.width <= viewport.width, tag + ': share band button too small or off screen');
        assert.equal(await p.locator('.landing-footer button', { hasText: 'Share TeenWork' }).count(), 1, tag + ': no footer link');
        await band.click();
        await p.waitForSelector('#tw54-share');
        assert.equal(await sheetLink(p), 'https://teenwork.ayaqd.com/', tag + ': a visitor gets the plain link');
        assert.equal(await p.locator('#tw54-count').count(), 0);
        const btns = await p.evaluate(() => [...document.querySelectorAll('#tw54-share .tw54-btn, #tw54-share .tw54-copy, #tw54-share .tw54-x')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, l: r.left, r: r.right, href: b.getAttribute('href') || '' }; }));
        assert(btns.every(b => b.h >= 44 && b.l >= 0 && b.r <= viewport.width), tag + ': share buttons ' + JSON.stringify(btns));
        assert(btns.some(b => /^sms:/.test(b.href)) && btns.some(b => /^mailto:/.test(b.href)) && btns.some(b => b.href.startsWith('https://wa.me/')) && btns.some(b => b.href.startsWith('https://www.facebook.com/sharer/')));
        assert(btns.every(b => !/free month|premium month/i.test(decodeURIComponent(b.href))));
        assert(await noOverflow(p), tag + ': share window overflows');
        assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.className), 'tw54-copy', tag + ': focus not in the window');
        await p.click('#tw54-share .tw54-copy');
        await p.waitForTimeout(200);
        assert.equal(await p.evaluate(() => navigator.clipboard.readText()), 'https://teenwork.ayaqd.com/');
        await p.keyboard.press('Escape');
        assert.equal(await p.locator('#tw54-share').count(), 0, tag + ': Escape did not close');
        assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.textContent.trim()), '📣 Share TeenWork', tag + ': focus not returned');
        // the old "Refer a Friend" spots open the same window, with no free-month promise anywhere
        await p.evaluate(() => openReferral());
        await p.waitForSelector('#tw54-share'); await p.keyboard.press('Escape');
        assert(!/free month|Premium month/i.test(await p.evaluate(() => document.body.innerHTML)), tag + ': a free-month promise is still on the page');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        const { context, p, errors } = await open(browser, viewport, '?share=1');
        await p.waitForSelector('#tw54-share', { timeout: 4000 });   // opened from an email's Share button
        assert.equal(await sheetLink(p), 'https://teenwork.ayaqd.com/');
        assert.equal(await p.evaluate(() => localStorage.getItem('tw_ref_from')), null, 'opening ?share must not count as a referral');
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 2. Practice accounts: Share in the dashboard menu, plain link, nothing saved */
      {
        const { context, p, errors } = await open(browser, viewport);
        for (const role of ['teen', 'employer']) {
          await p.evaluate(r => _directDemo(r), role);
          await p.waitForTimeout(2600);
          if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
          if (phone) {
            await p.click('#twm-bottom [data-twm="menu"]');
            await p.waitForSelector('#twm-sheet [data-twm="share"]');
            const b = await p.locator('#twm-sheet [data-twm="share"]').boundingBox();
            assert(b.height >= 40 && b.x >= 0 && b.x + b.width <= viewport.width, tag + ' ' + role + ': menu Share item ' + JSON.stringify(b));
            await p.click('#twm-sheet [data-twm="share"]');
          } else {
            await p.click('#twm-side [data-twm="share"]');
          }
          await p.waitForSelector('#tw54-share');
          assert.equal(await sheetLink(p), 'https://teenwork.ayaqd.com/', tag + ' ' + role + ': practice account got a personal link');
          assert.equal(await p.evaluate(() => window.twShareCode()), '');
          await p.keyboard.press('Escape');
          await p.evaluate(() => { try { doLogout(); } catch (e) {} });
          await p.waitForTimeout(700);
        }
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 3. Members: personal link, joined count, referral at sign-up, email share box, email routing */
      {
        const { context, p, errors, calls } = await open(browser, viewport);
        await member(p, 'teen', 'sam@example.com');
        const code = await p.evaluate(() => window.twShareCode());
        assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw_sam_example_com_ref_code'))), code, 'code not saved on the account');
        assert.equal(await p.evaluate(() => window.twShareCode()), code, 'code changes');
        await p.evaluate(() => twShare({ source: 'test', sheet: true }));
        await p.waitForSelector('#tw54-share');
        assert.equal(await sheetLink(p), 'https://teenwork.ayaqd.com/?ref=' + code);
        await p.waitForFunction(() => /2 people joined/.test(document.getElementById('tw54-count')?.textContent || ''));
        await p.keyboard.press('Escape');
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw_sam_example_com_share_stats')).open), 1);

        // signing up after opening someone's link records it once (never your own code)
        await member(p, 'teen', 'newbie@example.com');
        await p.evaluate(() => localStorage.setItem('tw_ref_from', JSON.stringify({ code: 'ZZZZ9999', at: Date.now() })));
        await p.evaluate(() => _adminTrackSignup('teen'));
        await p.waitForTimeout(500);
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw_newbie_example_com_referred_by'))), 'ZZZZ9999');
        assert.equal(await p.evaluate(() => localStorage.getItem('tw_ref_from')), null);
        await p.evaluate(() => localStorage.setItem('tw_ref_from', JSON.stringify({ code: 'OLDCODE1', at: Date.now() - 61 * 864e5 })));
        await member(p, 'teen', 'late@example.com');
        await p.evaluate(() => _adminTrackSignup('teen'));
        await p.waitForTimeout(500);
        assert.equal(await p.evaluate(() => localStorage.getItem('tw_late_example_com_referred_by')), null, 'a 61-day-old link still counted');

        // emails: the share box only in friendly emails to people, with their own code when it is their email
        await member(p, 'teen', 'sam@example.com');
        const mail = await p.evaluate(() => {
          const m = (to, subject, extra) => window.twBrandEmailParams(Object.assign({ to_email: to, subject, message: '<p>Hi there</p>' }, extra || {})).message;
          return {
            welcome: m('sam@example.com', 'Welcome to TeenWork, Sam! 🎉'),
            other: m('mom@example.com', 'You are now linked with Sam'),
            code: m('sam@example.com', 'Your TeenWork Verification Code'),
            sos: m('mom@example.com', '🚨 SOS alert: Sam needs help'),
            team: m('aqdteenwork@gmail.com', 'Welcome to TeenWork, Sam! 🎉'),
            off: m('sam@example.com', 'Welcome to TeenWork, Sam! 🎉', { tw_share: false }),
          };
        });
        assert(mail.welcome.includes('Know someone who') && mail.welcome.includes('https://teenwork.ayaqd.com/?share=' + code), 'welcome email has no share box with the code');
        assert(mail.other.includes('https://teenwork.ayaqd.com/?share=1'), 'someone else’s email should get the plain share link');
        for (const k of ['code', 'sos', 'team', 'off']) assert(!mail[k].includes('Know someone who'), k + ' email has a share box');
        assert(!/Vermont/.test(mail.welcome), 'email header still says Vermont');

        // team inboxes go through EmailJS, people through Resend (with the person's sign-in)
        const route = await p.evaluate(async () => {
          const out = [];
          const ejs = (to) => () => { out.push('emailjs:' + to); return Promise.resolve({ status: 200 }); };
          const send = to => window.twDeliverEmail(EMAILJS_SERVICE, EMAILJS_TEMPLATE, { to_email: to, subject: 'x', message: '<p>x</p>' }, '', ejs(to));
          await send('aqdteenwork@gmail.com');
          await send(ADMIN_EMAIL);
          const r = await send('friend@example.com');
          out.push('via:' + r.via);
          return out;
        });
        assert.deepEqual(route, ['emailjs:aqdteenwork@gmail.com', 'emailjs:' + 'ayaquarrierdraper@gmail.com', 'via:resend']);
        const sendCalls = calls.filter(c => c.fn === 'send-email' && c.body && !c.body.ping);
        assert.deepEqual(sendCalls.map(c => c.body.to), ['friend@example.com'], 'a team email went to Resend');
        assert.equal(sendCalls[0].auth, 'Bearer tok.en.teen', 'the sign-in token was not sent');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Invite a friend by email: members only, through Resend with the member's sign-in, 5 a day, once per address
        const { context, p, errors, calls } = await open(browser, viewport);
        await member(p, 'teen', 'sam@example.com');
        await p.evaluate(() => twShare({ source: 'test' }));
        await p.waitForSelector('#tw54-invite');
        assert(/5 invites left today/.test(await p.locator('#tw54-inv-msg').innerText()));
        const ib = await p.locator('.tw54-inv-send').boundingBox();
        assert(ib.height >= 44 && ib.x + ib.width <= viewport.width, tag + ': invite button ' + JSON.stringify(ib));
        const tryTo = async (addr) => { await p.fill('#tw54-inv-to', addr); await p.click('.tw54-inv-send'); await p.waitForTimeout(250); return p.locator('#tw54-inv-msg').innerText(); };
        assert(/doesn’t look like an email/.test(await tryTo('not-an-email')));
        assert(/your own email/.test(await tryTo('SAM@example.com')));
        assert(/TeenWork team/.test(await tryTo('aqdteenwork@gmail.com')));
        assert.equal(calls.filter(c => c.fn === 'send-email' && c.body && !c.body.ping).length, 0, 'a bad address was sent');
        assert(/Invite sent to friend@example.com/.test(await tryTo('Friend@Example.com')));
        let sent = calls.filter(c => c.fn === 'send-email' && c.body && !c.body.ping);
        assert.equal(sent.length, 1);
        const code = await p.evaluate(() => twShareCode());
        assert.equal(sent[0].body.to, 'friend@example.com');
        assert.equal(sent[0].body.subject, 'Sam invited you to TeenWork');
        assert.equal(sent[0].auth, 'Bearer tok.en.teen', 'the invite was sent without the member’s sign-in');
        assert(sent[0].body.html.includes('https://teenwork.ayaqd.com/?ref=' + code) && sent[0].body.html.includes('See TeenWork'), 'invite has no personal link');
        assert(!/Know someone who/.test(sent[0].body.html), 'invite carries the share box too');
        assert(/typed your address into TeenWork/.test(sent[0].body.html));
        assert.equal(await p.inputValue('#tw54-inv-to'), '');
        assert(/already invited/.test(await tryTo('friend@example.com')));
        for (const n of [2, 3, 4, 5]) assert(/Invite sent/.test(await tryTo('friend' + n + '@example.com')));
        assert(/sent 5 invites today/.test(await tryTo('friend6@example.com')));
        sent = calls.filter(c => c.fn === 'send-email' && c.body && !c.body.ping);
        assert.equal(sent.length, 5);
        assert.equal(calls.filter(c => c.fn === 'send-email' && c.body && /friend6/.test(c.body.to || '')).length, 0);
        assert(await noOverflow(p), tag + ': invite form overflows');
        await p.keyboard.press('Escape');
        // a practice account and a visitor get no invite form
        await p.evaluate(() => { window.currentUser = null; try { currentUser = null; } catch (e) {} twShare({ source: 'test', sheet: true }); });
        await p.waitForSelector('#tw54-share');
        assert.equal(await p.locator('#tw54-invite').count(), 0, 'a visitor can send invites');
        await p.keyboard.press('Escape');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Resend not set up yet: nothing goes through EmailJS; the member is offered their own email app
        const { context, p, errors, calls } = await open(browser, viewport, '', { sendEmail: () => ({ ok: false, code: 'not_configured', error: 'RESEND_API_KEY is not set' }) });
        await member(p, 'parent', 'mom@example.com');
        await p.evaluate(() => { window.__ejs = 0; const ej = window.emailjs; if (ej) { const o = ej.send; ej.send = function () { window.__ejs++; return o.apply(this, arguments); }; } });
        await p.evaluate(() => twShare({ source: 'test' }));
        await p.waitForSelector('#tw54-invite');
        await p.fill('#tw54-inv-to', 'neighbor@example.com');
        await p.click('.tw54-inv-send');
        await p.waitForSelector('#tw54-inv-msg a');
        assert(/can’t send email invites right now/.test(await p.locator('#tw54-inv-msg').innerText()));
        assert((await p.getAttribute('#tw54-inv-msg a', 'href')).startsWith('mailto:neighbor%40example.com?subject='));
        assert.equal(await p.evaluate(() => window.__ejs), 0, 'an invite went through EmailJS');
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw54_invites_mom_example_com') || '{}').n || 0), 0, 'a failed invite was counted');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Polish pass: home page, plans page, sign-up, AI labels, the one install offer
        const { context, p, errors } = await open(browser, viewport);
        assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('mobileNav') || document.body).display === 'none' || !document.getElementById('mobileNav')), true, tag + ': green bar along the bottom of the home page');
        const ctas = await p.evaluate(() => [...document.querySelectorAll('.landing-final .landing-cta button')].map(b => { const r = b.getBoundingClientRect(); return r.left + r.width / 2; }));
        assert(ctas.length === 2 && (phone ? ctas.every(x => Math.abs(x - 195) < 6) : true), tag + ': last Sign Up / Sign In not centered ' + JSON.stringify(ctas));
        assert(!/Grok AI|Gemini AI/.test(await p.evaluate(() => document.body.innerText + [...document.querySelectorAll('.badge')].map(b => b.textContent).join(' '))), 'an AI label still names the wrong service');
        await p.evaluate(() => gotoPage('pricing'));
        await p.waitForTimeout(300);
        assert.equal(await p.evaluate(() => document.body.classList.contains('tw54-pricing')), true);
        const fabs = await p.evaluate(() => [...document.querySelectorAll('[data-tw-fab="1"],#v17-support-fab,#v16-support-fab,#v17-rate-fab,#v16-rate-fab')].filter(e => e.offsetParent !== null).length);
        assert.equal(fabs, 0, tag + ': floating buttons cover the plans page');
        const pricing = await p.locator('#page-pricing').innerText();
        assert(!/API daily quota|AI Job Coach \(unlimited\)|Bulk student onboarding|teacher seat|Cohort progress/i.test(pricing), 'plans page promises things the app does not do');
        assert(/AI help: 10 requests a day/.test(pricing));
        await p.evaluate(() => gotoPage('signup'));
        await p.waitForTimeout(300);
        assert.equal(await p.locator('#perm-activity-signup').count(), 0, 'the required "track my activity" box is back');
        assert(!/push &|push notifications/i.test(await p.locator('#page-signup').innerText()));
        if (phone) {
          const a = await p.locator('#su-plan-free-card').boundingBox(), b = await p.locator('#su-plan-pro-card').boundingBox();
          assert(Math.abs(a.x - b.x) < 2 && b.y > a.y, tag + ': plan choices are not stacked');
          assert(b.x + b.width <= viewport.width, 'Pro plan card runs off the screen');
        }
        assert(await noOverflow(p), tag + ': sign-up page overflows');
        await p.evaluate(() => gotoPage('landing'));
        // install: never for visitors or practice accounts; a member on their dashboard gets one offer, "Not now" waits a month
        await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted = 1; }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
        assert.equal(await p.evaluate(() => twOfferInstall()), false, 'install offered to a visitor');
        assert.equal(await p.locator('#pwa-install-banner:visible').count(), 0, 'the old install banner is showing');
        await member(p, 'teen', 'sam@example.com');
        await p.evaluate(() => { document.querySelectorAll('.page').forEach(x => x.classList.remove('active')); document.getElementById('page-teen').classList.add('active'); });
        // v57: the offer is get-app-v57's "Get the TeenWork app" pop-up (tests/get-app-v57.cjs has the details)
        await p.evaluate(() => { twGetApp._t.first = 50; });
        assert.equal(await p.evaluate(() => twOfferInstall()), true, 'no install offer for a member on their dashboard');
        await p.waitForSelector('#tw57-app.tw57-is-nudge');
        assert(/Get the TeenWork app/.test(await p.locator('#tw57-app').innerText()));
        assert(!/push notifications|offline access/i.test(await p.locator('#tw57-app').innerText()));
        await p.locator('#tw57-app .tw57-later').click();
        assert.equal(await p.locator('#tw57-app').count(), 0);
        assert.equal(await p.evaluate(() => twOfferInstall()), false, '"Not now" did not wait');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Admin support replies are emailed by TeenWork (Resend / EmailJS), not opened in the admin's email app
        const { context, p, errors } = await open(browser, viewport);
        const reply = async (ok) => {
          await p.evaluate((ok) => {
            window.__sent = []; window.__opened = [];
            window.twSendEmail = (to, subject, html, opts) => { window.__sent.push({ to, subject, html, opts }); return Promise.resolve(ok); };
            window.open = (u) => { window.__opened.push(String(u)); return null; };
            adminReplyToSupport('kid@example.com', 'Kid', 'm1');
          }, ok);
          await p.fill('#adm-reply-body', 'Hi Kid,\n\nWe fixed it <b>today</b>.');
          await p.click('#adm-reply-send');
          await p.waitForTimeout(200);
          return p.evaluate(() => ({ sent: window.__sent, opened: window.__opened, open: !!document.getElementById('adm-reply-modal') }));
        };
        assert(/TeenWork emails this reply/.test(await p.evaluate(() => { adminReplyToSupport('kid@example.com', 'Kid', 'm1'); const t = document.getElementById('adm-reply-info').textContent; document.getElementById('adm-reply-modal').remove(); return t; })));
        let r = await reply(true);
        assert.equal(r.sent.length, 1);
        assert.equal(r.sent[0].to, 'kid@example.com');
        assert.equal(r.sent[0].subject, 'Re: Your TeenWork Support Request');
        assert(r.sent[0].html.includes('&lt;b&gt;today&lt;/b&gt;') && r.sent[0].html.startsWith('<p>Hi Kid,</p>'), 'reply body not escaped: ' + r.sent[0].html);
        assert.deepEqual(r.opened, [], 'the email app opened although TeenWork sent the reply');
        assert.equal(r.open, false);
        assert(/Reply emailed to Kid/.test(await p.locator('#global-toast').innerText()));
        // TeenWork couldn't send: the window stays, says so, and nothing opens until the admin asks
        r = await reply(false);
        assert.deepEqual(r.opened, []);
        assert.equal(r.open, true);
        assert(/couldn’t send/.test(await p.locator('#adm-reply-info').innerText()));
        await p.click('#adm-reply-email-only');
        r = await p.evaluate(() => window.__opened);
        assert(r.length === 1 && r[0].startsWith('mailto:kid@example.com?subject=Re%3A%20Your%20TeenWork%20Support%20Request'), JSON.stringify(r));
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 4. Pro checkout: unchanged before Paid Launch; Stripe after */
      {
        const { context, p, errors, calls } = await open(browser, viewport);
        await member(p, 'teen', 'sam@example.com');
        await p.evaluate(() => gotoPage('pricing'));
        await p.waitForTimeout(300);
        assert.equal(await p.locator('#tw54-teen-pro-price').innerText(), 'Free right now');
        assert(!/Priority job matching|\$19 per extra post|featured listing boosts/i.test(await p.locator('#page-pricing').innerText()), 'old pricing claims are back');
        // Before Paid Launch: the free switch to Pro, no Stripe
        await p.evaluate(() => handleUpgradeClick('teen_pro'));
        await p.waitForTimeout(200);
        assert.equal(await p.evaluate(() => twPlan.planOf()), 'pro');
        assert.equal(calls.filter(c => c.fn === 'billing' && c.body.action === 'checkout').length, 0);
        await p.evaluate(() => twPlan.setMyPlan('free'));

        // Paid Launch on: prices show everywhere
        await paid(p, true);
        await p.evaluate(() => gotoPage('pricing'));
        await p.waitForTimeout(300);
        assert.equal((await p.locator('#tw54-teen-pro-price').innerText()).replace(/\s+/g, ''), '$3.99/mo');
        assert.equal((await p.locator('#tw54-emp-pro-price').innerText()).replace(/\s+/g, ''), '$3.99/mo', 'Employer Pro costs the same as Teen Pro');
        assert(!/\$4\.99|\$49\b/.test(await p.locator('#page-pricing').innerText()), 'an old price is still on the plans page');
        assert.equal(await p.locator('#tw54-testing-box').isVisible(), false, 'testing note still shown after launch');
        assert(/cancel anytime/i.test(await p.locator('#tw54-faq-try').textContent()));
        await p.evaluate(() => gotoPage('landing'));
        await p.waitForTimeout(200);
        assert(/\$3\.99 a month/.test(await p.locator('#tw48-pro p').innerText()), 'home page Pro line has no price');
        await p.evaluate(() => gotoPage('pricing'));
        await p.waitForTimeout(200);

        // A teen is asked to get a parent first; "Not now" stops
        await p.click('#pricing-pro-btn');
        await p.waitForSelector('#tw54-pay');
        assert(/Ask a parent or guardian first/.test(await p.locator('#tw54-pay').innerText()));
        assert(/\$3\.99 a month/.test(await p.locator('#tw54-pay').innerText()));
        await p.click('#tw54-pay button:has-text("Not now")');
        assert.equal(await p.locator('#tw54-pay').count(), 0);
        assert.equal(calls.filter(c => c.fn === 'billing' && c.body.action === 'checkout').length, 0);
        // …and with a parent there, Stripe's checkout opens
        await p.click('#pricing-pro-btn');
        await p.click('#tw54-pay button:has-text("A parent is here")');
        await p.waitForURL(/checkout\.stripe\.com/);
        const co = calls.find(c => c.fn === 'billing' && c.body.action === 'checkout');
        assert.deepEqual(co.body, { action: 'checkout', plan: 'teen_pro', account_key: 'sam@example.com', return_view: 'jobs' });
        assert.equal(co.auth, 'Bearer tok.en.teen');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Employers go straight to checkout; parents and the wrong plan get a note
        const { context, p, errors, calls } = await open(browser, viewport);
        await paid(p, true);
        await member(p, 'parent', 'mom@example.com');
        await p.evaluate(() => handleUpgradeClick('teen_pro'));
        await p.waitForTimeout(200);
        assert(/Parent accounts are always free. Pro is for teen and employer accounts/.test(await p.locator('#global-toast').innerText()));
        // a signed-in parent sees no Upgrade buttons on the plans page
        await p.evaluate(() => { gotoPage('pricing'); });
        await p.waitForTimeout(250);
        assert(await p.locator('#tw54-parent-free').isVisible(), 'no "parents are always free" note');
        assert.equal(await p.locator('#pricing-pro-btn').isVisible(), false, 'a parent still sees Upgrade to Pro');
        assert.equal(await p.locator('#tw54-emp-pro-btn').isVisible(), false, 'a parent still sees Employer Pro');
        await member(p, 'employer', 'boss@example.com');
        await p.evaluate(() => handleUpgradeClick('teen_pro'));
        await p.waitForTimeout(200);
        assert(/Teen Pro is for teen accounts/.test(await p.locator('#global-toast').innerText()));
        assert.equal(calls.filter(c => c.body && c.body.action === 'checkout').length, 0);
        await p.evaluate(() => { gotoPage('pricing'); });
        await p.waitForTimeout(200);
        await p.click('#tw54-emp-pro-btn');
        await p.waitForURL(/checkout\.stripe\.com/);
        assert.equal(calls.find(c => c.body && c.body.action === 'checkout').body.plan, 'employer_pro');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // No Pro for parents, also before Paid Launch: no free switch to Pro, no plan choice at sign-up,
        // a stored "pro" counts as free, and no Pro pill on the parent dashboard
        const { context, p, errors } = await open(browser, viewport);
        await member(p, 'parent', 'mom@example.com');
        await p.evaluate(() => handleUpgradeClick('teen_pro'));
        await p.waitForTimeout(200);
        assert(/Parent accounts are always free/.test(await p.locator('#global-toast').innerText()));
        assert.notEqual(await p.evaluate(() => twPlan.storedPlanOf(window.currentUser)), 'pro', 'a parent switched to Pro');
        const parentPlan = await p.evaluate(() => {
          const s = twPlan.settings(); if (!s.enabled) return 'limits off';
          localStorage.setItem('tw_mom_example_com_plan', JSON.stringify('pro'));
          return twPlan.planOf(window.currentUser);
        });
        assert.equal(parentPlan, 'free', 'a parent with a stored Pro still counts as Pro');
        await p.evaluate(() => { try { currentUser = null; } catch (e) {} window.currentUser = null; gotoPage('signup'); });
        await p.waitForTimeout(300);
        await p.evaluate(() => selectType('teen'));
        assert(await p.locator('#su-plan-section').isVisible(), 'teens lost the plan choice');
        await p.evaluate(() => { document.querySelector('input[name="su-plan"][value="pro"]').checked = true; selectType('parent'); });
        assert.equal(await p.locator('#su-plan-section').isVisible(), false, 'a parent still gets the plan choice');
        assert(/Parent accounts are always free/.test(await p.locator('#tw54-su-parent-free').innerText()));
        assert.equal(await p.evaluate(() => document.querySelector('input[name="su-plan"]:checked').value), 'free');
        await p.evaluate(() => selectType('employer'));
        assert(await p.locator('#su-plan-section').isVisible(), 'employers lost the plan choice');
        assert.equal(await p.locator('#tw54-su-parent-free').isVisible(), false);
        // parent dashboard: the plan pill and tier badge are hidden by CSS
        const hidden = await p.evaluate(() => {
          const h = document.querySelector('#page-parent .dash-header'); if (!h) return 'no header';
          const pill = document.createElement('div'); pill.className = 'tw-plan-pill'; pill.textContent = 'Free plan · See Pro'; h.appendChild(pill);
          const r = getComputedStyle(pill).display; pill.remove(); return r;
        });
        assert.equal(hidden, 'none', 'the parent dashboard still shows the Pro pill');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Stripe not set up yet: nobody is sent anywhere, support opens instead
        const { context, p, errors, calls } = await open(browser, viewport, '', { ping: { ok: true, configured: false, mode: '', prices: { teen_pro: false, employer_pro: false }, webhook: false } });
        await paid(p, true);
        await member(p, 'employer', 'boss@example.com');
        await p.evaluate(() => handleUpgradeClick('employer_pro'));
        await p.waitForTimeout(400);
        assert.equal(calls.filter(c => c.body && c.body.action === 'checkout').length, 0);
        assert(/Payments aren’t set up yet/.test(await p.locator('#global-toast').innerText()));
        assert.equal(p.url().startsWith(ROOT), true);
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        // Back from Stripe: waits for the webhook, then says Pro is on; Manage billing opens Stripe's page
        let n = 0;
        const { context, p, errors, calls } = await open(browser, viewport, '?checkout=success', { status: () => (++n < 3 ? { ok: true, plan: 'free', status: 'none', has_billing: true } : { ok: true, plan: 'pro', status: 'active', has_billing: true, current_period_end: '2026-12-06T00:00:00Z' }) });
        await paid(p, true);
        await member(p, 'teen', 'sam@example.com');
        await p.waitForFunction(() => /You’re on TeenWork Pro/.test(document.getElementById('global-toast')?.textContent || ''), null, { timeout: 15000 });
        assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('tw_sam_example_com_plan'))), 'pro');
        await p.evaluate(() => gotoPage('pricing'));
        await p.waitForSelector('#tw54-manage:not([hidden])');
        assert(/You’re on Pro. Next payment: December 6, 2026/.test(await p.locator('#tw54-manage-text').innerText()));
        await p.click('#tw54-manage-btn');
        await p.waitForURL(/billing\.stripe\.com/);
        assert.equal(calls.find(c => c.body && c.body.action === 'portal').body.return_view, 'jobs');
        assert.deepEqual(errors, []);
        await context.close();
      }
      {
        const { context, p, errors } = await open(browser, viewport, '?checkout=cancel');
        await member(p, 'teen', 'sam@example.com');
        await p.waitForFunction(() => /Checkout canceled/.test(document.getElementById('global-toast')?.textContent || ''), null, { timeout: 5000 });
        assert.deepEqual(errors, []);
        await context.close();
      }
      console.log('PASS ' + tag + ': share band/footer/window (copy, text, email, WhatsApp, Facebook, Escape, focus), ?ref and ?share arrivals, practice accounts plain link, member code + joined count + referral at sign-up (60-day limit), email share box rules, team email → EmailJS / people → Resend with sign-in, email invites (Resend only, 5 a day, members only, email-app fallback), polish (home bar, centered buttons, plans page claims, sign-up boxes, AI labels, one install offer), admin replies emailed by TeenWork (not the email app), Pro before/after Paid Launch ($3.99 for teens and employers, ask a parent, checkout, employer, no Pro for parents, not set up), return from Stripe + Manage billing');
    }
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
