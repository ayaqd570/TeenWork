/* ═══════════════════════════════════════════════════════════════════
   work-rules-v52 — one source for the work-hour and permit guidance teens see
   (2026-11-02, Aya's practice-account test, priority 1; all states added the
   same day after Aya asked to "have all the states rules")
   Before: Find Jobs said a 16-year-old in Vermont had no federal hour limit,
   while Work Log said "max 18 hrs/week", measured the week against a 15 h
   "weekly limit" and printed the Vermont permit sentence twice. The 18 h is
   the federal rule for ages 14–15 only, and the 15 h was the app's default
   hours setting, not a law.
   Now every Teen screen that talks about hours or permits reads this file:
   • Find Jobs "work guidance" banner (window.twRenderLaborSummary)
   • Work Log: the rules box, the "this week" status line and the weekly bar
   • Calendar weekly bar, the apply / chat hour notices (app-05)
   • Verification page "check a job" grid (TW_Verify.runComplianceCheck)
   • STATE_DATA's hour fields and notes (the job cards, the AI coach and the
     calendar shift check read those), rewritten from this file at load.
   Legal limits, a parent's limit (parent-hours-v52) and the teen's own weekly
   goal are kept apart: the goal is a personal target saved on the account
   (the old 'max-weekly-hours' setting) and is always labelled "not a law".
   Sources (re-check before changing any number, then update REVIEWED):
   • 29 CFR 570.35 (eCFR, current to 2026-10-22): ages 14–15 hours/time of day.
   • US DOL WHD Fact Sheet #43 (rev. Dec 2016): no federal hour limits at 16–17,
     under-14 rule, hazardous orders, non-manufacturing/non-hazardous for 14–15.
   • US DOL "Selected State Child Labor Standards Affecting Minors Under 18 in
     Non-farm Employment as of July 15, 2025" (dol.gov/agencies/whd/state/
     child-labor), read 2026-11-02: every state's hours, days and night rules
     for under 16 and for 16–17 (STATES below). Footnote a: state school-day
     and school-week limits usually apply only to teens enrolled in school.
     Footnote c: "combined hours of work and school".
   • US DOL employment/age certificate table (rev. 2024-01-01): permits, kept
     in job-tiers-v45 PERMITS.
   • Vermont: 21 V.S.A. §§ 431, 434, 436, 437 (legislature.vermont.gov) and
     Vermont DOL guide WH-30 (the 9 h / 50 h rule for 16–17 in manufacturing
     or mechanical work comes only from WH-30).
   • California 16–17: the DOL table prints "3-18 school day/week", which
     doesn't match California's own Labor Commissioner (DLSE) pamphlet
     "California Child Labor Laws 2013" (4 h on a school day, 8 h on a
     non-school day, 48 h a week, 5 a.m.–10 p.m., 12:30 a.m. before a
     non-school day; EC 49116, LC 1391). TeenWork uses the DLSE figures.
   Where federal and state law differ, the stricter rule applies (29 U.S.C.
   218(a)), so for ages 14–15 the hours shown are the lower of the two.
   window.twWorkRules = { forTeen, current, weekTarget, weekStatusHTML, … }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.twWorkRules) return;

  const REVIEWED = '2026-11-02', REVIEWED_TEXT = 'Nov 2, 2026';
  const TABLE_DATE = 'July 15, 2025';
  const SRC = {
    cfr: { label: '29 CFR 570.35', url: 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35' },
    fs43: { label: 'US DOL Fact Sheet #43', url: 'https://www.dol.gov/agencies/whd/fact-sheets/43-child-labor-non-agriculture' },
    states: { label: 'US DOL state child labor table (' + TABLE_DATE + ')', url: 'https://www.dol.gov/agencies/whd/state/child-labor' },
    certs: { label: 'US DOL work permit table', url: 'https://www.dol.gov/agencies/whd/state/age-certificates' },
    offices: { label: 'state labor offices', url: 'https://www.dol.gov/agencies/whd/state/contacts' },
    vt431: { label: '21 V.S.A. § 431', url: 'https://legislature.vermont.gov/statutes/section/21/005/00431' },
    vt434: { label: '21 V.S.A. § 434', url: 'https://legislature.vermont.gov/statutes/section/21/005/00434' },
    vt436: { label: '21 V.S.A. § 436', url: 'https://legislature.vermont.gov/statutes/section/21/005/00436' },
    vt437: { label: '21 V.S.A. § 437', url: 'https://legislature.vermont.gov/statutes/section/21/005/00437' },
    wh30: { label: 'Vermont DOL guide WH-30', url: 'https://labor.vermont.gov/src/sites/labor/files/doc_library/WH-30-Information-for-Employer-Child-Labor-Law.pdf' },
    cadlse: { label: 'California DLSE child labor guide', url: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf' },
  };

  /* ── the rules (one place to change them) ─────────────────────────── */
  // Federal (FLSA), non-farm work. 29 CFR 570.35(a) and Fact Sheet #43.
  const FED = {
    minAge: 14,
    under16: { schoolDay: 3, schoolWeek: 18, nonSchoolDay: 8, nonSchoolWeek: 40, start: '7 a.m.', end: '7 p.m.', summerEnd: '9 p.m.' },
    hazardUnder: 18,
  };
  const FED_TIME = 'Between 7 a.m. and 7 p.m. (9 p.m. from June 1 through Labor Day).';

  /* Every state's own rules, from the US DOL state table (as of July 15, 2025).
     u = under 16, o = 16 and 17, o17 = 17 only (when it differs from 16).
     Numbers are the state's own maxima in hours; a missing number means the state sets none:
       sd school day · sw school week · nd non-school day · nw non-school week
       d any day · w any week · days days a week · cd / cw school + work hours combined
       sw2 a higher summer week (NJ)
     h = the hours in words when numbers alone would mislead · s = a shorter version for the one-line summary
     n = time-of-day rule · x = anything else. */
  const F = { sd: 3, sw: 18, nd: 8, nw: 40 };                       // the table's "8-40 non-school / 3-18 school"
  const N7 = 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day).';
  const RAW = {
    'Alabama': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).' },
      o: { n: 'If you\'re in school: no work from 10 p.m. to 5 a.m. before a school day. The state can grant exceptions.' } },
    'Alaska': { u: { cd: 9, cw: 23, days: 6, h: 'School and work together: at most 9 h a day and 23 h a week, and no more than 6 days a week.', n: 'No work from 9 p.m. to 5 a.m.' },
      o: { days: 6, h: 'No more than 6 days a week.' } },
    'Arizona': { u: { ...F, n: 'No work from 9:30 p.m. (11 p.m. before a non-school day) to 6 a.m. Door-to-door sales or deliveries: no work from 7 p.m. to 6 a.m.' }, o: {} },
    'Arkansas': { u: { d: 8, w: 48, days: 6, n: 'No work from 7 p.m. (9 p.m. before a non-school day) to 6 a.m.' },
      o: { d: 10, h: 'At 16: no more than 10 hours in a row, or in any 24 hours.', s: 'no more than 10 hours in a row, or in any 24 hours', n: 'At 16: no work from 11 p.m. to 6 a.m. before a school day.' }, o17: {} },
    'California': { u: { ...F, n: N7 },
      o: { sd: 4, nd: 8, w: 48, h: 'Up to 4 h on a school day and 8 h on a non-school day or the day before one; up to 48 h a week.', n: 'No work from 10 p.m. (12:30 a.m. before a non-school day) to 5 a.m.' },
      extra: ['cadlse'] },
    'Colorado': { u: { sd: 6, sw: 40, nd: 8, nw: 40, n: 'No work from 9:30 p.m. to 5 a.m. before a school day.' }, o: { d: 8, w: 40 } },
    'Connecticut': { u: { nd: 8, nw: 40, h: 'Up to 8 h a day and 40 h a week during school vacations of 5 days or more.', n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from July 1 to the first Monday in September).' },
      o: { sd: 6, sw: 32, nd: 8, nw: 48, days: 6, s: 'if you\'re in high school, up to 6 h on a school day and 32 h in a school week in most businesses (8 h a day and 48 h a week when school is out)', h: 'If you\'re in high school: up to 6 h on a school day and 32 h in a school week in restaurants, stores, entertainment, factories, salons and most other businesses; up to 8 h a day, 48 h a week and 6 days a week when school is out.',
        n: 'Restaurants, entertainment and theaters: no work from 11 p.m. (midnight during vacations or before a non-school day) to 6 a.m. Stores, factories and mechanical work: no work from 10 p.m. (11 p.m. during vacations or before a non-school day; midnight in large supermarkets when there\'s no school the next day) to 6 a.m. Salons, bowling alleys, pool halls and photo studios: no work from 10 p.m. to 6 a.m.' } },
    'Delaware': { u: { sd: 4, sw: 18, nd: 8, nw: 40, days: 6, n: N7 },
      o: { cd: 12, h: 'School and work together: at most 12 h a day.', s: 'school and work hours together can\'t top 12 h a day', n: 'You need 8 hours in a row off work and school in every 24 hours.' } },
    'District of Columbia': { u: { d: 8, w: 48, days: 6, n: N7 }, o: { d: 8, w: 48, days: 6, n: 'No work from 10 p.m. to 6 a.m.' } },
    'Florida': { u: { sd: 3, sw: 15, nd: 8, nw: 40, days: 6, n: 'No work from 7 p.m. before a school day to 7 a.m. on a school day (9 p.m. during holidays and summer vacation).' },
      o: { sd: 8, sw: 30, days: 6, s: 'when school is in session, up to 8 h a day and 30 h a week, 6 days a week', h: 'When school is in session: up to 8 h a day and 30 h a week, 6 days a week.', n: 'No work from 11 p.m. to 6:30 a.m. before a school day.' } },
    'Georgia': { u: { sd: 4, sw: 40, nd: 8, nw: 40, n: 'No work from 9 p.m. to 6 a.m.' }, o: {} },
    'Hawaii': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (from 9 p.m. to 6 a.m. during school breaks).' }, o: {} },
    'Idaho': { u: { d: 9, w: 54, n: 'No work from 9 p.m. to 6 a.m.' }, o: {} },
    'Illinois': { u: { ...F, n: N7 }, o: {} },
    'Indiana': { u: { ...F, n: N7 }, o: {} },
    'Iowa': { u: { sd: 6, sw: 28, nd: 8, nw: 40, n: 'No work from 9 p.m. (11 p.m. from June 1 through Labor Day) to 7 a.m.' }, o: {} },
    'Kansas': { u: { d: 8, w: 40, n: 'No work from 10 p.m. to 7 a.m. before a school day.' }, o: {} },
    'Kentucky': { u: { ...F, n: N7 },
      o: { sd: 6, sw: 30, s: 'when school is in session, up to 6 h on a school day and 30 h in a school week', h: 'When school is in session: up to 6 h on a school day and 30 h in a school week (40 h with a parent\'s permission and at least a 2.0 grade point average).', n: 'When school is in session: no work from 11 p.m. (1 a.m. on Friday and Saturday nights) to 6 a.m.' } },
    'Louisiana': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). If you haven\'t graduated: no work from 7 p.m. to 7 a.m. on a school day, or from 9 p.m. to 7 a.m. on other days.' },
      o: { n: 'If you haven\'t graduated: no work from 11 p.m. to 5 a.m. before a school day.' },
      o17: { n: 'If you haven\'t graduated: no work from midnight to 5 a.m. before a school day.' } },
    'Maine': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).' },
      o: { sd: 6, sw: 24, nd: 10, nw: 50, days: 6, s: 'if you\'re in school, up to 6 h on a school day and 24 h in a school week (10 h a day and 50 h a week when school is out)', h: 'If you\'re in school: up to 6 h on a school day (8 h on the last school day of the week) and 24 h in a school week; up to 10 h a day and 50 h a week when school is out; 6 days a week.',
        n: 'If you\'re in school: no work from 10:15 p.m. (midnight before a non-school day) to 7 a.m. on a school day, or to 5 a.m. on other days.' } },
    'Maryland': { u: { sd: 4, sw: 23, nd: 8, nw: 40, n: 'No work from 8 p.m. to 7 a.m. (9 p.m. from Memorial Day through Labor Day).' },
      o: { cd: 12, h: 'School and work together: at most 12 h a day.', s: 'school and work hours together can\'t top 12 h a day', n: 'You need 8 hours in a row off work and school in every 24 hours.' } },
    'Massachusetts': { u: { d: 8, w: 48, days: 6, n: 'Work only between 6:30 a.m. and 7 p.m. during the school year, and between 6:30 a.m. and 9 p.m. from July 1 through Labor Day.' },
      o: { d: 9, w: 48, days: 6, n: 'Work only between 6 a.m. and 10 p.m. before a school day (10:15 p.m. if the business stops serving customers at 10), and between 6 a.m. and 11:30 p.m. on other nights (midnight in restaurants and racetracks).' } },
    'Michigan': { u: { sd: 3, sw: 18, nw: 40, n: N7 },
      o: { sd: 10, sw: 24, nd: 10, nw: 48, h: 'Up to 10 h a day; up to 24 h in a school week and 48 h a week when school is out.', n: 'If you\'re in school: no work from 10:30 p.m. (11:30 p.m. on Fridays, Saturdays and school vacations) to 6:30 a.m. If you\'re not in school: no work from 11:30 p.m. to 6 a.m.' } },
    'Minnesota': { u: { d: 8, w: 40, n: 'No work from 9 p.m. to 7 a.m.' },
      o: { n: 'No work from 11 p.m. to 5 a.m. before a school day (11:30 p.m. to 4:30 a.m. with a parent\'s written permission).' } },
    'Mississippi': { u: { x: 'Mississippi\'s own limits (8 h a day, 44 h a week, no work from 7 p.m. to 6 a.m.) cover factories, mills, canneries and workshops, which are off-limits under 16 anyway.' }, o: {} },
    'Missouri': { u: { sd: 3, sw: 40, nd: 8, nw: 40, days: 6, n: N7 }, o: {} },
    'Montana': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. outside the school year, about June 1 through Labor Day).' }, o: {} },
    'Nebraska': { u: { d: 8, w: 48, n: 'At 14 and 15: no work from 10 p.m. to 6 a.m. (later before a non-school day with a special permit). Under 14: no work from 8 p.m. to 6 a.m.' }, o: {} },
    'Nevada': { u: { d: 8, w: 48 }, o: {} },
    'New Hampshire': { u: { sd: 3, sw: 23, nd: 8, nw: 48, n: 'No work from 9 p.m. to 7 a.m.' },
      o: { sw: 30, nw: 48, days: 6, s: 'if you\'re in school, up to 30 h in a school week and 48 h in a vacation week', h: 'If you\'re in school: up to 30 h in a school week and 48 h in a vacation week, 6 days a week.' } },
    'New Jersey': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from the last day of school through Labor Day, in weeks without school, with written permission).' },
      o: { d: 8, w: 40, days: 6, sw2: 50, s: 'up to 8 h a day and 40 h a week (10 h a day and 50 h a week from the last day of school through Labor Day)', h: 'Up to 8 h a day, 40 h a week and 6 days a week. From the last day of school through Labor Day: up to 10 h a day and 50 h a week.', n: 'During the school term: no work from 11 p.m. to 6 a.m. (with some exceptions).' } },
    'New Mexico': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. outside the school year).' }, o: {} },
    'New York': { u: { ...F, days: 6, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 21 through Labor Day).' },
      o: { sd: 4, sw: 28, nd: 8, nw: 48, days: 6, s: 'if you\'re in school, up to 4 h before a school day and 28 h in a school week (8 h a day and 48 h a week when school is out)', h: 'If you\'re in school: up to 4 h before a school day, 8 h on a Friday, Saturday, Sunday or holiday, and 28 h in a school week. When school is out: up to 8 h a day, 48 h a week and 6 days a week.',
        n: 'While school is in session: no work from 10 p.m. to 6 a.m. (midnight with written permission from a parent and the school before a school day, or from a parent before a non-school day). When school is out: no work from midnight to 6 a.m.' } },
    'North Carolina': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).' },
      o: { n: 'While school is in session: no work from 11 p.m. to 5 a.m. before a school day, unless a parent and the school give written permission.' } },
    'North Dakota': { u: { ...F, n: N7 }, o: {} },
    'Ohio': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 to September 1 and during school holidays of 5 school days or more). Door-to-door sales: no work from 7 p.m. to 7 a.m.' },
      o: { n: 'If you have to attend school: no work after 11 p.m. before a school day, or before 7 a.m. on a school day (6 a.m. if you didn\'t work after 8 p.m. the night before). Door-to-door sales: no work from 8 p.m. to 7 a.m.' } },
    'Oklahoma': { u: { ...F, n: N7, x: 'Employers not covered by federal law have a few extra exceptions.' }, o: {} },
    'Oregon': { u: { ...F, days: 6, n: N7 }, o: { w: 44 } },
    'Pennsylvania': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation, June through Labor Day).', x: 'No more than 6 days a week when school is out.' },
      o: { sd: 8, sw: 28, nd: 10, nw: 48, days: 6, n: 'If you\'re in school: no work from midnight (1 a.m. before a non-school day) to 6 a.m.' } },
    'Rhode Island': { u: { d: 8, w: 40, n: 'No work from 7 p.m. to 6 a.m. (9 p.m. during school vacation).' },
      o: { d: 9, w: 48, n: 'If you\'re in school: no work from 11:30 p.m. (1:30 a.m. before a non-school day) to 6 a.m.' } },
    'South Carolina': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. during your school district\'s summer break).' }, o: {} },
    'South Dakota': { u: { sd: 4, sw: 20, nd: 8, nw: 40, n: 'No work after 10 p.m. before a school day.' }, o: {} },
    'Tennessee': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (from 9 p.m. to 6 a.m. before a non-school day).' },
      o: { n: 'Sunday to Thursday before a school day: no work from 10 p.m. to 6 a.m. (midnight up to 3 nights a week with a parent\'s permission).' } },
    'Texas': { u: { d: 8, w: 48, n: 'No work from 10 p.m. to 5 a.m. (midnight before a non-school day, or in summer if you\'re not in summer school).' }, o: {} },
    'Utah': { u: { ...F, n: N7 }, o: {} },
    // Also checked against 21 V.S.A. §§ 434 and 437(b); the factory rule is from WH-30 only.
    'Vermont': { u: { ...F, days: 6, n: N7 }, o: {}, factory: { day: 9, week: 50 }, extra: ['vt431', 'vt434', 'vt436', 'vt437', 'wh30'] },
    'Virginia': { u: { ...F, n: N7 }, o: {} },
    'Washington': { u: { sd: 3, sw: 16, nd: 8, nw: 40, days: 6, h: 'Up to 3 h on a school day (8 h on Saturday and Sunday) and 16 h in a school week; up to 8 h a day and 40 h a week when school is out; 6 days a week.',
        n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). An adult must supervise you after 8 p.m. in jobs like restaurants and stores.' },
      o: { sd: 4, sw: 20, nd: 8, nw: 48, days: 6, n: 'No work from 10 p.m. Sunday to Thursday (midnight on Friday, Saturday and when school is out) to 7 a.m. (5 a.m. when school is out). Door-to-door sales: no work from 9 p.m. to 7 a.m. An adult must supervise you after 8 p.m. in jobs like restaurants and stores.' } },
    'West Virginia': { u: { ...F, n: 'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). With a supervision permit you can work until 11 p.m. when school is out.' }, o: {} },
    'Wisconsin': { u: { ...F, days: 6, n: N7 }, o: {} },
    'Wyoming': { u: { h: 'No more than 8 h in any 12-hour period.', n: 'No work from 10 p.m. (midnight before a non-school day, or if you\'re not in school) to 5 a.m.' }, o: {} },
  };

  // Normalised view, kept for other scripts and tests: STATES[name].under16 etc.
  const num = v => (typeof v === 'number' && v > 0 ? v : null);
  const minOf = (...v) => { const n = v.filter(x => x != null); return n.length ? Math.min(...n) : null; };
  function norm(r) {
    if (!r) return null;
    return { schoolDay: num(r.sd), schoolWeek: num(r.sw), nonSchoolDay: num(r.nd), nonSchoolWeek: num(r.nw), day: num(r.d), week: num(r.w),
      combinedDay: num(r.cd), combinedWeek: num(r.cw), summerWeek: num(r.sw2), daysPerWeek: num(r.days), hoursText: r.h || '', short: r.s || '', night: r.n || '', extra: r.x || '' };
  }
  const STATES = {};
  Object.keys(RAW).forEach(name => {
    const r = RAW[name], u = norm(r.u);
    STATES[name] = {
      reviewed: REVIEWED, table: TABLE_DATE,
      own16: u, over16: norm(r.o), over17: r.o17 ? norm(r.o17) : null, factory: r.factory || null,
      // what applies under 16 where federal law covers the job: the lower number of the two
      under16: {
        schoolDay: minOf(FED.under16.schoolDay, u.schoolDay), schoolWeek: minOf(FED.under16.schoolWeek, u.schoolWeek),
        nonSchoolDay: minOf(FED.under16.nonSchoolDay, u.nonSchoolDay, u.day), nonSchoolWeek: minOf(FED.under16.nonSchoolWeek, u.nonSchoolWeek, u.week),
        daysPerWeek: u.daysPerWeek, start: FED.under16.start, end: FED.under16.end, summerEnd: FED.under16.summerEnd,
      },
      sources: ['states'].concat(r.extra || []),
    };
  });
  const GOAL_OPTIONS = [5, 8, 10, 12, 15, 20, 25, 30];
  const NO_GOAL = 999;            // the old "Use State Limits" value: no personal goal

  /* ── helpers ──────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const ABBR = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  const NAMES = Object.values(ABBR);
  function stateName(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (ABBR[s.toUpperCase()]) return ABBR[s.toUpperCase()];
    if (/^(washington,? )?d\.?c\.?$/i.test(s)) return 'District of Columbia';
    return NAMES.find(n => n.toLowerCase() === s.toLowerCase()) || '';
  }
  const stateData = () => { try { return typeof STATE_DATA !== 'undefined' ? STATE_DATA : null; } catch (e) { return null; } };
  function ageOf(u) {
    if (u && u.dob) {
      const d = new Date(/^\d{4}-\d\d-\d\d$/.test(u.dob) ? u.dob + 'T00:00:00' : u.dob), n = new Date();
      if (!isNaN(d)) { const a = n.getFullYear() - d.getFullYear() - (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate()) ? 1 : 0); return a >= 10 && a <= 17 ? a : null; }
    }
    const a = Number(u && u.age); return Number.isInteger(a) && a >= 10 && a <= 17 ? a : null;
  }
  const h = n => n + ' h';
  const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const the = name => (name === 'District of Columbia' ? 'D.C.' : name);

  // A state's hours in words (from its numbers, unless the data gives the words).
  function hoursWords(r) {
    if (!r) return '';
    if (r.hoursText) return r.hoursText;
    const parts = [];
    const pair = (a, aw, b, bw) => [a != null ? h(a) + aw : '', b != null ? h(b) + bw : ''].filter(Boolean).join(' and ');
    const school = pair(r.schoolDay, ' on a school day', r.schoolWeek, ' in a school week');
    const out = pair(r.nonSchoolDay, ' a day', r.nonSchoolWeek, ' a week');
    const any = pair(r.day, ' a day', r.week, ' a week');
    if (school) parts.push('up to ' + school);
    if (out) parts.push((school ? '' : 'up to ') + out + ' when school is out');
    if (any) parts.push('up to ' + any);
    if (r.daysPerWeek) parts.push(r.daysPerWeek + ' days a week at most');
    return parts.length ? cap1(parts.join('; ')) + '.' : '';
  }
  const sameAsFed = u => u && u.schoolDay === 3 && u.schoolWeek === 18 && u.nonSchoolDay === 8 && u.nonSchoolWeek === 40 && !u.day && !u.week && !u.combinedDay && !u.hoursText;

  /* ── permit: the data lives in job-tiers-v45 (PERMITS, from the DOL table) ── */
  function permitLine(state, age) {
    try {
      const jt = window.twJobTiers;
      if (jt && typeof jt.permitNeeded === 'function') { const p = jt.permitNeeded(state, age); if (p && p.note) return p.note; }
    } catch (e) {}
    return '';
  }
  // Older STATE_DATA notes, without their permit sentences (only for a state missing from STATES).
  const PERMIT_SENTENCE = /permit|certificate|working papers|get it from|apply through|proof of age|child labor law poster|parental (consent|notification)/i;
  function olderNotes(state) {
    const e = (stateData() || {})[state]; if (!e || e.__tw52) return '';
    let n = String(e.notes || '');
    if (e.permitNote) n = n.split(e.permitNote).join(' ');
    return n.split(/(?<=\.)\s+/).filter(s => s && !PERMIT_SENTENCE.test(s)).join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  /* ── the teen's own weekly goal (not a law) and a parent's limit ──── */
  function controls() { try { return typeof parentalControls !== 'undefined' ? parentalControls : null; } catch (e) { return null; } }
  function goalHours() {
    const c = controls(); const n = Number(c && c['max-weekly-hours']);
    return n > 0 && n < NO_GOAL ? n : null;
  }
  function parentLimit() {
    try { const p = typeof window.twParentHourLimit === 'function' ? window.twParentHourLimit() : null; return p && p.hours > 0 ? p : null; } catch (e) { return null; }
  }
  function setGoal(n) {
    const c = controls(); if (!c) return;
    n = Number(n); c['max-weekly-hours'] = n > 0 && n < NO_GOAL ? n : NO_GOAL;
    try { if (typeof saveUserData === 'function') saveUserData(); } catch (e) {}
    try { if (typeof window.twMoneyRedraw === 'function') window.twMoneyRedraw(); } catch (e) {}
    renderWorkLogRules();
    try { const b = $('teen-state-rules-banner'); if (b) window.twRenderLaborSummary(b); } catch (e) {}
  }

  /* ── what applies to one teen ─────────────────────────────────────── */
  function forTeen(age, state) {
    const name = stateName(state);
    const out = { age, state: name, known: !!(age && name), verified: !!STATES[name], reviewed: REVIEWED, summary: '', lines: [], permit: '', older: '', sources: [], week: null, day: null };
    if (!out.known) {
      out.summary = 'Add your age and state to see the work rules that apply to you.';
      out.lines.push(['Why', 'Your age or state is missing from your profile. A search filter does not show where you work. Ask a parent to review each job and your local rules.']);
      return out;
    }
    const S = STATES[name] || null, nm = the(name);
    const u16 = (S && S.under16) || FED.under16;
    const src = new Set(['cfr', 'fs43']);
    const hoursLine = () => `Outside school hours only. Up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a week when school is in session; up to ${h(u16.nonSchoolDay)} a day and ${h(u16.nonSchoolWeek)} a week when school is out.` +
      (u16.daysPerWeek ? ` No more than ${u16.daysPerWeek} days a week (${nm}).` : '');
    const stricterLine = () => {                   // where the state's own numbers differ, say whose number is shown
      if (!S || sameAsFed(S.own16)) return;
      const own = hoursWords(S.own16);
      if (own) out.lines.push([nm + ' law', own + ' Where federal and ' + nm + ' limits differ, the lower one is shown above.']);
    };
    const timeLines = () => {
      out.lines.push(['Time of day', 'Federal: ' + FED_TIME.charAt(0).toLowerCase() + FED_TIME.slice(1)]);
      if (S && S.own16.night && S.own16.night !== N7) out.lines.push([nm + ' time rule', S.own16.night + ' Follow whichever rule is stricter.']);
    };
    const weekOf = (school, outw, why, note) => (school != null || outw != null ? { school: school != null ? school : outw, out: outw, why, outNote: note || '' } : null);
    if (age < 14) {
      out.summary = `Age ${age} · ${name}: most jobs aren't allowed under 14. Check every task with a parent.`;
      out.lines.push(['Under 14', 'Federal law allows most jobs only from 14. It doesn\'t cover casual babysitting, small chores around private homes, delivering newspapers or acting.']);
      if (name === 'Vermont') {
        out.lines.push(['Vermont', 'Under 14, Vermont allows only jobs its Labor Commissioner has approved, during vacations or before and after school. Working for your own parent (not factory, mining or hazardous work), newspaper delivery and acting are the exceptions.']);
        out.lines.push(['Hours', 'Vermont\'s under-16 hours apply too: ' + hoursLine()]);
        out.lines.push(['Time of day', FED_TIME]);
        out.week = weekOf(u16.schoolWeek, u16.nonSchoolWeek, `Vermont limits everyone under 16 to ${h(u16.schoolWeek)} in a week when school is in session (${h(u16.nonSchoolWeek)} when school is out).`);
        out.day = { school: u16.schoolDay, out: u16.nonSchoolDay };
      } else if (S) {
        out.lines.push([nm, `Check with ${nm}'s labor office which jobs are allowed under 14. If a job is allowed, ${nm}'s under-16 rules apply: ` + (hoursWords(S.own16) || 'no extra hour limits.') + (S.own16.night ? ' ' + S.own16.night : '')]);
      }
    } else if (age < 16) {
      const fedWeek = u16.schoolWeek === FED.under16.schoolWeek;
      out.summary = `Age ${age} · ${name}: outside school hours, up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a school week.`;
      out.lines.push(['Hours', hoursLine()]);
      stricterLine();
      timeLines();
      if (S && S.own16.extra) out.lines.push(['Also', S.own16.extra]);
      out.lines.push(['Job types', 'Only non-factory, non-hazardous jobs at 14 and 15 (federal law).']);
      out.week = weekOf(u16.schoolWeek, u16.nonSchoolWeek, (fedWeek ? 'Federal law limits' : nm + ' law limits') + ` 14- and 15-year-olds to ${h(u16.schoolWeek)} in a week when school is in session (${h(u16.nonSchoolWeek)} when school is out).`);
      out.day = { school: u16.schoolDay, out: u16.nonSchoolDay };
    } else {
      const o = S ? ((age >= 17 && S.over17) || S.over16) : null;
      const words = o ? hoursWords(o) : '';
      const ageWords = age >= 17 && S && S.over17 ? '17-year-olds' : '16- and 17-year-olds';
      if (!S) {
        out.summary = `Age ${age} · ${name}: no federal hour limits at ${age}. ${name}'s own limits may be stricter. Hazardous jobs stay off-limits until 18.`;
      } else if (words) {
        const short = o.short || words.charAt(0).toLowerCase() + words.slice(1, -1);
        out.summary = `Age ${age} · ${name}: ${short}. Hazardous jobs stay off-limits until 18.`;
      } else if (o.night) {
        out.summary = `Age ${age} · ${name}: no hour limits for most jobs at ${age}, but ${nm} limits late-night work. Hazardous jobs stay off-limits until 18.`;
      } else {
        out.summary = `Age ${age} · ${name}: no hour limits for most jobs at ${age} under federal or ${nm} law. Hazardous jobs stay off-limits until 18.`;
      }
      out.lines.push(['Hours', 'Federal law sets no hour or time-of-day limits at 16 and 17.' + (S ? (words ? ` ${nm} law: ${words}` : ` ${nm}'s child labor law adds none for most jobs.`) : '')]);
      if (o && o.night) out.lines.push(['Time of day', o.night]);
      if (o && o.extra) out.lines.push(['Also', o.extra]);
      if (S && S.factory) out.lines.push(['Factory work', `In manufacturing or mechanical work, ${nm} allows at most ${h(S.factory.day)} a day and ${h(S.factory.week)} a week at 16 and 17.`]);
      if (o) {
        const school = o.schoolWeek != null ? o.schoolWeek : o.week, outw = o.nonSchoolWeek != null ? o.nonSchoolWeek : o.week;
        const outNote = o.summerWeek ? h(o.summerWeek) + ' from the last day of school through Labor Day' : '';
        out.week = weekOf(school, outw, `${nm} law limits ${ageWords} to ` + (school != null && school !== outw ? `${h(school)} in a week when school is in session` + (outw != null ? ` (${h(outw)} when school is out)` : '') : `${h(school != null ? school : outw)} a week`) + (outNote ? ` and ${outNote}` : '') + '.', outNote);
        const sd = o.schoolDay != null ? o.schoolDay : o.day, od = o.nonSchoolDay != null ? o.nonSchoolDay : o.day;
        if (sd != null || od != null) out.day = { school: sd != null ? sd : od, out: od };
      }
    }
    if (age >= 14) out.lines.push(['Off-limits until 18', 'Jobs federal law calls hazardous, such as driving for work, power saws, roofing, demolition and many power-driven machines.']);
    out.permit = permitLine(name, age);
    if (out.permit) { out.lines.push(['Work permit', out.permit]); src.add('certs'); }
    if (S) S.sources.forEach(k => src.add(k));
    else { out.older = olderNotes(name); }
    out.sources = [...src].map(k => SRC[k]).filter(Boolean);
    return out;
  }
  function current() { const u = me(); return forTeen(ageOf(u), u && u.state); }

  // The number every weekly check measures against: the lowest of the legal limit for a school week,
  // a linked parent's limit and the teen's own goal. Each carries the words the screens show.
  function weekTarget() {
    const r = current(), goal = goalHours(), par = parentLimit();
    const legal = r.week ? r.week.school : null;
    const c = [];
    if (legal != null) c.push({ hours: legal, kind: 'legal', name: 'legal limit for a school week', short: 'school-week limit', label: 'Legal school-week limit',
      reached: 'School-week limit reached', of: 'the ' + h(legal) + ' legal limit for a school week', why: r.week.why });
    if (par) {
      const who = String(par.name || 'Your parent').trim().split(/\s+/)[0] || 'Your parent';
      c.push({ hours: par.hours, kind: 'parent', by: who, name: 'parent\'s weekly limit', short: 'parent\'s weekly limit', label: 'Weekly limit set by ' + who + ' (not a law)',
        reached: 'Your parent\'s weekly limit reached', of: 'the ' + h(par.hours) + ' weekly limit ' + who + ' set',
        why: who + ' set a ' + par.hours + '-hour weekly limit for you from their parent account. It\'s a family rule, not a law. Talk to them if you\'d like it changed.' });
    }
    if (goal != null) c.push({ hours: goal, kind: 'goal', name: 'weekly goal', short: 'weekly goal', label: 'Weekly goal (not a law)', reached: 'Weekly goal reached',
      of: 'your ' + h(goal) + ' weekly goal', why: 'This is your own weekly goal, not a law. If your family agrees, you can change it in Work Log under "Work rules for your age".' });
    if (!c.length) return null;
    return c.reduce((a, b) => (b.hours < a.hours ? b : a));       // on a tie the law, then the parent, wins
  }
  window.twWeeklyHourLimit = function () { const t = weekTarget(); return t ? t.hours : 0; };

  // One line for "this week" (Work Log). Hours = hours logged this week.
  function weekStatusHTML(worked) {
    const r = current(), w = Math.round((Number(worked) || 0) * 10) / 10;
    const at = `You're at ${esc(h(w))} this week`;
    if (!r.known) return `<span>${at}. Add your age and state to your profile to compare it with the law.</span>`;
    if (!r.week && r.age < 14) return `<span style="color:var(--amber)">${at}. Most jobs aren't allowed under 14, so check each task with a parent.</span>`;
    if (!r.week) return `<span style="color:var(--green)">${at}. No legal weekly hour limit applies at ${esc(r.age)}${r.verified ? ' in ' + esc(the(r.state)) : ' under federal law'} for most jobs.</span>`;
    const wk = r.week, note = wk.outNote ? ` (${esc(wk.outNote)})` : '';
    if (wk.out != null && wk.out >= wk.school && w > wk.out && !wk.outNote) return `<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(wk.out))}: the legal limit even in a week without school.</span>`;
    if (w > wk.school) return `<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(wk.school))}: the legal limit for a week when school is in session` + (wk.out != null && wk.out !== wk.school ? ` (${esc(h(wk.out))} when school is out${note ? ', ' + esc(wk.outNote) : ''})` : note) + '.</span>';
    if (w >= wk.school * 0.8) return `<span style="color:var(--amber)">${at}, close to the ${esc(h(wk.school))} school-week limit.</span>`;
    return `<span style="color:var(--green)">${at}, within the ${esc(h(wk.school))} school-week limit ✓</span>`;
  }

  function weekWords(wk) {
    const note = wk.outNote ? ' (' + wk.outNote + ')' : '';
    if (wk.out == null) return `${h(wk.school)} in a week when school is in session; no limit when school is out.`;
    if (wk.out !== wk.school) return `${h(wk.school)} in a week when school is in session, ${h(wk.out)} when school is out${note}.`;
    return `${h(wk.school)} a week${note}.`;
  }
  function goalNote() {
    const g = goalHours(), p = parentLimit();
    const goal = g ? `Your weekly goal is ${h(g)}: a personal target you can change in Work Log, not a law.` : 'You have no weekly hours goal set. You can add one in Work Log.';
    return p ? goal + ` ${String(p.name || 'Your parent').split(/\s+/)[0]} also set a weekly limit of ${h(p.hours)} for you: a family rule, not a law.` : goal;
  }
  function sourcesHTML(r) {
    const links = r.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(', ');
    return `<p class="tw52-src">Checked against ${links} on ${REVIEWED_TEXT}. Laws change, so your <a href="${esc(SRC.offices.url)}" target="_blank" rel="noopener">state's labor office</a> has the latest rules. General guidance, not legal advice or a ruling that a job is legal. School enrollment, job duties and exceptions can change what applies.</p>`;
  }
  function linesHTML(r) {
    let s = '<dl class="tw52-rules">' + r.lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
    if (r.known && !r.verified) {
      s += `<p class="tw52-unverified"><strong>${esc(r.state)} rules not re-checked yet.</strong> The rules above are federal. ${esc(r.state)} may be stricter; check with its labor department.` +
        (r.older ? ` Older TeenWork notes (not re-checked): ${esc(r.older)}` : '') + '</p>';
    }
    return s;
  }

  /* ── Find Jobs banner ─────────────────────────────────────────────── */
  window.twRenderLaborSummary = function (banner) {
    if (!banner) return;
    const r = current();
    const html = '<strong>' + esc(r.summary) + '</strong><details class="tw-law-details"><summary>Full work guidance and limits</summary>' +
      linesHTML(r) + (r.known ? '<p class="tw52-goal">' + esc(goalNote()) + '</p>' + sourcesHTML(r) : '') + '</details>';
    // Compare with what was last written (the browser rewrites entities, so innerHTML never matches).
    if (banner._twHtml !== html || !banner.querySelector('.tw-law-details')) {
      const open = !!banner.querySelector('.tw-law-details[open]');
      banner.innerHTML = html; banner._twHtml = html;
      if (open) banner.querySelector('.tw-law-details').open = true;
    }
    if (!banner.classList.contains('show')) banner.classList.add('show');
  };

  /* ── Work Log rules box + goal picker ─────────────────────────────── */
  function renderWorkLogRules() {
    const box = $('tw52-wl-rules-text'); if (!box) return;
    const r = current(), g = goalHours(), p = parentLimit();
    const opts = [`<option value="${NO_GOAL}"${g == null ? ' selected' : ''}>No goal</option>`]
      .concat(GOAL_OPTIONS.concat(g && GOAL_OPTIONS.indexOf(g) < 0 ? [g] : []).sort((a, b) => a - b).map(n => `<option value="${n}"${n === g ? ' selected' : ''}>${n} h a week</option>`)).join('');
    const where = r.verified ? ' in ' + the(r.state) : ' under federal law (' + r.state + ' may be stricter)';
    const legalWeek = !r.known ? 'Add your age and state to your profile to see your legal limits.'
      : r.week ? weekWords(r.week)
        : `None for most jobs at ${r.age}${where}.`;
    const who = p ? String(p.name || 'Your parent').trim().split(/\s+/)[0] : '';
    const parentRow = p ? `<div class="tw52-wl-row"><span class="tw52-k">Parent's limit</span><span>${esc(h(p.hours))} a week, set by ${esc(who)}. <small>A family rule, not a law. Only ${esc(who)} can change it.</small></span></div>` : '';
    const goalHelp = p && (g == null || p.hours < g) ? `A personal target, not a law. ${esc(who)}'s ${esc(h(p.hours))} limit is lower, so it's the one that counts.` : 'A personal target, not a law.';
    const html = `<p class="tw52-wl-sum"><strong>${esc(r.summary)}</strong></p>` +
      `<div class="tw52-wl-row"><span class="tw52-k">Legal weekly limit</span><span>${esc(legalWeek)}</span></div>` + parentRow +
      `<div class="tw52-wl-row"><label class="tw52-k" for="tw52-goal">Your weekly goal</label><span><select id="tw52-goal" aria-describedby="tw52-goal-help">${opts}</select> <small id="tw52-goal-help">${goalHelp}</small></span></div>` +
      `<details class="tw-law-details"><summary>All rules for your age</summary>${linesHTML(r)}${r.known ? sourcesHTML(r) : ''}</details>`;
    if (box._twHtml !== html) {
      const open = !!box.querySelector('.tw-law-details[open]');
      box.innerHTML = html; box._twHtml = html;
      if (open) box.querySelector('.tw-law-details').open = true;
      const sel = $('tw52-goal'); if (sel) sel.onchange = () => setGoal(sel.value);
    }
  }

  /* ── Verification page: "check a job" grid ────────────────────────── */
  function wrapVerifyCheck() {
    let V; try { V = typeof TW_Verify !== 'undefined' ? TW_Verify : null; } catch (e) { V = null; }
    if (!V || typeof V.runComplianceCheck !== 'function' || V.runComplianceCheck.__tw52) return;
    const o = V.runComplianceCheck;
    const w = function () {
      const p = o.apply(this, arguments);           // writes its old grid synchronously, then asks the AI
      try {
        const age = parseInt(($('tw-ver-age') || {}).value, 10) || null, st = ($('tw-ver-state') || {}).value || '';
        const jtype = ($('tw-ver-job-type-check') || {}).value || '';
        const r = forTeen(age, st), grid = $('tw-ver-law-grid');
        const hazardous = /manufactur|construction/i.test(jtype);
        if (grid && r.known && !/farm/i.test(jtype)) {   // farm work keeps job-tiers' farm grid
          const rows = [
            ['Minimum age', age < 14 ? 'Most jobs start at 14' : 'Age ' + age + ' can work', age >= 14],
            ['School-day hours', r.day ? 'Up to ' + h(r.day.school) + ' a day' : 'No legal limit for most jobs', true],
            ['Weekly hours', r.week ? (r.week.out == null ? h(r.week.school) + ' school week · no limit otherwise' : r.week.out !== r.week.school ? h(r.week.school) + ' school week · ' + h(r.week.out) + ' otherwise' : h(r.week.school) + ' a week') : 'No legal limit for most jobs', true],
            ['Work permit', r.permit || 'Check your state', true],
            ['Job type', hazardous ? 'Blocked on TeenWork (hazardous work)' : (age < 14 ? 'Check with a parent' : 'Allowed for age ' + age), !hazardous && age >= 14],
            ['Checked', (r.verified ? 'Federal + ' + the(r.state) : 'Federal only (' + r.state + ' not re-checked)') + ' · ' + REVIEWED_TEXT, r.verified],
          ];
          grid.innerHTML = rows.map(([k, v, ok]) => `<div class="tw-ver-law-pill ${ok ? 'ok' : 'warn'}"><div class="tw-ver-pill-label">${esc(k)}</div><div class="tw-ver-pill-val">${esc(v)}</div></div>`).join('');
        }
      } catch (e) { console.warn('work-rules-v52: verify grid', e); }
      return p;
    };
    w.__tw52 = true; V.runComplianceCheck = w;
  }

  /* ── keep STATE_DATA in step (job cards, the shift check, banners and the AI read it) ── */
  function stateNotes(name) {
    const S = STATES[name], u = S.under16, nm = the(name), o = S.over16;
    const own = sameAsFed(S.own16) ? '' : ' ' + nm + ' law: ' + hoursWords(S.own16);
    let s = `Under 16: outside school hours, max ${u.schoolDay}h on a school day, ${u.schoolWeek}h in a school week, ${u.nonSchoolDay}h a day and ${u.nonSchoolWeek}h a week when school is out` +
      (u.daysPerWeek ? `, ${u.daysPerWeek} days a week` : '') + `, ${u.start}–${u.end} (${u.summerEnd} June 1–Labor Day; the stricter of federal and ${nm} rules).` + own +
      (S.own16.night && S.own16.night !== N7 ? ' ' + S.own16.night : '');
    const ow = hoursWords(o);
    s += ' Ages 16–17: ' + (ow || 'no hour limits for most jobs.') + (o.night ? ' ' + o.night : '');
    if (S.over17) s += ' At 17: ' + (hoursWords(S.over17) || '') + (S.over17.night ? ' ' + S.over17.night : (hoursWords(S.over17) ? '' : 'no extra limits.'));
    if (S.factory) s += ` Factory or mechanical work at 16–17: ${S.factory.day}h a day, ${S.factory.week}h a week.`;
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  function fixStateData() {
    const D = stateData(); if (!D) return;
    Object.keys(STATES).forEach(name => {
      const e = D[name]; if (!e || e.__tw52) return;
      const u = STATES[name].under16;
      e.schoolDayMax = u.schoolDay; e.schoolWeekMax = u.schoolWeek; e.summerMax = u.nonSchoolWeek; e.nightCurfew = '7pm';
      e.notes = (stateNotes(name) + ' ' + (e.permitNote || '')).trim();
      e.rulesSource = SRC.states.label; e.rulesReviewed = REVIEWED;
      e.__tw52 = true;
    });
  }

  function boot() {
    try { fixStateData(); } catch (e) {}
    try { wrapVerifyCheck(); } catch (e) {}
    try { renderWorkLogRules(); } catch (e) {}
  }
  boot();
  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => { boot(); setTimeout(boot, 1500); });

  window.twWorkRules = { REVIEWED, TABLE_DATE, SOURCES: SRC, FED, STATES, forTeen, current, weekTarget, weekStatusHTML, goalHours, parentLimit, setGoal, renderWorkLogRules, stateName, stateNotes, hoursWords, NO_GOAL };
})();
