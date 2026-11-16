/* ═══════════════════════════════════════════════════════════════════════
   account-pages-v60 — the signed-in pages (Aya's list of Nov 15, 2026)

   1. Every dashboard page has its own title. The header shows the name of the
      open section (the same name the menu uses) and the browser tab says
      "<Section> · TeenWork". Before, the header said "Teen Dashboard — Hi Aya!
      Find your next job." on Work Log, Profile, Applied and every other page.
      The greeting line stays on the home section only; a parent's "Monitoring
      <teen>" line stays on every parent page, because it says whose account
      the page is about.
   2. The teen's bio. The box sits in the profile card at the top of Profile &
      Settings (index.html) and what the teen writes is saved to their account
      (user_data "bio", through _DB). Before, typing threw an error on every
      key (saveBioInput was never written), "Save Bio" read a box that does not
      exist, and the box opened with a sample bio in it, so no teen could ever
      finish their profile.

   The rest of that list lives where its code is: share-v54.js (the share note
   is on the home section only), featpack-js.js (Messages buttons wait for an
   open chat), app-05.js (Activity Digest, Work Log money), money-hours-v44.js.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twAccountPagesV60) return;
  window.__twAccountPagesV60 = true;

  var ROLES = ['teen', 'parent', 'employer'];
  var HOME = { teen: 'ttab-browse', parent: 'ptab-overview', employer: 'etab-post' };   // the section each dashboard opens on
  var DASH = { teen: 'Teen Dashboard', parent: 'Parent Dashboard', employer: 'Employer Dashboard' };
  // One line under the title, only for pages that don't open with a line of their own.
  var LINES = {
    'ttab-applications': 'The jobs you applied for and where each one stands.',
    'ttab-earnings': 'What you earned, what you took out and what is left.',
    'ttab-resume': 'Your profile, parent link, account details and alerts.',
    'etab-active': 'Your job posts and how each one is doing.',
    'etab-analytics': 'How your job posts are doing.',
    'etab-profile': 'Your business details and your photo or logo.'
  };

  var $ = function (id) { return document.getElementById(id); };
  function me() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; } catch (e) { return window.currentUser || null; } }
  function activity() { try { return typeof userActivity !== 'undefined' ? userActivity : (window.userActivity || null); } catch (e) { return window.userActivity || null; } }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }
  function isOn(el) { return !!el && el.classList.contains('active'); }

  /* ── 1. page titles ─────────────────────────────────────────────── */
  var BASE_TITLE = document.title;
  function nameOf(role, id) {
    if (id === 'verify') return 'Verification';
    try {
      var m = window.twCleanMenu && window.twCleanMenu.menu && window.twCleanMenu.menu[role];
      var items = m ? (m.main || []).slice() : [];
      ((m && m.groups) || []).forEach(function (g) { items = items.concat(g.items || []); });
      for (var i = 0; i < items.length; i++) if (items[i][0] === id) return String(items[i][2] || '');
    } catch (e) {}
    return '';
  }
  // Job Map, Q&A and a few more sections are added by scripts inside a wrapper, so this looks at any depth
  // and only skips a panel that sits inside another section.
  function openSection(page) {
    var list = page.querySelectorAll('.dashboard .tab-panel.active');
    for (var i = 0; i < list.length; i++) if (!list[i].parentElement.closest('.tab-panel')) return list[i].id;
    return '';
  }
  // The heading keeps whatever else sits inside it (the tester badge), so only its first words change.
  function setLead(h1, text) {
    var n = h1.firstChild;
    if (!n || n.nodeType !== 3) { n = document.createTextNode(''); h1.insertBefore(n, h1.firstChild); }
    if (n.nodeValue !== text) n.nodeValue = text;
  }
  function paintHeader(role, page, id, name) {
    var h1 = page.querySelector('.dash-header h1'); if (!h1) return;
    setLead(h1, name || DASH[role]);
    var wrap = h1.parentElement; if (!wrap) return;
    var home = !id || id === HOME[role];
    var keep = home || role === 'parent';
    var own = null, first = null;
    [].forEach.call(wrap.children, function (c) {
      if (c.tagName !== 'P') return;
      if (c.classList.contains('tw60-line')) own = c; else if (!first) first = c;
    });
    if (first) first.classList.toggle('tw60-off', !keep);
    var text = keep ? '' : (LINES[id] || '');
    if (text) {
      if (!own) { own = document.createElement('p'); own.className = 'tw60-line'; wrap.appendChild(own); }
      if (own.textContent !== text) own.textContent = text;
      own.hidden = false;
    } else if (own) own.hidden = true;
  }
  function setTabTitle(name) {
    var t = name ? name + ' · TeenWork' : BASE_TITLE;
    if (document.title !== t) document.title = t;
  }

  var lastTeen = '';
  function paint() {
    var u = me(), role = u && ROLES.indexOf(u.type) >= 0 ? u.type : null;
    var page = role ? $('page-' + role) : null, on = isOn(page);
    if (on) {
      var id = openSection(page), name = nameOf(role, id);
      paintHeader(role, page, id, name);
      setTabTitle(name || DASH[role]);
    } else setTabTitle(role && isOn($('page-verify')) ? nameOf(role, 'verify') : '');
    if (on && role === 'teen') {
      var key = String(u.dataKey || u.email || '');
      if (key !== lastTeen) { lastTeen = key; bioDirty = false; clearTimeout(bioTimer); [1500, 4000].forEach(function (ms) { setTimeout(syncProfile, ms); }); }
      syncProfile();
    } else if (!role) lastTeen = '';
  }
  var queued = false;
  function later() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { paint(); } catch (e) { console.warn('account-pages-v60:', e); } }, 40); }

  /* ── 2. the teen's bio ──────────────────────────────────────────── */
  var SAMPLE = /^Hardworking 16-year-old from Burlington/;      // the old demo bio: never a real teen's own words
  var MAX = 600, COUNTS_FROM = 20;                              // onboarding-v53 counts a bio from 20 letters
  var bioTimer = null, bioDirty = false;
  function tidy(t) { return String(t == null ? '' : t).replace(/\s+$/, '').replace(/^\s+/, '').slice(0, MAX); }
  function isTeen(u) { return !!(u && u.type === 'teen'); }
  function savedBio() {
    try { var v = window._DB && _DB.load ? _DB.load('bio', '') : ''; return typeof v === 'string' && !SAMPLE.test(v) ? v : ''; } catch (e) { return ''; }
  }
  function storeBio(text) {
    var u = me(); if (!isTeen(u)) return false;
    text = tidy(text);
    try { if (typeof trackActivity === 'function') trackActivity('bio_update', text); else if (activity()) activity().bio = text; } catch (e) {}
    try { if (window._DB && _DB.save) _DB.save('bio', text); } catch (e) {}
    bioDirty = false;
    drawProfileNote();
    try { if (typeof window.renderProfileCompletionBar === 'function' && $('teen-profile-completion')) window.renderProfileCompletionBar('teen-profile-completion'); } catch (e) {}
    try { if (window._twOnboardingV53 && window._twOnboardingV53.drawNextSteps) window._twOnboardingV53.drawNextSteps(); } catch (e) {}
    return true;
  }
  function said(text) { var el = $('tw60-bio-saved'); if (el && el.textContent !== text) el.textContent = text; }

  // "Profile 80% complete. A short bio is the last thing to add." under the teen's name, until it is 100%.
  function drawProfileNote() {
    var el = $('tw60-profile-todo'), u = me(); if (!el) return;
    var p = null;
    try { p = isTeen(u) && window.twTeenSteps && window.twTeenSteps.profile ? window.twTeenSteps.profile(u) : null; } catch (e) {}
    if (!p || p.pct >= 100 || !p.missing || !p.missing.length) { el.hidden = true; return; }
    var onlyBio = p.missing.length === 1 && (p.parts || []).some(function (x) { return x.id === 'bio' && !x.done; });
    var text = 'Profile ' + p.pct + '% complete. ' + (onlyBio ? 'A short bio is the last thing to add.' : 'Still to add: ' + p.missing.join(', ') + '.');
    if (el.textContent !== text) el.textContent = text;
    el.hidden = false;
  }
  // Put the saved bio in the box (never while the teen is typing in it) and into the app's own copy.
  function syncProfile() {
    var u = me(); if (!isTeen(u)) return;
    var box = $('profile-bio-input'), a = activity();
    if (!bioDirty) {
      var bio = savedBio();
      if (!bio && a && a.bio && !SAMPLE.test(a.bio)) {                 // written on this device before bios were saved to the account
        bio = tidy(a.bio);
        try { if (window._DB && _DB.save) _DB.save('bio', bio); } catch (e) {}
      }
      if (a && bio && a.bio !== bio) a.bio = bio;
      if (box && box !== document.activeElement && box.value !== bio) { box.value = bio; said(''); }
    }
    drawProfileNote();
  }

  // The bio box calls this on every key. It saves by itself a moment after the teen stops typing.
  window.saveBioInput = function (value) {
    if (!isTeen(me())) return;
    bioDirty = true; said('');
    drawProfileNote();
    clearTimeout(bioTimer);
    bioTimer = setTimeout(function () { if (bioDirty && storeBio(value)) said('Saved'); }, 900);
  };
  window.saveBioBtn = function () {
    var box = $('profile-bio-input'); if (!box || !isTeen(me())) return;
    var text = tidy(box.value);
    if (!text) { toast('Write a sentence or two about yourself first.', 'warning'); try { box.focus(); } catch (e) {} return; }
    clearTimeout(bioTimer);
    if (!storeBio(text)) return;
    said('Saved');
    toast(text.length >= COUNTS_FROM ? '✅ Bio saved!' : '✅ Saved. Write a little more (20 letters or more) and it counts toward your profile.', 'success');
  };
  // "Use This Bio" in the AI résumé builder: the AI's bio goes into the box and is saved like a typed one.
  window.useAIBio = function () {
    var bio = tidy(window._latestAIBio);
    if (!bio) { toast('Ask the AI to write a bio first!', 'warning'); return; }
    if (!isTeen(me())) return;
    var box = $('profile-bio-input'); if (box) box.value = bio;
    clearTimeout(bioTimer);
    if (storeBio(bio)) { said('Saved'); toast('✅ Bio saved to your profile!', 'success'); }
  };
  // A bio typed just before leaving the page is not lost.
  window.addEventListener('pagehide', function () {
    var box = $('profile-bio-input');
    if (bioDirty && box) { clearTimeout(bioTimer); try { storeBio(box.value); } catch (e) {} }
  });

  /* ── start ──────────────────────────────────────────────────────── */
  function boot() {
    try { paint(); } catch (e) { console.warn('account-pages-v60:', e); }
    new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window._twAccountPagesV60 = { paint: paint, syncProfile: syncProfile, savedBio: savedBio };
})();
