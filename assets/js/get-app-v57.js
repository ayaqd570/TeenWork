/* ══════════════════════════════════════════════════════════════════════
   GET THE APP  (v57, 2026-11-13, Aya: "have a download app button and a
   popup try to get users to download and send emails about sometimes")

   TeenWork is a web app with a manifest and a service worker, so it can be
   installed from the browser: no app store. This file is the one place that
   offers it.

   • window.twGetApp({ source }) opens the "Get the TeenWork app" window. It
     shows what works on this device:
       – Chrome / Edge / Samsung on Android and computers: a real
         "Download the app" button (the browser's own install prompt);
       – iPhone / iPad: the Share → Add to Home Screen steps (Safari, Chrome…);
       – other browsers: the menu steps, or "use Chrome or Edge";
       – inside Instagram / TikTok / Snapchat / Facebook: "open it in your
         browser first", with a Copy link button;
       – computers: a QR code to open TeenWork on a phone (and, for members,
         "Email me the link").
   • Where people find it: "📲 Download the app" in the dashboard menu footer
     (clean-menu-v43 owns that spot: a [data-twm="app"] item that calls
     twGetApp; until it has one, this file adds its own button there), the
     home page (top bar on computers, a band above "Share TeenWork", and the
     footer), and links in emails (https://teenwork.ayaqd.com/?app=1, also
     what the QR code opens).
   • The pop-up: a real member on their dashboard (never the home page,
     sign-up, demos or the admin) sees the same window on its own, after the
     tour and any other window is closed. At most 3 times per account on a
     device, 14 days apart; "Don't ask again" stops it; it never shows once
     TeenWork is installed or opened from the home screen. It replaces the
     old featpack-js install sheet (polish-v54 still calls
     window.twOfferInstall a few seconds after a dashboard opens; that is
     now this pop-up).
   • When TeenWork runs as an installed app and a member is signed in, the
     app tells Supabase (rpc tw_app_installed) so the "get the app" reminder
     emails stop for them (supabase/functions/app-emails).
   • https://teenwork.ayaqd.com/?unsub=<token> (the link at the bottom of
     those emails) turns the reminders off, with an Undo button.
   • When TeenWork is opened from the home screen it skips the marketing
     home page and opens Sign In.
   window.twGetApp.installed() — true when this device has TeenWork installed
   (the menu hides its button then). window.twGetApp.nudge() — the pop-up.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twGetAppV57) return;
  window.__twGetAppV57 = true;

  var SITE = 'https://teenwork.ayaqd.com/';
  var APP_LINK = SITE + '?app=1';
  var INSTALLED = 'tw57_app_installed';   // localStorage: this device installed TeenWork (accepted the prompt / opened it as an app)
  var NUDGE_GAP_DAYS = 14, NUDGE_MAX = 3;
  // pop-up timing: polish-v54 asks 8 s after a dashboard opens, this waits 4 s more (about 12 s in), then
  // checks every 10 s for up to 2 minutes until nothing else is on screen
  var T = { first: 4000, retry: 10000, giveUp: 120000 };
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function user() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; } catch (e) { return window.currentUser || null; } }
  function isPractice(u) {
    if (!u) return false;
    if (u.isDemo || u.twDemo || window.twDemo || (window._twDemoSandbox && window._twDemoSandbox.active)) return true;
    if (/@teenwork\.demo$/i.test(String(u.email || ''))) return true;
    try { return typeof window._twIsDemoSandboxUser === 'function' && !!window._twIsDemoSandboxUser(u); } catch (e) { return false; }
  }
  function isMember(u) { return !!(u && !u.isAdmin && u.type !== 'admin' && /^(teen|parent|employer)$/.test(u.type) && /@/.test(String(u.email || '')) && !isPractice(u)); }
  function acctKey(u) { return String((u && (u.dataKey || u.email)) || '').toLowerCase(); }
  function slug(k) { return String(k).replace(/[^a-z0-9]/g, '_'); }
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (e) { return null; }
  }

  /* ── 1. what this device can do ─────────────────────────────────── */
  var deferred = null;   // the browser's install prompt (Chrome, Edge, Samsung Internet…)
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // no mini-infobar: TeenWork offers it at a better moment
    deferred = e;
    refresh();
  });
  window.addEventListener('appinstalled', function () { markInstalled(); refresh(); });

  function standalone() {
    try {
      return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches ||
        matchMedia('(display-mode: minimal-ui)').matches || matchMedia('(display-mode: window-controls-overlay)').matches ||
        navigator.standalone === true || /^android-app:\/\//.test(document.referrer || '');
    } catch (e) { return false; }
  }
  function installed() { return standalone() || lsGet(INSTALLED) === true; }

  function device() {
    var ua = navigator.userAgent || '';
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var inApp = /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Bytedance|Line\/|Pinterest|LinkedInApp|GSA\//.test(ua);
    var browser =
      ios ? (/CriOS/.test(ua) ? 'chrome' : /EdgiOS/.test(ua) ? 'edge' : /FxiOS/.test(ua) ? 'firefox' : /OPiOS|OPT\//.test(ua) ? 'opera' : /Safari/.test(ua) ? 'safari' : 'other')
      : /SamsungBrowser/.test(ua) ? 'samsung'
      : /Edg(e|A)?\//.test(ua) ? 'edge'
      : /OPR\/|Opera/.test(ua) ? 'opera'
      : /Firefox\//.test(ua) ? 'firefox'
      : /Chrome\/|Chromium\//.test(ua) ? 'chrome'
      : /Safari\//.test(ua) ? 'safari'
      : 'other';
    var phone = ios || android || /Mobi/i.test(ua);
    return { ios: ios, ipad: ios && !/iPhone|iPod/.test(ua), android: android, phone: phone, computer: !phone, inApp: inApp, browser: browser };
  }

  function markInstalled() {
    lsSet(INSTALLED, true);
    reportInstalled();
  }
  // Tell Supabase this member has the app, so the reminder emails stop. Once a week per account per device.
  var reporting = false;
  function reportInstalled() {
    var u = user();
    if (!isMember(u) || reporting || !installed()) return;
    var key = 'tw57_app_reported_' + slug(acctKey(u));
    if (Date.now() - (Number(lsGet(key)) || 0) < 7 * 864e5) return;
    reporting = true;
    client().then(function (c) {
      if (!c || typeof c.rpc !== 'function') return;
      return Promise.resolve(c.rpc('tw_app_installed')).then(function (r) { if (r && !r.error && r.data) lsSet(key, Date.now()); });
    }).catch(function () {}).then(function () { reporting = false; });
  }

  /* ── 2. the window ──────────────────────────────────────────────── */
  var ICON = {
    share: '<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    add: '<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    dots: '<span class="tw57-key" aria-hidden="true">⋮</span>',
    install: '<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v6M9.5 11 12 13.5 14.5 11M8 20.5h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function b(t) { return '<b>' + t + '</b>'; }

  // The "how to" for this device. Returns { button, steps[], note }.
  function howTo(d) {
    var out = { button: '', steps: [], note: '' };
    if (deferred) {
      out.button = d.computer ? '💻 Install on this computer' : '📲 Download the app';
      out.note = d.computer ? 'Your browser asks you to confirm. TeenWork then opens in its own window.' : 'Your phone asks you to confirm. TeenWork then shows up on your home screen.';
      return out;
    }
    if (d.inApp) {
      out.lead = 'You opened TeenWork inside another app, which can’t add apps to your phone.';
      out.steps = [
        'Tap the ' + b('⋯') + ' or menu button in the corner of this screen.',
        'Choose ' + b(d.ios ? 'Open in Safari' : 'Open in browser') + ' (or ' + b('Open in Chrome') + ').',
        'Tap ' + b('Download the app') + ' again there.'
      ];
      out.copy = true;
      return out;
    }
    if (d.ios) {
      if (d.browser === 'safari') {
        out.steps = [
          'Tap the ' + b('Share') + ' button ' + ICON.share + (d.ipad ? ' at the top of Safari.' : ' at the bottom of Safari.'),
          'Scroll down and tap ' + b('Add to Home Screen') + ' ' + ICON.add + '.',
          'Tap ' + b('Add') + '. TeenWork is now on your home screen.'
        ];
      } else {
        out.steps = [
          'Tap the ' + b('Share') + ' button ' + ICON.share + (d.browser === 'chrome' ? ' next to the address bar.' : ' (it may be in the ' + b('⋯') + ' menu).'),
          'Tap ' + b('Add to Home Screen') + ' ' + ICON.add + '. You may need to tap ' + b('More') + ' first.',
          'Tap ' + b('Add') + '.'
        ];
        out.note = 'Don’t see it? Open teenwork.ayaqd.com in Safari and try there.';
      }
      return out;
    }
    if (d.android) {
      if (d.browser === 'samsung') {
        out.steps = ['Tap the menu ' + b('☰') + ' at the bottom of the screen.', 'Tap ' + b('Add page to') + ', then ' + b('Home screen') + '.', 'Tap ' + b('Add') + '.'];
      } else if (d.browser === 'firefox') {
        out.steps = ['Tap the menu ' + ICON.dots + ' next to the address bar.', 'Tap ' + b('Install') + ' or ' + b('Add to Home screen') + '.', 'Tap ' + b('Add') + '.'];
      } else {
        out.steps = ['Tap the menu ' + ICON.dots + ' at the top right.', 'Tap ' + b('Install app') + ' or ' + b('Add to Home screen') + '.', 'Tap ' + b('Install') + '.'];
      }
      return out;
    }
    // computers without the browser's prompt
    if (d.browser === 'chrome') out.steps = ['Click the install icon ' + ICON.install + ' at the right end of the address bar.', 'Or open the menu ' + ICON.dots + ', then ' + b('Cast, save and share') + ' → ' + b('Install page as app') + '.'];
    else if (d.browser === 'edge') out.steps = ['Open the menu ' + b('⋯') + ' at the top right.', 'Choose ' + b('Apps') + ' → ' + b('Install this site as an app') + '.'];
    else if (d.browser === 'safari') out.steps = ['In the menu bar, choose ' + b('File') + ' → ' + b('Add to Dock') + '.'];
    else out.note = (d.browser === 'firefox' ? 'Firefox can’t install apps on computers. ' : '') + 'To install TeenWork on a computer, open it in Chrome or Edge.';
    return out;
  }

  function leadFor(u) {
    var t = u && u.type;
    if (t === 'teen') return 'Find jobs, answer messages and log your hours in one tap.';
    if (t === 'parent') return 'See your teen’s job requests and alerts in one tap.';
    if (t === 'employer') return 'Post jobs and answer applicants in one tap.';
    return 'Safe local jobs for teens, one tap from your home screen.';
  }

  var lastFocus = null, current = null;
  function close() {
    var m = $('tw57-app'); if (!m) return;
    m.remove();
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('tw57-open');
    current = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    lastFocus = null;
  }
  function onKey(e) {
    var m = $('tw57-app'); if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(m.querySelectorAll('button, a[href], input')).filter(function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function body(opts) {
    var d = device(), u = user(), member = isMember(u);
    if (standalone()) {
      return '<div class="tw57-done"><p class="tw57-big">✓ You’re using the TeenWork app.</p><p>It opens from your home screen like any other app. You can close this.</p></div>';
    }
    if (opts.justInstalled) {
      return '<div class="tw57-done"><p class="tw57-big">🎉 TeenWork is installed.</p><p>' + (d.computer ? 'Open it from your Start menu, Dock or desktop next time.' : 'Next time, open it from your home screen.') + ' Sign in with the same email and password.</p></div>';
    }
    var h = howTo(d), html = '';
    html += '<ul class="tw57-pills" aria-label="About the app"><li>Free</li><li>No app store</li><li>Same account</li></ul>';
    if (h.lead) html += '<p class="tw57-warn">' + esc(h.lead) + '</p>';
    if (h.button) html += '<button type="button" class="tw57-go" data-tw57="install">' + esc(h.button) + '</button>';
    if (h.steps.length) {
      html += (d.computer && !h.button ? '<h3 class="tw57-h">On this computer</h3>' : (h.button ? '' : '<h3 class="tw57-h">' + (d.ios ? 'Add it to your home screen' : 'Install it') + '</h3>'));
      html += '<ol class="tw57-steps">' + h.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
    }
    if (h.copy) html += '<button type="button" class="tw57-alt" data-tw57="copy">🔗 Copy the TeenWork link</button>';
    if (h.note) html += '<p class="tw57-small">' + esc(h.note) + '</p>';
    if (d.computer) {
      html += '<div class="tw57-phone"><img class="tw57-qr" src="assets/img/get-app-qr.svg" width="132" height="132" alt="QR code that opens teenwork.ayaqd.com">' +
        '<div><h3 class="tw57-h">📱 On your phone</h3><p>Point your phone’s camera at the code, then tap <b>Download the app</b>. Or open <b>teenwork.ayaqd.com</b> on your phone.</p>' +
        (member ? '<button type="button" class="tw57-alt" data-tw57="email">✉️ Email me the link</button><p class="tw57-small" id="tw57-email-msg" role="status" aria-live="polite"></p>' : '') +
        '</div></div>';
    }
    if (!h.button) html += '<p class="tw57-small">Then sign in with the same email and password. It’s the same TeenWork: your account, jobs and messages are all there.</p>';
    if (opts.nudge) html += '<div class="tw57-foot"><button type="button" class="tw57-later" data-tw57="later">Not now</button><button type="button" class="tw57-never" data-tw57="never">Don’t ask again</button></div>';
    return html;
  }

  function open(opts) {
    opts = opts || {};
    var had = $('tw57-app');
    if (had) had.remove(); else lastFocus = document.activeElement;
    current = opts;
    var u = user();
    var m = document.createElement('div');
    m.id = 'tw57-app';
    m.className = 'tw57-app' + (opts.nudge ? ' tw57-is-nudge' : '');
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw57-title');
    m.innerHTML =
      '<div class="tw57-card">' +
        '<button type="button" class="tw57-x" data-tw57="close" aria-label="Close">✕</button>' +
        '<div class="tw57-head"><img class="tw57-logo" src="logo.png" width="52" height="52" alt="">' +
          '<div><h2 id="tw57-title">Get the TeenWork app</h2><p class="tw57-lead">' + esc(leadFor(u)) + '</p></div></div>' +
        '<div class="tw57-body" id="tw57-body">' + body(opts) + '</div>' +
      '</div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) close(); });
    m.addEventListener('click', onClick);
    document.body.appendChild(m);
    document.body.classList.add('tw57-open');
    document.addEventListener('keydown', onKey, true);
    var first = m.querySelector('.tw57-go') || m.querySelector('.tw57-x');
    if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }
  function refresh() {
    syncButtons();
    var bd = $('tw57-body');
    if (bd && current) bd.innerHTML = body(current);
  }

  function onClick(e) {
    var t = e.target.closest('[data-tw57]'); if (!t) return;
    var what = t.getAttribute('data-tw57');
    if (what === 'close' || what === 'later') { close(); return; }
    if (what === 'never') { noteNudge({ never: true }); close(); toast('OK, we won’t ask again. “Download the app” is in the menu any time.', 'info'); return; }
    if (what === 'install') { promptInstall(); return; }
    if (what === 'copy') {
      copy(SITE).then(function (ok) { t.textContent = ok ? '✓ Link copied. Paste it in your browser.' : 'teenwork.ayaqd.com'; });
      return;
    }
    if (what === 'email') { emailLink(t); return; }
  }

  function promptInstall() {
    var p = deferred; if (!p) { refresh(); return; }
    deferred = null;   // a prompt can only be used once
    try { p.prompt(); } catch (e) { refresh(); return; }
    Promise.resolve(p.userChoice).then(function (r) {
      if (r && r.outcome === 'accepted') {
        markInstalled();
        if (current && current.nudge) noteNudge({ never: true });
        if ($('tw57-app')) { current = Object.assign({}, current, { justInstalled: true, nudge: false }); refresh(); }
        toast('🎉 TeenWork is installed.', 'success');
      } else {
        refresh();   // they said no to the browser; the window now shows the manual steps (or closes)
      }
    }).catch(function () { refresh(); });
  }

  async function copy(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    try {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  // "Email me the link": to the member's own address only, once a day on this device.
  function emailLink(btn) {
    var u = user(), msg = $('tw57-email-msg');
    var say = function (s) { if (msg) msg.textContent = s; };
    if (!isMember(u)) return;
    var key = 'tw57_app_emailed_' + slug(acctKey(u));
    if (Date.now() - (Number(lsGet(key)) || 0) < 864e5) { say('We already emailed you the link today. Check your inbox (and spam).'); return; }
    if (typeof window.twSendEmail !== 'function') { say('Email isn’t available right now. Open teenwork.ayaqd.com on your phone instead.'); return; }
    var name = String(u.firstName || u.name || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{M}'’-]/gu, '').slice(0, 30);
    var html =
      '<p>Hi ' + esc(name || 'there') + ',</p>' +
      '<p>Here’s your link to put TeenWork on your phone. Open this email on your phone and tap the button:</p>' +
      '<p style="text-align:center;margin:22px 0;"><a href="' + APP_LINK + '" style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;">📲 Get the TeenWork app</a></p>' +
      '<p><b>iPhone:</b> open it in Safari, tap the Share button, then <b>Add to Home Screen</b>.<br><b>Android:</b> open it in Chrome, then tap <b>Install app</b> (or menu ⋮ → <b>Add to Home screen</b>).</p>' +
      '<p>Then sign in with the same email and password. It’s free, with no app store.</p>';
    btn.disabled = true; say('Sending…');
    Promise.resolve(window.twSendEmail(u.email, '📲 Your TeenWork app link', html, { heading: 'Put TeenWork on your phone', icon: '&#128242;', preheader: 'Open this on your phone and tap the button. Free, no app store.' }))
      .then(function (ok) {
        btn.disabled = false;
        if (ok === false) { say('That didn’t send. Open teenwork.ayaqd.com on your phone instead.'); return; }
        lsSet(key, Date.now());
        say('Sent to ' + u.email + '. Open it on your phone.');
      }, function () { btn.disabled = false; say('That didn’t send. Open teenwork.ayaqd.com on your phone instead.'); });
  }

  /* ── 3. the pop-up ──────────────────────────────────────────────── */
  function nudgeKey(u) { return 'tw57_app_nudge_' + slug(acctKey(u)); }
  function nudgeState(u) { var s = lsGet(nudgeKey(u)); return s && typeof s === 'object' ? s : { n: 0, last: 0, never: false }; }
  function noteNudge(o) {
    var u = user(); if (!isMember(u)) return;
    var s = nudgeState(u);
    if (o.shown) { s.n = (s.n || 0) + 1; s.last = Date.now(); }
    if (o.never) s.never = true;
    lsSet(nudgeKey(u), s);
  }
  function onDashboard() {
    var act = document.querySelector('.page.active');
    return !!(act && /^page-(teen|parent|employer)$/.test(act.id));
  }
  // Something else is on screen: the tour, another window, the phone menu, the parent-link screen…
  var BUSY = '#tw34-tour, #tw-tour-overlay, #tw-tour-card, #v14-tour-overlay, #v14-tour-card, #parent-lock-overlay, .modal-overlay.open, .modal-overlay.active, #tw54-share, #twm-sheet, #msgModal.open, [role="dialog"][aria-modal="true"], .bottom-sheet.open';
  function busy() {
    var els = document.querySelectorAll(BUSY);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.id === 'tw57-app') continue;
      var cs = getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && el.getClientRects().length) return true;
    }
    return false;
  }
  function mayNudge() {
    var u = user();
    if (!isMember(u) || installed() || !onDashboard() || $('tw57-app')) return false;
    var s = nudgeState(u);
    if (s.never || (s.n || 0) >= NUDGE_MAX) return false;
    if (s.last && Date.now() - s.last < NUDGE_GAP_DAYS * 864e5) return false;
    return true;
  }
  var nudgeTimer = 0, nudgeSince = 0;
  function nudge() {
    reportInstalled();
    clearTimeout(nudgeTimer);
    if (!mayNudge()) return false;
    nudgeSince = Date.now();
    var who = acctKey(user());
    var tick = function () {
      if (acctKey(user()) !== who || !mayNudge()) return;
      if (busy() || document.hidden) {
        if (Date.now() - nudgeSince < T.giveUp) nudgeTimer = setTimeout(tick, T.retry);
        return;
      }
      noteNudge({ shown: true });
      open({ source: 'popup', nudge: true });
    };
    nudgeTimer = setTimeout(tick, T.first);
    return true;
  }

  /* ── 4. buttons: menu footer, home page ─────────────────────────── */
  function menuButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'twm-item tw57-menu-app';
    b.setAttribute('data-tw57-menu', 'app');
    b.innerHTML = '<span class="twm-ic" aria-hidden="true">📲</span><span class="twm-lb">Download the app</span>';
    b.addEventListener('click', function () {
      var x = document.querySelector('#twm-sheet [data-twm="close"]');   // close the phone menu first
      if (x) x.click();
      window.twGetApp({ source: 'menu' });
    });
    return b;
  }
  function syncButtons() {
    var have = installed();
    // dashboard menu: clean-menu-v43's own [data-twm="app"] item wins; until it exists, add ours
    ['#twm-side .twm-foot', '#twm-sheet .twm-sheet-foot'].forEach(function (sel) {
      var foot = document.querySelector(sel); if (!foot) return;
      var theirs = foot.querySelector('[data-twm="app"]'), ours = foot.querySelector('[data-tw57-menu="app"]');
      if (theirs) { if (ours) ours.remove(); theirs.hidden = have; return; }
      if (!ours) { ours = menuButton(); foot.insertBefore(ours, foot.firstChild); }
      ours.hidden = have;
    });
    // home page
    var nav = $('tw51-nav-employers');
    if (nav && !$('tw57-nav-app')) {
      var nb = document.createElement('button');
      nb.type = 'button'; nb.id = 'tw57-nav-app'; nb.className = 'tw57-nav-app';
      nb.innerHTML = '<span aria-hidden="true">📲</span> Get the app';
      nb.addEventListener('click', function () { window.twGetApp({ source: 'home-nav' }); });
      nav.parentNode.insertBefore(nb, nav);
    }
    var share = $('tw54-share-band');
    if (share && !$('tw57-app-band')) {
      var band = document.createElement('div');
      band.id = 'tw57-app-band'; band.className = 'tw57-app-band';
      band.innerHTML = '<p><b>📲 Get TeenWork on your phone.</b> It’s free, with no app store, and opens like any other app.</p>' +
        '<button type="button">Download the app</button>';
      band.querySelector('button').addEventListener('click', function () { window.twGetApp({ source: 'home' }); });
      share.parentNode.insertBefore(band, share);
    }
    var foot = document.querySelector('#page-landing .landing-footer');
    if (foot && !$('tw57-foot-app')) {
      var shareLink = [].slice.call(foot.querySelectorAll('button')).filter(function (x) { return /Share TeenWork/.test(x.textContent); })[0];
      var span = document.createElement('span');
      span.id = 'tw57-foot-app';
      span.innerHTML = ' &nbsp;·&nbsp; <button class="terms-link" type="button">Download the app</button>';
      span.querySelector('button').addEventListener('click', function () { window.twGetApp({ source: 'footer' }); });
      if (shareLink && shareLink.nextSibling) foot.insertBefore(span, shareLink.nextSibling); else foot.appendChild(span);
    }
    ['tw57-nav-app', 'tw57-app-band', 'tw57-foot-app'].forEach(function (id) { var el = $(id); if (el) el.hidden = standalone(); });
  }

  /* ── 5. arriving from an email or the QR code (?app=1), or an unsubscribe link (?unsub=…) ── */
  var arrival = (function () {
    var out = { app: false, unsub: '' };
    try {
      var q = new URLSearchParams(location.search);
      out.app = q.has('app');
      var t = String(q.get('unsub') || '');
      if (UUID_RE.test(t)) out.unsub = t.toLowerCase();
      if (q.has('app') || q.has('unsub')) {
        q.delete('app'); q.delete('unsub');
        var s = q.toString();
        history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
      }
    } catch (e) {}
    return out;
  })();

  function unsubWindow(token) {
    lastFocus = document.activeElement;
    current = { source: 'unsub' };
    var m = document.createElement('div');
    m.id = 'tw57-app'; m.className = 'tw57-app';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw57-title');
    m.innerHTML = '<div class="tw57-card"><button type="button" class="tw57-x" data-tw57="close" aria-label="Close">✕</button>' +
      '<div class="tw57-head"><img class="tw57-logo" src="logo.png" width="52" height="52" alt=""><div><h2 id="tw57-title">TeenWork emails</h2></div></div>' +
      '<div class="tw57-body"><p class="tw57-big" id="tw57-unsub-msg" role="status" aria-live="polite">Turning off reminder emails…</p>' +
      '<p class="tw57-small" id="tw57-unsub-more"></p><button type="button" class="tw57-alt" id="tw57-unsub-undo" hidden>Undo: keep sending them</button></div></div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) close(); });
    m.addEventListener('click', function (e) { var t = e.target.closest('[data-tw57="close"]'); if (t) close(); });
    document.body.appendChild(m);
    document.addEventListener('keydown', onKey, true);
    var msg = $('tw57-unsub-msg'), more = $('tw57-unsub-more'), undo = $('tw57-unsub-undo');
    var call = function (fn) {
      return client().then(function (c) {
        if (!c || typeof c.rpc !== 'function') throw new Error('offline');
        return c.rpc(fn, { p_token: token });
      }).then(function (r) { if (!r || r.error) throw new Error('failed'); return !!r.data; });
    };
    call('tw_email_unsubscribe').then(function (ok) {
      if (!ok) { msg.textContent = 'That link has expired or isn’t valid.'; more.textContent = 'If you keep getting emails you don’t want, tell us through Help & Support in the app.'; return; }
      msg.textContent = '✓ You won’t get TeenWork reminder emails any more.';
      more.textContent = 'You’ll still get the emails you need, like sign-in codes, parent approvals and messages about your jobs.';
      undo.hidden = false;
      undo.onclick = function () {
        undo.disabled = true;
        call('tw_email_resubscribe').then(function () { msg.textContent = '✓ Reminder emails are back on.'; more.textContent = ''; undo.hidden = true; },
          function () { undo.disabled = false; more.textContent = 'That didn’t work. Please try again in a minute.'; });
      };
    }, function () {
      msg.textContent = 'Sorry, we couldn’t do that right now.';
      more.textContent = 'Check your internet connection and open the link from the email again.';
    });
  }

  /* ── 6. start ───────────────────────────────────────────────────── */
  var api = function (opts) { return open(Object.assign({ source: 'button' }, opts || {})); };
  api.installed = installed;
  api.nudge = nudge;
  api.device = device;
  api.canPrompt = function () { return !!deferred; };
  api._t = T;   // timings, for tests
  window.twGetApp = api;
  // polish-v54 calls this a few seconds after a member's dashboard opens; featpack-js's sheet is retired.
  window.twOfferInstall = nudge;
  window.featpackInstall = function () { document.getElementById('featpack-install')?.classList.remove('open'); return api({ source: 'old-sheet' }); };

  function start() {
    syncButtons();
    try { if (window.twCleanMenu && typeof window.twCleanMenu.sync === 'function') window.twCleanMenu.sync(); } catch (e) {}
    // the menu is rebuilt for each sign-in and the phone menu is made when opened: add / hide our buttons each time
    var pending = false;
    new MutationObserver(function () {
      if (pending) return; pending = true;
      setTimeout(function () { pending = false; syncButtons(); }, 0);
    }).observe(document.body, { childList: true });
    // opened from the home screen: skip the marketing home page and go straight to Sign In
    if (standalone()) {
      markInstalled();
      setTimeout(function () {
        var act = document.querySelector('.page.active');
        if (act && act.id === 'page-landing' && !user() && typeof window.gotoPage === 'function' && !/[?&]view=/.test(location.search)) { try { window.gotoPage('login'); } catch (e) {} }
      }, 300);
    }
    if (arrival.unsub) setTimeout(function () { unsubWindow(arrival.unsub); }, 400);
    else if (arrival.app) setTimeout(function () { api({ source: 'link' }); }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
