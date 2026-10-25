/* demo-guard-v49 (2026-10-19): while a demo is open (window.__twDemoSandbox, set by demo-sandbox-v49
   further down), nothing leaves this browser for Supabase or EmailJS. It loads before the Supabase and
   EmailJS libraries, so their own network calls go through this check too. AI needs a real signed-in
   account since 2026-10-21, so the demo's AI requests (groq-chat) are held back as well. */
(function () {
  if (window.__twDemoGuard) return;
  window.__twDemoGuard = true;
  var BLOCK = /\.supabase\.co\/(rest|auth|storage|realtime|graphql|functions)\/|api\.emailjs\.com/i;
  var on = function () { return !!window.__twDemoSandbox; };
  var urlOf = function (x) { try { return typeof x === 'string' ? x : (x && x.url) || String(x || ''); } catch (e) { return ''; } };
  var f = window.fetch;
  if (typeof f === 'function') {
    window.fetch = function (input) {
      if (on() && BLOCK.test(urlOf(input))) {
        try { return Promise.resolve(new Response(JSON.stringify({ error: 'demo', message: 'The demo does not save or send anything.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })); }
        catch (e) { return Promise.reject(new TypeError('Failed to fetch (demo)')); }
      }
      return f.apply(this, arguments);
    };
  }
  var X = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if (X) {
    var open = X.open, send = X.send;
    X.open = function (m, url) { this.__twUrl = urlOf(url); return open.apply(this, arguments); };
    X.send = function () {
      if (on() && BLOCK.test(this.__twUrl || '')) {
        var x = this;
        setTimeout(function () { try { x.dispatchEvent(new ProgressEvent('error')); } catch (e) {} }, 0);   // the same as a dropped connection
        return;
      }
      return send.apply(this, arguments);
    };
  }
})();
