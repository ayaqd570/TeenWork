/* ══════════════════════════════════════════════════════════════════════
   FIRST SCREEN  (v59, 2026-11-15, from a review Aya pasted: "on a laptop
   screen the headline and Sign Up button sit about two screens down",
   "Everything is one huge page … will slow down phones")

   Loads in <head>, before everything else, and does two small things:

   1. Taps that come too early are kept. The home page shows up long before
      the app's scripts have finished loading on a slow phone (about 6 s on
      a throttled phone test). Until then, Sign Up, Sign In, the demo
      buttons and "For employers" did nothing at all, because the code
      behind them wasn't there yet. Now a tap on a home page button while
      the page is still loading is remembered (the button dims), and it runs
      as soon as the app is ready. Once the page has loaded this does
      nothing.

   2. The short line next to the logo in the top bar (#tw59-tag, computers
      only) fades out while the real headline under the picture is on the
      screen, so the same words never show twice at once.

   The hero picture is not touched: it stays big, whole and first
   (Aya, Oct 30–31).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twFirstScreenV59) return;
  window.__twFirstScreenV59 = true;

  /* ── 1. keep early taps ─────────────────────────────────────────── */
  var pending = null;
  function unmark(el) { if (el) { el.classList.remove('tw59-wait'); el.removeAttribute('aria-busy'); } }
  document.addEventListener('click', function (e) {
    if (document.readyState !== 'loading') return;          // the app's scripts have all run
    var t = e.target && e.target.closest ? e.target.closest('#page-landing button, #page-landing a[onclick]') : null;
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (pending !== t) unmark(pending);
    pending = t;
    t.classList.add('tw59-wait');
    t.setAttribute('aria-busy', 'true');
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    // after the app's own start-up code (which also runs on DOMContentLoaded)
    setTimeout(function () {
      var t = pending; pending = null;
      if (!t) return;
      unmark(t);
      if (document.contains(t) && t.getClientRects().length) t.click();
    }, 60);
  });

  /* ── 2. top-bar line hides while the headline is on screen ──────── */
  function watchHeadline() {
    var tag = document.getElementById('tw59-tag'), h1 = document.getElementById('tw48-h1');
    if (!tag || !h1) return false;
    if (!('IntersectionObserver' in window)) return true;
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      tag.classList.toggle('tw59-quiet', !!(e && e.isIntersecting));
    }, { rootMargin: '-58px 0px 0px 0px' }).observe(h1);
    return true;
  }
  if (!watchHeadline()) {
    var tries = 0, timer = setInterval(function () {
      if (watchHeadline() || ++tries > 200) clearInterval(timer);
    }, 50);
  }
})();
