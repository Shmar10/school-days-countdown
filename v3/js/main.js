import {FIRST_DAY, LAST_DAY, initState, state,
        fullDaysAfterToday, remainingPeriodsToday,
        todayStatus, nextBreak, chipsForToday, modeBadgeForDate,
        isoLong, isoMD, plural} from './state.js';
import {openSettings, closeSettings, wireSettings} from './settings.js';

const $ = s => document.querySelector(s);

function render(){
  const now = new Date(); now.setSeconds(0,0);
  const today = new Date(now); today.setHours(0,0,0,0);

  const daysExcl = fullDaysAfterToday(today);
  const periodsToday = (todayStatus(today)[0] === 'School day') ? remainingPeriodsToday(now) : 0;
  $('#topline').textContent = `${plural(daysExcl,'day','days')} and ${plural(periodsToday,'period','periods')} left`;

  const [status] = todayStatus(today);
  $('#today').textContent = `Today: ${status}  (${isoLong(today)})`;

  let msg = "Next break: None — approaching the end of the year";
  const nb = nextBreak(today);
  if (nb){
    msg = (nb.start.getTime()===nb.end.getTime())
      ? `Next break: ${nb.label} on ${isoLong(nb.start).replace(/, \\d{4}$/,'')}`
      : `Next break: ${isoMD(nb.start)}–${isoMD(nb.end)} (${nb.label})`;
  }
  $('#next').textContent = msg;

  // Chips
  const chips = $('#chips'); chips.innerHTML = '';
  for (const p of chipsForToday(now)){
    const el = document.createElement('span');
    el.className = 'chip';
    if (p.endDate.getTime() <= now.getTime()) el.classList.add('past');
    else if (p.startDate.getTime() <= now.getTime()) el.classList.add('now');
    el.textContent = `${p.label} ${p.startDate.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}–${p.endDate.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`;
    chips.appendChild(el);
  }
  const badge = modeBadgeForDate(today);
  $('#modeRow').innerHTML = badge ? `<span class="mode-pill">${badge}</span>` : '';

  $('#range').textContent = `School year: ${isoLong(FIRST_DAY).replace(/, \\d{4}$/,'')} — ${isoLong(LAST_DAY).replace(/^[A-Za-z]+, /,'')}`;
}

function wire(){
  $('#refreshBtn').addEventListener('click', render);
  $('#copyBtn').addEventListener('click', ()=>{
    const now = new Date(); now.setSeconds(0,0);
    const today = new Date(now); today.setHours(0,0,0,0);
    const daysExcl = fullDaysAfterToday(today);
    const periodsToday = (todayStatus(today)[0] === 'School day') ? remainingPeriodsToday(now) : 0;
    const lines = [];
    lines.push(`${daysExcl} days and ${periodsToday} periods left`);
    lines.push(`Today: ${todayStatus(today)[0]} (${isoLong(today)})`);
    lines.push($('#next').textContent);
    lines.push($('#range').textContent);
    navigator.clipboard?.writeText(lines.join("\n"));
  });

  wireSettings();
}

(async function boot(){
  try{
    await initState();
    wire();
    render();
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    }
  }catch(e){
    console.error(e);
    document.getElementById('topline').textContent = 'Failed to load data.';
  }
})();
