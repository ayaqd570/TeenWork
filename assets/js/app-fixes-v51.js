/* ═══════════════════════════════════════════════════════════════════
   v51 · SIGNED-IN APP FIXES  (Build Brief step 2, 2026-10-30)
   • A1  A demo's "starts empty" note never stays on a real account
         (see also homepage-trust-v48, phone-fit-v51, demo-sandbox-v49).
   • A4  With Messages open, one click on a menu item opens that screen.
         The Messages backdrop covers the side and bottom menus, so the
         click used to only close Messages and the next click was needed.
   • A5  "Start your streak!" shows only after a first lesson or job.
   • T7  Any "Loading…" that is still on screen after 8 seconds gets a
         message and a Try again button (the Job Map has its own, in
         job-map-landmarks-v44).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twAppFixesV51) return;
  window.__twAppFixesV51 = true;

  const SLOW_MS = 8000;
  const $ = id => document.getElementById(id);
  const inDemo = () => !!(window._twDemoSandbox && window._twDemoSandbox.active);

  /* ── A1: no demo note on a real account ─────────────────────────── */
  function dropDemoNotes() {
    if (inDemo()) return;
    document.querySelectorAll('.tw-welcome-note').forEach(n => { if (/\bdemo\b/i.test(n.textContent || '')) n.remove(); });
  }

  /* ── A4: Messages backdrop passes menu clicks through ───────────── */
  const MENU_ITEMS = '#twm-side button, #twm-bottom button, .mobile-nav button, .dash-tabs button, .dash-nav button';
  document.addEventListener('click', e => {
    const overlay = $('msgModal');
    if (!overlay || e.target !== overlay || !e.isTrusted || (!e.clientX && !e.clientY)) return;
    const x = e.clientX, y = e.clientY;
    setTimeout(() => {   // after app-04's own backdrop handler has closed Messages
      overlay.classList.remove('open');
      const under = document.elementFromPoint(x, y);
      const item = under && under.closest(MENU_ITEMS);
      if (item) item.click();
    }, 0);
  }, true);

  /* ── A5: streak badge only once there is something to keep going ─ */
  function activity() {
    try { if (typeof userActivity !== 'undefined') return userActivity; } catch (e) {}
    return window.userActivity || null;
  }
  function wrapStreak() {
    const prev = window.renderStreakBadge;
    if (prev && prev.__twV51) return;
    const w = function () {
      const r = typeof prev === 'function' ? prev.apply(this, arguments) : undefined;
      const el = $('teen-streak-badge');
      if (!el) return r;
      const a = activity() || {};
      const streak = Number(a.streak) || 0;
      const started = streak > 0 || (Array.isArray(a.lessonsCompleted) && a.lessonsCompleted.length > 0) ||
        (Array.isArray(a.jobsAccepted) && a.jobsAccepted.length > 0);
      el.hidden = !started;
      if (streak > 0) el.textContent = '⚡ ' + streak + ' day streak';
      return r;
    };
    w.__twV51 = true;
    window.renderStreakBadge = w;
  }

  /* ── T7: nothing spins for more than 8 seconds without a message ─── */
  const LOADING = /^(?:⏳\s*)?Loading\b[^\n]{0,80}$/i;
  const SKIP = 'option, select, button, input, textarea, script, style, .twlm-status';
  const seen = new Map(), done = new WeakSet();
  function visible(el) { return !!(el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
  function placeholders() {
    const out = [];
    const snap = document.evaluate("//body//text()[contains(., 'Loading')]", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < snap.snapshotLength; i++) {
      const el = snap.snapshotItem(i).parentElement;
      if (!el || done.has(el) || el.closest(SKIP)) continue;
      if (LOADING.test((el.textContent || '').trim()) && visible(el)) out.push(el);
    }
    return out;
  }
  function retry(el) {
    const panel = el.closest('[id^="ttab-"], [id^="ptab-"], [id^="etab-"]');
    const btn = panel && (document.querySelector('#twm-side [data-twm="' + panel.id + '"]') ||
      document.querySelector('#twm-bottom [data-twm="' + panel.id + '"]') ||
      document.querySelector('[onclick*="\'' + panel.id + '\'"]'));
    if (btn) { btn.click(); return; }
    const admTab = el.closest('#page-admin, #tw-admin-panel') && document.querySelector('.adm-tab.active');
    if (admTab) { admTab.click(); return; }
    location.reload();
  }
  function scan() {
    const now = Date.now(), live = new Set(placeholders());
    seen.forEach((t, el) => { if (!live.has(el)) seen.delete(el); });
    live.forEach(el => {
      if (!seen.has(el)) { seen.set(el, now); return; }
      if (now - seen.get(el) < SLOW_MS) return;
      seen.delete(el); done.add(el);
      const note = document.createElement('span');
      note.className = 'tw51-slow';
      note.setAttribute('role', 'status');
      note.innerHTML = 'This is taking longer than usual. Check your internet connection, then try again. ';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tw51-retry'; b.textContent = 'Try again';
      b.onclick = () => { note.remove(); done.delete(el); retry(el); };
      note.append(b);
      el.append(' ', note);
    });
    dropDemoNotes();
  }

  const st = document.createElement('style');
  st.id = 'app-fixes-v51-css';
  st.textContent =
    '.tw51-slow{display:block;margin-top:.5rem;font-size:.85rem;line-height:1.5;color:var(--muted)}' +
    '.tw51-retry{margin-left:.4rem;min-height:44px;padding:8px 14px;border:1.5px solid var(--green);border-radius:10px;background:transparent;color:var(--green);font:inherit;font-weight:700;cursor:pointer}' +
    '#teen-streak-badge[hidden]{display:none !important}';
  document.head.appendChild(st);

  function boot() {
    wrapStreak();
    const badge = $('teen-streak-badge');
    if (badge && !(activity() || {}).streak) badge.hidden = true;
    setInterval(scan, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window._twAppFixesV51 = { SLOW_MS, scan };
})();
