
(function v18() {
'use strict';

/* ──────────────────────────────────────────────────────
   FIX 1: Review modal — "What could be improved" gets
   an "Other" button that reveals a text box
────────────────────────────────────────────────────── */
function _v18PatchImproveGrid() {
  const grid = document.getElementById('v17-improve-grid');
  if (!grid || grid.dataset.v18patched) return;
  grid.dataset.v18patched = '1';

  // Add "Other" button
  const otherBtn = document.createElement('button');
  otherBtn.className = 'v17-cat-btn';
  otherBtn.setAttribute('data-improve', '');
  otherBtn.setAttribute('data-other', '1');
  otherBtn.textContent = '✏️ Other…';
  otherBtn.onclick = function() {
    this.classList.toggle('active');
    const wrap = document.getElementById('v18-other-improve-wrap');
    if (wrap) wrap.classList.toggle('show', this.classList.contains('active'));
  };
  grid.appendChild(otherBtn);

  // Add text box below grid
  const wrap = document.createElement('div');
  wrap.id = 'v18-other-improve-wrap';
  wrap.innerHTML = '<input id="v18-other-improve-input" type="text" placeholder="Tell us what could be better…" maxlength="200">';
  grid.parentNode.insertBefore(wrap, grid.nextSibling);
}

/* ──────────────────────────────────────────────────────
   FIX 2: Review modal — "How did you find TeenWork"
   gets an "AI / ChatGPT" option added
────────────────────────────────────────────────────── */
function _v18PatchFindUsRow() {
  const row = document.getElementById('v17-findus-row');
  if (!row || row.dataset.v18patched) return;
  row.dataset.v18patched = '1';

  // Check if AI option already exists
  if (row.querySelector('[data-findus="AI"]')) return;

  const aiBtn = document.createElement('button');
  aiBtn.className = 'v17-radio-btn';
  aiBtn.setAttribute('data-findus', 'AI');
  aiBtn.textContent = '🤖 AI / ChatGPT';
  aiBtn.onclick = function() { window._v17SetFindUs('AI / ChatGPT', this); };
  row.appendChild(aiBtn);
}

/* ──────────────────────────────────────────────────────
   FIX 3: Patch _v17SubmitEnhancedReview to include
   "Other" text box content in improvements list
────────────────────────────────────────────────────── */
const _origV17Submit = window._v17SubmitEnhancedReview;
window._v17SubmitEnhancedReview = async function() {
  // Include "Other" text if filled
  const otherInput = document.getElementById('v18-other-improve-input');
  if (otherInput && otherInput.value.trim()) {
    const otherBtn = document.querySelector('[data-other="1"]');
    if (otherBtn) otherBtn.setAttribute('data-other-text', otherInput.value.trim());
  }
  // Patch improvements collector to grab other text
  const _origImprovements = Array.from(document.querySelectorAll('[data-improve].active')).map(b => {
    if (b.getAttribute('data-other') === '1') {
      const txt = b.getAttribute('data-other-text') || 'Other';
      return 'Other: ' + txt;
    }
    return b.textContent;
  });
  // Temporarily override querySelectorAll for the submit
  if (_origV17Submit) {
    // Store improvements in a temp place the original function can access
    window._v18TempImprovements = _origImprovements;
    return _origV17Submit.apply(this, arguments);
  }
};

/* ──────────────────────────────────────────────────────
   FIX 4: Support FAB — change label from 🆘 to 💬
   and make sure clicking it opens the support modal
────────────────────────────────────────────────────── */
function _v18FixSupportFAB() {
  /* intentionally empty — neutralized so it cannot overwrite FAB listeners */
}

/* ──────────────────────────────────────────────────────
   FIX 5: More drawer — consolidate teen More drawer
   to 4 broad categories (max 6 items total visible)
────────────────────────────────────────────────────── */
const V18_TEEN_MORE_CONSOLIDATED = [
  { section: '📋 Work & Jobs', items: [
    { icon: '📋', label: 'Applications', tab: 'ttab-applications' },
    { icon: '📅', label: 'Calendar',     tab: 'ttab-calendar' },
    { icon: '⏱️', label: 'Hours & Pay', tab: 'ttab-worklog' },
    { icon: '🎯', label: 'Savings',      tab: 'ttab-savings' },
  ]},
  { section: '🤖 AI & Learning', items: [
    { icon: '🤖', label: 'AI Coach',      tab: 'ttab-ai' },
    { icon: '📚', label: 'Lessons',       tab: 'ttab-lessons' },
  ]},
  { section: '👤 Profile & Progress', items: [
    { icon: '🏅', label: 'Badges',        tab: 'ttab-badges' },
    { icon: '📜', label: 'Rec Letters',   tab: 'ttab-letters' },
    { icon: '🛡️', label: 'Verify',        tab: 'verify' },
    { icon: '🗂️', label: 'Portfolio',     tab: 'ttab-portfolio' },
  ]},
];

function _v18PatchMoreDrawer() {
  if (window.NAV?.teen) {
    window.NAV.teen.more = V18_TEEN_MORE_CONSOLIDATED;
  }
  // Also patch V17_TEEN_MORE if it's used
  if (window.V17_TEEN_MORE) {
    // keep reference but use consolidated for display
    window.V17_TEEN_MORE = V18_TEEN_MORE_CONSOLIDATED;
  }

  // Override openMobileMoreDrawer to always use consolidated drawer for teens
  const _origMore = window.openMobileMoreDrawer;
  window.openMobileMoreDrawer = function() {
    const role = window.currentUser?.type || 'teen';
    document.getElementById('mobile-more-drawer')?.remove();
    document.getElementById('mobile-more-scrim')?.remove();
    document.getElementById('more-drawer')?.remove();
    document.getElementById('more-scrim')?.remove();

    if (role !== 'teen') {
      // Use existing nav system for parent/employer
      const inner = document.getElementById('mnavInner');
      if (inner) {
        const btns = inner.querySelectorAll('.mnav-btn');
        const moreBtn = Array.from(btns).find(b => b.textContent.includes('More'));
        if (moreBtn) { moreBtn.click(); return; }
      }
      if (_origMore) _origMore.apply(this, arguments);
      return;
    }

    // Build consolidated drawer for teen
    const scrim = document.createElement('div');
    scrim.id = 'mobile-more-drawer-v18-scrim';
    scrim.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.4)';
    const closeDrawer = () => { scrim.remove(); drawer.remove(); };
    scrim.onclick = closeDrawer;
    document.body.appendChild(scrim);

    const drawer = document.createElement('div');
    drawer.id = 'mobile-more-drawer';
    drawer.style.cssText = 'position:fixed;bottom:72px;left:0;right:0;z-index:2001;background:var(--card);border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,.18);padding:1.2rem 1rem 1.2rem;max-height:72vh;overflow-y:auto;font-family:"DM Sans",sans-serif';

    let html = '<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 1rem"></div>';
    V18_TEEN_MORE_CONSOLIDATED.forEach(section => {
      html += `<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:8px;margin-top:4px">${section.section}</div>`;
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">';
      section.items.forEach(item => {
        const action = item.tab === 'verify'
          ? `if(typeof showVerifyPage==='function'){showVerifyPage();}else{if(typeof switchDashTab==='function')switchDashTab(null,'ttab-ai');}`
          : `if(typeof switchDashTab==='function')switchDashTab(null,'${item.tab}');`;
        html += `<button onclick="document.getElementById('mobile-more-drawer-v18-scrim')?.remove();document.getElementById('mobile-more-drawer')?.remove();${action}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s">
          <span style="font-size:1.3rem">${item.icon}</span>
          <span style="font-size:.66rem;font-weight:700;color:var(--text);text-align:center;line-height:1.2">${item.label}</span>
        </button>`;
      });
      html += '</div>';
    });
    drawer.innerHTML = html;
    document.body.appendChild(drawer);
  };
}

/* ──────────────────────────────────────────────────────
   FIX 6: Tour button — wire correctly on all dashboards
────────────────────────────────────────────────────── */
function _v18FixTourButtons() {
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('App Tour') || (btn.getAttribute('onclick') || '').includes('tourStart')) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof tourStart === 'function') {
          tourStart(true);
        } else {
          // tourStart not loaded yet, try after a tick
          setTimeout(() => { if (typeof tourStart === 'function') tourStart(true); }, 200);
        }
      };
    }
  });
}

/* ──────────────────────────────────────────────────────
   FIX 7: Lessons buttons — smaller size, AI tab more
   prominent with a highlight banner
────────────────────────────────────────────────────── */
function _v18StyleLessons() {
  // Make lessons grid cards smaller
  const style = document.createElement('style');
  style.id = 'v18-lessons-style';
  style.textContent = `
    /* Lesson cards: the roomy layout they had in AI Coach, now in Lessons (v44) */
    #ttab-lessons .lesson-card {
      padding: 8px 10px !important;
      min-height: 0 !important;
    }
    /* AI tab — prominent section label */
    #ttab-ai > .panel:first-child .panel-head,
    .ai-tools-section .panel-head {
      background: linear-gradient(135deg, var(--blue-pale), #eff6ff) !important;
    }
    /* AI features banner above lessons on AI tab */
    #v18-ai-banner { background:linear-gradient(135deg,var(--blue),#3b82f6);color:#fff;border-radius:12px;padding:10px 14px;margin-bottom:1rem;font-size:.85rem;font-weight:600;display:flex;align-items:center;gap:10px; }
  `;
  if (!document.getElementById('v18-lessons-style')) document.head.appendChild(style);

  // Inject AI banner at top of AI tab
  setTimeout(() => {
    const aiTab = document.getElementById('ttab-ai');
    if (aiTab && !document.getElementById('v18-ai-banner')) {
      const banner = document.createElement('div');
      banner.id = 'v18-ai-banner';
      banner.innerHTML = '<span>🤖 <strong>AI Coach</strong> — ask anything, practice interviews, learn your rights and get help with pay.</span><button type="button" id="v18-ai-banner-lessons" onclick="var b=document.querySelector(\'#twm-side [data-twm=ttab-lessons]\');if(b)b.click();else if(typeof switchDashTab===\'function\')switchDashTab(null,\'ttab-lessons\')" style="margin-left:auto;flex-shrink:0;background:#fff;color:var(--blue);border:0;border-radius:8px;padding:6px 12px;font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer;white-space:nowrap">📚 Go to Lessons</button>';
      aiTab.insertBefore(banner, aiTab.firstChild);
    }
  }, 300);
}

/* ──────────────────────────────────────────────────────
   FIX 8: Lessons — clicking a lesson button opens lesson
   (ensure openLesson is called from lesson grid cards)
────────────────────────────────────────────────────── */
function _v18FixLessonClicks() {
  // Re-render lessons grid to make sure click handlers work
  setTimeout(() => {
    if (typeof renderLessonsGrid === 'function') {
      // Patch renderLessonsGrid to verify openLesson is wired
      const _orig = window.renderLessonsGrid;
      window.renderLessonsGrid = function() {
        _orig.apply(this, arguments);
        // After render, ensure all lesson-open buttons are wired
        setTimeout(() => {
          document.querySelectorAll('[onclick*="openLesson"]').forEach(el => {
            // These are already wired via onclick attr — just ensure openLesson exists
            if (typeof window.openLesson !== 'function') {
              console.warn('v18: openLesson not defined — lesson clicks may not work');
            }
          });
        }, 100);
      };
    }
  }, 500);
}

/* ──────────────────────────────────────────────────────
   FIX 9: Admin login — when admin credentials entered,
   launch admin panel (not just show error)
────────────────────────────────────────────────────── */
const _v18OrigDoLogin = window.doLogin;
window.doLogin = async function() {
  const emailEl = document.getElementById('li-email');
  const passEl  = document.getElementById('li-password');
  if (!emailEl || !passEl) { if (_v18OrigDoLogin) return _v18OrigDoLogin.apply(this, arguments); return; }
  const email = emailEl.value.trim().toLowerCase();
  const pass  = passEl.value;

  // v39: admin sign-in is handled by _twAdminLogin (salted hash, no plain-text password here)
  if (await _twAdminLogin(email, pass)) return;

  if (_v18OrigDoLogin) return _v18OrigDoLogin.apply(this, arguments);
};

/* ──────────────────────────────────────────────────────
   FIX 10: Sign-in & Sign-up "Back to home" buttons
   — wire both to go to landing page reliably
────────────────────────────────────────────────────── */
function _v18FixBackButtons() {
  // Find all "← Back to home" links/buttons on auth pages
  document.querySelectorAll('#page-login a, #page-signup a, #page-login button, #page-signup button').forEach(el => {
    const txt = (el.textContent || '').trim();
    if (txt.includes('Back to home') || txt.includes('← Back')) {
      el.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const landing = document.getElementById('page-landing');
        if (landing) landing.classList.add('active');
        window.scrollTo(0, 0);
      };
    }
    // "Create account" link on sign-in page
    if (txt === 'Create account' && el.closest('#page-login')) {
      el.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const signup = document.getElementById('page-signup');
        if (signup) signup.classList.add('active');
        window.scrollTo(0, 0);
      };
    }
  });
}

/* ──────────────────────────────────────────────────────
   FIX 11: Sign Up Free button on landing page — works
────────────────────────────────────────────────────── */
function _v18FixSignupButtons() {
  document.querySelectorAll('button').forEach(btn => {
    const txt = btn.textContent.trim();
    const oc = btn.getAttribute('onclick') || '';
    if (txt.includes("Sign Up") || txt.includes("It's Free") || oc.includes("gotoPage('signup')")) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const signup = document.getElementById('page-signup');
        if (signup) {
          signup.classList.add('active');
          window.scrollTo(0, 0);
          if (typeof window._initSignupPlan === 'function') setTimeout(window._initSignupPlan, 50);
        }
      };
    }
  });
}

/* ──────────────────────────────────────────────────────
   FIX 12: Support FAB label — not SOS, just Help
   Change 🆘 to 💬 everywhere
────────────────────────────────────────────────────── */
function _v18FixSupportLabel() {
  document.querySelectorAll('button, a').forEach(el => {
    if (el.innerHTML && el.innerHTML.includes('🆘')) {
      el.innerHTML = el.innerHTML.replace(/🆘\s*/g, '💬 ');
    }
    if (el.title && el.title.includes('SOS')) {
      el.title = el.title.replace('SOS', 'Support');
    }
  });
  // Also fix any injected FAB HTML — skip v17-support-fab to preserve its listeners
  // const supFab = ... intentionally removed to avoid stomping click handlers
  const oldFab = document.getElementById('support-fab');
  if (oldFab && oldFab.innerHTML.includes('🆘')) {
    oldFab.innerHTML = oldFab.innerHTML.replace(/🆘/g, '💬');
    if (oldFab.textContent.includes('Support')) oldFab.innerHTML = '💬 Help & Support';
  }
}

/* ──────────────────────────────────────────────────────
   FIX 13: Ensure Grok/Groq is used for AI — the
   callAI function already uses Groq API, just make sure
   the AI label in UI says "Grok AI" as requested
────────────────────────────────────────────────────── */
function _v18UpdateAILabels() {
  document.querySelectorAll('.badge').forEach(el => {
    if (el.textContent.trim() === 'Gemini AI') el.textContent = 'Grok AI';
  });
  document.querySelectorAll('[id*="ai-chat"], [class*="ai-chat"]').forEach(el => {
    // Update the Gemini badge near AI chats
    const badge = el.closest('.panel')?.querySelector('.badge-blue');
    if (badge && badge.textContent.includes('Gemini')) badge.textContent = 'Grok AI';
  });
}

/* ──────────────────────────────────────────────────────
   BOOT: Run all fixes when DOM is ready and also watch
   for rating modal opening via MutationObserver
────────────────────────────────────────────────────── */
function _v18Boot() {
  _v18FixSupportLabel();
  _v18FixTourButtons();
  _v18FixBackButtons();
  _v18FixSignupButtons();
  _v18PatchMoreDrawer();
  _v18StyleLessons();
  _v18FixLessonClicks();
  _v18UpdateAILabels();

  // Watch ONLY the rating modal for class changes — not the whole body
  const _ratingModal = document.getElementById('v17-enhanced-rating-modal');
  if (_ratingModal) {
    new MutationObserver(() => {
      if (_ratingModal.classList.contains('open')) {
        _v18PatchImproveGrid();
        _v18PatchFindUsRow();
      }
    }).observe(_ratingModal, { attributes: true, attributeFilter: ['class'] });
  }
  // Run label fix once at boot only — not on every mutation
  _v18FixSupportLabel();

  // Also patch after dashboard renders
  const _origLaunch = window.launchDashboard;
  if (_origLaunch) {
    window.launchDashboard = function() {
      const result = _origLaunch.apply(this, arguments);
      setTimeout(() => {
        _v18FixTourButtons();
        _v18FixBackButtons();
        _v18FixSupportFAB();
        _v18FixSupportLabel();
        _v18UpdateAILabels();
        _v18StyleLessons();
      }, 500);
      return result;
    };
  }

  // Fix support FAB after v17 injects it
  setTimeout(_v18FixSupportFAB, 1000);
  setTimeout(_v18FixSupportFAB, 2000);
  setTimeout(() => {
    _v18FixTourButtons();
    _v18FixBackButtons();
    _v18FixSignupButtons();
    _v18FixSupportLabel();
    _v18UpdateAILabels();
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _v18Boot);
} else {
  _v18Boot();
}

})();
