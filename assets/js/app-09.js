
(function fixDemoAndAdmin() {
  function _run() {
    // ── DEMO LOGIN: direct, no wrapper chains ────────────────────────────
    window.demoLogin = function(type) {
      console.log('[demoLogin] called with type:', type);
      var validTypes = ['teen','parent','employer'];
      if (!type || validTypes.indexOf(type) === -1) {
        console.warn('[demoLogin] invalid type:', type); return;
      }

      window.currentUser    = null;
      window.selectedType   = null;
      window.parentVerified = false;
      window.pendingEmail   = '';
      if (typeof resetSessionState === 'function') resetSessionState();

      var emailMap = {teen:'teen@teenwork.demo', parent:'parent@teenwork.demo', employer:'employer@teenwork.demo'};
      var nameMap  = {teen:'Alex Johnson', parent:'Jamie Johnson', employer:"Mike's Landscaping"};

      window.currentUser = {
        name: nameMap[type],
        email: emailMap[type],
        type: type,
        emailVerified: true,
        city: 'Burlington',
        state: 'Vermont',
        age: type === 'teen' ? 16 : undefined,
        isDemo: true,
        parentLinked: type === 'teen' ? { status: 'approved', parentName: 'Jamie Johnson', parentEmail: 'parent@teenwork.demo' } : undefined,
      };

      console.log('[demoLogin] currentUser:', JSON.stringify(window.currentUser));

      if (type === 'teen') {
        if (window.userActivity) {
          userActivity.bio = 'Hardworking 16-year-old from Burlington, Vermont.';
          userActivity.skills = ['lawn care','pet sitting','snow shoveling','cleaning'];
          userActivity.jobsAccepted = [
            {title:"Lawn Mowing & Yard Cleanup", employer:"Mike's Landscaping"},
            {title:"House Cleaning Assistant",   employer:"The Hendersons"},
          ];
          userActivity.lessonsCompleted = ['first_impression','safety'];
        }
        if (window.teenGameState) {
          teenGameState.points = 180;
          teenGameState.badges = ['first_job','first_hire','lesson_1','verified'];
          teenGameState.hoursWorked = 14;
        }
      }

      console.log('[demoLogin] launchDashboard is:', typeof launchDashboard);
      if (typeof launchDashboard === 'function') {
        try { launchDashboard(); } catch(e) { console.error('[demoLogin] launchDashboard threw:', e); }
      }
      // Force correct page regardless of what launchDashboard did
      if (typeof gotoPage === 'function') {
        gotoPage(type);
        setTimeout(function(){ gotoPage(type); }, 100); // catch any async re-renders
      }
      if (typeof showToast === 'function') showToast('Welcome to the ' + type.charAt(0).toUpperCase() + type.slice(1) + ' Demo!', 'success');
    };


    // ── SEED DEMO ACCOUNT DATA ────────────────────────────────────────
    // Pre-fill localStorage for each demo account so they feel real & complete
    function _seedDemoAccounts() {
      const demos = {
        'teen@teenwork.demo': {
          tier: 'pro',
          profile: { firstName:'Alex', lastName:'Johnson', age:16, city:'Burlington', state:'Vermont', bio:'Hardworking 16-year-old looking for local jobs. Great with animals, lawn care, and cleaning. Reliable and punctual!', skills:['Lawn Mowing','Pet Sitting','Snow Shoveling','House Cleaning','Dog Walking'] },
          earnings: [
            { id:'e1', date:'2024-05-10', employer:"Mike's Landscaping", job:'Lawn Mowing', hours:4, rate:15, total:60, status:'paid' },
            { id:'e2', date:'2024-05-17', employer:'The Hendersons', job:'House Cleaning', hours:3, rate:14, total:42, status:'paid' },
            { id:'e3', date:'2024-05-24', employer:'Sarah Chen', job:'Pet Sitting', hours:5, rate:12, total:60, status:'pending' },
          ],
          badges: ['first_job','first_hire','lesson_1','verified','5_star'],
          points: 380,
          lessonsCompleted: ['first_impression','safety','communication','money'],
          applications: [
            { id:'a1', job:'Lawn Mowing', employer:"Mike's Landscaping", status:'accepted', date:'2024-05-01' },
            { id:'a2', job:'Dog Walking', employer:'The Martinez Family', status:'pending', date:'2024-06-01' },
          ],
          savingsGoals: [{ id:'g1', name:'New Bike', target:350, saved:162, emoji:'🚲' }],
        },
        'parent@teenwork.demo': {
          tier: 'pro',
          profile: { firstName:'Jamie', lastName:'Johnson', city:'Burlington', state:'Vermont', parentEmail:'parent@teenwork.demo', linkedTeens:['teen@teenwork.demo'] },
          controls: { approval:true, 'match-notify':true, 'accept-notify':true, 'local-only':false, block:false, 'msg-alert':true, 'min-employer-rating':4, 'max-distance':10, 'max-weekly-hours':15 },
        },
        'employer@teenwork.demo': {
          tier: 'pro',
          profile: { firstName:"Mike's", lastName:'Landscaping', city:'Burlington', state:'Vermont', bizName:"Mike's Landscaping", bizType:'Landscaping', rating:4.8, reviews:12 },
          postedJobs: [
            { id:'j1', title:'Lawn Mowing & Yard Cleanup', pay:15, payType:'hr', type:'Outdoor', minAge:14, maxHours:15, city:'Burlington', state:'Vermont', desc:'Help with weekly lawn mowing, edging, and yard cleanup. Must be reliable and bring energy.', status:'active', applicants:3 },
            { id:'j2', title:'Snow Shoveling - Winter Ready', pay:20, payType:'hr', type:'Outdoor', minAge:14, maxHours:10, city:'Burlington', state:'Vermont', desc:'Looking for reliable teen to help clear driveways and walkways after snowfall.', status:'active', applicants:1 },
          ],
        },
      };

      Object.entries(demos).forEach(([email, data]) => {
        const base = 'tw_' + email + '_';
        // Only seed if not already seeded (don't overwrite real changes)
        if (!sessionStorage.getItem(base + 'demo_seeded')) {
          // Demo data → sessionStorage so it resets on close
          const _dSet = (k, v) => { try { sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch(e){} };
          if (data.tier)       _dSet(base + 'acct_tier', data.tier);
          if (data.profile)    _dSet(base + 'profile', data.profile);
          if (data.earnings)   _dSet(base + 'earnings', data.earnings);
          if (data.badges)     _dSet(base + 'badges', data.badges);
          if (data.points)     _dSet(base + 'points', String(data.points));
          if (data.lessonsCompleted) _dSet(base + 'lessons', data.lessonsCompleted);
          if (data.applications) _dSet(base + 'applications', data.applications);
          if (data.savingsGoals) _dSet(base + 'savings_goals', data.savingsGoals);
          if (data.controls)   _dSet(base + 'controls', data.controls);
          if (data.postedJobs) _dSet(base + 'jobs', data.postedJobs);
          sessionStorage.setItem(base + 'demo_seeded', '1');
        }
      });
    }
    _seedDemoAccounts();

    // ── ADMIN LOGIN: patch doLogin to accept password "admin" too ────────
    const _origDoLogin = window.doLogin;
    window.doLogin = async function() {
      const emailEl = document.getElementById('li-email');
      const passEl  = document.getElementById('li-password');
      if (!emailEl || !passEl) { if (_origDoLogin) return _origDoLogin(); return; }

      const email    = emailEl.value.trim();
      const password = passEl.value;

      // v39: admin sign-in is handled by _twAdminLogin (salted hash, no plain-text password here)
      if (await _twAdminLogin(email, password)) return;

      // Fall through to original for real/demo email logins
      if (typeof _origDoLogin === 'function') return _origDoLogin();
    };


    // ── MISSING: lessonsData + renderLessonsGrid + renderStreakBadge ─────
    if (typeof window.lessonsData === 'undefined') {
      window.lessonsData = [
        {id:'first_impression', title:'Making a Great First Impression', icon:'🤝', desc:'How to introduce yourself, show up on time, and impress employers from day one.', xp:20, quiz:[{q:'What should you do when you first meet an employer?',opts:['Look at your phone','Give a firm handshake and make eye contact','Wait for them to speak first'],ans:1}]},
        {id:'safety',           title:'Workplace Safety Basics',          icon:'🦺', desc:'Know your rights and how to stay safe on the job.',                              xp:20, quiz:[{q:'If a task feels unsafe, you should:',opts:['Do it anyway','Tell your employer immediately','Quit on the spot'],ans:1}]},
        {id:'communication',    title:'Professional Communication',       icon:'💬', desc:'Texting, emailing, and talking to employers like a pro.',                        xp:20, quiz:[{q:'Best way to confirm a shift?',opts:['Show up and hope','Send a quick text or email the day before','Post on social media'],ans:1}]},
        {id:'money',            title:'Managing Your First Paycheck',     icon:'💰', desc:'Taxes, savings, and making your money work for you.',                            xp:20, quiz:[{q:'What is a good habit with your paycheck?',opts:['Spend it all immediately','Save at least 10%','Give it all to parents'],ans:1}]},
        {id:'ratings',          title:'Getting 5-Star Ratings',           icon:'⭐', desc:'What employers look for and how to consistently earn top marks.',                xp:20, quiz:[{q:'What most affects your rating?',opts:['Your age','Reliability and attitude','How fast you work'],ans:1}]},
        {id:'resume',           title:'Building Your Teen Resume',        icon:'📄', desc:'How to write a resume with no work experience — and make it shine.',             xp:20, quiz:[{q:'What can go on a teen resume?',opts:['Only paid jobs','School activities, chores, volunteering, and skills','Nothing — you have no experience'],ans:1}]},
        {id:'interview',        title:'Nailing the Interview',            icon:'🎤', desc:'Common questions, how to answer them, and what to wear.',                        xp:20, quiz:[{q:'Best answer to "Tell me about yourself":',opts:['I dunno','A short intro covering your skills and enthusiasm','Read your resume out loud'],ans:1}]},
        {id:'conflict',         title:'Handling Workplace Conflict',      icon:'🕊️', desc:'Disagreements happen — here\'s how to handle them professionally.',              xp:20, quiz:[{q:'A coworker is rude to you. Best response?',opts:['Yell back','Ignore it forever','Calmly address it or tell a supervisor'],ans:1}]},
        {id:'time',             title:'Time Management on the Job',       icon:'⏰', desc:'Scheduling, being on time, and balancing work with school.',                     xp:20, quiz:[{q:'You\'re going to be late. What do you do?',opts:['Say nothing and hope','Text your employer as soon as you know','Just don\'t show up'],ans:1}]},
        {id:'social_media',     title:'Social Media & Your Reputation',   icon:'📱', desc:'What employers can see and how to keep your online presence professional.',     xp:20, quiz:[{q:'Before applying for jobs, you should:',opts:['Delete all accounts','Review your public posts for anything unprofessional','Post more to look active'],ans:1}]},
        {id:'teamwork',         title:'Working as Part of a Team',        icon:'🤜', desc:'Collaboration, taking direction, and being the teammate everyone wants.',        xp:20, quiz:[{q:'Your team is behind schedule. You should:',opts:['Focus only on your own tasks','Ask how you can help','Blame the slowest person'],ans:1}]},
        {id:'references',       title:'Getting Great References',         icon:'📜', desc:'Who to ask, what they\'ll say, and how to keep relationships strong.',           xp:20, quiz:[{q:'Best person to ask for a reference?',opts:['A friend','A former employer or teacher who knows your work','A family member'],ans:1}]},
      ];
    }

    if (typeof window.renderLessonsGrid === 'undefined' || typeof renderLessonsGrid === 'undefined') {
      window.renderLessonsGrid = function() {
        var grid = document.getElementById('lessons-grid');
        if (!grid) return;
        var completed = (window.userActivity && window.userActivity.lessonsCompleted) ? window.userActivity.lessonsCompleted : [];
        var data = window.lessonsData || [];
        var done = data.filter(function(l){ return completed.indexOf(l.id) !== -1; }).length;

        var doneEl  = document.getElementById('lessons-done-count');
        var totalEl = document.getElementById('lessons-total-count');
        var barEl   = document.getElementById('lessons-progress-bar');
        var labelEl = document.getElementById('lessons-progress-label');
        if (doneEl)  doneEl.textContent  = done;
        if (totalEl) totalEl.textContent = data.length;
        var pct = data.length ? Math.round(done/data.length*100) : 0;
        if (barEl)   barEl.style.width   = pct + '%';
        if (labelEl) labelEl.textContent = done === data.length ? 'All lessons complete! 🎉' : pct + '% complete — keep going!';

        grid.innerHTML = data.map(function(l) {
          var isDone = completed.indexOf(l.id) !== -1;
          return '<div class="lesson-card' + (isDone?' done':'') + '" onclick="openLesson(\'' + l.id + '\')">' +
            '<div class="lesson-card-top">' +
              '<div style="font-size:2rem">' + l.icon + '</div>' +
              '<div><div style="font-weight:700;font-size:.92rem;color:var(--text)">' + l.title + '</div>' +
              '<div style="font-size:.78rem;color:var(--muted);margin-top:3px">' + l.desc + '</div></div>' +
            '</div>' +
            '<div class="lesson-card-bottom">' +
              '<span style="font-size:.75rem;font-weight:700;color:' + (isDone?'var(--green)':'var(--amber)') + '">' + (isDone?'✅ Complete':'⚡ +'+l.xp+' XP') + '</span>' +
              '<button class="btn-sm ' + (isDone?'btn-approve':'btn-ai') + '" style="font-size:.72rem">' + (isDone?'Review':'Start') + '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      };
    }

    if (typeof window.renderStreakBadge === 'undefined') {
      window.renderStreakBadge = function() {
        var el = document.getElementById('teen-streak-badge');
        if (!el) return;
        var streak = (window.userActivity && window.userActivity.streak) || 0;
        el.textContent = streak > 0 ? ('⚡ ' + streak + ' day streak') : '⚡ Start your streak!';
      };
    }

    if (typeof window.openLesson === 'undefined') {
      window.openLesson = function(id) {
        var l = (window.lessonsData||[]).find(function(x){return x.id===id;});
        if (!l) return;
        var completed = (window.userActivity && window.userActivity.lessonsCompleted) ? window.userActivity.lessonsCompleted : [];
        var isDone = completed.indexOf(id) !== -1;
        var modal = document.getElementById('lesson-modal') || (function(){
          var m = document.createElement('div');
          m.id = 'lesson-modal';
          m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
          document.body.appendChild(m);
          return m;
        })();
        modal.innerHTML = '<div style="background:var(--card,#fff);border-radius:18px;max-width:480px;width:100%;padding:1.5rem;max-height:90vh;overflow-y:auto">' +
          '<div style="font-size:2.5rem;text-align:center;margin-bottom:.5rem">' + l.icon + '</div>' +
          '<h2 style="font-family:Fraunces,serif;text-align:center;color:var(--green);margin-bottom:.5rem">' + l.title + '</h2>' +
          '<p style="font-size:.88rem;color:var(--text);line-height:1.65;margin-bottom:1rem">' + l.desc + '</p>' +
          (l.quiz && l.quiz[0] ? '<div style="background:var(--bg,#f8f8f8);border-radius:12px;padding:1rem;margin-bottom:1rem">' +
            '<div style="font-weight:700;font-size:.88rem;margin-bottom:.75rem">Quick Quiz: ' + l.quiz[0].q + '</div>' +
            l.quiz[0].opts.map(function(o,i){
              return '<button onclick="answerLesson(\'' + id + '\',' + i + ',' + l.quiz[0].ans + ')" style="display:block;width:100%;text-align:left;padding:.5rem .75rem;margin-bottom:.4rem;border-radius:8px;border:1.5px solid var(--border);background:var(--card,#fff);cursor:pointer;font-size:.85rem">' + o + '</button>';
            }).join('') +
          '</div>' : '') +
          (isDone ? '<div style="text-align:center;color:var(--green);font-weight:700;margin-bottom:1rem">✅ You already completed this lesson!</div>' : '') +
          '<button onclick="document.getElementById(\'lesson-modal\').style.display=\'none\'" style="width:100%;padding:.6rem;border-radius:10px;border:none;background:var(--border);color:var(--text);font-weight:700;cursor:pointer">Close</button>' +
        '</div>';
        modal.style.display = 'flex';
      };
    }

    if (typeof window.answerLesson === 'undefined') {
      window.answerLesson = function(id, chosen, correct) {
        if (chosen === correct) {
          if (window.userActivity) {
            if (!userActivity.lessonsCompleted) userActivity.lessonsCompleted = [];
            if (userActivity.lessonsCompleted.indexOf(id) === -1) userActivity.lessonsCompleted.push(id);
          }
          if (typeof showToast === 'function') showToast('✅ Correct! Lesson complete — +20 XP', 'success');
          if (typeof renderLessonsGrid === 'function') setTimeout(renderLessonsGrid, 300);
        } else {
          if (typeof showToast === 'function') showToast('Not quite — try again!', 'warning');
        }
        document.getElementById('lesson-modal').style.display = 'none';
      };
    }

    // Also keep ai-lessons-grid in sync
    const _origRLG = window.renderLessonsGrid;
    window.renderLessonsGrid = function() {
      if (_origRLG) _origRLG();
      var aiGrid = document.getElementById('ai-lessons-grid');
      var mainGrid = document.getElementById('lessons-grid');
      if (aiGrid && mainGrid) { aiGrid.innerHTML = mainGrid.innerHTML; }
      var aiDone = document.getElementById('ai-lessons-done-count');
      var aiTotal = document.getElementById('ai-lessons-total-count');
      var aiBar = document.getElementById('ai-lessons-progress-bar');
      var aiLabel = document.getElementById('ai-lessons-progress-label');
      var aiDoneBadge = document.getElementById('ai-lessons-done-badge');
      var doneEl = document.getElementById('lessons-done-count');
      var totalEl = document.getElementById('lessons-total-count');
      var barEl = document.getElementById('lessons-progress-bar');
      if (doneEl && aiDone) aiDone.textContent = doneEl.textContent;
      if (totalEl && aiTotal) aiTotal.textContent = totalEl.textContent;
      if (barEl && aiBar) aiBar.style.width = barEl.style.width;
      if (aiLabel) { var l = document.getElementById('lessons-progress-label'); if(l) aiLabel.textContent = l.textContent; }
      if (aiDoneBadge && doneEl) aiDoneBadge.textContent = doneEl.textContent + ' done';
    };


    // ── MISSING FUNCTIONS: all buttons that were broken ─────────────────

    // Generic chat AI for all dashboards (parent, teen, employer)
    window.chatAI = window.chatAI || async function(inputId, outputId) {
      const input = document.getElementById(inputId);
      const out   = document.getElementById(outputId);
      if (!input || !out) return;
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      out.innerHTML += '<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> ' + msg + '</p><span class="loading-dots" id="ai-dots">Thinking…</span>';
      out.scrollTop = out.scrollHeight;
      try {
        const role = window.currentUser?.type || 'user';
        const system = role === 'employer'
          ? 'You are an AI compliance assistant for TeenWork employers. Help with teen labor laws, safe job descriptions, and best hiring practices. Be concise and practical.'
          : role === 'parent'
          ? 'You are a helpful safety assistant for parents on TeenWork. Answer questions about teen work safety, platform features, and parental controls. Be reassuring and clear.'
          : 'You are an AI job coach for TeenWork, a platform for teens aged 14-17 getting their first jobs. Be encouraging, practical, and age-appropriate.';
        const reply = await callAI(msg, system);
        document.getElementById('ai-dots')?.remove();
        out.innerHTML += '<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>AI:</strong> ' + reply.replace(/\n/g,'<br>') + '</p>';
      } catch(e) {
        document.getElementById('ai-dots')?.remove();
        out.innerHTML += '<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable — try again.</p>';
      }
      out.scrollTop = out.scrollHeight;
    };

    // quickCoach — teen AI coach quick-prompt buttons
    window.quickCoach = window.quickCoach || async function(prompt) {
      const out = document.getElementById('teen-coach-ai');
      const input = document.getElementById('teen-coach-input');
      if (input) input.value = '';
      if (!out) return;
      out.innerHTML += '<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> ' + prompt.slice(0, 80) + '…</p><span class="loading-dots" id="qc-dots">Thinking…</span>';
      out.scrollTop = out.scrollHeight;
      try {
        const reply = await callAI(prompt, 'You are an AI job coach for teens aged 14-17 on TeenWork. Be encouraging, practical, and age-appropriate.');
        document.getElementById('qc-dots')?.remove();
        out.innerHTML += '<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>Coach:</strong> ' + reply.replace(/\n/g,'<br>') + '</p>';
      } catch(e) {
        document.getElementById('qc-dots')?.remove();
        out.innerHTML += '<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable.</p>';
      }
      out.scrollTop = out.scrollHeight;
    };

    // empQuickAI — employer AI quick-prompt buttons
    window.empQuickAI = window.empQuickAI || async function(prompt) {
      const out = document.getElementById('emp-ai-chat');
      const input = document.getElementById('emp-ai-input');
      if (input) input.value = '';
      if (!out) return;
      out.innerHTML += '<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> ' + prompt.slice(0, 80) + '…</p><span class="loading-dots" id="eq-dots">Thinking…</span>';
      out.scrollTop = out.scrollHeight;
      try {
        const reply = await callAI(prompt, 'You are an AI compliance assistant for employers on TeenWork who hire teens. Be concise, accurate, and reference relevant labor laws.');
        document.getElementById('eq-dots')?.remove();
        out.innerHTML += '<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>AI:</strong> ' + reply.replace(/\n/g,'<br>') + '</p>';
      } catch(e) {
        document.getElementById('eq-dots')?.remove();
        out.innerHTML += '<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable.</p>';
      }
      out.scrollTop = out.scrollHeight;
    };

    // runParentSafetyCheck — parent AI safety overview
    window.runParentSafetyCheck = window.runParentSafetyCheck || async function() {
      const out = document.getElementById('p-ai-chat') || document.getElementById('parent-safety-output');
      if (!out) { alert('AI job guidance: all settings look good!'); return; }
      out.innerHTML = '<span class="loading-dots">Running safety check…</span>';
      try {
        const reply = await callAI(
          'A parent is using TeenWork to supervise their teen\'s job activities. Run a quick safety checklist covering: job type safety, employer verification, working hours compliance, payment safety, and communication monitoring. Give a short reassuring summary with any action items.',
          'You are a teen work safety assistant for parents. Be clear, reassuring, and flag any real concerns.'
        );
        out.innerHTML = '<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:8px 12px">🛡️ <strong>Safety Check:</strong><br>' + reply.replace(/\n/g,'<br>') + '</p>';
      } catch(e) {
        out.innerHTML = '<p style="color:var(--muted);font-size:.85rem">AI unavailable. Manually review your teen\'s active jobs and approved employers.</p>';
      }
    };

    // saveBioBtn — save teen bio from profile section
    window.saveBioBtn = window.saveBioBtn || function() {
      const bioEl = document.getElementById('acct-bio') || document.getElementById('teen-bio-field');
      const val = bioEl ? bioEl.value.trim() : '';
      if (!val) { if(typeof showToast==='function') showToast('Write a bio first!','warning'); return; }
      if (window.userActivity) userActivity.bio = val;
      if (typeof updateAIProfile === 'function') updateAIProfile('bio_update', val);
      if (typeof showToast === 'function') showToast('✅ Bio saved!', 'success');
    };

    // Rating modal functions
    window._selectedRating = 0;
    window._ratingTargetIdx = -1;

    window.openRatingModal = window.openRatingModal || function(idx) {
      window._ratingTargetIdx = idx;
      window._selectedRating = 0;
      document.querySelectorAll('.star-opt').forEach(s => s.textContent = '☆');
      const modal = document.getElementById('ratingModal');
      if (modal) modal.classList.add('active');
    };

    window.closeRatingModal = window.closeRatingModal || function() {
      const modal = document.getElementById('ratingModal');
      if (modal) modal.classList.remove('active');
    };

    window.pickStar = window.pickStar || function(n) {
      window._selectedRating = n;
      document.querySelectorAll('.star-opt').forEach(function(s, i) {
        s.textContent = i < n ? '★' : '☆';
      });
    };

    window.submitRating = window.submitRating || function() {
      const stars = window._selectedRating || 0;
      if (!stars) { if(typeof showToast==='function') showToast('Pick a star rating first!','warning'); return; }
      const commentEl = document.getElementById('rating-comment');
      const comment = commentEl ? commentEl.value.trim() : '';
      if (typeof showToast === 'function') showToast('⭐ Rating submitted — thanks!', 'success');
      window.closeRatingModal();
    };

    // Terms modal
    window.openTerms = function() {
      const modal = document.getElementById('termsModal');
      if (modal) modal.classList.add('open', 'active');
    };
    window.closeTerms = function() {
      const modal = document.getElementById('termsModal');
      if (modal) modal.classList.remove('open', 'active');
    };
    // "I've read and agree" also ticks the agreement box on the sign-up form
    window.agreeTermsAndClose = function() {
      const cb = document.getElementById('terms-agree');
      if (cb) cb.checked = true;
      window.closeTerms();
    };

    // Safety feature modals (defined in featpack but may not be ready on early clicks)
    window.closeFeelsWrong = window.closeFeelsWrong || function(){ document.getElementById('feelsWrongModal')?.classList.remove('active'); };
    window.closeSafeWord   = window.closeSafeWord   || function(){ document.getElementById('safeWordModal')?.classList.remove('active'); };
    window.closeAutoReply  = window.closeAutoReply  || function(){ document.getElementById('autoReplyModal')?.classList.remove('active'); };
    window.closeReferral   = window.closeReferral   || function(){ document.getElementById('referralModal')?.classList.remove('active'); };

    console.log('[TeenWork Fix] demoLogin and doLogin patched successfully.');

    // ── MISSING FUNCTION: resumeChatAI ───────────────────────────────────
    window.resumeChatAI = async function() {
      const input   = document.getElementById('teen-resume-input');
      const chatBox = document.getElementById('teen-resume-ai');
      if (!input || !chatBox) return;
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      chatBox.innerHTML += `<p style="background:var(--green-pale,#f0fdf4);border-radius:8px;padding:5px 9px;margin-top:6px"><strong>You:</strong> ${msg}</p><span class="loading-dots">Thinking…</span>`;
      chatBox.scrollTop = chatBox.scrollHeight;
      try {
        const bio = await callGemini(msg,
          'You are an AI résumé assistant for TeenWork. A teen is describing themselves. Write a short, enthusiastic 2-3 sentence professional bio in first person based on what they tell you. Keep it friendly and age-appropriate. End with one specific strength.');
        const dots = chatBox.querySelector('.loading-dots');
        if (dots) dots.remove();
        chatBox.innerHTML += `<p style="margin-top:6px;background:var(--blue-pale,#eff6ff);border-radius:8px;padding:5px 9px">🤖 <strong>AI:</strong> ${bio.replace(/\n/g,'<br>')}</p>`;
        // Store the latest AI-generated bio for "Use This Bio"
        window._latestAIBio = bio;
      } catch(e) {
        const dots = chatBox.querySelector('.loading-dots');
        if (dots) dots.remove();
        chatBox.innerHTML += `<p style="color:var(--muted,#888);margin-top:6px;font-size:.85rem">AI unavailable — try again shortly.</p>`;
      }
      chatBox.scrollTop = chatBox.scrollHeight;
    };

    // ── MISSING FUNCTION: useAIBio ───────────────────────────────────────
    window.useAIBio = function() {
      const bio = window._latestAIBio;
      if (!bio) { if (typeof showToast==='function') showToast('Ask the AI to write a bio first!','warning'); return; }
      if (window.userActivity) userActivity.bio = bio;
      if (typeof updateAIProfile === 'function') updateAIProfile('bio_update', bio);
      const bioEl = document.getElementById('acct-bio') || document.getElementById('teen-bio-field');
      if (bioEl) { bioEl.value = bio; }
      if (typeof showToast === 'function') showToast('✅ Bio saved to your profile!', 'success');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _run);
  } else {
    _run();
  }
})();
