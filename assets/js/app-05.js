
/* ─────────────────────────────────────────────────────────────────
   26A: CALENDAR EARNINGS & HOURS CALCULATOR
   Reads calShifts[], parses pay strings and start/end times,
   returns { totalHours, totalEarnings, weeklyHours, weeklyEarnings }
   ───────────────────────────────────────────────────────────────── */

function _parseShiftHours(shift) {
  if (!shift.start || !shift.end) return 0;
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, mins / 60);
}

function _parseShiftPay(shift) {
  // shift.pay examples: "$18/hr", "$15/hr", "$25 flat", "20/hr", ""
  if (!shift.pay) return 0;
  const hrs = _parseShiftHours(shift);
  const hourlyMatch = shift.pay.match(/\$?([\d.]+)\s*\/\s*hr/i);
  if (hourlyMatch) return parseFloat(hourlyMatch[1]) * hrs;
  const flatMatch = shift.pay.match(/\$?([\d.]+)/);
  if (flatMatch) return parseFloat(flatMatch[1]);
  return 0;
}

function _getWeekStart(date) {
  // Return Sunday of that week as YYYY-MM-DD
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function calcCalendarStats() {
  let totalHours = 0, totalEarnings = 0;
  const weekMap = {}; // weekStart → { hours, earnings }

  (window.calShifts || []).forEach(s => {
    const hrs = _parseShiftHours(s);
    const pay = _parseShiftPay(s);
    totalHours += hrs;
    totalEarnings += pay;
    const ws = _getWeekStart(s.date);
    if (!weekMap[ws]) weekMap[ws] = { hours: 0, earnings: 0 };
    weekMap[ws].hours += hrs;
    weekMap[ws].earnings += pay;
  });

  // Current week
  const thisWeekStart = _getWeekStart(new Date().toISOString().slice(0,10));
  const thisWeek = weekMap[thisWeekStart] || { hours: 0, earnings: 0 };

  return { totalHours, totalEarnings, weeklyHours: thisWeek.hours, weeklyEarnings: thisWeek.earnings, weekMap };
}

/* ── Render the stats banner inside the calendar tab ────────────── */
function renderCalEarningsBar() {
  let bar = document.getElementById('cal-earnings-bar');
  if (!bar) {
    // inject right above the calendar grid section
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    bar = document.createElement('div');
    bar.id = 'cal-earnings-bar';
    bar.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px;';
    grid.parentElement.insertBefore(bar, grid);
  }

  const s = calcCalendarStats();
  const maxWeekly = parentalControls['max-weekly-hours'] || 20;
  const pct = Math.min(100, (s.weeklyHours / maxWeekly) * 100);
  const barColor = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';

  bar.innerHTML = `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.7rem .9rem;text-align:center">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.4px">This Week</div>
      <div style="font-size:1.3rem;font-weight:900;color:var(--green)">${s.weeklyHours.toFixed(1)}<span style="font-size:.7rem;font-weight:600"> hrs</span></div>
      <div style="font-size:.7rem;color:var(--muted)">of ${maxWeekly} max</div>
    </div>
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.7rem .9rem;text-align:center">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.4px">This Week Pay</div>
      <div style="font-size:1.3rem;font-weight:900;color:var(--amber)">$${s.weeklyEarnings.toFixed(2)}</div>
      <div style="font-size:.7rem;color:var(--muted)">estimated</div>
    </div>
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.7rem .9rem;text-align:center">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.4px">Total Hours</div>
      <div style="font-size:1.3rem;font-weight:900;color:var(--blue)">${s.totalHours.toFixed(1)}</div>
      <div style="font-size:.7rem;color:var(--muted)">all shifts</div>
    </div>
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.7rem .9rem;text-align:center">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.4px">Total Earned</div>
      <div style="font-size:1.3rem;font-weight:900;color:var(--purple)">$${s.totalEarnings.toFixed(2)}</div>
      <div style="font-size:.7rem;color:var(--muted)">all shifts</div>
    </div>
  `;

  // Hours bar below grid
  let hoursBar = document.getElementById('cal-weekly-hours-bar');
  if (!hoursBar) {
    hoursBar = document.createElement('div');
    hoursBar.id = 'cal-weekly-hours-bar';
    hoursBar.style.marginBottom = '10px';
    bar.parentElement.insertBefore(hoursBar, bar.nextSibling);
  }
  hoursBar.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:.75rem;font-weight:700;color:var(--text)">⏱ Weekly Hour Limit</span>
      <span style="font-size:.75rem;font-weight:700;color:${barColor}">${s.weeklyHours.toFixed(1)} / ${maxWeekly} hrs ${pct>=100?'⚠️ LIMIT REACHED':''}</span>
    </div>
    <div style="background:#e9e9e9;border-radius:20px;height:9px;overflow:hidden">
      <div style="height:100%;border-radius:20px;background:${barColor};width:${pct}%;transition:width .4s"></div>
    </div>
    ${pct>=80&&pct<100 ? `<div style="font-size:.72rem;color:var(--amber);font-weight:600;margin-top:3px">⚠️ Almost at your weekly limit — ${(maxWeekly - s.weeklyHours).toFixed(1)} hours remaining</div>` : ''}
    ${pct>=100 ? `<div style="font-size:.72rem;color:var(--red);font-weight:600;margin-top:3px">🛑 Weekly hour limit reached. You cannot apply to more jobs this week.</div>` : ''}
  `;
}

// Patch calRender to always show the earnings bar
const _origCalRender = calRender;
window.calRender = function() {
  _origCalRender();
  setTimeout(renderCalEarningsBar, 30);
};

/* ─────────────────────────────────────────────────────────────────
   26B: HOUR-LIMIT ENFORCEMENT ON JOB APPLY
   Patches teenApply() to block applications when weekly hours
   are at or above the parent's max, notify parent, and show
   a friendly message to the teen.
   ───────────────────────────────────────────────────────────────── */

const _origTeenApply = typeof teenApply === 'function' ? teenApply : null;
window.teenApply = function(jobId, title) {
  const maxWeekly = parentalControls['max-weekly-hours'] || 20;
  const { weeklyHours } = calcCalendarStats();

  if (weeklyHours >= maxWeekly) {
    // Show hour-limit modal instead of applying
    _showHourLimitModal(title, weeklyHours, maxWeekly);
    // Notify parent
    _notifyParentHourLimit(title, weeklyHours, maxWeekly);
    return; // ← application is NOT submitted
  }

  if (_origTeenApply) _origTeenApply(jobId, title);
};

function _showHourLimitModal(jobTitle, currentHours, maxHours) {
  const existing = document.getElementById('hour-limit-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'hour-limit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .25s ease';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:1.8rem 1.6rem;max-width:380px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.22);text-align:center;font-family:'DM Sans',sans-serif">
      <div style="font-size:3rem;margin-bottom:.5rem">🛑</div>
      <h3 style="font-family:'Fraunces',serif;font-size:1.2rem;color:var(--red);margin-bottom:.5rem">Weekly Hour Limit Reached</h3>
      <p style="font-size:.88rem;color:var(--muted);line-height:1.6;margin-bottom:1rem">
        You've scheduled <strong>${currentHours.toFixed(1)} hours</strong> this week — your limit is <strong>${maxHours} hours</strong>.
        You can't apply to "<strong>${jobTitle}</strong>" right now.
      </p>
      <div style="background:var(--red-pale);border:1.5px solid #f5b7b1;border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem;font-size:.82rem;color:var(--red);text-align:left">
        <strong>⚠️ Your parent has been notified.</strong><br>
        If you think your schedule should be updated, talk to your parent to adjust the weekly hour limit.
      </div>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:1rem">
        💬 You can still <strong>message the employer</strong> to ask about scheduling for a future week.
      </p>
      <button onclick="document.getElementById('hour-limit-modal').remove()" style="background:var(--green);color:#fff;border:none;padding:11px 0;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.92rem;font-weight:700;cursor:pointer;width:100%">Got it</button>
    </div>`;
  document.body.appendChild(modal);
}

function _notifyParentHourLimit(jobTitle, currentHours, maxHours) {
  // Add to demo notifications (parent sees this)
  if (typeof demoNotifs !== 'undefined') {
    demoNotifs.unshift({
      text: `⚠️ HOUR LIMIT: Alex tried to apply to "${jobTitle}" but has already scheduled ${currentHours.toFixed(1)} hrs this week (limit: ${maxHours} hrs). Application was blocked automatically.`,
      time: 'Just now',
      read: false,
      type: 'hour-limit-alert'
    });
    if (typeof renderNotifications === 'function') renderNotifications();
  }
  // Push notification to parent
  if (typeof sendPushNotif === 'function') {
    sendPushNotif('⚠️ Hour Limit Alert', `Alex hit the ${maxHours}-hr weekly limit and was blocked from applying to "${jobTitle}".`);
  }
  if (typeof showToast === 'function') {
    showToast('⚠️ Parent has been notified about the hour limit.', 'info');
  }
}

/* ─────────────────────────────────────────────────────────────────
   26C: HOUR-LIMIT MESSAGE INTERCEPTION
   When a teen tries to MESSAGE an employer about timing but they're
   already at their hour limit, intercept the send and show a notice.
   Allow the message through ONLY if it's not about new hours/shifts.
   ───────────────────────────────────────────────────────────────── */

const _HOUR_REQUEST_PATTERN = /\b(can\s+i\s+(work|start|come|do|take)|i('m|\s+am)\s+(available|free|able)|want\s+to\s+(work|start|take)|available\s+(this|next|on)|could\s+i\s+(do|work|start)|apply|more\s+hours?|extra\s+(shift|hours?)|new\s+(shift|job|hours?))\b/i;

const _origSendMsgForLimit = typeof sendMsg === 'function' ? sendMsg : null;
window.sendMsg = (function() {
  const prev = window.sendMsg;
  return async function(contactId) {
    const maxWeekly = parentalControls['max-weekly-hours'] || 20;
    const { weeklyHours } = calcCalendarStats();

    if (weeklyHours >= maxWeekly) {
      const inputEl = document.getElementById('msg-input-' + contactId);
      const msgText = inputEl ? inputEl.value.trim() : '';

      if (msgText && _HOUR_REQUEST_PATTERN.test(msgText)) {
        // Block the message — it looks like a request for more work hours
        if (inputEl) {
          inputEl.value = '';
          inputEl.style.height = 'auto';
        }
        _showHourLimitMsgBlock(contactId);
        _notifyParentHourLimitMsg(contactId, msgText, weeklyHours, maxWeekly);
        return; // ← message NOT sent
      }
    }
    // Otherwise proceed normally
    if (prev) await prev(contactId);
  };
})();

function _showHourLimitMsgBlock(contactId) {
  const chatBody = document.getElementById('msg-chat-body-' + contactId);
  if (!chatBody) return;

  const notice = document.createElement('div');
  notice.className = 'msg-blocked';
  notice.style.cssText = 'background:#fff5f5;border:1.5px solid #f5b7b1;';
  notice.innerHTML = `
    <span class="msg-blocked-icon">🛑</span>
    <div>
      <span class="msg-blocked-label" style="color:var(--red)">Message Not Sent — Weekly Hour Limit Reached</span>
      <span class="msg-blocked-detail">You've reached your ${parentalControls['max-weekly-hours'] || 20}-hour weekly limit. Messages asking for new shifts or more hours won't go through until next week or your parent adjusts your limit. Your parent has been notified.</span>
    </div>`;
  chatBody.appendChild(notice);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function _notifyParentHourLimitMsg(contactId, msgText, currentHours, maxHours) {
  const contact = typeof msgAllContacts !== 'undefined'
    ? (msgAllContacts || []).find(c => c.id === contactId) : null;
  const contactName = contact ? contact.name : 'an employer';

  if (typeof demoNotifs !== 'undefined') {
    demoNotifs.unshift({
      text: `⚠️ MESSAGE BLOCKED: Alex tried to message ${contactName} about more work hours (${currentHours.toFixed(1)} hrs scheduled, limit: ${maxHours} hrs). Message was not sent.`,
      time: 'Just now',
      read: false,
      type: 'hour-limit-msg-alert'
    });
    if (typeof renderNotifications === 'function') renderNotifications();
  }
  if (typeof sendPushNotif === 'function') {
    sendPushNotif('⚠️ Message Blocked', `Alex tried to message ${contactName} about more shifts — hour limit blocked it.`);
  }
}

/* ─────────────────────────────────────────────────────────────────
   26D: AI AUTO-FILL SHIFT MODAL
   When teen opens "Add Shift", check recent messages for the current
   chat context and AI-fill job name, suggested hours, and date.
   Also adds an "AI Fill" button to the modal.
   ───────────────────────────────────────────────────────────────── */

// Track what contact the teen most recently messaged
let _lastMsgContact = null;
(function() {
  const prev = window.sendMsg;
  window.sendMsg = async function(contactId) {
    _lastMsgContact = contactId;
    if (prev) await prev(contactId);
  };
})();

// Patch openAddShiftModal to inject the AI Fill button
const _origOpenAddShiftModal = openAddShiftModal;
window.openAddShiftModal = function(prefillDate) {
  _origOpenAddShiftModal(prefillDate);

  // Inject AI Fill button if not present
  const modal = document.getElementById('addShiftModal');
  if (!modal) return;

  let aiFillRow = modal.querySelector('#ai-shift-fill-row');
  if (!aiFillRow) {
    const jobField = modal.querySelector('#shift-job')?.parentElement;
    if (jobField) {
      aiFillRow = document.createElement('div');
      aiFillRow.id = 'ai-shift-fill-row';
      aiFillRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
      aiFillRow.innerHTML = `
        <button id="ai-shift-fill-btn" onclick="aiAutoFillShift()" style="background:var(--blue-pale);color:var(--blue);border:1.5px solid #93c5fd;border-radius:8px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px">
          🤖 AI Fill from Messages
        </button>
        <span id="ai-shift-fill-status" style="font-size:.75rem;color:var(--muted)"></span>`;
      modal.querySelector('.modal-body,form,div')?.prepend(aiFillRow);
    }
  }
};

async function aiAutoFillShift() {
  const statusEl = document.getElementById('ai-shift-fill-status');
  const btn = document.getElementById('ai-shift-fill-btn');
  if (statusEl) statusEl.textContent = '🤖 Analyzing messages…';
  if (btn) { btn.disabled = true; }

  // Gather ALL messages from ALL contacts, tagged with a parsed timestamp for sorting
  const allContacts = typeof msgAllContacts !== 'undefined' ? (msgAllContacts || []) : [];

  // Build a flat, time-sorted list of messages across every contact
  // Each message object gets a numeric sort key derived from its time string.
  function _parseTimeKey(timeStr) {
    // Handles formats like "Apr 9, 10:15am", "Apr 10, 2:00pm"
    try {
      const d = new Date(timeStr + ' ' + new Date().getFullYear());
      if (!isNaN(d)) return d.getTime();
    } catch(e) {}
    // Fall back to lexicographic order if parse fails
    return timeStr || '';
  }

  let allFlatMsgs = [];
  allContacts.forEach(c => {
    (c.messages || []).forEach(m => {
      allFlatMsgs.push({
        contact: c,
        msg: m,
        sortKey: _parseTimeKey(m.time)
      });
    });
  });

  // Sort chronologically (oldest → newest)
  allFlatMsgs.sort((a, b) => {
    if (typeof a.sortKey === 'number' && typeof b.sortKey === 'number') return a.sortKey - b.sortKey;
    return String(a.sortKey).localeCompare(String(b.sortKey));
  });

  if (!allFlatMsgs.length) {
    if (statusEl) statusEl.textContent = '⚠️ No messages found';
    if (btn) btn.disabled = false;
    return;
  }

  // Take the most recent 30 messages (chronologically last) for context
  const recentMessages = allFlatMsgs.slice(-30).map(item =>
    `[${item.contact.name}] ${item.msg.from === 'me' ? 'Teen' : item.contact.name}: ${item.msg.text} (${item.msg.time})`
  );

  const todayLabel = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const prompt = `Today is ${todayLabel}.
Here are messages between a teen and their employers, sorted from oldest to most recent:

${recentMessages.join('\n')}

Look at the DATES on the messages carefully. Find ALL confirmed or upcoming work shifts — there may be multiple shifts on different days or even multiple messages about the same day. List each distinct shift.
If an employer's message confirms a different time than what the teen said, use the EMPLOYER's confirmed time.
Reply ONLY in this exact format, one block per shift, separated by ---:
JOB: <job name, max 8 words, e.g. "Lawn Mowing — Mike's Landscaping">
DATE: YYYY-MM-DD
START: HH:MM
END: HH:MM
PAY: <rate, e.g. "$15/hr" or "$30 flat" — if unknown write UNKNOWN>
NOTES: <any special instructions mentioned, max 12 words — if none write NONE>
---
(repeat for each shift)

If no specific confirmed shift is found, reply exactly: NONE`;

  try {
    const result = await callClaudeAI(prompt);
    if (!result || result.trim().toUpperCase() === 'NONE') {
      if (statusEl) statusEl.textContent = '⚠️ No confirmed shift found in messages';
      if (btn) btn.disabled = false;
      return;
    }
    const jobM   = result.match(/JOB:\s*(.+)/);
    const dateM  = result.match(/DATE:\s*(\d{4}-\d{2}-\d{2})/);
    const startM = result.match(/START:\s*(\d{1,2}:\d{2})/);
    const endM   = result.match(/END:\s*(\d{1,2}:\d{2})/);
    const payM   = result.match(/PAY:\s*(.+)/);
    const notesM = result.match(/NOTES:\s*(.+)/);

    if (jobM && jobM[1].trim()) document.getElementById('shift-job').value = jobM[1].trim();
    if (dateM) document.getElementById('shift-date').value = dateM[1];
    if (startM) document.getElementById('shift-start').value = startM[1];
    if (endM) document.getElementById('shift-end').value = endM[1];

    // ── NEW: Try to fill pay from job listings first, fall back to AI result ──
    const payEl = document.getElementById('shift-pay');
    let payFilled = false;
    if (payEl && !payEl.value) {
      // Match job listing by employer name embedded in the job string
      const jobStr = (jobM ? jobM[1] : '').toLowerCase();
      const allJobs = typeof demoJobs !== 'undefined' ? demoJobs : [];
      const matched = allJobs.find(j =>
        jobStr.includes((j.employer || '').toLowerCase()) ||
        jobStr.includes((j.title || '').toLowerCase().split(' ').slice(0,2).join(' '))
      );
      if (matched && matched.pay) {
        payEl.value = `$${matched.pay}${matched.payType === 'hourly' ? '/hr' : ' flat'}`;
        payFilled = true;
      }
    }
    if (!payFilled && payEl && !payEl.value && payM && payM[1].trim() && payM[1].trim() !== 'UNKNOWN') {
      payEl.value = payM[1].trim();
    }

    if (notesM && notesM[1].trim() && notesM[1].trim() !== 'NONE') {
      const notesEl = document.getElementById('shift-notes');
      if (notesEl && !notesEl.value) notesEl.value = notesM[1].trim();
    }

    if (statusEl) statusEl.textContent = '✅ Fields filled from messages — review & save!';
    if (typeof showToast === 'function') showToast('🤖 Shift details filled from your messages!', 'success');
  } catch(e) {
    if (statusEl) statusEl.textContent = '⚠️ AI unavailable — fill manually';
  }
  if (btn) btn.disabled = false;
}
window.aiAutoFillShift = aiAutoFillShift;

/* ─────────────────────────────────────────────────────────────────
   26E: "DID YOU ADD TO CALENDAR?" NOTICE
   After a message is confirmed as having a schedule (from scanMsgForJobTime),
   if the teen DISMISSES the notice without adding it, fire a reminder
   after 60 seconds if the date still hasn't been added.
   Also: if the AI detects a confirmed shift but it's NOT in calShifts,
   show a sticky "You haven't added this to your calendar" notice.
   ───────────────────────────────────────────────────────────────── */

// Track pending unconfirmed shifts (AI-detected but not added)
const _pendingUnaddedShifts = {};

// Patch showCalNotice to also register the pending shift
const _origShowCalNotice = showCalNotice;
window.showCalNotice = function(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay) {
  _origShowCalNotice(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay);
  // Register this shift as "pending add"
  _pendingUnaddedShifts[date + '|' + start] = { contactId, date, start, end, job, ts: Date.now() };
  // Set a 60s reminder if they don't add it
  setTimeout(() => _checkUnaddedShift(date, start, contactId), 60000);
};

// Patch calNoticeAdd to mark as added
const _origCalNoticeAdd = calNoticeAdd;
window.calNoticeAdd = function(contactId, date, start, end, job, btn) {
  _origCalNoticeAdd(contactId, date, start, end, job, btn);
  delete _pendingUnaddedShifts[date + '|' + start];
  renderCalEarningsBar();
};

function _checkUnaddedShift(date, start, contactId) {
  const key = date + '|' + start;
  if (!_pendingUnaddedShifts[key]) return; // already added
  // Check if it's actually in calShifts now
  const inCal = calShifts.some(s => s.date === date && s.start === start);
  if (inCal) { delete _pendingUnaddedShifts[key]; return; }

  // Show sticky reminder banner
  _showMissedCalendarNotice(date, start, _pendingUnaddedShifts[key]);
}

function _showMissedCalendarNotice(date, start, pendingData) {
  // Show in the calendar tab if open, otherwise show as a toast with action
  const calTab = document.getElementById('ttab-calendar');
  const isCalOpen = calTab && calTab.classList.contains('active');

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, mo, d] = date.split('-').map(Number);
  const dateDisplay = `${MONTHS[mo-1]} ${d}, ${y}`;
  const startDisplay = fmtTime(start);

  if (isCalOpen) {
    // Show persistent banner at top of calendar
    let banner = document.getElementById('cal-missed-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cal-missed-banner';
      const grid = document.getElementById('cal-grid');
      if (grid) grid.parentElement.insertBefore(banner, grid);
    }
    banner.innerHTML = `
      <div class="cal-notice" style="background:#fff3cd;border-color:#ffc107">
        <div class="cal-notice-icon">📅</div>
        <div class="cal-notice-body">
          <strong>You never added this shift to your calendar!</strong>
          <p>You confirmed a job on <strong>${dateDisplay}</strong> at <strong>${startDisplay}</strong> with ${pendingData.job} but didn't add it. Don't forget!</p>
          <div class="cal-notice-actions">
            <button class="cal-notice-btn" onclick="calNoticeAdd('${pendingData.contactId}','${date}','${start}','${pendingData.end || ''}','${pendingData.job}',this)">✅ Add Now</button>
            <button class="cal-notice-btn secondary" onclick="document.getElementById('cal-missed-banner').remove()">Dismiss</button>
          </div>
        </div>
      </div>`;
  } else {
    // Show as a persistent on-screen reminder
    if (typeof showToast === 'function') {
      showToast(`📅 Reminder: You never added your ${dateDisplay} shift to your calendar!`, 'info');
    }
  }
}

/* ─────────────────────────────────────────────────────────────────
   26F: PATCH saveShift TO UPDATE EARNINGS BAR
   ───────────────────────────────────────────────────────────────── */
const _origSaveShift = saveShift;
window.saveShift = function() {
  _origSaveShift();
  setTimeout(renderCalEarningsBar, 100);
};
const _origDeleteShift = deleteShift;
window.deleteShift = function(id) {
  _origDeleteShift(id);
  setTimeout(renderCalEarningsBar, 100);
};

/* ─────────────────────────────────────────────────────────────────
   26G: UPDATE HOURS TRACKER IN BROWSE JOBS TAB
   Patches the existing updateHoursTracker (if any) and makes sure
   the tracker reads from the calendar data.
   ───────────────────────────────────────────────────────────────── */
window.updateHoursTracker = function() {
  const tracker = document.getElementById('hours-tracker');
  if (!tracker) return;
  const maxWeekly = parentalControls['max-weekly-hours'] || 20;
  const { weeklyHours } = calcCalendarStats();
  const pct = Math.min(100, (weeklyHours / maxWeekly) * 100);
  const fillEl = tracker.querySelector('.hours-bar-fill');
  const metaEl = tracker.querySelector('.hours-tracker-meta');
  const labelEl = tracker.querySelector('.hours-remaining-label');

  if (fillEl) {
    fillEl.style.width = pct + '%';
    fillEl.className = 'hours-bar-fill' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  }
  if (metaEl) metaEl.innerHTML = `<span>${weeklyHours.toFixed(1)} hrs used this week</span><span>${maxWeekly} hr limit</span>`;
  if (labelEl) {
    const rem = Math.max(0, maxWeekly - weeklyHours);
    labelEl.textContent = pct >= 100 ? '🛑 Limit reached' : `${rem.toFixed(1)} hrs remaining`;
    labelEl.className = 'hours-remaining-label' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
  }
};

// Run earnings bar when calendar tab is opened
const _origSwitchDashTabV3 = window.switchDashTab;
window.switchDashTab = function(btn, panelId) {
  if (_origSwitchDashTabV3) _origSwitchDashTabV3(btn, panelId);
  if (panelId === 'ttab-calendar') {
    setTimeout(renderCalEarningsBar, 120);
  }
};


// ════════════════════════════════════════════════════════════════════
//  ADMIN PANEL
//  Access: Sign in with ADMIN_EMAIL (or "admin") + the admin password (hashed, see CONFIG)
//  v39 adds: 👤 Accounts · 📧 Email Rules · 📢 Announcements · 🔐 Security & Log · 🧰 Data Tools
//           (see <script id="featpack-v39-admin-js"> near the end of the file)
//  Features:
//    - Support message inbox (messages sent from the Support FAB)
//    - Platform activity stats (page visits, signups)
//    - App configuration (maintenance mode, feature flags)
//    - System health check
//  Privacy: passwords are never shown or stored in plain text anywhere.
// ════════════════════════════════════════════════════════════════════

// ── Storage helpers (localStorage key namespacing) ─────────────────
const ADMIN_STORE_KEY   = 'tw_admin_support_msgs';
const ADMIN_STATS_KEY   = 'tw_admin_stats';
const ADMIN_CONFIG_KEY  = 'tw_admin_config';

function _adminSaveSupportMessage(msg) {
  try {
    const msgs = _adminGetSupportMessages();
    msgs.unshift({ id: 'msg-' + Date.now(), ...msg });
    localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(msgs.slice(0, 200)));
  } catch(e) {}
}

function _adminGetSupportMessages() {
  try { return JSON.parse(localStorage.getItem(ADMIN_STORE_KEY) || '[]'); } catch(e) { return []; }
}

function _adminGetStats() {
  try { return JSON.parse(localStorage.getItem(ADMIN_STATS_KEY) || '{}'); } catch(e) { return {}; }
}

function _adminGetConfig() {
  const defaults = { maintenanceMode: false, demoSignupsEnabled: true, aiEnabled: true, maxJobsPerEmployer: 10, demoModeActive: true, launchPaid: false };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY) || '{}') }; } catch(e) { return defaults; }
}

function _adminSaveConfig(cfg) {
  try { localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
}

// Track page visits for admin stats (privacy-safe: no user info stored)
(function _trackPageVisit() {
  try {
    const stats = _adminGetStats();
    stats.totalPageVisits = (stats.totalPageVisits || 0) + 1;
    stats.lastVisit = new Date().toISOString();
    stats.sessionStarts = (stats.sessionStarts || 0) + 1;
    localStorage.setItem(ADMIN_STATS_KEY, JSON.stringify(stats));
  } catch(e) {}
})();

// Called when a new user signs up successfully (privacy-safe: just a count)
function _adminTrackSignup(type) {
  try {
    const stats = _adminGetStats();
    stats.totalSignups = (stats.totalSignups || 0) + 1;
    stats['signups_' + type] = (stats['signups_' + type] || 0) + 1;
    stats.lastSignup = new Date().toISOString();
    localStorage.setItem(ADMIN_STATS_KEY, JSON.stringify(stats));
  } catch(e) {}
}

// ── Launch admin panel ─────────────────────────────────────────────
function launchAdminPanel() {
  // Hide all pages, inject custom admin panel
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const mn = document.getElementById('mobileNav');
  if (mn) mn.style.display = 'none';

  // Remove any existing panel
  document.getElementById('tw-admin-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'tw-admin-panel';
  panel.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:10000;overflow-y:auto;font-family:DM Sans,sans-serif;';

  panel.innerHTML = `
    ${'<'}style>
      #tw-admin-panel { color: var(--text); }
      .adm-nav { background: #1a1a2e; color: #fff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 12px rgba(0,0,0,.3); }
      .adm-nav-title { font-family: Fraunces, serif; font-size: 1.2rem; font-weight: 900; color: #52b788; display: flex; align-items: center; gap: 8px; }
      .adm-nav-title span { color: #fff; }
      .adm-signout { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.2); padding: 7px 14px; border-radius: 8px; cursor: pointer; font-size: .82rem; font-weight: 700; font-family: DM Sans, sans-serif; transition: background .2s; }
      .adm-signout:hover { background: rgba(255,255,255,.2); }
      .adm-tabs { display: flex; gap: 6px; padding: 12px 16px; background: #fff; border-bottom: 1.5px solid var(--border); flex-wrap: wrap; }
      .adm-tab { background: none; border: 1.5px solid var(--border); color: var(--muted); padding: 7px 16px; border-radius: 8px; font-family: DM Sans, sans-serif; font-size: .84rem; font-weight: 700; cursor: pointer; transition: all .15s; }
      .adm-tab.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
      .adm-tab:not(.active):hover { border-color: var(--green); color: var(--green); }
      .adm-content { max-width: 900px; margin: 0 auto; padding: 20px 16px 40px; }
      .adm-tab-panel { display: none; }
      .adm-tab-panel.active { display: block; }
      .adm-section-title { font-family: Fraunces, serif; font-size: 1.1rem; color: var(--green); margin-bottom: 12px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
      .adm-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; box-shadow: var(--shadow); }
      .adm-stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }
      .adm-stat { background: var(--card); border: 1.5px solid var(--border); border-radius: 12px; padding: 14px 16px; text-align: center; }
      .adm-stat-val { font-family: Fraunces, serif; font-size: 1.8rem; color: var(--green); font-weight: 900; line-height: 1; }
      .adm-stat-label { font-size: .75rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-top: 3px; }
      .adm-msg-item { background: var(--card); border: 1.5px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
      .adm-msg-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
      .adm-msg-badge { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
      .adm-msg-badge.teen { background: var(--green-pale); color: var(--green); }
      .adm-msg-badge.parent { background: var(--blue-pale); color: var(--blue); }
      .adm-msg-badge.employer { background: var(--amber-pale); color: var(--amber); }
      .adm-msg-badge.visitor { background: var(--purple-pale); color: var(--purple); }
      .adm-msg-badge.school { background: #e0f2fe; color: #075985; }
      .adm-msg-name { font-weight: 700; font-size: .9rem; }
      .adm-msg-time { font-size: .75rem; color: var(--muted); margin-left: auto; }
      .adm-msg-context { font-size: .78rem; color: var(--muted); margin-bottom: 4px; }
      .adm-msg-body { font-size: .85rem; color: var(--text); line-height: 1.55; background: var(--bg); border-radius: 8px; padding: 8px 10px; white-space: pre-wrap; }
      .adm-msg-actions { display: flex; gap: 7px; margin-top: 8px; flex-wrap: wrap; }
      .adm-btn { padding: 6px 14px; border-radius: 7px; border: none; font-family: DM Sans, sans-serif; font-size: .78rem; font-weight: 700; cursor: pointer; transition: all .15s; }
      .adm-btn-reply { background: var(--green); color: #fff; }
      .adm-btn-reply:hover { background: #235c40; }
      .adm-btn-delete { background: var(--red-pale); color: var(--red); }
      .adm-btn-delete:hover { background: #f5b7b1; }
      .adm-btn-mark { background: var(--green-pale); color: var(--green); border: 1px solid var(--green-light); }
      .adm-btn-mark:hover { background: #b7e4c7; }
      .adm-empty { text-align: center; color: var(--muted); font-size: .9rem; padding: 2rem; }
      .adm-config-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); gap: 12px; }
      .adm-config-row:last-child { border-bottom: none; }
      .adm-config-label { font-weight: 700; font-size: .9rem; }
      .adm-config-desc { font-size: .78rem; color: var(--muted); margin-top: 2px; }
      .adm-toggle { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
      .adm-toggle input { opacity: 0; width: 0; height: 0; }
      .adm-toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 24px; cursor: pointer; transition: background .2s; }
      .adm-toggle-slider:before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .2s; }
      .adm-toggle input:checked + .adm-toggle-slider { background: var(--green); }
      .adm-toggle input:checked + .adm-toggle-slider:before { transform: translateX(20px); }
      .adm-health-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
      .adm-health-item:last-child { border-bottom: none; }
      .adm-health-status { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      .adm-health-status.ok { background: var(--green); }
      .adm-health-status.warn { background: var(--amber); }
      .adm-health-status.error { background: var(--red); }
      .adm-health-label { font-weight: 700; font-size: .88rem; }
      .adm-health-note { font-size: .78rem; color: var(--muted); margin-left: auto; }
      .adm-banner-maintenance { background: #1a1a2e; color: #fff; text-align: center; padding: 10px; font-size: .85rem; font-weight: 700; margin-bottom: 0; }
      @media(max-width:600px) { .adm-stat-row { grid-template-columns: 1fr 1fr; } }
    ${'<'}/style>

    <div class="adm-nav">
      <div class="adm-nav-title">🛡 TeenWork <span>Admin</span></div>
      <button class="adm-signout" onclick="adminSignOut()">Sign Out</button>
    </div>

    <div id="adm-maintenance-banner" style="display:none" class="adm-banner-maintenance">
      ⚠️ MAINTENANCE MODE IS ON — Users see a maintenance message
    </div>

    <div class="adm-tabs">
      <button class="adm-tab active" onclick="adminSwitchTab('support',this)">📬 Support Inbox</button>
      <button class="adm-tab" onclick="adminSwitchTab('stats',this)">📊 Activity Stats</button>
      <button class="adm-tab" onclick="adminSwitchTab('contacts',this)">👥 Contacts</button>
      <button class="adm-tab" onclick="adminSwitchTab('config',this)">⚙️ App Config</button>
      <button class="adm-tab" onclick="adminSwitchTab('launch',this)">🚀 Launch Controls</button>
      <button class="adm-tab" onclick="adminSwitchTab('reviews',this)">⭐ Reviews</button>
      <button class="adm-tab" onclick="adminSwitchTab('health',this)">🩺 System Health</button>
    </div>

    <div class="adm-content">

      <!-- ── SUPPORT INBOX ─── -->
      <div class="adm-tab-panel active" id="adm-panel-support">
        <div class="adm-section-title">📬 Support Messages</div>
        <div id="adm-ai-status-banner" style="display:none;padding:10px 14px;background:#fff3cd;border:1.5px solid #f0b66a;border-radius:10px;margin-bottom:12px;font-size:.83rem;color:#856404;font-weight:600">
          ⚠️ AI auto-reply is currently unavailable. You'll need to write replies manually, or try again later.
        </div>
        <div id="adm-support-list">Loading…</div>
      </div>

      <!-- ── STATS ─── -->
      <div class="adm-tab-panel" id="adm-panel-stats">
        <div class="adm-section-title">📊 Platform Activity</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:14px">Aggregate stats only — no individual user data is tracked or shown.</p>
        <div class="adm-stat-row" id="adm-stats-row">Loading…</div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">Signup Breakdown</div>
          <div id="adm-signup-breakdown"></div>
        </div>
        <div style="margin-top:10px">
          <button class="adm-btn adm-btn-delete" onclick="adminResetStats()">🗑 Reset Stats</button>
        </div>
      </div>

      <!-- ── CONTACTS ─── -->
      <div class="adm-tab-panel" id="adm-panel-contacts">
        <div class="adm-section-title">👥 All Users &amp; Contacts</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:12px">View all registered users. Select any contact to send them a message.</p>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <input type="text" id="adm-contact-search" placeholder="Search by name or email…" oninput="adminRenderContacts()" style="flex:1;min-width:160px;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;background:#fff;color:var(--text);outline:none;">
          <select id="adm-contact-role" onchange="adminRenderContacts()" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;background:#fff;color:var(--text);outline:none;">
            <option value="">All Roles</option>
            <option value="teen">Teen</option>
            <option value="parent">Parent</option>
            <option value="employer">Employer</option>
          </select>
        </div>
        <div id="adm-contacts-list" style="margin-bottom:14px;"></div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:10px;">📨 Send Message to User</div>
          <div style="margin-bottom:8px;">
            <label style="font-size:.78rem;font-weight:600;color:var(--muted);display:block;margin-bottom:3px;">To</label>
            <select id="adm-msg-to" style="width:100%;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;background:#fff;color:var(--text);outline:none;"></select>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:.78rem;font-weight:600;color:var(--muted);display:block;margin-bottom:3px;">Message</label>
            <textarea id="adm-msg-body" placeholder="Type your message to this user…" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;background:#fff;color:var(--text);outline:none;resize:vertical;min-height:72px;"></textarea>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="adm-btn adm-btn-reply" onclick="adminSendToContact()">Send Message ✓</button>
            <span id="adm-contact-sent" style="display:none;color:var(--green);font-size:.8rem;font-weight:700;">✓ Message sent!</span>
          </div>
        </div>
      </div>

      <!-- ── CONFIG ─── -->
      <div class="adm-tab-panel" id="adm-panel-config">
        <div class="adm-section-title">⚙️ App Configuration</div>
        <div class="adm-card" id="adm-config-panel">Loading…</div>
        <div style="margin-top:12px">
          <button class="adm-btn adm-btn-reply" onclick="adminSaveConfig()">💾 Save Configuration</button>
        </div>
      </div>

      <!-- ── REVIEWS ─── -->
      <div class="adm-tab-panel" id="adm-panel-reviews">
        <div class="adm-section-title">⭐ User Reviews &amp; Feedback</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:14px">These are kept on this device. The homepage only shows reviews that members choose to share when they rate the app.</p>
        <div id="adm-reviews-list">Loading…</div>
        <div class="adm-card" style="margin-top:14px">
          <div style="font-weight:700;margin-bottom:10px;font-size:.9rem">➕ Add a review</div>
          <div style="display:grid;gap:8px">
            <input id="adm-rev-name" placeholder="Name (e.g. Alex, 15 · Vermont)" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:.88rem;background:var(--bg);color:var(--text)">
            <select id="adm-rev-role" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:.88rem;background:var(--bg);color:var(--text)">
              <option value="teen">Teen</option><option value="parent">Parent</option><option value="employer">Employer</option>
            </select>
            <div style="display:flex;gap:6px;align-items:center">
              <label style="font-size:.82rem;font-weight:700">Rating:</label>
              ${[5,4,3,2,1].map(n=>`<label style="cursor:pointer"><input type="radio" name="adm-rev-stars" value="${n}" ${n===5?'checked':''}> ${n}★</label>`).join('')}
            </div>
            <textarea id="adm-rev-body" placeholder="Review text…" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:.88rem;min-height:70px;background:var(--bg);color:var(--text)"></textarea>
            <div style="display:flex;gap:8px;align-items:center">
              <label style="font-size:.82rem;font-weight:700"><input type="checkbox" id="adm-rev-publish" checked> Publish publicly</label>
              <button class="adm-btn adm-btn-reply" onclick="adminAddReview()">Save Review</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── LAUNCH CONTROLS ─── -->
      <div class="adm-tab-panel" id="adm-panel-launch">
        <div class="adm-section-title">🚀 Launch Controls</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:14px">Control how the app is presented to the public. These settings affect what users see when they land on TeenWork.</p>
        <div class="adm-card" id="adm-launch-panel">Loading…</div>
        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="adm-btn adm-btn-reply" onclick="adminSaveLaunch()">💾 Save Launch Settings</button>
        </div>
      </div>

      <!-- ── HEALTH ─── -->
      <div class="adm-tab-panel" id="adm-panel-health">
        <div class="adm-section-title">🩺 System Health</div>
        <div class="adm-card" id="adm-health-list">Checking…</div>
        <div style="margin-top:10px">
          <button class="adm-btn adm-btn-mark" onclick="adminRunHealthCheck()">🔄 Re-check</button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(panel);

  // Render all panels
  adminRenderSupport();
  adminRenderStats();
  adminRenderConfig();
  adminRenderLaunch();
  adminRenderReviews?.();
  adminRunHealthCheck();
  // Show AI status banner if Groq is unreachable
  (async () => {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', { method:'GET', headers:{'Authorization':'Bearer gsk_test'} });
      // Any response (even 401) means reachable
    } catch(e) {
      const b = document.getElementById('adm-ai-status-banner');
      if (b) b.style.display = 'block';
    }
  })();

  // Show maintenance banner if on
  if (_adminGetConfig().maintenanceMode) {
    document.getElementById('adm-maintenance-banner').style.display = 'block';
  }
}

function adminSignOut() {
  document.getElementById('tw-admin-panel')?.remove();
  currentUser = null;
  gotoPage('landing');
}

function adminSwitchTab(name, btn) {
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.adm-tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('adm-panel-' + name)?.classList.add('active');
}

// ── Support Inbox ──────────────────────────────────────────────────
function adminRenderSupport() {
  const el = document.getElementById('adm-support-list');
  if (!el) return;
  const msgs = _adminGetSupportMessages();

  if (!msgs.length) {
    el.innerHTML = '<div class="adm-empty">📭 No support messages yet.<br><span style="font-size:.8rem">Messages sent via the Support button will appear here.</span></div>';
    return;
  }

  el.innerHTML = msgs.map(m => {
    const timeStr = m.time ? new Date(m.time).toLocaleString() : '';
    const type = m.userType || 'visitor';
    const safeBody = (m.body || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeCtx  = (m.context || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeName = (m.name || 'Anonymous').replace(/</g,'&lt;');
    const safeEmail = (m.email && m.email !== 'unknown') ? m.email.replace(/</g,'&lt;') : '';
    const senderLine = safeEmail
      ? `<div style="font-size:.75rem;color:var(--muted);margin-bottom:2px;">✉️ <a href="mailto:${safeEmail}" style="color:var(--green);font-weight:700;text-decoration:none;">${safeEmail}</a></div>`
      : `<div style="font-size:.75rem;color:var(--muted);margin-bottom:2px;font-style:italic;">No email on file</div>`;
    return `
      <div class="adm-msg-item" id="adm-msg-${m.id}">
        <div class="adm-msg-meta">
          <span class="adm-msg-name">${safeName}</span>
          <span class="adm-msg-badge ${type}">${type}</span>
          ${m.resolved ? '<span class="adm-msg-badge" style="background:#d1fae5;color:#065f46">✓ Resolved</span>' : ''}
          <span class="adm-msg-time">${timeStr}</span>
        </div>
        ${senderLine}
        ${safeCtx ? `<div class="adm-msg-context">📌 Context: ${safeCtx}</div>` : ''}
        <div class="adm-msg-body">${safeBody || '(no message body)'}</div>
        ${m.adminReply ? `<div style="margin-top:8px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 10px;font-size:.82rem;"><span style="font-weight:700;color:#166534;">✅ Admin replied ${m.adminRepliedAt ? '· ' + new Date(m.adminRepliedAt).toLocaleDateString() : ''}:</span><br><span style="color:#1c1c1c;line-height:1.5;white-space:pre-wrap;">${m.adminReply.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></div>` : ''}
        <div class="adm-msg-actions">
          <button class="adm-btn adm-btn-reply" onclick="adminReplyToSupport('${(m.email||'').replace(/'/g,'').replace(/</g,'').replace(/>/g,'')}','${safeName.replace(/'/g,'')}','${(m.id||'').replace(/'/g,'')}')">💬 Reply</button>
          <button class="adm-btn adm-btn-mark" onclick="adminMarkResolved('${m.id}')">${m.resolved ? '↩ Unresolve' : '✓ Mark Resolved'}</button>
          <button class="adm-btn adm-btn-delete" onclick="adminDeleteMsg('${m.id}')">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');
}

function adminReplyToSupport(email, name, msgId) {
  // Remove any existing reply modal
  document.getElementById('adm-reply-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'adm-reply-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif;';

  const hasEmail = email && email !== 'unknown' && email.trim() !== '';
  const safeEmail = hasEmail ? email : '';
  const safeName  = name || 'this user';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:1.6rem;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.1rem;">
        <div style="width:40px;height:40px;background:#d8f3dc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">💬</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:.98rem;color:#1c1c1c;">Reply to ${safeName}</div>
          <div style="font-size:.75rem;color:#6b7280;margin-top:1px;">${hasEmail ? '✉️ ' + safeEmail : '⚠️ No email — reply goes to in-app inbox only'}</div>
        </div>
        <button id="adm-reply-close" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#bbb;padding:4px;line-height:1;">✕</button>
      </div>

      <div style="margin-bottom:10px;">
        <label style="font-size:.76rem;font-weight:700;color:#6b7280;display:block;margin-bottom:3px;">Your reply</label>
        <textarea id="adm-reply-body" rows="5" placeholder="Type your reply to ${safeName}…"
          style="width:100%;padding:9px 12px;border:1.5px solid #e2ddd4;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:.88rem;resize:vertical;outline:none;line-height:1.6;box-sizing:border-box;color:#1c1c1c;"
          onfocus="this.style.borderColor='#2d6a4f'" onblur="this.style.borderColor='#e2ddd4'">Hi ${safeName},\n\nThank you for reaching out to TeenWork support!\n\n\n— TeenWork Admin</textarea>
      </div>

      <div id="adm-reply-info" style="font-size:.74rem;color:#6b7280;margin-bottom:10px;padding:7px 10px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        ${hasEmail
          ? '📤 This will save to in-app inbox <strong>and</strong> open your email app to send to <strong>' + safeEmail + '</strong>'
          : '📥 No email on file — reply will be saved in the admin panel only. To reach this user, ask them to update their profile.'}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="adm-reply-send" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:11px 16px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:800;cursor:pointer;">
          ${hasEmail ? '📨 Send Reply' : '💾 Save Reply'}
        </button>
        ${hasEmail ? `<button id="adm-reply-email-only" style="background:#f0fdf4;color:#2d6a4f;border:1.5px solid #86efac;padding:11px 14px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;">📧 Email Only</button>` : ''}
        <button id="adm-reply-cancel" style="background:#f9fafb;color:#6b7280;border:1.5px solid #e2ddd4;padding:11px 14px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;">Cancel</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  function _close() { modal.remove(); }
  document.getElementById('adm-reply-close').onclick = _close;
  document.getElementById('adm-reply-cancel').onclick = _close;
  modal.addEventListener('click', e => { if (e.target === modal) _close(); });

  // Save reply to admin inbox as a follow-up note
  function _saveReplyNote(body) {
    try {
      const msgs = _adminGetSupportMessages();
      const idx = msgs.findIndex(m => m.id === msgId);
      if (idx > -1) {
        msgs[idx].adminReply = body;
        msgs[idx].adminRepliedAt = new Date().toISOString();
        msgs[idx].resolved = true;
        localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(msgs));
        adminRenderSupport();
      }
    } catch(e) {}
  }

  document.getElementById('adm-reply-send').onclick = function() {
    const body = document.getElementById('adm-reply-body')?.value?.trim();
    if (!body) { return; }
    _saveReplyNote(body);
    if (hasEmail) {
      const subject = encodeURIComponent('Re: Your TeenWork Support Request');
      window.open('mailto:' + safeEmail + '?subject=' + subject + '&body=' + encodeURIComponent(body));
    }
    _close();
    if (typeof showToast === 'function') showToast('✅ Reply ' + (hasEmail ? 'sent to ' + safeName : 'saved'), 'success');
  };

  if (hasEmail) {
    const emailOnlyBtn = document.getElementById('adm-reply-email-only');
    if (emailOnlyBtn) emailOnlyBtn.onclick = function() {
      const body = document.getElementById('adm-reply-body')?.value?.trim() || '';
      const subject = encodeURIComponent('Re: Your TeenWork Support Request');
      window.open('mailto:' + safeEmail + '?subject=' + subject + '&body=' + encodeURIComponent(body));
      _close();
    };
  }

  setTimeout(() => { document.getElementById('adm-reply-body')?.focus(); }, 100);
}

function adminMarkResolved(id) {
  try {
    const msgs = _adminGetSupportMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx > -1) {
      msgs[idx].resolved = !msgs[idx].resolved;
      localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(msgs));
    }
  } catch(e) {}
  adminRenderSupport();
}

function adminDeleteMsg(id) {
  if (!confirm('Delete this support message? This cannot be undone.')) return;
  try {
    const msgs = _adminGetSupportMessages().filter(m => m.id !== id);
    localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(msgs));
  } catch(e) {}
  adminRenderSupport();
}

// ── Stats ──────────────────────────────────────────────────────────
function adminRenderStats() {
  const stats = _adminGetStats();
  const msgs  = _adminGetSupportMessages();

  const statRow = document.getElementById('adm-stats-row');
  if (statRow) statRow.innerHTML = [
    { val: stats.totalPageVisits || 0,   label: 'Page Visits' },
    { val: stats.sessionStarts || 0,     label: 'Sessions' },
    { val: stats.totalSignups || 0,      label: 'Signups' },
    { val: msgs.length,                  label: 'Support Msgs' },
    { val: msgs.filter(m=>!m.resolved).length, label: 'Open Tickets' },
  ].map(s => `
    <div class="adm-stat">
      <div class="adm-stat-val">${s.val}</div>
      <div class="adm-stat-label">${s.label}</div>
    </div>`).join('');

  const breakdown = document.getElementById('adm-signup-breakdown');
  if (breakdown) {
    const types = ['teen','parent','employer'];
    breakdown.innerHTML = types.map(t => {
      const count = stats['signups_' + t] || 0;
      const total = stats.totalSignups || 1;
      const pct = Math.round((count / total) * 100);
      const color = t === 'teen' ? 'var(--green)' : t === 'parent' ? 'var(--blue)' : 'var(--amber)';
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px">
          <span style="font-weight:700;text-transform:capitalize">${t}</span>
          <span style="color:var(--muted)">${count} (${pct}%)</span>
        </div>
        <div style="background:var(--border);border-radius:6px;height:7px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;transition:width .5s"></div>
        </div>
      </div>`;
    }).join('');
  }
}

function adminResetStats() {
  if (!confirm('Reset all activity stats? This cannot be undone.')) return;
  localStorage.removeItem(ADMIN_STATS_KEY);
  adminRenderStats();
  showToast('Stats reset', 'info');
}

// ── App Config ────────────────────────────────────────────────────
function adminRenderConfig() {
  const cfg = _adminGetConfig();
  const el = document.getElementById('adm-config-panel');
  if (!el) return;
  el.innerHTML = `
    <div class="adm-config-row">
      <div>
        <div class="adm-config-label">🔧 Maintenance Mode</div>
        <div class="adm-config-desc">Show a maintenance message to all users on the landing page.</div>
      </div>
      <label class="adm-toggle">
        <input type="checkbox" id="cfg-maintenance" ${cfg.maintenanceMode ? 'checked' : ''}>
        <span class="adm-toggle-slider"></span>
      </label>
    </div>
    <div class="adm-config-row">
      <div>
        <div class="adm-config-label">🤖 AI Features</div>
        <div class="adm-config-desc">Enable AI job matching, coach, and safety checker.</div>
      </div>
      <label class="adm-toggle">
        <input type="checkbox" id="cfg-ai" ${cfg.aiEnabled ? 'checked' : ''}>
        <span class="adm-toggle-slider"></span>
      </label>
    </div>
    <div class="adm-config-row">
      <div>
        <div class="adm-config-label">💼 Max Jobs Per Employer</div>
        <div class="adm-config-desc">Maximum active job listings per employer account.</div>
      </div>
      <input id="cfg-maxjobs" type="number" min="1" max="100" value="${cfg.maxJobsPerEmployer}"
        style="width:70px;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:.9rem;font-family:DM Sans,sans-serif;outline:none;text-align:center"
        onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
    </div>
  `;
}

function adminSaveConfig() {
  const cfg = {
    maintenanceMode:     document.getElementById('cfg-maintenance')?.checked || false,
    demoSignupsEnabled:  _adminGetConfig().demoModeActive, // controlled by Launch Controls → Demo Mode
    aiEnabled:           document.getElementById('cfg-ai')?.checked || false,
    maxJobsPerEmployer:  parseInt(document.getElementById('cfg-maxjobs')?.value) || 10,
    demoModeActive:      _adminGetConfig().demoModeActive,
    launchPaid:          _adminGetConfig().launchPaid,
  };
  _adminSaveConfig(cfg);
  // Update banner
  const banner = document.getElementById('adm-maintenance-banner');
  if (banner) banner.style.display = cfg.maintenanceMode ? 'block' : 'none';
  showToast('✅ Config saved!', 'success');
}

// ── Launch Controls ───────────────────────────────────────────────
function adminRenderLaunch() {
  const cfg = _adminGetConfig();
  const el = document.getElementById('adm-launch-panel');
  if (!el) return;

  const statusDemo  = cfg.demoModeActive ? '🟢 Demo Mode is ON' : '🔴 Demo Mode is OFF';
  const statusPaid  = cfg.launchPaid     ? '🟢 Paid Launch is LIVE' : '⚪ Paid Launch not yet active';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:${cfg.demoModeActive?'var(--green-pale)':'var(--bg)'};border:2px solid ${cfg.demoModeActive?'var(--green-light)':'var(--border)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all .2s" onclick="adminSetDemo(true)" id="adm-demo-yes">
        <div style="font-size:2rem;margin-bottom:6px">🎭</div>
        <div style="font-weight:700;font-size:.95rem;color:var(--green)">Demo Mode: YES</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:4px">Show demo login buttons on landing page. Users can try the app without signing up.</div>
        ${cfg.demoModeActive ? '<div style="margin-top:8px;background:var(--green);color:#fff;border-radius:20px;font-size:.72rem;font-weight:700;padding:3px 12px;display:inline-block">✓ ACTIVE</div>' : ''}
      </div>
      <div style="background:${!cfg.demoModeActive?'var(--red-pale)':'var(--bg)'};border:2px solid ${!cfg.demoModeActive?'#f5b7b1':'var(--border)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all .2s" onclick="adminSetDemo(false)" id="adm-demo-no">
        <div style="font-size:2rem;margin-bottom:6px">🔒</div>
        <div style="font-weight:700;font-size:.95rem;color:var(--red)">Demo Mode: NO</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:4px">Hide demo buttons. Only real signups. Use when going fully live.</div>
        ${!cfg.demoModeActive ? '<div style="margin-top:8px;background:var(--red);color:#fff;border-radius:20px;font-size:.72rem;font-weight:700;padding:3px 12px;display:inline-block">✓ ACTIVE</div>' : ''}
      </div>
    </div>
    <div style="background:var(--border);height:1px;margin:0 0 16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:${cfg.launchPaid?'var(--amber-pale)':'var(--bg)'};border:2px solid ${cfg.launchPaid?'var(--amber)':'var(--border)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all .2s" onclick="adminSetPaid(true)" id="adm-paid-yes">
        <div style="font-size:2rem;margin-bottom:6px">💳</div>
        <div style="font-weight:700;font-size:.95rem;color:var(--amber)">Paid Launch: YES</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:4px">Stripe payments, subscriptions, and premium features are enabled for real users.</div>
        ${cfg.launchPaid ? '<div style="margin-top:8px;background:var(--amber);color:#fff;border-radius:20px;font-size:.72rem;font-weight:700;padding:3px 12px;display:inline-block">✓ LIVE</div>' : ''}
      </div>
      <div style="background:${!cfg.launchPaid?'var(--blue-pale)':'var(--bg)'};border:2px solid ${!cfg.launchPaid?'var(--blue)':'var(--border)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all .2s" onclick="adminSetPaid(false)" id="adm-paid-no">
        <div style="font-size:2rem;margin-bottom:6px">🆓</div>
        <div style="font-weight:700;font-size:.95rem;color:var(--blue)">Paid Launch: NO</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:4px">Payments disabled. All premium features are free or locked. Safe for testing.</div>
        ${!cfg.launchPaid ? '<div style="margin-top:8px;background:var(--blue);color:#fff;border-radius:20px;font-size:.72rem;font-weight:700;padding:3px 12px;display:inline-block">✓ ACTIVE</div>' : ''}
      </div>
    </div>
    <div style="margin-top:14px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:10px;font-size:.79rem;color:var(--muted);line-height:1.6">
      <strong style="color:var(--text)">Current status:</strong> ${statusDemo} &nbsp;·&nbsp; ${statusPaid}
    </div>`;

  // Wire click handlers via JS (avoids inline quoting issues)
  window._adminDemoActive = cfg.demoModeActive;
  window._adminPaidActive = cfg.launchPaid;
}

window.adminSetDemo = function(val) {
  window._adminDemoActive = val;
  const cfg = _adminGetConfig();
  cfg.demoModeActive = val;
  // Immediately apply fake-data hide/show when demo toggled
  setTimeout(function(){
    if (typeof _hideFakeDataIfPreLaunch === 'function') _hideFakeDataIfPreLaunch();
    if (typeof _renderCommunitySection === 'function') _renderCommunitySection();
    const loved = document.getElementById('featpack-testimonials');
    if (loved) loved.style.display = (val === false) ? 'none' : '';
    // Demo buttons
    document.querySelectorAll('#page-landing [onclick*="_directDemo"]').forEach(function(el){ el.style.display = val ? '' : 'none'; });
    var heroDemo = Array.from(document.querySelectorAll('#page-landing div')).find(function(el){ return el.textContent.indexOf('Try a live demo') !== -1 && el.textContent.indexOf('no signup needed') !== -1; });
    if (heroDemo) heroDemo.style.display = val ? '' : 'none';
  }, 100);
  _adminSaveConfig(cfg);
  adminRenderLaunch();
  showToast(val ? '🎭 Demo mode ON' : '🔒 Demo mode OFF', 'success');
};

window.adminSetPaid = function(val) {
  if (val && !confirm('Enable paid launch? This activates real payments. Make sure Stripe is configured.')) return;
  window._adminPaidActive = val;
  const cfg = _adminGetConfig();
  cfg.launchPaid = val;
  _adminSaveConfig(cfg);
  adminRenderLaunch();
  showToast(val ? '💳 Paid launch LIVE!' : '🆓 Paid launch disabled', val ? 'success' : 'info');
};

function adminSaveLaunch() {
  const cfg = _adminGetConfig();
  cfg.demoModeActive = window._adminDemoActive ?? cfg.demoModeActive;
  cfg.launchPaid     = window._adminPaidActive ?? cfg.launchPaid;
  _adminSaveConfig(cfg);
  adminRenderLaunch();
  showToast('✅ Launch settings saved!', 'success');
}

// ── System Health ────────────────────────────────────────────────
async function adminRunHealthCheck() {
  const el = document.getElementById('adm-health-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:.5rem">Running checks…</div>';

  const checks = [];

  // Internet connectivity
  const online = navigator.onLine;
  checks.push({ label: 'Internet Connected', note: online ? 'Online' : 'Offline — no network detected', status: online ? 'ok' : 'error' });

  // LocalStorage
  try { localStorage.setItem('tw_health_test', '1'); localStorage.removeItem('tw_health_test'); checks.push({ label: 'LocalStorage', note: 'Read/write OK', status: 'ok' }); }
  catch(e) { checks.push({ label: 'LocalStorage', note: 'Failed: ' + e.message, status: 'error' }); }

  // EmailJS
  checks.push(typeof emailjs !== 'undefined'
    ? { label: 'EmailJS SDK', note: 'Loaded', status: 'ok' }
    : { label: 'EmailJS SDK', note: 'Not loaded', status: 'warn' });

  // Supabase
  checks.push(sbClient
    ? { label: 'Supabase', note: 'Connected', status: 'ok' }
    : { label: 'Supabase', note: 'Demo mode (no live DB)', status: 'warn' });

  // Fonts
  checks.push(document.fonts && document.fonts.size > 0
    ? { label: 'Web Fonts', note: document.fonts.size + ' font faces loaded', status: 'ok' }
    : { label: 'Web Fonts', note: 'Unknown', status: 'warn' });

  // Support messages stored
  const msgCount = _adminGetSupportMessages().length;
  checks.push({ label: 'Support Inbox', note: `${msgCount} message${msgCount !== 1 ? 's' : ''} stored`, status: 'ok' });

  // Config
  const cfg = _adminGetConfig();
  checks.push({ label: 'App Config', note: cfg.maintenanceMode ? '⚠️ Maintenance mode ON' : 'Normal operating mode', status: cfg.maintenanceMode ? 'warn' : 'ok' });

  // Browser
  checks.push({ label: 'Browser', note: navigator.userAgent.slice(0, 60), status: 'ok' });

  el.innerHTML = checks.map(c => `
    <div class="adm-health-item">
      <div class="adm-health-status ${c.status}"></div>
      <div class="adm-health-label">${c.label}</div>
      <div class="adm-health-note">${c.note}</div>
    </div>`).join('');
}


// ── Reviews System ─────────────────────────────────────────────────────────
const REVIEWS_KEY = 'tw_admin_reviews';

function _getReviews() {
  const defaults = []; // No seeded member reviews.
  try {
    const stored = localStorage.getItem(REVIEWS_KEY);
    // v49: old copies of the four made-up sample reviews are dropped
    const SAMPLE = /^(I made \$320 in my first month|The safety filter caught a sketchy job|Verified employer badge plus parent approval|The weekly digest email is gold)/;
    return stored ? JSON.parse(stored).filter(r => !(r && SAMPLE.test(String(r.body || '')))) : defaults;
  } catch(e) { return defaults; }
}
function _saveReviews(reviews) {
  try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch(e) {}
  // Update Schema.org JSON-LD in page so Google sees fresh reviews
  _injectReviewSchema(reviews);
}

function _injectReviewSchema(reviews) {
  document.getElementById('tw-review-schema')?.remove();
  return; // Device-local reviews cannot establish authorized public review data.
  const published = reviews.filter(r => r.published);
  const avg = published.length
    ? (published.reduce((s,r) => s + (r.rating||5), 0) / published.length).toFixed(1)
    : '5.0';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TeenWork',
    applicationCategory: 'BusinessApplication',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avg,
      reviewCount: String(published.length),
      bestRating: '5',
      worstRating: '1',
    },
    review: published.slice(0, 10).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating||5), bestRating: '5' },
      reviewBody: r.body,
      datePublished: r.date || new Date().toISOString().slice(0,10),
    })),
  };
  let el = document.getElementById('tw-review-schema');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'tw-review-schema';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema);
}

function adminRenderReviews() {
  const el = document.getElementById('adm-reviews-list');
  if (!el) return;
  const reviews = _getReviews();
  if (!reviews.length) { el.innerHTML = '<div class="adm-empty">No reviews yet.</div>'; return; }
  el.innerHTML = reviews.map((r, i) => `
    <div class="adm-card" style="position:relative;${r.published?'':'opacity:.55'}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span class="adm-msg-badge ${r.role||'teen'}">${r.role||'teen'}</span>
        <strong style="font-size:.9rem">${escHtml(r.name)}</strong>
        <span style="color:var(--amber)">${'★'.repeat(r.rating||5)}</span>
        <span style="font-size:.75rem;color:var(--muted);margin-left:auto">${r.date||''}</span>
        ${r.published ? '<span style="font-size:.72rem;background:var(--green-pale);color:var(--green);padding:2px 8px;border-radius:10px;font-weight:700">✓ Published</span>' : '<span style="font-size:.72rem;background:var(--bg);color:var(--muted);padding:2px 8px;border-radius:10px;border:1px solid var(--border)">Hidden</span>'}
      </div>
      <div style="font-size:.85rem;line-height:1.5;margin-bottom:8px">${escHtml(r.body)}</div>
      <div class="adm-msg-actions">
        <button class="adm-btn adm-btn-mark" onclick="adminToggleReview(${i})">${r.published ? '👁 Hide' : '✅ Publish'}</button>
        <button class="adm-btn adm-btn-delete" onclick="adminDeleteReview(${i})">🗑 Delete</button>
      </div>
    </div>`).join('');
  _injectReviewSchema(reviews);
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.adminToggleReview = function(i) {
  const reviews = _getReviews();
  if (reviews[i]) reviews[i].published = !reviews[i].published;
  _saveReviews(reviews);
  adminRenderReviews();
};
window.adminDeleteReview = function(i) {
  if (!confirm('Delete this review?')) return;
  const reviews = _getReviews();
  reviews.splice(i, 1);
  _saveReviews(reviews);
  adminRenderReviews();
};
window.adminAddReview = function() {
  const name = document.getElementById('adm-rev-name')?.value.trim();
  const role = document.getElementById('adm-rev-role')?.value || 'teen';
  const body = document.getElementById('adm-rev-body')?.value.trim();
  const publish = document.getElementById('adm-rev-publish')?.checked !== false;
  const rating = parseInt(document.querySelector('input[name="adm-rev-stars"]:checked')?.value || '5');
  if (!name || !body) { showToast?.('Fill in name and review text', 'warn'); return; }
  const reviews = _getReviews();
  reviews.unshift({ id: 'r' + Date.now(), name, role, rating, body, published: publish, date: new Date().toISOString().slice(0,10) });
  _saveReviews(reviews);
  adminRenderReviews();
  document.getElementById('adm-rev-name').value = '';
  document.getElementById('adm-rev-body').value = '';
  showToast?.('⭐ Review saved' + (publish ? ' & published' : ''), 'success');
};
window.adminRenderReviews = adminRenderReviews;

// Also render reviews on the landing page / stories
window._renderPublicReviews = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const published = _getReviews().filter(r => r.published);
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    ${published.map(r => `
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem">
        <div style="color:var(--amber);font-size:.85rem;margin-bottom:4px">${'★'.repeat(r.rating||5)}</div>
        <p style="font-size:.88rem;margin:0 0 8px;line-height:1.5">"${escHtml(r.body)}"</p>
        <div style="font-size:.78rem;color:var(--green);font-weight:700">— ${escHtml(r.name)}</div>
      </div>`).join('')}
  </div>`;
};

// Initialize review schema on page load
document.addEventListener('DOMContentLoaded', () => _injectReviewSchema(_getReviews()));

window.launchAdminPanel  = launchAdminPanel;
window.adminSignOut      = adminSignOut;
window.adminSwitchTab    = adminSwitchTab;
window.adminRenderSupport= adminRenderSupport;
window.adminReplyToSupport=adminReplyToSupport;
window.adminMarkResolved = adminMarkResolved;
window.adminDeleteMsg    = adminDeleteMsg;
window.adminResetStats   = adminResetStats;
window.adminRenderConfig = adminRenderConfig;
window.adminSaveConfig   = adminSaveConfig;
window.adminRenderLaunch = adminRenderLaunch;
window.adminSaveLaunch   = adminSaveLaunch;

// ── Upgrade click handler ────────────────────────────────────────────
window.handleUpgradeClick = function() {
  const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
  if (!cfg.launchPaid) {
    showToast?.('🚀 Paid plans launch soon! You\'re on early access — enjoy all Pro features free for now.', 'info', 4000);
    return;
  }
  // Future: open Stripe checkout
  showToast?.('💳 Stripe checkout coming soon!', 'info');
};

// Show/hide the early-access notice on pricing page based on launchPaid
document.addEventListener('DOMContentLoaded', function() {
  // Re-evaluate whenever pricing page is shown
  const obs = new MutationObserver(() => {
    const notice = document.getElementById('pricing-launch-notice');
    const proBtn  = document.getElementById('pricing-pro-btn');
    if (!notice) return;
    const cfg = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
    if (!cfg.launchPaid) {
      notice.style.display = 'block';
      if (proBtn) { proBtn.textContent = '🎉 You\'re on early access — all Pro features free!'; proBtn.style.background = 'var(--green)'; }
    } else {
      notice.style.display = 'none';
      if (proBtn) { proBtn.textContent = 'Upgrade to Pro →'; proBtn.style.background = 'var(--amber)'; }
    }
  });
  const pricingEl = document.getElementById('page-pricing');
  if (pricingEl) obs.observe(pricingEl, { attributes: true, attributeFilter: ['class'] });
});
window.adminRunHealthCheck=adminRunHealthCheck;
window._adminSaveSupportMessage = _adminSaveSupportMessage;
window._adminTrackSignup = _adminTrackSignup;

// ════════════════════════════════════════════════════════════════════
//  ADMIN CONTACTS — view all users and send messages
// ════════════════════════════════════════════════════════════════════

// Master contact registry — combines demo accounts + any who have
// used the app.  Admin-only; never exposed to other roles.
const _adminAllContacts = [
  { id:'alex-j',    name:'Alex Johnson',       email:'teen@teenwork.demo',     role:'teen',     phone:'' },
  { id:'jamie-j',   name:'Jamie Johnson',       email:'parent@teenwork.demo',   role:'parent',   phone:'' },
  { id:'mikes-ls',  name:"Mike's Landscaping",  email:'employer@teenwork.demo', role:'employer', phone:'' },
  { id:'sarah-c',   name:'Sarah Chen',           email:'sarah@demo.com',         role:'employer', phone:'' },
  { id:'the-hend',  name:'The Hendersons',       email:'hend@demo.com',          role:'employer', phone:'' },
];

function adminRenderContacts() {
  const listEl  = document.getElementById('adm-contacts-list');
  const selEl   = document.getElementById('adm-msg-to');
  if (!listEl || !selEl) return;

  const q    = (document.getElementById('adm-contact-search')?.value || '').toLowerCase();
  const role = document.getElementById('adm-contact-role')?.value || '';

  const filtered = _adminAllContacts.filter(c => {
    if (role && c.role !== role) return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
    return true;
  });

  const roleColor = { teen:'green', parent:'blue', employer:'amber' };
  const roleBg    = { teen:'var(--green-pale)', parent:'var(--blue-pale)', employer:'var(--amber-pale)' };
  const roleText  = { teen:'var(--green)',      parent:'var(--blue)',      employer:'var(--amber)' };

  if (!filtered.length) {
    listEl.innerHTML = '<div class="adm-empty">No contacts match.</div>';
  } else {
    listEl.innerHTML = filtered.map(c => `
      <div class="adm-card" style="margin-bottom:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${roleBg[c.role]||'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:${roleText[c.role]||'var(--muted)'};flex-shrink:0;">${c.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.88rem;">${c.name}</div>
          <div style="font-size:.76rem;color:var(--muted);">${c.email}</div>
        </div>
        <span class="adm-msg-badge ${c.role}">${c.role}</span>
        <button class="adm-btn adm-btn-reply" style="font-size:.72rem;" onclick="adminPreFillMsg('${c.id}')">Message</button>
      </div>`).join('');
  }

  // Populate the To: dropdown
  selEl.innerHTML = filtered.map(c =>
    `<option value="${c.id}">${c.name} (${c.role})</option>`
  ).join('');
}

function adminPreFillMsg(contactId) {
  const selEl = document.getElementById('adm-msg-to');
  if (selEl) selEl.value = contactId;
  document.getElementById('adm-msg-body')?.focus();
}

function adminSendToContact() {
  const selEl  = document.getElementById('adm-msg-to');
  const bodyEl = document.getElementById('adm-msg-body');
  const sentEl = document.getElementById('adm-contact-sent');
  if (!selEl || !bodyEl) return;

  const contactId = selEl.value;
  const body      = bodyEl.value.trim();
  if (!body) { showToast('Please type a message first.', 'error'); return; }

  const contact = _adminAllContacts.find(c => c.id === contactId);
  if (!contact) return;

  // Inject into the messaging system so it appears in the conversation
  const contactsArray = MSG_CONTACTS[contact.role] || MSG_CONTACTS.teen;
  const msgContact = contactsArray.find(c =>
    c.name.toLowerCase().includes(contact.name.split(' ')[0].toLowerCase())
  );
  if (msgContact) {
    msgContact.messages = msgContact.messages || [];
    msgContact.messages.push({ from:'them', text:`[Admin]: ${body}`, time: new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) });
    msgContact.unread = (msgContact.unread || 0) + 1;
  }

  bodyEl.value = '';
  if (sentEl) { sentEl.style.display = 'inline'; setTimeout(() => sentEl.style.display = 'none', 2500); }
  showToast(`✉️ Message sent to ${contact.name}`, 'success');

  // Check if message references schedule and sync
  _empSyncFromAdminMsg(body, contact);
}

function _empSyncFromAdminMsg(text, contact) {
  // If admin message references schedule keywords, echo into the schedule log
  const lower = text.toLowerCase();
  if (/schedule|shift|hour|day|time|avail/.test(lower)) {
    _empAddSchedLog(`📨 Admin messaged ${contact.name}: "${text.slice(0,60)}${text.length>60?'…':''}" — schedule may need review.`, 'blue');
  }
}

// Make contacts tab render when switched to
const _origAdminSwitchTab = adminSwitchTab;
window.adminSwitchTab = function(name, btn) {
  _origAdminSwitchTab(name, btn);
  if (name === 'contacts') { adminRenderContacts(); }
  if (name === 'stats')    { adminRenderStats?.(); }
  if (name === 'config')   { adminRenderConfig?.(); }
  if (name === 'launch')   { adminRenderLaunch?.(); }
  if (name === 'reviews')  { adminRenderReviews?.(); }
  if (name === 'health')   { adminRunHealthCheck?.(); }
};

window.adminRenderContacts = adminRenderContacts;
window.adminPreFillMsg      = adminPreFillMsg;
window.adminSendToContact   = adminSendToContact;

/* ── Worker Stats Dashboard (employer Letters tab) ── */
function renderEmpStatsDashboard() {
  const cards   = document.getElementById('emp-stats-cards');
  const jobsRow = document.getElementById('emp-stats-jobs-row');
  const revWrap = document.getElementById('emp-stats-reviews');
  if (!cards) return;

  const s = _compileteenStatsForLOR();

  // Stat cards
  const statItems = [
    { label:'Jobs Completed',  val: s.jobsCompleted,                        bg:'#f0fdf4', col:'#166534', border:'#86efac' },
    { label:'Weeks Worked',    val: s.weeksWorked,                          bg:'#eff6ff', col:'#1e40af', border:'#93c5fd' },
    { label:'Total Hours',     val: s.totalHours + ' hrs',                  bg:'#fff7ed', col:'#92400e', border:'#fcd34d' },
    { label:'Avg Rating',      val: s.avgRating ? s.avgRating + ' ★' : '—',bg:'#fdf4ff', col:'#7c3aed', border:'#d8b4fe' },
    { label:'5-Star Reviews',  val: s.fiveStars,                            bg:'#fefce8', col:'#b45309', border:'#fde047' },
    { label:'Lessons Done',    val: s.lessonsCompleted || 0,                bg:'#f0fdfa', col:'#0f766e', border:'#6ee7b7' },
  ];
  cards.innerHTML = statItems.map(i => `
    <div style="background:${i.bg};border:1.5px solid ${i.border};border-radius:14px;padding:1rem 1.1rem;text-align:center">
      <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:900;color:${i.col};line-height:1">${i.val}</div>
      <div style="font-size:.72rem;font-weight:700;color:${i.col};opacity:.75;text-transform:uppercase;letter-spacing:.5px;margin-top:4px">${i.label}</div>
    </div>`).join('');

  // Job types row
  if (jobsRow) {
    jobsRow.innerHTML = s.jobTypes.length
      ? `<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.8rem 1.1rem">
           <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem">Job Types Worked</div>
           <div style="display:flex;flex-wrap:wrap;gap:6px">${s.jobTypes.map(j=>`<span style="background:var(--green-pale);color:var(--green);border-radius:20px;padding:3px 12px;font-size:.78rem;font-weight:700">${j}</span>`).join('')}</div>
         </div>`
      : '';
  }

  // Reviews
  if (revWrap && s.reviews.length) {
    revWrap.innerHTML = `
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:.9rem 1.1rem">
        <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.7rem">⭐ Employer Reviews</div>
        ${s.reviews.map(r=>`
          <div style="border-bottom:1px solid var(--border);padding:.6rem 0;last:border:none">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <span style="color:#b45309;font-size:.88rem">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
              <span style="font-weight:700;font-size:.82rem">${r.from}</span>
              <span style="font-size:.75rem;color:var(--muted)">· ${r.job}</span>
            </div>
            <p style="font-size:.82rem;color:var(--text);line-height:1.55;margin:0;font-style:italic">"${r.comment}"</p>
          </div>`).join('')}
      </div>`;
  }
}

async function empGenerateStatsSummary() {
  const btn = document.getElementById('emp-stats-gen-btn');
  const wrap = document.getElementById('emp-stats-ai-wrap');
  const textEl = document.getElementById('emp-stats-ai-text');
  if (btn) { btn.disabled = true; btn.textContent = '✦ Writing…'; }

  const s = _compileteenStatsForLOR();
  const statsBlock = [
    'Jobs completed: ' + s.jobsCompleted,
    'Weeks worked: ' + s.weeksWorked,
    'Total hours: ' + s.totalHours,
    s.avgRating ? 'Average rating: ' + s.avgRating + '/5.0 (' + s.totalRatings + ' ratings)' : '',
    '5-star reviews: ' + s.fiveStars,
    s.jobTypes.length ? 'Job types: ' + s.jobTypes.join(', ') : '',
    s.lessonsCompleted ? 'Lessons completed: ' + s.lessonsCompleted : '',
    s.badges ? 'Badges: ' + s.badges : '',
    s.bestReview ? 'Best review: "' + s.bestReview.comment + '" — ' + s.bestReview.from + ' (' + s.bestReview.stars + '★)' : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are reviewing a teen worker's performance record on TeenWork, a teen job marketplace. Write a 3–4 sentence plain-language summary of this worker's record — like a report card you'd read in 20 seconds. Be specific and honest. Use the actual numbers. Sound like a trusted adult reviewing real data, not a marketing pitch.

Worker stats:
${statsBlock}

Write the summary in second person ("You worked…", "You earned…", "Your ratings show…"). Keep it warm, direct, and grounded in the actual numbers. End with one sentence about what the data suggests about this worker's strengths.`;

  let text = '';
  try { text = await callClaudeAI(prompt); }
  catch(e) { try { text = await callGemini(prompt); } catch(e2) { text = 'AI unavailable — try again shortly.'; } }

  if (wrap)  { wrap.style.display  = 'block'; }
  if (textEl){ textEl.textContent  = text; }
  if (btn)   { btn.disabled = false; btn.textContent = '✦ Regenerate Summary'; }
  wrap?.scrollIntoView({behavior:'smooth', block:'start'});
}

function toggleEmpLetterForm() {
  const w = document.getElementById('emp-letter-form-wrap');
  if (w) w.style.display = w.style.display === 'none' ? 'block' : 'none';
}

// Alias for tab-switch hook
function renderEmpLORStatsBanner() { renderEmpStatsDashboard(); }
window.renderEmpLORStatsBanner  = renderEmpLORStatsBanner;
window.renderEmpStatsDashboard  = renderEmpStatsDashboard;
window.empGenerateStatsSummary  = empGenerateStatsSummary;
window.toggleEmpLetterForm      = toggleEmpLetterForm;

// ════════════════════════════════════════════════════════════════════
//  EMPLOYER SCHEDULE — AI fill, approve/deny, teen-edit notifications,
//  live message sync
// ════════════════════════════════════════════════════════════════════

const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Employer schedule store ───────────────────────────────────────
// empSchedData[weekOffset][dayIdx] = {
//   time, status, original, items:[], isoDate
// }
let empSchedData  = {};
let empWeekOffset = 0;

const _empTeenAvail    = { Mon:true, Tue:true, Wed:true, Thu:false, Fri:true, Sat:true, Sun:false };
const _empDefaultStart = '09:00';
const _empDefaultEnd   = '17:00';

function _empGetWeekDates(offset) {
  const base = new Date();
  const day  = base.getDay() || 7;           // make Sunday = 7
  base.setHours(0,0,0,0);
  base.setDate(base.getDate() - day + 1 + offset * 7);  // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function _empFmtDate(d)   { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
function _empIsoDate(d)   { return d.toISOString().slice(0,10); }

function _empGetWeekSched(offset) {
  if (!empSchedData[offset]) {
    const dates = _empGetWeekDates(offset);
    empSchedData[offset] = {};
    DAYS_SHORT.forEach((day, i) => {
      if (_empTeenAvail[day]) {
        empSchedData[offset][i] = {
          time: `${_empDefaultStart}–${_empDefaultEnd}`,
          status: 'pending',
          original: null,
          items: [],
          isoDate: _empIsoDate(dates[i])
        };
      } else {
        empSchedData[offset][i] = null;
      }
    });
  }
  return empSchedData[offset];
}

// ── Week navigation ───────────────────────────────────────────────
function empCalNav(dir) {
  empWeekOffset += dir;
  renderEmpSchedGrid();
}

// ── AI Fill ───────────────────────────────────────────────────────
// Scans ALL messages across ALL employer contacts for confirmed shift times
// and populates the correct day cell — never guesses from a single message.
function empAIFillSchedule() {
  const note = document.getElementById('emp-ai-fill-note');
  const grid = document.getElementById('emp-sched-grid');
  if (note) { note.style.display = 'block'; note.innerHTML = '<strong>AI scanning all messages for confirmed shifts…</strong>'; }
  if (grid)  grid.style.opacity = '0.4';

  setTimeout(() => {
    // Reset week first
    const dates = _empGetWeekDates(empWeekOffset);
    empSchedData[empWeekOffset] = {};
    DAYS_SHORT.forEach((day, i) => {
      if (_empTeenAvail[day]) {
        empSchedData[empWeekOffset][i] = {
          time: `${_empDefaultStart}–${_empDefaultEnd}`,
          status: 'pending',
          original: null,
          items: [],
          isoDate: _empIsoDate(dates[i])
        };
      } else {
        empSchedData[empWeekOffset][i] = null;
      }
    });

    // Pull times from calShifts (which is the ground truth — scanMsgForJobTime populates it)
    if (typeof calShifts !== 'undefined' && calShifts.length) {
      calShifts.forEach(s => {
        if (!s.date || !s.start) return;
        // Find which week-offset day this belongs to
        dates.forEach((d, i) => {
          if (_empIsoDate(d) === s.date) {
            const cell = empSchedData[empWeekOffset][i];
            if (cell) {
              const end = s.end || _empDefaultEnd;
              cell.time   = `${s.start}–${end}`;
              cell.status = 'pending';
              if (!cell.items.find(it => it.text === s.job)) {
                cell.items.push({ id: Date.now() + i, text: s.job || 'Work shift', done: false });
              }
              _empAddSchedLog(`✦ AI found confirmed shift on ${DAYS_SHORT[i]} ${_empFmtDate(d)}: ${s.start}–${end} (${s.job || 'shift'}) — added from messages.`, 'blue');
            }
          }
        });
      });
    }

    if (note) note.style.display = 'none';
    if (grid)  grid.style.opacity = '1';
    renderEmpSchedGrid();
    _empAddSchedLog(`✦ AI fill complete for ${_empFmtDate(dates[0])}–${_empFmtDate(dates[6])}.`, 'blue');
    showToast('✦ AI filled schedule from messages — tap any day for details.', 'success');
  }, 1200);
}

// ── Grid render ───────────────────────────────────────────────────
function renderEmpSchedGrid() {
  const grid  = document.getElementById('emp-sched-grid');
  const label = document.getElementById('emp-cal-label');
  if (!grid) return;

  const dates = _empGetWeekDates(empWeekOffset);
  const sched = _empGetWeekSched(empWeekOffset);
  if (label) label.textContent = `${_empFmtDate(dates[0])} – ${_empFmtDate(dates[6])}`;

  const cellBase = 'border-radius:8px;padding:6px 3px;text-align:center;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:1.5px solid;font-size:.68rem;transition:filter .15s;';
  const statusStyle = {
    pending:       'background:#fff8e1;border-color:#f6c90e;',
    approved:      'background:var(--green-pale);border-color:var(--green-light);',
    denied:        'background:var(--red-pale);border-color:#f5b7b1;',
    'teen-edited': 'background:var(--purple-pale);border-color:#c4b5fd;',
  };
  const statusColor = {
    pending:       'color:#7a5800;',
    approved:      'color:var(--green);',
    denied:        'color:var(--red);',
    'teen-edited': 'color:var(--purple);',
  };

  let html = '';
  // Corner
  html += `<div></div>`;
  // Day headers
  dates.forEach((d, i) => {
    const isToday = _empIsoDate(d) === _empIsoDate(new Date());
    html += `<div style="text-align:center;padding:4px 2px;font-size:.66rem;font-weight:700;color:${isToday?'var(--green)':'var(--muted)'};">
      ${DAYS_SHORT[i]}<br><span style="font-size:.6rem;font-weight:400;">${_empFmtDate(d)}</span>
    </div>`;
  });
  // Row label
  html += `<div style="font-size:.68rem;font-weight:700;color:var(--muted);display:flex;align-items:center;">Alex</div>`;
  // Cells
  DAYS_SHORT.forEach((_, i) => {
    const shift = sched[i];
    if (!shift) {
      html += `<div style="${cellBase}background:var(--bg);border-color:var(--border);opacity:.4;font-size:.6rem;color:var(--muted);">off</div>`;
    } else {
      const ss = statusStyle[shift.status] || statusStyle.pending;
      const sc = statusColor[shift.status]  || statusColor.pending;
      const taskCount = (shift.items||[]).length;
      html += `<div style="${cellBase}${ss}" onclick="openEmpDayDetail(${empWeekOffset},${i})" title="Click for day details">
        <div style="font-weight:700;font-size:.65rem;${sc};line-height:1.2;">${shift.time}</div>
        <div style="font-size:.58rem;${sc};opacity:.75;">${shift.status}</div>
        ${taskCount ? `<div style="font-size:.58rem;color:var(--muted);margin-top:1px;">📋 ${taskCount}</div>` : ''}
      </div>`;
    }
  });

  grid.innerHTML = html;
}

// ── Day detail modal ──────────────────────────────────────────────
// Opens when a grid cell is clicked. Shows shift info, task list,
// teen-edit form, and employer approve/deny for the SPECIFIC DAY.
function openEmpDayDetail(weekOffset, dayIdx) {
  const sched = _empGetWeekSched(weekOffset);
  const shift = sched[dayIdx];
  const dates = _empGetWeekDates(weekOffset);
  const date  = dates[dayIdx];
  const day   = DAYS_SHORT[dayIdx];

  // Remove existing
  document.getElementById('emp-day-detail-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'emp-day-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const items    = shift ? (shift.items || []) : [];
  const itemsHtml = items.length
    ? items.map(it => `
        <div id="emp-task-${it.id}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
          <input type="checkbox" ${it.done?'checked':''} onchange="empToggleTask(${weekOffset},${dayIdx},${it.id},this.checked)" style="accent-color:var(--green);width:16px;height:16px;flex-shrink:0;">
          <span style="flex:1;font-size:.85rem;${it.done?'text-decoration:line-through;color:var(--muted);':''}">${escHtml(it.text)}</span>
          <button onclick="empDeleteTask(${weekOffset},${dayIdx},${it.id})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.9rem;padding:0 4px;" title="Remove">✕</button>
        </div>`).join('')
    : `<p style="color:var(--muted);font-size:.84rem;font-style:italic;padding:6px 0;">No tasks yet — add one below.</p>`;

  const shiftExists = !!shift;
  const curStart = shiftExists ? (shift.time.split('–')[0]||'09:00') : '09:00';
  const curEnd   = shiftExists ? (shift.time.split('–')[1]||'17:00') : '17:00';

  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:16px;max-width:480px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:var(--shadow-lg);padding:0;">
      <div style="background:var(--green-pale);border-radius:16px 16px 0 0;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1rem;font-weight:700;color:var(--green);">📅 ${day} — ${_empFmtDate(date)}</div>
          ${shiftExists ? `<div style="font-size:.78rem;color:var(--muted);margin-top:2px;">Shift: ${shift.time} · <span style="font-weight:700;color:${
            shift.status==='approved'?'var(--green)':shift.status==='denied'?'var(--red)':shift.status==='teen-edited'?'var(--purple)':'#7a5800'
          };">${shift.status}</span></div>` : '<div style="font-size:.78rem;color:var(--muted);">No shift scheduled</div>'}
        </div>
        <button onclick="document.getElementById('emp-day-detail-overlay').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted);line-height:1;">✕</button>
      </div>

      <div style="padding:16px 18px;">

        ${shiftExists ? `
        <!-- Approve / Deny -->
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <button onclick="empSetShiftStatus(${weekOffset},${dayIdx},'approved')" class="btn-sm btn-approve" style="flex:1;">✓ Approve Shift</button>
          <button onclick="empSetShiftStatus(${weekOffset},${dayIdx},'denied')"   class="btn-sm btn-deny"    style="flex:1;">✗ Deny Shift</button>
        </div>

        <!-- Edit shift time (employer can adjust) -->
        <div style="margin-bottom:14px;">
          <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Adjust Shift Time</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <div style="flex:1;min-width:100px;">
              <label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:2px;">Start</label>
              <input type="time" id="emp-edit-start-${weekOffset}-${dayIdx}" value="${curStart}" style="width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.85rem;background:#fff;">
            </div>
            <div style="flex:1;min-width:100px;">
              <label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:2px;">End</label>
              <input type="time" id="emp-edit-end-${weekOffset}-${dayIdx}"   value="${curEnd}"   style="width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.85rem;background:#fff;">
            </div>
            <div style="display:flex;flex-direction:column;justify-content:flex-end;padding-top:16px;">
              <button onclick="empSaveShiftTime(${weekOffset},${dayIdx})" class="btn-sm btn-approve">Save Time</button>
            </div>
          </div>
          ${shift.status==='teen-edited' ? `<div style="margin-top:6px;font-size:.78rem;background:var(--purple-pale);color:var(--purple);border-radius:6px;padding:5px 9px;">⚡ Teen changed this from ${shift.original||'original time'}. Review and approve or deny.</div>` : ''}
        </div>
        ` : `
        <!-- Add a shift to this day -->
        <div style="margin-bottom:14px;">
          <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Add Shift for This Day</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:100px;"><label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:2px;">Start</label><input type="time" id="emp-new-start-${dayIdx}" value="09:00" style="width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.85rem;background:#fff;"></div>
            <div style="flex:1;min-width:100px;"><label style="font-size:.72rem;color:var(--muted);display:block;margin-bottom:2px;">End</label><input type="time" id="emp-new-end-${dayIdx}"   value="17:00" style="width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.85rem;background:#fff;"></div>
            <div style="display:flex;flex-direction:column;justify-content:flex-end;padding-top:16px;"><button onclick="empAddNewShift(${weekOffset},${dayIdx})" class="btn-sm btn-approve">Add Shift</button></div>
          </div>
        </div>
        `}

        <!-- Task / to-do list for this day -->
        <div>
          <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Tasks for this day</div>
          <div id="emp-tasks-${weekOffset}-${dayIdx}">${itemsHtml}</div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <input type="text" id="emp-new-task-${weekOffset}-${dayIdx}" placeholder="Add a task or note…" style="flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.84rem;background:#fff;" onkeydown="if(event.key==='Enter')empAddTask(${weekOffset},${dayIdx})">
            <button onclick="empAddTask(${weekOffset},${dayIdx})" class="btn-sm btn-approve">Add</button>
          </div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function empSetShiftStatus(weekOffset, dayIdx, status) {
  const sched = empSchedData[weekOffset];
  if (!sched || !sched[dayIdx]) return;
  const shift = sched[dayIdx];
  const day   = DAYS_SHORT[dayIdx];
  shift.status = status;
  if (status === 'approved') {
    _empAddSchedLog(`✓ ${day} shift approved.`, 'green');
    _empNotifyTeenOfEmployerResponse(day, shift.time, true);
  } else {
    _empAddSchedLog(`✗ ${day} shift denied.`, 'red');
    _empNotifyTeenOfEmployerResponse(day, shift.time, false);
  }
  renderEmpSchedGrid();
  // Refresh the modal header
  document.getElementById('emp-day-detail-overlay')?.remove();
  openEmpDayDetail(weekOffset, dayIdx);
}

function empSaveShiftTime(weekOffset, dayIdx) {
  const sched = empSchedData[weekOffset];
  if (!sched || !sched[dayIdx]) return;
  const shift  = sched[dayIdx];
  const day    = DAYS_SHORT[dayIdx];
  const start  = document.getElementById(`emp-edit-start-${weekOffset}-${dayIdx}`)?.value || _empDefaultStart;
  const end    = document.getElementById(`emp-edit-end-${weekOffset}-${dayIdx}`)?.value   || _empDefaultEnd;
  const newTime = `${start}–${end}`;
  if (newTime === shift.time) { showToast('No change made.','info'); return; }
  shift.original = shift.time;
  shift.time     = newTime;
  shift.status   = 'pending';
  _empAddSchedLog(`📝 ${day} shift time updated to ${newTime} by employer — teen notified.`, 'amber');
  _empNotifyTeenOfEmployerResponse(day, newTime, true);
  renderEmpSchedGrid();
  // Update modal header text without full re-open
  document.getElementById('emp-day-detail-overlay')?.remove();
  openEmpDayDetail(weekOffset, dayIdx);
}

function empAddNewShift(weekOffset, dayIdx) {
  const dates = _empGetWeekDates(weekOffset);
  const start = document.getElementById(`emp-new-start-${dayIdx}`)?.value || _empDefaultStart;
  const end   = document.getElementById(`emp-new-end-${dayIdx}`)?.value   || _empDefaultEnd;
  if (!empSchedData[weekOffset]) empSchedData[weekOffset] = {};
  empSchedData[weekOffset][dayIdx] = {
    time: `${start}–${end}`,
    status: 'pending',
    original: null,
    items: [],
    isoDate: _empIsoDate(dates[dayIdx])
  };
  _empAddSchedLog(`➕ Shift added for ${DAYS_SHORT[dayIdx]} ${_empFmtDate(dates[dayIdx])}: ${start}–${end}.`, 'blue');
  renderEmpSchedGrid();
  document.getElementById('emp-day-detail-overlay')?.remove();
  openEmpDayDetail(weekOffset, dayIdx);
}

// ── Task management ───────────────────────────────────────────────
function empAddTask(weekOffset, dayIdx) {
  const input = document.getElementById(`emp-new-task-${weekOffset}-${dayIdx}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const sched = _empGetWeekSched(weekOffset);
  const shift = sched[dayIdx];
  if (!shift) return;
  shift.items = shift.items || [];
  const item = { id: Date.now(), text, done: false };
  shift.items.push(item);
  input.value = '';
  // Re-render task list inside modal
  _empRerenderTasks(weekOffset, dayIdx);
  renderEmpSchedGrid();
}

function empToggleTask(weekOffset, dayIdx, taskId, done) {
  const sched = empSchedData[weekOffset];
  const shift = sched?.[dayIdx];
  if (!shift) return;
  const item = (shift.items||[]).find(it => it.id === taskId);
  if (item) { item.done = done; }
  _empRerenderTasks(weekOffset, dayIdx);
  renderEmpSchedGrid();
}

function empDeleteTask(weekOffset, dayIdx, taskId) {
  const sched = empSchedData[weekOffset];
  const shift = sched?.[dayIdx];
  if (!shift) return;
  shift.items = (shift.items||[]).filter(it => it.id !== taskId);
  _empRerenderTasks(weekOffset, dayIdx);
  renderEmpSchedGrid();
}

function _empRerenderTasks(weekOffset, dayIdx) {
  const container = document.getElementById(`emp-tasks-${weekOffset}-${dayIdx}`);
  if (!container) return;
  const sched = empSchedData[weekOffset];
  const items = sched?.[dayIdx]?.items || [];
  container.innerHTML = items.length
    ? items.map(it => `
        <div id="emp-task-${it.id}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
          <input type="checkbox" ${it.done?'checked':''} onchange="empToggleTask(${weekOffset},${dayIdx},${it.id},this.checked)" style="accent-color:var(--green);width:16px;height:16px;flex-shrink:0;">
          <span style="flex:1;font-size:.85rem;${it.done?'text-decoration:line-through;color:var(--muted);':''}">${escHtml(it.text)}</span>
          <button onclick="empDeleteTask(${weekOffset},${dayIdx},${it.id})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.9rem;padding:0 4px;" title="Remove">✕</button>
        </div>`).join('')
    : `<p style="color:var(--muted);font-size:.84rem;font-style:italic;padding:6px 0;">No tasks yet — add one below.</p>`;
}

// ── Notify teen via messages ──────────────────────────────────────
function _empNotifyTeenOfEmployerResponse(day, time, approved) {
  const text = approved
    ? `Hi Alex — confirmed your ${day} shift at ${time}. See you then! ✓`
    : `Hi Alex — sorry, ${day} at ${time} won't work for us. Can you let me know another time that works?`;
  // Inject into employer→Alex thread
  [MSG_CONTACTS.employer, MSG_CONTACTS.teen].forEach((arr, side) => {
    if (!arr) return;
    const contact = side === 0
      ? arr.find(c => c.id === 'alex-j' || c.name?.toLowerCase().includes('alex'))
      : arr.find(c => c.role === 'employer');
    if (!contact) return;
    contact.messages = contact.messages || [];
    contact.messages.push({ from: side===0 ? 'me' : 'them', text, time: new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) });
    contact.unread = (contact.unread||0) + 1;
  });
}

// ── Schedule log panel ────────────────────────────────────────────
function _empAddSchedLog(text, type) {
  const log = document.getElementById('emp-sched-log');
  if (!log) return;
  const placeholder = log.querySelector('p');
  if (placeholder) placeholder.remove();
  const colors = { green:'var(--green-pale)', amber:'var(--amber-pale)', red:'var(--red-pale)', blue:'var(--blue-pale)', purple:'var(--purple-pale)' };
  const texts  = { green:'var(--green)', amber:'var(--amber)', red:'var(--red)', blue:'var(--blue)', purple:'var(--purple)' };
  const ts  = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const el  = document.createElement('div');
  el.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:6px;font-size:.8rem;background:${colors[type]||colors.blue};color:${texts[type]||texts.blue};`;
  el.innerHTML = `<span style="flex:1;line-height:1.45;">${text}</span><span style="font-size:.7rem;opacity:.65;white-space:nowrap;margin-top:1px;">${ts}</span>`;
  log.insertBefore(el, log.firstChild);
}

// ── Message-driven schedule sync ──────────────────────────────────
// Hooks into the existing showCalNotice / calNoticeAdd pipeline.
// When the teen's message scanner (scanMsgForJobTime) fires showCalNotice
// with a confirmed date+time, we find the matching grid cell by ISO date
// — not by guessing from the last message text.
(function _hookShowCalNoticeForEmpGrid() {
  const _orig = window.showCalNotice;
  if (!_orig) { setTimeout(_hookShowCalNoticeForEmpGrid, 500); return; }
  window.showCalNotice = function(contactId, date, start, end, job, dateDisplay, startDisplay, endDisplay) {
    // Call original (shows teen-side notice banner)
    _orig.apply(this, arguments);
    // Now map this confirmed date+time onto the employer grid
    _empApplyConfirmedShift(date, start, end, job);
  };
})();

// Also hook calNoticeAdd so "Add to My Calendar" also syncs employer grid
(function _hookCalNoticeAdd() {
  const _orig = window.calNoticeAdd;
  if (!_orig) { setTimeout(_hookCalNoticeAdd, 500); return; }
  window.calNoticeAdd = function(contactId, date, start, end, job, btn) {
    _orig.apply(this, arguments);
    _empApplyConfirmedShift(date, start, end, job);
  };
})();

function _empApplyConfirmedShift(date, start, end, job) {
  // Search every offset's week to find which cell matches this ISO date
  for (let off = empWeekOffset - 2; off <= empWeekOffset + 4; off++) {
    const dates = _empGetWeekDates(off);
    dates.forEach((d, i) => {
      if (_empIsoDate(d) !== date) return;
      if (!empSchedData[off]) _empGetWeekSched(off);
      const cell = empSchedData[off][i];
      if (cell) {
        const newTime = `${start}–${end||_empDefaultEnd}`;
        if (cell.time !== newTime) {
          cell.original = cell.time;
          cell.time     = newTime;
          cell.status   = 'pending';
          _empAddSchedLog(`⚡ Message confirmed shift on ${DAYS_SHORT[i]} ${_empFmtDate(d)}: ${newTime} (${job||'shift'}) — pending approval.`, 'amber');
        }
        if (job && !cell.items.find(it => it.text === job)) {
          cell.items.push({ id: Date.now(), text: job, done: false });
        }
      } else {
        // Day was marked "off" but a shift was confirmed — create it
        empSchedData[off][i] = {
          time: `${start}–${end||_empDefaultEnd}`,
          status: 'pending',
          original: null,
          items: job ? [{ id: Date.now(), text: job, done: false }] : [],
          isoDate: date
        };
        _empAddSchedLog(`⚡ New shift detected on ${DAYS_SHORT[i]} ${_empFmtDate(d)}: ${start}–${end||_empDefaultEnd} — added from messages.`, 'amber');
      }
      if (off === empWeekOffset) renderEmpSchedGrid();
    });
  }
}

// ── Teen-edit detection: scan ALL job contacts, match by EXACT day/date ──
// For each message, we only act on it if the message text explicitly
// names the day (Monday/Mon) AND that day matches a real grid cell for
// this week, OR if the message contains an ISO/US date that matches a cell.
// ════════════════════════════════════════════════════════════════
//  LETTERS OF RECOMMENDATION — JS
//  Employer: generate (AI), write manually, save & send to teen
//  Teen:     view, download-as-PDF, upload custom letters
//  Employer Reviews: see teen stats + notes per worker
// ════════════════════════════════════════════════════════════════

/* ---------- in-memory store for demo ---------- */
var _empLetters = []; // { id, from, title, job, rating, quality, notes, text, date, sent }
const _teenLetters = [  // pre-loaded demo letters for the teen side
  {
    id:'lor-demo-1',
    from:"Mike's Landscaping",
    fromTitle:'Owner',
    job:'Lawn mowing and yard cleanup, spring–fall 2024',
    rating:'exceptional',
    date:'October 14, 2024',
    text:`To Whom It May Concern,

I am writing to enthusiastically recommend Alex Johnson for any position requiring reliability, initiative, and a strong work ethic. Alex worked with my landscaping business throughout the spring and fall of 2024, completing lawn care and yard cleanup for a number of my residential clients.

From the very first job, Alex stood out. Every scheduled visit was met with punctuality — often arriving a few minutes early. The quality of the work was consistently excellent: clean lines, thorough cleanup, and attention to detail that I rarely see in workers twice Alex's age.

What impressed me most was Alex's communication. After every job, I received a quick update — sometimes with a photo — confirming the work was done and asking if anything else was needed. That level of professionalism is rare and it made my job as a business owner significantly easier.

I would rehire Alex without hesitation and give my highest recommendation to any employer or institution fortunate enough to work with this young person.

Sincerely,
Mike Callahan
Owner, Mike's Landscaping
mike@mikeslandscaping.com`,
    sent:true
  },
  {
    id:'lor-demo-2',
    from:'Sarah Chen',
    fromTitle:'Homeowner',
    job:'Pet sitting and dog walking, summer 2024',
    rating:'excellent',
    date:'August 3, 2024',
    text:`To Whom It May Concern,

I am happy to recommend Alex Johnson based on my experience hiring Alex for pet sitting and dog walking over the summer of 2024.

Alex cared for our two dogs, Biscuit and Maple, on several occasions when our family was traveling. Every time, we returned home to happy, well-fed dogs and a spotless house. Alex followed every instruction carefully and always sent us photos to let us know the pets were doing well.

I was particularly impressed by Alex's calm demeanor and genuine affection for our animals. It was clear that this wasn't just a paycheck — Alex actually cared about doing a good job.

I would recommend Alex to any family looking for a responsible, caring, and professional young worker.

Warm regards,
Sarah Chen`,
    sent:true
  }
];

/* Employer-side notes per teen (for the Reviews tab) */
const _empWorkerNotes = {
  'Alex Johnson': [
    { date:'Oct 5, 2024', note:'Great work today — mowed front and back, edged walkway perfectly. Arrived 10 min early.' },
    { date:'Sep 21, 2024', note:'Good job overall. Left a little grass around the fence — reminded him for next time.' },
    { date:'Aug 30, 2024', note:'Excellent. Sent a before/after photo without being asked. Will definitely rehire.' },
  ]
};

/* ---------- EMPLOYER: Generate letter with AI ---------- */
/* ── Compile teen stats for LOR ── */
function _compileteenStatsForLOR() {
  const ratings = (typeof demoRatings !== 'undefined') ? demoRatings : [];
  const schedule = (typeof calShifts !== 'undefined') ? calShifts : (typeof window._calShifts !== 'undefined' ? window._calShifts : []);
  const totalRatings = ratings.length;
  const avgRating = totalRatings ? (ratings.reduce((s,r)=>s+r.stars,0)/totalRatings).toFixed(1) : null;
  const fiveStars = ratings.filter(r=>r.stars===5).length;
  const reviews = ratings.filter(r=>r.comment && r.comment.trim().length>5);
  const allShifts = schedule.length ? schedule : [];
  const weekSet = new Set();
  allShifts.forEach(s => {
    if (s.date) {
      try {
        const d = new Date(s.date);
        const jan1 = new Date(d.getFullYear(),0,1);
        const week = Math.ceil(((d-jan1)/86400000+jan1.getDay()+1)/7);
        weekSet.add(d.getFullYear()+'-W'+week);
      } catch(e){}
    }
  });
  const weeksWorked = weekSet.size;
  let totalHours = 0;
  allShifts.forEach(s => {
    if (s.startTime && s.endTime) {
      const [sh,sm] = s.startTime.split(':').map(Number);
      const [eh,em] = s.endTime.split(':').map(Number);
      const hrs = (eh*60+em - sh*60-sm)/60;
      if (hrs>0 && hrs<24) totalHours += hrs;
    } else if (s.hours) { totalHours += parseFloat(s.hours)||0; }
  });
  if (totalHours < 1 && typeof teenGameState !== 'undefined' && teenGameState.hoursWorked) totalHours = teenGameState.hoursWorked;
  if (totalHours < 1) totalHours = 14;
  const jobTypes = [...new Set([...ratings.map(r=>r.job), ...allShifts.map(s=>s.job||s.title||'').filter(Boolean)])].filter(Boolean);
  const lessonsCompleted = (typeof lessonProgress !== 'undefined') ? Object.entries(lessonProgress).filter(([,v])=>v&&v.done).length : 0;
  const badges = (typeof teenGameState!=='undefined' && teenGameState.badges) ? teenGameState.badges.map(b=>b.label||b.id).join(', ') : '';
  const bestReview = reviews.sort((a,b)=>b.stars-a.stars)[0];
  return {
    totalRatings, avgRating, fiveStars, reviews,
    weeksWorked: weeksWorked || Math.round(totalHours/10) || 2,
    totalHours: parseFloat(totalHours.toFixed(1)),
    jobTypes, lessonsCompleted, badges, bestReview,
    jobsCompleted: allShifts.filter(s=>s.done||s.completed||s.status==='done').length || totalRatings || allShifts.length || 3,
  };
}

async function empGenerateLetter() {
  const from    = document.getElementById('ltr-from')?.value.trim();
  const title   = document.getElementById('ltr-title')?.value.trim();
  const job     = document.getElementById('ltr-job')?.value.trim();
  const rating  = document.getElementById('ltr-rating')?.value;
  const quality = document.getElementById('ltr-quality')?.value;
  const notes   = document.getElementById('ltr-notes')?.value.trim();
  const alertEl = document.getElementById('emp-letter-alert');

  if (!from || !job) {
    if (alertEl) { alertEl.className='alert alert-error show'; alertEl.textContent='Please fill in your name/business and the job Alex did.'; }
    return;
  }
  if (alertEl) { alertEl.className='alert alert-success show'; alertEl.textContent='✦ AI is drafting the letter…'; }

  const ratingWord = rating==='exceptional'?'exceptional (5 stars)':rating==='excellent'?'excellent (4 stars)':'good (3 stars)';

  const stats = _compileteenStatsForLOR();
  const statsBlock = [
    'Total jobs completed: ' + stats.jobsCompleted,
    'Weeks worked on platform: ' + stats.weeksWorked,
    'Total hours worked: ' + stats.totalHours,
    stats.avgRating ? 'Average rating across all jobs: ' + stats.avgRating + '/5.0 (' + stats.totalRatings + ' ratings)' : '',
    stats.fiveStars ? '5-star reviews earned: ' + stats.fiveStars : '',
    stats.jobTypes.length ? 'Types of jobs done: ' + stats.jobTypes.join(', ') : '',
    stats.lessonsCompleted ? 'Professional lessons completed: ' + stats.lessonsCompleted : '',
    stats.badges ? 'Badges earned: ' + stats.badges : '',
    stats.bestReview ? 'Best review quote: "' + stats.bestReview.comment + '" — ' + stats.bestReview.from + ' (' + stats.bestReview.stars + '★)' : '',
    notes ? 'Employer notes: ' + notes : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are writing a professional letter of recommendation for a teen worker named Alex Johnson, age 16.

The letter is written by: ${from}, ${title||'Employer'}.
The specific job Alex did for this employer: ${job}
Rating from this employer: ${ratingWord}
Strongest quality observed: ${quality}

FULL TEEN WORK HISTORY & STATS (from TeenWork platform):
` + statsBlock + `

Write a warm, professional, 4-paragraph letter of recommendation.
- Paragraph 1: Introduce yourself (${from}, ${title||'Employer'}), your relationship with Alex, and the specific job they did for you.
- Paragraph 2: Give 2-3 specific, vivid examples of Alex's strengths based on what you observed and the rating.
- Paragraph 3: Reference Alex's broader work record — highlight the total jobs, weeks worked, hours, and strong ratings as evidence of a consistent pattern of reliability, not just a one-time performance.
- Paragraph 4: A strong, enthusiastic closing endorsement. State clearly whether you would hire Alex again.

End with:
Sincerely,
${from}
${title||''}

Rules: Do NOT use placeholder brackets. Write it as a complete, ready-to-send letter. Be specific and vivid — weave in the stats and review quotes naturally.`;

  let text = '';
  try {
    text = await callClaudeAI(prompt);
  } catch(e) {
    try { text = await callGemini(prompt); } catch(e2) {
      if (alertEl) { alertEl.className='alert alert-error show'; alertEl.textContent='AI unavailable — try "Write Manually Instead".'; }
      return;
    }
  }

  if (alertEl) { alertEl.className=''; alertEl.textContent=''; }
  const editor = document.getElementById('emp-letter-editor');
  if (editor) editor.value = text;
  document.getElementById('emp-letter-preview-wrap').style.display='block';
  document.getElementById('emp-letter-preview-wrap').scrollIntoView({behavior:'smooth',block:'start'});
  window._empLetterDraft = { from, title, job, rating, quality, notes, text };
}
/* ---------- EMPLOYER: Open blank letter for manual editing ---------- */
function empPreviewBlankLetter() {
  const from  = document.getElementById('ltr-from')?.value.trim() || 'Your Name / Business';
  const title = document.getElementById('ltr-title')?.value.trim() || 'Your Title';
  const job   = document.getElementById('ltr-job')?.value.trim() || '[Job description]';
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const editor = document.getElementById('emp-letter-editor');
  if (editor) {
    editor.value =
`${today}

To Whom It May Concern,

I am writing to recommend Alex Johnson for [purpose]. Alex worked with me as a ${job}.

[Describe Alex's work, attitude, reliability, and what impressed you most.]

[Closing endorsement — would you hire Alex again? Do you recommend them strongly?]

Sincerely,
${from}
${title}`;
  }
  document.getElementById('emp-letter-preview-wrap').style.display='block';
  document.getElementById('emp-letter-preview-wrap').scrollIntoView({behavior:'smooth',block:'start'});
  window._empLetterDraft = { from, title, job, rating:'good', quality:'reliability', notes:'', text:editor?.value||'' };
}

/* ---------- EMPLOYER: Save & send letter to teen ---------- */
function empSaveLetter() {
  const text = document.getElementById('emp-letter-editor')?.value.trim();
  if (!text || text.length < 80) { showToast('Letter seems too short — please write at least a short paragraph.','error'); return; }
  const draft = window._empLetterDraft || {};
  const letter = {
    id: 'lor-' + Date.now(),
    from: draft.from || document.getElementById('ltr-from')?.value || 'Employer',
    fromTitle: draft.title || '',
    job: draft.job || '',
    rating: draft.rating || 'good',
    quality: draft.quality || 'reliability',
    notes: draft.notes || '',
    text,
    date: new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),
    sent: true
  };
  _empLetters.push(letter);
  _teenLetters.push(letter); // also makes it visible on the teen side
  renderEmpLetterList();
  document.getElementById('emp-letter-preview-wrap').style.display='none';
  showToast('✅ Letter saved and sent to Alex\'s account!','success');

  // Send email notification to teen via EmailJS
  if (typeof emailjs !== 'undefined' && EMAILJS_SERVICE !== 'YOUR_EMAILJS_SERVICE_ID') {
    const teenEmail = currentUser?.email || pendingEmail || '';
    if (teenEmail) {
      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_name: 'Alex Johnson',
        to_email: teenEmail,
        subject: `📜 You have a new Letter of Recommendation from ${letter.from}!`,
        message: `Hi Alex,\n\nGreat news — ${letter.from}${letter.fromTitle ? ' (' + letter.fromTitle + ')' : ''} has written you a Letter of Recommendation on TeenWork!\n\nJob: ${letter.job}\nRating: ${letter.rating}\n\nLog in to your TeenWork account and go to Letters of Recommendation to view, download as PDF, or share your letter.\n\nKeep up the great work!\n— The TeenWork Team`,
        reply_to: 'ayaquarrierdraper@gmail.com'
      }).catch(e => console.warn('Letter notification email failed:', e));
    }
  }
  // Notify teen
  if (typeof demoNotifs!=='undefined') {
    demoNotifs.unshift({ text:`📝 ${letter.from} sent you a Letter of Recommendation — check your Letters tab!`, time:'Just now', read:false });
    if (typeof renderNotifications==='function') renderNotifications();
  }
  // Award teen badge
  if (typeof awardBadge==='function') awardBadge('letter_of_rec');
  renderTeenLettersPanel();
}

/* ---------- EMPLOYER: Print / PDF letter ---------- */
function empPrintLetter() {
  const text = document.getElementById('emp-letter-editor')?.value || '';
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Letter of Recommendation</title>
${'<'}style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;line-height:1.8;font-size:15px;color:#111}h1{font-size:1rem;margin-bottom:0}pre{white-space:pre-wrap;font-family:inherit;font-size:15px;border:none;padding:0;margin:0}${'<'}/style>
</head><body><pre>${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),400);
}

/* ---------- EMPLOYER: Render saved letters list ---------- */
function renderEmpLetterList() {
  const c = document.getElementById('emp-letter-list');
  if (!c) return;
  const all = _empLetters;
  if (!all.length) {
    c.innerHTML='<p style="color:var(--muted);font-size:.85rem;font-style:italic">No letters written yet — write one below and it\'ll appear here.</p>';
    return;
  }
  c.innerHTML = all.map(l=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:.9rem 0;border-bottom:1px solid var(--border)">
      <div style="font-size:1.6rem;line-height:1;flex-shrink:0">📄</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.9rem;color:var(--text)">${safeText(l.job||'Letter of Recommendation')}</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:2px">Written by ${safeText(l.from)} · ${safeText(l.date)}</div>
        <div style="font-size:.75rem;background:var(--green-pale);color:var(--green);display:inline-block;padding:2px 8px;border-radius:20px;margin-top:4px;font-weight:700">✅ Sent to Alex</div>
      </div>
      <button class="btn-sm btn-purple" onclick="empViewLetter('${l.id}')">View</button>
    </div>`).join('');
}

function empViewLetter(id) {
  const l = _empLetters.find(x=>x.id===id);
  if (!l) return;
  const editor = document.getElementById('emp-letter-editor');
  if (editor) editor.value = l.text;
  document.getElementById('emp-letter-preview-wrap').style.display='block';
  document.getElementById('emp-letter-preview-wrap').scrollIntoView({behavior:'smooth',block:'start'});
  window._empLetterDraft = l;
}
window.empGenerateLetter  = empGenerateLetter;
window.empPreviewBlankLetter = empPreviewBlankLetter;
window.empSaveLetter      = empSaveLetter;
window.empPrintLetter     = empPrintLetter;
window.empViewLetter      = empViewLetter;

/* ────────────────────────────────────────────────────────────────────
   EMPLOYER REVIEWS TAB — shows notes, hours worked, money paid, lessons
   ──────────────────────────────────────────────────────────────────── */
function renderEmpReviewsTab() {
  const wrap = document.getElementById('etab-reviews-inner');
  if (!wrap) return;

  // Aggregate stats from demo applicants (hired workers)
  const hired = (typeof demoApplicants!=='undefined') ? demoApplicants.filter(a=>a.hired) : [];
  const ratings = (typeof demoRatings!=='undefined') ? demoRatings : [];

  // Calc total hours from employer schedule data
  const sched = (typeof _empGetWeekSched==='function') ? _empGetWeekSched(0) : [];
  let totalHoursThisWeek = 0;
  Object.values(sched||{}).forEach(s=>{ if(s && s.status==='approved' && s.time) {
    const m = s.time.match(/(\d+):(\d+)[–-](\d+):(\d+)/);
    if(m) totalHoursThisWeek += (parseInt(m[3])*60+parseInt(m[4]) - parseInt(m[1])*60-parseInt(m[2]))/60;
  }});

  const totalPaidEst = hired.length * 120; // rough demo estimate
  const avgRating = ratings.length ? (ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1) : 'N/A';

  // Notes for Alex
  const notes = _empWorkerNotes['Alex Johnson'] || [];

  wrap.innerHTML = `
    <!-- Stats Row -->
    <div class="stats-row" style="margin-bottom:1.2rem">
      <div class="stat-card green"><div class="stat-label">Workers Hired</div><div class="stat-value">${hired.length}</div><div class="stat-sub">this season</div></div>
      <div class="stat-card amber"><div class="stat-label">Hrs Scheduled</div><div class="stat-value">${totalHoursThisWeek.toFixed(1)}</div><div class="stat-sub">this week</div></div>
      <div class="stat-card blue"><div class="stat-label">Avg Worker Rating</div><div class="stat-value">${avgRating}</div><div class="stat-sub">you gave</div></div>
      <div class="stat-card purple"><div class="stat-label">Est. Wages Paid</div><div class="stat-value">$${totalPaidEst}</div><div class="stat-sub">this season</div></div>
    </div>

    <!-- Per-worker cards -->
    ${hired.map(a=>{
      const workerRatings = ratings.filter(r=>r.from===a.name||r.job===a.job);
      const avgW = workerRatings.length ? (workerRatings.reduce((s,r)=>s+r.stars,0)/workerRatings.length).toFixed(1) : '–';
      const workerNotes = _empWorkerNotes[a.name] || [];
      return `
      <div class="panel" style="margin-bottom:1.2rem">
        <div class="panel-head" style="background:var(--green-pale)">
          <h2 style="color:var(--green)">👤 ${safeText(a.name)}</h2>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge badge-green">Hired ✓</span>
            <button class="btn-sm btn-purple" onclick="switchDashTab(null,'etab-letters')">📝 Write Letter</button>
          </div>
        </div>
        <div class="panel-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:1rem">
            <div style="background:var(--bg);border-radius:10px;padding:.6rem .9rem;text-align:center">
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted)">Job</div>
              <div style="font-size:.88rem;font-weight:700;color:var(--text);margin-top:2px">${safeText(a.job)}</div>
            </div>
            <div style="background:var(--bg);border-radius:10px;padding:.6rem .9rem;text-align:center">
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted)">Rating Given</div>
              <div style="font-size:1.2rem;font-weight:900;color:var(--amber);margin-top:2px">${avgW}</div>
            </div>
            <div style="background:var(--bg);border-radius:10px;padding:.6rem .9rem;text-align:center">
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted)">City</div>
              <div style="font-size:.88rem;font-weight:700;color:var(--text);margin-top:2px">${safeText(a.city)}</div>
            </div>
            <div style="background:var(--bg);border-radius:10px;padding:.6rem .9rem;text-align:center">
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted)">Skills</div>
              <div style="font-size:.78rem;color:var(--text);margin-top:2px">${(a.skills||[]).join(', ')||'—'}</div>
            </div>
          </div>
          <!-- Ratings given by this employer -->
          ${workerRatings.length ? `
          <div style="margin-bottom:1rem">
            <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Ratings You Gave</div>
            ${workerRatings.map(r=>`
            <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.84rem">
              <span style="font-weight:600">${safeText(r.job)}</span>
              <span style="color:#f59e0b">${'⭐'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
              <span style="color:var(--muted);font-style:italic">"${safeText(r.comment)}"</span>
            </div>`).join('')}
          </div>` : ''}
          <!-- Private notes -->
          <div>
            <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Your Private Notes</div>
            ${workerNotes.map(n=>`
            <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.83rem">
              <span style="color:var(--green);font-weight:700;flex-shrink:0">${safeText(n.date)}</span>
              <span style="color:var(--text)">${safeText(n.note)}</span>
            </div>`).join('')}
            <div style="display:flex;gap:8px;margin-top:.7rem;flex-wrap:wrap">
              <input type="text" id="emp-note-input-${a.name.replace(/\s/g,'_')}" placeholder="Add a private note about ${a.name.split(' ')[0]}…" style="flex:1;min-width:140px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.82rem;outline:none">
              <button class="btn-sm btn-approve" onclick="empAddWorkerNote('${a.name.replace(/'/g,"\\'")}')">Add Note</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('')}
    ${!hired.length ? `<div style="text-align:center;padding:2.5rem 1rem;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:.75rem">📋</div><div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:.4rem">No workers hired yet</div><div style="font-size:.85rem">Hire an applicant from the Applicants tab to see their review card here.</div></div>` : ''}

    <!-- Teen Lessons Completed (visible to employer for hired workers) -->
    ${hired.length ? `
    <div class="panel">
      <div class="panel-head"><h2>📚 Worker Lesson Progress</h2><span class="badge badge-blue">Lesson progress</span></div>
      <div class="panel-body">
        <p style="font-size:.83rem;color:var(--muted);margin-bottom:.8rem">TeenWork tracks professional development lessons completed by your workers. Teens who complete more lessons tend to be better communicators and more reliable.</p>
        <div id="emp-lessons-progress-list">
          ${(() => {
            const prog = (typeof lessonProgress!=='undefined') ? lessonProgress : {};
            const data = (typeof lessonsData!=='undefined') ? lessonsData : [];
            const done = data.filter(l=>prog[l.id]?.done);
            if (!done.length) return '<p style="color:var(--muted);font-size:.84rem;font-style:italic">Alex hasn\'t completed any lessons yet.</p>';
            return done.map(l=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:1.2rem">${l.icon}</span><span style="font-size:.85rem;font-weight:600;color:var(--green)">✓ ${l.title}</span><span style="font-size:.73rem;color:var(--muted);margin-left:auto">${l.sub}</span></div>`).join('');
          })()}
        </div>
      </div>
    </div>` : ''}
  `;
}

function empAddWorkerNote(name) {
  const safeId = name.replace(/\s/g,'_');
  const inp = document.getElementById('emp-note-input-' + safeId);
  if (!inp || !inp.value.trim()) { showToast('Please type a note first.','error'); return; }
  if (!_empWorkerNotes[name]) _empWorkerNotes[name] = [];
  _empWorkerNotes[name].unshift({
    date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    note: inp.value.trim()
  });
  inp.value = '';
  renderEmpReviewsTab();
  showToast('Note saved ✓','success');
}
window.empAddWorkerNote = empAddWorkerNote;
window.renderEmpReviewsTab = renderEmpReviewsTab;

/* Re-render Reviews + Letters tabs when activated */
(function _patchSwitchTabForReviews() {
  const _orig = typeof switchDashTab==='function' ? switchDashTab : null;
  if (!_orig) return;
  window.switchDashTab = function(btn, panelId) {
    _orig.apply(this, arguments);
    if (panelId==='etab-reviews') setTimeout(renderEmpReviewsTab, 80);
    if (panelId==='etab-letters') { setTimeout(renderEmpLetterList, 80); setTimeout(renderEmpStatsDashboard, 100); }
    if (panelId==='ttab-letters') setTimeout(renderTeenLettersPanel, 80);
  };
})();

/* ────────────────────────────────────────────────────────────────────
   TEEN: Stats banner on Letters page — shows all work stats
   (hours worked, weeks worked, time on app, jobs, ratings, reviews)
   ──────────────────────────────────────────────────────────────────── */
function renderTeenLORStatsBanner() {
  const grid    = document.getElementById('teen-lor-stats-grid');
  const jobTypesEl = document.getElementById('teen-lor-job-types');
  const timeEl  = document.getElementById('teen-lor-time-on-app');
  if (!grid) return;

  const s = _compileteenStatsForLOR();

  // Calculate "time on app" from demo signup date or use a friendly default
  const signupDate = currentUser?.signupDate || '2024-09-01';
  let timeOnApp = '';
  try {
    const ms = Date.now() - new Date(signupDate).getTime();
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.5));
    if (months >= 12) {
      const yrs = Math.floor(months / 12);
      const rem = months % 12;
      timeOnApp = yrs + ' yr' + (yrs>1?'s':'') + (rem ? ' ' + rem + ' mo' : '');
    } else if (months >= 1) {
      timeOnApp = months + ' month' + (months>1?'s':'');
    } else {
      timeOnApp = 'Less than 1 month';
    }
  } catch(e) { timeOnApp = '7 months'; }

  const statItems = [
    { label:'Hours Worked',    val: s.totalHours + ' hrs',                  col:'#92400e', bg:'#fff7ed', border:'#fcd34d' },
    { label:'Weeks Active',    val: s.weeksWorked,                          col:'#1e40af', bg:'#eff6ff', border:'#93c5fd' },
    { label:'Jobs Completed',  val: s.jobsCompleted,                        col:'#166534', bg:'#f0fdf4', border:'#86efac' },
    { label:'Avg Rating',      val: s.avgRating ? s.avgRating + ' ★' : '—',col:'#7c3aed', bg:'#fdf4ff', border:'#d8b4fe' },
    { label:'5-Star Reviews',  val: s.fiveStars,                            col:'#b45309', bg:'#fefce8', border:'#fde047' },
    { label:'Time on App',     val: timeOnApp,                              col:'#0f766e', bg:'#f0fdfa', border:'#6ee7b7' },
    { label:'Lessons Done',    val: s.lessonsCompleted || 0,                col:'#1a5276', bg:'#dbeafe', border:'#93c5fd' },
  ];

  grid.innerHTML = statItems.map(i => `
    <div style="background:${i.bg};border:1.5px solid ${i.border};border-radius:12px;padding:.75rem 1rem;text-align:center">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:900;color:${i.col};line-height:1">${i.val}</div>
      <div style="font-size:.68rem;font-weight:700;color:${i.col};opacity:.75;text-transform:uppercase;letter-spacing:.4px;margin-top:3px">${i.label}</div>
    </div>`).join('');

  if (jobTypesEl) {
    jobTypesEl.innerHTML = s.jobTypes.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
           <span style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-right:2px">Job Types:</span>
           ${s.jobTypes.map(j=>`<span style="background:var(--green-pale);color:var(--green);border-radius:20px;padding:2px 10px;font-size:.75rem;font-weight:700">${j}</span>`).join('')}
         </div>`
      : '';
  }

  if (timeEl) {
    timeEl.innerHTML = `<span style="font-size:.75rem;color:var(--muted)">Member since ${new Date(signupDate).toLocaleDateString('en-US',{month:'long',year:'numeric'})} · ${timeOnApp} on TeenWork</span>`;
  }
}

/* ────────────────────────────────────────────────────────────────────
   TEEN: Letters panel — view, download PDF, upload custom letter
   ──────────────────────────────────────────────────────────────────── */
function renderTeenLettersPanel() {
  const wrap = document.getElementById('teen-letters-inner');
  if (!wrap) return;

  // Render stats banner
  renderTeenLORStatsBanner();

  const letters = _teenLetters;
  const badgeEl = document.getElementById('teen-letters-badge');
  if (badgeEl) badgeEl.textContent = letters.length + ' Total';

  if (!letters.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:.75rem">📄</div>
        <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:.4rem">No letters yet</div>
        <div style="font-size:.85rem">When an employer sends you a letter, it will appear here. Complete jobs with great ratings and ask your employer!</div>
      </div>`;
    return;
  }

  wrap.innerHTML = letters.map(l=>`
    <div style="border:1.5px solid var(--border);border-radius:14px;padding:1.1rem 1.2rem;margin-bottom:.9rem;background:var(--card);display:flex;align-items:flex-start;gap:14px">
      <div style="font-size:2rem;line-height:1;flex-shrink:0">📄</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.95rem;color:var(--text)">${safeText(l.job||'Letter of Recommendation')}</div>
        <div style="font-size:.8rem;color:var(--muted);margin-top:2px">From <strong>${safeText(l.from)}</strong>${l.fromTitle?', '+safeText(l.fromTitle):''} · ${safeText(l.date)}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="badge badge-green">Profile supplied</span>
          ${l.rating==='exceptional'?'<span class="badge badge-amber">⭐ Exceptional</span>':l.rating==='excellent'?'<span class="badge badge-blue">⭐ Excellent</span>':''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn-sm btn-purple" onclick="teenViewLetter('${l.id}')">👁 View</button>
        <button class="btn-sm btn-ai" onclick="teenDownloadLetter('${l.id}')">⬇ PDF</button>
      </div>
    </div>`).join('')
  + `
    <!-- Upload custom letter -->
    <div style="border:2px dashed var(--border);border-radius:14px;padding:1rem 1.2rem;margin-top:.4rem;background:var(--bg)">
      <div style="font-weight:700;font-size:.88rem;color:var(--text);margin-bottom:.4rem">📤 Upload a Letter You Already Have</div>
      <p style="font-size:.79rem;color:var(--muted);margin-bottom:.75rem;line-height:1.5">Have a letter from a teacher, coach, or employer not on TeenWork? Upload it here to keep everything in one place.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <label style="background:var(--purple);color:#fff;border-radius:8px;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:inline-block">
          📎 Choose File
          <input type="file" accept=".pdf,.doc,.docx,.txt" style="display:none" onchange="teenUploadLetter(this)">
        </label>
        <span id="teen-upload-name" style="font-size:.8rem;color:var(--muted)">No file selected</span>
      </div>
      <div id="teen-upload-alert" style="margin-top:.6rem"></div>
    </div>`;
}

function teenViewLetter(id) {
  const l = _teenLetters.find(x=>x.id===id);
  if (!l) return;
  // Build a modal overlay
  const existing = document.getElementById('teen-lor-view-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'teen-lor-view-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9990;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s ease';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:18px;max-width:640px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.22);overflow:hidden;font-family:'DM Sans',sans-serif">
      <div style="padding:1rem 1.4rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--purple)">📄 Letter of Recommendation</div>
          <div style="font-size:.78rem;color:var(--muted);margin-top:1px">From ${safeText(l.from)} · ${safeText(l.date)}</div>
        </div>
        <div style="display:flex;gap:7px">
          <button class="btn-sm btn-ai" onclick="teenDownloadLetter('${l.id}')">⬇ PDF</button>
          <button class="btn-sm" onclick="document.getElementById('teen-lor-view-modal').remove()">✕ Close</button>
        </div>
      </div>
      <div style="padding:1.4rem;overflow-y:auto;white-space:pre-wrap;font-size:.9rem;line-height:1.8;color:var(--text);font-family:Georgia,serif">${safeText(l.text)}</div>
    </div>`;
  document.body.appendChild(modal);
}

function teenDownloadLetter(id) {
  const l = _teenLetters.find(x=>x.id===id);
  if (!l) return;
  // Simple HTML→print PDF approach (browser print-to-PDF)
  const win = window.open('','_blank');
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  win.document.write(`<!DOCTYPE html><html><head><title>Letter of Recommendation — Alex Johnson</title>
${'<'}style>
  body{font-family:Georgia,serif;max-width:680px;margin:60px auto 80px;line-height:1.85;font-size:15px;color:#111;}
  .header{border-bottom:2px solid #2d6a4f;padding-bottom:12px;margin-bottom:24px;}
  .from{font-size:12px;color:#555;margin-top:4px;}
  pre{white-space:pre-wrap;font-family:inherit;font-size:15px;}
  .footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:8px;}
  @media print{body{margin:30px;}}

${'<'}/style></head><body>
<div class="header">
  <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Letter of Recommendation</div>
  <div style="font-size:1.3rem;font-weight:bold;color:#2d6a4f;margin-top:4px">Alex Johnson</div>
  <div class="from">Written by ${safeText(l.from)}${l.fromTitle?', '+safeText(l.fromTitle):''} · ${safeText(l.date)}</div>
</div>
<pre>${l.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
<div class="footer">This letter was transmitted via TeenWork — the teen employment platform. Printed ${today}.</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),450);
}

function teenUploadLetter(input) {
  const file = input.files[0];
  if (!file) return;
  const nameEl = document.getElementById('teen-upload-name');
  const alertEl = document.getElementById('teen-upload-alert');
  if (nameEl) nameEl.textContent = file.name;

  // File size check (max 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    if (alertEl) alertEl.innerHTML = '<div style="background:var(--red-pale);color:var(--red);border-radius:8px;padding:7px 12px;font-size:.8rem;font-weight:600">⚠️ File too large. Max 5 MB.</div>';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    // For non-text files (PDF, docx) we store a reference without reading content
    const isText = file.name.endsWith('.txt');
    const newLetter = {
      id: 'lor-upload-' + Date.now(),
      from: file.name.replace(/\.[^.]+$/, ''),
      fromTitle: 'Uploaded Document',
      job: 'Uploaded letter',
      rating: 'good',
      date: new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),
      text: isText ? (reader.result || '') : `[Uploaded file: ${file.name}]\n\nThis document was uploaded from your device. Open the original file to read the full contents.\n\nFile: ${file.name}\nSize: ${(file.size/1024).toFixed(0)} KB\nUploaded: ${new Date().toLocaleString()}`,
      sent: false,
      uploaded: true,
      fileName: file.name
    };
    _teenLetters.push(newLetter);
    renderTeenLettersPanel();
    if (alertEl) alertEl.innerHTML = '<div style="background:var(--green-pale);color:var(--green);border-radius:8px;padding:7px 12px;font-size:.8rem;font-weight:600">✅ Letter uploaded and saved to your account!</div>';
    showToast('✅ Letter uploaded!','success');
    if (typeof awardBadge==='function') awardBadge('letter_of_rec');
  };
  reader.readAsText(file);
}

window.teenViewLetter     = teenViewLetter;
window.teenDownloadLetter = teenDownloadLetter;
window.teenUploadLetter   = teenUploadLetter;
window.renderTeenLettersPanel = renderTeenLettersPanel;
window.renderTeenLORStatsBanner = renderTeenLORStatsBanner;

/* ── Teen badge: Letter of Rec badge definition (add to gamification) ── */
(function _addLetterBadge() {
  if (typeof teenGameState!=='undefined' && teenGameState.badges) {
    if (!teenGameState.badges.find(b=>b.id==='letter_of_rec')) {
      teenGameState.badges.push({
        id:'letter_of_rec',
        icon:'📜',
        label:'Recommended',
        desc:'Received a letter of recommendation from an employer',
        earned:false,
        xp:100
      });
    }
  }
})();

function _empScanAllMsgsForEdits() {
  const dates = _empGetWeekDates(empWeekOffset);
  const sched = _empGetWeekSched(empWeekOffset);

  // Collect all employer contacts from EVERY role bucket
  const allBuckets = [
    ...(MSG_CONTACTS.teen     || []),
    ...(MSG_CONTACTS.employer || []),
  ];
  // Deduplicate by id
  const seen = new Set();
  const allContacts = allBuckets.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // Build a lookup: isoDate → dayIdx for this displayed week
  const isoToIdx = {};
  dates.forEach((d, i) => { isoToIdx[_empIsoDate(d)] = i; });

  // Month-name → month-index for parsing "Apr 20" style dates
  const MON_MAP = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

  allContacts.forEach(contact => {
    const msgs = (contact.messages || []).filter(m => !m.blocked);
    msgs.forEach(m => {
      // Only scan teen-outgoing messages for schedule changes
      if (m.from !== 'me') return;
      const text  = m.text || '';
      const lower = text.toLowerCase();

      // Must be a schedule-change message
      if (!/can't|cannot|won't|change|reschedule|different|instead|not available|off|sick|busy|cancel|move|switch|swap/.test(lower)) return;

      // ── Determine WHICH day/date the message is about ──────────────
      let targetIdx = null;  // grid cell index (0–6)

      // 1. Try explicit ISO date: 2026-04-20
      const isoRx = /\b(\d{4}-\d{2}-\d{2})\b/;
      const isoM  = text.match(isoRx);
      if (isoM && isoToIdx[isoM[1]] !== undefined) {
        targetIdx = isoToIdx[isoM[1]];
      }

      // 2. Try "Month DD" or "DD Month": Apr 20, April 20, 20 Apr
      if (targetIdx === null) {
        const monDayRx = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b|\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
        const mdM = lower.match(monDayRx);
        if (mdM) {
          const monStr = (mdM[1] || mdM[4] || '').slice(0,3).toLowerCase();
          const dayNum = parseInt(mdM[2] || mdM[3]);
          const mo     = MON_MAP[monStr];
          if (mo !== undefined && dayNum) {
            const yr = new Date().getFullYear();
            const candidate = `${yr}-${String(mo+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            if (isoToIdx[candidate] !== undefined) targetIdx = isoToIdx[candidate];
          }
        }
      }

      // 3. Try day name: Monday, Mon, friday, etc.
      // Only accept if EXACTLY ONE day name is mentioned (otherwise ambiguous)
      if (targetIdx === null) {
        const matched = [];
        DAYS_SHORT.forEach((short, i) => {
          const full = DAYS_FULL[i].toLowerCase();
          const shortL = short.toLowerCase();
          // Word-boundary match to avoid "Monday" matching "Mon"
          if (new RegExp(`\\b${full}\\b`).test(lower) || new RegExp(`\\b${shortL}\\b`).test(lower)) {
            matched.push(i);
          }
        });
        if (matched.length === 1) targetIdx = matched[0];
        // If multiple days mentioned, skip — too ambiguous
      }

      if (targetIdx === null) return;  // can't identify which day

      const shift = sched[targetIdx];
      if (!shift || shift.status === 'teen-edited') return;  // off or already flagged

      const day = DAYS_SHORT[targetIdx];

      // ── Determine the change being requested ───────────────────────
      const timeRx = /(\d{1,2}(?::\d{2})?)\s*(am|pm)/i;
      const tMatch  = text.match(timeRx);

      // Check for duration mentions like "20 minutes", "1 hour"
      const durRx  = /(\d+)\s*(min(?:ute)?s?|hr|hour)/i;
      const durM   = text.match(durRx);

      if (tMatch) {
        // Parse the requested start time
        let hours   = parseInt(tMatch[1].split(':')[0]);
        const mins  = tMatch[1].includes(':') ? tMatch[1].split(':')[1] : '00';
        const ampm  = tMatch[2].toLowerCase();
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        const newStart = `${String(hours).padStart(2,'0')}:${mins}`;

        // If duration also mentioned, compute end time
        let newEnd = _empDefaultEnd;
        if (durM) {
          let totalMins = parseInt(durM[1]);
          if (/hr|hour/.test(durM[2])) totalMins *= 60;
          const endH = hours + Math.floor((parseInt(mins) + totalMins) / 60);
          const endM = (parseInt(mins) + totalMins) % 60;
          newEnd = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
        }

        const newTime = `${newStart}–${newEnd}`;
        if (shift.time !== newTime) {
          shift.original = shift.time;
          shift.time     = newTime;
          shift.status   = 'teen-edited';
          _empAddSchedLog(`⚡ ${contact.name}: teen requested ${day} at ${tMatch[0]}${durM?' for '+durM[0]:''} → ${newTime}. Awaiting approval.`, 'amber');
        }
      } else {
        // No new time — teen is flagging unavailability
        shift.original = shift.time;
        shift.status   = 'teen-edited';
        _empAddSchedLog(`⚡ ${contact.name}: teen says unavailable ${day} — please confirm or reassign.`, 'amber');
      }
    });
  });

  renderEmpSchedGrid();
}

// Re-render grid when schedule tab becomes active
(function _patchSwitchDashTabForSched() {
  const _orig = typeof switchDashTab === 'function' ? switchDashTab : null;
  if (!_orig) return;
  window.switchDashTab = function(page, tabId) {
    _orig.apply(this, arguments);
    if (tabId === 'etab-schedule') {
      setTimeout(() => {
        renderEmpSchedGrid();
        _empScanAllMsgsForEdits();
      }, 80);
    }
  };
})();

// Expose globals
window.empCalNav          = empCalNav;
window.empAIFillSchedule  = empAIFillSchedule;
window.renderEmpSchedGrid = renderEmpSchedGrid;
window.empCycleShift      = function(){};  // no longer used — clicking opens modal
window.openEmpDayDetail   = openEmpDayDetail;
window.empSetShiftStatus  = empSetShiftStatus;
window.empSaveShiftTime   = empSaveShiftTime;
window.empAddNewShift     = empAddNewShift;
window.empAddTask         = empAddTask;
window.empToggleTask      = empToggleTask;
window.empDeleteTask      = empDeleteTask;


// Init on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(renderCalEarningsBar, 500);
  setTimeout(() => _empGetWeekSched(0), 600);
});

// ════════════════════════════════════════════════════
//  NEW AI FEATURE 1: AI JOB DESCRIPTION GENERATOR
//  Employer clicks "✨ Write with AI" next to the desc
//  field. Fills the textarea with a friendly, neighborhood-
//  gig-style description based on title + type + pay.
// ════════════════════════════════════════════════════
async function aiWriteJobDesc() {
  const title   = document.getElementById('emp-title')?.value.trim();
  const type    = document.getElementById('emp-type')?.value;
  const pay     = document.getElementById('emp-pay')?.value;
  const payType = document.getElementById('emp-pay-type')?.value || 'hourly';
  const city    = document.getElementById('emp-city')?.value.trim();
  const descEl  = document.getElementById('emp-desc');
  const btnEl   = document.getElementById('ai-desc-btn');

  if (!title) { showToast('Enter a job title first!', 'error'); return; }

  if (btnEl) { btnEl.textContent = '⏳ Writing…'; btnEl.disabled = true; }
  if (descEl) descEl.value = '';

  const prompt = `You are writing a short, friendly job posting description for TeenWork — a platform where local families and small businesses hire teens ages 13-17 for casual neighborhood gigs.

Job: "${title}"
Type: ${type || 'General'}
Pay: $${pay || '??'}/${payType}
City: ${city || 'local area'}

Write a 2-3 sentence description that:
- Sounds like a real neighbor posting, not a corporate job ad
- Mentions what the teen will actually do (be specific and casual)
- Notes any useful details like when, how often, or what equipment is provided
- Is friendly and age-appropriate
- Does NOT use corporate language like "responsibilities include" or "candidates must"

Output only the description text, nothing else.`;

  try {
    const result = await callGemini(prompt);
    if (descEl) {
      descEl.value = result.trim();
      descEl.style.borderColor = 'var(--green)';
      setTimeout(() => { if(descEl) descEl.style.borderColor = ''; }, 2000);
    }
    showToast('✨ Description written by AI!', 'success');
  } catch(e) {
    showToast('AI couldn\'t write it — try again.', 'error');
  } finally {
    if (btnEl) { btnEl.textContent = '✨ Write with AI'; btnEl.disabled = false; }
  }
}
window.aiWriteJobDesc = aiWriteJobDesc;

// ════════════════════════════════════════════════════
//  NEW AI FEATURE 2: AI QUICK PITCH
//  Teen taps "✍️ AI Pitch" on a job card. Opens a small
//  modal with a generated intro message they can copy
//  and send to the employer. Neighborhood-casual tone.
// ════════════════════════════════════════════════════
async function openAIPitchModal(jobTitle, employer) {
  // Build or reuse modal
  let modal = document.getElementById('ai-pitch-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ai-pitch-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s ease';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--card);border-radius:18px;padding:1.6rem 1.5rem;max-width:440px;width:100%;box-shadow:var(--shadow-lg);position:relative">
      <button onclick="document.getElementById('ai-pitch-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.3rem;color:var(--muted);cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
        <span style="font-size:1.6rem">✍️</span>
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--green)">AI Quick Pitch</div>
          <div style="font-size:.78rem;color:var(--muted)">${jobTitle} · ${employer}</div>
        </div>
      </div>
      <div id="ai-pitch-body" style="background:var(--bg);border-radius:10px;padding:1rem;font-size:.88rem;line-height:1.7;color:var(--text);min-height:80px">
        <span class="loading-dots">Writing your pitch</span>
      </div>
      <div id="ai-pitch-actions" style="display:none;margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="copyAIPitch()" style="background:var(--green);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;font-weight:700;cursor:pointer;flex:1">📋 Copy Message</button>
        <button onclick="sendAIPitch('${(jobTitle||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;')}','${(employer||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')" style="background:var(--green-pale);color:var(--green);border:1.5px solid var(--green-light);padding:8px 16px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.83rem;font-weight:700;cursor:pointer;flex:1">💬 Send to Employer</button>
        <button onclick="regenerateAIPitch('${(jobTitle||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;')}','${(employer||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')" style="background:var(--bg);color:var(--muted);border:1.5px solid var(--border);padding:8px 12px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.8rem;cursor:pointer">🔄 Try Again</button>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px">AI-written — read before sending! You can edit it in the message box.</p>
    </div>`;

  // Generate pitch
  const bio    = document.getElementById('profile-bio-input')?.value?.trim() || 'a hardworking teen looking for local work';
  const skills = document.getElementById('skills-input')?.value?.trim() || 'general work';
  const name   = (currentUser?.name || 'Alex').split(' ')[0];

  const prompt = `Write a short, casual first message a teen named ${name} would send to a neighbor or local employer about a job. 

Job: "${jobTitle}" at "${employer}"
Teen's bio: ${bio.slice(0,120)}
Skills: ${skills.slice(0,80)}

Rules:
- 2-3 sentences max. Conversational, not formal.
- Sound like a real teen texting a neighbor, not a cover letter
- Mention the specific job title and one relevant skill
- End with a question like "Is this still available?" or "When could I start?"
- NO "Dear Hiring Manager", NO "I am writing to express interest", NO corporate phrases
- Start with "Hi" or "Hey"

Output only the message, nothing else.`;

  try {
    const result = await callGemini(prompt);
    const pitchEl = document.getElementById('ai-pitch-body');
    if (pitchEl) {
      pitchEl.textContent = result.trim();
      window._lastAIPitch = result.trim();
    }
    const actEl = document.getElementById('ai-pitch-actions');
    if (actEl) actEl.style.display = 'flex';
  } catch(e) {
    const pitchEl = document.getElementById('ai-pitch-body');
    if (pitchEl) pitchEl.innerHTML = '<span style="color:var(--muted)">Couldn\'t generate pitch — try again.</span>';
  }
}

function copyAIPitch() {
  const text = window._lastAIPitch || document.getElementById('ai-pitch-body')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('✅ Pitch copied!', 'success')).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    showToast('✅ Pitch copied!', 'success');
  });
}

function sendAIPitch(jobTitle, employer) {
  const text = window._lastAIPitch || document.getElementById('ai-pitch-body')?.textContent;
  document.getElementById('ai-pitch-modal')?.remove();
  // Open messaging modal and pre-fill with the pitch
  openMsgModal(employer, 'employer');
  setTimeout(() => {
    const msgInput = document.getElementById('msg-input');
    if (msgInput && text) {
      msgInput.value = text;
      msgInput.focus();
      msgInput.style.borderColor = 'var(--green)';
      setTimeout(() => { if(msgInput) msgInput.style.borderColor = ''; }, 2000);
      showToast('AI pitch pasted into message — review and send!', 'info');
    }
  }, 300);
}

function regenerateAIPitch(jobTitle, employer) {
  const pitchEl = document.getElementById('ai-pitch-body');
  if (pitchEl) pitchEl.innerHTML = '<span class="loading-dots">Writing your pitch</span>';
  openAIPitchModal(jobTitle, employer);
}

// Override teenAIPitch to use new modal
window.teenAIPitch = function(jobId, jobTitle, employer) {
  openAIPitchModal(jobTitle, employer);
};
window.openAIPitchModal = openAIPitchModal;
window.copyAIPitch = copyAIPitch;
window.sendAIPitch = sendAIPitch;
window.regenerateAIPitch = regenerateAIPitch;

// ════════════════════════════════════════════════════
//  NEW AI FEATURE 3: AI JOB SAFETY CHECKER
//  Accessible from browse job cards. Teen or parent can
//  tap "🛡 Safety Check" to get an AI analysis of whether
//  a listing has any red flags — pay, location, tasks, etc.
// ════════════════════════════════════════════════════
async function openJobSafetyCheck(jobIdx) {
  const job = browsableJobs[jobIdx];
  if (!job) { showToast('Job not found', 'error'); return; }

  let modal = document.getElementById('safety-check-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'safety-check-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s ease';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--card);border-radius:18px;padding:1.6rem 1.5rem;max-width:460px;width:100%;box-shadow:var(--shadow-lg);position:relative;max-height:90vh;overflow-y:auto">
      <button onclick="document.getElementById('safety-check-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.3rem;color:var(--muted);cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
        <span style="font-size:1.8rem">🛡</span>
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--green)">AI job guidance</div>
          <div style="font-size:.78rem;color:var(--muted)">${job.title} · ${job.employer}</div>
        </div>
      </div>
      <div id="safety-check-body" style="font-size:.88rem;line-height:1.7;color:var(--text)">
        <span class="loading-dots">Analyzing job listing</span>
      </div>
    </div>`;

  const prompt = `You are a teen job safety advisor for TeenWork, a platform for teens ages 13-17 doing local neighborhood gigs.

Analyze this job listing for safety and flag anything parents or teens should know:
- Title: "${job.title}"
- Employer: "${job.employer}"
- Pay: $${job.pay}/${job.payType}
- Type: ${job.type}
- Min age: ${job.minAge}
- Max hours/week: ${job.maxHours}
- Location: ${job.city}${job.state ? ', ' + job.state : ''}
- Description: "${job.desc || 'No description provided'}"
- Transport: ${job.transport ? job.transport.join(', ') : 'not specified'}

Give a quick safety assessment in this exact format:

VERDICT: [SAFE ✅ / REVIEW ⚠️ / CONCERN 🚨]

WHY: [1-2 sentences explaining the verdict in plain teen-friendly language]

TIPS: [2-3 short bullet points of practical safety tips for this specific job type, e.g. always tell a parent where you're going, bring water for outdoor work, etc.]

Keep the entire response under 120 words. Sound like a helpful friend, not a legal document.`;

  try {
    const result = await callGemini(prompt);
    const bodyEl = document.getElementById('safety-check-body');
    if (!bodyEl) return;

    // Parse verdict
    const verdictMatch = result.match(/VERDICT:\s*(.+)/i);
    const whyMatch     = result.match(/WHY:\s*([\s\S]+?)(?=TIPS:|$)/i);
    const tipsMatch    = result.match(/TIPS:\s*([\s\S]+)/i);

    const verdict = verdictMatch ? verdictMatch[1].trim() : result.split('\n')[0];
    const isSafe   = /SAFE|✅/.test(verdict);
    const isReview = /REVIEW|⚠/.test(verdict);
    const verdictColor = isSafe ? 'var(--green)' : isReview ? 'var(--amber)' : 'var(--red)';
    const verdictBg    = isSafe ? 'var(--green-pale)' : isReview ? 'var(--amber-pale)' : 'var(--red-pale)';

    const why  = whyMatch  ? whyMatch[1].trim()  : '';
    const tips = tipsMatch ? tipsMatch[1].trim()  : '';

    // Format tips as list
    const tipLines = tips.split(/\n|•|-/).map(t => t.trim()).filter(Boolean);

    bodyEl.innerHTML = `
      <div style="background:${verdictBg};border:2px solid ${verdictColor};border-radius:12px;padding:.9rem 1rem;margin-bottom:.9rem;text-align:center">
        <div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:700;color:${verdictColor}">${verdict}</div>
      </div>
      ${why ? `<p style="margin-bottom:.9rem;line-height:1.6">${why}</p>` : ''}
      ${tipLines.length ? `
        <div style="background:var(--bg);border-radius:10px;padding:.8rem 1rem">
          <div style="font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:.5rem">Safety Tips</div>
          ${tipLines.map(t => `<div style="display:flex;gap:8px;margin-bottom:5px;font-size:.83rem"><span style="color:var(--green);flex-shrink:0">✓</span><span>${t}</span></div>`).join('')}
        </div>` : ''}
      <button onclick="document.getElementById('safety-check-modal').remove()" style="margin-top:1rem;width:100%;background:var(--green);color:#fff;border:none;padding:10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer">Got it ✓</button>`;
  } catch(e) {
    const bodyEl = document.getElementById('safety-check-body');
    if (bodyEl) bodyEl.innerHTML = '<span style="color:var(--muted)">Safety check failed — try again.</span>';
  }
}
window.openJobSafetyCheck = openJobSafetyCheck;

// ════════════════════════════════════════════════════
//  NEW AI FEATURE 4: AI PARENT WEEKLY DIGEST
//  Parent dashboard button. AI generates a friendly
//  plain-English summary of their teen's week:
//  jobs applied, messages, ratings, safety flags.
// ════════════════════════════════════════════════════
async function openParentAIDigest() {
  let modal = document.getElementById('parent-digest-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'parent-digest-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s ease';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--card);border-radius:18px;padding:1.6rem 1.5rem;max-width:480px;width:100%;box-shadow:var(--shadow-lg);position:relative;max-height:92vh;overflow-y:auto">
      <button onclick="document.getElementById('parent-digest-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.3rem;color:var(--muted);cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
        <span style="font-size:1.8rem">📋</span>
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--green)">AI Weekly Digest</div>
          <div style="font-size:.78rem;color:var(--muted)">Alex's activity this week</div>
        </div>
      </div>
      <div id="parent-digest-body" style="font-size:.88rem;line-height:1.7;color:var(--text)">
        <span class="loading-dots">Building this week's report</span>
      </div>
    </div>`;

  // Gather real data from the app state
  const jobs     = typeof demoJobs !== 'undefined' ? demoJobs : [];
  const ratings  = typeof demoRatings !== 'undefined' ? demoRatings : [];
  const contacts = (typeof MSG_CONTACTS !== 'undefined' && MSG_CONTACTS.teen) ? MSG_CONTACTS.teen : [];
  const blocked  = contacts.flatMap(c => c.messages.filter(m => m.blocked));
  const accepted = jobs.filter(j => j.status === 'accepted');
  const pending  = jobs.filter(j => j.status === 'pending-approval');

  const prompt = `You are writing a friendly weekly summary email to a parent on TeenWork, a platform where their teen Alex (age 16) does local neighborhood gigs.

Here is the data for this week:
- Jobs applied to: ${jobs.length} (${jobs.map(j=>j.title).join(', ') || 'none'})
- Jobs accepted: ${accepted.length} (${accepted.map(j=>j.employer+' — '+j.title).join(', ') || 'none'})
- Jobs waiting for parent approval: ${pending.length}
- Ratings received: ${ratings.length > 0 ? ratings.map(r => r.stars+'★ from '+r.from).join(', ') : 'none this week'}
- Messages exchanged with: ${contacts.filter(c=>c.role==='employer').map(c=>c.name).join(', ') || 'no employers'}
- Messages blocked by safety filter: ${blocked.length}

Write a warm, 3-4 sentence parent summary that:
- Starts with a friendly "Here's how Alex's week went on TeenWork!"
- Mentions the highlight (best job, best rating, or any concern)
- Flags blocked messages if any (without being alarming unless there were many)
- Ends with one specific suggestion for the parent (approve a job, review a message, etc.)

Plain language only — like a text from a helpful platform, not a corporate report.`;

  try {
    const result = await callGemini(prompt);
    const bodyEl = document.getElementById('parent-digest-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <div style="background:var(--green-pale);border-left:4px solid var(--green);border-radius:0 10px 10px 0;padding:.9rem 1rem;margin-bottom:1rem;line-height:1.7">${result.trim()}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem">
        <div style="background:var(--bg);border-radius:10px;padding:.75rem;text-align:center">
          <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${jobs.length}</div>
          <div style="font-size:.72rem;color:var(--muted);font-weight:600">Applications</div>
        </div>
        <div style="background:var(--bg);border-radius:10px;padding:.75rem;text-align:center">
          <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${accepted.length}</div>
          <div style="font-size:.72rem;color:var(--muted);font-weight:600">Jobs Accepted</div>
        </div>
        <div style="background:${blocked.length>0?'var(--amber-pale)':'var(--bg)'};border-radius:10px;padding:.75rem;text-align:center">
          <div style="font-size:1.5rem;font-weight:900;color:${blocked.length>0?'var(--amber)':'var(--green)'}">${blocked.length}</div>
          <div style="font-size:.72rem;color:var(--muted);font-weight:600">Msgs Blocked</div>
        </div>
        <div style="background:var(--bg);border-radius:10px;padding:.75rem;text-align:center">
          <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${ratings.length > 0 ? (ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1)+'★' : '—'}</div>
          <div style="font-size:.72rem;color:var(--muted);font-weight:600">Avg Rating</div>
        </div>
      </div>

      ${pending.length > 0 ? `
        <div style="background:var(--amber-pale);border:1.5px solid #f0b66a;border-radius:10px;padding:.8rem 1rem;margin-bottom:.8rem">
          <div style="font-size:.8rem;font-weight:700;color:var(--amber);margin-bottom:4px">⏳ Waiting for Your Approval (${pending.length})</div>
          ${pending.map(j=>`<div style="font-size:.8rem;color:var(--text)">${j.title} at ${j.employer}</div>`).join('')}
        </div>` : ''}

      <button onclick="document.getElementById('parent-digest-modal').remove()" style="width:100%;background:var(--green);color:#fff;border:none;padding:10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer">Done ✓</button>`;
  } catch(e) {
    const bodyEl = document.getElementById('parent-digest-body');
    if (bodyEl) bodyEl.innerHTML = '<span style="color:var(--muted)">Digest failed — try again.</span>';
  }
}
window.openParentAIDigest = openParentAIDigest;

// ════════════════════════════════════════════════════
//  INJECT UI HOOKS FOR NEW AI FEATURES
//  Runs after DOM ready. Patches existing elements to
//  add new AI buttons without touching the HTML above.
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // 1. Add "✨ Write with AI" button next to job description field
  setTimeout(() => {
    const descGroup = document.getElementById('emp-desc')?.closest('.form-group');
    if (descGroup && !document.getElementById('ai-desc-btn')) {
      const label = descGroup.querySelector('label');
      if (label) {
        label.innerHTML = 'Job Description <button id="ai-desc-btn" onclick="aiWriteJobDesc()" style="background:var(--purple-pale);color:var(--purple);border:1.5px solid #c4b5fd;padding:3px 10px;border-radius:6px;font-family:\'DM Sans\',sans-serif;font-size:.72rem;font-weight:700;cursor:pointer;margin-left:8px;vertical-align:middle">✨ Write with AI</button>';
      }
    }
  }, 400);

  // 2. Add "📋 AI Weekly Digest" button to parent dashboard header area
  setTimeout(() => {
    const parentDash = document.getElementById('page-parent');
    if (parentDash && !document.getElementById('parent-digest-btn')) {
      // Find the dash-header in parent page
      const header = parentDash.querySelector('.dash-header');
      if (header) {
        const btn = document.createElement('button');
        btn.id = 'parent-digest-btn';
        btn.className = 'btn-sm btn-ai';
        btn.style.cssText = 'font-size:.83rem;padding:8px 14px;';
        btn.innerHTML = '📋 AI Weekly Digest';
        btn.onclick = openParentAIDigest;
        header.appendChild(btn);
      }
    }
  }, 500);
});

// Patch renderBrowseJobs to inject Safety Check buttons
// We override the job card HTML to add the button
(function _patchBrowseForSafetyCheck() {
  const _origRender = typeof renderBrowseJobs === 'function' ? renderBrowseJobs : null;
  if (!_origRender) {
    // Try again after a short delay if renderBrowseJobs isn't defined yet
    setTimeout(_patchBrowseForSafetyCheck, 500);
    return;
  }
  window.renderBrowseJobs = function() {
    _origRender.apply(this, arguments);
    // After render, inject safety check buttons into each browse card
    setTimeout(() => {
      document.querySelectorAll('.browse-actions').forEach((actionsDiv, i) => {
        if (!actionsDiv.querySelector('.btn-safety')) {
          const btn = document.createElement('button');
          btn.className = 'btn-sm btn-safety';
          btn.style.cssText = 'background:var(--green-pale);color:var(--green);border:1px solid var(--green-light);font-size:.74rem;';
          btn.innerHTML = '🛡 Safety Check';
          btn.onclick = () => openJobSafetyCheck(i);
          actionsDiv.appendChild(btn);
        }
      });
    }, 80);
  };
})();


// ════════════════════════════════════════════════════════════════
//  AI TOOLS: RESUME BUILDER, INTERVIEW PREP, COVER LETTER
// ════════════════════════════════════════════════════════════════

// ── Shared helpers ──────────────────────────────────────────────
function _prefillFromCurrentUser(fields) {
  if (!currentUser) return;
  const nm = (currentUser.name||'').split(' ');
  if (fields.fname && nm[0]) fields.fname.value = nm[0];
  if (fields.lname && nm[1]) fields.lname.value = nm[1];
  const loc = [currentUser.city, currentUser.state].filter(Boolean).join(', ');
  if (fields.city && loc) fields.city.value = loc;
  if (fields.age && currentUser.age) fields.age.value = currentUser.age;
  if (fields.email && currentUser.email && !currentUser.email.endsWith('.demo')) fields.email.value = currentUser.email;
  if (fields.skills && currentUser.skills) fields.skills.value = Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : currentUser.skills;
}

// ════════════════════════════════════════════════════════════════
//  1. AI RESUME BUILDER
// ════════════════════════════════════════════════════════════════
let _resumeBuilderData = {};

function openResumeBuilder() {
  const modal = document.getElementById('resume-builder-modal');
  if (!modal) return;
  // Prefill from profile
  _prefillFromCurrentUser({
    fname: document.getElementById('rb-fname'),
    lname: document.getElementById('rb-lname'),
    city:  document.getElementById('rb-city'),
    age:   document.getElementById('rb-age'),
    email: document.getElementById('rb-email'),
    skills: document.getElementById('rb-skills'),
  });
  // Reset to step 1
  document.getElementById('resume-step-1').style.display = '';
  document.getElementById('resume-step-2').style.display = 'none';
  document.getElementById('resume-step-3').style.display = 'none';
  document.getElementById('resume-builder-footer').style.display = 'none';
  _setResumeStep(1);
  modal.classList.add('open');
}

function closeResumeBuilder() {
  document.getElementById('resume-builder-modal').classList.remove('open');
}

function _setResumeStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('rstep-' + i);
    if (!el) return;
    el.classList.remove('active','done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  });
}

function resumeBuilderStep2() {
  const fname = document.getElementById('rb-fname').value.trim();
  const lname = document.getElementById('rb-lname').value.trim();
  if (!fname) { showToast('Please enter your first name', 'error'); return; }
  if (!lname) { showToast('Please enter your last name', 'error'); return; }
  document.getElementById('resume-step-1').style.display = 'none';
  document.getElementById('resume-step-2').style.display = '';
  _setResumeStep(2);
}

function resumeBuilderBack1() {
  document.getElementById('resume-step-2').style.display = 'none';
  document.getElementById('resume-step-1').style.display = '';
  _setResumeStep(1);
}

function resumeBuilderBack2() {
  document.getElementById('resume-step-3').style.display = 'none';
  document.getElementById('resume-step-2').style.display = '';
  document.getElementById('resume-builder-footer').style.display = 'none';
  _setResumeStep(2);
}

async function resumeBuilderGenerate() {
  const experience = document.getElementById('rb-experience').value.trim();
  if (!experience) { showToast('Please add some experience or activities', 'error'); return; }

  const data = {
    fname:        document.getElementById('rb-fname').value.trim(),
    lname:        document.getElementById('rb-lname').value.trim(),
    city:         document.getElementById('rb-city').value.trim(),
    age:          document.getElementById('rb-age').value.trim(),
    email:        document.getElementById('rb-email').value.trim(),
    skills:       document.getElementById('rb-skills').value.trim(),
    availability: document.getElementById('rb-availability').value.trim(),
    experience,
    achievements: document.getElementById('rb-achievements').value.trim(),
    ethic:        document.getElementById('rb-ethic').value.trim(),
  };
  _resumeBuilderData = data;

  document.getElementById('resume-step-2').style.display = 'none';
  document.getElementById('resume-step-3').style.display = '';
  _setResumeStep(3);

  const out = document.getElementById('resume-builder-output');
  out.innerHTML = '<p style="color:var(--muted);text-align:center"><span class="loading-dots">Building your resume</span></p>';

  const prompt = `You are a professional resume writer helping a teenager get their first job.

Write a clean, professional one-page resume for this teen. Use the EXACT format below. Do NOT add any commentary, preamble, or markdown — output ONLY the resume content using these exact section headers:

NAME: ${data.fname} ${data.lname}
CONTACT: ${[data.city, data.age ? 'Age '+data.age : '', data.email].filter(Boolean).join(' · ')}

OBJECTIVE
[2-sentence objective statement in first person, warm and professional, tailored for local teen jobs]

SKILLS
[bullet list of 4-6 skills based on: ${data.skills || 'general teen worker skills'}]

EXPERIENCE
[Format each item as: Role / Place / Dates — then 1-2 bullet points of accomplishments. Based on: ${data.experience}]

ACTIVITIES & ACHIEVEMENTS
[bullet list based on: ${data.achievements || 'school and community involvement'}]

AVAILABILITY
${data.availability || 'Weekday afternoons and weekends'}

REFERENCES
Available upon request.`;

  const result = await callGemini(prompt, null, true);
  _resumeBuilderData.text = result;

  // Render as styled HTML preview
  out.innerHTML = _resumeTextToHTML(result, data);
  document.getElementById('resume-builder-footer').style.display = 'flex';
}

function _resumeTextToHTML(text, data) {
  const name = (data.fname + ' ' + data.lname).trim() || 'Your Name';
  let html = `<div class="resume-pdf-preview" id="resume-print-area">`;
  html += `<h1>${_escapeHTML(name)}</h1>`;

  const lines = text.split('\n');
  const skipHeaders = ['NAME:', 'CONTACT:'];
  let inSection = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (skipHeaders.some(h => t.startsWith(h))) continue;

    const sectionHeaders = ['OBJECTIVE','SKILLS','EXPERIENCE','ACTIVITIES & ACHIEVEMENTS','ACTIVITIES','AVAILABILITY','REFERENCES'];
    if (sectionHeaders.some(h => t === h || t === h + ':')) {
      if (inSection) html += '</ul>';
      inSection = false;
      html += `<h2>${_escapeHTML(t.replace(':',''))}</h2>`;
    } else if (t.startsWith('- ') || t.startsWith('• ')) {
      if (!inSection) { html += '<ul>'; inSection = true; }
      html += `<li>${_escapeHTML(t.slice(2))}</li>`;
    } else {
      if (inSection) { html += '</ul>'; inSection = false; }
      html += `<p>${_escapeHTML(t)}</p>`;
    }
  }
  if (inSection) html += '</ul>';
  html += '</div>';
  return html;
}

function _escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function copyResumeText() {
  const el = document.getElementById('resume-print-area');
  const text = el ? el.innerText : (_resumeBuilderData.text || '');
  navigator.clipboard?.writeText(text).then(() => showToast('Resume copied to clipboard!','success'))
    .catch(() => showToast('Select and copy the text manually','info'));
}

function downloadResumePDF() {
  // Print-to-PDF using window.print with a focused print area
  const el = document.getElementById('resume-print-area');
  if (!el) { showToast('No resume to download','error'); return; }
  const data = _resumeBuilderData;
  const name = ((data.fname||'') + '_' + (data.lname||'')).replace(/\s+/g,'_') || 'resume';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${name}_resume</title>
    ${'<'}style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
      body{font-family:'DM Sans',sans-serif;padding:32px 40px;max-width:680px;margin:0 auto;color:#222;font-size:12px;line-height:1.6}
      h1{font-size:20px;margin:0 0 2px;color:#1a1a1a}
      h2{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#2d6a4f;border-bottom:1px solid #e0e0e0;padding-bottom:2px;margin:14px 0 5px}
      p,li{margin:2px 0;font-size:11px}
      ul{padding-left:1.2em;margin:0}
      @media print{body{padding:20px}}
    ${'<'}/style>
  </head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

window.openResumeBuilder  = openResumeBuilder;
window.closeResumeBuilder = closeResumeBuilder;
window.resumeBuilderStep2 = resumeBuilderStep2;
window.resumeBuilderBack1 = resumeBuilderBack1;
window.resumeBuilderBack2 = resumeBuilderBack2;
window.resumeBuilderGenerate = resumeBuilderGenerate;
window.downloadResumePDF  = downloadResumePDF;
window.copyResumeText     = copyResumeText;

// ════════════════════════════════════════════════════════════════
//  2. AI INTERVIEW PREP COACH
// ════════════════════════════════════════════════════════════════
let _ipSession = { questions: [], current: 0, answers: [], nervLevel: 'medium', job: '', employer: '' };

function openInterviewPrep(jobTitle, employer) {
  const modal = document.getElementById('interview-prep-modal');
  if (!modal) return;
  if (jobTitle) document.getElementById('ip-job').value = jobTitle;
  if (employer) document.getElementById('ip-employer').value = employer;
  // Reset to setup screen
  document.getElementById('interview-setup').style.display = '';
  document.getElementById('interview-session').style.display = 'none';
  modal.classList.add('open');
}

function closeInterviewPrep() {
  document.getElementById('interview-prep-modal').classList.remove('open');
}

function setNervLevel(level) {
  _ipSession.nervLevel = level;
  ['low','med','high'].forEach(l => {
    const el = document.getElementById('ip-nerv-' + l);
    if (el) el.classList.toggle('active', (l === level.slice(0,3)) || (l==='med' && level==='medium'));
  });
  // fix mapping
  const map = {low:'low', medium:'med', high:'high'};
  ['low','med','high'].forEach(l => {
    const el = document.getElementById('ip-nerv-' + l);
    if (el) el.classList.toggle('active', l === (map[level]||'med'));
  });
}

async function startInterviewSession() {
  const job = document.getElementById('ip-job').value.trim();
  if (!job) { showToast("Please enter the job you're preparing for", 'error'); return; }
  const employer = document.getElementById('ip-employer').value.trim();
  _ipSession = { questions: [], current: 0, answers: [], nervLevel: _ipSession.nervLevel||'medium', job, employer };

  document.getElementById('interview-setup').style.display = 'none';
  document.getElementById('interview-session').style.display = '';
  document.getElementById('interview-chat').innerHTML = '<p style="color:var(--muted);text-align:center"><span class="loading-dots">Preparing your questions</span></p>';
  document.getElementById('ip-next-row').style.display = 'none';

  const nervNote = _ipSession.nervLevel === 'high'
    ? 'Be extra encouraging and gentle — this teen is very nervous.'
    : _ipSession.nervLevel === 'low' ? 'Be direct and push them a little — they are confident.'
    : 'Be supportive but honest.';

  const prompt = `You are a friendly but honest interview coach for teenagers applying for local jobs.

Generate EXACTLY 5 realistic interview questions for a teen applying for: ${job}${employer ? ' at ' + employer : ''}.

${nervNote}

Output ONLY a JSON array with 5 strings — no explanation, no markdown, no code fences. Example:
["Tell me about yourself.", "Why do you want this job?", "Describe a time you worked hard.", "How would you handle a difficult customer?", "What are your strengths?"]`;

  try {
    const result = await callGemini(prompt, null, true);
    const clean = result.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim();
    _ipSession.questions = JSON.parse(clean);
  } catch(e) {
    // Fallback questions if AI parse fails
    _ipSession.questions = [
      'Tell me a little about yourself.',
      `Why do you want this ${job} job?`,
      'Describe a time you had to work really hard at something.',
      'How would you handle it if you made a mistake on the job?',
      'What makes you reliable?'
    ];
  }

  _showInterviewQuestion();
}

function _showInterviewQuestion() {
  const { questions, current } = _ipSession;
  const chat = document.getElementById('interview-chat');
  const progress = document.getElementById('ip-progress-label');
  const nextRow = document.getElementById('ip-next-row');
  const input = document.getElementById('ip-answer-input');

  if (current >= questions.length) {
    _showInterviewSummary();
    return;
  }

  progress.textContent = `Question ${current + 1} of ${questions.length}`;
  nextRow.style.display = 'none';
  input.value = '';
  input.focus();

  const qHTML = `<div class="interview-q">💬 ${_escapeHTML(questions[current])}</div>`;
  chat.innerHTML += qHTML;
  chat.scrollTop = chat.scrollHeight;
}

async function submitInterviewAnswer() {
  const input = document.getElementById('ip-answer-input');
  const answer = input.value.trim();
  if (!answer) { showToast('Please type your answer first', 'error'); return; }

  const chat = document.getElementById('interview-chat');
  const nextRow = document.getElementById('ip-next-row');
  const nextBtn = document.getElementById('ip-next-btn');

  // Show user answer
  chat.innerHTML += `<div style="background:var(--green-pale);border-radius:8px;padding:7px 11px;margin-bottom:8px;font-size:.83rem;color:var(--text)">👤 <em>${_escapeHTML(answer)}</em></div>`;
  chat.innerHTML += `<div class="interview-feedback"><span class="loading-dots">Evaluating</span></div>`;
  chat.scrollTop = chat.scrollHeight;
  input.value = '';
  input.disabled = true;

  _ipSession.answers.push({ q: _ipSession.questions[_ipSession.current], a: answer });

  const isLast = _ipSession.current === _ipSession.questions.length - 1;
  const prompt = `You are a friendly interview coach for a teenager applying for a ${_ipSession.job} job.

Question asked: "${_ipSession.questions[_ipSession.current]}"
Teen's answer: "${answer}"

Give feedback in EXACTLY this format:
SCORE: [Great / Good / Needs Work]
FEEDBACK: [2-3 sentences max. Start with what they did well, then one specific tip to improve. Be encouraging.]
BETTER: [One sentence showing how they could say it even stronger]`;

  const fb = await callGemini(prompt, null, true);

  // Parse feedback
  const scoreMatch = fb.match(/SCORE:\s*(Great|Good|Needs Work)/i);
  const feedbackMatch = fb.match(/FEEDBACK:\s*([\s\S]*?)(?:BETTER:|$)/i);
  const betterMatch = fb.match(/BETTER:\s*([\s\S]*?)$/i);

  const score = scoreMatch ? scoreMatch[1] : 'Good';
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : fb;
  const better = betterMatch ? betterMatch[1].trim() : '';

  const scoreClass = score === 'Great' ? 'interview-score-great' : score === 'Needs Work' ? 'interview-score-improve' : 'interview-score-ok';

  // Replace loading div
  const feedbacks = chat.querySelectorAll('.interview-feedback');
  const lastFb = feedbacks[feedbacks.length - 1];
  if (lastFb) {
    lastFb.innerHTML = `<strong>Coach:</strong><span class="interview-score-pill ${scoreClass}">${score}</span><br><span style="font-size:.81rem">${_escapeHTML(feedback)}</span>${better ? `<br><span style="font-size:.79rem;color:var(--green);margin-top:4px;display:block">💡 Try: "${_escapeHTML(better)}"</span>` : ''}`;
  }

  chat.scrollTop = chat.scrollHeight;
  input.disabled = false;

  _ipSession.current++;
  nextRow.style.display = '';
  nextBtn.textContent = isLast ? '🏁 See Summary' : 'Next Question →';
}

function nextInterviewQuestion() {
  document.getElementById('ip-next-row').style.display = 'none';
  _showInterviewQuestion();
}

function _showInterviewSummary() {
  const chat = document.getElementById('interview-chat');
  const total = _ipSession.answers.length;
  chat.innerHTML += `<div style="background:var(--green-pale);border:1.5px solid var(--green-light);border-radius:10px;padding:12px 14px;margin-top:8px">
    <div style="font-weight:700;color:var(--green);font-size:.9rem;margin-bottom:4px">🎉 Mock interview complete!</div>
    <div style="font-size:.82rem;color:var(--text)">You answered ${total} question${total!==1?'s':''}. Review the coach feedback above to improve your real interview.</div>
    <div style="margin-top:8px"><button class="btn-sm btn-ai" onclick="resetInterviewPrep()">🔄 Practice Again</button></div>
  </div>`;
  chat.scrollTop = chat.scrollHeight;
  document.getElementById('ip-next-row').style.display = 'none';
}

function resetInterviewPrep() {
  document.getElementById('interview-setup').style.display = '';
  document.getElementById('interview-session').style.display = 'none';
  document.getElementById('interview-chat').innerHTML = '';
  _ipSession = { questions: [], current: 0, answers: [], nervLevel: 'medium', job: '', employer: '' };
}

window.openInterviewPrep     = openInterviewPrep;
window.closeInterviewPrep    = closeInterviewPrep;
window.setNervLevel          = setNervLevel;
window.startInterviewSession = startInterviewSession;
window.submitInterviewAnswer = submitInterviewAnswer;
window.nextInterviewQuestion = nextInterviewQuestion;
window.resetInterviewPrep    = resetInterviewPrep;

// ════════════════════════════════════════════════════════════════
//  3. AI COVER LETTER GENERATOR
// ════════════════════════════════════════════════════════════════
let _clTone = 'friendly';
let _clLastParams = {};

function openCoverLetterModal(jobTitle, employer, jobType) {
  const modal = document.getElementById('cover-letter-modal');
  if (!modal) return;
  if (jobTitle) document.getElementById('cl-jobtitle').value = jobTitle;
  if (employer) document.getElementById('cl-employer').value = employer;

  // Prefill name from current user
  const name = currentUser?.name || '';
  if (name) document.getElementById('cl-name').value = name;
  const loc = [currentUser?.city, currentUser?.state].filter(Boolean).join(', ');
  const age = currentUser?.age || '';
  if (loc || age) document.getElementById('cl-age-city').value = [age ? 'Age '+age : '', loc].filter(Boolean).join(', ');
  const skills = currentUser?.skills;
  if (skills) {
    const skillStr = Array.isArray(skills) ? skills.slice(0,3).join(', ') : skills;
    document.getElementById('cl-skills').value = `I have experience with ${skillStr}.`;
  }

  // Reset to form view
  document.getElementById('cl-form').style.display = '';
  document.getElementById('cl-output-section').style.display = 'none';
  document.getElementById('cl-footer').style.display = 'none';
  modal.classList.add('open');
}

function closeCoverLetter() {
  document.getElementById('cover-letter-modal').classList.remove('open');
}

function setCLTone(tone) {
  _clTone = tone;
  ['friendly','formal','bold'].forEach(t => {
    const el = document.getElementById('cl-tone-' + t);
    if (el) el.classList.toggle('active', t === tone);
  });
}

function showCLForm() {
  document.getElementById('cl-form').style.display = '';
  document.getElementById('cl-output-section').style.display = 'none';
  document.getElementById('cl-footer').style.display = 'none';
}

async function generateCoverLetter() {
  const jobTitle = document.getElementById('cl-jobtitle').value.trim();
  const employer = document.getElementById('cl-employer').value.trim();
  const name     = document.getElementById('cl-name').value.trim();
  const ageCity  = document.getElementById('cl-age-city').value.trim();
  const skills   = document.getElementById('cl-skills').value.trim();

  if (!jobTitle) { showToast('Please enter the job title', 'error'); return; }
  if (!name)     { showToast('Please enter your name', 'error'); return; }

  _clLastParams = { jobTitle, employer, name, ageCity, skills, tone: _clTone };

  const toneGuide = {
    friendly: 'warm, conversational, and approachable — like a confident teen speaking naturally',
    formal: 'professional and polished, like a formal business letter',
    bold: 'confident, direct, and enthusiastic — showing real excitement for the role',
  }[_clTone] || 'warm and professional';

  const prompt = `Write a short, professional cover letter for a teenager applying for a local job.

Job: ${jobTitle}${employer ? ' at ' + employer : ''}
Applicant: ${name}${ageCity ? ', ' + ageCity : ''}
Skills/experience: ${skills || 'general teen work ethic, reliability, and enthusiasm'}
Tone: ${toneGuide}

Requirements:
- 3 short paragraphs max (greeting, why I'm a great fit, closing with call to action)
- Written in first person as the teen
- Sound genuine, not robotic or overly formal
- End with "Sincerely, ${name}"
- DO NOT include any commentary, headers, or explanation — output ONLY the letter`;

  document.getElementById('cl-form').style.display = 'none';
  document.getElementById('cl-output-section').style.display = '';
  document.getElementById('cl-footer').style.display = 'none';

  const out = document.getElementById('cl-output');
  out.innerHTML = '<span class="loading-dots">Writing your cover letter</span>';

  const result = await callGemini(prompt, null, true);
  out.textContent = result;
  document.getElementById('cl-footer').style.display = 'flex';
}

function regenerateCoverLetter() {
  if (!_clLastParams.jobTitle) { showCLForm(); return; }
  // Re-populate form and regenerate
  document.getElementById('cl-jobtitle').value = _clLastParams.jobTitle || '';
  document.getElementById('cl-employer').value = _clLastParams.employer || '';
  document.getElementById('cl-name').value     = _clLastParams.name || '';
  document.getElementById('cl-age-city').value = _clLastParams.ageCity || '';
  document.getElementById('cl-skills').value   = _clLastParams.skills || '';
  generateCoverLetter();
}

function copyCoverLetter() {
  const text = document.getElementById('cl-output')?.textContent || '';
  navigator.clipboard?.writeText(text).then(() => showToast('Cover letter copied!', 'success'))
    .catch(() => showToast('Select and copy the text manually', 'info'));
}

window.openCoverLetterModal  = openCoverLetterModal;
window.closeCoverLetter      = closeCoverLetter;
window.setCLTone             = setCLTone;
window.showCLForm            = showCLForm;
window.generateCoverLetter   = generateCoverLetter;
window.regenerateCoverLetter = regenerateCoverLetter;
window.copyCoverLetter       = copyCoverLetter;

// ═══════════════════════════════════════════════════════
//  FEATURE: AI WEEKLY SUMMARY EMAIL (Parent Dashboard)
// ═══════════════════════════════════════════════════════
async function generateWeeklySummary() {
  const out = document.getElementById('weekly-summary-output');
  const body = document.getElementById('weekly-summary-body');
  const dateEl = document.getElementById('weekly-summary-date');
  out.style.display = 'block';
  body.innerHTML = '<span class="loading-dots">Generating your weekly summary</span>';

  // Set date range label
  const now = new Date();
  const sunday = new Date(now); sunday.setDate(now.getDate() - now.getDay());
  const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  dateEl.textContent = `Week of ${fmt(sunday)} – ${fmt(saturday)}`;

  const teenName = document.getElementById('parent-teen-name')?.textContent || 'your teen';
  const includeSafety = document.getElementById('weekly-safety-toggle')?.checked !== false;
  const includeEarnings = document.getElementById('weekly-earnings-toggle')?.checked !== false;

  const prompt = `You are writing a warm, friendly weekly digest email from TeenWork to a parent. Their teen is named ${teenName}, age 16, from Burlington Vermont.

This week's activity (use this demo data):
- Applied to 2 new jobs: "Dog Walking for the Martinez Family" ($15/hr) and "Lawn Mowing at Park Ave Properties" ($18/hr)
- Got accepted for the lawn mowing job
- Completed 1 shift: 3 hours lawn mowing, earned $54
- Received a 5-star rating from Park Ave Properties: "Reliable, did a great job, will hire again"
- Completed the "Workplace Safety" lesson (100% score)
- Sent 4 messages to employers (all passed the safety filter)
- Login streak: 5 days in a row${includeSafety ? '\n- Safety: No flagged messages this week ✅' : ''}${includeEarnings ? '\n- Estimated earnings this week: $54' : ''}

Write the email in 4 short sections with clear emoji headers:
1. 📊 This Week at a Glance (2-3 sentence summary)
2. 💼 Job Activity (brief bullet points)
3. ⭐ Highlights (best thing that happened)
4. 💡 Parent Tip (one actionable suggestion to support their teen)

Keep it warm, encouraging, and under 200 words. Address the parent directly. End with a cheerful sign-off from "The TeenWork Team".`;

  const text = await callGemini(prompt);
  body.innerHTML = text.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
  out.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function sendWeeklySummaryEmail() {
  const body = document.getElementById('weekly-summary-body');
  if (!body || body.querySelector('.loading-dots') || body.innerHTML.trim() === '') {
    showToast('Generate the summary first, then send it!','info');
    return;
  }
  showToast('📧 Summary sent to your email!','success');
}

function copyWeeklySummary() {
  const text = document.getElementById('weekly-summary-body')?.innerText || '';
  navigator.clipboard?.writeText(text)
    .then(() => showToast('Summary copied to clipboard!','success'))
    .catch(() => showToast('Select and copy the text manually','info'));
}

// ═══════════════════════════════════════════════════════
//  FEATURE: LABOR LAW EXPLAINER (Teen AI Tab)
// ═══════════════════════════════════════════════════════
const LAW_RELATED = {
  'minimum wage':        ['max hours per week for teens','overtime pay rules for teens','what to do if an employer does not pay you'],
  'max hours':           ['work permit requirements for minors','break and meal requirements for teen workers','what jobs are illegal for minors under 18'],
  'work permit':         ['minimum wage','max hours per week for teens','FLSA Fair Labor Standards Act summary for teens'],
  'break':               ['max hours per week for teens','overtime pay rules for teens','minimum wage'],
  'banned jobs':         ['work permit requirements for minors','max hours per week for teens','FLSA Fair Labor Standards Act summary for teens'],
  'overtime':            ['minimum wage','what to do if an employer does not pay you','break and meal requirements for teen workers'],
  'unpaid':              ['minimum wage','FLSA Fair Labor Standards Act summary for teens','what to do if an employer does not pay you'],
  'flsa':                ['minimum wage','max hours per week for teens','work permit requirements for minors'],
};

async function explainLaborLaw(topic) {
  if (!topic || !topic.trim()) { showToast('Please enter a topic or pick one above', 'info'); return; }
  topic = topic.trim();

  // Clear custom input if chip was clicked
  const customInput = document.getElementById('law-custom-input');
  if (customInput && !customInput.value) customInput.value = '';

  // Highlight active chip
  document.querySelectorAll('.law-chip').forEach(c => c.classList.remove('active'));

  const output = document.getElementById('law-explainer-output');
  const body   = document.getElementById('law-explainer-body');
  const related = document.getElementById('law-related-chips');
  if (!output || !body) return;

  output.style.display = 'block';
  body.innerHTML = '<span class="loading-dots">Looking that up</span>';
  related.innerHTML = '';
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const state = getTeenState ? getTeenState() : 'Vermont';
  const age   = typeof getTeenAge === 'function' ? getTeenAge() : 16;

  const prompt = `You are a labor law explainer for teens aged 13-17. A ${age}-year-old in ${state} wants to understand: "${topic}".

Explain it in plain English — no legal jargon. Use this structure:
📌 **What it means** (1-2 sentences, super simple)
✅ **What this means for you** (2-3 bullet points specific to a ${age}-year-old in ${state})
⚠️ **What to watch out for** (1-2 common pitfalls or things employers sometimes get wrong)
💡 **Quick tip** (one actionable takeaway)

Keep it friendly, short, and encouraging. Under 180 words total.`;

  const text = await callGemini(prompt);

  // Format: bold **text** → <strong>text</strong>, bullets
  const formatted = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .split('\n').join('<br>');

  body.innerHTML = `<div style="line-height:1.75;font-size:.86rem">${formatted}</div>`;

  // Show related topic chips
  const topicKey = Object.keys(LAW_RELATED).find(k => topic.toLowerCase().includes(k)) || 'flsa';
  const suggestions = LAW_RELATED[topicKey] || LAW_RELATED['flsa'];
  related.innerHTML = '<div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;width:100%">Related topics:</div>' +
    suggestions.map(s =>
      `<button class="law-chip" onclick="explainLaborLaw('${s.replace(/'/g,"\'")}');document.getElementById('law-custom-input').value='${s.replace(/'/g,"\'")}'">${s}</button>`
    ).join('');
}

window.explainLaborLaw = explainLaborLaw;

// ═══════════════════════════════════════════════════════
//  FEATURE: WEEKLY ACTIVITY DIGEST (Teen Applications Tab)
// ═══════════════════════════════════════════════════════
function renderWeeklyDigest() {
  const panel = document.getElementById('weekly-digest-panel');
  if (!panel) return;

  const jobs     = typeof demoJobs !== 'undefined' ? demoJobs : [];
  const ratings  = typeof demoRatings !== 'undefined' ? demoRatings : [];
  const contacts = (typeof MSG_CONTACTS !== 'undefined' && MSG_CONTACTS.teen) ? MSG_CONTACTS.teen : [];
  const lessons  = userActivity?.lessonsCompleted || [];
  const hours    = (typeof teenGameState !== 'undefined' ? teenGameState.hoursWorked : 0) || 0;

  const applied   = jobs.length;
  const accepted  = jobs.filter(j => j.status === 'accepted').length;
  const pending   = jobs.filter(j => j.status === 'pending-approval').length;
  const msgsSent  = contacts.reduce((s, c) => s + c.messages.filter(m => m.from === 'me').length, 0);
  const blocked   = contacts.reduce((s, c) => s + c.messages.filter(m => m.blocked).length, 0);

  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay());
  const fmt   = d => d.toLocaleDateString('en-US', { month:'short', day:'numeric' });

  panel.innerHTML = `
    <div style="font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.8rem">
      Week of ${fmt(start)} — ${fmt(now)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:1rem">
      ${[
        ['📋','Jobs Applied', applied, 'var(--blue-pale)','var(--blue)'],
        ['✅','Accepted',     accepted,'var(--green-pale)','var(--green)'],
        ['⏳','Pending Parent OK', pending,'var(--amber-pale)','var(--amber)'],
        ['💬','Messages Sent', msgsSent,'var(--purple-pale)','var(--purple)'],
        ['🕒','Hours Logged',  hours+'h','var(--bg)','var(--text)'],
        ['📚','Lessons Done',  lessons.length,'var(--green-pale)','var(--green)'],
      ].map(([icon,label,val,bg,color]) => `
        <div style="background:${bg};border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem">${icon}</span>
          <div>
            <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:900;color:${color}">${val}</div>
            <div style="font-size:.7rem;color:var(--muted);font-weight:600">${label}</div>
          </div>
        </div>`).join('')}
    </div>
    ${blocked > 0 ? `<div style="background:var(--red-pale);border:1px solid #f5b7b1;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:.8rem;color:var(--red)">⚠️ <strong>${blocked} message${blocked>1?'s':''} blocked</strong> by the safety filter this week. Your parent has been notified.</div>` : ''}
    ${accepted > 0 ? `<div style="background:var(--green-pale);border-left:4px solid var(--green);border-radius:0 10px 10px 0;padding:10px 12px;font-size:.82rem;color:var(--green)">🎉 <strong>Great week!</strong> You got accepted for ${accepted} job${accepted>1?'s':''}. Keep it up!</div>` : ''}
  `;
}
window.renderWeeklyDigest = renderWeeklyDigest;
// Auto-render when applications tab is clicked
const _origSwitchDashTabV4 = window.switchDashTab;
window.switchDashTab = function(btn, panelId) {
  if (_origSwitchDashTabV4) _origSwitchDashTabV4(btn, panelId);
  if (panelId === 'ttab-applications') setTimeout(renderWeeklyDigest, 100);
  if (panelId === 'ttab-earnings')     setTimeout(renderEarningsTracker, 100);
};

// ═══════════════════════════════════════════════════════
//  FEATURE: EARNINGS TRACKER (Teen Earnings Tab)
// ═══════════════════════════════════════════════════════
let earningsLog = JSON.parse(localStorage.getItem('tw_earnings_log') || '[]');

function saveEarnings() {
  try { localStorage.setItem('tw_earnings_log', JSON.stringify(earningsLog)); } catch(e) {}
}

function renderEarningsTracker() {
  // Seed with demo data if empty
  if (!earningsLog.length) {
    const now = new Date();
    const wk = (offset) => { const d = new Date(now); d.setDate(d.getDate() - offset); return d.toISOString().slice(0,10); };
    earningsLog = [
      { job:'Lawn Mowing – Park Ave', hours:3, pay:54, date:wk(2) },
      { job:'Dog Walking – Martinez', hours:2, pay:30, date:wk(5) },
      { job:'Snow Shoveling',         hours:1.5, pay:30, date:wk(9) },
      { job:'Babysitting – Hendersons',hours:4, pay:56, date:wk(14) },
    ];
    saveEarnings();
  }

  const total  = earningsLog.reduce((s,e) => s + e.pay, 0);
  const hours  = earningsLog.reduce((s,e) => s + e.hours, 0);
  const avg    = hours > 0 ? (total/hours).toFixed(2) : 0;

  // Update summary cards
  const el = id => document.getElementById(id);
  if (el('earn-total'))  el('earn-total').textContent  = '$' + total.toFixed(0);
  if (el('earn-hours'))  el('earn-hours').textContent  = hours + 'h';
  if (el('earn-avg'))    el('earn-avg').textContent    = '$' + avg + '/hr';
  if (el('earnings-total-badge')) el('earnings-total-badge').textContent = '$' + total.toFixed(0) + ' total';

  // Bar chart — group by week
  const weeks = {};
  earningsLog.forEach(e => {
    const d = new Date(e.date);
    d.setDate(d.getDate() - d.getDay()); // snap to Sunday
    const key = d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    weeks[key] = (weeks[key] || 0) + e.pay;
  });
  const weekKeys = Object.keys(weeks).slice(-6);
  const maxVal   = Math.max(...weekKeys.map(k => weeks[k]), 1);

  const chart  = el('earnings-bar-chart');
  const labels = el('earnings-bar-labels');
  if (chart) {
    chart.innerHTML = weekKeys.map(k => {
      const pct = Math.round((weeks[k] / maxVal) * 100);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="font-size:.65rem;font-weight:700;color:var(--green)">$${weeks[k]}</div>
        <div style="width:100%;background:var(--green);border-radius:5px 5px 0 0;height:${pct}px;min-height:4px;transition:height .5s ease"></div>
      </div>`;
    }).join('');
  }
  if (labels) {
    labels.innerHTML = weekKeys.map(k =>
      `<div style="flex:1;text-align:center;font-size:.62rem;color:var(--muted);font-weight:600">${k}</div>`
    ).join('');
  }

  // Log table
  const log = el('earnings-log');
  if (log) {
    log.innerHTML = [...earningsLog].reverse().map((e,i) => `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-size:.88rem">${e.job}</div>
          <div style="font-size:.74rem;color:var(--muted)">${e.date} · ${e.hours}h worked</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-weight:800;font-size:1rem;color:var(--green)">$${e.pay}</div>
          <div style="font-size:.7rem;color:var(--muted)">($${(e.pay/e.hours).toFixed(2)}/hr)</div>
          <button onclick="deleteEarningsEntry(${earningsLog.length-1-i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.85rem;padding:2px 6px;border-radius:6px" title="Remove">✕</button>
        </div>
      </div>`).join('') || '<p style="color:var(--muted);font-size:.85rem;text-align:center">No earnings logged yet — add your first one below!</p>';
  }
}

function addEarningsEntry() {
  const job   = document.getElementById('earn-log-job')?.value.trim();
  const hours = parseFloat(document.getElementById('earn-log-hours')?.value);
  const pay   = parseFloat(document.getElementById('earn-log-pay')?.value);
  if (!job || !hours || !pay) { showToast('Fill in all three fields', 'info'); return; }
  earningsLog.push({ job, hours, pay, date: new Date().toISOString().slice(0,10) });
  saveEarnings();
  document.getElementById('earn-log-job').value = '';
  document.getElementById('earn-log-hours').value = '';
  document.getElementById('earn-log-pay').value = '';
  renderEarningsTracker();
  showToast('Earnings logged! 💰', 'success');
}

function deleteEarningsEntry(idx) {
  earningsLog.splice(idx, 1);
  saveEarnings();
  renderEarningsTracker();
}

window.renderEarningsTracker = renderEarningsTracker;
window.addEarningsEntry      = addEarningsEntry;
window.deleteEarningsEntry   = deleteEarningsEntry;

// ═══════════════════════════════════════════════════════
//  FEATURE: CURFEW ENFORCER (Parent Controls Tab)
// ═══════════════════════════════════════════════════════
function setCurfew(value) {
  parentalControls['curfew'] = value;
  saveUserData && saveUserData();
  const badge = document.getElementById('curfew-status-badge');
  if (badge) {
    if (value === 'none') {
      badge.textContent = '⛔ No curfew set';
      badge.style.background = 'var(--red-pale)';
      badge.style.color = 'var(--red)';
    } else {
      const [h,m] = value.split(':');
      const hr = parseInt(h), ampm = hr >= 12 ? 'PM' : 'AM';
      const disp = ((hr > 12 ? hr-12 : hr) || 12) + ':' + m + ' ' + ampm;
      badge.textContent = '✅ Curfew: ' + disp;
      badge.style.background = 'var(--green-pale)';
      badge.style.color = 'var(--green)';
    }
  }
  showToast(value === 'none' ? 'Curfew removed' : 'Curfew set!', 'success');
}
window.setCurfew = setCurfew;

// ═══════════════════════════════════════════════════════
//  FEATURE: EMPLOYER BACKGROUND CHECK REQUEST (Teen)
// ═══════════════════════════════════════════════════════
function requestEmployerBGC() { showToast('Background checks are not available. Open How safety works for the current checks and limits.', 'info'); }
async function runBGCRequest() { requestEmployerBGC(); }

function closeBGCRequest() {
  document.getElementById('bgc-request-modal')?.classList.remove('open');
}
window.requestEmployerBGC = requestEmployerBGC;
window.runBGCRequest      = runBGCRequest;
window.closeBGCRequest    = closeBGCRequest;

// ═══════════════════════════════════════════════════════
//  FEATURE: DISPUTE / REPORT SYSTEM
// ═══════════════════════════════════════════════════════
let _disputeType = 'unpaid';

function selectDisputeType(btn, type) {
  _disputeType = type;
  document.querySelectorAll('.dispute-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}

function openDisputeModal(employer, job) {
  const modal = document.getElementById('dispute-modal');
  if (!modal) return;
  const empInput = document.getElementById('dispute-employer');
  if (empInput) empInput.value = employer || '';
  document.getElementById('dispute-form').style.display = 'block';
  document.getElementById('dispute-success').style.display = 'none';
  modal.classList.add('open');
}

async function submitDispute() {
  const employer = document.getElementById('dispute-employer')?.value.trim();
  const desc     = document.getElementById('dispute-description')?.value.trim();
  if (!desc || desc.length < 10) { showToast('Please describe what happened (at least a few words)', 'info'); return; }

  document.getElementById('dispute-form').style.display = 'none';
  document.getElementById('dispute-success').style.display = 'block';

  const adviceEl = document.getElementById('dispute-ai-advice');
  if (adviceEl) {
    const typeLabels = {
      unpaid:'not being paid', unsafe:'unsafe working conditions', harassment:'harassment',
      underpaid:'being paid less than agreed', hours:'hours violations', other:'a workplace issue'
    };
    const typeLabel = typeLabels[_disputeType] || 'a workplace issue';
    const prompt = `A teen worker on TeenWork is reporting ${typeLabel} with employer "${employer||'an employer'}". They described: "${desc}". 

Give them 3 short, practical next steps they can take right now (numbered list). Be supportive, age-appropriate, and encouraging. Under 100 words total.`;

    let text;
    try { text = await callGemini(prompt); } catch { text = 'AI guidance is unavailable. Talk with a trusted adult. In immediate danger, call 911.'; }
    adviceEl.innerHTML = '<strong style="color:var(--green)">💡 What you can do next:</strong><br><br>' +
      text.replace(/\n/g, '<br>');
  }

  showToast('Guidance requested. This form does not send a report or notify a parent.', 'success');
}

function closeDisputeModal() {
  document.getElementById('dispute-modal')?.classList.remove('open');
}

window.selectDisputeType = selectDisputeType;
window.openDisputeModal  = openDisputeModal;
window.submitDispute     = submitDispute;
window.closeDisputeModal = closeDisputeModal;

// ═══════════════════════════════════════════════════════
//  FEATURE: TEEN SKILL PROGRESS REPORT
// ═══════════════════════════════════════════════════════
const SKILL_CATEGORIES = {
  'lawn care':    { label:'Outdoor & Yard Work', icon:'🌿', related:['snow shoveling','garden','yard work'] },
  'pet sitting':  { label:'Animal Care',          icon:'🐾', related:['dog walking','pet care'] },
  'cleaning':     { label:'Cleaning & Organizing',icon:'🧹', related:['organizing','tidying'] },
  'babysitting':  { label:'Child Care',            icon:'👶', related:['childcare','tutoring'] },
  'snow shoveling':{ label:'Seasonal Work',        icon:'❄️', related:['lawn care','yard work'] },
};

const LESSON_META = {
  'first_impression': { label:'First Impressions',   icon:'⭐', pts:20 },
  'safety':           { label:'Workplace Safety',     icon:'🛡', pts:25 },
  'communication':    { label:'Communication Skills', icon:'💬', pts:20 },
  'rights':           { label:'Worker Rights',        icon:'⚖️', pts:25 },
  'interview':        { label:'Interview Skills',     icon:'🎤', pts:30 },
  'financial':        { label:'Financial Literacy',   icon:'💰', pts:30 },
};

async function renderSkillReport() {
  const panel = document.getElementById('skill-progress-panel');
  if (!panel) return;
  panel.innerHTML = '<span class="loading-dots">Building your skill report</span>';

  const skills   = userActivity.skills || [];
  const lessons  = userActivity.lessonsCompleted || [];
  const jobs     = userActivity.jobsAccepted || [];
  const ratings  = typeof demoRatings !== 'undefined' ? demoRatings : [];
  const avgRating = ratings.length ? (ratings.reduce((s,r)=>s+r.stars,0)/ratings.length) : 0;

  // Build skill bars
  const allSkills = [...new Set([...skills, ...jobs.map(j=>j.type||'').filter(Boolean)])];
  const skillHTML = allSkills.length ? allSkills.map(skill => {
    // Score: 1 job = +25, each rating = +10, lesson match = +15, max 100
    const jobCount  = jobs.filter(j=>(j.type||'').toLowerCase().includes(skill)).length;
    const ratingBonus = Math.min(ratings.length * 10, 30);
    const catKey = Object.keys(SKILL_CATEGORIES).find(k => skill.toLowerCase().includes(k));
    const cat = SKILL_CATEGORIES[catKey] || { icon:'💼', label: skill };
    const score = Math.min(100, 30 + jobCount*25 + ratingBonus);
    const color = score>=75?'var(--green)':score>=50?'var(--amber)':'var(--blue)';
    const level = score>=75?'Advanced':score>=50?'Intermediate':'Beginner';
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:.85rem;font-weight:700">${cat.icon} ${skill}</div>
        <div style="font-size:.75rem;font-weight:700;color:${color}">${level} · ${score}%</div>
      </div>
      <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
        <div style="width:${score}%;height:100%;background:${color};border-radius:4px;transition:width .6s ease"></div>
      </div>
    </div>`;
  }).join('') : '<p style="color:var(--muted);font-size:.85rem">Add skills in your Profile tab to see progress here.</p>';

  // Lessons completed
  const lessonHTML = lessons.map(id => {
    const meta = LESSON_META[id] || { label:id, icon:'📚', pts:20 };
    return `<div style="display:flex;align-items:center;gap:8px;background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-bottom:6px">
      <span style="font-size:1.1rem">${meta.icon}</span>
      <span style="font-size:.83rem;font-weight:700;color:var(--green);flex:1">${meta.label}</span>
      <span style="font-size:.72rem;font-weight:700;background:var(--green);color:#fff;padding:2px 8px;border-radius:10px">+${meta.pts}pts ✓</span>
    </div>`;
  }).join('') || '<p style="color:var(--muted);font-size:.83rem">Complete lessons in the Lessons tab to earn skill points.</p>';

  // AI overall assessment
  const prompt = `You are a career coach for teens. Write a 2-sentence skill assessment for a teen with these skills: ${allSkills.join(', ')||'general'}, ${lessons.length} lessons completed, avg rating ${avgRating.toFixed(1)}/5, ${jobs.length} jobs completed. Be encouraging and specific about their strongest area and one thing to improve.`;
  const aiText = await callGemini(prompt);

  panel.innerHTML = `
    <div style="background:var(--green-pale);border-left:4px solid var(--green);border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:1.2rem;font-size:.85rem;line-height:1.65">
      🤖 <strong>AI Assessment:</strong> ${aiText}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.2rem">
      ${[
        ['Jobs Done', jobs.length, 'var(--green)'],
        ['Avg Rating', avgRating?avgRating.toFixed(1)+'⭐':'—', 'var(--amber)'],
        ['Lessons', lessons.length, 'var(--blue)'],
      ].map(([l,v,c])=>`<div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
        <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:${c}">${v}</div>
        <div style="font-size:.7rem;color:var(--muted);font-weight:600">${l}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Skill Levels</div>
    ${skillHTML}
    <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Completed Lessons</div>
    ${lessonHTML}`;
}
window.renderSkillReport = renderSkillReport;

// Auto-render when profile tab opened
const _origSwDT2 = window.switchDashTab;
window.switchDashTab = function(btn, panelId) {
  if (_origSwDT2) _origSwDT2(btn, panelId);
  if (panelId === 'ttab-resume') setTimeout(renderSkillReport, 150);
  if (panelId === 'ptab-savings') setTimeout(renderSavingsGoals, 100);
  if (panelId === 'ptab-trusted') setTimeout(renderTrustedEmployers, 100);
  if (panelId === 'ptab-teens')   setTimeout(renderMultiTeens, 100);
};
const _origSwPT2 = window.switchParentTab;
window.switchParentTab = function(panelId, btnId) {
  if (_origSwPT2) _origSwPT2(panelId, btnId);
  if (panelId === 'ptab-savings') setTimeout(renderSavingsGoals, 100);
  if (panelId === 'ptab-trusted') setTimeout(renderTrustedEmployers, 100);
  if (panelId === 'ptab-teens')   setTimeout(renderMultiTeens, 100);
};

// ═══════════════════════════════════════════════════════
//  FEATURE: SAVINGS GOAL TRACKER
// ═══════════════════════════════════════════════════════
let savingsGoals = JSON.parse(localStorage.getItem('tw_savings_goals') || '[]');

function saveSavingsGoals() {
  try { localStorage.setItem('tw_savings_goals', JSON.stringify(savingsGoals)); } catch(e) {}
}

function renderSavingsGoals() {
  const list = document.getElementById('savings-goals-list');
  if (!list) return;

  // Seed demo goal
  if (!savingsGoals.length) {
    savingsGoals = [{ name:'New Bike', emoji:'🚲', target:250, saved:126, deadline:'2026-07-01', id:Date.now() }];
    saveSavingsGoals();
  }
  renderTeenSavingsBanner();

  list.innerHTML = savingsGoals.map((g,i) => {
    const pct  = Math.min(100, Math.round((g.saved/g.target)*100));
    const color = pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--blue)';
    const remaining = Math.max(0, g.target - g.saved);
    const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24)) : null;
    return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:.95rem;font-weight:700">${g.emoji||'🎯'} ${g.name}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:.8rem;font-weight:700;color:${color}">${pct}%</span>
          <button onclick="deleteSavingsGoal(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.8rem;padding:2px 5px">✕</button>
        </div>
      </div>
      <div style="background:var(--border);border-radius:4px;height:10px;overflow:hidden;margin-bottom:8px">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width .6s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);margin-bottom:8px">
        <span>$${g.saved} saved of $${g.target}</span>
        <span>${remaining>0?'$'+remaining+' to go':pct>=100?'🎉 Goal reached!':''}${daysLeft!=null?' · '+daysLeft+'d left':''}</span>
      </div>
      <div style="display:flex;gap:6px">
        <input type="number" min="1" placeholder="Add $" id="sg-add-${i}" style="flex:1;padding:5px 8px;border:1.5px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:.82rem;outline:none">
        <button class="btn-sm btn-approve" onclick="addToGoal(${i})" style="font-size:.76rem">Add $$</button>
      </div>
    </div>`;
  }).join('') || '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:.5rem">No goals yet — add one below!</p>';
}

function renderTeenSavingsBanner() {
  const banner = document.getElementById('teen-savings-banner');
  if (!banner || !savingsGoals.length) return;
  const goal = savingsGoals[0];
  const pct  = Math.min(100, Math.round((goal.saved/goal.target)*100));
  const color = pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--blue)';
  banner.style.display = 'block';
  banner.innerHTML = `<div style="background:${color==='var(--green)'?'var(--green-pale)':color==='var(--amber)'?'var(--amber-pale)':'var(--blue-pale)'};border:1.5px solid ${color};border-radius:12px;padding:12px 14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:.88rem;font-weight:700">${goal.emoji||'🎯'} Savings Goal: ${goal.name}</div>
      <div style="font-size:.8rem;font-weight:800;color:${color}">$${goal.saved} / $${goal.target}</div>
    </div>
    <div style="background:rgba(0,0,0,.1);border-radius:4px;height:8px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width .6s"></div>
    </div>
    <div style="font-size:.74rem;color:var(--muted);margin-top:5px">Keep working — ${pct}% there! 💪</div>
  </div>`;
}

function addToGoal(idx) {
  const val = parseFloat(document.getElementById('sg-add-'+idx)?.value);
  if (!val || val<=0) { showToast('Enter an amount to add','info'); return; }
  savingsGoals[idx].saved = +(savingsGoals[idx].saved + val).toFixed(2);
  saveSavingsGoals();
  renderSavingsGoals();
  showToast('$'+val+' added to goal! 💰','success');
}

function addSavingsGoal() {
  const name   = document.getElementById('sg-name')?.value.trim();
  const target = parseFloat(document.getElementById('sg-target')?.value);
  const emoji  = document.getElementById('sg-emoji')?.value.trim() || '🎯';
  const deadline = document.getElementById('sg-deadline')?.value;
  if (!name || !target) { showToast('Enter a name and target amount','info'); return; }
  savingsGoals.push({ name, emoji, target, saved:0, deadline, id:Date.now() });
  saveSavingsGoals();
  ['sg-name','sg-target','sg-emoji','sg-deadline'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderSavingsGoals();
  showToast('Goal added! 🎯','success');
}

function deleteSavingsGoal(idx) {
  savingsGoals.splice(idx,1);
  saveSavingsGoals();
  renderSavingsGoals();
}
window.renderSavingsGoals = renderSavingsGoals;
window.addSavingsGoal     = addSavingsGoal;
window.addToGoal          = addToGoal;
window.deleteSavingsGoal  = deleteSavingsGoal;

// ═══════════════════════════════════════════════════════
//  FEATURE: TRUSTED EMPLOYERS WHITELIST
// ═══════════════════════════════════════════════════════
let trustedEmployers = JSON.parse(localStorage.getItem('tw_trusted_emp') || '[]');
let blockedEmployers = JSON.parse(localStorage.getItem('tw_blocked_emp') || '[]');

function saveTrustedEmployers() {
  try {
    localStorage.setItem('tw_trusted_emp', JSON.stringify(trustedEmployers));
    localStorage.setItem('tw_blocked_emp', JSON.stringify(blockedEmployers));
  } catch(e) {}
}

function renderTrustedEmployers() {
  const tList = document.getElementById('trusted-employers-list');
  const bList = document.getElementById('blocked-employers-list');

  if (tList) {
    tList.innerHTML = trustedEmployers.length ? trustedEmployers.map((emp,i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--green-pale);border:1px solid var(--green-light);border-radius:10px;padding:9px 12px;margin-bottom:7px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:1.1rem">✅</span>
          <div>
            <div style="font-size:.85rem;font-weight:700;color:var(--green)">${emp.name}</div>
            <div style="font-size:.72rem;color:var(--muted)">Added ${emp.date} · Saved by you · not a screening check</div>
          </div>
        </div>
        <button onclick="removeTrusted(${i})" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:7px;padding:4px 8px;cursor:pointer;font-size:.75rem">Remove</button>
      </div>`).join('') : '<p style="color:var(--muted);font-size:.84rem;padding:4px 0">No employers saved by you yet.</p>';
  }

  if (bList) {
    bList.innerHTML = blockedEmployers.length ? blockedEmployers.map((emp,i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--red-pale);border:1px solid #f5b7b1;border-radius:10px;padding:9px 12px;margin-bottom:7px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:1.1rem">🚫</span>
          <div style="font-size:.85rem;font-weight:700;color:var(--red)">${emp.name}</div>
        </div>
        <button onclick="removeBlocked(${i})" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:7px;padding:4px 8px;cursor:pointer;font-size:.75rem">Unblock</button>
      </div>`).join('') : '<p style="color:var(--muted);font-size:.84rem;padding:4px 0">No blocked employers.</p>';
  }
}

function addTrustedEmployer() {
  const name = document.getElementById('te-name')?.value.trim();
  if (!name) { showToast('Enter an employer name','info'); return; }
  if (trustedEmployers.find(e=>e.name.toLowerCase()===name.toLowerCase())) { showToast('Already trusted','info'); return; }
  trustedEmployers.push({ name, date: new Date().toLocaleDateString() });
  saveTrustedEmployers();
  document.getElementById('te-name').value = '';
  renderTrustedEmployers();
  showToast(name+' added to employers saved by you ✅','success');
}

function addBlockedEmployer() {
  const name = document.getElementById('be-name')?.value.trim();
  if (!name) { showToast('Enter an employer name','info'); return; }
  blockedEmployers.push({ name });
  saveTrustedEmployers();
  document.getElementById('be-name').value = '';
  renderTrustedEmployers();
  showToast(name+' blocked 🚫','success');
}

function removeTrusted(i)  { trustedEmployers.splice(i,1); saveTrustedEmployers(); renderTrustedEmployers(); }
function removeBlocked(i)  { blockedEmployers.splice(i,1); saveTrustedEmployers(); renderTrustedEmployers(); }

window.renderTrustedEmployers = renderTrustedEmployers;
window.addTrustedEmployer     = addTrustedEmployer;
window.addBlockedEmployer     = addBlockedEmployer;
window.removeTrusted          = removeTrusted;
window.removeBlocked          = removeBlocked;

// ═══════════════════════════════════════════════════════
//  FEATURE: MULTI-TEEN MANAGEMENT
// ═══════════════════════════════════════════════════════
let linkedTeens = JSON.parse(localStorage.getItem('tw_linked_teens') || '[]');

function saveLinkedTeens() {
  try { localStorage.setItem('tw_linked_teens', JSON.stringify(linkedTeens)); } catch(e) {}
}

function renderMultiTeens() {
  // Seed demo teen
  if (!linkedTeens.length) {
    linkedTeens = [{ name:'Alex Johnson', age:16, city:'Burlington, VT', inviteCode:'TEEN-4829', status:'active', jobs:3, rating:4.5, avatar:'🧑' }];
    saveLinkedTeens();
  }
  const badge = document.getElementById('teen-count-badge');
  if (badge) badge.textContent = linkedTeens.length + ' Teen' + (linkedTeens.length>1?'s':'');

  const list = document.getElementById('multi-teen-list');
  if (!list) return;
  list.innerHTML = linkedTeens.map((teen,i) => `
    <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">${teen.avatar||'🧑'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.95rem">${teen.name}</div>
          <div style="font-size:.78rem;color:var(--muted)">Age ${teen.age} · ${teen.city}</div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:2px">Code: <code style="background:var(--bg);border:1px solid var(--border);padding:1px 5px;border-radius:4px;font-size:.74rem">${teen.inviteCode}</code></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:.78rem;font-weight:700;color:var(--green)">⭐ ${teen.rating}</div>
          <div style="font-size:.72rem;color:var(--muted)">${teen.jobs} jobs</div>
          <span style="background:var(--green-pale);color:var(--green);font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:10px">${teen.status}</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <button class="btn-sm btn-ai" style="font-size:.75rem" onclick="viewTeenSummary('${teen.name}')">📊 View Summary</button>
        <button class="btn-sm btn-approve" style="font-size:.75rem" onclick="switchParentTab('ptab-approvals','pdtab-approvals')">✅ Approvals</button>
        ${i>0?`<button class="btn-sm" style="font-size:.75rem;background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1" onclick="unlinkTeen(${i})">Unlink</button>`:''}
      </div>
    </div>`).join('');
}

function linkAnotherTeen() {
  const code = document.getElementById('mt-invite')?.value.trim().toUpperCase();
  if (!code || !code.startsWith('TEEN-')) { showToast('Enter a valid invite code (e.g. TEEN-1234)','info'); return; }
  if (linkedTeens.find(t=>t.inviteCode===code)) { showToast('This teen is already linked','info'); return; }
  const newTeen = { name:'Teen ' + code.split('-')[1], age:15, city:'Vermont', inviteCode:code, status:'pending', jobs:0, rating:0, avatar:'🧒' };
  linkedTeens.push(newTeen);
  saveLinkedTeens();
  document.getElementById('mt-invite').value = '';
  renderMultiTeens();
  showToast('Teen linked! They\'ll need to confirm on their end. 🔗','success');
}

function unlinkTeen(i) {
  linkedTeens.splice(i,1);
  saveLinkedTeens();
  renderMultiTeens();
  showToast('Teen unlinked','success');
}

function viewTeenSummary(name) {
  openAI(`Generate a brief weekly activity summary for teen "${name}" on the TeenWork platform. Include fictional but realistic stats: jobs applied, shifts completed, rating, earnings, any safety notes. Make it parent-friendly and warm. 3-4 sentences.`);
}

window.renderMultiTeens  = renderMultiTeens;
window.linkAnotherTeen   = linkAnotherTeen;
window.unlinkTeen        = unlinkTeen;
window.viewTeenSummary   = viewTeenSummary;

// ═══════════════════════════════════════════════════════
//  FEATURE: SMS NOTIFICATION TOGGLE
// ═══════════════════════════════════════════════════════
function saveSMSPhone() {
  const phone = document.getElementById('notif-phone')?.value.trim();
  if (!phone) { showToast('Enter your phone number first','info'); return; }
  try { localStorage.setItem('tw_sms_phone', phone); } catch(e) {}
  showToast('Phone number saved for SMS alerts 📱','success');
}
window.saveSMSPhone = saveSMSPhone;

// Show/hide SMS phone row when SMS toggle changes
document.addEventListener('DOMContentLoaded', () => {
  const smsToggle = document.getElementById('ctrl-sms-alerts');
  const smsRow    = document.getElementById('sms-phone-row');
  if (smsToggle && smsRow) {
    smsToggle.addEventListener('change', () => {
      smsRow.style.display = smsToggle.checked ? 'block' : 'none';
      const badge = document.getElementById('badge-sms-alerts');
      if (badge) badge.textContent = smsToggle.checked ? 'ON' : 'OFF';
      showToast(smsToggle.checked ? 'SMS alerts enabled — enter your phone number' : 'SMS alerts off', smsToggle.checked?'info':'success');
    });
  }
  // Render savings banner on load if goals exist
  setTimeout(renderTeenSavingsBanner, 800);
});



window.generateWeeklySummary = generateWeeklySummary;
window.sendWeeklySummaryEmail = sendWeeklySummaryEmail;
window.copyWeeklySummary = copyWeeklySummary;

// ═══════════════════════════════════════════════════════
//  FEATURE: AI WAGE NEGOTIATION COACH (Teen Dashboard)
// ═══════════════════════════════════════════════════════
let wageCoachHistory = [];

function openWageCoach() {
  document.getElementById('ttab-ai')?.scrollIntoView({behavior:'smooth'});
  const chatEl = document.getElementById('wage-coach-chat');
  if (chatEl) chatEl.scrollIntoView({behavior:'smooth',block:'nearest'});
}

async function startWageCoach() {
  const job   = document.getElementById('wc-job')?.value.trim() || 'local job';
  const pay   = parseFloat(document.getElementById('wc-pay')?.value) || 12;
  const weeks = parseInt(document.getElementById('wc-weeks')?.value) || 4;
  const rating = parseFloat(document.getElementById('wc-rating')?.value) || 4.5;

  const chatEl   = document.getElementById('wage-coach-chat');
  const inputRow = document.getElementById('wage-coach-input-row');
  const scripts  = document.getElementById('wage-coach-scripts');

  document.getElementById('wage-coach-setup').style.display = 'none';
  chatEl.style.display = 'block';
  inputRow.style.display = 'flex';
  chatEl.innerHTML = '<span class="loading-dots">Analyzing your situation</span>';

  const prompt = `You are a friendly wage negotiation coach for teens aged 13-17. A teen is asking for your help.

Their situation:
- Job: ${job}
- Current pay: $${pay}/hr
- Weeks worked: ${weeks}
- Their rating: ${rating}/5 stars

Give them:
1. A honest assessment of whether they have a strong case for a raise (1-2 sentences)
2. A specific target rate to ask for and why
3. The single best thing they can say to open the conversation with their employer

Keep it encouraging, specific, and age-appropriate. Under 120 words.`;

  wageCoachHistory = [{ role:'user', content: prompt }];
  const text = await callGemini(prompt);
  wageCoachHistory.push({ role:'assistant', content: text });
  chatEl.innerHTML = `<p>${text.replace(/\n/g,'<br>')}</p>`;
  scripts.style.display = 'block';
}

async function wageCoachReply() {
  const input = document.getElementById('wc-chat-input');
  const question = input?.value.trim();
  if (!question) return;
  input.value = '';

  const chatEl = document.getElementById('wage-coach-chat');
  chatEl.innerHTML += `<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:8px"><strong>You:</strong> ${question}</p><span class="loading-dots">Thinking</span>`;

  wageCoachHistory.push({ role:'user', content: question });
  const text = await callGemini(question, 'You are a friendly wage negotiation coach for teens. Keep responses under 80 words, specific, and encouraging.');
  wageCoachHistory.push({ role:'assistant', content: text });

  const dots = chatEl.querySelector('.loading-dots');
  if (dots) dots.remove();
  chatEl.innerHTML += `<p style="margin-top:8px">${text.replace(/\n/g,'<br>')}</p>`;
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function wageScriptCoach(type) {
  const chatEl = document.getElementById('wage-coach-chat');
  const job = document.getElementById('wc-job')?.value.trim() || 'your job';
  const pay = document.getElementById('wc-pay')?.value || '12';

  const prompts = {
    opening: `Write a single, natural-sounding script (2-3 sentences) a teen could say out loud to open a conversation about getting a raise for their ${job} job where they currently earn $${pay}/hr. Make it confident but polite, age-appropriate.`,
    pushback: `A teen is negotiating a raise for their ${job} job. Their employer said "I can't afford to pay more right now." Write a short, respectful response the teen could say (2-3 sentences) that keeps the conversation going without being pushy.`,
    counteroffer: `A teen asked for a raise on their ${job} job and the employer offered something lower than expected. Write a 2-sentence response the teen can say to either accept gracefully or politely push a little more.`
  };

  chatEl.innerHTML += `<hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"><span class="loading-dots">Writing your script</span>`;
  const text = await callGemini(prompts[type]);
  const dots = chatEl.querySelector('.loading-dots');
  if (dots) dots.remove();
  chatEl.innerHTML += `<p style="background:var(--amber-pale);border-radius:8px;padding:8px 12px;margin-top:8px;font-style:italic">"${text.replace(/\n/g,' ')}"</p>`;
  chatEl.scrollTop = chatEl.scrollHeight;
}

window.openWageCoach   = openWageCoach;
window.startWageCoach  = startWageCoach;
window.wageCoachReply  = wageCoachReply;
window.wageScriptCoach = wageScriptCoach;

// ═══════════════════════════════════════════════════════
//  FEATURE: AI ONBOARDING ASSISTANT
// ═══════════════════════════════════════════════════════
const OB_STEPS = {
  teen: [
    { icon:'🧑‍💼', title:'Welcome, future worker!', body:'TeenWork helps you find safe, local jobs — and every step is designed just for teens like you. This quick tour will get you set up in about 2 minutes.', action: null },
    { icon:'📍', title:'Set your location', body:'Head to <strong>Profile → Your Address</strong> and enter your address. It\'s kept 100% private — employers only see your city. This lets us show you jobs near you.', action: null },
    { icon:'🛠', title:'Add your skills', body:'Go to <strong>Profile → Skills & Tags</strong> and list what you can do — lawn care, pet sitting, cleaning, babysitting, etc. The more you add, the better your AI job matches.', action: null },
    { icon:'🤖', title:'AI job matching', body:'Once your skills are set, hit <strong>🤖 Refresh AI Matches</strong> on your Browse tab. The AI will find jobs in your area that fit your age, location, and skills.', action: null },
    { icon:'✅', title:'Get your parent connected', body:'Your parent needs to approve your job applications. Share your <strong>Invite Code</strong> (found in your Profile tab) so they can link their account to yours.', action: null },
    { icon:'🚀', title:"You're all set!", body:'Browse jobs, hit Apply, and wait for your parent\'s approval. You can always ask the <strong>AI Job Coach</strong> (AI tab) for help with interviews, pay, or your rights.', action: 'gotoPage("teen")' }
  ],
  parent: [
    { icon:'👪', title:'Welcome, parent!', body:'TeenWork keeps you in control of your teen\'s work life. You approve every application, monitor messages, and set safety rules — all from your dashboard.', action: null },
    { icon:'🔗', title:'Link your teen\'s account', body:'Your teen will share their <strong>Invite Code</strong> from their Profile tab. Enter it in your account settings under <strong>Teen\'s Invite Code</strong> to connect your accounts.', action: null },
    { icon:'🛡', title:'Set parental controls', body:'Go to the <strong>Controls</strong> tab to set hour limits, restrict transport options, and configure message safety filters. These apply immediately.', action: null },
    { icon:'📬', title:'Get weekly summaries', body:'Head to the <strong>Weekly Summary</strong> tab and turn on email digests. Every Sunday you\'ll get an AI-written rundown of everything your teen did that week.', action: null },
    { icon:'✅', title:'Approve with confidence', body:'When your teen applies for a job, you\'ll get an alert. Click <strong>🤖 AI job guidance</strong> on any job to get an instant safety report before you approve.', action: null },
    { icon:'🚀', title:"You're all set!", body:'You\'re in control. Head to your <strong>Approvals</strong> tab to see any pending applications from your teen.', action: 'gotoPage("parent")' }
  ],
  employer: [
    { icon:'🏢', title:'Welcome, employer!', body:'TeenWork helps you hire reliable local teens safely and legally. Every teen\'s parent has already approved their account — so you\'re reviewing applications with parent involvement.', action: null },
    { icon:'📝', title:'Post your first job', body:'Click the <strong>Post a Job</strong> tab and fill in the details. The AI will automatically review your posting for child labor law compliance before it goes live.', action: null },
    { icon:'👥', title:'Review applicants', body:'Go to the <strong>Applicants</strong> tab to see who\'s applied. Each profile shows age, skills, ratings, and letters of recommendation from past employers.', action: null },
    { icon:'💬', title:'Message teens safely', body:'All messages go through TeenWork\'s safety filter — no personal contact info is ever shared. Parents can see all messages between you and their teen.', action: null },
    { icon:'🚀', title:"You're all set!", body:'Post your job, review applicants, and hire with confidence. Use the <strong>AI Tools</strong> tab for compliance tips and interview help anytime.', action: 'gotoPage("employer")' }
  ]
};

let obCurrentStep = 0;
let obRole = 'teen';

function initOnboarding(role) {
  // Only fire when the matching dashboard page is active — never on landing/auth pages
  const pageMap = { teen:'teen', parent:'parent', employer:'employer' };
  const pageId  = 'page-' + (pageMap[role] || 'teen');
  const pageEl  = document.getElementById(pageId);
  if (!pageEl || !pageEl.classList.contains('active')) return;
  const alreadySeen = localStorage.getItem('tw_onboarded_' + role);
  if (alreadySeen) return;
  obRole = role || 'teen';
  obCurrentStep = 0;
  renderObStep();
  document.getElementById('onboarding-modal').classList.add('open');
}

function renderObStep() {
  const steps = OB_STEPS[obRole] || OB_STEPS.teen;
  const step = steps[obCurrentStep];
  const total = steps.length;

  // Progress bar
  const bar = document.getElementById('ob-progress-bar');
  bar.innerHTML = steps.map((_,i) => `<div style="flex:1;height:5px;border-radius:4px;background:${i<=obCurrentStep?'var(--green)':'var(--border)'};transition:background .3s"></div>`).join('');

  // Content
  document.getElementById('ob-step-content').innerHTML = `
    <div style="text-align:center;padding:.6rem 0 1rem">
      <div style="font-size:2.8rem;margin-bottom:.6rem">${step.icon}</div>
      <h3 style="font-family:'Fraunces',serif;font-size:1.2rem;color:var(--green);margin-bottom:.6rem">${step.title}</h3>
      <p style="font-size:.88rem;color:var(--text);line-height:1.65">${step.body}</p>
    </div>
    <div style="text-align:center;font-size:.74rem;color:var(--muted);margin-top:.2rem">Step ${obCurrentStep+1} of ${total}</div>`;

  // Show AI chat area from step 2 onward
  const chatArea = document.getElementById('ob-chat-area');
  chatArea.style.display = obCurrentStep >= 1 ? 'block' : 'none';
  if (obCurrentStep === 1) {
    document.getElementById('ob-ai-chat').innerHTML = '<p>Got questions? Ask me anything about setting up your account!</p>';
  }

  // Back button
  document.getElementById('ob-back-btn').style.display = obCurrentStep > 0 ? 'flex' : 'none';

  // Next/Finish button
  const nextBtn = document.getElementById('ob-next-btn');
  nextBtn.textContent = obCurrentStep === total - 1 ? "🚀 Let's Go!" : 'Next →';
}

function obStep(dir) {
  const steps = OB_STEPS[obRole] || OB_STEPS.teen;
  if (dir === 1 && obCurrentStep === steps.length - 1) {
    closeOnboarding();
    const finalAction = steps[steps.length-1].action;
    if (finalAction) { try { eval(finalAction); } catch(e){} }
    return;
  }
  obCurrentStep = Math.max(0, Math.min(steps.length - 1, obCurrentStep + dir));
  renderObStep();
}

async function obAskQuestion() {
  const input = document.getElementById('ob-question-input');
  const q = input?.value.trim();
  if (!q) return;
  input.value = '';
  const chat = document.getElementById('ob-ai-chat');
  chat.innerHTML += `<p style="background:var(--green-pale);border-radius:8px;padding:5px 9px;margin-top:6px"><strong>You:</strong> ${q}</p><span class="loading-dots">Thinking</span>`;
  const roleCtx = obRole === 'teen' ? 'a teen user (age 13-17)' : obRole === 'parent' ? 'a parent setting up their account' : 'an employer posting teen jobs';
  const text = await callGemini(q, `You are a friendly onboarding assistant for TeenWork, a safe teen employment platform. The user is ${roleCtx}. Answer their setup question in under 60 words, clearly and encouragingly.`);
  const dots = chat.querySelector('.loading-dots');
  if (dots) dots.remove();
  chat.innerHTML += `<p style="margin-top:6px">${text.replace(/\n/g,'<br>')}</p>`;
  chat.scrollTop = chat.scrollHeight;
}

function closeOnboarding() {
  document.getElementById('onboarding-modal').classList.remove('open');
  try { localStorage.setItem('tw_onboarded_' + obRole, '1'); } catch(e){}
}

// demoLogin is fully handled by the fix script at the bottom of this page.

window.initOnboarding  = initOnboarding;
window.closeOnboarding = closeOnboarding;
window.obStep          = obStep;
window.obAskQuestion   = obAskQuestion;

// ═══════════════════════════════════════════════════════
//  PORTFOLIO BUILDER
// ═══════════════════════════════════════════════════════
(function(){
  function getPortfolio(){ try{return JSON.parse(localStorage.getItem('tw_portfolio')||'[]');}catch(e){return[];} }
  function savePortfolio(d){ try{localStorage.setItem('tw_portfolio',JSON.stringify(d));}catch(e){} }

  window.openAddProjectModal = function(){
    document.getElementById('addProjectModal').style.display='flex';
    document.getElementById('proj-date').value = new Date().toISOString().split('T')[0];
  };
  window.closeAddProjectModal = function(){ document.getElementById('addProjectModal').style.display='none'; };

  window.savePortfolioProject = function(){
    const title = document.getElementById('proj-title').value.trim();
    if(!title){ showToast('Please enter a project title','warning'); return; }
    const proj = {
      id: Date.now(),
      title,
      category: document.getElementById('proj-category').value,
      desc: document.getElementById('proj-desc').value.trim(),
      date: document.getElementById('proj-date').value,
      skills: document.getElementById('proj-skills').value.split(',').map(s=>s.trim()).filter(Boolean),
    };
    const data = getPortfolio();
    data.unshift(proj);
    savePortfolio(data);
    closeAddProjectModal();
    renderPortfolioTab();
    showToast('Project added to portfolio! 🗂️','success');
  };

  const CAT_ICONS = {'yard work':'🌿','pet care':'🐾','cleaning':'🧹','babysitting':'👶','tech help':'💻','other':'🔧'};

  window.deletePortfolioProject = function(id){
    const data = getPortfolio().filter(p=>p.id!==id);
    savePortfolio(data);
    renderPortfolioTab();
    showToast('Project removed','info');
  };

  function renderPortfolioTab(){
    const data = getPortfolio();
    const grid = document.getElementById('portfolio-grid');
    const empty = document.getElementById('portfolio-empty');
    if(!grid) return;
    document.getElementById('pf-project-count').textContent = data.length;
    const allSkills = new Set(data.flatMap(p=>p.skills));
    document.getElementById('pf-skill-count').textContent = allSkills.size;
    document.getElementById('pf-photo-count').textContent = 0;
    if(data.length===0){ grid.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    grid.innerHTML = data.map(p=>`
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div>
            <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">${CAT_ICONS[p.category]||'🔧'} ${p.category}</div>
            <div style="font-family:'Fraunces',serif;font-size:1rem;font-weight:700;color:var(--text);margin-top:2px">${p.title}</div>
          </div>
          <button onclick="deletePortfolioProject(${p.id})" style="background:none;border:none;font-size:.9rem;cursor:pointer;color:var(--muted);padding:2px 5px;border-radius:6px;flex-shrink:0" title="Remove">🗑️</button>
        </div>
        ${p.desc?`<p style="font-size:.82rem;color:var(--muted);line-height:1.5">${p.desc}</p>`:''}
        ${p.skills.length?`<div style="display:flex;flex-wrap:wrap;gap:5px">${p.skills.map(s=>`<span class="skill-pill" style="font-size:.72rem">${s}</span>`).join('')}</div>`:''}
        ${p.date?`<div style="font-size:.72rem;color:var(--muted)">📅 ${new Date(p.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
      </div>
    `).join('');
  }

  // Patch switchDashTab
  const _orig = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_orig) _orig(btn, panelId);
    if(panelId==='ttab-portfolio') setTimeout(renderPortfolioTab, 80);
  };
  window.renderPortfolioTab = renderPortfolioTab;
})();

// ═══════════════════════════════════════════════════════
//  BADGES & ACHIEVEMENTS
// ═══════════════════════════════════════════════════════
(function(){
  const ALL_BADGES = [
    {id:'first_apply',   emoji:'🚀', name:'First Step',        desc:'Applied to your first job',              check: s => s.applied >= 1},
    {id:'three_applies', emoji:'🎯', name:'On the Hunt',       desc:'Applied to 3 or more jobs',              check: s => s.applied >= 3},
    {id:'hired',         emoji:'🤝', name:'Hired!',            desc:'Got accepted for a job',                  check: s => s.accepted >= 1},
    {id:'five_hours',    emoji:'⏰', name:'5 Hours Strong',    desc:'Logged 5 or more hours of work',          check: s => s.hours >= 5},
    {id:'twenty_hours',  emoji:'💪', name:'Grind Mode',        desc:'Logged 20 or more hours of work',         check: s => s.hours >= 20},
    {id:'first_dollar',  emoji:'💵', name:'First Dollar',      desc:'Earned your first dollar',                check: s => s.earned >= 1},
    {id:'fifty_bucks',   emoji:'💰', name:'$50 Milestone',     desc:'Earned $50 total',                        check: s => s.earned >= 50},
    {id:'hundred_bucks', emoji:'💯', name:'Century Club',      desc:'Earned $100 total',                       check: s => s.earned >= 100},
    {id:'five_hundred',  emoji:'🏦', name:'$500 Earner',       desc:'Earned $500 total',                       check: s => s.earned >= 500},
    {id:'portfolio_1',   emoji:'🗂️', name:'Show Your Work',   desc:'Added a project to your portfolio',       check: s => s.projects >= 1},
    {id:'portfolio_5',   emoji:'🎨', name:'Portfolio Pro',     desc:'Added 5 projects to your portfolio',      check: s => s.projects >= 5},
    {id:'goal_set',      emoji:'🎯', name:'Goal Setter',       desc:'Created a savings goal',                  check: s => s.goals >= 1},
    {id:'goal_met',      emoji:'🏆', name:'Goal Crusher',      desc:'Reached a savings goal',                  check: s => s.goalsMet >= 1},
    {id:'streak_3',      emoji:'⚡', name:'3-Day Streak',      desc:'Logged in 3 days in a row',               check: s => (s.streak||0) >= 3},
    {id:'lesson_1',      emoji:'📚', name:'First Lesson',      desc:'Completed your first lesson',             check: s => s.lessons >= 1},
    {id:'five_lessons',  emoji:'🎓', name:'Scholar',           desc:'Completed 5 lessons',                     check: s => s.lessons >= 5},
  ];

  function getStats(){
    const apps = JSON.parse(localStorage.getItem('tw_tracker')||'[]');
    const worklog = JSON.parse(localStorage.getItem('tw_worklog')||'[]');
    const savings = JSON.parse(localStorage.getItem('tw_savings_history')||'[]');
    const goals = JSON.parse(localStorage.getItem('tw_savings_goals')||'[]');
    const portfolio = JSON.parse(localStorage.getItem('tw_portfolio')||'[]');
    const totalHours = worklog.reduce((a,e)=>a+(parseFloat(e.hours)||0),0);
    const totalEarned = savings.reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
    const goalsMet = goals.filter(g=>g.met).length;
    const state = _state||{};
    return {
      applied: apps.length + (state.applications?.length||0),
      accepted: apps.filter(a=>a.status==='hired').length + (state.applications?.filter(a=>a.status==='accepted').length||0),
      hours: totalHours,
      earned: totalEarned,
      projects: portfolio.length,
      goals: goals.length,
      goalsMet,
      streak: parseInt(localStorage.getItem('tw_streak')||'0'),
      lessons: parseInt(localStorage.getItem('tw_lessons_completed')||'0'),
    };
  }

  function renderBadgesTab(){
    const stats = getStats();
    const earnedGrid = document.getElementById('earned-badges-grid');
    const lockedGrid = document.getElementById('locked-badges-grid');
    const earnedCount = document.getElementById('earned-badge-count');
    const lockedCount = document.getElementById('locked-badge-count');
    if(!earnedGrid) return;
    const earned = ALL_BADGES.filter(b=>b.check(stats));
    const locked = ALL_BADGES.filter(b=>!b.check(stats));
    if(earnedCount) earnedCount.textContent = `${earned.length} Earned`;
    if(lockedCount) lockedCount.textContent = `${locked.length} To Go`;
    earnedGrid.innerHTML = earned.length ? earned.map(b=>`
      <div style="background:linear-gradient(135deg,var(--amber-pale),#fff8e0);border:2px solid var(--amber);border-radius:14px;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(231,111,0,.12)">
        <div style="font-size:2.2rem;margin-bottom:6px">${b.emoji}</div>
        <div style="font-family:'Fraunces',serif;font-size:.88rem;font-weight:700;color:var(--text)">${b.name}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:3px;line-height:1.4">${b.desc}</div>
      </div>
    `).join('') : `<p style="color:var(--muted);font-size:.85rem;font-style:italic;grid-column:1/-1">No badges earned yet — start applying to jobs!</p>`;
    lockedGrid.innerHTML = locked.map(b=>`
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:14px;padding:14px;text-align:center;opacity:.6">
        <div style="font-size:2.2rem;margin-bottom:6px;filter:grayscale(1)">🔒</div>
        <div style="font-family:'Fraunces',serif;font-size:.88rem;font-weight:700;color:var(--muted)">${b.name}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:3px;line-height:1.4">${b.desc}</div>
      </div>
    `).join('');
  }

  const _orig = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_orig) _orig(btn, panelId);
    if(panelId==='ttab-badges') setTimeout(renderBadgesTab, 80);
    if(panelId==='ttab-lessons') { setTimeout(function(){ if(typeof renderLessonsGrid==='function') renderLessonsGrid(); }, 80); }
  };
  window.renderBadgesTab = renderBadgesTab;
})();

// ═══════════════════════════════════════════════════════
//  EARNINGS HISTORY + SAVINGS TRACKER
// ═══════════════════════════════════════════════════════
(function(){
  function getHistory(){ try{return JSON.parse(localStorage.getItem('tw_savings_history')||'[]');}catch(e){return[];} }
  function saveHistory(d){ try{localStorage.setItem('tw_savings_history',JSON.stringify(d));}catch(e){} }
  function getGoals(){ try{return JSON.parse(localStorage.getItem('tw_savings_goals')||'[]');}catch(e){return[];} }
  function saveGoals(d){ try{localStorage.setItem('tw_savings_goals',JSON.stringify(d));}catch(e){} }

  window.openAddGoalModal = function(){
    document.getElementById('addGoalModal').style.display='flex';
  };

  window.saveSavingsGoal = function(){
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    if(!name||!target||target<=0){ showToast('Please fill in goal name and target amount','warning'); return; }
    const goal = {
      id: Date.now(), name, target,
      emoji: document.getElementById('goal-emoji').value||'🎯',
      dueDate: document.getElementById('goal-date').value,
      saved: 0, met: false,
    };
    const goals = getGoals();
    goals.push(goal);
    saveGoals(goals);
    document.getElementById('addGoalModal').style.display='none';
    renderSavingsTab();
    showToast('Savings goal added! 🎯','success');
  };

  window.addToGoal = function(id, amount){
    const goals = getGoals();
    const g = goals.find(x=>x.id===id);
    if(!g) return;
    g.saved = Math.min(g.target, (g.saved||0) + amount);
    if(g.saved >= g.target) g.met = true;
    saveGoals(goals);
    renderSavingsTab();
  };

  window.deleteGoal = function(id){
    saveGoals(getGoals().filter(g=>g.id!==id));
    renderSavingsTab();
    showToast('Goal removed','info');
  };

  function renderSavingsTab(){
    const history = getHistory();
    const goals = getGoals();
    const totalEarned = history.reduce((a,e)=>a+(e.type==='earn'?e.amount:0),0);
    const totalSpent = history.reduce((a,e)=>a+(e.type==='spend'?e.amount:0),0);
    const totalSaved = totalEarned - totalSpent;
    const goalsMet = goals.filter(g=>g.met).length;

    const sv = id => document.getElementById(id);
    if(sv('sv-total-earned')) sv('sv-total-earned').textContent='$'+totalEarned.toFixed(2);
    if(sv('sv-saved')) sv('sv-saved').textContent='$'+Math.max(0,totalSaved).toFixed(2);
    if(sv('sv-spent')) sv('sv-spent').textContent='$'+totalSpent.toFixed(2);
    if(sv('sv-goals-met')) sv('sv-goals-met').textContent=`${goalsMet}/${goals.length}`;

    // Goals
    const goalsList = sv('savings-goals-list');
    if(goalsList){
      goalsList.innerHTML = goals.length ? goals.map(g=>{
        const pct = Math.min(100, ((g.saved||0)/g.target*100));
        return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-weight:700;font-size:.92rem">${g.emoji} ${g.name}</div>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:.78rem;color:var(--muted)">$${(g.saved||0).toFixed(0)} / $${g.target.toFixed(0)}</span>
              <button onclick="deleteGoal(${g.id})" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.8rem">🗑️</button>
            </div>
          </div>
          <div style="background:var(--border);border-radius:10px;height:10px;overflow:hidden">
            <div style="background:${g.met?'var(--green)':'var(--amber)'};height:100%;width:${pct}%;border-radius:10px;transition:width .4s"></div>
          </div>
          ${g.met?'<div style="font-size:.73rem;color:var(--green);font-weight:700;margin-top:4px">🎉 Goal reached!</div>':`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn-sm btn-primary" style="font-size:.72rem" onclick="addToGoal(${g.id},10)">+$10</button><button class="btn-sm btn-primary" style="font-size:.72rem" onclick="addToGoal(${g.id},25)">+$25</button><button class="btn-sm btn-primary" style="font-size:.72rem" onclick="addToGoal(${g.id},50)">+$50</button></div>`}
        </div>`;
      }).join('') : `<p style="color:var(--muted);font-size:.85rem;font-style:italic">No goals yet — add one to stay motivated!</p>`;
    }

    // History
    const histList = sv('savings-history-list');
    const histCount = sv('sv-history-count');
    if(histCount) histCount.textContent = `${history.length} entries`;
    if(histList){
      histList.innerHTML = history.length ? history.slice().reverse().map(e=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">${e.type==='earn'?'💵':'💸'}</span>
            <div>
              <div style="font-weight:600;font-size:.88rem">${e.label||'Entry'}</div>
              <div style="font-size:.72rem;color:var(--muted)">${e.date||''}</div>
            </div>
          </div>
          <span style="font-weight:700;color:${e.type==='earn'?'var(--green)':'var(--red)'}">${e.type==='earn'?'+':'-'}$${parseFloat(e.amount||0).toFixed(2)}</span>
        </div>
      `).join('') : `<p style="color:var(--muted);font-size:.85rem;font-style:italic">No earnings logged yet.</p>`;
    }
  }

  // Hook: when earnings are logged via the main earnings tracker, mirror them here too
  const _origAddEarnings = window.addEarningsEntry;
  window.addEarningsEntry = function(){
    if(_origAddEarnings) _origAddEarnings();
    // Pull latest state to mirror
    const job = document.getElementById('earn-log-job')?.value?.trim();
    const pay = parseFloat(document.getElementById('earn-log-pay')?.value||0);
    if(job && pay > 0){
      const history = getHistory();
      history.push({id:Date.now(),type:'earn',label:job,amount:pay,date:new Date().toLocaleDateString()});
      saveHistory(history);
    }
  };

  const _orig = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_orig) _orig(btn, panelId);
    if(panelId==='ttab-savings') setTimeout(renderSavingsTab, 80);
  };
  window.renderSavingsTab = renderSavingsTab;
})();

// ═══════════════════════════════════════════════════════
//  APPLICATION TRACKER (Kanban)
// ═══════════════════════════════════════════════════════
(function(){
  function getTrackerApps(){ try{return JSON.parse(localStorage.getItem('tw_tracker')||'[]');}catch(e){return[];} }
  function saveTrackerApps(d){ try{localStorage.setItem('tw_tracker',JSON.stringify(d));}catch(e){} }

  const STATUSES = ['applied','interview','hired','rejected'];

  window.updateTrackerStatus = function(id, newStatus){
    const apps = getTrackerApps();
    const app = apps.find(a=>a.id===id);
    if(app){ app.status = newStatus; app.updatedAt = new Date().toLocaleDateString(); }
    saveTrackerApps(apps);
    renderTrackerTab();
  };

  window.deleteTrackerApp = function(id){
    saveTrackerApps(getTrackerApps().filter(a=>a.id!==id));
    renderTrackerTab();
    showToast('Application removed','info');
  };

  function renderTrackerTab(){
    const allApps = getTrackerApps();
    // Also pull from main _state applications
    const stateApps = (_state?.applications||[]).map(a=>({
      id:'s_'+a.id, jobTitle:a.jobTitle||a.title||'Job',
      employer:a.employer||'',
      status: a.status==='accepted'?'hired': a.status==='rejected'?'rejected': a.status==='pending'?'interview':'applied',
      date: a.appliedDate||a.date||''
    }));
    const combined = [...allApps, ...stateApps.filter(sa=>!allApps.find(a=>a.id===sa.id))];
    STATUSES.forEach(s=>{
      const col = document.getElementById('tracker-col-'+s);
      const count = document.getElementById('tracker-count-'+s);
      const items = combined.filter(a=>a.status===s);
      if(count) count.textContent = items.length;
      if(col){
        col.innerHTML = items.length ? items.map(a=>`
          <div style="background:var(--card);border:1.5px solid var(--border);border-radius:9px;padding:9px 10px;font-size:.8rem">
            <div style="font-weight:700;color:var(--text);margin-bottom:3px;line-height:1.3">${a.jobTitle||'Job'}</div>
            ${a.employer?`<div style="color:var(--muted);font-size:.72rem;margin-bottom:4px">@ ${a.employer}</div>`:''}
            ${a.date?`<div style="color:var(--muted);font-size:.7rem;margin-bottom:6px">${a.date}</div>`:''}
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${STATUSES.filter(ns=>ns!==s).map(ns=>`<button onclick="updateTrackerStatus('${a.id}','${ns}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:2px 6px;font-size:.65rem;cursor:pointer;color:var(--muted)" title="Move to ${ns}">→ ${ns}</button>`).join('')}
              <button onclick="deleteTrackerApp('${a.id}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.7rem;margin-left:auto">🗑️</button>
            </div>
          </div>
        `).join('') : `<div style="text-align:center;padding:16px 8px;color:var(--muted);font-size:.75rem;font-style:italic">Empty</div>`;
      }
    });
    // Stats
    const statsEl = document.getElementById('tracker-stats-bar');
    if(statsEl && combined.length){
      const hiredCount = combined.filter(a=>a.status==='hired').length;
      const rate = combined.length ? Math.round(hiredCount/combined.length*100) : 0;
      statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
          ${STATUSES.map(s=>`<div style="background:var(--bg);border-radius:10px;padding:10px"><div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:var(--text)">${combined.filter(a=>a.status===s).length}</div><div style="font-size:.7rem;color:var(--muted);text-transform:capitalize;margin-top:2px">${s}</div></div>`).join('')}
        </div>
        <div style="margin-top:10px;font-size:.82rem;color:var(--muted);text-align:center">Hire rate: <strong style="color:var(--green)">${rate}%</strong> (${hiredCount} hired out of ${combined.length} total)</div>
      `;
    }
    // Auto-mirror new applications from _state when tab opens
    syncStateAppsToTracker();
  }

  function syncStateAppsToTracker(){
    const existing = getTrackerApps();
    const stateApps = _state?.applications||[];
    let changed = false;
    stateApps.forEach(a=>{
      if(!existing.find(e=>e.id===a.id)){
        existing.push({
          id: a.id, jobTitle: a.jobTitle||a.title||'Job',
          employer: a.employer||'',
          status: a.status==='accepted'?'hired': a.status==='rejected'?'rejected':'applied',
          date: a.appliedDate||new Date().toLocaleDateString(),
          updatedAt: new Date().toLocaleDateString(),
        });
        changed = true;
      }
    });
    if(changed) saveTrackerApps(existing);
  }

  // Hook into applyToJob to auto-add to tracker
  const _origApply = window.applyToJob;
  window.applyToJob = function(jobId){
    if(_origApply) _origApply(jobId);
    setTimeout(()=>{
      const app = _state?.applications?.find(a=>a.jobId===jobId||a.id===jobId);
      if(app){
        const existing = getTrackerApps();
        if(!existing.find(e=>e.id===app.id)){
          existing.unshift({
            id: app.id, jobTitle: app.jobTitle||app.title||'Job',
            employer: app.employer||'', status:'applied',
            date: new Date().toLocaleDateString(),
          });
          saveTrackerApps(existing);
        }
      }
    }, 400);
  };

  const _orig = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_orig) _orig(btn, panelId);
    if(panelId==='ttab-tracker') setTimeout(renderTrackerTab, 80);
  };
  window.renderTrackerTab = renderTrackerTab;
})();

// ═══════════════════════════════════════════════════════
//  WORK LOG / HOURS TRACKER PER JOB
// ═══════════════════════════════════════════════════════
(function(){
  function getWorkLog(){ try{return JSON.parse(localStorage.getItem('tw_worklog')||'[]');}catch(e){return[];} }
  function saveWorkLog(d){ try{localStorage.setItem('tw_worklog',JSON.stringify(d));}catch(e){} }

  window.openAddWorkLogModal = function(){
    document.getElementById('addWorkLogModal').style.display='flex';
    document.getElementById('wl-date').value = new Date().toISOString().split('T')[0];
  };

  window.saveWorkLogEntry = function(){
    const job = document.getElementById('wl-job').value.trim();
    const hours = parseFloat(document.getElementById('wl-hours').value);
    if(!job||!hours||hours<=0){ showToast('Please fill in job name and hours','warning'); return; }
    const entry = {
      id: Date.now(), job,
      date: document.getElementById('wl-date').value,
      hours, pay: parseFloat(document.getElementById('wl-pay').value||0),
      task: document.getElementById('wl-task').value,
      notes: document.getElementById('wl-notes').value.trim(),
    };
    const log = getWorkLog();
    log.unshift(entry);
    saveWorkLog(log);
    document.getElementById('addWorkLogModal').style.display='none';
    // Clear fields
    ['wl-job','wl-hours','wl-pay','wl-notes'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    renderWorkLogTab();
    showToast('Hours logged! ⏱️','success');
  };

  window.deleteWorkLogEntry = function(id){
    saveWorkLog(getWorkLog().filter(e=>e.id!==id));
    renderWorkLogTab();
    showToast('Entry removed','info');
  };

  const TASK_ICONS = {'yard work':'🌿','pet care':'🐾','cleaning':'🧹','babysitting':'👶','tech help':'💻','other':'🔧'};

  var wlShowAll = false;

  function renderWorkLogTab(){
    var allLog = getWorkLog();
    // Apply filters
    var filterJob = document.getElementById('wl-filter-job')?.value||'';
    var filterType = document.getElementById('wl-filter-type')?.value||'';
    var log = allLog.filter(e=>(!filterJob||e.job===filterJob)&&(!filterType||e.task===filterType));

    var sessionCount = document.getElementById('worklog-session-count');
    var cards = document.getElementById('worklog-job-cards');
    var list = document.getElementById('worklog-sessions-list');
    if(!cards||!list) return;
    if(sessionCount) sessionCount.textContent = allLog.length+' sessions';

    // ── Stat strip ────────────────────────────────────────
    var totalHours = allLog.reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
    var totalPay   = allLog.reduce((s,e)=>s+(parseFloat(e.pay)||0),0);
    var avgRate    = totalHours>0?totalPay/totalHours:0;
    var employers  = new Set(allLog.map(e=>e.job)).size;
    var e_th=document.getElementById('wl-total-hours'),e_te=document.getElementById('wl-total-earned'),
        e_ar=document.getElementById('wl-avg-rate'),e_ec=document.getElementById('wl-employer-count');
    if(e_th)e_th.textContent=totalHours.toFixed(1)+'h';
    if(e_te)e_te.textContent='$'+totalPay.toFixed(0);
    if(e_ar)e_ar.textContent='$'+avgRate.toFixed(2);
    if(e_ec)e_ec.textContent=employers;

    // ── Weekly bar chart ──────────────────────────────────
    var now=new Date(); var weeks=[]; var wkLabels=[];
    for(var w=5;w>=0;w--){
      var wStart=new Date(now); wStart.setDate(wStart.getDate()-now.getDay()-w*7);
      var wEnd=new Date(wStart); wEnd.setDate(wStart.getDate()+6);
      var wHrs=allLog.filter(e=>{var d=new Date(e.date);return d>=wStart&&d<=wEnd;}).reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
      weeks.push(wHrs); 
      var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      wkLabels.push((wStart.getMonth()===now.getMonth()&&wStart.getDate()<=now.getDate()?'This wk':(mo[wStart.getMonth()]+' '+wStart.getDate())));
    }
    var maxW=Math.max(...weeks,1);
    var chartEl=document.getElementById('wl-weekly-chart');
    var labelsEl=document.getElementById('wl-weekly-labels');
    if(chartEl){chartEl.innerHTML=weeks.map((h,i)=>{
      var pct=Math.max(h/maxW*100,h>0?8:0);
      var isLast=(i===weeks.length-1);
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'+
        '<div style="font-size:.65rem;font-weight:700;color:'+(isLast?'var(--green)':'var(--muted)')+'">'+
        (h>0?h.toFixed(1)+'h':'')+'</div>'+
        '<div style="width:100%;background:'+(isLast?'var(--green)':'var(--border)')+
        ';border-radius:4px 4px 0 0;transition:height .4s" style="height:'+pct+'%"></div>'+
        '</div>';
    }).join('');}
    if(labelsEl){labelsEl.innerHTML=wkLabels.map((l,i)=>
      '<div style="flex:1;text-align:center;font-size:.58rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+l+'</div>').join('');}

    // Fix: use actual heights via inline style inside elements
    if(chartEl){var bars=chartEl.querySelectorAll('[style*="border-radius:4px 4px"]');
      weeks.forEach((h,i)=>{if(bars[i]){var pct=Math.max(h/maxW*100,h>0?8:0);bars[i].style.height=pct+'%';}});}

    // This week / month / all-time hours
    var todayStart=new Date(); todayStart.setHours(0,0,0,0);
    var weekStart=new Date(todayStart); weekStart.setDate(todayStart.getDate()-todayStart.getDay());
    var monthStart=new Date(todayStart.getFullYear(),todayStart.getMonth(),1);
    var weekHrs=allLog.filter(e=>new Date(e.date)>=weekStart).reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
    var monthHrs=allLog.filter(e=>new Date(e.date)>=monthStart).reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
    var thisWkBadge=document.getElementById('wl-this-week-badge');
    if(thisWkBadge)thisWkBadge.textContent='This week: '+weekHrs.toFixed(1)+'h';
    ['wl-week-hrs','wl-month-hrs','wl-alltime-hrs'].forEach((id,i)=>{
      var el=document.getElementById(id);if(el)el.textContent=[weekHrs,monthHrs,totalHours][i].toFixed(1)+'h';});

    // Labor law reminder
    var lawEl=document.getElementById('wl-law-status');
    if(lawEl){
      if(weekHrs>18)lawEl.innerHTML='<span style="color:var(--red)">⚠️ You\'ve worked '+weekHrs.toFixed(1)+'h this week — over the 18h school-year limit!</span>';
      else if(weekHrs>14)lawEl.innerHTML='<span style="color:var(--amber)">You\'ve worked '+weekHrs.toFixed(1)+'h this week — approaching the 18h limit.</span>';
      else lawEl.innerHTML='<span style="color:var(--green)">You\'re at '+weekHrs.toFixed(1)+'h this week — within limits ✓</span>';
    }

    // ── Per-job summary cards ─────────────────────────────
    var jobMap = {};
    allLog.forEach(e=>{
      if(!jobMap[e.job]) jobMap[e.job]={job:e.job,hours:0,pay:0,sessions:0,task:e.task||'other',lastDate:e.date};
      jobMap[e.job].hours += parseFloat(e.hours)||0;
      jobMap[e.job].pay += parseFloat(e.pay)||0;
      jobMap[e.job].sessions++;
      if(e.date>jobMap[e.job].lastDate) jobMap[e.job].lastDate=e.date;
    });
    var jobList = Object.values(jobMap).sort((a,b)=>b.hours-a.hours);

    // Populate job filter dropdown
    var filterJobEl=document.getElementById('wl-filter-job');
    if(filterJobEl&&filterJobEl.options.length<2){
      jobList.forEach(j=>{var o=document.createElement('option');o.value=j.job;o.textContent=j.job;filterJobEl.appendChild(o);});
    }

    cards.innerHTML = jobList.length ? jobList.map(j=>`
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem;box-shadow:var(--shadow);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:var(--green);border-radius:4px 0 0 4px"></div>
        <div style="padding-left:8px">
          <div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:3px">${TASK_ICONS[j.task]||'🔧'} ${j.task}</div>
          <div style="font-family:'Fraunces',serif;font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:2px">${j.job}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:8px">${j.sessions} shift${j.sessions>1?'s':''} · Last: ${j.lastDate||'—'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;text-align:center">
            <div style="background:var(--blue-pale);border-radius:8px;padding:6px 3px">
              <div style="font-weight:900;color:var(--blue);font-size:.9rem">${j.hours.toFixed(1)}h</div>
              <div style="font-size:.58rem;color:var(--muted)">hours</div>
            </div>
            <div style="background:var(--green-pale);border-radius:8px;padding:6px 3px">
              <div style="font-weight:900;color:var(--green);font-size:.9rem">$${j.pay.toFixed(0)}</div>
              <div style="font-size:.58rem;color:var(--muted)">earned</div>
            </div>
            <div style="background:var(--amber-pale);border-radius:8px;padding:6px 3px">
              <div style="font-weight:900;color:var(--amber);font-size:.9rem">${j.pay&&j.hours?'$'+(j.pay/j.hours).toFixed(2):'-'}</div>
              <div style="font-size:.58rem;color:var(--muted)">/hr</div>
            </div>
          </div>
        </div>
      </div>
    `).join('') : '<p style="color:var(--muted);font-size:.85rem;font-style:italic;padding:.5rem 0">No sessions yet.</p>';

    // ── Type breakdown pills ──────────────────────────────
    var typeMap={};
    allLog.forEach(e=>{var t=e.task||'other';if(!typeMap[t])typeMap[t]=0;typeMap[t]+=parseFloat(e.hours)||0;});
    var typeColors={'yard work':'#52b788','pet care':'#e76f00','cleaning':'#1a5276','babysitting':'#6d28d9','tech help':'#c0392b','other':'#888'};
    var typeBreakEl=document.getElementById('wl-type-breakdown');
    var typeBarEl=document.getElementById('wl-type-bar');
    if(typeBreakEl){typeBreakEl.innerHTML=Object.entries(typeMap).sort((a,b)=>b[1]-a[1]).map(([t,h])=>`
      <div style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:.75rem">
        <span style="width:8px;height:8px;border-radius:50%;background:${typeColors[t]||'#888'};flex-shrink:0"></span>
        <span style="font-weight:700;color:var(--text)">${TASK_ICONS[t]||'🔧'} ${t}</span>
        <span style="color:var(--muted)">${h.toFixed(1)}h</span>
      </div>`).join('');}
    if(typeBarEl&&totalHours>0){typeBarEl.innerHTML=Object.entries(typeMap).map(([t,h])=>
      `<div style="flex:${h/totalHours};background:${typeColors[t]||'#888'};min-width:4px" title="${t}: ${h.toFixed(1)}h"></div>`).join('');}

    // ── Sessions list ─────────────────────────────────────
    var SHOW_LIMIT=8;
    var shown=wlShowAll?log:log.slice(0,SHOW_LIMIT);
    var moreWrap=document.getElementById('wl-load-more-wrap');
    if(moreWrap)moreWrap.style.display=(log.length>SHOW_LIMIT&&!wlShowAll)?'block':'none';

    list.innerHTML = shown.length ? shown.map(e=>`
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:11px 4px;border-bottom:1px solid var(--border);gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <div style="font-size:1.2rem;flex-shrink:0">${TASK_ICONS[e.task]||'🔧'}</div>
          <div style="min-width:0">
            <div style="font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.job}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:1px">${e.date||''} · <strong>${e.hours}h</strong>${e.pay?' · <strong style="color:var(--green)">$'+parseFloat(e.pay).toFixed(2)+'</strong>':''}${e.notes?' · <em>'+e.notes+'</em>':''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-weight:700;color:var(--blue);font-size:.85rem;white-space:nowrap">${e.hours}h</span>
          <button onclick="deleteWorkLogEntry(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.85rem;padding:2px 4px">🗑️</button>
        </div>
      </div>
    `).join('') : `<p style="color:var(--muted);font-size:.85rem;font-style:italic">No matching sessions.</p>`;
  }

  // Export CSV
  window.exportWorkLogCSV = function(){
    var log=getWorkLog();
    if(!log.length){showToast('No hours logged yet','warning');return;}
    var csv='Date,Employer,Task,Hours,Pay,Notes\n'+log.map(e=>[e.date,'"'+e.job+'"',e.task||'other',e.hours,e.pay||0,'"'+(e.notes||'')+'"'].join(',')).join('\n');
    var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='teenwork-hours.csv';a.click();showToast('Hours exported as CSV ✓','success');
  };

  const _orig = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_orig) _orig(btn, panelId);
    if(panelId==='ttab-worklog') setTimeout(renderWorkLogTab, 80);
  };
  window.renderWorkLogTab = renderWorkLogTab;
  window.openAddWorkLogModal = window.openAddWorkLogModal;
})();

// ═══════════════════════════════════════════════════════
//  EMPLOYER: SKILL ENDORSEMENTS + FORMAL REVIEW SUBMIT
// ═══════════════════════════════════════════════════════
(function(){
  const SKILL_OPTIONS = [
    'Punctual','Reliable','Hard Worker','Great Attitude','Self-Starter',
    'Communicates Well','Follows Instructions','Respectful','Detail-Oriented',
    'Fast Learner','Trustworthy','Team Player','Problem Solver','Creative'
  ];

  function getEndorsements(teen){ try{ return JSON.parse(localStorage.getItem('tw_endorsements_'+teen)||'{}'); }catch(e){ return {}; } }
  function saveEndorsements(teen,d){ try{ localStorage.setItem('tw_endorsements_'+teen,JSON.stringify(d)); }catch(e){} }
  function getReviews(teen){ try{ return JSON.parse(localStorage.getItem('tw_reviews_'+teen)||'[]'); }catch(e){ return []; } }
  function saveReviews(teen,d){ try{ localStorage.setItem('tw_reviews_'+teen,JSON.stringify(d)); }catch(e){} }

  // Current employer id (demo)
  function empId(){ return window.currentUser?.email || window.currentUser?.name || 'employer_demo'; }
  function currentTeen(){ return window._state?.activeWorker || 'Alex Johnson'; }

  let _revStar = 0;
  let _rehire = null;

  window.setRevStar = function(v){
    _revStar = v;
    document.querySelectorAll('.rev-star').forEach(s=>{
      const sv = parseInt(s.dataset.v);
      s.textContent = sv <= v ? '⭐' : '☆';
      s.style.transform = sv === v ? 'scale(1.3)' : 'scale(1)';
    });
    const labels = ['','Poor','Fair','Good','Great','Excellent!'];
    const lbl = document.getElementById('rev-star-label');
    if(lbl) lbl.textContent = labels[v] || '';
  };

  window.setRehire = function(val){
    _rehire = val;
    const yes = document.getElementById('rehire-yes');
    const no  = document.getElementById('rehire-no');
    if(yes && no){
      yes.style.background = val ? 'var(--green)' : 'var(--green-pale)';
      yes.style.color = val ? '#fff' : 'var(--green)';
      no.style.background = !val ? '#dc2626' : 'var(--bg)';
      no.style.color = !val ? '#fff' : 'var(--muted)';
    }
  };

  window.submitEmployerReview = function(){
    const teen = currentTeen();
    const title = document.getElementById('rev-job-title')?.value.trim();
    const text  = document.getElementById('rev-text')?.value.trim();
    const anon  = document.getElementById('rev-anon')?.checked;
    const alert = document.getElementById('rev-submit-alert');

    if(!_revStar){ if(alert){ alert.textContent='Please select a star rating.'; alert.className='alert alert-warn'; alert.style.display='block'; } return; }
    if(!text || text.length < 20){ if(alert){ alert.textContent='Please write at least 20 characters in your review.'; alert.className='alert alert-warn'; alert.style.display='block'; } return; }

    const reviews = getReviews(teen);
    reviews.unshift({
      id: Date.now(),
      employer: anon ? 'Anonymous Employer' : (window.currentUser?.name || window.currentUser?.biz || 'An Employer'),
      empId: empId(),
      jobTitle: title || 'General Work',
      stars: _revStar,
      text: text,
      rehire: _rehire,
      date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      anon: anon
    });
    saveReviews(teen, reviews);

    // Reset form
    _revStar = 0; _rehire = null;
    document.querySelectorAll('.rev-star').forEach(s=>{ s.textContent='☆'; s.style.transform='scale(1)'; });
    const lbl = document.getElementById('rev-star-label'); if(lbl) lbl.textContent='Tap to rate';
    if(document.getElementById('rev-job-title')) document.getElementById('rev-job-title').value='';
    if(document.getElementById('rev-text')) document.getElementById('rev-text').value='';
    if(document.getElementById('rev-anon')) document.getElementById('rev-anon').checked=false;
    setRehire(null);
    if(alert){ alert.textContent='✅ Review submitted! It will appear on the teen\'s profile.'; alert.className='alert alert-ok'; alert.style.display='block'; }
    typeof showToast==='function' && showToast('Review saved ✓','success');
    // Re-render existing reviews section
    renderEmpReviewsTab && renderEmpReviewsTab();
    // Refresh teen side too
    renderTeenReferencesTab && renderTeenReferencesTab();
  };

  // Render endorsement chips in employer tab
  window.renderEndorsementChips = function(){
    const teen = currentTeen();
    const endorsements = getEndorsements(teen);
    const myEndorsements = endorsements[empId()] || [];
    const chips = document.getElementById('endorsement-skill-chips');
    const tally = document.getElementById('endorsement-tally');
    const tallyChips = document.getElementById('endorsement-tally-chips');
    const countBadge = document.getElementById('endorsement-count-badge');

    if(!chips) return;
    chips.innerHTML = SKILL_OPTIONS.map(skill=>{
      const endorsed = myEndorsements.includes(skill);
      return `<button onclick="toggleEndorsement('${skill}')" style="
        padding:7px 14px;border-radius:30px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .2s;
        background:${endorsed?'var(--green)':'var(--bg)'};
        color:${endorsed?'#fff':'var(--text)'};
        border:1.5px solid ${endorsed?'var(--green)':'var(--border)'};
        transform:${endorsed?'scale(1.05)':'scale(1)'};
      ">${endorsed?'✓ ':''}${skill}</button>`;
    }).join('');

    if(myEndorsements.length && tally && tallyChips){
      tally.style.display='block';
      tallyChips.innerHTML = myEndorsements.map(s=>`<span style="padding:4px 10px;border-radius:20px;background:var(--green);color:#fff;font-size:.75rem;font-weight:700">${s}</span>`).join('');
    } else if(tally) { tally.style.display='none'; }
    if(countBadge) countBadge.textContent = myEndorsements.length + ' Endorsed';
  };

  window.toggleEndorsement = function(skill){
    const teen = currentTeen();
    const endorsements = getEndorsements(teen);
    const myList = endorsements[empId()] || [];
    const idx = myList.indexOf(skill);
    if(idx >= 0) myList.splice(idx,1); else myList.push(skill);
    endorsements[empId()] = myList;
    saveEndorsements(teen, endorsements);
    renderEndorsementChips();
    renderTeenReferencesTab && renderTeenReferencesTab();
    typeof showToast==='function' && showToast(idx>=0?`Removed "${skill}" endorsement`:`Endorsed "${skill}" ✓`,'success');
  };

  // Patch switchDashTab to render chips when opening etab-reviews
  const _origErev = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_origErev) _origErev(btn, panelId);
    if(panelId==='etab-reviews') setTimeout(renderEndorsementChips, 100);
  };
  // Also render on page load if already on that tab
  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(renderEndorsementChips, 500); });

  // Expose helpers for teen side
  window._getReviewsForTeen = getReviews;
  window._getEndorsementsForTeen = getEndorsements;
})();

// ═══════════════════════════════════════════════════════
//  TEEN: REFERENCES TAB (show reviews + endorsements)
// ═══════════════════════════════════════════════════════
(function(){
  function renderTeenReferencesTab(){
    const teenName = window._state?.user?.name || window.currentUser?.name || 'Alex Johnson';
    const reviews = (window._getReviewsForTeen||function(){ return []; })(teenName);
    const endorsements = (window._getEndorsementsForTeen||function(){ return {}; })(teenName);

    // Aggregate all endorsements across employers
    const skillCounts = {};
    Object.values(endorsements).forEach(empSkills=>{
      (empSkills||[]).forEach(s=>{ skillCounts[s] = (skillCounts[s]||0)+1; });
    });
    const sortedSkills = Object.entries(skillCounts).sort((a,b)=>b[1]-a[1]);
    const totalEndorsements = Object.values(skillCounts).reduce((a,b)=>a+b, 0);

    const endEl = document.getElementById('teen-endorsement-display');
    const endTotal = document.getElementById('teen-endorsement-total');
    const revList = document.getElementById('teen-reviews-list');
    const refsBadge = document.getElementById('teen-refs-badge');

    if(endEl){
      if(sortedSkills.length){
        endEl.innerHTML = sortedSkills.map(([skill,count])=>`
          <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:24px;background:var(--green);color:#fff;font-size:.82rem;font-weight:700">
            ${skill} <span style="background:rgba(255,255,255,.25);border-radius:12px;padding:1px 7px;font-size:.72rem">${count}</span>
          </div>`).join('');
      } else {
        endEl.innerHTML = '<p style="color:var(--muted);font-size:.84rem;font-style:italic">No endorsements yet. Complete a job and ask your employer to endorse your skills!</p>';
      }
    }
    if(endTotal) endTotal.textContent = totalEndorsements + ' endorsements';

    if(revList){
      if(reviews.length){
        revList.innerHTML = reviews.map(r=>{
          const stars = '⭐'.repeat(r.stars) + '☆'.repeat(5-r.stars);
          const rehireTag = r.rehire===true ? '<span style="background:var(--green-pale);color:var(--green);border:1px solid var(--green-light);border-radius:20px;padding:2px 9px;font-size:.72rem;font-weight:700">👍 Would Hire Again</span>'
                          : r.rehire===false ? '<span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:20px;padding:2px 9px;font-size:.72rem;font-weight:700">👎 Wouldn\'t Hire Again</span>'
                          : '';
          return `<div style="padding:1rem;border-bottom:1px solid var(--border);last-child{border-bottom:none}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;margin-bottom:.5rem">
              <div>
                <div style="font-weight:700;font-size:.9rem;color:var(--text)">${r.employer||'Employer'}</div>
                <div style="font-size:.75rem;color:var(--muted)">${r.jobTitle||'Job'} · ${r.date||''}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <span style="font-size:1rem">${stars}</span>
                ${rehireTag}
              </div>
            </div>
            <p style="font-size:.85rem;color:var(--text);line-height:1.55;margin:0">${r.text||''}</p>
          </div>`;
        }).join('');
      } else {
        revList.innerHTML = '<p style="color:var(--muted);font-size:.85rem;font-style:italic;padding:.5rem">No reviews yet. Complete jobs and employers will be able to leave you reviews here.</p>';
      }
    }

    const avgStars = reviews.length ? (reviews.reduce((s,r)=>s+r.stars,0)/reviews.length).toFixed(1) : null;
    if(refsBadge) refsBadge.textContent = reviews.length + ' Review' + (reviews.length!==1?'s':'') + (avgStars ? ` · ${avgStars}⭐` : '');
  }

  window.renderTeenReferencesTab = renderTeenReferencesTab;

  const _origRef = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_origRef) _origRef(btn, panelId);
    if(panelId==='ttab-references') setTimeout(renderTeenReferencesTab, 80);
  };
})();

// ═══════════════════════════════════════════════════════
//  FIRST JOB GUIDED CHECKLIST
// ═══════════════════════════════════════════════════════
(function(){
  const CHECKLIST = [
    { section:'📋 Before You Apply', color:'var(--blue)', items:[
      { id:'fj1', text:'Complete your TeenWork profile (photo, bio, skills)' },
      { id:'fj2', text:'Add at least one portfolio project' },
      { id:'fj3', text:'Complete at least 2 lessons in the Lessons tab' },
      { id:'fj4', text:'Ask a parent or guardian to approve your account' },
    ]},
    { section:'🤝 Before Your First Day', color:'var(--green)', items:[
      { id:'fj5', text:'Confirm your job details with your employer (time, location, pay)' },
      { id:'fj6', text:'Prepare your supplies or equipment (tools, uniform, etc.)' },
      { id:'fj7', text:"Plan your route to the job — know how you're getting there" },
      { id:'fj8', text:'Set an alarm and plan to arrive 5 minutes early' },
      { id:'fj9', text:'Tell your parent/guardian the job address and employer contact' },
    ]},
    { section:'⭐ During the Job', color:'var(--amber)', items:[
      { id:'fj10', text:'Introduce yourself professionally to your employer' },
      { id:'fj11', text:"Ask questions if you're unsure about something — don't guess" },
      { id:'fj12', text:'Stay off your phone unless asked' },
      { id:'fj13', text:'Do the job to the best of your ability — go above and beyond' },
      { id:'fj14', text:'Log your hours in the Work Log tab when done' },
    ]},
    { section:'🏆 After the Job', color:'var(--purple)', items:[
      { id:'fj15', text:'Confirm payment with your employer and log it in Earnings' },
      { id:'fj16', text:'Ask for a review or endorsement on TeenWork' },
      { id:'fj17', text:'Send a thank-you message through the TeenWork chat' },
      { id:'fj18', text:'Reflect: What did you do well? What would you do better next time?' },
    ]},
  ];

  const TOTAL = CHECKLIST.reduce((n,s)=>n+s.items.length, 0);
  const MILESTONES = [
    [0,'Start checking things off — you\'ve got this! 🚀'],
    [25,'Great start! Keep the momentum going 💪'],
    [50,'Halfway there! You\'re crushing it 🔥'],
    [75,'Almost done! A few more to go ⚡'],
    [100,'All done! You\'re a TeenWork pro 🎉🏆'],
  ];

  // v44: checks are saved to the signed-in account (_DB row "first_job_checklist": device cache + cloud user_data; demo logins keep them for the session)
  const FJ_IDS = new Set(CHECKLIST.flatMap(s=>s.items.map(i=>i.id)));
  function getChecked(){ try{ const v = window._DB ? _DB.load('first_job_checklist', []) : JSON.parse(localStorage.getItem('tw_firstjob')||'[]'); return Array.isArray(v) ? [...new Set(v)].filter(id=>FJ_IDS.has(id)) : []; }catch(e){ return []; } }
  function saveChecked(d){ try{ if(window._DB) _DB.save('first_job_checklist', d); else localStorage.setItem('tw_firstjob',JSON.stringify(d)); }catch(e){} }

  function renderFirstJobChecklist(){
    const container = document.getElementById('firstjob-sections');
    const bar = document.getElementById('firstjob-bar');
    const pct = document.getElementById('firstjob-pct');
    const badge = document.getElementById('firstjob-progress-badge');
    const milestone = document.getElementById('firstjob-milestone');
    if(!container) return;

    const checked = getChecked();
    const doneCount = checked.length;
    const percent = Math.round(doneCount / TOTAL * 100);

    if(bar) bar.style.width = percent + '%';
    if(pct) pct.textContent = percent + '%';
    if(badge) badge.textContent = doneCount + ' / ' + TOTAL + ' done';
    if(milestone){
      const msg = [...MILESTONES].reverse().find(([p])=>percent>=p);
      milestone.textContent = msg ? msg[1] : '';
    }

    container.innerHTML = CHECKLIST.map(section=>`
      <div class="panel" style="margin-bottom:1.2rem">
        <div class="panel-head" style="background:var(--card);border-bottom:2px solid ${section.color}">
          <h2 style="color:${section.color}">${section.section}</h2>
          <span class="badge" style="background:${section.color};color:#fff">${section.items.filter(i=>checked.includes(i.id)).length}/${section.items.length}</span>
        </div>
        <div class="panel-body" style="padding:.75rem 1rem">
          ${section.items.map(item=>{
            const done = checked.includes(item.id);
            return `<div onclick="toggleFirstJobItem('${item.id}')" style="display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:10px;cursor:pointer;transition:background .15s;margin-bottom:4px;background:${done?'var(--green-pale)':'var(--bg)'}">
              <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${done?'var(--green)':'var(--border)'};background:${done?'var(--green)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s">
                ${done?'<span style="color:#fff;font-size:.85rem;font-weight:900">✓</span>':''}
              </div>
              <span style="font-size:.88rem;color:${done?'var(--green)':'var(--text)'};font-weight:${done?'600':'400'};text-decoration:${done?'line-through':'none'};line-height:1.4">${item.text}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  window.toggleFirstJobItem = function(id){
    const checked = getChecked();
    const idx = checked.indexOf(id);
    if(idx>=0) checked.splice(idx,1); else checked.push(id);
    saveChecked(checked);
    renderFirstJobChecklist();
    // Award badge for completing all
    if(checked.length === TOTAL){
      typeof showToast==='function' && showToast('🎉 First Job Checklist complete! Amazing work!','success');
    }
  };

  window.renderFirstJobChecklist = renderFirstJobChecklist;
  const _origFJ = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_origFJ) _origFJ(btn, panelId);
    if(panelId==='ttab-firstjob') setTimeout(renderFirstJobChecklist, 80);
  };
})();

// ═══════════════════════════════════════════════════════
//  EMPLOYER KANBAN PIPELINE
// ═══════════════════════════════════════════════════════
(function(){

  // Pipeline state: each applicant gets a stage
  const STAGES = ['applied','reviewed','met','hired'];
  let _pipeline = {};   // idx → stage
  let _dragging = null;

  function getPipeline(){
    try{ return JSON.parse(localStorage.getItem('tw_emp_pipeline')||'{}'); }catch(e){ return {}; }
  }
  function savePipeline(p){ try{ localStorage.setItem('tw_emp_pipeline',JSON.stringify(p)); }catch(e){} }

  window.empKanbanDragOver = function(e, stage){
    e.preventDefault();
    const col = document.getElementById('emp-k-col-'+stage);
    if(col) col.style.background = stage==='applied'?'#dbeafe': stage==='reviewed'?'#ede9fe': stage==='met'?'#fff1e0':'#d8f3dc';
  };

  window.empKanbanDrop = function(e, stage){
    e.preventDefault();
    const col = document.getElementById('emp-k-col-'+stage);
    if(col) col.style.background = '';
    if(_dragging === null) return;
    const p = getPipeline();
    p[_dragging] = stage;
    savePipeline(p);
    renderEmpKanban();
    typeof showToast==='function' && showToast('Moved to '+({applied:'Applied',reviewed:'Reviewed',met:'Met Them',hired:'Hired'}[stage]),'success');
  };

  window.empKanbanMoveCard = function(idx, stage){
    const p = getPipeline();
    p[idx] = stage;
    savePipeline(p);
    renderEmpKanban();
    typeof showToast==='function' && showToast('Moved to '+({applied:'Applied',reviewed:'Reviewed',met:'Met Them',hired:'Hired'}[stage]),'success');
  };

  window.renderEmpKanban = function(){
    if(!document.getElementById('emp-kanban-board')) return;
    const pipeline = getPipeline();
    const search = (document.getElementById('emp-applicant-search')?.value||'').toLowerCase();
    const stageMap = {applied:[],reviewed:[],met:[],hired:[]};

    (typeof demoApplicants!=='undefined' ? demoApplicants : []).forEach((a,idx)=>{
      const stage = pipeline[idx] || 'applied';
      if(search){
        const hay=[a.name,a.city,a.job,...(a.skills||[])].join(' ').toLowerCase();
        if(!hay.includes(search)) return;
      }
      stageMap[stage].push({a,idx});
    });

    STAGES.forEach(stage=>{
      const col = document.getElementById('emp-k-col-'+stage);
      const countEl = document.getElementById('emp-k-count-'+stage);
      if(!col) return;
      const items = stageMap[stage];
      if(countEl) countEl.textContent = items.length;

      // Stage colors
      const colors = {applied:{bg:'#dbeafe',text:'var(--blue)'},reviewed:{bg:'#ede9fe',text:'var(--purple)'},met:{bg:'#fff1e0',text:'var(--amber)'},hired:{bg:'#d8f3dc',text:'var(--green)'}};
      const c = colors[stage];

      if(!items.length){
        col.innerHTML = `<div style="text-align:center;padding:1.5rem .5rem;font-size:.78rem;color:var(--muted);font-style:italic">No applicants here</div>`;
        return;
      }

      col.innerHTML = items.map(({a,idx})=>{
        const nextStage = STAGES[STAGES.indexOf(stage)+1];
        const stageLabels = {applied:'Applied',reviewed:'Reviewed',met:'Met Them',hired:'Hired'};
        return `<div draggable="true"
          ondragstart="window._kDragging=${idx}"
          ondragend="window._kDragging=null"
          style="background:#fff;border:1.5px solid ${c.bg};border-radius:10px;padding:10px 11px;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:box-shadow .15s"
          onmouseenter="this.style.boxShadow='0 4px 14px rgba(0,0,0,.1)'"
          onmouseleave="this.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'">
          <div style="font-weight:700;font-size:.88rem;margin-bottom:2px">${a.name}</div>
          <div style="font-size:.74rem;color:var(--muted);margin-bottom:5px">Age ${a.age} · ${a.city}</div>
          <div style="font-size:.72rem;color:${c.text};font-weight:600;margin-bottom:6px">${a.job}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px">${(a.skills||[]).slice(0,2).map(s=>`<span style="background:${c.bg};color:${c.text};font-size:.66rem;font-weight:700;padding:2px 7px;border-radius:10px">${s}</span>`).join('')}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn-sm btn-msg" onclick="openMsgModal('${a.name}','teen')" style="font-size:.7rem;padding:4px 8px">💬</button>
            ${nextStage ? `<button class="btn-sm" onclick="empKanbanMoveCard(${idx},'${nextStage}')" style="font-size:.7rem;padding:4px 8px;background:${c.bg};color:${c.text};border-color:${c.bg}">→ ${stageLabels[nextStage]}</button>` : ''}
            <button class="btn-sm btn-ai" onclick="openAI('An employer is reviewing teen applicant ${a.name} (age ${a.age}) from ${a.city} for: ${a.job}. Skills: ${(a.skills||[]).join(', ')}. Rating: ${a.rating}/5. Write a 3-sentence candidate assessment.')" style="font-size:.7rem;padding:4px 8px">🤖</button>
          </div>
        </div>`;
      }).join('');
    });

    // Update new badge
    const newCount = stageMap['applied'].length;
    const badge = document.getElementById('emp-pipeline-new-badge');
    if(badge) badge.textContent = newCount+' New';
  };

  // Wire dragstart/dragend via event delegation
  document.addEventListener('dragstart', function(e){
    const idx = e.target.closest('[draggable]')?.getAttribute('data-kidx');
    // idx set inline via ondragstart
  });

  // Patch switchDashTab
  const _origKanban = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_origKanban) _origKanban(btn, panelId);
    if(panelId==='etab-applicants') setTimeout(renderEmpKanban, 80);
    if(panelId==='etab-analytics') setTimeout(renderEmpAnalytics, 80);
    if(panelId==='etab-profile') setTimeout(renderEmpProfileReviews, 80);
    if(panelId==='etab-bulkmsg') setTimeout(function(){ empBulkFilter('all'); }, 80);
  };

  window.renderEmpKanban = renderEmpKanban;
})();

// ═══════════════════════════════════════════════════════
//  BULK MESSAGE
// ═══════════════════════════════════════════════════════
(function(){
  let _bulkSelected = [];

  const TEMPLATES = {
    job_filled: "Hi everyone, thanks so much for applying! We wanted to let you know that the position has been filled. We appreciate your interest in working with us and hope to have more openings soon. Thanks again!",
    schedule_meet: "Hi! We've reviewed your application and we'd love to meet you. Could you let us know your availability this week or next? We're looking forward to chatting!",
    still_reviewing: "Hi! Just a quick note to let you know we're still reviewing applications and haven't made a decision yet. We appreciate your patience and will be in touch soon.",
    thank_you: "Hi! We just wanted to say thank you for taking the time to apply. We received some great applications and are grateful for your interest. We'll be reaching out as decisions are made!"
  };

  window.empBulkFilter = function(stage){
    const pipeline = (function(){ try{ return JSON.parse(localStorage.getItem('tw_emp_pipeline')||'{}'); }catch(e){ return {}; } })();
    const all = typeof demoApplicants !== 'undefined' ? demoApplicants : [];

    // Update button styles
    ['all','applied','reviewed','met','hired'].forEach(s=>{
      const btn = document.getElementById('empbf-'+s);
      if(!btn) return;
      btn.style.background = s===stage ? 'var(--green)' : '';
      btn.style.color = s===stage ? '#fff' : '';
      btn.style.borderColor = s===stage ? 'var(--green)' : '';
      if(s==='all'&&stage==='all'){ btn.className = 'btn-sm btn-primary'; }
      else if(s==='all'){ btn.className='btn-sm'; btn.style.background=''; btn.style.color=''; btn.style.borderColor=''; }
    });

    _bulkSelected = all
      .map((a,i)=>({a,i}))
      .filter(({i})=> stage==='all' || (pipeline[i]||'applied')===stage)
      .map(({a,i})=>({name:a.name,idx:i}));

    const listEl = document.getElementById('emp-bulk-recipient-list');
    const badge = document.getElementById('emp-bulk-count-badge');
    if(badge) badge.textContent = _bulkSelected.length+' selected';
    if(listEl){
      listEl.innerHTML = _bulkSelected.length
        ? _bulkSelected.map(({name})=>`<span style="background:var(--blue-pale);color:var(--blue);font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">${name}</span>`).join('')
        : '<span style="font-size:.8rem;color:var(--muted);font-style:italic">No applicants in this stage</span>';
    }
  };

  window.empBulkTemplate = function(key){
    const ta = document.getElementById('emp-bulk-msg-text');
    if(ta) ta.value = TEMPLATES[key] || '';
  };

  window.empBulkAIDraft = function(){
    const ta = document.getElementById('emp-bulk-msg-text');
    if(!ta) return;
    ta.value = 'Drafting with AI…';
    const stageCtx = _bulkSelected.length + ' applicants';
    if(typeof openAI === 'function'){
      openAI('Write a short, warm, professional bulk message from a local employer to '+stageCtx+' who applied for teen jobs. Keep it under 60 words, friendly, and encouraging.');
    }
    setTimeout(()=>{ if(ta.value==='Drafting with AI…') ta.value="Hi everyone! Thanks so much for applying. We're reviewing all applications and will be in touch soon. We really appreciate your interest!"; }, 2000);
  };

  window.empBulkSend = function(){
    const msg = (document.getElementById('emp-bulk-msg-text')?.value||'').trim();
    const alertEl = document.getElementById('emp-bulk-send-alert');
    if(!msg){ if(alertEl){alertEl.className='alert alert-error';alertEl.textContent='Please write a message first.';alertEl.style.display='';} return; }
    if(!_bulkSelected.length){ if(alertEl){alertEl.className='alert alert-error';alertEl.textContent='No recipients selected.';alertEl.style.display='';} return; }
    if(alertEl){ alertEl.className='alert alert-success'; alertEl.textContent='✅ Message sent to '+_bulkSelected.length+' applicant'+((_bulkSelected.length>1)?'s':'')+' — all messages are safety-filtered.'; alertEl.style.display=''; }
    if(typeof showToast==='function') showToast('📣 Bulk message sent to '+_bulkSelected.length+' applicants','success');
    document.getElementById('emp-bulk-msg-text').value = '';
  };
})();

// ═══════════════════════════════════════════════════════
//  JOB ANALYTICS
// ═══════════════════════════════════════════════════════
(function(){
  const DEMO_ANALYTICS = [
    { title:'Lawn Mowing & Yard Cleanup', views:112, apps:8, conv:7.1, hired:1, avgDays:1.2, active:true },
    { title:'Pet Sitting – 3 afternoons/wk', views:79, apps:6, conv:7.6, hired:1, avgDays:0.9, active:true },
    { title:'House Cleaning Help', views:56, apps:4, conv:7.1, hired:0, avgDays:2.1, active:false },
  ];

  window.renderEmpAnalytics = function(){
    const table = document.getElementById('emp-analytics-table');
    const funnel = document.getElementById('emp-analytics-funnel');
    if(!table) return;

    // Per-job table
    table.innerHTML = `<div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.84rem">
        <thead>
          <tr style="background:var(--bg)">
            <th style="text-align:left;padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)">Job</th>
            <th style="padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74px;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border);text-align:center">Views</th>
            <th style="padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border);text-align:center">Applied</th>
            <th style="padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border);text-align:center">Conv%</th>
            <th style="padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border);text-align:center">Hired</th>
            <th style="padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border);text-align:center">Status</th>
            <th style="padding:9px 12px;border-bottom:2px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody>
          ${DEMO_ANALYTICS.map(j=>`
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 12px;font-weight:600">${j.title}</td>
              <td style="padding:10px 12px;text-align:center;font-family:'Fraunces',serif;font-weight:700;color:var(--blue)">${j.views}</td>
              <td style="padding:10px 12px;text-align:center;font-family:'Fraunces',serif;font-weight:700;color:var(--amber)">${j.apps}</td>
              <td style="padding:10px 12px;text-align:center">
                <span style="background:${j.conv>7?'var(--green-pale)':'var(--amber-pale)'};color:${j.conv>7?'var(--green)':'var(--amber)'};font-size:.78rem;font-weight:700;padding:3px 8px;border-radius:10px">${j.conv}%</span>
              </td>
              <td style="padding:10px 12px;text-align:center;font-family:'Fraunces',serif;font-weight:700;color:var(--green)">${j.hired}</td>
              <td style="padding:10px 12px;text-align:center">
                <span style="background:${j.active?'var(--green-pale)':'var(--bg)'};color:${j.active?'var(--green)':'var(--muted)'};font-size:.74rem;font-weight:700;padding:3px 8px;border-radius:10px;border:1px solid ${j.active?'var(--green-light)':'var(--border)'}">${j.active?'Active':'Closed'}</span>
              </td>
              <td style="padding:10px 12px;text-align:right">
                ${!j.active?`<button class="btn-sm" onclick="repostJobByTitle('${j.title.replace(/'/g,"\\'")}',this)" style="font-size:.74rem;padding:4px 10px;background:var(--blue-pale);color:var(--blue);border-color:var(--blue-pale)">🔁 Repost</button>`:''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    // Funnel
    if(!funnel) return;
    const totViews=DEMO_ANALYTICS.reduce((s,j)=>s+j.views,0);
    const totApps=DEMO_ANALYTICS.reduce((s,j)=>s+j.apps,0);
    const pipeline = (function(){ try{ return JSON.parse(localStorage.getItem('tw_emp_pipeline')||'{}'); }catch(e){ return {}; } })();
    const all = typeof demoApplicants!=='undefined' ? demoApplicants : [];
    const reviewed = all.filter((_,i)=>['reviewed','met','hired'].includes(pipeline[i]||'applied')).length;
    const met = all.filter((_,i)=>['met','hired'].includes(pipeline[i]||'applied')).length;
    const hired = all.filter((_,i)=>(pipeline[i]||'applied')==='hired').length;

    const bars = [
      {label:'Views',val:totViews,max:totViews,color:'var(--blue)',pale:'var(--blue-pale)'},
      {label:'Applied',val:totApps,max:totViews,color:'var(--amber)',pale:'var(--amber-pale)'},
      {label:'Reviewed',val:reviewed,max:totViews,color:'var(--purple)',pale:'var(--purple-pale)'},
      {label:'Met Them',val:met,max:totViews,color:'var(--amber)',pale:'var(--amber-pale)'},
      {label:'Hired',val:hired,max:totViews,color:'var(--green)',pale:'var(--green-pale)'},
    ];

    funnel.innerHTML = bars.map(b=>{
      const pct = totViews>0 ? Math.max(4,(b.val/b.max)*100) : 4;
      return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="width:80px;font-size:.8rem;font-weight:600;color:var(--muted);text-align:right;flex-shrink:0">${b.label}</div>
        <div style="flex:1;background:${b.pale};border-radius:6px;height:28px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${b.color};border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;transition:width .5s">
            <span style="font-size:.78rem;font-weight:700;color:#fff">${b.val}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  };

  window.repostJobByTitle = function(title, btn){
    if(btn){ btn.textContent='✅ Reposted!'; btn.style.background='var(--green-pale)'; btn.style.color='var(--green)'; }
    if(typeof showToast==='function') showToast('🔁 "'+title+'" reposted successfully!','success');
  };
})();

// ═══════════════════════════════════════════════════════
//  REPOST JOB (Active Jobs tab)
// ═══════════════════════════════════════════════════════
window.repostJob = function(i){
  const allJobs = [...(typeof demoJobs!=='undefined'?demoJobs:[]), ...(typeof employerPostedJobs!=='undefined'?employerPostedJobs:[])];
  const job = allJobs[i];
  const title = job ? job.title : 'Job #'+(i+1);
  if(typeof showToast==='function') showToast('🔁 "'+title+'" reposted! It\'s now live again.','success');
  // If this was a closed job, mark it active again visually
  const el = document.getElementById('employer-jobs-list');
  if(!el) return;
  const tags = el.querySelectorAll('.tag');
  tags.forEach(t=>{ if(t.textContent.trim()==='Closed') { t.textContent='Active'; t.className='tag status-accepted'; } });
};

// ═══════════════════════════════════════════════════════
//  EMPLOYER PROFILE
// ═══════════════════════════════════════════════════════
(function(){
  const DEMO_TEEN_REVIEWS = [
    { name:'Alex J.', age:16, rating:5, text:'Really great to work for. Always paid on time and told me exactly what to do. I felt respected and safe the whole time.', date:'June 2025', rehire:true },
    { name:'Priya K.', age:15, rating:5, text:'Super flexible with my school schedule. The work was hard but fair and I learned a lot about taking pride in your work.', date:'July 2025', rehire:true },
    { name:'Tyler R.', age:17, rating:4, text:'Good job overall. Communication could be a little faster but the work was straightforward and I always knew what was expected.', date:'Aug 2025', rehire:true },
  ];

  window.empProfileToggleEdit = function(){
    const wrap = document.getElementById('emp-profile-edit-wrap');
    if(!wrap) return;
    wrap.style.display = wrap.style.display==='none' ? '' : 'none';
  };

  window.empProfileSave = function(){
    const name = document.getElementById('emp-edit-name')?.value.trim();
    const about = document.getElementById('emp-edit-about')?.value.trim();
    const expect = document.getElementById('emp-edit-expect')?.value.trim();
    const alertEl = document.getElementById('emp-profile-save-alert');

    if(name){
      const nd = document.getElementById('emp-profile-name-display');
      if(nd) nd.textContent = name;
    }
    if(about){
      const ad = document.getElementById('emp-profile-about-display');
      if(ad) ad.textContent = about;
    }
    if(expect){
      const ed = document.getElementById('emp-profile-expect-display');
      if(ed) ed.querySelector('p').textContent = expect;
    }
    if(alertEl){ alertEl.className='alert alert-success'; alertEl.textContent='✅ Profile saved!'; alertEl.style.display=''; }
    setTimeout(()=>{ empProfileToggleEdit(); }, 1200);
    if(typeof showToast==='function') showToast('Profile updated!','success');
  };

  window.renderEmpProfileReviews = function(){
    const el = document.getElementById('emp-profile-reviews-list');
    const countBadge = document.getElementById('emp-profile-review-count');
    if(!el) return;
    if(countBadge) countBadge.textContent = DEMO_TEEN_REVIEWS.length+' reviews';

    const avg = (DEMO_TEEN_REVIEWS.reduce((s,r)=>s+r.rating,0)/DEMO_TEEN_REVIEWS.length).toFixed(1);
    const ratingBadge = document.getElementById('emp-profile-rating-badge');
    if(ratingBadge) ratingBadge.textContent = '⭐ '+avg+' from teens';

    el.innerHTML = `<div style="display:flex;align-items:center;gap:16px;padding:.75rem 0 1rem;border-bottom:1px solid var(--border);margin-bottom:1rem;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="font-family:'Fraunces',serif;font-size:2.5rem;font-weight:900;color:var(--amber);line-height:1">${avg}</div>
        <div style="font-size:.74rem;color:var(--muted);margin-top:2px">out of 5</div>
      </div>
      <div style="flex:1;min-width:120px">
        ${[5,4,3,2,1].map(n=>{
          const count=DEMO_TEEN_REVIEWS.filter(r=>r.rating===n).length;
          const pct=DEMO_TEEN_REVIEWS.length>0?(count/DEMO_TEEN_REVIEWS.length)*100:0;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:.72rem;font-weight:700;color:var(--muted);width:12px">${n}</span>
            <div style="flex:1;background:var(--bg);border-radius:4px;height:8px">
              <div style="width:${pct}%;height:100%;background:var(--amber);border-radius:4px"></div>
            </div>
            <span style="font-size:.7rem;color:var(--muted);width:10px">${count}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
    ${DEMO_TEEN_REVIEWS.map(r=>`
      <div style="padding:.9rem 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--green-pale);display:flex;align-items:center;justify-content:center;font-size:.9rem">🧑</div>
            <div>
              <div style="font-weight:700;font-size:.88rem">${r.name} · Age ${r.age}</div>
              <div style="font-size:.72rem;color:var(--muted)">${r.date}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:var(--amber);font-size:1rem">${'⭐'.repeat(r.rating)}</span>
            ${r.rehire?'<span style="background:var(--green-pale);color:var(--green);font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:10px">Would work again</span>':''}
          </div>
        </div>
        <p style="font-size:.84rem;color:var(--text);line-height:1.6;font-style:italic">"${r.text}"</p>
      </div>`).join('')}`;
  };
})();


// ═══════════════════════════════════════════════════════
//  TEEN LEADERBOARD
// ═══════════════════════════════════════════════════════
(function(){
  // Demo leaderboard data
  const DEMO_BADGE_LEADERS = [
    { name:'Jordan M.', city:'Beverly, MA', badges:14, hours:38, avatar:'🧑‍💼' },
    { name:'Priya K.',  city:'Salem, MA',   badges:11, hours:52, avatar:'👩‍💼' },
    { name:'Tyler R.',  city:'Lynn, MA',    badges:9,  hours:27, avatar:'🧑' },
    { name:'Sofia L.',  city:'Peabody, MA', badges:8,  hours:61, avatar:'👩' },
    { name:'Nate W.',   city:'Danvers, MA', badges:7,  hours:33, avatar:'🧑‍🎤' },
    { name:'Amara J.',  city:'Beverly, MA', badges:6,  hours:44, avatar:'👩‍🎤' },
    { name:'Caleb T.',  city:'Salem, MA',   badges:5,  hours:19, avatar:'🧑‍🏫' },
    { name:'Zoe P.',    city:'Lynn, MA',    badges:4,  hours:28, avatar:'👩‍🏫' },
  ];

  function getOpts(){ try{ return JSON.parse(localStorage.getItem('tw_lb_opts')||'{}'); }catch(e){ return {}; } }
  function saveOpts(d){ try{ localStorage.setItem('tw_lb_opts',JSON.stringify(d)); }catch(e){} }

  function getMyStats(){
    // Pull real stats from existing app state
    const badges = document.querySelectorAll('#earned-badges-grid .badge-card, #earned-badges-grid [class*="badge-card"]').length ||
                   (typeof window._earnedBadgeCount !== 'undefined' ? window._earnedBadgeCount : 0);
    const worklog = (()=>{ try{ return JSON.parse(localStorage.getItem('tw_worklog')||'[]'); }catch(e){ return []; } })();
    const hours = worklog.reduce((s,e)=>s+(parseFloat(e.hours)||0), 0);
    return { badges, hours: Math.round(hours*10)/10 };
  }

  window.leaderboardOptToggle = function(type, checked){
    const opts = getOpts();
    opts[type] = checked;
    saveOpts(opts);
    renderLeaderboard();
    typeof showToast==='function' && showToast(checked ? `You're now on the ${type} leaderboard!` : `Removed from ${type} leaderboard`,'success');
  };

  window.switchLeaderboardTab = function(tab){
    const bp = document.getElementById('leaderboard-badges-panel');
    const hp = document.getElementById('leaderboard-hours-panel');
    const bb = document.getElementById('lbtab-badges-btn');
    const hb = document.getElementById('lbtab-hours-btn');
    if(tab==='badges'){
      if(bp) bp.style.display=''; if(hp) hp.style.display='none';
      if(bb){ bb.classList.add('active'); } if(hb){ hb.classList.remove('active'); }
    } else {
      if(bp) bp.style.display='none'; if(hp) hp.style.display='';
      if(bb){ bb.classList.remove('active'); } if(hb){ hb.classList.add('active'); }
    }
  };

  function renderLeaderboard(){
    const opts = getOpts();
    const myName = window._state?.user?.name || window.currentUser?.name || 'You';
    const myCity = window._state?.user?.city || 'Your Town';
    const myStats = getMyStats();

    // Update toggle state
    const optBadges = document.getElementById('lb-opt-badges');
    const optHours  = document.getElementById('lb-opt-hours');
    if(optBadges) optBadges.checked = !!opts.badges;
    if(optHours)  optHours.checked  = !!opts.hours;

    // Build badge list
    let badgeList = [...DEMO_BADGE_LEADERS].sort((a,b)=>b.badges-a.badges);
    if(opts.badges){
      const myEntry = { name: myName+' (You)', city: myCity, badges: myStats.badges, hours: myStats.hours, avatar:'😎', isMe:true };
      badgeList.push(myEntry);
      badgeList.sort((a,b)=>b.badges-a.badges);
    }

    // Build hours list
    let hoursList = [...DEMO_BADGE_LEADERS].sort((a,b)=>b.hours-a.hours);
    if(opts.hours){
      const myEntry = { name: myName+' (You)', city: myCity, badges: myStats.badges, hours: myStats.hours, avatar:'😎', isMe:true };
      hoursList.push(myEntry);
      hoursList.sort((a,b)=>b.hours-a.hours);
    }

    function makeRow(entry, rank, metric, unit){
      const medals = ['🥇','🥈','🥉'];
      const medal = medals[rank] || `<span style="font-weight:700;color:var(--muted);font-size:.85rem">#${rank+1}</span>`;
      return `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;background:${entry.isMe?'var(--amber-pale)':'var(--bg)'};border:${entry.isMe?'1.5px solid var(--amber)':'1.5px solid transparent'};margin-bottom:6px">
        <div style="font-size:1.3rem;width:28px;text-align:center">${medal}</div>
        <div style="font-size:1.4rem">${entry.avatar}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.88rem;color:${entry.isMe?'var(--amber)':'var(--text)'}">${entry.name}</div>
          <div style="font-size:.72rem;color:var(--muted)">${entry.city}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:900;color:${entry.isMe?'var(--amber)':'var(--text)'}">${metric}</div>
          <div style="font-size:.68rem;color:var(--muted)">${unit}</div>
        </div>
      </div>`;
    }

    const blEl = document.getElementById('lb-badges-list');
    if(blEl) blEl.innerHTML = badgeList.slice(0,10).map((e,i)=>makeRow(e,i,e.badges,'badges')).join('') +
      (!opts.badges ? '<div style="margin-top:.75rem;padding:.75rem;background:var(--amber-pale);border-radius:10px;font-size:.82rem;color:var(--amber);text-align:center">Opt in above to appear on this leaderboard!</div>' : '');

    const hlEl = document.getElementById('lb-hours-list');
    if(hlEl) hlEl.innerHTML = hoursList.slice(0,10).map((e,i)=>makeRow(e,i,e.hours+'h','hours worked')).join('') +
      (!opts.hours ? '<div style="margin-top:.75rem;padding:.75rem;background:var(--blue-pale);border-radius:10px;font-size:.82rem;color:var(--blue);text-align:center">Opt in above to appear on this leaderboard!</div>' : '');
  }

  window.renderLeaderboard = renderLeaderboard;
  const _origLB = window.switchDashTab;
  window.switchDashTab = function(btn, panelId){
    if(_origLB) _origLB(btn, panelId);
    if(panelId==='ttab-leaderboard') setTimeout(renderLeaderboard, 80);
  };
})();


