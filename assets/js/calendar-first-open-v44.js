
/* ═══════════════════════════════════════════════════════════════════
   v44 · SECTIONS DRAW THE FIRST TIME THEY OPEN  (2026-10-16, Aya's report)
   Bug: the teen 📅 Calendar stayed blank (no month name, no days) until
   ◀ or ▶ was pressed once, and the employer 📅 Schedule week grid, First
   Job checklist, Earnings, Leaderboard, employer Analytics and others
   opened half-empty. Each of those sections drew itself from a
   switchDashTab() wrapper, but the later navfix-js block replaces
   window.switchDashTab outright instead of wrapping it, so none of those
   wrappers run any more.
   Fix: watch each of those sections and draw it whenever it becomes the
   open section, whatever opened it (clean menu, old tab strip, app tour,
   notification link). The draw calls are the ones the lost wrappers made,
   called through window so later overrides (real-data-v43 empty states
   for real accounts) still apply.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twCalFirstOpenV44) return;
  window.__twCalFirstOpenV44 = true;

  const isReal = () => { try { return !!(window._twRealData && window._twRealData.isReal()); } catch (e) { return false; } };
  const call = (name, ...args) => { const f = window[name]; if (typeof f === 'function') f.apply(window, args); };
  const me = () => String((window.currentUser || {}).email || '');
  const empty = (id, text) => { const el = document.getElementById(id); if (el) el.innerHTML = '<p style="color:var(--muted);font-size:.85rem;font-style:italic">' + text + '</p>'; };
  // Earnings and the parent's Savings goals add a sample row when the list is empty and save it,
  // so a real account with nothing logged gets a plain empty message instead.
  const noneYet = list => { try { return !list || !list.length; } catch (e) { return true; } };
  let skillReportFor = null;   // the skill report asks the AI each time, so draw it once per account per visit
  // section id → how to draw it
  const DRAW = {
    // teen
    'ttab-calendar':     () => call('calRender'),               // also draws the earnings bar
    'ttab-applications': () => call('renderWeeklyDigest'),
    'ttab-earnings':     () => {
      if (isReal() && noneYet(typeof earningsLog !== 'undefined' ? earningsLog : null)) return empty('earnings-log', 'No earnings logged yet. Add a job below after you get paid.');
      call('renderEarningsTracker');
    },
    // v45: with tab-refresh-v44 the report redraws on every open (new skills, lessons and hours show up) and
    // {auto: true} reuses its saved AI answer while the progress is the same, so reopening costs no AI request
    'ttab-resume':       () => { if (window._twTabRefresh) return call('renderSkillReport', { auto: true }); if (skillReportFor === me()) return; skillReportFor = me(); call('renderSkillReport'); },
    'ttab-portfolio':    () => call('renderPortfolioTab'),
    'ttab-savings':      () => call('renderSavingsTab'),
    'ttab-worklog':      () => call('renderWorkLogTab'),   // the "No hours logged yet" note is added by the wrapper below (v45)
    'ttab-references':   () => call('renderTeenReferencesTab'),
    'ttab-firstjob':     () => call('renderFirstJobChecklist'),
    'ttab-leaderboard':  () => { if (!isReal()) call('renderLeaderboard'); },   // real-data-v43 draws real accounts' own
    // parent
    'ptab-savings':      () => {
      if (isReal() && noneYet(typeof savingsGoals !== 'undefined' ? savingsGoals : null)) return empty('savings-goals-list', 'No savings goals yet.');
      call('renderSavingsGoals');
    },
    'ptab-trusted':      () => call('renderTrustedEmployers'),
    'ptab-teens':        () => call('renderMultiTeens'),
    // employer
    'etab-schedule':     () => {
      call('renderEmpSchedGrid');
      if (!isReal()) call('_empScanAllMsgsForEdits');            // the demo employer's sample chats can move shifts
    },
    'etab-reviews':      () => { call('renderEmpReviewsTab'); call('renderEndorsementChips'); },
    'etab-analytics':    () => call('renderEmpAnalytics'),
    'etab-profile':      () => call('renderEmpProfileReviews'),
    'etab-bulkmsg':      () => call('empBulkFilter', 'all'),
  };
  // v45: money-hours-v44 redraws the Work Log too, so the friendly empty note is added after every draw
  const _oWorkLog = window.renderWorkLogTab;
  if (typeof _oWorkLog === 'function' && !_oWorkLog.__twEmptyNote) {
    window.renderWorkLogTab = function () {
      const r = _oWorkLog.apply(this, arguments);
      const count = document.getElementById('worklog-session-count');   // "0 sessions" = nothing logged at all (not just filtered out)
      if (count && /^0 sessions$/.test(count.textContent.trim())) empty('worklog-sessions-list', 'No hours logged yet — use the button above to start tracking.');
      return r;
    };
    window.renderWorkLogTab.__twEmptyNote = true;
  }
  const isOn = cls => /(^|\s)active(\s|$)/.test(cls || '');

  function watch(id) {
    const panel = document.getElementById(id);
    if (!panel) return false;
    let queued = false;
    const draw = () => {
      queued = false;
      if (!panel.classList.contains('active')) return;
      try { DRAW[id](); } catch (e) { console.warn('calendar-first-open-v44: ' + id, e); }
    };
    // a section "opens" when its class goes from not-active to active (re-picking the open one redraws it too)
    new MutationObserver(records => {
      if (queued || !panel.classList.contains('active')) return;
      if (records.some(r => !isOn(r.oldValue))) { queued = true; setTimeout(draw, 0); }
    }).observe(panel, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    if (panel.classList.contains('active')) draw();
    return true;
  }

  function start() { Object.keys(DRAW).forEach(watch); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window._twCalFirstOpen = { sections: Object.keys(DRAW), draw: id => DRAW[id] && DRAW[id]() };
})();
