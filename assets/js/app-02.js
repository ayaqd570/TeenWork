
// PAGE GUARD — runs synchronously before any HTML renders
// Ensures only .page.active is visible regardless of JS errors elsewhere
(function(){
  // Re-enforce page visibility after DOM is ready
  function enforcePage() {
    var pages = document.querySelectorAll('.page');
    var hasActive = false;
    pages.forEach(function(p){ if(p.classList.contains('active')) hasActive = true; });
    if (!hasActive) {
      // Nothing active — show landing
      var landing = document.getElementById('page-landing');
      if (landing) landing.classList.add('active');
    }
  }
  // Run immediately after DOM parse
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforcePage);
  } else {
    enforcePage();
  }
})();
