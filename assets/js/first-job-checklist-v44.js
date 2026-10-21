
/* ═══════════════════════════════════════════════════════════════════
   v44 · FIRST JOB CHECKLIST SHOWS ITS ITEMS  (2026-10-16, Aya's report)
   Bug: 🎯 First Job showed "0 / 18 done" and the progress bar but no
   checklist items. The items are drawn by renderFirstJobChecklist(),
   which only ran from a switchDashTab() wrapper; the later navfix-js
   block replaces window.switchDashTab outright, so it never ran.
   Fix: watch the panel and draw it whenever it becomes the open section,
   whatever opened it (clean menu, old tab strip, app tour, a link).
   Checks are saved to the account (see the getChecked/saveChecked edit
   in "FIRST JOB GUIDED CHECKLIST": _DB row "first_job_checklist"), so
   they come back on any device; when the cloud copy arrives after
   sign-in, an open checklist is redrawn with it.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twFirstJobV44) return;
  window.__twFirstJobV44 = true;

  const ID = 'ttab-firstjob';
  const isOn = cls => /(^|\s)active(\s|$)/.test(cls || '');
  function draw() {
    const panel = document.getElementById(ID);
    if (!panel || !panel.classList.contains('active')) return;
    try { if (typeof window.renderFirstJobChecklist === 'function') window.renderFirstJobChecklist(); }
    catch (e) { console.warn('first-job-checklist-v44', e); }
  }

  function start() {
    const panel = document.getElementById(ID);
    if (!panel) return;
    let queued = false;
    // the panel "opens" when its class goes from not-active to active (re-picking the open tab redraws it too)
    new MutationObserver(records => {
      if (queued || !panel.classList.contains('active')) return;
      if (records.some(r => !isOn(r.oldValue))) { queued = true; setTimeout(() => { queued = false; draw(); }, 0); }
    }).observe(panel, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // the account's saved checks are pulled from the cloud after the dashboard opens
  const _oSync = window._syncUserData;
  if (typeof _oSync === 'function') {
    window._syncUserData = async function () {
      const r = await _oSync.apply(this, arguments);
      draw();
      return r;
    };
  }

  window._twFirstJob = { draw };
})();
