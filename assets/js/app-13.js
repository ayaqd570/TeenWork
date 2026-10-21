
(function v16() {
'use strict';

/* ══════════════════════════════════════════════════════
   CORE NAV FIX — make gotoPage & signOut bulletproof
   The stub-drain system means window.gotoPage changes
   multiple times. We expose a permanent _nav() that
   ALWAYS reads window.gotoPage at call time.
══════════════════════════════════════════════════════ */
window._nav = function(page) {
  // Always grab gotoPage fresh from window to get the latest patched version
  if (typeof window.gotoPage === 'function') {
    window.gotoPage(page);
  } else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('page-' + page);
    if (pg) pg.classList.add('active');
  }
};

// Patch all sign-in/sign-up/sign-out buttons to use _nav
function _v16PatchNavButtons() {
  document.querySelectorAll('[onclick]').forEach(el => {
    const oc = el.getAttribute('onclick') || '';
    // Sign in / sign up
    const navM = oc.match(/gotoPage\(['"](\w+)['"]\)/);
    if (navM && (navM[1]==='signup' || navM[1]==='login')) {
      const target = navM[1];
      el.setAttribute('onclick', `window._nav('${target}')`);
    }
    // Sign out
    if (/signOut\(\)|doLogout\(\)/.test(oc)) {
      el.setAttribute('onclick', 'window._v16SignOut()');
    }
  });
}

// Bulletproof sign-out
window._v16SignOut = function() {
  try {
    if (window.sbClient) window.sbClient.auth.signOut();
  } catch(e) {}
  window.currentUser = null;
  window.selectedType = null;
  window.parentVerified = false;
  // The app's main user variables are script-scoped `let`s; clear them too, or the previous
  // person stays "signed in" underneath the next login.
  try { currentUser = null; selectedType = null; parentVerified = false; } catch (e) {}
  // Remove any parent-link screens, banners or pop-ups left over from this session
  ['tw35-modal', 'tw35-banner', 'tw35-requests', 'tw-link-card', 'parent-lock-overlay'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.remove();
  });
  document.body.classList.remove('tw-limited');
  const mn = document.getElementById('mobileNav');
  if (mn) mn.style.display = 'none';
  // Remove any desktop nav injected by the nav patch
  document.querySelectorAll('.grp-tabs,.subtab-row').forEach(el => el.remove());
  window._nav('landing');
};

/* ══════════════════════
   TOUR FIX — no file open, pointer-events correct
══════════════════════ */
window._v14CreateTour = function() {
  if (document.getElementById('v14-tour-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'v14-tour-overlay';
  ov.innerHTML = `
    <div id="v14-tour-scrim" style="position:fixed;inset:0;background:rgba(0,0,0,.55);pointer-events:none"></div>
    <div id="v14-tour-hole" style="position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:none"></div>
    <div id="v14-tour-card"></div>`;
  document.body.appendChild(ov);
};

/* ══════════════════════
   PLAN SELECTION — default Free, not auto-Pro
══════════════════════ */
function _v16DefaultFreePlan() {
  const freeRadio = document.querySelector('input[name="su-plan"][value="free"]');
  const proCard   = document.getElementById('su-plan-pro-card');
  const freeCard  = document.getElementById('su-plan-free-card');
  if (freeRadio) {
    freeRadio.checked = true;
    if (freeCard) freeCard.style.borderColor = 'var(--green)';
    if (proCard)  proCard.style.borderColor  = 'var(--border)';
  }
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  if (!cfg.launchPaid) {
    const notice   = document.getElementById('su-plan-notice');
    const proPrice = document.getElementById('su-plan-pro-price');
    if (proPrice) proPrice.textContent = 'FREE during early access';
    if (notice) {
      notice.style.display = 'block';
      notice.innerHTML = '🧪 <strong>TeenWork is still in testing — Pro is completely free!</strong> You\'ll get a 10-day email notice before any paid plan is ever added. No surprises, ever.';
    }
  }
}
const _sigPage = document.getElementById('page-signup');
if (_sigPage) new MutationObserver(() => {
  if (_sigPage.classList.contains('active')) setTimeout(_v16DefaultFreePlan, 80);
}).observe(_sigPage, { attributes:true, attributeFilter:['class'] });

/* ══════════════════════
   LESSONS — full grid with clickable content
══════════════════════ */
const LESSONS_DATA_V16 = [
  { id:'first_impression', icon:'🤝', title:'First Impressions', xp:20, mins:4 },
  { id:'safety',           icon:'🦺', title:'Stay Safe at Work', xp:20, mins:4 },
  { id:'communication',    icon:'💬', title:'Professional Communication', xp:20, mins:4 },
  { id:'money',            icon:'💰', title:'Your First Paycheck', xp:25, mins:5 },
  { id:'ratings',          icon:'⭐', title:'Get a 5-Star Rating', xp:20, mins:4 },
  { id:'resume',           icon:'📄', title:'Build a Teen Resume', xp:30, mins:6 },
  { id:'interview',        icon:'🎤', title:'Ace Your Interview', xp:30, mins:5 },
  { id:'conflict',         icon:'🤜', title:'Handle Conflict', xp:25, mins:5 },
  { id:'time',             icon:'⏰', title:'Time Management', xp:20, mins:4 },
  { id:'future_jobs_lor',  icon:'📜', title:'Letters of Rec', xp:25, mins:5 },
  { id:'negotiation',      icon:'💵', title:'Negotiate Your Pay', xp:30, mins:5 },
  { id:'digital',          icon:'🌐', title:'Digital Professionalism', xp:20, mins:4 },
];

const _origRL = window.renderLessonsGrid;
window.renderLessonsGrid = function() {
  if (_origRL) { try { _origRL(); } catch(e){} }
  const completed = window.userActivity?.lessonsCompleted || [];
  const lessons = (window.lessonsData?.length) ? window.lessonsData : LESSONS_DATA_V16;

  ['ai-lessons-grid','lessons-grid'].forEach(gid => {
    const grid = document.getElementById(gid);
    if (!grid || grid.querySelector('.lesson-card')) return;
    const done = completed.filter(id => lessons.find(l=>l.id===id)).length;
    grid.innerHTML = lessons.map(l => {
      const isDone = completed.includes(l.id);
      return `<div class="lesson-card${isDone?' done':''}" onclick="window.v16OpenLesson('${l.id}')" style="cursor:pointer">
        <div class="lesson-card-top">
          <div class="lesson-icon">${l.icon||'📚'}</div>
          <div>
            <div class="lesson-title">${l.title}</div>
            <div class="lesson-meta">${l.mins||4} min · ${l.xp||20} XP${isDone?' · ✓':''}</div>
          </div>
        </div>
        <div class="lesson-card-bottom">
          <span class="lesson-progress" style="color:${isDone?'var(--green)':'var(--muted)'}">${isDone?'Done':'Not started'}</span>
          <button class="lesson-btn ${isDone?'done':'start'}" onclick="window.v16OpenLesson('${l.id}');event.stopPropagation()">${isDone?'Review':'Start →'}</button>
        </div>
      </div>`;
    }).join('');
    // Update progress UI
    const pre = gid==='ai-lessons-grid' ? 'ai-' : '';
    const dc = document.getElementById(pre+'lessons-done-count');   if(dc) dc.textContent = done;
    const tc = document.getElementById(pre+'lessons-total-count');  if(tc) tc.textContent = lessons.length;
    const pb = document.getElementById(pre+'lessons-progress-bar');
    if(pb) pb.style.width = Math.round(done/lessons.length*100)+'%';
    const pl = document.getElementById(pre+'lessons-progress-label');
    if(pl) pl.textContent = done===0?'Start a lesson below!':done===lessons.length?'🎓 All done!':lessons.length-done+' left';
    const db = document.getElementById('ai-lessons-done-badge');
    if(db) db.textContent = done+' done';
  });
};

window.v16OpenLesson = function(id) {
  if (typeof window.openLesson==='function') { try { window.openLesson(id); return; } catch(e){} }
  const content = (window.LESSON_CONTENT||{})[id];
  const lesson  = LESSONS_DATA_V16.find(l=>l.id===id) || {id,title:id,icon:'📚',xp:20,mins:4};
  const isDone  = (window.userActivity?.lessonsCompleted||[]).includes(id);
  let m = document.getElementById('v16-lesson-modal');
  if (!m) { m=document.createElement('div'); m.id='v16-lesson-modal';
    m.style.cssText='display:none;position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif';
    m.onclick=e=>{if(e.target===m)m.style.display='none';}; document.body.appendChild(m); }
  let body='';
  if(content?.sections) {
    body = content.sections.map(s=>`<div style="margin-bottom:.9rem"><div style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.4px;color:var(--green);margin-bottom:.35rem">${s.title}</div><div style="font-size:.87rem;line-height:1.7;white-space:pre-wrap;color:var(--text)">${s.text}</div></div>`).join('');
    if(content.tip) body+=`<div style="background:var(--green-pale,#d1fae5);border-left:3px solid var(--green);border-radius:0 8px 8px 0;padding:10px 14px;font-size:.85rem;line-height:1.6;margin-top:.5rem">${content.tip}</div>`;
  } else { body=`<p style="color:var(--muted)">${lesson.title} — content coming soon!</p>`; }
  m.innerHTML=`<div style="background:var(--card,#fff);border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="background:var(--green);padding:1.3rem 1.5rem;border-radius:20px 20px 0 0;color:#fff;display:flex;justify-content:space-between;align-items:flex-start">
      <div><div style="font-size:1.5rem;margin-bottom:3px">${lesson.icon}</div>
        <h2 style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;margin:0 0 2px">${lesson.title}</h2>
        <div style="font-size:.78rem;opacity:.85">${lesson.mins} min · ${lesson.xp} XP · ${isDone?'✓ Done':'Not started'}</div></div>
      <button onclick="document.getElementById('v16-lesson-modal').style.display='none'" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer">✕</button>
    </div>
    <div style="padding:1.3rem 1.5rem">
      ${body}
      ${!isDone?`<div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button onclick="window.v16CompleteLesson('${id}')" style="background:var(--green);color:#fff;border:none;padding:10px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">✓ I read it — earn ${lesson.xp} XP!</button>
      </div>`:`<div style="margin-top:1rem;padding:10px 14px;background:var(--green-pale,#d1fae5);border-radius:10px;color:var(--green);font-weight:700;font-size:.87rem">✓ Completed!</div>`}
    </div></div>`;
  m.style.display='flex';
};

window.v16CompleteLesson = function(id) {
  if (!window.userActivity) window.userActivity={};
  if (!window.userActivity.lessonsCompleted) window.userActivity.lessonsCompleted=[];
  if (!window.userActivity.lessonsCompleted.includes(id)) {
    window.userActivity.lessonsCompleted.push(id);
    const l = LESSONS_DATA_V16.find(x=>x.id===id);
    if (window.teenGameState) window.teenGameState.points=(window.teenGameState.points||0)+(l?.xp||20);
    if (typeof awardBadge==='function') awardBadge('lesson_1');
    try { localStorage.setItem('tw_lessons_completed', String(window.userActivity.lessonsCompleted.length)); } catch(e){}
  }
  document.getElementById('v16-lesson-modal').style.display='none';
  if (typeof showToast==='function') { const l=LESSONS_DATA_V16.find(x=>x.id===id); showToast(`✅ +${l?.xp||20} XP!`,'success'); }
  setTimeout(window.renderLessonsGrid, 150);
};

/* ══════════════════════
   MORE DRAWER — slim to 5 items max
══════════════════════ */
if (window.NAV?.teen) {
  window.NAV.teen.more = [
    { section:'More Features', items:[
      { icon:'🏅', label:'Badges',      tab:'ttab-badges' },
      { icon:'🗂️', label:'Portfolio',   tab:'ttab-portfolio' },
      { icon:'📜', label:'Rec Letters', tab:'ttab-letters' },
      { icon:'🎯', label:'First Job',   tab:'ttab-firstjob' },
      { icon:'🛡️', label:'Verify',      tab:'verify' },
    ]},
  ];
}

/* ══════════════════════
   DRAGGABLE FABs — Rate App + Support
   Both are draggable on mouse and touch.
   A click-vs-drag threshold prevents accidental navigation.
══════════════════════ */
function _makeDraggable(el) {
  let startX, startY, startLeft, startBottom, dragged=false;
  const DRAG_THRESHOLD = 6;

  function onDown(clientX, clientY) {
    const rect = el.getBoundingClientRect();
    startX = clientX; startY = clientY;
    startLeft = rect.left;
    startBottom = window.innerHeight - rect.bottom;
    dragged = false;
    el.classList.add('dragging');
    el.style.transition = 'none';
  }
  function onMove(clientX, clientY) {
    const dx = clientX - startX, dy = clientY - startY;
    if (!dragged && (Math.abs(dx)>DRAG_THRESHOLD || Math.abs(dy)>DRAG_THRESHOLD)) dragged=true;
    if (!dragged) return;
    const newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth - 8, startLeft + dx));
    const newBottom = Math.max(72, Math.min(window.innerHeight - el.offsetHeight - 8, startBottom - dy));
    el.style.left   = newLeft + 'px';
    el.style.bottom = newBottom + 'px';
    el.style.right  = 'auto';
    el.style.top    = 'auto';
  }
  function onUp() {
    el.classList.remove('dragging');
    el.style.transition = '';
    // Save position
    try { localStorage.setItem('tw_fab_'+el.id, JSON.stringify({left:el.style.left,bottom:el.style.bottom})); } catch(e){}
  }
  // Restore saved position
  try {
    const saved = JSON.parse(localStorage.getItem('tw_fab_'+el.id)||'null');
    if (saved) { el.style.left=saved.left; el.style.bottom=saved.bottom; el.style.right='auto'; }
  } catch(e){}

  // Mouse events
  el.addEventListener('mousedown', e => { e.preventDefault(); onDown(e.clientX, e.clientY);
    function mm(e){ onMove(e.clientX, e.clientY); }
    function mu(){ onUp(); document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); }
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  });
  // Touch events
  el.addEventListener('touchstart', e => { const t=e.touches[0]; onDown(t.clientX, t.clientY); }, {passive:true});
  el.addEventListener('touchmove',  e => { const t=e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, {passive:false});
  el.addEventListener('touchend', onUp);

  // Intercept click — only fire if not dragged
  el.addEventListener('click', e => { if (dragged) { dragged=false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}

function _v16InjectFABs() {
  // Remove old FABs
  ['v14-feedback-fab','v15-feedback-fab','v16-rate-fab','v16-support-fab'].forEach(id => document.getElementById(id)?.remove());

  // Rate App FAB
  const rateFab = document.createElement('button');
  rateFab.id = 'v16-rate-fab';
  rateFab.className = 'v16-fab';
  rateFab.innerHTML = '⭐ Rate App';
  rateFab.title = 'Rate & review TeenWork';
  rateFab.addEventListener('click', () => { if (!rateFab.classList.contains('dragging')) _v16OpenFeedback(); });
  document.body.appendChild(rateFab);
  _makeDraggable(rateFab);

  // Support FAB
  const supFab = document.createElement('button');
  supFab.id = 'v16-support-fab';
  supFab.className = 'v16-fab';
  supFab.innerHTML = '🆘 Support';
  supFab.title = 'Contact support';
  supFab.addEventListener('click', () => { if (!supFab.classList.contains('dragging')) {
    if (typeof openSupportModal==='function') openSupportModal('General','');
    else if (window._v16OpenFeedback) _v16OpenFeedback('support');
  }});
  document.body.appendChild(supFab);
  _makeDraggable(supFab);

  // Build feedback modal (if not already there)
  if (!document.getElementById('v16-feedback-modal')) {
    const modal = document.createElement('div');
    modal.id='v16-feedback-modal';
    modal.innerHTML=`<div id="v16-feedback-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div><div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:700;color:var(--green)">⭐ Rate TeenWork</div>
          <div style="font-size:.78rem;color:var(--muted);margin-top:2px">Your feedback helps improve the app</div></div>
        <button onclick="document.getElementById('v16-feedback-modal').classList.remove('open')" style="background:none;border:none;font-size:1.2rem;color:var(--muted);cursor:pointer;padding:4px">✕</button>
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:4px">How would you rate TeenWork?</div>
      <div class="v16-star-row" id="v16-star-row">
        ${[1,2,3,4,5].map(n=>`<span class="v16-star" data-n="${n}" onclick="window._v16SetStar(${n})">★</span>`).join('')}
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:8px">What do you like? (pick any)</div>
      <div class="v16-cat-grid">
        ${['Easy to use','Jobs near me','Safety features','Parent tools','AI tools','Lessons','Earnings tracker','Clean design'].map(c=>`<button class="v16-cat-btn" onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:6px">Anything else? (optional)</div>
      <textarea id="v16-feedback-text" placeholder="Feedback, ideas, or bugs…" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.86rem;resize:vertical;min-height:68px;outline:none;background:var(--bg,#f5f0e8);color:var(--text)"></textarea>
      <div style="display:flex;gap:8px;margin-top:1rem">
        <button onclick="window._v16SubmitFeedback()" style="flex:1;background:var(--green);color:#fff;border:none;padding:11px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">Submit ★</button>
        <button onclick="document.getElementById('v16-feedback-modal').classList.remove('open')" style="background:var(--bg,#f5f0e8);border:1.5px solid var(--border);padding:11px 16px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;cursor:pointer;color:var(--muted)">Skip</button>
      </div>
      <div id="v16-feedback-ok" style="display:none;text-align:center;padding:1.5rem 0;font-size:1rem;color:var(--green);font-weight:700">🎉 Thanks for your review!</div>
    </div>`;
    document.body.appendChild(modal);
  }
}

let _v16Stars = 0;
window._v16SetStar = function(n) {
  _v16Stars = n;
  document.querySelectorAll('.v16-star').forEach((s,i) => s.classList.toggle('lit', i<n));
};

function _v16OpenFeedback() {
  _v16Stars = 0;
  document.querySelectorAll('.v16-star').forEach(s=>s.classList.remove('lit'));
  document.querySelectorAll('.v16-cat-btn').forEach(b=>b.classList.remove('active'));
  const txt = document.getElementById('v16-feedback-text'); if(txt) txt.value='';
  const ok  = document.getElementById('v16-feedback-ok');   if(ok)  ok.style.display='none';
  const card= document.getElementById('v16-feedback-card');
  if(card) Array.from(card.children).forEach(c=>c.style.display='');
  document.getElementById('v16-feedback-modal').classList.add('open');
}

window._v16SubmitFeedback = function() {
  if (!_v16Stars) { if(typeof showToast==='function') showToast('Pick a star rating','info'); return; }
  const cats = Array.from(document.querySelectorAll('.v16-cat-btn.active')).map(b=>b.textContent);
  const text = document.getElementById('v16-feedback-text')?.value.trim()||'';
  const role = window.currentUser?.type||'visitor';
  const review = { name:window.currentUser?.name||'Anonymous', rating:_v16Stars, categories:cats,
    body:text||(cats.length?'Liked: '+cats.join(', '):'No comment'),
    date:new Date().toISOString().slice(0,10), userType:role, source:'in-app-review' };
  try {
    const rs = JSON.parse(localStorage.getItem('tw_v14_reviews')||'[]');
    rs.unshift(review); localStorage.setItem('tw_v14_reviews', JSON.stringify(rs.slice(0,200)));
  } catch(e){}
  if (typeof _adminSaveSupportMessage==='function') _adminSaveSupportMessage({
    name:review.name, context:`⭐ Review (${_v16Stars}/5, ${role})`,
    body:`Rating: ${_v16Stars}/5\nLiked: ${cats.join(', ')||'none'}\n${text}`,
    email:window.currentUser?.email||'anonymous', userType:role, time:new Date().toISOString()
  });
  const card = document.getElementById('v16-feedback-card');
  if(card){ Array.from(card.children).forEach(c=>c.style.display='none'); const ok=document.getElementById('v16-feedback-ok'); if(ok) ok.style.display='block'; }
  setTimeout(()=>{ document.getElementById('v16-feedback-modal')?.classList.remove('open'); if(card) Array.from(card.children).forEach(c=>c.style.display=''); },2000);
  if(typeof showToast==='function') showToast(`Thanks for your ${_v16Stars}⭐ review!`,'success');
};

/* ══════════════════════
   BOOT v16
══════════════════════ */
function bootV16() {
  _v16PatchNavButtons();
  _v16DefaultFreePlan();
  _v16InjectFABs();
  // Patch switchDashTab to re-render lessons when AI/Lessons tab opens
  const _origSwitch = window.switchDashTab;
  window.switchDashTab = function(btn, panelId) {
    if (_origSwitch) _origSwitch(btn, panelId);
    if (panelId==='ttab-ai'||panelId==='ttab-lessons') setTimeout(window.renderLessonsGrid, 120);
  };
  // Initial lesson render after a short delay
  setTimeout(() => { if (typeof window.renderLessonsGrid==='function') window.renderLessonsGrid(); }, 600);
  // Also patch signOut to use _v16SignOut globally
  window.signOut = window._v16SignOut;
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootV16);
else bootV16();

})();
