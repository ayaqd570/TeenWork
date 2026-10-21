
/* ══════════════════════════════════════════════════════════════════════
   BRANDED EMAILS  (2026-10-15, "Welcome email" thread, Aya's request)
   Every email the app sends through the main EmailJS template now goes
   out as one colourful, on-brand HTML email (forest green header, amber
   accent, cream card, styled lists and code boxes), built with inline
   styles only so Gmail, Outlook and phone mail apps keep the look.

   • Wraps emailjs.send once the EmailJS library has loaded. HTML bodies
     (welcome, parent link, support inbox, school partnership) are styled;
     plain-text bodies (verification code, parent consent, recommendation
     letter, new sign-up notice) are escaped and turned into paragraphs.
   • New welcome emails for teen / parent / employer accounts.
   • The SOS button's parent email used a service and template that do not
     exist ('teenwork_service' / 'safety_alert'), so it never arrived; it
     now goes through the main template as a red safety alert.

   NEEDS ONE EMAILJS DASHBOARD CHANGE: the template's content must be
   {{{message}}} (three braces) instead of {{message}}. With two braces
   EmailJS escapes the HTML, which is why tags showed up as text.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twBrandedEmail) return;
  window.__twBrandedEmail = true;

  var C = {
    green: '#2d6a4f', greenMid: '#40916c', greenLight: '#52b788', greenPale: '#d8f3dc', greenTint: '#eef8f1',
    amber: '#e76f00', amberMid: '#f49d37', amberPale: '#fff1e0', amberText: '#7a4700',
    red: '#c0392b', redPale: '#fde8e8', blue: '#1a5276', bluePale: '#dbeafe',
    bg: '#f5f0e8', card: '#fffdf7', text: '#1c1c1c', muted: '#4b5563', border: '#e2ddd4',
    dark: '#1a4731', darker: '#0d2d1e'
  };
  var FONT = "'DM Sans',Arial,Helvetica,sans-serif";
  var DISPLAY = "Fraunces,Georgia,'Times New Roman',serif";
  var MARK = '<!--tw-branded-email-->';
  var EMOJI_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})️?|\p{Emoji_Modifier})*/gu;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cfg() {
    return {
      service:  typeof EMAILJS_SERVICE  !== 'undefined' ? EMAILJS_SERVICE  : '',
      template: typeof EMAILJS_TEMPLATE !== 'undefined' ? EMAILJS_TEMPLATE : '',
      key:      typeof EMAILJS_PUBKEY   !== 'undefined' ? EMAILJS_PUBKEY   : '',
      admin:    typeof ADMIN_EMAIL      !== 'undefined' ? ADMIN_EMAIL      : '',
      quota:    typeof _emailjsQuotaExceeded !== 'undefined' && !!_emailjsQuotaExceeded
    };
  }
  function appUrl() { try { return /^https?:/.test(location.protocol) ? location.href.split('#')[0].split('?')[0] : ''; } catch (e) { return ''; } }
  function looksHtml(m) { var t = String(m || '').trim(); return t.charAt(0) === '<' && t.charAt(t.length - 1) === '>'; }
  function isCode(t) { return /^(?=.*\d)[A-Z0-9][A-Z0-9-]{3,11}$/.test(String(t).trim()); }
  function firstEmoji(s) { var m = String(s || '').match(EMOJI_RE); return m ? m[0] : ''; }
  function noEmoji(s) { return String(s || '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([!?.,:])/g, '$1').trim(); }

  /* ── small building blocks (all inline styles) ───────────────────── */
  function button(label, url) {
    url = url || appUrl();
    if (!url) return '';
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr>' +
      '<td bgcolor="' + C.green + '" style="background:' + C.green + ';border-radius:12px;">' +
      '<a href="' + esc(url) + '" style="display:inline-block;padding:14px 26px;font-family:' + FONT + ';font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">' + esc(label) + '</a>' +
      '</td></tr></table>';
  }
  function codeBox(code) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 20px;"><tr>' +
      '<td bgcolor="' + C.amberPale + '" style="background:' + C.amberPale + ';border:2px dashed ' + C.amberMid + ';border-radius:14px;padding:14px 26px;font-family:\'Courier New\',Courier,monospace;font-size:30px;font-weight:bold;letter-spacing:6px;color:' + C.green + ';">' + esc(code) + '</td>' +
      '</tr></table>';
  }
  function listBox(items, numbered) {
    var rows = items.map(function (html, i) {
      return '<tr>' +
        '<td valign="top" width="30" style="width:30px;padding:7px 0;">' +
        '<div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:' + C.green + ';color:#ffffff;font-family:' + FONT + ';font-size:13px;font-weight:bold;text-align:center;">' + (numbered ? (i + 1) : '&#10003;') + '</div></td>' +
        '<td valign="top" style="padding:7px 0 7px 10px;font-family:' + FONT + ';font-size:15px;line-height:1.5;color:' + C.text + ';">' + html + '</td>' +
        '</tr>';
    }).join('');
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + C.greenTint + '" style="width:100%;margin:6px 0 20px;background:' + C.greenTint + ';border:1px solid ' + C.greenPale + ';border-left:5px solid ' + C.greenLight + ';border-radius:14px;">' +
      '<tr><td style="padding:10px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rows + '</table></td></tr></table>';
  }
  function callout(icon, html, tone) {
    var bg = tone === 'amber' ? C.amberPale : tone === 'red' ? C.redPale : C.greenTint;
    var bar = tone === 'amber' ? C.amber : tone === 'red' ? C.red : C.greenLight;
    var fg = tone === 'amber' ? C.amberText : tone === 'red' ? C.red : C.dark;
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + bg + '" style="width:100%;margin:8px 0 20px;background:' + bg + ';border-left:5px solid ' + bar + ';border-radius:12px;"><tr>' +
      '<td valign="top" width="34" style="width:34px;padding:14px 0 14px 16px;font-size:20px;line-height:1.3;">' + icon + '</td>' +
      '<td valign="top" style="padding:14px 16px 14px 8px;font-family:' + FONT + ';font-size:15px;line-height:1.55;color:' + fg + ';">' + html + '</td>' +
      '</tr></table>';
  }
  function stepCards(steps) {
    return steps.map(function (s, i) {
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;margin:0 0 10px;background:#ffffff;border:1px solid ' + C.border + ';border-left:5px solid ' + s.color + ';border-radius:14px;"><tr>' +
        '<td valign="middle" width="56" style="width:56px;padding:14px 0 14px 16px;">' +
        '<div style="width:40px;height:40px;line-height:40px;border-radius:20px;background:' + s.tint + ';text-align:center;font-size:20px;">' + s.icon + '</div></td>' +
        '<td valign="middle" style="padding:14px 18px 14px 10px;font-family:' + FONT + ';">' +
        '<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:' + s.color + ';">Step ' + (i + 1) + '</div>' +
        '<div style="font-size:16px;font-weight:bold;color:' + C.text + ';margin-top:2px;">' + s.title + '</div>' +
        '<div style="font-size:14px;line-height:1.5;color:' + C.muted + ';margin-top:2px;">' + s.text + '</div>' +
        '</td></tr></table>';
    }).join('');
  }

  /* ── plain text → HTML ───────────────────────────────────────────── */
  function textToHtml(plain) {
    var paras = String(plain || '').replace(/\r\n?/g, '\n').trim().split(/\n[ \t]*\n/);
    return paras.map(function (p) {
      var t = p.replace(/^\n+|\n+$/g, '');
      if (!t.trim()) return '';
      if (isCode(t)) return codeBox(t.trim());
      if (/^\s*[—–]\s*\S/.test(t) && t.split('\n').length <= 2) return '<p data-tw="signoff">' + esc(t.trim()).replace(/\n/g, '<br>') + '</p>';
      var lines = t.split('\n'), out = '', bullets = [];
      function flush() { if (bullets.length) { out += '<ul>' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>'; bullets = []; } }
      var para = [];
      function flushPara() { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } }
      lines.forEach(function (line) {
        var m = line.match(/^\s*(?:[✓✔•\-*]|✅)\s+(.*)$/);
        var lbl = line.match(/^\s*([A-Z][A-Za-z ]{1,24}):\s+(\S.*)$/);
        if (m) { flushPara(); bullets.push(esc(m[1])); return; }
        flush();
        para.push(lbl ? '<b>' + esc(lbl[1]) + ':</b> ' + esc(lbl[2]) : esc(line.trim()));
      });
      flushPara(); flush();
      return out;
    }).join('');
  }

  /* ── restyle the body's plain tags with brand inline styles ──────── */
  function restyle(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    var root = tpl.content;
    function merge(el, base) { var old = el.getAttribute('style'); el.setAttribute('style', base + (old ? ';' + old : '')); }
    Array.prototype.forEach.call(root.querySelectorAll('ul,ol'), function (list) {
      if (list.closest('[data-tw-keep]')) return;
      var items = Array.prototype.filter.call(list.children, function (c) { return c.tagName === 'LI'; }).map(function (li) { return li.innerHTML; });
      var holder = document.createElement('template');
      holder.innerHTML = listBox(items, list.tagName === 'OL');
      list.replaceWith(holder.content);
    });
    Array.prototype.forEach.call(root.querySelectorAll('p'), function (p) {
      if (p.closest('[data-tw-keep]')) return;
      if (isCode(p.textContent) && !p.querySelector('*')) { var h = document.createElement('template'); h.innerHTML = codeBox(p.textContent.trim()); p.replaceWith(h.content); return; }
      if (p.getAttribute('data-tw') === 'signoff') { p.setAttribute('style', 'margin:22px 0 0;font-family:' + FONT + ';font-size:15px;line-height:1.5;color:' + C.green + ';font-weight:bold;'); p.removeAttribute('data-tw'); return; }
      merge(p, 'margin:0 0 14px;font-family:' + FONT + ';font-size:16px;line-height:1.6;color:' + C.text);
    });
    Array.prototype.forEach.call(root.querySelectorAll('h1,h2,h3'), function (h) {
      if (h.closest('[data-tw-keep]')) return;
      merge(h, 'margin:18px 0 8px;font-family:' + DISPLAY + ';font-weight:900;color:' + C.green + ';font-size:' + (h.tagName === 'H1' ? '24px' : h.tagName === 'H2' ? '20px' : '17px'));
    });
    Array.prototype.forEach.call(root.querySelectorAll('b,strong'), function (b) { if (!b.closest('[data-tw-keep]')) merge(b, 'color:' + C.green); });
    Array.prototype.forEach.call(root.querySelectorAll('a'), function (a) { if (!a.getAttribute('style')) a.setAttribute('style', 'color:' + C.green + ';font-weight:bold;text-decoration:underline;'); });
    Array.prototype.forEach.call(root.querySelectorAll('hr'), function (hr) { hr.setAttribute('style', 'border:none;border-top:1px solid ' + C.border + ';margin:18px 0;'); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-tw-keep]'), function (el) { el.removeAttribute('data-tw-keep'); });
    var div = document.createElement('div');
    div.appendChild(root.cloneNode(true));
    return div.innerHTML;
  }

  /* ── the branded frame ───────────────────────────────────────────── */
  function frame(o) {
    var alert = o.tone === 'alert';
    var accent = alert ? C.red : C.green;
    var badgeBg = alert ? C.redPale : C.greenPale;
    var stripe = alert
      ? 'background:' + C.red + ';background-image:linear-gradient(90deg,' + C.red + ',' + C.amber + ');'
      : 'background:' + C.amber + ';background-image:linear-gradient(90deg,' + C.amber + ' 0%,' + C.amberMid + ' 45%,' + C.greenLight + ' 100%);';
    var pre = esc(String(o.preheader || '').slice(0, 140));
    return MARK +
      '<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:' + C.bg + ';">' + pre + '&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + C.bg + '" style="width:100%;background:' + C.bg + ';margin:0;padding:0;">' +
      '<tr><td align="center" style="padding:28px 12px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + C.card + '" style="width:100%;max-width:600px;background:' + C.card + ';border:1px solid ' + C.border + ';border-radius:20px;overflow:hidden;">' +
        /* header */
        '<tr><td bgcolor="' + C.green + '" style="background:' + C.green + ';background-image:linear-gradient(135deg,' + C.green + ' 0%,' + C.dark + ' 60%,' + C.darker + ' 100%);padding:26px 32px 22px;border-radius:20px 20px 0 0;">' +
          '<div style="font-family:' + DISPLAY + ';font-size:30px;font-weight:900;line-height:1.1;color:#ffffff;">&#127793; Teen<span style="color:' + C.amberMid + ';">Work</span></div>' +
          '<div style="font-family:' + FONT + ';font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:' + C.greenLight + ';margin-top:8px;">Safe local jobs for Vermont teens 13&ndash;17</div>' +
        '</td></tr>' +
        '<tr><td height="6" style="height:6px;line-height:6px;font-size:0;' + stripe + '">&nbsp;</td></tr>' +
        /* headline */
        '<tr><td style="padding:30px 32px 4px;">' +
          (o.icon ? '<div style="width:56px;height:56px;line-height:56px;border-radius:28px;background:' + badgeBg + ';text-align:center;font-size:28px;margin:0 0 14px;">' + o.icon + '</div>' : '') +
          (o.heading ? '<h1 style="margin:0 0 6px;font-family:' + DISPLAY + ';font-size:26px;line-height:1.25;font-weight:900;color:' + accent + ';">' + esc(o.heading) + '</h1>' : '') +
        '</td></tr>' +
        /* body */
        '<tr><td style="padding:14px 32px 30px;font-family:' + FONT + ';font-size:16px;line-height:1.6;color:' + C.text + ';">' + o.body + '</td></tr>' +
        /* footer */
        '<tr><td bgcolor="' + C.bg + '" style="background:' + C.bg + ';border-top:1px solid ' + C.border + ';padding:20px 32px 24px;text-align:center;font-family:' + FONT + ';font-size:12px;line-height:1.6;color:' + C.muted + ';border-radius:0 0 20px 20px;">' +
          '<div style="font-family:' + DISPLAY + ';font-size:15px;font-weight:900;color:' + C.green + ';margin-bottom:4px;">&#127793; Built by a teen, for teens.</div>' +
          'Questions? Tap <b style="color:' + C.green + ';">Help &amp; Support</b> in the TeenWork app and we&rsquo;ll reply in your in-app inbox.' +
        '</td></tr>' +
      '</table>' +
      '</td></tr></table>';
  }

  function iconFor(subject, tone) {
    if (tone === 'alert') return '&#128680;';
    var e = firstEmoji(subject);
    if (e) return e;
    var s = String(subject || '').toLowerCase();
    if (/verif|code/.test(s)) return '&#128274;';
    if (/consent|parent|link/.test(s)) return '&#128106;';
    if (/support|message/.test(s)) return '&#128236;';
    if (/sign-?up/.test(s)) return '&#128640;';
    return '&#127793;';
  }

  /* Turn one EmailJS call into a branded one. Returns [service, template, params]. */
  function brand(service, template, params) {
    var c = cfg(), MAIN_SERVICE = c.service, MAIN_TEMPLATE = c.template;
    var p = Object.assign({}, params || {});

    // SOS button: route the parent alert through the template that exists.
    if (service === 'teenwork_service' && template === 'safety_alert' && MAIN_SERVICE && MAIN_TEMPLATE) {
      var teen = String(p.teen_name || 'A teen');
      p = {
        to_email: p.to_email, to_name: p.to_name || 'Parent/Guardian', from_name: 'TeenWork Safety',
        reply_to: c.admin,
        subject: '🚨 SOS alert: ' + teen.replace(/[<>]/g, '') + ' needs help',
        message: 'Hi,\n\n' + teen + ' pressed the SOS button in TeenWork.\n\nNote: ' + (p.alert_note || '(no note provided)') + '\nTime: ' + (p.alert_time || new Date().toLocaleString()) + '\n\nPlease check in with them right away.\n\n— TeenWork Safety',
        tw_tone: 'alert', tw_heading: teen + ' pressed the SOS button'
      };
      service = MAIN_SERVICE; template = MAIN_TEMPLATE;
    }

    if (!MAIN_TEMPLATE || template !== MAIN_TEMPLATE || typeof p.message !== 'string' || p.message.indexOf(MARK) === 0) return [service, template, params];

    var subject = String(p.subject || 'TeenWork');
    var tone = p.tw_tone || (/\bSOS\b|safety alert|🚨/i.test(subject) ? 'alert' : '');
    var heading = p.tw_heading || noEmoji(subject);
    var icon = p.tw_icon || iconFor(subject, tone);
    var inner = looksHtml(p.message) ? p.message : textToHtml(p.message);
    var body = restyle(inner);
    var tmp = document.createElement('div'); tmp.innerHTML = inner;
    var preheader = p.tw_preheader || String(tmp.textContent || '').replace(/\s+/g, ' ').replace(/^\s*Hi\b[^,]{0,40},\s*/i, '').trim();
    p.message = frame({ heading: heading, icon: icon, tone: tone, body: body, preheader: preheader });
    if (!p.from_name) p.from_name = 'TeenWork';
    if (!p.to_name) p.to_name = '';
    delete p.tw_tone; delete p.tw_heading; delete p.tw_icon; delete p.tw_preheader;
    return [service, template, p];
  }
  window.twBrandEmailParams = function (params) { var c = cfg(); return brand(c.service, c.template, params)[2]; };

  /* ── wrap emailjs.send (its exports are read-only getters, so swap the object) ── */
  function install() {
    var ej = window.emailjs;
    if (!ej || ej.__twBranded || typeof ej.send !== 'function') return;
    var origSend = ej.send;
    var w = {};
    Object.keys(ej).forEach(function (k) { try { w[k] = ej[k]; } catch (e) {} });
    w.send = function (service, template, params, key) {
      var a = [service, template, params];
      try { a = brand(service, template, params); } catch (e) { console.warn('TeenWork branded email failed, sending plain:', e); }
      var pr = typeof window.twDeliverEmail === 'function'   // resend-email-v42: Resend first, EmailJS as backup
        ? window.twDeliverEmail(a[0], a[1], a[2], key, function () { return origSend.call(ej, a[0], a[1], a[2], key); })
        : origSend.call(ej, a[0], a[1], a[2], key);
      if (pr && typeof pr.catch === 'function' && a[0] !== service) pr.catch(function (e) { console.warn('TeenWork SOS email failed:', e); });
      return pr;
    };
    Object.defineProperty(w, '__twBranded', { value: true });
    window.emailjs = w;
  }
  install();
  Array.prototype.forEach.call(document.querySelectorAll('script[src*="emailjs"]'), function (s) { s.addEventListener('load', install); });
  setInterval(install, 500);

  /* ── twSendEmail(to, subject, html, opts) — opts: heading, icon, preheader, tone ── */
  window.twSendEmail = function (to, subject, html, opts) {
    try {
      var c = cfg();
      if (!to || typeof emailjs === 'undefined' || !c.service) return Promise.resolve(false);
      if (c.quota) return Promise.resolve(false);
      install();
      try { emailjs.init(c.key); } catch (e) {}
      var params = { to_email: to, subject: subject, message: html, reply_to: c.admin, from_name: 'TeenWork' };
      opts = opts || {};
      if (opts.heading) params.tw_heading = opts.heading;
      if (opts.icon) params.tw_icon = opts.icon;
      if (opts.preheader) params.tw_preheader = opts.preheader;
      if (opts.tone) params.tw_tone = opts.tone;
      return emailjs.send(c.service, c.template, params)
        .then(function () { return true; }, function (e) { console.warn('TeenWork email failed:', e); return false; });
    } catch (e) { console.warn(e); return Promise.resolve(false); }
  };

  /* ── welcome emails ─────────────────────────────────────────────── */
  window.twWelcomeEmail = function (to, first, type) {
    var name = String(first || '').replace(/[<>]/g, '').trim();
    var f = esc(name || 'there');
    var intro, steps, note;
    if (type === 'teen') {
      intro = 'Hi ' + f + ', your account is ready! Here&rsquo;s how to get started:';
      steps = [
        { icon: '&#129489;&#8205;&#128188;', color: C.green, tint: C.greenPale, title: 'Finish your profile', text: 'So employers can get to know you.' },
        { icon: '&#128218;', color: C.blue, tint: C.bluePale, title: 'Learn to be a great worker', text: 'Short lessons on first impressions, teamwork, interviews, your first paycheck and more.' },
        { icon: '&#128106;', color: C.amber, tint: C.amberPale, title: 'Link a parent or guardian', text: 'This unlocks applying for jobs and messaging employers.' }
      ];
      note = callout('&#128274;', '<b style="color:' + C.amberText + ';">You&rsquo;re in limited mode for now.</b> Until a parent is linked, you can look around, take lessons and build your profile.', 'amber');
    } else if (type === 'parent') {
      intro = 'Hi ' + f + ', your parent account is ready. You can link your teen, approve what they apply for, and keep an eye on their work.';
      steps = [
        { icon: '&#128106;', color: C.green, tint: C.greenPale, title: 'Approve your teen&rsquo;s link request', text: 'It shows up in your account as soon as your teen sends it.' },
        { icon: '&#128203;', color: C.blue, tint: C.bluePale, title: 'Review jobs and messages', text: 'Look over the jobs your teen applies for and their messages.' },
        { icon: '&#128279;', color: C.amber, tint: C.amberPale, title: 'Link another teen any time', text: 'Use the invite code option in your account.' }
      ];
      note = callout('&#9989;', '<b style="color:' + C.dark + ';">You stay in control.</b> Your teen can&rsquo;t apply for jobs or message employers until you approve the link.', 'green');
    } else {
      intro = 'Hi ' + f + ', your employer account is ready. Post a job, set up your business profile, and meet local teens looking for safe, legal work.';
      steps = [
        { icon: '&#127970;', color: C.green, tint: C.greenPale, title: 'Complete your business profile', text: 'Help teens and parents see who you are.' },
        { icon: '&#128221;', color: C.amber, tint: C.amberPale, title: 'Post your first job', text: 'Describe the work, the pay and the hours.' },
        { icon: '&#128203;', color: C.blue, tint: C.bluePale, title: 'Review the teen work rules', text: 'Check the hours and duties teens are allowed to work.' }
      ];
      note = callout('&#128106;', '<b style="color:' + C.dark + ';">Parents are part of every hire.</b> Teens need a linked parent or guardian before they can apply.', 'green');
    }
    var html = '<div data-tw-keep="1">' +
      '<p style="margin:0 0 18px;font-family:' + FONT + ';font-size:16px;line-height:1.6;color:' + C.text + ';">' + intro + '</p>' +
      stepCards(steps) + '<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>' + note +
      button('🚀 Open TeenWork') +
      '<p style="margin:24px 0 0;font-family:' + FONT + ';font-size:15px;line-height:1.5;color:' + C.muted + ';">See you inside,<br><b style="color:' + C.green + ';">The TeenWork team</b> &#127793;</p>' +
      '</div>';
    return window.twSendEmail(to, 'Welcome to TeenWork' + (name ? ', ' + name : '') + '! 🎉', html, {
      heading: 'Welcome to TeenWork' + (name ? ', ' + name : '') + '!',
      icon: '&#127881;',
      preheader: type === 'teen' ? 'Your account is ready. Here is how to get started.' : 'Your ' + (type === 'parent' ? 'parent' : 'employer') + ' account is ready.'
    });
  };
})();
