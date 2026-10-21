
/* ════════════════════════════════════════════════════════════════════
   address-autocomplete-v42 (thread "Address autocomplete", 2026-10-15)
   Every address form asks for the street address first. As the person
   types, matching US addresses drop down (Photon: a free OpenStreetMap
   search made for search-as-you-type, no API key). Picking one fills in
   the street, city, state and ZIP. Every field can still be typed by hand,
   and nothing breaks if the lookup is slow, offline or finds nothing.

   Wiring: a street <input> carries data-addr-city / data-addr-state /
   data-addr-zip (ids of the fields to fill) and data-addr-drop (id of its
   dropdown). The known forms are listed in FORMS below, so the block also
   works on a file whose form HTML was not re-laid out.

   If Photon doesn't answer within 4 s (down, slow, or blocked on that
   network), the list offers a one-off "Find" instead: one OpenStreetMap
   Nominatim search when the person taps it or presses Enter. Nominatim's
   usage policy allows searches a person asks for but forbids
   search-as-you-type, so it is never called while typing.
   addressAutocomplete() / selectAddress() from the old Nominatim code route here.

   ZIP codes (fixed 2026-10-16 after Aya got a wrong one): OpenStreetMap only
   knows a ZIP for sure when it has that exact house. For a street, its ZIP is
   an estimate that can be off near ZIP borders, so it is never used. After a
   pick with a house number, the ZIP comes from the US Census Bureau's address
   list (geocoding.geo.census.gov, free, no key; it has no CORS, so it is called
   the way it documents for browsers, JSONP). When neither has it, the ZIP box
   is left empty and asks for it, rather than guessing.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.TWAddress) return;
  var api = window.TWAddress = { picking: false };

  var PHOTON_SEARCH = 'https://photon.komoot.io/api/';
  var OSM_SEARCH = 'https://nominatim.openstreetmap.org/search';
  var CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
  var US_BBOX = '-180,15,-60,72';   // the US incl. Alaska and Hawaii; Canada/Mexico hits are dropped below
  var WAIT_MS = 300, MIN_CHARS = 4, MAX_SHOWN = 6;
  var PHOTON_LIMIT_MS = 4000;    // suggestions that take longer than this count as "not loading"
  var PHOTON_REST_MS = 90000;    // after a failure, skip suggestions for this long and go straight to "Find"
  var LOOKUP_LIMIT_MS = 8000;    // any other request
  var ZIP_LIMIT_MS = 7000;       // the Census ZIP check
  var photonRestUntil = 0, osmNextAt = 0;

  // street input id → the fields a pick fills in
  var FORMS = {
    'su-teen-address': { drop: 'su-teen-addr-drop', city: 'su-city',     state: 'su-state',     zip: 'su-teen-zip' },
    'su-emp-address':  { drop: 'su-emp-addr-drop',  city: 'su-emp-city', state: 'su-emp-state', zip: 'su-emp-zip' },
    'profile-address': { drop: 'profile-addr-drop', city: 'profile-city', state: 'profile-state', zip: 'profile-zip' }
  };

  var STATES = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado',
    CT:'Connecticut', DE:'Delaware', DC:'District of Columbia', FL:'Florida', GA:'Georgia', HI:'Hawaii',
    ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana',
    ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi',
    MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey',
    NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
    OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota',
    TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington',
    WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming' };
  var ABBR = {};
  Object.keys(STATES).forEach(function (k) { ABBR[STATES[k].toLowerCase()] = k; });

  // ── styles ─────────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.id = 'address-autocomplete-v42-css';
  css.textContent =
    '.tw-addr-hint{font-size:.76rem;color:var(--muted);margin-top:5px;line-height:1.4;text-transform:none;letter-spacing:0;font-weight:400}' +
    '.form-row.tw-addr-row,.tw-addr-row-sm{display:grid;grid-template-columns:1.3fr 1.2fr .8fr;gap:12px}' +
    '.tw-addr-row-sm{gap:10px;margin-top:10px}' +
    '@media(max-width:768px){.form-row.tw-addr-row,.tw-addr-row-sm{grid-template-columns:1fr 1fr}.tw-addr-row .tw-addr-city,.tw-addr-row-sm .tw-addr-city{grid-column:1/-1}}' +
    '.tw-addr-drop .tw-addr-main{display:block;font-weight:600;color:var(--text)}' +
    '.tw-addr-drop .tw-addr-sub{display:block;font-size:.75rem;color:var(--muted);margin-top:1px}' +
    '.tw-addr-drop .tw-addr-msg{padding:9px 12px;font-size:.82rem;color:var(--muted);font-style:italic;line-height:1.4}' +
    '.tw-addr-drop .tw-addr-find{font-weight:600;color:var(--green)}' +
    '.tw-addr-drop .tw-addr-credit{padding:4px 12px;font-size:.66rem;color:var(--muted);text-align:right;border-top:1px solid var(--border)}' +
    '.tw-addr-row-sm select{background:#fff}html.dark .tw-addr-row-sm select{background:var(--card)}' +
    '.city-dropdown.tw-addr-drop{max-height:290px}' +
    'html.dark .city-dropdown.tw-addr-drop{background:var(--card)}' +
    '.tw-addr-ask{border-color:#d97706!important}' +
    '.tw-addr-flash{background-color:var(--green-pale)!important;transition:background-color .9s ease}';
  (document.head || document.documentElement).appendChild(css);

  // ── helpers ────────────────────────────────────────────────────────
  var $ = function (id) { return id ? document.getElementById(id) : null; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var zip5 = function (s) { var m = String(s || '').match(/\b(\d{5})(?:-\d{4})?\b/); return m ? m[1] : ''; };
  var stateName = function (s) {
    s = String(s || '').trim();
    if (!s) return '';
    if (STATES[s.toUpperCase()]) return STATES[s.toUpperCase()];
    return ABBR[s.toLowerCase()] ? STATES[ABBR[s.toLowerCase()]] : s;
  };
  var cfg = function (input) {
    var d = input.dataset || {};
    return { drop: d.addrDrop, city: d.addrCity, state: d.addrState, zip: d.addrZip };
  };
  var isStreetInput = function (el) {
    return !!(el && el.tagName === 'INPUT' && el.dataset && (el.dataset.addrCity || el.dataset.addrState || el.dataset.addrZip));
  };

  // per-input state: debounce timer, in-flight request, current suggestions, highlighted row
  var runs = new WeakMap();
  var run = function (input) { var r = runs.get(input); if (!r) { r = { timer: 0, ctrl: null, seq: 0, items: [], active: -1 }; runs.set(input, r); } return r; };
  var cache = new Map();   // query → raw search results, so retyping or backspacing doesn't re-ask the server

  // fetch + JSON with a hard time limit. The limit is its own timer, so it holds even where a
  // request never settles and aborting it does nothing.
  function fetchJSON(url, r, limitMs) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    if (r) { if (r.ctrl) try { r.ctrl.abort(); } catch (e) {} r.ctrl = ctrl; }
    var timer;
    var limit = new Promise(function (_, reject) {
      timer = setTimeout(function () { if (ctrl) try { ctrl.abort(); } catch (e) {} reject(new Error('no answer within ' + (limitMs || LOOKUP_LIMIT_MS) + ' ms')); }, limitMs || LOOKUP_LIMIT_MS);
    });
    var req;
    try { req = fetch(url, ctrl ? { signal: ctrl.signal } : {}); } catch (e) { req = Promise.reject(e); }
    req = req.then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
    return Promise.race([req, limit]).then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }
  // Nominatim allows one request a second; resolves when the next one may go.
  function osmTurn() {
    var wait = Math.max(0, osmNextAt - Date.now());
    osmNextAt = Date.now() + wait + 1100;
    return new Promise(function (ok) { setTimeout(ok, wait); });
  }
  function note(what, err) { try { console.warn('[TeenWork address] ' + what + ':', (err && err.message) || err); } catch (e) {} }

  // OSM often has the street but not the house number in the US, so a number the person typed
  // is kept in front of the street name.
  function leadNumber(typed) { return (String(typed).match(/^\s*(\d+[a-z]?(?:[-\/]\d+[a-z]?)?)\s+\S/i) || [])[1] || ''; }
  function collect(rows, typed, read) {
    var lead = leadNumber(typed), out = [], seen = {};
    (rows || []).forEach(function (x) {
      var s = read(x);
      if (!s || !s.road) return;
      s.street = ((s.num || lead) ? (s.num || lead) + ' ' : '') + s.road;
      delete s.road; delete s.num;
      var key = (s.street + '|' + s.city + '|' + s.state).toLowerCase();   // one row per street, not per OSM segment
      if (seen[key]) return;
      seen[key] = s; out.push(s);
    });
    return out.slice(0, MAX_SHOWN);
  }
  // Photon features → suggestions
  function toSuggestions(features, typed) {
    return collect(features, typed, function (f) {
      var p = (f && f.properties) || {}, c = (f && f.geometry && f.geometry.coordinates) || [];
      if (String(p.countrycode || '').toUpperCase() !== 'US') return null;
      // a street's ZIP is OSM's estimate for the whole street, so only an exact house keeps its ZIP
      return { road: p.street || ((p.osm_key === 'highway' || p.type === 'street') ? p.name : ''), num: p.housenumber || '',
        city: p.city || (p.osm_key === 'place' ? p.name : '') || '', state: stateName(p.state), zip: p.housenumber ? zip5(p.postcode) : '',
        lon: c[0] == null ? null : c[0], lat: c[1] == null ? null : c[1] };
    });
  }
  // Nominatim results → suggestions
  function fromNominatim(list, typed) {
    return collect(list, typed, function (x) {
      var a = (x && x.address) || {};
      if (String(a.country_code || '').toLowerCase() !== 'us') return null;
      return { road: a.road || a.pedestrian || a.footway || a.path || '', num: a.house_number || '',
        city: a.city || a.town || a.village || a.hamlet || a.municipality || '', state: stateName(a.state), zip: a.house_number ? zip5(a.postcode) : '',
        lon: x.lon == null ? null : +x.lon, lat: x.lat == null ? null : +x.lat, via: 'osm' };
    });
  }

  // ── dropdown ───────────────────────────────────────────────────────
  function dropFor(input) {
    var c = cfg(input), d = $(c.drop);
    if (!d) {   // no dropdown in the HTML: make one under the input
      d = document.createElement('div');
      d.id = c.drop || (input.id + '-addr-drop');
      input.setAttribute('data-addr-drop', d.id);
      d.style.display = 'none';
      var wrap = input.parentElement;
      if (wrap && getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      input.insertAdjacentElement('afterend', d);
    }
    if (!d.classList.contains('tw-addr-drop')) {
      d.classList.add('city-dropdown', 'tw-addr-drop');
      d.removeAttribute('style'); d.style.display = 'none';   // the old teen sign-up dropdown had its own inline look
      d.setAttribute('role', 'listbox');
      d.addEventListener('mousedown', function (e) {
        e.preventDefault();   // keep focus in the input
        var row = e.target.closest && e.target.closest('.tw-addr-item, .tw-addr-find');
        if (!row) return;
        if (row.classList.contains('tw-addr-find')) findNow(input);
        else pick(input, run(input).items[+row.getAttribute('data-i')]);
      });
    }
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', d.id);
    return d;
  }
  function isOpen(input) { var d = $(cfg(input).drop); return !!(d && d.style.display !== 'none'); }
  function hide(input) {
    var d = $(cfg(input).drop);
    if (d) d.style.display = 'none';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    run(input).active = -1;
  }
  function show(input, html) {
    var d = dropFor(input);
    d.innerHTML = html;
    d.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');
    unclip(d);
  }
  // Inside a box that hides overflow (the profile panel does), a floating list gets cut off.
  // There it sits in the page flow instead and pushes the fields below it down.
  function unclip(d) {
    d.style.position = ''; d.style.marginTop = '';
    var bottom = d.getBoundingClientRect().bottom;
    for (var el = d.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      var cs = getComputedStyle(el);
      if (/hidden|auto|scroll|clip/.test(cs.overflowY) && el.getBoundingClientRect().bottom < bottom - 1) {
        d.style.position = 'static'; d.style.marginTop = '4px';
        return;
      }
    }
  }
  function message(input, text) {
    run(input).items = [];
    show(input, '<div class="tw-addr-msg">' + esc(text) + '</div>');
  }
  function render(input, list) {
    var r = run(input), d = dropFor(input);
    r.items = list; r.active = -1;
    if (!list.length) { message(input, 'No matching street addresses yet. Keep typing, or fill in the fields below.'); return; }
    show(input, list.map(function (s, i) {
      var sub = [s.city, [ABBR[String(s.state).toLowerCase()] || s.state, s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      return '<div class="city-dropdown-item tw-addr-item" role="option" id="' + d.id + '-opt-' + i + '" data-i="' + i + '">' +
        '<span class="tw-addr-main">' + esc(s.street) + '</span><span class="tw-addr-sub">' + esc(sub) + '</span></div>';
    }).join('') + '<div class="tw-addr-credit">Addresses © OpenStreetMap contributors</div>');
  }
  function highlight(input, i) {
    var r = run(input), d = $(cfg(input).drop);
    if (!d || !r.items.length) return;
    r.active = (i + r.items.length) % r.items.length;
    [].forEach.call(d.querySelectorAll('.tw-addr-item'), function (row, k) { row.classList.toggle('highlighted', k === r.active); });
    var row = $(d.id + '-opt-' + r.active);
    if (row) { input.setAttribute('aria-activedescendant', row.id); if (row.scrollIntoView) row.scrollIntoView({ block: 'nearest' }); }
  }

  // ── lookup ─────────────────────────────────────────────────────────
  function onInput(input) {
    var r = run(input), q = String(input.value || '').trim();
    clearTimeout(r.timer);
    if (q.length < MIN_CHARS || !/[a-z]/i.test(q)) { r.seq++; if (r.ctrl) try { r.ctrl.abort(); } catch (e) {} hide(input); return; }
    r.timer = setTimeout(function () { search(input, q); }, WAIT_MS);
  }
  function search(input, q) {
    var r = run(input), seq = ++r.seq, key = q.toLowerCase().replace(/\s+/g, ' ');
    if (cache.has(key)) { render(input, toSuggestions(cache.get(key), q)); return; }
    if (Date.now() < photonRestUntil) { offerFind(input, q); return; }
    if (!isOpen(input) || !r.items.length) message(input, 'Searching addresses…');
    var url = PHOTON_SEARCH + '?q=' + encodeURIComponent(q) + '&limit=12&lang=en&layer=house&layer=street&bbox=' + US_BBOX;
    fetchJSON(url, r, PHOTON_LIMIT_MS).then(function (data) {
      if (seq !== r.seq) return;
      var feats = (data && data.features) || [];
      cache.set(key, feats);
      if (cache.size > 60) cache.delete(cache.keys().next().value);
      if (document.activeElement === input) render(input, toSuggestions(feats, q));
    }).catch(function (err) {
      if (seq !== r.seq) return;   // replaced by a newer keystroke
      photonRestUntil = Date.now() + PHOTON_REST_MS;
      note('suggestions are not loading (photon.komoot.io), offering Find instead', err);
      if (document.activeElement === input) offerFind(input, q);
    });
  }
  // Suggestions aren't loading: offer one search the person asks for.
  function offerFind(input, q) {
    var r = run(input), d = dropFor(input);
    r.items = []; r.active = -1;
    show(input, '<div class="city-dropdown-item tw-addr-find" role="option" id="' + d.id + '-find">🔍 Find “' + esc(q) + '”</div>' +
      '<div class="tw-addr-msg">Suggestions aren\'t loading right now. Type your street and town, then tap Find or press Enter.</div>');
  }
  function findNow(input) {
    var r = run(input), q = String(input.value || '').trim(), seq = ++r.seq;
    clearTimeout(r.timer);
    if (q.length < MIN_CHARS) return;
    message(input, 'Looking up your address…');
    osmTurn().then(function () {
      if (seq !== r.seq) return null;
      return fetchJSON(OSM_SEARCH + '?format=jsonv2&addressdetails=1&limit=8&countrycodes=us&q=' + encodeURIComponent(q), r).then(function (list) {
        if (seq !== r.seq) return;
        var out = fromNominatim(list, q);
        if (out.length) render(input, out);
        else message(input, "We couldn't find that address. Check the street and town, or fill in the city, state and ZIP below.");
      });
    }).catch(function (err) {
      if (seq !== r.seq) return;
      note('address lookup failed (nominatim.openstreetmap.org)', err);
      message(input, "Address lookup isn't working right now. Fill in the city, state and ZIP below.");
    });
  }

  // ── ZIP from the US Census Bureau's address list ───────────────────
  // JSONP: the service has no CORS. A late answer lands in a no-op instead of an error.
  var jsonpSeq = 0;
  function jsonp(url, limitMs) {
    return new Promise(function (ok, fail) {
      var name = '__twAddrZip' + (++jsonpSeq) + '_' + Date.now().toString(36), tag = document.createElement('script'), done = false;
      var finish = function (err, data) {
        if (done) return;
        done = true; clearTimeout(timer);
        window[name] = function () {};
        if (tag.parentNode) tag.parentNode.removeChild(tag);
        if (err) fail(err); else ok(data);
      };
      var timer = setTimeout(function () { finish(new Error('no answer within ' + limitMs + ' ms')); }, limitMs);
      window[name] = function (data) { finish(null, data); };
      tag.onerror = function () { finish(new Error('could not reach the service')); };
      tag.async = true;
      tag.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=' + name;
      (document.head || document.documentElement).appendChild(tag);
    });
  }
  // '' when the Census list has no match or its matches disagree
  function censusZip(s) {
    var where = [s.street, s.city, ABBR[String(s.state).toLowerCase()] || s.state].filter(Boolean).join(', ');
    return jsonp(CENSUS + '?address=' + encodeURIComponent(where) + '&benchmark=Public_AR_Current&format=jsonp', ZIP_LIMIT_MS).then(function (data) {
      var m = (data && data.result && data.result.addressMatches) || [];
      var zips = m.map(function (x) { return zip5(x && x.addressComponents && x.addressComponents.zip); }).filter(Boolean);
      if (!zips.length) return '';
      if (zips.every(function (z) { return z === zips[0]; })) return zips[0];
      var city = String(s.city || '').toLowerCase();
      var same = m.filter(function (x) { return String((x.addressComponents || {}).city || '').toLowerCase() === city; });
      return same.length === 1 ? zip5(same[0].addressComponents.zip) : '';
    });
  }
  function quietChange(el) {   // lets the field's own hooks see the new value without another "saved" toast
    api.picking = true;
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } finally { api.picking = false; }
  }
  function placeholder(el, text) {
    if (!el.hasAttribute('data-addr-ph')) el.setAttribute('data-addr-ph', el.placeholder || '');
    el.placeholder = text == null ? el.getAttribute('data-addr-ph') : text;
  }
  function askZip(zipEl) {
    if (String(zipEl.value || '').trim()) return;
    placeholder(zipEl, 'Type your ZIP');
    zipEl.classList.add('tw-addr-ask');
  }
  // After a pick: confirm or find the ZIP for that exact house number.
  function checkZip(input, zipEl, s) {
    var r = run(input), seq = r.zipSeq = (r.zipSeq || 0) + 1;
    zipEl.classList.remove('tw-addr-ask');
    placeholder(zipEl, null);
    if (!/^\d/.test(s.street)) { if (!s.zip) askZip(zipEl); return; }   // no house number: the ZIP can't be pinned down
    if (!s.zip) placeholder(zipEl, 'Looking up…');
    censusZip(s).then(function (z) { return z; }, function (err) { note('ZIP check failed (geocoding.geo.census.gov)', err); return ''; }).then(function (z) {
      if (seq !== r.zipSeq) return;   // another address was picked since
      placeholder(zipEl, null);
      var now = String(zipEl.value || '').trim(), ours = now === '' || now === zipEl.getAttribute('data-addr-filled');
      if (z && ours) {
        if (now !== z) { setField(zipEl, z); quietChange(zipEl); }
      } else if (!z && !s.zip) askZip(zipEl);
    });
  }

  // ── filling the form ───────────────────────────────────────────────
  function flash(el) {
    if (!el) return;
    el.classList.add('tw-addr-flash');
    setTimeout(function () { el.classList.remove('tw-addr-flash'); }, 1200);
  }
  function setField(el, value) {
    el.value = value;
    el.setAttribute('data-addr-filled', value);
    flash(el);
  }
  // A value we have replaces the field. A value we don't have only clears what an earlier pick put there.
  function fill(el, value) {
    if (!el) return;
    if (value) setField(el, value);
    else if (el.value && el.value === el.getAttribute('data-addr-filled')) { el.value = ''; el.removeAttribute('data-addr-filled'); }
  }
  function fillState(sel, name) {
    if (!sel || !name) return;
    var want = name.toLowerCase(), abbr = (ABBR[want] || '').toLowerCase();
    var opt = [].find.call(sel.options || [], function (o) {
      var v = String(o.value || o.text).trim().toLowerCase(), t = String(o.text).trim().toLowerCase();
      return v === want || t === want || (abbr && (v === abbr || t === abbr));
    });
    if (!opt) return;   // e.g. Washington DC is not in the list: leave the state for them to pick
    if (sel.value !== opt.value) {
      sel.value = opt.value;
      // runs the field's own hooks, e.g. the work-permit note on teen sign-up (it also clears the city, which is filled next)
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    flash(sel);
  }
  function pick(input, s) {
    if (!s) return;
    var c = cfg(input);
    clearTimeout(run(input).timer);
    hide(input);
    api.picking = true;
    try {
      input.value = s.street;
      fillState($(c.state), s.state);
      var cityEl = $(c.city);
      fill(cityEl, s.city);
      if (cityEl) { var cd = cityEl.parentElement && cityEl.parentElement.querySelector('.city-dropdown'); if (cd) cd.style.display = 'none'; }
      fill($(c.zip), s.zip);   // an exact house's ZIP, or clears the one an earlier pick put there
    } finally { api.picking = false; }
    input.dispatchEvent(new Event('change', { bubbles: true }));   // e.g. the profile panel saves the address
    var zipEl = $(c.zip);
    if (zipEl) checkZip(input, zipEl, s);
  }

  // ── events (delegated, so forms added later work too) ──────────────
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (isStreetInput(el)) onInput(el);
    else if (el && el.classList && el.classList.contains('tw-addr-ask')) el.classList.remove('tw-addr-ask');
  }, true);
  document.addEventListener('keydown', function (e) {
    var input = e.target;
    if (!isStreetInput(input)) return;
    var r = run(input), open = isOpen(input) && r.items.length > 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) return;
      e.preventDefault();
      highlight(input, r.active < 0 ? (e.key === 'ArrowDown' ? 0 : -1) : r.active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      var d = $(cfg(input).drop);
      if (open && r.active >= 0) { e.preventDefault(); pick(input, r.items[r.active]); }
      else if (isOpen(input) && d && d.querySelector('.tw-addr-find')) { e.preventDefault(); findNow(input); }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (isOpen(input)) { if (e.key === 'Escape') e.preventDefault(); hide(input); }
    }
  }, true);
  document.addEventListener('focusout', function (e) {
    var input = e.target;
    if (isStreetInput(input)) setTimeout(function () { if (document.activeElement !== input) hide(input); }, 150);
  }, true);

  // ── set up the known forms ─────────────────────────────────────────
  function wire() {
    Object.keys(FORMS).forEach(function (id) {
      var input = $(id), f = FORMS[id];
      if (!input) return;
      [['drop', 'data-addr-drop'], ['city', 'data-addr-city'], ['state', 'data-addr-state'], ['zip', 'data-addr-zip']].forEach(function (a) {
        if (!input.hasAttribute(a[1]) && f[a[0]]) input.setAttribute(a[1], f[a[0]]);
      });
      // the old inline Nominatim handlers, if this file still has them
      ['oninput', 'onfocus'].forEach(function (h) { if (/addressAutocomplete/.test(input.getAttribute(h) || '')) input.removeAttribute(h); });
      input.setAttribute('autocomplete', 'off');
      dropFor(input);
    });
  }
  wire();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);

  // ── the old entry points ───────────────────────────────────────────
  window.addressAutocomplete = function (input, dropId) {
    if (!input) return;
    if (dropId && !input.hasAttribute('data-addr-drop')) input.setAttribute('data-addr-drop', dropId);
    onInput(input);
  };
  window.selectAddress = function (street, city, state, zip, inputId) {
    var input = $(inputId);
    if (input) pick(input, { street: street, city: city, state: stateName(state), zip: zip5(zip) });
  };

  // The profile panel now has city and state too. One toast per real change, none mid-fill.
  var lastSaved = null;
  window.saveProfileAddress = function () {
    var v = function (id) { var el = $(id); return el ? String(el.value || '').trim() : null; };
    var next = { street: v('profile-address') || '', zip: v('profile-zip') || '' };
    if (v('profile-city') !== null) next.city = v('profile-city');
    if (v('profile-state') !== null) next.state = v('profile-state');
    try { if (typeof _userAddress === 'object' && _userAddress) Object.assign(_userAddress, next); } catch (e) {}
    var sig = JSON.stringify(next);
    if (api.picking) { lastSaved = sig; return; }   // a fill in progress, or the ZIP check refining what was just saved
    if (sig === lastSaved) return;
    lastSaved = sig;
    try { showToast('📍 Address saved (private — only used for distance)', 'success'); } catch (e) {}
  };

  api.wire = wire; api.search = onInput; api.pick = pick; api.find = findNow; api.suggestions = toSuggestions;
})();
