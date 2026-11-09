/* ═══════════════════════════════════════════════════════════════════
   v53 · TEEN ONBOARDING, MESSAGES DIALOG, VERIFICATION, HOME DEMOS
   (2026-11-03, Aya's Nov 2 practice-account report, items 5–10)

   5. Empty job feed: "While you wait for jobs" next steps with buttons:
      complete profile (real % now), Workplace Safety Basics, link a
      parent, job-match alert settings, and the First Job Checklist.
   6. window.twTeenSteps: the one place that says what a teen still needs
      before applying (linked parent, parent consent, work permit only
      when the state or employer needs one). The First Job Checklist in
      app-05.js and the feed's next steps both read it.
   7. Messages: a labeled Close button, role="dialog" + aria-modal, focus
      moves in and back out, Tab stays inside, Escape still closes. The
      "Something feels wrong" button sits inside the dialog with a text
      label. Its alert window used to add a class the CSS never showed
      (and sat under Messages), so it now opens on top.
   8. Profile photo: optional, who sees it (nobody: upload isn't on yet),
      default avatar with the teen's initials. Profile % no longer counts
      a photo.
   9. Verification: the permit step says exactly where the teen stands
      ("Not needed at 16 in Vermont", "Needed: add your permit", "Being
      checked"…) instead of "Ready". Called from parent-consent-v44.
  10. Home page on phones: the three demo buttons sit in one row right
      under Sign Up, inside the first 390×844 screen.
   Wraps and observes only; no data is written except the teen's own
   checklist ticks (unchanged keys).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twOnboardingV53) return;
  window.__twOnboardingV53 = true;

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null); } catch (e) { return null; } };
  const ua = () => { try { return typeof userActivity !== 'undefined' ? userActivity : (window.userActivity || null); } catch (e) { return window.userActivity || null; } };
  const isTeen = u => !!(u && !u.isAdmin && u.type === 'teen');
  const practice = u => !!(u && (u.twDemo || u.isDemo));
  const tester = u => { try { return !!(window._twIsTesterUser && window._twIsTesterUser(u)); } catch (e) { return false; } };
  const tiers = () => window.twJobTiers || null;
  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const SAMPLE_BIO = /^Hardworking 16-year-old from Burlington/;

  /* ══ 6. WHAT A TEEN NEEDS BEFORE APPLYING ═══════════════════════════ */
  function ageState(u) {
    let age = 0, state = '';
    try { const s = tiers() && tiers().teenStatus(u); if (s) { age = Number(s.age) || 0; state = s.state || ''; } } catch (e) {}
    if (!age) { try { age = window.twAgeFromDob ? window.twAgeFromDob(u.dob) : 0; } catch (e) {} age = age || Number(u.age) || 0; }
    return { age, state: state || String(u.state || '') };
  }
  function linkOf(u) {
    const local = readJSON('tw_parent_links', {})[String(u.email || '').toLowerCase()] || null;
    const l = (u.parentLinked && u.parentLinked.status) ? u.parentLinked : local;
    return l || {};
  }
  // Each step: { state: 'done' | 'waiting' | 'todo' | 'skipped' | 'na', status, detail, action, actionLabel }
  function parentStep(u) {
    const l = linkOf(u), who = l.parentName || l.parentEmail || 'your parent';
    if (l.status === 'approved') return { state: 'done', status: 'Linked to ' + who, action: '', actionLabel: '' };
    if (practice(u)) return { state: 'skipped', status: 'Skipped in this practice account', detail: 'A real account needs this before applying.', action: 'link', actionLabel: 'See how linking works' };
    if (tester(u)) return { state: 'skipped', status: 'Optional for tester accounts', action: 'link', actionLabel: 'Link a parent' };
    if (l.status === 'pending') return { state: 'waiting', status: 'Waiting for ' + who + ' to accept', detail: 'They accept from their own TeenWork account.', action: 'link', actionLabel: 'See status' };
    return { state: 'todo', status: 'Not linked yet', detail: 'Send your parent or guardian a request, or give them your link code.', action: 'link', actionLabel: 'Link a parent' };
  }
  function consentStep(u) {
    if (practice(u)) return { state: 'skipped', status: 'Skipped in this practice account', detail: 'A real account needs this before applying.', action: 'verify', actionLabel: 'How consent works' };
    let c = { ok: false, why: '' };
    try { c = tiers() ? tiers().consentStatus(u) : c; } catch (e) {}
    if (c.why === 'tester') return { state: 'skipped', status: 'Optional for tester accounts', action: 'verify', actionLabel: 'Open Verification' };
    if (c.ok) {
      let by = null; try { by = window._twParentConsent && window._twParentConsent.teenConsent(); } catch (e) {}
      return { state: 'done', status: by && by.name ? by.name + ' agreed' : 'Your parent agreed', action: '', actionLabel: '' };
    }
    if (parentStep(u).state !== 'done') return { state: 'todo', status: 'After your parent is linked', detail: 'Then they agree from their own account. You can\'t do this step yourself.', action: 'verify', actionLabel: 'How consent works' };
    return { state: 'waiting', status: 'Waiting for your parent to agree', detail: 'They open My Teens in their TeenWork account and tap Review & agree.', action: 'verify', actionLabel: 'Check again' };
  }
  function permitStep(u) {
    const { age, state } = ageState(u), T = tiers();
    if (!T) return { state: 'na', status: 'Checked when you apply', action: '', actionLabel: '' };
    if (!age || !state) return { state: 'todo', status: 'Add your birthday and state', detail: 'Your profile needs them to know if you need a work permit.', action: 'profile', actionLabel: 'Open profile' };
    let ps = { ok: false, status: 'none' }, need = null;
    try { ps = T.permitStatus(u) || ps; } catch (e) {}
    try { need = T.permitNeeded(state, age); } catch (e) {}
    if (ps.ok) return { state: 'done', status: 'Work permit on file', action: '', actionLabel: '', age, place: state };
    if (ps.status === 'needs_review') return { state: 'waiting', status: 'Your permit is being checked', detail: 'You can apply to jobs that need a permit once it passes.', action: 'verify', actionLabel: 'Open Verification', age, place: state };
    if (ps.status === 'rejected') return { state: 'todo', status: 'Your last permit photo didn\'t pass', detail: 'Add a clearer photo on the Verification page.', action: 'verify', actionLabel: 'Add a new photo', age, place: state };
    if (!need || !need.known) return { state: 'todo', status: 'Check your state\'s rule', detail: (need && need.note) || '', action: 'verify', actionLabel: 'Open Verification', age, place: state };
    if (!need.needed) return { state: 'na', status: 'Not needed at ' + age + ' in ' + need.state, detail: need.note + ' An employer can still ask for one.', action: '', actionLabel: '', age, place: need.state };
    return { state: 'todo', status: 'Needed at ' + age + ' in ' + need.state, detail: need.note + ' Add a photo of it on the Verification page.', action: 'verify', actionLabel: 'Add my permit', age, place: need.state };
  }
  const passes = s => s.state === 'done' || s.state === 'skipped' || s.state === 'na';
  function gates(u) {
    u = u || me();
    if (!isTeen(u)) return null;
    const list = [
      Object.assign({ id: 'parent', title: 'Link a parent or guardian' }, parentStep(u)),
      Object.assign({ id: 'consent', title: 'Your linked parent agrees, from their own account' }, consentStep(u)),
      Object.assign({ id: 'permit', title: 'A work permit, only if your state or the employer needs one' }, permitStep(u)),
    ];
    const open = list.filter(s => !passes(s));
    return { list, ok: !open.length, practice: practice(u), done: list.filter(s => s.state === 'done' || s.state === 'na').length, total: list.length };
  }

  /* profile: what counts (a photo never does; upload isn't on yet) */
  function profile(u) {
    u = u || me() || {};
    const a = ua() || {};
    const bioBox = $('profile-bio-input');
    const bio = String(a.bio || (bioBox && bioBox.value) || '').trim();
    const skills = (Array.isArray(u.skills) && u.skills.length ? u.skills : (Array.isArray(a.skills) ? a.skills : [])).filter(Boolean);
    const { age } = ageState(u);
    const parts = [
      { id: 'name', label: 'your name', done: !!String(u.name || '').trim() },
      { id: 'age', label: 'your birthday', done: !!(u.dob || age) },
      { id: 'town', label: 'your town', done: !!(u.city && u.state) },
      { id: 'bio', label: 'a short bio', done: bio.length >= 20 && !SAMPLE_BIO.test(bio) },
      { id: 'skills', label: '2 or more skills', done: skills.length >= 2 },
    ];
    const done = parts.filter(p => p.done).length;
    return { pct: Math.round(done / parts.length * 100), missing: parts.filter(p => !p.done).map(p => p.label), parts };
  }
  // Was: six browser keys that nothing saved (and a photo), so it sat at 0%.
  window.computeProfileCompletion = function () { const u = me(); return isTeen(u) ? profile(u).pct : 0; };

  function lessons() {
    const list = window.lessonsData || [], done = ((ua() || {}).lessonsCompleted || []).filter(id => list.some(l => l.id === id));
    return { done: done.length, total: list.length || 12, safetyDone: done.includes('safety') };
  }
  function alerts() {
    const on = id => { const el = $(id); return !el || !!el.checked; };
    return { inapp: on('ctrl-inapp-match'), email: on('ctrl-email-match') };
  }

  /* where each step's button goes */
  function go(id) {
    const btn = document.querySelector('[data-twm="' + id + '"]');
    try {
      const pg = $('page-teen');
      if (pg && !pg.classList.contains('active') && typeof window.gotoPage === 'function') window.gotoPage('teen');
      if (typeof window.switchDashTab === 'function') window.switchDashTab(btn, id);
      else if (typeof window._navfix_go === 'function') window._navfix_go('teen', id);
    } catch (e) { console.warn('onboarding-v53 go', e); }
  }
  function focusLater(el, highlight) {
    if (!el) return;
    setTimeout(() => {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
      try { el.focus({ preventScroll: true }); } catch (e) {}
      if (highlight) { highlight.classList.add('tw53-flash'); setTimeout(() => highlight.classList.remove('tw53-flash'), 2400); }
    }, 250);
  }
  const ACTIONS = {
    profile() { go('ttab-resume'); const t = $('profile-bio-input') || $('skills-input'); focusLater(t, t && t.closest('.panel')); },
    safety() { if (typeof window.openLesson === 'function') window.openLesson('safety'); else go('ttab-lessons'); },
    lessons() { go('ttab-lessons'); },
    link() { if (typeof window.twOpenLinkModal === 'function') window.twOpenLinkModal(); else go('ttab-resume'); },
    alerts() { go('ttab-resume'); focusLater($('ctrl-inapp-match'), $('notif-prefs-section')); },
    verify() { if (typeof window.showVerifyPage === 'function') window.showVerifyPage(); },
    checklist() { go('ttab-firstjob'); },
    portfolio() { go('ttab-portfolio'); },
    messages() { if (typeof window.openMsgModal === 'function') window.openMsgModal(); },
    schedule() { go('ttab-calendar'); },
    map() { go($('ttab-map') ? 'ttab-map' : 'ttab-browse'); },
    worklog() { go('ttab-worklog'); },
    earnings() { go('ttab-earnings'); },
    references() { go('ttab-references'); },
  };
  window.twTeenSteps = {
    gates, profile, lessons, alerts, passes,
    open(name) { const f = ACTIONS[name]; if (f) f(); },
    get ACTIONS() { return Object.keys(ACTIONS); },
  };

  /* ══ 5. EMPTY JOB FEED → NEXT STEPS ═════════════════════════════════ */
  function nextStepsHTML(u) {
    const p = profile(u), l = lessons(), a = alerts(), g = gates(u), parent = g.list[0];
    const row = (cls, icon, title, status, btn) =>
      `<li class="tw53-step ${cls}"><span class="tw53-step-icon" aria-hidden="true">${icon}</span>` +
      `<div class="tw53-step-text"><b>${title}</b><span>${status}</span></div>${btn}</li>`;
    const button = (act, label, primary) => `<button type="button" class="tw53-btn${primary ? ' pri' : ''}" data-tw53-act="${act}">${esc(label)}</button>`;
    const profileStatus = p.pct >= 100 ? 'Done: 100% complete' : p.pct + '% complete. Still to add: ' + esc(p.missing.join(', ')) + '.';
    const lessonStatus = l.safetyDone ? 'Done. ' + l.done + ' of ' + l.total + ' lessons finished' : 'Recommended first lesson · ' + l.done + ' of ' + l.total + ' lessons done';
    const parentStatus = esc(parent.status) + (parent.state === 'todo' ? '. You need this before you can apply.' : '.');
    const alertStatus = a.inapp || a.email ? 'On: ' + [a.inapp ? 'in the app' : '', a.email ? 'by email' : ''].filter(Boolean).join(' and ') + ' when a job matches your skills.' : 'Off. Turn them on to hear about new jobs.';
    return `<h3 id="tw53-next-h">While you wait for jobs</h3>
      <p class="tw53-next-sub">Do these now so you're ready to apply as soon as a job is posted near you.</p>
      <ul class="tw53-steps">
        ${row(p.pct >= 100 ? 'is-done' : '', '👤', 'Complete your profile', profileStatus, button('profile', p.pct >= 100 ? 'Edit profile' : 'Complete profile', p.pct < 100))}
        ${row(l.safetyDone ? 'is-done' : '', '🦺', 'Workplace Safety Basics', lessonStatus, button(l.safetyDone ? 'lessons' : 'safety', l.safetyDone ? 'More lessons' : 'Start lesson', !l.safetyDone && p.pct >= 100))}
        ${row(parent.state === 'done' ? 'is-done' : '', '👪', 'Link a parent', parentStatus, parent.action ? button('link', parent.actionLabel, false) : '')}
        ${row(a.inapp || a.email ? 'is-done' : '', '🔔', 'Job-match alerts', alertStatus, button('alerts', 'Alert settings', false))}
      </ul>
      <p class="tw53-next-foot">What do you need before applying? <button type="button" class="tw48-link" data-tw53-act="checklist">See the First Job Checklist</button></p>`;
  }
  let drawingNext = false;
  function drawNextSteps() {
    const list = $('browse-jobs-list'), u = me();
    if (!list || drawingNext) return;
    const empty = list.querySelector(':scope > [data-tw-empty]');
    let box = $('tw53-next');
    if (!isTeen(u) || !empty || list.querySelector('.browse-card')) { if (box) box.remove(); return; }
    drawingNext = true;
    try {
      const html = nextStepsHTML(u);
      if (!box) { box = document.createElement('section'); box.id = 'tw53-next'; box.className = 'tw53-next'; box.setAttribute('aria-labelledby', 'tw53-next-h'); }
      if (box._html !== html) { box.innerHTML = html; box._html = html; }
      if (empty.nextElementSibling !== box) empty.after(box);
      try { if ($('teen-profile-completion') && typeof window.renderProfileCompletionBar === 'function') window.renderProfileCompletionBar('teen-profile-completion'); } catch (e) {}
    } finally { drawingNext = false; }
  }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-tw53-act]');
    if (!b) return;
    e.preventDefault();
    window.twTeenSteps.open(b.getAttribute('data-tw53-act'));
  });

  /* Lessons: Workplace Safety Basics is the starting lesson until it's done */
  function markStartLesson() {
    const grid = $('lessons-grid'); if (!grid) return;
    const card = [...grid.querySelectorAll('.lesson-card')].find(c => /'safety'/.test(c.getAttribute('onclick') || ''));
    if (!card) return;
    const done = card.classList.contains('done');
    const tag = card.querySelector('.tw53-start-tag');
    if (done) { if (tag) tag.remove(); card.classList.remove('tw53-start'); return; }
    if (!tag) {
      const t = document.createElement('span'); t.className = 'tw53-start-tag'; t.textContent = 'Start here';
      const title = card.querySelector('.lesson-title'); if (title) title.before(t); else card.prepend(t);
      card.classList.add('tw53-start');
    }
    if (grid.firstElementChild !== card) grid.prepend(card);
  }

  /* ══ 7. MESSAGES DIALOG ═════════════════════════════════════════════ */
  const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const visibleEl = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  let lastPointer = null, msgOpener = null;
  document.addEventListener('pointerdown', e => { lastPointer = e.target; }, true);
  function openerNow(box) {
    let a = document.activeElement;
    if (!a || a === document.body || (box && box.contains(a))) a = lastPointer && lastPointer.closest ? lastPointer.closest('button,a,[tabindex],[onclick]') : null;
    return a && !(box && box.contains(a)) ? a : null;
  }
  function setupMessages() {
    const ov = $('msgModal'), box = ov && ov.querySelector('.msg-modal');
    if (!box || box.__tw53) return;
    box.__tw53 = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Messages');
    box.tabIndex = -1;
    const bar = document.createElement('div');
    bar.className = 'tw53-msg-bar';
    bar.innerHTML = '<button type="button" class="tw53-msg-sos" id="tw53-msg-sos"><span aria-hidden="true">⚠️</span> Something feels wrong</button>' +
      '<button type="button" class="tw53-msg-close" id="tw53-msg-close" aria-label="Close messages"><span aria-hidden="true">✕</span> Close</button>';
    box.insertBefore(bar, box.firstChild);
    $('tw53-msg-close').addEventListener('click', () => { if (typeof window.closeMsgModal === 'function') window.closeMsgModal(); else ov.classList.remove('open'); });
    $('tw53-msg-sos').addEventListener('click', () => { if (typeof window.openFeelsWrong === 'function') window.openFeelsWrong(); });
    let wasOpen = ov.classList.contains('open');
    new MutationObserver(() => {
      const open = ov.classList.contains('open');
      if (open === wasOpen) return;
      wasOpen = open;
      document.body.classList.toggle('tw53-msg-open', open);
      if (open) {
        msgOpener = openerNow(box);
        // Into the dialog, without opening the phone keyboard. openMsgModal's own prefill focus still wins.
        setTimeout(() => { if (ov.classList.contains('open') && !box.contains(document.activeElement)) try { box.focus({ preventScroll: true }); } catch (e) {} }, 0);
      } else {
        const a = document.activeElement, back = msgOpener; msgOpener = null;
        if ((!a || a === document.body || box.contains(a)) && back && back.isConnected && visibleEl(back)) try { back.focus({ preventScroll: true }); } catch (e) {}
        else if (box.contains(a)) try { a.blur(); } catch (e) {}
      }
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    if (wasOpen) document.body.classList.add('tw53-msg-open');
  }
  // Tab stays inside Messages while it is the top window.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const ov = $('msgModal'), box = ov && ov.querySelector('.msg-modal');
    if (!box || !ov.classList.contains('open')) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== box && !box.contains(a)) return;   // another window on top has focus
    const items = [...box.querySelectorAll(FOCUSABLE)].filter(visibleEl);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (!box.contains(a) || a === box) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }, true);

  // Escape closes the top window only, even while typing (featpack-js ignores keys typed in a field, and closed every window at once).
  const OTHER_TOP = '#tw35-modal, #tw44c-modal, #twjt-modal, #tw47pa, #tw34l, #twlm-sheet, #twps-win, #kbd-help-modal, .ai-tools-modal-overlay.open';
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.isComposing || e.defaultPrevented) return;
    const sos = $('feelsWrongModal'), ov = $('msgModal');
    if (sos && (sos.classList.contains('open') || sos.classList.contains('active'))) { e.stopImmediatePropagation(); window.closeFeelsWrong(); return; }
    if (!ov || !ov.classList.contains('open')) return;
    const others = [...document.querySelectorAll(OTHER_TOP + ', .modal-overlay.open, .modal-overlay.active')].filter(visibleEl);
    if (others.length) return;   // a window opened from Messages handles its own Escape
    e.stopImmediatePropagation();
    if (typeof window.closeMsgModal === 'function') window.closeMsgModal(); else ov.classList.remove('open');
  }, true);

  // "Something feels wrong": featpack-js added class "active", which the CSS never shows, so the alert window stayed hidden.
  let sosOpener = null;
  window.openFeelsWrong = function () {
    const m = $('feelsWrongModal'); if (!m) return;
    sosOpener = openerNow(m);
    m.classList.add('open', 'active');
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const h = m.querySelector('h3'); if (h) { h.id = h.id || 'tw53-sos-title'; m.setAttribute('aria-labelledby', h.id); }
    setTimeout(() => { const t = $('feels-wrong-note'); if (t) try { t.focus({ preventScroll: true }); } catch (e) {} }, 30);
  };
  window.closeFeelsWrong = function () {
    const m = $('feelsWrongModal'); if (!m) return;
    m.classList.remove('open', 'active');
    const back = sosOpener; sosOpener = null;
    if (back && back.isConnected && visibleEl(back)) try { back.focus({ preventScroll: true }); } catch (e) {}
  };

  /* ══ 9. VERIFICATION: PRECISE PERMIT STATUS ═════════════════════════ */
  // parent-consent-v44 calls this for step 3 instead of writing "Ready".
  window.twPermitStepStatus = function (open3, u) {
    u = u || me();
    if (!isTeen(u)) return null;
    const s = permitStep(u), step = $('tw-ver-step-3');
    let kind, label;
    if (s.state === 'done') { kind = 'done'; label = '✓ On file'; }
    else if (s.state === 'na') { kind = 'done'; label = '✓ Not needed at ' + s.age + ' in ' + s.place; }
    else if (s.state === 'waiting') { kind = 'active'; label = 'Being checked'; }
    else if (/didn't pass/.test(s.status)) { kind = 'active'; label = 'Didn\'t pass: try again'; }
    else if (!open3) { kind = 'locked'; label = '🔒 After parent consent'; }
    else if (/^Needed/.test(s.status)) { kind = 'active'; label = 'Needed: add your permit'; }
    else { kind = 'active'; label = s.status; }
    const desc = step && step.querySelector('.tw-ver-step-desc');
    const text = s.state === 'na' ? 'You don\'t need a work permit for most jobs. An employer can still ask for one; you can add it here.'
      : s.state === 'done' ? 'Your work permit is on file, so jobs that need a permit are open to you.'
      : s.state === 'waiting' ? s.detail
      : !open3 && s.state === 'todo' ? 'You need a work permit at your age in your state. You can add it after your linked parent agrees (step 2).'
      : (s.detail || s.status);
    if (desc && desc.textContent !== text) desc.textContent = text;
    // A locked Work Permit badge isn't a problem when no permit is needed: say so under the badges.
    const row = $('tw-ver-badge-row');
    if (row) {
      let cap = $('tw53-badge-cap');
      if (!cap) { cap = document.createElement('p'); cap.id = 'tw53-badge-cap'; cap.className = 'tw53-badge-cap'; row.after(cap); }
      const c = s.state === 'na' ? '🔒 means not earned yet. At ' + s.age + ' in ' + s.place + ' you don\'t need the Work Permit badge, unless an employer asks for a permit.'
        : '🔒 means not earned yet. Profile details are self-reported; TeenWork does not check ID or run background checks.';
      if (cap.textContent !== c) cap.textContent = c;
    }
    return { kind, label };
  };

  /* ══ 8. PROFILE PHOTO: DEFAULT AVATAR ═══════════════════════════════ */
  function drawAvatar() {
    const el = $('tw53-avatar'), u = me();
    if (!el || !u) return;
    const parts = String(u.name || '').trim().split(/\s+/).filter(Boolean);
    const ini = ((parts[0] || '')[0] || '') + ((parts.length > 1 ? parts[parts.length - 1] : '')[0] || '');
    const t = ini.toUpperCase() || '🙂';
    if (el.textContent !== t) el.textContent = t;
  }

  /* ══ 10. HOME PAGE: DEMOS IN THE FIRST PHONE SCREEN ═════════════════ */
  const phone = window.matchMedia ? window.matchMedia('(max-width: 600px)') : { matches: false };
  function placeDemos() {
    const trust = $('tw51-trust'), demo = $('tw48-demo');
    if (!trust || !demo) return;
    if (phone.matches) { if (demo.nextElementSibling !== trust) demo.after(trust); }
    else if (trust.nextElementSibling !== demo) demo.before(trust);
  }
  placeDemos();
  try { phone.addEventListener('change', placeDemos); } catch (e) { try { phone.addListener(placeDemos); } catch (x) {} }

  /* ══ wiring ═════════════════════════════════════════════════════════ */
  let queued = false;
  function tick() {
    queued = false;
    try { setupMessages(); } catch (e) { console.warn('onboarding-v53 messages', e); }
    try { drawNextSteps(); } catch (e) { console.warn('onboarding-v53 next steps', e); }
    try { markStartLesson(); } catch (e) {}
    try { drawAvatar(); } catch (e) {}
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  function watch() {
    ['browse-jobs-list', 'lessons-grid'].forEach(id => { const el = $(id); if (el && !el.__tw53w) { el.__tw53w = true; new MutationObserver(schedule).observe(el, { childList: true }); } });
    ['ttab-browse', 'ttab-resume', 'ttab-lessons', 'page-teen'].forEach(id => { const el = $(id); if (el && !el.__tw53c) { el.__tw53c = true; new MutationObserver(schedule).observe(el, { attributes: true, attributeFilter: ['class'] }); } });
    tick();
  }
  document.addEventListener('change', e => { if (e.target && /^ctrl-(inapp|email)-match$/.test(e.target.id || '')) schedule(); }, true);
  // launchDashboard is wrapped by featpack-v39-cloud-js and must not be wrapped after it; watching the page class is enough.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window._twOnboardingV53 = { drawNextSteps, setupMessages, markStartLesson, placeDemos, profile, gates };
})();
