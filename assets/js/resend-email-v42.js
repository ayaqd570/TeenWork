
/* ══════════════════════════════════════════════════════════════════════
   EMAILS THROUGH RESEND  (2026-10-15, "Set up Resend email" thread, Aya's request)
   Every email the app sends through the main EmailJS template (welcome,
   verification code, parent consent, SOS alert, support inbox, school
   partnership…) now goes out through Resend first, via the Supabase Edge
   Function `send-email`, which holds the Resend key as a secret. The
   branded HTML from branded-email-v41 is sent unchanged.

   • If Resend can't take an email (function not deployed yet, no key,
     test mode for that address, limit reached, offline) the same email
     goes through EmailJS exactly as before, so nothing is lost.
   • Needs one hook line in branded-email-v41 (added by
     apply-resend-email.py): after branding, emails are handed to
     window.twDeliverEmail instead of straight to EmailJS.
   • Admin → 🩺 System Health gets an "Email sender" line with a
     "Send test" button (Resend only, to the address typed there).
   • v54 (2026-11-06, Aya: "use resend for sending emails, emailjs for
     receiving"): emails TO the TeenWork team (Help & Support, school
     partnerships, sign-up notices) go straight through EmailJS; emails to
     everyone else go through Resend. When someone is signed in, their own
     sign-in token goes with the email, so send-email keeps TeenWork links
     (it turns every link into plain text for emails sent without a sign-in).
   • v57 (2026-11-13, Aya: "use resend not emailJS"): EmailJS is gone. Every
     email, including the ones to the TeenWork team inboxes, goes through
     Resend. There is no backup sender: if Resend can't take an email, the
     send fails and the caller shows its own message (the verification code
     is then shown on screen). resend-mailer-v57.js stands in for the old
     EmailJS library, so older code that calls emailjs.send() lands here.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twResendEmail) return;
  window.__twResendEmail = true;

  var TIMEOUT_MS = 12000;
  var state = { off: false, offReason: '', log: [] };
  function fnUrl() { return (typeof SUPABASE_URL !== 'undefined' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/send-email' : ''; }
  function sbKey() { return typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? SUPABASE_KEY : ''; }
  function mainTemplate() { return typeof EMAILJS_TEMPLATE !== 'undefined' ? EMAILJS_TEMPLATE : ''; }
  function isEmail(s) { return /^[^\s@<>,;:"()\[\]\\]+@[^\s@<>,;:"()\[\]\\]+\.[A-Za-z]{2,}$/.test(String(s || '').trim()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function looksHtml(m) { var t = String(m || '').trim(); return t.charAt(0) === '<' && t.charAt(t.length - 1) === '>'; }

  // TeenWork's own inboxes (support, sign-up notices). Since v57 they get their email through Resend too.
  var TEAM = ['ayaquarrierdraper@gmail.com', 'aqdteenwork@gmail.com'];
  function isTeam(to) {
    var t = String(to || '').trim().toLowerCase();
    if (typeof ADMIN_EMAIL !== 'undefined' && t === String(ADMIN_EMAIL).toLowerCase()) return true;
    return TEAM.indexOf(t) >= 0;
  }
  window.twIsTeamInbox = isTeam;
  // The signed-in person's Supabase token, else ''. Only when the sign-in belongs to the account on screen,
  // or the email goes to the signed-in person themselves (the welcome email is sent just before the
  // new account opens).
  function userToken(to) {
    try {
      var u = window.currentUser;
      if (u && (u.isDemo || u.twDemo)) return Promise.resolve('');
      var mine = [String((u && u.email) || '').toLowerCase(), String(to || '').trim().toLowerCase()].filter(Boolean);
      var getClient = typeof _twCloudClient === 'function' ? _twCloudClient(2000) : Promise.resolve(typeof sbClient !== 'undefined' ? sbClient : null);
      return Promise.resolve(getClient).then(function (c) {
        if (!c || !c.auth || typeof c.auth.getSession !== 'function') return '';
        return c.auth.getSession().then(function (r) {
          var s = r && r.data && r.data.session;
          return s && s.access_token && mine.indexOf(String((s.user && s.user.email) || '').toLowerCase()) >= 0 ? s.access_token : '';
        });
      }).catch(function () { return ''; });
    } catch (e) { return Promise.resolve(''); }
  }

  function callFn(body) {
    var url = fnUrl(), key = sbKey();
    if (!url || !key) return Promise.resolve({ ok: false, httpStatus: 0, code: 'no_supabase', error: 'Supabase is not configured in this copy' });
    return (body && body.ping ? Promise.resolve('') : userToken(body && body.to)).then(function (tok) { return post(url, key, tok || key, body); });
  }
  function post(url, key, bearer, body) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + bearer },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        d = (d && typeof d === 'object') ? d : {};
        d.httpStatus = res.status;
        if (res.status === 404) d.code = 'not_deployed';   // send-email itself never answers 404
        return d;
      });
    }, function (e) {
      return { ok: false, httpStatus: 0, code: 'network', error: String((e && e.message) || e) };
    }).then(function (d) { if (timer) clearTimeout(timer); return d; });
  }

  /* Send one email (EmailJS-style params) through Resend only. Resolves like emailjs.send, rejects {status, text, code}. */
  window.twSendViaResend = function (params, opts) {
    var p = params || {};
    opts = opts || {};
    if (state.off && !opts.force) return Promise.reject({ status: 0, text: 'Resend is off for this visit: ' + state.offReason, code: 'off' });
    var html = String(p.message || '');
    if (!looksHtml(html)) html = '<p>' + esc(html).replace(/\r?\n/g, '<br>') + '</p>';
    return callFn({ to: String(p.to_email || '').trim(), subject: p.subject || 'TeenWork', html: html, reply_to: p.reply_to || '', from_name: p.from_name || 'TeenWork' })
      .then(function (d) {
        if (d.ok) { state.off = false; state.offReason = ''; return { status: 200, text: 'OK', via: 'resend', id: d.id, testing: !!d.testing }; }
        // Missing function, key or limits table: stop trying Resend until the page is reloaded.
        if (d.code === 'not_deployed' || d.code === 'not_configured' || d.code === 'limits_unavailable' || d.code === 'bad_key' || d.code === 'no_supabase') {
          state.off = true; state.offReason = d.code;
        }
        throw { status: d.httpStatus || 0, text: d.error || 'Resend send failed', code: d.code || 'error' };
      });
  };

  function remember(entry) { state.log.push(entry); if (state.log.length > 30) state.log.shift(); }

  /* Called by the branded-email-v41 wrapper after branding. Since v57 every email goes through Resend;
     the last argument (the old EmailJS sender) is ignored. Resolves like emailjs.send, rejects {status, text, code}. */
  window.twDeliverEmail = function (service, template, params) {
    var p = params || {}, at = new Date().toISOString();
    var base = { at: at, to: p.to_email, subject: p.subject, team: isTeam(p.to_email) };
    if (!isEmail(p.to_email) || typeof p.message !== 'string' || !p.message.trim()) {
      remember(Object.assign({ via: 'not sent', error: 'bad_request' }, base));
      return Promise.reject({ status: 0, text: 'An email needs one valid address and a message', code: 'bad_request' });
    }
    try {
      return window.twSendViaResend(p).then(function (r) {
        remember(Object.assign({ via: 'resend', id: r.id }, base));
        return r;
      }, function (err) {
        remember(Object.assign({ via: 'not sent', error: err && (err.code + ': ' + err.text) }, base));
        if (err && err.code !== 'off') console.warn('TeenWork: Resend could not send this email (' + (err.code || '') + ').', err.text || '');
        throw err;
      });
    } catch (e) {
      console.warn('TeenWork email failed:', e);
      return Promise.reject({ status: 0, text: String((e && e.message) || e), code: 'error' });
    }
  };

  window.twEmailStatus = function () { return { resendOff: state.off, reason: state.offReason, functionUrl: fnUrl(), recent: state.log.slice() }; };
  window.twPingEmailFunction = function () { return callFn({ ping: true }); };

  /* ── Admin → System Health: "Email sender" line + test button ───── */
  function healthNote(d) {
    if (d.ok && d.configured && !d.testing) return { status: 'ok', note: 'Resend ready · sending from ' + (d.from_domain || 'your domain') };
    if (d.ok && d.configured) return { status: 'warn', note: 'Resend in test mode: it only reaches the email your Resend account uses until RESEND_FROM is an address on a verified domain.' };
    if (d.ok) return { status: 'error', note: 'Resend key not added yet · no emails can be sent' };
    if (d.code === 'not_deployed') return { status: 'error', note: 'send-email function not deployed · no emails can be sent' };
    if (d.code === 'no_supabase') return { status: 'error', note: 'Supabase not configured · no emails can be sent' };
    return { status: 'warn', note: 'Resend unreachable (' + (d.error || d.code || 'offline') + ') · emails wait until it answers' };
  }
  function adminEmail() { return typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : ''; }
  window.twSendTestEmail = function (to) {
    to = String(to || adminEmail()).trim();
    if (!isEmail(to)) return Promise.reject({ status: 0, text: 'Type a valid email address', code: 'bad_request' });
    var params = { to_email: to, subject: '✅ TeenWork test email', from_name: 'TeenWork', reply_to: adminEmail(),
      message: 'Hi,\n\nThis test email came through Resend, so the app’s emails are set up.\n\nSent ' + new Date().toLocaleString() + '.\n\n— TeenWork' };
    try { if (typeof window.twBrandEmailParams === 'function') params = window.twBrandEmailParams(params); } catch (e) {}
    return window.twSendViaResend(params, { force: true });
  };
  function testMessage(err) {
    var c = err && err.code;
    if (c === 'testing_only') return 'Resend’s test sender only reaches the email your Resend account uses. Try that address, or verify a domain.';
    if (c === 'not_configured') return 'Add RESEND_API_KEY in Supabase first.';
    if (c === 'bad_key') return 'Resend refused the key. Check RESEND_API_KEY in Supabase.';
    if (c === 'limit') return 'Send limit reached for now.';
    return (err && err.text) || 'Failed';
  }
  var _oHealth = window.adminRunHealthCheck;
  window.adminRunHealthCheck = async function () {
    var r = _oHealth ? await _oHealth.apply(this, arguments) : undefined;
    try {
      var el = document.getElementById('adm-health-list'); if (!el) return r;
      var old = el.querySelector('[data-tw-email]'); if (old) old.remove();
      var row = document.createElement('div'); row.className = 'adm-health-item'; row.setAttribute('data-tw-email', '1');
      row.style.flexWrap = 'wrap';
      row.innerHTML = '<div class="adm-health-status warn"></div><div class="adm-health-label">Email sender</div><div class="adm-health-note" data-tw-email-note>Checking Resend…</div>' +
        '<div style="flex-basis:100%;display:flex;gap:6px;justify-content:flex-end;margin-top:6px;">' +
        '<input data-tw-email-to type="email" value="' + esc(adminEmail()) + '" style="flex:0 1 240px;min-width:0;padding:5px 8px;border:1px solid var(--border);border-radius:8px;font-size:.78rem;">' +
        '<button type="button" class="adm-btn adm-btn-mark" data-tw-email-test>✉️ Send test</button></div>';
      el.appendChild(row);
      var dot = row.querySelector('.adm-health-status'), note = row.querySelector('[data-tw-email-note]');
      row.querySelector('[data-tw-email-test]').addEventListener('click', function () {
        var btn = this; btn.disabled = true; note.textContent = 'Sending a test through Resend…';
        window.twSendTestEmail(row.querySelector('[data-tw-email-to]').value).then(function (res) {
          dot.className = 'adm-health-status ok';
          note.textContent = 'Test sent through Resend ✓ Check the inbox' + (res.testing ? ' (test mode)' : '') + '.';
        }, function (err) {
          dot.className = 'adm-health-status error';
          note.textContent = 'Test not sent: ' + testMessage(err);
        }).then(function () { btn.disabled = false; });
      });
      var d = await callFn({ ping: true });
      var h = healthNote(d);
      dot.className = 'adm-health-status ' + h.status;
      note.textContent = h.note;
    } catch (e) {}
    return r;
  };
})();
