
/* v38 — TeenWork emails through ONE EmailJS template (to_email, subject, message[HTML]) */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function appUrl() { try { return /^https?:/.test(location.protocol) ? location.href.split('#')[0].split('?')[0] : ''; } catch (e) { return ''; } }
  function btn(label) { var u = appUrl(); return u ? '<p style="margin:22px 0 4px;"><a href="' + esc(u) + '" style="background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block;font-family:Arial,Helvetica,sans-serif;">' + esc(label) + '</a></p>' : ''; }
  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }

  window.twSendEmail = function (to, subject, html) {
    try {
      if (!to || typeof emailjs === 'undefined' || typeof EMAILJS_SERVICE === 'undefined') return Promise.resolve(false);
      try { emailjs.init(EMAILJS_PUBKEY); } catch (e) {}
      return emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: to, subject: subject, message: html, reply_to: ADMIN_EMAIL
      }).then(function () { return true; }, function (e) { console.warn('TeenWork email failed:', e); return false; });
    } catch (e) { console.warn(e); return Promise.resolve(false); }
  };


  window.twWelcomeEmail = function (to, first, type) {
    var f = esc(first || 'there'), body;
    if (type === 'teen') body = '<p>Hi ' + f + ',</p><p>Welcome to <b>TeenWork</b> — your account is ready! Here is how to get started:</p><ul style="padding-left:20px;"><li>Finish your profile so employers can get to know you</li><li>Take the short lessons on being a great worker</li><li>Link a parent or guardian to unlock applying for jobs and messaging employers</li></ul><p>Until a parent is linked, you are in <b>limited mode</b>: you can look around, take lessons and build your profile.</p>';
    else if (type === 'parent') body = '<p>Hi ' + f + ',</p><p>Welcome to <b>TeenWork</b> — your parent account is ready. You can link your teen, approve what they apply for, and keep an eye on their work.</p><ul style="padding-left:20px;"><li>Approve link requests from your teen</li><li>Review jobs and messages</li><li>Use your invite code option to link another teen at any time</li></ul>';
    else body = '<p>Hi ' + f + ',</p><p>Welcome to <b>TeenWork</b> — your employer account is ready. Post a job, set up your business profile, and meet local teens looking for safe, legal work.</p><ul style="padding-left:20px;"><li>Complete your business profile</li><li>Post your first job</li><li>Review the teen work rules for hours and duties</li></ul>';
    return window.twSendEmail(to, 'Welcome to TeenWork, ' + String(first || '').replace(/[<>]/g, '') + '! 🎉', body + btn('Open TeenWork'));
  };

  function reqFor(teenEmail) {
    var l = read('tw_link_requests', []), r = null;
    l.forEach(function (x) { if (x.teenEmail === teenEmail) r = x; });
    return r;
  }

  var oSend = window.twSendLink;
  window.twSendLink = function (sfx) {
    var before = read('tw_link_requests', []).length;
    var r = oSend.apply(this, arguments);
    var all = read('tw_link_requests', []);
    var last = all[all.length - 1];
    if (last && last.status === 'pending' && last.at && Date.now() - last.at < 3000) {
      var html = '<p>Hi,</p><p><b>' + esc(last.teenName) + '</b> (' + esc(last.teenEmail) + ') would like to link their TeenWork account to yours so they can apply for jobs safely.</p>' +
        '<p>Sign in (or create a free Parent account) with <b>this email address</b> and you will see the request to approve. You can also enter their invite code:</p>' +
        '<p style="font-size:24px;letter-spacing:3px;font-weight:bold;color:#1b4332;margin:8px 0;">' + esc(last.code) + '</p>' + btn('Open TeenWork');
      window.twSendEmail(last.parentEmail, String(last.teenName).replace(/[<>]/g,'') + ' wants to link with you on TeenWork', html);
    }
    return r;
  };

  var oApprove = window.twApproveLink;
  window.twApproveLink = function (teenEmail) {
    var e = String(teenEmail).toLowerCase(), r = reqFor(e);
    var out = oApprove.apply(this, arguments);
    window.twSendEmail(e, 'Your parent approved your TeenWork link 🎉',
      '<p>Hi ' + esc(r && r.teenName || '') + ',</p><p>Great news — your parent approved the link. <b>Everything is unlocked</b>: you can now apply for jobs, message employers and log your work.</p>' + btn('Open TeenWork'));
    if (r && r.parentEmail) window.twSendEmail(r.parentEmail, 'You are now linked with ' + String(r.teenName || 'your teen').replace(/[<>]/g, ''),
      '<p>Hi,</p><p>You approved the link with <b>' + esc(r.teenName || e) + '</b>. They now have full access to apply for jobs, message employers and log their work, with you linked as their parent.</p>' + btn('Open TeenWork'));
    return out;
  };

  var oDecline = window.twDeclineLink;
  window.twDeclineLink = function (teenEmail) {
    var e = String(teenEmail).toLowerCase(), r = reqFor(e);
    var out = oDecline.apply(this, arguments);
    window.twSendEmail(e, 'Update on your TeenWork link request',
      '<p>Hi ' + esc(r && r.teenName || '') + ',</p><p>Your parent did not approve the link request this time. You can still look around, take lessons and build your profile. Talk with them, then send a new request when you are ready.</p>' + btn('Open TeenWork'));
    return out;
  };
})();
