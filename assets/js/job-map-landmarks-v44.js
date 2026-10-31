
/* ═══════════════════════════════════════════════════════════════════
   v44 · JOB MAP WITH LANDMARKS  (2026-10-16, Aya's request)
   "in job map even in limited mode or if there are no jobs show
    landmarks and stuff and have those as reference when applying
    for a job"
   • The 🗺️ Job Map is a real map now (Leaflet + OpenStreetMap tiles,
     loaded only when the map opens). It always shows landmarks around
     the teen's home: parks, schools, libraries, stores, town hall /
     post office, fire & police, hospitals, stations, sports & museums,
     and (zoomed in) food & gas spots and places of worship. Works in
     limited mode and with no jobs. Chips turn kinds on and off.
   • Landmarks come from OpenStreetMap through the free Overpass API,
     saved on the device for 7 days per map square so they load once.
     Towns are found with Photon (Nominatim as backup), like the
     address boxes. The home address never leaves the device except
     as that lookup, which the address boxes already do.
   • Job pins sit at the landmark the employer picked, or in the middle
     of the job's town when they didn't (never at a home address).
   • Apply: "Apply Now" (and the map pins and a new "🗺️ Where is it?"
     button on each job card) open a "Where this job is" sheet first:
     a small map, the 3–4 nearest landmarks with distances, and how
     far it is from home. "Send application" then applies as before.
     In limited mode the button asks to link a parent instead.
     Code that calls teenApply() directly is not changed.
   • Employers get an optional "Nearest landmark" picker on Post Job;
     the job then shows "📍 Near <landmark>" to teens.
   • Real accounts see only their own jobs (real-data-v43 already
     removes the samples); landmarks are real map data.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.TWLandmarks) return;
  var api = window.TWLandmarks = {};

  /* ── services ─────────────────────────────────────────────────── */
  var LEAFLET_JS = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'];
  var LEAFLET_CSS = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'];
  var SRI_JS = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  var SRI_CSS = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  var TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var TILE_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  var OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  var PHOTON = 'https://photon.komoot.io/api/', NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  var US_BBOX = '-180,15,-60,72';
  var US_CENTER = [39.5, -98.35];
  var SLOW_MS = 8000;   // v51 (A2/T7): after this long, say so and offer Try again instead of waiting quietly

  /* ── landmark kinds ───────────────────────────────────────────────
     tier a = loaded at zoom 13+ and used for "nearest landmarks";
     tier b = busy kinds, loaded and shown only at zoom 15+.          */
  var KINDS = [
    { k: 'school',  e: '🏫', label: 'Schools',          c: '#2563eb', tier: 'a', w: 0.8, f: ['["amenity"~"^(school|college|university)$"]'] },
    { k: 'park',    e: '🌳', label: 'Parks',            c: '#15803d', tier: 'a', w: 0.8, f: ['["leisure"~"^(park|nature_reserve)$"]'] },
    { k: 'library', e: '📚', label: 'Libraries',        c: '#7c3aed', tier: 'a', w: 0.8, f: ['["amenity"="library"]'] },
    { k: 'store',   e: '🛒', label: 'Stores',           c: '#ea580c', tier: 'a', w: 0.9, f: ['["shop"~"^(supermarket|mall|department_store|hardware|doityourself)$"]'] },
    { k: 'civic',   e: '🏛️', label: 'Town hall & post', c: '#475569', tier: 'a', w: 0.9, f: ['["amenity"~"^(townhall|post_office|community_centre|courthouse)$"]'] },
    { k: 'safety',  e: '🚒', label: 'Fire & police',    c: '#dc2626', tier: 'a', w: 1.0, f: ['["amenity"~"^(fire_station|police)$"]'] },
    { k: 'health',  e: '🏥', label: 'Hospitals',        c: '#db2777', tier: 'a', w: 1.0, f: ['["amenity"="hospital"]'] },
    { k: 'transit', e: '🚉', label: 'Stations',         c: '#0891b2', tier: 'a', w: 0.9, f: ['["amenity"="bus_station"]', '["railway"="station"]'] },
    { k: 'fun',     e: '🏟️', label: 'Sports & museums', c: '#ca8a04', tier: 'a', w: 0.9, f: ['["leisure"~"^(stadium|sports_centre|ice_rink)$"]', '["tourism"~"^(museum|attraction|zoo)$"]'] },
    { k: 'food',    e: '🍔', label: 'Food & gas',       c: '#b45309', tier: 'b', w: 1.1, f: ['["amenity"~"^(fast_food|cafe|fuel)$"]["brand"]'] },
    { k: 'worship', e: '⛪', label: 'Places of worship', c: '#6b7280', tier: 'b', w: 1.2, f: ['["amenity"="place_of_worship"]'] }
  ];
  var KIND = {}; KINDS.forEach(function (K) { KIND[K.k] = K; });
  var TIER_ZOOM = { a: 13, b: 15 };

  function classify(t) {
    var a = t.amenity || '', l = t.leisure || '', s = t.shop || '', tr = t.tourism || '';
    if (/^(school|college|university)$/.test(a)) return ['school', a === 'school' ? '🏫' : '🎓'];
    if (a === 'library') return ['library', '📚'];
    if (l === 'park' || l === 'nature_reserve') return ['park', l === 'park' ? '🌳' : '🌲'];
    if (/^(supermarket|mall|department_store|hardware|doityourself)$/.test(s)) return ['store', s === 'supermarket' ? '🛒' : /^(hardware|doityourself)$/.test(s) ? '🔨' : '🛍️'];
    if (/^(townhall|post_office|community_centre|courthouse)$/.test(a)) return ['civic', { townhall: '🏛️', post_office: '🏤', community_centre: '🏘️', courthouse: '⚖️' }[a]];
    if (a === 'fire_station' || a === 'police') return ['safety', a === 'police' ? '🚓' : '🚒'];
    if (a === 'hospital') return ['health', '🏥'];
    if (a === 'bus_station' || t.railway === 'station') return ['transit', a === 'bus_station' ? '🚌' : '🚉'];
    if (/^(stadium|sports_centre|ice_rink)$/.test(l)) return ['fun', { stadium: '🏟️', sports_centre: '🏀', ice_rink: '⛸️' }[l]];
    if (/^(museum|attraction|zoo)$/.test(tr)) return ['fun', { museum: '🖼️', attraction: '📸', zoo: '🦁' }[tr]];
    if (/^(fast_food|cafe|fuel)$/.test(a)) return ['food', { fast_food: '🍔', cafe: '☕', fuel: '⛽' }[a]];
    if (a === 'place_of_worship') return ['worship', { jewish: '🕍', muslim: '🕌', christian: '⛪' }[t.religion] || '🛐'];
    return null;
  }

  var JOB_ICON = { 'yard work': '🌿', 'pet care': '🐾', cleaning: '🧽', babysitting: '🧸', 'moving help': '📦', tutoring: '📖' };

  /* ── helpers ──────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  var readJSON = function (k, d) { try { var v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) || window.currentUser || null; } catch (e) { return window.currentUser || null; } }
  var isDemo = function (u) { return !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || '')))); };
  var isLimited = function () { return document.body.classList.contains('tw-limited'); };
  var toast = function (m, t) { try { showToast(m, t || 'info'); } catch (e) {} };
  var note = function (m, e) { try { console.warn('job map:', m, e || ''); } catch (x) {} };
  var STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
    KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
    SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  var ABBR = {}; Object.keys(STATES).forEach(function (k) { ABBR[STATES[k].toLowerCase()] = k; });
  function stateName(s) { s = String(s || '').trim(); return STATES[s.toUpperCase()] || s; }
  function stateAbbr(s) { s = String(s || '').trim(); return ABBR[s.toLowerCase()] || s; }
  function townLabel(city, state) { return [String(city || '').trim(), stateAbbr(state)].filter(Boolean).join(', '); }

  function miles(a, b) {
    var R = 3958.8, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function distText(mi) {
    if (mi < 0.06) return 'right there';
    if (mi < 0.1) return 'about 1 block';
    return (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + ' mi';
  }
  function tripText(mi) {
    if (mi <= 2) return 'about a ' + Math.max(1, Math.round(mi * 20)) + ' min walk';
    if (mi <= 6) return 'about a ' + Math.max(1, Math.round(mi * 6)) + ' min bike ride';
    return 'about a ' + Math.max(1, Math.round(mi * 2.2)) + ' min drive';
  }
  function timeoutFetch(url, opts, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 10000);
    return fetch(url, Object.assign({}, opts || {}, ctl ? { signal: ctl.signal } : {})).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) { clearTimeout(t); throw e; });
  }

  /* ── geocoding (towns, the teen's home) — cached on the device ──── */
  var GEO_KEY = 'tw_geo_cache_v1', GEO_DAYS = 30, geoMem = readJSON(GEO_KEY, {}), geoInflight = {};
  function geoSave() {
    var keys = Object.keys(geoMem);
    if (keys.length > 120) keys.sort(function (a, b) { return geoMem[a][2] - geoMem[b][2]; }).slice(0, keys.length - 120).forEach(function (k) { delete geoMem[k]; });
    lsSet(GEO_KEY, JSON.stringify(geoMem));
  }
  function geocode(q) {
    q = String(q || '').replace(/\s+/g, ' ').trim();
    if (!q) return Promise.resolve(null);
    var key = q.toLowerCase(), hit = geoMem[key];
    if (hit && Date.now() - hit[2] < GEO_DAYS * 864e5) return Promise.resolve(hit[0] == null ? null : [hit[0], hit[1]]);
    if (geoInflight[key]) return geoInflight[key];
    var p = timeoutFetch(PHOTON + '?q=' + encodeURIComponent(q) + '&limit=3&lang=en&bbox=' + US_BBOX, null, 6000).then(function (j) {
      var f = ((j && j.features) || []).filter(function (x) { return x && x.geometry && (!x.properties || !x.properties.countrycode || x.properties.countrycode === 'US'); })[0];
      if (!f) throw new Error('no photon match');
      return [f.geometry.coordinates[1], f.geometry.coordinates[0]];
    }).catch(function (e) {
      note('photon lookup failed, trying nominatim', e);
      return timeoutFetch(NOMINATIM + '?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } }, 8000).then(function (j) {
        var r = j && j[0]; if (!r) return null;
        return [parseFloat(r.lat), parseFloat(r.lon)];
      });
    }).then(function (pt) {
      geoMem[key] = pt ? [pt[0], pt[1], Date.now()] : [null, null, Date.now() - (GEO_DAYS - 1) * 864e5];   // a miss is retried after a day
      geoSave();
      return pt;
    }, function (e) { note('town lookup failed', e); return null; }).then(function (pt) { delete geoInflight[key]; return pt; });
    geoInflight[key] = p;
    return p;
  }

  /* ── landmarks (Overpass), cached per map square for 7 days ─────── */
  var CLAT = 0.03, CLON = 0.04, MAX_CELLS = 9, LM_KEY = 'tw_landmarks_v1', LM_DAYS = 7, LM_MAX_CELLS = 40;
  var store = readJSON(LM_KEY, null); if (!store || !store.a || !store.b) store = { a: {}, b: {} };
  var mem = { a: {}, b: {} }, failedUntil = 0, chain = Promise.resolve();
  function cellOf(lat, lon) { return Math.floor(lat / CLAT) + ':' + Math.floor(lon / CLON); }
  function cellBox(key) { var p = key.split(':'), i = +p[0], j = +p[1]; return { s: i * CLAT, n: (i + 1) * CLAT, w: j * CLON, e: (j + 1) * CLON }; }
  function cellsIn(b) {
    var out = [], i0 = Math.floor(b.s / CLAT), i1 = Math.floor(b.n / CLAT), j0 = Math.floor(b.w / CLON), j1 = Math.floor(b.e / CLON);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) return null;                       // whole-country view: don't even list them
    for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) out.push(i + ':' + j);
    return out;
  }
  function have(tier, key) {
    if (mem[tier][key]) return true;
    var c = store[tier][key];
    if (c && Date.now() - c.t < LM_DAYS * 864e5) { mem[tier][key] = c.items; return true; }
    return false;
  }
  function saveStore() {
    ['a', 'b'].forEach(function (tier) {
      var keys = Object.keys(store[tier]);
      if (keys.length > LM_MAX_CELLS) keys.sort(function (x, y) { return store[tier][x].t - store[tier][y].t; }).slice(0, keys.length - LM_MAX_CELLS).forEach(function (k) { delete store[tier][k]; });
    });
    if (!lsSet(LM_KEY, JSON.stringify(store))) { store = { a: {}, b: {} }; lsSet(LM_KEY, JSON.stringify(store)); }   // full: start over
  }
  function query(tier, b) {
    var parts = [];
    KINDS.forEach(function (K) { if (K.tier === tier) K.f.forEach(function (f) { parts.push('nwr' + f + '["name"];'); }); });
    var bb = [b.s, b.w, b.n, b.e].map(function (x) { return x.toFixed(4); }).join(',');
    return '[out:json][timeout:25][bbox:' + bb + '];(' + parts.join('') + ');out center 1500;';
  }
  function parse(json) {
    var out = [], seen = {};
    ((json && json.elements) || []).forEach(function (el) {
      var t = el.tags || {}, name = String(t.name || '').trim(); if (!name) return;
      var lat = el.lat != null ? el.lat : el.center && el.center.lat, lon = el.lon != null ? el.lon : el.center && el.center.lon;
      if (lat == null || lon == null) return;
      var c = classify(t); if (!c) return;
      var dup = c[0] + '|' + name.toLowerCase() + '|' + Math.round(lat * 200) + '|' + Math.round(lon * 200);   // same place mapped twice (point + outline)
      if (seen[dup]) return; seen[dup] = 1;
      out.push([el.type.charAt(0) + el.id, name, c[0], c[1] || KIND[c[0]].e, +(+lat).toFixed(5), +(+lon).toFixed(5)]);
    });
    return out;
  }
  function fetchOverpass(q) {
    var i = 0;
    function attempt() {
      return timeoutFetch(OVERPASS[i], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'data=' + encodeURIComponent(q) }, 20000)
        .catch(function (e) { note('landmarks: ' + OVERPASS[i] + ' failed', e); i++; if (i < OVERPASS.length) return attempt(); throw e; });
    }
    return attempt();
  }
  // Make sure these squares are loaded. Resolves to 'ok', 'failed' or 'too-far'.
  function ensureCells(tier, keys, center) {
    if (!keys) return Promise.resolve('too-far');
    var missing = keys.filter(function (k) { return !have(tier, k); });
    if (!missing.length) return Promise.resolve('ok');
    if (Date.now() < failedUntil) return Promise.resolve('failed');
    if (missing.length > MAX_CELLS) {
      if (!center) return Promise.resolve('too-far');
      var mid = cellOf(center[0], center[1]).split(':').map(Number);
      missing.sort(function (x, y) { var a = x.split(':'), b = y.split(':'); return (Math.abs(a[0] - mid[0]) + Math.abs(a[1] - mid[1])) - (Math.abs(b[0] - mid[0]) + Math.abs(b[1] - mid[1])); });
      missing = missing.slice(0, MAX_CELLS);
    }
    var run = function () {
      missing = missing.filter(function (k) { return !have(tier, k); });     // another request may have brought them
      if (!missing.length) return 'ok';
      var b = { s: 90, n: -90, w: 180, e: -180 };
      missing.forEach(function (k) { var c = cellBox(k); b.s = Math.min(b.s, c.s); b.n = Math.max(b.n, c.n); b.w = Math.min(b.w, c.w); b.e = Math.max(b.e, c.e); });
      return fetchOverpass(query(tier, b)).then(function (json) {
        var items = parse(json), by = {};
        missing.forEach(function (k) { by[k] = []; });
        items.forEach(function (it) { var k = cellOf(it[4], it[5]); if (by[k]) by[k].push(it); });
        var now = Date.now();
        Object.keys(by).forEach(function (k) { mem[tier][k] = by[k]; store[tier][k] = { t: now, items: by[k] }; });
        saveStore();
        api.lastFetchCount = (api.lastFetchCount || 0) + 1;
        return 'ok';
      }, function (e) { failedUntil = Date.now() + 45000; note('landmarks could not load', e); return 'failed'; });
    };
    var p = chain.then(run, run);       // one request at a time (Overpass allows only a couple per person)
    chain = p.catch(function () {});
    return p;
  }
  function landmarksIn(tier, b) {
    var keys = cellsIn(b) || [], out = [];
    keys.forEach(function (k) { if (have(tier, k)) mem[tier][k].forEach(function (it) { if (it[4] >= b.s && it[4] <= b.n && it[5] >= b.w && it[5] <= b.e) out.push(it); }); });
    return out;
  }
  function boxAround(pt, mi) { var dLat = mi / 69, dLon = mi / (69 * Math.max(0.2, Math.cos(pt[0] * Math.PI / 180))); return { s: pt[0] - dLat, n: pt[0] + dLat, w: pt[1] - dLon, e: pt[1] + dLon }; }
  function ensureAround(pt, mi) { return ensureCells('a', cellsIn(boxAround(pt, mi || 0.9)), pt); }
  // The closest well-known landmarks to a point (at most 2 of a kind).
  function nearest(pt, n, skipId) {
    var list = landmarksIn('a', boxAround(pt, 1.5)).map(function (it) { var d = miles(pt, [it[4], it[5]]); return { it: it, d: d, score: d * (KIND[it[2]] ? KIND[it[2]].w : 1) }; })
      .filter(function (x) { return x.it[0] !== skipId && x.d <= 1.5; })
      .sort(function (a, b) { return a.score - b.score; });
    var per = {}, out = [];
    for (var i = 0; i < list.length && out.length < (n || 4); i++) {
      var k = list[i].it[2]; per[k] = (per[k] || 0) + 1;
      if (per[k] <= 2) out.push({ id: list[i].it[0], name: list[i].it[1], kind: k, icon: list[i].it[3], lat: list[i].it[4], lon: list[i].it[5], mi: list[i].d });
    }
    return out;
  }

  /* ── where things are ─────────────────────────────────────────── */
  function homeInfo() {
    var u = me(); if (!u || u.type !== 'teen') return null;
    var a = readJSON('tw_device_address_' + String(u.dataKey || u.email || '').toLowerCase(), null) || {};
    if (isDemo(u)) {   // the demo teen's sample address (demo logins only)
      try { if (typeof _userAddress !== 'undefined' && _userAddress) a = { street: _userAddress.street, zip: _userAddress.zip, city: _userAddress.city || u.city, state: u.state || 'Vermont' }; } catch (e) {}
    }
    var city = String(a.city || u.city || '').trim(), state = stateName(a.state || u.state || ''), street = String(a.street || '').trim(), zip = String(a.zip || '').trim();
    if (!city && !zip) return null;
    var town = city ? city + (state ? ', ' + state : '') : zip;
    return { full: street ? [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '', town: town, label: city ? townLabel(city, state) : zip, exact: !!street };
  }
  function homePoint() {
    var h = homeInfo(); if (!h) return Promise.resolve(null);
    return (h.full ? geocode(h.full) : Promise.resolve(null)).then(function (pt) {
      if (pt) return { pt: pt, info: h, exact: true };
      return geocode(h.town).then(function (p2) { return p2 ? { pt: p2, info: h, exact: false } : null; });
    });
  }
  function jobTownQuery(j) { return [String(j.city || '').trim(), stateName(j.state)].filter(Boolean).join(', '); }
  function jobPoint(j) {
    if (j && j.landmark && isFinite(j.landmark.lat) && isFinite(j.landmark.lon)) return Promise.resolve({ pt: [+j.landmark.lat, +j.landmark.lon], exact: true });
    var q = jobTownQuery(j); if (!q) return Promise.resolve(null);
    return geocode(q).then(function (pt) { return pt ? { pt: pt, exact: false } : null; });
  }
  // Same rule as real-data-v43: ids 1–12 are the built-in sample jobs, shown to demo logins only
  // (the admin and real accounts never see them, even before real-data-v43 has pruned the lists).
  var isSampleJob = function (j) { return !!j && typeof j.id === 'number' && j.id >= 1 && j.id <= 12; };
  function jobLists() {
    var open = [], applied = [], posted = [], demo = isDemo(me());
    var ok = function (j) { return !!j && (demo || !isSampleJob(j)); };
    try { var ids = new Set(demoJobs.map(function (j) { return j && j.id; })); open = browsableJobs.filter(function (j) { return ok(j) && !ids.has(j.id); }); applied = demoJobs.filter(ok); } catch (e) {}
    try { posted = employerPostedJobs.filter(ok); } catch (e) {}
    return { open: open, applied: applied, posted: posted };
  }
  function findJob(id) {
    var L = jobLists(), all = L.open.concat(L.applied, L.posted);
    for (var i = 0; i < all.length; i++) if (String(all[i].id) === String(id)) return all[i];
    return null;
  }
  function payText(j) { return j.pay ? '$' + j.pay + (j.payType === 'hourly' ? '/hr' : ' flat') : ''; }

  /* ── Leaflet, loaded only when a map is opened ──────────────────── */
  var leafletP = null;
  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    if (!document.getElementById('twlm-leaflet-css')) {
      var css = document.createElement('link'); css.id = 'twlm-leaflet-css'; css.rel = 'stylesheet'; css.href = LEAFLET_CSS[0];
      css.integrity = SRI_CSS; css.crossOrigin = 'anonymous';
      css.onerror = function () { css.onerror = null; css.href = LEAFLET_CSS[1]; };
      document.head.appendChild(css);
    }
    leafletP = new Promise(function (resolve, reject) {
      var i = 0;
      (function next() {
        if (i >= LEAFLET_JS.length) { leafletP = null; reject(new Error('map library did not load')); return; }
        var s = document.createElement('script'), done = false;
        s.src = LEAFLET_JS[i]; s.integrity = SRI_JS; s.crossOrigin = 'anonymous'; s.async = true;
        var fail = function () { if (done) return; done = true; clearTimeout(to); s.remove(); i++; next(); };
        var to = setTimeout(fail, 12000);
        s.onload = function () { if (done) return; done = true; clearTimeout(to); if (window.L && window.L.map) resolve(window.L); else { i++; next(); } };
        s.onerror = fail;
        document.head.appendChild(s);
      })();
    });
    return leafletP;
  }
  function lmIcon(L, it) {
    var K = KIND[it[2]] || KINDS[0];
    return L.divIcon({ className: 'twlm-lm-wrap', html: '<span class="twlm-lm" style="--c:' + K.c + '">' + it[3] + '</span>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }
  function jobIcon(L, j, applied) {
    return L.divIcon({ className: 'twlm-job-wrap', html: '<span class="twlm-job' + (applied ? ' applied' : '') + '"><b>' + (JOB_ICON[String(j.type || '').toLowerCase()] || '💼') + '</b></span>', iconSize: [34, 42], iconAnchor: [17, 40], popupAnchor: [0, -36] });
  }
  function homeIcon(L, label) {
    return L.divIcon({ className: 'twlm-home-wrap', html: '<span class="twlm-home">' + (label || '🏠') + '</span>', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] });
  }

  /* ── styles ───────────────────────────────────────────────────── */
  function injectCss() {
    if ($('job-map-landmarks-v44-css')) return;
    var st = document.createElement('style'); st.id = 'job-map-landmarks-v44-css';
    st.textContent = [
      '.twlm{font-family:"DM Sans",system-ui,sans-serif;color:var(--text)}',
      '.twlm-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:0 0 8px}',
      '.twlm-where{font-weight:700;color:var(--green);font-size:.9rem}',
      '.twlm-btn{font-family:inherit;font-size:.8rem;font-weight:700;border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:999px;padding:6px 12px;min-height:34px;cursor:pointer}',
      '.twlm-btn:hover{border-color:var(--green)}',
      '.twlm-chips{display:flex;gap:6px;overflow-x:auto;padding:0 0 6px;margin:0 0 6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}',
      '.twlm-chip{flex:0 0 auto;font-family:inherit;font-size:.76rem;font-weight:600;border:1.5px solid var(--border);background:var(--card);color:var(--muted);border-radius:999px;padding:5px 10px;min-height:32px;cursor:pointer;opacity:.75}',
      '.twlm-chip.on{border-color:var(--c);color:var(--text);opacity:1;background:color-mix(in srgb,var(--c) 12%,var(--card))}',
      '.twlm-msg{font-size:.84rem;line-height:1.5;border-radius:10px;padding:9px 12px;margin:0 0 8px;background:var(--green-pale,#e8f5ee);color:var(--text)}',
      '.twlm-msg.amber{background:#fff7e6;color:#7a4a00}html.dark .twlm-msg.amber{background:#3a2c10;color:#f5d48b}',
      '.twlm-box{position:relative;border:1.5px solid var(--border);border-radius:14px;overflow:hidden;isolation:isolate;background:#e9eee8}',
      'html.dark .twlm-box{background:#1d2622}',
      '.twlm-map{height:clamp(320px,58vh,520px);width:100%;font-family:inherit}',
      '.twlm-box .twlm-status{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:var(--card);color:var(--text);border-radius:999px;padding:5px 12px;font-size:.78rem;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,.15);white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis}',
      '.twlm-box .twlm-status:empty{display:none}',
      '.twlm-box .twlm-status:has(button){white-space:normal;text-align:center;border-radius:14px;line-height:1.45}',
      '.twlm-status button{font:inherit;border:none;background:none;color:var(--green);font-weight:800;cursor:pointer;padding:0 0 0 6px}',
      'html.dark .twlm .leaflet-tile-pane,html.dark #twlm-sheet .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.92) contrast(.9) saturate(.55)}',
      '.twlm .leaflet-container,#twlm-sheet .leaflet-container{font-family:"DM Sans",system-ui,sans-serif}',
      '.twlm-lm-wrap,.twlm-job-wrap,.twlm-home-wrap{background:none;border:none}',
      '.twlm-lm{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--c);font-size:14px;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.25)}',
      '.twlm-job{position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--green,#2d6a4f);border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3)}',
      '.twlm-job.applied{background:var(--blue,#2563eb)}',
      '.twlm-job b{transform:rotate(45deg);font-size:16px;line-height:1}',
      '.twlm-home{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#fff;border:3px solid var(--amber,#d97706);font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
      '.twlm-pop{font-size:.82rem;line-height:1.45;min-width:180px;max-width:240px}',
      '.twlm-pop b{font-size:.9rem}',
      '.twlm-pop .sub{color:#555}',
      '.twlm-pop .near{margin:6px 0;padding:6px 8px;background:#f1f5f2;border-radius:8px;font-size:.78rem}',
      '.twlm-pop button{font-family:inherit;font-weight:700;font-size:.8rem;border-radius:8px;padding:6px 10px;margin:4px 4px 0 0;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:var(--green,#2d6a4f);color:#fff}',
      '.twlm-pop button.alt{background:#fff;color:var(--green,#2d6a4f)}',
      '.twlm-close{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}',
      '.twlm-close .twlm-chip{opacity:1;color:var(--text)}',
      '.twlm-foot{font-size:.72rem;color:var(--muted);margin:6px 0 0;line-height:1.45}',
      '.twlm-near{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.8rem;color:var(--text);background:var(--blue-pale,#eaf1fe);border-radius:8px;padding:5px 9px;margin:0 0 8px}',
      '.btn-sm.twlm-where-btn{background:var(--blue-pale,#eaf1fe);color:var(--blue,#2563eb);border:1px solid #b9cdfa;font-size:.74rem}',
      '#twlm-sheet{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",system-ui,sans-serif}',
      '#twlm-sheet .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:480px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;border-radius:18px;padding:18px 18px 16px;box-shadow:0 12px 48px rgba(0,0,0,.3);position:relative}',
      '#twlm-sheet h2{margin:0 30px 4px 0;font-family:"Fraunces",Georgia,serif;font-size:1.2rem;color:var(--green,#2d6a4f);line-height:1.3}',
      '#twlm-sheet .x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted,#6b7280);padding:6px}',
      '#twlm-sheet .meta{font-size:.84rem;color:var(--muted,#6b7280);margin:0 0 10px}',
      '#twlm-sheet .mini{height:210px;border-radius:12px;overflow:hidden;border:1.5px solid var(--border,#e5e7eb);isolation:isolate;background:#e9eee8;margin:0 0 10px}',
      '#twlm-sheet .mini.off{display:none}',
      '#twlm-sheet .lead{font-size:.88rem;line-height:1.5;margin:0 0 6px}',
      '#twlm-sheet ul{list-style:none;margin:0 0 10px;padding:0}',
      '#twlm-sheet li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border,#e5e7eb);font-size:.88rem}',
      '#twlm-sheet li:last-child{border-bottom:none}',
      '#twlm-sheet li .d{margin-left:auto;color:var(--muted,#6b7280);font-size:.8rem;white-space:nowrap}',
      '#twlm-sheet .home{font-size:.86rem;background:#fff7e6;color:#7a4a00;border-radius:10px;padding:8px 10px;margin:0 0 12px;line-height:1.45}',
      'html.dark #twlm-sheet .home{background:#3a2c10;color:#f5d48b}',
      '#twlm-sheet .wait{font-size:.84rem;color:var(--muted,#6b7280);margin:0 0 10px}',
      '#twlm-sheet .acts{display:flex;gap:8px;flex-wrap:wrap}',
      '#twlm-sheet .acts button{flex:1 1 160px;font-family:inherit;font-weight:700;font-size:.92rem;border-radius:10px;padding:11px 14px;min-height:44px;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:transparent;color:var(--green,#2d6a4f)}',
      '#twlm-sheet .acts button.pri{background:var(--green,#2d6a4f);color:#fff}',
      '.twlm-pick select{width:100%}',
      '.twlm-pick .twlm-hint{font-size:.76rem;color:var(--muted);margin-top:5px;line-height:1.4;text-transform:none;letter-spacing:0;font-weight:400}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ═══ 1. THE JOB MAP ═══════════════════════════════════════════ */
  var views = {};
  var KINDS_KEY = 'tw_landmark_kinds_v1';
  var hiddenKinds = readJSON(KINDS_KEY, {});

  function fixPanelText() {
    var p = document.querySelector('#ttab-map > div p');
    if (p && !p.dataset.twlm) { p.dataset.twlm = '1'; p.textContent = 'Parks, schools, libraries and stores help you see where each job is. Job pins show the town, or the landmark the employer picked. Never a home address.'; }
  }

  function buildView(host, cid) {
    var v = { cid: cid, host: host, centered: '', jobsSig: null, markers: {}, jobLayer: null, lmLayer: null, homeLayer: null, map: null };
    host.innerHTML = '<div class="twlm" data-twlm="' + esc(cid) + '">' +
      '<div class="twlm-top"><div class="twlm-where">📍 Finding your area…</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="twlm-btn" data-a="locate">📍 Use where I am</button><button type="button" class="twlm-btn" data-a="home">🏠 Home</button></div></div>' +
      '<div class="twlm-msgs"></div>' +
      '<div class="twlm-chips" role="group" aria-label="Show landmarks">' + KINDS.map(function (K) {
        return '<button type="button" class="twlm-chip' + (hiddenKinds[K.k] ? '' : ' on') + '" data-k="' + K.k + '" style="--c:' + K.c + '" aria-pressed="' + (hiddenKinds[K.k] ? 'false' : 'true') + '">' + K.e + ' ' + esc(K.label) + '</button>';
      }).join('') + '</div>' +
      '<div class="twlm-box"><div class="twlm-map"></div><div class="twlm-status" aria-live="polite"></div></div>' +
      '<div class="twlm-close"></div>' +
      '<div class="twlm-foot">Landmarks and map: © OpenStreetMap contributors. Zoom in to see more places.</div></div>';
    v.root = host.firstChild;
    v.root.addEventListener('click', function (e) {
      var chip = e.target.closest('.twlm-chip[data-k]'), btn = e.target.closest('[data-a]'), go = e.target.closest('[data-go]');
      if (chip && chip.parentNode.classList.contains('twlm-chips')) {
        var k = chip.dataset.k, on = !chip.classList.contains('on');
        chip.classList.toggle('on', on); chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) delete hiddenKinds[k]; else hiddenKinds[k] = 1;
        lsSet(KINDS_KEY, JSON.stringify(hiddenKinds));
        drawLandmarks(v);
      } else if (btn && btn.dataset.a === 'locate') locate(v);
      else if (btn && btn.dataset.a === 'home') { v.centered = ''; centerView(v, true); }
      else if (btn && btn.dataset.a === 'retry') { failedUntil = 0; if (v.mapFailed || !v.map) { delete views[v.cid]; renderJobMap(v.cid); } else loadForView(v); }
      else if (go && v.map) { v.map.setView([+go.dataset.lat, +go.dataset.lon], Math.max(v.map.getZoom(), 16)); }
    });
    return v;
  }
  function status(v, html) { var s = v.root.querySelector('.twlm-status'); if (s) s.innerHTML = html || ''; }

  function messages(v) {
    var u = me(), out = [], L = jobLists();
    var jobs = u && u.type === 'teen' ? L.open : L.open.concat(L.posted);
    if (u && u.type === 'teen' && isLimited()) out.push('<div class="twlm-msg amber">🔒 <b>Limited mode.</b> You can explore the map and see where jobs are. Link a parent to apply.</div>');
    if (!jobs.length) out.push(u && u.type === 'teen'
      ? '<div class="twlm-msg">🔎 <b>No jobs posted near you yet.</b> The map still shows parks, schools, libraries and stores, so when a job shows up you will know where it is.</div>'
      : '<div class="twlm-msg">🔎 <b>No jobs posted yet.</b> Zoom in on a town to see its landmarks.</div>');
    if (u && u.type === 'teen' && !homeInfo()) out.push('<div class="twlm-msg amber">🏠 Add your town in <b>Profile → Your Address</b> to see landmarks near your home, or tap <b>📍 Use where I am</b>.</div>');
    v.root.querySelector('.twlm-msgs').innerHTML = out.join('');
  }

  function refreshView(v) {
    messages(v);
    if (!v.map) {
      status(v, 'Loading the map…');
      clearTimeout(v.mapSlowT);
      v.mapSlowT = setTimeout(function () { if (!v.map && !v.mapFailed) status(v, 'The map is taking longer than usual to load.<button type="button" data-a="retry">Try again</button>'); }, SLOW_MS);
    }
    loadLeaflet().then(function (L) {
      clearTimeout(v.mapSlowT);
      if (!document.body.contains(v.root)) return;
      if (!v.map) {
        status(v, '');
        var el = v.root.querySelector('.twlm-map');
        v.map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView(US_CENTER, 4);
        L.tileLayer(TILES, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(v.map);
        v.lmLayer = L.layerGroup().addTo(v.map);
        v.jobLayer = L.layerGroup().addTo(v.map);
        v.homeLayer = L.layerGroup().addTo(v.map);
        var t = null;
        v.map.on('moveend zoomend', function () { clearTimeout(t); t = setTimeout(function () { loadForView(v); }, 450); });
        if (typeof ResizeObserver === 'function') { v.ro = new ResizeObserver(function () { try { v.map.invalidateSize(); } catch (e) {} }); v.ro.observe(el); }
        [80, 400].forEach(function (ms) { setTimeout(function () { try { v.map.invalidateSize(); } catch (e) {} }, ms); });
      } else { try { v.map.invalidateSize(); } catch (e) {} }
      drawJobs(v);
      centerView(v, false);
    }, function (e) {
      clearTimeout(v.mapSlowT);
      status(v, '');
      note('map library failed', e);
      var box = v.root.querySelector('.twlm-box');
      box.querySelector('.twlm-map').style.height = 'auto';
      box.querySelector('.twlm-map').innerHTML = '<div style="padding:1.4rem 1rem;text-align:center;color:var(--muted);font-size:.88rem;line-height:1.55">🗺️ The map could not load. Check your internet connection.<br><button type="button" class="twlm-btn" data-a="retry" style="margin-top:8px">Try again</button></div>';
      v.mapFailed = true;
      homePoint().then(function (h) { if (h) { setWhere(v, h); closestList(v, h.pt); } });
    });
  }

  function setWhere(v, h) {
    var w = v.root.querySelector('.twlm-where');
    if (w) w.textContent = h ? '📍 Around ' + (h.exact ? 'your home in ' : '') + h.info.label : (me() && me().type === 'teen' ? '📍 Jobs and landmarks' : '📍 Jobs on TeenWork');
  }

  function centerView(v, force) {
    var u = me(), sig = (u && u.email || '') + '|' + JSON.stringify(homeInfo());
    if (!force && v.centered === sig) { loadForView(v); return; }
    v.centered = sig;
    homePoint().then(function (h) {
      if (!v.map) return;
      v.homeLayer.clearLayers();
      setWhere(v, h);
      if (h) {
        if (h.exact) L_marker(v.homeLayer, h.pt, homeIcon(window.L), '<div class="twlm-pop"><b>🏠 Home</b><div class="sub">Only you can see this.</div></div>');
        v.home = h;
        v.map.setView(h.pt, h.exact ? 14 : 13);
        closestList(v, h.pt);
      } else {
        v.home = null;
        var pts = Object.keys(v.markers).map(function (k) { return v.markers[k].getLatLng(); });
        if (pts.length) v.map.fitBounds(window.L.latLngBounds(pts).pad(0.3), { maxZoom: 14 });
        else v.map.setView(US_CENTER, 4);
      }
      loadForView(v);
    });
  }
  function L_marker(layer, pt, icon, popup) { var m = window.L.marker(pt, { icon: icon, keyboard: false }); if (popup) m.bindPopup(popup); layer.addLayer(m); return m; }

  function locate(v) {
    if (!navigator.geolocation) { toast('Your browser can\'t share your location.', 'info'); return; }
    status(v, 'Finding where you are…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      status(v, '');
      if (!v.map) return;
      var pt = [pos.coords.latitude, pos.coords.longitude];
      v.homeLayer.clearLayers();
      L_marker(v.homeLayer, pt, homeIcon(window.L, '📍'), '<div class="twlm-pop"><b>📍 You are here</b><div class="sub">Not saved anywhere.</div></div>');
      v.map.setView(pt, 15);
      closestList(v, pt);
    }, function () { status(v, ''); toast('Location is off. Add your town in Profile instead.', 'info'); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  function loadForView(v) {
    if (!v.map) return;
    clearTimeout(v.slowT);
    var z = v.map.getZoom(), b = v.map.getBounds().pad(0.15), box = { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() };
    var c = v.map.getCenter(), center = [c.lat, c.lng];
    if (z < TIER_ZOOM.a) { drawLandmarks(v); status(v, '🔍 Zoom in to see landmarks'); return; }
    var tiers = ['a'].concat(z >= TIER_ZOOM.b ? ['b'] : []);
    var need = tiers.some(function (t) { var ks = cellsIn(box); return !ks || ks.some(function (k) { return !have(t, k); }); });
    var seq = (v.seq = (v.seq || 0) + 1);
    if (need) {
      status(v, 'Loading landmarks…');
      v.slowT = setTimeout(function () { if (seq === v.seq) status(v, 'Couldn\'t load landmarks yet. The map and jobs still work.<button type="button" data-a="retry">Try again</button>'); }, SLOW_MS);
    }
    drawLandmarks(v);
    Promise.all(tiers.map(function (t) { return ensureCells(t, cellsIn(box), center); })).then(function (rs) {
      if (seq !== v.seq) return;
      clearTimeout(v.slowT);
      drawLandmarks(v);
      if (rs.indexOf('failed') >= 0) status(v, 'Landmarks couldn\'t load right now.<button type="button" data-a="retry">Try again</button>');
      else status(v, '');
      if (v.home) closestList(v, v.home.pt);
    });
  }

  function drawLandmarks(v) {
    if (!v.map || !v.lmLayer) return;
    var L = window.L, z = v.map.getZoom(), b = v.map.getBounds().pad(0.2), box = { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() };
    var items = [];
    if (z >= TIER_ZOOM.a) items = landmarksIn('a', box);
    if (z >= TIER_ZOOM.b) items = items.concat(landmarksIn('b', box));
    items = items.filter(function (it) { return !hiddenKinds[it[2]]; });
    if (items.length > 400) items = items.sort(function (x, y) { return (KIND[x[2]].w - KIND[y[2]].w); }).slice(0, 400);
    var want = {}; items.forEach(function (it) { want[it[0]] = it; });
    v.lm = v.lm || {};
    Object.keys(v.lm).forEach(function (id) { if (!want[id]) { v.lmLayer.removeLayer(v.lm[id]); delete v.lm[id]; } });
    items.forEach(function (it) {
      if (v.lm[it[0]]) return;
      var K = KIND[it[2]];
      var m = L.marker([it[4], it[5]], { icon: lmIcon(L, it), keyboard: false, title: it[1], zIndexOffset: -100 });
      m.bindPopup('<div class="twlm-pop"><b>' + it[3] + ' ' + esc(it[1]) + '</b><div class="sub">' + esc(K.label) + '</div></div>');
      v.lm[it[0]] = m; v.lmLayer.addLayer(m);
    });
    v.root.dataset.landmarks = String(Object.keys(v.lm).length);
  }

  function closestList(v, pt) {
    var box = v.root.querySelector('.twlm-close'); if (!box) return;
    ensureAround(pt, 1).then(function () {
      var near = nearest(pt, 6);
      box.innerHTML = near.length ? '<span style="font-size:.78rem;color:var(--muted);align-self:center">Closest landmarks:</span>' + near.map(function (n) {
        return '<button type="button" class="twlm-chip" data-go="1" data-lat="' + n.lat + '" data-lon="' + n.lon + '" style="--c:' + KIND[n.kind].c + '">' + n.icon + ' ' + esc(n.name) + ' · ' + distText(n.mi) + '</button>';
      }).join('') : '';
    });
  }

  function drawJobs(v) {
    var L = window.L, u = me(), lists = jobLists();
    var isTeen = u && u.type === 'teen';
    var jobs = isTeen ? lists.open.map(function (j) { return { j: j, applied: false }; }).concat(lists.applied.map(function (j) { return { j: j, applied: true }; }))
                      : lists.open.concat(lists.posted).map(function (j) { return { j: j, applied: false }; });
    var seen = {}; jobs = jobs.filter(function (x) { var k = String(x.j.id); if (seen[k]) return false; seen[k] = 1; return true; });
    var sig = jobs.map(function (x) { return x.j.id + (x.applied ? 'a' : 'o') + (x.j.landmark ? x.j.landmark.id : ''); }).join(',');
    messages(v);
    if (sig === v.jobsSig) return;
    v.jobsSig = sig;
    v.jobLayer.clearLayers(); v.markers = {};
    var byTown = {};
    Promise.all(jobs.map(function (x) { return jobPoint(x.j).then(function (p) { return { x: x, p: p }; }); })).then(function (res) {
      if (v.jobsSig !== sig) return;
      res.forEach(function (r) { if (r.p && !r.p.exact) { var k = r.p.pt.join(','); (byTown[k] = byTown[k] || []).push(r); } });
      Object.keys(byTown).forEach(function (k) {     // several jobs in one town: spread them a little around its middle
        var g = byTown[k]; if (g.length < 2) return;
        g.forEach(function (r, i) { var a = 2 * Math.PI * i / g.length, d = 0.0022; r.pt = [r.p.pt[0] + d * Math.sin(a), r.p.pt[1] + d * 1.35 * Math.cos(a)]; });
      });
      res.forEach(function (r) {
        if (!r.p) return;
        var j = r.x.j, m = L.marker(r.pt || r.p.pt, { icon: jobIcon(L, j, r.x.applied), title: j.title, riseOnHover: true });
        m.bindPopup(function () { return jobPopup(j, r.p, r.x.applied); }, { maxWidth: 260 });
        v.jobLayer.addLayer(m); v.markers[j.id] = m;
      });
      v.root.dataset.jobs = String(Object.keys(v.markers).length);
      if (!v.home && v.centered && Object.keys(v.markers).length && v.map.getZoom() < 6) {
        v.map.fitBounds(L.latLngBounds(Object.keys(v.markers).map(function (k) { return v.markers[k].getLatLng(); })).pad(0.3), { maxZoom: 14 });
      }
    });
  }

  function jobPopup(j, p, applied) {
    var u = me(), d = document.createElement('div'); d.className = 'twlm-pop';
    d.innerHTML = '<b>' + esc(j.title) + '</b><div class="sub">' + esc([j.employer, payText(j)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="sub">📍 ' + (j.landmark ? 'Near ' + esc(j.landmark.icon || '') + ' ' + esc(j.landmark.name) : 'Somewhere in ' + esc(townLabel(j.city, j.state))) + '</div>' +
      '<div class="near">Finding landmarks…</div>';
    var near = d.querySelector('.near');
    ensureAround(p.pt).then(function () {
      var n = nearest(p.pt, 3, j.landmark && j.landmark.id);
      if (!n.length) { near.remove(); return; }
      near.innerHTML = (p.exact ? 'Close by: ' : 'In the middle of town: ') + n.map(function (x) { return x.icon + ' ' + esc(x.name) + ' (' + distText(x.mi) + ')'; }).join(', ');
    });
    if (applied) { var a = document.createElement('div'); a.className = 'sub'; a.textContent = '✅ You applied to this job.'; d.appendChild(a); }
    else if (u && u.type === 'teen') {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = isLimited() ? '🔒 Where is it & apply' : 'Where is it & apply';
      b.addEventListener('click', function () { api.openSheet(j.id); });
      d.appendChild(b);
    }
    return d;
  }

  function renderJobMap(cid) {
    var host = $(cid); if (!host) return;
    injectCss(); fixPanelText();
    var v = views[cid];
    if (!v || !v.root || v.root.parentNode !== host || !document.body.contains(v.root)) {
      if (v && v.map) { try { v.map.remove(); } catch (e) {} if (v.ro) v.ro.disconnect(); }
      v = views[cid] = buildView(host, cid);
    }
    refreshView(v);
  }
  renderJobMap.__twlm = true;
  function install() { if (!window.renderJobMap || !window.renderJobMap.__twlm) window.renderJobMap = renderJobMap; }
  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);

  /* ═══ 2. "WHERE THIS JOB IS" WHEN APPLYING ═══════════════════════ */
  var sheetMap = null;
  function closeSheet() {
    var s = $('twlm-sheet'); if (!s) return;
    if (sheetMap) { try { sheetMap.remove(); } catch (e) {} sheetMap = null; }
    s.remove();
  }
  api.closeSheet = closeSheet;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('twlm-sheet') && !$('tw35-modal')) closeSheet(); });

  api.openSheet = function (id, opts) {
    opts = opts || {};
    var j = findJob(id); if (!j) return false;
    injectCss(); closeSheet();
    var applied = jobLists().applied.some(function (x) { return String(x.id) === String(id); });
    var title = j.title || 'this job', limited = isLimited();
    var s = document.createElement('div'); s.id = 'twlm-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-label', 'Where this job is');
    s.innerHTML = '<div class="sheet"><button type="button" class="x" aria-label="Close">✕</button>' +
      '<h2>' + (applied ? '📍 Where this job is' : '📍 Before you apply: where this job is') + '</h2>' +
      '<div class="meta"><b style="color:var(--text)">' + esc(title) + '</b><br>' + esc([j.employer, payText(j), townLabel(j.city, j.state)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="mini"></div><div class="body"><div class="wait">Finding landmarks near this job…</div></div>' +
      '<div class="acts">' + (applied ? '<button type="button" class="pri" data-a="close">Done</button>' :
        '<button type="button" class="pri" data-a="send">' + (limited ? '🔒 Link a parent to apply' : (opts.label || '✅ Send application')) + '</button><button type="button" data-a="close">Cancel</button>') + '</div></div>';
    s.addEventListener('mousedown', function (e) { if (e.target === s) closeSheet(); });
    s.querySelector('.x').addEventListener('click', closeSheet);
    s.querySelector('.acts').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') { closeSheet(); return; }
      if (isLimited()) { if (typeof window.twOpenLinkModal === 'function') window.twOpenLinkModal(); return; }
      closeSheet();
      try { window.teenApply(j.id, j.title); } catch (err) { note('apply failed', err); }
    });
    document.body.appendChild(s);
    var body = s.querySelector('.body'), mini = s.querySelector('.mini');

    Promise.all([jobPoint(j), homePoint()]).then(function (r) {
      var p = r[0], h = r[1];
      if (!$('twlm-sheet') || s !== $('twlm-sheet')) return;
      if (!p) { mini.classList.add('off'); body.innerHTML = '<p class="lead">We couldn\'t find ' + esc(townLabel(j.city, j.state) || 'this job\'s town') + ' on the map right now. Ask the employer where the job is before your first shift.</p>'; return; }
      var lead = j.landmark
        ? '<p class="lead">📍 The employer says this job is near <b>' + esc((j.landmark.icon || '') + ' ' + j.landmark.name) + '</b>.</p>'
        : '<p class="lead">📍 The employer didn\'t pin an exact spot, so this shows the middle of <b>' + esc(townLabel(j.city, j.state)) + '</b>. Ask them for the address before your first shift.</p>';
      var homeLine = '';
      if (h) {
        var mi = miles(h.pt, p.pt);
        homeLine = '<div class="home">🏠 ' + (p.exact && h.exact ? 'About <b>' + distText(mi) + '</b> from your home, ' + tripText(mi) + '.' :
          'About <b>' + distText(mi) + '</b> from ' + (h.exact ? 'your home' : 'your town') + ' (' + tripText(mi) + '). The exact trip depends on the address.') +
          ' Check how you\'ll get there with your parent.</div>';
      }
      body.innerHTML = lead + '<div class="wait">Finding landmarks near this job…</div>' + homeLine;
      drawMini(mini, p, h, j);
      ensureAround(p.pt).then(function (res) {
        if (s !== $('twlm-sheet')) return;
        var n = nearest(p.pt, 4, j.landmark && j.landmark.id), w = body.querySelector('.wait');
        if (!n.length) { w.textContent = res === 'failed' ? 'Landmarks couldn\'t load right now. You can still apply.' : 'No well-known landmarks close to this spot.'; return; }
        var ul = document.createElement('ul'); ul.setAttribute('aria-label', 'Landmarks near this job');
        ul.innerHTML = n.map(function (x) { return '<li><span>' + x.icon + '</span><span>' + esc(x.name) + '</span><span class="d">' + distText(x.mi) + '</span></li>'; }).join('');
        w.outerHTML = '<p class="lead" style="margin-top:6px"><b>Landmarks ' + (p.exact ? 'near this job' : 'in the middle of town') + ':</b></p>' + ul.outerHTML;
        mini._twNear = n; if (sheetMap) addMiniLandmarks(n);
      });
    });
    return true;
  };

  function drawMini(mini, p, h, j) {
    loadLeaflet().then(function (L) {
      if (!document.body.contains(mini)) return;
      sheetMap = L.map(mini, { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(p.pt, p.exact ? 16 : 15);
      L.tileLayer(TILES, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(sheetMap);
      L.marker(p.pt, { icon: jobIcon(L, j, false), title: j.title, zIndexOffset: 500 }).addTo(sheetMap);
      if (h && h.exact && miles(h.pt, p.pt) < 3) {
        L.marker(h.pt, { icon: homeIcon(L) }).addTo(sheetMap);
        sheetMap.fitBounds(L.latLngBounds([p.pt, h.pt]).pad(0.25), { maxZoom: 16 });
      }
      sheetMap._twJob = p.pt;
      if (mini._twNear) addMiniLandmarks(mini._twNear);     // the landmarks arrived first
      setTimeout(function () { try { sheetMap && sheetMap.invalidateSize(); } catch (e) {} }, 60);
    }, function () { mini.classList.add('off'); });
  }
  function addMiniLandmarks(n) {
    var L = window.L; if (!L || !sheetMap) return;
    var pts = [sheetMap._twJob];
    n.forEach(function (x) { L.marker([x.lat, x.lon], { icon: lmIcon(L, [x.id, x.name, x.kind, x.icon, x.lat, x.lon]), title: x.name }).bindTooltip(x.name).addTo(sheetMap); pts.push([x.lat, x.lon]); });
    try { sheetMap.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 16 }); } catch (e) {}
  }

  // "Apply Now" buttons (job cards, AI matches) open the sheet first. In limited mode the
  // v35 parent-link gate runs before this listener and stops the click, as before.
  var APPLY_RE = /(?:^|[^A-Za-z0-9_$])teenApply\(\s*([0-9]+)/;
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[onclick]') : null;
    if (!t || t.closest('#twlm-sheet')) return;
    var m = APPLY_RE.exec(t.getAttribute('onclick') || ''); if (!m) return;
    var u = me(); if (!u || u.type !== 'teen') return;
    var j = findJob(m[1]); if (!j || jobLists().applied.some(function (x) { return String(x.id) === m[1]; })) return;
    e.preventDefault(); e.stopImmediatePropagation();
    api.openSheet(m[1], { label: (t.textContent || '').indexOf('parent OK') >= 0 ? '✅ Send (needs parent OK)' : '' });
  }, true);

  /* ── job cards: "📍 Near <landmark>" and a "🗺️ Where is it?" button ── */
  function decorateCards() {
    document.querySelectorAll('#browse-jobs-list .browse-card:not([data-twlm])').forEach(function (card) {
      var btn = card.querySelector('[onclick*="teenApply("]'), m = btn ? APPLY_RE.exec(btn.getAttribute('onclick') || '') : null;
      card.dataset.twlm = '1';
      if (!m) return;
      var j = findJob(m[1]); if (!j) return;
      if (j.landmark && j.landmark.name) {
        var near = document.createElement('div'); near.className = 'twlm-near';
        near.textContent = '📍 Near ' + (j.landmark.icon ? j.landmark.icon + ' ' : '') + j.landmark.name;
        var head = card.querySelector('.browse-card-head'); if (head) head.insertAdjacentElement('afterend', near);
      }
      var acts = card.querySelector('.browse-actions');
      if (acts && !acts.querySelector('.twlm-where-btn')) {
        var w = document.createElement('button'); w.type = 'button'; w.className = 'btn-sm twlm-where-btn'; w.textContent = '🗺️ Where is it?';
        w.addEventListener('click', function () { api.openSheet(m[1]); });
        btn.insertAdjacentElement('afterend', w);
      }
    });
  }
  var decoT = null;
  new MutationObserver(function () { if (decoT) return; decoT = setTimeout(function () { decoT = null; decorateCards(); }, 60); })
    .observe(document.documentElement, { childList: true, subtree: true });

  /* ═══ 3. EMPLOYERS: "NEAREST LANDMARK" ON POST JOB ════════════════ */
  var pick = { town: '', items: [], loading: null };
  function ensurePicker() {
    var city = $('emp-city'); if (!city || $('emp-landmark')) return;
    var row = city.closest('.form-row'); if (!row) return;
    injectCss();
    var g = document.createElement('div'); g.className = 'form-group twlm-pick';
    g.innerHTML = '<label for="emp-landmark">📍 Nearest landmark <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label>' +
      '<select id="emp-landmark"><option value="">Pick the city and state first</option></select>' +
      '<div class="twlm-hint">Teens see “near this landmark” on the job instead of your address, so they know roughly where it is.</div>';
    row.insertAdjacentElement('afterend', g);
    var sel = $('emp-landmark');
    var later = null, kick = function () { clearTimeout(later); later = setTimeout(loadPicker, 700); };
    city.addEventListener('change', kick); city.addEventListener('blur', kick);
    var st = $('emp-state'); if (st) st.addEventListener('change', kick);
    sel.addEventListener('focus', loadPicker); sel.addEventListener('mousedown', loadPicker);
  }
  function pickerTown() { var c = ($('emp-city') || {}).value || '', s = ($('emp-state') || {}).value || ''; c = c.trim(); return c ? c + (s ? ', ' + stateName(s) : '') : ''; }
  function loadPicker() {
    var sel = $('emp-landmark'); if (!sel) return;
    var town = pickerTown();
    if (!town) { pick.town = ''; sel.innerHTML = '<option value="">Pick the city and state first</option>'; return; }
    if (pick.town === town && (pick.loading || pick.items.length)) return pick.loading;
    pick.town = town; pick.items = [];
    sel.innerHTML = '<option value="">Finding landmarks in ' + esc(town) + '…</option>';
    pick.loading = geocode(town).then(function (pt) {
      if (pick.town !== town) return;
      if (!pt) { sel.innerHTML = '<option value="">Couldn\'t find ' + esc(town) + ' on the map</option>'; return; }
      return ensureCells('a', cellsIn(boxAround(pt, 2.2)), pt).then(function (res) {
        if (pick.town !== town) return;
        var all = landmarksIn('a', boxAround(pt, 2.2)).map(function (it) { return { it: it, d: miles(pt, [it[4], it[5]]) }; }).sort(function (a, b) { return a.d - b.d; });
        var keep = sel.value, groups = '';
        KINDS.forEach(function (K) {
          var mine = all.filter(function (x) { return x.it[2] === K.k; }).slice(0, 15).sort(function (a, b) { return a.it[1].localeCompare(b.it[1]); });
          if (!mine.length) return;
          groups += '<optgroup label="' + esc(K.e + ' ' + K.label) + '">' + mine.map(function (x) { return '<option value="' + esc(x.it[0]) + '">' + esc(x.it[3] + ' ' + x.it[1]) + '</option>'; }).join('') + '</optgroup>';
        });
        pick.items = all.map(function (x) { return x.it; });
        sel.innerHTML = '<option value="">' + (groups ? 'No landmark (show the middle of town)' : res === 'failed' ? 'Landmarks couldn\'t load right now' : 'No landmarks found in ' + esc(town)) + '</option>' + groups;
        if (keep && sel.querySelector('option[value="' + keep.replace(/"/g, '') + '"]')) sel.value = keep;
      });
    }).then(function () { pick.loading = null; }, function () { pick.loading = null; });
    return pick.loading;
  }
  function pickedLandmark() {
    var sel = $('emp-landmark'); if (!sel || !sel.value) return null;
    var it = pick.items.filter(function (x) { return x[0] === sel.value; })[0];
    return it ? { id: it[0], name: it[1], kind: it[2], icon: it[3], lat: it[4], lon: it[5] } : null;
  }
  var postWrapped = false;
  function wrapPostJob() {
    var o = window.postJob;
    if (postWrapped || typeof o !== 'function') return;
    postWrapped = true;
    var w = async function () {
      var lm = pickedLandmark(), title = (($('emp-title') || {}).value || '').trim(), t0 = Date.now() - 1000;
      try { return await o.apply(this, arguments); }
      finally { if (lm && title) attachLandmark(lm, title, t0); }      // also when postJob throws after posting (v43: aiJobMatchForParent is missing)
    };
    window.postJob = w;
  }
  function attachLandmark(lm, title, t0) {
    var hit = false;
    [typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : [], typeof browsableJobs !== 'undefined' ? browsableJobs : []].forEach(function (list) {
      list.forEach(function (j) { if (j && j.title === title && typeof j.id === 'number' && j.id >= t0 && !j.landmark) { j.landmark = Object.assign({}, lm); hit = true; } });
    });
    if (hit) { var sel = $('emp-landmark'); if (sel) sel.value = ''; try { window.renderBrowseJobs && window.renderBrowseJobs(); } catch (e) {} }
  }
  function boot() { ensurePicker(); wrapPostJob(); }
  boot();
  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', function () { boot(); setTimeout(boot, 1500); });

  // for tests and other blocks
  api.kinds = KINDS; api.geocode = geocode; api.ensureAround = ensureAround; api.nearest = nearest; api.jobPoint = jobPoint;
  api.homeInfo = homeInfo; api.classify = classify; api.query = query; api.views = views; api.loadPicker = loadPicker; api.pickedLandmark = pickedLandmark;
  api.cellsIn = cellsIn; api.ensureCells = ensureCells;
})();
