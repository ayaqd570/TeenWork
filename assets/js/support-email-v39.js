
/* v39 — Help & Support messages are also emailed to the TeenWork support inbox.
   Every message saved to the admin support inbox (Help & Support form, SOS alerts,
   in-app reviews) is also sent through the existing EmailJS template to
   SUPPORT_INBOX_EMAIL. Best-effort: a failed or unconfigured email never blocks
   the person sending the message, and the message is still saved to the inbox. */
(function () {
  var SUPPORT_INBOX_EMAIL = 'aqdteenwork@gmail.com';
  var saveToInbox = window._adminSaveSupportMessage;
  if (typeof saveToInbox !== 'function' || saveToInbox._twEmailsSupport) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function emailSupportMessage(msg) {
    try {
      if (typeof emailjs === 'undefined' || typeof EMAILJS_SERVICE === 'undefined') return;
      if (typeof _emailjsQuotaExceeded !== 'undefined' && _emailjsQuotaExceeded) return;
      var name  = String(msg.name || 'Anonymous');
      var topic = String(msg.context || 'General Support');
      var senderEmail = String(msg.email || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) senderEmail = '';
      var when = msg.time ? new Date(msg.time) : new Date();
      if (isNaN(when.getTime())) when = new Date();
      var html = '<p><b>From:</b> ' + esc(name)
        + (senderEmail ? ' &lt;' + esc(senderEmail) + '&gt;' : ' (no email on file)')
        + (msg.userType ? ' &middot; ' + esc(msg.userType) : '') + '</p>'
        + '<p><b>Topic:</b> ' + esc(topic) + '</p>'
        + '<p><b>Sent:</b> ' + esc(when.toLocaleString()) + '</p>'
        + '<hr style="border:none;border-top:1px solid #ddd;margin:14px 0;">'
        + '<p style="white-space:pre-wrap;">' + esc(msg.body || '(empty message)') + '</p>'
        + '<p style="color:#888;font-size:12px;margin-top:22px;">Sent automatically by the TeenWork Help &amp; Support form.'
        + (senderEmail ? ' Reply to this email to answer ' + esc(name) + '.' : '') + '</p>';
      try { emailjs.init(EMAILJS_PUBKEY); } catch (e) {}
      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email:  SUPPORT_INBOX_EMAIL,
        to_name:   'TeenWork Support',
        from_name: 'TeenWork Help & Support',
        reply_to:  senderEmail || ADMIN_EMAIL,
        subject:   'TeenWork Support: ' + topic + ' from ' + name,
        message:   html
      }).catch(function (e) { console.warn('Support email failed:', e); });
    } catch (e) { console.warn('Support email failed:', e); }
  }

  function saveAndEmail(msg) {
    var out = saveToInbox.apply(this, arguments);
    emailSupportMessage(msg || {});
    return out;
  }
  saveAndEmail._twEmailsSupport = true;
  window._adminSaveSupportMessage = saveAndEmail;
})();
