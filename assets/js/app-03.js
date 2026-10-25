
          // _directDemo: completely independent of all wrapper chains.
          // Sets currentUser then forces the correct page. No launchDashboard needed.
          function _directDemo(type) {
            // v49: every demo is an empty practice account (demo-sandbox-v49), which loads later in the page
            if (typeof window.twStartDemo === 'function') return window.twStartDemo(type);
            setTimeout(function () { _directDemo(type); }, 250);
          }
          