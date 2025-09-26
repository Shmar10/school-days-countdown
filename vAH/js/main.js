// v3/js/main.js
import {
  FIRST_DAY,
  LAST_DAY,
  initState,
  fullDaysAfterToday,
  remainingPeriodsToday,
  todayStatus,
  nextBreak,
  chipsForToday,
  modeBadgeForDate,
  isoLong,
  isoMD,
  plural
} from './state.js';
import { openSettings, wireSettings } from './settings.js';
import { oneDay } from './utils.js';

const $ = (s) => document.querySelector(s);

/* ---------------------------------------------
   Helpers
----------------------------------------------*/

// Calendar days left (weekends + holidays), excluding today, inclusive of LAST_DAY
function calendarDaysLeftExclToday(today = new Date()) {
  const d0 = new Date(today);
  d0.setHours(0, 0, 0, 0);

  const start = new Date(+d0 + oneDay); // tomorrow
  if (start > LAST_DAY) return 0;
  // inclusive of LAST_DAY
  return Math.floor((+LAST_DAY - +start) / oneDay) + 1;
}

/* ---------------------------------------------
   Render
----------------------------------------------*/
function render() {
  const now = new Date();
  now.setSeconds(0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const daysExcl = fullDaysAfterToday(today);
  const isSchoolDay = todayStatus(today)[0] === 'School day';
  const periodsToday = isSchoolDay ? remainingPeriodsToday(now) : 0;

  // Big headline
  $('#topline').textContent = `${plural(daysExcl, 'day', 'days')} and ${plural(
    periodsToday,
    'period',
    'periods'
  )} left`;

  // NEW: small line for calendar days
  const calLeft = calendarDaysLeftExclToday(today);
  const calEl = document.getElementById('calendarLeft');
  if (calEl) calEl.textContent = `${calLeft} calendar days left`;

  // Today status
  const [status] = todayStatus(today);
  $('#today').textContent = `Today: ${status}  (${isoLong(today)})`;

  // Next break
  let msg = 'Next break: None — approaching the end of the year';
  const nb = nextBreak(today);
  if (nb) {
    msg =
      nb.start.getTime() === nb.end.getTime()
        ? `Next break: ${nb.label} on ${isoLong(nb.start).replace(/, \d{4}$/, '')}`
        : `Next break: ${isoMD(nb.start)}–${isoMD(nb.end)} (${nb.label})`;
  }
  $('#next').textContent = msg;

  // Period chips for today
  const chipsHost = $('#chips');
  chipsHost.innerHTML = '';
  for (const p of chipsForToday(now)) {
    const el = document.createElement('span');
    el.className = 'chip';
    if (p.endDate.getTime() <= now.getTime()) el.classList.add('past');
    else if (p.startDate.getTime() <= now.getTime()) el.classList.add('now');

    el.textContent = `${p.label} ${p.startDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })}–${p.endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    chipsHost.appendChild(el);
  }

  // Mode badge (Default / Late Start / 10:10 / Custom)
  const badge = modeBadgeForDate(today);
  $('#modeRow').innerHTML = badge ? `<span class="mode-pill">${badge}</span>` : '';

  // Year range
  $('#range').textContent = `School year: ${isoLong(FIRST_DAY).replace(
    /, \d{4}$/,
    ''
  )} — ${isoLong(LAST_DAY).replace(/^[A-Za-z]+, /, '')}`;
}

/* ---------------------------------------------
   Wire UI
----------------------------------------------*/
function wire() {
  $('#refreshBtn').addEventListener('click', render);

  $('#copyBtn').addEventListener('click', () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const daysExcl = fullDaysAfterToday(today);
    const isSchoolDay = todayStatus(today)[0] === 'School day';
    const periodsToday = isSchoolDay ? remainingPeriodsToday(now) : 0;

    const lines = [];
    lines.push(`${daysExcl} days and ${periodsToday} periods left`);
    lines.push(`${calendarDaysLeftExclToday(today)} calendar days left`); // NEW
    lines.push(`Today: ${todayStatus(today)[0]} (${isoLong(today)})`);
    lines.push($('#next').textContent);
    lines.push($('#range').textContent);

    navigator.clipboard?.writeText(lines.join('\n'));
  });

  // Settings modal / builder
  wireSettings();
}

/* ---------------------------------------------
   Boot
----------------------------------------------*/
(async function boot() {
  try {
    await initState();
    wire();
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch (e) {
    console.error(e);
    document.getElementById('topline').textContent = 'Failed to load data.';
  }
})();
