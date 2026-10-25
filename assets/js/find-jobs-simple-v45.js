
/* ═══════════════════════════════════════════════════════
   find-jobs-simple-v45 — Find Jobs is just the job list
   Aya (2026-10-16): "keep find job to just lists of jobs so its easier to use, less stats
   there, move them".
   • Find Jobs (#ttab-browse) keeps only the Available Jobs panel: filters, state rules
     and the job list. A small "🤖 AI picks" button in its header opens the AI matches.
   • Everything else is moved, not deleted. The elements keep their ids, so the code that
     fills them (stat cards, savings banner, points & badges, AI matches) still works:
       - Profile completion, the four stat cards (Jobs near you, Applied, Accepted,
         Earned) and the savings goal banner → "📊 My Progress" at the top of
         Profile & Settings (#ttab-resume), under the parent link card.
       - Points, tier and "Badges to earn" (#teen-game-panel) → top of Badges.
       - 🤖 Smart Job Recommendations → top of AI Coach (#ttab-ai).
   • Phones (768px and narrower): the filter bar shows Type, Min pay and City, plus a
     "More filters" button for State, Transport, Radius and Badge, so the jobs start
     higher up the screen. Computers still show every filter.
   • Anything later scripts drop into Find Jobs (the profile completion bar is added late)
     is moved as soon as it appears, via a MutationObserver on #ttab-browse.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twFindJobsSimpleV45) return;
  window.__twFindJobsSimpleV45 = true;

  var $ = function (id) { return document.getElementById(id); };

  var css = document.createElement('style');
  css.id = 'find-jobs-simple-v45-css';
  css.textContent =
    '#fjs-progress{margin-bottom:1.2rem}' +
    '#fjs-progress .fjs-title{font-family:"DM Sans",sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 .6rem}' +
    '#fjs-progress .stats-row{margin-bottom:1rem}' +
    '#fjs-progress #teen-profile-completion{margin-bottom:1rem}' +
    '#fjs-progress #teen-savings-banner{margin-bottom:0}' +
    '.fjs-head-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}' +
    '#fjs-ai-picks{font-size:.75rem;white-space:nowrap}' +
    '.fjs-more{display:none;align-items:center;gap:4px;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--green);font-family:"DM Sans",sans-serif;font-size:.83rem;font-weight:700;cursor:pointer}' +
    '@media (max-width:768px){' +
      '#ttab-browse .filters-bar .fjs-more{display:inline-flex}' +
      '#ttab-browse .filters-bar:not(.fjs-open) .fjs-extra{display:none!important}' +
    '}' +
    '.fjs-flash{animation:fjsFlash 1.6s ease}' +
    '@keyframes fjsFlash{0%,40%{box-shadow:0 0 0 4px var(--green-light)}100%{box-shadow:none}}';
  document.head.appendChild(css);

  // "📊 My Progress" box in Profile & Settings, right under the parent link card.
  function progressBox() {
    var box = $('fjs-progress');
    var tab = $('ttab-resume');
    if (!tab) return null;
    if (!box) {
      box = document.createElement('div');
      box.id = 'fjs-progress';
      box.innerHTML = '<div class="fjs-title">📊 My Progress</div>';
    }
    var link = $('tw-link-card');
    if (link && link.parentNode === tab) { if (link.nextSibling !== box) link.after(box); }
    else if (box.parentNode !== tab) tab.insertBefore(box, tab.firstChild);
    return box;
  }

  // Keep the three progress pieces in a fixed order inside the box.
  function addToProgress(el) {
    var box = progressBox();
    if (!box || !el) return;
    var order = ['teen-profile-completion', 'fjs-stats', 'teen-savings-banner'];
    var key = el.id || (el.classList.contains('stats-row') ? 'fjs-stats' : '');
    if (key === 'fjs-stats') el.dataset.fjs = 'stats';
    var mine = order.indexOf(key);
    var before = null;
    [].slice.call(box.children).some(function (c) {
      var k = c.id || (c.dataset.fjs === 'stats' ? 'fjs-stats' : '');
      if (order.indexOf(k) > mine) { before = c; return true; }
      return false;
    });
    box.insertBefore(el, before);
  }

  function moveGamePanel(el) {
    var tab = $('ttab-badges');
    if (!tab || !el) return;
    var first = tab.firstElementChild;
    // The Badges tab starts with a title line (not a panel); the points card goes under it.
    if (first && !first.classList.contains('panel') && first !== el) first.after(el);
    else tab.insertBefore(el, tab.firstChild);
  }

  function moveAiPicks(el) {
    var tab = $('ttab-ai');
    if (!tab || !el) return;
    el.id = el.id || 'fjs-ai-picks-panel';
    var after = $('v18-ai-banner') || $('wage-coach-btn');
    if (after && after.parentNode === tab) after.after(el);
    else tab.insertBefore(el, tab.firstChild);
  }

  function jobsPanel() {
    var list = $('browse-jobs-list');
    return list ? list.closest('.panel') : null;
  }

  function openAiPicks() {
    try { window.switchDashTab(null, 'ttab-ai'); } catch (e) {}
    setTimeout(function () {
      var p = $('ai-match-panel'), panel = p && p.closest('.panel');
      if (!panel) return;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panel.classList.remove('fjs-flash'); void panel.offsetWidth; panel.classList.add('fjs-flash');
    }, 150);
  }
  window.twOpenAiPicks = openAiPicks;

  function addAiPicksButton() {
    var panel = jobsPanel();
    var head = panel && panel.querySelector('.panel-head');
    if (!head || $('fjs-ai-picks')) return;
    var right = document.createElement('div');
    right.className = 'fjs-head-right';
    var badge = head.querySelector('.badge');
    var btn = document.createElement('button');
    btn.id = 'fjs-ai-picks';
    btn.type = 'button';
    btn.className = 'btn-sm btn-ai';
    btn.textContent = '🤖 AI picks';
    btn.title = 'See jobs the AI picked for you (in AI Coach)';
    btn.addEventListener('click', openAiPicks);
    right.appendChild(btn);
    if (badge) right.appendChild(badge);   // the "N Open" count stays in this header
    head.appendChild(right);
  }

  // Phones: tuck the less-used filters behind "More filters" (CSS above only hides them at 768px and narrower).
  function compactFilters() {
    var panel = jobsPanel();
    var bar = panel && panel.querySelector('.filters-bar');
    if (!bar || $('fjs-more-filters')) return;
    ['teen-filter-state', 'teen-filter-transport', 'teen-filter-radius', 'teen-filter-badge'].forEach(function (id) {
      var item = $(id);
      while (item && item.parentNode !== bar) item = item.parentNode;   // the radius slider sits in its own row div
      if (item) item.classList.add('fjs-extra');
    });
    var btn = document.createElement('button');
    btn.id = 'fjs-more-filters';
    btn.type = 'button';
    btn.className = 'fjs-more';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'More filters ▾';
    btn.addEventListener('click', function () {
      var open = bar.classList.toggle('fjs-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Fewer filters ▴' : 'More filters ▾';
    });
    bar.appendChild(btn);
  }

  var busy = false;
  function tidy() {
    var browse = $('ttab-browse');
    if (!browse || busy) return;
    busy = true;
    try {
      var keep = jobsPanel();
      [].slice.call(browse.children).forEach(function (el) {
        if (el === keep) return;
        if (el.id === 'teen-profile-completion' || el.id === 'teen-savings-banner' || el.classList.contains('stats-row')) addToProgress(el);
        else if (el.id === 'teen-game-panel') moveGamePanel(el);
        else if (el.querySelector && el.querySelector('#ai-match-panel')) moveAiPicks(el);
      });
      if ($('fjs-progress')) progressBox();   // stays under the link card if that card shows up later
      addAiPicksButton();
      compactFilters();
    } finally { busy = false; }
  }
  window.twFindJobsTidy = tidy;

  tidy();
  var browse = $('ttab-browse');
  if (browse && window.MutationObserver) new MutationObserver(tidy).observe(browse, { childList: true });
  var resume = $('ttab-resume');
  if (resume && window.MutationObserver) new MutationObserver(function () {
    var box = $('fjs-progress'), link = $('tw-link-card');
    if (box && link && link.parentNode === resume && link.nextSibling !== box) progressBox();
  }).observe(resume, { childList: true });
  document.addEventListener('DOMContentLoaded', tidy);
  window.addEventListener('load', tidy);
})();
