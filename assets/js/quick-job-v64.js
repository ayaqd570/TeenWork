/* ══════════════════════════════════════════════════════════════════════
   quick-job-v64 — "Post a small job" from a shared link (2026-11-18)
   Aya's review, item 4: "Let a neighbour post a small job ('rake leaves
   Saturday, $40') from a shared link in under a minute, without setting up
   a full business profile."
   • https://teenwork.ayaqd.com/?view=quick-job is one short page: what needs
     doing, when, pay, how long, town; then name, email and a password so the
     neighbor can come back and see who applied. No business name, street
     address, plan or tour.
   • The link: "Ask someone to post a job" (share-v54, used by the empty Find
     Jobs list) now sends this address; the For employers card on the home
     page links here; and the window after posting has "Invite a neighbor".
   • Posting reuses the app's own sign-up (doSignup → an employer account) and
     its own Post a Job (postJob). So every check that guards a job still
     runs: the word and state rules (featpack-v24), the AI screen, job tiers,
     plan limits and the shared job board. The rule check also runs before the
     account is made, so a job the rules refuse never leaves an account behind.
   • Posted jobs carry neighbor: true. Teens see "🏡 Neighbor job" on the card.
     A parent's approval card says a private person posted it and that
     TeenWork doesn't check who posts jobs.
   • "Email me when a teen applies" (ticked by default) saves notify: true on
     the job. When a parent says OK (or a tester teen with no parent applies),
     that browser emails the poster through twSendEmail. The address and the
     choice are read again from the poster's own job row first, and each
     application is emailed once per browser.
   • A signed-in employer posts straight away. A signed-in teen or parent is
     asked to sign out first (jobs come from employer accounts).
   window.twQuickJob = { open, link, post }
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twQuickJob64) return;
  window.__twQuickJob64 = true;

  var VIEW = 'quick-job';
  var SITE = 'https://teenwork.ayaqd.com/';
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
  var KINDS = [
    { v: 'yard work', icon: '🍂', label: 'Yard or snow', re: /\b(rak(e|ing)|lea(f|ves)|lawn|mow|yard|garden|weed|snow|shovel|plant|mulch|hedge|gutter|brush|wood ?pile|firewood|stack)/i },
    { v: 'pet care', icon: '🐶', label: 'Pet care', re: /\b(dog|cat|pet|puppy|kitten|litter|feed the|chicken|horse|bird|fish tank)/i },
    { v: 'babysitting', icon: '🧸', label: 'Babysitting', re: /\b(babysit|baby|kids?\b|child|sitter|nanny|mother.?s helper|watch (my|the|our) (son|daughter|kids))/i },
    { v: 'cleaning', icon: '🧹', label: 'Cleaning', re: /\b(clean|wash|tidy|organi[sz]e|dust|vacuum|windows?\b|dishes|declutter|sweep)/i },
    { v: 'moving help', icon: '📦', label: 'Moving help', re: /\b(mov(e|ing)|carry|lift|box(es)?\b|haul|furniture|unload|load)/i },
    { v: 'other', icon: '✨', label: 'Something else', re: null }
  ];
  var LONG = [
    { h: 1, label: 'About an hour' },
    { h: 3, label: '2 to 3 hours' },
    { h: 5, label: 'Half a day' },
    { h: 8, label: 'A full day' }
  ];
  var DEFAULT_LONG = 3;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function low(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function oneLine(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 80); }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }
  function later(fn, ms) { return setTimeout(function () { try { fn(); } catch (e) { console.warn('quick-job-v64:', e); } }, ms || 0); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function waitFor(fn, ms) { var t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(150); } return !!fn(); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function me() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; } catch (e) { return window.currentUser || null; } }
  function isPractice(u) {
    if (!u) return false;
    if (u.isDemo || u.twDemo || /\.demo$/i.test(String(u.email || ''))) return true;
    try { return typeof window._twIsDemoSandboxUser === 'function' && !!window._twIsDemoSandboxUser(u); } catch (e) { return false; }
  }
  function signedIn(u) { return !!(u && (u.isAdmin || ['teen', 'parent', 'employer'].indexOf(u.type) >= 0)); }
  function isEmployer(u) { return !!(u && !u.isAdmin && u.type === 'employer' && /@/.test(String(u.email || ''))); }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function posted() { try { return typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []; } catch (e) { return []; } }
  function browsable() { try { return typeof browsableJobs !== 'undefined' ? browsableJobs : []; } catch (e) { return []; } }
  function apps() { try { return typeof demoJobs !== 'undefined' ? demoJobs : []; } catch (e) { return []; } }
  function isOn(el) { return !!el && el.classList.contains('active'); }
  function textOf(el) {
    if (!el) return '';
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('button, a, strong'), function (b) { if (b.tagName !== 'STRONG' || /Oops/i.test(b.textContent)) b.remove(); });
    return oneLine(c.textContent, 300);
  }

  /* ── 1. dates for the "When" chips ─────────────────────────────── */
  function dayLabel(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function nextDow(dow) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return d; }
  function whenChips() {
    var sat = nextDow(6), sun = nextDow(0), today = new Date().getDay();
    var out = [];
    if (today === 0) out.push({ t: 'Today, ' + dayLabel(sun), v: 'Today, ' + dayLabel(sun) }); // Sunday: this weekend is today
    else {
      out.push({ t: (today === 6 ? 'Today, ' : '') + dayLabel(sat), v: (today === 6 ? 'Today, ' : '') + dayLabel(sat) });
      out.push({ t: dayLabel(sun), v: dayLabel(sun) });
    }
    out.push({ t: 'This week', v: 'Any day this week' });
    out.push({ t: 'Flexible', v: 'Flexible, we can pick a day' });
    return out;
  }

  /* ── 2. the page ───────────────────────────────────────────────── */
  var mode = 'new';       // 'new' account or 'signin' to an existing employer account
  var busy = false;
  function stateOptions() {
    var src = $('emp-state') || $('su-emp-state');
    var html = src ? src.innerHTML : '<option value="Vermont">Vermont</option>';
    return html.replace(/\sselected(="[^"]*")?/g, '');
  }
  function pageHTML() {
    return '' +
      '<div class="auth-wrap tw64-wrap"><div class="auth-card tw64-card">' +
        '<a class="tw64-brand" href="./" data-tw64="home" aria-label="TeenWork home"><img src="assets/img/small-logo.png" alt="" width="36" height="36"><span>TeenWork</span></a>' +
        '<h2 id="tw64-title">Post a small job</h2>' +
        '<p class="sub tw64-sub">Need a hand with leaves, snow, a dog walk or a move? Teens 13–17 near you can help. It’s free and takes about a minute.</p>' +
        '<div id="tw64-who" class="tw64-who" hidden></div>' +
        '<form id="tw64-form" novalidate>' +
          '<fieldset class="tw64-set"><legend>The job</legend>' +
            '<div class="form-group"><label for="tw64-what">What needs doing?</label>' +
              '<input type="text" id="tw64-what" maxlength="80" autocomplete="off" placeholder="e.g. Rake leaves in the front yard"></div>' +
            '<div class="form-group tw64-kinds" role="radiogroup" aria-labelledby="tw64-kind-label"><span class="tw64-label" id="tw64-kind-label">Kind of job</span><div class="tw64-chips">' +
              KINDS.map(function (k, i) { return '<label class="tw64-chip"><input type="radio" name="tw64-kind" value="' + esc(k.v) + '"' + (i === KINDS.length - 1 ? '' : '') + '><span>' + k.icon + ' ' + esc(k.label) + '</span></label>'; }).join('') +
            '</div></div>' +
            '<div class="form-group"><label for="tw64-when">When?</label>' +
              '<input type="text" id="tw64-when" maxlength="60" autocomplete="off" placeholder="e.g. Saturday morning">' +
              '<div class="tw64-chips tw64-when-chips" id="tw64-when-chips"></div></div>' +
            '<div class="tw64-row">' +
              '<div class="form-group"><label for="tw64-pay">Pay</label><div class="tw64-money"><span aria-hidden="true">$</span><input type="number" id="tw64-pay" inputmode="decimal" min="1" max="2000" step="1" placeholder="40"></div></div>' +
              '<div class="form-group" role="radiogroup" aria-label="How the pay works"><span class="tw64-label" aria-hidden="true">&nbsp;</span><div class="tw64-seg">' +
                '<label><input type="radio" name="tw64-paytype" value="flat" checked><span>For the job</span></label>' +
                '<label><input type="radio" name="tw64-paytype" value="hourly"><span>Per hour</span></label>' +
              '</div></div>' +
            '</div>' +
            '<div class="form-group"><label for="tw64-long">About how long?</label><select id="tw64-long">' +
              LONG.map(function (l) { return '<option value="' + l.h + '"' + (l.h === DEFAULT_LONG ? ' selected' : '') + '>' + esc(l.label) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="tw64-row">' +
              '<div class="form-group"><label for="tw64-city">Town</label><input type="text" id="tw64-city" list="tw64-city-list" maxlength="60" autocomplete="address-level2" placeholder="e.g. Burlington"><datalist id="tw64-city-list"></datalist></div>' +
              '<div class="form-group"><label for="tw64-state">State</label><select id="tw64-state" autocomplete="address-level1">' + stateOptions() + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label for="tw64-details">Anything else? <span class="tw64-opt">(optional)</span></label>' +
              '<textarea id="tw64-details" rows="2" maxlength="400" placeholder="e.g. Rakes and bags are in the shed."></textarea>' +
              '<p class="tw64-hint">Please leave your street address out. You’ll share it in Messages with the teen you choose.</p></div>' +
          '</fieldset>' +
          '<fieldset class="tw64-set" id="tw64-you"><legend>About you</legend>' +
            '<p class="tw64-hint tw64-you-note" id="tw64-you-note">So you can see who applies and message them. No business needed.</p>' +
            '<div class="form-group" id="tw64-name-row"><label for="tw64-name">Your name</label><input type="text" id="tw64-name" maxlength="60" autocomplete="name" placeholder="First and last name"></div>' +
            '<div class="form-group"><label for="tw64-email">Email</label><input type="email" id="tw64-email" maxlength="120" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" placeholder="you@example.com"></div>' +
            '<div class="form-group"><label for="tw64-pw" id="tw64-pw-label">Make a password</label><div class="tw64-pw"><input type="password" id="tw64-pw" maxlength="128" autocomplete="new-password" placeholder="At least 8 characters">' +
              '<button type="button" class="tw64-show" data-tw64="show" aria-controls="tw64-pw" aria-pressed="false">Show</button></div></div>' +
            '<p class="tw64-switch" id="tw64-switch"></p>' +
            '<label class="tw64-check" id="tw64-terms-row"><input type="checkbox" id="tw64-terms"><span>I’m 18 or older and I agree to the <button type="button" class="terms-link" data-tw64="terms">Terms of Use &amp; Privacy Policy</button>.</span></label>' +
          '</fieldset>' +
          '<label class="tw64-check"><input type="checkbox" id="tw64-notify" checked><span>Email me when a teen applies (after their parent says OK)</span></label>' +
          '<div id="tw64-alert" class="alert" role="alert" aria-live="assertive"></div>' +
          '<button type="submit" class="btn-primary form-submit tw64-go" id="tw64-go">Post my job</button>' +
          '<p class="tw64-status" id="tw64-status" role="status" aria-live="polite"></p>' +
          '<div class="tw64-next"><b>What happens next</b><ul>' +
            '<li>Teens near you see the job. Teens and parents see your name, your town and what you wrote.</li>' +
            '<li>A teen can only apply after their parent says OK. Then you choose who to hire.</li>' +
            '<li>TeenWork doesn’t check the background of anyone who posts jobs, so parents decide whether their teen can work for you.</li>' +
          '</ul></div>' +
        '</form>' +
        '<p class="auth-switch tw64-foot"><a href="./" data-tw64="home">← Back to home</a></p>' +
      '</div></div>';
  }
  function buildPage() {
    if ($('page-' + VIEW)) return $('page-' + VIEW);
    var anchor = $('page-signup') || $('page-login');
    if (!anchor || !anchor.parentNode) return null;
    var pg = document.createElement('div');
    pg.id = 'page-' + VIEW;
    pg.className = 'page';
    pg.innerHTML = pageHTML();
    anchor.parentNode.insertBefore(pg, anchor.nextSibling);
    wire(pg);
    return pg;
  }
  function fillWhenChips() {
    var box = $('tw64-when-chips'); if (!box) return;
    box.innerHTML = whenChips().map(function (c) { return '<button type="button" class="tw64-chip tw64-chip-btn" data-tw64-when="' + esc(c.v) + '">' + esc(c.t) + '</button>'; }).join('');
  }
  function fillCities() {
    var dl = $('tw64-city-list'), st = ($('tw64-state') || {}).value || '';
    if (!dl || dl.dataset.state === st) return;
    dl.dataset.state = st;
    var list = [];
    try { if (typeof getCitiesForState === 'function' && st) list = getCitiesForState(st) || []; } catch (e) {}
    dl.innerHTML = list.slice(0, 400).map(function (c) { return '<option value="' + esc(String(c).replace(/,.*$/, '')) + '">'; }).join('');
  }
  function guessKind() {
    var title = ($('tw64-what') || {}).value || '';
    var picked = document.querySelector('input[name="tw64-kind"]:checked');
    if (picked && picked.dataset.auto !== '1') return;   // the person chose one
    var hit = KINDS.filter(function (k) { return k.re && k.re.test(title); })[0];
    document.querySelectorAll('input[name="tw64-kind"]').forEach(function (r) {
      var on = !!hit && r.value === hit.v;
      r.checked = on; r.dataset.auto = on ? '1' : '';
    });
  }
  function setMode(m, keepAlert) {
    mode = m === 'signin' ? 'signin' : 'new';
    var signin = mode === 'signin';
    var nameRow = $('tw64-name-row'), terms = $('tw64-terms-row'), pw = $('tw64-pw');
    if (nameRow) nameRow.hidden = signin;
    if (terms) terms.hidden = signin;
    if (pw) { pw.setAttribute('autocomplete', signin ? 'current-password' : 'new-password'); pw.placeholder = signin ? 'Your TeenWork password' : 'At least 8 characters'; }
    var lab = $('tw64-pw-label'); if (lab) lab.textContent = signin ? 'Password' : 'Make a password';
    var note = $('tw64-you-note'); if (note) note.textContent = signin ? 'Sign in to the employer account you already have.' : 'So you can see who applies and message them. No business needed.';
    var sw = $('tw64-switch');
    if (sw) sw.innerHTML = signin
      ? 'New to TeenWork? <button type="button" class="tw64-link" data-tw64="mode-new">Make an account instead</button> · <button type="button" class="tw64-link" data-tw64="forgot">Forgot password?</button>'
      : 'Already have a TeenWork employer account? <button type="button" class="tw64-link" data-tw64="mode-signin">Sign in instead</button>';
    var go = $('tw64-go'); if (go && !busy) go.textContent = signin ? 'Sign in and post my job' : 'Post my job';
    if (!keepAlert) hideMsg();
  }
  function render() {
    var pg = buildPage(); if (!pg) return;
    fillWhenChips(); fillCities();
    var u = me(), who = $('tw64-who'), you = $('tw64-you'), go = $('tw64-go');
    var st = $('tw64-state');
    if (st && !st.value) st.value = (u && u.state && [].some.call(st.options, function (o) { return o.value === u.state; })) ? u.state : 'Vermont';
    fillCities();
    if (isEmployer(u)) {
      you.hidden = true;
      who.hidden = false;
      who.className = 'tw64-who';
      who.innerHTML = 'Posting as <b>' + esc(u.name || u.email) + '</b>' + (isPractice(u) ? ' (practice account)' : '') + '. <button type="button" class="tw64-link" data-tw64="signout">Not you? Sign out</button>';
      if (go && !busy) go.textContent = 'Post my job';
      var city = $('tw64-city'); if (city && !city.value && u.city) city.value = u.city;
    } else if (signedIn(u)) {
      you.hidden = true;
      who.hidden = false;
      who.className = 'tw64-who tw64-who-warn';
      var kind = u.isAdmin ? 'the admin account' : (isPractice(u) ? 'a practice ' : 'a ') + (u.type === 'teen' ? 'teen' : 'parent') + ' account';
      who.innerHTML = 'You’re signed in with ' + esc(kind) + '. Jobs are posted from an employer account, so sign out first, then post with a different email. <button type="button" class="tw64-link" data-tw64="signout">Sign out</button>';
      if (go && !busy) go.textContent = 'Sign out first';
    } else {
      you.hidden = false;
      who.hidden = true;
      setMode(mode, true);
    }
  }
  function say(msg, kind) {
    var el = $('tw64-alert'); if (!el) return;
    el.className = 'alert alert-' + (kind || 'error') + ' show';
    el.textContent = msg;
    try {
      var r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > (window.innerHeight || 800)) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  }
  function hideMsg() { var el = $('tw64-alert'); if (el) { el.className = 'alert'; el.textContent = ''; } }
  function status(t) { var el = $('tw64-status'); if (el) el.textContent = t || ''; }
  function setBusy(on, label) {
    busy = on;
    var go = $('tw64-go'); if (!go) return;
    go.disabled = on;
    go.textContent = on ? (label || 'Posting…') : (mode === 'signin' && !isEmployer(me()) ? 'Sign in and post my job' : 'Post my job');
    if (!on) status('');
  }

  /* ── 3. reading and checking the form ───────────────────────────── */
  function read() {
    var v = function (id) { return String(($(id) || {}).value || ''); };
    var kind = document.querySelector('input[name="tw64-kind"]:checked');
    var payType = document.querySelector('input[name="tw64-paytype"]:checked');
    var hours = parseInt(v('tw64-long'), 10);
    return {
      title: oneLine(v('tw64-what'), 80), kind: kind ? kind.value : '', when: oneLine(v('tw64-when'), 60),
      pay: Number(String(v('tw64-pay')).replace(/[$,\s]/g, '')), payType: payType && payType.value === 'hourly' ? 'hourly' : 'flat',
      hours: LONG.some(function (l) { return l.h === hours; }) ? hours : DEFAULT_LONG,
      city: oneLine(v('tw64-city'), 60), state: v('tw64-state'), details: oneLine(v('tw64-details'), 400),
      name: oneLine(v('tw64-name'), 60), email: low(v('tw64-email')), password: v('tw64-pw'),
      terms: !!($('tw64-terms') || {}).checked, notify: !!($('tw64-notify') || {}).checked,
    };
  }
  function check(f, needAccount) {
    if (f.title.length < 3) return { id: 'tw64-what', msg: 'Say what needs doing, for example “Rake leaves”.' };
    if (!f.when) return { id: 'tw64-when', msg: 'Say when, or tap Flexible.' };
    if (!(f.pay > 0)) return { id: 'tw64-pay', msg: 'Add how much you’ll pay.' };
    if (f.pay > 2000) return { id: 'tw64-pay', msg: 'Please check the pay. Small jobs here are up to $2,000.' };
    if (!f.city) return { id: 'tw64-city', msg: 'Add your town so teens nearby can find the job.' };
    if (!f.state) return { id: 'tw64-state', msg: 'Pick your state.' };
    if (!needAccount) return null;
    if (mode === 'new' && f.name.length < 2) return { id: 'tw64-name', msg: 'Add your name.' };
    if (!EMAIL_RE.test(f.email)) return { id: 'tw64-email', msg: 'Please enter your email address.' };
    if (mode === 'new' && f.password.length < 8) return { id: 'tw64-pw', msg: 'Your password needs at least 8 characters.' };
    if (mode === 'signin' && !f.password) return { id: 'tw64-pw', msg: 'Enter your password.' };
    if (mode === 'new' && !f.terms) return { id: 'tw64-terms', msg: 'Please confirm you’re 18 or older and agree to the Terms.' };
    return null;
  }
  function hoursLabel(h) { var l = LONG.filter(function (x) { return x.h === h; })[0]; return l ? l.label.charAt(0).toLowerCase() + l.label.slice(1) : ''; }
  function describe(f) {
    var when = /^(today|flexible|any day)/i.test(f.when) ? f.when : 'When: ' + f.when;
    var s = when.replace(/[.\s]+$/, '') + '. Takes ' + hoursLabel(f.hours) + '.';
    if (f.details) s += ' ' + f.details;
    return oneLine(s, 560);
  }
  function jobFields(f) {
    return { title: f.title, type: f.kind || 'other', pay: f.pay, payType: f.payType, state: f.state, city: f.city, minAge: 14, maxHours: f.hours, desc: describe(f) };
  }
  // the app's own rule check (featpack-v24) before anything is created
  function ruleBlock(f) {
    try {
      if (typeof window.complianceCheck !== 'function') return '';
      var issues = window.complianceCheck(jobFields(f)) || [];
      var b = issues.filter(function (i) { return i && i.level === 'block'; });
      return b.length ? b.map(function (i) { return i.reason; }).join(' ') : '';
    } catch (e) { return ''; }
  }

  /* ── 4. the account ─────────────────────────────────────────────── */
  function quiet(email) {
    // a neighbor came to post one job: no app tour or one-time pop-ups over the "posted" window
    var e = low(email), k = e.replace(/[^a-z0-9]/g, '_');
    try { localStorage.setItem('tw_tour34_' + e, '1'); } catch (x) {}
    if (!lsGet('tw54_share_nudge_' + k)) lsSet('tw54_share_nudge_' + k, { visits: 0, done: false, quickJob: Date.now() });
  }
  function setVal(id, v) { var el = $(id); if (el) el.value = v; }
  async function makeAccount(f) {
    quiet(f.email);
    try { window.selectType('employer'); } catch (e) { try { selectType('employer'); } catch (e2) {} }
    var parts = f.name.split(/\s+/);
    setVal('su-fname', parts.shift() || f.name); setVal('su-lname', parts.join(' '));
    setVal('su-email', f.email); setVal('su-password', f.password);
    setVal('su-business', ''); setVal('su-emp-address', ''); setVal('su-emp-zip', '');
    setVal('su-emp-city', f.city); setVal('su-emp-state', f.state);
    var t = $('terms-agree'); if (t) t.checked = true;
    var n = $('perm-notif-signup'); if (n) n.checked = true;
    try { hideAlert('su-alert'); } catch (e) {}
    try { await window.doSignup(); } catch (e) { console.warn('quick-job-v64: sign-up', e); }
    // the app opens the new account's dashboard a moment after doSignup returns
    var made = function () { var x = me(); return isEmployer(x) && low(x.email) === f.email && isOn($('page-employer')); };
    var refused = function () { var a = $('su-alert'); return !!a && /\balert-error\b/.test(a.className) && /\bshow\b/.test(a.className); };
    await waitFor(function () { return made() || refused(); }, 12000);
    setVal('su-password', '');
    var u = me();
    if (isEmployer(u) && low(u.email) === f.email) { await waitFor(made, 3000); return { ok: true }; }
    var msg = textOf($('su-alert'));
    if (/already (an|has an?) /i.test(msg)) return { ok: false, exists: true, msg: 'That email already has a TeenWork account. Sign in below with its password to post your job.' };
    return { ok: false, msg: msg || 'We couldn’t make your account right now. Please try again in a moment.' };
  }
  async function signIn(f) {
    quiet(f.email);
    setVal('li-email', f.email); setVal('li-password', f.password);
    try { hideAlert('li-alert'); } catch (e) {}
    try { await window.doLogin(); } catch (e) { console.warn('quick-job-v64: sign-in', e); }
    if ($('tw-acct-chooser')) {           // the email has several accounts: wait for the pick
      status('Pick your employer account in the window that opened.');
      var t0 = Date.now();
      while ($('tw-acct-chooser') && Date.now() - t0 < 180000) await wait(250);
    }
    await waitFor(function () { var x = me(); return !!x && low(x.email) === f.email; }, 4000);
    setVal('li-password', '');
    var u = me();
    if (u && low(u.email) === f.email && isEmployer(u)) return { ok: true };
    if (u && low(u.email) === f.email) return { ok: false, wrongType: true, msg: 'That’s a ' + (u.type === 'teen' ? 'teen' : 'parent') + ' account, and jobs are posted from an employer account. Sign out, then make a new account with a different email.' };
    var msg = textOf($('li-alert'));
    return { ok: false, msg: msg || 'We couldn’t sign you in. Please check your email and password.' };
  }

  /* ── 5. posting through the app's own Post a Job ────────────────── */
  function openPostForm() {
    if (!isOn($('page-employer')) && typeof window.gotoPage === 'function') window.gotoPage('employer');
    try { if (typeof window.switchEmployerTab === 'function') window.switchEmployerTab('etab-post', 'edtab-post'); } catch (e) {}
    try { var b = document.querySelector('#twm-side [data-twm="etab-post"]'); if (b && !b.hidden && !isOn($('etab-post'))) b.click(); } catch (e) {}
  }
  function fire(el, type) { try { el.dispatchEvent(new Event(type, { bubbles: true })); } catch (e) {} }
  function fillPostForm(job) {
    var map = { 'emp-title': job.title, 'emp-pay': String(job.pay), 'emp-city': job.city, 'emp-min-age': '', 'emp-max-hours': String(job.maxHours), 'emp-desc': job.desc };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) { el.value = map[id]; fire(el, 'input'); } });
    [['emp-type', job.type], ['emp-pay-type', job.payType], ['emp-state', job.state]].forEach(function (p) {
      var el = $(p[0]); if (!el) return;
      if (p[0] === 'emp-type' && ![].some.call(el.options, function (o) { return o.value === p[1]; })) p[1] = 'other';
      el.value = p[1]; fire(el, 'change');
    });
    var city = $('emp-city'); if (city) city.value = job.city;      // the state change empties the town box
    document.querySelectorAll('#emp-transport-options input:checked').forEach(function (i) { i.checked = false; });
    ['twjt-emp-permit', 'twjt-emp-hazard', 'twjt-emp-home'].forEach(function (id) { var c = $(id); if (c) c.checked = false; });
    var lm = $('emp-landmark'); if (lm) lm.value = '';
  }
  async function postAs(u, f) {
    openPostForm();
    var job = jobFields(f);
    fillPostForm(job);
    var list = posted(), before = list.slice(), err = null;
    status('Checking and posting your job…');
    try { await window.postJob(); } catch (e) { err = e; }
    var added = list.filter(function (j) { return before.indexOf(j) < 0; });
    if (!added.length) {
      if (err) console.warn('quick-job-v64: postJob', err);
      return { ok: false, msg: textOf($('emp-post-alert')) };
    }
    var j = added[added.length - 1];
    var patch = { neighbor: true, notify: !!f.notify };
    var mark = function () {
      Object.assign(j, patch);
      browsable().forEach(function (b) { if (b && b.id === j.id) Object.assign(b, patch); });
      try { if (window._twJobBoard && typeof window._twJobBoard.patch === 'function') window._twJobBoard.patch(j.id, patch); } catch (e) {}
    };
    mark();
    later(mark, 60);           // after the job board has re-read the post (landmark, tiers)
    return { ok: true, job: j };
  }

  async function submit(ev) {
    if (ev) ev.preventDefault();
    if (busy) return;
    hideMsg();
    var u = me();
    if (signedIn(u) && !isEmployer(u)) { say('Please sign out first. Jobs are posted from an employer account.', 'info'); return; }
    var f = read();
    var bad = check(f, !isEmployer(u));
    if (bad) { say(bad.msg); var el = $(bad.id); if (el) try { el.focus({ preventScroll: false }); } catch (e) {} return; }
    var block = ruleBlock(f);
    if (block) { say('This job can’t be posted for teens: ' + block + ' Please change the job and try again.'); return; }
    setBusy(true, isEmployer(u) ? 'Posting…' : (mode === 'signin' ? 'Signing in…' : 'Making your account…'));
    try {
      if (!isEmployer(u)) {
        status(mode === 'signin' ? 'Signing you in…' : 'Making your account…');
        var r = mode === 'signin' ? await signIn(f) : await makeAccount(f);
        if (!r.ok) {
          if (r.wrongType) { gotoQuick(); say(r.msg, 'info'); return; }
          if (r.exists) { setMode('signin', true); var pw = $('tw64-pw'); if (pw) pw.value = ''; }
          gotoQuick();
          say(r.msg);
          return;
        }
        u = me();
        var pwEl = $('tw64-pw'); if (pwEl) pwEl.value = '';
      }
      setBusy(true, 'Posting…');
      var p = await postAs(u, f);
      if (!p.ok) {
        // they're signed in now; the employer's Post a Job form is filled in and shows why
        openPostForm();
        if (!$('tw-plan-modal')) toast((p.msg ? p.msg + ' ' : 'Your job wasn’t posted yet. ') + 'You’re signed in: check the job below and press Post Job.', 'info');   // the plan note explains itself
        return;
      }
      resetForm();
      openDone(p.job, f, u);
    } catch (e) {
      console.warn('quick-job-v64:', e);
      say('Something went wrong. Please try again in a moment.');
    } finally { setBusy(false); }
  }
  function resetForm() {
    ['tw64-what', 'tw64-when', 'tw64-pay', 'tw64-details', 'tw64-pw'].forEach(function (id) { setVal(id, ''); });
    document.querySelectorAll('input[name="tw64-kind"]').forEach(function (r) { r.checked = false; r.dataset.auto = ''; });
  }

  /* ── 6. the "posted" window ─────────────────────────────────────── */
  function jobLink(job) { return SITE + '?view=jobs&job=' + encodeURIComponent(String(job.id)); }
  function quickLink() {
    var code = '';
    try { if (typeof window.twShareCode === 'function') code = window.twShareCode() || ''; } catch (e) {}
    return SITE + '?view=' + VIEW + (/^[A-Z0-9]{6,10}$/.test(code) ? '&ref=' + code : '');
  }
  async function copy(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    try {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  function closeDone(goActive) {
    var m = $('tw64-done'); if (!m) return;
    m.remove();
    document.removeEventListener('keydown', onDoneKey, true);
    if (goActive) {
      try { var b = document.querySelector('#twm-side [data-twm="etab-active"]'); if (b && !b.hidden) b.click(); else if (typeof window.switchEmployerTab === 'function') window.switchEmployerTab('etab-active', 'edtab-active'); } catch (e) {}
    }
  }
  function onDoneKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeDone(true); } }
  function openDone(job, f, u) {
    closeDone(false);
    var pay = '$' + esc(job.pay) + (job.payType === 'hourly' ? ' an hour' : ' for the job');
    var m = document.createElement('div');
    m.id = 'tw64-done'; m.className = 'tw64-done';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw64-done-title');
    m.innerHTML =
      '<div class="tw64-done-card">' +
        '<div class="tw64-done-icon" aria-hidden="true">✅</div>' +
        '<h2 id="tw64-done-title">Your job is posted</h2>' +
        '<div class="tw64-done-job"><b>' + esc(job.title) + '</b><span>' + pay + ' · ' + esc(f.when) + ' · ' + esc([job.city, job.state].filter(Boolean).join(', ')) + '</span></div>' +
        '<ol class="tw64-done-steps">' +
          '<li>Teens near you can see it in Find Jobs now.</li>' +
          '<li>A teen’s parent says OK before the teen can apply.</li>' +
          '<li>' + (f.notify && !isPractice(u) ? 'We’ll email you at <b>' + esc(u.email) + '</b> when that happens. ' : '') + 'You’ll find applicants under <b>Applicants</b>. Sign in at teenwork.ayaqd.com with your email and password.</li>' +
          '<li>Choose a teen and plan the details in Messages. Share your street address only with the teen you pick.</li>' +
        '</ol>' +
        '<div class="tw64-done-share"><p>Know a teen who’d be great for it? Send their family the job.</p>' +
          '<button type="button" class="btn-primary tw64-share-job" data-tw64="share-job">📣 Share this job</button></div>' +
        '<p class="tw64-done-more">Know a neighbor with a small job too? <button type="button" class="tw64-link" data-tw64="copy-quick">Copy the “Post a small job” link</button></p>' +
        '<button type="button" class="tw64-done-ok" data-tw64="done">Done</button>' +
      '</div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) closeDone(true); });
    m.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tw64]'); if (!t) return;
      var what = t.getAttribute('data-tw64');
      if (what === 'done') closeDone(true);
      else if (what === 'share-job') shareJob(job, t);
      else if (what === 'copy-quick') copy(quickLink()).then(function (ok) { t.textContent = ok ? 'Link copied ✓' : quickLink(); });
    });
    document.body.appendChild(m);
    document.addEventListener('keydown', onDoneKey, true);
    try { m.querySelector('.tw64-share-job').focus({ preventScroll: true }); } catch (e) {}
  }
  function shareJob(job, btn) {
    var url = jobLink(job), text = 'I posted a small job on TeenWork: ' + job.title + ' ($' + job.pay + (job.payType === 'hourly' ? '/hr' : '') + '). A parent approves every application.';
    var fallback = function () { copy(url).then(function (ok) { btn.textContent = ok ? 'Job link copied ✓' : url; if (ok) toast('🔗 Link copied. Paste it in a text or email.', 'success'); }); };
    if (navigator.share) navigator.share({ title: job.title + ' on TeenWork', text: text, url: url }).then(function () { btn.textContent = 'Shared ✓'; }, function (e) { if (!e || e.name !== 'AbortError') fallback(); });
    else fallback();
  }

  /* ── 7. "🏡 Neighbor job" on teen and parent cards ──────────────── */
  var APPLY_RE = /teenApply\(\s*'?([0-9A-Za-z_-]+)/;
  function jobForCard(card) {
    var b = card.querySelector('[onclick*="teenApply("]'), m = b ? APPLY_RE.exec(b.getAttribute('onclick') || '') : null;
    var list = browsable();
    if (m) return list.filter(function (j) { return j && String(j.id) === m[1]; })[0] || null;
    var title = ((card.querySelector('.browse-title') || {}).textContent || '').trim();
    var hits = title ? list.filter(function (j) { return j && String(j.title || '').trim() === title; }) : [];
    return hits.length === 1 ? hits[0] : null;
  }
  function tagTeenCards() {
    var box = $('browse-jobs-list'); if (!box) return;
    box.querySelectorAll('.browse-card').forEach(function (card) {
      if (card.querySelector('.tw64-nb')) return;
      var j = jobForCard(card); if (!j || !j.neighbor) return;
      var meta = card.querySelector('.job-meta') || card.querySelector('.browse-card-head'); if (!meta) return;
      var t = document.createElement('span');
      t.className = 'tag tw64-nb'; t.textContent = '🏡 Neighbor job'; t.title = 'Posted by a neighbor, not a business';
      meta.insertBefore(t, meta.firstChild);
    });
  }
  function tagParentCards() {
    var box = $('approval-jobs'); if (!box) return;
    apps().forEach(function (j) {
      if (!j || !j.neighbor) return;
      var card = $('job-card-' + j.id); if (!card || !box.contains(card) || card.querySelector('.tw64-nb')) return;
      var meta = card.querySelector('.job-meta');
      if (meta) { var t = document.createElement('span'); t.className = 'tag tw64-nb'; t.textContent = '🏡 Neighbor job'; meta.insertBefore(t, meta.firstChild); }
      var note = document.createElement('p');
      note.className = 'tw64-nb-note';
      note.textContent = '🏡 A neighbor posted this, not a business. TeenWork doesn’t check who posts jobs, so you may want to meet them or ask a few questions in Messages before you approve.';
      var actions = card.querySelector('.job-actions');
      if (actions) card.insertBefore(note, actions); else card.appendChild(note);
      if (!meta) note.insertAdjacentHTML('afterbegin', '');
    });
  }
  var tagTimer = 0;
  function tagSoon() { if (tagTimer) return; tagTimer = setTimeout(function () { tagTimer = 0; try { tagTeenCards(); tagParentCards(); } catch (e) { console.warn('quick-job-v64: tags', e); } }, 40); }
  function watchCards() {
    ['browse-jobs-list', 'approval-jobs'].forEach(function (id) {
      var el = $(id); if (!el || el.dataset.tw64Watch) return;
      el.dataset.tw64Watch = '1';
      new MutationObserver(tagSoon).observe(el, { childList: true, subtree: true });
    });
    tagSoon();
  }

  /* ── 8. email the poster when a parent says OK ──────────────────── */
  async function cloud() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (e) { return null; }
  }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  async function posterRow(employerKey, jobId) {
    var c = await cloud(); if (!c) return null;
    try {
      var r = await c.from('user_data').select('email,key,value').eq('email', employerKey).eq('key', 'job_post:' + jobId);
      var row = r && !r.error && r.data && r.data[0];
      var v = row ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) : null;
      return v && typeof v === 'object' ? v : null;
    } catch (e) { return null; }
  }
  function emailHTML(v, teen) {
    var title = esc(oneLine(v.title, 80)), who = esc(firstName(teen) || 'A teen'), hi = esc(firstName(v.employer));
    return '<p>Hi' + (hi ? ' ' + hi : '') + ',</p>' +
      '<p><strong>' + who + '</strong> applied for your job <strong>' + title + '</strong>, and their parent said OK.</p>' +
      '<p>Open TeenWork to see the application. You can message ' + who + ' in the app and choose who you’d like to hire. Please keep plans and your address inside TeenWork’s Messages.</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;"><tr><td bgcolor="#2d6a4f" style="background:#2d6a4f;border-radius:12px;">' +
        '<a href="' + SITE + '?view=applicants" style="display:inline-block;padding:14px 26px;font-family:\'DM Sans\',Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">See who applied</a>' +
      '</td></tr></table>' +
      '<p style="font-size:13px;color:#4b5563;">You get this email because you asked TeenWork to email you when a teen applies to this job. Close the job in TeenWork to stop these emails.</p>';
  }
  async function tellPoster(employerKey, jobId, teenName, teenKey) {
    var u = me();
    if (!u || isPractice(u) || u.isAdmin) return false;
    var to = low(String(employerKey || '').split('#')[0]);
    if (!EMAIL_RE.test(to) || typeof window.twSendEmail !== 'function') return false;
    var sentKey = 'tw64_told_' + hash(employerKey + '|' + jobId + '|' + (teenKey || teenName));
    if (lsGet(sentKey)) return false;
    var v = await posterRow(employerKey, jobId);
    if (!v || !v.notify || v.status === 'closed') return false;
    lsSet(sentKey, Date.now());
    var title = oneLine(v.title, 60).replace(/["“”]/g, '');
    var ok = false;
    try {
      ok = await window.twSendEmail(to, 'A teen applied for “' + title + '” on TeenWork', emailHTML(v, teenName),
        { heading: 'Someone applied for your job', icon: '🙋', preheader: (firstName(teenName) || 'A teen') + ' applied, and their parent said OK.' });
    } catch (e) { ok = false; }
    if (ok === false) lsSet(sentKey, null);   // try again the next time this browser approves something for this job
    return ok !== false;
  }
  function wrapApprove() {
    var o = window.parentApproveJob;
    if (typeof o !== 'function' || o.__tw64) return;
    var w = function (jobId) {
      var job = apps().filter(function (j) { return j && j.id === jobId && j.status === 'pending-approval'; })[0];
      var r = o.apply(this, arguments);
      try {
        if (job && job._jb && job.notify && job.status !== 'pending-approval' && job._employerKey)
          tellPoster(job._employerKey, job._jobId, job._teenName, job._teenKey);
      } catch (e) {}
      return r;
    };
    w.__tw64 = true; window.parentApproveJob = w;
  }
  function wrapApply() {
    var o = window.teenApply;
    if (typeof o !== 'function' || o.__tw64) return;
    var w = function () {
      var list = apps(), before = list.slice();
      var r = o.apply(this, arguments);
      try {
        var u = me();
        list.filter(function (j) { return before.indexOf(j) < 0; }).forEach(function (j) {
          // a tester teen with no parent goes straight to the employer, so their browser tells the poster
          if (j && j._cloud && j.notify && j.status === 'applied' && j.employerKey) tellPoster(j.employerKey, j.id, u && u.name, u && (u.dataKey || u.email));
        });
      } catch (e) {}
      return r;
    };
    w.__tw64 = true; window.teenApply = w;
  }

  /* ── 9. ways in: home page, links ───────────────────────────────── */
  function gotoQuick() {
    if (typeof window.gotoPage === 'function') window.gotoPage(VIEW);
    else { document.querySelectorAll('.page.active').forEach(function (p) { p.classList.remove('active'); }); var pg = $('page-' + VIEW); if (pg) pg.classList.add('active'); }
    render();
  }
  function open() {
    buildPage();
    try { if (window.twCleanMenu && window.twCleanMenu.close) window.twCleanMenu.close(true); } catch (e) {}
    gotoQuick();
    try { window.scrollTo(0, 0); } catch (e) {}
    later(function () { var w = $('tw64-what'); if (w && !('ontouchstart' in window)) try { w.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function homeLink() {
    var card = $('tw-for-employers');
    if (!card || card.querySelector('.tw64-home-link')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tw48-link tw64-home-link';
    b.textContent = 'Just one small job? Post it in a minute →';
    b.addEventListener('click', open);
    card.appendChild(b);
  }
  function wire(pg) {
    pg.addEventListener('submit', function (e) { if (e.target && e.target.id === 'tw64-form') submit(e); });
    pg.addEventListener('input', function (e) {
      if (e.target.id === 'tw64-what') guessKind();
      if (busy) return;
      var a = $('tw64-alert'); if (a && a.classList.contains('show') && !a.classList.contains('alert-info')) hideMsg();
    });
    pg.addEventListener('change', function (e) {
      if (e.target.name === 'tw64-kind') e.target.dataset.auto = '';
      if (e.target.id === 'tw64-state') { setVal('tw64-city', ''); fillCities(); }
    });
    pg.addEventListener('click', function (e) {
      var w = e.target.closest('[data-tw64-when]');
      if (w) { setVal('tw64-when', w.getAttribute('data-tw64-when')); pg.querySelectorAll('[data-tw64-when]').forEach(function (b) { b.classList.toggle('on', b === w); }); hideMsg(); return; }
      var t = e.target.closest('[data-tw64]'); if (!t) return;
      var what = t.getAttribute('data-tw64');
      if (what === 'home') { e.preventDefault(); if (typeof window.gotoPage === 'function') window.gotoPage('landing'); return; }
      if (what === 'terms') { e.preventDefault(); try { window.openTerms(); } catch (x) {} return; }
      if (what === 'show') { var pw = $('tw64-pw'), on = pw.type === 'password'; pw.type = on ? 'text' : 'password'; t.textContent = on ? 'Hide' : 'Show'; t.setAttribute('aria-pressed', on ? 'true' : 'false'); return; }
      if (what === 'mode-signin') { setMode('signin'); try { $('tw64-email').focus(); } catch (x) {} return; }
      if (what === 'mode-new') { setMode('new'); try { $('tw64-name').focus(); } catch (x) {} return; }
      if (what === 'forgot') { setVal('li-email', ($('tw64-email') || {}).value || ''); if (typeof window.gotoPage === 'function') window.gotoPage('login'); return; }
      if (what === 'signout') {
        try { if (typeof window.signOut === 'function') window.signOut(); else if (typeof window.doLogout === 'function') window.doLogout(); } catch (x) {}
        later(gotoQuick, 30);
      }
    });
  }

  /* ── boot ───────────────────────────────────────────────────────── */
  function boot() {
    var pg = buildPage();
    if (pg && !pg.dataset.tw64Obs) {
      pg.dataset.tw64Obs = '1';
      var sync = function () { document.body.classList.toggle('tw64-page', isOn(pg)); if (isOn(pg)) render(); };
      new MutationObserver(sync).observe(pg, { attributes: true, attributeFilter: ['class'] });
      sync();
    }
    homeLink();
    watchCards();
    wrapApprove(); wrapApply();
    [400, 1500, 4000].forEach(function (ms) { later(function () { homeLink(); watchCards(); wrapApprove(); wrapApply(); }, ms); });
  }
  boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { later(boot, 0); });

  window.twQuickJob = { open: open, link: quickLink, post: submit, render: render };
})();
