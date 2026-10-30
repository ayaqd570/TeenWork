/* ═══════════════════════════════════════════════════════════════════
   v51 · HOME SCREEN  (Build Brief step 2, 2026-10-30)
   The picture stays on top, uncropped, with the title and buttons under it
   (Aya, Oct 30). This file only adds what the brief asks for around them:
   • H6  "For employers" in the top bar and the footer: scrolls to the
         employer card in How it works. Schools moved to the footer.
   • H13 Reviews show only once REVIEWS_FROM real, shared reviews exist.
         The old "Loved by…" / "What the community says" blocks never show.
   • H14 "Where TeenWork is today" (coverage, live numbers, reviews) shows
         only once STATS_FROM_JOBS open jobs exist. The About story stays.
   • H15 The Pro banner has a × button; "Show Pro info" in the footer
         brings it back. The choice is remembered on this device.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twHomeV51) return;
  window.__twHomeV51 = true;

  const STATS_FROM_JOBS = 10;   // open jobs before "Where TeenWork is today" shows (the brief suggests 10)
  const REVIEWS_FROM = 3;       // real, shared reviews before the reviews card shows
  const PRO_KEY = 'tw_pro_banner_hidden';
  const $ = id => document.getElementById(id);
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── H6: For employers ──────────────────────────────────────────── */
  window.twGoEmployers = function () {
    const landing = $('page-landing');
    if (landing && !landing.classList.contains('active')) { try { gotoPage('landing'); } catch (e) {} }
    const card = $('tw-for-employers');
    if (!card) return;
    setTimeout(() => {
      card.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
      try { card.focus({ preventScroll: true }); } catch (e) {}
      card.classList.add('tw51-flash');
      setTimeout(() => card.classList.remove('tw51-flash'), 1800);
    }, 0);
  };

  /* ── H15: Pro banner out of the way ─────────────────────────────── */
  let proHiddenMem = false;   // used when this browser won't store anything
  function proHidden() { try { return localStorage.getItem(PRO_KEY) === '1'; } catch (e) { return proHiddenMem; } }
  function setProHidden(v) {
    proHiddenMem = v;
    try { if (v) localStorage.setItem(PRO_KEY, '1'); else localStorage.removeItem(PRO_KEY); } catch (e) {}
  }
  function syncPro() {
    const hidden = proHidden();
    const banner = $('tw48-pro'), wrap = $('tw51-pro-show-wrap');
    if (banner) banner.hidden = hidden;
    if (wrap) wrap.hidden = !hidden;
  }
  window.twHideProInfo = function () {
    setProHidden(true); syncPro();
    try { $('tw51-pro-show').focus({ preventScroll: true }); } catch (e) {}
  };
  window.twShowProInfo = function () {
    setProHidden(false); syncPro();
    const banner = $('tw48-pro');
    if (!banner) return;
    banner.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
    try { $('tw51-pro-close').focus({ preventScroll: true }); } catch (e) {}
  };

  /* ── H13 + H14: no empty numbers, no reviews heading without reviews ─ */
  let openJobs = null;
  function syncProof() {
    const proof = $('tw48-proof');
    if (!proof) return;
    const stats = openJobs != null && openJobs >= STATS_FROM_JOBS;
    proof.classList.toggle('tw51-no-stats', !stats);
    proof.setAttribute('aria-label', stats ? 'Where TeenWork is today' : 'About TeenWork');
    const reviews = $('tw48-reviews');
    if (reviews) reviews.hidden = document.querySelectorAll('#tw49-reviews-feed .tw49-review').length < REVIEWS_FROM;
  }
  window.addEventListener('tw-public-counts', e => {
    const c = e.detail;
    if (c && typeof c === 'object') openJobs = Math.max(0, parseInt(c.open_jobs, 10) || 0);
    syncProof();
  });

  function boot() {
    syncPro();
    syncProof();
    const feed = $('tw49-reviews-feed');
    if (feed) new MutationObserver(syncProof).observe(feed, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
