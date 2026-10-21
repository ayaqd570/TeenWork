
(function v17() {
'use strict';

/* ══════════════════════════════════════════
   v17 FIX 1: SIGN OUT — works on all dashboards
   The original signOut was sometimes un-defined when
   dashboard buttons called it. We rebind directly.
══════════════════════════════════════════ */
function _v17SignOut() {
  try {
    // Clear session state
    if (typeof resetSessionState === 'function') resetSessionState();
    window.currentUser = null;
    window.selectedType = null;
    // The app's main user variable is a script-scoped `let`; clear it too, or the previous
    // person stays "signed in" underneath the next login.
    try { currentUser = null; selectedType = null; parentVerified = false; } catch (e) {}
    // Remove any parent-link screens, banners or pop-ups left over from this session
    ['tw35-modal', 'tw35-banner', 'tw35-requests', 'tw-link-card', 'parent-lock-overlay'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
    document.body.classList.remove('tw-limited');
    // Supabase sign out
    if (window.sbClient) {
      try { window.sbClient.auth.signOut(); } catch(e) {}
    }
    // Show landing page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const landing = document.getElementById('page-landing');
    if (landing) landing.classList.add('active');
    // Hide mobile nav
    const nav = document.getElementById('mobileNav');
    if (nav) nav.style.display = 'none';
    // Show success toast
    if (typeof showToast === 'function') showToast('You have been signed out.', 'success');
  } catch(e) {
    console.warn('v17 signOut error:', e);
    window.location.reload();
  }
}
window.signOut = _v17SignOut;
window._v17SignOut = _v17SignOut;

// Rebind all sign-out buttons in DOM
function _bindSignOutButtons() {
  document.querySelectorAll('button, a').forEach(el => {
    const oc = el.getAttribute('onclick') || '';
    if (/signOut\(\)|_v16SignOut\(\)/.test(oc)) {
      el.onclick = (e) => { e.preventDefault(); _v17SignOut(); };
    }
  });
}

/* ══════════════════════════════════════════
   v17 FIX 2: SIGN UP FREE & SIGN IN BUTTONS
   Force-patch all landing buttons to call gotoPage
   directly without any stub chain issues.
══════════════════════════════════════════ */
function _bindAuthButtons() {
  document.querySelectorAll('button').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    const txt = btn.textContent.trim();
    // Never touch real form-submit buttons (the login form's "Sign In" calls doLogin()).
    if (oc.includes('doLogin') || oc.includes('doSignup')) return;
    if (oc.includes("gotoPage('signup')") || txt === 'Sign Up Free' || txt === 'Sign Up') {
      btn.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-signup')?.classList.add('active');
        window.scrollTo(0, 0);
      };
    }
    if (oc.includes("gotoPage('login')") || txt === 'Sign In') {
      btn.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-login')?.classList.add('active');
        window.scrollTo(0, 0);
      };
    }
  });
}

/* ══════════════════════════════════════════
   v17 FIX 3: MORE DRAWER — 8 buttons for teen
   Ensures the teen More drawer always has 8 items.
══════════════════════════════════════════ */
const V17_TEEN_MORE = [
  { section: 'Progress & Achievements', items: [
    { icon: '🏅', label: 'Badges',       tab: 'ttab-badges' },
    { icon: '🏆', label: 'Leaderboard',  tab: 'ttab-leaderboard' },
    { icon: '🗂️', label: 'Portfolio',    tab: 'ttab-portfolio' },
    { icon: '🛡️', label: 'Verify',       tab: 'verify' },
  ]},
  { section: 'Learning & Tools', items: [
    { icon: '📚', label: 'Lessons',       tab: 'ttab-lessons' },
    { icon: '🎯', label: 'First Job',     tab: 'ttab-firstjob' },
    { icon: '📜', label: 'Rec Letters',   tab: 'ttab-letters' },
    { icon: '💵', label: 'Wage Coach',    tab: 'ttab-ai' },
  ]},
];

function _patchMoreDrawer() {
  if (window.NAV?.teen) {
    window.NAV.teen.more = V17_TEEN_MORE;
  }
  // Also patch the openMobileMoreDrawer function if it uses hardcoded items
  const _origMore = window.openMobileMoreDrawer;
  window.openMobileMoreDrawer = function() {
    // Remove old drawer if open
    document.getElementById('mobile-more-drawer')?.remove();
    document.getElementById('mobile-more-scrim')?.remove();

    const role = window.currentUser?.type || 'teen';
    if (role !== 'teen') {
      if (_origMore) return _origMore.apply(this, arguments);
      return;
    }

    // Build 8-item drawer for teen
    const scrim = document.createElement('div');
    scrim.id = 'mobile-more-scrim';
    scrim.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.4)';
    scrim.onclick = () => { scrim.remove(); drawer.remove(); };
    document.body.appendChild(scrim);

    const drawer = document.createElement('div');
    drawer.id = 'mobile-more-drawer';
    drawer.style.cssText = 'position:fixed;bottom:72px;left:0;right:0;z-index:2001;background:var(--card);border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,.18);padding:1.2rem 1rem 1rem;max-height:70vh;overflow-y:auto;font-family:"DM Sans",sans-serif';

    let html = '<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 1rem"></div>';
    V17_TEEN_MORE.forEach(section => {
      html += `<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:8px;margin-top:4px">${section.section}</div>`;
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
      section.items.forEach(item => {
        html += `<button onclick="
          document.getElementById('mobile-more-scrim')?.remove();
          document.getElementById('mobile-more-drawer')?.remove();
          ${item.tab === 'verify' ? "if(typeof showVerifyPage==='function'){showVerifyPage();}else{if(typeof switchDashTab==='function')switchDashTab(null,'ttab-ai');}" : `if(typeof switchDashTab==='function')switchDashTab(null,'${item.tab}'); else if(typeof gotoPage==='function')gotoPage('${item.tab}');`}
        " style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s" onmouseover="this.style.borderColor='var(--green)';this.style.background='var(--green-pale)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg)'">
          <span style="font-size:1.4rem">${item.icon}</span>
          <span style="font-size:.72rem;font-weight:700;color:var(--text)">${item.label}</span>
        </button>`;
      });
      html += '</div>';
    });
    drawer.innerHTML = html;
    document.body.appendChild(drawer);
  };
}

/* ══════════════════════════════════════════
   v17 FIX 4: ENHANCED RATE APP MODAL
   More questions + AI analysis + stores reviews
══════════════════════════════════════════ */
let _v17Stars = 0, _v17Recommend = '', _v17NPS = 0, _v17FindUs = '';

function _v17BuildRatingModal() {
  if (document.getElementById('v17-enhanced-rating-modal')) return;

  const el = document.createElement('div');
  el.id = 'v17-enhanced-rating-modal';
  el.innerHTML = `
  <div id="v17-erm-card">
    <div class="v17-erm-head">
      <h3>⭐ Rate TeenWork</h3>
      <button onclick="document.getElementById('v17-enhanced-rating-modal').classList.remove('open')"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.9rem">✕</button>
    </div>
    <div class="v17-erm-body" id="v17-erm-form">
      <!-- Star Rating -->
      <div class="v17-section-label">Overall Rating *</div>
      <div class="v17-star-row" id="v17-star-row">
        ${[1,2,3,4,5].map(n=>`<span class="v17-star" data-n="${n}" onclick="window._v17SetStar(${n})">★</span>`).join('')}
      </div>
      <div id="v17-star-label" style="font-size:.78rem;color:var(--muted);margin-bottom:8px;min-height:18px"></div>

      <!-- What do you like -->
      <div class="v17-section-label">What do you like? (pick any)</div>
      <div class="v17-cat-grid">
        ${['Easy to use','Jobs near me','Safety features','Parent tools','AI tools','Lessons','Earnings tracker','Clean design'].map(c=>`<button class="v17-cat-btn" onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>

      <!-- Would you recommend -->
      <div class="v17-section-label">Would you recommend TeenWork to a friend?</div>
      <div class="v17-radio-row" id="v17-recommend-row">
        ${['Definitely yes','Probably','Not sure','Probably not','No'].map(r=>`<button class="v17-radio-btn" onclick="window._v17SetRecommend('${r}',this)">${r}</button>`).join('')}
      </div>

      <!-- NPS 0–10 -->
      <div class="v17-section-label">How likely are you to recommend us? (0 = not likely, 10 = extremely)</div>
      <div class="v17-scale-row" id="v17-nps-row">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="v17-scale-btn" onclick="window._v17SetNPS(${n},this)">${n}</button>`).join('')}
      </div>

      <!-- What could be improved -->
      <div class="v17-section-label">What could be improved?</div>
      <div class="v17-cat-grid" id="v17-improve-grid">
        ${['More jobs','Better pay filters','Faster loading','More safety info','Parent controls','AI answers','Notifications','Bug fixes'].map(c=>`<button class="v17-cat-btn" data-improve onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>

      <!-- How did you find us -->
      <div class="v17-section-label">How did you find TeenWork?</div>
      <div class="v17-radio-row" id="v17-findus-row">
        ${['Friend/family','Social media','School','Google','App store','Other'].map(r=>`<button class="v17-radio-btn" data-findus onclick="window._v17SetFindUs('${r}',this)">${r}</button>`).join('')}
      </div>

      <!-- Open comment -->
      <div class="v17-section-label">Anything else? Ideas, bugs, praise…</div>
      <textarea id="v17-erm-text" class="v17-erm-textarea" placeholder="Tell us anything — we read every review!"></textarea>

      <div class="v17-submit-row">
        <button onclick="window._v17SubmitEnhancedReview()" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:13px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(45,106,79,0.3);letter-spacing:.2px">Submit Review ⭐</button>
        <button onclick="document.getElementById('v17-enhanced-rating-modal').classList.remove('open')" style="padding:13px 16px;border-radius:10px;border:1.5px solid #cce8d4;background:#f8fdf9;font-family:'DM Sans',sans-serif;font-size:.9rem;cursor:pointer;color:#2d6a4f;font-weight:600">Skip</button>
      </div>
    </div>
    <div id="v17-erm-thanks" style="display:none;text-align:center;padding:2.5rem 1.5rem">
      <div style="font-size:3rem;margin-bottom:.8rem">🎉</div>
      <div style="font-family:'Fraunces',serif;font-size:1.3rem;color:var(--green);font-weight:700;margin-bottom:.5rem">Thank you!</div>
      <div style="font-size:.88rem;color:var(--muted);line-height:1.6">Your review has been saved and sent to the team. We appreciate your feedback!</div>
    </div>
  </div>`;
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  document.body.appendChild(el);
}

const _STAR_LABELS = ['','😟 Very poor','😕 Poor','😐 OK','😊 Good','🤩 Excellent!'];
window._v17SetStar = function(n) {
  _v17Stars = n;
  document.querySelectorAll('.v17-star').forEach((s,i) => s.classList.toggle('lit', i < n));
  const lbl = document.getElementById('v17-star-label');
  if (lbl) lbl.textContent = _STAR_LABELS[n] || '';
};
window._v17SetRecommend = function(val, btn) {
  _v17Recommend = val;
  document.querySelectorAll('#v17-recommend-row .v17-radio-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
};
window._v17SetNPS = function(val, btn) {
  _v17NPS = val;
  document.querySelectorAll('#v17-nps-row .v17-scale-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
};
window._v17SetFindUs = function(val, btn) {
  _v17FindUs = val;
  document.querySelectorAll('#v17-findus-row .v17-radio-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
};

window._v17SubmitEnhancedReview = async function() {
  if (!_v17Stars) {
    if (typeof showToast === 'function') showToast('Please pick a star rating first', 'info');
    return;
  }
  const cats = Array.from(document.querySelectorAll('.v17-cat-btn.active:not([data-improve])')).map(b => b.textContent);
  const improvements = Array.from(document.querySelectorAll('[data-improve].active')).map(b => b.textContent);
  const text = document.getElementById('v17-erm-text')?.value.trim() || '';
  const role = window.currentUser?.type || 'visitor';
  const name = window.currentUser?.name || 'Anonymous';

  const review = {
    name, rating: _v17Stars, categories: cats, improvements,
    recommend: _v17Recommend, nps: _v17NPS, findUs: _v17FindUs,
    body: text || (cats.length ? 'Liked: ' + cats.join(', ') : 'No comment'),
    date: new Date().toISOString().slice(0,10),
    dateTime: new Date().toISOString(),
    userType: role, source: 'v17-enhanced-review'
  };

  // Save to localStorage (accessible by admin and user)
  try {
    const rs = JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]');
    rs.unshift(review);
    localStorage.setItem('tw_v17_reviews', JSON.stringify(rs.slice(0, 300)));
    // Also save in old key for compatibility
    const rs2 = JSON.parse(localStorage.getItem('tw_v14_reviews') || '[]');
    rs2.unshift(review);
    localStorage.setItem('tw_v14_reviews', JSON.stringify(rs2.slice(0, 300)));
  } catch(e) {}

  // Send to admin support log
  if (typeof _adminSaveSupportMessage === 'function') {
    _adminSaveSupportMessage({
      name, context: `⭐ v17 Review (${_v17Stars}/5 stars, NPS:${_v17NPS}, ${role})`,
      body: `Rating: ${_v17Stars}/5\nNPS: ${_v17NPS}/10\nRecommend: ${_v17Recommend}\nFound us via: ${_v17FindUs}\nLiked: ${cats.join(', ') || 'none'}\nImprove: ${improvements.join(', ') || 'none'}\nComment: ${text || 'none'}`,
      email: window.currentUser?.email || 'anonymous', userType: role, time: new Date().toISOString()
    });
  }

  // Generate AI report for admin (fire-and-forget)
  _v17GenerateAIReport(review);

  // Show thanks
  document.getElementById('v17-erm-form').style.display = 'none';
  document.getElementById('v17-erm-thanks').style.display = 'block';
  setTimeout(() => {
    document.getElementById('v17-enhanced-rating-modal')?.classList.remove('open');
    setTimeout(() => {
      document.getElementById('v17-erm-form').style.display = '';
      document.getElementById('v17-erm-thanks').style.display = 'none';
      _v17Stars = 0; _v17Recommend = ''; _v17NPS = 0; _v17FindUs = '';
      document.querySelectorAll('.v17-star').forEach(s => s.classList.remove('lit'));
      document.querySelectorAll('.v17-cat-btn,.v17-radio-btn,.v17-scale-btn').forEach(b => b.classList.remove('active','sel'));
      const txt = document.getElementById('v17-erm-text'); if (txt) txt.value = '';
    }, 500);
  }, 2200);

  if (typeof showToast === 'function') showToast(`Thanks for your ${_v17Stars}⭐ review!`, 'success');
};

async function _v17GenerateAIReport(review) {
  try {
    const allReviews = JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]');
    if (allReviews.length < 1) return;
    const avgRating = (allReviews.reduce((s,r) => s + (r.rating||0), 0) / allReviews.length).toFixed(1);
    const catCounts = {};
    allReviews.forEach(r => (r.categories||[]).forEach(c => { catCounts[c] = (catCounts[c]||0)+1; }));
    const topCats = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k]) => k).join(', ');

    const prompt = `You are an analytics AI for TeenWork, a safe teen job platform. Here is a recent user review and stats. Write a brief 3-4 sentence insight report for the admin team.

Review: ${review.rating}/5 stars | NPS: ${review.nps}/10 | Recommend: ${review.recommend} | Found via: ${review.findUs}
Liked: ${(review.categories||[]).join(', ')||'none'} | Improve: ${(review.improvements||[]).join(', ')||'none'}
Comment: "${review.body}"

Overall stats: ${allReviews.length} total reviews, avg ${avgRating}/5, top liked: ${topCats}

Write an admin insight report in plain text (no markdown). Be concise and actionable.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) return;
    const data = await response.json();
    const aiText = data.content?.map(c => c.text||'').join('') || '';
    if (!aiText) return;

    // Save AI report
    try {
      const reports = JSON.parse(localStorage.getItem('tw_v17_ai_reports') || '[]');
      reports.unshift({ date: new Date().toISOString(), report: aiText, reviewCount: allReviews.length, avgRating });
      localStorage.setItem('tw_v17_ai_reports', JSON.stringify(reports.slice(0, 50)));
    } catch(e) {}
  } catch(e) { /* silent */ }
}

/* ══════════════════════════════════════════
   v17 FIX 5: VIEW REVIEWS PANEL
   Both users and admin can open a reviews panel
   showing all collected reviews + AI report.
══════════════════════════════════════════ */
function _v17BuildReviewsPanel() {
  if (document.getElementById('v17-reviews-panel')) return;
  const el = document.createElement('div');
  el.id = 'v17-reviews-panel';
  el.innerHTML = `
  <div id="v17-reviews-inner">
    <div class="v17-rev-head">
      <h2>📊 All App Reviews</h2>
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open')"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.9rem">✕</button>
    </div>
    <div class="v17-rev-body" id="v17-rev-body-content">
      <p style="color:var(--muted);font-size:.85rem">Loading reviews…</p>
    </div>
  </div>`;
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  document.body.appendChild(el);
}

window._v17OpenReviews = function() {
  _v17BuildReviewsPanel();
  const panel = document.getElementById('v17-reviews-panel');
  panel.classList.add('open');

  const body = document.getElementById('v17-rev-body-content');
  const reviews = [];
  try { reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]')); } catch(e) {}
  // merge old reviews too
  try {
    const old = JSON.parse(localStorage.getItem('tw_v14_reviews') || '[]');
    old.forEach(r => { if (!reviews.find(x => x.dateTime === r.dateTime && x.name === r.name)) reviews.push(r); });
  } catch(e) {}

  if (!reviews.length) {
    body.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted)">
      <div style="font-size:2.5rem;margin-bottom:.5rem">📭</div>
      <p>No reviews yet. Be the first to rate the app!</p>
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open');window._v17OpenEnhancedRating();" style="margin-top:1rem;background:var(--green);color:#fff;border:none;padding:10px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer">⭐ Leave a Review</button>
    </div>`;
    return;
  }

  const avg = (reviews.reduce((s,r) => s+(r.rating||0), 0) / reviews.length).toFixed(1);
  const starBar = (n) => '★'.repeat(n) + '☆'.repeat(5-n);

  // AI report (admin only sees full report)
  const isAdmin = window.currentUser?.isAdmin || window.currentUser?.type === 'admin';
  const reports = [];
  try { reports.push(...JSON.parse(localStorage.getItem('tw_v17_ai_reports') || '[]')); } catch(e) {}
  const latestReport = reports[0];

  let html = `
  <div class="v17-avg-strip">
    <div>
      <div class="v17-avg-num">${avg}</div>
      <div style="font-size:.88rem;color:var(--amber)">${starBar(Math.round(parseFloat(avg)))}</div>
    </div>
    <div>
      <div style="font-size:.85rem;font-weight:700;color:var(--text)">${reviews.length} review${reviews.length!==1?'s':''}</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:2px">From real users</div>
    </div>
    <div style="margin-left:auto">
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open');window._v17OpenEnhancedRating();" style="background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer">+ Add Yours</button>
    </div>
  </div>`;

  if (isAdmin && latestReport) {
    html += `<div style="margin-bottom:1rem">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--green);margin-bottom:6px">🤖 AI Admin Report · ${latestReport.date?.slice(0,10)||''}</div>
      <div class="v17-ai-report">${latestReport.report}</div>
    </div>`;
  }

  reviews.slice(0, 50).forEach(r => {
    const stars = Math.max(1, Math.min(5, r.rating || 1));
    const cats = (r.categories || []).join(', ');
    const improve = (r.improvements || []).join(', ');
    html += `<div class="v17-rev-card">
      <div class="v17-rev-stars">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
      <div class="v17-rev-text">"${r.body || 'No comment'}"</div>
      <div class="v17-rev-meta">
        <span><strong>${r.name || 'Anonymous'}</strong></span>
        <span>${r.userType || 'user'}</span>
        <span>${r.date || ''}</span>
        ${r.recommend ? `<span>👍 ${r.recommend}</span>` : ''}
        ${r.nps != null && r.nps !== '' ? `<span>NPS: ${r.nps}/10</span>` : ''}
      </div>
      ${cats ? `<div style="font-size:.76rem;color:var(--muted);margin-top:5px">Liked: ${cats}</div>` : ''}
      ${improve ? `<div style="font-size:.76rem;color:var(--red);margin-top:2px">Improve: ${improve}</div>` : ''}
    </div>`;
  });

  body.innerHTML = html;
};

window._v17OpenEnhancedRating = function() {
  _v17BuildRatingModal();
  _v17Stars = 0;
  document.querySelectorAll('.v17-star').forEach(s => s.classList.remove('lit'));
  const lbl = document.getElementById('v17-star-label'); if (lbl) lbl.textContent = '';
  document.getElementById('v17-enhanced-rating-modal').classList.add('open');
};

/* ══════════════════════════════════════════
   v17 FIX 6: REBUILD FABs
   Rate App: opens enhanced modal + is draggable
   Support: always visible + draggable
   Both use improved drag system with position save
══════════════════════════════════════════ */
function _v17MakeDraggable(el) {
  const THRESHOLD = 6;
  let startX, startY, startLeft, startBottom;
  el._twDragged = false;

  function getPos() {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, bottom: window.innerHeight - rect.bottom };
  }

  function onDown(cx, cy) {
    el.setAttribute('data-tw-grab', '1');
    const pos = getPos();
    startX = cx; startY = cy;
    startLeft = pos.left; startBottom = pos.bottom;
    el._twDragged = false;
    el.style.transition = 'none';
    // if the button already sits on a picture (e.g. the page was scrolled), don't trap it there
    el._twStartOnPic = !!(window.__twHitsPicture && window.__twHitsPicture(pos.left, window.innerHeight - pos.bottom - el.offsetHeight, el.offsetWidth, el.offsetHeight, 0));
  }

  function onMove(cx, cy) {
    const dx = cx - startX, dy = cy - startY;
    if (!el._twDragged && (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD)) {
      el._twDragged = true;
      el.classList.add('dragging');
    }
    if (!el._twDragged) return;
    const W = window.innerWidth, H = window.innerHeight;
    const elW = el.offsetWidth, elH = el.offsetHeight;
    let newLeft = Math.max(8, Math.min(W - elW - 8, startLeft + dx));
    let newBottom = Math.max(80, Math.min(H - elH - 8, startBottom - dy));
    // Keep-out zone: a button can be dragged anywhere EXCEPT onto a picture.
    // If the move would land on one, slide along the edge instead (or stay put).
    if (window.__twHitsPicture && !el._twStartOnPic) {
      const lastL = isFinite(parseFloat(el.style.left))   ? parseFloat(el.style.left)   : startLeft;
      const lastB = isFinite(parseFloat(el.style.bottom)) ? parseFloat(el.style.bottom) : startBottom;
      const free = (l, b) => !window.__twHitsPicture(l, H - b - elH, elW, elH, 18);
      if (!free(newLeft, newBottom)) {
        if (free(newLeft, lastB))      { newBottom = lastB; }
        else if (free(lastL, newBottom)) { newLeft = lastL; }
        else                           { newLeft = lastL; newBottom = lastB; }
      }
    }
    el.style.left = newLeft + 'px';
    el.style.bottom = newBottom + 'px';
    el.style.right = 'auto';
    el.style.top = 'auto';
  }

  function onUp() {
    el.removeAttribute('data-tw-grab');
    el.style.transition = '';
    if (el._twDragged) {
      try { localStorage.setItem('tw_v17_fab_' + el.id, JSON.stringify({ left: el.style.left, bottom: el.style.bottom })); } catch(e) {}
    }
    setTimeout(() => {
      el._twDragged = false;
      el.classList.remove('dragging');
    }, 50);
  }

  // Restore saved position
  try {
    const saved = JSON.parse(localStorage.getItem('tw_v17_fab_' + el.id) || 'null');
    if (saved) { el.style.left = saved.left; el.style.bottom = saved.bottom; el.style.right = 'auto'; el.style.top = 'auto'; }
  } catch(e) {}

  el.addEventListener('mousedown', e => {
    onDown(e.clientX, e.clientY);
    const mm = e2 => onMove(e2.clientX, e2.clientY);
    const mu = () => { onUp(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
  el.addEventListener('touchstart', e => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: true });
  el.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  el.addEventListener('touchend', onUp);
}
// Make the drag helper visible to the later patch script that re-creates the Help button
window._v17MakeDraggable = _v17MakeDraggable;

function _v17InjectFABs() {
  // Remove old FABs
  ['v16-rate-fab','v16-support-fab','v14-feedback-fab','v15-feedback-fab'].forEach(id => {
    document.getElementById(id)?.remove();
  });

  // ── Rate App FAB ──
  const rateFab = document.createElement('button');
  rateFab.innerHTML = '⭐ Rate App';
  rateFab.title = 'Rate & review TeenWork — drag to move';
  rateFab.style.cssText = `
    position:fixed; right:16px; bottom:90px; z-index:9900;
    background:linear-gradient(135deg,#3a7d5c,#52b788);
    border:2px solid rgba(255,255,255,0.35);
    border-radius:50px; padding:10px 20px; font-size:.85rem; font-weight:700;
    color:#fff; cursor:grab; box-shadow:0 4px 14px rgba(45,106,79,0.4);
    display:flex; align-items:center; gap:7px; transition:box-shadow .2s,transform .15s;
    font-family:'DM Sans',sans-serif; touch-action:none; user-select:none;
    letter-spacing:.2px;`;
  rateFab.addEventListener('click', () => {
    if (!rateFab._twDragged) {
      _v17BuildRatingModal();
      window._v17OpenEnhancedRating();
    }
  });
  document.body.appendChild(rateFab);
  _v17MakeDraggable(rateFab);

  // ── Support FAB ──
  // ── Support FAB — onclick attribute so nothing can intercept it ──
  window._twOpenSupport = function() {
    // Try the built-in modal first
    try {
      if (typeof openSupportModal === 'function') {
        openSupportModal('General Support', '');
        return;
      }
    } catch(e) {}
    // Bulletproof fallback modal
    document.getElementById('tw-sup-fallback')?.remove();
    const ov = document.createElement('div');
    ov.id = 'tw-sup-fallback';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
    ov.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:1.8rem;max-width:460px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);font-family:'DM Sans',sans-serif">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">
          <div style="width:42px;height:42px;background:#d8f3dc;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">💬</div>
          <div style="flex:1"><div style="font-size:1.05rem;font-weight:800;color:#2d6a4f">Contact Support</div><div style="font-size:.78rem;color:#888;margin-top:2px">We'll get back to you soon</div></div>
          <button onclick="document.getElementById('tw-sup-fallback').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#bbb;line-height:1;padding:4px">✕</button>
        </div>
        <textarea id="tw-sup-msg" rows="5" placeholder="Describe your issue or question…" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;resize:vertical;outline:none;box-sizing:border-box;font-family:'DM Sans',sans-serif"></textarea>
        <div style="display:flex;gap:8px;margin-top:1rem">
          <button onclick="(function(){const m=document.getElementById('tw-sup-msg')?.value||'';window.location.href='mailto:ayaquarrierdraper@gmail.com?subject=TeenWork Support&body='+encodeURIComponent(m);document.getElementById('tw-sup-fallback').remove();})()" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:12px;border-radius:10px;font-size:.9rem;font-weight:700;cursor:pointer">📨 Send to Support</button>
          <button onclick="document.getElementById('tw-sup-fallback').remove()" style="padding:12px 16px;border-radius:10px;border:1.5px solid #ddd;background:#f5f5f5;font-size:.9rem;cursor:pointer;color:#888">Cancel</button>
        </div>
        <p style="font-size:.72rem;color:#9ca3af;margin-top:.8rem;text-align:center">Your message goes directly to the TeenWork admin team</p>
      </div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };

  const supFab = document.createElement('button');
  supFab.id = 'v17-support-fab';
  supFab.className = 'v16-fab';
  supFab.innerHTML = '💬 Help & Support';
  supFab.title = 'Contact support — drag to move';
  supFab.style.cssText = `
    position:fixed; right:16px; bottom:148px; z-index:9900;
    background:#fff; border:2px solid #2d6a4f;
    border-radius:50px; padding:10px 18px; font-size:.85rem; font-weight:700;
    color:#2d6a4f; cursor:grab; box-shadow:0 4px 14px rgba(45,106,79,.2);
    display:flex; align-items:center; gap:6px; transition:box-shadow .2s;
    font-family:'DM Sans',sans-serif; touch-action:none; user-select:none;`;
  /* Touch tap detection — bypasses _twDragged timing race */
  var _supTouchT=0, _supTouchX=0, _supTouchY=0;
  supFab.addEventListener('touchstart', function(e){
    _supTouchT=Date.now(); _supTouchX=e.touches[0].clientX; _supTouchY=e.touches[0].clientY;
  },{passive:true});
  supFab.addEventListener('touchend', function(e){
    var dt=Date.now()-_supTouchT, dx=Math.abs(e.changedTouches[0].clientX-_supTouchX), dy=Math.abs(e.changedTouches[0].clientY-_supTouchY);
    if(dt<250&&dx<10&&dy<10){ e.preventDefault(); openSupportModal('General Support',''); }
  },{passive:false});
  supFab.addEventListener('click', function(){
    if(!supFab._twDragged) openSupportModal('General Support','');
  });
  document.body.appendChild(supFab);
  _v17MakeDraggable(supFab);

  // Also add "View Reviews" button to admin dashboard if present
  _v17AddViewReviewsToAdmin();
}

function _v17AddViewReviewsToAdmin() {
  // Inject a "View Reviews" option into the admin panel (if present) and into the review FAB
  const adminPanels = document.querySelectorAll('#admin-dashboard, #page-admin, .admin-panel');
  adminPanels.forEach(panel => {
    if (!panel.querySelector('.v17-view-reviews-btn')) {
      const btn = document.createElement('button');
      btn.className = 'v17-view-reviews-btn';
      btn.textContent = '📊 View All Reviews';
      btn.style.cssText = 'background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:"DM Sans",sans-serif;font-weight:700;cursor:pointer;margin:8px 4px;font-size:.85rem';
      btn.onclick = () => window._v17OpenReviews();
      panel.prepend(btn);
    }
  });
}

/* ══════════════════════════════════════════
   v17 BOOT: Patch Rate App FAB to use new modal,
   add View Reviews link, fix sign-out, fix auth buttons
══════════════════════════════════════════ */
function bootV17() {
  _v17BuildRatingModal();
  _v17BuildReviewsPanel();
  _v17InjectFABs();
  _bindSignOutButtons();
  _bindAuthButtons();
  _patchMoreDrawer();

  // Patch the old v16 Rate App FAB click (if it survived) to use new modal
  window._v16OpenFeedback = window._v17OpenEnhancedRating;

  // Add "View Reviews" to the Rate FAB long-hold (right-click context)
  setTimeout(() => {
    const rateFab = document.getElementById('v17-rate-fab');
    if (rateFab) {
      rateFab.addEventListener('contextmenu', e => {
        e.preventDefault();
        window._v17OpenReviews();
      });
      rateFab.title = 'Click: Rate App | Right-click or drag to view reviews';
    }
  }, 500);

  // Re-bind sign-out whenever dashboard renders (in case DOM changes)
  const _origLaunch = window.launchDashboard;
  if (_origLaunch) {
    window.launchDashboard = function() {
      const result = _origLaunch.apply(this, arguments);
      setTimeout(_bindSignOutButtons, 300);
      return result;
    };
  }

  // Also add "See All Reviews" button near the Rate FAB's label
  // and patch the admin panel support messages to include AI report link
  setTimeout(() => {
    _v17AddViewReviewsToAdmin();
    // Check if admin panel has messages list, add review section
    const supportList = document.getElementById('admin-support-list') || document.getElementById('admin-messages-list');
    if (supportList && !document.getElementById('v17-admin-reviews-btn')) {
      const wrap = document.createElement('div');
      wrap.id = 'v17-admin-reviews-btn';
      wrap.style.cssText = 'padding:8px 0;margin-bottom:12px';
      wrap.innerHTML = `<button onclick="window._v17OpenReviews()" style="background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.85rem;margin-right:8px">📊 View All App Reviews</button>
      <button onclick="window._v17GenerateAdminReport()" style="background:var(--blue);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.85rem">🤖 Generate AI Report</button>`;
      supportList.before(wrap);
    }
  }, 1500);
}

window._v17GenerateAdminReport = async function() {
  if (typeof showToast === 'function') showToast('🤖 Generating AI report…', 'info');
  const reviews = [];
  try { reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]')); } catch(e) {}
  if (!reviews.length) { if (typeof showToast === 'function') showToast('No reviews to analyze yet', 'info'); return; }
  await _v17GenerateAIReport(reviews[0]);
  if (typeof showToast === 'function') showToast('✅ AI report generated! Open View Reviews to see it.', 'success');
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV17);
else bootV17();

})();
