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

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const today0 = (()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; })();

async function get(url){
  try{ const r = await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; return r.json(); }
  catch{ return null; }
}

function addRow(host, opts){
  // opts: {left, main, note, startISO, endISO}
  const row = document.createElement('div'); row.className='item';
  const start = opts.startISO ? parseISO(opts.startISO) : null;
  const end   = opts.endISO   ? parseISO(opts.endISO)   : start;
  row.dataset.start = start ? +start : '';
  row.dataset.end   = end   ? +end   : '';
  if(opts.left){ const t=document.createElement('div'); t.className='tag'; t.textContent=opts.left; row.appendChild(t); }
  const box=document.createElement('div');
  const a=document.createElement('div'); a.className='date'; a.textContent = opts.main; box.appendChild(a);
  if(opts.note){ const b=document.createElement('div'); b.className='note'; b.textContent = opts.note; box.appendChild(b); }
  row.appendChild(box);
  host.appendChild(row);
}

function rangeText(sISO, eISO){
  if(!sISO || !eISO) return '';
  const s=parseISO(sISO), e=parseISO(eISO);
  return (sISO===eISO) ? isoLong(s) : `${isoMD(s)} – ${isoMD(e)}${s.getFullYear()!==e.getFullYear()?` ${e.getFullYear()}`:''}`;
}

function setBadge(id){
  const list = $(`#${id}`);
  const count = list ? list.querySelectorAll('.item:not([hidden])').length : 0;
  const badge = $(`#badge-${id}`);
  if(badge) badge.textContent = count;
}

function applyFilter(mode){
  const isUpcoming = (startMs,endMs) => (endMs >= +today0);
  const isPast     = (startMs,endMs) => (endMs <  +today0);

  ['na','weds','late1010','early','marks','ptc'].forEach(id=>{
    const items = $(`#${id}`)?.children || [];
    for(const el of items){
      const start = Number(el.dataset.start || el.dataset.end || 0);
      const end   = Number(el.dataset.end   || el.dataset.start || 0);

      let show = true;
      if(mode==='upcoming') show = isUpcoming(start,end);
      if(mode==='past')     show = isPast(start,end);

      el.hidden = !show;
    }
    setBadge(id);
  });
}

function wireFilters(){
  $$('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.mode);
    });
  });
  $('#expandAll').addEventListener('click', ()=> $$('details.sec').forEach(d=>d.open=true));
  $('#collapseAll').addEventListener('click', ()=> $$('details.sec').forEach(d=>d.open=false));
}

(async function boot(){
  // Summary
  addRow($('#summary'), {left:'First Day', main: isoLong(FIRST_DAY)});
  addRow($('#summary'), {left:'Last Day',  main: isoLong(LAST_DAY)});

  // Non-attendance
  const na = await get(FILES.NON_ATT) || [];
  na.forEach(x => addRow($('#na'), {left:x.label, main:rangeText(x.start,x.end), startISO:x.start, endISO:x.end}));

  // Late-start Wednesdays (single dates)
  const weds = (await get(FILES.WEDS) || []).map(parseISO).sort((a,b)=>a-b);
  weds.forEach(d => addRow($('#weds'), {left:'9:40 AM', main:isoLong(d), startISO:d.toISOString().slice(0,10)}));

  // Late arrival 10:10 (single date list)
  const la = (await get(FILES.LATE) || []).map(parseISO).sort((a,b)=>a-b);
  la.forEach(d => addRow($('#late1010'), {left:'10:10 AM', main:isoLong(d), startISO:d.toISOString().slice(0,10)}));

  // Early release (single dates)
  const early = await get(FILES.EARLY) || [];
  early.forEach(e => addRow($('#early'), {
    left: e.time || 'Dismissal',
    main: isoLong(parseISO(e.date)),
    note: e.title || '',
    startISO: e.date
  }));

  // Marking periods (ranges)
  const marks = await get(FILES.MARKS) || [];
  marks.forEach(m => addRow($('#marks'), {
    left: m.title,
    main: rangeText(m.start, m.end),
    note: m.note || '',
    startISO: m.start, endISO: m.end
  }));

  // PTC/Open House (single dates)
  const pt = await get(FILES.PTC) || [];
  pt.forEach(ev => addRow($('#ptc'), {
    left: ev.time || '',
    main: isoLong(parseISO(ev.date)),
    note: ev.title || '',
    startISO: ev.date
  }));

  // Initial badges + filter
  ['na','weds','late1010','early','marks','ptc'].forEach(setBadge);
  wireFilters();
  applyFilter('upcoming'); // default view
})();
