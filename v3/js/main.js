// v3/js/main.js  — with Preview mode + calendar-days-left line
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
  plural,
  toKey
} from './state.js';
import { openSettings, wireSettings } from './settings.js';
import { oneDay, parseISO } from './utils.js';

const $ = (s) => document.querySelector(s);

// Track an optional preview date (midnight). Null means "use today".
let baseDateOverride = null;

/* ---------------------------------------------
   Helpers
----------------------------------------------*/

// Calendar days left (weekends + holidays), excluding the base day, inclusive of LAST_DAY
function calendarDaysLeftExclBase(baseDay = new Date()) {
  const d0 = new Date(baseDay);
  d0.setHours(0, 0, 0, 0);
  const start = new Date(+d0 + oneDay); // start tomorrow
  if (start > LAST_DAY) return 0;
  return Math.floor((+LAST_DAY - +start) / oneDay) + 1; // inclusive of LAST_DAY
}

function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/* ---------------------------------------------
   Render
----------------------------------------------*/
function render() {
  const realNow = new Date();
  realNow.setSeconds(0, 0);

  // Base day = selected preview date (midnight) or today (midnight)
  const baseDay = baseDateOverride
    ? new Date(baseDateOverride)
    : new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate());

  baseDay.setHours(0, 0, 0, 0);

  const isPreview = !sameYMD(baseDay, new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate()));

  // refNow is used for chip coloring; for preview we pin to midnight so no chips look "past/now"
  const refNow = isPreview ? new Date(baseDay) : realNow;

  // Core metrics
  const daysExcl = fullDaysAfterToday(baseDay);

  // Period metric:
  //  - Today: "periods left today"
  //  - Preview: "periods that occur on that day" (count of included periods)
  let periodsMetric = 0;
  if (isPreview) {
    periodsMetric = chipsForToday(refNow).length; // how many periods on that day
  } else {
    const isSchoolDay = todayStatus(baseDay)[0] === 'School day';
    periodsMetric = isSchoolDay ? remainingPeriodsToday(realNow) : 0;
  }

  // Big headline
  $('#topline').textContent = `${plural(daysExcl, 'day', 'days')} and ${plural(
    periodsMetric,
    'period',
    'periods'
  )} left`;

  // Small line: calendar days left (weekends + holidays)
  const calLeft = calendarDaysLeftExclBase(baseDay);
  const calEl = document.getElementById('calendarLeft');
  if (calEl) calEl.textContent = `${calLeft} calendar days left`;

  // "Today" / "Selected day"
  const [status] = todayStatus(baseDay);
  const label = isPreview ? 'Selected day' : 'Today';
  $('#today').textContent = `${label}: ${status}  (${isoLong(baseDay)})`;

  // Next break (from base day forward)
  let msg = 'Next break: None — approaching the end of the year';
  const nb = nextBreak(baseDay);
  if (nb) {
    msg =
      nb.start.getTime() === nb.end.getTime()
        ? `Next break: ${nb.label} on ${isoLong(nb.start).replace(/, \d{4}$/, '')}`
        : `Next break: ${isoMD(nb.start)}–${isoMD(nb.end)} (${nb.label})`;
  }
  $('#next').textContent = msg;

  // Period chips for the base day
  const chipsHost = $('#chips');
  chipsHost.innerHTML = '';
  for (const p of chipsForToday(refNow)) {
    const el = document.createElement('span');
    el.className = 'chip';

    // For real today we keep "past/now" highlighting; for preview we show neutral chips.
    if (!isPreview) {
      if (p.endDate.getTime() <= refNow.getTime()) el.classList.add('past');
      else if (p.startDate.getTime() <= refNow.getTime()) el.classList.add('now');
    }

    el.textContent = `${p.label} ${p.startDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })}–${p.endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    chipsHost.appendChild(el);
  }

  // Mode badges (Preview + schedule mode)
  const badges = [];
  if (isPreview) badges.push(`Preview: ${isoLong(baseDay)}`);
  const mode = modeBadgeForDate(baseDay);
  if (mode) badges.push(mode);
  $('#modeRow').innerHTML = badges.map((b) => `<span class="mode-pill">${b}</span>`).join(' ');

  // Year range
  $('#range').textContent = `School year: ${isoLong(FIRST_DAY).replace(
    /, \d{4}$/,
    ''
  )} — ${isoLong(LAST_DAY).replace(/^[A-Za-z]+, /, '')}`;

  // Keep the date input in sync with current mode
  const inp = $('#previewDate');
  if (inp) inp.value = isPreview ? toKey(baseDay) : '';
}

/* ---------------------------------------------
   Wire UI
----------------------------------------------*/
function wire() {
  $('#refreshBtn').addEventListener('click', render);

  $('#copyBtn').addEventListener('click', () => {
    const realToday = new Date();
    realToday.setHours(0, 0, 0, 0);
    const isPreview = !!baseDateOverride;
    const baseDay = isPreview ? new Date(baseDateOverride) : realToday;

    const daysExcl = fullDaysAfterToday(baseDay);
    let periodsMetric = 0;
    if (isPreview) {
      periodsMetric = chipsForToday(new Date(baseDay)).length;
    } else {
      const isSchoolDay = todayStatus(baseDay)[0] === 'School day';
      periodsMetric = isSchoolDay ? remainingPeriodsToday(new Date()) : 0;
    }

    const lines = [];
    lines.push(`${daysExcl} days and ${periodsMetric} periods left`);
    lines.push(`${calendarDaysLeftExclBase(baseDay)} calendar days left`);
    const label = isPreview ? 'Selected day' : 'Today';
    lines.push(`${label}: ${todayStatus(baseDay)[0]} (${isoLong(baseDay)})`);
    lines.push($('#next').textContent);
    lines.push($('#range').textContent);
    if (isPreview) lines.push(`(Preview mode: ${isoLong(baseDay)})`);

    navigator.clipboard?.writeText(lines.join('\n'));
  });

  // Settings modal / builder
  wireSettings();

  // Preview controls
  const inp = $('#previewDate');
  const useToday = $('#useTodayBtn');
  if (inp) {
    inp.min = toKey(FIRST_DAY);
    inp.max = toKey(LAST_DAY);
    inp.addEventListener('change', () => {
      if (!inp.value) return;
      baseDateOverride = parseISO(inp.value);
      baseDateOverride.setHours(0, 0, 0, 0);
      render();
    });
  }
  if (useToday) {
    useToday.addEventListener('click', () => {
      baseDateOverride = null;
      if (inp) inp.value = '';
      render();
    });
  }
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
