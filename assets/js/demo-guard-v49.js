/* demo-guard-v49 (2026-10-19): while a demo is open (window.__twDemoSandbox, set by demo-sandbox-v49
   further down), nothing leaves this browser for Supabase or EmailJS. It sits before the Supabase and
   EmailJS libraries load, so their own network calls go through this check too. The one exception is
   the demo's AI answers (the groq-chat function), which demo-sandbox-v49 limits to a few a day. */
(function () {
  if (window.__twDemoGuard) return;
  window.__twDemoGuard = true;
  var BLOCK = /\.supabase\.co\/(rest|auth|storage|realtime|graphql)\/|\.supabase\.co\/functions\/v1\/(?!groq-chat\b)|api\.emailjs\.com/i;
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
