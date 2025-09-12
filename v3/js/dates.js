import {isoLong, isoMD, parseISO} from './utils.js';
import {FIRST_DAY, LAST_DAY} from './state.js';

const FILES = {
  NON_ATT: 'data/non_attendance.json',
  WEDS:    'data/late_start_wednesdays.json',
  LATE:    'data/late_arrival_1010.json',
  EARLY:   'data/early_release_days.json',
  MARKS:   'data/marking_periods.json',
  PTC:     'data/pt_events.json'
};

const $ = s => document.querySelector(s);

async function get(url){
  try{ const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw 0; return r.json(); }
  catch{ return null; }
}

function addRow(host, left, main, note=''){
  const row = document.createElement('div'); row.className='item';
  if(left){ const t=document.createElement('div'); t.className='tag'; t.textContent=left; row.appendChild(t); }
  const box = document.createElement('div');
  const a = document.createElement('div'); a.className='date'; a.textContent = main; box.appendChild(a);
  if(note){ const b = document.createElement('div'); b.className='note'; b.textContent = note; box.appendChild(b); }
  row.appendChild(box); host.appendChild(row);
}

function rangeText(sISO, eISO){
  if(!sISO || !eISO) return '';
  const s=parseISO(sISO), e=parseISO(eISO);
  return (sISO===eISO) ? isoLong(s) : `${isoMD(s)} – ${isoMD(e)}${s.getFullYear()!==e.getFullYear()?` ${e.getFullYear()}`:''}`;
}

(async function boot(){
  // Summary
  const summary = $('#summary');
  addRow(summary, 'First Day', isoLong(FIRST_DAY));
  addRow(summary, 'Last Day',  isoLong(LAST_DAY));

  // Non-attendance
  const na = await get(FILES.NON_ATT) || [];
  const naHost = $('#na');
  na.forEach(x => addRow(naHost, x.label, rangeText(x.start, x.end)));

  // Late-start Wednesdays
  const weds = (await get(FILES.WEDS) || []).map(parseISO).sort((a,b)=>a-b);
  const wedsHost = $('#weds');
  weds.forEach(d => addRow(wedsHost, '9:40 AM', isoLong(d)));

  // Late arrival 10:10
  const la = (await get(FILES.LATE) || []).map(parseISO).sort((a,b)=>a-b);
  const laHost = $('#late1010');
  la.forEach(d => addRow(laHost, '10:10 AM', isoLong(d)));

  // Early release
  const early = await get(FILES.EARLY) || [];
  const earlyHost = $('#early');
  early.forEach(e => addRow(earlyHost, e.time || 'Dismissal', isoLong(parseISO(e.date)), e.title || ''));

  // Marking periods
  const marks = await get(FILES.MARKS) || [];
  const marksHost = $('#marks');
  marks.forEach(m => addRow(marksHost, m.title, rangeText(m.start, m.end), m.note || ''));

  // PTC / Open House
  const ptc = await get(FILES.PTC) || [];
  const ptcHost = $('#ptc');
  ptc.forEach(ev => addRow(ptcHost, ev.time || '', isoLong(parseISO(ev.date)), ev.title || ''));
})();
