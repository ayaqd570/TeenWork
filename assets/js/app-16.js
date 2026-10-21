
(function v18b() {
'use strict';

/* ─── helpers ─────────────────────────────────────── */
function _isPreLaunch() {
  // demo OFF = hide fake placeholder data; demo ON = show everything
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  return cfg.demoModeActive === false;
}

function _getAllRealReviews() {
  const reviews = [];
  try { reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]')); } catch(e) {}
  try {
    const old = JSON.parse(localStorage.getItem('tw_v14_reviews') || '[]');
    old.forEach(r => { if (!reviews.find(x => x.dateTime === r.dateTime && x.name === r.name)) reviews.push(r); });
  } catch(e) {}
  // Only include reviews with a real comment or high rating
  return reviews.filter(r => r.rating >= 1);
}

function _getSignupCount() {
  try { return parseInt(localStorage.getItem('tw_signup_count') || '0'); } catch(e) { return 0; }
}
function _incSignupCount() {
  try { localStorage.setItem('tw_signup_count', String(_getSignupCount() + 1)); } catch(e) {}
}

/* ─── 1. REORDER LANDING: move "Loved by" before "Ready to get started" ─── */
function _reorderLanding() {
  const shell = document.querySelector('#page-landing .landing-shell');
  if (!shell) return;

  const lovedBlock = document.getElementById('featpack-testimonials');
  const finalSection = shell.querySelector('.landing-final');

  if (lovedBlock && finalSection) {
    // Insert loved block right before the final CTA
    shell.insertBefore(lovedBlock, finalSection);
  }

  // Also move our community section (injected below) before final
  const communitySection = document.getElementById('tw-community-section');
  if (communitySection && finalSection) {
    shell.insertBefore(communitySection, finalSection);
  }
}

/* ─── 2. HIDE FAKE DATA when pre-launch ─── */
function _hideFakeDataIfPreLaunch() {
  if (!_isPreLaunch()) return;

  // Hide fake stats section (the number counters on landing)
  const statsSection = document.querySelector('#page-landing [id="stat-counter-teens"]')?.closest('section');
  if (statsSection) statsSection.style.display = 'none';

  // Hide fake "What the community says" hardcoded section
  const landingQuoteGrid = document.querySelector('#page-landing .landing-quote-grid');
  if (landingQuoteGrid) {
    const section = landingQuoteGrid.closest('section');
    if (section) section.style.display = 'none';
  }

  // Hide the featpack-testimonials section (also fake seed data)
  const lovedBlock = document.getElementById('featpack-testimonials');
  if (lovedBlock) lovedBlock.style.display = 'none';
}

/* ─── 3. BUILD real community section on landing ─── */
function _buildCommunitySection() {
  const shell = document.querySelector('#page-landing .landing-shell');
  if (!shell || document.getElementById('tw-community-section')) return;

  const section = document.createElement('section');
  section.id = 'tw-community-section';
  section.className = 'landing-section';

  shell.appendChild(section);
  _renderCommunitySection();
}

function _renderCommunitySection() {
  const section = document.getElementById('tw-community-section');
  if (!section) return;

  const reviews = _getAllRealReviews();
  const signups = _getSignupCount();
  const preLaunch = _isPreLaunch();

  if (preLaunch && reviews.length === 0) {
    // Empty state — be the first
    section.innerHTML = `
      <h2>What the community says</h2>
      <p class="sub">Be among the first to share your experience</p>
      <div id="tw-community-empty">
        <div style="font-size:2.5rem;margin-bottom:.6rem">💬</div>
        <div style="font-weight:700;color:var(--text);margin-bottom:.4rem">No reviews yet — be the first!</div>
        <p style="font-size:.84rem;line-height:1.5;max-width:320px;margin:0 auto .8rem">Sign up, use TeenWork, then leave a review from your dashboard. Reviews appear here for everyone to read.</p>
        <button onclick="document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('page-signup')?.classList.add('active');window.scrollTo(0,0)"
          style="background:var(--green);color:#fff;border:none;padding:9px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.88rem">
          🚀 Sign Up & Be the First
        </button>
      </div>`;
    return;
  }

  // We have real reviews — display them
  const avg = reviews.length ? (reviews.reduce((s,r) => s+(r.rating||0),0)/reviews.length).toFixed(1) : null;
  const shown = reviews.slice(0, 3);

  const starBar = n => '★'.repeat(Math.max(0,Math.min(5,n||0))) + '☆'.repeat(Math.max(0,5-(n||0)));
  const roleLabel = r => ({ teen:'Teen', parent:'Parent', employer:'Employer', visitor:'User' }[r] || 'User');
  const escH = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let statsHtml = '';
  if (!preLaunch || reviews.length > 0) {
    const cols = [];
    if (signups > 0) cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--green)">${signups}</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">People signed up</div></div>`);
    if (reviews.length > 0) cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--amber)">${reviews.length}</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">Reviews</div></div>`);
    if (avg) cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--green)">${avg}⭐</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">Avg rating</div></div>`);
    if (cols.length) statsHtml = `<div style="display:flex;gap:2rem;justify-content:center;margin-bottom:1.2rem;flex-wrap:wrap">${cols.join('')}</div>`;
  }

  const cardsHtml = shown.map(r => `
    <div class="tw-review-card-landing">
      <div class="tw-rc-stars">${starBar(r.rating)}</div>
      <div class="tw-rc-body">"${escH(r.body || 'No comment')}"</div>
      <div class="tw-rc-author">— ${escH(r.name || 'Anonymous')}</div>
      <div class="tw-rc-role">${roleLabel(r.userType)}</div>
    </div>`).join('');

  const seeAllBtn = reviews.length > 3
    ? `<button id="tw-see-all-reviews-btn" onclick="_twOpenAllReviews()">See all ${reviews.length} reviews →</button>`
    : '';

  section.innerHTML = `
    <h2>What the community says</h2>
    <p class="sub">${reviews.length} real review${reviews.length!==1?'s':''} from teens, parents & employers</p>
    ${statsHtml}
    <div id="tw-reviews-grid">${cardsHtml}</div>
    ${seeAllBtn}
    <div style="text-align:center;margin-top:1rem;font-size:.8rem;color:var(--muted)">
      Have an account? <button onclick="window._v17OpenEnhancedRating&&window._v17OpenEnhancedRating()" style="background:none;border:none;color:var(--green);font-weight:700;cursor:pointer;font-size:.8rem">Leave a review →</button>
    </div>`;
}

/* ─── 4. ALL REVIEWS PANEL ─── */
function _buildAllReviewsPanel() {
  if (document.getElementById('tw-all-reviews-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'tw-all-reviews-panel';
  panel.innerHTML = `
    <div id="tw-all-reviews-inner">
      <div id="tw-all-reviews-head">
        <h3>📋 All Reviews</h3>
        <button onclick="document.getElementById('tw-all-reviews-panel').classList.remove('open')"
          style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted)">✕</button>
      </div>
      <div id="tw-all-reviews-filters">
        <button class="tw-filter-btn active" data-filter="all" onclick="_twFilterReviews('all',this)">All</button>
        <button class="tw-filter-btn" data-filter="teen" onclick="_twFilterReviews('teen',this)">🧑‍💼 Teens</button>
        <button class="tw-filter-btn" data-filter="parent" onclick="_twFilterReviews('parent',this)">👪 Parents</button>
        <button class="tw-filter-btn" data-filter="employer" onclick="_twFilterReviews('employer',this)">🏢 Employers</button>
        <button class="tw-filter-btn" data-filter="5" onclick="_twFilterReviews('5',this)">⭐⭐⭐⭐⭐ 5 star</button>
        <button class="tw-filter-btn" data-filter="recent" onclick="_twFilterReviews('recent',this)">🕐 Recent</button>
      </div>
      <div id="tw-all-reviews-list"></div>
    </div>`;
  panel.addEventListener('click', e => { if (e.target === panel) panel.classList.remove('open'); });
  document.body.appendChild(panel);
}

window._twOpenAllReviews = function() {
  _buildAllReviewsPanel();
  document.getElementById('tw-all-reviews-panel').classList.add('open');
  _twFilterReviews('all', document.querySelector('[data-filter="all"]'));
};

window._twFilterReviews = function(filter, btn) {
  document.querySelectorAll('.tw-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  let reviews = _getAllRealReviews();
  if (filter === 'teen' || filter === 'parent' || filter === 'employer') {
    reviews = reviews.filter(r => r.userType === filter);
  } else if (filter === '5') {
    reviews = reviews.filter(r => r.rating === 5);
  } else if (filter === 'recent') {
    reviews = reviews.sort((a,b) => (b.dateTime||'').localeCompare(a.dateTime||'')).slice(0,20);
  }

  const escH = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const starBar = n => '★'.repeat(Math.max(0,Math.min(5,n||0))) + '☆'.repeat(Math.max(0,5-(n||0)));
  const roleLabel = r => ({ teen:'Teen', parent:'Parent', employer:'Employer', visitor:'User' }[r] || 'User');

  const list = document.getElementById('tw-all-reviews-list');
  if (!list) return;
  if (!reviews.length) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted)">No reviews match this filter.</div>`;
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div class="tw-review-card-landing">
      <div class="tw-rc-stars">${starBar(r.rating)}</div>
      <div class="tw-rc-body">"${escH(r.body || 'No comment')}"</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        <div>
          <div class="tw-rc-author">— ${escH(r.name || 'Anonymous')}</div>
          <div class="tw-rc-role">${roleLabel(r.userType)} · ${r.date || ''}</div>
        </div>
      </div>
    </div>`).join('');
};

/* ─── 5. PATCH RATE APP MODAL: add "Share with friends" section ─── */
function _v18PatchRateModalShare() {
  const modal = document.getElementById('v17-enhanced-rating-modal');
  if (!modal || modal.dataset.sharePatched) return;
  modal.dataset.sharePatched = '1';

  // Watch for modal to open and inject share section
  const obs = new MutationObserver(() => {
    const form = document.getElementById('v17-erm-form');
    if (form && !document.getElementById('v18-share-section')) {
      const shareSection = document.createElement('div');
      shareSection.id = 'v18-share-section';
      shareSection.innerHTML = `
        <div class="share-label">📣 Help spread the word!</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:8px;line-height:1.4">Share TeenWork with a friend and your quote may appear on the home page.</p>
        <button class="tw-share-btn" onclick="_twShareNative()">
          📱 Share via phone
        </button>
        <button class="tw-share-btn" onclick="_twShareCopy()">
          🔗 Copy link to share
        </button>
        <div id="v18-share-quote-wrap" style="margin-top:8px;display:none">
          <div style="font-size:.75rem;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Your shareable quote (optional)</div>
          <textarea id="v18-share-quote" placeholder="Tell friends why you love TeenWork in one sentence…"
            style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;resize:none;height:56px;outline:none;background:var(--bg);color:var(--text)"
            onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <button onclick="_twSubmitShareQuote()" style="margin-top:6px;background:var(--green);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;width:100%">
            ✅ Save Quote for Community Page
          </button>
        </div>
        <button onclick="document.getElementById('v18-share-quote-wrap').style.display=document.getElementById('v18-share-quote-wrap').style.display==='none'?'block':'none'"
          style="background:none;border:none;color:var(--green);font-size:.8rem;font-weight:600;cursor:pointer;padding:4px 0;font-family:'DM Sans',sans-serif">
          ✏️ Add a quote to the community page
        </button>`;
      form.appendChild(shareSection);
    }
  });
  obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
}

window._twShareNative = function() {
  const text = `TeenWork — safe local jobs for teens with parent oversight & AI safety. Check it out!`;
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'TeenWork', text, url }).catch(() => {});
  } else {
    _twShareCopy();
  }
};

window._twShareCopy = function() {
  const url = window.location.href;
  navigator.clipboard?.writeText(url + '\n\nTeenWork — safe local jobs for teens!')
    .then(() => { if (typeof showToast === 'function') showToast('Link copied! Share it with friends 🎉', 'success'); })
    .catch(() => { if (typeof showToast === 'function') showToast('Copy the URL from your browser bar', 'info'); });
};

window._twSubmitShareQuote = function() {
  const quote = document.getElementById('v18-share-quote')?.value.trim();
  if (!quote) { if (typeof showToast === 'function') showToast('Please write a quote first', 'info'); return; }

  const role = window.currentUser?.type || 'visitor';
  const name = window.currentUser?.name || 'Anonymous';

  // Save as a review so it appears on community page
  const review = {
    name, rating: 5,
    body: quote,
    categories: ['shared'],
    userType: role,
    date: new Date().toISOString().slice(0,10),
    dateTime: new Date().toISOString(),
    source: 'share-quote',
    recommend: 'Definitely yes'
  };
  try {
    const rs = JSON.parse(localStorage.getItem('tw_v17_reviews') || '[]');
    rs.unshift(review);
    localStorage.setItem('tw_v17_reviews', JSON.stringify(rs.slice(0,300)));
  } catch(e) {}

  // Refresh community section on landing
  _renderCommunitySection();

  if (typeof showToast === 'function') showToast('🎉 Your quote is now on the community page!', 'success');
  const wrap = document.getElementById('v18-share-quote-wrap');
  if (wrap) wrap.style.display = 'none';
  const inp = document.getElementById('v18-share-quote');
  if (inp) inp.value = '';
};

/* ─── 6. TRACK signups so the counter is real ─── */
(function _trackSignups() {
  const _origSignup = window.doSignup;
  if (!_origSignup) return;
  window.doSignup = async function() {
    const result = await _origSignup.apply(this, arguments);
    _incSignupCount();
    return result;
  };
})();

/* ─── 7. AFTER USER SUBMITS REVIEW, refresh landing community section ─── */
const _origV17SubmitB = window._v17SubmitEnhancedReview;
window._v17SubmitEnhancedReview = async function() {
  if (_origV17SubmitB) await _origV17SubmitB.apply(this, arguments);
  setTimeout(_renderCommunitySection, 2500);
};

/* ─── BOOT ─── */
function _bootV18b() {
  _buildCommunitySection();
  _hideFakeDataIfPreLaunch();

  setTimeout(() => {
    _reorderLanding();
    _v18PatchRateModalShare();
    _renderCommunitySection();

    // Also hide "Loved by" fake block if pre-launch (it uses seed data)
    if (_isPreLaunch()) {
      const loved = document.getElementById('featpack-testimonials');
      if (loved) loved.style.display = 'none';
    }
  }, 600);

  // Re-run after any nav change in case landing is revisited
  const origGoto = window.gotoPage;
  if (origGoto) {
    window.gotoPage = function(page) {
      origGoto.apply(this, arguments);
      if (page === 'landing') {
        setTimeout(() => {
          _hideFakeDataIfPreLaunch();
          _reorderLanding();
          _renderCommunitySection();
          if (_isPreLaunch()) {
            const loved = document.getElementById('featpack-testimonials');
            if (loved) loved.style.display = 'none';
          }
        }, 150);
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootV18b);
} else {
  _bootV18b();
}


})();
