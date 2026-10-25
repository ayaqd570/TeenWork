
/* ══════════════════════════════════════════════════════
   v24 PATCH — All fixes in one clean block
   1. Role-selection buttons — clone+addEventListener fix
   2. Pro "What's included" — injected inside Pro card
   3. Help & Support FAB — bulletproof fallback modal
   4. Rate App FAB — richer deep green
══════════════════════════════════════════════════════ */
(function(){

/* ── 1. ROLE SELECTION — definitive fix ── */
var _origSelectType = (typeof window.selectType === 'function') ? window.selectType : null;
window.selectType = function(type) {
  // Delegate to the original so the script-scoped `let selectedType` / `let parentVerified`
  // (read by doSignup) are actually updated; window.* assignments would not reach them.
  if (_origSelectType) { try { _origSelectType(type); } catch(e) { console.warn('selectType error', e); } }
  document.querySelectorAll('.type-btn').forEach(function(b){ b.classList.remove('selected'); });
  var picked = document.getElementById('type-' + type);
  if (picked) picked.classList.add('selected');
  document.querySelectorAll('.extra-fields').forEach(function(f){ f.classList.remove('show'); });
  var fields = document.getElementById(type + '-fields');
  if (fields) fields.classList.add('show');
  if (type !== 'parent') {
    var pv = document.getElementById('parent-verify-section');
    if (pv) pv.style.display = 'none';
  }
  var alertEl = document.getElementById('su-alert');
  if (alertEl) alertEl.className = 'alert';
};

function _rebindTypeBtns() {
  ['teen','employer','parent'].forEach(function(type) {
    var btn = document.getElementById('type-' + type);
    if (!btn) return;
    var fresh = btn.cloneNode(true);
    fresh.style.cursor = 'pointer';
    (function(t){ fresh.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation(); window.selectType(t);
    }); })(type);
    btn.parentNode.replaceChild(fresh, btn);
  });
}
_rebindTypeBtns();
[300,800,1500,2500].forEach(function(d){ setTimeout(_rebindTypeBtns,d); });

/* Patch gotoPage ONCE — handles rebind + pro info */
(function(){
  var _base = window.gotoPage;
  window.gotoPage = function(page) {
    if (_base) _base.apply(this, arguments);
    if (page === 'signup') {
      setTimeout(_rebindTypeBtns, 200);
      setTimeout(_injectProInfo, 350);
    }
  };
})();

/* ── 2. PRO PLAN — What's included box ── */
function _injectProInfo() {
  var proPrice = document.getElementById('su-plan-pro-price');
  if (!proPrice || document.getElementById('v24-pro-info')) return;
  var box = document.createElement('div');
  box.id = 'v24-pro-info';
  box.style.cssText = 'margin-top:10px;padding:11px 13px;background:linear-gradient(135deg,#f0fdf4,#d8f3dc);border:1.5px solid #52b788;border-radius:10px;font-family:"DM Sans",sans-serif';
  box.innerHTML =
    '<div style="font-size:.76rem;font-weight:800;color:#2d6a4f;margin-bottom:6px;display:flex;align-items:center;gap:6px">' +
    '<span style="background:#2d6a4f;color:#fff;border-radius:5px;padding:1px 7px;font-size:.68rem;letter-spacing:.03em">PRO</span>' +
    'Everything included — <em>free during launch \uD83C\uDF89</em></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:.76rem;color:#1a5c3a;line-height:1.5">' +
    '<div>\u2705 Unlimited AI requests</div><div>\u2705 AI Resume Builder</div>' +
    '<div>\u2705 AI Job Coach (always on)</div><div>\u2705 Pitch AI for applications</div>' +
    '<div>\u2705 Priority job matching</div><div>\u2705 Unlimited applications</div>' +
    '<div>\u2705 AI safety screening</div><div>\u2705 Early feature access</div>' +
    '</div>' +
    '<div style="margin-top:7px;font-size:.71rem;color:#52b788;font-weight:700">\uD83D\uDCA1 Free plan: 5 applications \u0026 10 AI requests/day</div>';
  proPrice.parentNode.insertBefore(box, proPrice.nextSibling);
}
setTimeout(_injectProInfo, 700);

/* ── 3. SUPPORT — always-working fallback modal ── */
window._twOpenSupport = function() {
  /* Skip openSupportModal — it silently fails in some states.
     Go straight to our guaranteed fallback modal. */
  var existing = document.getElementById('tw-sup-fallback');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'tw-sup-fallback';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif';
  ov.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:1.8rem;max-width:460px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.28)">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">' +
    '<div style="width:44px;height:44px;background:#d8f3dc;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">\uD83D\uDCAC</div>' +
    '<div style="flex:1"><div style="font-size:1.05rem;font-weight:800;color:#2d6a4f">Contact Support</div>' +
    '<div style="font-size:.78rem;color:#999;margin-top:2px">We read every message and reply fast</div></div>' +
    '<button id="tw-sc" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#bbb;line-height:1;padding:4px">\u2715</button></div>' +
    '<textarea id="tw-sm" rows="5" placeholder="Describe your issue or question \u2014 we\'ll get back to you soon\u2026" ' +
    'style="width:100%;padding:10px 12px;border:1.5px solid #d8f3dc;border-radius:10px;font-size:.9rem;resize:vertical;outline:none;box-sizing:border-box;font-family:\'DM Sans\',sans-serif;color:#222;line-height:1.5"></textarea>' +
    '<div style="display:flex;gap:8px;margin-top:1rem">' +
    '<button id="tw-ss" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:13px;border-radius:10px;font-size:.92rem;font-weight:800;cursor:pointer">\uD83D\uDCE8 Send to Support</button>' +
    '<button id="tw-sca" style="padding:13px 16px;border-radius:10px;border:1.5px solid #d8f3dc;background:#f8fdf9;font-size:.9rem;cursor:pointer;color:#2d6a4f;font-weight:600">Cancel</button>' +
    '</div>' +
    '<p style="font-size:.72rem;color:#bbb;margin-top:.8rem;text-align:center">Your message goes directly to the TeenWork admin team</p>' +
    '</div>';
  document.body.appendChild(ov);
  function _rm(){ ov.remove(); }
  document.getElementById('tw-sc').onclick = _rm;
  document.getElementById('tw-sca').onclick = _rm;
  document.getElementById('tw-ss').onclick = function(){
    var msg = (document.getElementById('tw-sm') && document.getElementById('tw-sm').value) || '';
    if (typeof _adminSaveSupportMessage === 'function') {
      _adminSaveSupportMessage({ name: (window.currentUser && window.currentUser.name) || 'Anonymous', context: 'General Support', body: msg, email: (window.currentUser && window.currentUser.email) || 'unknown', userType: (window.currentUser && window.currentUser.type) || 'visitor', time: new Date().toISOString() });
    }
    document.getElementById('tw-ss').textContent = '✅ Sent!';
    setTimeout(_rm, 1800);
  };
  ov.addEventListener('click', function(e){ if(e.target===ov) _rm(); });
  var ta = document.getElementById('tw-sm');
  if(ta){ ta.addEventListener('focus',function(){ this.style.borderColor='#2d6a4f'; });
          ta.addEventListener('blur', function(){ this.style.borderColor='#d8f3dc'; }); }
};

function _rewireSupportFAB() {
  var fab = document.getElementById('v17-support-fab');
  if (!fab) return;
  // Never swap the button for a fresh copy while it is being dragged (it would jump back).
  if (fab.classList.contains('dragging') || fab._twDragged || fab.getAttribute('data-tw-grab') === '1') return;

  /* Clone to strip ALL existing listeners and onclick attribute */
  var fresh = fab.cloneNode(false);
  fresh.innerHTML = '\uD83D\uDCAC Help & Support';
  fresh.removeAttribute('onclick');

  /* Track touch start time & position — open only on genuine taps */
  var _touchStartTime = 0;
  var _touchStartX = 0;
  var _touchStartY = 0;

  fresh.addEventListener('touchstart', function(e) {
    _touchStartTime = Date.now();
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  fresh.addEventListener('touchend', function(e) {
    var dt = Date.now() - _touchStartTime;
    var dx = Math.abs(e.changedTouches[0].clientX - _touchStartX);
    var dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
    /* Tap = short duration (<250ms) and tiny movement (<10px) */
    if (dt < 250 && dx < 10 && dy < 10) {
      e.preventDefault(); /* stop ghost click */
      window._twOpenSupport();
    }
  }, { passive: false });

  /* Mouse click fallback for desktop */
  fresh.addEventListener('click', function(e) {
    /* On desktop _twDragged resets synchronously so this is reliable */
    if (!fresh._twDragged) window._twOpenSupport();
  });

  fab.parentNode.replaceChild(fresh, fab);
  /* Re-attach draggable to the new element */
  if (typeof _v17MakeDraggable === 'function') _v17MakeDraggable(fresh);
}
/* Neutralize _v18FixSupportFAB — it runs at 1000ms & 2000ms and stomps our listener
   by rewriting innerHTML. Replace it with a no-op permanently. */
setTimeout(function() {
  window._v18FixSupportFAB = function() { /* neutralized by v24 */ };
}, 50);

/* Run our rewire AFTER _v18FixSupportFAB has been neutralized */
[600, 1300, 2500, 4500].forEach(function(d){ setTimeout(_rewireSupportFAB, d); });

/* ── 4. RATE FAB — deep rich green ── */
function _styleRateFAB() {
  var fab = document.getElementById('v17-rate-fab');
  if (!fab) return;
  fab.style.setProperty('background','linear-gradient(135deg,#1b5e3b,#2e9e65)','important');
  fab.style.setProperty('border','2px solid rgba(255,255,255,0.32)','important');
  fab.style.setProperty('box-shadow','0 4px 18px rgba(27,94,59,0.5)','important');
  fab.style.setProperty('color','#ffffff','important');
  fab.style.setProperty('font-weight','800','important');
}
[500,1800,3200].forEach(function(d){ setTimeout(_styleRateFAB,d); });

})();

/* ── FLOATING BUTTONS vs PICTURES — v37 ──
   Help & Support and Rate App vanish while they are over a picture
   (the home-page hero photo, or any other large image) and come back
   as soon as they are clear of it. Each button is checked on its own,
   so a dragged button hides/shows by where it actually is. */
(function() {
  var FAB_IDS = ['v17-support-fab', 'v16-rate-fab', 'v17-rate-fab', 'v16-support-fab'];
  var MIN_PIC = 60;               // ignore tiny icons/avatars
  var CLASS = 'tw-fab-vanish';

  var st = document.createElement('style');
  st.id = 'tw37-fab-style';
  st.textContent =
    '.' + CLASS + '{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}' +
    '[data-tw-fab="1"]{transition:opacity .15s ease;}';
  document.head.appendChild(st);

  // the old "side buttons on the photo" panel is gone for good
  function killOldPanel() {
    var p = document.getElementById('tw-hero-side-btns'); if (p) p.remove();
    document.querySelectorAll('.tw-fab-hidden').forEach(function (el) { el.classList.remove('tw-fab-hidden'); });
  }

  function shown(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  // The two floating buttons: found by their id OR by their label (the Rate App button has no id).
  // Once found they are tagged, because a hidden button's text can no longer be read.
  var LABEL_RE = /help\s*&\s*support|rate\s*app/i;
  function floatingButtons() {
    var out = [];
    document.querySelectorAll('body > button, body > a').forEach(function (el) {
      var tagged = el.getAttribute('data-tw-fab') === '1';
      if (!tagged && FAB_IDS.indexOf(el.id) === -1 && !LABEL_RE.test(el.textContent || '')) return;
      if (getComputedStyle(el).position !== 'fixed') return;
      el.setAttribute('data-tw-fab', '1');
      out.push(el);
    });
    return out;
  }

  // Pictures currently on screen (the hero photo and any other large image), as viewport rects.
  function pictureRects() {
    var els = [];
    var hero = document.getElementById('tw-hero-outer');
    if (hero) els.push(hero);
    document.querySelectorAll('img').forEach(function (im) { els.push(im); });
    var out = [];
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < MIN_PIC || r.height < MIN_PIC) return;               // hidden page / tiny icon
      if (r.bottom <= 0 || r.top >= window.innerHeight) return;          // off screen
      if (el.closest('.tw-fab-keep')) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
      out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    });
    return out;
  }
  // Would a box at (left, top, w, h) touch a picture? `margin` grows (+) or shrinks (-) the pictures.
  window.__twHitsPicture = function (left, top, w, h, margin) {
    var m = margin || 0;
    return pictureRects().some(function (p) {
      return left < p.right + m && left + w > p.left - m && top < p.bottom + m && top + h > p.top - m;
    });
  };

  function overlaps(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function check() {
    killOldPanel();
    // shrink each picture by 4px so just grazing an edge doesn't make a button blink
    var pics = pictureRects().map(function (p) {
      return { left: p.left + 4, top: p.top + 4, right: p.right - 4, bottom: p.bottom - 4 };
    });
    floatingButtons().forEach(function (fab) {
      var fr = fab.getBoundingClientRect();           // our class keeps layout (visibility, not display)
      if (fr.width === 0 && fr.height === 0) { fab.classList.remove(CLASS); return; }
      var over = pics.some(function (p) { return overlaps(fr, p); });
      if (over) fab.classList.add(CLASS); else fab.classList.remove(CLASS);
    });
  }

  var queued = false;
  function soon() {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; check(); });
  }

  window.addEventListener('scroll', soon, { passive: true, capture: true });
  window.addEventListener('resize', soon, { passive: true });
  window.addEventListener('orientationchange', soon, { passive: true });
  document.addEventListener('pointermove', soon, { passive: true });   // dragging a button
  document.addEventListener('pointerup', soon, { passive: true });
  document.addEventListener('click', function () { setTimeout(soon, 50); setTimeout(soon, 400); }, true);
  window.addEventListener('load', function () { soon(); setTimeout(soon, 500); setTimeout(soon, 1500); });
  setInterval(check, 400);        // catches page changes, late-loading images and re-created buttons
  check();
})();
