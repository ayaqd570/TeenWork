
/* ═══════════════════════════════════════════════════════
   v34 — ONE app tour (replaces 3 overlapping intros)
   • Next / Back / Skip tour are always on screen
   • Skip really closes it (and Esc works)
   • Never highlights giant elements; falls back to a centered card
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function cu() { try { return (typeof currentUser !== 'undefined' && currentUser) || window.currentUser || null; } catch (e) { return null; } }

  var STEPS = {
    teen: [
      { icon: '👋', title: 'Welcome to TeenWork!', body: "Here's a quick tour of where everything lives. Use Next to move along, or Skip tour any time." },
      { find: ['Jobs'], icon: '🔍', title: 'Jobs', body: 'Browse real jobs near you, filtered for your age. Tap a job to apply — a parent approves it before anything moves forward.' },
      { find: ['Work'], icon: '💼', title: 'Work', body: 'Your hours log, calendar, applications and earnings all live here.' },
      { find: ['Chat', 'Grow'], icon: '💬', title: 'Chat & Grow', body: 'Message employers safely (a parent can see it), and use lessons and the AI coach to build your skills.' },
      { find: ['Account'], icon: '👤', title: 'Account', body: 'Your profile, badges and settings. A complete profile gets more employers looking at you.' },
      { icon: '🎉', title: "You're all set!", body: 'You can replay this tour any time with the Tour button on your dashboard. Good luck finding your first job! 💚' }
    ],
    parent: [
      { icon: '👪', title: 'Welcome, parent!', body: "This is your oversight center. Here's a quick look at the key places. Use Next, or Skip tour any time." },
      { find: ['Home'], icon: '🏠', title: 'Home', body: "A snapshot of your teen's activity, hours and anything waiting on you." },
      { find: ['Approve', 'Safety'], icon: '✅', title: 'Approvals', body: "When your teen applies for a job it shows up for your OK first. Check the employer's safety report before approving." },
      { find: ['Safety'], icon: '🛡️', title: 'Safety & controls', body: 'Set hour limits, review flagged messages and safety alerts.' },
      { find: ['Chat', 'Updates'], icon: '💬', title: 'Messages & updates', body: 'Read your teen\'s conversations with employers and see the latest updates.' },
      { icon: '✨', title: "You're ready!", body: 'You can replay this tour any time with the App Tour button. TeenWork keeps your teen safe while they build real work experience. 💚' }
    ],
    employer: [
      { icon: '🏢', title: 'Welcome, employer!', body: "Here's a quick tour of your hiring tools. Use Next, or Skip tour any time." },
      { find: ['Post', 'Pipeline'], icon: '📋', title: 'Post a job', body: 'Add the title, pay, schedule and age requirements. Every post is checked for child labor law compliance before it goes live.' },
      { find: ['Hiring', 'Comms'], icon: '👥', title: 'Applicants', body: 'Review teens who applied, see their badges and ratings, and move them through your hiring stages.' },
      { find: ['Chat', 'Comms'], icon: '💬', title: 'Messages', body: 'Message applicants inside the app — no outside contact info needed.' },
      { find: ['Grow'], icon: '📊', title: 'Grow', body: 'Track your hiring results and get tips for attracting great teens.' },
      { icon: '✅', title: 'Ready to hire!', body: 'You can replay this tour any time from your dashboard. Every teen is parent-approved, so you can focus on finding the right fit. 💚' }
    ]
  };

  var state = { steps: [], idx: 0, role: 'teen', open: false };
  var PAD = 8;

  function userKey() {
    var u = cu() || {};
    return 'tw_tour34_' + (u.email || 'guest');
  }
  function isDone() { try { return !!localStorage.getItem(userKey()); } catch (e) { return false; } }

  function removeOld() {
    ['tw-tour-overlay', 'tw-tour-style', 'v14-tour-overlay'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
    var ob = document.getElementById('onboarding-modal'); if (ob) ob.classList.remove('open');
  }

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none';
  }

  // Find a small, visible nav button by its label text (works for phone bottom bar and desktop tabs)
  function findTarget(step) {
    if (!step.find) return null;
    var pool = Array.prototype.slice.call(document.querySelectorAll('[data-tour-key], .mnav-btn, .grp-tab'));   // clean-menu-v43: [data-tour-key] = the new menu
    for (var i = 0; i < step.find.length; i++) {
      var label = step.find[i].toLowerCase();
      for (var j = 0; j < pool.length; j++) {
        var t = ((pool[j].getAttribute('data-tour-key') || '') + ' ' + (pool[j].textContent || '')).toLowerCase();
        if (t.indexOf(label) !== -1 && isVisible(pool[j])) return pool[j];
      }
    }
    return null;
  }

  function injectStyle() {
    if (document.getElementById('tw34-tour-style')) return;
    var st = document.createElement('style');
    st.id = 'tw34-tour-style';
    st.textContent =
      '#tw34-tour{position:fixed;inset:0;z-index:2147483000;font-family:"DM Sans",sans-serif}' +
      '#tw34-scrim{position:absolute;inset:0;background:rgba(0,0,0,.55)}' +
      '#tw34-hole{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.55);pointer-events:none;display:none;transition:all .25s ease}' +
      '#tw34-card{position:fixed;box-sizing:border-box;width:min(330px,calc(100vw - 24px));max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;background:#fff;color:#1c1c1c;border-radius:16px;padding:18px 18px 14px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
      '#tw34-card .tw34-step{font-size:.72rem;font-weight:700;color:#6b7280;letter-spacing:.4px;text-transform:uppercase}' +
      '#tw34-card .tw34-dots{display:flex;gap:5px;margin:6px 0 10px}' +
      '#tw34-card .tw34-dot{width:7px;height:7px;border-radius:50%;background:#d1d5db}' +
      '#tw34-card .tw34-dot.on{background:#2d6a4f}' +
      '#tw34-card h3{margin:0 0 6px;font-size:1.05rem;font-weight:800;color:#1b4332}' +
      '#tw34-card p{margin:0 0 14px;font-size:.9rem;line-height:1.55;color:#4b5563}' +
      '#tw34-card .tw34-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
      '#tw34-card button{font-family:inherit;font-size:.9rem;font-weight:700;border-radius:10px;cursor:pointer;padding:10px 16px;min-height:42px}' +
      '#tw34-card .tw34-next{background:#2d6a4f;color:#fff;border:none;flex:1 1 110px}' +
      '#tw34-card .tw34-back{background:#fff;color:#2d6a4f;border:1.5px solid #2d6a4f}' +
      '#tw34-card .tw34-skip{background:none;border:none;color:#6b7280;font-weight:600;margin-left:auto;text-decoration:underline}';
    document.head.appendChild(st);
  }

  function build() {
    if (document.getElementById('tw34-tour')) return;
    injectStyle();
    var ov = document.createElement('div');
    ov.id = 'tw34-tour';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'App tour');
    ov.innerHTML = '<div id="tw34-scrim"></div><div id="tw34-hole"></div><div id="tw34-card"></div>';
    document.body.appendChild(ov);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

  function place(card, rect) {
    var vw = window.innerWidth, vh = window.innerHeight, m = 12;
    card.style.left = '0px'; card.style.top = '0px';
    var w = card.offsetWidth, h = card.offsetHeight, top, left;
    if (!rect) {
      top = (vh - h) / 2; left = (vw - w) / 2;
    } else {
      var below = vh - (rect.bottom + PAD + 14), above = rect.top - PAD - 14;
      if (below >= h) top = rect.bottom + PAD + 14;
      else if (above >= h) top = rect.top - PAD - 14 - h;
      else top = (rect.top + rect.height / 2 < vh / 2) ? vh - h - m : m;   // park on the far side
      left = rect.left + rect.width / 2 - w / 2;
    }
    card.style.top = clamp(top, m, Math.max(m, vh - h - m)) + 'px';
    card.style.left = clamp(left, m, Math.max(m, vw - w - m)) + 'px';
  }

  function render() {
    var step = state.steps[state.idx];
    if (!step) { finish(); return; }
    var card = document.getElementById('tw34-card');
    var hole = document.getElementById('tw34-hole');
    var scrim = document.getElementById('tw34-scrim');
    if (!card) return;
    var total = state.steps.length, last = state.idx === total - 1;

    var dots = '';
    for (var i = 0; i < total; i++) dots += '<div class="tw34-dot' + (i === state.idx ? ' on' : '') + '"></div>';
    card.innerHTML =
      '<div class="tw34-step">Step ' + (state.idx + 1) + ' of ' + total + '</div>' +
      '<div class="tw34-dots">' + dots + '</div>' +
      '<h3>' + (step.icon || '') + ' ' + step.title + '</h3>' +
      '<p>' + step.body + '</p>' +
      '<div class="tw34-btns">' +
        (state.idx > 0 ? '<button type="button" class="tw34-back" id="tw34-back">← Back</button>' : '') +
        '<button type="button" class="tw34-next" id="tw34-next">' + (last ? '🎉 Done' : 'Next →') + '</button>' +
        (last ? '' : '<button type="button" class="tw34-skip" id="tw34-skip">Skip tour</button>') +
      '</div>';
    var b;
    if ((b = document.getElementById('tw34-next'))) b.onclick = next;
    if ((b = document.getElementById('tw34-back'))) b.onclick = back;
    if ((b = document.getElementById('tw34-skip'))) b.onclick = finish;
    card.scrollTop = 0;

    var el = findTarget(step);
    var rect = null;
    if (el) {
      try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
      var r = el.getBoundingClientRect();
      // only spotlight things that are small enough and on screen
      if (r.width < window.innerWidth * 0.9 && r.height < window.innerHeight * 0.5 &&
          r.bottom > 0 && r.top < window.innerHeight) rect = r;
    }
    if (rect) {
      hole.style.display = 'block';
      hole.style.left = (rect.left - PAD) + 'px'; hole.style.top = (rect.top - PAD) + 'px';
      hole.style.width = (rect.width + PAD * 2) + 'px'; hole.style.height = (rect.height + PAD * 2) + 'px';
      scrim.style.background = 'transparent';
    } else {
      hole.style.display = 'none';
      scrim.style.background = 'rgba(0,0,0,.55)';
    }
    place(card, rect);
    var nb = document.getElementById('tw34-next'); if (nb) nb.focus({ preventScroll: true });
  }

  function next() { state.idx++; if (state.idx >= state.steps.length) { finish(); return; } render(); }
  function back() { if (state.idx > 0) { state.idx--; render(); } }

  function onKey(e) {
    if (!state.open) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  }
  var rzTimer;
  function onResize() { if (!state.open) return; clearTimeout(rzTimer); rzTimer = setTimeout(render, 120); }

  function finish() {
    var role = state.role;
    state.open = false;
    var ov = document.getElementById('tw34-tour'); if (ov) ov.remove();
    var st = document.getElementById('tw34-tour-style'); if (st) st.remove();
    removeOld();
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    try {
      localStorage.setItem(userKey(), '1');
      localStorage.setItem('tw_tour_done_' + role, '1');
      localStorage.setItem('tw_tour_v14_' + ((cu() && cu().email) || 'g'), '1');
      localStorage.setItem('tw_onboarded_' + role, '1');
    } catch (e) {}
    if (window._pendingPushRequest) {
      window._pendingPushRequest = false;
      setTimeout(function () { if (typeof requestPushPermission === 'function') requestPushPermission(); }, 600);
    }
  }

  function start(role) {
    if (state.open) return;
    // Don't put the tour on top of the "Link a parent" screen; it starts once the teen continues.
    var lock = document.getElementById('parent-lock-overlay');
    if (lock && getComputedStyle(lock).display !== 'none') return;
    role = role || (cu() && cu().type) || 'teen';
    if (role === 'admin') return;
    removeOld();
    state.role = role;
    state.steps = STEPS[role] || STEPS.teen;
    state.idx = 0;
    state.open = true;
    build();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    render();
  }

  // Automatic launches (from login) honour "already seen"; the Tour buttons pass true to replay.
  function auto(role) { if (!isDone()) start(role); }

  window.tourStart = function (force) { if (force === true) start(); else auto(); };
  window.startTour = window._startAdvancedTour = function (role) { auto(role); };
  window.tourNext = next;
  window.tourSkip = window.tourDone = window._v14TourEnd = finish;
  window._v14TourStep = function () {};

  // The old welcome pop-up would stack on top of the tour — the tour replaces it.
  window.initOnboarding = function () {};
})();
