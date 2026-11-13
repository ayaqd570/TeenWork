/* ══════════════════════════════════════════════════════════════════════
   TEENWORK MAILER  (v57, 2026-11-13, Aya: "use resend not emailJS")
   EmailJS is gone. This file takes the place of the EmailJS library the
   page used to load, so the older code that still calls
   emailjs.send(service, template, params) keeps working: every email now
   goes to Resend through the Supabase function send-email
   (window.twSendViaResend in resend-email-v42.js). Nothing is sent from a
   mailbox in the browser any more, and there is no EmailJS key in the page.

   • branded-email-v41.js still wraps send() to put each email in the
     TeenWork design, then hands it to window.twDeliverEmail (Resend).
   • Demos (demo-sandbox-v49.js) still replace send() so a demo sends nothing.
   • send() resolves like the old library ({status:200,…}) and rejects
     {status, text, code}, so the old error handling still fits.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.emailjs && window.emailjs.__twMailer) return;

  function viaResend(params) {
    var deliver = typeof window.twDeliverEmail === 'function' ? window.twDeliverEmail : null;
    if (deliver) return deliver('', '', params || {});
    if (typeof window.twSendViaResend === 'function') return window.twSendViaResend(params || {});
    return Promise.reject({ status: 0, text: 'TeenWork email is still loading. Try again in a moment.', code: 'not_ready' });
  }

  var mailer = {
    init: function () {},
    send: function (service, template, params) { return viaResend(params); },
    sendForm: function () { return Promise.reject({ status: 0, text: 'TeenWork does not send forms by email', code: 'bad_request' }); }
  };
  Object.defineProperty(mailer, '__twMailer', { value: true });
  window.emailjs = mailer;
})();
