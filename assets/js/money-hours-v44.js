
/* ═══════════════════════════════════════════════════════════════════
   v44 · MONEY & HOURS TRACKING  (2026-10-16, Aya's request: "a way for
   users to track their withdrawals by adding them in; if there's a job
   set in the calendar, after it happens give a popup asking if it
   happened and hours worked, to add money logged; and track weekly hours")
   • Withdrawals: teens add money they took out, spent or moved (amount,
     date, what for) from Earnings or Savings. Earned − withdrawn = money
     left, shown on Earnings, Savings and the home card.
   • After a calendar shift ends, a popup asks "Did this shift happen?"
     Yes → hours (from the shift's times) × the shift's pay rate, both
     editable, are logged in the Hours log. No → the shift stops counting.
     "Ask me later" asks again in 3 hours. Shifts older than 30 days are
     not asked about.
   • Weekly hours: Work Log shows this week (Sun–Sat) against the weekly
     limit, an 8-week chart and weekly totals. The calendar bar, the Find
     Jobs hours tracker and the message hour limit use the same number:
     window.twHours.week() = hours logged + shifts still to come/confirm.
   • One money list: Earnings, Savings and Work Log all read the Hours log
     + withdrawals. "Log a Cash Job" saves to the Hours log. Real accounts
     never get the sample earnings the Earnings tab used to add.
   • Earnings, Savings and Work Log now draw when opened (the later
     navfix-js block replaced switchDashTab, so their old redraw hooks
     never ran and the tabs stayed at $0 / 0h).
   • Real accounts: the Hours log, calendar shifts and withdrawals are
     saved to the account (Supabase user_data rows "worklog", "cal_shifts",
     "withdrawals") with a 3-way merge, so they follow the teen to any
     device and an offline change is not lost. Demo logins stay local.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twMoneyHoursV44) return;
  window.__twMoneyHoursV44 = true;

  /* ── helpers ─────────────────────────────────────────────────────── */
  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const isTeen = u => !!(u && u.type === 'teen');
  const acctOf = u => String((u && (u.dataKey || u.email)) || '');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const $ = id => document.getElementById(id);
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const parse = s => { try { return JSON.parse(s); } catch (e) { return null; } };
  const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;
  const toast = (m, t) => { try { if (typeof showToast === 'function') showToast(m, t || 'success'); } catch (e) {} };
  const money = n => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtH = n => r1(n) + ' h';

  /* dates: always local days 'YYYY-MM-DD'; weeks run Sunday → Saturday like the calendar */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function parseDay(s) {
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const dayOf = s => { const d = parseDay(s); return d ? ymd(d) : ''; };
  const today = () => ymd(new Date());
  function addDays(s, n) { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); }
  function weekStart(date) { const d = parseDay(date == null ? new Date() : date); if (!d) return ''; d.setDate(d.getDate() - d.getDay()); return ymd(d); }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmtDay = s => { const d = parseDay(s); return d ? MON[d.getMonth()] + ' ' + d.getDate() : String(s || ''); };
  const fmtLong = s => { const d = parseDay(s); return d ? DAYS[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() : String(s || ''); };
  function fmtRange(start) { const a = parseDay(start), b = parseDay(addDays(start, 6)); return a.getMonth() === b.getMonth() ? MON[a.getMonth()] + ' ' + a.getDate() + ' – ' + b.getDate() : fmtDay(start) + ' – ' + fmtDay(ymd(b)); }
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  function fmtTime(t) { const v = toMin(t); if (v == null) return ''; const h = Math.floor(v / 60) % 24, m = v % 60; return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'pm' : 'am'); }

  /* ── data ────────────────────────────────────────────────────────── */
  const WL = 'tw_worklog', CAL = 'tw_cal_shifts';
  const DEMO_WL = new Set([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010]);
  const isDemoShift = s => !!s && (s.id === 'demo-1' || (s.job === "Lawn Mowing — Mike's Landscaping" && s.notes === 'Bring gloves. Side gate will be open.'));
  const worklog = () => arr(parse(lsGet(WL)));
  const setWorklog = list => lsSet(WL, JSON.stringify(list));
  let lastId = 0;
  const newId = () => (lastId = Math.max(Date.now(), lastId + 1));   // the Hours log uses numeric ids (its delete buttons need them)

  function shifts() {
    try { if (typeof calShifts !== 'undefined' && Array.isArray(calShifts)) return calShifts; } catch (e) {}
    return arr(parse(lsGet(CAL)));
  }
  function setShiftsMem(list) {
    try { if (typeof calShifts !== 'undefined' && Array.isArray(calShifts)) { calShifts.splice(0, calShifts.length, ...list); return; } } catch (e) {}
    try { window.calShifts = list; } catch (e) {}
  }
  function saveShifts() {
    try { if (typeof window._saveCalShifts === 'function') { window._saveCalShifts(); return; } } catch (e) {}
    lsSet(CAL, JSON.stringify(shifts()));
  }

  // withdrawals: per account (same prefix as _DB). Demo logins keep them for the visit only, like _DB does.
  const wdKey = () => { try { return _DB._prefix() + 'mh_withdrawals'; } catch (e) { return 'tw_guest_mh_withdrawals'; } };
  function withdrawals() {
    let v;
    if (isDemoUser(me())) { try { v = _DB.load('mh_withdrawals', []); } catch (e) { v = []; } }
    else v = parse(lsGet(wdKey()));
    return arr(v).filter(w => w.id != null);
  }
  function setWithdrawals(list) {
    if (isDemoUser(me())) { try { _DB.save('mh_withdrawals', list); } catch (e) {} }
    else lsSet(wdKey(), JSON.stringify(list));
  }

  /* pay on a shift: "$18/hr", "18 an hour", "$18 per hour" → hourly; "$40", "$40 flat" → flat */
  function payOf(s) {
    const p = String((s && s.pay) || '');
    let m = p.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:\/|per|an|a)\s*(?:hr|hour|h)\b/i);
    if (m) return { rate: +m[1], flat: 0 };
    m = p.match(/\$?\s*(\d+(?:\.\d+)?)/);
    return m ? { rate: 0, flat: +m[1] } : { rate: 0, flat: 0 };
  }
  function shiftHours(s) {
    const a = toMin(s && s.start), b = toMin(s && s.end);
    if (a == null || b == null) return 0;
    let d = b - a; if (d <= 0) d += 1440;              // ends after midnight
    return d / 60;
  }
  function shiftPay(s) { const p = payOf(s); return p.rate ? p.rate * shiftHours(s) : p.flat; }
  function shiftEnd(s) {
    const d = parseDay(s && s.date); if (!d) return null;
    const a = toMin(s.start), b = toMin(s.end);
    if (b != null) d.setMinutes(b + (a != null && b <= a ? 1440 : 0));
    else if (a != null) d.setMinutes(a + 60);
    else d.setMinutes(23 * 60 + 59);
    return d.getTime();
  }
  const STOP = new Set(['the', 'and', 'for', 'job', 'jobs', 'work', 'shift', 'with', 'from']);
  const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !STOP.has(w));
  function sameJob(a, b) { const A = new Set(words(a)); return words(b).some(w => A.has(w)); }
  function loggedFor(s, log) {
    return log.find(e => s.id != null && e.shiftId === s.id) || log.find(e => !e.shiftId && dayOf(e.date) === s.date && sameJob(e.job, s.job)) || null;
  }
  function guessTask(job) {
    const j = String(job || '').toLowerCase();
    if (/babysit|child|kids?\b|nanny|sitter/.test(j)) return 'babysitting';
    if (/dog|cat|pet|walk|feed|horse|animal/.test(j)) return 'pet care';
    if (/lawn|mow|yard|garden|leaf|leaves|rake|snow|shovel|weed|landscap|hedge/.test(j)) return 'yard work';
    if (/clean|wash|dish|vacuum|tidy|laundry|organi/.test(j)) return 'cleaning';
    if (/tech|computer|phone|wifi|router|ipad|laptop|printer/.test(j)) return 'tech help';
    return 'other';
  }

  /* ── weekly hours (the number the calendar, Find Jobs and hour limits use) ── */
  function limit(date) {
    try { if (typeof window.twWeeklyHourLimit === 'function') { const n = Number(window.twWeeklyHourLimit(date)); if (n > 0) return n; } } catch (e) {}
    try { const n = Number(parentalControls['max-weekly-hours']); if (n > 0) return n; } catch (e) {}
    return 18;
  }
  function week(date) {
    const start = weekStart(date == null ? new Date() : date), end = addDays(start, 6);
    const inWeek = d => !!d && d >= start && d <= end;
    const all = worklog();
    const log = all.filter(e => inWeek(dayOf(e.date)));
    const worked = log.reduce((s, e) => s + num(e.hours), 0);
    const earned = log.reduce((s, e) => s + num(e.pay), 0);
    const waiting = shifts().filter(s => s && !s.outcome && inWeek(s.date) && !loggedFor(s, all));
    const scheduled = waiting.reduce((t, s) => t + shiftHours(s), 0);
    const scheduledPay = waiting.reduce((t, s) => t + shiftPay(s), 0);
    return { start, end, worked: r1(worked), scheduled: r1(scheduled), total: r1(worked + scheduled), earned: r2(earned), scheduledPay: r2(scheduledPay), sessions: log.length, limit: limit(start) };
  }
  window.twHours = { week, weekStart, limit };

  // calendar bar, Find Jobs tracker and the message hour limit all call calcCalendarStats()
  const _oCalc = window.calcCalendarStats;
  if (typeof _oCalc === 'function') {
    window.calcCalendarStats = function () {
      let base = {};
      try { base = _oCalc.apply(this, arguments) || {}; } catch (e) {}
      try {
        const w = week(), log = worklog();
        let h = 0, p = 0;
        shifts().forEach(s => {
          if (!s || s.outcome === 'missed') return;
          const e = s.outcome === 'worked' ? (log.find(x => x.id === s.logId) || null) : null;
          if (e) { h += num(e.hours); p += num(e.pay); } else { h += shiftHours(s); p += shiftPay(s); }
        });
        return Object.assign({}, base, { weeklyHours: w.total, weeklyEarnings: r2(w.earned + w.scheduledPay), totalHours: h, totalEarnings: p });
      } catch (e) { return base; }
    };
  }

  /* ── money ───────────────────────────────────────────────────────── */
  function ledger() {
    const earn = worklog().filter(e => num(e.pay) > 0).map(e => ({ kind: 'earn', id: e.id, date: dayOf(e.date), label: e.job || 'Work', amount: num(e.pay), hours: num(e.hours), cal: !!e.shiftId }));
    const out = withdrawals().map(w => ({ kind: 'out', id: w.id, date: dayOf(w.date), label: w.note || 'Withdrawal', amount: num(w.amount) }));
    return earn.concat(out).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (num(String(b.id).replace(/\D/g, '')) - num(String(a.id).replace(/\D/g, ''))));
  }
  function totals() {
    const log = worklog();
    const earned = r2(log.reduce((s, e) => s + num(e.pay), 0));
    const withdrawn = r2(withdrawals().reduce((s, w) => s + num(w.amount), 0));
    return { earned, withdrawn, left: r2(earned - withdrawn), hours: r1(log.reduce((s, e) => s + num(e.hours), 0)) };
  }

  /* ── styles ──────────────────────────────────────────────────────── */
  function injectStyle() {
    if ($('mh-style')) return;
    const st = document.createElement('style'); st.id = 'mh-style';
    st.textContent = `
.mh-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:1rem}
.mh-card{border-radius:12px;padding:12px 10px;text-align:center}
.mh-card b{display:block;font-family:'Fraunces',serif;font-size:1.45rem;font-weight:900;line-height:1.15}
.mh-card span{display:block;font-size:.7rem;color:var(--muted);font-weight:700;margin-top:3px;text-transform:uppercase;letter-spacing:.3px}
.mh-card small{display:block;font-size:.72rem;color:var(--muted);margin-top:2px}
.mh-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.1rem}
.mh-btns>button{flex:1 1 160px;font-size:.85rem}
.mh-h{font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:.4rem 0 8px}
.mh-chart{display:flex;align-items:flex-end;gap:6px;height:118px;padding:0 2px;margin-bottom:1rem}
.mh-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.mh-col em{font-style:normal;font-size:.62rem;font-weight:700;color:var(--muted);margin-bottom:2px;white-space:nowrap}
.mh-col i{display:block;width:100%;max-width:46px;border-radius:5px 5px 0 0;background:var(--green);min-height:0}
.mh-col i.mh-sch{background:transparent;border:2px dashed var(--green);border-bottom:none;border-radius:5px 5px 0 0;opacity:.7}
.mh-col i.mh-sch + i{border-radius:0}
.mh-col i.mh-past{opacity:.45}
.mh-col u{text-decoration:none;font-size:.6rem;color:var(--muted);font-weight:600;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.mh-col.mh-now u{color:var(--green);font-weight:800}
.mh-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 4px;border-bottom:1px solid var(--border)}
.mh-row:last-child{border-bottom:none}
.mh-row .mh-l{display:flex;align-items:center;gap:10px;min-width:0}
.mh-row .mh-l>span{font-size:1.15rem;flex-shrink:0}
.mh-row .mh-t{font-weight:700;font-size:.87rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.mh-row .mh-d{font-size:.72rem;color:var(--muted)}
.mh-row .mh-r{display:flex;align-items:center;gap:6px;flex-shrink:0}
.mh-amt{font-weight:800;font-size:.92rem;white-space:nowrap}
.mh-x{background:none;border:none;cursor:pointer;color:var(--muted);font-size:.85rem;padding:2px 6px;border-radius:6px}
.mh-x:hover{background:var(--red-pale);color:var(--red)}
.mh-empty{color:var(--muted);font-size:.85rem;text-align:center;padding:.8rem .5rem;line-height:1.5}
.mh-now-box{background:var(--green-pale);border-radius:14px;padding:14px 16px;margin-bottom:1rem}
.mh-now-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap}
.mh-now-top .mh-k{font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
.mh-now-top .mh-big{font-family:'Fraunces',serif;font-size:1.9rem;font-weight:900;color:var(--green);line-height:1.1}
.mh-now-top .mh-big small{font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;color:var(--muted)}
.mh-now-top .mh-pay{font-weight:800;color:var(--green);font-size:.95rem}
.mh-bar{position:relative;height:10px;border-radius:10px;background:var(--card);overflow:hidden;margin:10px 0 6px;display:flex}
.mh-bar i{display:block;height:100%}
.mh-bar i.w{background:var(--green)}
.mh-bar i.s{background:repeating-linear-gradient(45deg,var(--green) 0 4px,transparent 4px 8px);opacity:.55}
.mh-bar.warn i.w{background:var(--amber)} .mh-bar.over i.w{background:var(--red)}
.mh-note{font-size:.78rem;color:var(--text);line-height:1.45}
.mh-note b.warn{color:var(--amber)} .mh-note b.over{color:var(--red)}
.mh-periods{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;padding-top:.75rem;border-top:1px solid var(--border);margin-bottom:.9rem}
.mh-periods b{display:block;font-weight:800}
.mh-periods span{font-size:.72rem;color:var(--muted)}
.mh-weeks{width:100%;border-collapse:collapse;font-size:.82rem}
.mh-weeks td{padding:7px 4px;border-bottom:1px solid var(--border);color:var(--text)}
.mh-weeks tr:last-child td{border-bottom:none}
.mh-weeks td.n{text-align:right;font-weight:700;white-space:nowrap}
.mh-weeks tr.mh-cur td{font-weight:800;color:var(--green)}
.mh-modal{z-index:320}
.mh-modal .modal{max-width:420px}
.mh-modal h3{font-family:'Fraunces',serif;color:var(--green);margin-bottom:.35rem;padding-right:28px}
.mh-modal .mh-sub{font-size:.82rem;color:var(--muted);margin-bottom:.9rem;line-height:1.5}
.mh-modal .mh-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--muted)}
.mh-modal .modal{position:relative}
.mh-grid2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.mh-shift{background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:11px 13px;margin-bottom:1rem;font-size:.84rem;color:var(--text);line-height:1.5}
.mh-shift strong{font-size:.95rem}
.mh-stack{display:flex;flex-direction:column;gap:8px}
.mh-stack button{width:100%;font-size:.9rem;padding:11px}
.mh-link{background:none;border:none;color:var(--muted);text-decoration:underline;cursor:pointer;font-size:.84rem;padding:6px;font-family:inherit}
.mh-found{background:var(--amber-pale);border-radius:10px;padding:9px 12px;font-size:.8rem;color:var(--text);margin-bottom:.9rem;line-height:1.5}
.mh-count{text-align:center;font-size:.74rem;color:var(--muted);margin-top:.7rem}
.mh-hint{font-size:.74rem;color:var(--muted);margin-top:-4px;margin-bottom:.6rem;line-height:1.4}
.mh-modal select{width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.88rem;outline:none;background:var(--card);color:var(--text)}
@media (max-width:480px){.mh-grid2{grid-template-columns:1fr 1fr;gap:.5rem}.mh-now-top .mh-big{font-size:1.6rem}.mh-card b{font-size:1.25rem}}
`;
    document.head.appendChild(st);
  }

  /* ── shared pieces ───────────────────────────────────────────────── */
  function historyHTML(limitRows) {
    const items = ledger();
    if (!items.length) return '<div class="mh-empty">Nothing here yet. Earnings show up when you log hours with pay, and withdrawals when you add one.</div>';
    const shown = limitRows ? items.slice(0, limitRows) : items;
    return shown.map(it => it.kind === 'earn'
      ? `<div class="mh-row" data-mh-earn="${esc(it.id)}"><div class="mh-l"><span>💵</span><div style="min-width:0"><div class="mh-t">${esc(it.label)}</div><div class="mh-d">${esc(fmtLong(it.date))}${it.hours ? ' · ' + esc(fmtH(it.hours)) : ''}${it.cal ? ' · from your calendar' : ''}</div></div></div>
         <div class="mh-r"><span class="mh-amt" style="color:var(--green)">+${money(it.amount)}</span><button type="button" class="mh-x" title="Remove" aria-label="Remove" onclick="twMoneyRemoveEarning(${JSON.stringify(it.id).replace(/"/g, '&quot;')})">✕</button></div></div>`
      : `<div class="mh-row" data-mh-out="${esc(it.id)}"><div class="mh-l"><span>💸</span><div style="min-width:0"><div class="mh-t">${esc(it.label)}</div><div class="mh-d">${esc(fmtLong(it.date))} · withdrawal</div></div></div>
         <div class="mh-r"><span class="mh-amt" style="color:var(--red)">-${money(it.amount)}</span><button type="button" class="mh-x" title="Remove" aria-label="Remove" onclick="twDeleteWithdraw('${esc(it.id)}')">✕</button></div></div>`
    ).join('') + (limitRows && items.length > limitRows ? `<div style="text-align:center;padding-top:.6rem"><button type="button" class="btn-sm btn-secondary" onclick="this.closest('[data-mh-hist]').dataset.all='1';twMoneyRedraw()">Show all ${items.length}</button></div>` : '');
  }
  function weeksBack(n) { const out = [], cur = weekStart(); for (let i = n - 1; i >= 0; i--) out.push(addDays(cur, -7 * i)); return out; }
  function chartHTML(kind) {   // kind: 'hours' | 'money'
    const cur = weekStart(), list = weeksBack(8).map(ws => ({ ws, w: week(ws) }));
    const val = x => kind === 'money' ? x.w.earned : x.w.worked;
    const extra = x => kind === 'hours' && x.ws === cur ? x.w.scheduled : 0;
    const max = Math.max(1, ...list.map(x => val(x) + extra(x)));
    const H = 82;
    return list.map(x => {
      const v = val(x), s = extra(x), now = x.ws === cur;
      const label = kind === 'money' ? (v ? '$' + Math.round(v) : '') : ((v || s) ? r1(v + s) + 'h' : '');
      return `<div class="mh-col${now ? ' mh-now' : ''}" title="${esc(fmtRange(x.ws))}: ${kind === 'money' ? money(v) : fmtH(v) + (s ? ' + ' + fmtH(s) + ' scheduled' : '')}">
        <em>${label}</em>${s ? `<i class="mh-sch" style="height:${Math.round(s / max * H)}px"></i>` : ''}<i class="${now ? '' : 'mh-past'}" style="height:${v ? Math.max(3, Math.round(v / max * H)) : 0}px"></i>
        <u>${now ? 'This wk' : esc(fmtDay(x.ws))}</u></div>`;
    }).join('');
  }
  function nowBox() {
    const w = week(), lim = w.limit, pct = v => Math.max(0, Math.min(100, v / lim * 100));
    const cls = w.total > lim ? 'over' : w.total >= lim * 0.8 ? 'warn' : '';
    const left = r1(lim - w.total);
    const state = w.total > lim ? `<b class="over">${fmtH(w.total - lim)} over your ${fmtH(lim)} weekly limit.</b>`
      : w.total >= lim * 0.8 ? `<b class="warn">${fmtH(left)} left before your ${fmtH(lim)} weekly limit.</b>`
      : `${fmtH(left)} left of your ${fmtH(lim)} weekly limit.`;
    return `<div class="mh-now-box" data-mh-now>
      <div class="mh-now-top"><div><div class="mh-k">This week · ${esc(fmtRange(w.start))}</div><div class="mh-big">${esc(fmtH(w.worked))} <small>worked</small></div></div><div class="mh-pay">${money(w.earned)} earned</div></div>
      <div class="mh-bar ${cls}"><i class="w" style="width:${pct(w.worked)}%"></i><i class="s" style="width:${Math.max(0, pct(w.total) - pct(w.worked))}%"></i></div>
      <div class="mh-note">${w.scheduled ? esc(fmtH(w.scheduled)) + ' more on your calendar this week. ' : ''}${state}</div>
    </div>`;
  }

  /* ── Work Log: weekly hours panel ────────────────────────────────── */
  function drawWeek() {
    const chart = $('wl-weekly-chart') || $('mh-wl-chart');
    const panel = chart && chart.closest('.panel');
    if (!panel) return;
    const body = panel.querySelector('.panel-body'), badge = $('wl-this-week-badge') || $('mh-wl-badge');
    if (badge) badge.id = 'mh-wl-badge';        // the old renderer can't overwrite our numbers any more
    const w = week(), log = worklog(), t0 = parseDay(today());
    const monthStart = ymd(new Date(t0.getFullYear(), t0.getMonth(), 1));
    const monthHrs = log.filter(e => dayOf(e.date) >= monthStart).reduce((s, e) => s + num(e.hours), 0);
    const all = log.reduce((s, e) => s + num(e.hours), 0);
    const rows = weeksBack(8).reverse().map(ws => ({ ws, w: ws === w.start ? w : week(ws) })).filter((x, i) => i === 0 || x.w.worked > 0);
    if (badge) badge.textContent = 'This week: ' + fmtH(w.worked);
    body.innerHTML = nowBox() +
      `<div class="mh-chart" id="mh-wl-chart">${chartHTML('hours')}</div>
       <div class="mh-periods"><div><b style="color:var(--green)">${esc(fmtH(w.worked))}</b><span>This week</span></div><div><b style="color:var(--blue)">${esc(fmtH(monthHrs))}</b><span>This month</span></div><div><b style="color:var(--amber)">${esc(fmtH(all))}</b><span>All time</span></div></div>
       <div class="mh-h">Weekly totals</div>
       <table class="mh-weeks">${rows.map(x => `<tr class="${x.ws === w.start ? 'mh-cur' : ''}"><td>${x.ws === w.start ? 'This week · ' : ''}${esc(fmtRange(x.ws))}</td><td class="n">${esc(fmtH(x.w.worked))}</td><td class="n">${money(x.w.earned)}</td><td class="n" style="color:var(--muted);font-weight:600">${x.w.sessions} ${x.w.sessions === 1 ? 'shift' : 'shifts'}</td></tr>`).join('')}</table>`;
    const law = $('wl-law-status');
    if (law) law.innerHTML = w.worked > 18 ? `<span style="color:var(--red)">⚠️ You've worked ${esc(fmtH(w.worked))} this week, over the 18 h school-year limit!</span>`
      : w.worked > 14 ? `<span style="color:var(--amber)">You've worked ${esc(fmtH(w.worked))} this week, close to the 18 h limit.</span>`
      : `<span style="color:var(--green)">You're at ${esc(fmtH(w.worked))} this week, within limits ✓</span>`;
  }

  /* ── Earnings tab ────────────────────────────────────────────────── */
  function buildEarnings() {
    const tab = $('ttab-earnings');
    if (!tab || $('mh-earn-cards')) return !!tab;
    tab.innerHTML = `
      <div class="panel" style="margin-bottom:1.2rem">
        <div class="panel-head" style="background:var(--green-pale)"><h2>💰 Earnings &amp; Withdrawals</h2><span class="badge badge-green" id="mh-left-badge">$0.00 left</span></div>
        <div class="panel-body">
          <div class="mh-cards" id="mh-earn-cards"></div>
          <div class="mh-btns"><button type="button" class="btn-primary" onclick="twOpenWithdraw()">💸 Add a withdrawal</button><button type="button" class="btn-secondary" onclick="openAddWorkLogModal()">⏱️ Log hours &amp; pay</button></div>
          <div class="mh-h">Earnings by week</div>
          <div class="mh-chart" id="mh-earn-chart"></div>
          <div class="mh-h">Money history</div>
          <div id="mh-earn-history" data-mh-hist></div>
          <div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border)">
            <div style="font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:8px">➕ Log a Cash Job</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
              <input id="earn-log-job" placeholder="Job name" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;outline:none;background:var(--card);color:var(--text);min-width:0">
              <input id="earn-log-hours" placeholder="Hours" type="number" min="0.25" step="0.25" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;outline:none;background:var(--card);color:var(--text);min-width:0">
              <input id="earn-log-pay" placeholder="$ earned" type="number" min="0" step="0.01" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;outline:none;background:var(--card);color:var(--text);min-width:0">
            </div>
            <button type="button" class="btn-primary" style="width:100%;font-size:.85rem" onclick="addEarningsEntry()">💾 Log Earnings</button>
          </div>
        </div>
      </div>`;
    return true;
  }
  function drawEarnings() {
    if (!buildEarnings()) return;
    const t = totals(), w = week();
    $('mh-earn-cards').innerHTML = `
      <div class="mh-card" style="background:var(--green-pale)"><b style="color:var(--green)">${money(t.earned)}</b><span>Earned</span><small>all time</small></div>
      <div class="mh-card" style="background:var(--red-pale)"><b style="color:var(--red)">${money(t.withdrawn)}</b><span>Withdrawn</span><small>spent or taken out</small></div>
      <div class="mh-card" style="background:var(--blue-pale)"><b style="color:${t.left < 0 ? 'var(--red)' : 'var(--blue)'}">${money(t.left)}</b><span>Money left</span><small>earned − withdrawn</small></div>
      <div class="mh-card" style="background:var(--amber-pale)"><b style="color:var(--amber)">${esc(fmtH(w.worked))}</b><span>This week</span><small>${money(w.earned)} earned</small></div>`;
    $('mh-left-badge').textContent = money(t.left) + ' left';
    $('mh-earn-chart').innerHTML = chartHTML('money');
    const h = $('mh-earn-history'); h.innerHTML = historyHTML(h.dataset.all ? 0 : 25);
  }

  /* ── Savings tab: same money numbers, plus a way to add withdrawals ── */
  function drawSavings() {
    const tab = $('ttab-savings'); if (!tab) return;
    const ren = (from, to) => { const el = $(from); if (el) el.id = to; return $(to); };
    const earned = ren('sv-total-earned', 'mh-sv-earned'), left = ren('sv-saved', 'mh-sv-left'), out = ren('sv-spent', 'mh-sv-out');
    const list = ren('savings-history-list', 'mh-sv-history'), count = ren('sv-history-count', 'mh-sv-count');
    const t = totals();
    if (earned) earned.textContent = money(t.earned);
    if (left) { left.textContent = money(t.left); const lab = left.nextElementSibling; if (lab && !lab.dataset.mh) { lab.dataset.mh = '1'; lab.textContent = 'Money Left'; } }
    if (out) {
      out.textContent = money(t.withdrawn);
      const card = out.parentElement;
      if (card && !card.querySelector('[data-mh-add]')) card.insertAdjacentHTML('beforeend', '<button type="button" data-mh-add class="btn-sm btn-secondary" style="margin-top:6px;font-size:.72rem;padding:3px 10px" onclick="twOpenWithdraw()">💸 Add withdrawal</button>');
    }
    if (list) {
      list.setAttribute('data-mh-hist', '');
      const head = list.parentElement && list.parentElement.querySelector('.panel-head h2');
      if (head && !head.dataset.mh) { head.dataset.mh = '1'; head.textContent = '📋 Money History'; }
      list.innerHTML = historyHTML(list.dataset.all ? 0 : 25);
    }
    if (count) count.textContent = ledger().length + ' entries';
  }

  /* ── teen home card ──────────────────────────────────────────────── */
  function drawHomeCard() {
    const u = me(); if (!isReal(u) || !isTeen(u)) return;
    const v = $('t-stat-earned'), sub = $('t-stat-earned-sub'); if (!v) return;
    const t = totals(), w = week();
    const a = money(t.earned).replace(/\.00$/, ''), b = fmtH(w.worked) + ' this week · ' + money(t.left).replace(/\.00$/, '') + ' left';
    if (v.textContent !== a) v.textContent = a;
    if (sub && sub.textContent !== b) sub.textContent = b;
  }

  const active = id => { const el = $(id); return !!(el && el.classList.contains('active')); };
  function redraw() {
    try { if (active('ttab-earnings')) drawEarnings(); } catch (e) { console.warn('money-hours: earnings', e); }
    try { if (active('ttab-savings')) drawSavings(); } catch (e) { console.warn('money-hours: savings', e); }
    try { if (active('ttab-worklog')) { if (typeof window.renderWorkLogTab === 'function') window.renderWorkLogTab(); drawWeek(); } } catch (e) { console.warn('money-hours: worklog', e); }
    try { if (active('ttab-calendar') && typeof window.calRender === 'function') window.calRender(); } catch (e) {}
    try { if (typeof window.updateHoursTracker === 'function') window.updateHoursTracker(); } catch (e) {}
    try { drawHomeCard(); } catch (e) {}
  }
  window.twMoneyRedraw = redraw;

  /* ── withdrawals ─────────────────────────────────────────────────── */
  function modal(id, inner, onClose) {
    injectStyle();
    let m = $(id);
    if (!m) {
      m = document.createElement('div'); m.id = id; m.className = 'modal-overlay mh-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.addEventListener('mousedown', e => { if (e.target === m && m._mhClose) m._mhClose(); });
      document.body.appendChild(m);
    }
    m._mhClose = onClose;
    m.innerHTML = `<div class="modal"><button type="button" class="mh-close" aria-label="Close">✕</button>${inner}</div>`;
    m.querySelector('.mh-close').onclick = onClose;
    m.style.display = 'flex';
    return m;
  }
  window.twOpenWithdraw = function () {
    const t = totals();
    modal('mh-wd-modal', `
      <h3>💸 Add a withdrawal</h3>
      <p class="mh-sub">Money you took out, spent or moved somewhere else. It comes off your money left.</p>
      <div class="mh-grid2">
        <div class="form-group"><label for="mh-wd-amount">Amount ($)</label><input type="number" id="mh-wd-amount" min="0.01" step="0.01" inputmode="decimal" placeholder="20.00"></div>
        <div class="form-group"><label for="mh-wd-date">Date</label><input type="date" id="mh-wd-date" value="${today()}" max="${addDays(today(), 1)}"></div>
      </div>
      <div class="form-group"><label for="mh-wd-note">What was it for? (optional)</label><input type="text" id="mh-wd-note" maxlength="80" placeholder="e.g. New shoes, put it in the bank"></div>
      <div class="mh-hint">You have <b>${money(t.left)}</b> left right now.</div>
      <div id="mh-wd-err" style="color:var(--red);font-size:.8rem;margin-bottom:.4rem"></div>
      <div style="display:flex;gap:8px;margin-top:.6rem"><button type="button" class="btn-primary" style="flex:1" onclick="twSaveWithdraw()">💾 Save withdrawal</button><button type="button" class="btn-secondary" onclick="twCloseWithdraw()">Cancel</button></div>`, window.twCloseWithdraw);
    setTimeout(() => { try { $('mh-wd-amount').focus(); } catch (e) {} }, 50);
  };
  window.twCloseWithdraw = function () { const m = $('mh-wd-modal'); if (m) m.style.display = 'none'; };
  window.twSaveWithdraw = function () {
    const amount = r2(num($('mh-wd-amount') && $('mh-wd-amount').value));
    const date = dayOf($('mh-wd-date') && $('mh-wd-date').value) || today();
    const note = String(($('mh-wd-note') && $('mh-wd-note').value) || '').trim().slice(0, 80);
    const err = $('mh-wd-err');
    if (!(amount > 0)) { if (err) err.textContent = 'Type how much money you took out.'; return; }
    if (amount > 100000) { if (err) err.textContent = 'That amount looks too big. Check it and try again.'; return; }
    const list = withdrawals();
    list.push({ id: 'w' + newId(), amount, date, note, added: new Date().toISOString() });
    setWithdrawals(list);
    window.twCloseWithdraw();
    kick();
    redraw();
    toast('💸 Withdrawal saved. You have ' + money(totals().left) + ' left.', 'success');
  };
  window.twDeleteWithdraw = function (id) {
    const w = withdrawals().find(x => String(x.id) === String(id)); if (!w) return;
    if (!window.confirm('Remove the ' + money(num(w.amount)) + ' withdrawal' + (w.note ? ' (' + w.note + ')' : '') + '?')) return;
    setWithdrawals(withdrawals().filter(x => String(x.id) !== String(id)));
    kick(); redraw();
    toast('Withdrawal removed', 'info');
  };
  window.twMoneyRemoveEarning = function (id) {
    const e = worklog().find(x => String(x.id) === String(id)); if (!e) return;
    if (!window.confirm('Remove ' + money(num(e.pay)) + ' for "' + (e.job || 'this job') + '" from your Hours log?')) return;
    if (typeof window.deleteWorkLogEntry === 'function') window.deleteWorkLogEntry(e.id);
    else setWorklog(worklog().filter(x => String(x.id) !== String(id)));
    // a shift logged from the calendar can be asked about again
    const s = shifts().find(x => x && x.logId != null && String(x.logId) === String(id));
    if (s) { delete s.outcome; delete s.logId; delete s.askAfter; saveShifts(); }
    kick(); redraw();
  };

  /* "Log a Cash Job" now goes into the Hours log, so it counts in hours, earnings and weekly totals */
  window.addEarningsEntry = function () {
    const jobEl = $('earn-log-job'), hEl = $('earn-log-hours'), pEl = $('earn-log-pay');
    const job = String((jobEl && jobEl.value) || '').trim(), hours = num(hEl && hEl.value), pay = r2(num(pEl && pEl.value));
    if (!job || !(hours > 0) || !(pay >= 0) || (pEl && pEl.value === '')) { toast('Fill in the job name, hours and $ earned', 'info'); return; }
    const log = worklog();
    log.unshift({ id: newId(), job, date: today(), hours: r2(hours), pay, task: guessTask(job), notes: 'Cash job', source: 'cash' });
    setWorklog(log);
    [jobEl, hEl, pEl].forEach(el => { if (el) el.value = ''; });
    kick(); redraw();
    toast('Earnings logged! 💰', 'success');
  };
  window.renderEarningsTracker = function () { try { drawEarnings(); } catch (e) { console.warn('money-hours: earnings', e); } };

  // log hours / remove hours from the Work Log modal → keep the other money views in step
  ['saveWorkLogEntry', 'deleteWorkLogEntry'].forEach(n => {
    const o = window[n];
    if (typeof o !== 'function' || o.__mh) return;
    const w = function () { const r = o.apply(this, arguments); try { kick(); setTimeout(redraw, 0); } catch (e) {} return r; };
    w.__mh = true; window[n] = w;
  });

  /* ── "Did this shift happen?" popup ──────────────────────────────── */
  const MAX_AGE = 30 * 864e5, LATER = 3 * 3600e3;
  let showing = null, launchedAt = 0;
  function autoLink() {      // answered on another device, but the shift was re-made here without the answer
    const log = worklog(); let n = 0;
    shifts().forEach(s => { if (s && s.id != null && !s.outcome) { const e = log.find(x => x.shiftId != null && String(x.shiftId) === String(s.id)); if (e) { s.outcome = 'worked'; s.logId = e.id; n++; } } });
    if (n) saveShifts();
  }
  function dueShifts(now) {
    autoLink();
    return shifts().filter(s => {
      if (!s || s.id == null || s.outcome || !s.date || !s.job) return false;
      if (s.askAfter && s.askAfter > now) return false;
      const end = shiftEnd(s); return end != null && end <= now && now - end <= MAX_AGE;
    }).sort((a, b) => shiftEnd(a) - shiftEnd(b));
  }
  function blocked() {
    if ($('tw-tour-overlay') || $('tw35-modal') || $('tw34l')) return true;
    const lock = $('parent-lock-overlay'); if (lock && lock.offsetParent !== null) return true;
    if (document.body.classList.contains('tw-limited')) return true;
    return [...document.querySelectorAll('.modal-overlay')].some(m => !m.classList.contains('mh-modal') && getComputedStyle(m).display !== 'none');
  }
  function maybeAsk() {
    const u = me();
    if (showing || !isTeen(u) || document.visibilityState === 'hidden' || !active('page-teen')) return;
    if (Date.now() - launchedAt < 2500) return;
    if (isReal(u) && !S.ready && Date.now() - launchedAt < 15000) return;   // let the cloud copy arrive first, so another device's answer counts
    if (blocked()) return;
    const due = dueShifts(Date.now());
    if (due.length) askAbout(due[0], due.length);
  }
  function shiftLine(s) {
    const t = fmtTime(s.start) + (s.end ? ' – ' + fmtTime(s.end) : '');
    return `<div class="mh-shift"><strong>${esc(s.job)}</strong><div>📅 ${esc(fmtLong(s.date))}${t ? ' · 🕐 ' + esc(t) : ''}</div>${s.pay ? `<div>💵 ${esc(s.pay)}</div>` : ''}</div>`;
  }
  function closeShift() { const m = $('mh-shift-modal'); if (m) m.style.display = 'none'; showing = null; }
  function findShift(id) { return shifts().find(s => s && String(s.id) === String(id)) || null; }
  function askAbout(s, count) {
    showing = String(s.id);
    const done = loggedFor(s, worklog());
    modal('mh-shift-modal', `
      <h3>📅 Did this shift happen?</h3>
      <p class="mh-sub">Your calendar had this job. Tell us how it went so your hours and money stay right.</p>
      ${shiftLine(s)}
      ${done ? `<div class="mh-found">You already logged <b>${esc(fmtH(num(done.hours)))}</b>${num(done.pay) ? ' and <b>' + money(num(done.pay)) + '</b>' : ''} for <b>${esc(done.job)}</b> on this day.</div>` : ''}
      <div class="mh-stack">
        ${done ? `<button type="button" class="btn-primary" data-mh="linked">✅ Yes, I already logged it</button>` : ''}
        <button type="button" class="${done ? 'btn-secondary' : 'btn-primary'}" data-mh="yes">✅ Yes, I worked it${done ? ' (log more hours)' : ''}</button>
        <button type="button" class="btn-secondary" data-mh="no">❌ No, it didn't happen</button>
        <button type="button" class="mh-link" data-mh="later">Ask me later</button>
      </div>
      ${count > 1 ? `<div class="mh-count">${count} past shifts to check</div>` : ''}`, () => answerLater(s.id));
    const m = $('mh-shift-modal');
    m.querySelectorAll('[data-mh]').forEach(b => b.onclick = () => {
      const a = b.getAttribute('data-mh');
      if (a === 'yes') stepHours(s.id);
      else if (a === 'no') answerMissed(s.id);
      else if (a === 'linked') answerLinked(s.id, done);
      else answerLater(s.id);
    });
  }
  function stepHours(id) {
    const s = findShift(id); if (!s) { closeShift(); return; }
    const p = payOf(s), h = r2(shiftHours(s));
    const earned = p.rate && h ? r2(p.rate * h) : (p.flat || '');
    const task = guessTask(s.job);
    const opt = (v, l) => `<option value="${v}"${v === task ? ' selected' : ''}>${l}</option>`;
    modal('mh-shift-modal', `
      <h3>⏱️ How long did you work?</h3>
      ${shiftLine(s)}
      <div class="mh-grid2">
        <div class="form-group"><label for="mh-sh-hours">Hours worked</label><input type="number" id="mh-sh-hours" min="0.25" max="24" step="0.25" inputmode="decimal" value="${h || ''}" placeholder="2.5"></div>
        <div class="form-group"><label for="mh-sh-rate">Pay rate ($/hr)</label><input type="number" id="mh-sh-rate" min="0" step="0.01" inputmode="decimal" value="${p.rate || ''}" placeholder="${p.flat ? 'flat pay' : '15.00'}"></div>
      </div>
      <div class="form-group"><label for="mh-sh-pay">Money earned ($)</label><input type="number" id="mh-sh-pay" min="0" step="0.01" inputmode="decimal" value="${earned}" placeholder="0.00"></div>
      <div class="mh-hint" id="mh-sh-hint">${p.flat && !p.rate ? 'This job pays a flat ' + money(p.flat) + '. Change it if you got a different amount.' : 'Hours × pay rate. Change it if you got paid a different amount, like a tip.'}</div>
      <div class="form-group"><label for="mh-sh-task">Type of work</label><select id="mh-sh-task">${opt('yard work', '🌿 Yard Work')}${opt('pet care', '🐾 Pet Care')}${opt('cleaning', '🧹 Cleaning')}${opt('babysitting', '👶 Babysitting')}${opt('tech help', '💻 Tech Help')}${opt('other', '🔧 Other')}</select></div>
      <div id="mh-sh-err" style="color:var(--red);font-size:.8rem;margin-bottom:.4rem"></div>
      <div style="display:flex;gap:8px"><button type="button" class="btn-primary" style="flex:1" id="mh-sh-save">💾 Log it</button><button type="button" class="btn-secondary" id="mh-sh-back">Back</button></div>`, () => answerLater(id));
    const hours = $('mh-sh-hours'), rate = $('mh-sh-rate'), pay = $('mh-sh-pay');
    let payEdited = false;
    const recalc = () => { if (payEdited) return; const r = num(rate.value), hh = num(hours.value); if (r > 0 && hh > 0) pay.value = r2(r * hh).toFixed(2); };
    hours.oninput = recalc; rate.oninput = recalc;
    pay.oninput = () => { payEdited = true; };
    $('mh-sh-back').onclick = () => askAbout(findShift(id) || s, dueShifts(Date.now()).length);
    $('mh-sh-save').onclick = () => answerWorked(id);
    setTimeout(() => { try { hours.focus(); } catch (e) {} }, 50);
  }
  function finish(msg, type) {
    closeShift(); kick(); redraw();
    if (msg) toast(msg, type || 'success');
    setTimeout(maybeAsk, 900);
  }
  function answerWorked(id) {
    const s = findShift(id); if (!s) { closeShift(); return; }
    const hours = r2(num($('mh-sh-hours').value)), pay = r2(num($('mh-sh-pay').value)), rate = num($('mh-sh-rate').value);
    const err = $('mh-sh-err');
    if (!(hours > 0) || hours > 24) { err.textContent = 'Type the hours you worked (more than 0, up to 24).'; return; }
    if (pay < 0) { err.textContent = 'Money earned can\'t be less than $0.'; return; }
    const task = $('mh-sh-task').value || 'other';
    const entry = { id: newId(), job: s.job, date: s.date, hours, pay, task, notes: 'From your calendar', shiftId: s.id, source: 'calendar' };
    if (rate > 0) entry.rate = rate;
    const log = worklog(); log.unshift(entry); setWorklog(log);
    s.outcome = 'worked'; s.logId = entry.id; delete s.askAfter; saveShifts();
    finish('⏱️ Logged ' + fmtH(hours) + (pay ? ' and ' + money(pay) : '') + ' for ' + s.job + '.', 'success');
  }
  function answerLinked(id, entry) {
    const s = findShift(id); if (!s) { closeShift(); return; }
    s.outcome = 'worked'; if (entry) s.logId = entry.id; delete s.askAfter; saveShifts();
    if (entry) { const log = worklog(), e = log.find(x => x.id === entry.id); if (e && e.shiftId == null) { e.shiftId = s.id; setWorklog(log); } }
    finish('👍 Got it. That shift is already in your hours.', 'success');
  }
  function answerMissed(id) {
    const s = findShift(id); if (!s) { closeShift(); return; }
    s.outcome = 'missed'; delete s.askAfter; saveShifts();
    finish('Okay. That shift won\'t count toward your hours or earnings.', 'info');
  }
  function answerLater(id) {
    const s = findShift(id);
    if (s) { s.askAfter = Date.now() + LATER; saveShifts(); kick(); }
    closeShift();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (showing) answerLater(showing); const w = $('mh-wd-modal'); if (w && w.style.display !== 'none') window.twCloseWithdraw(); } });

  /* ── saving to the account (real accounts) ───────────────────────── */
  const sortLog = list => list.slice().sort((a, b) => (dayOf(b.date) || '').localeCompare(dayOf(a.date) || '') || (num(b.id) - num(a.id)));
  const ROWS = {
    worklog: { local: () => lsGet(WL) || '[]', write: json => lsSet(WL, json), keep: e => !(e && DEMO_WL.has(e.id)), sort: sortLog },
    cal_shifts: { local: () => lsGet(CAL) || '[]', write: json => { lsSet(CAL, json); setShiftsMem(parse(json) || []); }, keep: s => !isDemoShift(s), fix: foundShifts },
    withdrawals: { local: () => lsGet(wdKey()) || '[]', write: json => lsSet(wdKey(), json), keep: w => !!(w && w.id != null) },
  };
  const ROW_NAMES = Object.keys(ROWS);
  // Shifts the AI shift finder adds (found: true) are re-made from the teen's messages by that block, so
  // this device's copy decides which exist (no flip-flop with the cloud). An answer to "did this shift
  // happen?" given on another device still carries over.
  function foundShifts(merged, local, remote) {
    const L = new Map(local.filter(x => x.found).map(x => [String(x.id), x]));
    const R = new Map((remote || []).map(x => [String(x.id), x]));
    const out = merged.filter(x => !x.found || L.has(String(x.id))).map(x => x.found ? L.get(String(x.id)) : x);
    L.forEach((x, id) => { if (!out.some(y => String(y.id) === id)) out.push(x); });
    return out.map(x => {
      const r = x.found && !x.outcome ? R.get(String(x.id)) : null;
      return r && r.outcome ? Object.assign({}, x, { outcome: r.outcome, logId: r.logId }) : x;
    });
  }
  let S = { gen: 0, acct: '', ready: false, busy: false, dirty: false, tries: 0, lastPull: 0, seen: {}, timer: null };
  const client = () => { try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; } };
  const baseKey = row => 'tw_mh_base_' + S.acct.toLowerCase().replace(/[^a-z0-9@._#-]/g, '_') + '__' + row;
  const idOf = x => x && x.id != null ? 'i:' + String(x.id) : 'j:' + JSON.stringify(x);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // 3-way merge by id: base = what this device and the cloud last agreed on
  function merge(base, local, remote) {
    if (remote == null) return local;
    const L = new Map(local.map(x => [idOf(x), x])), R = new Map(remote.map(x => [idOf(x), x]));
    const out = [];
    if (base == null) {   // first sync on this device: keep everything from both sides
      remote.forEach(r => { const l = L.get(idOf(r)); out.push(l && !same(l, r) && Object.keys(l).length > Object.keys(r).length ? l : r); });
      local.forEach(l => { if (!R.has(idOf(l))) out.push(l); });
      return out;
    }
    // this device lost its copy (nothing here, but we had synced before): never treat that as "delete everything"
    if (!local.length && base.length && remote.length) return merge(null, local, remote);
    const B = new Map(base.map(x => [idOf(x), x]));
    const keys = []; const seen = new Set();
    remote.concat(local).forEach(x => { const k = idOf(x); if (!seen.has(k)) { seen.add(k); keys.push(k); } });
    keys.forEach(k => {
      const b = B.get(k), l = L.get(k), r = R.get(k);
      if (l && r) out.push(b && same(l, b) ? r : l);          // changed here → keep ours, else take the cloud's
      else if (l) { if (!b || !same(l, b)) out.push(l); }      // new here (or changed here after a delete elsewhere)
      else if (r) { if (!b || !same(r, b)) out.push(r); }      // new elsewhere (or changed there after a delete here)
    });
    return out;
  }
  function ownerOK(u) {
    if (!u || acctOf(u) !== S.acct) return false;
    const o = lsGet('tw_device_data_owner');                 // real-stats-v42 swaps device data per account
    return o == null || o === 'acct:' + S.acct.toLowerCase();
  }
  async function pull(sb) {
    const { data, error } = await sb.from('user_data').select('key,value').eq('email', S.acct).in('key', ROW_NAMES);
    if (error || !Array.isArray(data)) throw (error || new Error('no data'));
    const out = {};
    data.forEach(r => { if (r && ROWS[r.key]) { const v = typeof r.value === 'string' ? parse(r.value) : r.value; if (Array.isArray(v)) out[r.key] = v; } });
    return out;
  }
  async function push(sb, row, json) {
    const { error } = await sb.from('user_data').upsert({ email: S.acct, key: row, value: json, updated_at: new Date().toISOString() }, { onConflict: 'email,key' });
    if (error) throw error;
  }
  async function syncAll() {
    const u = me();
    if (!isReal(u) || !isTeen(u) || !S.acct || S.busy) return;
    const sb = client();
    if (!sb) { retry(); return; }
    const gen = S.gen; S.busy = true; S.dirty = false;
    let changed = false;
    try {
      const remote = await pull(sb);
      for (const row of ROW_NAMES) {
        if (gen !== S.gen || !ownerOK(me())) return;
        const R = ROWS[row];
        const localRaw = R.local(), local = arr(parse(localRaw)).filter(R.keep);
        const b = lsGet(baseKey(row)), base = b == null ? null : arr(parse(b));
        const rem = remote[row] ? arr(remote[row]).filter(R.keep) : null;
        let merged = merge(base, local, rem);
        if (R.fix) merged = R.fix(merged, local, rem);
        if (R.sort) merged = R.sort(merged);
        const json = JSON.stringify(merged);
        if (json !== localRaw) { R.write(json); changed = true; }
        if (!rem || json !== JSON.stringify(rem)) await push(sb, row, json);
        if (gen !== S.gen) return;
        lsSet(baseKey(row), json);
        S.seen[row] = R.local();
      }
      S.ready = true; S.tries = 0; S.lastPull = Date.now();
    } catch (e) {
      retry();
    } finally {
      if (gen === S.gen) S.busy = false;
      if (changed && gen === S.gen) redraw();
      if (gen === S.gen && S.dirty) kick();
    }
  }
  function retry() {
    clearTimeout(S.timer);
    if (S.tries++ > 40) return;                               // give up quietly after ~10 minutes; next sign-in tries again
    S.timer = setTimeout(syncAll, Math.min(30000, 3000 + S.tries * 2000));
  }
  function kick() {
    if (!S.acct) return;
    S.dirty = true;
    if (!S.ready) return;                                     // the first merge picks it up
    clearTimeout(S.timer);
    S.timer = setTimeout(syncAll, 400);
  }
  function watchLocal() {                                     // other code (Log Hours, Add Shift, the AI shift finder) writes these keys directly
    if (!S.ready || S.busy || !ownerOK(me())) return;
    if (ROW_NAMES.some(row => ROWS[row].local() !== S.seen[row])) kick();
  }

  /* move old separate money lists into the Hours log / withdrawals (real teens, once) */
  const SAMPLE_EARN = new Set(['Lawn Mowing – Park Ave|3|54', 'Dog Walking – Martinez|2|30', 'Snow Shoveling|1.5|30', 'Babysitting – Hendersons|4|56']);
  function migrate() {
    const el = arr(parse(lsGet('tw_earnings_log'))), sh = arr(parse(lsGet('tw_savings_history')));
    if (!el.length && !sh.length) return;
    const log = worklog(), wd = withdrawals();
    el.forEach(e => {
      if (SAMPLE_EARN.has(e.job + '|' + e.hours + '|' + e.pay)) return;
      log.push({ id: newId(), job: e.job || 'Cash job', date: dayOf(e.date) || today(), hours: num(e.hours), pay: num(e.pay), task: guessTask(e.job), notes: 'Cash job', source: 'cash' });
    });
    sh.forEach(h => {
      const d = dayOf(h.date) || today();
      if (h.type === 'spend') wd.push({ id: 'w' + newId(), amount: num(h.amount), date: d, note: h.label || '' });
      else if (h.type === 'earn' && num(h.amount) > 0) log.push({ id: newId(), job: h.label || 'Earnings', date: d, hours: 0, pay: num(h.amount), task: 'other', notes: 'Earnings', source: 'savings' });
    });
    setWorklog(sortLog(log)); setWithdrawals(wd);
    lsSet('tw_earnings_log', '[]'); lsSet('tw_savings_history', '[]');
    try { if (typeof earningsLog !== 'undefined' && Array.isArray(earningsLog)) earningsLog.length = 0; } catch (e) {}
  }

  /* ── wiring ──────────────────────────────────────────────────────── */
  function onLaunch() {
    const u = me();
    clearTimeout(S.timer);
    S = { gen: S.gen + 1, acct: isReal(u) && isTeen(u) ? acctOf(u) : '', ready: false, busy: false, dirty: false, tries: 0, lastPull: 0, seen: {}, timer: null };
    launchedAt = Date.now();
    closeShift(); window.twCloseWithdraw();
    if (!isTeen(u)) return;
    injectStyle();
    if (isReal(u)) { try { migrate(); } catch (e) { console.warn('money-hours: migrate', e); } syncAll(); }
    setTimeout(redraw, 300);
  }
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') {
    window.launchDashboard = function () {
      const r = _oLaunch.apply(this, arguments);
      try { onLaunch(); } catch (e) { console.warn('money-hours: launch', e); }
      return r;
    };
  }
  // draw Earnings / Savings / Work Log whenever they open, whatever opened them
  const DRAW = {
    'ttab-earnings': () => drawEarnings(),
    'ttab-savings': () => { if (typeof window.renderSavingsTab === 'function') window.renderSavingsTab(); drawSavings(); },
    'ttab-worklog': () => { if (typeof window.renderWorkLogTab === 'function') window.renderWorkLogTab(); drawWeek(); },
  };
  function watchPanels() {
    Object.keys(DRAW).forEach(id => {
      const p = $(id); if (!p || p.__mh) return; p.__mh = true;
      const draw = () => { if (p.classList.contains('active') && isTeen(me())) { injectStyle(); try { DRAW[id](); } catch (e) { console.warn('money-hours: ' + id, e); } } };
      new MutationObserver(recs => { if (p.classList.contains('active') && recs.some(r => !/(^|\s)active(\s|$)/.test(r.oldValue || ''))) setTimeout(draw, 0); })
        .observe(p, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
      draw();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchPanels); else watchPanels();

  setInterval(() => {
    const u = me(); if (!isTeen(u)) return;
    try { watchLocal(); } catch (e) {}
    try { drawHomeCard(); } catch (e) {}
    try { maybeAsk(); } catch (e) {}
  }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (S.ready && Date.now() - S.lastPull > 60000) syncAll();     // pick up what another device added
      setTimeout(maybeAsk, 1000);
    } else if (S.dirty && S.ready) syncAll();
  });

  window._twMoneyHours = { totals, ledger, week, sync: syncAll, state: () => ({ acct: S.acct, ready: S.ready, busy: S.busy, dirty: S.dirty }), ask: maybeAsk, merge };
})();
