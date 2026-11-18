/* A pretend Supabase for offline browser checks (v64). Auth users, the sign-in and every table row live in this
   browser's localStorage (__fake_users, sb-…-auth-token, __fake_table_<name>), so two pages in one browser context
   share them like two people using the real server. Nothing real is called.
   Use: context.addInitScript(require('./helpers/fake-supabase-v64.cjs')) */
module.exports = `(() => {
  const KEY = 'sb-qocmpwimsfcnqijtfmki-auth-token';
  const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const log = ev => { const l = J('__fake_log', []); l.push(ev); S('__fake_log', l); };
  const userOf = (em) => { const u = J('__fake_users', {})[em]; return u && { id: 'id-' + em, email: em, identities: [{}], user_metadata: u.meta || {}, app_metadata: u.app || {}, created_at: '2026-10-01T00:00:00Z' }; };
  const newSess = em => { const s = { access_token: 'at-' + Math.random().toString(36).slice(2), refresh_token: 'rt', expires_at: Math.floor(Date.now()/1000)+3600, user: userOf(em) }; S(KEY, s); return s; };
  const auth = {
    async signUp({ email, password, options }) {
      const em = String(email).toLowerCase(), all = J('__fake_users', {});
      if (all[em]) return { data: { user: null, session: null }, error: { status: 422, code: 'user_already_exists', message: 'User already registered' } };
      all[em] = { password, meta: (options && options.data) || {} }; S('__fake_users', all); log({ op: 'signup', email: em, meta: all[em].meta });
      const s = newSess(em); return { data: { user: s.user, session: s }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const em = String(email).toLowerCase(), u = J('__fake_users', {})[em];
      if (!u || u.password !== password) return { data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } };
      const s = newSess(em); log({ op: 'signin', email: em }); return { data: { user: s.user, session: s }, error: null };
    },
    async getSession() { return { data: { session: J(KEY, null) }, error: null }; },
    async getUser() { const s = J(KEY, null); return s ? { data: { user: s.user }, error: null } : { data: { user: null }, error: { status: 401, message: 'Auth session missing!' } }; },
    async refreshSession() { const s = J(KEY, null); return { data: { session: s, user: s && s.user }, error: null }; },
    async updateUser(p) { const s = J(KEY, null); if (s && p && p.data) { const all = J('__fake_users', {}); const u = all[s.user.email]; u.meta = Object.assign({}, u.meta, p.data); S('__fake_users', all); s.user = userOf(s.user.email); S(KEY, s); } return { data: { user: s && s.user }, error: null }; },
    async signOut() { localStorage.removeItem(KEY); return { error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  };
  // user_data table
  function table(name) {
    const st = { name, filters: [], op: 'select', payload: null, lim: 0 };
    const rowsOf = () => J('__fake_table_' + name, []);
    const run = () => {
      let rows = rowsOf();
      if (st.op === 'upsert') {
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        list.forEach(r => { const i = rows.findIndex(x => x.email === r.email && x.key === r.key); if (i >= 0) rows[i] = Object.assign({}, rows[i], r); else rows.push(Object.assign({}, r)); });
        S('__fake_table_' + name, rows); return { data: list, error: null };
      }
      if (st.op === 'delete') { const keep = rows.filter(r => !st.filters.every(f => f(r))); S('__fake_table_' + name, keep); return { data: [], error: null }; }
      rows = rows.filter(r => st.filters.every(f => f(r)));
      if (st.lim) rows = rows.slice(0, st.lim);
      return { data: rows, error: null, count: rows.length };
    };
    const like = (v, p) => new RegExp('^' + String(p).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/%/g, '.*') + '$').test(String(v));
    const q = {
      select() { return q; }, upsert(p) { st.op = 'upsert'; st.payload = p; return q; }, insert(p) { st.op = 'upsert'; st.payload = p; return q; }, update(p) { st.op = 'select'; return q; }, delete() { st.op = 'delete'; return q; },
      eq(c, v) { st.filters.push(r => r[c] === v); return q; }, neq(c, v) { st.filters.push(r => r[c] !== v); return q; },
      in(c, vs) { st.filters.push(r => vs.indexOf(r[c]) >= 0); return q; }, like(c, p) { st.filters.push(r => like(r[c], p)); return q; }, ilike(c, p) { st.filters.push(r => like(String(r[c]).toLowerCase(), String(p).toLowerCase())); return q; },
      gt() { return q; }, gte() { return q; }, lt() { return q; }, lte() { return q; }, order() { return q; }, range() { return q; }, is() { return q; }, or() { return q; }, not() { return q; }, filter() { return q; }, match() { return q; },
      limit(n) { st.lim = n; return q; }, single() { const r = run(); return Promise.resolve({ data: r.data && r.data[0] || null, error: null }); }, maybeSingle() { const r = run(); return Promise.resolve({ data: r.data && r.data[0] || null, error: null }); },
      then(a, b) { return Promise.resolve(run()).then(a, b); },
    };
    return q;
  }
  const channel = () => { const c = { on() { return c; }, subscribe() { return c; }, unsubscribe() {}, send() {} }; return c; };
  window.supabase = { createClient() { return {
    auth, from: table, rpc: async () => ({ data: null, error: null }), channel, removeChannel() {},
    functions: { invoke: async () => ({ data: null, error: { message: 'offline test' } }) },
    storage: { from() { return { upload: async () => ({ error: { message: 'x' } }), createSignedUrl: async () => ({ error: { message: 'x' } }), remove: async () => ({}) }; } },
  }; } };
})();`;
