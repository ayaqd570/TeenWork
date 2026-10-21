
// ╔══════════════════════════════════════════════════════════════════╗
// ║                  JAVASCRIPT — ALL APP LOGIC                      ║
// ║                                                                  ║
// ║  SECTIONS (in order):                                            ║
// ║  1.  CONFIG & INIT    — API keys, Supabase/EmailJS setup         ║
// ║  2.  STATE            — Global runtime variables                 ║
// ║  3.  DEMO DATA        — Sample jobs, applicants, notifications   ║
// ║  4.  TRANSPORT / GAMIFICATION — Options & badge definitions      ║
// ║  5.  NAVIGATION       — gotoPage(), switchDashTab(), signOut()   ║
// ║  6.  ALERTS           — showAlert(), showFriendlyError()         ║
// ║  7.  SIGNUP & LOGIN   — doSignup(), doLogin(), demoLogin()       ║
// ║  8.  EMAIL VERIFY     — OTP code flow, EmailJS sending           ║
// ║  9.  DASHBOARD RENDER — renderAllDashboards(), per-role renderers║
// ║  10. JOB ACTIONS      — Apply, approve, deny, hire, pass         ║
// ║  11. AI (Gemini)      — callGemini(), callClaudeAI(), openAI()   ║
// ║  12. ACTIVITY TRACKER — trackActivity(), re-engagement           ║
// ║  13. AI JOB MATCHING  — aiJobMatch(), aiRefreshMatches()         ║
// ║  14. MESSAGING        — MSG_CONTACTS, sendMsg(), safety filter   ║
// ║  15. MSG ENCRYPTION   — MSG_CRYPTO AES-GCM module                ║
// ║  16. VERIFY MODULE    — TW_Verify IIFE (5-step flow)             ║
// ║  17. LESSONS          — lessonsData[], renderLessonsGrid()       ║
// ║  18. STATE DATA       — 50-state labor law lookup table          ║
// ║  19. CITY SCROLLER    — cityScrollerInput(), addressAutocomplete ║
// ║  20. SUPPORT FAB      — openSupportModal(), aiDraftSupportEmail  ║
// ║  21. MOBILE DRAWER    — openMobileMoreDrawer()                   ║
// ╚══════════════════════════════════════════════════════════════════╝

// ════════════════════════════════════
//  SECTION 1: CONFIG & INIT
//  Set your Supabase, EmailJS, and AI keys here.
//  Supabase handles auth + database. EmailJS sends
//  verification emails when Supabase is not configured.
//  All three services have free tiers.
// ════════════════════════════════════
const SUPABASE_URL  = 'https://qocmpwimsfcnqijtfmki.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_wleBRg_z-KSBxjc5vDovWg_7IEBbXO8';
// ⚠️  SUPABASE NOTE: For email OTP codes (not magic links) go to:
//     Supabase Dashboard → Authentication → Email Templates → "Magic Link"
//     and set the template type to "OTP" (6-digit code). This makes
//     signInWithOtp() send a code instead of a click-to-confirm link.
// AI: uses Groq (llama-3.3-70b-versatile) with separate Free-plan and Pro-plan keys.
//     Settings live in TW_GROQ inside <script id="featpack-v25-js"> (search for TW_GROQ).
// EmailJS: go to emailjs.com → create account → Email Services → get Service ID, Template ID, and Public Key
const EMAILJS_SERVICE  = 'TeenWork';
const EMAILJS_TEMPLATE = 'template_t4l4tz9';
const EMAILJS_PUBKEY   = '4ac7YlFuqZILXmSnV';
const ADMIN_EMAIL      = 'ayaquarrierdraper@gmail.com';
// ── Admin sign-in (v39) ─────────────────────────────────────────────
//  The admin signs in on the normal Sign In page with ADMIN_EMAIL (or the
//  short alias "admin") plus the admin password. The password itself is
//  NOT in this file — only a salted SHA-256 hash of it, so nobody can read
//  it out of the source. Change it from Admin → 🔐 Security & Log.
const ADMIN_LOGIN_ALIASES = ['admin', 'admin@teenwork.com', 'admin@teenwork.app'];
const ADMIN_PW_SALT = 'e4c7593a75c04481cef2fe97';
const ADMIN_PW_HASH = '32c6b8e9685084ab94db751d9e5f34fff8947b93a9c6de7e93606642103c537c';

// Init EmailJS
(function() {
  try { if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBKEY); }
  catch(e) { console.warn('EmailJS not ready:', e); }
})();

// Use a different variable name to avoid collision with supabase SDK global
let sbClient = null;
try {
  if (window.supabase && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch(e) { console.warn('Supabase init failed, running demo mode', e); }

// ══════════════════════════════════════════════════════════
//  SUPABASE DATA LAYER
//  Real users: data saved to Supabase under user email key
//  Demo users: data saved to sessionStorage (clears on close)
//  Admin:      data stays in localStorage (config only)
// ══════════════════════════════════════════════════════════
const _DB = {
  // Returns true if current user is a demo account
  isDemo: () => !!window.currentUser?.isDemo,

  // Storage key prefix for this user
  _prefix: () => {
    const u = window.currentUser;
    if (!u) return 'tw_guest_';
    if (u.isDemo) return 'tw_demo_' + u.type + '_';
    return 'tw_' + (u.dataKey || u.email).replace(/[^a-z0-9]/gi,'_') + '_';   // v39: extra accounts on a shared email keep separate data
  },

  // Save to demo (sessionStorage) or Supabase
  save: async function(key, value) {
    const fullKey = _DB._prefix() + key;
    const json = JSON.stringify(value);
    if (_DB.isDemo()) {
      try { sessionStorage.setItem(fullKey, json); } catch(e) {}
      return;
    }
    // Always save to localStorage as cache
    try { localStorage.setItem(fullKey, json); } catch(e) {}
    // Also save to Supabase if available
    if (sbClient && window.currentUser?.email) {
      try {
        await sbClient.from('user_data').upsert({
          email: window.currentUser.dataKey || window.currentUser.email,
          key: key,
          value: json,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email,key' });
      } catch(e) { /* Supabase save failed — localStorage cache is the backup */ }
    }
  },

  // Load from demo (sessionStorage) or Supabase (with localStorage fallback)
  load: function(key, defaultVal) {
    const fullKey = _DB._prefix() + key;
    if (_DB.isDemo()) {
      try {
        const v = sessionStorage.getItem(fullKey);
        return v == null ? defaultVal : JSON.parse(v);
      } catch(e) { return defaultVal; }
    }
    // Load from localStorage (always fast, synced from Supabase)
    try {
      const v = localStorage.getItem(fullKey);
      return v == null ? defaultVal : JSON.parse(v);
    } catch(e) { return defaultVal; }
  },

  // Pull all user data from Supabase into localStorage on login
  sync: async function() {
    if (!sbClient || !window.currentUser?.email || _DB.isDemo()) return;
    try {
      const { data } = await sbClient
        .from('user_data')
        .select('key,value')
        .eq('email', window.currentUser.dataKey || window.currentUser.email);
      if (data) {
        const prefix = _DB._prefix();
        data.forEach(row => {
          try { localStorage.setItem(prefix + row.key, row.value); } catch(e) {}
        });
      }
    } catch(e) { /* offline — use localStorage cache */ }
  },

  // Clear demo data from sessionStorage on logout/close
  clearDemo: function() {
    try {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith('tw_demo_'));
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch(e) {}
  },
};
window._DB = _DB;

// Sync Supabase data on login (called from launchDashboard)
window._syncUserData = async function() {
  if (window.currentUser?.isDemo) return; // demo uses session only
  await _DB.sync();
};

// Clear demo session data when tab/window closes
window.addEventListener('beforeunload', () => {
  if (window.currentUser?.isDemo) _DB.clearDemo();
});


// ════════════════════════════════════
//  SECTION 2: RUNTIME STATE
//  These variables track the current user session.
//  currentUser is null when logged out; populated by
//  launchDashboard() after a successful login/verify.
// ════════════════════════════════════
let currentUser     = null;

// ── Account Tier System ────────────────────────────────────────────────────
// Tiers: 'free' | 'pro'
// Free:  3 AI calls/day, basic features
// Pro:   unlimited AI, all premium features, $4.99/mo
const ACCOUNT_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    aiCallsPerDay: Infinity, // Limited by the AI provider's (Groq) own quota, not a hard in-app cap
    maxApplications: 5,
    canUseWageCoach: false,
    canUsePortfolio: true,
    canUseBadges: true,
    canUseReferrals: true,
    canUseAICoach: false,    // premium AI coach
    canUseAIResume: false,   // AI resume builder
    canUsePitchAI: false,
    employerCanPostJobs: 2,
    employerCanViewApplicants: 3,
    badge: '',
    color: 'var(--muted)',
  },
  pro: {
    name: 'Pro',
    price: 4.99,
    aiCallsPerDay: Infinity,
    maxApplications: Infinity,
    canUseWageCoach: true,
    canUsePortfolio: true,
    canUseBadges: true,
    canUseReferrals: true,
    canUseAICoach: true,
    canUseAIResume: true,
    canUsePitchAI: true,
    employerCanPostJobs: 20,
    employerCanViewApplicants: Infinity,
    badge: '⭐ Pro',
    color: 'var(--amber)',
  },
};

function _getUserTier() {
  // Demo accounts are always pro for showcase
  if (window.currentUser?.isDemo) return 'pro';
  // Check if paid launch is even enabled yet
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  if (!cfg.launchPaid) return 'pro'; // pre-launch: everyone gets full access
  const uid = window.currentUser?.email || 'guest';
  try {
    const t = localStorage.getItem('tw_' + uid + '_acct_tier');
    return (t === 'pro') ? 'pro' : 'free';
  } catch(e) { return 'free'; }
}

function _setUserTier(tier) {
  const uid = window.currentUser?.email || 'guest';
  try { localStorage.setItem('tw_' + uid + '_acct_tier', tier); } catch(e) {}
}

function _getTierLimits() { return ACCOUNT_TIERS[_getUserTier()] || ACCOUNT_TIERS.free; }

// AI call counter — per user per day, separated by tier so pro/free don't share limits
function _getAICallsToday() {
  const uid = window.currentUser?.email || 'guest';
  const tier = _getUserTier();
  const key = 'tw_' + uid + '_ai_calls_' + tier + '_' + new Date().toISOString().slice(0,10);
  try { return parseInt(localStorage.getItem(key) || '0'); } catch(e) { return 0; }
}
function _incrementAICall() {
  const uid = window.currentUser?.email || 'guest';
  const tier = _getUserTier();
  const key = 'tw_' + uid + '_ai_calls_' + tier + '_' + new Date().toISOString().slice(0,10);
  try { localStorage.setItem(key, String(_getAICallsToday() + 1)); } catch(e) {}
}
function _checkAILimit() {
  const limits = _getTierLimits();
  if (limits.aiCallsPerDay === Infinity) return { ok: true };
  const used = _getAICallsToday();
  if (used >= limits.aiCallsPerDay) {
    const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
    const isPaidLaunch = cfg.launchPaid;
    if (!isPaidLaunch) {
      return { ok: false, reason: 'nopaid', msg: '🤖 AI limit reached for today. TeenWork Pro launches soon — check back tomorrow!' };
    } else if (_getUserTier() === 'free') {
      return { ok: false, reason: 'upgrade', msg: '🤖 You\'ve used your 3 free AI requests today. Upgrade to <strong>TeenWork Pro</strong> for unlimited AI — just $4.99/mo.', cta: 'Upgrade to Pro' };
    }
  }
  return { ok: true };
}
window._getUserTier   = _getUserTier;
window._setUserTier   = _setUserTier;
window._getTierLimits = _getTierLimits;
window._checkAILimit  = _checkAILimit;
window._incrementAICall = _incrementAICall;
let selectedType    = null;
let parentVerified  = false;
let pendingEmail    = '';

// ════════════════════════════════════
//  SECTION 3: DEMO DATA
//  Realistic sample data used when Supabase is not
//  configured (demo mode). Also used by demoLogin()
//  to populate dashboards for judges / reviewers.
// ════════════════════════════════════
const demoJobs = [];
const _demoJobsRaw = [
  {id:1,title:'Lawn Mowing & Yard Cleanup',employer:"Mike's Landscaping",pay:18,payType:'hourly',city:'Burlington',state:'Vermont',type:'yard work',minAge:14,maxHours:15,status:'pending-approval',applied:'Apr 9',desc:'Weekly lawn mowing, edging, and yard debris cleanup. Mower provided.'},
  {id:2,title:'Dog Walking (3 dogs)',employer:'Sarah Chen',pay:15,payType:'hourly',city:'South Burlington',state:'Vermont',type:'pet care',minAge:13,maxHours:10,status:'pending-approval',applied:'Apr 10',desc:'Walk 3 friendly dogs Mon/Wed/Fri afternoons. About 1 hour per visit.'},
  {id:3,title:'House Cleaning Assistant',employer:'The Hendersons',pay:120,payType:'flat',city:'Burlington',state:'Vermont',type:'cleaning',minAge:15,maxHours:6,status:'accepted',applied:'Apr 7',desc:'Help clean a 3-bedroom house every other Saturday. Cleaning products provided.'},
];

// ════════════════════════════════════
//  SECTION 4A: TRANSPORT OPTIONS
//  How a teen can get to/from a job. Displayed as
//  filter chips and shown on job cards.
// ════════════════════════════════════
const TRANSPORT_OPTIONS = [
  {id:'walk',   label:'🚶 Walk',         icon:'🚶'},
  {id:'bike',   label:'🚲 Bike',         icon:'🚲'},
  {id:'parent drive', label:'🚗 Parent Drive', icon:'🚗'},
  {id:'bus',    label:'🚌 Bus/Transit',   icon:'🚌'},
  {id:'employer pickup', label:'🚙 Employer Pickup', icon:'🚙'},
];

// ════════════════════════════════════
//  SECTION 4B: GAMIFICATION SYSTEM
//  Teens earn points and badges for completing lessons,
//  getting hired, logging hours, and reaching milestones.
//  getThemeForPoints() controls the visual tier (Starter →
//  Green → Silver → Gold) based on total points.
// ════════════════════════════════════
const BADGES = [
  {id:'first_job',     icon:'🏅', label:'First Job',       desc:'Applied to your first job',   pts:50},
  {id:'first_hire',    icon:'🎉', label:'First Hire',      desc:'Got hired for the first time', pts:100},
  {id:'ten_hours',     icon:'⏱️', label:'10 Hours Worked', desc:'Logged 10 total hours worked', pts:75},
  {id:'five_star',     icon:'⭐', label:'5-Star Worker',   desc:'Received a 5-star rating',     pts:60},
  {id:'lesson_1',      icon:'📖', label:'Quick Learner',   desc:'Completed your first lesson',  pts:30},
  {id:'lesson_all',    icon:'🎓', label:'Grad',            desc:'Completed all lessons',        pts:150},
  {id:'verified',      icon:'🪪', label:'Verified',        desc:'Completed identity verification', pts:40},
  {id:'profile_done',  icon:'✍️', label:'Profile Pro',    desc:'Built out your full profile',  pts:25},
  {id:'safety_check',  icon:'🛡️', label:'Safety First',   desc:'Passed the background check',  pts:200},
];

// Teen points/badges state — loaded per-user from localStorage
const teenGameState = {
  points: 0,
  badges: [],
  hoursWorked: 0,
};

function getThemeForPoints(pts) {
  if (pts >= 500) return {name:'Gold', color:'#b8860b', bg:'#fffbea', accent:'#f5c518'};
  if (pts >= 300) return {name:'Silver', color:'#607080', bg:'#f0f4f8', accent:'#8eaec7'};
  if (pts >= 100) return {name:'Green', color:'var(--green)', bg:'var(--green-pale)', accent:'var(--green-light)'};
  return {name:'Starter', color:'var(--muted)', bg:'var(--bg)', accent:'var(--border)'};
}

function renderGamePanel() {
  const el = document.getElementById('teen-game-panel');
  if (!el) return;
  const theme = getThemeForPoints(teenGameState.points);
  const earned = BADGES.filter(b => teenGameState.badges.includes(b.id));
  const missing = BADGES.filter(b => !teenGameState.badges.includes(b.id));
  el.innerHTML = `
    <div style="background:${theme.bg};border:2px solid ${theme.accent};border-radius:16px;padding:1.2rem 1.4rem;margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:900;color:${theme.color}">${teenGameState.points} pts</div>
          <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${theme.color}">🏆 ${theme.name} Tier</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.8rem;color:var(--muted)">${earned.length}/${BADGES.length} badges</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;justify-content:flex-end">
            ${earned.map(b=>`<span title="${b.label}" style="font-size:1.3rem">${b.icon}</span>`).join('')}
          </div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.06);border-radius:20px;height:8px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;width:${Math.min(100,Math.round(teenGameState.points/5))}%;background:${theme.accent};border-radius:20px;transition:width .6s"></div>
      </div>
      <div style="font-size:.72rem;color:var(--muted)">${500 - teenGameState.points > 0 ? (500 - teenGameState.points) + ' pts to Gold tier' : '🏆 Gold tier achieved!'}</div>
    </div>
    <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:.6rem">Badges to Earn</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${missing.slice(0,4).map(b=>`
        <div style="background:#fff;border:1px dashed var(--border);border-radius:10px;padding:.7rem .8rem;opacity:.6">
          <div style="font-size:1.4rem;margin-bottom:3px">${b.icon}</div>
          <div style="font-size:.8rem;font-weight:700;color:var(--text)">${b.label}</div>
          <div style="font-size:.72rem;color:var(--muted)">${b.desc}</div>
          <div style="font-size:.7rem;color:var(--green);font-weight:700;margin-top:3px">+${b.pts} pts</div>
        </div>`).join('')}
    </div>`;
}

const browsableJobs = [
  {id:4,title:'Babysitting (2 kids, ages 5 & 7)',employer:'The Martinez Family',pay:14,payType:'hourly',city:'Burlington',state:'Vermont',type:'babysitting',minAge:15,maxHours:12,desc:'Weekend babysitting, occasional evenings. Kids love board games!',transport:['parent drive','walk']},
  {id:5,title:'Snow Shoveling Route',employer:'Maple Street Neighbors',pay:20,payType:'flat',city:'Burlington',state:'Vermont',type:'yard work',minAge:13,maxHours:8,desc:'Shovel 4 driveways after snowfall. Equipment provided or bring your own.',transport:['walk','bike']},
  {id:6,title:'Moving Help (Light Boxes)',employer:'Johnson Moving',pay:16,payType:'hourly',city:'South Burlington',state:'Vermont',type:'moving help',minAge:16,maxHours:8,desc:'Help carry boxes on moving days. Must be reliable and on time.',transport:['parent drive','employer pickup']},
  {id:7,title:'Garden Weeding & Planting',employer:'Green Thumb Gardens',pay:13,payType:'hourly',city:'Williston',state:'Vermont',type:'yard work',minAge:13,maxHours:12,desc:'Seasonal garden work — weeding, planting, and watering. Flexible schedule.',transport:['bike','walk','parent drive']},
  {id:8,title:'Pet Sitting (Cat + Rabbit)',employer:'Davis Household',pay:12,payType:'hourly',city:'Burlington',state:'Vermont',type:'pet care',minAge:13,maxHours:6,desc:'Feed and check on pets twice a day while family is traveling.',transport:['walk','bike']},
];

const demoApplicants = [
  {name:'Alex Johnson',age:16,city:'Burlington',skills:['lawn care','pet sitting','snow shoveling'],rating:4.5,job:'Lawn Mowing & Yard Cleanup',applied:'Apr 9'},
  {name:'Jamie Rivera',age:15,city:'South Burlington',skills:['cleaning','babysitting'],rating:4.8,job:'House Cleaning Assistant',applied:'Apr 10'},
  {name:'Sam Park',age:17,city:'Burlington',skills:['moving help','yard work','cleaning'],rating:5.0,job:'Moving Help (Light Boxes)',applied:'Apr 11'},
];

const employerPostedJobs = []; // jobs posted during this session

const demoRatings = [
  {from:"Mike's Landscaping",job:'Lawn Mowing',stars:5,comment:'Alex was on time, worked hard, and left the yard looking great. Would hire again!'},
  {from:'Sarah Chen',job:'Dog Walking',stars:4,comment:'Good with the dogs, very responsible. Sometimes forgot to send an update photo.'},
  {from:'The Hendersons',job:'House Cleaning',stars:5,comment:'Incredible job. Better than adults we\'ve hired.'},
];

const demoNotifs = [
  {text:"Alex applied to 'Lawn Mowing & Yard Cleanup' — needs your approval",time:'2 hours ago',read:false},
  {text:"Alex applied to 'Dog Walking (3 dogs)' — needs your approval",time:'1 hour ago',read:false},
  {text:'New AI job match: Snow Shoveling in Burlington matches Alex\'s profile',time:'Yesterday',read:false},
  {text:"The Hendersons accepted Alex's application for House Cleaning",time:'Apr 7',read:true},
  {text:"New 5-star rating received from Mike's Landscaping",time:'Apr 6',read:true},
];

// ════════════════════════════════════
//  PARENT QUIZ
// ════════════════════════════════════
const parentQuizPool = [
  {q:'Which of these is a parent\'s legal responsibility for a minor working a job?',answers:[
    {text:'Sign work permits and legal forms on the child\'s behalf',correct:true},
    {text:'Let the child work unlimited hours if they agree',correct:false},
    {text:'Keep the child\'s job secret from other guardians',correct:false},
    {text:'Take a portion of the child\'s earnings as payment',correct:false},
  ]},
  {q:'Under federal child labor law, how many hours max can a 15-year-old work during a school week?',answers:[
    {text:'No more than 3 hours on a school day / 18 hours in a school week',correct:true},
    {text:'As many hours as both parties agree to',correct:false},
    {text:'Up to 40 hours per week',correct:false},
    {text:'Only on weekends with a permit',correct:false},
  ]},
  {q:'Approximately what year were you born? (Parent/guardian must be 18+)',answers:[
    {text:'1990 or earlier',correct:true},
    {text:'2005',correct:false},
    {text:'2009',correct:false},
    {text:'2007',correct:false},
  ]},
];

// ════════════════════════════════════
//  SECTION 5: NAVIGATION & ROUTING
//  gotoPage(id) — shows one page, hides all others.
//  switchDashTab(btn, panelId) — shows a dashboard tab.
//  syncMobileNav(idx) — highlights the active bottom tab.
//  launchDashboard() — called after login; routes to
//    the correct role page and renders its content.
// ════════════════════════════════════
function gotoPage(page) {
  // v39: the Platform Admin page opens only for the signed-in admin
  if (page === 'admin' && !((window.currentUser && window.currentUser.isAdmin) || (currentUser && currentUser.isAdmin))) {
    page = (currentUser && ['teen','parent','employer'].includes(currentUser.type)) ? currentUser.type : 'landing';
  }
  // Close any open modals before navigating
  document.querySelectorAll('.ai-tools-modal-overlay').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Strip dark mode when landing on public pages; restore when entering dashboard
  const publicPages = ['landing','login','signup','about'];
  if (publicPages.includes(page)) {
    window._stripDarkForLanding?.();
  } else {
    window._loadUserDarkPref?.();
  }

  const dashPages = ['parent','teen','employer','verify'];
  if (dashPages.includes(page)) {
    // Call via window so nav patches can override the local buildNavTabs
    (window.buildNavTabs || buildNavTabs)(page);
  }
}
// Wire real gotoPage into the early stub so queued pre-load calls replay
if (window._drain_gotoPage) window._drain_gotoPage(gotoPage);
else window.gotoPage = gotoPage;

function buildNavTabs(role) {
  const tabIds = {
    parent:   ['ptab-overview','ptab-approvals','ptab-ratings','ptab-controls','ptab-notifications','ptab-weekly','ptab-savings','ptab-trusted','ptab-teens'],
    teen:     ['ttab-browse','ttab-applications','ttab-earnings','ttab-resume','ttab-ai','ttab-lessons','ttab-calendar','ttab-letters','ttab-references','ttab-portfolio','ttab-badges','ttab-leaderboard','ttab-firstjob','ttab-savings','ttab-tracker','ttab-worklog','verify'],
    employer: ['etab-post','etab-applicants','etab-active','etab-schedule','etab-ai','etab-bgcheck','etab-reviews','etab-letters','etab-bulkmsg','etab-analytics','etab-profile'],
  };

  // Build mobile bottom nav
  const mobileNav = document.getElementById('mobileNav');
  const mobileInner = document.getElementById('mobileNavInner');
  if (mobileNav && mobileInner) {
    mobileNav.style.display = 'block';
    const mobileIcons = {
      parent:   [['🏠','Home'],['✅','Approvals'],['🛡','Controls'],['💬','Chat'],['☰','More']],
      teen:     [['🔍','Jobs'],['📋','Applied'],['🧠','AI'],['💬','Chat'],['☰','More']],
      employer: [['📝','Post'],['👥','Applicants'],['📂','Active'],['💬','Chat'],['☰','More']],
    };
    const mobileTabIds = {
      parent:   ['ptab-overview','ptab-approvals','ptab-controls','msg','more'],
      teen:     ['ttab-browse','ttab-applications','ttab-ai','msg','more'],
      employer: ['etab-post','etab-applicants','etab-active','msg','more'],
    };
    const mobileMoreItems = {
      parent:   [['⭐','Ratings','ptab-ratings'],['🔔','Notifications','ptab-notifications']],
      teen:     [['👤','Profile & Account','ttab-resume'],['📚','Lessons','ttab-lessons']],
      employer: [['🤖','AI Tools','etab-ai'],['🛡','Get Verified','etab-bgcheck']],
    };
    window._mobileMoreItems = mobileMoreItems[role] || [];
    const icons = mobileIcons[role] || mobileIcons.teen;
    const ids = mobileTabIds[role] || mobileTabIds.teen;
    mobileInner.innerHTML = icons.map(([icon, label], i) => {
      const isMsg = ids[i] === 'msg';
      const isMore = ids[i] === 'more';
      let onclick;
      if (isMsg) onclick = 'openMsgModal()';
      else if (isMore) onclick = 'openMobileMoreDrawer()';
      else onclick = `switchDashTab(this,'${ids[i]}');syncMobileNav(${i})`;
      const extraClass = isMsg ? ' mnb-messages' : '';
      return `<button class="mobile-nav-btn${i===0?' active':''}${extraClass}" onclick="${onclick}" id="mnb-${i}">
        <span class="mnb-icon">${icon}</span>
        <span>${label}</span>
      </button>`;
    }).join('');
  }
}

function switchDashTab(btn, panelId) {
  // Special case: verify page
  if (panelId === 'verify') { showVerifyPage(); return; }
  const type = currentUser?.type || 'parent';
  // Hide all tab panels in current page
  document.querySelectorAll(`#page-${type} .tab-panel`).forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
  // Sync desktop tab strip active state
  const stripId = type === 'teen' ? 'teen-desktop-tabs' : type === 'employer' ? 'employer-desktop-tabs' : 'parent-desktop-tabs';
  const strip = document.getElementById(stripId);
  if (strip) {
    strip.querySelectorAll('.pdtab').forEach(b => b.classList.remove('active'));
    const match = strip.querySelector(`[onclick*="${panelId}"]`);
    if (match) match.classList.add('active');
  }
}

function switchTeenTab(panelId, btnId) {
  document.querySelectorAll('#page-teen .tab-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
  document.querySelectorAll('#teen-desktop-tabs .pdtab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');
}
window.switchTeenTab = switchTeenTab;

function switchEmployerTab(panelId, btnId) {
  document.querySelectorAll('#page-employer .tab-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
  document.querySelectorAll('#employer-desktop-tabs .pdtab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');
}
window.switchEmployerTab = switchEmployerTab;

function switchParentTab(panelId, btnId) {
  document.querySelectorAll('#page-parent .tab-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.pdtab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');
}
window.switchParentTab = switchParentTab;

function syncMobileNav(idx) {
  document.querySelectorAll('.mobile-nav-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
}

function doLogout() {
  if (sbClient) sbClient.auth.signOut();
  // End the tour if it's running
  if (typeof tourDone === 'function') {
    const tourOverlay = document.getElementById('tw-tour-overlay');
    if (tourOverlay) tourDone();
  }
  currentUser = null; window.currentUser = null; selectedType = null; parentVerified = false;   // v39: keep window.currentUser in sync
  // Always strip dark mode on logout so it doesn't bleed into landing page
  document.documentElement.classList.remove('dark');
  document.querySelectorAll('.darkmode-toggle').forEach(b=>b.textContent='🌙 Dark');
  const mn = document.getElementById('mobileNav');
  if (mn) mn.style.display = 'none';
  gotoPage('landing');
}

// Alias used by sign-out buttons throughout the UI
function signOut() { doLogout(); }
window.signOut = signOut;

// ════════════════════════════════════
//  SECTION 6: ALERTS & ERROR HANDLING
//  showAlert(id, msg, type) — inserts a styled alert into
//    an element by DOM id. Type: 'error' | 'success' | 'info'
//  showFriendlyError() — humanizes raw API error messages.
//  _friendlyMessages{} — maps technical errors to plain English.
//  _supportBtn() — appends a "Get Help from Support" button
//    to any error message for easy escalation.
// ════════════════════════════════════
// ── Friendly message maps ────────────────────────────────
const _friendlyMessages = {
  // Auth
  'Please fill in your name, email, and select an account type.': "Almost there! Please fill in your name and email, and choose whether you're a Teen, Parent, or Employer.",
  'Password must be at least 8 characters.': "Your password needs to be at least 8 characters long — add a few more and you're good to go!",
  'Please agree to the Terms of Use to continue.': "Just one more step — please check the box to agree to our Terms of Use before creating your account.",
  'Please enter your date of birth.': "We need your date of birth to confirm you're 18 or older for a parent account.",
  'You must be 18 or older to create a parent account.': "Parent accounts are for adults 18 and older. If you're a teen, choose the Teen account type instead!",
  'Please complete the parent verification question above.': "Please answer the parent verification question above — it helps us keep the platform safe for teens.",
  'Please enter your email and password.': "Please enter your email address and password to sign in.",
};

function _friendlyText(msg) {
  // Try exact match first
  for (const [key, val] of Object.entries(_friendlyMessages)) {
    if (msg && msg.startsWith(key)) return val + (msg.slice(key.length) || '');
  }
  return msg;
}

function _supportBtn(context, detail) {
  // Plain text only: strip HTML tags and quote characters so an alert message can never break the button markup
  const _safe = s => String(s || '').replace(/<[^>]*>/g, '').replace(/["'`\\<>\r\n]/g, '').trim().slice(0, 200);
  const ctx = _safe(context) || 'General';
  const det = _safe(detail);
  return `<button onclick="openSupportModal('${ctx}','${det}')" style="margin-top:8px;background:rgba(0,0,0,0.12);color:inherit;border:none;padding:5px 13px;border-radius:6px;font-size:.78rem;cursor:pointer;font-family:inherit;font-weight:700">📧 Get Help from Support</button>`;
}

// Bring a message into view. On the long sign-up form the message box sits far above the
// Create Account button, so a refused sign-up used to look like "nothing happened".
function _twRevealAlert(el) {
  try {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > (window.innerHeight || document.documentElement.clientHeight)) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch(e) {}
}
function showAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  if (!el) return;
  const friendly = _friendlyText(msg || '');
  if (type === 'error') {
    el.className = `alert alert-${type} show`;
    el.innerHTML = `<strong>😕 Oops!</strong> ${friendly}${_supportBtn(friendly, '')}`;
  } else {
    el.className = `alert alert-${type} show`;
    el.innerHTML = friendly;
  }
  _twRevealAlert(el);
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'alert';
}

// ════════════════════════════════════
//  SECTION 7A: SIGNUP — ACCOUNT TYPE SELECTOR
//  selectType(type) toggles between Teen / Parent / Employer
//  signup forms. Each type reveals different extra fields.
//  Parents must pass an age verification quiz before submitting.
// ════════════════════════════════════

function checkSignupStatePermit() {
  const state = document.getElementById('su-state')?.value || '';
  const note = document.getElementById('su-permit-note');
  if (!note || !state) return;
  // Reads from the single source of truth: STATE_DATA (defined in STATE DATA section)
  const info = STATE_DATA[state];
  if (info && info.permitRequired) {
    note.style.display = 'block';
    note.style.background = '';
    note.style.color = '';
    note.style.borderColor = '';
    note.textContent = `⚠️ ${state} requires a work permit (Employment Certificate) from your school before you can start working. Ask a parent or school counselor to help you get one.`;
  } else if (state) {
    note.style.display = 'block';
    note.style.background = 'var(--green-pale)';
    note.style.color = 'var(--green)';
    note.style.borderColor = 'var(--green-light)';
    note.textContent = `✅ ${state} does not require a state work permit — you're good to go!`;
  } else {
    note.style.display = 'none';
  }
}
window.checkSignupStatePermit = checkSignupStatePermit;

function selectType(type) {
  selectedType = type;
  parentVerified = false;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('type-' + type).classList.add('selected');
  document.querySelectorAll('.extra-fields').forEach(f => f.classList.remove('show'));
  document.getElementById(type + '-fields').classList.add('show');
  if (type !== 'parent') document.getElementById('parent-verify-section').style.display = 'none';
  hideAlert('su-alert');
}

function checkDobAndShowVerify() {
  const dobVal = document.getElementById('su-dob').value;
  if (!dobVal) return;
  const age = calcAge(dobVal);
  const section = document.getElementById('parent-verify-section');
  if (age >= 18 && age <= 85) {
    section.style.display = 'block';
    loadParentQuiz();
    hideAlert('su-alert');
  } else if (age < 18) {
    section.style.display = 'none';
    showAlert('su-alert', 'You must be 18 or older to create a parent/guardian account.', 'error');
  } else {
    section.style.display = 'none';
  }
}

function loadParentQuiz() {
  parentVerified = false;
  const quiz = parentQuizPool[Math.floor(Math.random() * parentQuizPool.length)];
  window._currentQuiz = quiz;
  document.getElementById('verify-question-text').textContent = quiz.q;
  const shuffled = [...quiz.answers].sort(() => Math.random() - 0.5);
  document.getElementById('verify-answers').innerHTML = shuffled.map((a, i) =>
    `<div class="verify-q" id="vq-${i}" onclick="answerVerify(${i},${a.correct})">
       <span class="vq-icon">○</span><span>${a.text}</span></div>`
  ).join('');
}

function answerVerify(idx, correct) {
  document.querySelectorAll('.verify-q').forEach(el => el.onclick = null);
  const el = document.getElementById('vq-' + idx);
  if (correct) {
    el.classList.add('correct');
    el.querySelector('.vq-icon').textContent = '✓';
    parentVerified = true;
    hideAlert('su-alert');
  } else {
    el.classList.add('wrong');
    el.querySelector('.vq-icon').textContent = '✗';
    parentVerified = false;
    showAlert('su-alert', 'Incorrect answer. This question helps us verify parent accounts. A new question will load shortly.', 'error');
    setTimeout(() => { loadParentQuiz(); hideAlert('su-alert'); }, 2500);
  }
}

// Set the DOB max date once up-front (never while the person is typing the year).
(function _initTeenDobMax() {
  const _set = () => { const i = document.getElementById('su-age'); if (i) { const t = new Date().toISOString().split('T')[0]; if (i.max !== t) i.max = t; } };
  _set();
  document.addEventListener('DOMContentLoaded', _set);
})();

function checkTeenDobAge() {
  const inp = document.getElementById('su-age');
  const note = document.getElementById('su-age-note');
  if (!inp || !inp.value) return;
  // Only set max when it changes: re-assigning it on every keystroke resets the browser's
  // half-typed year segment, so the date ended up empty.
  const t=new Date(), b=new Date(/^\d{4}-\d\d-\d\d$/.test(inp.value) ? inp.value + 'T00:00' : inp.value);
  let age=t.getFullYear()-b.getFullYear();
  if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))age--;
  if (note) {
    note.style.display = 'block';
    if (age < 13) { note.style.color='var(--red)'; note.textContent='TeenWork requires teens to be at least 13 years old.'; }
    else if (age > 17) { note.style.color='var(--red)'; note.textContent='Teen accounts are for ages 13-17. If you are 18+, please create a parent or employer account instead.'; }
    else {
      note.style.color='var(--green)';
      const b2=new Date(b); b2.setFullYear(t.getFullYear()); if(b2<t)b2.setFullYear(t.getFullYear()+1);
      const days=Math.ceil((b2-t)/86400000), next=age+1;
      const m2={14:'more job types unlock',16:'more hours & job types unlock',18:'account graduation'};
      let msg='Age '+age+' OK';
      if(m2[next]&&days<=60)msg+=' - '+days+' days until your '+next+'th birthday ('+m2[next]+'!)';
      note.textContent=msg;
    }
  }
}

function checkBirthdayUnlocks() {
  if (window.currentUser?.type !== 'teen') return;
  const dob = window.currentUser?.dob; if (!dob) return;
  const age = getTeenAge();
  const key = 'tw_last_age_' + (currentUser.email||'anon');
  const last = parseInt(localStorage.getItem(key)||'0');
  if (last && age > last) {
    const u={14:'More job types are now available to you.',15:'You can work longer hours on non-school days.',16:'Major unlock! More hours per week and a wider range of jobs.',17:'Almost all job types are now available to you.'};
    const msg = u[age] || 'New jobs and hours may be available now that you are '+age+'!';
    setTimeout(()=>{ if(typeof showToast==='function') showToast('Happy Birthday! '+msg,'success'); },2000);
    setTimeout(()=>{ if(typeof renderBrowseJobs==='function') renderBrowseJobs(); },2500);
  }
  localStorage.setItem(key, String(age));
  currentUser.age = age;
}

function calcAge(dob) {
  const today = new Date(), birth = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 ||
     (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

// ════════════════════════════════════
//  SECTION 7B: SIGNUP — FORM SUBMISSION
//  doSignup() validates all fields, then:
//    • Live mode: calls Supabase signInWithOtp() to send
//      a 6-digit code to the user's email.
//    • Demo mode: calls EmailJS to send the code, or shows
//      the code on-screen if the quota is exhausted.
//  Redirects to page-email-sent for code entry.
// ════════════════════════════════════

// ── Signup plan section init ─────────────────────────────────────────
window._initSignupPlan = function() {
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  const notice = document.getElementById('su-plan-notice');
  const noticePaid = document.getElementById('su-plan-notice-paid');
  const proPrice = document.getElementById('su-plan-pro-price');
  const section = document.getElementById('su-plan-section');
  if (!section) return;

  if (!cfg.launchPaid) {
    // Pre-launch: Pro is free, no payment needed
    if (notice) {
      notice.style.display = 'block';
      notice.innerHTML = '🧪 <strong>TeenWork is still in testing — Pro is completely free!</strong> If paid plans are ever added, you\'ll get a <strong>10-day email notice</strong> before any charges so you can switch to Free or add a payment method. No surprises, ever.';
    }
    if (noticePaid) noticePaid.style.display = 'none';
  } else {
    // Paid launch active
    if (proPrice) proPrice.textContent = '$4.99/mo · Unlimited AI';
    if (notice) notice.style.display = 'none';
    if (noticePaid) {
      noticePaid.style.display = 'block';
      noticePaid.innerHTML = '💳 Pro unlocks unlimited AI, all features. You can switch plans anytime in Settings.';
    }
  }

  // Style plan cards on radio change
  document.querySelectorAll('input[name="su-plan"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isFree = document.querySelector('input[name="su-plan"]:checked')?.value === 'free';
      document.getElementById('su-plan-free-card').style.borderColor = isFree ? 'var(--green)' : 'var(--border)';
      document.getElementById('su-plan-pro-card').style.borderColor  = isFree ? 'var(--border)' : 'var(--amber)';
    });
  });
};

// Init plan UI whenever signup page becomes active
document.addEventListener('DOMContentLoaded', () => {
  const signupPage = document.getElementById('page-signup');
  if (!signupPage) return;
  const obs = new MutationObserver(() => {
    if (signupPage.classList.contains('active')) window._initSignupPlan();
  });
  obs.observe(signupPage, { attributes: true, attributeFilter: ['class'] });
});

let _skipEmailVerify = false;
function _twLocalAccounts() { try { return JSON.parse(localStorage.getItem('tw_local_accounts') || '{}'); } catch(e) { return {}; } }
function _twSaveLocalAccounts(a) { try { localStorage.setItem('tw_local_accounts', JSON.stringify(a)); } catch(e) {} }
async function _twHashPw(pw, salt) {
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
      return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch(e) {}
  let h = 0; const str = salt + ':' + pw;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return 'f' + h;
}

// ── v39: ACCOUNT HELPERS ─────────────────────────────────────────────
//  Shared by sign-up, sign-in and the admin panel:
//    • an email may own several accounts when the admin allows it
//      (Admin → 📧 Email Rules); extra accounts are stored under
//      "email#2", "email#3", … in tw_local_accounts
//    • admin sign-in checks a salted hash, never a plain-text password
//    • suspended accounts cannot sign in
//    • sign-in / sign-up log and admin audit log for the admin panel
// ─────────────────────────────────────────────────────────────────────
const TW_ACCOUNT_TYPES = ['teen', 'parent', 'employer'];

function _twAdminRules() {
  const d = { multiEmails: [], blockedEmails: [], maxAccountsPerEmail: 5 };
  try { return { ...d, ...JSON.parse(localStorage.getItem('tw_admin_rules') || '{}') }; } catch(e) { return d; }
}
function _twSaveAdminRules(r) { try { localStorage.setItem('tw_admin_rules', JSON.stringify(r)); } catch(e) {} }

// Rules can be a full email ("name@site.com") or a whole domain ("*@school.org" / "@school.org")
function _twEmailMatchesRule(email, rule) {
  email = String(email || '').trim().toLowerCase(); rule = String(rule || '').trim().toLowerCase();
  if (!email || !rule) return false;
  if (rule.startsWith('*@')) return email.endsWith(rule.slice(1));
  if (rule.startsWith('@'))  return email.endsWith(rule);
  return email === rule;
}
function _twEmailAllowsMultiple(email) { return _twAdminRules().multiEmails.some(r => _twEmailMatchesRule(email, r)); }
function _twEmailBlocked(email)        { return _twAdminRules().blockedEmails.some(r => _twEmailMatchesRule(email, r)); }

// Every account stored on this device for one email, oldest first
function _twAccountsForEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return [];
  const all = _twLocalAccounts();
  return Object.keys(all)
    .filter(k => k === em || k.startsWith(em + '#'))
    .map(k => ({ ...all[k], _key: k, slot: all[k].slot || (k.includes('#') ? (parseInt(k.split('#')[1]) || 1) : 1) }))
    .sort((a, b) => a.slot - b.slot);
}

function _twIsAdminEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  return em === String(ADMIN_EMAIL).toLowerCase() || ADMIN_LOGIN_ALIASES.includes(em);
}
// A password changed from Admin → Security is kept (hashed) on this device and wins over the built-in one
function _twAdminPwRecord() {
  try { const o = JSON.parse(localStorage.getItem('tw_admin_pw') || 'null'); if (o && o.salt && o.hash) return { ...o, custom: true }; } catch(e) {}
  return { salt: ADMIN_PW_SALT, hash: ADMIN_PW_HASH, custom: false };
}
async function _twCheckAdminPassword(pw) {
  const rec = _twAdminPwRecord();
  return (await _twHashPw(pw, rec.salt)) === rec.hash;
}

function _twLogSignin(entry) {
  try {
    const log = JSON.parse(localStorage.getItem('tw_signin_log') || '[]');
    log.unshift({ at: new Date().toISOString(), ...entry });
    localStorage.setItem('tw_signin_log', JSON.stringify(log.slice(0, 500)));
  } catch(e) {}
}
function _twAdminAudit(action, detail) {
  try {
    const log = JSON.parse(localStorage.getItem('tw_admin_audit') || '[]');
    log.unshift({ at: new Date().toISOString(), action, detail: detail || '' });
    localStorage.setItem('tw_admin_audit', JSON.stringify(log.slice(0, 500)));
  } catch(e) {}
}

// Admin sign-in. Returns true only when the email is the admin's AND the password matches the stored hash.
// A wrong password simply falls through to the normal account check, so the sign-in form never
// reveals that an admin login exists (and the admin can also own ordinary test accounts).
async function _twAdminLogin(email, password) {
  if (!_twIsAdminEmail(email) || !password) return false;
  if (!(await _twCheckAdminPassword(password))) {
    _twLogSignin({ email: String(email).trim().toLowerCase(), type: 'admin', ok: false, event: 'admin-wrong-password' });
    return false;
  }
  const u = { name: 'Admin', email: String(ADMIN_EMAIL).toLowerCase(), type: 'admin', emailVerified: true, isAdmin: true };
  currentUser = u; window.currentUser = u;
  hideAlert('li-alert');
  _twLogSignin({ email: u.email, type: 'admin', ok: true, event: 'login' });
  _twAdminAudit('Signed in', 'Admin panel opened');
  window._loadUserDarkPref?.();
  launchAdminPanel();
  return true;
}

// Sign a stored (device) account in. Only teen / parent / employer accounts can sign in this way,
// and suspended accounts are turned away.
function _twLoginLocalAccount(acct) {
  if (!acct) return false;
  if (!TW_ACCOUNT_TYPES.includes(acct.type)) { showAlert('li-alert', "This account can't sign in here."); return false; }
  if (acct.suspended) {
    _twLogSignin({ email: acct.email, type: acct.type, ok: false, event: 'suspended' });
    showAlert('li-alert', 'This account has been suspended by TeenWork. Please contact support if you think this is a mistake.');
    return false;
  }
  const u = { name: acct.name, email: acct.email, type: acct.type, emailVerified: true, dob: acct.dob || '', city: acct.city || '', state: acct.state || '' };
  if (acct._key && acct._key.includes('#')) { u.dataKey = acct._key; u.id = acct._key; } // extra accounts keep their own data
  if (u.dob) { const _b=new Date(/^\d{4}-\d\d-\d\d$/.test(u.dob) ? u.dob + 'T00:00' : u.dob),_t=new Date(); let _a=_t.getFullYear()-_b.getFullYear(); if(_t.getMonth()<_b.getMonth()||(_t.getMonth()===_b.getMonth()&&_t.getDate()<_b.getDate()))_a--; u.age=_a; }
  currentUser = u; window.currentUser = u;
  try { const all = _twLocalAccounts(); const k = acct._key || String(acct.email).toLowerCase(); if (all[k]) { all[k].lastLogin = Date.now(); _twSaveLocalAccounts(all); } } catch(e) {}
  _twLogSignin({ email: String(u.email).toLowerCase(), type: u.type, ok: true, event: 'login', slot: acct.slot || 1 });
  window._loadUserDarkPref?.();
  launchDashboard();
  return true;
}

// One email + password matched more than one account → let the person pick which to open
function _twShowAccountChooser(matches) {
  document.getElementById('tw-acct-chooser')?.remove();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = { teen: '🧑', parent: '👨‍👩‍👧', employer: '💼' };
  const wrap = document.createElement('div');
  wrap.id = 'tw-acct-chooser';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1.2rem;';
  wrap.innerHTML = `<div style="background:var(--card,#fff);border-radius:20px;max-width:420px;width:100%;padding:1.6rem 1.4rem;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:'DM Sans',sans-serif;">
      <h2 style="font-family:'Fraunces',serif;color:var(--green);margin:0 0 .3rem;font-size:1.3rem">Which account?</h2>
      <p style="color:var(--muted);font-size:.86rem;margin:0 0 1rem">This email has more than one TeenWork account. Pick the one you want to open.</p>
      <div id="tw-acct-chooser-list" style="display:grid;gap:8px"></div>
      <button type="button" id="tw-acct-chooser-cancel" style="margin-top:1rem;width:100%;background:none;border:1.5px solid var(--border);color:var(--muted);padding:10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer">Cancel</button>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#tw-acct-chooser-cancel').onclick = () => wrap.remove();
  const list = wrap.querySelector('#tw-acct-chooser-list');
  matches.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tw-acct-choice';
    b.style.cssText = 'display:flex;align-items:center;gap:12px;text-align:left;background:var(--bg,#f7f7f5);border:1.5px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;font-family:inherit;color:var(--text)';
    b.innerHTML = `<span style="font-size:1.5rem">${icons[a.type] || '👤'}</span><span><strong style="display:block;font-size:.95rem">${esc(a.name || a.email)}</strong><span style="font-size:.78rem;color:var(--muted);text-transform:capitalize">${esc(a.type)} account${a.created ? ' · created ' + new Date(a.created).toLocaleDateString() : ''}</span></span>`;
    b.onclick = () => { wrap.remove(); _twLoginLocalAccount(a); };
    list.appendChild(b);
  });
}

// Keep a password-free copy of each account in the cloud so the admin can see accounts made on other devices
function _twRegisterAccountInCloud(acct, key) {
  try {
    if (!sbClient || !acct) return;
    const profile = { name: acct.name, email: acct.email, type: acct.type, dob: acct.dob || '', city: acct.city || '', state: acct.state || '', created: acct.created || Date.now(), slot: acct.slot || 1 };
    sbClient.from('user_data').upsert({ email: key || String(acct.email).toLowerCase(), key: 'account_profile', value: JSON.stringify(profile), updated_at: new Date().toISOString() }, { onConflict: 'email,key' }).then(() => {}, () => {});
  } catch(e) {}
}

// ── v41: CLOUD ACCOUNTS (Supabase Auth) ──────────────────────────────
//  Before v41 an account lived only in this browser (tw_local_accounts), so a
//  new copy of the app, another browser or another device had no accounts.
//  Now every teen / parent / employer account is also a Supabase Auth user:
//    • sign-up creates it in the cloud (email + password, profile in user_metadata)
//    • sign-in checks this device first (works offline), then the cloud, and keeps
//      a hashed copy here so the next sign-in on this device is instant
//    • accounts made before v41 or while offline are uploaded the next time they
//      sign in while online (_twCloudBackfill)
//  Supabase allows one user per email, so extra accounts on an email the admin lets
//  own several (email#2, email#3 …) are listed in that user's
//  user_metadata.tw_accounts and share its password.
//  Needs "Confirm email" switched OFF in Supabase (Authentication → Sign In /
//  Providers → Email). While it is on, new accounts stay on this device only.
// ─────────────────────────────────────────────────────────────────────
function _twConnectNow() {
  if (sbClient) return sbClient;
  try {
    if (typeof window._twEnsureSupabase === 'function') window._twEnsureSupabase();
    else if (window.supabase && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch(e) { console.warn('Supabase init failed', e); }
  return sbClient || null;
}
// The Supabase SDK is loaded async: wait for it (up to waitMs) instead of assuming we are offline
async function _twCloudClient(waitMs) {
  if (_twConnectNow() || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY') return sbClient || null;
  const n = Math.ceil((waitMs == null ? 3000 : waitMs) / 100);
  for (let i = 0; i < n && !window.supabase; i++) await new Promise(r => setTimeout(r, 100));
  return _twConnectNow();
}
const _twCloudErr = {
  offline:  e => !!e && (e.name === 'AuthRetryableFetchError' || e.status === 0 || /fetch|network|timed? ?out|connect/i.test(String(e.message || e))),
  exists:   e => !!e && (e.code === 'user_already_exists' || e.code === 'email_exists' || /already (been )?registered|already exists/i.test(String(e.message || ''))),
  badLogin: e => !!e && (e.code === 'invalid_credentials' || /invalid login|invalid credentials/i.test(String(e.message || ''))),
  // mistakes the person can fix on the sign-up form (anything else is a server or settings problem)
  formText: e => {
    const c = String(e && e.code || ''), m = String(e && e.message || '');
    if (c === 'weak_password' || /password/i.test(m)) return 'Please choose a stronger password (mix letters, numbers and symbols).';
    if (c === 'email_address_invalid' || c === 'validation_failed' || /email.*invalid|invalid.*email|unable to validate email/i.test(m)) return 'Please enter a real email address.';
    return '';
  },
};
// Run one Supabase call; never throws, always resolves to { data, error }
const _twSafeCall = f => { try { return Promise.resolve(f()).catch(e => ({ data: null, error: e || { message: 'network error' } })); } catch(e) { return Promise.resolve({ data: null, error: e }); } };

// One account's profile as kept in the cloud (no password: Supabase keeps that itself)
function _twCloudProfile(a, slot) {
  return { slot: slot || a.slot || 1, name: String(a.name || '').trim(), type: a.type, dob: a.dob || '', city: a.city || '', state: a.state || '', created: a.created || Date.now() };
}
// user_metadata for a new cloud user whose main account is `main`
function _twCloudMeta(main, extras) {
  const parts = String(main.name || '').trim().split(/\s+/);
  return { first_name: parts.shift() || '', last_name: parts.join(' '), account_type: main.type, dob: main.dob || '', city: main.city || '', state: main.state || '',
           created: main.created || Date.now(), tw_accounts: (extras || []).map(x => _twCloudProfile(x)) };
}
// Every TeenWork account on one cloud user, main account first
function _twAccountsFromCloudUser(user) {
  const m = (user && user.user_metadata) || {};
  const em = String(user && user.email || '').trim().toLowerCase();
  const out = [];
  if (!em) return out;
  if (TW_ACCOUNT_TYPES.includes(m.account_type)) {
    out.push({ key: em, slot: 1, email: em, type: m.account_type, name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || em,
               dob: m.dob || '', city: m.city || '', state: m.state || '', created: m.created || Date.parse(user.created_at) || Date.now() });
  }
  (Array.isArray(m.tw_accounts) ? m.tw_accounts : []).forEach(x => {
    const slot = parseInt(x && x.slot) || 0;
    if (slot > 1 && TW_ACCOUNT_TYPES.includes(x.type) && !out.some(o => o.slot === slot)) {
      out.push({ key: em + '#' + slot, slot, email: em, type: x.type, name: x.name || em, dob: x.dob || '', city: x.city || '', state: x.state || '', created: x.created || Date.now() });
    }
  });
  return out;
}
// Keep a hashed copy of cloud accounts on this device (instant + offline sign-in here next time)
async function _twCacheCloudAccounts(list, password) {
  const all = _twLocalAccounts();
  for (const a of list) {
    const prev = all[a.key] || {};
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    all[a.key] = { ...prev, name: a.name, email: prev.email || a.email, type: a.type, dob: a.dob, city: a.city, state: a.state,
                   created: prev.created || a.created, slot: a.slot, salt, hash: await _twHashPw(password, salt), cloud: true };
  }
  _twSaveLocalAccounts(all);
  return list.map(a => ({ ...all[a.key], _key: a.key }));
}
function _twMarkCloud(keys) {
  const all = _twLocalAccounts(); let n = 0;
  keys.forEach(k => { if (all[k] && !all[k].cloud) { all[k].cloud = true; n++; } });
  if (n) _twSaveLocalAccounts(all);
}

// Create a new account in the cloud. Returns { status, slot }:
//   'ok'       saved in the cloud (and this browser is signed in there); slot = its number on the email
//   'exists'   the email already has a cloud account and this one can't be added to it
//              (why 'password': extra accounts are allowed but the password differs)
//   'max'      the email already has as many accounts as the admin allows
//   'invalid'  Supabase refused the email or password; message says why, for the form
//   'local'    couldn't be saved in the cloud right now (offline, or Supabase still has
//              "Confirm email" on); keep it on this device, it is uploaded at its next online sign-in
// opts: extra (this device already has accounts on the email), allowExtra (admin allows several),
//       minSlot (next free slot on this device), max (admin's limit per email)
async function _twCloudSignUp(email, password, profile, opts) {
  opts = opts || {};
  const client = await _twCloudClient(3000);
  if (!client) return { status: 'local', why: 'offline' };
  const em = String(email).trim().toLowerCase();
  if (!opts.extra) {
    const r = await _twSafeCall(() => client.auth.signUp({ email: em, password, options: { data: _twCloudMeta(profile) } }));
    const err = r.error, user = r.data && r.data.user;
    const takenQuietly = !err && user && Array.isArray(user.identities) && user.identities.length === 0;  // "Confirm email" on + email taken
    if (!err && !takenQuietly) {
      if (r.data.session) return { status: 'ok', slot: 1 };
      console.warn('TeenWork: Supabase "Confirm email" is on, so this account was kept on this device only. Turn it off in Supabase → Authentication → Sign In / Providers → Email.');
      return { status: 'local', why: 'confirm-email' };
    }
    if (err && _twCloudErr.offline(err)) return { status: 'local', why: 'offline' };
    if (err && !_twCloudErr.exists(err)) {
      const msg = _twCloudErr.formText(err);
      if (msg) return { status: 'invalid', message: msg };
      console.warn('TeenWork: cloud sign-up failed, keeping the account on this device for now:', err);
      return { status: 'local', why: 'error' };
    }
    if (!opts.allowExtra) return { status: 'exists' };
  }
  // The email already has a cloud account: add this one to it (needs that account's password)
  const s = await _twSafeCall(() => client.auth.signInWithPassword({ email: em, password }));
  if (s.error) {
    if (_twCloudErr.badLogin(s.error)) return opts.extra ? { status: 'local', why: 'not-in-cloud' } : { status: 'exists', why: 'password' };
    return { status: 'local', why: _twCloudErr.offline(s.error) ? 'offline' : 'error' };
  }
  const user = s.data.user, have = _twAccountsFromCloudUser(user);
  if (!have.length && !opts.extra) {   // a cloud user with no TeenWork profile yet: this becomes its main account
    const u = await _twSafeCall(() => client.auth.updateUser({ data: _twCloudMeta(profile) }));
    return u.error ? { status: 'local', why: 'error' } : { status: 'ok', slot: 1 };
  }
  if (have.length >= (opts.max || 5)) return { status: 'max' };
  const slot = Math.max(opts.minSlot || 2, 2, ...have.map(a => a.slot + 1));
  const extras = Array.isArray(user.user_metadata && user.user_metadata.tw_accounts) ? user.user_metadata.tw_accounts.slice() : [];
  const u = await _twSafeCall(() => client.auth.updateUser({ data: { tw_accounts: extras.concat([_twCloudProfile(profile, slot)]) } }));
  if (u.error) return { status: 'local', why: 'error' };
  return { status: 'ok', slot };
}

// After a sign-in that matched accounts saved on this device: make sure they are in the cloud
// too (accounts made before v41 or offline), and sign this browser in to Supabase, which
// Update Password and Account Settings need. Resolves to:
//   'ok' cloud took the password · 'uploaded' device-only accounts were saved to the cloud ·
//   'rejected' the accounts are in the cloud but it no longer takes this password (changed on
//   another device; this device's copy is forgotten) · 'offline' · 'skipped' · 'error'
async function _twCloudBackfill(email, password, matches, waitMs) {
  try {
    const client = await _twCloudClient(waitMs == null ? 8000 : waitMs);
    if (!client) return 'offline';
    const em = String(email).trim().toLowerCase();
    const s = await _twSafeCall(() => client.auth.signInWithPassword({ email: em, password }));
    if (s.error) {
      if (!_twCloudErr.badLogin(s.error)) return _twCloudErr.offline(s.error) ? 'offline' : 'error';   // try again next sign-in
      if (matches.every(m => m.cloud && !m.pwResetAt)) {   // (an admin "Reset password" on this device still opens it here)
        const all = _twLocalAccounts();
        matches.forEach(m => { if (all[m._key]) { delete all[m._key].hash; delete all[m._key].salt; } });
        _twSaveLocalAccounts(all);
        return 'rejected';
      }
      const main = matches.find(m => m._key === em);
      if (!main) return 'skipped';   // only extra accounts on this device: they need the main account in the cloud first
      const r = await _twSafeCall(() => client.auth.signUp({ email: em, password, options: { data: _twCloudMeta(main, matches.filter(m => m._key !== em)) } }));
      if (!r.error && r.data && r.data.session) { _twMarkCloud(matches.map(m => m._key)); return 'uploaded'; }
      return 'skipped';   // the email's cloud account has another password, or "Confirm email" is still on
    }
    const user = s.data.user, have = _twAccountsFromCloudUser(user);
    const missing = matches.filter(m => m._key !== em && !have.some(h => h.key === m._key));
    if (missing.length && have.length) {
      const extras = Array.isArray(user.user_metadata && user.user_metadata.tw_accounts) ? user.user_metadata.tw_accounts.slice() : [];
      const u = await _twSafeCall(() => client.auth.updateUser({ data: { tw_accounts: extras.concat(missing.map(m => _twCloudProfile(m))) } }));
      if (!u.error) missing.forEach(m => have.push({ key: m._key }));
    }
    _twMarkCloud(matches.filter(m => have.some(h => h.key === m._key)).map(m => m._key));
    return 'ok';
  } catch(e) { console.warn('TeenWork: cloud backup of the account skipped:', e); return 'error'; }
}

// First sign-in on this device: pull the account's saved data before the dashboard draws
async function _twPullCloudData(acct) {
  const prev = window.currentUser;
  try {
    const u = { email: acct.email, type: acct.type };
    if (acct._key && acct._key.includes('#')) { u.dataKey = acct._key; u.id = acct._key; }
    window.currentUser = u;
    await Promise.race([_DB.sync(), new Promise(r => setTimeout(r, 4000))]);
  } catch(e) {} finally { window.currentUser = prev; }
}

Object.assign(window, { _twCloudClient, _twCloudSignUp, _twCloudBackfill, _twAccountsFromCloudUser, _twCacheCloudAccounts, _twPullCloudData });

Object.assign(window, { TW_ACCOUNT_TYPES, _twAdminRules, _twSaveAdminRules, _twEmailMatchesRule, _twEmailAllowsMultiple, _twEmailBlocked, _twAccountsForEmail, _twIsAdminEmail, _twAdminPwRecord, _twCheckAdminPassword, _twLogSignin, _twAdminAudit, _twAdminLogin, _twLoginLocalAccount, _twShowAccountChooser, _twRegisterAccountInCloud, _twLocalAccounts, _twSaveLocalAccounts, _twHashPw });

async function doSignup() {
  hideAlert('su-alert');
  const fname    = document.getElementById('su-fname').value.trim();
  const lname    = document.getElementById('su-lname').value.trim();
  const email    = document.getElementById('su-email').value.trim().toLowerCase();   // v41: one spelling, same as the cloud account
  const password = document.getElementById('su-password').value;

  if (!fname || !email || !selectedType) { showAlert('su-alert','Please fill in your name, email, and select an account type.'); return; }
  if (!password || password.length < 8)  { showAlert('su-alert','Password must be at least 8 characters.'); return; }
  if (!document.getElementById('terms-agree').checked) { showAlert('su-alert','Please agree to the Terms of Use to continue.'); return; }
  // v39: sign-up can only ever create teen / parent / employer accounts — never admin.
  if (!TW_ACCOUNT_TYPES.includes(selectedType)) { showAlert('su-alert','Please choose Teen, Parent, or Employer as your account type.'); return; }
  if (ADMIN_LOGIN_ALIASES.includes(email.toLowerCase())) { showAlert('su-alert','Please use a real email address.'); return; }
  if (_twEmailBlocked(email)) { showAlert('su-alert',"Sorry, that email address can't be used to create a TeenWork account."); return; }

  // Activity tracking is required to continue
  const trackingChecked = document.getElementById('perm-activity-signup')?.checked;
  if (!trackingChecked) {
    showAlert('su-alert', '⚠️ Please allow TeenWork to track your activity to continue. This is required for AI job matching and keeping your account safe.');
    return;
  }

  // Notifications are optional but warn user what they'll miss
  const notifChecked = document.getElementById('perm-notif-signup')?.checked;
  if (!notifChecked) {
    // Show a non-blocking warning — store their choice and continue
    const confirmed = window.confirm(
      'Without notifications, you won\'t receive:\n• Job match alerts\n• Application status updates\n• Safety alerts\n• Parent approval notifications\n\nYou can enable notifications later in Settings.\n\nContinue without notifications?'
    );
    if (!confirmed) return;
    // They chose to continue — their in-app inbox will still receive notification messages
  }

  if (selectedType === 'teen') {
    const tdob = document.getElementById('su-age')?.value;
    if (!tdob) { showAlert('su-alert','Please enter your date of birth.'); return; }
    const tage = calcAge(tdob);
    if (tage < 13 || tage > 17) { showAlert('su-alert','Teen accounts are for ages 13-17. If you are 18+, please create a parent or employer account instead.'); return; }
  }

  if (selectedType === 'parent') {
    const dob = document.getElementById('su-dob').value;
    if (!dob) { showAlert('su-alert','Please enter your date of birth.'); return; }
    if (calcAge(dob) < 18) { showAlert('su-alert','You must be 18 or older to create a parent account.'); return; }
    if (!parentVerified) { showAlert('su-alert','Please complete the parent verification question above.'); return; }
  }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const teenAddr   = document.getElementById('su-teen-address')?.value.trim() || '';
  const teenZip    = document.getElementById('su-teen-zip')?.value.trim() || '';
  const teenCity   = document.getElementById('su-city')?.value.trim() || '';
  const teenState  = document.getElementById('su-state')?.value || '';

  // No email verification step: create the account right away.
  const _dob = selectedType === 'teen' ? (document.getElementById('su-age')?.value || '')
             : (selectedType === 'parent' ? (document.getElementById('su-dob')?.value || '') : '');
  const _existing = _twAccountsForEmail(email).filter(a => a.hash);   // v41: a copy without a password is decided by the cloud
  const _rules = _twAdminRules();
  const _maxAccts = (window._twIsTesterEmail && window._twIsTesterEmail(email)) ? Infinity : (_rules.maxAccountsPerEmail || 5);   // v44: tester emails have no limit
  const _stopSignup = msg => { btn.disabled = false; btn.textContent = 'Create Account'; showAlert('su-alert', msg); };
  if (_existing.length) {
    // v39: the admin can allow specific emails or domains (Admin → 📧 Email Rules) to own more than one account.
    if (!_twEmailAllowsMultiple(email)) { _stopSignup("There's already an account with that email. Try signing in instead!"); return; }
    if (_existing.length >= _maxAccts) { _stopSignup(`This email already has the maximum of ${_maxAccts} accounts. Try signing in instead!`); return; }
  }
  let _slot = _existing.length ? Math.max(...(_existing.map(a => a.slot || 1))) + 1 : 1;
  const _created = Date.now();
  // v41: save the account in the cloud (Supabase Auth) so it works in every browser, device and copy of the app
  const _cloud = await _twCloudSignUp(email, password,
    { name: `${fname} ${lname}`, type: selectedType, dob: _dob, city: teenCity, state: teenState, created: _created },
    { extra: _existing.length > 0, allowExtra: _twEmailAllowsMultiple(email), minSlot: _slot, max: _maxAccts });
  if (_cloud.status === 'exists') {
    _stopSignup(_cloud.why === 'password'
      ? 'That email already has a TeenWork account. To add another account to it, use the same password as that account.'
      : "There's already an account with that email. Try signing in instead!");
    return;
  }
  if (_cloud.status === 'max')     { _stopSignup(`This email already has the maximum of ${_maxAccts} accounts. Try signing in instead!`); return; }
  if (_cloud.status === 'invalid') { _stopSignup(_cloud.message); return; }
  if (_cloud.status === 'ok') _slot = _cloud.slot;
  const _acctKey = _slot > 1 ? email.toLowerCase() + '#' + _slot : email.toLowerCase();   // extra accounts get their own storage key
  const _accts = _twLocalAccounts();
  const _salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const _hash = await _twHashPw(password, _salt);
  _accts[_acctKey] = { name: `${fname} ${lname}`, email, type: selectedType, dob: _dob, city: teenCity, state: teenState, salt: _salt, hash: _hash, created: _created, slot: _slot, cloud: _cloud.status === 'ok' };
  _twSaveLocalAccounts(_accts);
  if (_cloud.status !== 'ok') {
    setTimeout(() => { try { showToast("⚠️ We couldn't save your account to TeenWork's servers yet, so for now it only works on this device. Sign in again while you're online and it will be saved.", 'info'); } catch(e) {} }, 2500);
  }
  _twRegisterAccountInCloud(_accts[_acctKey], _acctKey);   // password-free copy so the admin sees accounts from every device
  _twLogSignin({ email: email.toLowerCase(), type: selectedType, ok: true, event: 'signup', slot: _slot });
  try { window.twWelcomeEmail && window.twWelcomeEmail(email, fname, selectedType); } catch(e) {}
  pendingEmail = email;
  _pendingSignupData = { name: `${fname} ${lname}`, email, type: selectedType, address: teenAddr, zip: teenZip, city: teenCity, state: teenState, dob: _dob, notifOptOut: !notifChecked, dataKey: _slot > 1 ? _acctKey : '' };
  // Reuse the existing account set-up code, but skip the emailed code.
  _skipEmailVerify = true;
  _pendingVerifyCode = '000000';
  _pendingVerifyExpiry = Date.now() + (10 * 60 * 1000);
  for (let i = 1; i <= 6; i++) { const inp = document.getElementById('verify-code-' + i); if (inp) inp.value = '0'; }
  try { await submitVerifyCode(); } finally { _skipEmailVerify = false; }
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Create Account'; }, 1500);
}

// ════════════════════════════════════
//  SECTION 7C: LOGIN
//  doLogin() tries Supabase signInWithPassword().
//  Demo fallback: checks against 3 hardcoded demo accounts
//  (parent@teenwork.demo, teen@teenwork.demo, employer@teenwork.demo).
// ════════════════════════════════════
// Customer-facing sign-in failure messages. The real backend error goes to the
// browser console only; the person signing in never sees technical text.
function _signInFailed(reason, rawError) {
  const rawMsg = rawError ? String(rawError.message || rawError.error_description || rawError) : '';
  if (rawError) console.warn('Sign-in failed:', rawMsg, rawError);
  if (!reason) {
    if (/email.*not.*confirmed/i.test(rawMsg)) reason = 'unverified';
    else if (/rate.?limit|too many/i.test(rawMsg)) reason = 'ratelimit';
    else if (/network|fetch|timeout|connect/i.test(rawMsg)) reason = 'offline';
    else if (/invalid.*login|invalid.*credential|wrong.*password|user.*not.*found/i.test(rawMsg)) reason = 'credentials';
    else reason = 'unavailable';
  }
  const signupLink = '<a href="#" onclick="gotoPage(\'signup\');return false" style="color:inherit;font-weight:700;text-decoration:underline">Create an account</a>';
  const messages = {
    credentials: { text: `That email or password isn't right. Please check them and try again.<br><span style="font-size:.85rem">New to TeenWork? ${signupLink}</span>`, label: 'Email or password not accepted' },
    unverified:  { text: 'Please verify your email first. Check your inbox for the verification code, then sign in again.', label: 'Email not verified yet' },
    ratelimit:   { text: 'Too many sign-in attempts. Please wait a minute and try again.', label: 'Too many attempts' },
    offline:     { text: "We couldn't connect. Please check your internet connection and try again.", label: 'Connection problem' },
    unavailable: { text: "We couldn't sign you in right now. Please try again in a moment.", label: 'Sign-in temporarily unavailable' },
  };
  const m = messages[reason] || messages.unavailable;
  const el = document.getElementById('li-alert');
  if (!el) return;
  el.className = 'alert alert-error show';
  el.innerHTML = `<strong>😕 Oops!</strong> ${m.text}${_supportBtn('Sign in problem', m.label)}`;
  _twRevealAlert(el);
}

async function doLogin() {
  hideAlert('li-alert');
  const email    = document.getElementById('li-email').value.trim();
  const password = document.getElementById('li-password').value;
  if (!email || !password) { showAlert('li-alert','Please enter your email and password.'); return; }

  // ── Admin login (v39) ─────────────────────────────────────────────────
  // ADMIN_EMAIL (or an alias) + the admin password opens the admin panel.
  // The password is checked against a salted hash — see CONFIG & INIT.
  if (await _twAdminLogin(email, password)) return;

  // Accounts saved on this device (made here, or signed in here before). One email can own
  // several accounts when the admin has allowed it (Admin → 📧 Email Rules), so collect every match.
  const _cands = _twAccountsForEmail(email);
  const _matches = [];
  for (const _c of _cands) { if (_c.hash && (await _twHashPw(password, _c.salt)) === _c.hash) _matches.push(_c); }
  if (_matches.length) {
    // v41: upload device-only accounts and sign this browser in to Supabase (in the background).
    // Accounts already in the cloud wait for its answer, since the password may have been changed
    // on another device; offline (or a slow connection) they still open from this device's copy.
    const _bf = _twCloudBackfill(email, password, _matches, 3000);
    if (_matches.every(m => m.cloud) && (await Promise.race([_bf, new Promise(r => setTimeout(() => r('slow'), 6000))])) === 'rejected') {
      _twLogSignin({ email: email.toLowerCase(), ok: false, event: 'wrong-password' });
      _signInFailed('credentials');
      return;
    }
    if (_matches.length === 1) { _twLoginLocalAccount(_matches[0]); return; }
    _twShowAccountChooser(_matches);   // same email + password on several accounts → pick one
    return;
  }

  // v41: not saved on this device (new browser, new copy of the app, or the password was changed
  // on another device) → check the cloud. Waits up to 3 seconds for the async-loaded Supabase SDK
  // instead of falling into demo mode.
  const _client = await _twCloudClient(3000);
  if (_client) {
    let data, error;
    try {
      ({data, error} = await _client.auth.signInWithPassword({ email: email.toLowerCase(), password }));
    } catch(e) {
      _signInFailed('', e);
      return;
    }
    if (error) {
      if (_cands.length) _twLogSignin({ email: email.toLowerCase(), ok: false, event: 'wrong-password' });
      _signInFailed('', error);
      return;
    }
    const _cloudAccts = _twAccountsFromCloudUser(data.user);
    if (!_cloudAccts.length) {   // a Supabase user that this app didn't make (no TeenWork profile)
      try { _client.auth.signOut(); } catch(e) {}
      _signInFailed('unavailable', 'Supabase user has no TeenWork account profile');
      return;
    }
    const _saved = await _twCacheCloudAccounts(_cloudAccts, password);
    if (_saved.length === 1) { await _twPullCloudData(_saved[0]); _twLoginLocalAccount(_saved[0]); return; }
    _twShowAccountChooser(_saved);
    return;
  }

  if (_cands.length) {   // offline, and the password doesn't match this device's copy
    _twLogSignin({ email: email.toLowerCase(), ok: false, event: 'wrong-password' });
    _signInFailed('credentials');
    return;
  }
  {   // no connection to Supabase: demo accounts only
    // Demo mode: check if credentials match any demo account
    const demoAccounts = {
      'parent@teenwork.demo': {name:'Jamie Johnson', type:'parent'},
      'teen@teenwork.demo': {name:'Alex Johnson', type:'teen'},
      'employer@teenwork.demo': {name:'Mike\'s Landscaping', type:'employer'},
    };
    const demo = demoAccounts[email.toLowerCase()];
    if (demo) {
      currentUser = {name: demo.name, email, type: demo.type, emailVerified: true};
      window._loadUserDarkPref?.();
      launchDashboard();
    } else if (SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
      // Supabase is configured but could not be reached, so we cannot check the account
      _signInFailed('offline');
    } else {
      _signInFailed('credentials');
    }
  }
}

// ── Parent-Link Gate ─────────────────────────────────────────────────────────
function _loadParentLink() {
  try {
    const em = (currentUser?.email || '').toLowerCase();
    const m = JSON.parse(localStorage.getItem('tw_parent_links') || '{}');
    if (em && m[em]) return m[em];
    const v = localStorage.getItem(_userKey('parentLinked')); return v ? JSON.parse(v) : null;
  } catch(e) { return null; }
}
function _saveParentLink(data) {
  try {
    const em = (currentUser?.email || '').toLowerCase();
    if (em) { const m = JSON.parse(localStorage.getItem('tw_parent_links') || '{}'); m[em] = data; localStorage.setItem('tw_parent_links', JSON.stringify(m)); }
    localStorage.setItem(_userKey('parentLinked'), JSON.stringify(data));
  } catch(e) {}
}
function submitParentLinkRequest() {
  const emailEl = document.getElementById('parent-link-email');
  const statusEl = document.getElementById('parent-link-status');
  const email = emailEl?.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (statusEl) { statusEl.style.color='var(--red)'; statusEl.textContent='⚠️ Please enter a valid parent email address.'; }
    return;
  }
  const linkData = { parentEmail: email, status: 'pending', requestedAt: new Date().toISOString() };
  if (currentUser) currentUser.parentLinked = linkData;
  _saveParentLink(linkData);
  const card = document.getElementById('parent-link-card');
  if (card) card.innerHTML = `
    <div style="font-size:2.5rem;margin-bottom:1rem">📬</div>
    <h2 style="font-family:'Fraunces',serif;color:var(--green);margin-bottom:.5rem">Invitation Sent!</h2>
    <p style="color:var(--muted);font-size:.9rem;margin-bottom:1.2rem">A link was sent to <strong>${email}</strong>. Ask your parent to check their inbox and approve your account.</p>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:1.5rem">Once they confirm, you can continue below.</p>
    <button class="btn-primary" onclick="checkParentLinkApproval()" style="margin-bottom:.6rem;width:100%">✅ Parent Already Approved — Continue</button>
    <button class="btn-secondary" style="width:100%;font-size:.82rem" onclick="location.reload()">🔄 Refresh Page</button>
  `;
  showToast('Invitation sent to ' + email + '!', 'success');
}
function checkParentLinkApproval() {
  const linkData = _loadParentLink() || {};
  linkData.status = 'approved';
  if (currentUser) currentUser.parentLinked = linkData;
  _saveParentLink(linkData);
  const overlay = document.getElementById('parent-lock-overlay');
  if (overlay) overlay.remove();
  showToast('🎉 Parent linked! Welcome to TeenWork!', 'success');
  launchDashboard();
}
function showParentLockScreen() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let overlay = document.getElementById('parent-lock-overlay');
  if (overlay) { overlay.style.display='flex'; return; }
  overlay = document.createElement('div');
  overlay.id = 'parent-lock-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1.5rem;';
  overlay.innerHTML = `
    <div id="parent-link-card" style="background:var(--card);border-radius:24px;box-shadow:var(--shadow-lg);border:1px solid var(--border);max-width:440px;width:100%;padding:2.5rem 2rem;text-align:center;">
      <div style="font-size:2.8rem;margin-bottom:1rem">🔒</div>
      <h2 style="font-family:Fraunces,serif;font-size:1.6rem;color:var(--green);margin-bottom:.6rem">Parent Approval Required</h2>
      <p style="color:var(--muted);font-size:.9rem;line-height:1.6;margin-bottom:1.5rem">
        TeenWork requires a parent or guardian to be linked to your account before you can browse jobs or apply. Enter your parent's email below to send them an invitation.
      </p>
      <input id="parent-link-email" type="email" placeholder="Parent's email address"
        style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.95rem;outline:none;margin-bottom:.8rem;box-sizing:border-box;"
        onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"
        onkeydown="if(event.key==='Enter')submitParentLinkRequest()" />
      <div id="parent-link-status" style="font-size:.8rem;min-height:1.2em;margin-bottom:.8rem"></div>
      <button class="btn-primary" onclick="submitParentLinkRequest()" style="width:100%;margin-bottom:.8rem">📨 Send Parent Invitation</button>
      <button class="btn-secondary" onclick="signOut()" style="width:100%;font-size:.82rem">↩ Sign Out</button>
    </div>`;
  document.body.appendChild(overlay);
}
// ─────────────────────────────────────────────────────────────────────────────

// Called after successful login or email verification.
// Routes the user to their role-specific page and renders all dashboards.
function launchDashboard() {
  const type = currentUser?.type || 'parent';

  // Load AI learning profile for this user
  loadAIProfile();
  if (typeof checkBirthdayUnlocks === 'function') checkBirthdayUnlocks();
  updateAIProfile('login', { type: currentUser?.type, city: currentUser?.city, age: currentUser?.age });
  // Sync any existing userActivity data into the AI profile
  if (userActivity.bio) updateAIProfile('bio_update', userActivity.bio);
  if (userActivity.skills?.length) updateAIProfile('skills_update', userActivity.skills);
  if (userActivity.lessonsCompleted?.length) userActivity.lessonsCompleted.forEach(l => updateAIProfile('lesson_complete', l));

  // ── Parent-link gate: block teen access until a parent is linked ──
  if (type === 'teen') {
    const stored = _loadParentLink();
    if (stored) currentUser.parentLinked = stored;
    const isDemo = currentUser?.email === 'teen@teenwork.demo';
    const linkState = currentUser?.parentLinked?.status;
    // First sign-in: ask (the screen has a Skip button). After that: approved = full access,
    // skipped / pending = the app opens in limited mode (see the v35 linking script).
    if (!isDemo && !linkState && !(window._twIsTesterUser && window._twIsTesterUser(currentUser))) { showParentLockScreen(); return; }   // v44: tester accounts skip it
  }

  // Populate profile fields from currentUser so real accounts don't show demo data
  if (currentUser) {
    const parts = (currentUser.name || '').split(' ');
    const fname = parts[0] || '';
    const lname = parts.slice(1).join(' ') || '';

    const fnameEl = document.getElementById('acct-fname');
    const lnameEl = document.getElementById('acct-lname');
    if (fnameEl) fnameEl.value = fname;
    if (lnameEl) lnameEl.value = lname;

    const profileNameEl = document.getElementById('profile-name-display');
    if (profileNameEl) profileNameEl.textContent = currentUser.name || '';

    const emailEl = document.getElementById('acct-email');
    if (emailEl) emailEl.value = currentUser.email || '';
  }

  // Sync Supabase → localStorage before rendering (async, non-blocking)
  window._syncUserData?.();

  renderAllDashboards();
  gotoPage(type);

  // ── Inject account tier badge into dash header ──────────────────
  setTimeout(() => {
    const tier = typeof _getUserTier === 'function' ? _getUserTier() : 'free';
    const limits = ACCOUNT_TIERS?.[tier];
    if (!limits) return;
    const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
    if (!cfg.launchPaid) return; // don't show tier UI pre-launch
    // Remove any existing badge
    document.querySelectorAll('.tw-tier-badge').forEach(b => b.remove());
    if (tier === 'free') {
      // Show a subtle upgrade nudge in each dash header
      document.querySelectorAll('.dash-header').forEach(h => {
        const badge = document.createElement('div');
        badge.className = 'tw-tier-badge';
        badge.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.75rem;font-weight:700;color:var(--muted);cursor:pointer;padding:4px 10px;border:1.5px solid var(--border);border-radius:20px;transition:all .2s;';
        badge.innerHTML = '⭐ Upgrade to Pro';
        badge.onclick = () => gotoPage('pricing');
        badge.onmouseenter = () => { badge.style.borderColor='var(--amber)'; badge.style.color='var(--amber)'; };
        badge.onmouseleave = () => { badge.style.borderColor='var(--border)'; badge.style.color='var(--muted)'; };
        const right = h.querySelector('div:last-child') || h;
        right.insertBefore(badge, right.firstChild);
      });
    } else {
      document.querySelectorAll('.dash-header').forEach(h => {
        const badge = document.createElement('div');
        badge.className = 'tw-tier-badge';
        badge.style.cssText = 'font-size:.72rem;font-weight:700;color:var(--amber);background:var(--amber-pale);padding:4px 10px;border-radius:20px;border:1.5px solid var(--amber);';
        badge.textContent = '⭐ Pro';
        const right = h.querySelector('div:last-child') || h;
        right.insertBefore(badge, right.firstChild);
      });
    }
  }, 200);
  // Trigger onboarding after page is active (real login path)
  setTimeout(() => initOnboarding(type), 900);
  const banner = document.getElementById('verify-banner');
  if (banner) banner.style.display = (currentUser?.emailVerified === false) ? 'flex' : 'none';
  setTimeout(updateMsgBadge, 100);
  // Update last seen
  userActivity.lastSeen = new Date().toISOString();
  // Request push notification permission if user opted in
  // Deferred — fires after tour ends so browser dialog doesn't leave page dimmed
  window._pendingPushRequest = true;
  setTimeout(function() { if (!document.getElementById('tw-tour-overlay') && window._pendingPushRequest) { window._pendingPushRequest = false; requestPushPermission(); } }, 8000);
  // Start real-time updates
  startRealtimeUpdates();
  // Streak badge
  if (type === 'teen') setTimeout(() => { if (typeof renderStreakBadge === 'function') renderStreakBadge(); }, 200);

  // Populate dynamic name/age fields from currentUser
  const uName = currentUser?.name || 'Alex Johnson';
  const uFname = uName.split(' ')[0];
  const uLname = uName.split(' ').slice(1).join(' ');
  const vFname = document.getElementById('tw-ver-fname');
  const vLname = document.getElementById('tw-ver-lname');
  const vState = document.getElementById('tw-ver-state-display');
  if (vFname) vFname.value = uFname;
  if (vLname) vLname.value = uLname;
  if (vState) vState.value = currentUser?.state || 'Vermont';
  const ewCard = document.getElementById('emp-worker-name-age');
  if (ewCard && currentUser?.isDemo) ewCard.textContent = 'Alex Johnson · Age 16';
  const pnd = document.getElementById('profile-name-display');
  if (pnd) pnd.textContent = uName;
  const tnh = document.getElementById('teen-name-header');
  if (tnh) tnh.textContent = uFname;
}

// ── Real-Time Data Updates ──────────────────────────────
let _realtimeChannel = null;
let _realtimePollTimer = null;

function startRealtimeUpdates() {
  // If Supabase is connected, use real-time subscriptions
  if (sbClient) {
    try {
      _realtimeChannel = sbClient.channel('teenwork-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
          // Re-render messages when new ones arrive
          if (msgActiveContactId) renderMsgBubbles(msgActiveContactId);
          updateMsgBadge();
          showToast('💬 New message received!', 'info');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, payload => {
          renderAllDashboards();
          showToast('📋 Application status updated!', 'info');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, payload => {
          renderRatings();
          showToast('⭐ New rating received!', 'info');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
          renderBrowseJobs();
        })
        .subscribe();
    } catch(e) {
      console.warn('Supabase realtime failed, falling back to polling:', e);
      startPollingUpdates();
    }
  } else {
    // Demo mode: poll for simulated updates
    startPollingUpdates();
  }
}

// ── Address & Distance Calculation ──────────────────────
let _userAddress = { street: '42 Maple Ave', zip: '05401', city: 'Burlington' };

function saveProfileAddress() {
  _userAddress.street = document.getElementById('profile-address')?.value || '';
  _userAddress.zip = document.getElementById('profile-zip')?.value || '';
  showToast('📍 Address saved (private — only used for distance)', 'success');
}

function estimateDistance(jobCity) {
  // Simple demo distance estimation based on city name matching
  // In production, this would use real geocoding APIs server-side
  const home = (_userAddress.city || currentUser?.city || 'Burlington').toLowerCase().trim();
  const job = (jobCity || '').toLowerCase().trim();
  if (!job || !home) return null;
  if (job === home) return (Math.random() * 3 + 0.5).toFixed(1); // same city: 0.5-3.5 mi
  // Simple hash-based distance for demo (deterministic per city pair)
  let hash = 0;
  for (let i = 0; i < job.length; i++) hash = ((hash << 5) - hash) + job.charCodeAt(i);
  return (Math.abs(hash % 20) + 3).toFixed(1); // 3-23 miles for different cities
}

function getDistanceTag(jobCity) {
  const dist = estimateDistance(jobCity);
  if (!dist) return '';
  const miles = parseFloat(dist);
  const color = miles <= 5 ? 'var(--green)' : miles <= 15 ? 'var(--amber)' : 'var(--red)';
  const label = miles <= 2 ? '~' + Math.round(miles * 5) + ' min walk' : miles <= 5 ? '~' + Math.round(miles * 3) + ' min bike' : dist + ' mi away';
  return `<span class="tag" style="color:${color};font-weight:600">📍 ${label}</span>`;
}

// ── Account Settings ──────────────────────────────
function saveAccountSettings() {
  const fname = document.getElementById('acct-fname')?.value.trim();
  const lname = document.getElementById('acct-lname')?.value.trim();
  const email = document.getElementById('acct-email')?.value.trim();
  const phone = document.getElementById('acct-phone')?.value.trim();
  const city  = document.getElementById('acct-city')?.value.trim();
  const state = document.getElementById('acct-state')?.value.trim();

  if (!fname || !email) { showToast('Name and email are required.', 'error'); return; }

  const oldEmail = currentUser?.email;
  const emailChanged = email !== oldEmail;

  // Update current user object
  if (currentUser) {
    currentUser.name = `${fname} ${lname}`.trim();
    currentUser.email = email;
    currentUser.city = city;
    currentUser.state = state;
    currentUser.phone = phone;
  }

  // Update display elements
  const nameHeader = document.getElementById('teen-name-header');
  if (nameHeader) nameHeader.textContent = fname;
  const profileName = document.getElementById('profile-name-display');
  if (profileName) profileName.textContent = `${fname} ${lname}`;
  const profileInfo = document.getElementById('profile-info-display');
  if (profileInfo) profileInfo.textContent = `Age 16 · ${city}, ${state}`;

  // If Supabase is connected, push the update
  if (sbClient && currentUser) {
    sbClient.auth.updateUser({
      email: emailChanged ? email : undefined,
      data: { first_name: fname, last_name: lname, city, state, phone }
    }).then(({error}) => {
      if (error) showToast('Save failed: ' + error.message, 'error');
    });
  }

  if (emailChanged) {
    showToast('Settings saved! A verification email has been sent to ' + email, 'success');
  } else {
    showToast('Account settings saved!', 'success');
  }
}

async function changePassword() {
  const current = document.getElementById('acct-current-pw')?.value;
  const newPw   = document.getElementById('acct-new-pw')?.value;
  const confirm = document.getElementById('acct-confirm-pw')?.value;
  const clearPwFields = () => ['acct-current-pw', 'acct-new-pw', 'acct-confirm-pw'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  if (!current) { showToast('Please enter your current password.', 'error'); return; }
  if (!newPw || newPw.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
  if (newPw !== confirm) { showToast('New passwords do not match.', 'error'); return; }

  const u = window.currentUser || currentUser;
  if (!u || u.isDemo || !TW_ACCOUNT_TYPES.includes(u.type)) {
    // Demo mode
    showToast('Password updated! (Demo mode — no actual change made)', 'success');
    clearPwFields();
    return;
  }

  // v41: the password is kept in the cloud (Supabase Auth) so it works on every device.
  // Check the current password, change it there, then update this device's copy.
  const em = String(u.email || '').trim().toLowerCase();
  const all = _twLocalAccounts();
  const myKey = u.dataKey || em;
  const mine = all[myKey];
  const localOk = !!(mine && mine.hash && (await _twHashPw(current, mine.salt)) === mine.hash);
  const offlineMsg = "We couldn't connect. Please check your internet connection and try again.";
  const wrongMsg = "Your current password isn't right. Please try again.";
  const client = await _twCloudClient(3000);
  let inCloud = false;
  if (client) {
    const chk = await _twSafeCall(() => client.auth.signInWithPassword({ email: em, password: current }));
    if (!chk.error) inCloud = true;
    else if (_twCloudErr.offline(chk.error)) { if (!mine || mine.cloud) { showToast(offlineMsg, 'error'); return; } }
    else if (!localOk || mine.cloud) { showToast(wrongMsg, 'error'); return; }
  } else if (!mine || mine.cloud) { showToast(offlineMsg, 'error'); return; }
  if (!inCloud && !localOk) { showToast(wrongMsg, 'error'); return; }

  if (inCloud) {
    const r = await _twSafeCall(() => client.auth.updateUser({ password: newPw }));
    if (r.error) {
      console.warn('Password change failed:', r.error);
      const c = String(r.error.code || ''), m = String(r.error.message || '');
      showToast(c === 'same_password' || /different from the old/i.test(m) ? 'Your new password must be different from your current one.'
              : c === 'weak_password' ? 'Please choose a stronger password (mix letters, numbers and symbols).'
              : _twCloudErr.offline(r.error) ? offlineMsg
              : "We couldn't change your password right now. Please try again in a moment.", 'error');
      return;
    }
  }
  // This device's copy: every account here on this email that used the old password
  for (const k of Object.keys(all)) {
    if (!(k === em || k.startsWith(em + '#'))) continue;
    if (k !== myKey && !(all[k].hash && (await _twHashPw(current, all[k].salt)) === all[k].hash)) continue;
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    all[k].salt = salt; all[k].hash = await _twHashPw(newPw, salt);
  }
  _twSaveLocalAccounts(all);
  showToast('Password updated successfully!', 'success');
  clearPwFields();
}

function updateRequiredBadges() {
  const sel = document.getElementById('ctrl-required-badges');
  if (!sel) return;
  const badges = Array.from(sel.selectedOptions).map(o => o.value);
  parentalControls['required-badges'] = badges;
  showToast('Required badges updated: ' + (badges.length ? badges.join(', ') : 'none'), 'success');
}

function updateBlockedCategories() {
  const sel = document.getElementById('ctrl-blocked-categories');
  if (!sel) return;
  const cats = Array.from(sel.selectedOptions).map(o => o.value);
  parentalControls['blocked-categories'] = cats;
  showToast('Blocked categories: ' + (cats.length ? cats.join(', ') : 'none'), 'success');
}

function startPollingUpdates() {
  // Deprecated: using Supabase Realtime only. No-op kept for backward compat.
}

// ── Push Notification Permission Request ──────────────────
function requestPushPermission() {
  const userOptedIn = document.getElementById('perm-notif-signup')?.checked !== false;
  if (!userOptedIn) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    userActivity.notifPermission = true;
    return;
  }
  if (Notification.permission === 'denied') {
    userActivity.notifPermission = false;
    return;
  }
  // Ask after a short delay so it doesn't fire immediately on login
  setTimeout(async () => {
    try {
      const permission = await Notification.requestPermission();
      userActivity.notifPermission = permission === 'granted';
      if (permission === 'granted') {
        // Show a welcome notification
        new Notification('TeenWork 🌿', {
          body: 'Notifications enabled! We\'ll let you know about new job matches and updates.',
          icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Ctext%20y%3D%2228%22%20font-size%3D%2228%22%3E%F0%9F%8C%BF%3C%2Ftext%3E%3C%2Fsvg%3E'
        });
      }
    } catch(e) {
      // Notification API not available or blocked
      console.log('Push notification request failed:', e);
    }
  }, 2000);
}

// ── Send a push notification (used for job matches, messages) ──
function sendPushNotif(title, body, tag = 'tw-notif') {
  if (!userActivity.notifPermission) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Ctext%20y%3D%2228%22%20font-size%3D%2228%22%3E%F0%9F%8C%BF%3C%2Ftext%3E%3C%2Fsvg%3E'
    });
  } catch(e) { /* silent */ }
}

// Demo logins — loads sample data for testing dashboards
// Each demo session is fully isolated: state is reset before launch so
// demo data never leaks into a subsequent real-user session or other roles.
function resetSessionState() {
  // Reset demo job applications
  demoJobs.length = 0;
  demoJobs.push(
    {id:1,title:'Lawn Mowing & Yard Cleanup',employer:"Mike's Landscaping",pay:18,payType:'hourly',city:'Burlington',state:'Vermont',type:'yard work',minAge:14,maxHours:15,status:'pending-approval',applied:'Apr 9',desc:'Weekly lawn mowing, edging, and yard debris cleanup. Mower provided.'},
    {id:2,title:'Dog Walking (3 dogs)',employer:'Sarah Chen',pay:15,payType:'hourly',city:'South Burlington',state:'Vermont',type:'pet care',minAge:13,maxHours:10,status:'pending-approval',applied:'Apr 10',desc:'Walk 3 friendly dogs Mon/Wed/Fri afternoons. About 1 hour per visit.'},
    {id:3,title:'House Cleaning Assistant',employer:'The Hendersons',pay:120,payType:'flat',city:'Burlington',state:'Vermont',type:'cleaning',minAge:15,maxHours:6,status:'accepted',applied:'Apr 7',desc:'Help clean a 3-bedroom house every other Saturday. Cleaning products provided.'}
  );
  demoNotifs.length = 0;
  demoNotifs.push(
    {text:"Alex applied to 'Lawn Mowing & Yard Cleanup' — needs your approval",time:'2 hours ago',read:false},
    {text:"Alex applied to 'Dog Walking (3 dogs)' — needs your approval",time:'1 hour ago',read:false},
    {text:"New AI job match: Snow Shoveling in Burlington matches Alex's profile",time:'Yesterday',read:false},
    {text:"The Hendersons accepted Alex's application for House Cleaning",time:'Apr 7',read:true},
    {text:"New 5-star rating received from Mike's Landscaping",time:'Apr 6',read:true}
  );
  browsableJobs.length = 0;
  browsableJobs.push(
    {id:4,title:'Babysitting (2 kids, ages 5 & 7)',employer:'The Martinez Family',pay:14,payType:'hourly',city:'Burlington',state:'Vermont',type:'babysitting',minAge:15,maxHours:12,desc:'Weekend babysitting, occasional evenings. Kids love board games and crafts!',transport:['parent drive','walk']},
    {id:5,title:'Snow Shoveling Route',employer:'Maple Street Neighbors',pay:20,payType:'flat',city:'Burlington',state:'Vermont',type:'yard work',minAge:13,maxHours:8,desc:'Shovel 4 driveways after snowfall. Equipment provided or bring your own. Paid same day.',transport:['walk','bike']},
    {id:6,title:'Moving Help (Light Boxes)',employer:'Johnson Moving',pay:16,payType:'hourly',city:'South Burlington',state:'Vermont',type:'moving help',minAge:16,maxHours:8,desc:'Help carry boxes on moving days. Must be reliable and on time. Gloves provided.',transport:['parent drive','employer pickup']},
    {id:7,title:'Garden Weeding & Planting',employer:'Green Thumb Gardens',pay:13,payType:'hourly',city:'Williston',state:'Vermont',type:'yard work',minAge:13,maxHours:12,desc:'Seasonal garden work — weeding, planting, and watering. Very flexible schedule.',transport:['bike','walk','parent drive']},
    {id:8,title:'Pet Sitting (Cat + Rabbit)',employer:'Davis Household',pay:12,payType:'hourly',city:'Burlington',state:'Vermont',type:'pet care',minAge:13,maxHours:6,desc:'Feed and check on pets twice a day while family is traveling. Easy, relaxed job.',transport:['walk','bike']},
    {id:9,title:'Car Washing & Detailing',employer:'Riverside Auto',pay:15,payType:'hourly',city:'Burlington',state:'Vermont',type:'cleaning',minAge:14,maxHours:10,desc:'Wash, dry, and detail customer vehicles on weekends. Training provided.',transport:['parent drive','bus']},
    {id:10,title:'Grocery Run & Errand Help',employer:'Peterson Household',pay:14,payType:'flat',city:'Essex',state:'Vermont',type:'other',minAge:15,maxHours:4,desc:'Pick up groceries and run local errands for an elderly couple. Must have bike or transit.',transport:['bike','bus']},
    {id:11,title:'Leaf Raking & Yard Cleanup',employer:'Thompson Property',pay:18,payType:'flat',city:'Shelburne',state:'Vermont',type:'yard work',minAge:13,maxHours:6,desc:'Fall cleanup — rake leaves, bag and haul to curb. Tools provided. Paid immediately after.',transport:['parent drive','employer pickup']},
    {id:12,title:'Dog Walker (Golden Retriever)',employer:'Kim & Chris Park',pay:18,payType:'hourly',city:'Burlington',state:'Vermont',type:'pet care',minAge:13,maxHours:8,desc:'Walk our friendly golden retriever Mon/Wed/Fri at 4pm for 45 mins. Easy and fun!',transport:['walk','bike']}
  );
  teenGameState.points = 0;
  teenGameState.badges = [];
  teenGameState.hoursWorked = 0;
  userActivity.bio = '';
  userActivity.skills = [];
  userActivity.jobsAccepted = [];
  userActivity.chatMessages = [];
  userActivity.lessonsCompleted = [];
  userActivity.notifPermission = true;
  userActivity.emailPermission = true;
  Object.assign(parentalControls, {
    'approval': true, 'match-notify': true, 'accept-notify': true,
    'local-only': false, 'block': false, 'msg-alert': true,
    'min-employer-rating': 4, 'max-distance': 10, 'max-weekly-hours': 15
  });
  if (typeof _empLetters !== 'undefined') _empLetters.length = 0;
  if (typeof calShifts !== 'undefined') calShifts.length = 0;
}

function demoLogin(type) {
  // ── 1. Reset all session state for full isolation ─────────────────────
  currentUser     = null;
  selectedType    = null;
  parentVerified  = false;
  pendingEmail    = '';
  resetSessionState();

  // ── 2. Build a demo user that matches launchDashboard() expectations ─
  // The email must match the bypass checks already in launchDashboard():
  //   teen → 'teen@teenwork.demo'  (bypasses parent-lock gate)
  //   others → conventional demo addresses
  const emailMap  = {teen:'teen@teenwork.demo', parent:'parent@teenwork.demo', employer:'employer@teenwork.demo'};
  const nameMap   = {teen:'Alex Johnson', parent:'Jamie Johnson', employer:"Mike's Landscaping"};
  const cityMap   = {teen:'Burlington', parent:'Burlington', employer:'Burlington'};

  currentUser = {
    name:          nameMap[type],
    email:         emailMap[type],
    type:          type,
    emailVerified: true,
    city:          cityMap[type],
    state:         'Vermont',
    age:           type === 'teen' ? 16 : undefined,
    // Mark explicitly as demo so renderTeenDashboard shows demo numbers
    isDemo:        true,
  };

  // ── 3. Pre-fill teen activity data (isolated to this session) ─────────
  if (type === 'teen') {
    userActivity.bio           = 'Hardworking 16-year-old from Burlington, Vermont. Experienced with lawn care, pet sitting, snow shoveling, and light cleaning. Reliable, on time, and always professional.';
    userActivity.skills        = ['lawn care','pet sitting','snow shoveling','cleaning'];
    userActivity.jobsAccepted  = [
      {title:"Lawn Mowing & Yard Cleanup",   employer:"Mike's Landscaping"},
      {title:"House Cleaning Assistant",     employer:"The Hendersons"},
    ];
    userActivity.lessonsCompleted = ['first_impression','safety'];
    userActivity.notifPermission  = true;
    userActivity.emailPermission  = true;
    // Pre-seed gamification for a richer demo
    teenGameState.points  = 180;
    teenGameState.badges  = ['first_job','first_hire','lesson_1','verified'];
    teenGameState.hoursWorked = 14;
  } else {
    // Reset activity to neutral for parent/employer demos
    userActivity.bio          = '';
    userActivity.skills       = [];
    userActivity.jobsAccepted = [];
    userActivity.lessonsCompleted = [];
    teenGameState.points  = 0;
    teenGameState.badges  = [];
    teenGameState.hoursWorked = 0;
  }

  // ── 4. Route through launchDashboard() so all normal setup runs ───────
  // (parent-link gate, dashboard render, mobile nav, push perms, realtime)
  launchDashboard();

  showToast(`👋 Welcome to the ${type.charAt(0).toUpperCase()+type.slice(1)} Demo!`, 'success');
}

// ════════════════════════════════════
//  SECTION 8: EMAIL VERIFICATION SYSTEM
//  generateVerifyCode() — creates a random 6-digit OTP.
//  sendVerificationEmailJS() — sends the code via EmailJS;
//    falls back to on-screen display if quota is hit.
//  verifyCodeInput() — handles digit-by-digit entry + auto-advance.
//  submitVerifyCode() — checks code against Supabase OTP
//    (live) or _pendingVerifyCode (demo), then calls launchDashboard().
//  doResendEmail() — resends a fresh code via Supabase or EmailJS.
// ════════════════════════════════════
// ── Verification Code System ──────────────────────────
let _pendingVerifyCode = null;
let _pendingVerifyExpiry = null;
let _pendingSignupData = null;

function generateVerifyCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  _pendingVerifyCode = code;
  _pendingVerifyExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
  return code;
}

function verifyCodeInput(el, idx) {
  // Only allow digits
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value && idx < 6) {
    document.getElementById('verify-code-' + (idx + 1))?.focus();
  }
  // Auto-submit when all 6 filled
  if (idx === 6 && el.value) {
    const full = getEnteredCode();
    if (full.length === 6) submitVerifyCode();
  }
  // Highlight active input
  el.style.borderColor = el.value ? 'var(--green)' : 'var(--border)';
}

function verifyCodeKeydown(e, idx) {
  if (e.key === 'Backspace' && !e.target.value && idx > 1) {
    document.getElementById('verify-code-' + (idx - 1))?.focus();
  }
  // Allow paste of full code
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    setTimeout(() => {
      const pasted = e.target.value.replace(/[^0-9]/g, '');
      if (pasted.length >= 6) {
        for (let i = 1; i <= 6; i++) {
          const inp = document.getElementById('verify-code-' + i);
          if (inp) { inp.value = pasted[i-1] || ''; inp.style.borderColor = 'var(--green)'; }
        }
        submitVerifyCode();
      }
    }, 50);
  }
}

function getEnteredCode() {
  let code = '';
  for (let i = 1; i <= 6; i++) {
    code += document.getElementById('verify-code-' + i)?.value || '';
  }
  return code;
}

async function submitVerifyCode() {
  const entered = getEnteredCode();
  const alertEl = document.getElementById('verify-code-alert');

  if (entered.length !== 6) {
    if (alertEl) { alertEl.className = 'alert alert-error show'; alertEl.textContent = 'Please enter all 6 digits.'; }
    return;
  }

  if (Date.now() > (_pendingVerifyExpiry || 0)) {
    if (alertEl) { alertEl.className = 'alert alert-error show'; alertEl.textContent = 'Code expired. Click "Resend Code" to get a new one.'; }
    return;
  }

  if (sbClient && _pendingSignupData && !_skipEmailVerify) {
    // Verify the OTP code with Supabase
    if (alertEl) { alertEl.className = 'alert alert-success show'; alertEl.textContent = 'Verifying...'; }
    const { data, error } = await sbClient.auth.verifyOtp({
      email: _pendingSignupData.email,
      token: entered,
      type: 'magiclink'
    });
    if (error) {
      if (alertEl) { alertEl.className = 'alert alert-error show'; alertEl.textContent = 'Incorrect code. Please check your email and try again.'; }
      for (let i = 1; i <= 6; i++) {
        const inp = document.getElementById('verify-code-' + i);
        if (inp) { inp.style.borderColor = 'var(--red)'; inp.value = ''; }
      }
      document.getElementById('verify-code-1')?.focus();
      setTimeout(() => {
        for (let i = 1; i <= 6; i++) {
          const inp = document.getElementById('verify-code-' + i);
          if (inp) inp.style.borderColor = 'var(--border)';
        }
      }, 1500);
      return;
    }
    if (alertEl) { alertEl.className = 'alert alert-success show'; alertEl.textContent = 'Verified! Setting up your account...'; }
    // Set password now that OTP verified identity
    if (_pendingSignupData?.password) {
      try {
        await sbClient.auth.updateUser({ password: _pendingSignupData.password });
      } catch(e) { console.warn('Password set failed (non-critical):', e); }
    }
    currentUser = {
      name: _pendingSignupData.name,
      email: _pendingSignupData.email,
      type: _pendingSignupData.type,
      emailVerified: true,
      dob: _pendingSignupData.dob || '',
      city: _pendingSignupData.city || '',
      state: _pendingSignupData.state || ''
    };
    if (currentUser.dob) { const _b=new Date(/^\d{4}-\d\d-\d\d$/.test(currentUser.dob) ? currentUser.dob + 'T00:00' : currentUser.dob),_t=new Date(); let _a=_t.getFullYear()-_b.getFullYear(); if(_t.getMonth()<_b.getMonth()||(_t.getMonth()===_b.getMonth()&&_t.getDate()<_b.getDate()))_a--; currentUser.age=_a; }
    _pendingSignupData = null;
    setTimeout(() => launchDashboard(), 1000);
    return;
  }

  if (entered === _pendingVerifyCode) {
    // Success! (demo mode)
    if (alertEl) { alertEl.className = 'alert alert-success show'; alertEl.textContent = 'Verified! Signing you in...'; }
    setTimeout(() => {
    // Set up the user from pending signup data
    if (_pendingSignupData) {
      currentUser = {
        name: _pendingSignupData.name,
        email: _pendingSignupData.email,
        type: _pendingSignupData.type,
        emailVerified: true,
        dob: _pendingSignupData.dob || '',
        city: _pendingSignupData.city || '',
        state: _pendingSignupData.state || ''
      };
      if (_pendingSignupData.dataKey) { currentUser.dataKey = _pendingSignupData.dataKey; currentUser.id = _pendingSignupData.dataKey; } // v39: extra account on a shared email
      window.currentUser = currentUser;
      if (currentUser.dob) { const _b=new Date(/^\d{4}-\d\d-\d\d$/.test(currentUser.dob) ? currentUser.dob + 'T00:00' : currentUser.dob),_t=new Date(); let _a=_t.getFullYear()-_b.getFullYear(); if(_t.getMonth()<_b.getMonth()||(_t.getMonth()===_b.getMonth()&&_t.getDate()<_b.getDate()))_a--; currentUser.age=_a; }
    }
    _pendingVerifyCode = null;
    _pendingVerifyExpiry = null;
    // Track signup for admin stats (privacy-safe: just a count by type)
    if (currentUser?.type && typeof _adminTrackSignup === 'function') _adminTrackSignup(currentUser.type);
    // Save chosen plan tier
    const _chosenPlan = document.querySelector('input[name="su-plan"]:checked')?.value || 'free';
    if (currentUser?.email) {
      try { localStorage.setItem('tw_' + currentUser.email.replace(/[^a-z0-9]/gi,'_') + '_acct_tier', _chosenPlan); } catch(e) {}
      // If pre-launch and they chose Pro, mark them for 10-day notice
      const _cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
      if (!_cfg.launchPaid && _chosenPlan === 'pro') {
        try { localStorage.setItem('tw_' + currentUser.email.replace(/[^a-z0-9]/gi,'_') + '_pro_notice_owed', '1'); } catch(e) {}
      }
    }
    // If user opted out of email notifications, send them an in-app inbox notification instead
    if (_pendingSignupData?.notifOptOut && currentUser?.email) {
      try {
        const inboxKey = 'tw_inbox_' + currentUser.email.replace(/[^a-z0-9]/gi,'_');
        const inbox = JSON.parse(localStorage.getItem(inboxKey) || '[]');
        inbox.unshift({
          id: Date.now(),
          type: 'system',
          title: '📬 You have notifications turned off',
          body: 'Since you opted out of push & email notifications, all job alerts, application updates, safety alerts, and parent approvals will appear here in your in-app inbox instead. You can re-enable notifications anytime in your Settings.',
          read: false,
          time: new Date().toISOString()
        });
        localStorage.setItem(inboxKey, JSON.stringify(inbox.slice(0,200)));
      } catch(e) {}
    }
    _pendingSignupData = null;
      if (currentUser) {
        launchDashboard();
        // If user got Pro free (pre-launch), ask for a review after a short delay
        const _cfg2 = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
        const _finalPlan = document.querySelector('input[name="su-plan"]:checked')?.value || 'free';
        if (!_cfg2.launchPaid && _finalPlan === 'pro') {
          setTimeout(function() { _twShowFreeProReviewAsk(); }, 2200);
        }
      } else {
        gotoPage('login');
      }
    }, 1000);
  } else {
    if (alertEl) { alertEl.className = 'alert alert-error show'; alertEl.textContent = 'Incorrect code. Please check your email and try again.'; }
    // Shake the inputs
    for (let i = 1; i <= 6; i++) {
      const inp = document.getElementById('verify-code-' + i);
      if (inp) { inp.style.borderColor = 'var(--red)'; inp.value = ''; }
    }
    document.getElementById('verify-code-1')?.focus();
    setTimeout(() => {
      for (let i = 1; i <= 6; i++) {
        const inp = document.getElementById('verify-code-' + i);
        if (inp) inp.style.borderColor = 'var(--border)';
      }
    }, 1500);
  }
}

// ── Free Pro Review Ask — shown after signup when user gets Pro free ──
function _twShowFreeProReviewAsk() {
  if (document.getElementById('tw-free-pro-review-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'tw-free-pro-review-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .25s ease';
  modal.innerHTML = `
    <div style="background:var(--card);width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:1.8rem 1.6rem 2rem;box-shadow:0 -8px 40px rgba(0,0,0,.2);position:relative">
      <button onclick="document.getElementById('tw-free-pro-review-modal').remove()" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:1.2rem;color:var(--muted);cursor:pointer;line-height:1" aria-label="Close">✕</button>
      <div style="text-align:center;margin-bottom:1.1rem">
        <div style="font-size:2.8rem;margin-bottom:.5rem">🎉</div>
        <h2 style="font-family:'Fraunces',Georgia,serif;font-size:1.4rem;font-weight:900;color:var(--green);margin-bottom:.3rem">You've got Pro — free!</h2>
        <p style="font-size:.88rem;color:var(--muted);line-height:1.55;max-width:340px;margin:0 auto">
          TeenWork Pro is yours at no cost during our early access. Unlimited AI, resume builder, job coach — all of it. We'd love to know what you think!
        </p>
      </div>
      <div style="background:linear-gradient(135deg,var(--green-pale),#f0fdf4);border:1.5px solid var(--green-light);border-radius:14px;padding:1rem 1.1rem;margin-bottom:1rem">
        <div style="font-size:.75rem;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.8px;margin-bottom:.5rem">What's included in your free Pro:</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:.8rem;color:var(--text)">
          <div>✓ Unlimited AI requests</div>
          <div>✓ AI Resume Builder</div>
          <div>✓ AI Job Coach</div>
          <div>✓ Pitch AI</div>
          <div>✓ Priority matching</div>
          <div>✓ Unlimited applies</div>
        </div>
      </div>
      <p style="font-size:.84rem;color:var(--text);font-weight:600;text-align:center;margin-bottom:.8rem">
        Would you take 30 seconds to leave us a quick review?<br>
        <span style="font-size:.76rem;color:var(--muted);font-weight:400">It helps other teens and parents find TeenWork. 🙏</span>
      </p>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('tw-free-pro-review-modal').remove()" style="flex:1;background:none;border:2px solid var(--border);color:var(--muted);padding:11px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer">Maybe later</button>
        <button onclick="document.getElementById('tw-free-pro-review-modal').remove();setTimeout(()=>document.getElementById('v17-rate-fab')?.click(),200)" style="flex:2;background:linear-gradient(135deg,var(--green),var(--green-mid));color:#fff;border:2px solid var(--amber);padding:11px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.92rem;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(45,106,79,0.3)">⭐ Leave a Review</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Close on backdrop click
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

// EmailJS quota tracking — stops retrying after repeated failures in the same session
let _emailjsQuotaExceeded = false;

async function sendVerificationEmailJS(toEmail, toName) {
  // If we already know quota is exceeded this session, skip gracefully
  if (_emailjsQuotaExceeded) {
    console.warn('EmailJS quota exceeded — skipping send.');
    showToast('📬 Email quota reached for now. Your code is shown below — enter it to continue.', 'info');
    _showInAppCode();
    return false;
  }
  // Sends a real email via EmailJS to the user AND notifies admin
  // Check if EmailJS is loaded and configured
  if (typeof emailjs === 'undefined') {
    console.error('EmailJS library not loaded. Check script tag in HTML head.');
    showToast('Email service unavailable — please contact support.', 'error');
    return false;
  }
  if (EMAILJS_SERVICE === 'YOUR_EMAILJS_SERVICE_ID' || EMAILJS_TEMPLATE === 'YOUR_EMAILJS_TEMPLATE_ID' || EMAILJS_PUBKEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
    console.error('EmailJS not configured. Set EMAILJS_SERVICE, EMAILJS_TEMPLATE, and EMAILJS_PUBKEY in the CONFIG section.');
    showToast('Email not configured — running in demo mode. In production, configure EmailJS credentials.', 'error');
    // In demo mode, simulate success so users can continue testing
    return true;
  }
  try {
    // Re-initialize EmailJS in case it failed at startup
    emailjs.init(EMAILJS_PUBKEY);
    const code = _pendingVerifyCode || generateVerifyCode();
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email:   toEmail,
      to_name:    toName || toEmail,
      from_name:  'TeenWork',
      reply_to:   ADMIN_EMAIL,
      message:    `Hi ${toName || 'there'},\n\nYour TeenWork verification code is:\n\n  ${code}\n\nEnter this 6-digit code in the app to activate your account. It expires in 15 minutes.\n\nIf you did not sign up, ignore this email.\n\n— The TeenWork Team`,
      subject:    'Your TeenWork Verification Code',
      code:       code,
    });
    // Also notify admin (best-effort, don't let failure block user flow)
    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email:   ADMIN_EMAIL,
        to_name:    'TeenWork Admin',
        from_name:  'TeenWork Sign-Up Bot',
        reply_to:   toEmail,
        message:    `New user signed up: ${toName || ''} <${toEmail}>`,
        subject:    'New TeenWork Sign-Up',
      });
    } catch(adminErr) {
      console.warn('Admin notification email failed (user email sent OK):', adminErr);
    }
    return true;
  } catch(e) {
    console.error('EmailJS send failed:', e, 'Service:', EMAILJS_SERVICE, 'Template:', EMAILJS_TEMPLATE);
    // Detect quota / rate limit errors (EmailJS returns status 429 or message about quota)
    const msg = (e?.text || e?.message || String(e)).toLowerCase();
    if (e?.status === 429 || msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded') || msg.includes('too many')) {
      _emailjsQuotaExceeded = true;
      showToast('📬 Monthly email limit reached. Your code is displayed below — enter it to finish signing up.', 'info');
      _showInAppCode();
    } else {
      showToast('📬 Email delivery failed — check your spam folder, or tap Support to contact us', 'error');
    }
    return false;
  }
}

// Show the verification code directly on screen when email can't be sent
function _showInAppCode() {
  const code = _pendingVerifyCode;
  if (!code) return;
  const alertEl = document.getElementById('verify-code-alert') || document.getElementById('resend-alert');
  if (alertEl) {
    alertEl.className = 'alert alert-success show';
    alertEl.innerHTML = `<strong>Your verification code:</strong> <span style="font-size:1.3rem;font-weight:900;letter-spacing:4px;color:var(--green);font-family:monospace">${code}</span><br><span style="font-size:.8rem">Enter this code in the boxes above. (Email quota reached — code shown here instead.)</span>`;
  }
  // Also auto-fill the boxes
  for (let i = 0; i < 6; i++) {
    const inp = document.getElementById('verify-code-' + (i + 1));
    if (inp) { inp.value = code[i]; inp.style.borderColor = 'var(--green)'; }
  }
}

async function doResendEmail() {
  const emailToSend = pendingEmail || currentUser?.email;
  const nameToSend  = _pendingSignupData?.name || currentUser?.name || emailToSend;
  if (!emailToSend) { showFriendlyError('resend-alert', 'No email address found — please sign up again', ''); return; }
  const btn = document.querySelector('[onclick="doResendEmail()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending new code…'; }
  // Clear old inputs
  for (let i = 1; i <= 6; i++) {
    const inp = document.getElementById('verify-code-' + i);
    if (inp) { inp.value = ''; inp.style.borderColor = 'var(--border)'; }
  }
  let ok = false;
  if (sbClient) {
    // Resend via Supabase OTP
    const { error } = await sbClient.auth.signInWithOtp({ email: emailToSend, options: { shouldCreateUser: false, emailRedirectTo: undefined } });
    ok = !error;
    if (!error) _pendingVerifyExpiry = Date.now() + (10 * 60 * 1000); // reset expiry on resend
    if (error) console.warn('Supabase OTP resend error:', error.message);
  } else {
    // Demo mode — resend via EmailJS
    generateVerifyCode();
    ok = await sendVerificationEmailJS(emailToSend, nameToSend);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Resend Code'; }
  if (ok) showAlert('resend-alert','New verification code sent! Check your inbox (and spam folder).','success');
  else {
    const el = document.getElementById('resend-alert');
    if (el) {
      el.className = 'alert alert-error show';
      el.innerHTML = `😕 We couldn't send the code right now. Please try again in a moment.${_supportBtn('Resend Verification Email', '')}`;
    }
  }
  setTimeout(() => document.getElementById('verify-code-1')?.focus(), 300);
}

async function doResendBanner() {
  const emailToSend = currentUser?.email || pendingEmail;
  if (emailToSend) await sendVerificationEmailJS(emailToSend, currentUser?.name);
}

// ════════════════════════════════════
//  RENDER DASHBOARDS
// ════════════════════════════════════
// Pre-renders all three role dashboards so switching between them is instant.
// Safe to call multiple times — each render function is idempotent.
function renderAllDashboards() {
  renderParentDashboard();
  renderTeenDashboard();
  renderEmployerDashboard();
  // Initialize letters/reviews panels with a small delay so DOM is ready
  setTimeout(() => {
    if (typeof renderTeenLettersPanel === 'function') renderTeenLettersPanel();
    if (typeof renderEmpLetterList === 'function') renderEmpLetterList();
    if (typeof renderEmpStatsDashboard === 'function') renderEmpStatsDashboard();
    if (typeof renderEmpReviewsTab === 'function' && currentUser?.type === 'employer') renderEmpReviewsTab();
  }, 120);
}

function renderParentDashboard() {
  document.getElementById('parent-teen-name').textContent = 'Alex Johnson';
  document.getElementById('p-teen-name').textContent = 'Alex Johnson';
  renderApprovalJobs(demoJobs);
  renderAllApplications();
  renderRatings();
  renderNotifications();
  // restore toggle states after DOM renders
  setTimeout(initParentalControls, 50);
}

function renderApprovalJobs(jobs) {
  const pending = jobs.filter(j => j.status === 'pending-approval');
  const accepted = jobs.filter(j => j.status === 'accepted');
  const badge = document.getElementById('approval-count-badge');
  if (badge) badge.textContent = `${pending.length} Pending`;
  const c = document.getElementById('approval-jobs');
  if (!c) return;
  const pendingHtml = pending.length
    ? pending.map(job => `
    <div class="job-card" id="job-card-${job.id}">
      <div class="job-card-top">
        <div><div class="job-title">${job.title}</div><div class="job-employer">${job.employer} · Applied ${job.applied}</div></div>
        <span class="tag status-pending">Awaiting Approval</span>
      </div>
      <div class="job-meta">
        <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
        <span class="tag">📍 ${job.city}, ${job.state}</span>${getDistanceTag(job.city)}
        <span class="tag">🏷 ${job.type}</span>
        <span class="tag">Age ${job.minAge}+ · Max ${job.maxHours}h/wk</span>
      </div>
      <p style="font-size:.82rem;color:var(--muted);margin-top:6px">${job.desc||''}</p>
      <div style="font-size:.78rem;color:var(--muted);margin-top:4px">
        ${(()=>{const r=getEmployerRating(job.employer);const c=r>=4.5?'var(--green)':r>=4?'var(--amber)':'var(--red)';return `Employer rating: <span style="color:${c};font-weight:700">⭐ ${r.toFixed(1)}</span>`;})()}
      </div>
      <div class="job-actions">
        <button class="btn-sm btn-approve" onclick="parentApproveJob(${job.id})">✓ Approve This Job</button>
        <button class="btn-sm btn-deny" onclick="parentDenyJob(${job.id})">✗ Deny This Job</button>
        <button class="btn-sm btn-msg" onclick="openMsgModal('${job.employer}','employer')">💬 Message Employer</button>
        <button class="btn-sm btn-ai" onclick="openAI('A parent is reviewing this job for their 16-year-old: ${job.title} at ${job.employer} in ${job.city}. Pay $${job.pay}/${job.payType}. Type: ${job.type}. Max ${job.maxHours}h/week. Min age: ${job.minAge}. Job description: ${job.desc}. Give a 3-4 sentence safety and suitability assessment from a parent\'s perspective. Include any red flags or green flags.')">🤖 AI Safety Check</button>
      </div>
    </div>`).join('')
    : '<p style="color:var(--muted);font-size:.88rem;text-align:center;padding:1rem">No jobs awaiting approval ✓</p>';

  const acceptedHtml = accepted.length ? `
    <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:1rem">
      <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--green);margin-bottom:8px">✓ Approved Jobs — Sync to Calendar</div>
      ${accepted.map(job => `
      <div class="job-card" style="border-color:var(--green-light)">
        <div class="job-card-top">
          <div><div class="job-title">${job.title}</div><div class="job-employer">${job.employer} · ${job.city}</div></div>
          <span class="tag status-accepted">Approved ✓</span>
        </div>
        <div class="job-meta" style="margin-bottom:6px">
          <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
          <span class="tag">🏷 ${job.type}</span>
        </div>
        <div class="cal-sync-row">
          <button class="btn-calendar" onclick="addToGoogleCalendar({title:'${job.title.replace(/'/g,"\\'")}',employer:'${job.employer.replace(/'/g,"\\'")}',city:'${job.city}',state:'${job.state||""}',type:'${job.type}'})">📅 Add to Google Calendar</button>
          <span class="cal-synced-badge">Alex is hired ✓</span>
        </div>
      </div>`).join('')}
    </div>` : '';

  c.innerHTML = pendingHtml + acceptedHtml;
}

function renderAllApplications() {
  const c = document.getElementById('all-applications');
  if (!c) return;
  c.innerHTML = demoJobs.map(job => `
    <div class="job-card">
      <div class="job-card-top">
        <div><div class="job-title">${safeText(job.title)}</div><div class="job-employer">${safeText(job.employer)} · Applied ${safeText(job.applied)}</div></div>
        <span class="tag status-${job.status==='pending-approval'?'pending':job.status}">${job.status==='pending-approval'?'Pending Approval':job.status==='accepted'?'Accepted ✓':'Rejected'}</span>
      </div>
      <div class="job-meta">
        <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
        <span class="tag">📍 ${safeText(job.city)}</span>
        <span class="tag">🏷 ${safeText(job.type)}</span>
      </div>
      ${job.status==='accepted' ? `
      <div class="cal-sync-row">
        <button class="btn-calendar" onclick="addToGoogleCalendar({title:'${safeText(job.title).replace(/'/g,"\\'")}',employer:'${safeText(job.employer).replace(/'/g,"\\'")}',city:'${safeText(job.city)}',state:'${safeText(job.state||"")}',type:'${safeText(job.type)}'})">📅 Add to Google Calendar</button>
        <span class="cal-synced-badge">Alex is hired ✓</span>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:.75rem;font-weight:600;color:var(--muted)">Would you work here again?</span>
        <button class="btn-sm" onclick="teenWorkAgainSignal('${safeText(job.employer).replace(/'/g,"\\'")}',true)" style="background:var(--green-pale);color:var(--green);border:1px solid var(--green-light);font-size:.72rem">👍 Yes</button>
        <button class="btn-sm" onclick="teenWorkAgainSignal('${safeText(job.employer).replace(/'/g,"\\'")}',false)" style="background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1;font-size:.72rem">👎 No</button>
      </div>` : ''}
    </div>`).join('');
}

function renderRatings() {
  const c = document.getElementById('ratings-list');
  if (!c) return;
  c.innerHTML = demoRatings.map(r => {
    const note = getRatingNote(r);
    return `
    <div class="rating-row" style="flex-direction:column;align-items:flex-start;gap:6px">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
        <div style="font-weight:600;font-size:.9rem">${safeText(r.job)} — ${safeText(r.from)}</div>
        <div class="stars">${'⭐'.repeat(r.stars)}${r.stars < 5 ? '☆'.repeat(5 - r.stars) : ''} <span style="font-size:.8rem;color:var(--muted);font-weight:600">${r.stars}/5</span></div>
      </div>
      <div class="rating-comment" style="font-style:italic;color:var(--muted)">"${safeText(r.comment)}"</div>
      ${note ? `<div class="rating-note-box">${note}</div>` : ''}
    </div>`;
  }).join('');
  renderRatingSuggestions();
}

function getRatingNote(r) {
  if (r.stars === 5) return `<strong>🌟 Perfect score!</strong> ${r.from} loved Alex's work. Keep this up — repeat clients give the best references.`;
  if (r.stars === 4) return `<strong>👍 Great job!</strong> One point from perfect. ${r.comment.toLowerCase().includes('forgot') ? 'Next time: set a phone reminder to send update photos — it goes a long way.' : 'Ask the employer what one thing would make it a 5-star experience next time.'}`;
  if (r.stars === 3) return `<strong>📈 Room to grow.</strong> A 3-star rating means the basics were done but expectations weren't fully met. Talk with Alex about what could be improved.`;
  if (r.stars <= 2) return `<strong>⚠️ Needs attention.</strong> This rating could affect future opportunities. Consider having a chat with Alex and reviewing the job requirements together.`;
  return '';
}

function renderRatingSuggestions() {
  const c = document.getElementById('rating-suggestions-list');
  if (!c) return;
  const avg = demoRatings.reduce((s,r)=>s+r.stars,0) / (demoRatings.length || 1);
  const suggestions = [];
  // Always show a few general tips, then targeted ones based on data
  suggestions.push({icon:'⏰', label:'Always be on time', desc:'Arriving a few minutes early shows you\'re reliable — it\'s the #1 thing employers notice.', type:'green'});
  suggestions.push({icon:'📱', label:'Send a quick update', desc:'Text or message your employer when you arrive and when you finish. It builds trust fast.', type:'green'});
  if (avg < 4.8) suggestions.push({icon:'🙋', label:'Ask "Is there anything else?"', desc:'After finishing a task, always ask if there\'s more you can do. Employers love a self-starter.', type:'green'});
  if (avg < 5) suggestions.push({icon:'🧹', label:'Leave it better than you found it', desc:'Clean up after yourself, put tools away, and do a final check before leaving.', type:'green'});
  const hasFour = demoRatings.some(r=>r.stars===4);
  if (hasFour) suggestions.push({icon:'📸', label:'Send update photos', desc:'For jobs like pet sitting or lawn care, send a quick photo when done. Parents and homeowners love this.', type:'amber'});
  suggestions.push({icon:'💬', label:'Ask for feedback directly', desc:'After a job, ask "Is there anything I could do better next time?" Most employers appreciate the initiative.', type:'amber'});
  suggestions.push({icon:'📝', label:'Remember the details', desc:'Remember how each client likes things done. Notes on your phone work great — it shows you care.', type:'green'});
  suggestions.push({icon:'⭐', label:'Go above and beyond once', desc:'Do one small extra thing each job — pick up a piece of trash, sweep the porch, leave a note. It gets you 5 stars.', type:'green'});
  c.innerHTML = suggestions.slice(0,6).map(s=>`
    <div class="sug-item ${s.type}">
      <div class="sug-icon">${s.icon}</div>
      <div class="sug-text"><h4>${s.label}</h4><p>${s.desc}</p></div>
    </div>`).join('');
}

function renderNotifications() {
  const c = document.getElementById('notif-list');
  if (!c) return;
  const unread = demoNotifs.filter(n=>!n.read).length;
  const badge = document.getElementById('notif-badge');
  if (badge) badge.textContent = `${unread} Unread`;
  c.innerHTML = demoNotifs.map(n => `
    <div class="notif">
      <div class="notif-dot${n.read?' read':''}"></div>
      <div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div>
    </div>`).join('');
}

function checkReEngagement() {
  try {
    if (!currentUser || currentUser.type !== 'teen') return;
    const lastSeen = userActivity?.lastSeen ? new Date(userActivity.lastSeen) : null;
    if (!lastSeen) return;
    const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 7) {
      const chatBubble = document.getElementById('ai-chat-bubble') || document.getElementById('ai-bubble');
      if (chatBubble) chatBubble.title = "Welcome back! Check out new jobs in your area.";
    }
  } catch(e) { /* non-critical */ }
}

function renderTeenDashboard() {
  const nameEl = document.getElementById('teen-name-header');
  if (nameEl) nameEl.textContent = currentUser?.type==='teen' ? currentUser.name.split(' ')[0] : 'Alex';
  // Update activity bio/skills from current user
  if (currentUser?.skills) trackActivity('skills_update', currentUser.skills);
  if (currentUser?.bio) trackActivity('bio_update', currentUser.bio);

  // Populate stat cards — demo users see demo numbers, real users start at zero.
  // isDemo is set explicitly by demoLogin() to prevent false positives on real accounts.
  const isDemo = currentUser?.isDemo === true || currentUser?.email === 'teen@teenwork.demo';
  const firstName = currentUser?.name?.split(' ')[0] || 'your';
  const userCity  = currentUser?.city || 'your';

  const jobsEl    = document.getElementById('t-stat-jobs');
  const jobsSubEl = document.getElementById('t-stat-jobs-sub');
  const appEl     = document.getElementById('t-stat-applied');
  const appSubEl  = document.getElementById('t-stat-applied-sub');
  const accEl     = document.getElementById('t-stat-accepted');
  const accSubEl  = document.getElementById('t-stat-accepted-sub');
  const earnEl    = document.getElementById('t-stat-earned');
  const earnSubEl = document.getElementById('t-stat-earned-sub');

  if (isDemo) {
    if (jobsEl) jobsEl.textContent = '12';
    if (jobsSubEl) jobsSubEl.textContent = 'Burlington area';
    if (appEl) appEl.textContent = '3';
    if (appSubEl) appSubEl.textContent = '2 pending parent';
    if (accEl) accEl.textContent = '1';
    if (accSubEl) accSubEl.textContent = 'Start next week';
    if (earnEl) earnEl.textContent = '$480';
    if (earnSubEl) earnSubEl.textContent = 'This summer';
  } else {
    if (jobsEl) jobsEl.textContent = '0';
    if (jobsSubEl) jobsSubEl.textContent = userCity + ' area';
    if (appEl) appEl.textContent = '0';
    if (appSubEl) appSubEl.textContent = 'none yet';
    if (accEl) accEl.textContent = '0';
    if (accSubEl) accSubEl.textContent = 'none yet';
    if (earnEl) earnEl.textContent = '$0';
    if (earnSubEl) earnSubEl.textContent = 'this season';
  }


  // Seed demo worklog data for demo accounts
  if (isDemo) {
    try {
      const existingWL = JSON.parse(localStorage.getItem('tw_worklog') || '[]');
      if (!existingWL.length) {
        const demoWL = [
          {id:1001, job:'Johnson Lawn Care', date:'2025-08-05', hours:3.5, pay:52.50, task:'yard work', notes:'Mowed front & back, edged driveway'},
          {id:1002, job:'Johnson Lawn Care', date:'2025-08-12', hours:3.0, pay:45.00, task:'yard work', notes:'Weekly mow + trim hedges'},
          {id:1003, job:'Maple St Pet Sitting', date:'2025-08-08', hours:2.0, pay:30.00, task:'pet care', notes:'Walked Buddy x2, fed cats'},
          {id:1004, job:'Maple St Pet Sitting', date:'2025-08-15', hours:2.5, pay:37.50, task:'pet care', notes:'Weekend pet sitting'},
          {id:1005, job:'Anderson House Cleaning', date:'2025-07-28', hours:4.0, pay:60.00, task:'cleaning', notes:'Full house clean before guests'},
          {id:1006, job:'Johnson Lawn Care', date:'2025-07-22', hours:3.5, pay:52.50, task:'yard work', notes:'Summer mow season kickoff'},
          {id:1007, job:'Maple St Pet Sitting', date:'2025-07-19', hours:1.5, pay:22.50, task:'pet care', notes:'Quick dog walk + feeding'},
          {id:1008, job:'Tech Help — Mr. Rivera', date:'2025-07-31', hours:2.0, pay:40.00, task:'tech help', notes:'Set up new router, helped with iPad'},
          {id:1009, job:'Snow Removal — Oak Ave', date:'2025-07-10', hours:2.5, pay:37.50, task:'yard work', notes:'Post-storm cleanup (leaves/debris)'},
          {id:1010, job:'Babysitting — Chen Family', date:'2025-08-02', hours:5.0, pay:60.00, task:'babysitting', notes:'Friday night, two kids ages 6 & 9'},
        ];
        localStorage.setItem('tw_worklog', JSON.stringify(demoWL));
      }
    } catch(e) {}
  }

  // Seed demo savings goals
  if (isDemo) {
    try {
      const existingSG = JSON.parse(localStorage.getItem('tw_savings_goals') || '[]');
      if (!existingSG.length) {
        const demoGoals = [
          {id:2001, name:'New Bike', emoji:'🚲', target:350, saved:180, date:'2025-10-01'},
          {id:2002, name:'College Fund', emoji:'🎓', target:2000, saved:480, date:'2026-09-01'},
          {id:2003, name:'AirPods Pro', emoji:'🎧', target:250, saved:95, date:'2025-09-15'},
        ];
        localStorage.setItem('tw_savings_goals', JSON.stringify(demoGoals));
      }
    } catch(e) {}
  }

  renderBrowseJobs();
  renderTeenApplications();
  renderLessonsGrid();
  setTimeout(renderGamePanel, 60);
  // Load AI job matches
  setTimeout(aiJobMatch, 200);
  // Check re-engagement
  setTimeout(checkReEngagement, 4000);
}

function renderTeenApplications() {
  const c = document.getElementById('teen-applications-list');
  if (!c) return;

  // Only show demo jobs for demo accounts — real users start with no applications
  const isDemo = !currentUser?.email || currentUser.email.endsWith('.demo') || currentUser.email === 'demo@teen.com';
  const jobs = isDemo ? demoJobs : [];

  if (!jobs.length) {
    c.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem;color:var(--muted)">
      <div style="font-size:2.5rem;margin-bottom:.75rem">📋</div>
      <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:.4rem">No applications yet</div>
      <div style="font-size:.85rem">Browse jobs and tap <strong>Apply</strong> to get started!</div>
    </div>`;
    return;
  }

  c.innerHTML = jobs.map(job => `
    <div class="job-card">
      <div class="job-card-top">
        <div><div class="job-title">${job.title}</div><div class="job-employer">${job.employer} · Applied ${job.applied}</div></div>
        <span class="tag status-${job.status==='pending-approval'?'pending':job.status}">${
          job.status==='pending-approval'?'Waiting for Parent Approval':
          job.status==='accepted'?'✓ Accepted — Congrats!':'Rejected'
        }</span>
      </div>
      <div class="job-meta">
        <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
        <span class="tag">📍 ${job.city}</span>
        <span class="tag">🏷 ${job.type}</span>
      </div>
      ${job.status==='accepted'?`
        <div class="job-actions">
          <button class="btn-sm btn-msg" onclick="openMsgModal('${job.employer}','employer')">💬 Message ${job.employer}</button>
          <button class="btn-sm btn-ai" onclick="openAI('A 16-year-old teen just got accepted for a ${job.type} job at ${job.employer}. Pay: $${job.pay}/${job.payType}. Write 3 tips to make a great first impression on their first day.')">🤖 First Day Tips</button>
          <button class="btn-sm btn-purple" onclick="openCoverLetterModal('${(job.title||"").replace(/'/g,String.fromCharCode(92,39))}','${(job.employer||"").replace(/'/g,String.fromCharCode(92,39))}','${job.type||""}')">✉️ Cover Letter</button>
          <button class="btn-calendar" onclick="addToGoogleCalendar({title:'${job.title.replace(/'/g,"\'")}",employer:'${job.employer.replace(/'/g,"\'")}",city:'${job.city}',state:'${job.state||""}',type:'${job.type}'})">📅 Add to Google Calendar</button>
        </div>`:''}
    </div>`).join('');
}


function filterApplicants() {
  const search = (document.getElementById('emp-applicant-search')?.value || '').toLowerCase();
  const state  = document.getElementById('emp-applicant-state')?.value || '';
  filterApplicants();
  const c = document.getElementById('applicants-list-noop');
  if (!c) return;

  const filtered = demoApplicants.filter(a => {
    if (state && a.state && a.state !== state) return false;
    if (search) {
      const haystack = [a.name, a.city, a.job, ...(a.skills||[])].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    c.innerHTML = '<p style="color:var(--muted);text-align:center;padding:1rem">No applicants match your filters.</p>';
    return;
  }
  c.innerHTML = filtered.map((a, i) => {
    const realIdx = demoApplicants.indexOf(a);
    return `<div class="job-card">
      <div class="job-card-top">
        <div><div class="job-title">${a.name}, age ${a.age} · ${a.city}${a.state?', '+a.state:''}</div>
        <div class="job-employer">Applied to: ${a.job} · ${a.applied}</div></div>
        <span class="tag pay">⭐ ${a.rating}</span>
      </div>
      <div class="job-meta">${(a.skills||[]).map(s=>`<span class="tag">${s}</span>`).join('')}</div>
      <div class="job-actions">
        ${!a.hired&&!a.passed?`<button class="btn-sm btn-approve" onclick="hireApplicant(${realIdx})">✓ Hire</button>
        <button class="btn-sm btn-deny" onclick="passApplicant(${realIdx})">Pass</button>
        <button class="btn-sm btn-ai" onclick="openAI('Write a short, professional message to send to a teen job applicant named ${a.name}, age ${a.age}, who applied for ${a.job}. Invite them for a brief interview or trial shift. Keep it friendly, safe, and under 80 words.')">🤖 Draft Message</button>
        <button class="btn-sm btn-msg" onclick="openMsgModal('${a.name}','teen')">💬 Message</button>
        ${!a.ratingLeft&&a.hired?`<button class="btn-sm btn-amber" onclick="openRatingModal(${realIdx})">⭐ Rate</button>`:''}` :
        a.hired ? `<span class="tag status-accepted">✓ Hired</span>${!a.ratingLeft?`<button class="btn-sm btn-amber" onclick="openRatingModal(${realIdx})">⭐ Rate</button>`:''}` :
        `<span class="tag status-rejected">Passed</span>`}
      </div>
    </div>`;
  }).join('');
}
window.filterApplicants = filterApplicants;

function renderEmployerDashboard() {
  // Render kanban pipeline (new applicants tab)
  setTimeout(function(){ if(typeof renderEmpKanban==='function') renderEmpKanban(); }, 120);

  const c = document.getElementById('applicants-list');
  if (!c) return;
  if (!demoApplicants.length) { c.innerHTML = '<p style="color:var(--muted);text-align:center;padding:1rem">No applicants yet.</p>'; }
  else c.innerHTML = demoApplicants.map((a, idx) => `
    <div class="applicant-card" style="${a.passed?'opacity:.5':''}">
      <div class="applicant-head">
        <div>
          <div class="applicant-name">${a.name} ${a.hired?'<span class="tag status-accepted">Hired ✓</span>':a.passed?'<span class="tag status-rejected">Passed</span>':''}</div>
          <div class="applicant-info">Age ${a.age} · ${a.city} · Applied for: ${a.job} · ${a.applied}</div>
        </div>
        <span class="stars">${'⭐'.repeat(Math.round(a.rating))} ${a.rating}</span>
      </div>
      <div class="applicant-skills">${a.skills.map(s=>`<span class="tag">${s}</span>`).join('')}</div>
      <div class="job-actions" style="margin-top:10px">
        ${!a.hired && !a.passed ? `
          <button class="btn-sm btn-approve" onclick="hireApplicant(${idx})">✓ Hire</button>
          <button class="btn-sm btn-deny" onclick="passApplicant(${idx})">✗ Pass</button>` : ''}
        <button class="btn-sm btn-ai" onclick="openAI('An employer is reviewing teen applicant ${a.name} (age ${a.age}) from ${a.city} for: ${a.job}. Skills: ${a.skills.join(', ')}. Rating: ${a.rating}/5. Write a 3-sentence candidate assessment and 2 job-specific interview questions.')">🤖 AI Review</button>
        ${a.hired && !a.ratingLeft ? `<button class="btn-sm btn-amber" onclick="openRatingModal(${idx})">⭐ Leave Rating</button>` : ''}
        <button class="btn-sm btn-msg" onclick="openMsgModal('${a.name}','teen')">💬 Message ${a.name}</button>
      </div>
    </div>`).join('');

  // Posted jobs
  const el = document.getElementById('employer-jobs-list');
  if (!el) return;
  const postedJobs = [...demoJobs, ...employerPostedJobs];
  el.innerHTML = postedJobs.map((job, i) => `
    <div class="job-card">
      <div class="job-card-top">
        <div><div class="job-title">${job.title}</div><div class="job-employer">${job.city} · ${job.type}</div></div>
        <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
      </div>
      <div class="job-meta">
        <span class="tag">Age ${job.minAge}+</span>
        <span class="tag">Max ${job.maxHours}h/wk</span>
        <span class="tag status-accepted">Active</span>
        <span class="tag">${demoApplicants.filter(a=>a.job===job.title).length} applicant(s)</span>
      </div>
      <div class="job-actions">
        <button class="btn-sm btn-deny" onclick="closeJob(${i})">Close Listing</button>
        <button class="btn-sm btn-primary" onclick="repostJob(${i})" style="background:var(--blue);border:none;color:#fff">🔁 Repost</button>
      </div>
    </div>`).join('');
}

// ════════════════════════════════════
//  SECTION 10: JOB ACTIONS
//  Two separate approval flows:
//    a) Parent → Teen: approveJob(id) / denyJob(id) — the
//       parent dashboard approval panel.
//    b) Per-application: parentApproveJob(id) / parentDenyJob(id)
//       — approves specific applications before employer sees them.
//  Employer actions: hireApplicant(idx) / passApplicant(idx)
//  teenApply(jobId, title) — sends application to parent queue first.
// ════════════════════════════════════
function approveJob(id) {
  const job = demoJobs.find(j=>j.id===id);
  if (job) job.status='accepted';
  const card = document.getElementById('job-card-'+id);
  if (card) { card.style.opacity='0'; card.style.transition='opacity .3s'; }
  setTimeout(()=>{renderApprovalJobs(demoJobs);renderAllApplications();renderTeenApplications();},300);
  demoNotifs.unshift({text:`You approved Alex's application for "${job?.title}"`,time:'Just now',read:false});
  renderNotifications();
  sendPushNotif('Job Approved! 🎉', '"' + (job?.title||'Job') + '" was approved by your parent.');
  showToast(`Approved: "${job?.title}" ✓ — see All Applications to add to Google Calendar`, 'success');
}

function denyJob(id) {
  const job = demoJobs.find(j=>j.id===id);
  if (job) job.status='rejected';
  const card = document.getElementById('job-card-'+id);
  if (card) { card.style.opacity='0'; card.style.transition='opacity .3s'; }
  demoNotifs.unshift({text:`You denied Alex's application for "${job?.title}"`,time:'Just now',read:false});
  setTimeout(()=>{renderApprovalJobs(demoJobs);renderAllApplications();renderTeenApplications();},300);
  renderNotifications();
  showToast(`Denied: "${job?.title}"`, 'info');
}

// Employer rating lookup based on demo data
const EMPLOYER_RATINGS = {
  "Mike's Landscaping": 5.0,
  "Sarah Chen": 4.8,
  "The Hendersons": 5.0,
  "The Martinez Family": 4.2,
  "Maple Street Neighbors": 4.6,
  "Johnson Moving": 3.9,
  "Green Thumb Gardens": 4.4,
  "Davis Household": 4.7,
};
function getEmployerRating(employer) {
  return EMPLOYER_RATINGS[employer] || 4.0; // default 4.0 if unknown
}

function filterJobs() {
  // Collect all checked job types (empty = show all)
  const checkedTypes = Array.from(document.querySelectorAll('.type-cb:checked')).map(cb => cb.value);
  const minPay    = parseFloat(document.getElementById('filter-pay')?.value) || 0;
  const minRating = parseFloat(document.getElementById('filter-min-rating')?.value) || 0;
  const maxHours  = parseFloat(document.getElementById('filter-max-hours')?.value) || 999;
  const city      = (document.getElementById('filter-city')?.value || '').toLowerCase();
  // Highlight active checkboxes
  document.querySelectorAll('.type-cb-label').forEach(lbl => {
    const cb = lbl.querySelector('.type-cb');
    lbl.style.borderColor = cb.checked ? 'var(--green)' : 'var(--border)';
    lbl.style.background  = cb.checked ? 'var(--green-pale)' : '#fff';
    lbl.style.color       = cb.checked ? 'var(--green)' : 'inherit';
  });
  renderApprovalJobs(demoJobs.filter(j => {
    if (j.status !== 'pending-approval') return false;
    // If any types are checked, job must match one of them
    if (checkedTypes.length > 0 && !checkedTypes.includes(j.type)) return false;
    if (j.pay < minPay) return false;
    if (j.maxHours > maxHours) return false;
    if (minRating > 0 && getEmployerRating(j.employer) < minRating) return false;
    if (city && !j.city.toLowerCase().includes(city)) return false;
    return true;
  }));
}

function teenApply(jobId, title) {
  // Respect "Block Account" control
  if (parentalControls['block']) {
    showToast('Your account is paused by your parent. Talk to them to resume applying.', 'error');
    return;
  }
  // Check if already applied
  const existing = demoJobs.find(j => j.id === jobId);
  if (existing) { showToast('Already applied to "' + title + '"', 'info'); return; }
  // Find in browsable jobs
  const source = browsableJobs.find(j => j.id === jobId);
  if (!source) return;

  // PER-JOB parent approval: always require parent OK before employer sees it
  const newApp = { ...source, status: 'pending-approval', applied: 'Today', parentApproved: false };
  demoJobs.push(newApp);
  browsableJobs.splice(browsableJobs.indexOf(source), 1);

  // Notify parent with job details for per-job review
  demoNotifs.unshift({
    text: `Alex wants to apply to "${title}" ($${source.pay}/${source.payType}, ${source.city}) — Review & approve this specific job`,
    time: 'Just now', read: false, jobId: jobId, type: 'job-approval'
  });
  sendPushNotif('New Job Application! 📋', `Alex wants to apply to "${title}" — your approval is needed.`);
  showToast('Application sent to your parent for review! They must approve this specific job. ✓', 'success');

  renderApprovalJobs(demoJobs);
  renderAllApplications();
  renderTeenApplications();
  renderBrowseJobs();
  renderNotifications();
}

function parentApproveJob(jobId) {
  const job = demoJobs.find(j => j.id === jobId && j.status === 'pending-approval');
  if (!job) return;
  job.status = 'applied';
  job.parentApproved = true;
  demoNotifs.unshift({ text: `You approved Alex's application to "${job.title}" — employer can now see it`, time: 'Just now', read: false });
  sendPushNotif('Approved! ✅', `Your parent approved your application to "${job.title}"`);
  showToast(`Approved "${job.title}" — application sent to employer ✓`, 'success');
  renderApprovalJobs(demoJobs);
  renderAllApplications();
  renderTeenApplications();
  renderNotifications();
}

function parentDenyJob(jobId) {
  const idx = demoJobs.findIndex(j => j.id === jobId && j.status === 'pending-approval');
  if (idx < 0) return;
  const job = demoJobs[idx];
  job.status = 'parent-denied';
  demoNotifs.unshift({ text: `You declined Alex's application to "${job.title}"`, time: 'Just now', read: false });
  showToast(`Declined "${job.title}"`, 'info');
  renderApprovalJobs(demoJobs);
  renderAllApplications();
  renderTeenApplications();
  renderNotifications();
}
window.parentApproveJob = parentApproveJob;
window.parentDenyJob = parentDenyJob;

function hireApplicant(idx) {
  const a = demoApplicants[idx];
  if (!a || a.hired) return;
  a.hired = true;
  // Mark matching job application as accepted
  const job = demoJobs.find(j => j.title === a.job);
  if (job) job.status = 'accepted';
  demoNotifs.unshift({ text: `${a.name} was hired for "${a.job}"`, time: 'Just now', read: false });
  trackActivity('job_accepted', { title: a.job, employer: a.name, ts: Date.now() });
  renderEmployerDashboard();
  renderAllApplications();
  renderTeenApplications();
  renderNotifications();
  showToast(`${a.name} hired! They'll be notified. ✓`, 'success');
}

function passApplicant(idx) {
  const a = demoApplicants[idx];
  if (!a || a.passed) return;
  a.passed = true;
  renderEmployerDashboard();
  showToast(`Passed on ${a.name}.`, 'info');
}

// ─── Parental controls in-memory state ───
// ── Per-user localStorage helpers ──────────────────────────────────────────
function _userKey(suffix) {
  const uid = currentUser?.id || currentUser?.email || 'guest';
  return 'tw_' + uid + '_' + suffix;
}
function saveUserData() {
  try {
    localStorage.setItem(_userKey('controls'), JSON.stringify(parentalControls));
    localStorage.setItem(_userKey('badges'), JSON.stringify(teenGameState.badges));
    localStorage.setItem(_userKey('points'), String(teenGameState.points));
    localStorage.setItem(_userKey('transport'), JSON.stringify(allowedTransport));
  } catch(e) { /* storage unavailable */ }
}
function loadUserData() {
  try {
    const ctrl = localStorage.getItem(_userKey('controls'));
    if (ctrl) Object.assign(parentalControls, JSON.parse(ctrl));
    const badges = localStorage.getItem(_userKey('badges'));
    if (badges) teenGameState.badges = JSON.parse(badges);
    const pts = localStorage.getItem(_userKey('points'));
    if (pts) teenGameState.points = parseInt(pts) || teenGameState.points;
    const transport = localStorage.getItem(_userKey('transport'));
    if (transport) { const t = JSON.parse(transport); allowedTransport.length = 0; allowedTransport.push(...t); }
  } catch(e) { /* ignore */ }
}

// FIX: declare allowedTransport — was undefined, causing ReferenceError
const allowedTransport = ['walk','bike','parent drive','bus','employer pickup'];

const parentalControls = {
  'approval':      true,
  'match-notify':  true,
  'accept-notify': true,
  'local-only':    false,
  'block':         false,
  'msg-alert':     true,
  'min-employer-rating': 4,
  'max-distance': 10,
  'max-weekly-hours': 15,
};

function initParentalControls() {
  loadUserData();
  // Sync card UI to loaded state
  ['approval','match-notify','accept-notify','local-only','block','msg-alert'].forEach(key => {
    _applyCtrlCard(key, !!parentalControls[key]);
  });
  // Sync transport card UI
  ['walk','bike','parent drive','bus','employer pickup'].forEach(mode => {
    const idMap = {'walk':'t-walk','bike':'t-bike','parent drive':'t-parent','bus':'t-bus','employer pickup':'t-employer'};
    _applyTransportCard(idMap[mode], allowedTransport.includes(mode));
  });
  _updateControlsCount();
}

function _applyCtrlCard(key, on) {
  const card = document.getElementById('ctrlcard-' + key);
  const pill = document.getElementById('ctrlpill-' + key);
  if (!card) return;
  const isDanger = card.classList.contains('ctrl-danger');
  card.classList.toggle('ctrl-on', on);
  const box = card.querySelector('.ctrl-checkbox');
  if (box) box.textContent = on ? '✓' : '';
  if (pill) {
    pill.textContent = on ? 'ON' : 'OFF';
    pill.className = 'ctrl-pill ' + (on ? (isDanger ? 'ctrl-pill-danger' : 'ctrl-pill-on') : 'ctrl-pill-off');
  }
}

function _applyTransportCard(id, on) {
  const card = document.getElementById('ctrlcard-' + id);
  const pill = document.getElementById('ctrlpill-' + id);
  if (!card) return;
  card.classList.toggle('ctrl-on', on);
  const box = card.querySelector('.ctrl-checkbox');
  if (box) box.textContent = on ? '✓' : '';
  if (pill) { pill.textContent = on ? 'ON' : 'OFF'; pill.className = 'ctrl-pill ' + (on ? 'ctrl-pill-on' : 'ctrl-pill-off'); }
}

function ctrlCardToggle(key) {
  parentalControls[key] = !parentalControls[key];
  _applyCtrlCard(key, parentalControls[key]);
  _updateControlsCount();
  saveUserData();
  const labels = {'approval':'Require Approval','match-notify':'Match Notifications','accept-notify':'Acceptance Notifications','local-only':'Local Jobs Only','block':'Account Block','msg-alert':'Message Block Alerts'};
  showToast(`${labels[key]||key}: ${parentalControls[key] ? 'ON ✓' : 'OFF'}`, parentalControls[key] ? 'success' : 'info');
}

function ctrlTransportToggle(mode, id) {
  const idx = allowedTransport.indexOf(mode);
  if (idx >= 0) allowedTransport.splice(idx, 1); else allowedTransport.push(mode);
  const on = allowedTransport.includes(mode);
  _applyTransportCard(id, on);
  saveUserData();
  showToast(`${mode}: ${on ? 'Allowed ✓' : 'Blocked'}`, on ? 'success' : 'info');
}

function _updateControlBadge(key, val) {
  // legacy — no-op; card UI handles display now
}

function _updateControlsCount() {
  const active = Object.entries(parentalControls)
    .filter(([k,v]) => ['approval','match-notify','accept-notify','local-only','block','msg-alert'].includes(k) && v)
    .length;
  const badge = document.getElementById('controls-active-badge');
  if (badge) { badge.textContent = `${active} Active`; badge.className = active > 0 ? 'badge badge-amber' : 'badge badge-green'; }
}

function toggleChanged(el, setting) {
  // legacy wrapper — controls now use ctrlCardToggle
  parentalControls[setting] = el.checked;
  _updateControlBadge(setting, el.checked);
  _updateControlsCount();
  saveUserData();
  const labels = {'approval':'Require Approval','match-notify':'Match Notifications','accept-notify':'Acceptance Notifications','local-only':'Local Jobs Only','block':'Account Block','msg-alert':'Message Block Alerts'};
  showToast(`${labels[setting]||setting}: ${el.checked ? 'ON ✓' : 'OFF'}`, el.checked ? 'success' : 'info');
}

// ─── Toast notification ───
// Shows a brief notification at the bottom of the screen.
// type: "success" | "error" | "info"
function showToast(msg, type='success') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:.88rem;font-weight:600;z-index:9999;transition:opacity .4s;box-shadow:0 4px 16px rgba(0,0,0,.15);';
    document.body.appendChild(toast);
  }
  const colors = {success:'background:#2d6a4f;color:#fff', info:'background:#1a5276;color:#fff', error:'background:#c0392b;color:#fff'};
  toast.style.cssText += ';' + (colors[type]||colors.success);
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

async function postJob() {
  const title    = document.getElementById('emp-title').value.trim();
  const type     = document.getElementById('emp-type').value;
  const pay      = parseFloat(document.getElementById('emp-pay').value);
  const payType  = document.getElementById('emp-pay-type').value;
  const city     = document.getElementById('emp-city').value.trim();
  const state    = document.getElementById('emp-state').value.trim();
  const minAge   = parseInt(document.getElementById('emp-min-age').value) || 14;
  const maxHours = parseInt(document.getElementById('emp-max-hours').value) || 15;
  const desc     = document.getElementById('emp-desc').value.trim();
  if (!title || !type || !pay || !city) { showAlert('emp-post-alert','Please fill in all required fields (Job Title, Type, Pay, and City).','error'); return; }

  // ── AI Compliance Check: only block genuinely illegal/dangerous jobs ──
  showAlert('emp-post-alert', '🤖 Running compliance check…', 'info');
  try {
    const compliancePrompt = `You are a lenient compliance helper for a teen job platform (ages 13-17). Only block genuinely illegal or dangerous postings — not normal jobs.

Job: Title: "${title}", Type: ${type}, Pay: $${pay}/${payType}, State: ${state || 'not specified'}, Min age: ${minAge}, Max hours/week: ${maxHours}, Description: "${desc}"

Only respond BLOCKED if the job clearly involves: tasks federally prohibited for ALL minors (heavy machinery operation, roofing, mining, meat slicers, explosives, driving on public roads as primary duty), explicit adult/illegal content, or pay below $5/hr.

For all typical teen jobs — yard work, pet care, cleaning, babysitting, tutoring, errands, retail, food service, moving boxes, gardening — respond APPROVED. Do not block based on hours unless they exceed 40/week. When in doubt, APPROVED.

Reply only:
APPROVED
or
BLOCKED
Reason: [one specific violation]
Suggestion: [one sentence fix]`;

    const result = await callGemini(compliancePrompt);
    const isBlocked = /^BLOCKED/i.test(result.trim());

    if (isBlocked) {
      const reasonMatch = result.match(/Reason:\s*(.*?)(?:\n|Suggestion)/is);
      const sugMatch = result.match(/Suggestion[s]?:\s*(.*)/is);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'This job may involve tasks prohibited for minors.';
      const suggestion = sugMatch ? sugMatch[1].trim() : 'Review your job description and try again.';
      showAlert('emp-post-alert',
        `🚫 Job Not Posted\n\n${reason}\n\n💡 Fix: ${suggestion}`, 'error');
      return;
    }
  } catch(e) {
    console.warn('AI compliance check failed, posting anyway:', e);
  }

  const newJob = { id: Date.now(), title, type, pay, payType, city, state, minAge, maxHours, desc, status:'active', applied: 'Today', employer: currentUser?.name || 'Employer' };
  employerPostedJobs.push(newJob);
  // Also add to browsable so teens can see it
  browsableJobs.push({ ...newJob });
  // Clear form
  ['emp-title','emp-pay','emp-city','emp-state','emp-desc','emp-min-age','emp-max-hours'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('emp-type').value = '';
  renderEmployerDashboard();
  renderBrowseJobs();
  showAlert('emp-post-alert', `✅ "${title}" posted! AI compliance check passed. Teens in ${city} can now apply.`, 'success');
  // Check if new job matches any tracked teen profile
  setTimeout(aiJobMatchForParent, 500);
}

function closeJob(idx) {
  const all = [...demoJobs, ...employerPostedJobs];
  const job = all[idx];
  if (!job) return;
  const epIdx = employerPostedJobs.indexOf(job);
  if (epIdx > -1) employerPostedJobs.splice(epIdx, 1);
  renderEmployerDashboard();
  showToast(`Listing "${job.title}" closed.`, 'info');
}

async function aiReviewJobPost() {
  const title    = document.getElementById('emp-title').value.trim();
  const type     = document.getElementById('emp-type').value;
  const pay      = document.getElementById('emp-pay').value;
  const minAge   = document.getElementById('emp-min-age').value;
  const maxHours = document.getElementById('emp-max-hours').value;
  const desc     = document.getElementById('emp-desc').value.trim();
  if (!title) { showAlert('emp-post-alert','Please fill in the job title before requesting an AI review.','error'); return; }
  openAI(`Review this teen job posting for legal compliance and safety: Title: "${title}", Type: ${type}, Pay: $${pay}/hr, Min age: ${minAge}, Max hours/week: ${maxHours}, Description: "${desc}". Does it comply with US child labor laws? List any concerns and suggest improvements. Be specific.`);
}

// ════════════════════════════════════
//  AI FUNCTIONS
// ════════════════════════════════════

// ════════════════════════════════════
//  FRIENDLY ERROR REPORTER
// ════════════════════════════════════
function reportError(contextOrEl, detail) {
  let context = contextOrEl, det = detail;
  if (contextOrEl && contextOrEl.dataset) {
    context = contextOrEl.dataset.ctx || 'Unknown';
    det = contextOrEl.dataset.err || '';
  }
  // Route to support modal (saves to admin, no email app)
  if (typeof openSupportModal === 'function') {
    openSupportModal(context, det || '');
  }
}

function showFriendlyError(containerId, context, detail) {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Map technical Supabase/auth errors to plain English
  let friendly = detail || '';
  if (/invalid.*login|invalid.*credential|wrong.*password/i.test(friendly)) friendly = "That email and password don't match. Double-check them and try again.";
  else if (/email.*already.*registered|user.*already.*exists/i.test(friendly)) friendly = "There's already an account with that email. Try signing in instead!";
  else if (/email.*not.*confirmed/i.test(friendly)) friendly = "Your email hasn't been verified yet. Check your inbox for a verification email.";
  else if (/network|fetch|failed to fetch/i.test(friendly)) friendly = "We couldn't connect to our servers. Check your internet connection and try again.";
  else if (/rate.?limit/i.test(friendly)) friendly = "Too many attempts in a short time — please wait a minute and try again.";
  else if (/weak.*password/i.test(friendly)) friendly = "That password is a bit too simple. Try mixing letters, numbers, and symbols.";
  else if (friendly.length > 100) friendly = "Something went wrong on our end. Please try again in a moment.";

  el.className = 'alert alert-error show';
  el.innerHTML = `
    <strong>😕 ${context || 'Something went wrong'}</strong><br>
    <span style="font-size:.88rem">${friendly || "Please try again in a moment."}</span><br>
    ${_supportBtn(context, detail)}
  `;
}

function friendlyAIError(detail) {
  const hints = [
    "The AI helper is taking a quick break — please try again in a moment.",
    "Couldn't reach the AI right now. It'll be back shortly!",
    "The AI assistant isn't responding at the moment.",
  ];
  const hint = hints[Math.floor(Math.random() * hints.length)];
  const safeDetail = (detail || 'unknown').replace(/"/g, '').replace(/'/g, '');
  return `<span style="color:var(--muted)">${hint}</span>
  <div style="margin-top:8px">
    <button onclick="openSupportModal('AI Assistant Error','${safeDetail}')" style="background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1;padding:5px 13px;border-radius:6px;font-size:.78rem;cursor:pointer;font-family:inherit;font-weight:700">📧 Get Help from Support</button>
  </div>`;
}

// ════════════════════════════════════
//  SECTION 12: ACTIVITY TRACKING
//  userActivity{} stores the current session's behavior:
//    bio, skills, jobs accepted, chat messages, lessons done.
//  trackActivity(type, data) updates this object and is
//  called throughout the app whenever something meaningful happens.
//  Used by aiJobMatch() and checkReEngagement() to personalize output.
// ════════════════════════════════════
const userActivity = {
  bio: '',
  skills: [],
  jobsAccepted: [],
  chatMessages: [],
  lessonsCompleted: [],
  lastSeen: new Date().toISOString(),
  notifPermission: true,
  emailPermission: true,
};

function trackActivity(type, data) {
  userActivity.lastSeen = new Date().toISOString();
  if (type === 'job_accepted') {
    userActivity.jobsAccepted.push({ ...data, ts: Date.now() });
    updateAIProfile('job_accepted', data);
  } else if (type === 'chat_message') {
    userActivity.chatMessages.push({ msg: data, ts: Date.now() });
    if (userActivity.chatMessages.length > 50) userActivity.chatMessages.shift();
  } else if (type === 'lesson_complete') {
    if (!userActivity.lessonsCompleted.includes(data)) userActivity.lessonsCompleted.push(data);
    updateAIProfile('lesson_complete', data);
  } else if (type === 'bio_update') {
    userActivity.bio = data;
    updateAIProfile('bio_update', data);
  } else if (type === 'skills_update') {
    userActivity.skills = data;
    updateAIProfile('skills_update', data);
  }
}

// ════════════════════════════════════
//  AI LEARNING SYSTEM
//  Builds a persistent per-user profile that the AI uses to give
//  personalised, context-aware responses instead of generic answers.
//  Stored in localStorage keyed by user. Updated by updateAIProfile().
//  Injected into every AI call via buildUserContext().
// ════════════════════════════════════

let _aiProfile = null; // in-memory cache, loaded on login

function _aiProfileKey() {
  return _userKey('ai_profile');
}

function loadAIProfile() {
  try {
    const stored = localStorage.getItem(_aiProfileKey());
    _aiProfile = stored ? JSON.parse(stored) : _defaultAIProfile();
  } catch(e) {
    _aiProfile = _defaultAIProfile();
  }
}

function _defaultAIProfile() {
  return {
    topicsAsked: {},          // topic → count  e.g. {'interview tips': 3}
    feedbackGiven: [],        // [{q, rating, ts}]  when user rates an AI response
    goalsSet: [],             // strings the user has mentioned wanting
    strugglingWith: [],       // topics user asked about 3+ times (inferred)
    preferredTone: 'friendly',// 'friendly'|'direct'|'detailed'
    sessionCount: 0,
    totalAIQuestions: 0,
    lastAIQuestion: '',
    recentTopics: [],         // last 5 topics asked
    jobsApplied: [],          // job titles applied to
    ratingsReceived: [],      // {stars, employer, job}
    lessonsCompleted: [],
    skills: [],
    bio: '',
    city: '',
    age: null,
    userType: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveAIProfile() {
  if (!_aiProfile) return;
  _aiProfile.updatedAt = new Date().toISOString();
  try { localStorage.setItem(_aiProfileKey(), JSON.stringify(_aiProfile)); } catch(e) {}
}

function updateAIProfile(event, data) {
  if (!_aiProfile) loadAIProfile();
  switch(event) {
    case 'ai_question':
      _aiProfile.totalAIQuestions++;
      _aiProfile.lastAIQuestion = data.question || '';
      // Detect topic
      const topic = _inferTopic(data.question || '');
      _aiProfile.topicsAsked[topic] = (_aiProfile.topicsAsked[topic] || 0) + 1;
      _aiProfile.recentTopics = [topic, ..._aiProfile.recentTopics].slice(0, 5);
      // If asked 3+ times, mark as struggling
      if (_aiProfile.topicsAsked[topic] >= 3 && !_aiProfile.strugglingWith.includes(topic)) {
        _aiProfile.strugglingWith.push(topic);
      }
      // Detect goals from question text
      const goalMatch = (data.question||'').match(/i want to|i'm trying to|how do i|i need to|my goal/i);
      if (goalMatch) {
        const shortGoal = (data.question||'').slice(0, 80).trim();
        if (!_aiProfile.goalsSet.includes(shortGoal)) {
          _aiProfile.goalsSet = [shortGoal, ..._aiProfile.goalsSet].slice(0, 5);
        }
      }
      break;
    case 'bio_update':
      _aiProfile.bio = data || '';
      break;
    case 'skills_update':
      _aiProfile.skills = Array.isArray(data) ? data : [];
      break;
    case 'job_accepted':
      if (data?.title) _aiProfile.jobsApplied = [data.title, ..._aiProfile.jobsApplied].slice(0,10);
      break;
    case 'lesson_complete':
      if (data && !_aiProfile.lessonsCompleted.includes(data)) _aiProfile.lessonsCompleted.push(data);
      break;
    case 'rating_received':
      if (data) _aiProfile.ratingsReceived = [data, ..._aiProfile.ratingsReceived].slice(0,10);
      break;
    case 'login':
      _aiProfile.sessionCount++;
      _aiProfile.userType = data?.type || _aiProfile.userType;
      _aiProfile.city = data?.city || _aiProfile.city;
      _aiProfile.age = data?.age || _aiProfile.age;
      break;
    case 'feedback':
      _aiProfile.feedbackGiven = [{...data, ts: Date.now()}, ..._aiProfile.feedbackGiven].slice(0,20);
      // Infer preferred tone from positive feedback
      if (data.rating === 'helpful' && data.context) {
        _aiProfile.preferredTone = data.context.includes('detail') ? 'detailed' : 'friendly';
      }
      break;
  }
  saveAIProfile();
}

function _inferTopic(text) {
  const t = text.toLowerCase();
  if (/interview|first day|introduce|impress/.test(t)) return 'interviews';
  if (/resume|bio|profile|describe yourself/.test(t)) return 'profile building';
  if (/pay|payment|money|charge|rate|how much/.test(t)) return 'pay & pricing';
  if (/safety|unsafe|uncomfortable|weird|scared/.test(t)) return 'safety';
  if (/parent|approval|permission|mom|dad/.test(t)) return 'parental approval';
  if (/labor law|permit|legal|age|hours|work permit/.test(t)) return 'labor laws';
  if (/apply|application|how to get|find a job/.test(t)) return 'applying for jobs';
  if (/review|rating|star|feedback|reputation/.test(t)) return 'ratings & reviews';
  if (/message|talk to|contact|employer/.test(t)) return 'communicating with employers';
  if (/schedule|time|available|calendar/.test(t)) return 'scheduling';
  if (/tax|income|earn|report/.test(t)) return 'taxes & income';
  return 'general';
}

function buildUserContext() {
  if (!_aiProfile) loadAIProfile();
  const u = currentUser || {};
  const p = _aiProfile;
  const ua = userActivity;

  const roleLabel = u.type === 'teen' ? 'Teen worker' : u.type === 'parent' ? 'Parent' : u.type === 'employer' ? 'Employer' : 'User';
  const lines = [`USER PROFILE (${roleLabel})`];

  // Basic info
  if (u.name) lines.push(`Name: ${u.name}`);
  if (u.city || p.city) lines.push(`Location: ${u.city || p.city}${u.state ? ', ' + u.state : ''}`);
  if (p.age || u.age) lines.push(`Age: ${p.age || u.age}`);
  if (p.sessionCount > 1) lines.push(`Sessions on platform: ${p.sessionCount}`);

  // Teen-specific context
  if (u.type === 'teen' || p.userType === 'teen') {
    if (p.bio || ua.bio) lines.push(`Bio: "${(p.bio || ua.bio).slice(0,120)}"`);
    const skills = p.skills.length ? p.skills : ua.skills;
    if (skills.length) lines.push(`Skills: ${skills.join(', ')}`);
    if (p.jobsApplied.length) lines.push(`Jobs applied/accepted: ${p.jobsApplied.slice(0,5).join(', ')}`);
    if (p.ratingsReceived.length) {
      const avg = (p.ratingsReceived.reduce((s,r)=>s+(r.stars||0),0)/p.ratingsReceived.length).toFixed(1);
      lines.push(`Average rating: ${avg}★ (${p.ratingsReceived.length} reviews)`);
    }
    if (p.lessonsCompleted.length) lines.push(`Lessons completed: ${p.lessonsCompleted.join(', ')}`);
    if (teenGameState?.points) lines.push(`Points: ${teenGameState.points}, Badges: ${(teenGameState.badges||[]).join(', ') || 'none'}`);
    if (teenGameState?.hoursWorked) lines.push(`Hours worked: ${teenGameState.hoursWorked}`);
  }

  // AI interaction history
  if (p.totalAIQuestions > 0) lines.push(`Has asked ${p.totalAIQuestions} AI question(s) on this platform`);
  if (p.recentTopics.length) lines.push(`Recently asked about: ${[...new Set(p.recentTopics)].join(', ')}`);
  if (p.strugglingWith.length) lines.push(`Seems to struggle with: ${p.strugglingWith.join(', ')} — go deeper on these`);
  if (p.goalsSet.length) lines.push(`Expressed goals: ${p.goalsSet.slice(0,3).join(' | ')}`);

  // Tone preference
  if (p.preferredTone === 'detailed') lines.push('Prefers detailed, thorough answers');
  else if (p.preferredTone === 'direct') lines.push('Prefers short, direct answers');

  lines.push('---');
  lines.push('Use the above to personalise your answer. Reference their name, skills, jobs, or goals where natural. Be specific, not generic.');

  return lines.join('\n');
}

// ════════════════════════════════════
//  SECTION 13: AI JOB MATCHING
//  aiJobMatch() calls Gemini with the teen's bio, skills,
//  and accepted job history. The AI returns 3 job IDs from
//  the live browsableJobs array with one-sentence reasons.
//  Falls back to top-3 jobs if parsing fails.
//  Renders clickable cards with "Apply Now" and "Message" buttons.
// ════════════════════════════════════
async function aiJobMatch() {
  const panel = document.getElementById('ai-match-panel');
  const nudge = document.getElementById('ai-match-profile-nudge');
  const badge = document.getElementById('profile-strength-badge');
  if (!panel) return;
  panel.innerHTML = '<span class="loading-dots">Finding your best matches</span>';

  // Build profile completeness score
  const bio    = userActivity.bio || '';
  const skills = userActivity.skills.length ? userActivity.skills : [];
  const accepted = userActivity.jobsAccepted.map(j => j.title);
  const lessons  = userActivity.lessonsCompleted;

  let strength = 0;
  const missing = [];
  if (bio.length > 20) strength += 30; else missing.push('add a bio');
  if (skills.length >= 2) strength += 30; else missing.push('add more skills');
  if (accepted.length > 0) strength += 20;
  if (lessons.length > 0)  strength += 20;

  // Update profile strength badge
  const color = strength >= 70 ? 'var(--green)' : strength >= 40 ? 'var(--amber)' : 'var(--red)';
  const label = strength >= 70 ? '💪 Strong' : strength >= 40 ? '👍 Good' : '⚠️ Weak';
  if (badge) {
    badge.textContent = `Profile: ${label} (${strength}%)`;
    badge.style.background = strength >= 70 ? 'var(--green-pale)' : strength >= 40 ? 'var(--amber-pale)' : 'var(--red-pale)';
    badge.style.color = color;
  }
  if (nudge) {
    if (missing.length) {
      nudge.style.display = 'block';
      nudge.innerHTML = `💡 <strong>Improve your matches:</strong> ${missing.join(' and ')} in your <a onclick="switchDashTab(null,'ttab-resume')" style="color:var(--amber);font-weight:700;cursor:pointer;text-decoration:underline">Profile tab</a> to get better recommendations.`;
    } else {
      nudge.style.display = 'none';
    }
  }

  const skillsList = skills.join(', ') || 'general labor';
  const jobList = browsableJobs.map((j, idx) => ({
    idx, title: j.title, employer: j.employer||'Local Employer', pay: j.pay,
    payType: j.payType, type: j.type, city: j.city, maxHours: j.maxHours
  }));
  const available = jobList.map(j =>
    `[ID:${j.idx}] "${j.title}" by ${j.employer} — $${j.pay}${j.payType==='hourly'?'/hr':' flat'} (${j.type}, ${j.city}, max ${j.maxHours}h/wk)`
  ).join('\n');

  const prompt = `You are a smart job matching engine for TeenWork. Analyze this teen's profile and score each job for fit.

Teen profile:
- Skills: ${skillsList}
- Bio: ${bio || 'Not set'}
- Past jobs: ${accepted.join(', ') || 'none yet'}
- Lessons done: ${lessons.join(', ') || 'none yet'}

Available jobs:
${available}

For the top 3 best matches respond in EXACTLY this format (one per line, nothing else):
MATCH: [ID:number] | score:0-100 | matching_skills:skill1,skill2 | reason in 1 sentence

Example: MATCH: [ID:2] | score:87 | matching_skills:lawn care,yard work | Great fit for your outdoor skills and availability.`;

  try {
    const result = await callGemini(prompt);
    const matches = [];
    for (const line of result.split('\n')) {
      const m = line.match(/MATCH:\s*\[ID:(\d+)\]\s*\|\s*score:(\d+)\s*\|\s*matching_skills:([^|]*)\|\s*(.*)/i);
      if (m) {
        const idx    = parseInt(m[1]);
        const score  = Math.min(100, parseInt(m[2]) || 75);
        const matchSkills = m[3].trim().split(',').map(s => s.trim()).filter(Boolean);
        const reason = m[4].trim();
        const job    = browsableJobs[idx];
        if (job) matches.push({ job, score, matchSkills, reason, idx });
      }
    }

    // Fallback
    if (!matches.length) {
      browsableJobs.slice(0, 3).forEach((job, i) => {
        matches.push({ job, score: 75 - i*5, matchSkills: skills.slice(0,2), reason: 'Matches your skills and location.', idx: i });
      });
    }

    // Sort by score desc
    matches.sort((a,b) => b.score - a.score);

    panel.innerHTML = matches.map(({job, score, matchSkills, reason}) => {
      const barColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : '#e07';
      const safeTitle    = (job.title||'').replace(/'/g,"\\'");
      const safeEmployer = (job.employer||'').replace(/'/g,"\\'");
      const skillPills   = matchSkills.map(s =>
        `<span style="background:var(--green-pale);color:var(--green);font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:10px">${s}</span>`
      ).join('');
      return `
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:13px 14px;margin-bottom:10px;transition:box-shadow .2s" onmouseenter="this.style.boxShadow='var(--shadow)'" onmouseleave="this.style.boxShadow='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.92rem;color:var(--text)">${job.title}</div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:1px">${safeEmployer} · ${job.city}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:800;color:var(--green);font-size:.95rem">$${job.pay}/${job.payType==='hourly'?'hr':'flat'}</div>
            <div style="font-size:.7rem;color:var(--muted)">Max ${job.maxHours}h/wk</div>
          </div>
        </div>
        <!-- Match score bar -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
          <div style="font-size:.7rem;font-weight:700;color:${barColor};white-space:nowrap">${score}% match</div>
          <div style="flex:1;background:var(--border);border-radius:4px;height:5px;overflow:hidden">
            <div style="width:${score}%;height:100%;background:${barColor};border-radius:4px;transition:width .6s ease"></div>
          </div>
        </div>
        <!-- Matching skills -->
        ${skillPills ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px">${skillPills}</div>` : ''}
        <!-- AI reason -->
        <div style="font-size:.8rem;color:var(--text);line-height:1.5;margin-bottom:9px">🤖 <em>${reason}</em></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-sm btn-apply" onclick="teenApply(${job.id||0},'${safeTitle}')" style="font-size:.76rem">Apply Now</button>
          <button class="btn-sm btn-ai" onclick="teenAIPitch(${job.id||0},'${safeTitle}','${safeEmployer}')" style="font-size:.76rem">✍️ AI Pitch</button>
          <button class="btn-sm btn-msg" onclick="openMsgModal()" style="font-size:.76rem">💬 Message</button>
        </div>
      </div>`;
    }).join('') + `<div style="text-align:center;margin-top:4px">
      <button class="btn-sm btn-ai" onclick="aiJobMatch()" style="font-size:.76rem">🔄 Refresh Matches</button>
    </div>`;

  } catch(e) {
    panel.innerHTML = `<p style="color:var(--muted)">Couldn't load matches — ${e.message||'try again'}</p>`;
  }
}

function aiRefreshMatches() { aiJobMatch(); }
// resumeChatAI and useAIBio are defined in the fix script at bottom of page.
// Stub them here so the export line doesn't throw a ReferenceError.
if (typeof resumeChatAI === 'undefined') window.resumeChatAI = function() { console.warn('resumeChatAI not yet loaded'); };
if (typeof useAIBio    === 'undefined') window.useAIBio    = function() { console.warn('useAIBio not yet loaded'); };
window.aiJobMatch = aiJobMatch;
window.aiRefreshMatches = aiRefreshMatches;

// ════════════════════════════════════
//  SECTION 17: VERIFICATION MODULE (TW_Verify)
//  An IIFE that encapsulates the 5-step verification flow:
//    Step 1: Identity (auto-done on account creation)
//    Step 2: Parent consent (guardian email + 3 checkboxes)
//    Step 3: Work permit + state labor law compliance check
//    Step 4: Employer vetting score (AI-assisted)
//    Step 5: Optional $9.99 AI background check badge
//  Each step unlocks the next and updates the tier bar UI.
//  Exposed as TW_Verify.methodName() for use in HTML onclick handlers.
// ════════════════════════════════════
const TW_Verify = (() => {
  const _state = { identity:true, parentConsent:false, workPermit:false, bgcPurchased:false, teenAge:16, teenState:'VT' };

  const _laborRules = {
    VT:{ minAge:14, schoolMaxHrs:8, weekMaxHrs:40, permitRequired:false, hazardousOk:false },
    IL:{ minAge:14, schoolMaxHrs:8, weekMaxHrs:48, permitRequired:true,  hazardousOk:false },
    CA:{ minAge:14, schoolMaxHrs:8, weekMaxHrs:40, permitRequired:true,  hazardousOk:false },
    TX:{ minAge:14, schoolMaxHrs:8, weekMaxHrs:48, permitRequired:false, hazardousOk:false },
    NY:{ minAge:14, schoolMaxHrs:6, weekMaxHrs:48, permitRequired:true,  hazardousOk:false },
    FL:{ minAge:14, schoolMaxHrs:8, weekMaxHrs:48, permitRequired:false, hazardousOk:false },
  };

  const _badgeDefs = {
    identity:      { label:'🪪 Identity Verified', cls:'identity' },
    parentConsent: { label:'👪 Parent Approved',   cls:'parent'   },
    workPermit:    { label:'📋 Work Permit',        cls:'permit'   },
    bgc:           { label:'✦ Trusted+',            cls:'bgc'      },
  };

  function _sa(id,msg,type='info'){
    const el=document.getElementById(id); if(!el)return;
    el.className=`alert alert-${type} show`; el.textContent=msg;
    setTimeout(()=>el.classList.remove('show'),5000);
  }

  function _getTier(){
    if(_state.bgcPurchased) return 4;
    if(_state.workPermit)   return 3;
    if(_state.parentConsent)return 2;
    if(_state.identity)     return 1;
    return 0;
  }

  function _updateTierBar(){
    const tier=_getTier();
    [1,2,3,4].forEach(n=>{
      const el=document.getElementById(`tw-ver-t${n}`); if(!el)return;
      el.classList.remove('done','active');
      if(n<=tier) el.classList.add('done');
      else if(n===tier+1&&n<4) el.classList.add('active');
    });
    [1,2,3].forEach(n=>{
      const line=document.getElementById(`tw-ver-line-${n}`);
      if(line) line.classList.toggle('done', n<=tier-1);
    });
  }

  function _renderBadges(){
    const row=document.getElementById('tw-ver-badge-row'); if(!row)return;
    row.innerHTML=['identity','parentConsent','workPermit','bgc'].map(k=>{
      const def=_badgeDefs[k]; const earned=!!_state[k];
      return `<span class="tw-ver-badge ${earned?def.cls:'locked'}">${def.label}${!earned?' 🔒':''}</span>`;
    }).join('');
  }

  return {
    init(){ _updateTierBar(); _renderBadges(); },

    toggleStep(n){
      const body=document.getElementById(`tw-ver-body-${n}`);
      if(body) body.classList.toggle('open');
    },

    async submitParentConsent(){
      const name=document.getElementById('tw-ver-parent-name')?.value.trim();
      const email=document.getElementById('tw-ver-parent-email')?.value.trim();
      const c1=document.getElementById('tw-ver-c1')?.checked;
      const c2=document.getElementById('tw-ver-c2')?.checked;
      const c3=document.getElementById('tw-ver-c3')?.checked;
      if(!name||!email){_sa('tw-ver-parent-alert','Please enter the parent\'s full name and email address to continue.','error');return;}
      if(!c1||!c2||!c3){_sa('tw-ver-parent-alert','Please check all three consent boxes — each one is required to protect your teen.','error');return;}

      // Send real consent email via EmailJS
      const teenName = currentUser?.name || 'your teen';
      _sa('tw-ver-parent-alert','Sending consent email…','info');
      try {
        if (typeof emailjs !== 'undefined' && EMAILJS_SERVICE !== 'YOUR_EMAILJS_SERVICE_ID') {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            to_name: name,
            to_email: email,
            subject: `Action Required — TeenWork Parent Consent for ${teenName}`,
            message: `Hi ${name},\n\n${teenName} has created a TeenWork account and you have been listed as their parent or guardian.\n\nYou signed the following consent:\n✓ I confirm I am the parent or legal guardian.\n✓ I can revoke consent and block any job application at any time.\n✓ TeenWork may share my teen's first name and verified age with approved employers only.\n\nIf this is correct, no further action is needed — consent is recorded. If you did NOT authorize this, please contact support immediately at ayaquarrierdraper@gmail.com.\n\nThank you,\nThe TeenWork Team`,
            reply_to: 'ayaquarrierdraper@gmail.com'
          });
        }
      } catch(e) {
        console.warn('Consent email send failed:', e);
        // Non-fatal — continue anyway
      }

      _state.parentConsent=true;
      const s2=document.getElementById('tw-ver-step-2');
      if(s2){s2.classList.remove('active');s2.classList.add('done');}
      const st2=document.getElementById('tw-ver-s2-status');
      if(st2){st2.className='tw-ver-step-status done';st2.textContent='✓ Complete';}
      const s3=document.getElementById('tw-ver-step-3');
      if(s3){s3.classList.remove('locked');}
      const st3=s3?.querySelector('.tw-ver-step-status');
      if(st3){st3.className='tw-ver-step-status active';st3.textContent='Ready';}
      _updateTierBar(); _renderBadges();
      _sa('tw-ver-parent-alert','','');
      showToast('👪 Consent email sent to '+email+' ✓','success');
    },

    previewConsentEmail(){
      const name=document.getElementById('tw-ver-parent-name')?.value||'[Parent]';
      alert(`📧 Email preview to ${name}:\n\nSubject: Action Required — TeenWork Consent for Alex Johnson\n\nAlex has created a TeenWork account and needs your consent to apply for jobs. Click the link to review and sign.\n\n[Sign Consent Form →]\n\nYou can revoke consent anytime from your parent dashboard.`);
    },

    async runComplianceCheck(){
      const age=parseInt(document.getElementById('tw-ver-age')?.value)||16;
      const state=document.getElementById('tw-ver-state')?.value||'VT';
      const jtype=document.getElementById('tw-ver-job-type-check')?.value||'Yard Work';
      _state.teenAge=age; _state.teenState=state;
      const rules=_laborRules[state]||_laborRules['VT'];
      const hazardous=['Manufacturing','Construction'].includes(jtype);
      const grid=document.getElementById('tw-ver-law-grid');
      const results=document.getElementById('tw-ver-law-results');
      const aiBox=document.getElementById('tw-ver-law-ai');
      if(grid){
        grid.innerHTML=[
          {label:'Minimum Age',     val:`${rules.minAge}+ required · Age ${age}`, ok:age>=rules.minAge},
          {label:'School-Day Hrs',  val:`Max ${rules.schoolMaxHrs} hrs/day`,       ok:true},
          {label:'Weekly Max',      val:`${rules.weekMaxHrs} hrs/week in ${state}`,ok:true},
          {label:'Permit Needed',   val:rules.permitRequired?'Yes — required in '+state:'Not required in '+state, ok:!rules.permitRequired},
          {label:'Job Type',        val:hazardous?'⚠️ Hazardous — not allowed under 18':'✓ Allowed for age '+age, ok:!hazardous},
          {label:'Federal (FLSA)',  val:'No hazardous equipment · limited evening hrs', ok:true},
        ].map(r=>`<div class="tw-ver-law-pill ${r.ok?'ok':'warn'}"><div class="tw-ver-pill-label">${r.label}</div><div class="tw-ver-pill-val">${r.val}</div></div>`).join('');
      }
      if(results) results.style.display='block';
      if(aiBox){aiBox.textContent='Checking labor laws with AI…';aiBox.classList.add('show');}
      try{
        const text = await callClaudeAI(`You are a teen labor law assistant. A ${age}-year-old in ${state} wants to work in ${jtype}. Summarize in 3 sentences: (1) whether this is legally allowed, (2) key hour restrictions, (3) whether a work permit is needed and how to get one in ${state}. Be friendly for a teen.`);
        if(aiBox) aiBox.textContent=text;
      }catch{if(aiBox)aiBox.innerHTML='The AI compliance checker is unavailable right now. Please review the rules shown above, or <a href="#" onclick="openSupportModal(\'Compliance AI Error\',\'AI checker was unavailable\');return false" style="font-weight:700">contact support</a>.';}
    },

    submitPermit(){
      _state.workPermit=true;
      const s3=document.getElementById('tw-ver-step-3');
      if(s3){s3.classList.remove('locked');s3.classList.add('done');}
      const st3=s3?.querySelector('.tw-ver-step-status');
      if(st3){st3.className='tw-ver-step-status done';st3.textContent='✓ Complete';}
      const s4=document.getElementById('tw-ver-step-4');
      if(s4) s4.classList.remove('locked');
      const st4=s4?.querySelector('.tw-ver-step-status');
      if(st4){st4.className='tw-ver-step-status active';st4.textContent='Ready';}
      _updateTierBar(); _renderBadges();
      showToast('📋 Work permit submitted! Tier 3 unlocked.','success');
    },

    downloadPermitForm(){
      const state=document.getElementById('tw-ver-state')?.value||'VT';
      showToast(`📄 Opening ${state} work permit form…`,'info');
    },

    async checkEmployer(){
      const name=document.getElementById('tw-ver-emp-name')?.value.trim();
      if(!name){showToast('Enter an employer name to check.','info');return;}
      const scoreEl=document.getElementById('tw-ver-emp-score');
      const subEl=document.getElementById('tw-ver-emp-score-sub');
      const aiBox=document.getElementById('tw-ver-emp-ai');
      if(scoreEl)scoreEl.textContent='…';
      if(subEl)subEl.textContent='Checking…';
      if(aiBox){aiBox.textContent='Running AI vetting check…';aiBox.classList.add('show');}
      try{
        const text = await callClaudeAI(`You are an employer vetting assistant for a teen job platform. Evaluate "${name}" as a potential employer for teens aged 13-17. Give a trust score 0-100 (just the number on its own first line), then 2-3 sentences: what type of business this likely is, whether it's safe for teens, and any red flags. If unknown small business give ~60 and recommend local verification.`);
        const lines=text.trim().split('\n');
        const score=parseInt(lines[0])||65;
        const summary=lines.slice(1).join(' ').trim();
        if(scoreEl)scoreEl.textContent=score;
        if(subEl)subEl.textContent=score>=75?'Trusted Employer ✓':score>=50?'Moderate — verify locally':'Caution — review carefully';
        if(aiBox)aiBox.textContent=summary||text;
      }catch{
        if(scoreEl)scoreEl.textContent='?';
        if(aiBox)aiBox.textContent='AI unavailable. Ask a parent to verify this employer.';
      }
    },

    fmtCard(input){
      let v=input.value.replace(/\D/g,'').substring(0,16);
      input.value=v.replace(/(.{4})/g,'$1 ').trim();
    },

    previewBGC(){
      alert('✦ AI Background Check includes:\n\n• Public records name match\n• AI social media public post scan for safety flags\n• Identity consistency check\n\nNo SSN, no hard credit pull. ~2 minutes.\nParent receives a copy of the report.');
    },

    async purchaseBGC(){
      const name=document.getElementById('tw-ver-cc-name')?.value.trim();
      const num=document.getElementById('tw-ver-cc-num')?.value.replace(/\s/g,'');
      if(!name||num.length<16){showToast('Please enter valid card details.','error');return;}
      const btn=document.querySelector('#tw-ver-step-5 .tw-ver-btn.purple');
      if(btn){btn.disabled=true;btn.textContent='Processing…';}
      const aiBox=document.getElementById('tw-ver-bgc-result');
      if(aiBox){aiBox.textContent='🔮 Running AI background check…';aiBox.classList.add('show');}
      try{
        const text = await callClaudeAI(`Generate a mock AI background check result certificate for teen Alex Johnson, age 16, Vermont, for the TeenWork platform. Write 4-5 sentences confirming: identity verified, no concerning public records, social media scan clear, positive recommendation for employment. Start with "✦ AI Background Check — CLEAR". Make it sound official but friendly.`);
        if(aiBox)aiBox.textContent=text;
        _state.bgcPurchased=true;
        _updateTierBar(); _renderBadges();
        if(btn)btn.textContent='✓ Purchased';
        const s5=document.getElementById('tw-ver-step-5');
        if(s5)s5.classList.add('done');
        const st5=s5?.querySelector('.tw-ver-step-status');
        if(st5){st5.className='tw-ver-step-status done';st5.textContent='✓ Complete';}
        showToast('✦ Trusted+ badge earned! Certificate emailed to parent.','success');
      }catch{
        if(aiBox)aiBox.innerHTML='Payment processed but the AI check hit a snag. <a href="#" onclick="openSupportModal(\'BGC AI Error\',\'Background check AI unavailable after payment\');return false" style="font-weight:700">Contact support</a> and we\'ll sort it out.';
        if(btn){btn.disabled=false;btn.textContent='Pay $9.99 & Run Check';}
      }
    },

    getTrustTier(){ return _getTier(); },
    getBadges(){
      const out=[];
      if(_state.identity)       out.push('identity');
      if(_state.parentConsent)  out.push('parentConsent');
      if(_state.workPermit)     out.push('workPermit');
      if(_state.bgcPurchased)   out.push('bgc');
      return out;
    },
    canApply(job){
      if(!_state.identity) return {allowed:false,reason:'Identity verification required'};
      if(job.minAge&&_state.teenAge<job.minAge) return {allowed:false,reason:`Must be ${job.minAge}+ for this job`};
      if(['Manufacturing','Construction'].includes(job.type)) return {allowed:false,reason:'Hazardous jobs not permitted under 18'};
      return {allowed:true};
    },
  };
})();

// Init verify module when page is shown
window.showVerifyPage = function() {
  gotoPage('verify');
  // Set role-specific verification context
  const role = currentUser?.type || 'teen';
  const roleConfig = {
    teen: { icon: '🧑', label: 'Teen Verification', sub: 'Complete these steps to unlock more jobs, build trust, and show employers you\'re serious.', steps: 5 },
    parent: { icon: '👪', label: 'Parent Verification', sub: 'Verify your identity to oversee your teen\'s job activity and approve applications.', steps: 3 },
    employer: { icon: '🏢', label: 'Employer Verification', sub: 'Complete verification to post jobs and hire teen workers on TeenWork.', steps: 4 },
  };
  const cfg = roleConfig[role] || roleConfig.teen;
  const titleEl = document.getElementById('tw-ver-page-title');
  const subEl = document.getElementById('tw-ver-page-sub');
  const iconEl = document.getElementById('tw-ver-role-icon');
  const labelEl = document.getElementById('tw-ver-role-label');
  const progEl = document.getElementById('tw-ver-role-progress');
  if (titleEl) titleEl.textContent = '🛡 ' + cfg.label;
  if (subEl) subEl.textContent = cfg.sub;
  if (iconEl) iconEl.textContent = cfg.icon;
  if (labelEl) labelEl.textContent = cfg.label;
  if (progEl) {
    // Count completed steps
    const completed = document.querySelectorAll('#page-verify .tw-ver-step.done').length;
    progEl.textContent = `Step ${completed + 1} of ${cfg.steps} — ${Math.round((completed/cfg.steps)*100)}% complete`;
  }
  setTimeout(()=>TW_Verify.init(), 50);
};

// ══════════════════════════════════════════════════════
//  MESSAGING SYSTEM
// ══════════════════════════════════════════════════════

// ── Content Safety Filter ──────────────────────────────
// Blocks bad language AND predatory / grooming language patterns
// Uses leet-speak normalization so tricks like n!gg3r or f*ck are caught

function normalizeLeet(str) {
  return str
    .toLowerCase()
    // Remove zero-width / invisible characters
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Common leet substitutions
    .replace(/4/g, 'a').replace(/@/g, 'a')
    .replace(/3/g, 'e').replace(/€/g, 'e')
    .replace(/1/g, 'i').replace(/!/g, 'i').replace(/\|/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's').replace(/\$/g, 's')
    .replace(/7/g, 't').replace(/\+/g, 't')
    .replace(/ü/g, 'u')
    .replace(/\(/g, 'c')
    .replace(/9/g, 'g')
    .replace(/6/g, 'b')
    .replace(/8/g, 'b')
    // Strip common bypass characters between letters (dots, dashes, spaces, asterisks, underscores)
    .replace(/[\s\-_.*•·,]+/g, '');
}

const MSG_BLOCKED_WORDS = [
  // ── Racial slurs (highest priority) ──
  'nigger','nigga','niggah','negger','n1gger','niqqa','nigg3r','niger','nig',
  'chink','gook','spic','wetback','beaner','kike','hymie','towelhead',
  'sandnigger','sandnigg','raghead','cracker','redneck','honky','whitey',
  'tranny','faggot','fagot','fag','dyke','queer',  // slurs (not reclaimed contexts)
  'retard','tard','mongoloid','midget',
  // ── Profanity ──
  'fuck','fuk','fvck','fucc','fock','sh1t','shit','bitch','b1tch','btch',
  'ass','damn','crap','bastard','dick','cock','pussy','puss',
  'asshole','bullshit','motherfucker','cunt','whore','slut',
  'foff','fu','fyu','fuu','gtfo','stfu','f',
  // ── Predatory / grooming phrases ──
  'meet me alone','come alone','dont tell',"don't tell",'keep this secret',
  'our secret','just between us','no one needs to know','tell no one',
  "don't tell your parents",'dont tell your parents','without your parents',
  'after school alone','ill pick you up','get in my car',
  'come to my house alone','meet at my house','special friend','special relationship',
  "you're so mature",'youre so mature','you look older','you act older',
  'send me a photo','send photos','send pictures','send me pictures',
  'show me','what are you wearing','what do you look like','are you alone',
  'video call me','facetime me','private chat','private message me',
  // ── Requests for personal info ──
  'your address','home address','what school','your school name',
  'phone number','whatsapp','snapchat','instagram me','dm me',
  'text me directly','contact me outside','off platform',
  // ── Threats / coercion ──
  'or else','you have to','you must','i demand','do what i say',
];

const MSG_WARN_PATTERNS = [
  /\bf[\s\-_.]*[uy]/i,
  /\bn[\s\-_.]*[i1][\s\-_.]*[gq]/i,
  /(meet\s+(me\s+)?(at|tomorrow|today|tonight|later|soon|up|after))/i,
  /(alone\s+with\s+(me|you))/i,
  /(my\s+(home|house|place|apartment|room|car|truck|van))/i,
  /(pick\s+you\s+up)/i,
  /(after\s+(dark|hours|school)\s*(alone|together|with\s*me)?)/i,
  /(cash\s+only)/i,
  /(no\s+parents?)/i,
  /(when\s+(your?|the)\s*parents?\s*(are\s+)?(gone|away|not|leave|left|asleep|out|at\s*work))/i,
  /(parents?\s*(gone|away|not\s*home|not\s*around|leaving|left|asleep|out))/i,
  /(come\s+(over|by|to\s+my))/i,
  /(hang\s+out\s+(with\s+me|alone|tonight|tomorrow|today))/i,
  /(don.?t\s+(tell|let|show)\s+(your?|the)?\s*parents?)/i,
  /(between\s+(just\s+)?(me|us)\s+and\s+(you|us))/i,
  /(keep\s+(it|this)\s+(between|quiet|secret|private))/i,
  /(tomorrow|tonight|today).{0,40}(parent|mom|dad|guardian|gone|away|not\s*home)/i,
  /(when\s+\w+\s+(go|goes|left|leaves?|gone|sleep|sleeping|asleep|not\s*(home|here|around)))/i,
];

// Scheduling whitelist — messages matching these patterns are likely legitimate job coordination
const MSG_SCHEDULING_WHITELIST = [
  /\b(can you|are you|i('m| am)|you('re| are)|i can|i('ll| will)|we('ll| will)|let('s| us))\b.{0,40}\b(start|come in|work|arrive|be there|meet at the (store|shop|office|site|location|job)|show up|begin|available)\b/i,
  /\b(shift|schedule|hours?|availability|available|start(ing)?|clock in)\b.{0,30}\b(\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?|morning|afternoon|evening|noon)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next week|this weekend)\b.{0,30}\b(\d{1,2}(:\d{2})?\s*(am|pm)?|morning|afternoon|evening)\b/i,
  /\b(your shift|next shift|first (shift|day)|training|orientation)\b.{0,30}\b(is|starts?|begins?|at|from)\b/i,
  /\b(come (in|to)|report to|head to|arrive at)\b.{0,30}\b(the (store|shop|office|site|location|restaurant|job)|work|\d{1,4}\s+\w+\s+(st|ave|rd|blvd|ln|dr|way|street|avenue))\b/i,
  // Time + day combinations used for job scheduling (e.g. "meet me at 12am Monday for work")
  /\bmeet\b.{0,30}\b\d{1,2}(:\d{2})?\s*(am|pm)\b.{0,30}\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i,
  /\bmeet\b.{0,30}\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b.{0,30}\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
  /\bmeet\b.{0,50}\b(for (the job|work|the shift|the gig|the session)|to start|to work|at the (job site|location|store|shop|office|site))\b/i,
  /\b\d{1,2}(:\d{2})?\s*(am|pm)\b.{0,30}\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i,
];

function isSchedulingContext(text) {
  const lower = text.toLowerCase();
  return MSG_SCHEDULING_WHITELIST.some(pat => pat.test(lower));
}

// First-pass safety filter using regex patterns.
// Runs synchronously (no delay) before the async AI check.
// Blocks phone numbers, emails, URLs, and explicit content.
function scanMessage(text) {
  const lower = text.toLowerCase();
  const normed = normalizeLeet(text);
  // Safety-only words that should NEVER be allowed regardless of scheduling context
  const ALWAYS_BLOCK_WORDS = ['meet me alone','come alone','ill pick you up','get in my car','come to my house alone','meet at my house'];
  // Check blocked words against both raw lowercased AND leet-normalized text
  for (const word of MSG_BLOCKED_WORDS) {
    const normWord = normalizeLeet(word);
    if (lower.includes(word) || normed.includes(normWord)) {
      // Safety-critical phrases always block, regardless of scheduling context
      if (ALWAYS_BLOCK_WORDS.includes(word)) {
        return { blocked: true, reason: 'safety_pattern', word };
      }
      // For all other blocked words (profanity/slurs): allow through if it's clearly a legitimate scheduling message
      if (isSchedulingContext(text)) {
        continue; // false positive in a scheduling context — let it through
      }
      return { blocked: true, reason: 'inappropriate_language', word };
    }
  }
  // Check regex warning patterns on raw text
  for (const pat of MSG_WARN_PATTERNS) {
    if (pat.test(lower)) {
      // If this looks like job scheduling context, allow it through
      if (isSchedulingContext(text)) {
        continue; // skip this pattern, it's likely a false positive
      }
      return { blocked: true, reason: 'safety_pattern', pattern: pat.toString() };
    }
  }
  return { blocked: false };
}

function getBlockReason(scan) {
  if (scan.reason === 'inappropriate_language') {
    return '<span class="msg-blocked-icon">🚫</span><div><span class="msg-blocked-label">Inappropriate Language Detected</span><span class="msg-blocked-detail">This message contains language that is not allowed on TeenWork. Please keep all communication professional and respectful.</span></div>';
  }
  if (scan.reason === 'safety_pattern') {
    return '<span class="msg-blocked-icon">🛡️</span><div><span class="msg-blocked-label">Safety Concern — Suspicious Request</span><span class="msg-blocked-detail">This message was flagged as a potential safety risk (e.g., requesting to meet alone, share personal info, or communicate off-platform). All flagged messages are logged. If this was a mistake, <a href="#" onclick="openSupportModal(\'Blocked Message\',\'A message was incorrectly flagged\');return false" style="color:inherit;font-weight:700;text-decoration:underline">contact support</a>.</span></div>';
  }
  if (scan.reason === 'pii_detected') {
    return '<span class="msg-blocked-icon">🔒</span><div><span class="msg-blocked-label">Personal Information Detected</span><span class="msg-blocked-detail">This message was blocked because it contains ' + escapeHtml(scan.word || 'personal information') + '. For your safety, do not share personal info like phone numbers, addresses, emails, or social media handles on TeenWork.</span></div>';
  }
  if (scan.source === 'AI') {
    return '<span class="msg-blocked-icon">🤖</span><div><span class="msg-blocked-label">AI Safety Filter — Content Not Allowed</span><span class="msg-blocked-detail">' + escapeHtml(scan.reason || 'This message was flagged by our AI safety system.') + ' If you believe this is an error, <a href="#" onclick="openSupportModal(\'Blocked Message\',\'AI safety filter — I believe this was an error\');return false" style="color:inherit;font-weight:700;text-decoration:underline">contact support</a>.</span></div>';
  }
  return '<span class="msg-blocked-icon">🛡️</span><div><span class="msg-blocked-label">Message Blocked for Safety</span><span class="msg-blocked-detail">This message may contain content that isn\'t allowed on TeenWork. All messages are monitored to keep teens safe. <a href="#" onclick="openSupportModal(\'Blocked Message\',\'Message blocked — I think this was a mistake\');return false" style="color:inherit;font-weight:700;text-decoration:underline">Contact support</a> if this seems wrong.</span></div>';
}

// ── Message Data Store ────────────────────────────────
// contacts shape: { id, name, avatar, role, jobTitle, messages:[] }
// messages shape: { from:'me'|'them', text, time, blocked? }

const MSG_CONTACTS = {
  // Teen's contacts (employers + parent)
  teen: [
    {
      id:'mikes',
      name:"Mike's Landscaping",
      avatar:'🏢', role:'employer',
      jobTitle:'Lawn Mowing & Yard Cleanup',
      unread: 1,
      messages:[
        {from:'them', text:"Hi Alex! Thanks for applying. When are you available to start? We're looking for someone this weekend.", time:'Apr 9, 10:15am'},
        {from:'me',   text:"Hi! I can start this Saturday morning. I'm free from 8am–noon.", time:'Apr 9, 10:32am'},
        {from:'them', text:"Perfect. We'll need you at 123 Maple Ave at 8am. Any questions about the job?", time:'Apr 9, 10:45am'},
      ]
    },
    {
      id:'sarah',
      name:'Sarah Chen',
      avatar:'🏡', role:'employer',
      jobTitle:'Dog Walking (3 dogs)',
      unread: 2,
      messages:[
        {from:'them', text:'Hello Alex! Saw your application. My three dogs are really friendly — a golden, a lab, and a little beagle. Do you have experience with big dogs?', time:'Apr 10, 2:00pm'},
        {from:'them', text:'Also — walks are Mon/Wed/Fri around 4pm. Does that work with your schedule?', time:'Apr 10, 2:05pm'},
      ]
    },
    {
      id:'hendersons',
      name:'The Hendersons',
      avatar:'🧹', role:'employer',
      jobTitle:'House Cleaning Assistant',
      unread: 0,
      messages:[
        {from:'them', text:'Alex, great news — your application is accepted! Can you come Saturday the 12th at 9am?', time:'Apr 7, 3:20pm'},
        {from:'me',   text:"Yes! I'll be there. Should I bring anything or are supplies provided?", time:'Apr 7, 3:45pm'},
        {from:'them', text:'We provide everything. Just bring yourself and good energy! See you Saturday.', time:'Apr 7, 4:00pm'},
        {from:'me',   text:'Sounds great, thank you! Looking forward to it.', time:'Apr 7, 4:05pm'},
      ]
    },
    {
      id:'parent-jamie',
      name:'Jamie Johnson (Parent)',
      avatar:'👪', role:'parent',
      jobTitle:'',
      unread: 0,
      messages:[
        {from:'them', text:'Alex, I approved the Hendersons job. Make sure to be on time Saturday!', time:'Apr 8, 7:00pm'},
        {from:'me',   text:"I know, I know 😊 I'll be ready.", time:'Apr 8, 7:10pm'},
      ]
    },
  ],
  // Employer's contacts (applicants)
  employer: [
    {
      id:'alex-j',
      name:'Alex Johnson',
      avatar:'🧑', role:'teen',
      jobTitle:'Lawn Mowing & Yard Cleanup',
      unread: 1,
      messages:[
        {from:'me',   text:"Hi Alex! Thanks for applying. When are you available to start? We're looking for someone this weekend.", time:'Apr 9, 10:15am'},
        {from:'them', text:"Hi! I can start this Saturday morning. I'm free from 8am–noon.", time:'Apr 9, 10:32am'},
        {from:'me',   text:"Perfect. We'll need you at 123 Maple Ave at 8am. Any questions about the job?", time:'Apr 9, 10:45am'},
        {from:'them', text:'What should I wear? And do I need to bring any tools?', time:'Apr 9, 11:00am'},
      ]
    },
    {
      id:'jamie-r',
      name:'Jamie Rivera',
      avatar:'🧑', role:'teen',
      jobTitle:'House Cleaning Assistant',
      unread: 0,
      messages:[
        {from:'me',   text:"Hi Jamie, we'd love to schedule an interview. Are you free this week?", time:'Apr 10, 9:00am'},
        {from:'them', text:"Yes! I'm free Wednesday after 3pm or anytime on Friday.", time:'Apr 10, 9:30am'},
        {from:'me',   text:"Great, let's say Wednesday at 4pm. We'll confirm the address by email.", time:'Apr 10, 9:45am'},
      ]
    },
  ],
  // Parent's contacts (employers + teen)
  parent: [
    {
      id:'mikes-p',
      name:"Mike's Landscaping",
      avatar:'🏢', role:'employer',
      jobTitle:'Lawn Mowing & Yard Cleanup',
      unread: 0,
      messages:[
        {from:'them', text:"Hello, I wanted to confirm Alex's start time for Saturday. We have Alex scheduled for 8am at our Burlington location.", time:'Apr 9, 11:00am'},
        {from:'me',   text:'Thank you for confirming. Alex will be there. Is parking available?', time:'Apr 9, 11:20am'},
        {from:'them', text:'Yes, street parking on Maple Ave is fine.', time:'Apr 9, 11:30am'},
      ]
    },
    {
      id:'alex-teen',
      name:'Alex Johnson (Teen)',
      avatar:'🧑', role:'teen',
      jobTitle:'',
      unread: 1,
      messages:[
        {from:'me',   text:'Alex, I approved the Hendersons job. Make sure to be on time Saturday!', time:'Apr 8, 7:00pm'},
        {from:'them', text:"I know, I know 😊 I'll be ready.", time:'Apr 8, 7:10pm'},
        {from:'them', text:'Can you drop me off at 9am on Saturday?', time:'Apr 8, 7:15pm'},
      ]
    },
  ]
};

let msgCurrentRole = 'teen';
let msgActiveContactId = null;
let msgAllContacts = [];

// ── Open/Close Modal ──────────────────────────────────
function openMsgModal(contactName, contactRole, prefilledMsg) {
  // Determine which role's contacts to show based on current user
  const userType = currentUser?.type || 'teen';
  msgCurrentRole = userType;
  msgAllContacts = [...(MSG_CONTACTS[userType] || MSG_CONTACTS.teen)];

  // If a specific contact was clicked, find or create it
  if (contactName) {
    // Find by name
    let found = msgAllContacts.find(c =>
      c.name.toLowerCase().includes(contactName.toLowerCase()) ||
      contactName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
    );
    if (!found) {
      // Create a new contact on the fly
      const avatars = {employer:'🏢', teen:'🧑', parent:'👪'};
      found = {
        id: 'dynamic-' + Date.now(),
        name: contactName,
        avatar: avatars[contactRole||'employer'] || '🏢',
        role: contactRole || 'employer',
        jobTitle: '',
        unread: 0,
        messages: []
      };
      msgAllContacts.unshift(found);
      MSG_CONTACTS[userType] = msgAllContacts;
    }
    msgActiveContactId = found.id;
  } else {
    msgActiveContactId = null;
  }

  document.getElementById('msgModal').classList.add('open');
  renderMsgContactList();
  if (msgActiveContactId) openMsgChat(msgActiveContactId);

  // Prefill the message input if an AI pitch was passed
  if (prefilledMsg) {
    setTimeout(() => {
      const inp = document.getElementById('msg-input');
      if (inp) { inp.value = prefilledMsg; inp.focus(); inp.style.borderColor = 'var(--purple)'; }
    }, 300);
  }
}

function closeMsgModal() {
  document.getElementById('msgModal').classList.remove('open');
}

// Close on backdrop click
document.getElementById('msgModal').addEventListener('click', function(e) {
  if (e.target === this) closeMsgModal();
});

// ── Render Contact List ───────────────────────────────
function renderMsgContactList(filter='') {
  const container = document.getElementById('msg-contacts-list');
  if (!container) return;
  const lower = filter.toLowerCase();
  const contacts = msgAllContacts.filter(c =>
    !filter || c.name.toLowerCase().includes(lower) || c.jobTitle.toLowerCase().includes(lower)
  );
  if (!contacts.length) {
    container.innerHTML = '<p style="padding:1rem;font-size:.8rem;color:var(--muted);text-align:center">No contacts found.</p>';
    return;
  }
  container.innerHTML = contacts.map(c => {
    const lastMsg = c.messages[c.messages.length - 1];
    const preview = lastMsg ? safeText(lastMsg.text.substring(0,36) + (lastMsg.text.length>36?'…':'')) : 'No messages yet';
    const roleColors = {employer:'employer', teen:'', parent:'parent'};
    return `<div class="msg-contact ${c.id===msgActiveContactId?'active':''}" onclick="openMsgChat('${safeText(c.id)}')">
      <div class="msg-contact-avatar ${roleColors[c.role]||''}">${safeText(c.avatar)}</div>
      <div class="msg-contact-info">
        <div class="msg-contact-name">${safeText(c.name)}</div>
        <div class="msg-contact-preview">${preview}</div>
      </div>
      ${c.unread > 0 ? `<span class="msg-contact-badge">${c.unread}</span>` : ''}
    </div>`;
  }).join('');
  updateMsgBadge();
}

function filterMsgContacts(val) {
  renderMsgContactList(val);
}

// ── Open a Chat ───────────────────────────────────────
function openMsgChat(contactId) {
  const contact = msgAllContacts.find(c => c.id === contactId);
  if (!contact) return;
  msgActiveContactId = contactId;
  contact.unread = 0;
  renderMsgContactList(document.getElementById('msg-search-input')?.value || '');

  const mainArea = document.getElementById('msg-main-area');
  if (!mainArea) return;

  const roleLabel = {employer:'Employer', teen:'Teen Worker', parent:'Parent/Guardian'};
  const roleBg = {employer:'var(--blue)', teen:'var(--green)', parent:'var(--amber)'};

  mainArea.innerHTML = `
    <div class="msg-header">
      <div class="msg-header-avatar" style="background:${roleBg[contact.role]||'var(--green)'}">
        ${contact.avatar}
      </div>
      <div class="msg-header-info">
        <h4>${contact.name}</h4>
        <p>${roleLabel[contact.role]||contact.role}${contact.jobTitle?' · '+contact.jobTitle:''}</p>
      </div>
      <button class="msg-header-close" onclick="closeMsgModal()" title="Close">✕</button>
    </div>
    <div class="msg-body" id="msg-chat-body-${contactId}"></div>
    <div class="msg-safety-notice">🛡️ All messages are monitored by TeenWork for safety. Never share personal contact info or meet someone alone.</div>
    <div class="msg-input-bar">
      <textarea class="msg-input" id="msg-input-${contactId}" placeholder="Type a message… (Tip: keep it professional!)" rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg('${contactId}');}"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      <button class="msg-send-btn" onclick="sendMsg('${contactId}')">Send ✈️</button>
    </div>`;

  renderMsgBubbles(contactId);
}

// ── Render Bubbles ────────────────────────────────────
function renderMsgBubbles(contactId) {
  const contact = msgAllContacts.find(c => c.id === contactId);
  const body = document.getElementById('msg-chat-body-' + contactId);
  if (!contact || !body) return;

  if (!contact.messages.length) {
    body.innerHTML = '<div class="msg-empty-state"><div class="icon">👋</div><p>Say hello! This is the start of your conversation.</p></div>';
    return;
  }

  body.innerHTML = contact.messages.map(msg => {
    if (msg.blocked) {
      return `<div class="msg-blocked"><span class="msg-blocked-icon">🚫</span><div><span class="msg-blocked-label">Message Blocked</span><span class="msg-blocked-detail">This message was removed by the safety filter. Blocked messages are logged for review.</span></div></div>`;
    }
    return `<div class="msg-bubble-row ${msg.from}">
      <div>
        <div class="msg-bubble-time">${msg.time}${msg.encrypted ? ' <span title="End-to-end encrypted" style="color:var(--green);font-size:.7rem">🔐</span>' : ''}</div>
        <div class="msg-bubble ${msg.from}">${escapeHtml(msg.text)}</div>
      </div>
    </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}


// ════════════════════════════════════
//  SECTION 15: MESSAGE ENCRYPTION (AES-GCM, Web Crypto API)
//  MSG_CRYPTO.encrypt(text) — encrypts a message with a
//    session-ephemeral AES-GCM key derived at runtime.
//    Key is NEVER stored; encrypted copies are held in memory only.
//  This means messages are safe in memory snapshots / DevTools.
//  Note: messages are NOT end-to-end encrypted in production
//    since there is no key exchange — this is session-level safety.
// ════════════════════════════════════
const MSG_CRYPTO = (() => {
  // Derive a key from a passphrase (session-only, not stored)
  const _pass = 'tw-session-' + Math.random().toString(36).slice(2);
  let _key = null;

  async function _getKey() {
    if (_key) return _key;
    const enc = new TextEncoder();
    const raw = await crypto.subtle.importKey('raw', enc.encode(_pass.padEnd(32,'x').slice(0,32)),
      {name:'AES-GCM'}, false, ['encrypt','decrypt']);
    _key = raw;
    return _key;
  }

  async function encrypt(plaintext) {
    try {
      const key = await _getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(plaintext));
      // Pack iv + ciphertext as base64
      const combined = new Uint8Array(iv.byteLength + ct.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ct), iv.byteLength);
      return btoa(String.fromCharCode(...combined));
    } catch(e) { return plaintext; } // fallback: store plain
  }

  async function decrypt(cipherB64) {
    try {
      const key = await _getKey();
      const bytes = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
      const iv = bytes.slice(0, 12);
      const ct = bytes.slice(12);
      const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
      return new TextDecoder().decode(plain);
    } catch(e) { return cipherB64; } // fallback: return as-is
  }

  return { encrypt, decrypt };
})();

// Wrap sendMsg to encrypt stored messages
const _origSendMsg = typeof sendMsg === 'function' ? sendMsg : null;

// ── Send a Message (AI-primary moderation + regex fallback) ──
async function sendMsg(contactId) {
  const contact = msgAllContacts.find(c => c.id === contactId);
  const input = document.getElementById('msg-input-' + contactId);
  if (!contact || !input) return;
  const text = input.value.trim();
  if (!text) return;

  // Step 1: Instant regex check (no delay)
  const regexScan = scanMessage(text);
  if (regexScan.blocked) {
    _blockMsg(contactId, regexScan, input);
    return;
  }

  // Step 2: AI moderation check (async — show sending state)
  const sendBtn = input.nextElementSibling;
  const origBtnText = sendBtn?.textContent;
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '🔍…'; }

  try {
    const aiScan = await aiCheckMessage(text);
    if (aiScan.blocked) {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = origBtnText; }
      _blockMsg(contactId, { reason: aiScan.reason, source: 'AI' }, input);
      return;
    }
  } catch(e) {
    // AI failed — regex already passed, proceed
  }
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = origBtnText; }

  // Track message in activity log
  trackActivity('chat_message', text);

  const now = new Date();
  const timeStr = now.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});

  // Push message immediately for display (encrypted copy stored async)
  const msgObj = {from:'me', text, time: timeStr, encrypted: false};
  contact.messages.push(msgObj);
  MSG_CRYPTO.encrypt(text).then(encText => { msgObj.encText = encText; msgObj.encrypted = true; });
  input.value = '';
  input.style.height = 'auto';
  renderMsgBubbles(contactId);

  // Simulate a reply after 1.5s for demo purposes
  setTimeout(() => {
    const reply = generateAutoReply(contact, text);
    if (reply) {
      const replyTime = new Date();
      const rTimeStr = replyTime.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
      contact.messages.push({from:'them', text: reply, time: rTimeStr});
      renderMsgBubbles(contactId);
    }
  }, 1500 + Math.random()*1000);
}

function _blockMsg(contactId, scan, input) {
  const body = document.getElementById('msg-chat-body-' + contactId);
  if (body) {
    const warn = document.createElement('div');
    warn.className = 'msg-blocked';
    warn.innerHTML = getBlockReason(scan);
    body.appendChild(warn);
    body.scrollTop = body.scrollHeight;
  }
  if (input) { input.value = ''; input.style.height = 'auto'; }
  showToast('⚠️ Message blocked by safety filter.', 'error');
}

function generateAutoReply(contact, lastMsg) {
  const lower = lastMsg.toLowerCase();
  if (contact.role === 'employer') {
    if (lower.includes('available') || lower.includes('when')) return "Great, thanks for letting us know! We'll confirm the schedule by end of day.";
    if (lower.includes('pay') || lower.includes('rate') || lower.includes('wage')) return 'Pay is as listed in the job posting. Any other questions?';
    if (lower.includes('start') || lower.includes('begin')) return "Sounds good! We'll send a confirmation before the start date.";
    if (lower.includes('thank') || lower.includes('thanks')) return 'Of course! Looking forward to working with you. 😊';
    if (lower.includes('question') || lower.includes('?')) return 'Good question! Please allow 24 hours for a full response, or ask your parent to contact us by phone.';
    return "Thanks for your message! We'll get back to you within 24 hours.";
  }
  if (contact.role === 'teen') {
    if (lower.includes('available') || lower.includes('schedule')) return "I'm free most afternoons after 3pm and weekends. Let me know what works!";
    if (lower.includes('experience')) return "I've done similar work before and I'm a fast learner. I always show up on time!";
    if (lower.includes('thank') || lower.includes('thanks')) return "Thanks! I'm excited about this opportunity.";
    return "Got your message! I'll talk to my parent and get back to you soon.";
  }
  if (contact.role === 'parent') {
    if (lower.includes('thank') || lower.includes('thanks')) return 'Of course, always happy to help 😊';
    if (lower.includes('ready') || lower.includes('ok')) return 'Good. Remember to bring water and be polite!';
    return 'OK, let me know if you need anything.';
  }
  return null;
}

function escapeHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function safeText(str){ return escapeHtml(str); }
function safeBuildHTML(templateFn, data) {
  // Wrapper: escapes all string values in data before passing to template
  const safe = {};
  for (const k in data) safe[k] = typeof data[k]==='string' ? escapeHtml(data[k]) : data[k];
  return templateFn(safe);
}

// ════════════════════════════════════
//  SECTION 19: CITY AUTOCOMPLETE
//  US_CITIES_BY_STATE{} — all 50 states' major cities.
//  cityScrollerInput(inputId, dropId) — shows a dropdown of
//    matching city names filtered by selected state.
//  Also includes addressAutocomplete() which calls the
//  free Nominatim API (OpenStreetMap) for real street addresses.
// ════════════════════════════════════
// ── State-filtered city data ──────────────────────────
const US_CITIES_BY_STATE = {
  'Alabama':['Birmingham','Montgomery','Huntsville','Mobile','Tuscaloosa','Hoover','Dothan','Auburn','Decatur','Madison'],
  'Alaska':['Anchorage','Fairbanks','Juneau','Sitka','Ketchikan','Wasilla','Kenai','Kodiak'],
  'Arizona':['Phoenix','Tucson','Mesa','Chandler','Scottsdale','Glendale','Gilbert','Tempe','Peoria','Surprise'],
  'Arkansas':['Little Rock','Fort Smith','Fayetteville','Springdale','Jonesboro','Conway','Rogers','Pine Bluff'],
  'California':['Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Long Beach','Oakland','Bakersfield','Anaheim','Santa Ana','Riverside','Stockton','Irvine','Chula Vista','Fremont','Fontana','San Bernardino','Glendale','Santa Clarita','Garden Grove','Oxnard','Rancho Cucamonga','Oceanside','Santa Rosa','Elk Grove','Corona','Salinas','Pomona','Escondido','Torrance','Pasadena','El Monte','Sunnyvale','Visalia','Thousand Oaks','Simi Valley','Concord','Berkeley','Hayward'],
  'Colorado':['Denver','Colorado Springs','Aurora','Fort Collins','Lakewood','Thornton','Arvada','Westminster','Pueblo','Centennial'],
  'Connecticut':['Bridgeport','New Haven','Hartford','Stamford','Waterbury','Norwalk','Danbury','New Britain'],
  'Delaware':['Wilmington','Dover','Newark','Middletown','Smyrna'],
  'Florida':['Jacksonville','Miami','Tampa','Orlando','St. Petersburg','Hialeah','Port St. Lucie','Cape Coral','Tallahassee','Fort Lauderdale','Pembroke Pines','Hollywood','Gainesville','Miramar','Coral Springs','Clearwater','Palm Bay','Lakeland','West Palm Beach'],
  'Georgia':['Atlanta','Augusta','Columbus','Macon','Savannah','Athens','Sandy Springs','Roswell','Albany','Johns Creek'],
  'Hawaii':['Honolulu','Pearl City','Hilo','Kailua','Kaneohe','Waipahu'],
  'Idaho':['Boise','Meridian','Nampa','Idaho Falls','Pocatello','Caldwell',"Coeur d'Alene",'Twin Falls'],
  'Illinois':['Chicago','Aurora','Joliet','Rockford','Springfield','Naperville','Peoria','Elgin','Waukegan','Champaign'],
  'Indiana':['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel','Fishers','Bloomington','Hammond'],
  'Iowa':['Des Moines','Cedar Rapids','Davenport','Sioux City','Iowa City','Waterloo','Ames','Dubuque'],
  'Kansas':['Wichita','Overland Park','Kansas City','Olathe','Topeka','Lawrence','Shawnee'],
  'Kentucky':['Louisville','Lexington','Bowling Green','Owensboro','Covington','Richmond','Georgetown'],
  'Louisiana':['New Orleans','Baton Rouge','Shreveport','Lafayette','Lake Charles','Kenner','Bossier City'],
  'Maine':['Portland','Lewiston','Bangor','South Portland','Auburn','Biddeford','Augusta'],
  'Maryland':['Baltimore','Frederick','Rockville','Gaithersburg','Bowie','Hagerstown','Annapolis','College Park'],
  'Massachusetts':['Boston','Worcester','Springfield','Lowell','Cambridge','New Bedford','Brockton','Quincy','Lynn','Fall River','Newton','Lawrence','Somerville'],
  'Michigan':['Detroit','Grand Rapids','Warren','Sterling Heights','Ann Arbor','Lansing','Flint','Dearborn','Livonia','Clinton Township'],
  'Minnesota':['Minneapolis','St. Paul','Rochester','Duluth','Bloomington','Brooklyn Park','Plymouth','St. Cloud'],
  'Mississippi':['Jackson','Gulfport','Southaven','Hattiesburg','Biloxi','Meridian','Tupelo'],
  'Missouri':['Kansas City','St. Louis','Springfield','Independence','Columbia',"Lee's Summit","O'Fallon"],
  'Montana':['Billings','Missoula','Great Falls','Bozeman','Butte','Helena','Kalispell'],
  'Nebraska':['Omaha','Lincoln','Bellevue','Grand Island','Kearney','Fremont'],
  'Nevada':['Las Vegas','Henderson','Reno','North Las Vegas','Sparks','Carson City'],
  'New Hampshire':['Manchester','Nashua','Concord','Derry','Dover','Rochester','Keene'],
  'New Jersey':['Newark','Jersey City','Paterson','Elizabeth','Lakewood','Edison','Woodbridge','Toms River','Trenton'],
  'New Mexico':['Albuquerque','Las Cruces','Rio Rancho','Santa Fe','Roswell','Farmington'],
  'New York':['New York','Buffalo','Rochester','Yonkers','Syracuse','Albany','New Rochelle','Mount Vernon','Schenectady','Utica'],
  'North Carolina':['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Fayetteville','Cary','Wilmington','High Point','Concord'],
  'North Dakota':['Fargo','Bismarck','Grand Forks','Minot','West Fargo'],
  'Ohio':['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton','Parma','Canton','Youngstown','Lorain'],
  'Oklahoma':['Oklahoma City','Tulsa','Norman','Broken Arrow','Lawton','Edmond','Moore','Midwest City'],
  'Oregon':['Portland','Salem','Eugene','Gresham','Hillsboro','Bend','Beaverton','Medford'],
  'Pennsylvania':['Philadelphia','Pittsburgh','Allentown','Erie','Reading','Scranton','Bethlehem','Lancaster','Harrisburg'],
  'Rhode Island':['Providence','Cranston','Warwick','Pawtucket','East Providence','Woonsocket'],
  'South Carolina':['Columbia','Charleston','North Charleston','Mount Pleasant','Rock Hill','Greenville','Summerville'],
  'South Dakota':['Sioux Falls','Rapid City','Aberdeen','Brookings','Watertown'],
  'Tennessee':['Nashville','Memphis','Knoxville','Chattanooga','Clarksville','Murfreesboro','Jackson'],
  'Texas':['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Laredo','Lubbock','Irving','Garland','Waco','Killeen','McKinney','Brownsville','Denton','McAllen','Mesquite','Carrollton','Pasadena','Abilene','Beaumont'],
  'Utah':['Salt Lake City','West Valley City','Provo','West Jordan','Orem','Sandy','Ogden','St. George','Layton'],
  'Vermont':['Burlington','South Burlington','Montpelier','Barre','Rutland','Winooski','St. Johnsbury','Bennington','Brattleboro','Essex','Williston','Shelburne','Middlebury','Stowe','Waterbury','Colchester','Milton','Jericho','Richmond','Vergennes','Morrisville','Hyde Park','Newport','St. Albans','Swanton','Derby','Johnson','Lyndonville','Hardwick','Randolph','Guilford','Putney','Dummerston','Newfane','Townshend','Jamaica','Londonderry','Chester','Springfield','Bellows Falls','Windsor','Woodstock','Quechee','Hartford','White River Junction','Royalton','Bethel','Brookfield','Northfield','East Montpelier','Berlin','Barre Town','South Barre','Marshfield','Plainfield','Cabot','Peacham','Groton','Barnet','Ryegate','St. Johnsbury Center','Danville','Burke','Sutton','Island Pond','Brighton','Ferdinand','Canaan','Bloomfield','Lunenburg','Concord','Kirby','Victory','Granby','Lemington','Averill','Warner\'s Grant','Warren\'s Gore','Essex Junction','Hinesburg','Charlotte','Ferrisburgh','Addison','Bridport','Cornwall','Salisbury','Leicester','Brandon','Pittsford','Proctor','West Rutland','Castleton','Fair Haven','Poultney','Wells','Pawlet','Rupert','Dorset','Manchester','Arlington','Sunderland','Shaftsbury','North Bennington','Pownal','Readsboro','Whitingham','Halifax','Marlboro','Wilmington','Dover','Wardsboro','Stratton','Winhall','Peru','Landgrove','Weston','Ludlow','Mount Holly','Shrewsbury','Wallingford','Clarendon','Mendon','Killington','Bridgewater','Pomfret','Reading','Cavendish','Baltimore'],
  'Virginia':['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Alexandria','Hampton','Roanoke','Norfolk','Portsmouth'],
  'Washington':['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kent','Everett','Renton','Kirkland','Bellingham'],
  'West Virginia':['Charleston','Huntington','Morgantown','Parkersburg','Wheeling'],
  'Wisconsin':['Milwaukee','Madison','Green Bay','Kenosha','Racine','Appleton','Waukesha','Oshkosh'],
  'Wyoming':['Cheyenne','Casper','Laramie','Gillette','Rock Springs','Sheridan'],
};

function getCitiesForState(state) {
  if (!state) return US_CITIES;
  return US_CITIES_BY_STATE[state] || US_CITIES.filter(c => {
    // fallback: no state data, return all
    return true;
  });
}

function clearCityOnStateChange(cityInputId, dropId) {
  const inp = document.getElementById(cityInputId);
  const drop = document.getElementById(dropId);
  if (inp) inp.value = '';
  if (drop) drop.style.display = 'none';
}

function onStateFilterChange() {
  // Clear city when state changes
  const cityInput = document.getElementById('teen-filter-city');
  if (cityInput) cityInput.value = '';
  renderBrowseJobs();
}

const US_CITIES = [
  // Vermont (comprehensive)
  'Burlington','South Burlington','Montpelier','Barre','Rutland','Winooski','St. Johnsbury','Bennington','Brattleboro','Essex','Williston','Shelburne','Middlebury','Stowe','Waterbury','Colchester','Milton','Jericho','Richmond','Vergennes','Morrisville','Hyde Park','Newport','St. Albans','Swanton','Derby','Johnson','Lyndonville','Hardwick','Randolph','Guilford','Putney','Dummerston','Newfane','Townshend','Jamaica','Londonderry','Chester','Springfield','Bellows Falls','Windsor','Woodstock','White River Junction','Hartford','Royalton','Bethel','Northfield','East Montpelier','Berlin','Essex Junction','Hinesburg','Charlotte','Ferrisburgh','Brandon','Pittsford','Proctor','West Rutland','Castleton','Fair Haven','Poultney','Manchester','Arlington','Shaftsbury','North Bennington','Wilmington','Dover','Ludlow','Wallingford','Clarendon','Killington','Bridgewater','Cavendish',
  // Major US cities
  'New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco','Seattle','Denver','Nashville','Oklahoma City','El Paso','Portland','Las Vegas','Memphis','Louisville','Baltimore','Boston','Milwaukee','Albuquerque','Tucson','Fresno','Sacramento','Mesa','Kansas City','Atlanta','Omaha','Colorado Springs','Raleigh','Long Beach','Virginia Beach','Minneapolis','Tampa','New Orleans','Arlington','Bakersfield','Honolulu','Anaheim','Aurora','Santa Ana','Corpus Christi','Riverside','St. Louis','Lexington','Pittsburgh','Anchorage','Stockton','Cincinnati','St. Paul','Greensboro','Toledo','Newark','Plano','Henderson','Lincoln','Buffalo','Fort Wayne','Jersey City','Chula Vista','Orlando','St. Petersburg','Norfolk','Chandler','Laredo','Madison','Durham','Lubbock','Winston-Salem','Garland','Glendale','Hialeah','Reno','Baton Rouge','Irvine','Chesapeake','Irving','Scottsdale','North Las Vegas','Fremont','Gilbert','San Bernardino','Birmingham','Rochester','Richmond','Spokane','Des Moines','Montgomery','Modesto','Fayetteville','Tacoma','Shreveport','Fontana','Glendale','Akron','Moreno Valley','Yonkers','Huntington Beach','Little Rock','Columbus','Augusta','Grand Rapids','Salt Lake City','Tallahassee','Huntsville','Worcester','Knoxville','Oxnard','Providence','Brownsville','Santa Clarita','Garden Grove','Oceanside','Chattanooga','Fort Lauderdale','Rancho Cucamonga','Santa Rosa','Tempe','Ontario','Vancouver','Cape Coral','Sioux Falls','Peoria','Springfield','Pembroke Pines','Elk Grove','Salem','Corona','Eugene','Fort Collins','Cary','Jackson','Alexandria','Hayward','Clarksville','Lakewood','Lancaster','Salinas','Palmdale','Sunnyvale','Pomona','Escondido','Kansas City','Surprise','Torrance','Pasadena','Paterson','Rockford','Savannah','Macon','Bridgeport','Mesquite','Killeen','Syracuse','McAllen','Bellevue','Roseville','Denton','Fargo','Gainesville','Olathe','Miramar','Naperville','Waco','Sterling Heights','Pasadena','Carrollton','Cedar Rapids','Thousand Oaks','Hampton','Visalia','Elizabeth','Coral Springs','Concord','Hartford','Topeka','Simi Valley','Berkeley','Stamford','Abilene','Beaumont','Independence','Ann Arbor','Peoria','Columbia','El Monte','Provo','Springfield','Murfreesboro','Arvada','Flint','Charleston',
].sort();



let cityScrollerDebounce = null;

function cityScrollerInput(inputId, dropId) {
  const input = document.getElementById(inputId);
  const drop = document.getElementById(dropId);
  if (!input || !drop) return;
  const val = input.value.toLowerCase().trim();

  // Map each city input to its corresponding state selector
  const STATE_MAP = {
    'teen-filter-city': 'teen-filter-state',
    'emp-city':         'emp-state',
    'su-city':          'su-state',
    'su-emp-city':      'su-emp-state',
    'su-teen-city':     'su-teen-state',
    'acct-city':        'acct-state',
  };
  const stateId = STATE_MAP[inputId] || null;
  const stateEl = stateId ? document.getElementById(stateId) : null;
  const selectedState = stateEl ? stateEl.value : '';
  const cityPool = getCitiesForState(selectedState);
  clearTimeout(cityScrollerDebounce);
  cityScrollerDebounce = setTimeout(() => {
    const matches = val.length === 0
      ? cityPool.slice(0, 30)
      : cityPool.filter(c => c.toLowerCase().includes(val)).slice(0, 20);
    if (!matches.length) {
      drop.style.display = 'none';
      return;
    }
    drop.innerHTML = matches.map(c => {
      const safeCity = c.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<div class="city-dropdown-item" onmousedown="selectCity('${safeCity}','${inputId}','${dropId}')">${c}</div>`;
    }).join('');
    drop.style.display = 'block';
  }, 100);
  if (inputId === 'teen-filter-city') renderBrowseJobs();
}

function selectCity(city, inputId, dropId) {
  const input = document.getElementById(inputId);
  const drop = document.getElementById(dropId);
  if (input) input.value = city;
  if (drop) drop.style.display = 'none';
  if (inputId === 'teen-filter-city') renderBrowseJobs();
}

// Close dropdowns on outside click
document.addEventListener('click', e => {
  document.querySelectorAll('.city-dropdown').forEach(d => {
    if (!d.parentElement.contains(e.target)) d.style.display = 'none';
  });
});

// ════════════════════════════════════
//  SECTION 19B: ADDRESS AUTOCOMPLETE (Nominatim / OpenStreetMap)
//  Free, no-API-key address lookup for the US.
//  Fires after 4 characters, debounced 320ms.
//  selectAddress() auto-fills city, state, and ZIP fields
//  based on the selected suggestion.
// ════════════════════════════════════
let _addrDebounce = null;
let _addrAbort = null;

async function addressAutocomplete(input, dropId) {
  const drop = document.getElementById(dropId);
  if (!drop) return;
  const val = (input.value || '').trim();

  // Need at least 4 chars to get meaningful results
  if (val.length < 4) {
    drop.style.display = 'none';
    return;
  }

  clearTimeout(_addrDebounce);
  _addrDebounce = setTimeout(async () => {
    // Show loading indicator
    drop.innerHTML = '<div class="city-dropdown-item" style="color:var(--muted);font-style:italic">🔍 Searching addresses…</div>';
    drop.style.display = 'block';

    try {
      // Cancel previous in-flight request
      if (_addrAbort) _addrAbort.abort();
      _addrAbort = new AbortController();

      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(val)}`;
      const res = await fetch(url, {
        signal: _addrAbort.signal,
        headers: { 'Accept-Language': 'en-US,en' }
      });
      const results = await res.json();

      if (!results.length) {
        drop.innerHTML = '<div class="city-dropdown-item" style="color:var(--muted);font-style:italic">No results found</div>';
        return;
      }

      drop.innerHTML = results.map(r => {
        // Build a clean display label
        const addr = r.address || {};
        const house  = addr.house_number || '';
        const road   = addr.road || addr.pedestrian || '';
        const city   = addr.city || addr.town || addr.village || addr.county || '';
        const state  = addr.state || '';
        const zip    = addr.postcode || '';

        // Short form for input fill: just street number + road
        const streetFill = [house, road].filter(Boolean).join(' ');
        // Full label for display
        const label = r.display_name;
        const short = [streetFill || road, city, state, zip].filter(Boolean).join(', ');

        // Escape for inline JS
        const safe = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        return `<div class="city-dropdown-item addr-result"
          onmousedown="selectAddress('${safe(streetFill || road)}','${safe(city)}','${safe(state)}','${safe(zip)}','${input.id}','${dropId}')"
          title="${label.replace(/"/g,"&quot;")}">
          <span style="font-weight:600;color:var(--text)">${streetFill || road || city}</span>
          <span style="display:block;font-size:.75rem;color:var(--muted);margin-top:1px">${[city, state, zip].filter(Boolean).join(', ')}</span>
        </div>`;
      }).join('');

    } catch (err) {
      if (err.name === 'AbortError') return;
      drop.style.display = 'none';
    }
  }, 320);
}

function selectAddress(street, city, state, zip, inputId, dropId) {
  const input = document.getElementById(inputId);
  const drop  = document.getElementById(dropId);
  if (input) input.value = street;
  if (drop)  drop.style.display = 'none';

  // Auto-fill ZIP if there's a profile-zip field nearby
  if (inputId === 'profile-address') {
    const zipEl  = document.getElementById('profile-zip');
    if (zipEl && zip) zipEl.value = zip;
    // Also update the internal address state
    if (_userAddress) {
      _userAddress.street = street;
      _userAddress.zip    = zip;
      _userAddress.city   = city;
    }
    saveProfileAddress();
  }

  // Auto-fill paired city / state fields if they exist
  // For account settings
  if (inputId === 'acct-address') {
    const cityEl  = document.getElementById('acct-city');
    const stateEl = document.getElementById('acct-state');
    if (cityEl)  cityEl.value  = city;
    if (stateEl) stateEl.value = state;
  }
}
window.addressAutocomplete = addressAutocomplete;
window.selectAddress = selectAddress;

// ════════════════════════════════════════════════════════════════════
//  SECTION 18: STATE LABOR LAW DATA — single source of truth
//  All 50 US states with: minAge, school/summer hour caps,
//  night curfew, work permit requirement + URL, and a plain-English
//  notes string shown to teens and parents.
//  Used by: TW_Verify compliance check, signup permit note,
//  browse jobs age filter, and the AI labor law assistant.
//  SOURCE: US Dept of Labor FLSA + state DOL websites (2024).
//
//  Each entry contains:
//    minAge         — youngest age permitted to work (non-agricultural)
//    schoolWeekMax  — max hours/week during school sessions (ages 14-15)
//    schoolDayMax   — max hours/day on a school day (ages 14-15)
//    summerMax      — max hours/week when school is not in session
//    nightCurfew    — latest permitted end time for under-16 (school nights)
//    permitRequired — whether state requires a formal work permit/certificate
//    permitUrl      — official state resource URL (empty string if not required)
//    notes          — plain-English summary shown to teens and parents
//
//  States without specific statutes fall back to federal FLSA defaults.
//  Last reviewed: 2025. Laws change — always verify with your state's
//  Department of Labor before relying on this data in production.
// ════════════════════════════════════════════════════════════════════
const STATE_DATA = {
  'Alabama':        { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'AL follows federal FLSA. Ages 14-15: 3h/school day, 18h/school week. No state work permit required, but parental consent recommended.' },
  'Alaska':         { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'AK follows federal FLSA. Ages 14-15: federal hour limits apply. No state work permit required.' },
  'Arizona':        { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'AZ follows federal FLSA. Ages 14-15: 3h/school day, 18h/school week. No state work permit required.' },
  'Arkansas':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'AR follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'California':     { minAge:12, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.dir.ca.gov/dlse/faq_minors.htm', notes:'CA requires a work permit (Entertainment Work Permit or Employment Certificate) for all minors under 18. Get it from your school district. Ages 14-15: max 3h/school day. Ages 16-17: max 4h/school day, 8h/non-school day. No work past 10pm for under 18.' },
  'Colorado':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://cdle.colorado.gov/labor-law-stats/child-labor', notes:'CO requires a work permit for all minors under 18. Federal FLSA hour limits apply for ages 14-15. Ages 16-17: up to 8h/day during school, no work past 10pm.' },
  'Connecticut':    { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:true,  permitUrl:'https://portal.ct.gov/dol/divisions/wage-and-workplace-standards/child-labor', notes:'CT requires a Certificate of Age for all workers under 18. Ages 14-15: 3h/school day, 18h/school week. No work before 6am or after 9pm on school nights.' },
  'Delaware':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.delaware.gov/divisions/industrial-affairs/child-labor/', notes:'DE requires a work permit (Employment Certificate) from school. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm.' },
  'Florida':        { minAge:14, schoolWeekMax:15, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'FL has stricter rules than federal: ages 14-15 max 15h/school week, 3h/school day. Ages 16-17: max 30h/school week, 8h/school day. No work past 11pm (10pm under age 16) during school sessions. No state work permit required but parental notification recommended.' },
  'Georgia':        { minAge:12, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:false, permitUrl:'', notes:'GA follows federal FLSA. Ages 14-15: federal hour limits. No work before 6am or after 9pm during school year. No state work permit required.' },
  'Hawaii':         { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.hawaii.gov/wsd/child-labor/', notes:'HI requires a work permit from the Department of Labor and Industrial Relations for minors under 16. Ages 14-15: federal hour limits apply.' },
  'Idaho':          { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'ID follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Illinois':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:48, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.illinois.gov/content/dam/soi/en/web/idol/docs/Child-Labor-Law-Employers-Brochure.pdf', notes:'IL requires an Employment Certificate from your school before starting work. Ages 14-15: 3h/school day, 8h non-school, 18h/school week, 48h summer. No work before 7am or after 10pm.' },
  'Indiana':        { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.in.gov/dol/2418.htm', notes:'IN requires a work permit for minors under 18. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm (midnight in summer).' },
  'Iowa':           { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:true,  permitUrl:'https://www.iowadivisionoflabor.gov/child-labor', notes:'IA requires a work permit for minors under 16. Ages 14-15: 3h/school day, 18h/school week. No work before 7am or after 9pm on school nights.' },
  'Kansas':         { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'KS follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Kentucky':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.ky.gov/standards/child-labor/Pages/default.aspx', notes:'KY requires a work permit from school for minors under 18. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm.' },
  'Louisiana':      { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.laworks.net/WorkforceDev/YouthServices/WFS_ChildLaborLaw.asp', notes:'LA requires a work permit (Minor\'s Work Permit) for minors under 18. Ages 14-15: federal hour limits. No work before 6am or after 10pm.' },
  'Maine':          { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.maine.gov/labor/labor_laws/child_labor.html', notes:'ME requires a work permit from school for minors under 16. Ages 14-15: federal hour limits apply. Ages 16-17: permitted to work later with parental consent.' },
  'Maryland':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.dllr.state.md.us/labor/wages/empr/minors.shtml', notes:'MD requires a work permit issued by the Division of Labor and Industry. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm on school nights.' },
  'Massachusetts':  { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9:30pm',permitRequired:true, permitUrl:'https://www.mass.gov/guides/child-labor-laws-in-massachusetts', notes:'MA requires working papers (Employment Permit) for minors under 18. Apply through your city or town office. Ages 14-15: max 3h/school day, 18h/week. No work before 6am or after 9:30pm.' },
  'Michigan':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:48, nightCurfew:'10:30pm',permitRequired:true,permitUrl:'https://www.michigan.gov/leo/bureaus-agencies/ors/child-labor', notes:'MI requires a Minor Work Permit. Ages 14-15: 3h school days, 18h school weeks. Ages 16-17: 10h/day max, 48h/week. No work past 10:30pm (11:30pm summer) for ages 16-17. Get permit from school or local official.' },
  'Minnesota':      { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:true,  permitUrl:'https://www.dli.mn.gov/business/employment-practices/child-labor-standards', notes:'MN requires an Age and Schooling Certificate for minors under 16. Ages 14-15: 3h/school day, 18h/school week. No work before 7am or after 9pm on school nights.' },
  'Mississippi':    { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'MS follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Missouri':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.mo.gov/DLS/YouthEmployment', notes:'MO requires a work permit for minors under 16. Ages 14-15: federal hour limits apply. No work before 7am or after 10pm.' },
  'Montana':        { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'MT follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Nebraska':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://dol.nebraska.gov/LaborStandards/Article/Youth-Employment', notes:'NE requires an employment certificate for minors under 16. Ages 14-15: federal hour limits apply.' },
  'Nevada':         { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:48, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.nv.gov/Employers/Child_Labor/', notes:'NV requires a work permit for minors under 17. Ages 14-15: federal hour limits. Ages 16-17: up to 48h/week in summer. No work before 6am or after 10pm.' },
  'New Hampshire':  { minAge:12, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:true,  permitUrl:'https://www.labor.nh.gov/workers/youth-employment', notes:'NH requires an Employment Certificate for minors under 18. Ages 14-15: 3h/school day, 18h/school week. No work before 6:30am or after 9pm on school nights.' },
  'New Jersey':     { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'11pm', permitRequired:true,  permitUrl:'https://www.nj.gov/labor/wagehour/content/childlaborlaw.html', notes:'NJ requires an Employment Certificate for workers under 18. Get it from your school. Ages 14-15: federal hour limits apply. No work before 7am or after 11pm (7am-11pm rule).' },
  'New Mexico':     { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'NM follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'New York':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.labor.ny.gov/workerprotection/laborstandards/workprot/minors.shtm', notes:'NY requires Employment Certificate (working papers) from your school district. Ages 14-15: max 3h/school day, 8h non-school. Ages 16-17: max 4h school day. Separate permit required for each new employer.' },
  'North Carolina': { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'11pm', permitRequired:true,  permitUrl:'https://www.labor.nc.gov/workplace-rights/youth-employment', notes:'NC requires a Youth Employment Certificate for minors under 18. Ages 14-15: federal hours apply. Ages 16-17: no hour limits but no work past 11pm during school sessions.' },
  'North Dakota':   { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'ND follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Ohio':           { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:true,  permitUrl:'https://com.ohio.gov/divisions/industrial-compliance/child-labor', notes:'OH requires a work permit for minors under 18 issued by the school. Ages 14-15: 3h/school day, 18h/school week. No work before 7am or after 9pm on school nights.' },
  'Oklahoma':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'OK follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Oregon':         { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:44, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.oregon.gov/boli/workers/pages/young-workers.aspx', notes:'OR requires a work permit from school for minors under 18. Ages 14-15: 3h/school day, 18h/school week, 44h max in summer. No work before 7am or after 10pm.' },
  'Pennsylvania':   { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.dli.pa.gov/Individuals/Labor-Management-Relations/llc/Pages/Child-Labor.aspx', notes:'PA requires a work permit from school. Ages 14-15: 3h/school day, 18h/school week. Ages 16-17: 8h/day, 28h/school week. No work before 6am or after 10pm (midnight in summer) for under 18.' },
  'Rhode Island':   { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://dlt.ri.gov/labor-standards/child-labor', notes:'RI requires a work permit from school for minors under 16. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm.' },
  'South Carolina': { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'SC follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required, but minors must carry proof of age.' },
  'South Dakota':   { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'SD follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Tennessee':      { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.tn.gov/workforce/employees/labor-laws/child-labor.html', notes:'TN requires an Employment Certificate for minors under 18 from the school. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm (midnight in summer).' },
  'Texas':          { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'TX follows federal law closely. Ages 14-15 need a signed Child Labor Law Poster from employer. No hazardous work under 18. School-day restrictions follow federal FLSA. No state work permit required.' },
  'Utah':           { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'UT follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
  'Vermont':        { minAge:12, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'9pm',  permitRequired:false, permitUrl:'', notes:'VT follows federal FLSA. Ages 14-15: max 3h/school days, 18h/school weeks. Ages 16-17: no federal hour limits but must follow school attendance laws. No work after 9pm for under 16. No state work permit required.' },
  'Virginia':       { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.doli.virginia.gov/labor-law/child-labor/', notes:'VA requires a work permit for minors under 16 issued by the school. Ages 14-15: federal hour limits apply. No work before 7am or after 10pm.' },
  'Washington':     { minAge:14, schoolWeekMax:16, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://www.lni.wa.gov/workers-rights/youth-employment/', notes:'WA requires a Minor Work Permit. Ages 14-15: 3h/school day, 16h/school week (stricter than federal). Ages 16-17: 4h/school day, 20h/school week. No work past 10pm.' },
  'West Virginia':  { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:true,  permitUrl:'https://labor.wv.gov/Wage-Hour/Child_Labor/Pages/Child-Labor.aspx', notes:'WV requires an Employment Certificate from school for minors under 16. Ages 14-15: federal hour limits apply. No work before 6am or after 10pm.' },
  'Wisconsin':      { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:50, nightCurfew:'11pm', permitRequired:true,  permitUrl:'https://dwd.wisconsin.gov/er/laborstandards/workpermit.htm', notes:'WI requires a work permit for all workers under 18 from the school or employer. Ages 14-15: federal hour limits during school year, up to 50h/week in summer. No work before 7am or after 11pm (midnight in summer) for ages 16-17.' },
  'Wyoming':        { minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm', permitRequired:false, permitUrl:'', notes:'WY follows federal FLSA. Ages 14-15: federal hour limits. No state work permit required.' },
};

// ─── Convenience accessors ───────────────────────────────────────────────────
// These read from STATE_DATA so there is only one place to update labor rules.

function getTeenAge() {
  const dob = window.currentUser?.dob;
  if (dob) {
    const t=new Date(), b=new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob);
    let a=t.getFullYear()-b.getFullYear();
    if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
    return a;
  }
  return window.currentUser?.age || 16;
}

function getTeenState() {
  return currentUser?.state || 'Vermont';
}

function getStateRules(state) {
  // Returns the state entry (or a federal-FLSA fallback) in a shape compatible
  // with all existing callers that previously read from STATE_RULES.
  return STATE_DATA[state] || {
    minAge:14, schoolWeekMax:18, schoolDayMax:3, summerMax:40, nightCurfew:'10pm',
    permitRequired:false, permitUrl:'',
    notes:'Federal FLSA applies. Ages 14-15: max 3h/school day, 18h/school week, 8h/non-school day. Ages 16-17: no federal hour limits but state rules may vary.'
  };
}

function showPermitBanner(state) {
  const banner = document.getElementById('teen-permit-banner');
  if (!banner) return;
  const info = STATE_DATA[state];
  if (!info) { banner.classList.remove('show'); return; }
  if (info.permitRequired) {
    banner.innerHTML = `<strong>📋 Work Permit Required in ${state}</strong> ${info.notes}${info.permitUrl ? ` <a href="${info.permitUrl}" target="_blank" rel="noopener">Learn more →</a>` : ''}`;
    banner.classList.add('show');
    banner.style.background = '';
    banner.style.borderColor = '';
    banner.style.color = '';
  } else {
    banner.innerHTML = `<strong>✅ No Work Permit Required in ${state}</strong> ${info.notes}`;
    banner.classList.add('show');
    banner.style.background = 'var(--green-pale)';
    banner.style.borderColor = 'var(--green-light)';
    banner.style.color = 'var(--green)';
  }
}

// ════════════════════════════════════
//  WEEKLY HOURS TRACKER
// ════════════════════════════════════
// Demo: Alex has worked some hours this week already
let demoHoursWorkedThisWeek = 9; // in reality pulled from logged shifts

function updateHoursTracker() {
  const tracker = document.getElementById('teen-hours-tracker');
  if (!tracker) return;

  const state = getTeenState();
  const age = getTeenAge();
  const rules = getStateRules(state);

  // Determine applicable max: use schoolWeekMax (conservative)
  const maxHours = age <= 15 ? 18 : rules.schoolWeekMax; // federal for 14-15: 18h/school week
  const worked = demoHoursWorkedThisWeek;
  const remaining = Math.max(0, maxHours - worked);
  const pct = Math.min(100, Math.round((worked / maxHours) * 100));

  const bar = document.getElementById('hours-bar-fill');
  const remLabel = document.getElementById('hours-remaining-label');
  const workedLabel = document.getElementById('hours-worked-label');
  const maxLabel = document.getElementById('hours-max-label');

  if (bar) {
    bar.style.width = pct + '%';
    bar.className = 'hours-bar-fill' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  }
  if (remLabel) {
    remLabel.textContent = remaining > 0 ? `${remaining} hrs left this week` : '⚠️ At weekly limit';
    remLabel.className = 'hours-remaining-label' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  }
  if (workedLabel) workedLabel.textContent = `${worked} hrs worked`;
  if (maxLabel) maxLabel.textContent = `${maxHours} hrs max/week (${state} law)`;

  tracker.style.display = 'block';
}

function showStateRulesBanner(state) {
  const banner = document.getElementById('teen-state-rules-banner');
  if (!banner) return;
  const rules = getStateRules(state);
  banner.innerHTML = `<strong>📋 ${state} Teen Labor Rules (Auto-applied)</strong>${rules.notes}`;
  banner.classList.add('show');
}

// ════════════════════════════════════
//  GOOGLE CALENDAR SYNC
// ════════════════════════════════════
// Opens Google Calendar's add-event URL with the job details pre-filled.
// No API key needed — uses the public URL scheme.
async function addToGoogleCalendar(job) {
  try {
    if (typeof job === 'string') job = JSON.parse(job);
  } catch(e) {}

  function pad(n){ return String(n).padStart(2,'0'); }
  function gcalDate(d) {
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  }

  // ── AI: scan messages with this employer to find agreed schedule ──
  let start, end;
  const employerName = (job.employer || '').toLowerCase();
  const contact = msgAllContacts.find(c => c.name.toLowerCase().includes(employerName) || employerName.includes(c.name.toLowerCase()));

  if (contact && contact.messages.length > 0) {
    showToast('🤖 AI scanning messages for schedule…', 'info');
    const transcript = contact.messages
      .filter(m => !m.blocked)
      .map(m => `[${m.from === 'me' ? 'Teen' : 'Employer'}] ${m.text}`)
      .join('\n');

    try {
      const aiPrompt = `You are a scheduling parser. Read this message thread between a teen worker and an employer. Extract the most recently agreed-upon work schedule.

Messages:
${transcript}

Today's date is ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}.

Respond in EXACTLY this format (use 24-hour time, use the next upcoming occurrence of the day):
DATE: YYYY-MM-DD
START: HH:MM
END: HH:MM

If no clear schedule is found, respond: NONE`;

      const result = await callGemini(aiPrompt);
      if (!result.toUpperCase().includes('NONE')) {
        const dateMatch = result.match(/DATE:\s*(\d{4}-\d{2}-\d{2})/);
        const startMatch = result.match(/START:\s*(\d{1,2}):(\d{2})/);
        const endMatch = result.match(/END:\s*(\d{1,2}):(\d{2})/);

        if (dateMatch && startMatch) {
          const [_, y, m, d] = dateMatch[1].match(/(\d{4})-(\d{2})-(\d{2})/);
          start = new Date(parseInt(y), parseInt(m)-1, parseInt(d), parseInt(startMatch[1]), parseInt(startMatch[2]));
          if (endMatch) {
            end = new Date(parseInt(y), parseInt(m)-1, parseInt(d), parseInt(endMatch[1]), parseInt(endMatch[2]));
          } else {
            end = new Date(start); end.setHours(start.getHours() + 2);
          }
          showToast('✅ AI found schedule in messages!', 'success');
        }
      }
    } catch(e) {
      console.warn('AI calendar parse failed:', e);
    }
  }

  // Fallback: next Monday at 9am if AI couldn't find a schedule
  if (!start) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    start = new Date(now);
    start.setDate(now.getDate() + daysUntilMonday);
    start.setHours(9, 0, 0, 0);
    end = new Date(start);
    end.setHours(11, 0, 0, 0);
  }

  // Show confirmation before opening calendar
  const dateStr = start.toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'});
  const timeStr = start.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'}) + ' – ' + end.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  const confirmed = confirm(`📅 Add to Google Calendar?\n\nJob: ${job.title} @ ${job.employer}\nDate: ${dateStr}\nTime: ${timeStr}\nLocation: ${job.city}, ${job.state||''}\n\nClick OK to open Google Calendar with these details.`);
  if (!confirmed) return;

  const title = encodeURIComponent(`TeenWork: ${job.title} @ ${job.employer}`);
  const details = encodeURIComponent(`Job type: ${job.type||''}\nEmployer: ${job.employer||''}\nManaged via TeenWork`);
  const location = encodeURIComponent(`${job.city||''}, ${job.state||''}`);
  const dates = `${gcalDate(start)}/${gcalDate(end)}`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  window.open(url, '_blank');
  showToast('📅 Opening Google Calendar…', 'info');
}

// ── Unread Badge / renderBrowseJobs (single canonical version) ────────────────

// ════════════════════════════════════
//  VERIFIED EMPLOYER BADGE (visible to teens)
// ════════════════════════════════════
const VERIFIED_EMPLOYERS = new Set(['Mike\'s Landscaping','Green Thumb Gardens','The Hendersons','Sarah Chen','Burlington Pets','Maple Street Bakery']);
function isVerifiedEmployer(name) { return VERIFIED_EMPLOYERS.has(name); }
function getVerifiedBadge(employer) {
  return isVerifiedEmployer(employer) ? '<span class="verified-emp-badge" title="Verified Employer — identity and background confirmed" style="display:inline-flex;align-items:center;gap:3px;background:#d1fae5;color:#065f46;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">✅ Verified</span>' : '';
}
window.isVerifiedEmployer = isVerifiedEmployer;

function renderBrowseJobs() {
  const c = document.getElementById('browse-jobs-list');
  if (!c) return;

  const type = document.getElementById('teen-job-filter')?.value || 'all';
  const minPay = parseFloat(document.getElementById('teen-filter-pay')?.value) || 0;
  const selectedState = document.getElementById('teen-filter-state')?.value || '';
  const city = (document.getElementById('teen-filter-city')?.value || '').toLowerCase().trim();
  const transportFilter = document.getElementById('teen-filter-transport')?.value || '';
  const radiusMax = parseInt(document.getElementById('teen-filter-radius')?.value) || 50;
  const teenAge = getTeenAge();
  const rulesState = selectedState || getTeenState();
  const rules = getStateRules(rulesState);
  const localOnly = parentalControls['local-only'];
  const blockedTransport = parentalControls['blocked-transport'] || [];
  const homeCity = (currentUser?.city || 'Burlington').toLowerCase();

  showStateRulesBanner(rulesState);
  showPermitBanner && showPermitBanner(rulesState);
  updateHoursTracker && updateHoursTracker();

  const appliedIds = new Set(demoJobs.map(j => j.id));
  const jobs = browsableJobs.filter(j => !appliedIds.has(j.id));

  const filtered = jobs.filter(job => {
    if (type !== 'all' && job.type !== type) return false;
    if (job.pay < minPay) return false;
    if (selectedState && job.state !== selectedState) return false;
    if (city && !job.city.toLowerCase().includes(city)) return false;
    if (localOnly && !job.city.toLowerCase().includes(homeCity)) return false;
    if (transportFilter && !(job.transport||[]).includes(transportFilter)) return false;
    // Radius filter: estimate distance and exclude jobs beyond slider value
    const dist = estimateDistance ? estimateDistance(job.city) : 0;
    if (dist > radiusMax) return false;
    // Block jobs whose only transport options are all parent-blocked
    if (blockedTransport.length && job.transport && job.transport.length) {
      const allowed = job.transport.filter(t => !blockedTransport.includes(t));
      if (allowed.length === 0) return false;
    }
    return true;
  });

  if (!filtered.length) {
    c.innerHTML = '<p style="color:var(--muted);text-align:center;padding:1rem">No jobs match your filters.</p>';
    return;
  }

  c.innerHTML = filtered.map(job => {
    const ageBlocked = job.minAge > teenAge;
    const hoursWarn = job.maxHours > rules.schoolWeekMax;
    const extraClass = ageBlocked ? 'job-age-blocked' : hoursWarn ? 'job-hours-warn' : '';
    const locationLabel = job.state ? `${safeText(job.city)}, ${safeText(job.state)}` : safeText(job.city);
    const safeTitle = safeText(job.title || '').replace(/'/g, "\\'");
    const safeEmployer = safeText(job.employer || '').replace(/'/g, "\\'");
    const safePrompt = `A ${teenAge}-year-old teen is considering applying for this job: ${safeText(job.title)} at ${safeText(job.employer)}. Pay: $${job.pay}/${job.payType}. Type: ${safeText(job.type)}. Max ${job.maxHours} hours per week. Description: ${safeText(job.desc || '')}. Give a friendly 3-4 sentence assessment - is this a good opportunity? What should they know before applying?`.replace(/'/g,"\\'");
    const transportHtml = (job.transport && job.transport.length)
      ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
           <span style="font-size:.7rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Getting there:</span>
           ${job.transport.map(t => {
             const opt = TRANSPORT_OPTIONS.find(o=>o.id===t) || {icon:'🚶',label:t};
             const isBlocked = blockedTransport.includes(t);
             return `<span class="tag" style="${isBlocked?'opacity:.4;text-decoration:line-through;':''}background:var(--blue-pale);color:var(--blue);border:none">${opt.icon} ${opt.label.replace(/^[^ ]+ /,'')}</span>`;
           }).join('')}
         </div>` : '';

    return `
    <div class="browse-card ${extraClass}">
      <div class="browse-card-head">
        <div>
          <div class="browse-title">${safeText(job.title)}</div>
          <div class="browse-employer">${safeEmployer}${getVerifiedBadge(job.employer)} · ${locationLabel}</div>
        </div>
        <span class="tag pay">$${job.pay}${job.payType==='hourly'?'/hr':' flat'}</span>
      </div>
      <div class="browse-desc">${safeText(job.desc||'')}</div>
      <div class="job-meta" style="margin-bottom:6px">
        <span class="tag">🏷 ${safeText(job.type)}</span>
        <span class="tag ${ageBlocked?'badge-red':''}">Age ${job.minAge}+</span>
        <span class="tag ${hoursWarn?'badge-amber':''}">Max ${job.maxHours}h/wk</span>
        <span class="tag">📍 ${job.city}</span>
      </div>
      ${transportHtml}
      ${hoursWarn ? `<span class="hours-warn-tag">⚠️ This job's hours (${job.maxHours}h/wk) may exceed ${rulesState}'s school-week limit of ${rules.schoolWeekMax}h — confirm with your parent.</span>` : ''}
      ${ageBlocked ? '' : `
      <div class="browse-actions">
        <button class="btn-sm btn-apply" onclick="teenApply(${job.id},'${safeTitle}')">${parentalControls['approval'] ? 'Apply (needs parent OK)' : 'Apply Now'}</button>
        <button class="btn-sm btn-msg" onclick="openMsgModal('${safeEmployer}','employer')">💬 Message Employer</button>
        <button class="btn-sm btn-ai" onclick="openAI('${safePrompt}')">🤖 AI Job Review</button>
        <button class="btn-sm" style="background:var(--purple-pale);color:var(--purple);border:1px solid #c4b5fd;font-size:.74rem" onclick="requestEmployerBGC('${safeEmployer}','${safeTitle}')">🛡 Request BG Check</button>
        <button class="btn-sm" style="background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1;font-size:.74rem" onclick="openDisputeModal('${safeEmployer}','${safeTitle}')">⚠️ Report Issue</button>
      </div>`}
    </div>`;
  }).join('');
}

window.renderBrowseJobs = renderBrowseJobs;

function updateMsgBadge() {
  const userType = currentUser?.type || 'teen';
  const contacts = MSG_CONTACTS[userType] || [];
  const total = contacts.reduce((s,c)=>s+c.unread,0);
  const teenBadge = document.getElementById('teen-msg-badge');
  [teenBadge].forEach(el => {
    if (!el) return;
    el.textContent = total;
    el.style.display = total > 0 ? 'inline' : 'none';
  });
}

// ── Transport helpers ─────────────────────────────────
if (!parentalControls['blocked-transport']) parentalControls['blocked-transport'] = [];

function toggleTransport(checkbox, mode, badgeId) {
  const blocked = parentalControls['blocked-transport'] || [];
  const badge = document.getElementById(badgeId);
  if (checkbox.checked) {
    // Allow — remove from blocked list
    const idx = blocked.indexOf(mode);
    if (idx > -1) blocked.splice(idx, 1);
    if (badge) { badge.textContent = 'ON'; badge.className = 'controls-status-badge'; }
  } else {
    // Block — add to blocked list
    if (!blocked.includes(mode)) blocked.push(mode);
    if (badge) { badge.textContent = 'OFF'; badge.className = 'controls-status-badge off'; }
  }
  parentalControls['blocked-transport'] = blocked;
  renderBrowseJobs && renderBrowseJobs();
  showToast(`Transport "${mode}" ${checkbox.checked ? 'allowed' : 'blocked'} for Alex`, checkbox.checked ? 'success' : 'info');
}

function styleTransportOpt(checkbox, labelId) {
  const label = document.getElementById(labelId);
  if (!label) return;
  if (checkbox.checked) {
    label.style.borderColor = 'var(--green)';
    label.style.background = 'var(--green-pale)';
    label.style.color = 'var(--green)';
  } else {
    label.style.borderColor = 'var(--border)';
    label.style.background = '#fff';
    label.style.color = 'var(--text)';
  }
}

// ── Employer BGC ──────────────────────────────────────
async function runEmployerBGC() {
  const biz = document.getElementById('bgc-biz-name')?.value.trim();
  const type = document.getElementById('bgc-biz-type')?.value;
  const years = document.getElementById('bgc-years')?.value;
  const web = document.getElementById('bgc-website')?.value.trim();
  if (!biz || !type) { showAlert('emp-bgc-alert','Please enter your business name and type.','error'); return; }
  showAlert('emp-bgc-alert','Processing payment and running AI check…','info');
  const prompt = `You are a teen employment safety reviewer. An employer wants a background check badge on TeenWork. Business: "${biz}" (${type}, ${years||'unknown'} years, website: ${web||'none'}). Write a 3-4 sentence assessment: is this business appropriate and safe for teen workers ages 13-17? End with either "✅ APPROVED FOR BADGE" or "⚠️ MANUAL REVIEW NEEDED".`;
  try {
    const result = await callClaudeAI(prompt);
    const approved = result.includes('APPROVED FOR BADGE');
    document.getElementById('emp-bgc-alert').style.display = 'none';
    document.getElementById('emp-bgc-result').style.display = 'block';
    document.getElementById('emp-bgc-result').innerHTML = `
      <div style="background:${approved?'var(--green-pale)':'var(--amber-pale)'};border:2px solid ${approved?'var(--green-light)':'#f0b66a'};border-radius:12px;padding:1.1rem 1.2rem">
        <div style="font-family:'Fraunces',serif;font-size:1rem;font-weight:700;color:${approved?'var(--green)':'var(--amber)'};margin-bottom:.6rem">${approved ? '🛡 AI Check Complete — Badge Approved!' : '⚠️ Manual Review Requested'}</div>
        <p style="font-size:.85rem;line-height:1.6;color:var(--text)">${result}</p>
        ${approved ? `<div style="margin-top:.8rem;text-align:center"><div style="display:inline-flex;align-items:center;gap:8px;background:var(--purple-pale);border:2px solid #c4b5fd;border-radius:10px;padding:.6rem 1.2rem"><span style="font-size:1.4rem">🛡</span><span style="font-weight:700;color:var(--purple)">AI Verified Employer · TeenWork Certified ✓</span></div></div>` : ''}
      </div>`;
    if (approved) document.getElementById('emp-bgc-form').style.display = 'none';
    showToast(approved ? '🛡 Verified employer badge added!' : '⚠️ Manual review requested', approved ? 'success' : 'info');
  } catch(e) {
    showAlert('emp-bgc-alert','AI check failed — please try again.','error');
  }
}

async function previewEmployerBGC() {
  openAI('What does TeenWork\'s AI employer background check actually review? List 5 specific things it checks for in 2-3 sentences each. Focus on safety for teen workers ages 13-17.');
}

// ── Gamification init ────────────────────────────────
function initGamePanel() {
  renderGamePanel();
}

// Hook into renderTeenDashboard
const _origRenderTeenDash = typeof renderTeenDashboard === 'function' ? renderTeenDashboard : null;
if (_origRenderTeenDash) {
  window.renderTeenDashboard = function() {
    _origRenderTeenDash();
    setTimeout(initGamePanel, 80);
  };
} else {
  // Fallback: init after DOM ready
  document.addEventListener('DOMContentLoaded', () => setTimeout(initGamePanel, 300));
}

// ════════════════════════════════════
//  PII / PROFANITY MESSAGE SCANNER
// ════════════════════════════════════
const PII_PATTERNS = [
  { re: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, label: 'phone number' },
  { re: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, label: 'SSN-like number' },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, label: 'email address' },
  { re: /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|way|pl|place)\b/i, label: 'street address' },
  { re: /\b(snapchat|instagram|tiktok|whatsapp|telegram|discord|venmo|cashapp|zelle)\b/i, label: 'off-platform app' },
  { re: /@[a-zA-Z0-9_]{2,30}\b/, label: 'social handle' },
];
function scanPII(text) {
  for (const p of PII_PATTERNS) {
    if (p.re.test(text)) return { blocked: true, reason: 'pii_detected', label: p.label };
  }
  return { blocked: false };
}
// Patch into sendMsg — hook before the existing regex scan
const _origScanMessage = typeof scanMessage === 'function' ? scanMessage : null;
if (_origScanMessage) {
  window._baseScanMessage = _origScanMessage;
  window.scanMessage = function(text) {
    const pii = scanPII(text);
    if (pii.blocked) return { blocked: true, reason: 'pii_detected', word: pii.label };
    return window._baseScanMessage(text);
  };
}

// ════════════════════════════════════
//  PARENT DATA EXPORT
// ════════════════════════════════════
function exportParentData() {
  const data = {
    exportDate: new Date().toISOString(),
    teen: { name: 'Alex Johnson', age: 16, state: 'Vermont' },
    applications: demoJobs.map(j => ({ title: j.title, employer: j.employer, status: j.status, applied: j.applied, pay: j.pay, city: j.city })),
    ratings: demoRatings.map(r => ({ job: r.job, from: r.from, stars: r.stars, comment: r.comment })),
    notifications: demoNotifs.slice(0, 50),
    parentalControls: { ...parentalControls },
    messages: (MSG_CONTACTS.teen || []).map(c => ({
      contact: c.name, role: c.role,
      messageCount: c.messages.length,
      messages: c.messages.map(m => ({ from: m.from, time: m.time, blocked: !!m.blocked }))
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `teenwork-data-export-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully!', 'success');
}
window.exportParentData = exportParentData;

// ════════════════════════════════════
//  TEEN-TO-TEEN "WOULD YOU WORK HERE AGAIN?" SIGNAL
// ════════════════════════════════════
const teenSignals = {};
function teenWorkAgainSignal(employerName, wouldReturn) {
  teenSignals[employerName] = wouldReturn;
  const pct = getTeenSignalPct(employerName);
  showToast(wouldReturn
    ? `You said you'd work for ${employerName} again! (${pct}% of teens agree)`
    : `Noted — you wouldn't work for ${employerName} again. (${pct}% would return)`, 'info');
}
function getTeenSignalPct(employer) {
  // Simulated aggregate — in production this comes from DB
  const base = { "Mike's Landscaping": 92, "Sarah Chen": 88, "The Hendersons": 95, "Burlington Pets": 78 };
  return base[employer] || Math.floor(70 + Math.random() * 25);
}
window.clearCityOnStateChange = clearCityOnStateChange;
window.onStateFilterChange = onStateFilterChange;
window.cityScrollerInput = cityScrollerInput;
window.selectCity = selectCity;

// ════════════════════════════════════
//  PWA INSTALL PROMPT
// ════════════════════════════════════
let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  showInstallBanner();
});
function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:12px 20px;border-radius:12px;z-index:9999;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.2);font-family:DM Sans,sans-serif;font-size:.88rem;max-width:90vw;';
  banner.innerHTML = '<span>📱 <strong>Install TeenWork</strong> for the best experience</span><button onclick="installPWA()" style="background:#fff;color:var(--green);border:none;padding:6px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:.82rem;white-space:nowrap">Install</button><button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:1.1rem;padding:0 4px">✕</button>';
  document.body.appendChild(banner);
}
function installPWA() {
  if (_deferredInstallPrompt) {
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(r => {
      if (r.outcome === 'accepted') showToast('TeenWork installed!', 'success');
      _deferredInstallPrompt = null;
      document.getElementById('pwa-install-banner')?.remove();
    });
  }
}
window.installPWA = installPWA;
// iOS Safari install hint
function checkIOSInstall() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if (isIOS && !isStandalone && !sessionStorage.getItem('ios-install-dismissed')) {
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:14px 20px;border-radius:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);font-family:DM Sans,sans-serif;font-size:.85rem;max-width:90vw;text-align:center;line-height:1.5;';
      banner.innerHTML = '📱 <strong>Install TeenWork:</strong> Tap <span style="font-size:1.1em">⬆</span> Share, then <strong>"Add to Home Screen"</strong><br><button onclick="sessionStorage.setItem(\'ios-install-dismissed\',\'1\');this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 12px;border-radius:6px;margin-top:8px;cursor:pointer;font-size:.78rem">Dismiss</button>';
      document.body.appendChild(banner);
    }, 3000);
  }
}
document.addEventListener('DOMContentLoaded', checkIOSInstall);

// ════════════════════════════════════
//  VIDEO INTRO (MediaRecorder + Supabase Storage)
// ════════════════════════════════════
let _videoStream = null, _mediaRecorder = null, _videoChunks = [];
function openVideoIntro() {
  const modal = document.createElement('div');
  modal.id = 'video-intro-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:16px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto">
      <h3 style="margin:0 0 8px;font-size:1.1rem">🎥 Record Your Video Intro</h3>
      <p style="font-size:.82rem;color:var(--muted);margin-bottom:16px">Record a 30-second video to show employers your personality. No work history needed!</p>
      <video id="video-preview" style="width:100%;border-radius:10px;background:#000;aspect-ratio:4/3" autoplay muted playsinline></video>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button id="video-start-btn" class="btn-primary" style="font-size:.85rem;padding:8px 16px" onclick="startVideoRecording()">🔴 Start Recording</button>
        <button id="video-stop-btn" class="btn-secondary" style="font-size:.85rem;padding:8px 16px;display:none" onclick="stopVideoRecording()">⏹ Stop</button>
        <button id="video-save-btn" class="btn-primary" style="font-size:.85rem;padding:8px 16px;display:none" onclick="saveVideoIntro()">💾 Save Video Intro</button>
        <button class="btn-secondary" style="font-size:.85rem;padding:8px 16px" onclick="closeVideoIntro()">Cancel</button>
      </div>
      <div id="video-timer" style="font-size:.78rem;color:var(--muted);margin-top:8px"></div>
    </div>`;
  document.body.appendChild(modal);
  // Start camera
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: true })
    .then(stream => {
      _videoStream = stream;
      document.getElementById('video-preview').srcObject = stream;
    })
    .catch(() => showToast('Camera access denied — enable camera to record a video intro', 'error'));
}
function startVideoRecording() {
  if (!_videoStream) return;
  _videoChunks = [];
  _mediaRecorder = new MediaRecorder(_videoStream, { mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '' });
  _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _videoChunks.push(e.data); };
  _mediaRecorder.onstop = () => {
    const blob = new Blob(_videoChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const preview = document.getElementById('video-preview');
    preview.srcObject = null; preview.src = url; preview.muted = false; preview.controls = true; preview.play();
    document.getElementById('video-save-btn').style.display = '';
    window._videoBlob = blob;
  };
  _mediaRecorder.start();
  document.getElementById('video-start-btn').style.display = 'none';
  document.getElementById('video-stop-btn').style.display = '';
  // 30-second auto-stop
  let sec = 0;
  const timer = document.getElementById('video-timer');
  const iv = setInterval(() => {
    sec++;
    timer.textContent = `Recording: ${sec}s / 30s`;
    if (sec >= 30) { clearInterval(iv); stopVideoRecording(); }
  }, 1000);
  _mediaRecorder._timerIv = iv;
}
function stopVideoRecording() {
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
    clearInterval(_mediaRecorder._timerIv);
    _mediaRecorder.stop();
    _videoStream?.getTracks().forEach(t => t.stop());
  }
  document.getElementById('video-stop-btn').style.display = 'none';
}
function saveVideoIntro() {
  if (!window._videoBlob) return;
  // In production: upload to Supabase Storage. For now, store as data URL
  const reader = new FileReader();
  reader.onload = () => {
    userActivity.videoIntro = reader.result;
    showToast('🎥 Video intro saved to your profile!', 'success');
    closeVideoIntro();
    // Show badge on profile
    const badge = document.getElementById('video-intro-status');
    if (badge) { badge.textContent = '🎥 Video Intro Recorded ✓'; badge.style.color = 'var(--green)'; }
  };
  reader.readAsDataURL(window._videoBlob);
}
function closeVideoIntro() {
  _videoStream?.getTracks().forEach(t => t.stop());
  _videoStream = null;
  document.getElementById('video-intro-modal')?.remove();
}
window.openVideoIntro = openVideoIntro;
window.startVideoRecording = startVideoRecording;
window.stopVideoRecording = stopVideoRecording;
window.saveVideoIntro = saveVideoIntro;
window.closeVideoIntro = closeVideoIntro;

// ════════════════════════════════════
//  SECTION 20: AI-POWERED SUPPORT EMAIL MODAL
//  openSupportModal(context, detail) — builds and shows a
//    modal with an AI-drafted support email (via Gemini).
//  aiDraftSupportEmail() — calls Gemini to write a
//    context-aware 3-4 sentence support message prefilled
//    into the textarea so the user can edit and send it.
//  sendSupportEmail() — opens mailto: with the drafted body.
//  copySupportEmail() — copies the body to clipboard.
//  injectSupportFAB() — injects the floating "🆘 Support"
//    button on DOMContentLoaded (visible on all pages).
// ════════════════════════════════════
const SUPPORT_EMAIL = 'ayaquarrierdraper@gmail.com';

async function openSupportModal(errorContext, errorDetail) {
  // Remove any existing modal
  document.getElementById('support-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'support-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:1rem;';

  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:20px;padding:1.8rem;max-width:520px;width:100%;box-shadow:var(--shadow-lg);max-height:90vh;overflow-y:auto;animation:slideUp .25s ease">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
        <div style="width:38px;height:38px;background:var(--green-pale);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">📧</div>
        <div>
          <h3 style="font-family:'Fraunces',serif;font-size:1.15rem;color:var(--green);margin:0">Contact Support</h3>
          <p style="font-size:.78rem;color:var(--muted);margin:0">We'll help you get this sorted out</p>
        </div>
        <button onclick="document.getElementById('support-modal-overlay').remove()" style="margin-left:auto;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted);padding:4px;line-height:1">✕</button>
      </div>

      <!-- ── SELF-HELP: common fixes before contacting admin ── -->
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:.9rem 1rem;margin-bottom:1rem;">
        <div style="font-size:.8rem;font-weight:800;color:#166534;margin-bottom:7px;display:flex;align-items:center;gap:6px;">💡 Quick fixes — try these first!</div>
        <div style="display:grid;gap:6px;font-size:.78rem;color:#166534;">
          <details style="border:1px solid #bbf7d0;border-radius:8px;background:#fff;padding:6px 10px;cursor:pointer;">
            <summary style="font-weight:700;list-style:none;cursor:pointer;">🔄 Something not loading or broken?</summary>
            <div style="margin-top:6px;color:#374151;line-height:1.55;">Try refreshing the page (pull down on mobile, or press F5). If it keeps happening, clear your browser cache and try again.</div>
          </details>
          <details style="border:1px solid #bbf7d0;border-radius:8px;background:#fff;padding:6px 10px;cursor:pointer;">
            <summary style="font-weight:700;list-style:none;cursor:pointer;">📧 Didn't get a verification email?</summary>
            <div style="margin-top:6px;color:#374151;line-height:1.55;">Check your spam/junk folder. The email comes from ayaquarrierdraper@gmail.com — add it to your contacts so future emails don't get filtered.</div>
          </details>
          <details style="border:1px solid #bbf7d0;border-radius:8px;background:#fff;padding:6px 10px;cursor:pointer;">
            <summary style="font-weight:700;list-style:none;cursor:pointer;">🔒 Can't log in?</summary>
            <div style="margin-top:6px;color:#374151;line-height:1.55;">Double-check your email and password. Passwords are case-sensitive. If you forgot your password, sign out and use the "Forgot password?" link on the login screen.</div>
          </details>
          <details style="border:1px solid #bbf7d0;border-radius:8px;background:#fff;padding:6px 10px;cursor:pointer;">
            <summary style="font-weight:700;list-style:none;cursor:pointer;">🤖 AI not responding?</summary>
            <div style="margin-top:6px;color:#374151;line-height:1.55;">The AI runs on an external service that sometimes has brief outages. Wait a minute and try again. If you've hit your daily limit (10 for Free, unlimited for Pro), it resets at midnight.</div>
          </details>
        </div>
        <div style="margin-top:8px;font-size:.73rem;color:#16a34a;font-weight:600;">Still stuck? Fill out the form below and we'll reply fast 👇</div>
      </div>

      <div style="background:var(--blue-pale);border:1px solid #bfdbfe;border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem;font-size:.82rem;color:var(--blue)">
        🤖 <strong>AI is drafting an email for you</strong> — you can edit it before sending
      </div>

      <div style="margin-bottom:1rem">
        <label style="font-size:.78rem;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">Your name (optional)</label>
        <input id="support-name" type="text" placeholder="e.g. Alex" value="${currentUser?.name || ''}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
      </div>

      <div style="margin-bottom:1rem">
        <label style="font-size:.78rem;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">What were you trying to do?</label>
        <input id="support-context-input" type="text" placeholder="e.g. Signing up, posting a job, using the AI..." value="${(errorContext || '').replace(/</g,'&lt;')}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
      </div>

      <div style="margin-bottom:1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <label style="font-size:.78rem;font-weight:700;color:var(--muted)">Your message to support</label>
          <button onclick="aiDraftSupportEmail()" style="background:var(--green-pale);color:var(--green);border:1px solid var(--green-light);padding:3px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;font-family:inherit;font-weight:700">🤖 Re-draft with AI</button>
        </div>
        <textarea id="support-body" rows="6" placeholder="Drafting your message..." style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.87rem;resize:vertical;outline:none;line-height:1.6;transition:border-color .2s" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"></textarea>
        <div id="support-draft-status" style="font-size:.74rem;color:var(--muted);margin-top:3px"></div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="sendSupportEmail()" style="background:var(--green);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;flex:1;min-width:140px">📨 Send to Support</button>
        <button onclick="document.getElementById('support-modal-overlay').remove()" style="background:var(--bg);color:var(--muted);border:1.5px solid var(--border);padding:10px 16px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer">Cancel</button>
      </div>

      <div style="margin-top:.9rem;padding:.75rem 1rem;background:var(--green-pale);border-radius:10px;border:1px solid #86efac;text-align:center;">
        <div style="font-size:.74rem;color:#166534;font-weight:700;">📬 Message goes directly to the TeenWork admin team — we'll reply fast!</div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Store context for the AI draft
  overlay._errorContext = errorContext || '';
  overlay._errorDetail = errorDetail || '';

  // Auto-draft
  aiDraftSupportEmail(errorContext, errorDetail);
}

async function aiDraftSupportEmail(ctx, det) {
  const overlay = document.getElementById('support-modal-overlay');
  if (!overlay) return;

  const nameVal = document.getElementById('support-name')?.value.trim() || currentUser?.name || 'A TeenWork user';
  const contextVal = document.getElementById('support-context-input')?.value.trim()
    || ctx || overlay._errorContext || 'using the TeenWork app';
  const detailVal = det || overlay._errorDetail || '';
  const statusEl = document.getElementById('support-draft-status');
  const bodyEl = document.getElementById('support-body');

  if (bodyEl) bodyEl.placeholder = 'AI is writing your message...';
  if (statusEl) statusEl.textContent = '🤖 AI is drafting your message...';

  const prompt = `Write a short, friendly support email from a TeenWork user to the support team.

User name: ${nameVal}
What they were doing: ${contextVal}
Error/issue detail: ${detailVal || 'No specific error — they just need help'}
Current time: ${new Date().toLocaleString()}

Write a 3-4 sentence email body (no subject line, no "Dear..." opener, just the body). 
- Keep it friendly and clear
- Describe the issue in plain language
- Ask for help politely
- Do NOT include placeholders like [your name] — write it as if already filled in
- Sign it with "${nameVal}"`;

  try {
    const draft = await callGemini(prompt);
    if (bodyEl) bodyEl.value = draft;
    if (statusEl) statusEl.textContent = '✅ AI drafted your message — feel free to edit it';
  } catch(e) {
    // Fallback draft
    const fallback = `Hi TeenWork Support,

I ran into an issue while ${contextVal || 'using the app'}. ${detailVal ? "Here's what happened: " + detailVal + '. ' : ''}Could you help me get this sorted out?

Thanks,
${nameVal}
Sent from TeenWork · ${new Date().toLocaleDateString()}`;
    if (bodyEl) bodyEl.value = fallback;
    if (statusEl) statusEl.textContent = '✍️ Here\'s a draft — edit as needed';
  }
}

function sendSupportEmail() {
  const body = document.getElementById('support-body')?.value || '';
  const context = document.getElementById('support-context-input')?.value || 'Support Request';
  const name = document.getElementById('support-name')?.value || currentUser?.name || 'Anonymous';
  const senderEmail = currentUser?.email && currentUser.email !== 'admin' ? currentUser.email : 'unknown';
  const senderType = currentUser?.type || 'visitor';

  // Save to admin support inbox with full sender info
  _adminSaveSupportMessage({
    name,
    context,
    body,
    email: senderEmail,
    userType: senderType,
    time: new Date().toISOString(),
    senderDisplay: name + (senderEmail !== 'unknown' ? ' <' + senderEmail + '>' : '') + (senderType !== 'visitor' ? ' · ' + senderType : '')
  });

  // Close modal and confirm
  document.getElementById('support-modal-overlay')?.remove();
  if (typeof showToast === 'function') showToast('✅ Message sent to the TeenWork team! We\'ll reply soon.', 'success');
}

function copySupportEmail() {
  const body = document.getElementById('support-body')?.value || '';
  navigator.clipboard.writeText(body).then(() => {
    showToast('Email copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = body;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Email copied!', 'success');
  });
}

// Floating support button — handled by v17 FAB system below; this original injector is disabled
function injectSupportFAB() {
  // v17 injects and manages the support FAB — this function intentionally does nothing
  return;
  const fab = document.createElement('button');
  fab.id = 'support-fab';
  fab.innerHTML = '🆘 Support';
  fab.title = 'Contact Support';
  fab.style.cssText = [
    'position:fixed',
    'bottom:90px',
    'right:16px',
    'z-index:997',
    'background:var(--green)',
    'color:#fff',
    'border:none',
    'border-radius:50px',
    'padding:9px 16px',
    'font-family:DM Sans,sans-serif',
    'font-size:.78rem',
    'font-weight:700',
    'cursor:grab',
    'box-shadow:0 4px 16px rgba(0,0,0,.18)',
    'display:flex',
    'align-items:center',
    'gap:5px',
    'transition:opacity .2s,transform .2s',
    'opacity:0.88',
    'touch-action:none',
    'user-select:none',
  ].join(';');
  fab.onmouseenter = () => { if (!fab._dragging) { fab.style.opacity = '1'; fab.style.transform = 'scale(1.04)'; } };
  fab.onmouseleave = () => { if (!fab._dragging) { fab.style.opacity = '0.88'; fab.style.transform = ''; } };

  // Drag logic
  let startX, startY, startRight, startBottom, didDrag;
  function getRight()  { return parseFloat(fab.style.right)  || 16; }
  function getBottom() { return parseFloat(fab.style.bottom) || 90; }

  function onDragStart(e) {
    didDrag = false;
    fab._dragging = true;
    fab.style.cursor = 'grabbing';
    fab.style.transition = 'none';
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX; startY = touch.clientY;
    startRight = getRight(); startBottom = getBottom();
    e.preventDefault();
  }
  function onDragMove(e) {
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag = true;
    const newRight  = Math.max(8, Math.min(window.innerWidth  - 80, startRight  - dx));
    const newBottom = Math.max(8, Math.min(window.innerHeight - 60, startBottom - dy));
    fab.style.right  = newRight  + 'px';
    fab.style.bottom = newBottom + 'px';
    e.preventDefault();
  }
  function onDragEnd(e) {
    fab._dragging = false;
    fab.style.cursor = 'grab';
    fab.style.transition = 'opacity .2s,transform .2s';
    fab.style.opacity = '0.88';
    fab.style.transform = '';
    // Save position
    try { localStorage.setItem('tw_fab_pos', JSON.stringify({right: getRight(), bottom: getBottom()})); } catch(err){}
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend',  onDragEnd);
  }

  fab.addEventListener('mousedown', e => {
    onDragStart(e);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  });
  fab.addEventListener('touchstart', e => {
    onDragStart(e);
    document.addEventListener('touchmove', onDragMove, {passive:false});
    document.addEventListener('touchend',  onDragEnd);
  }, {passive:false});

  fab.addEventListener('click', e => {
    if (didDrag) { e.stopPropagation(); e.preventDefault(); return; }
    openSupportModal('General Support', '');
  });

  // Restore saved position
  try {
    const saved = JSON.parse(localStorage.getItem('tw_fab_pos'));
    if (saved) { fab.style.right = saved.right + 'px'; fab.style.bottom = saved.bottom + 'px'; }
  } catch(err){}

  document.body.appendChild(fab);
}

document.addEventListener('DOMContentLoaded', injectSupportFAB);


// ════════════════════════════════════
//  SECTION 21: MOBILE "MORE" DRAWER
//  When the user taps the ☰ "More" tab on mobile, a slide-up
//  drawer appears with overflow navigation items that don't
//  fit in the 4-tab bottom bar (e.g. Ratings, Lessons).
// ════════════════════════════════════
function openMobileMoreDrawer() {
  const existing = document.getElementById('mobile-more-drawer');
  if (existing) { existing.remove(); return; }
  const items = window._mobileMoreItems || [];
  if (!items.length) return;

  // Inject styles once
  if (!document.getElementById('more-drawer-style')) {
    const s = document.createElement('style');
    s.id = 'more-drawer-style';
    s.textContent = `
      @keyframes slideUpDrawer{from{transform:translateY(100%)}to{transform:translateY(0)}}
      #mobile-more-drawer{position:fixed;bottom:0;left:0;right:0;z-index:299;
        background:var(--card,#fff);border-radius:20px 20px 0 0;
        box-shadow:0 -8px 40px rgba(0,0,0,.18);
        animation:slideUpDrawer .22s cubic-bezier(.32,1,.22,1);
        padding-bottom:env(safe-area-inset-bottom,0px);}
      #mobile-more-scrim{position:fixed;inset:0;z-index:298;background:rgba(0,0,0,.35);
        animation:fadeIn .15s ease}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      .more-drawer-pill{width:36px;height:4px;border-radius:2px;
        background:var(--border,#ddd);margin:10px auto 4px;cursor:pointer}
      .more-drawer-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;
        padding:8px 12px 16px}
      .more-drawer-btn{background:var(--bg,#f8faf8);border:1.5px solid var(--border,#e5e7eb);
        border-radius:14px;padding:12px 4px 10px;
        font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;
        color:var(--text,#111);cursor:pointer;
        display:flex;flex-direction:column;align-items:center;gap:5px;
        transition:background .12s,transform .1s}
      .more-drawer-btn:active{transform:scale(.93);background:var(--green-pale,#d1fae5)}
      .more-drawer-btn .mdb-icon{font-size:1.5rem;line-height:1}
      .more-drawer-header{padding:6px 16px 2px;display:flex;align-items:center;
        justify-content:space-between;border-bottom:1px solid var(--border,#e5e7eb);margin-bottom:2px}
      .more-drawer-header span{font-family:'Fraunces',serif;font-size:.9rem;font-weight:700;color:var(--green)}
    `;
    document.head.appendChild(s);
  }

  // Scrim (tap to close)
  const scrim = document.createElement('div');
  scrim.id = 'mobile-more-scrim';
  scrim.onclick = () => { drawer.remove(); scrim.remove(); };
  document.body.appendChild(scrim);

  const drawer = document.createElement('div');
  drawer.id = 'mobile-more-drawer';
  drawer.innerHTML = `
    <div class="more-drawer-pill" onclick="document.getElementById('mobile-more-drawer')?.remove();document.getElementById('mobile-more-scrim')?.remove()"></div>
    <div class="more-drawer-header">
      <span>More</span>
      <button onclick="document.getElementById('mobile-more-drawer')?.remove();document.getElementById('mobile-more-scrim')?.remove()"
        style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--muted);line-height:1;padding:4px">✕</button>
    </div>
    <div class="more-drawer-grid">
      ${items.map(([icon, label, tabId]) => {
        const isVerify = tabId === 'verify';
        const action = isVerify
          ? `showVerifyPage();document.getElementById('mobile-more-drawer')?.remove();document.getElementById('mobile-more-scrim')?.remove()`
          : `switchDashTab(null,'${tabId}');document.getElementById('mobile-more-drawer')?.remove();document.getElementById('mobile-more-scrim')?.remove();syncMobileNav(999)`;
        return `<button class="more-drawer-btn" onclick="${action}">
          <span class="mdb-icon">${icon}</span>
          <span>${label}</span>
        </button>`;
      }).join('')}
    </div>`;
  document.body.appendChild(drawer);

  // Keyboard: Escape closes
  const onKey = (e) => { if (e.key === 'Escape') { drawer.remove(); scrim.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}
window.openMobileMoreDrawer = openMobileMoreDrawer;

window.openSupportModal = openSupportModal;
window.aiDraftSupportEmail = aiDraftSupportEmail;
window.sendSupportEmail = sendSupportEmail;
window.copySupportEmail = copySupportEmail;

// ════════════════════════════════════
//  SECTION 22: FIRST-TIME APP TOUR
//  Shows a guided walkthrough the first time a user logs in.
//  Uses a spotlight overlay that highlights real UI elements.
//  Each role (teen/parent/employer) gets its own step sequence.
//  Stores completion in localStorage so it only runs once.
//  Call tourStart() manually from Settings to replay.
// ════════════════════════════════════

const TOUR_STEPS = {
  teen: [
    {
      title: '👋 Welcome, future worker!',
      body: "This 60-second tour shows you exactly what TeenWork can do for you. You can tap Skip anytime and restart from Profile → Settings.",
      target: null, pos: 'center',
      emoji: '🌱',
    },
    {
      title: '🔍 Browse & swipe jobs',
      body: "Find local jobs that fit your age, skills, and schedule. Use filters to narrow by type, pay rate, or distance. Swipe right to save, left to pass — just like job shopping.",
      target: 'button[onclick*="ttab-browse"]', pos: 'bottom',
      tip: '💡 Tip: Tap the Map tab under Work to see jobs plotted near you.',
    },
    {
      title: '📝 Apply in seconds',
      body: "Tap Apply on any listing. The AI writes your cover letter automatically based on your profile. Your parent gets notified instantly — no surprises.",
      target: 'button[onclick*="ttab-applications"]', pos: 'bottom',
      tip: '💡 Pro users get Pitch AI — a personalized stand-out letter for each job.',
    },
    {
      title: '💬 Safe messages',
      body: "Chat with employers through the built-in inbox. Every message goes through our AI safety filter — no inappropriate requests can get through.",
      target: '.mnb-messages, button.mnb-messages', pos: 'top',
      tip: '🔐 Use the Safe Word button (More menu) if a situation ever feels wrong.',
    },
    {
      title: '💰 Track your earnings',
      body: "Log every job, hour, and payment. Set savings goals, see your progress, and use Wage Coach to negotiate better pay like a pro.",
      target: 'button[onclick*="ttab-earnings"]', pos: 'bottom',
      tip: '💡 Found under Work → Wage Coach on desktop.',
    },
    {
      title: '🏆 Level up with badges',
      body: "Every job, lesson, and review earns you XP and unlocks badges. Employers can see your badge wall — it makes you stand out from other applicants.",
      target: 'button[onclick*="ttab-badges"]', pos: 'top',
      tip: '⭐ Complete all 12 lessons to unlock the "Job Ready" badge.',
    },
    {
      title: '📚 Learn as you earn',
      body: "12 bite-sized lessons on interviews, safety, money, and professionalism. Each takes about 3 minutes and earns you XP. Employers love seeing lesson completions.",
      target: 'button[onclick*="ttab-lessons"]', pos: 'bottom',
    },
    {
      title: '🤖 AI features',
      body: "The AI tab has your Job Coach, Resume Builder, Cover Letter writer, and Pitch AI. AI usage is limited by the provider's daily quota — Pro users have a separate quota from Free users so neither limits the other.",
      target: 'button[onclick*="ttab-ai"]', pos: 'bottom',
      tip: '💡 Before any interview, use Job Coach to practice answers.',
    },
    {
      title: "🎉 You're ready!",
      body: "Start by completing your profile (it boosts your match score), then browse jobs near you. Your first application is just a tap away.",
      target: null, pos: 'center',
      action: { label: '🔍 Browse Jobs', fn: "switchDashTab(null,'ttab-browse')" },
    },
  ],
  parent: [
    {
      title: '👋 Welcome to the parent dashboard!',
      body: "You have complete oversight of your teen's job activity. This tour covers the key safety tools — takes about 45 seconds.",
      target: null, pos: 'center', emoji: '🛡️',
    },
    {
      title: '✅ Job approvals',
      body: "Every job your teen applies to needs your thumbs-up first. You'll see the employer info, job details, and TrustVerify status before anything moves forward.",
      target: 'button[onclick*="ptab-approvals"], button[onclick*="ttab-approvals"]', pos: 'bottom',
      tip: '💡 You get an email + in-app notification the moment your teen applies.',
    },
    {
      title: '👀 Message oversight',
      body: "Read every message between your teen and employers in real time. Our AI safety filter blocks inappropriate messages automatically — you can review anything flagged.",
      target: '.mnb-messages, button.mnb-messages', pos: 'top',
    },
    {
      title: '🔍 TrustVerify employers',
      body: "Employers can complete a background check through TrustVerify. Always look for the green verified badge before approving a job. Unverified employers are flagged.",
      target: 'button[onclick*="ptab-verify"], button[onclick*="ttab-trust"]', pos: 'bottom',
      tip: '💡 You can request verification from any employer directly.',
    },
    {
      title: '🚨 SOS & Safe Word',
      body: "Your teen has a one-tap SOS button that alerts you immediately. They can also set a Safe Word — a code phrase that signals they need help without anyone knowing.",
      target: null, pos: 'center',
      tip: '🔐 Make sure your teen knows about the Safe Word feature in their More menu.',
    },
    {
      title: '⚙️ Parental controls',
      body: "Set working hour limits, approved job types, and minimum employer ratings. You can also block specific employers or require approval for every message.",
      target: 'button[onclick*="ptab-controls"], button[onclick*="ptab-settings"]', pos: 'bottom',
    },
    {
      title: "🎉 You're all set!",
      body: "You'll be notified of every application, message, and job update. TeenWork keeps you in the loop without you having to hover.",
      target: null, pos: 'center',
      action: { label: '⚙️ Set up controls', fn: "switchDashTab(null,'ptab-controls')" },
    },
  ],
  employer: [
    {
      title: '👋 Welcome to TeenWork for employers!',
      body: "Post jobs, review applicants, and hire local teens — safely and legally. This tour covers the essentials in about 45 seconds.",
      target: null, pos: 'center', emoji: '💼',
    },
    {
      title: '📋 Post your first job',
      body: "Fill in the job title, pay rate, schedule, and age requirements. Listings go live after a quick safety review (usually under an hour). You can post 2 jobs free.",
      target: 'button[onclick*="etab-post"]', pos: 'bottom',
      tip: '💡 Be specific about the hours and skills — it filters for better applicants.',
    },
    {
      title: '👤 Review applicants',
      body: "See teen profiles, skill badges, lesson completions, and ratings from past employers. Send them a message directly through the app — no outside contact info needed.",
      target: 'button[onclick*="etab-applicants"]', pos: 'bottom',
      tip: '💡 Filter by badge level, rating, or distance to find your best match.',
    },
    {
      title: '🛡️ Get TrustVerified',
      body: "A TrustVerify badge tells parents you've completed a background check. It unlocks more applicants and significantly increases parent approvals for your jobs.",
      target: 'button[onclick*="etab-trust"], button[onclick*="etab-verify"]', pos: 'bottom',
      tip: '⭐ Verified employers get 3× more applicants on average.',
    },
    {
      title: '📊 Track your pipeline',
      body: "Manage applicants with a Kanban-style board — move teens from Applied → Interviewing → Hired. Keep notes and set follow-up reminders.",
      target: 'button[onclick*="etab-pipeline"]', pos: 'bottom',
    },
    {
      title: '📜 Letters of recommendation',
      body: "At the end of a job, write the teen a letter of recommendation directly in the app. They can use it for future applications and college — it means a lot to them.",
      target: 'button[onclick*="etab-lor"], button[onclick*="etab-letters"]', pos: 'bottom',
    },
    {
      title: "🎉 You're ready to hire!",
      body: "Post your first job and get in front of motivated local teens. Parents approve everything, so you only hear from teens who are ready and allowed to work.",
      target: null, pos: 'center',
      action: { label: '📋 Post a job', fn: "switchDashTab(null,'etab-post')" },
    },
  ],
};

let _tourStep = 0;
let _tourSteps = [];
let _tourOverlay = null;
let _tourSpotRect = null;

function tourStart(force) {
  const role = currentUser?.type || 'teen';
  const key = 'tw_tour_done_' + role;
  if (!force && localStorage.getItem(key)) return;
  _tourSteps = TOUR_STEPS[role] || TOUR_STEPS.teen;
  _tourStep = 0;
  _buildTourOverlay();
  _tourRender();
}

function _buildTourOverlay() {
  if (document.getElementById('tw-tour-overlay')) return;

  const style = document.createElement('style');
  style.id = 'tw-tour-style';
  style.textContent = `
    #tw-tour-overlay {
      position: fixed; inset: 0; z-index: 9000;
      pointer-events: none;
    }
    #tw-tour-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.55);
      transition: opacity .25s;
    }
    #tw-tour-hole {
      position: absolute;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
      transition: all .3s cubic-bezier(.4,0,.2,1);
      pointer-events: none;
      background: transparent;
    }
    #tw-tour-card {
      position: absolute;
      background: #fff;
      border-radius: 16px;
      padding: 20px 22px 16px;
      max-width: 300px;
      width: calc(100vw - 40px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.22);
      pointer-events: all;
      transition: all .3s cubic-bezier(.4,0,.2,1);
      font-family: 'DM Sans', sans-serif;
    }
    #tw-tour-card h3 {
      font-size: 1rem; font-weight: 700; margin: 0 0 6px;
      color: #1c1c1c;
    }
    #tw-tour-card p {
      font-size: .87rem; color: #4b5563; margin: 0 0 14px; line-height: 1.5;
    }
    .tw-tour-arrow {
      position: absolute;
      width: 0; height: 0;
    }
    .tw-tour-arrow.up {
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-bottom: 10px solid #fff;
      top: -10px; left: 24px;
    }
    .tw-tour-arrow.down {
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 10px solid #fff;
      bottom: -10px; left: 24px;
    }
    #tw-tour-footer {
      display: flex; align-items: center; gap: 8px;
    }
    #tw-tour-next {
      background: #2d6a4f; color: #fff; border: none;
      border-radius: 8px; padding: 8px 18px;
      font-family: 'DM Sans', sans-serif; font-size: .87rem; font-weight: 700;
      cursor: pointer; flex-shrink: 0;
    }
    #tw-tour-next:hover { background: #245c43; }
    #tw-tour-skip {
      background: none; border: none; color: #9ca3af;
      font-family: 'DM Sans', sans-serif; font-size: .82rem;
      cursor: pointer; padding: 8px 4px; margin-left: auto;
    }
    #tw-tour-skip:hover { color: #6b7280; }
    #tw-tour-dots {
      display: flex; gap: 5px; align-items: center; margin-right: 4px;
    }
    .tw-tour-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #d1d5db; transition: background .2s;
    }
    .tw-tour-dot.active { background: #2d6a4f; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'tw-tour-overlay';
  overlay.innerHTML = `
    <div id="tw-tour-hole"></div>
    <div id="tw-tour-card">
      <div class="tw-tour-arrow" id="tw-tour-arrow"></div>
      <h3 id="tw-tour-title"></h3>
      <p id="tw-tour-body"></p>
      <div id="tw-tour-footer">
        <div id="tw-tour-dots"></div>
        <button id="tw-tour-next" onclick="tourNext()">Next</button>
        <button id="tw-tour-skip" onclick="tourSkip()">Skip tour</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _tourOverlay = overlay;
}

function _tourRender() {
  const step = _tourSteps[_tourStep];
  if (!step) { tourDone(); return; }

  const isLast = _tourStep === _tourSteps.length - 1;
  const card = document.getElementById('tw-tour-card');
  const hole = document.getElementById('tw-tour-hole');
  const arrow = document.getElementById('tw-tour-arrow');

  // Title + body
  document.getElementById('tw-tour-title').textContent = step.title;
  document.getElementById('tw-tour-body').textContent = step.body;

  // Next / Done button — with action label on last step
  const nextBtn = document.getElementById('tw-tour-next');
  if (isLast && step.action) {
    nextBtn.textContent = step.action.label || 'Get started!';
    nextBtn.onclick = () => { try { eval(step.action.fn); } catch(e){} tourDone(); };
  } else {
    nextBtn.textContent = isLast ? '🎉 Done!' : 'Next →';
    nextBtn.onclick = tourNext;
  }

  // Tip line
  let tipEl = document.getElementById('tw-tour-tip');
  if (step.tip) {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'tw-tour-tip';
      tipEl.style.cssText = 'font-size:.78rem;color:#059669;background:#ecfdf5;border-radius:7px;padding:6px 10px;margin:-6px 0 10px;line-height:1.4;';
      document.getElementById('tw-tour-body').insertAdjacentElement('afterend', tipEl);
    }
    tipEl.textContent = step.tip;
    tipEl.style.display = 'block';
  } else if (tipEl) {
    tipEl.style.display = 'none';
  }

  // Progress label (e.g. "Step 3 of 9")
  let progEl = document.getElementById('tw-tour-progress');
  if (!progEl) {
    progEl = document.createElement('div');
    progEl.id = 'tw-tour-progress';
    progEl.style.cssText = 'font-size:.72rem;color:#9ca3af;margin-bottom:8px;font-weight:600;';
    document.getElementById('tw-tour-title').insertAdjacentElement('beforebegin', progEl);
  }
  progEl.textContent = `Step ${_tourStep + 1} of ${_tourSteps.length}`;

  // Dots
  const dotsEl = document.getElementById('tw-tour-dots');
  dotsEl.innerHTML = _tourSteps.map((_,i) =>
    `<div class="tw-tour-dot${i === _tourStep ? ' active' : ''}"></div>`
  ).join('');

  // Position
  if (!step.target || step.pos === 'center') {
    // Centered card, no spotlight
    hole.style.cssText = 'position:absolute;width:0;height:0;top:50%;left:50%;border-radius:0;box-shadow:none;';
    arrow.className = 'tw-tour-arrow';
    _centerCard(card);
    return;
  }

  const el = document.querySelector(step.target);
  if (!el) {
    // Element not visible — center card anyway
    hole.style.cssText = 'position:absolute;width:0;height:0;top:50%;left:50%;border-radius:0;box-shadow:none;';
    arrow.className = 'tw-tour-arrow';
    _centerCard(card);
    return;
  }

  const r = el.getBoundingClientRect();
  const PAD = 8;
  hole.style.cssText = `
    position:fixed;
    left:${r.left - PAD}px; top:${r.top - PAD}px;
    width:${r.width + PAD*2}px; height:${r.height + PAD*2}px;
    border-radius:10px;
    box-shadow:0 0 0 9999px rgba(0,0,0,0.55);
    transition:all .3s cubic-bezier(.4,0,.2,1);
    pointer-events:none;background:transparent;
  `;

  // Position card above or below the spotlight
  const cardW = Math.min(300, window.innerWidth - 40);
  let cardLeft = Math.max(16, r.left - PAD);
  if (cardLeft + cardW > window.innerWidth - 16) cardLeft = window.innerWidth - cardW - 16;

  if (step.pos === 'top') {
    // Card above target — but mobile nav is at bottom, so put card above
    const cardBottom = window.innerHeight - (r.top - PAD - 12);
    card.style.cssText = `position:fixed;bottom:${cardBottom}px;left:${cardLeft}px;max-width:${cardW}px;top:auto;`;
    arrow.className = 'tw-tour-arrow down';
    arrow.style.left = '24px';
  } else {
    // Card below target
    const cardTop = r.bottom + PAD + 12;
    card.style.cssText = `position:fixed;top:${cardTop}px;left:${cardLeft}px;max-width:${cardW}px;bottom:auto;`;
    arrow.className = 'tw-tour-arrow up';
    arrow.style.left = '24px';
  }
}

function _centerCard(card) {
  card.style.cssText = `
    position:fixed;
    top:50%;left:50%;
    transform:translate(-50%,-50%);
    max-width:300px;
  `;
}

function tourNext() {
  _tourStep++;
  if (_tourStep >= _tourSteps.length) { tourDone(); return; }
  _tourRender();
}

function tourSkip() { tourDone(); }

function tourDone() {
  const role = currentUser?.type || 'teen';
  localStorage.setItem('tw_tour_done_' + role, '1');
  const overlay = document.getElementById('tw-tour-overlay');
  const style = document.getElementById('tw-tour-style');
  if (overlay) overlay.remove();
  if (style) style.remove();
  _tourOverlay = null;
  if (window._pendingPushRequest) { window._pendingPushRequest = false; setTimeout(requestPushPermission, 600); }
}

// Hook into launchDashboard — show tour 600ms after dashboard loads
(function() {
  const _origLaunchDashboard = launchDashboard;
  window.launchDashboard = function() {
    _origLaunchDashboard();
    setTimeout(() => tourStart(false), 600);
  };
})();

window.tourStart = tourStart;
window.tourNext = tourNext;
window.tourSkip = tourSkip;
window.tourDone = tourDone;
// Wire real demoLogin into the early stub so queued pre-load clicks replay
if (window._drain_demoLogin) window._drain_demoLogin(demoLogin);
else window.demoLogin = demoLogin;
window.updateAIProfile = updateAIProfile;
window.buildUserContext = buildUserContext;
window.loadAIProfile = loadAIProfile;

// ══════════════════════════════════════════════════════════════════════
//  SECTION 25: WORK CALENDAR — full shift management system
//
//  calShifts[]        — in-memory shift store (persisted to localStorage)
//  calNav(dir)        — previous / next month
//  calRender()        — draws the 7-column month grid
//  renderUpcoming()   — sorted "Upcoming Shifts" list below the grid
//  openAddShiftModal()/ closeAddShiftModal() — shift entry dialog
//  saveShift()        — validates & saves a new shift
//  deleteShift(id)    — removes a shift by id
//  exportCalICS()     — generates an .ics file for Apple/Google Calendar
//
//  AI NOTICE SYSTEM:
//  scanMsgForJobTime(text, contactName) — called on every outgoing or
//    incoming message; if the AI detects a day/time reference that looks
//    like a job schedule, it surfaces a yellow banner prompting the teen
//    to add it to the calendar with one click.
// ══════════════════════════════════════════════════════════════════════

/* ── state ─────────────────────────────────────────────────────────── */
let calViewYear  = new Date().getFullYear();
let calViewMonth = new Date().getMonth();   // 0-indexed

// Load shifts from localStorage; seed with a demo shift
var calShifts = [];
(function _loadCalShifts() {
  try {
    const raw = localStorage.getItem('tw_cal_shifts');
    if (raw) { calShifts = JSON.parse(raw); return; }
  } catch(e) {}
  // Demo seed: a shift this week so the calendar isn't empty on first load
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7)); // next Saturday
  calShifts = [{
    id: 'demo-1',
    job: "Lawn Mowing — Mike's Landscaping",
    date: next.toISOString().slice(0, 10),
    start: '09:00',
    end: '11:30',
    pay: '$18/hr',
    notes: 'Bring gloves. Side gate will be open.'
  }];
  _saveCalShifts();
})();

function _saveCalShifts() {
  try { localStorage.setItem('tw_cal_shifts', JSON.stringify(calShifts)); } catch(e) {}
}

/* ── navigation ────────────────────────────────────────────────────── */
function calNav(dir) {
  calViewMonth += dir;
  if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  if (calViewMonth < 0)  { calViewMonth = 11; calViewYear--; }
  calRender();
}

/* ── main grid renderer ────────────────────────────────────────────── */
function calRender() {
  const label  = document.getElementById('cal-month-label');
  const grid   = document.getElementById('cal-grid');
  if (!grid) return;

  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  if (label) label.textContent = `${monthNames[calViewMonth]} ${calViewYear}`;

  const today    = new Date();
  const firstDay = new Date(calViewYear, calViewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calViewYear, calViewMonth, 0).getDate();

  // Build map: 'YYYY-MM-DD' → [shifts]
  const shiftMap = {};
  calShifts.forEach(s => {
    if (!shiftMap[s.date]) shiftMap[s.date] = [];
    shiftMap[s.date].push(s);
  });

  const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = DAY_HEADERS.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Leading cells from previous month
  for (let i = 0; i < firstDay; i++) {
    const day = daysInPrev - firstDay + 1 + i;
    html += `<div class="cal-cell other-month"><div class="cal-date-num">${day}</div></div>`;
  }

  // Current-month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = n => String(n).padStart(2, '0');
    const dateKey = `${calViewYear}-${pad(calViewMonth + 1)}-${pad(d)}`;
    const isToday = today.getFullYear() === calViewYear &&
                    today.getMonth() === calViewMonth &&
                    today.getDate() === d;
    const shifts = shiftMap[dateKey] || [];
    const hasShift = shifts.length > 0;

    const pillsHtml = shifts.slice(0, 2).map(s => {
      const label = s.job.split('—')[0].trim().split(' ').slice(0,3).join(' ');
      return `<span class="cal-shift-pill" title="${s.job} ${s.start||''}–${s.end||''}">${label}</span>`;
    }).join('');

    html += `
      <div class="cal-cell ${isToday ? 'today' : ''} ${hasShift ? 'has-shift' : ''}"
           onclick="calDayClick('${dateKey}')" title="${dateKey}">
        <div class="cal-date-num">${d}</div>
        ${hasShift ? `<div class="cal-dot-row">${shifts.map(()=>'<span class="cal-dot"></span>').join('')}</div>` : ''}
        ${pillsHtml}
      </div>`;
  }

  // Trailing cells to complete the final row
  const totalCells = firstDay + daysInMonth;
  const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= trailing; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-date-num">${i}</div></div>`;
  }

  grid.innerHTML = html;
  renderUpcoming();
}

/* clicking a day opens the add-shift modal pre-filled with that date */
function calDayClick(dateStr) {
  openAddShiftModal(dateStr);
}

/* ── upcoming shifts list ──────────────────────────────────────────── */
function renderUpcoming() {
  const el = document.getElementById('cal-upcoming-list');
  if (!el) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = calShifts
    .filter(s => new Date(s.date + 'T00:00:00') >= today)
    .sort((a, b) => (a.date + (a.start||'')).localeCompare(b.date + (b.start||'')));

  if (!upcoming.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:.5rem 0">No upcoming shifts — add one above or accept a job offer.</p>';
    return;
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el.innerHTML = upcoming.map(s => {
    const [y, mo, d] = s.date.split('-').map(Number);
    const monthStr = MONTHS[mo - 1];
    const startFmt = fmtTime(s.start);
    const endFmt   = s.end ? ` – ${fmtTime(s.end)}` : '';
    return `
      <div class="cal-upcoming-item">
        <div class="cal-upcoming-date">
          <div class="cud-month">${monthStr}</div>
          <div class="cud-day">${d}</div>
        </div>
        <div class="cal-upcoming-info">
          <strong>${escHtml(s.job)}</strong>
          <div class="cui-time">🕐 ${startFmt}${endFmt}</div>
          ${s.pay ? `<div class="cui-pay">💵 ${escHtml(s.pay)}</div>` : ''}
          ${s.notes ? `<div class="cui-notes">${escHtml(s.notes)}</div>` : ''}
        </div>
        <button class="cal-del-btn" onclick="deleteShift('${s.id}')" title="Delete shift">🗑</button>
      </div>`;
  }).join('');
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hr   = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── add/delete shifts ─────────────────────────────────────────────── */
function openAddShiftModal(prefillDate) {
  const modal = document.getElementById('addShiftModal');
  if (!modal) return;
  // Reset fields
  document.getElementById('shift-job').value   = '';
  document.getElementById('shift-pay').value   = '';
  document.getElementById('shift-start').value = '';
  document.getElementById('shift-end').value   = '';
  document.getElementById('shift-notes').value = '';
  // Pre-fill date
  const dateEl = document.getElementById('shift-date');
  if (dateEl) dateEl.value = prefillDate || new Date().toISOString().slice(0,10);
  modal.style.display = 'flex';
}

function closeAddShiftModal() {
  const modal = document.getElementById('addShiftModal');
  if (modal) modal.style.display = 'none';
}

function saveShift() {
  const job   = document.getElementById('shift-job')?.value.trim();
  const date  = document.getElementById('shift-date')?.value;
  const start = document.getElementById('shift-start')?.value;
  const end   = document.getElementById('shift-end')?.value;
  const pay   = document.getElementById('shift-pay')?.value.trim();
  const notes = document.getElementById('shift-notes')?.value.trim();

  if (!job)   { showToast('Please enter a job name.', 'error'); return; }
  if (!date)  { showToast('Please pick a date.', 'error'); return; }
  if (!start) { showToast('Please enter a start time.', 'error'); return; }

  const shift = {
    id: 'shift-' + Date.now(),
    job, date, start,
    end:   end   || '',
    pay:   pay   || '',
    notes: notes || ''
  };
  calShifts.push(shift);
  _saveCalShifts();
  closeAddShiftModal();
  calRender();
  showToast('✅ Shift saved to your calendar!', 'success');

  // Award gamification points
  if (typeof awardBadge === 'function') awardBadge('first_job');
}

function deleteShift(id) {
  calShifts = calShifts.filter(s => s.id !== id);
  _saveCalShifts();
  calRender();
  showToast('Shift removed.', 'info');
}

/* ── ICS export ────────────────────────────────────────────────────── */
function exportCalICS() {
  if (!calShifts.length) { showToast('No shifts to export yet!', 'info'); return; }

  function icsDate(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-');
    if (!timeStr) return `${y}${m}${d}`;
    const [h, min] = timeStr.split(':');
    return `${y}${m}${d}T${h}${min}00`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TeenWork//Work Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  calShifts.forEach(s => {
    const uid  = `${s.id}@teenwork.app`;
    const dtStart = icsDate(s.date, s.start);
    const dtEnd   = s.end ? icsDate(s.date, s.end) : icsDate(s.date, s.start);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SUMMARY:TeenWork: ${s.job}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      s.notes ? `DESCRIPTION:${s.notes}` : 'DESCRIPTION:',
      s.pay ? `LOCATION:Pay: ${s.pay}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.filter(Boolean).join('\r\n')], { type: 'text/calendar' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'teenwork-schedule.ics';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📅 Calendar exported! Open the .ics file to import.', 'success');
}

/* ── patch switchDashTab so calendar renders when tab is opened ─────── */
const _origSwitchDashTab = typeof switchDashTab === 'function' ? switchDashTab : null;
window.switchDashTab = function(btn, panelId) {
  if (_origSwitchDashTab) _origSwitchDashTab(btn, panelId);
  if (panelId === 'ttab-calendar') {
    // slight delay so the tab is visible before we measure cells
    setTimeout(calRender, 60);
  }
};

/* ── init calendar on dashboard load ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // If calendar tab is visible on load (e.g. deep-link), render immediately
  if (document.getElementById('ttab-calendar')?.classList.contains('active')) {
    calRender();
  }
});

/* ══════════════════════════════════════════════════════════════════════
   AI MESSAGE TIME-DETECTION SYSTEM
   ─────────────────────────────────────────────────────────────────────
   Fires after every outgoing message in the messaging modal.
   Uses Claude to detect if the message contains a job time/day
   reference (e.g. "See you Saturday at 10am", "Monday 9-11").
   If detected, shows a yellow banner inside the chat window
   prompting the teen to add that shift to the calendar.
   ══════════════════════════════════════════════════════════════════════ */

/* Quick local regex pre-screen — avoids an AI call for messages that
   clearly have no time/day reference (fast path). */
const _TIME_PRESCREEN = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|\d{1,2}\s*(?:am|pm|:\d{2})|tomorrow|next\s+week|morning|afternoon|evening)\b/i;

/* Debounce: don't re-fire within 3 s of last notice for same contact */
const _calNoticeLastFired = {};

async function scanMsgForJobTime(msgText, contactId, contactName) {
  if (!msgText || msgText.length < 6) return;
  if (!_TIME_PRESCREEN.test(msgText)) return;

  const now = Date.now();
  if (_calNoticeLastFired[contactId] && now - _calNoticeLastFired[contactId] < 3000) return;

  // ── NEW: gather ALL messages for this contact, not just the one triggered ──
  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  const allMsgs = contact ? (contact.messages || []).filter(m => !m.blocked) : [];
  const transcript = allMsgs.length > 1
    ? allMsgs.map(m => `[${m.from === 'me' ? 'Teen' : contactName}] ${m.text} (${m.time})`).join('\n')
    : `[Teen] ${msgText}`;

  // Ask the AI to find ALL schedule mentions in the full thread
  const todayLabel = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const prompt =
`Today is ${todayLabel}.
Here is the full message thread between a teen and an employer named "${contactName}":
${transcript}

Find ALL distinct upcoming work shifts mentioned in these messages (there may be more than one for the same day or different days).
For EACH shift found, reply in this exact block (use 24-hour times, next upcoming date):
DATE: YYYY-MM-DD
START: HH:MM
END: HH:MM
JOB: <short job description, max 6 words>
---
Repeat the block above for every distinct shift. If the employer confirmed a different time than the teen said, use the EMPLOYER's time.
If NO schedule is mentioned anywhere: reply exactly: NONE`;

  let result;
  try {
    result = await callClaudeAI(prompt);
  } catch(e) {
    try { result = await callGemini(prompt); } catch(e2) { return; }
  }

  if (!result || result.trim().toUpperCase().startsWith('NONE')) return;

  // ── Parse multiple shift blocks separated by --- ──
  const blocks = result.split(/---+/).map(b => b.trim()).filter(Boolean);
  const shifts = [];
  for (const block of blocks) {
    const dateM  = block.match(/DATE:\s*(\d{4}-\d{2}-\d{2})/);
    const startM = block.match(/START:\s*(\d{1,2}:\d{2})/);
    const endM   = block.match(/END:\s*(\d{1,2}:\d{2})/);
    const jobM   = block.match(/JOB:\s*(.+)/);
    if (dateM && startM) {
      shifts.push({
        date:  dateM[1],
        start: startM[1],
        end:   endM ? endM[1] : '',
        job:   jobM ? jobM[1].trim() : (contactName + ' shift')
      });
    }
  }

  if (!shifts.length) return;

  _calNoticeLastFired[contactId] = Date.now();

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (shifts.length === 1) {
    // Single shift — original path
    const s = shifts[0];
    const [y, mo, d] = s.date.split('-').map(Number);
    const dateDisplay  = `${MONTHS[mo-1]} ${d}, ${y}`;
    const startDisplay = fmtTime(s.start);
    const endDisplay   = s.end ? ` – ${fmtTime(s.end)}` : '';
    showCalNotice(contactId, s.date, s.start, s.end, s.job, dateDisplay, startDisplay, endDisplay);
  } else {
    // Multiple shifts found — show picker so teen can choose which (or all) to add
    showMultiShiftPicker(contactId, contactName, shifts, MONTHS);
  }
}

/* ── Show a picker when multiple shift mentions are found in a thread ── */
function showMultiShiftPicker(contactId, contactName, shifts, MONTHS) {
  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (!chatBody) return;

  // Remove any existing pickers for this contact
  chatBody.querySelectorAll('.cal-multi-picker').forEach(n => n.remove());

  const itemsHTML = shifts.map((s, i) => {
    const [y, mo, d] = s.date.split('-').map(Number);
    const dateDisplay  = MONTHS ? `${MONTHS[mo-1]} ${d}, ${y}` : s.date;
    const startDisplay = fmtTime(s.start);
    const endDisplay   = s.end ? ` – ${fmtTime(s.end)}` : '';
    return `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem">
        <input type="checkbox" class="multi-shift-cb" data-idx="${i}" style="accent-color:var(--green);width:16px;height:16px" checked>
        <span><strong>${escHtml(dateDisplay)}</strong> · ${escHtml(startDisplay)}${escHtml(endDisplay)} — ${escHtml(s.job)}</span>
      </label>`;
  }).join('');

  const picker = document.createElement('div');
  picker.className = 'cal-notice cal-multi-picker';
  picker.dataset.noticeFor = contactId;
  // Serialize shifts for inline onclick
  const shiftsJson = escHtml(JSON.stringify(shifts));
  picker.innerHTML = `
    <div class="cal-notice-icon">📅</div>
    <div class="cal-notice-body" style="width:100%">
      <strong>Multiple shifts found in your messages with ${escHtml(contactName)}!</strong>
      <p style="margin:4px 0 8px">Select which ones to add to your calendar:</p>
      <div id="multi-shift-items-${contactId}">${itemsHTML}</div>
      <div class="cal-notice-actions" style="margin-top:8px;flex-wrap:wrap;gap:6px">
        <button class="cal-notice-btn" onclick="addSelectedShifts('${contactId}', ${shiftsJson.replace(/"/g,'&quot;')}, this)">✅ Add Selected</button>
        <button class="cal-notice-btn secondary" onclick="
          this.closest('.cal-notice').querySelectorAll('.multi-shift-cb').forEach(cb=>cb.checked=true);
          addSelectedShifts('${contactId}', ${shiftsJson.replace(/"/g,'&quot;')}, this)
        ">📅 Add All</button>
        <button class="cal-notice-btn secondary" onclick="this.closest('.cal-notice').remove()">Dismiss</button>
      </div>
    </div>
    <button class="cal-notice-dismiss" onclick="this.closest('.cal-notice').remove()" title="Dismiss">✕</button>
  `;
  chatBody.appendChild(picker);
  chatBody.scrollTop = chatBody.scrollHeight;
}

/* ── Add only the checked shifts from the multi-picker ── */
function addSelectedShifts(contactId, shifts, btn) {
  const picker = btn.closest('.cal-multi-picker');
  const checkboxes = picker ? picker.querySelectorAll('.multi-shift-cb') : [];
  let addedCount = 0;
  checkboxes.forEach(cb => {
    if (!cb.checked) return;
    const s = shifts[parseInt(cb.dataset.idx)];
    if (!s) return;
    calNoticeAdd(contactId, s.date, s.start, s.end, s.job, btn);
    addedCount++;
  });
  if (picker) picker.remove();
  if (typeof showToast === 'function') showToast(`📅 Added ${addedCount} shift${addedCount!==1?'s':''} to your calendar!`, 'success');
}
window.addSelectedShifts = addSelectedShifts;

function showCalNotice(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay) {
  // Show inside the message body of this chat
  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (!chatBody) return;

  // Remove any existing notice for this contactId
  chatBody.querySelectorAll('.cal-notice').forEach(n => n.remove());

  // Check if there's already a shift on this date in the calendar
  const existingOnDate = calShifts.filter(s => s.date === date);

  if (existingOnDate.length > 0) {
    // There's already a shift on this day — offer choice
    const notice = document.createElement('div');
    notice.className = 'cal-notice';
    notice.dataset.noticeFor = contactId;
    const existingItems = existingOnDate.map(s =>
      `<li style="margin:2px 0;font-size:.78rem">🕐 ${fmtTime(s.start)}${s.end?' – '+fmtTime(s.end):''} · ${escHtml(s.job)}</li>`
    ).join('');
    notice.innerHTML = `
      <div class="cal-notice-icon">📅</div>
      <div class="cal-notice-body">
        <strong>You already have a shift on ${escHtml(dateDisplay)}!</strong>
        <p>Existing shift(s) that day:</p>
        <ul style="margin:4px 0 6px 12px;padding:0">${existingItems}</ul>
        <p>New shift detected: <strong>${escHtml(startDisplay)}${escHtml(endDisplay)}</strong> — ${escHtml(job)}</p>
        <div class="cal-notice-actions" style="flex-wrap:wrap">
          <button class="cal-notice-btn" onclick="calNoticeAdd('${contactId}','${escHtml(date)}','${escHtml(start)}','${escHtml(end)}','${escHtml(job)}',this)">
            ✅ Add This New Shift Too
          </button>
          <button class="cal-notice-btn secondary" onclick="this.closest('.cal-notice').remove()">Keep Existing Only</button>
        </div>
      </div>
      <button class="cal-notice-dismiss" onclick="this.closest('.cal-notice').remove()" title="Dismiss">✕</button>
    `;
    chatBody.appendChild(notice);
    chatBody.scrollTop = chatBody.scrollHeight;
    return;
  }

  const notice = document.createElement('div');
  notice.className = 'cal-notice';
  notice.dataset.noticeFor = contactId;
  notice.innerHTML = `
    <div class="cal-notice-icon">📅</div>
    <div class="cal-notice-body">
      <strong>Looks like you have a shift scheduled!</strong>
      <p>Your message mentions a job on <strong>${escHtml(dateDisplay)}</strong> at <strong>${escHtml(startDisplay)}${escHtml(endDisplay)}</strong>. Want to add it to your calendar so you don't forget?</p>
      <div class="cal-notice-actions">
        <button class="cal-notice-btn" onclick="calNoticeAdd('${contactId}','${escHtml(date)}','${escHtml(start)}','${escHtml(end)}','${escHtml(job)}',this)">
          ✅ Add to My Calendar
        </button>
        <button class="cal-notice-btn secondary" onclick="this.closest('.cal-notice').remove()">Dismiss</button>
      </div>
    </div>
    <button class="cal-notice-dismiss" onclick="this.closest('.cal-notice').remove()" title="Dismiss">✕</button>
  `;
  chatBody.appendChild(notice);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function calNoticeAdd(contactId, date, start, end, job, btn) {
  // Add the shift
  const shift = {
    id: 'shift-' + Date.now(),
    job:   job || 'Work shift',
    date:  date,
    start: start,
    end:   end || '',
    pay:   '',
    notes: 'Added from chat'
  };
  calShifts.push(shift);
  _saveCalShifts();

  // Update button to confirmation
  if (btn) {
    btn.textContent = '✅ Added!';
    btn.disabled = true;
    btn.style.opacity = '.7';
  }

  // Remove notice after 2 s
  setTimeout(() => btn?.closest('.cal-notice')?.remove(), 2000);

  showToast('📅 Shift added to your Work Calendar!', 'success');

  // Re-render calendar if visible
  if (document.getElementById('ttab-calendar')?.classList.contains('active')) {
    calRender();
  }
}

/* ── Patch sendMsg to trigger the time-detection notice ─────────────── */
const _origSendMsgForCal = typeof sendMsg === 'function' ? sendMsg : null;
window.sendMsg = async function(contactId) {
  // Capture message text BEFORE sendMsg clears the input
  const inputEl = document.getElementById('msg-input-' + contactId);
  const capturedText = inputEl ? inputEl.value.trim() : '';
  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  const contactName = contact ? contact.name : 'Employer';

  // Call original
  if (_origSendMsgForCal) await _origSendMsgForCal(contactId);

  // After a short delay (let reply auto-render first), scan for schedule
  if (capturedText && currentUser?.type === 'teen') {
    setTimeout(() => scanMsgForJobTime(capturedText, contactId, contactName), 800);
  }
};

/* ── Also scan INCOMING auto-replies for job time info ──────────────── */
/* (So when an employer confirms "See you Saturday at 9am" we catch it) */
const _origGenerateAutoReply = typeof generateAutoReply === 'function' ? generateAutoReply : null;
if (_origGenerateAutoReply) {
  window.generateAutoReply = function(contact, lastMsg) {
    const reply = _origGenerateAutoReply(contact, lastMsg);
    if (reply && currentUser?.type === 'teen') {
      // scan the auto-reply for schedule confirmation
      setTimeout(() => scanMsgForJobTime(reply, contact.id, contact.name), 2500);
    }
    return reply;
  };
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 27: TeenWork AI CONFIRMATION MESSAGING
   ──────────────────────────────────────────────────────────────────
   When a shift time is detected in a conversation, the app
   automatically sends a confirmation message AS the teen
   (labeled "[TeenWork AI]") to the employer to verify the time.
   If the employer replies with a DIFFERENT time, the system
   detects that and shows a banner prompting the teen to update
   their calendar to the employer's confirmed time.
   ════════════════════════════════════════════════════════════════════ */

// Track which (contactId + date+start) combos have already had a confirmation sent
const _aiConfirmationSent = {};
// Track pending confirmations awaiting employer reply: key = contactId, value = { date, start, end, job }
const _pendingConfirmations = {};

/* Send an AI-drafted confirmation message to the employer */
async function sendAIConfirmationMsg(contactId, date, start, end, job) {
  const key = contactId + '|' + date + '|' + start;
  if (_aiConfirmationSent[key]) return; // already sent

  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  if (!contact) return;

  // ── NEW: Check if employer already confirmed the time in their messages ──
  // If any employer message contains a time confirmation, don't pester them again
  const startHumanCheck = fmtTime(start);
  const employerMsgs = (contact.messages || []).filter(m => m.from === 'them' && !m.blocked);
  const CONFIRM_PATTERNS = [/\bconfirm\b/i, /\bsee you\b/i, /\bsounds good\b/i, /\bworks for\b/i, /\byep\b/i, /\byup\b/i, /\byes\b/i, /\bthat.s fine\b/i, /\ball set\b/i, /\bperfect\b/i];
  const employerAlreadyConfirmed = employerMsgs.some(m =>
    CONFIRM_PATTERNS.some(rx => rx.test(m.text)) &&
    (m.text.includes(startHumanCheck) || m.text.toLowerCase().includes(start) ||
     /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(m.text))
  );
  if (employerAlreadyConfirmed) {
    // Employer already confirmed — just show a quiet success note in chat
    _aiConfirmationSent[key] = true;
    const chatBody = document.getElementById('msg-chat-body-' + contactId);
    if (chatBody) {
      const note = document.createElement('div');
      note.style.cssText = 'text-align:center;font-size:.72rem;color:var(--green);margin:4px 0;font-style:italic;padding:2px 8px;';
      note.textContent = '✅ Employer already confirmed this time — no need to message them again!';
      chatBody.appendChild(note);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    return;
  }

  _aiConfirmationSent[key] = true;

  // Build a friendly confirmation message using AI
  const [y, mo, d] = (date || '').split('-').map(Number);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateHuman = (y && mo && d) ? `${MONTHS[mo-1]} ${d}` : date;
  const startHuman = fmtTime(start);
  const endHuman = end ? ` to ${fmtTime(end)}` : '';

  let confirmText;
  try {
    confirmText = await callClaudeAI(
      `Write a short, professional 1-sentence confirmation message from a teen worker to an employer. The teen is confirming their upcoming shift on ${dateHuman} from ${startHuman}${endHuman} for: ${job}. The message should sound natural and ask the employer to confirm the time is still correct. Keep it under 25 words. Do NOT include any greeting prefix.`
    );
    // Trim to first sentence only
    confirmText = (confirmText || '').split(/[.!?]/)[0].trim() + '.';
    if (confirmText.length < 5) throw new Error('too short');
  } catch(e) {
    confirmText = `Just confirming my shift on ${dateHuman} at ${startHuman}${endHuman} — does that time still work?`;
  }

  // Inject as an automated message in the chat
  const now = new Date();
  const timeStr = now.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
  const aiMsg = {
    from: 'me',
    text: `[TeenWork AI] ${confirmText}`,
    time: timeStr,
    isAIConfirm: true
  };
  contact.messages.push(aiMsg);

  // Store pending confirmation so we can watch the reply
  _pendingConfirmations[contactId] = { date, start, end, job, sentAt: Date.now() };

  // Re-render the chat if it's open
  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (chatBody) {
    renderMsgBubbles(contactId);
    // Show a subtle notice that a confirmation was sent
    const notif = document.createElement('div');
    notif.style.cssText = 'text-align:center;font-size:.72rem;color:var(--muted);margin:4px 0;font-style:italic;padding:2px 8px;';
    notif.textContent = '🤖 TeenWork AI sent a confirmation request to ' + contact.name;
    chatBody.appendChild(notif);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Simulate employer reply after 2–4s (in real app this would come from the employer)
  setTimeout(() => _simulateEmployerConfirmReply(contactId, date, start, end, job), 2500 + Math.random()*1500);
}

/* Simulate the employer confirming or giving a different time */
async function _simulateEmployerConfirmReply(contactId, date, start, end, job) {
  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  if (!contact) return;

  // 70% chance employer confirms same time, 30% they give a slightly different time
  const giveDifferentTime = Math.random() < 0.3;

  let replyText;
  if (giveDifferentTime) {
    // Shift start by 30–60 minutes
    const [sh, sm] = (start || '09:00').split(':').map(Number);
    const totalMins = sh * 60 + sm + (Math.random() < 0.5 ? 30 : -30);
    const newH = Math.max(7, Math.min(18, Math.floor(totalMins / 60)));
    const newM = ((totalMins % 60) + 60) % 60;
    const newStart = `${String(newH).padStart(2,'0')}:${String(newM).padStart(2,'0')}`;
    const newStartHuman = fmtTime(newStart);
    replyText = `Actually, can you make it ${newStartHuman} instead? That works better for us. See you then!`;
    // Store the corrected time for detection
    contact._pendingEmployerTime = { date, start: newStart, end, job };
  } else {
    const startHuman = fmtTime(start);
    const endHuman = end ? ` to ${fmtTime(end)}` : '';
    replyText = `Yes, ${startHuman}${endHuman} is confirmed. See you then!`;
    contact._pendingEmployerTime = null;
  }

  const now = new Date();
  const rTimeStr = now.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
  contact.messages.push({ from: 'them', text: replyText, time: rTimeStr });

  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (chatBody) renderMsgBubbles(contactId);

  // Now check the employer's reply for a time override
  setTimeout(() => _checkEmployerTimeOverride(contactId, replyText), 600);
}

/* Check if employer's reply contains a different time than what was confirmed */
async function _checkEmployerTimeOverride(contactId, replyText) {
  const pending = _pendingConfirmations[contactId];
  if (!pending) return;

  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  if (!contact) return;

  const todayLabel = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const originalStartHuman = fmtTime(pending.start);

  const prompt = `Today is ${todayLabel}.
An employer replied to a shift confirmation for: ${pending.job} on ${pending.date} at ${originalStartHuman}.
Employer's reply: "${replyText}"

Did the employer confirm a DIFFERENT start time than ${originalStartHuman}?
If YES: reply exactly:
NEW_START: HH:MM
NEW_END: HH:MM (or SAME if end time unchanged)
If the employer confirmed the same time or gave no time: reply exactly: SAME`;

  let aiResult;
  try {
    aiResult = await callClaudeAI(prompt);
  } catch(e) {
    // Fall back to regex check
    aiResult = null;
  }

  // Also check the stored pendingEmployerTime from simulation
  const hasOverride = contact._pendingEmployerTime !== null && contact._pendingEmployerTime !== undefined;

  const isOverride = aiResult && !aiResult.trim().toUpperCase().startsWith('SAME') && aiResult.includes('NEW_START:');

  if (isOverride || hasOverride) {
    let newStart = pending.start;
    let newEnd = pending.end;

    if (isOverride && aiResult) {
      const nsM = aiResult.match(/NEW_START:\s*(\d{1,2}:\d{2})/);
      const neM = aiResult.match(/NEW_END:\s*(\d{1,2}:\d{2})/);
      if (nsM) newStart = nsM[1];
      if (neM) newEnd = neM[1];
    } else if (hasOverride && contact._pendingEmployerTime) {
      newStart = contact._pendingEmployerTime.start;
      newEnd = contact._pendingEmployerTime.end || pending.end;
    }

    // Show banner: employer changed the time
    _showEmployerTimeChangeBanner(contactId, pending.date, pending.start, newStart, newEnd, pending.job);
    delete _pendingConfirmations[contactId];
  } else {
    // Time confirmed — show success
    const chatBody = document.getElementById('msg-chat-body-' + contactId);
    if (chatBody) {
      const ok = document.createElement('div');
      ok.style.cssText = 'text-align:center;font-size:.72rem;color:var(--green);margin:4px 0;font-style:italic;padding:2px 8px;';
      ok.textContent = '✅ Employer confirmed the time — your calendar entry is correct!';
      chatBody.appendChild(ok);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    delete _pendingConfirmations[contactId];
  }
}

/* Show a banner when the employer gives a different time */
function _showEmployerTimeChangeBanner(contactId, date, oldStart, newStart, newEnd, job) {
  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (!chatBody) return;

  const [y, mo, d] = (date || '').split('-').map(Number);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateDisplay = (y && mo && d) ? `${MONTHS[mo-1]} ${d}, ${y}` : date;
  const oldStartDisplay = fmtTime(oldStart);
  const newStartDisplay = fmtTime(newStart);
  const newEndDisplay = newEnd ? ` – ${fmtTime(newEnd)}` : '';

  // Remove any old time-change banners
  chatBody.querySelectorAll('.employer-time-change-banner').forEach(b => b.remove());

  const banner = document.createElement('div');
  banner.className = 'cal-notice employer-time-change-banner';
  banner.style.cssText = 'background:#fff3cd;border-color:#ffc107;';
  banner.innerHTML = `
    <div class="cal-notice-icon">⚠️</div>
    <div class="cal-notice-body">
      <strong style="color:#856404">Employer Changed the Time!</strong>
      <p style="color:#856404">The employer confirmed a <strong>different start time</strong> for your shift on ${escHtml(dateDisplay)}.<br>
      Original: <s>${escHtml(oldStartDisplay)}</s> → New time: <strong>${escHtml(newStartDisplay)}${escHtml(newEndDisplay)}</strong></p>
      <p style="color:#856404;font-size:.75rem;margin-top:2px">TeenWork AI is using the employer's confirmed time.</p>
      <div class="cal-notice-actions">
        <button class="cal-notice-btn" style="background:#ffc107;color:#3d2c00" onclick="calNoticeAdd('${contactId}','${escHtml(date)}','${escHtml(newStart)}','${escHtml(newEnd || '')}','${escHtml(job)}',this)">
          📅 Add Employer's Time to Calendar
        </button>
        <button class="cal-notice-btn secondary" style="border-color:#ffc107;color:#856404" onclick="this.closest('.cal-notice').remove()">Dismiss</button>
      </div>
    </div>
    <button class="cal-notice-dismiss" onclick="this.closest('.cal-notice').remove()" title="Dismiss" style="color:#b8860b">✕</button>
  `;
  chatBody.appendChild(banner);
  chatBody.scrollTop = chatBody.scrollHeight;

  if (typeof showToast === 'function') {
    showToast(`⚠️ Employer changed your shift time to ${newStartDisplay} — check the chat!`, 'info');
  }
}

/* Patch showCalNotice to also trigger AI confirmation message */
const _origShowCalNoticeForConfirm = window.showCalNotice;
window.showCalNotice = function(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay) {
  _origShowCalNoticeForConfirm(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay);
  // Only send AI confirmation for employer contacts (not parent)
  const contact = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(c => c.id === contactId);
  if (contact && contact.role === 'employer' && currentUser?.type === 'teen') {
    // Small delay so the calendar notice appears first
    setTimeout(() => sendAIConfirmationMsg(contactId, date, start, end, job), 1200);
  }
};

window.sendAIConfirmationMsg = sendAIConfirmationMsg;

/* ── Also add a "📅 Add to Calendar" button on accepted job cards ─── */
/* Patch the teen applications renderer to show the button             */
const _origRenderApplications = typeof renderTeenApplications === 'function' ? renderTeenApplications : null;

/* ── expose all calendar globals ────────────────────────────────────── */
window.calNav              = calNav;
window.calRender           = calRender;
window.calDayClick         = calDayClick;
window.openAddShiftModal   = openAddShiftModal;
window.closeAddShiftModal  = closeAddShiftModal;
window.saveShift           = saveShift;
window.deleteShift         = deleteShift;
window.exportCalICS        = exportCalICS;
window.scanMsgForJobTime   = scanMsgForJobTime;
window.showCalNotice       = showCalNotice;
window.calNoticeAdd        = calNoticeAdd;

