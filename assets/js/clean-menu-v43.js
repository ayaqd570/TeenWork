
/* ═══════════════════════════════════════════════════════
   clean-menu-v43 — one clean menu for every dashboard
   • Computers (wider than 768px): a side menu on the left with every section in a few
     labelled groups, and Help, Rate, Tour and Sign out at the bottom.
   • Phones (768px and narrower): a bottom bar with the four main places plus "Menu",
     which slides up the same full list.
   • Admin: the two rows of admin tabs become a grouped side menu (one scrolling row on phones).
   • The dashboard header keeps only the title and the role's own buttons; Tour, Sign out,
     and the floating Help / Rate buttons live in the menu instead.
   The older menus (the grouped tabs that showed up twice, the old bottom bar, the More
   drawers) are hidden while this menu is on, not deleted, so code that still builds them
   keeps working. Opening a section still goes through window.switchDashTab like before.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twCleanMenuV43) return;
  window.__twCleanMenuV43 = true;

  var ROLES = ['teen', 'parent', 'employer'];
  // [section id, icon, label, words the app tour looks for]. 'chat' and 'verify' are not tabs.
  var MENU = {
    teen: {
      name: 'Teen',
      groups: [
        { title: 'Jobs', items: [
          ['ttab-browse', '🔍', 'Find Jobs', 'jobs'],
          ['ttab-map', '🗺️', 'Job Map'],
          ['ttab-applications', '📋', 'Applied'],
          ['ttab-tracker', '📈', 'Tracker'],
          ['chat', '💬', 'Messages', 'chat']] },
        { title: 'Work & Money', items: [
          ['ttab-worklog', '⏱️', 'Work Log', 'work'],
          ['ttab-calendar', '📅', 'Schedule'],
          ['ttab-earnings', '💰', 'Earnings'],
          ['ttab-savings', '🎯', 'Savings']] },
        { title: 'My Profile', items: [
          ['ttab-resume', '👤', 'Profile & Settings', 'account'],
          ['ttab-portfolio', '🗂️', 'Portfolio'],
          ['ttab-references', '🤝', 'References'],
          ['ttab-letters', '📜', 'Rec Letters'],
          ['ttab-badges', '🏅', 'Badges'],
          ['ttab-leaderboard', '🏆', 'Leaderboard'],
          ['verify', '🛡️', 'Verification']] },
        { title: 'Learn & Grow', items: [
          ['ttab-ai', '🤖', 'AI Coach', 'grow'],
          ['ttab-lessons', '📚', 'Lessons'],
          ['ttab-firstjob', '🚀', 'First Job Guide'],
          ['ttab-qa', '🙋', 'Community Q&A'],
          ['ttab-stories', '🌟', 'Success Stories']] }
      ],
      bar: [['ttab-browse', 'Jobs'], ['ttab-worklog', 'Work'], ['chat', 'Chat'], ['ttab-resume', 'Profile']]
    },
    parent: {
      name: 'Parent',
      groups: [
        { title: 'Home', items: [
          ['ptab-overview', '🏠', 'Overview', 'home'],
          ['ptab-approvals', '✅', 'Approvals', 'approve'],
          ['chat', '💬', 'Messages', 'chat']] },
        { title: 'Safety', items: [
          ['ptab-controls', '🛡️', 'Controls', 'safety'],
          ['ptab-notifications', '🔔', 'Alerts'],
          ['ptab-trusted', '🤝', 'Employers saved by you']] },
        { title: 'Family', items: [
          ['ptab-teens', '👨‍👩‍👧', 'My Teens'],
          ['ptab-ratings', '⭐', 'Ratings'],
          ['ptab-weekly', '📬', 'Weekly Summary', 'updates'],
          ['ptab-savings', '🎯', 'Savings Goals']] }
      ],
      bar: [['ptab-overview', 'Home'], ['ptab-approvals', 'Approve'], ['chat', 'Chat'], ['ptab-controls', 'Safety']]
    },
    employer: {
      name: 'Employer',
      groups: [
        { title: 'Hiring', items: [
          ['etab-post', '📝', 'Post a Job', 'post'],
          ['etab-applicants', '👥', 'Applicants', 'hiring'],
          ['etab-active', '📂', 'Active Jobs'],
          ['etab-schedule', '📅', 'Schedule']] },
        { title: 'Messages', items: [
          ['chat', '💬', 'Messages', 'chat'],
          ['etab-bulkmsg', '📣', 'Bulk Message'],
          ['etab-ai', '🤖', 'AI Tools']] },
        { title: 'Your Business', items: [
          ['etab-analytics', '📊', 'Analytics', 'grow'],
          ['etab-reviews', '⭐', 'Reviews'],
          ['etab-letters', '📜', 'Rec Letters'],
          ['etab-bgcheck', '🛡️', 'Verification'],
          ['etab-profile', '🏢', 'Company Profile']] }
      ],
      bar: [['etab-post', 'Post'], ['etab-applicants', 'Hiring'], ['chat', 'Chat'], ['etab-active', 'Jobs']]
    }
  };
  var FOOT = [['help', '❓', 'Help'], ['rate', '⭐', 'Rate app'], ['tour', '🗺️', 'Tour'], ['out', '↩', 'Sign out']];
  // The map, Q&A and stories tabs draw their content when opened (the old grouped tabs did this too).
  var DRAW = {
    'ttab-map': function () { window.renderJobMap && window.renderJobMap('job-map-container'); },
    'ttab-qa': function () { window.renderQA && window.renderQA('qa-board-container'); },
    'ttab-stories': function () { window.renderStories && window.renderStories('stories-container'); }
  };

  var CSS = [
    ':root{--twm-side-w:244px}',
    '@media (max-width:1024px){:root{--twm-side-w:208px}}',
    '#twm-side,#twm-bottom{display:none}',
    '#twm-side,#twm-bottom,#twm-sheet{font-family:"DM Sans",system-ui,sans-serif;-webkit-tap-highlight-color:transparent}',
    // old menus stay in the page but out of sight while this one is on
    'body.twm-on #mobileNav,body.twm-on .page .grp-tabs,body.twm-on .page .subtab-row,body.twm-on #teen-desktop-tabs,body.twm-on #parent-desktop-tabs,body.twm-on #employer-desktop-tabs,body.twm-on #more-drawer,body.twm-on #more-scrim,body.twm-on #mobile-more-drawer,body.twm-on #mobile-more-scrim,body.twm-on .twm-moved,body.twm-on #v17-support-fab,body.twm-on .twm-fab{display:none!important}',
    // header: title first, then the role's own buttons in one tidy row
    'body.twm-on .dash-header{align-items:center;gap:10px 12px;margin-bottom:1.5rem}',
    'body.twm-on .dash-header>.twm-title{order:-1;flex:1 1 260px;min-width:0}',
    'body.twm-on .dash-header>div:not(.twm-title):not(.tw-plan-pill){display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    // side menu (computers)
    '@media (min-width:769px){body.twm-on #twm-side{display:flex}body.twm-on .page.active{padding-left:var(--twm-side-w)}}',
    '#twm-side{position:fixed;top:0;left:0;bottom:0;width:var(--twm-side-w);z-index:150;flex-direction:column;background:var(--card);border-right:1.5px solid var(--border);box-shadow:2px 0 18px rgba(0,0,0,.03)}',
    '.twm-brand{display:flex;align-items:center;gap:8px;padding:20px 18px 12px}',
    '.twm-logo{font-family:"Fraunces",Georgia,serif;font-weight:900;font-size:1.28rem;color:var(--green);line-height:1;white-space:nowrap}',
    '.twm-role{margin-left:auto;font-size:.64rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--green);background:var(--green-pale);padding:3px 8px;border-radius:999px}',
    // soft shadows at the top/bottom edge tell you the list scrolls (pure CSS "scroll shadows")
    '.twm-scroll{flex:1;overflow-y:auto;padding:0 12px 12px;scrollbar-width:thin;background:linear-gradient(var(--card) 30%,transparent) center top/100% 36px no-repeat local,linear-gradient(transparent,var(--card) 70%) center bottom/100% 36px no-repeat local,radial-gradient(farthest-side at 50% 0,rgba(0,0,0,.13),transparent) center top/100% 12px no-repeat scroll,radial-gradient(farthest-side at 50% 100%,rgba(0,0,0,.13),transparent) center bottom/100% 12px no-repeat scroll;background-color:var(--card)}',
    '.twm-sec{font-size:.66rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:14px 10px 5px}',
    '.twm-item{position:relative;display:flex;align-items:center;gap:10px;width:100%;margin:1px 0;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--text);font:600 .88rem/1.25 "DM Sans",system-ui,sans-serif;text-align:left;cursor:pointer;transition:background .15s,color .15s}',
    '.twm-item:hover{background:var(--bg)}',
    '.twm-item:focus-visible,.twm-tab:focus-visible,.twm-x:focus-visible{outline:2px solid var(--green);outline-offset:1px}',
    '.twm-item.on{background:var(--green-pale);color:var(--green);font-weight:700}',
    '.twm-item[hidden]{display:none}',
    '.twm-ic{flex:0 0 22px;text-align:center;font-size:1rem;line-height:1}',
    '.twm-lb{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.twm-foot{display:grid;grid-template-columns:1fr 1fr;gap:2px 4px;border-top:1.5px solid var(--border);padding:8px 12px 14px}',
    '.twm-foot .twm-item,.twm-sheet-foot .twm-item{gap:7px;padding:8px;font-size:.82rem;color:var(--muted)}',
    '.twm-foot .twm-ic,.twm-sheet-foot .twm-ic{flex-basis:18px;font-size:.92rem}',
    '.twm-foot .twm-item:hover{color:var(--green)}',
    '.twm-foot .twm-item[data-twm="out"]:hover,.twm-sheet-foot .twm-item[data-twm="out"]:hover{color:var(--red);background:var(--red-pale)}',
    // bottom bar (phones)
    '@media (max-width:768px){body.twm-on #twm-bottom{display:flex}body.twm-on .dash-header{flex-direction:row;justify-content:flex-start;gap:8px;margin-bottom:1.2rem}body.twm-on .dash-header button{width:auto}body.twm-on .dash-header>.twm-title{flex-basis:100%}}',
    '#twm-bottom{position:fixed;left:0;right:0;bottom:0;z-index:190;justify-content:space-around;gap:2px;padding:6px 6px calc(6px + env(safe-area-inset-bottom));background:var(--green);background:linear-gradient(135deg,var(--green) 0%,color-mix(in srgb,var(--green) 62%,black) 100%);box-shadow:0 -4px 20px rgba(0,0,0,.14)}',
    '.twm-tab{flex:1 1 0;min-width:0;min-height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:5px 2px;border:0;border-radius:12px;background:none;color:rgba(255,255,255,.72);font:700 .66rem/1.1 "DM Sans",system-ui,sans-serif;cursor:pointer}',
    '.twm-tab .twm-ic{flex:none;font-size:1.22rem}',
    '.twm-tab.on{color:#fff;background:rgba(255,255,255,.16)}',
    '.twm-burger{display:inline-flex;flex-direction:column;justify-content:center;gap:3.5px;width:22px;height:20px}',
    '.twm-burger i{display:block;height:2.5px;border-radius:2px;background:currentColor}',
    // full menu sheet (phones)
    '#twm-scrim{position:fixed;inset:0;z-index:9950;background:rgba(0,0,0,.42);opacity:0;transition:opacity .2s}',
    '#twm-sheet:focus{outline:none}',
    '#twm-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9951;display:flex;flex-direction:column;max-height:86vh;max-height:86dvh;background:var(--card);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.22);transform:translateY(100%);transition:transform .24s cubic-bezier(.2,.8,.2,1)}',
    'body.twm-sheet-open #twm-scrim{opacity:1}body.twm-sheet-open #twm-sheet{transform:none}',
    '.twm-sheet-head{position:relative;display:flex;align-items:center;gap:10px;padding:20px 16px 4px 22px}',
    '.twm-sheet-head::before{content:"";position:absolute;top:8px;left:50%;width:38px;height:4px;margin-left:-19px;border-radius:2px;background:var(--border)}',
    '.twm-sheet-title{font-family:"Fraunces",Georgia,serif;font-weight:800;font-size:1.15rem;color:var(--green)}',
    '.twm-x{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:var(--bg);color:var(--muted);font-size:1rem;cursor:pointer}',
    '.twm-sheet-body{overflow-y:auto;padding:0 12px 10px;overscroll-behavior:contain}',
    '.twm-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 6px}',
    '.twm-grid .twm-item{padding:10px;font-size:.87rem;background:var(--bg)}',
    '.twm-grid .twm-item.on{background:var(--green-pale)}',
    '.twm-sheet-foot{display:grid;grid-template-columns:1fr 1fr;gap:2px 6px;padding:8px 12px calc(12px + env(safe-area-inset-bottom));border-top:1.5px solid var(--border)}',
    '@media (min-width:769px){#twm-sheet,#twm-scrim{display:none}}',
    // admin: grouped side menu instead of two rows of tabs
    '#tw-admin-panel.twm-adm .adm-nav{background:var(--green);background:linear-gradient(135deg,var(--green) 0%,color-mix(in srgb,var(--green) 60%,black) 100%)}',
    '#tw-admin-panel.twm-adm .adm-tab.active{background:var(--green);border-color:var(--green);color:#fff}',
    '#tw-admin-panel .twm-adm-sec{display:none}',
    '@media (min-width:769px){',
    '#tw-admin-panel.twm-adm .adm-tabs{position:fixed;left:0;bottom:0;top:var(--twm-adm-top,58px);width:232px;z-index:5;display:block;overflow-y:auto;padding:4px 12px 20px;background:var(--card);border-right:1.5px solid var(--border);border-bottom:0}',
    '#tw-admin-panel.twm-adm .twm-adm-sec{display:block;font:700 .66rem/1 "DM Sans",system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:16px 10px 6px}',
    '#tw-admin-panel.twm-adm .adm-tab{display:flex;align-items:center;gap:8px;width:100%;margin:1px 0;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--text);font-size:.87rem;font-weight:600;text-align:left}',
    '#tw-admin-panel.twm-adm .adm-tab:not(.active):hover{background:var(--bg);color:var(--text)}',
    '#tw-admin-panel.twm-adm .adm-tab.active{background:var(--green-pale);color:var(--green);font-weight:700}',
    '#tw-admin-panel.twm-adm .adm-content{max-width:980px;margin:0 auto 0 232px;padding:24px 32px 48px}',
    '}',
    '@media (max-width:768px){',
    '#tw-admin-panel.twm-adm .adm-tabs{position:sticky;top:var(--twm-adm-top,58px);z-index:6;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:10px 12px;scrollbar-width:none}',
    '#tw-admin-panel.twm-adm .adm-tabs::-webkit-scrollbar{display:none}',
    '#tw-admin-panel.twm-adm .adm-tab{flex:0 0 auto;border-radius:999px;white-space:nowrap}',
    '}'
  ].join('\n');

  function cu() { try { return (typeof currentUser !== 'undefined' && currentUser) || window.currentUser || null; } catch (e) { return window.currentUser || null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return document.getElementById(id); }
  function isOn(el) { return !!el && el.classList.contains('active'); }

  function addStyle() {
    if ($('clean-menu-v43-style')) return;
    var st = document.createElement('style');
    st.id = 'clean-menu-v43-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // Which dashboard is showing: a role page, or the Verification page opened from one.
  function shownRole() {
    var u = cu(), r = u && u.type;
    if (ROLES.indexOf(r) < 0) return null;
    if (isOn($('page-' + r))) return r;
    if (isOn($('page-verify'))) return r;
    return null;
  }
  function activeId(role) {
    if (isOn($('page-verify'))) return 'verify';
    var pg = $('page-' + role); if (!pg) return null;
    var ids = allIds(role);
    for (var i = 0; i < ids.length; i++) { var p = $(ids[i]); if (p && p.classList.contains('active') && pg.contains(p)) return ids[i]; }
    return null;
  }
  function allIds(role) {
    var out = [];
    MENU[role].groups.forEach(function (g) { g.items.forEach(function (it) { if (it[0] !== 'chat' && it[0] !== 'verify') out.push(it[0]); }); });
    return out;
  }
  function findItem(role, id) {
    var hit = null;
    MENU[role].groups.forEach(function (g) { g.items.forEach(function (it) { if (it[0] === id) hit = it; }); });
    return hit;
  }

  function itemHTML(it) {
    return '<button type="button" class="twm-item" data-twm="' + esc(it[0]) + '" data-tour-key="' + esc(it[3] || '') + '">' +
      '<span class="twm-ic" aria-hidden="true">' + it[1] + '</span><span class="twm-lb">' + esc(it[2]) + '</span></button>';
  }
  function groupsHTML(role, grid) {
    return MENU[role].groups.map(function (g) {
      return '<div class="twm-sec">' + esc(g.title) + '</div>' +
        (grid ? '<div class="twm-grid">' : '') + g.items.map(itemHTML).join('') + (grid ? '</div>' : '');
    }).join('');
  }
  function footHTML() { return FOOT.map(itemHTML).join(''); }

  var built = null;
  function build(role) {
    ['twm-side', 'twm-bottom'].forEach(function (id) { var el = $(id); if (el) el.remove(); });
    closeSheet(true);
    var side = document.createElement('div');   // not <nav>: the app's dark mode repaints every <nav>
    side.id = 'twm-side';
    side.setAttribute('role', 'navigation');
    side.setAttribute('aria-label', 'Main menu');
    side.innerHTML =
      '<div class="twm-brand"><span class="twm-logo">🌱 TeenWork</span><span class="twm-role">' + esc(MENU[role].name) + '</span></div>' +
      '<div class="twm-scroll">' + groupsHTML(role, false) + '</div>' +
      '<div class="twm-foot">' + footHTML() + '</div>';
    var bar = document.createElement('div');
    bar.id = 'twm-bottom';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Main menu');
    bar.innerHTML = MENU[role].bar.map(function (b) {
      var it = findItem(role, b[0]) || [b[0], '•', b[1]];
      return '<button type="button" class="twm-tab" data-twm="' + esc(b[0]) + '" data-tour-key="' + esc(it[3] || '') + '">' +
        '<span class="twm-ic" aria-hidden="true">' + it[1] + '</span><span>' + esc(b[1]) + '</span></button>';
    }).join('') +
      '<button type="button" class="twm-tab" data-twm="menu" data-tour-key="more" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="twm-ic twm-burger" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span></button>';
    side.addEventListener('click', onClick);
    bar.addEventListener('click', onClick);
    document.body.appendChild(side);
    document.body.appendChild(bar);
    built = role;
  }

  // ── Sheet with the full list (phones) ──
  var lastFocus = null;
  function openSheet() {
    var role = built; if (!role) return;
    closeSheet(true);
    var scrim = document.createElement('div');
    scrim.id = 'twm-scrim';
    scrim.addEventListener('click', function () { closeSheet(); });
    var sheet = document.createElement('div');
    sheet.id = 'twm-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Menu');
    sheet.tabIndex = -1;
    sheet.innerHTML =
      '<div class="twm-sheet-head"><span class="twm-sheet-title">Menu</span><button type="button" class="twm-x" data-twm="close" aria-label="Close menu">✕</button></div>' +
      '<div class="twm-sheet-body">' + groupsHTML(role, true) + '</div>' +
      '<div class="twm-sheet-foot">' + footHTML() + '</div>';
    sheet.addEventListener('click', onClick);
    document.body.appendChild(scrim);
    document.body.appendChild(sheet);
    lastFocus = document.activeElement;
    paint(role);
    var mb = document.querySelector('#twm-bottom [data-twm="menu"]'); if (mb) mb.setAttribute('aria-expanded', 'true');
    void sheet.offsetHeight;   // let the slide-up transition start from below the screen
    document.body.classList.add('twm-sheet-open');
    try { sheet.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeSheet(instant) {
    var sheet = $('twm-sheet'), scrim = $('twm-scrim');
    document.body.classList.remove('twm-sheet-open');
    var mb = document.querySelector('#twm-bottom [data-twm="menu"]'); if (mb) mb.setAttribute('aria-expanded', 'false');
    if (!sheet && !scrim) return;
    var done = function () { if (sheet) sheet.remove(); if (scrim) scrim.remove(); };
    if (instant) done(); else setTimeout(done, 240);
    if (!instant && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    lastFocus = null;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('twm-sheet')) closeSheet(); });

  // ── Actions ──
  function headerBtn(role, kind) { var pg = $('page-' + role); return pg ? pg.querySelector('.dash-header [data-twm-was="' + kind + '"]') : null; }
  function rateFab() {
    var list = document.querySelectorAll('body > button');
    for (var i = 0; i < list.length; i++) if (/Rate App/.test(list[i].textContent || '')) return list[i];
    return null;
  }
  function act(role, id) {
    if (id === 'menu') { if ($('twm-sheet')) closeSheet(); else openSheet(); return; }
    if (id === 'close') { closeSheet(); return; }
    closeSheet(true);
    if (id === 'chat') { if (typeof window.openMsgModal === 'function') window.openMsgModal(); return; }
    if (id === 'verify') { if (typeof window.showVerifyPage === 'function') window.showVerifyPage(); return; }
    if (id === 'help') {
      if (typeof window.openSupportModal === 'function') window.openSupportModal('General Support', '');
      else if (typeof window._twOpenSupport === 'function') window._twOpenSupport();
      return;
    }
    if (id === 'rate') {
      var f = rateFab();
      if (f) f.click(); else if (typeof window._v17OpenEnhancedRating === 'function') window._v17OpenEnhancedRating();
      return;
    }
    if (id === 'tour') {
      var t = headerBtn(role, 'tour');
      if (typeof window.tourStart === 'function') window.tourStart(true); else if (t) t.click();
      return;
    }
    if (id === 'out') {
      var o = headerBtn(role, 'out');
      if (o) o.click();
      else if (typeof window.signOut === 'function') window.signOut();
      else if (typeof window.doLogout === 'function') window.doLogout();
      return;
    }
    openTab(role, id);
  }
  function openTab(role, id) {
    var pg = $('page-' + role), panel = $(id);
    if (!pg || !panel) return;
    if (!pg.classList.contains('active')) {            // coming back from the Verification page
      document.querySelectorAll('.page.active').forEach(function (p) { p.classList.remove('active'); });
      pg.classList.add('active');
    }
    try { if (typeof window.switchDashTab === 'function') window.switchDashTab(null, id); } catch (e) { console.warn('clean-menu: switchDashTab', e); }
    // Make sure exactly this section shows, even if the older switcher guessed the wrong role.
    allIds(role).forEach(function (pid) { var p = $(pid); if (p && pg.contains(p)) p.classList.toggle('active', pid === id); });
    if (DRAW[id]) setTimeout(function () { try { DRAW[id](); } catch (e) {} }, 60);
    try { window.scrollTo(0, 0); } catch (e) {}
    sync();
  }
  function onClick(e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-twm]') : null;
    if (!b || !built) return;
    e.preventDefault();
    act(built, b.getAttribute('data-twm'));
  }

  // ── Keep the menu in step with the page ──
  function tagHeader(role) {
    var pg = $('page-' + role), h = pg && pg.querySelector('.dash-header');
    if (!h) return;
    var h1 = h.querySelector('h1');
    if (h1 && h1.parentElement && h1.parentElement.parentElement === h) h1.parentElement.classList.add('twm-title');
    h.querySelectorAll('button').forEach(function (b) {
      if (b.hasAttribute('data-twm-was')) return;
      var t = (b.textContent || '').replace(/\s+/g, ' ').trim(), oc = b.getAttribute('onclick') || '';
      var kind = /sign ?out/i.test(t) || /signout|logout/i.test(oc) ? 'out' : (/^(🗺️\s*)?(app )?tour$/i.test(t) || /tourStart/.test(oc) ? 'tour' : '');
      if (kind) { b.setAttribute('data-twm-was', kind); b.classList.add('twm-moved'); }
    });
  }
  function tagFabs() { var f = rateFab(); if (f && !f.classList.contains('twm-fab')) f.classList.add('twm-fab'); }
  function paint(role) {
    var id = activeId(role), barIds = MENU[role].bar.map(function (b) { return b[0]; });
    var sheetOpen = !!$('twm-sheet');
    document.querySelectorAll('#twm-side [data-twm], #twm-sheet [data-twm], #twm-bottom [data-twm]').forEach(function (b) {
      var k = b.getAttribute('data-twm');
      // "Menu" lights up while the sheet is open, or when the open section isn't one of the four bar buttons
      var on = k === 'menu' ? (sheetOpen || (!!id && barIds.indexOf(id) < 0)) : k === id;
      b.classList.toggle('on', on);
      if (on && k !== 'menu') b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      // Hide sections whose screen doesn't exist on this account (map, Q&A and stories come and go).
      if (/^[pte]tab-/.test(k)) b.hidden = !$(k);
    });
  }

  var queued = false;
  function sync() {
    var role = shownRole();
    document.body.classList.toggle('twm-on', !!role);
    if (!role) { closeSheet(true); return; }
    if (built !== role || !$('twm-side') || !$('twm-bottom')) build(role);
    tagHeader(role);
    tagFabs();
    paint(role);
  }
  function later() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { sync(); admSync(); } catch (e) { console.warn('clean-menu:', e); } }, 30); }

  // ── Admin panel: grouped side menu ──
  var ADM_GROUPS = [
    ['Messages', /support|announce|review/i],
    ['People', /account|contact|email rule/i],
    ['App settings', /config|launch|plan/i],
    ['System', /activity|stat|health|security|data/i]
  ];
  var admObserved = null;
  function admSync() {
    var panel = $('tw-admin-panel'); if (!panel) return;
    var tabs = panel.querySelector('.adm-tabs'); if (!tabs) return;
    panel.classList.add('twm-adm');
    var nav = panel.querySelector('.adm-nav');
    if (nav) panel.style.setProperty('--twm-adm-top', nav.offsetHeight + 'px');
    if (admObserved !== tabs) { admObserved = tabs; new MutationObserver(later).observe(tabs, { childList: true }); }
    var buckets = ADM_GROUPS.map(function () { return []; }), other = [];
    tabs.querySelectorAll(':scope > .adm-tab').forEach(function (b) {
      var t = b.textContent || '', i = -1;
      for (var g = 0; g < ADM_GROUPS.length; g++) if (ADM_GROUPS[g][1].test(t)) { i = g; break; }
      (i < 0 ? other : buckets[i]).push(b);
    });
    var labels = {};
    tabs.querySelectorAll(':scope > .twm-adm-sec').forEach(function (l) { labels[l.textContent] = l; });
    function label(name) {
      if (labels[name]) { var l = labels[name]; delete labels[name]; return l; }
      var d = document.createElement('div'); d.className = 'twm-adm-sec'; d.setAttribute('aria-hidden', 'true'); d.textContent = name; return d;
    }
    var want = [];
    buckets.forEach(function (list, i) { if (list.length) { want.push(label(ADM_GROUPS[i][0])); want = want.concat(list); } });
    if (other.length) { want.push(label('More')); want = want.concat(other); }
    Object.keys(labels).forEach(function (k) { labels[k].remove(); });
    var cur = [].slice.call(tabs.children).filter(function (c) { return c.classList.contains('adm-tab') || c.classList.contains('twm-adm-sec'); });
    var same = cur.length === want.length && cur.every(function (c, i) { return c === want[i]; });
    if (!same) want.forEach(function (n) { tabs.appendChild(n); });
    // On phones the tabs are one scrolling row: keep the open one in view.
    var act = tabs.querySelector(':scope > .adm-tab.active');
    if (act && act !== admLastActive && tabs.scrollWidth > tabs.clientWidth + 2) {
      var l = act.getBoundingClientRect().left - tabs.getBoundingClientRect().left + tabs.scrollLeft, r = l + act.offsetWidth;
      if (l < tabs.scrollLeft || r > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = Math.max(0, l - 12);
    }
    admLastActive = act;
  }
  var admLastActive = null;

  function boot() {
    addStyle();
    new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    sync(); admSync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.twCleanMenu = { sync: sync, open: openSheet, close: closeSheet, menu: MENU };
})();
