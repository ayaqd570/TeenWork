
// Ensure openMobileMoreDrawer always uses the new clean drawer
window.openMobileMoreDrawer = function() {
  const role = window.currentUser?.type || 'teen';
  // Remove any stale old drawer
  document.getElementById('mobile-more-drawer')?.remove();
  document.getElementById('mobile-more-scrim')?.remove();
  // Fire new drawer (defined in nav patch above)
  if (window._openMoreDrawer) { window._openMoreDrawer(role); return; }
  // Fallback: find via the IIFE's closure through the exposed helper
  const navBtn = document.querySelector('#mnavInner .mnav-btn:last-child');
  if (navBtn) { navBtn.click(); }
};
// Expose inner openMoreDrawer so the override above can call it
// (The IIFE already set window.openMobileMoreDrawer = openMoreDrawer wrapper,
//  but we need the direct reference for the override to use)
(function patchMoreRef() {
  // Re-hook: the IIFE at the bottom set openMobileMoreDrawer already;
  // we just need to make the More button in the bottom nav call the right fn.
  // The nav IIFE's buildBottomNav wires btn.onclick = () => openMoreDrawer(role)
  // which is captured in closure — that's correct and works.
  // This script just ensures any external call to openMobileMoreDrawer also works.
  const _newDrawer = window.openMobileMoreDrawer;
  window.openMobileMoreDrawer = function() {
    document.getElementById('mobile-more-drawer')?.remove();
    document.getElementById('mobile-more-scrim')?.remove();
    const role = window.currentUser?.type || 'teen';
    // Trigger the More button click in the rebuilt nav
    const inner = document.getElementById('mnavInner');
    if (inner) {
      const btns = inner.querySelectorAll('.mnav-btn');
      const moreBtn = Array.from(btns).find(b => b.textContent.includes('More'));
      if (moreBtn) { moreBtn.click(); return; }
    }
    if (_newDrawer) _newDrawer();
  };
})();
