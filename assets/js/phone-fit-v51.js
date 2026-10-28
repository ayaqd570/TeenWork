/* v51: welcome messages show as a notice at the top of the dashboard instead of a floating toast.
   The toast sat right above the bottom nav and covered the Parent metrics and the Employer job form.
   Every other message still uses showToast() and #global-toast unchanged. */
(function () {
  'use strict';
  let demoUntil = 0, pending = [], tries = 0, timer = 0;

  // The "Welcome to the … Demo!" toasts, "Parent linked! Welcome to TeenWork!", and the demo note that
  // homepage-trust-v48 shows 1.6 s after a demo starts.
  function isWelcome(msg, type) {
    if (type === 'error') return false;
    const t = String(msg || '');
    return /\bwelcome\b/i.test(t) || (Date.now() < demoUntil && /\b(demo|sample)\b/i.test(t));
  }
  function activeDash() {
    const page = document.querySelector('.page.active');
    return page && page.querySelector('.dashboard');
  }
  function removeNotes() { document.querySelectorAll('.tw-welcome-note').forEach(n => n.remove()); }

  function place() {
    timer = 0;
    const dash = activeDash();
    if (!dash) {
      // No dashboard on screen yet (it may still be opening). Give up after ~2 s and use the normal toast.
      if (++tries < 8) { timer = setTimeout(place, 250); return; }
      const left = pending; pending = [];
      left.forEach(m => original(m.msg, m.type));
      return;
    }
    // The demo banner already says the data is made up; a second copy of that only adds clutter.
    const hasBanner = !!dash.querySelector('#tw48-demo-banner');
    const msgs = pending.splice(0).map(m => m.msg).filter(t => !hasBanner || /\bwelcome\b/i.test(t));
    if (!msgs.length) return;
    let note = dash.querySelector(':scope > .tw-welcome-note');
    if (!note) {
      removeNotes();
      note = document.createElement('div');
      note.className = 'tw-welcome-note';
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = '×';
      close.setAttribute('aria-label', 'Dismiss welcome message');
      close.onclick = () => note.remove();
      note.append(close);
      const head = dash.querySelector(':scope > .dash-header');
      dash.insertBefore(note, head || dash.firstChild);
    }
    msgs.forEach(t => {
      if ([...note.querySelectorAll('p')].some(p => p.textContent === t)) return;
      const p = document.createElement('p'); p.textContent = t;
      note.insertBefore(p, note.lastElementChild);
      announce(t);
    });
  }
  // A status region that is already on the page, so screen readers read the welcome out like the toast was.
  function announce(t) {
    let live = document.getElementById('tw-welcome-live');
    if (!live) {
      live = document.createElement('div'); live.id = 'tw-welcome-live'; live.setAttribute('role', 'status');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      document.body.append(live);
    }
    live.textContent = '';
    setTimeout(() => { live.textContent = t; }, 50);
  }

  let original = window.showToast;
  function install() {
    const cur = window.showToast;
    if (typeof cur !== 'function' || cur.__twWelcome) return;
    original = cur;
    const w = function (msg, type) {
      if (!isWelcome(msg, type)) return original.apply(this, arguments);
      pending.push({ msg: String(msg), type });
      tries = 0;
      if (!timer) timer = setTimeout(place, 0);
    };
    w.__twWelcome = true;
    window.showToast = w;
  }
  function wrapDemo() {
    const orig = window._directDemo;
    if (typeof orig !== 'function' || orig.__twWelcome) return;
    const w = function () { demoUntil = Date.now() + 4000; return orig.apply(this, arguments); };
    w.__twWelcome = true;
    window._directDemo = w;
  }

  install(); wrapDemo();
  document.addEventListener('DOMContentLoaded', () => { install(); wrapDemo(); if (document.body) announce(''); });
  // Changing tab or page means the welcome has been seen.
  document.addEventListener('click', e => {
    if (e.target.closest('.tw-welcome-note')) return;
    if (e.target.closest('[onclick*="switch"],[onclick*="gotoPage"],[onclick*="signOut"],.mobile-nav button,#twm-bottom button,.pdtab')) setTimeout(removeNotes, 0);
  }, true);
})();
