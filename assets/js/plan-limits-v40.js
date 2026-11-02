
/* ═══════════════════════════════════════════════════════════════════
   PLAN LIMITS — Free vs Pro usage caps  (plan-limits thread, 2026-10-14)
   Append-only block: it wraps existing window functions. No base code
   above this block is edited.

   What it does
   • Every account has a plan, "free" or "pro". It is stored in the cloud
     (user_data row: email = account key, key = "plan") with a localStorage
     cache, so it follows the account from device to device.
   • Free accounts get caps: job applications per month, AI requests per
     day, employer job posts per month, applicants shown per job, and an
     optional messages-per-month cap. Resume Builder, Pitch AI, Wage Coach
     and employer bulk messaging can be Pro-only. Counters live in the
     user_data row key "plan_usage" (cloud + cache) and reset by calendar.
   • When a free account hits a cap it sees a friendly upgrade note that
     says when the count resets and links to the pricing page.
   • The admin panel gets a "💎 Plans" tab that edits every number, turns
     the limits on/off and gives or removes Pro for any account. Settings
     are ONE cloud row (email = ADMIN_EMAIL, key = "plan_settings") that
     every device reads when the app loads, so a change reaches everyone.
     The Paid Launch switch (Launch Controls) is mirrored into that row
     for the same reason: before this block it only changed the admin's
     own browser.
   • Demo logins and the admin are always Pro.

   Honest limitation
   This app runs entirely in the browser with a publishable Supabase key
   and open table rules. Someone who opens the browser developer tools can
   change their own plan or reset their counters. These limits stop
   ordinary users, not determined ones. Real enforcement needs Supabase
   Auth plus row-level security, or a server that checks the plan. See
   plan-limits/README.md.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ADMIN = (typeof ADMIN_EMAIL === 'string' && ADMIN_EMAIL) ? ADMIN_EMAIL.toLowerCase() : 'ayaquarrierdraper@gmail.com';
  var SETTINGS_KEY = 'tw_plan_settings';     // device cache of the cloud settings row
  var SETTINGS_ROW_KEY = 'plan_settings';    // user_data.key of the shared settings row (email = ADMIN)
  var DEFAULTS = {
    enabled: true,          // master switch: false = everyone gets everything (like v39)
    selfUpgrade: true,      // while Paid Launch is off, anyone may switch to Pro for free on the pricing page
    free: {
      applicationsPerMonth: 5,
      aiPerDay: 10,
      messagesPerMonth: 0,           // 0 = unlimited
      employerPostsPerMonth: 2,
      employerApplicantsPerJob: 3,   // 0 = unlimited
      proOnly: { resume: true, pitch: true, wage: true, bulkmsg: true }
    }
  };
  var KINDS = {
    apps:  { setting: 'applicationsPerMonth',  period: 'month', noun: 'job applications', icon: '📋', pro: 'unlimited job applications' },
    ai:    { setting: 'aiPerDay',              period: 'day',   noun: 'AI requests',      icon: '🤖', pro: 'unlimited AI requests' },
    msgs:  { setting: 'messagesPerMonth',      period: 'month', noun: 'messages',         icon: '💬', pro: 'unlimited messages' },
    posts: { setting: 'employerPostsPerMonth', period: 'month', noun: 'job posts',        icon: '📝', pro: 'unlimited job posts' }
  };
  var FEATURES = { resume: 'AI Resume Builder', pitch: 'Pitch AI', wage: 'AI Wage Coach', bulkmsg: 'Bulk messaging' };

  /* ── small helpers ─────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function readJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }
  function go(page) { try { gotoPage(page); } catch (e) {} }
  var ownClient = null;
  function sb() {
    if (typeof sbClient !== 'undefined' && sbClient) return sbClient;
    if (ownClient) return ownClient;
    try {
      if (window.supabase && typeof SUPABASE_URL === 'string' && typeof SUPABASE_KEY === 'string' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        ownClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return ownClient;
      }
    } catch (e) {}
    return null;
  }
  function cfg() { try { return (typeof _adminGetConfig === 'function') ? _adminGetConfig() : {}; } catch (e) { return {}; } }
  function user() { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; }
  function isAdminUser(u) { return !!(u && (u.isAdmin || u.type === 'admin')); }
  function acctKey(u) { u = u || user(); return u ? String(u.dataKey || u.email || '').toLowerCase() : ''; }
  function dbLoad(k, d) { try { return (window._DB && _DB.load) ? _DB.load(k, d) : d; } catch (e) { return d; } }
  function dbSave(k, v) { try { if (window._DB && _DB.save) _DB.save(k, v); } catch (e) {} }
  function dbPrefix() { try { return (window._DB && _DB._prefix) ? _DB._prefix() : 'tw_guest_'; } catch (e) { return 'tw_guest_'; } }

  /* ── settings (one cloud row shared by every device) ───────────── */
  var cloud = { ok: false, checked: false, error: '' };
  function settings() {
    var s = readJSON(SETTINGS_KEY, null) || {};
    var f = s.free || {};
    var out = { enabled: s.enabled !== false, selfUpgrade: s.selfUpgrade !== false, free: {} };
    if (typeof s.launchPaid === 'boolean') out.launchPaid = s.launchPaid;
    Object.keys(DEFAULTS.free).forEach(function (k) {
      if (k === 'proOnly') out.free.proOnly = Object.assign({}, DEFAULTS.free.proOnly, f.proOnly || {});
      else out.free[k] = (typeof f[k] === 'number' && f[k] >= 0 && isFinite(f[k])) ? Math.floor(f[k]) : DEFAULTS.free[k];
    });
    return out;
  }
  function pullSettings() {
    var c = sb(); if (!c) return Promise.resolve(false);
    return Promise.resolve(c.from('user_data').select('value').eq('email', ADMIN).eq('key', SETTINGS_ROW_KEY).limit(1)).then(function (r) {
      if (r && r.error) throw r.error;
      var row = r && r.data && r.data[0];
      if (row && row.value) { try { localStorage.setItem(SETTINGS_KEY, row.value); } catch (e) {} }
      cloud.ok = true; cloud.checked = true; cloud.error = '';
      refreshUI();
      return true;
    }).catch(function (e) { cloud.ok = false; cloud.checked = true; cloud.error = (e && e.message) || String(e); return false; });
  }
  function pushSettings(s) {
    writeJSON(SETTINGS_KEY, s);
    var c = sb(); if (!c) return Promise.resolve(false);
    return Promise.resolve(c.from('user_data').upsert({ email: ADMIN, key: SETTINGS_ROW_KEY, value: JSON.stringify(s), updated_at: new Date().toISOString() }, { onConflict: 'email,key' }))
      .then(function (r) { if (r && r.error) throw r.error; cloud.ok = true; cloud.error = ''; return true; })
      .catch(function (e) { cloud.ok = false; cloud.error = (e && e.message) || String(e); return false; });
  }
  function canSelfUpgrade() { var s = settings(); return s.enabled && s.selfUpgrade && !cfg().launchPaid; }

  /* ── which plan is this account on? ────────────────────────────── */
  function legacyTier(u) {
    // v38/v39 saved the sign-up choice in localStorage under two spellings of the key
    try {
      var em = String(u.email || '');
      var a = localStorage.getItem('tw_' + em.replace(/[^a-z0-9]/gi, '_') + '_acct_tier');
      var b = localStorage.getItem('tw_' + em + '_acct_tier');
      return (a === 'pro' || b === 'pro') ? 'pro' : '';
    } catch (e) { return ''; }
  }
  // The plan saved for an account, with no demo / admin / limits-off overrides (other scripts, e.g. the
  // Groq key routing, use this). Reads the cloud-synced cache, then the v38/v39 sign-up key.
  function storedPlanOf(u) {
    u = u || user();
    if (!u) return 'free';
    var p = '';
    var cur = user();
    if (cur && u === cur) p = dbLoad('plan', '');
    else { try { var px = u.isDemo ? 'tw_demo_' + u.type + '_' : 'tw_' + String(u.dataKey || u.email || '').replace(/[^a-z0-9]/gi, '_') + '_'; p = JSON.parse((u.isDemo ? sessionStorage : localStorage).getItem(px + 'plan')); } catch (e) { p = ''; } }
    if (p === 'pro' || p === 'free') return p;
    if (legacyTier(u) === 'pro') { if (cur && u === cur && !u.isDemo) dbSave('plan', 'pro'); return 'pro'; }   // move the old sign-up choice to the cloud once
    return 'free';
  }
  function planOf(u) {
    u = u || user();
    if (!u) return 'free';
    if (u.isDemo || u.twDemo || isAdminUser(u)) return 'pro';
    if (!settings().enabled) return 'pro';
    return storedPlanOf(u);
  }
  function isPro(u) { return planOf(u) === 'pro'; }
  function setMyPlan(p) { dbSave('plan', p === 'pro' ? 'pro' : 'free'); refreshUI(); }

  /* ── usage counters (per account, cloud + cache) ───────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function dayKey(d) { d = d || new Date(); return monthKey(d) + '-' + pad(d.getDate()); }
  function usage() {
    var u = dbLoad('plan_usage', null);
    if (!u || typeof u !== 'object') u = {};
    if (u.month !== monthKey()) u = { month: monthKey(), apps: 0, msgs: 0, posts: 0, day: dayKey(), ai: 0 };
    if (u.day !== dayKey()) { u.day = dayKey(); u.ai = 0; }
    ['apps', 'msgs', 'posts', 'ai'].forEach(function (k) { u[k] = Number(u[k]) || 0; });
    return u;
  }
  // v51: applying is free and unlimited on every plan (Aya, 2026-10-30: "Keep applying unlimited and free").
  function limitFor(kind) { return (kind === 'apps' || isPro()) ? 0 : (settings().free[KINDS[kind].setting] || 0); }
  function bump(kind) {
    if (!limitFor(kind)) return;        // nothing to count when there is no cap
    var u = usage(); u[kind] = (u[kind] || 0) + 1;
    dbSave('plan_usage', u);
    refreshUI();
  }
  function allow(kind) {
    var lim = limitFor(kind); if (!lim) return true;
    if (usage()[kind] < lim) return true;
    showLimit(kind, lim);
    return false;
  }
  function featureAllowed(f) { return isPro() || !settings().free.proOnly[f]; }
  function requireFeature(f) { if (featureAllowed(f)) return true; showFeature(f); return false; }

  /* ── the friendly upgrade note ─────────────────────────────────── */
  function resetText(period) {
    if (period === 'day') return 'tomorrow';
    var d = new Date(), n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return 'on ' + n.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  function closeModal() { var m = $('tw-plan-modal'); if (m) m.remove(); }
  function modal(icon, title, body) {
    closeModal();
    var m = document.createElement('div');
    m.id = 'tw-plan-modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",system-ui,sans-serif';
    var cta = canSelfUpgrade() ? 'See Pro (free during testing) →' : 'See Pro plans →';
    m.innerHTML = '<div style="background:var(--card,#fff);color:var(--text,#1f2937);border-radius:18px;padding:1.6rem 1.5rem;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.22);text-align:center">' +
      '<div style="font-size:2.4rem;margin-bottom:.4rem">' + icon + '</div>' +
      '<h3 style="font-family:Fraunces,Georgia,serif;font-size:1.15rem;color:var(--amber,#b45309);margin:0 0 .5rem">' + esc(title) + '</h3>' +
      '<p style="font-size:.88rem;color:var(--muted,#6b7280);line-height:1.6;margin:0 0 1.1rem">' + esc(body) + '</p>' +
      '<button type="button" id="tw-plan-modal-cta" style="width:100%;background:var(--amber,#d97706);color:#fff;border:none;padding:11px 0;border-radius:10px;font-family:inherit;font-size:.92rem;font-weight:700;cursor:pointer">' + esc(cta) + '</button>' +
      '<button type="button" id="tw-plan-modal-later" style="width:100%;background:none;color:var(--muted,#6b7280);border:1.5px solid var(--border,#e5e7eb);padding:9px 0;border-radius:10px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;margin-top:8px">Maybe later</button>' +
      '</div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
    $('tw-plan-modal-cta').onclick = function () { closeModal(); go('pricing'); };
    $('tw-plan-modal-later').onclick = closeModal;
  }
  function showLimit(kind, lim) {
    var k = KINDS[kind];
    modal(k.icon,
      "You've used your " + lim + ' free ' + k.noun + ' this ' + k.period,
      'Free accounts get ' + lim + ' ' + k.noun + (k.period === 'day' ? ' a day' : ' a month') + '. Your count resets ' + resetText(k.period) + '. TeenWork Pro has ' + k.pro + '.');
  }
  function showFeature(f) {
    modal('⭐', (FEATURES[f] || 'This') + ' is a Pro feature',
      'Free accounts can browse jobs, apply, message employers and use the AI coach. TeenWork Pro adds ' + (FEATURES[f] || 'this feature') + ' and more.');
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); }, true);

  /* ── wrap the actions that count ───────────────────────────────── */
  var active = {};   // if a later script wraps our wrapper again, the inner copy just passes through
  function wrap(name, make) {
    var o = window[name];
    if (typeof o !== 'function' || o.__twPlan) return;
    var inner = make(o);
    var w = function () {
      if (active[name]) return o.apply(this, arguments);
      active[name] = true;
      try { return inner.apply(this, arguments); } finally { active[name] = false; }
    };
    w.__twPlan = true; window[name] = w;
  }
  function gateFeature(f) {
    return function (o) { return function () { if (!requireFeature(f)) return; return o.apply(this, arguments); }; };
  }
  function countAI(o) {
    return function () { if (!allow('ai')) return; bump('ai'); return o.apply(this, arguments); };
  }
  function wrapAll() {
    // Teen job applications (counted only when an application was really created)
    ['teenApply', 'applyToJob'].forEach(function (n) {
      wrap(n, function (o) { return function () {
        if (!allow('apps')) return;
        var before = (typeof demoJobs !== 'undefined' && demoJobs) ? demoJobs.length : -1;
        var r = o.apply(this, arguments);
        if (before >= 0 && demoJobs.length > before) bump('apps');
        return r;
      }; });
    });
    // Messages (only when the admin set a messages cap; safety filters still run first)
    wrap('sendMsg', function (o) { return function (contactId) {
      var input = $('msg-input-' + contactId);
      var text = input ? String(input.value || '').trim() : '';
      if (text && !allow('msgs')) return;
      var contact = null;
      try { contact = (typeof msgAllContacts !== 'undefined' && msgAllContacts) ? msgAllContacts.find(function (c) { return c.id === contactId; }) : null; } catch (e) {}
      var before = (contact && contact.messages) ? contact.messages.length : -1;
      var r = o.apply(this, arguments);
      var after = function () {
        if (!text || !limitFor('msgs')) return;
        if (before >= 0) { if (contact.messages.length > before) bump('msgs'); return; }   // counted only when it was really sent
        var blocked = false; try { blocked = !!(typeof scanMessage === 'function' && scanMessage(text).blocked); } catch (e) {}
        if (!blocked) bump('msgs');
      };
      if (r && typeof r.then === 'function') return r.then(function (v) { after(); return v; }, function (err) { after(); throw err; });
      after(); return r;
    }; });
    // Employer job posts (counted only when the post went through)
    wrap('postJob', function (o) { return function () {
      if (!allow('posts')) return;
      var before = (typeof employerPostedJobs !== 'undefined' && employerPostedJobs) ? employerPostedJobs.length : -1;
      var r = o.apply(this, arguments);
      var after = function () { if (before >= 0 && employerPostedJobs.length > before) bump('posts'); };
      // v39's postJob can reject after the job was already added (a missing helper at its very end), so count on both paths
      if (r && typeof r.then === 'function') return r.then(function (v) { after(); return v; }, function (err) { after(); throw err; });
      after(); return r;
    }; });
    // AI requests people ask for. Safety checks (message moderation, job compliance,
    // parent safety check) and background job matching are never counted.
    // (aiReviewJobPost and empBulkAIDraft go through openAI, so they are counted there)
    ['chatAI', 'quickCoach', 'openAI', 'generateCoverLetter', 'aiWriteJobDesc',
     'generateWeeklySummary', 'aiAutoFillShift'].forEach(function (n) { wrap(n, countAI); });
    // Pro-only features
    wrap('openResumeBuilder', gateFeature('resume'));
    wrap('openAIPitchModal', gateFeature('pitch'));
    wrap('teenAIPitch', gateFeature('pitch'));
    wrap('regenerateAIPitch', gateFeature('pitch'));
    wrap('openWageCoach', gateFeature('wage'));
    wrap('empBulkSend', gateFeature('bulkmsg'));
    // Applicants shown per job (free employers)
    wrap('renderEmployerDashboard', function (o) { return function () { var r = o.apply(this, arguments); setTimeout(capApplicants, 0); return r; }; });
    wrap('renderEmpKanban', function (o) { return function () { var r = o.apply(this, arguments); setTimeout(capApplicants, 0); return r; }; });
    // Keep the UI fresh
    wrap('gotoPage', function (o) { return function (page) {
      var r = o.apply(this, arguments);
      if (page === 'pricing') setTimeout(refreshPricing, 0);
      if (page === 'teen' || page === 'parent' || page === 'employer') setTimeout(refreshUI, 80);
      return r;
    }; });
    wrap('launchDashboard', function (o) { return function () {
      var r = o.apply(this, arguments);
      setTimeout(function () { pullSettings(); pullMine(); refreshUI(); }, 250);
      setTimeout(refreshUI, 1500);
      return r;
    }; });
    // Sign-up: remember the plan the person picked (Pro only while it is free to pick)
    wrap('_adminTrackSignup', function (o) { return function () { var r = o.apply(this, arguments); try { saveSignupPlan(); } catch (e) {} return r; }; });
    // Paid Launch switch: mirror into the shared cloud row so it reaches every device
    wrap('adminSetPaid', function (o) { return function () { var r = o.apply(this, arguments); mirrorLaunchPaid(); return r; }; });
    wrap('adminSaveLaunch', function (o) { return function () { var r = o.apply(this, arguments); mirrorLaunchPaid(); return r; }; });
    // Admin panel: add the Plans tab
    wrap('launchAdminPanel', function (o) { return function () { var r = o.apply(this, arguments); try { injectAdminTab(); } catch (e) { console.warn('plan-limits admin tab failed', e); } pullSettings().then(renderAdmin); return r; }; });
    wrap('adminSwitchTab', function (o) { return function (name) { var r = o.apply(this, arguments); if (name === 'plans') renderAdmin(); return r; }; });
  }
  function saveSignupPlan() {
    var u = user(); if (!u || u.isDemo || isAdminUser(u)) return;
    var picked = (document.querySelector('input[name="su-plan"]:checked') || {}).value || 'free';
    var s = settings();
    var plan = (picked === 'pro' && s.selfUpgrade && !cfg().launchPaid) ? 'pro' : 'free';
    dbSave('plan', plan);
  }
  function mirrorLaunchPaid() {
    var local = readJSON('tw_admin_config', {}) || {};
    var s = settings(); s.launchPaid = !!local.launchPaid;
    pushSettings(s);
  }
  // Every device reads launchPaid from the shared row when it has one
  (function () {
    var orig = window._adminGetConfig;
    if (typeof orig !== 'function' || orig.__twPlan) return;
    var w = function () {
      var c = orig.apply(this, arguments) || {};
      var s = readJSON(SETTINGS_KEY, null);
      if (s && typeof s.launchPaid === 'boolean') c.launchPaid = s.launchPaid;
      return c;
    };
    w.__twPlan = true; window._adminGetConfig = w;
  })();
  // The old tier helper now answers from the plan
  (function () {
    var w = function () { return planOf(); };
    w.__twPlan = true; window._getUserTier = w;
  })();

  /* ── pull this account's plan + counters right after sign-in ───── */
  function pullMine() {
    var c = sb(), u = user();
    if (!c || !u || u.isDemo || isAdminUser(u)) return Promise.resolve(false);
    var raw = String(u.dataKey || u.email || ''), keys = raw.toLowerCase() === raw ? [raw] : [raw, raw.toLowerCase()], px = dbPrefix();
    return Promise.resolve(c.from('user_data').select('key,value').in('email', keys).in('key', ['plan', 'plan_usage'])).then(function (r) {
      if (r && r.error) throw r.error;
      (r && r.data || []).forEach(function (row) { try { localStorage.setItem(px + row.key, row.value); } catch (e) {} });
      refreshUI();
      return true;
    }).catch(function () { return false; });
  }

  /* ── pricing page button ───────────────────────────────────────── */
  function refreshPricing() {
    var btn = $('pricing-pro-btn'); if (!btn || !settings().enabled) return;
    var u = user();
    if (u && isPro(u)) { btn.textContent = "✓ You're on Pro"; btn.style.background = 'var(--green)'; }
    else if (canSelfUpgrade()) { btn.textContent = 'Switch to Pro — free during testing →'; btn.style.background = 'var(--amber)'; }
    else { btn.textContent = 'Upgrade to Pro →'; btn.style.background = 'var(--amber)'; }
  }
  var origUpgrade = window.handleUpgradeClick;
  window.handleUpgradeClick = function () {
    if (!settings().enabled) { return typeof origUpgrade === 'function' ? origUpgrade.apply(this, arguments) : undefined; }
    var u = user();
    if (!u) { toast('Create an account or sign in first, then pick Pro.', 'info'); go('signup'); return; }
    if (isAdminUser(u)) { toast('The admin account already has everything.', 'info'); return; }
    if (isPro(u)) { toast("⭐ You're already on Pro.", 'success'); return; }
    if (canSelfUpgrade()) { setMyPlan('pro'); refreshPricing(); toast("⭐ You're on Pro — free while TeenWork is in testing.", 'success'); return; }
    // Paid Launch is on but no checkout exists yet: ask support, the admin can grant Pro
    try { openSupportModal('Pro / Billing', 'I would like to upgrade to TeenWork Pro.'); }
    catch (e) { toast('Payments are not set up yet. Message support and the TeenWork team can switch you to Pro.', 'info'); }
  };

  /* ── dashboard pill: plan + what is left ───────────────────────── */
  function refreshUI() {
    try {
      var u = user();
      document.querySelectorAll('.dash-header').forEach(function (h) {
        var old = h.querySelector('.tw-plan-pill'); if (old) old.remove();
        if (!u || isAdminUser(u) || !settings().enabled) return;
        var page = h.closest('.page'); var pid = page ? page.id : '';
        var pill = document.createElement('div');
        pill.className = 'tw-plan-pill';
        if (isPro(u)) {
          if (h.querySelector('.tw-tier-badge')) return;    // v39 already shows a Pro badge once Paid Launch is on
          pill.textContent = '⭐ Pro';
          pill.style.cssText = 'font-size:.72rem;font-weight:700;color:var(--amber);background:var(--amber-pale);padding:4px 10px;border-radius:20px;border:1.5px solid var(--amber)';
        } else {
          var us = usage(), parts = [];
          if (pid === 'page-employer') { if (limitFor('posts')) parts.push(us.posts + '/' + limitFor('posts') + ' posts'); }
          else if (pid === 'page-teen') { if (limitFor('apps')) parts.push(us.apps + '/' + limitFor('apps') + ' applications'); }
          if (limitFor('ai')) parts.push(us.ai + '/' + limitFor('ai') + ' AI today');
          if (limitFor('msgs')) parts.push(us.msgs + '/' + limitFor('msgs') + ' messages');
          pill.innerHTML = '<b>Free plan</b>' + (parts.length ? ' · ' + esc(parts.join(' · ')) : '') + ' · <span style="text-decoration:underline">See Pro</span>';
          pill.title = 'Your free-plan usage. Tap to see Pro.';
          pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:.74rem;font-weight:600;color:var(--muted);cursor:pointer;padding:4px 10px;border:1.5px solid var(--border);border-radius:20px;background:var(--card,#fff)';
          pill.onclick = function () { go('pricing'); };
        }
        var right = h.querySelector(':scope > div:last-child') || h;
        right.insertBefore(pill, right.firstChild);
      });
      var wb = $('wage-coach-btn'); if (wb) wb.onclick = function () { window.openWageCoach(); };
      var fb = $('emp-freemium-banner'); if (fb && settings().enabled) fb.style.display = 'none';   // old lifetime "3 free posts" banner
      refreshPricing();
      capApplicants();
    } catch (e) { console.warn('plan-limits refreshUI', e); }
  }

  /* ── free employers see only N applicants per job ──────────────── */
  function allowedApplicantIdx() {
    var n = settings().free.employerApplicantsPerJob;
    var u = user();
    if (!u || u.type !== 'employer' || isPro(u) || !n || typeof demoApplicants === 'undefined' || !demoApplicants) return null;
    var seen = {}, ok = {};
    demoApplicants.forEach(function (a, i) { var j = (a && a.job) || ''; seen[j] = (seen[j] || 0) + 1; if (seen[j] <= n) ok[i] = true; });
    return ok;
  }
  function noteHTML(hidden) {
    return '<div class="tw-plan-applicants-note" style="margin-top:10px;padding:12px 14px;background:var(--amber-pale,#fff7ed);border:1.5px solid var(--amber,#d97706);border-radius:12px;font-size:.84rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<span style="flex:1"><strong>🔒 ' + hidden + ' more applicant' + (hidden === 1 ? '' : 's') + '</strong> — free accounts see ' + settings().free.employerApplicantsPerJob + ' per job.</span>' +
      '<button type="button" class="btn-primary" style="padding:6px 14px;font-size:.8rem;background:var(--amber)" onclick="gotoPage(\'pricing\')">See Pro</button></div>';
  }
  function setNote(container, where, hidden) {
    // only touch the DOM when something changed, so the observer below never loops
    var note = container.querySelector(':scope > .tw-plan-applicants-note');
    if (!hidden) { if (note) note.remove(); return; }
    if (note && note.getAttribute('data-hidden') === String(hidden)) return;
    if (note) note.remove();
    var tmp = document.createElement('div'); tmp.innerHTML = noteHTML(hidden);
    var el = tmp.firstChild; el.setAttribute('data-hidden', String(hidden));
    if (where === 'end') container.appendChild(el); else container.insertBefore(el, where.nextSibling);
  }
  var capping = false;
  function capApplicants() {
    if (capping) return; capping = true;
    try {
      var ok = allowedApplicantIdx();
      var list = $('applicants-list');
      if (list) {
        var hidden = 0;
        list.querySelectorAll('.applicant-card').forEach(function (c, i) {
          var want = (!!ok && !ok[i]) ? 'none' : '';
          if (c.style.display !== want) c.style.display = want;
          if (want) hidden++;
        });
        setNote(list, 'end', hidden);
      }
      var board = $('emp-kanban-board');
      if (board) {
        var hid = 0;
        board.querySelectorAll('[ondragstart]').forEach(function (c) {
          var m = /_kDragging=(\d+)/.exec(c.getAttribute('ondragstart') || ''); if (!m) return;
          var want = (!!ok && !ok[+m[1]]) ? 'none' : '';
          if (c.style.display !== want) c.style.display = want;
          if (want) hid++;
        });
        if (board.parentElement) setNote(board.parentElement, board, hid);
      }
    } catch (e) {} finally { capping = false; }
  }
  // Some applicant renders are called internally, so re-apply the cap whenever the lists change
  var capTimer = null;
  function watchApplicants() {
    ['applicants-list', 'emp-kanban-board'].forEach(function (id) {
      var el = $(id); if (!el || el.__twPlanObs) return;
      el.__twPlanObs = true;
      new MutationObserver(function () { if (capping) return; clearTimeout(capTimer); capTimer = setTimeout(capApplicants, 30); }).observe(el, { childList: true, subtree: true });
    });
  }

  /* ── admin: 💎 Plans tab ───────────────────────────────────────── */
  var FIELDS = [
    ['aiPerDay', 'AI requests per day'],
    ['messagesPerMonth', 'Messages per month (0 = unlimited)'],
    ['employerPostsPerMonth', 'Job posts per month (employers)'],
    ['employerApplicantsPerJob', 'Applicants shown per job (employers, 0 = all)']
  ];
  function injectAdminTab() {
    var panel = $('tw-admin-panel') || document.querySelector('#page-admin');
    if (!panel || $('adm-panel-plans')) return;
    var tabs = panel.querySelector('.adm-tabs'), content = panel.querySelector('.adm-content');
    if (!tabs || !content) return;
    var b = document.createElement('button');
    b.className = 'adm-tab'; b.id = 'adm-tab-plans'; b.textContent = '💎 Plans';
    b.onclick = function () { window.adminSwitchTab('plans', b); };
    tabs.appendChild(b);
    var holder = document.createElement('div');
    holder.innerHTML = '<div class="adm-tab-panel" id="adm-panel-plans"><div class="adm-section-title">💎 Plans &amp; usage limits</div><div id="twpl-body"></div></div>';
    content.appendChild(holder.firstChild);
  }
  function card(inner) { return '<div style="background:var(--card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:14px;padding:16px;margin-bottom:14px">' + inner + '</div>'; }
  function renderAdmin() {
    var body = $('twpl-body'); if (!body) return;
    var s = settings(), c = cfg();
    var cloudLine = !sb() ? '⚪ Cloud database is not connected on this page. Settings you save here apply to this device only until it connects.'
      : cloud.ok ? '🟢 Cloud connected. Settings saved here reach every device the next time the app loads.'
      : cloud.checked ? '🔴 Could not read the cloud settings row (' + esc(cloud.error) + '). Saving will still try the cloud.'
      : '⏳ Checking the cloud…';
    var html = '';
    html += '<div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">' + cloudLine + '</div>';
    html += card(
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.9rem;font-weight:700;cursor:pointer"><input type="checkbox" id="twpl-enabled"' + (s.enabled ? ' checked' : '') + ' style="margin-top:3px"> <span>Plan limits are ON<br><span style="font-weight:400;color:var(--muted);font-size:.8rem">Off = every account gets everything, like before.</span></span></label>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.88rem;cursor:pointer;margin-top:10px"><input type="checkbox" id="twpl-self"' + (s.selfUpgrade ? ' checked' : '') + ' style="margin-top:3px"> <span>While Paid Launch is off, anyone can switch to Pro for free on the pricing page<br><span style="color:var(--muted);font-size:.8rem">Paid Launch is currently <strong>' + (c.launchPaid ? 'ON' : 'OFF') + '</strong> (Launch Controls tab). When it is on, only you can give Pro, below.</span></span></label>' +
      '<div style="font-weight:700;font-size:.88rem;margin:16px 0 8px">Free plan limits</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">' +
      FIELDS.map(function (f) { return '<label style="font-size:.8rem;color:var(--muted)">' + esc(f[1]) + '<br><input type="number" min="0" step="1" id="twpl-' + f[0] + '" value="' + s.free[f[0]] + '" style="width:100%;margin-top:4px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem;background:var(--card,#fff);color:var(--text)"></label>'; }).join('') +
      '</div>' +
      '<div style="font-weight:700;font-size:.88rem;margin:16px 0 8px">Pro-only features (unchecked = free accounts can use it)</div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.86rem">' +
      Object.keys(FEATURES).map(function (k) { return '<label style="cursor:pointer"><input type="checkbox" id="twpl-pro-' + k + '"' + (s.free.proOnly[k] ? ' checked' : '') + '> ' + esc(FEATURES[k]) + '</label>'; }).join('') +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn-primary" onclick="twPlanAdminSave()">💾 Save for everyone</button><span id="twpl-save-msg" style="font-size:.8rem;color:var(--muted)"></span></div>'
    );
    html += card(
      '<div style="font-weight:700;font-size:.95rem;margin-bottom:6px">⭐ Give or remove Pro</div>' +
      '<div style="font-size:.8rem;color:var(--muted);margin-bottom:10px">Type the account email (for a second account on the same email use email#2). The change reaches them the next time they sign in.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="email" id="twpl-email" placeholder="name@example.com" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem;background:var(--card,#fff);color:var(--text)">' +
      '<button type="button" class="btn-primary" onclick="twPlanAdminSet(\'pro\')">Give Pro</button><button type="button" class="btn-secondary" onclick="twPlanAdminSet(\'free\')">Set to Free</button></div>' +
      '<div id="twpl-set-msg" style="font-size:.8rem;color:var(--muted);margin-top:8px"></div>' +
      '<div style="font-weight:700;font-size:.85rem;margin:14px 0 6px">Accounts with a plan saved in the cloud</div><div id="twpl-list" style="font-size:.84rem">Loading…</div>'
    );
    html += card(
      '<div style="font-weight:700;font-size:.9rem;margin-bottom:6px">What these limits can and cannot do</div>' +
      '<div style="font-size:.82rem;color:var(--muted);line-height:1.6">Limits and plans are saved per account in the cloud, so clearing the browser or switching phones does not reset them. But the app runs in the browser with a public database key, so a person who opens the browser developer tools can change their own plan or counters. These limits keep ordinary users on the free plan; they are not payment security. Real enforcement needs Supabase Auth with row-level rules or a server that checks the plan before an action.</div>'
    );
    body.innerHTML = html;
    loadPlanList();
  }
  function loadPlanList() {
    var el = $('twpl-list'); if (!el) return;
    var c = sb();
    if (!c) { el.textContent = 'Cloud database is not connected on this page.'; return; }
    Promise.resolve(c.from('user_data').select('email,value,updated_at').eq('key', 'plan').limit(2000)).then(function (r) {
      if (r && r.error) throw r.error;
      var rows = (r && r.data) || [];
      if (!rows.length) { el.textContent = 'No account has a saved plan yet. New sign-ups and anyone who switches on the pricing page will appear here.'; return; }
      rows.sort(function (a, b) { return String(a.email).localeCompare(String(b.email)); });
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.83rem">' + rows.map(function (row) {
        var v = ''; try { v = JSON.parse(row.value); } catch (e) { v = row.value; }
        return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 4px">' + esc(row.email) + '</td><td style="padding:6px 4px;font-weight:700;color:' + (v === 'pro' ? 'var(--amber)' : 'var(--muted)') + '">' + (v === 'pro' ? '⭐ Pro' : 'Free') + '</td><td style="padding:6px 4px;text-align:right"><button type="button" class="btn-sm btn-secondary" onclick="twPlanAdminSet(\'' + (v === 'pro' ? 'free' : 'pro') + '\',\'' + esc(row.email) + '\')">' + (v === 'pro' ? 'Set to Free' : 'Give Pro') + '</button></td></tr>';
      }).join('') + '</table>';
    }).catch(function (e) { el.textContent = 'Could not read plans from the cloud (' + ((e && e.message) || e) + ').'; });
  }
  window.twPlanAdminSave = function () {
    var s = settings();
    s.enabled = !!($('twpl-enabled') && $('twpl-enabled').checked);
    s.selfUpgrade = !!($('twpl-self') && $('twpl-self').checked);
    FIELDS.forEach(function (f) { var v = parseInt($('twpl-' + f[0]) && $('twpl-' + f[0]).value, 10); s.free[f[0]] = (isNaN(v) || v < 0) ? 0 : v; });
    Object.keys(FEATURES).forEach(function (k) { s.free.proOnly[k] = !!($('twpl-pro-' + k) && $('twpl-pro-' + k).checked); });
    var local = readJSON('tw_admin_config', {}) || {}; s.launchPaid = !!local.launchPaid;
    var msg = $('twpl-save-msg'); if (msg) msg.textContent = 'Saving…';
    pushSettings(s).then(function (ok) {
      if (msg) msg.textContent = ok ? 'Saved to the cloud ' + new Date().toLocaleTimeString() + '.' : (sb() ? 'Saved on this device, but the cloud save failed: ' + cloud.error : 'Saved on this device only (cloud not connected).');
      toast(ok ? '✅ Plan limits saved for everyone' : '⚠️ Saved on this device only', ok ? 'success' : 'warn');
      try { _twAdminAudit('plan-limits-saved', JSON.stringify(s.free)); } catch (e) {}
      refreshUI();
    });
  };
  window.twPlanAdminSet = function (plan, email) {
    var key = String(email || ($('twpl-email') && $('twpl-email').value) || '').trim().toLowerCase();
    var msg = $('twpl-set-msg');
    if (!key || key.indexOf('@') < 0) { if (msg) msg.textContent = 'Type the account email first.'; return; }
    // cache on this device too, for anyone who signs in here
    try { localStorage.setItem('tw_' + key.replace(/[^a-z0-9]/gi, '_') + '_plan', JSON.stringify(plan)); } catch (e) {}
    var c = sb();
    if (!c) { if (msg) msg.textContent = 'Saved on this device only: the cloud database is not connected.'; return; }
    if (msg) msg.textContent = 'Saving…';
    Promise.resolve(c.from('user_data').upsert({ email: key, key: 'plan', value: JSON.stringify(plan), updated_at: new Date().toISOString() }, { onConflict: 'email,key' })).then(function (r) {
      if (r && r.error) throw r.error;
      if (msg) msg.textContent = (plan === 'pro' ? '⭐ ' : '') + key + ' is now on ' + (plan === 'pro' ? 'Pro' : 'the free plan') + '.';
      toast('✅ ' + key + ' → ' + (plan === 'pro' ? 'Pro' : 'Free'), 'success');
      try { _twAdminAudit('plan-set', key + ' → ' + plan); } catch (e) {}
      loadPlanList();
    }).catch(function (e) { if (msg) msg.textContent = 'Cloud save failed: ' + ((e && e.message) || e); });
  };

  /* ── start ─────────────────────────────────────────────────────── */
  window.twPlan = { planOf: planOf, storedPlanOf: storedPlanOf, usage: usage, settings: settings, allow: allow, bump: bump, refresh: refreshUI, pull: pullSettings, setMyPlan: setMyPlan, limitFor: limitFor };
  function start() {
    wrapAll();
    watchApplicants();
    refreshUI();
    var tries = 0;
    (function tick() { if (sb()) { pullSettings(); return; } if (++tries < 60) setTimeout(tick, 250); })();   // the Supabase SDK loads async
    window.addEventListener('tw-supabase-ready', function () { pullSettings(); pullMine(); });            // fired by featpack-v39-cloud-js on a late connect
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
  // wrappers that other late scripts might replace are re-checked once more after everything settled
  setTimeout(wrapAll, 1500);
})();
