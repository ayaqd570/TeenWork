/* Offline checks for v57 (2026-11-13, Aya: "use resend not emailJS"): EmailJS is gone and every email
   the app sends goes to Resend through the send-email function, team inboxes included.
   Nothing real is called: the send-email function is faked and every other outside request is blocked.
   Run: node tests/resend-only-v57.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 8032, ROOT = 'http://127.0.0.1:' + PORT + '/';
const FN = 'https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/';
const REPO = path.resolve(__dirname, '..');

async function open(browser, answer) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const sent = [], outside = [];
  await context.route('**/*', async r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname === '127.0.0.1') return r.continue();
    outside.push(u.hostname);
    if (req.url().startsWith(FN + 'send-email')) {
      if (req.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: 'ok' });
      const body = JSON.parse(req.postData() || '{}');
      if (!body.ping) sent.push(Object.assign({ auth: req.headers()['authorization'] || '' }, body));
      const out = body.ping ? { ok: true, configured: true, testing: false, from_domain: 'teenwork.ayaqd.com' } : answer(body);
      return r.fulfill({ status: out.ok ? 200 : (out.status || 503), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
    }
    return r.abort();
  });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.dismiss());
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window.twDeliverEmail && window.twWelcomeEmail && window.emailjs && window.emailjs.__twBranded);
  await p.waitForTimeout(400);
  return { context, p, errors, sent, outside };
}
const ok = () => ({ ok: true, id: 'em_' + Math.random().toString(36).slice(2, 8) });

(async () => {
  // 0. The page no longer loads or names EmailJS
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  assert(!/@emailjs\/browser|email\.min\.js/.test(html), 'index.html still loads the EmailJS library');
  for (const f of fs.readdirSync(path.join(REPO, 'assets/js'))) {
    const js = fs.readFileSync(path.join(REPO, 'assets/js', f), 'utf8');
    assert(!/4ac7YlFuqZILXmSnV|template_t4l4tz9|api\.emailjs\.com\/api/.test(js), f + ' still has EmailJS settings');
  }
  assert(!/EmailJS SDK/.test(fs.readFileSync(path.join(REPO, 'assets/js/app-05.js'), 'utf8')), 'System Health still checks EmailJS');

  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: REPO, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    /* 1. Every kind of email goes to send-email, team inboxes too */
    {
      const { context, p, errors, sent, outside } = await open(browser, ok);
      assert.equal(await p.evaluate(() => !!window.emailjs.__twBranded && typeof window.emailjs.send), 'function');
      assert.equal(await p.evaluate(() => [...document.scripts].some(s => /emailjs/i.test(s.src))), false, 'an EmailJS script is on the page');

      // welcome email (twSendEmail → branded → Resend)
      assert.equal(await p.evaluate(() => twWelcomeEmail('new.teen@example.com', 'Sam', 'teen')), true, 'welcome email not sent');
      // Help & Support message → the team inbox, reply-to the sender
      await p.evaluate(() => _adminSaveSupportMessage({ name: 'Kid Test', email: 'kid@example.com', context: 'General Support', body: 'Hello <b>team</b>', time: Date.now(), userType: 'teen' }));
      // SOS alert to a parent (old service/template names are rerouted)
      await p.evaluate(() => emailjs.send('teenwork_service', 'safety_alert', { to_email: 'mom@example.com', teen_name: 'Sam', alert_note: 'help', alert_time: 'now' }));
      // verification code + the admin's new sign-up notice
      assert.equal(await p.evaluate(() => sendVerificationEmailJS('kid2@example.com', 'Kid Two')), true, 'verification email not sent');
      // any old-style call with the main template (parent consent, letters…)
      await p.evaluate(() => emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, { to_email: 'parent@example.com', to_name: 'Pat', subject: 'Action Required — TeenWork Parent Consent for Sam', message: 'Hi Pat,\n\nConsent recorded.\n\n— The TeenWork Team' }));
      await p.waitForTimeout(600);

      const to = sent.map(s => s.to);
      assert.deepEqual(to, ['new.teen@example.com', 'aqdteenwork@gmail.com', 'mom@example.com', 'kid2@example.com', 'ayaquarrierdraper@gmail.com', 'parent@example.com'], 'emails sent: ' + JSON.stringify(to));
      const by = t => sent.find(s => s.to === t);
      assert(/Welcome to TeenWork, Sam/.test(by('new.teen@example.com').subject));
      assert(by('new.teen@example.com').html.startsWith('<!--tw-branded-email-->'), 'welcome email is not in the TeenWork design');
      assert.equal(by('aqdteenwork@gmail.com').reply_to, 'kid@example.com', 'support email reply-to is not the sender');
      assert(by('aqdteenwork@gmail.com').html.includes('Hello &lt;b&gt;team&lt;/b&gt;'), 'support message not escaped');
      assert(/SOS alert: Sam needs help/.test(by('mom@example.com').subject), 'SOS email subject: ' + by('mom@example.com').subject);
      assert(/verification code/i.test(by('kid2@example.com').subject));
      assert(by('kid2@example.com').html.includes(await p.evaluate(() => _pendingVerifyCode)), 'code missing from the verification email');
      assert.equal(by('ayaquarrierdraper@gmail.com').subject, 'New TeenWork Sign-Up');
      assert(sent.every(s => /^TeenWork/.test(s.from_name || 'TeenWork')));
      assert(outside.every(h => /supabase\.co$|jsdelivr|googleapis|gstatic|unpkg|cdnjs/.test(h)), 'outside requests: ' + [...new Set(outside)].join(','));
      assert(!outside.some(h => /emailjs/i.test(h)), 'EmailJS was called');
      const log = await p.evaluate(() => twEmailStatus().recent);
      assert(log.length >= 6 && log.every(e => e.via === 'resend'), 'status log: ' + JSON.stringify(log));
      assert.deepEqual(errors, []);
      await context.close();
    }

    /* 2. Resend not set up: nothing else tries to send, callers get a clear failure, the code is shown on screen */
    {
      const { context, p, errors, sent } = await open(browser, () => ({ ok: false, code: 'not_configured', error: 'RESEND_API_KEY is not set', status: 503 }));
      assert.equal(await p.evaluate(() => twSendEmail('someone@example.com', 'Hi', '<p>x</p>')), false, 'twSendEmail should report the failure');
      assert.equal(sent.length, 1);
      // after "not set up" the page stops asking Resend for this visit
      assert.equal(await p.evaluate(() => twSendEmail('someone2@example.com', 'Hi', '<p>x</p>')), false);
      assert.equal(sent.length, 1, 'kept calling Resend after it said it was not set up');
      await p.evaluate(() => { document.querySelectorAll('.page').forEach(x => x.classList.remove('active')); document.getElementById('page-verify')?.classList.add('active'); });
      assert.equal(await p.evaluate(() => sendVerificationEmailJS('kid3@example.com', 'Kid Three')), false);
      const shown = await p.evaluate(() => ({ alert: document.getElementById('verify-code-alert')?.textContent || '', box: document.getElementById('verify-code-1')?.value || '', code: _pendingVerifyCode }));
      assert(shown.alert.includes(shown.code) && shown.box === shown.code[0], 'code not shown on screen: ' + JSON.stringify(shown));
      assert(/couldn’t email/.test(await p.locator('#global-toast').innerText()), 'no message about the email');
      assert.deepEqual(errors, []);
      await context.close();
    }

    /* 3. A limit reached: the verification code is shown on screen and later emails stop for this visit */
    {
      const { context, p, errors, sent } = await open(browser, () => ({ ok: false, code: 'limit', error: 'Send limit reached (day)', status: 429 }));
      assert.equal(await p.evaluate(() => sendVerificationEmailJS('kid4@example.com', 'Kid Four')), false);
      assert.equal(await p.evaluate(() => _emailjsQuotaExceeded), true);
      assert(/sent a lot of emails today/.test(await p.locator('#global-toast').innerText()));
      const n = sent.length;
      assert.equal(await p.evaluate(() => twSendEmail('x@example.com', 'Hi', '<p>x</p>')), false);
      assert.equal(sent.length, n, 'kept sending after the limit');
      assert.deepEqual(errors, []);
      await context.close();
    }

    /* 4. A practice (demo) account sends nothing */
    {
      const { context, p, errors, sent } = await open(browser, ok);
      await p.evaluate(() => _directDemo('teen'));
      await p.waitForFunction(() => window._twDemoSandbox.active);
      await p.evaluate(() => emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, { to_email: 'friend@example.com', subject: 'x', message: 'x' }));
      await p.evaluate(() => twSendEmail('friend2@example.com', 'x', '<p>x</p>'));
      await p.waitForTimeout(400);
      assert.deepEqual(sent.map(s => s.to), [], 'a demo sent email');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: no EmailJS on the page; welcome, support (team inbox, reply-to sender), SOS, verification code + admin sign-up notice and old-style emails all go to Resend; not set up → clear failure, no retries, code shown on screen; limit → code shown, sending stops; demos send nothing');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
