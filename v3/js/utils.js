// Small helpers shared across modules
export const oneDay = 24 * 60 * 60 * 1000;

export const toKey = d => {
  const x = new Date(d); x.setHours(0,0,0,0);
  return x.toISOString().slice(0,10);
};

export const parseISO = s => {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
};

export const isoLong = d =>
  d.toLocaleDateString(undefined,{weekday:'long', month:'short', day:'2-digit', year:'numeric'});

export const isoMD = d =>
  d.toLocaleDateString(undefined,{month:'short', day:'2-digit'});

export function* dateRange(start, end){
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end);   e.setHours(0,0,0,0);
  for(let t=s.getTime(); t<=e.getTime(); t+=oneDay){
    const d = new Date(t); d.setHours(0,0,0,0); yield d;
  }
}

export const isWeekday = d => (d.getDay() >= 1 && d.getDay() <= 5);
export const plural = (n, s, p) => `${n} ${n===1?s:p}`;

// Accept "HH:MM" or [HH,MM]
export function hm(v){
  if (Array.isArray(v)) return [Number(v[0])||0, Number(v[1])||0];
  if (typeof v === 'string'){
    const m = v.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  return [0,0];
}
