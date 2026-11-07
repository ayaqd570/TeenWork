/* ══════════════════════════════════════════════════════════════════════
   SHARE TEENWORK  (v54, 2026-11-06, Aya: "have a share button … try to get
   people to share it")

   • window.twShare({ source }) opens sharing. On phones it uses the phone's
     own share sheet (Web Share API). Elsewhere, or if that isn't available,
     it opens TeenWork's share window: Copy link, Text message, Email,
     WhatsApp, Facebook and "More…" (the system sheet, when there is one).
   • Signed-in members share a personal link https://teenwork.ayaqd.com/?ref=CODE.
     CODE is random (never the email) and saved in their user_data row
     "ref_code". Someone who opens the link and then signs up gets a row
     "referred_by" = CODE, and the share window shows "N people joined with
     your link" (Supabase rpc tw_referral_count, counts only). Nothing is
     promised for sharing: no prizes, no free months.
   • Where people find it: "📣 Share TeenWork" in the dashboard menu (every
     role), the home page (end of the page + footer), the old "Refer a
     Friend" window and the Rate app window, a one-time note on the
     dashboard after a few visits, and a share box in friendly emails
     (branded-email-v41 asks window.twEmailShareBlock for it).
   • Practice accounts (demos) and the admin share the plain link and never
     get a code or the dashboard note.
   • v54b (2026-11-07, Aya: "use emails … to try and share it", "full ready
     setup"): members can also invite a friend by email from the window.
     TeenWork sends the invite through Resend (send-email, with the member's
     sign-in), at most 5 a day per account and once a month per address.
     If Resend isn't set up, the window offers the member's own email app
     instead. Invites never go through EmailJS, so they can't use up the
     EmailJS allowance that sign-up codes and parent emails need.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twShareV54) return;
  window.__twShareV54 = true;

  var SITE = 'https://teenwork.ayaqd.com/';
  var CODE_RE = /^[A-Z0-9]{6,10}$/;
  var FROM_KEY = 'tw_ref_from';          // localStorage: the share code this visitor arrived with
  var FROM_DAYS = 60;
  var NUDGE_AFTER_VISITS = 3;            // the dashboard note shows on the 3rd dashboard visit

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function user() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; } catch (e) { return window.currentUser || null; } }
  function isPractice(u) {
    if (!u) return false;
    if (u.isDemo || u.twDemo) return true;
    try { return typeof window._twIsDemoSandboxUser === 'function' && !!window._twIsDemoSandboxUser(u); } catch (e) { return false; }
  }
  function isMember(u) { return !!(u && !u.isAdmin && u.type !== 'admin' && /@/.test(String(u.email || '')) && !isPractice(u)); }
  function acctKey(u) { return String(u.dataKey || u.email || '').toLowerCase(); }
  function dbLoad(k, d) { try { return window._DB && _DB.load ? _DB.load(k, d) : d; } catch (e) { return d; } }
  function dbSave(k, v) { try { if (window._DB && _DB.save) return _DB.save(k, v); } catch (e) {} }
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (e) { return null; }
  }

  /* ── 1. arriving through a share link ───────────────────────────── */
  var arrival = (function () {
    var out = { ref: '', share: '' };
    try {
      var q = new URLSearchParams(location.search);
      var ref = String(q.get('ref') || '').toUpperCase();
      var share = String(q.get('share') || '');
      if (CODE_RE.test(ref)) out.ref = ref;
      if (share) out.share = CODE_RE.test(share.toUpperCase()) ? share.toUpperCase() : '1';
      if (q.has('ref') || q.has('share')) {
        q.delete('ref'); q.delete('share');
        var s = q.toString();
        history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
      }
    } catch (e) {}
    return out;
  })();
  if (arrival.ref && arrival.ref !== lsGet('tw_ref_mine')) lsSet(FROM_KEY, { code: arrival.ref, at: Date.now() });
  if (arrival.share && arrival.share !== '1') lsSet('tw_ref_mine', arrival.share);   // the person's own code, from one of their emails

  /* ── 2. the member's own code ───────────────────────────────────── */
  function newCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var buf = new Uint32Array(8);
    try { crypto.getRandomValues(buf); } catch (e) { for (var i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 4294967296); }
    for (var j = 0; j < 8; j++) out += abc[buf[j] % abc.length];
    return out;
  }
  function myCode(create) {
    var u = user();
    if (!isMember(u)) return '';
    var c = String(dbLoad('ref_code', '') || '').toUpperCase();
    if (!CODE_RE.test(c) && create) { c = newCode(); dbSave('ref_code', c); }
    if (CODE_RE.test(c)) { lsSet('tw_ref_mine', c); return c; }
    return '';
  }
  function linkFor(code) { return SITE + (code && CODE_RE.test(code) ? '?ref=' + code : ''); }
  function shareCodeForSheet() { return myCode(true) || (arrival.share && arrival.share !== '1' ? arrival.share : ''); }

  /* ── 3. what is shared ──────────────────────────────────────────── */
  function message(role) {
    if (role === 'employer') return 'Hiring teens for local jobs? TeenWork connects you with teens 13–17, and a parent approves every application. It’s free to post a job:';
    if (role === 'parent') return 'TeenWork helps teens 13–17 find safe local jobs, and parents approve every application. Free for teens and parents:';
    if (role === 'teen') return 'I’m using TeenWork to find local jobs like lawn care, pet sitting and babysitting. It’s free for teens 13–17 and a parent approves every application:';
    return 'TeenWork is a free app that helps teens 13–17 find safe local jobs, with a parent approving every application:';
  }
  function payload() {
    var u = user(), role = u && !u.isAdmin ? u.type : '';
    var url = linkFor(shareCodeForSheet());
    return { title: 'TeenWork — safe local jobs for teens', text: message(role), url: url };
  }

  /* ── 4. how many joined with this code ──────────────────────────── */
  async function joinedCount(code) {
    if (!CODE_RE.test(code)) return null;
    var c = await client(); if (!c) return null;
    try {
      var r = await c.rpc('tw_referral_count', { p_code: code });
      if (r && !r.error && typeof r.data === 'number') return r.data;
    } catch (e) {}
    try {   // before the migration is applied: count the rows directly (counts only)
      var q = await c.from('user_data').select('email', { count: 'exact', head: true }).eq('key', 'referred_by').eq('value', JSON.stringify(code));
      if (q && !q.error && typeof q.count === 'number') return q.count;
    } catch (e) {}
    return null;
  }

  /* ── 5. the share window ────────────────────────────────────────── */
  var lastFocus = null;
  function close() {
    var m = $('tw54-share'); if (!m) return;
    m.remove();
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    lastFocus = null;
  }
  function onKey(e) {
    var m = $('tw54-share'); if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(m.querySelectorAll('button, a[href], input')).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  async function copy(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    try {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  function openSheet(opts) {
    close();
    opts = opts || {};
    lastFocus = document.activeElement;
    var p = payload(), full = p.text + ' ' + p.url;
    var u = user(), member = isMember(u), code = member ? myCode(true) : '';
    var enc = encodeURIComponent;
    var m = document.createElement('div');
    m.id = 'tw54-share';
    m.className = 'tw54-share';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw54-share-title');
    m.innerHTML =
      '<div class="tw54-share-card">' +
        '<button type="button" class="tw54-x" data-tw54="close" aria-label="Close">✕</button>' +
        '<h2 id="tw54-share-title">📣 Share TeenWork</h2>' +
        '<p class="tw54-lead">' + esc(member && u.type === 'employer' ? 'Know another business that hires teens? Send them TeenWork.' : 'Know a teen, a parent or a local business who’d like TeenWork? It’s free for them too.') + '</p>' +
        '<div class="tw54-link"><input id="tw54-link-input" type="text" readonly value="' + esc(p.url) + '" aria-label="Your share link">' +
          '<button type="button" class="tw54-copy" data-tw54="copy">Copy link</button></div>' +
        '<div class="tw54-grid">' +
          '<a class="tw54-btn" data-tw54="sms" href="sms:?&body=' + enc(full) + '"><span aria-hidden="true">💬</span>Text message</a>' +
          '<a class="tw54-btn" data-tw54="email" href="mailto:?subject=' + enc('Have you seen TeenWork?') + '&body=' + enc(p.text + '\n\n' + p.url) + '"><span aria-hidden="true">✉️</span>Email</a>' +
          '<a class="tw54-btn" data-tw54="whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=' + enc(full) + '"><span aria-hidden="true">🟢</span>WhatsApp</a>' +
          '<a class="tw54-btn" data-tw54="facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + enc(p.url) + '"><span aria-hidden="true">📘</span>Facebook</a>' +
          (navigator.share ? '<button type="button" class="tw54-btn" data-tw54="more"><span aria-hidden="true">⋯</span>More…</button>' : '') +
        '</div>' +
        (member ? inviteForm() : '') +
        (member ? '<p class="tw54-count" id="tw54-count" aria-live="polite">' + (code ? 'Checking who joined with your link…' : '') + '</p>' : '') +
        '<p class="tw54-small">' + (member ? 'Your link has a short code so we can count who joins. It never shows your name or email.' : 'Sign up to get your own link and see how many people join with it.') + '</p>' +
      '</div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) close(); });
    m.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tw54]'); if (!t) return;
      var what = t.getAttribute('data-tw54');
      if (what === 'close') { close(); return; }
      if (what === 'copy') {
        e.preventDefault();
        copy(p.url).then(function (ok) {
          t.textContent = ok ? 'Copied ✓' : 'Select & copy';
          if (!ok) { var inp = $('tw54-link-input'); if (inp) { inp.focus(); inp.select(); } }
          if (ok) toast('🔗 Link copied. Paste it anywhere to share TeenWork.', 'success');
        });
        return;
      }
      if (what === 'more') { e.preventDefault(); nativeShare(p).then(function (r) { if (r === 'shared') close(); }); return; }
      remember(what);
    });
    var form = m.querySelector('#tw54-invite');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); sendInvite(form); });
    document.body.appendChild(m);
    document.addEventListener('keydown', onKey, true);
    var first = m.querySelector('.tw54-copy'); if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
    if (member && code) joinedCount(code).then(function (n) {
      var el = $('tw54-count'); if (!el) return;
      if (n == null) { el.textContent = ''; return; }
      el.textContent = n === 0 ? 'Nobody has joined with your link yet. Send it to a friend!' : (n === 1 ? '🎉 1 person joined TeenWork with your link. Thank you!' : '🎉 ' + n + ' people joined TeenWork with your link. Thank you!');
    });
    remember('open:' + (opts.source || ''));
  }
  /* ── 5b. invite a friend by email ───────────────────────────────── */
  var INVITES_PER_DAY = 5, INVITE_AGAIN_DAYS = 30;
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
  function inviteKey(u) { return 'tw54_invites_' + acctKey(u).replace(/[^a-z0-9]/g, '_'); }
  function hashAddr(a) { var h = 2166136261; a = String(a).toLowerCase(); for (var i = 0; i < a.length; i++) { h ^= a.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function inviteState(u) {
    var s = lsGet(inviteKey(u)) || {}, today = new Date().toISOString().slice(0, 10), cut = Date.now() - INVITE_AGAIN_DAYS * 864e5;
    if (s.day !== today) { s.day = today; s.n = 0; }
    s.sent = (Array.isArray(s.sent) ? s.sent : []).filter(function (x) { return x && x.at > cut; });
    return s;
  }
  function inviteForm() {
    var left = Math.max(0, INVITES_PER_DAY - inviteState(user()).n);
    return '<form class="tw54-invite" id="tw54-invite" novalidate>' +
      '<label for="tw54-inv-to">✉️ Invite a friend by email</label>' +
      '<div class="tw54-link"><input id="tw54-inv-to" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="friend@example.com" aria-describedby="tw54-inv-msg">' +
      '<button type="submit" class="tw54-copy tw54-inv-send">Send invite</button></div>' +
      '<p class="tw54-inv-msg" id="tw54-inv-msg" role="status" aria-live="polite">TeenWork emails them your link. ' + left + ' invite' + (left === 1 ? '' : 's') + ' left today.</p>' +
      '</form>';
  }
  function firstName(u) { return String((u && (u.firstName || u.name)) || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{M}'’-]/gu, '').slice(0, 30); }
  function inviteEmail(u, link) {
    var name = firstName(u), who = name ? esc(name) : 'A friend';
    var about = u.type === 'employer'
      ? 'TeenWork connects local businesses and neighbors with teens 13&ndash;17 for small jobs. A parent approves every application, and posting a job is free.'
      : 'TeenWork helps teens 13&ndash;17 find safe local jobs like lawn care, pet sitting and snow shoveling. A parent approves every application, and chats with employers stay inside the app. It&rsquo;s free for teens and parents.';
    var html =
      '<p>Hi there,</p>' +
      '<p><strong>' + who + '</strong> thinks you&rsquo;d like TeenWork and sent you this invite.</p>' +
      '<p>' + about + '</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;"><tr><td bgcolor="#2d6a4f" style="background:#2d6a4f;border-radius:12px;">' +
        '<a href="' + esc(link) + '" style="display:inline-block;padding:14px 26px;font-family:\'DM Sans\',Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">See TeenWork</a>' +
      '</td></tr></table>' +
      '<p style="font-size:13px;color:#4b5563;">You got this email because ' + who + ' typed your address into TeenWork. We won&rsquo;t email you again unless you sign up.</p>';
    return {
      subject: (name ? name + ' invited you to TeenWork' : 'You’re invited to TeenWork'),
      html: html,
      text: (name ? name : 'A friend') + ' thinks you’d like TeenWork. ' + message(u.type) + ' ' + link
    };
  }
  function inviteMsg(form, text, kind, mailto) {
    var el = form.querySelector('#tw54-inv-msg'); if (!el) return;
    el.className = 'tw54-inv-msg' + (kind ? ' tw54-inv-' + kind : '');
    el.textContent = text;
    if (mailto) {
      var a = document.createElement('a'); a.href = mailto; a.textContent = 'Send it from your email app instead';
      a.addEventListener('click', function () { remember('invite_app'); });
      el.appendChild(document.createTextNode(' ')); el.appendChild(a);
    }
  }
  function sendInvite(form) {
    var u = user(); if (!isMember(u)) return;
    var input = form.querySelector('#tw54-inv-to'), btn = form.querySelector('.tw54-inv-send');
    var to = String(input.value || '').trim().toLowerCase();
    var mine = String(u.email || '').toLowerCase().split('#')[0];
    if (!EMAIL_RE.test(to)) { inviteMsg(form, 'That doesn’t look like an email address.', 'warn'); input.focus(); return; }
    if (to === mine) { inviteMsg(form, 'That’s your own email. Try a friend’s.', 'warn'); input.focus(); return; }
    if ((window.twIsTeamInbox && window.twIsTeamInbox(to)) || TEAM.indexOf(to) >= 0) { inviteMsg(form, 'That’s the TeenWork team’s address. Try a friend’s.', 'warn'); input.focus(); return; }
    var st = inviteState(u), h = hashAddr(to);
    if (st.sent.some(function (x) { return x.h === h; })) { inviteMsg(form, 'You already invited them this month.', 'warn'); return; }
    if (st.n >= INVITES_PER_DAY) { inviteMsg(form, 'You’ve sent ' + INVITES_PER_DAY + ' invites today. You can send more tomorrow.', 'warn'); return; }
    var link = linkFor(myCode(true)), mail = inviteEmail(u, link);
    var mailto = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(mail.subject) + '&body=' + encodeURIComponent(mail.text);
    if (typeof window.twSendViaResend !== 'function') { inviteMsg(form, 'TeenWork can’t send email invites right now.', 'warn', mailto); return; }
    var params = { to_email: to, to_name: '', from_name: 'TeenWork', reply_to: '', subject: mail.subject, message: mail.html,
      tw_heading: 'You’re invited to TeenWork', tw_icon: '📣', tw_preheader: (firstName(u) || 'A friend') + ' thinks you’d like TeenWork.', tw_share: false };
    try { if (typeof window.twBrandEmailParams === 'function') params = window.twBrandEmailParams(params); } catch (e) {}
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…';
    inviteMsg(form, 'Sending…');
    window.twSendViaResend(params).then(function () {
      var s2 = inviteState(u); s2.n += 1; s2.sent.push({ h: h, at: Date.now() }); lsSet(inviteKey(u), s2);
      remember('invite');
      input.value = '';
      var left = Math.max(0, INVITES_PER_DAY - s2.n);
      inviteMsg(form, '✓ Invite sent to ' + to + '. Thank you for sharing TeenWork! ' + left + ' left today.', 'ok');
    }, function (err) {
      var code = err && err.code;
      inviteMsg(form, code === 'rate_limited' || code === 'limit' ? 'TeenWork has sent a lot of emails today. Try again later, or' : 'TeenWork can’t send email invites right now.', 'warn', mailto);
    }).then(function () { btn.disabled = false; btn.textContent = label; });
  }

  // A tiny per-account tally, so the admin can see sharing is used (user_data row "share_stats").
  function remember(what) {
    var u = user(); if (!isMember(u)) return;
    try {
      var s = dbLoad('share_stats', null); if (!s || typeof s !== 'object') s = {};
      var k = String(what).split(':')[0];
      s[k] = (Number(s[k]) || 0) + 1; s.last = new Date().toISOString();
      dbSave('share_stats', s);
    } catch (e) {}
  }
  function nativeShare(p) {
    if (!navigator.share) return Promise.resolve('unsupported');
    return navigator.share({ title: p.title, text: p.text, url: p.url }).then(function () { remember('native'); return 'shared'; }, function (e) {
      return e && e.name === 'AbortError' ? 'cancelled' : 'failed';
    });
  }
  function phoneLike() { try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900; } catch (e) { return false; } }

  window.twShare = function (opts) {
    opts = opts || {};
    try { if (window.twCleanMenu && window.twCleanMenu.close) window.twCleanMenu.close(true); } catch (e) {}
    if (navigator.share && phoneLike() && !opts.sheet && !isMember(user())) {
      remember('open:' + (opts.source || ''));
      return nativeShare(payload()).then(function (r) { if (r === 'failed') openSheet(opts); return r; });
    }
    openSheet(opts);
    return Promise.resolve('sheet');
  };
  window.twShareLink = function () { return linkFor(shareCodeForSheet()); };
  window.twShareCode = function () { return myCode(true); };
  window.twShareClose = close;

  /* ── 6. old share spots now use this ────────────────────────────── */
  window.openReferral = function () { window.twShare({ source: 'refer', sheet: true }); };
  window.copyReferralCode = function () { window.twShare({ source: 'refer', sheet: true }); };
  window._twShareNative = function () { window.twShare({ source: 'rate' }); };
  window._twShareCopy = function () { copy(window.twShareLink()).then(function (ok) { toast(ok ? '🔗 Link copied. Paste it anywhere to share TeenWork.' : 'Copy the link: ' + window.twShareLink(), ok ? 'success' : 'info'); }); };

  /* ── 7. a new member who came through someone's link ────────────── */
  function recordReferral() {
    var u = user(); if (!isMember(u)) return;
    var from = lsGet(FROM_KEY);
    if (!from || !CODE_RE.test(String(from.code || '')) || Date.now() - Number(from.at || 0) > FROM_DAYS * 864e5) { lsSet(FROM_KEY, null); return; }
    if (dbLoad('referred_by', '')) { lsSet(FROM_KEY, null); return; }
    if (String(from.code) === String(dbLoad('ref_code', ''))) { lsSet(FROM_KEY, null); return; }
    dbSave('referred_by', String(from.code));
    lsSet(FROM_KEY, null);
  }
  (function wrapSignup() {
    var o = window._adminTrackSignup;
    if (typeof o !== 'function' || o.__tw54) return;
    var w = function () { var r = o.apply(this, arguments); try { setTimeout(recordReferral, 300); } catch (e) {} return r; };
    w.__tw54 = true;
    Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
    if (o.__twPlan) w.__twPlan = true;
    window._adminTrackSignup = w;
  })();

  /* ── 8. emails: a share box for friendly emails ─────────────────── */
  var TEAM = ['ayaquarrierdraper@gmail.com', 'aqdteenwork@gmail.com'];
  var FRIENDLY = /welcome to teenwork|approved your teenwork link|now linked with|letter of recommendation|you gave parent consent/i;
  // branded-email-v41 calls this for every email it frames; '' means no box.
  window.twEmailShareBlock = function (p, C, FONT) {
    try {
      p = p || {};
      if (p.tw_share === false) return '';
      var to = String(p.to_email || '').trim().toLowerCase();
      if (!to || TEAM.indexOf(to) >= 0) return '';
      if (p.tw_share !== true && !FRIENDLY.test(String(p.subject || ''))) return '';
      var u = user(), code = '';
      if (isMember(u) && String(u.email || '').toLowerCase() === to) code = myCode(true);
      var link = SITE + '?share=' + (code || '1');
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + C.amberPale + '" style="width:100%;margin:26px 0 4px;background:' + C.amberPale + ';border:1px solid #f6d7ae;border-radius:14px;">' +
        '<tr><td style="padding:18px 20px;font-family:' + FONT + ';">' +
          '<div style="font-size:16px;font-weight:bold;color:' + C.amberText + ';">&#128227; Know someone who&rsquo;d like TeenWork?</div>' +
          '<div style="font-size:14px;line-height:1.55;color:' + C.text + ';margin:6px 0 14px;">Share it with a friend, a parent or a local business. It&rsquo;s free for teens and parents, and every share helps more teens find safe local work.</div>' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + C.amber + '" style="background:' + C.amber + ';border-radius:10px;">' +
            '<a href="' + esc(link) + '" style="display:inline-block;padding:11px 20px;font-family:' + FONT + ';font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Share TeenWork</a>' +
          '</td></tr></table>' +
          '<div style="font-size:12px;color:' + C.muted + ';margin-top:10px;">Or just forward this email.</div>' +
        '</td></tr></table>';
    } catch (e) { return ''; }
  };

  /* ── 9. a one-time note on the dashboard ────────────────────────── */
  function nudgeKey(u) { return 'tw54_share_nudge_' + acctKey(u).replace(/[^a-z0-9]/g, '_'); }
  function maybeNudge() {
    var u = user(); if (!isMember(u)) return;
    var k = nudgeKey(u), st = lsGet(k) || { visits: 0, done: false };
    if (st.done) return;
    st.visits = (Number(st.visits) || 0) + 1; lsSet(k, st);
    if (st.visits < NUDGE_AFTER_VISITS) return;
    setTimeout(function () {
      var page = document.querySelector('.page.active'), dash = page && page.querySelector('.dashboard');
      if (!dash || dash.querySelector(':scope > .tw54-share-note')) return;
      var note = document.createElement('div');
      note.className = 'tw54-share-note';
      note.setAttribute('role', 'note');
      note.innerHTML = '<p><b>📣 Enjoying TeenWork?</b> Share it with a friend. It’s free for them too.</p>' +
        '<button type="button" class="tw54-note-share">Share</button>' +
        '<button type="button" class="tw54-note-x" aria-label="Don’t show this again">×</button>';
      function finish() { var s = lsGet(k) || {}; s.done = true; lsSet(k, s); note.remove(); }
      note.querySelector('.tw54-note-share').onclick = function () { finish(); window.twShare({ source: 'nudge' }); };
      note.querySelector('.tw54-note-x').onclick = finish;
      var head = dash.querySelector(':scope > .dash-header');
      if (head && head.nextSibling) dash.insertBefore(note, head.nextSibling); else dash.insertBefore(note, dash.firstChild);
    }, 2500);
  }
  (function wrapLaunch() {
    var o = window.launchDashboard;
    if (typeof o !== 'function' || o.__tw54) return;
    var w = function () { var r = o.apply(this, arguments); try { maybeNudge(); } catch (e) {} return r; };
    w.__tw54 = true;
    Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
    window.launchDashboard = w;
  })();

  /* ── 10. opened from an email's "Share TeenWork" button ─────────── */
  if (arrival.share) {
    var openFromEmail = function () { setTimeout(function () { window.twShare({ source: 'email', sheet: true }); }, 700); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromEmail); else openFromEmail();
  }
})();
