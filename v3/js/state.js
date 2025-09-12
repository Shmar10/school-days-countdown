import {oneDay, toKey, parseISO, dateRange, isWeekday, hm, isoLong, isoMD, plural} from './utils.js';

/** ---- Config you’ll likely tweak per school ---- */
export const FIRST_DAY = new Date(2025, 7, 12);   // Aug 12, 2025
export const LAST_DAY  = new Date(2026, 4, 21);   // May 21, 2026
export const INCLUDE_ONLY = null;                 // e.g., ["01","02",...]; otherwise all include:true

/** ---- Runtime state ---- */
export const state = {
  schedules: {},          // from data/schedules.json
  naMap: new Map(),       // +date -> label
  lateWeds: new Set(),    // 'YYYY-MM-DD'
  late1010: new Set(),    // 'YYYY-MM-DD'
  overridesKey: 'sdc_overrides_v3'
};

async function loadJSON(url){
  const r = await fetch(url, {cache:'no-store'});
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

export async function initState(){
  // Load data files
  const [
    schedules,
    nonAttendance,
    lateWeds,
    late1010
  ] = await Promise.all([
    loadJSON('data/schedules.json'),
    loadJSON('data/non_attendance.json'),
    loadJSON('data/late_start_wednesdays.json'),
    loadJSON('data/late_arrival_1010.json').catch(()=>[])
  ]);

  state.schedules = schedules || {};

  // build NA map
  state.naMap = new Map();
  (nonAttendance || []).forEach(item=>{
    const s = parseISO(item.start), e = parseISO(item.end);
    for (const d of dateRange(s,e)) state.naMap.set(+d, item.label);
  });

  state.lateWeds = new Set(lateWeds || []);
  state.late1010 = new Set(late1010 || []);
}

/** ---- Overrides (localStorage) ---- */
export function getOverrides(){
  try { return JSON.parse(localStorage.getItem(state.overridesKey) || '{}'); }
  catch { return {}; }
}
function saveOverrides(obj){ localStorage.setItem(state.overridesKey, JSON.stringify(obj)); }
export const setOverride = (dateKey, value) => { const o = getOverrides(); o[dateKey]=value; saveOverrides(o); };
export const removeOverride = (dateKey) => { const o = getOverrides(); delete o[dateKey]; saveOverrides(o); };
export const clearOverrides = () => saveOverrides({});

/** ---- Schedule selection & counters ---- */
export function scheduleForDate(baseDate){
  const key = toKey(baseDate);
  const ov = getOverrides();
  if (ov[key]){
    const val = ov[key];
    if (val.startsWith('CUSTOM:')) {
      try { return JSON.parse(val.slice(7)); } catch {}
    }
    if (state.schedules[val]) return state.schedules[val];
  }
  if (state.late1010.has(key)) return state.schedules.LATE_ARRIVAL_1010 || state.schedules.DEFAULT;
  if (state.lateWeds.has(key))  return state.schedules.WED_LATE || state.schedules.DEFAULT;
  return state.schedules.DEFAULT || [];
}

export function todayStatus(today = new Date()){
  const d0 = new Date(today); d0.setHours(0,0,0,0);
  if (d0 < FIRST_DAY) return ['Not started', null];
  if (d0 > LAST_DAY)  return ['Completed', null];
  if (state.naMap.has(+d0)) return [`No school: ${state.naMap.get(+d0)}`, state.naMap.get(+d0)];
  if (!isWeekday(d0)) return ['No school: Weekend', 'Weekend'];
  return ['School day', null];
}

export function allSchoolDays(){
  const x = [];
  for (const d of dateRange(FIRST_DAY, LAST_DAY)){
    if (isWeekday(d) && !state.naMap.has(+d)) x.push(new Date(d));
  }
  return x;
}

export function fullDaysAfterToday(today = new Date()){
  const d0 = new Date(today); d0.setHours(0,0,0,0);
  return allSchoolDays().filter(d => d.getTime() > d0.getTime()).length;
}

export function remainingPeriodsToday(now = new Date()){
  const base = scheduleForDate(now);
  const only = Array.isArray(INCLUDE_ONLY) ? new Set(INCLUDE_ONLY) : null;
  const sched = base.map(p=>{
    const [sh,sm] = hm(p.start), [eh,em] = hm(p.end);
    return {
      ...p,
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm),
      endDate:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em),
      _count: only ? only.has(p.id) : !!p.include
    };
  });
  return sched.filter(p => p._count && p.endDate.getTime() > now.getTime()).length;
}

export function nextBreak(today = new Date()){
  const start = new Date(Math.max(+today, +FIRST_DAY));
  for (const d of dateRange(start, LAST_DAY)){
    if (state.naMap.has(+d)){
      const label = state.naMap.get(+d);
      let end = new Date(d);
      for (const f of dateRange(new Date(+d + oneDay), LAST_DAY)){
        if (state.naMap.get(+f) === label) end = f; else break;
      }
      return {start:d, end, label};
    }
  }
  return null;
}

/** ---- UI helpers used by main.js ---- */
export function chipsForToday(now = new Date()){
  const base = scheduleForDate(now);
  const only = Array.isArray(INCLUDE_ONLY) ? new Set(INCLUDE_ONLY) : null;
  const sched = base.map(p=>{
    const [sh,sm] = hm(p.start), [eh,em] = hm(p.end);
    return {
      ...p,
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm),
      endDate:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em),
      _count: only ? only.has(p.id) : !!p.include
    };
  });
  return sched.filter(p => p._count);
}

export function modeBadgeForDate(d){
  const key = toKey(d);
  const ov = getOverrides();
  if (ov[key]) return ov[key].startsWith('CUSTOM:') ? 'Special (custom)' : `Special (${ov[key]})`;
  if (state.late1010.has(key)) return 'Late Arrival (10:10)';
  if (state.lateWeds.has(key)) return 'Late Start (9:40)';
  return '';
}

export {isoLong, isoMD, plural, toKey};
