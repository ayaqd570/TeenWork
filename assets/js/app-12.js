
(function v14() {
'use strict';

/* ══════════════════════
   1. FIX: SIGN IN / SIGN UP BUTTONS
   The original gotoPage stub must be drained before the page
   calls it. We force-drain it here and also add direct onclick listeners.
══════════════════════ */
function _fixAuthButtons() {
  // Fix all gotoPage calls in buttons by using direct onclick
  document.querySelectorAll('button,a[onclick]').forEach(el => {
    const oc = el.getAttribute('onclick') || '';
    if (/gotoPage\('(signup|login)'\)/.test(oc)) {
      const target = oc.match(/gotoPage\('(signup|login)'\)/)?.[1];
      if (!target) return;
      // Re-bind to guarantee it works even if gotoPage was stubbed
      el.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.gotoPage === 'function') {
          window.gotoPage(target);
        } else {
          // Manual fallback: show/hide pages
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          document.getElementById('page-' + target)?.classList.add('active');
        }
      });
    }
  });
}

/* ══════════════════════
   2. FIX: ADMIN LOGIN — proper "wrong password" error
══════════════════════ */
const _origDoLogin = window.doLogin;
window.doLogin = async function() {
  const emailEl = document.getElementById('li-email');
  const passEl  = document.getElementById('li-password');
  if (!emailEl || !passEl) { if (_origDoLogin) return _origDoLogin.apply(this, arguments); return; }
  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;

  // v39: admin sign-in is handled by _twAdminLogin (salted hash). A wrong admin password
  // falls through to the normal account check so the form never reveals an admin login exists.
  if (await _twAdminLogin(email, pass)) return;
  if (_origDoLogin) return _origDoLogin.apply(this, arguments);
};

/* ══════════════════════
   3. FIX: PLAN SELECTION — no auto-select pro, better copy
══════════════════════ */
const _origInitPlan = window._initSignupPlan;
window._initSignupPlan = function() {
  if (_origInitPlan) _origInitPlan.apply(this, arguments);
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  const notice = document.getElementById('su-plan-notice');
  const proPrice = document.getElementById('su-plan-pro-price');

  // Never auto-select pro — let user choose
  const freeRadio = document.querySelector('input[name="su-plan"][value="free"]');
  const proRadio  = document.querySelector('input[name="su-plan"][value="pro"]');
  if (freeRadio) {
    freeRadio.checked = true;
    document.getElementById('su-plan-free-card').style.borderColor = 'var(--green)';
    if (document.getElementById('su-plan-pro-card')) document.getElementById('su-plan-pro-card').style.borderColor = 'var(--border)';
  }

  if (!cfg.launchPaid) {
    if (proPrice) proPrice.textContent = 'FREE — all features included';
    if (notice) {
      notice.style.display = 'block';
      notice.innerHTML = `🧪 <strong>TeenWork is still in testing — Pro is completely free!</strong><br>
        <span style="font-size:.75rem;font-weight:400;line-height:1.5;display:block;margin-top:3px">The app is still being tested. Pro is free for everyone. If a paid plan is ever added, you'll get a <strong>10-day email notice</strong> to switch to Free or add a payment method. No surprise charges, ever.</span>`;
    }
  }
};

// Re-run when signup page opens
const _sigPage = document.getElementById('page-signup');
if (_sigPage) {
  new MutationObserver(() => {
    if (_sigPage.classList.contains('active')) setTimeout(window._initSignupPlan, 50);
  }).observe(_sigPage, { attributes: true, attributeFilter: ['class'] });
}

/* ══════════════════════
   4. FIX: LESSONS — show full lesson content in modal
   Patches openLesson to include rich content, not just quiz.
══════════════════════ */
const LESSON_CONTENT = {
  first_impression: {
    sections: [
      { title:'Why First Impressions Matter', text:'Employers make a judgment about you within the first 30 seconds. A good first impression can get you the job; a bad one is almost impossible to undo.' },
      { title:'What to Do', text:'• Show up 5 minutes early (never late)\n• Give a firm handshake and make eye contact\n• Smile and say your name clearly\n• Dress one step nicer than you think you need to' },
      { title:'What NOT to Do', text:'• Check your phone during the meeting\n• Mumble or look at the floor\n• Bring a friend unless asked\n• Smell like food, smoke, or body odor' },
    ],
    tip: '💡 Pro tip: Before you meet an employer, practice saying "Hi, I\'m [name], thanks for meeting with me" out loud at home until it feels natural.'
  },
  safety: {
    sections: [
      { title:'Your Safety Rights', text:'As a teen worker you have legal rights. You CANNOT be asked to do work that is dangerous for your age. You can always say "I don\'t feel safe doing that."' },
      { title:'Common Hazards', text:'• Heavy equipment — you likely cannot legally operate it\n• Working alone at night — should always have adult nearby\n• Chemicals — must have proper training and safety gear\n• Heights — requires proper equipment' },
      { title:'What to Do If You Feel Unsafe', text:'Tell your employer immediately. If they ignore you, contact your parent and if needed the Department of Labor. You will never be fired legally for reporting a safety concern.' },
    ],
    tip: '💡 Know the number: US Dept of Labor child labor violations hotline: 1-866-4-US-WAGE (1-866-487-9243)'
  },
  communication: {
    sections: [
      { title:'Professional vs Casual', text:'Texting your friends and texting your boss are completely different. Employers expect professional language — no slang, no emojis in work messages, no "k" or "lol".' },
      { title:'The Golden Rules', text:'• Always confirm shifts the day before\n• Reply within 24 hours (not days)\n• Proofread before you send\n• If you can\'t make it, tell them ASAP — not the morning of' },
      { title:'Sample Messages', text:'Good: "Hi Mike, just confirming I\'ll be there at 9am tomorrow. See you then!"\n\nBad: "hey r we still doing tmrw lol"' },
    ],
    tip: '💡 When in doubt, read your message out loud. If it sounds weird, fix it.'
  },
  money: {
    sections: [
      { title:'Your First Paycheck', text:'You worked hard for that money! But taxes come out first. Federal income tax, and sometimes state tax, gets withheld. Don\'t panic — you may get some back as a refund.' },
      { title:'The 50/30/20 Rule (Teen Version)', text:'• 50% for things you need or really want\n• 30% into savings (car, college, goals)\n• 20% for emergencies or investing\nEven saving $20/week = $1,040/year.' },
      { title:'Avoid These Money Mistakes', text:'• Spending your whole check immediately\n• Lending money to friends\n• Buying stuff just to flex\n• No budget = no idea where it went' },
    ],
    tip: '💡 Open a savings account NOW. Even $100 sitting there makes you feel different about money.'
  },
  ratings: {
    sections: [
      { title:'Why Ratings Matter', text:'On TeenWork, your rating follows you. A 5-star teen gets more interviews, better jobs, and letters of recommendation. A 2-star teen gets skipped.' },
      { title:'How to Get 5 Stars', text:'• Show up on time, every time\n• Do a little more than asked\n• Ask "Is there anything else I can help with?"\n• Say thank you at the end of every shift\n• Follow up: "Let me know if everything looks good!"' },
      { title:'Common Rating Killers', text:'• Being late without notice\n• Using your phone during work\n• Doing minimum effort\n• Not communicating schedule changes' },
    ],
    tip: '💡 Think of every job as a free audition. Employers talk to each other.'
  },
  resume: {
    sections: [
      { title:'Teen Resume Reality', text:'You don\'t need paid work experience for a teen resume. Babysitting, mowing your neighbor\'s lawn, helping at a church, school clubs — all of it counts.' },
      { title:'What to Include', text:'• Contact info (email + phone)\n• Skills (be specific: "mow, edge, and blow clippings" not just "yard work")\n• Experience (any kind — paid or unpaid)\n• School activities, sports, volunteering\n• A short objective statement' },
      { title:'Format Tips', text:'• Keep it to ONE page\n• Use a clean, readable font\n• No photos\n• Save as PDF before sending\n• Name the file: FirstLast_Resume.pdf' },
    ],
    tip: '💡 Use the AI Resume Builder in this app — it builds a real formatted resume in 2 minutes.'
  },
  interview: {
    sections: [
      { title:'The 3 Things Employers Want', text:'1. Will you show up reliably?\n2. Will you do the job without constant supervision?\n3. Are you pleasant to be around?\n\nYour answers need to show all three.' },
      { title:'Common Questions + Answers', text:'"Tell me about yourself" → Name, age, 1-2 skills, why you want this specific job.\n\n"What\'s your weakness?" → Pick a REAL weakness you\'re working on. Never say "I work too hard."\n\n"Why do you want this job?" → Be specific. "I love dogs" for a pet sitting job is great.' },
      { title:'After the Interview', text:'Send a thank-you text or email within 24 hours: "Thanks for taking the time to meet with me today — I\'m really excited about this opportunity!"' },
    ],
    tip: '💡 Practice answering "Tell me about yourself" in the mirror until you can do it in 30 seconds without "um".'
  },
  conflict: {
    sections: [
      { title:'Conflict Is Normal', text:'Even in the best jobs, things go wrong. A customer complains. A coworker is rude. An employer asks for something unfair. How you handle it is what defines you as a professional.' },
      { title:'The Response Framework', text:'1. Stay calm — do NOT react immediately\n2. Listen fully before responding\n3. Use "I" statements: "I felt..." not "You always..."\n4. Suggest a solution, not just a complaint\n5. If unresolved, go one level up (parent, HR, etc.)' },
      { title:'When to Escalate', text:'If the conflict involves something illegal (harassment, unsafe work, not getting paid) — involve your parent and TeenWork support immediately. Do not try to handle it alone.' },
    ],
    tip: '💡 The phrase "I understand your frustration — here\'s what I can do" defuses almost any situation.'
  },
  time: {
    sections: [
      { title:'Time Blocking for Teens', text:'School + homework + sports + work sounds impossible. The key is planning ahead, not hoping it works out. Every Sunday, map the whole week.' },
      { title:'Work-Life-School Balance', text:'• School is always #1\n• Max hours for teens during school year: 18/week in most states\n• Build buffer time — jobs often run long\n• Communicate schedule BEFORE accepting, not after' },
      { title:'If Something Comes Up', text:'• Tell your employer as early as possible\n• Offer to find a replacement if you can\n• Never just ghost a shift — it permanently damages your reputation' },
    ],
    tip: '💡 Put every shift in your phone calendar the moment you accept it. Use reminders.'
  },
  social_media: {
    sections: [
      { title:'Employers Google You', text:'Before hiring you, most employers will search your name online. Whatever is public is fair game. A single bad post can cost you the job.' },
      { title:'What to Check Right Now', text:'• Google yourself — what comes up?\n• Check your Instagram/TikTok public posts\n• Remove anything that shows drug use, violence, or extreme language\n• Make accounts private if you\'re not sure' },
      { title:'Use Social Media as an Advantage', text:'• LinkedIn is free and makes teens look serious\n• Posting about community service or hobbies looks great\n• Following a business before applying shows initiative' },
    ],
    tip: '💡 The rule: never post anything you wouldn\'t want a grandparent or future employer to see.'
  },
  teamwork: {
    sections: [
      { title:'Why Teamwork Skills Pay Off', text:'Employers always rank "works well with others" in the top 3 traits they look for. Even solo jobs (lawn care, pet sitting) involve working with clients and family members.' },
      { title:'Being the Teammate Everyone Wants', text:'• Do your share without being asked\n• Give credit to others publicly\n• Speak up if you see a problem\n• Never blame teammates to supervisors' },
      { title:'Handling Difficult Teammates', text:'• Don\'t gossip — it always gets back to them\n• Address issues directly and privately first\n• Focus on the behavior, not the person\n• If it continues, bring it to your employer professionally' },
    ],
    tip: '💡 The best team players make everyone around them look good. That\'s what gets you recommended.'
  },
  references: {
    sections: [
      { title:'Why References Matter', text:'A single strong reference from a real employer is worth more than any grade or award. Colleges and future jobs take references seriously.' },
      { title:'Who to Ask', text:'• Former or current employers (best)\n• Teachers or coaches who know your work ethic\n• Community or religious leaders\n• NOT: friends, family, or people who don\'t know your work' },
      { title:'How to Ask', text:'1. Ask in person or via phone (not text)\n2. Ask: "Would you be comfortable giving me a strong reference?"\n3. The word "strong" matters — it lets them opt out politely\n4. Give them time and a copy of your resume' },
    ],
    tip: '💡 Always send a thank-you note after someone gives you a reference. It makes them want to help you again.'
  },
};

// Override openLesson with full content version
window.openLesson = function(id) {
  const lessons = window.lessonsData || [];
  const l = lessons.find(x => x.id === id);
  if (!l) return;

  const content = LESSON_CONTENT[id] || null;
  const completed = (window.userActivity?.lessonsCompleted) || [];
  const isDone = completed.includes(id);

  let modal = document.getElementById('v14-lesson-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'v14-lesson-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem';
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
    document.body.appendChild(modal);
  }

  const sectionsHtml = content ? content.sections.map(s =>
    `<div class="v14-lesson-section">${s.title}</div>
     <div style="font-size:.86rem;line-height:1.7;color:var(--text);white-space:pre-line">${s.text}</div>`
  ).join('') : `<p style="font-size:.88rem;color:var(--text);line-height:1.7">${l.desc}</p>`;

  const tipHtml = content?.tip ? `<div class="v14-lesson-tip">${content.tip}</div>` : '';

  const quizHtml = l.quiz && l.quiz[0] ? `
    <div style="background:var(--bg);border-radius:12px;padding:1rem;margin-bottom:1rem">
      <div style="font-weight:700;font-size:.88rem;margin-bottom:.75rem;color:var(--text)">🧠 Quick Quiz: ${l.quiz[0].q}</div>
      ${l.quiz[0].opts.map((o,i) =>
        `<button onclick="v14AnswerLesson('${id}',${i},${l.quiz[0].ans})" style="display:block;width:100%;text-align:left;padding:9px 12px;margin-bottom:6px;border-radius:10px;border:1.5px solid var(--border);background:var(--card,#fff);cursor:pointer;font-size:.85rem;font-family:'DM Sans',sans-serif;transition:border-color .15s" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--border)'">
          <span style="font-weight:700;color:var(--green);margin-right:6px">${String.fromCharCode(65+i)}.</span>${o}
        </button>`
      ).join('')}
    </div>` : '';

  modal.innerHTML = `
    <div style="background:var(--card,#fff);border-radius:18px;max-width:520px;width:100%;padding:1.6rem;max-height:90vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:2rem">${l.icon}</span>
          <div>
            <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Lesson ${lessons.indexOf(l)+1} of ${lessons.length}</div>
            <h2 style="font-family:'Fraunces',serif;font-size:1.05rem;color:var(--green);margin:2px 0 0">${l.title}</h2>
          </div>
        </div>
        <button onclick="document.getElementById('v14-lesson-modal').style.display='none'" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--muted);padding:0 4px;line-height:1">✕</button>
      </div>
      ${isDone ? '<div style="background:var(--green-pale);border-radius:8px;padding:7px 12px;font-size:.82rem;font-weight:700;color:var(--green);margin-bottom:.75rem">✅ You already completed this lesson! You can review it anytime.</div>' : ''}
      <div class="v14-lesson-content">${sectionsHtml}</div>
      ${tipHtml}
      ${quizHtml}
      ${isDone ? '' : '<p style="font-size:.78rem;color:var(--muted);text-align:center;margin-bottom:.75rem">Answer the quiz correctly to earn +' + l.xp + ' XP and mark this lesson complete!</p>'}
      <button onclick="document.getElementById('v14-lesson-modal').style.display='none'" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--border);color:var(--text);font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif">Close</button>
    </div>`;
  modal.style.display = 'flex';
};

window.v14AnswerLesson = function(id, chosen, correct) {
  if (chosen === correct) {
    if (window.userActivity) {
      if (!userActivity.lessonsCompleted) userActivity.lessonsCompleted = [];
      if (!userActivity.lessonsCompleted.includes(id)) {
        userActivity.lessonsCompleted.push(id);
        // Award XP
        const l = (window.lessonsData||[]).find(x=>x.id===id);
        if (typeof awardBadge === 'function' && l) awardBadge('lesson_1');
        if (window.teenGameState && l) teenGameState.points = (teenGameState.points||0) + (l.xp||20);
      }
    }
    document.getElementById('v14-lesson-modal').style.display = 'none';
    if (typeof showToast === 'function') showToast('✅ Correct! +' + ((window.lessonsData||[]).find(x=>x.id===id)?.xp||20) + ' XP earned!', 'success');
    if (typeof renderLessonsGrid === 'function') setTimeout(renderLessonsGrid, 200);
  } else {
    if (typeof showToast === 'function') showToast('Not quite — try again!', 'info');
    // Shake the wrong button
  }
};

/* ══════════════════════
   5. SIMPLIFIED MORE DRAWER
   Move Work-related tabs out of More into the Work nav button.
   More = only secondary/overflow items.
   Also fix the NAV config to consolidate.
══════════════════════ */
// Patch NAV for teen: reduce More drawer items; Work bottom button opens
// a mini-modal with all work-related tabs
const _origNAV = window.NAV;
if (window.NAV?.teen) {
  // Make the Work button in bottom nav open a picker
  window.NAV.teen.bottom = [
    { icon:'🔍', label:'Jobs',    tab:'ttab-browse' },
    { icon:'💼', label:'Work',    action:'work' },    // special action
    { icon:'💬', label:'Chat',    action:'msg' },
    { icon:'👤', label:'Me',      tab:'ttab-resume' },
    { icon:'☰',  label:'More',    action:'more' },
  ];
  // Slim down the More drawer — only things not reachable from bottom nav groups
  window.NAV.teen.more = [
    { section:'Progress & Achievements', items:[
      { icon:'🏅', label:'Badges',      tab:'ttab-badges' },
      { icon:'🏆', label:'Leaderboard', tab:'ttab-leaderboard' },
      { icon:'🗂️', label:'Portfolio',   tab:'ttab-portfolio' },
      { icon:'🛡️', label:'Verify',      tab:'verify' },
    ]},
    { section:'Learning', items:[
      { icon:'📚', label:'Lessons',     tab:'ttab-lessons' },
      { icon:'🎯', label:'First Job',   tab:'ttab-firstjob' },
      { icon:'📜', label:'Rec Letters', tab:'ttab-letters' },
    ]},
  ];
}

// Patch buildBottomNav to support the 'work' action
const _origBBN = window.buildBottomNav;
window.buildBottomNav = function(role) {
  if (_origBBN) _origBBN.apply(this, arguments);
  if (role !== 'teen') return;
  // Find the Work button and rewire it
  setTimeout(() => {
    const inner = document.getElementById('mnavInner');
    if (!inner) return;
    const btns = inner.querySelectorAll('.mnav-btn');
    btns.forEach(btn => {
      if (btn.textContent.includes('Work')) {
        btn.onclick = () => _openWorkPicker();
      }
    });
  }, 50);
};

function _openWorkPicker() {
  // Remove existing
  document.getElementById('v14-work-picker')?.remove();
  document.getElementById('v14-work-scrim')?.remove();

  const WORK_ITEMS = [
    { icon:'⏱️', label:'Hours & Work Log',   tab:'ttab-worklog' },
    { icon:'📅', label:'Calendar',            tab:'ttab-calendar' },
    { icon:'📊', label:'App Tracker',         tab:'ttab-tracker' },
    { icon:'💰', label:'Earnings',            tab:'ttab-earnings' },
    { icon:'🎯', label:'Savings Goals',       tab:'ttab-savings' },
    { icon:'⭐', label:'My References',       tab:'ttab-references' },
  ];

  const scrim = document.createElement('div');
  scrim.id = 'v14-work-scrim';
  scrim.style.cssText = 'position:fixed;inset:0;z-index:499;background:rgba(0,0,0,.35)';
  scrim.onclick = () => { picker.remove(); scrim.remove(); };
  document.body.appendChild(scrim);

  const picker = document.createElement('div');
  picker.id = 'v14-work-picker';
  picker.style.cssText = 'position:fixed;bottom:72px;left:0;right:0;z-index:500;background:var(--card);border-radius:18px 18px 0 0;padding:1rem;box-shadow:0 -8px 32px rgba(0,0,0,.18);animation:slideUp .22s cubic-bezier(.32,1,.22,1);font-family:"DM Sans",sans-serif';

  picker.innerHTML = `
    <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
    <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 12px;cursor:pointer" onclick="document.getElementById('v14-work-picker')?.remove();document.getElementById('v14-work-scrim')?.remove()"></div>
    <div style="font-family:'Fraunces',serif;font-size:.95rem;font-weight:700;color:var(--green);margin-bottom:12px;padding:0 4px">💼 Work & Earnings</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${WORK_ITEMS.map(item => `
        <button onclick="switchTab('teen','${item.tab}');document.getElementById('v14-work-picker')?.remove();document.getElementById('v14-work-scrim')?.remove()" style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:12px 6px 10px;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;align-items:center;gap:5px;transition:background .12s;font-size:.72rem;font-weight:700;color:var(--text)">
          <span style="font-size:1.4rem">${item.icon}</span>
          <span style="text-align:center;line-height:1.2">${item.label}</span>
        </button>`).join('')}
    </div>
  `;
  document.body.appendChild(picker);
}

/* ══════════════════════
   6. SUPPORT: AI unavailable banner ABOVE textarea
══════════════════════ */
// v18 support modal wrapper — fixed to use correct overlay ID only
const _origOpenSup = window.openSupportModal;
window.openSupportModal = function(context, detail) {
  /* Try the original modal, but show a guaranteed fallback if it fails */
  var worked = false;
  try {
    if (_origOpenSup) { _origOpenSup.apply(this, arguments); worked = true; }
  } catch(e) { worked = false; }
  if (worked) return;
  /* Guaranteed fallback — rich full-featured support modal, no CSS vars */
  document.getElementById('tw-sup-fallback')?.remove();
  var ov = document.createElement('div');
  ov.id = 'tw-sup-fallback';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",system-ui,sans-serif;overflow-y:auto';

  ov.innerHTML = `
  <div style="background:#fff;border-radius:24px;padding:0;max-width:520px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.35);max-height:92vh;overflow-y:auto;animation:twSupSlide .22s ease">
  <style>
    @keyframes twSupSlide{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .tw-sup-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:20px;border:1.5px solid #d1fae5;background:#f0fdf4;color:#2d6a4f;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;margin:3px}
    .tw-sup-chip.active,.tw-sup-chip:hover{background:#2d6a4f;color:#fff;border-color:#2d6a4f}
    .tw-sup-inp{width:100%;padding:10px 13px;border:1.5px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none;box-sizing:border-box;transition:border-color .2s;line-height:1.5}
    .tw-sup-inp:focus{border-color:#2d6a4f}
    .tw-sup-faq{border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:1rem}
    .tw-sup-faq-item{border-bottom:1px solid #f3f4f6}
    .tw-sup-faq-item:last-child{border-bottom:none}
    .tw-sup-faq-q{width:100%;text-align:left;background:none;border:none;padding:11px 14px;font-size:.82rem;font-weight:700;color:#1f2937;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:inherit}
    .tw-sup-faq-q:hover{background:#f9fafb}
    .tw-sup-faq-a{display:none;padding:0 14px 11px;font-size:.8rem;color:#6b7280;line-height:1.6}
    .tw-sup-faq-a.open{display:block}
    .tw-sup-pri{display:flex;gap:6px;margin-bottom:1rem}
    .tw-sup-pri-btn{flex:1;padding:8px 6px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:.75rem;font-weight:700;cursor:pointer;text-align:center;transition:all .15s}
    .tw-sup-pri-btn.active{border-color:#2d6a4f;background:#f0fdf4;color:#2d6a4f}
  </style>

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1b4332,#2d6a4f);padding:1.4rem 1.6rem;border-radius:24px 24px 0 0;display:flex;align-items:center;gap:12px">
    <div style="width:46px;height:46px;background:rgba(255,255,255,.18);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">💬</div>
    <div style="flex:1">
      <div style="font-size:1.1rem;font-weight:800;color:#fff">Help & Support</div>
      <div style="font-size:.78rem;color:rgba(255,255,255,.75);margin-top:2px">TeenWork team · usually replies within a few hours</div>
    </div>
    <button id="tw-sup-x" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;width:34px;height:34px;font-size:1.2rem;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
  </div>

  <div style="padding:1.4rem 1.6rem">

    <!-- AI Help Bot -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.6rem">🤖 Ask the AI Assistant</div>
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:1rem;margin-bottom:1rem;">
      <div id="tw-ai-chat-log" style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:6px;">
        <input id="tw-ai-chat-inp" class="tw-sup-inp" type="text" placeholder="Ask anything — e.g. how do I apply for a job?" style="flex:1;font-size:.85rem;padding:8px 11px;">
        <button id="tw-ai-chat-send" style="background:#2d6a4f;color:#fff;border:none;padding:8px 14px;border-radius:9px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">Ask ↵</button>
      </div>
      <div style="font-size:.7rem;color:#6b7280;margin-top:6px;">Powered by TeenWork AI · Can't solve it? Send us a message below 👇</div>
    </div>

    <!-- Quick FAQ -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.6rem">Common Questions</div>
    <div class="tw-sup-faq">
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do I sign up as a teen? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Tap Sign Up on the home screen, choose <strong>Teen Worker</strong>, fill in your details and have a parent verify your age. You'll be ready to apply for jobs right away.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">What does Pro include? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Pro includes unlimited AI requests, AI Resume Builder, AI Job Coach, Pitch AI, priority job matching, AI safety screening, and early feature access. It's <strong>free during launch</strong>.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">I'm a parent — how do I verify my teen? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Choose <strong>Parent / Guardian</strong> on the sign-up screen. You'll be able to verify your teen's account and manage their job application permissions from your dashboard.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do I post a job as an employer? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Sign up as an <strong>Employer</strong>, complete your profile, then tap <em>Post a Job</em>. All job posts are reviewed for teen-safety compliance before going live.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">My account is locked / I can't log in <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Try clearing your browser cache and reloading. If you still can't log in, send us a message below and we'll unlock your account manually within a few hours.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">I didn't get my verification email <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Check your <strong>spam or junk folder</strong> first — it sometimes ends up there. If it's not there after a few minutes, try signing up again or contact support below.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">The AI isn't working / I hit my limit <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Free plan users get <strong>10 AI requests per day</strong>, which resets at midnight. If you're hitting the limit regularly, upgrading to Pro gives you unlimited requests for free during launch.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">My message was blocked by the safety filter <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">The AI safety filter sometimes catches messages by mistake. If you think your message was incorrectly blocked, rephrase it or contact support below with details and we'll review it.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do teens get paid? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Payment is arranged directly between the teen and employer — TeenWork doesn't take a cut. Common methods are cash, Venmo, or check. Always agree on payment before starting a job.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">Something looks broken or isn't loading <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Try <strong>refreshing the page</strong> (pull down on mobile, or press F5 on desktop). If the problem persists, clear your browser cache or try a different browser, then contact us below.</div>
      </div>
    </div>

    <!-- Divider -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
      <div style="flex:1;height:1px;background:#e5e7eb"></div>
      <span style="font-size:.76rem;color:#9ca3af;font-weight:700">OR SEND US A MESSAGE</span>
      <div style="flex:1;height:1px;background:#e5e7eb"></div>
    </div>

    <!-- Topic chips -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem">What's this about?</div>
    <div style="margin-bottom:1rem" id="tw-sup-chips">
      <span class="tw-sup-chip active" onclick="twSupChip(this)">🔐 Login / Account</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💼 Jobs & Applying</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🤖 AI Features</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💳 Pro / Billing</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">👨‍👩‍👧 Parent Verify</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🐛 Bug / Error</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💡 Suggestion</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🛡️ Safety Concern</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">❓ Other</span>
    </div>

    <!-- Priority -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem">Priority</div>
    <div class="tw-sup-pri" style="margin-bottom:1rem">
      <button class="tw-sup-pri-btn" onclick="twSupPri(this)">🟢 Low<br><span style="font-weight:400;font-size:.7rem">No rush</span></button>
      <button class="tw-sup-pri-btn active" onclick="twSupPri(this)">🟡 Normal<br><span style="font-weight:400;font-size:.7rem">We'll reply soon</span></button>
      <button class="tw-sup-pri-btn" onclick="twSupPri(this)">🔴 Urgent<br><span style="font-weight:400;font-size:.7rem">Can't use app</span></button>
    </div>

    <!-- Name only -->
    <div style="margin-bottom:1rem">
      <label style="font-size:.78rem;font-weight:700;color:#374151;display:block;margin-bottom:4px">Your name <span style="color:#9ca3af;font-weight:400">(optional)</span></label>
      <input id="tw-sup-name" class="tw-sup-inp" type="text" placeholder="e.g. Alex">
    </div>

    <!-- Message -->
    <div style="margin-bottom:1rem">
      <label style="font-size:.78rem;font-weight:700;color:#374151;display:block;margin-bottom:4px">Describe your issue <span style="color:#ef4444">*</span></label>
      <textarea id="tw-sup-msg" class="tw-sup-inp" rows="5" placeholder="Tell us what happened, what you were trying to do, and what you expected… The more detail, the faster we can help."></textarea>
      <div id="tw-sup-chars" style="font-size:.72rem;color:#9ca3af;text-align:right;margin-top:3px">0 / 1000</div>
    </div>

    <!-- Buttons -->
    <div style="display:flex;gap:8px">
      <button id="tw-sup-send" style="flex:1;background:linear-gradient(135deg,#1b4332,#2d6a4f);color:#fff;border:none;padding:14px;border-radius:12px;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">
        📨 Send to Support
      </button>
      <button id="tw-sup-cancel" style="padding:14px 18px;border-radius:12px;border:1.5px solid #e5e7eb;background:#f9fafb;font-size:.9rem;cursor:pointer;color:#374151;font-weight:600;font-family:inherit">Cancel</button>
    </div>
    <p style="font-size:.72rem;color:#9ca3af;margin-top:.8rem;text-align:center;margin-bottom:0">Your message goes directly to the TeenWork admin team</p>
  </div>
  </div>`;

  document.body.appendChild(ov);

  /* JS helpers */
  window.twSupChip = function(el) {
    ov.querySelectorAll('.tw-sup-chip').forEach(function(c){ c.classList.remove('active'); });
    el.classList.add('active');
  };
  window.twSupPri = function(el) {
    ov.querySelectorAll('.tw-sup-pri-btn').forEach(function(b){ b.classList.remove('active'); });
    el.classList.add('active');
  };
  var msgEl = ov.querySelector('#tw-sup-msg');
  var charsEl = ov.querySelector('#tw-sup-chars');
  msgEl.addEventListener('input', function(){
    var n = Math.min(this.value.length, 1000);
    this.value = this.value.slice(0, 1000);
    charsEl.textContent = n + ' / 1000';
    charsEl.style.color = n > 800 ? '#ef4444' : '#9ca3af';
  });

  function _rm(){ ov.remove(); }
  ov.querySelector('#tw-sup-x').onclick = _rm;
  ov.querySelector('#tw-sup-cancel').onclick = _rm;
  ov.addEventListener('click', function(e){ if(e.target===ov) _rm(); });

  ov.querySelector('#tw-sup-send').onclick = function() {
    var msg = (ov.querySelector('#tw-sup-msg').value || '').trim();
    if (!msg) { ov.querySelector('#tw-sup-msg').style.borderColor='#ef4444'; ov.querySelector('#tw-sup-msg').focus(); return; }
    var topic = (ov.querySelector('.tw-sup-chip.active') || {}).textContent || 'General';
    var priority = (ov.querySelector('.tw-sup-pri-btn.active') || {}).textContent || 'Normal';
    var name = ov.querySelector('#tw-sup-name').value || 'Anonymous';
    var body = 'Topic: ' + topic + '\nPriority: ' + priority.replace(/\n.*/,'')
      + (name ? '\nName: ' + name : '')
      + '\n\n' + msg;
    // Save to admin inbox
    if (typeof _adminSaveSupportMessage === 'function') {
      _adminSaveSupportMessage({ name: name, context: topic, body: msg, email: (window.currentUser?.email || 'unknown'), userType: (window.currentUser?.type || 'visitor'), time: new Date().toISOString() });
    }
    /* Show confirmation */
    ov.querySelector('#tw-sup-send').textContent = '✅ Message sent!';
    ov.querySelector('#tw-sup-send').style.background = '#065f46';
    setTimeout(_rm, 2200);
  };
  /* AI bot chat wiring */
  var _aiLog = ov.querySelector('#tw-ai-chat-log');
  var _aiInp = ov.querySelector('#tw-ai-chat-inp');
  var _aiSend = ov.querySelector('#tw-ai-chat-send');

  function _aiAddMsg(text, from) {
    var bubble = document.createElement('div');
    bubble.style.cssText = 'padding:7px 11px;border-radius:10px;font-size:.8rem;line-height:1.55;max-width:85%;word-wrap:break-word;' +
      (from === 'user'
        ? 'background:#2d6a4f;color:#fff;align-self:flex-end;border-bottom-right-radius:3px;'
        : 'background:#fff;color:#1c1c1c;border:1px solid #e5e7eb;align-self:flex-start;border-bottom-left-radius:3px;');
    bubble.textContent = text;
    _aiLog.appendChild(bubble);
    _aiLog.scrollTop = _aiLog.scrollHeight;
  }

  _aiAddMsg('👋 Hi! I\'m the TeenWork AI. Ask me anything about the app and I\'ll try to help before you need to contact support.', 'bot');

  async function _aiAsk() {
    var q = (_aiInp.value || '').trim();
    if (!q) return;
    _aiInp.value = '';
    _aiAddMsg(q, 'user');
    _aiSend.disabled = true;
    _aiSend.textContent = '…';
    var thinking = document.createElement('div');
    thinking.style.cssText = 'padding:7px 11px;border-radius:10px;font-size:.8rem;color:#6b7280;background:#fff;border:1px solid #e5e7eb;align-self:flex-start;';
    thinking.textContent = '🤔 Thinking…';
    _aiLog.appendChild(thinking);
    _aiLog.scrollTop = _aiLog.scrollHeight;
    try {
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: 'You are the TeenWork support assistant. TeenWork is a job app for teens ages 13-17, started in Vermont: a linked parent approves every application and chats are checked by a word filter and AI. TeenWork does not verify employers or run background checks, so never say it does. Answer questions helpfully and briefly (2-3 sentences max). If the issue needs admin help, say so and encourage them to send a message using the form below.',
          messages: [{ role: 'user', content: q }]
        })
      });
      var data = await response.json();
      thinking.remove();
      var ans = (data.content && data.content[0] && data.content[0].text) || 'I\'m not sure — please send a message to the admin using the form below and we\'ll sort it out!';
      _aiAddMsg(ans, 'bot');
    } catch(e) {
      thinking.remove();
      _aiAddMsg('I\'m having trouble connecting right now. Please use the form below to send a message to the admin!', 'bot');
    }
    _aiSend.disabled = false;
    _aiSend.textContent = 'Ask ↵';
  }

  _aiSend.onclick = _aiAsk;
  _aiInp.addEventListener('keydown', function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _aiAsk(); } });

};
function _injectFeedbackFAB() {
  if (document.getElementById('v14-feedback-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'v14-feedback-fab';
  fab.innerHTML = '⭐ Rate App';
  fab.title = 'Give feedback on TeenWork';
  fab.onclick = () => document.getElementById('v14-feedback-modal').classList.add('open');
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.id = 'v14-feedback-modal';
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
  modal.innerHTML = `
    <div id="v14-feedback-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;color:var(--green);margin:0">⭐ How's TeenWork?</h3>
        <button onclick="document.getElementById('v14-feedback-modal').classList.remove('open')" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--muted)">✕</button>
      </div>
      <div class="v14-category-grid">
        <button class="v14-cat-btn active" data-cat="overall" onclick="v14SelectCat(this)">🌟 Overall</button>
        <button class="v14-cat-btn" data-cat="jobs" onclick="v14SelectCat(this)">💼 Job Listings</button>
        <button class="v14-cat-btn" data-cat="safety" onclick="v14SelectCat(this)">🛡 Safety</button>
        <button class="v14-cat-btn" data-cat="ai" onclick="v14SelectCat(this)">🤖 AI Features</button>
        <button class="v14-cat-btn" data-cat="design" onclick="v14SelectCat(this)">🎨 Design</button>
        <button class="v14-cat-btn" data-cat="idea" onclick="v14SelectCat(this)">💡 Suggestion</button>
      </div>
      <div style="margin-bottom:.5rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Your rating</div>
        <div class="v14-star-row" id="v14-fb-stars">
          ${[1,2,3,4,5].map(n=>`<span class="v14-star lit" data-n="${n}" onclick="v14SetStar(${n})">★</span>`).join('')}
        </div>
        <input type="hidden" id="v14-fb-rating" value="5">
      </div>
      <div style="margin-bottom:.5rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Tell us more (optional)</div>
        <textarea id="v14-fb-body" rows="3" placeholder="What do you love? What could be better?" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.87rem;resize:vertical;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"></textarea>
      </div>
      <div style="margin-bottom:1rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Your name <span style="font-weight:400">(optional)</span></div>
        <input id="v14-fb-name" type="text" placeholder="e.g. Alex, teen from Vermont" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.87rem;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <input type="checkbox" id="v14-fb-public" checked style="width:16px;height:16px">
        <label for="v14-fb-public" style="font-size:.78rem;color:var(--muted);cursor:pointer">Allow my review to appear publicly on TeenWork (after approval)</label>
      </div>
      <button onclick="v14SubmitFeedback()" class="btn-primary" style="width:100%;margin-top:.5rem">Submit Feedback</button>
    </div>`;
  document.body.appendChild(modal);
}

window.v14SelectCat = function(btn) {
  document.querySelectorAll('.v14-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.v14SetStar = function(n) {
  document.getElementById('v14-fb-rating').value = n;
  document.querySelectorAll('.v14-star').forEach(s => {
    s.classList.toggle('lit', Number(s.dataset.n) <= n);
  });
};

window.v14SubmitFeedback = function() {
  const rating  = parseInt(document.getElementById('v14-fb-rating')?.value || '5');
  const body    = document.getElementById('v14-fb-body')?.value.trim() || '';
  const name    = document.getElementById('v14-fb-name')?.value.trim() || (window.currentUser?.name || 'Anonymous user');
  const isPublic= document.getElementById('v14-fb-public')?.checked !== false;
  const cat     = document.querySelector('.v14-cat-btn.active')?.dataset.cat || 'overall';
  const role    = window.currentUser?.type || 'visitor';

  // Store in admin support messages
  try {
    const msgs = JSON.parse(localStorage.getItem('tw_admin_support_msgs') || '[]');
    msgs.unshift({
      id: 'fb-' + Date.now(), name, role, type: 'feedback',
      category: cat, rating,
      body: body || `(No comment — ${rating}★ for ${cat})`,
      ts: new Date().toISOString(), email: window.currentUser?.email || 'visitor'
    });
    localStorage.setItem('tw_admin_support_msgs', JSON.stringify(msgs.slice(0,200)));
  } catch(e) {}

  // Store as review if user consented
  if (isPublic && name && body) {
    try {
      const RKEY = 'tw_admin_reviews';
      const reviews = JSON.parse(localStorage.getItem(RKEY) || '[]');
      reviews.unshift({
        id: 'r' + Date.now(), name: name + (role && role !== 'visitor' ? ' · ' + role : ''),
        role, rating, body, published: false,
        date: new Date().toISOString().slice(0,10)
      });
      localStorage.setItem(RKEY, JSON.stringify(reviews));
    } catch(e) {}
  }

  document.getElementById('v14-feedback-modal').classList.remove('open');
  if (typeof showToast === 'function') showToast('⭐ Thanks for your feedback! It helps us improve.', 'success');
};

/* ══════════════════════
   8. PUBLIC REVIEWS on LANDING PAGE
   Shows published reviews with Google schema
══════════════════════ */
function _injectLandingReviews() {
  return; // Public reviews use only the consented Supabase feed, not device-local samples.

  if (document.getElementById('v14-reviews-section')) return;
  const landing = document.querySelector('#page-landing .landing-shell');
  if (!landing) return;

  function _getPublished() {
    try {
      const stored = JSON.parse(localStorage.getItem('tw_admin_reviews') || '[]');
      const pub = stored.filter(r => r.published);
      if (pub.length) return pub;
    } catch(e) {}
    return [
      { name:'Maya, 15 · TX', role:'teen', rating:5, body:'I made $320 in my first month cleaning cars — the AI cover letter got me 3 interviews in a week.', date:'2025-05-10' },
      { name:'James, 14 · CA', role:'teen', rating:5, body:'The safety filter caught a sketchy job post before I even applied. My mom felt way better.', date:'2025-06-01' },
      { name:'Riverbed Landscaping', role:'employer', rating:5, body:'TeenWork member feedback. Game changer.', date:'2025-06-15' },
      { name:'Dana · Parent, VT', role:'parent', rating:5, body:'The weekly digest email is gold. I know what my kid is up to without hovering.', date:'2025-07-01' },
    ];
  }

  const reviews = _getPublished();
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+(r.rating||5),0)/reviews.length).toFixed(1) : '5.0';

  const sec = document.createElement('div');
  sec.id = 'v14-reviews-section';
  sec.innerHTML = `
    <div class="v14-rev-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:.25rem">
        <div>
          <h2 style="font-family:'Fraunces',serif;font-size:1.5rem;color:var(--green);margin-bottom:.2rem">What people are saying</h2>
          <div style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--muted)">
            <span style="color:var(--amber)">${'★'.repeat(Math.round(Number(avg)))}</span>
            <strong style="color:var(--text)">${avg}</strong> · ${reviews.length} review${reviews.length!==1?'s':''}
            <span style="font-size:.72rem;color:var(--muted)">(member feedback)</span>
          </div>
        </div>
        <button onclick="document.getElementById('v14-feedback-modal').classList.add('open')" style="background:var(--green);color:#fff;border:none;border-radius:10px;padding:9px 18px;font-weight:700;font-size:.84rem;cursor:pointer;font-family:'DM Sans',sans-serif">✍️ Leave a Review</button>
      </div>
      <div class="v14-rev-grid">
        ${reviews.slice(0,6).map(r=>`
          <div class="v14-rev-card" itemscope itemtype="https://schema.org/Review">
            <div class="v14-rev-stars" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
              ${'★'.repeat(r.rating||5)}${'☆'.repeat(5-(r.rating||5))}
              <meta itemprop="ratingValue" content="${r.rating||5}">
              <meta itemprop="bestRating" content="5">
            </div>
            <p class="v14-rev-body" itemprop="reviewBody">"${r.body}"</p>
            <div class="v14-rev-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
              <span itemprop="name">— ${r.name}</span>
              <meta itemprop="datePublished" content="${r.date||'2025-01-01'}">
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  const finalSection = landing.querySelector('.landing-final');
  if (finalSection) finalSection.before(sec);
  else landing.appendChild(sec);

  // Inject Google Schema
  const schema = {
    '@context':'https://schema.org','@type':'SoftwareApplication',name:'TeenWork',
    applicationCategory:'BusinessApplication',
    aggregateRating:{'@type':'AggregateRating',ratingValue:String(avg),reviewCount:String(reviews.length),bestRating:'5',worstRating:'1'},
    review:reviews.slice(0,10).map(r=>({'@type':'Review',author:{'@type':'Person',name:r.name},reviewRating:{'@type':'Rating',ratingValue:String(r.rating||5),bestRating:'5'},reviewBody:r.body,datePublished:r.date||'2025-01-01'}))
  };
  let sel = document.getElementById('v14-review-schema');
  if (!sel){ sel=document.createElement('script');sel.type='application/ld+json';sel.id='v14-review-schema';document.head.appendChild(sel); }
  sel.textContent = JSON.stringify(schema);
}

/* ══════════════════════
   9. TOUR — clean overlay, no weird positioning
══════════════════════ */
const V14_TOUR = {
  teen: [
    { icon:'👋', title:'Welcome to TeenWork!', body:'Let\'s take a quick 6-step tour so you know where everything is. You can skip anytime.' },
    { target:'#ttab-browse, .browse-card, .filters-bar', icon:'🔍', title:'Browse Local Jobs', body:'This is the Jobs tab — scroll through real listings near you, filtered for your age. Tap any job to apply.' },
    { target:'.stat-card:first-child, .stats-row', icon:'📊', title:'Your Stats', body:'Your earnings, hours worked, star rating, and streak are always visible here at the top.' },
    { target:'#mobileNav, .grp-tabs', icon:'💼', title:'Work Button', body:'Tap Work to access your Hours Log, Calendar, App Tracker, Earnings, and Savings Goals — all in one place.' },
    { target:'#ttab-ai, .lessons-grid, #lessons-grid', icon:'📚', title:'Lessons & AI Coach', body:'Learn professional skills and earn XP. Your AI Coach can help write cover letters, prep for interviews, and explain your rights.' },
    { target:'.dash-header h1, .dashboard', icon:'🎉', title:'You\'re All Set!', body:'Explore freely — every section has help and AI tools nearby. Good luck finding your first job! 💚' },
  ],
  parent: [
    { icon:'👪', title:'Parent Dashboard Tour', body:'Welcome! This is your oversight center. Let\'s show you the key features in 4 quick steps.' },
    { target:'#ptab-approvals, .tab-panel.active', icon:'✅', title:'Approve Applications', body:'When your teen applies to a job, it shows up here. Review the employer\'s AI safety report before approving.' },
    { target:'#ptab-controls', icon:'🛡', title:'Parental Controls', body:'Set weekly hour limits, block certain transport types, and get real-time safety alerts if anything looks off.' },
    { icon:'✨', title:'You\'re Ready!', body:'TeenWork keeps your teen safe while giving them independence to build real work experience. You\'ve got this! 💚' },
  ],
  employer: [
    { icon:'🏢', title:'Employer Dashboard Tour', body:'Welcome! Here\'s a quick 4-step overview of your hiring tools.' },
    { target:'#etab-post, .post-form', icon:'📋', title:'Post a Job', body:'Fill in the details — our AI checks every post for child labor law compliance before it goes live.' },
    { target:'#emp-kanban-board, #etab-applicants', icon:'📊', title:'Applicant Pipeline', body:'Drag applicants through stages: Applied → Reviewed → Met Them → Hired. Bulk-message everyone at once.' },
    { icon:'✅', title:'Ready to Hire!', body:'A teen’s age is self-reported. Review the application and discuss the work with the teen and their parent. Good luck! 💚' },
  ],
};

let _v14TourSteps=[], _v14TourIdx=0;

function _v14CreateTour() {
  if (document.getElementById('v14-tour-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'v14-tour-overlay';
  ov.innerHTML = `
    <div id="v14-tour-scrim"></div>
    <div id="v14-tour-hole" style="position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:none"></div>
    <div id="v14-tour-card"></div>`;
  document.body.appendChild(ov);
}

function _v14TourStep(idx) {
  const ov = document.getElementById('v14-tour-overlay');
  if (!ov) return;
  if (idx >= _v14TourSteps.length) { _v14TourEnd(); return; }
  _v14TourIdx = idx;
  ov.classList.add('on');

  const step = _v14TourSteps[idx];
  const card = document.getElementById('v14-tour-card');
  const hole = document.getElementById('v14-tour-hole');
  const total = _v14TourSteps.length;
  const isLast = idx === total - 1;

  // Find & spotlight element
  let targetEl = null;
  if (step.target) {
    const sel = step.target.split(',').map(s=>s.trim());
    for (const s of sel) { targetEl = document.querySelector(s); if(targetEl) break; }
  }

  if (targetEl) {
    targetEl.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(() => {
      const r = targetEl.getBoundingClientRect();
      const p = 8;
      hole.style.cssText = `position:fixed;left:${r.left-p}px;top:${r.top-p}px;width:${r.width+p*2}px;height:${r.height+p*2}px;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:block`;

      // Position card
      const cW = 270;
      let top, left, bottom;
      const spaceBelow = window.innerHeight - (r.bottom + p + 14);
      const spaceAbove = r.top - p - 14;

      if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
        top = r.bottom + p + 14;
        bottom = null;
      } else {
        top = null;
        bottom = window.innerHeight - (r.top - p - 14);
      }
      left = Math.max(12, Math.min(r.left - p, window.innerWidth - cW - 12));

      card.style.cssText = `max-width:${cW}px;` +
        (top !== null ? `top:${top}px;bottom:auto;` : `bottom:${bottom}px;top:auto;`) +
        `left:${left}px;right:auto;`;
      _v14TourRenderCard(card, step, idx, total, isLast);
    }, 360);
  } else {
    // No target — center the card, no hole
    hole.style.display = 'none';
    card.style.cssText = 'max-width:290px;top:50%;left:50%;transform:translate(-50%,-50%)';
    _v14TourRenderCard(card, step, idx, total, isLast);
  }
}

function _v14TourRenderCard(card, step, idx, total, isLast) {
  card.innerHTML = `
    <div class="v14-tour-step-label">Step ${idx+1} of ${total}</div>
    <div class="v14-tour-dots">${Array.from({length:total},(_,i)=>`<div class="v14-tour-dot${i<idx?' done':i===idx?' active':''}"></div>`).join('')}</div>
    <div class="v14-tour-title">${step.icon||''} ${step.title}</div>
    <div class="v14-tour-body">${step.body}</div>
    <div class="v14-tour-btns">
      ${idx > 0 ? `<button class="v14-tour-back" onclick="window._v14TourStep(${idx-1})">← Back</button>` : ''}
      <button class="v14-tour-next" onclick="${isLast ? 'window._v14TourEnd()' : `window._v14TourStep(${idx+1})`}">${isLast ? '🎉 Done!' : 'Next →'}</button>
      ${!isLast ? `<button class="v14-tour-skip" onclick="window._v14TourEnd()">Skip</button>` : ''}
    </div>`;
}

window._v14TourStep = _v14TourStep;
window._v14TourEnd = function() {
  const ov = document.getElementById('v14-tour-overlay');
  if (ov) ov.classList.remove('on');
  document.getElementById('v14-tour-hole').style.display = 'none';
  try { localStorage.setItem('tw_tour_v14_' + (window.currentUser?.email||'g'), '1'); } catch(e) {}
  if (typeof showToast === 'function') showToast('Tour complete! Explore freely 🎉', 'success');
};

window.startTour = window._startAdvancedTour = function(role) {
  role = role || window.currentUser?.type || 'teen';
  _v14TourSteps = V14_TOUR[role] || V14_TOUR.teen;
  _v14CreateTour();
  _v14TourStep(0);
};
window.tourDone = window._v14TourEnd;

// Auto-start tour on first login
const _origLD = window.launchDashboard;
window.launchDashboard = function() {
  if (_origLD) _origLD.apply(this, arguments);
  const role = window.currentUser?.type;
  if (!role || role === 'admin') return;
  const k = 'tw_tour_v14_' + (window.currentUser?.email||'g');
  if (!matchMedia('(max-width:768px)').matches && !localStorage.getItem(k)) {
    setTimeout(() => window._startAdvancedTour(role), 900);
  }
};

/* ══ BOOT ══ */
function boot() {
  _fixAuthButtons();
  _injectFeedbackFAB();
  _injectLandingReviews();

  // Re-inject when landing page opens
  const lp = document.getElementById('page-landing');
  if (lp) new MutationObserver(()=>{ if(lp.classList.contains('active')) setTimeout(_injectLandingReviews,100); }).observe(lp,{attributes:true,attributeFilter:['class']});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
