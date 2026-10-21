
          // _directDemo: completely independent of all wrapper chains.
          // Sets currentUser then forces the correct page. No launchDashboard needed.
          function _directDemo(type) {
            if (!['teen','parent','employer'].includes(type)) return;
            var emailMap  = {teen:'teen@teenwork.demo', parent:'parent@teenwork.demo', employer:'employer@teenwork.demo'};
            var nameMap   = {teen:'Alex Johnson', parent:'Jamie Johnson', employer:"Mike's Landscaping"};
            window.currentUser = {
              name: nameMap[type], email: emailMap[type], type: type,
              emailVerified: true, city: 'Burlington', state: 'Vermont',
              age: type==='teen' ? 16 : undefined, isDemo: true,
              parentLinked: type==='teen' ? {status:'approved',parentName:'Jamie Johnson',parentEmail:'parent@teenwork.demo'} : undefined
            };
            window.selectedType = type;
            if (window.userActivity) {
              if (type === 'teen') {
                userActivity.bio = 'Hardworking 16-year-old from Burlington, Vermont.';
                userActivity.skills = ['lawn care','pet sitting','snow shoveling','cleaning'];
                userActivity.jobsAccepted = [{title:'Lawn Mowing & Yard Cleanup',employer:"Mike's Landscaping"},{title:'House Cleaning Assistant',employer:'The Hendersons'}];
                userActivity.lessonsCompleted = ['first_impression','safety'];
              } else {
                userActivity.bio=''; userActivity.skills=[]; userActivity.jobsAccepted=[]; userActivity.lessonsCompleted=[];
              }
            }
            if (window.teenGameState && type==='teen') {
              teenGameState.points=180; teenGameState.badges=['first_job','first_hire','lesson_1','verified']; teenGameState.hoursWorked=14;
            }
            // Try launchDashboard first (renders all dashboards), then FORCE correct page
            try { if (typeof launchDashboard==='function') launchDashboard(); } catch(e) { console.warn('launchDashboard err:',e); }
            // Force page — runs after launchDashboard regardless of what it did
            function _go() {
              document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
              var pg = document.getElementById('page-'+type);
              if (pg) pg.classList.add('active');
            }
            _go();
            // Build the bottom nav tabs for this role
            try { if (typeof buildNavTabs==='function') buildNavTabs(type); } catch(e) { console.warn('buildNavTabs err:',e); }
            setTimeout(function(){ _go(); try { if (typeof buildNavTabs==='function') buildNavTabs(type); } catch(e){} }, 50);
            setTimeout(function(){ _go(); try { if (typeof buildNavTabs==='function') buildNavTabs(type); } catch(e){} }, 400);
            if (typeof showToast==='function') showToast('Welcome to the '+type.charAt(0).toUpperCase()+type.slice(1)+' Demo!','success');
          }
          