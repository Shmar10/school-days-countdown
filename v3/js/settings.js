import {toKey} from './utils.js';
import {state, scheduleForDate, setOverride, removeOverride, clearOverrides, getOverrides} from './state.js';

const $ = s => document.querySelector(s);

export function openSettings(){
  document.body.style.overflow = 'hidden';
  $('#backdrop').hidden = false;
  $('#ovDate').value = toKey(new Date());
  $('#ovKind').value = 'DEFAULT';
  $('#ovCustom').value = '';
  ensureRows(); clearForm(); refreshList();
}
export function closeSettings(){
  document.body.style.overflow = '';
  $('#backdrop').hidden = true;
}

export function wireSettings(){
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#closeModal').addEventListener('click', closeSettings);
  $('#backdrop').addEventListener('click', e=>{ if(e.target.id==='backdrop') closeSettings(); });

  $('#ovAdd').addEventListener('click', ()=>{
    const date = $('#ovDate').value;
    const kind = $('#ovKind').value;
    if(!date) return alert('Pick a date');
    let val = kind;
    if(kind==='CUSTOM'){
      try{
        const parsed = JSON.parse($('#ovCustom').value || '[]');
        if(!Array.isArray(parsed) || parsed.length===0) throw 0;
        val = 'CUSTOM:' + JSON.stringify(parsed);
      }catch{ return alert('Custom schedule must be a non-empty JSON array.'); }
    }
    setOverride(date, val);
    refreshList();
  });

  $('#ovClear').addEventListener('click', ()=>{
    if(confirm('Clear ALL overrides on this device?')){ clearOverrides(); refreshList(); }
  });

  // Builder presets
  $('#bLoadDefault').addEventListener('click', ()=>{ ensureRows(); fillFrom('DEFAULT'); });
  $('#bLoadWed').addEventListener('click', ()=>{ ensureRows(); fillFrom('WED_LATE'); });
  $('#bLoad1010').addEventListener('click', ()=>{ ensureRows(); fillFrom('LATE_ARRIVAL_1010'); });
  $('#bClear').addEventListener('click', ()=>{ ensureRows(); clearForm(); });
  $('#bBuild').addEventListener('click', ()=>{ ensureRows(); buildJSON(); });
}

/* ----- rows / builder ----- */
function ensureRows(){
  const host = document.getElementById('bgrid');
  if(host.querySelector('.brow')) return;
  for (let i=1;i<=9;i++){
    const id = String(i).padStart(2,'0');
    const row = document.createElement('div');
    row.className = 'brow';
    row.innerHTML = `
      <div class="plabel">P${i}</div>
      <div class="times">
        <input type="time" id="bStart${id}" step="60">
        <span class="dash">—</span>
        <input type="time" id="bEnd${id}" step="60">
      </div>`;
    host.appendChild(row);
  }
}
function clearForm(){
  for (let i=1;i<=9;i++){
    const id = String(i).padStart(2,'0');
    const s = document.getElementById('bStart'+id), e = document.getElementById('bEnd'+id);
    if(s) s.value=''; if(e) e.value='';
  }
}
function fillFrom(name){
  const tmp = new Date(); // today
  const sched = (state.schedules[name] || []);
  for (let i=1;i<=9;i++){
    const id = String(i).padStart(2,'0');
    const p = sched.find(x=>x.id===id);
    const s = document.getElementById('bStart'+id), e = document.getElementById('bEnd'+id);
    if (p && s && e){
      const [sh,sm] = Array.isArray(p.start)?p.start:[0,0];
      const [eh,em] = Array.isArray(p.end)?p.end:[0,0];
      s.value = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`;
      e.value = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
    }
  }
}
function buildJSON(){
  const rows=[];
  for (let i=1;i<=9;i++){
    const id = String(i).padStart(2,'0');
    const s = document.getElementById('bStart'+id)?.value;
    const e = document.getElementById('bEnd'+id)?.value;
    if (s && e) rows.push({id, label:`P${i}`, start:s, end:e, include:true});
  }
  if (rows.length===0) return alert('Enter at least one period.');
  const box = document.getElementById('ovCustom');
  box.value = JSON.stringify(rows, null, 2);
  document.getElementById('ovKind').value = 'CUSTOM';
}

function refreshList(){
  const list = document.getElementById('ovList');
  list.innerHTML = '';
  const ov = getOverrides();
  const keys = Object.keys(ov).sort();
  if(keys.length===0){ list.innerHTML = '<span class="muted">No overrides saved.</span>'; return; }
  for (const k of keys){
    const pill = document.createElement('div');
    pill.style.display='inline-flex'; pill.style.alignItems='center'; pill.style.gap='6px';
    pill.style.border='1px solid #e5e7eb'; pill.style.borderRadius='999px';
    pill.style.padding='4px 10px'; pill.style.fontSize='12px'; pill.style.margin='4px 6px 0 0';
    pill.innerHTML = `<strong>${k}</strong> — ${ov[k].slice(0,60)} ${ov[k].length>60?'…':''}`;
    const btn = document.createElement('button'); btn.textContent = 'Remove';
    btn.onclick = () => { removeOverride(k); refreshList(); };
    pill.appendChild(btn);
    list.appendChild(pill);
  }
}
