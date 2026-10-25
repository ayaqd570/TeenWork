          // The demo buttons open an empty practice account (demo-sandbox-v49, further down the page).
          // If someone taps one before that script has loaded, wait for it.
          function _directDemo(type) {
            if (typeof window.twStartDemo === 'function') return window.twStartDemo(type);
            setTimeout(function () { _directDemo(type); }, 250);
          }
