/* v54 polish pass (2026-11-07, Aya: "make it ready for production … make it nice").
   Small page-level touches that belong to no single feature:
   • body.tw54-pricing while the plans page is open (polish-v54.css hides the floating buttons there).
   • The one "Add to home screen" offer (featpack-js twOfferInstall) a little after a real member's
     dashboard opens, never on the home, sign-up or demo screens. */
(function () {
  'use strict';
  if (window.__tw54Polish) return;
  window.__tw54Polish = true;

  function syncPage() {
    var act = document.querySelector('.page.active');
    document.body.classList.toggle('tw54-pricing', !!(act && act.id === 'page-pricing'));
  }

  var offerTimer = 0;
  function wrapLaunch() {
    var orig = window.launchDashboard;
    if (typeof orig !== 'function' || orig.__tw54Polish) return;
    var w = function () {
      var out = orig.apply(this, arguments);
      clearTimeout(offerTimer);
      offerTimer = setTimeout(function () { try { if (window.twOfferInstall) window.twOfferInstall(); } catch (e) {} }, 8000);
      return out;
    };
    Object.keys(orig).forEach(function (k) { try { w[k] = orig[k]; } catch (e) {} });
    w.__tw54Polish = true;
    window.launchDashboard = w;
  }

  function start() {
    wrapLaunch(); syncPage();
    // other scripts re-wrap launchDashboard after load; wrap again once they are done
    setTimeout(function () { wrapLaunch(); syncPage(); }, 1800);
    var mo = new MutationObserver(syncPage);
    Array.prototype.forEach.call(document.querySelectorAll('.page'), function (el) { mo.observe(el, { attributes: true, attributeFilter: ['class'] }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
