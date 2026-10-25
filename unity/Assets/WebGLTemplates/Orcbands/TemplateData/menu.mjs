import {SaveStore, SLOTS, envelope, decode} from './save-store.mjs';
const $ = s => document.querySelector(s);
const overlay = $('#session-overlay');
let storage; try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('Browser storage is unavailable.');},setItem(){throw Error();}}; }
const saves = new SaveStore(storage);
let ready = false, started = false, busy = false, page = 'home', story = 0, replay = false, timer, confirmAction;
let sequence = 0, lastFocus, live = false;
const pending = new Map();
const captions = [
  'Somewhere beyond the mountains, there had to be a place for us.',
  'We hadn’t planned on arriving quite like this.',
  'Three survivors. A handful of tools. Enough to begin.',
  'We built a camp. Now we had to make it home.'
];
const frames = ['0 0 829 445','844 0 828 445','0 461 829 480','844 461 828 480'];
function status(text) { $('#session-status').textContent = text || ''; }
function artwork(index) {
  const art = $('#session-art'); art.setAttribute('viewBox',frames[index]);
  art.style.animation = 'none'; void art.getBoundingClientRect(); art.style.animation = '';
}
function refresh() {
  $('#continue-game').hidden = started;
  $('#resume-game').hidden = !started;
  $('#save-game').hidden = !started;
  const rows = saves.list();
  $('#continue-game').disabled = !ready || !rows.some(r=>r.value);
  for (const id of ['new-game','load-game','resume-game','save-game','replay-intro']) $('#'+id).disabled = !ready;
  $('#menu-toggle').disabled = !ready || !started;
}
function show(next, message = '') {
  clearTimeout(timer); page = next; overlay.hidden = false; overlay.classList.toggle('intro',next === 'intro');
  $('#unity-canvas').setAttribute('inert','');
  for (const el of overlay.querySelectorAll('.session-page')) el.hidden = el.dataset.page !== next;
  if (next !== 'intro') artwork(3);
  status(message); refresh();
  requestAnimationFrame(()=>overlay.querySelector(`.session-page[data-page="${next}"] button:not([disabled]):not([hidden])`)?.focus());
}
function hide() {
  clearTimeout(timer); live = true; overlay.hidden = true; $('#unity-canvas').removeAttribute('inert');
  $('#unity-canvas').focus(); refresh();
}
function command(action, snapshot) {
  if (!ready || !window.orcbandsUnity) return Promise.reject(Error('The valley is still loading.'));
  const id = String(++sequence);
  return new Promise((resolve,reject)=>{
    const timeout = setTimeout(()=>{pending.delete(id);reject(Error('The game did not respond. Try again.'));},30000);
    pending.set(id,{resolve,reject,timeout});
    window.orcbandsUnity.SendMessage('Orcbands Controller','SessionCommand',JSON.stringify({id,action,json:snapshot ? JSON.stringify(snapshot) : ''}));
  });
}
async function run(task) {
  if (busy) return; busy = true; overlay.classList.add('busy'); overlay.setAttribute('aria-busy','true');
  try { await task(); } catch(e) { status(e.message); }
  finally { busy = false; overlay.classList.remove('busy'); overlay.removeAttribute('aria-busy'); refresh(); }
}
function autosave(snapshot) {
  try { saves.write('auto',envelope(snapshot,'Autosave')); return ''; }
  catch(e) { return e.message; }
}
window.orcbandsSessionEvent = json => {
  const result = JSON.parse(json);
  started = result.started;
  if (result.id === 'ready') { window.orcbandsSessionReady = true; engineReady(); return; }
  if (result.id === 'autosave') {
    const error = autosave(result.snapshot); $('#save-status').textContent = error || 'Camp autosaved';
  } else if (result.id === 'suspended') {
    live = false; const error = result.snapshot ? autosave(result.snapshot) : '';
    show('home',error || 'Paused while you were away.');
  } else {
    const request = pending.get(result.id);
    if (request) { clearTimeout(request.timeout); pending.delete(result.id); result.ok ? request.resolve(result) : request.reject(Error(result.message)); }
  }
  refresh();
};
function engineReady() {
  ready = Boolean(window.orcbandsSessionReady && window.orcbandsUnity);
  if (ready) { status('The valley is ready.'); refresh(); }
}
window.addEventListener('orcbands:unity',engineReady);
engineReady();
function confirm(text, action) {
  confirmAction = action; $('#session-dialog').textContent = text; show('confirm');
}
$('#confirm-yes').onclick = ()=>run(async()=>{ const action = confirmAction; confirmAction = null; await action(); });
$('#confirm-no').onclick = ()=>show('home');
function beginIntro(isReplay) { replay = isReplay; story = 0; show('intro'); renderStory(); window.orcbandsAudio?.startPreferred(); }
function renderStory() {
  artwork(story); $('#intro-caption').textContent = captions[story]; $('#intro-count').textContent = `CHAPTER ${story+1} OF 4`;
  $('#intro-back').disabled = story === 0;
  $('#intro-next').textContent = story === 3 ? (replay ? 'Return to menu' : 'Begin our story') : 'Next';
  clearTimeout(timer);
  if ($('#intro-autoplay').checked && !document.hidden) timer = setTimeout(()=>run(nextStory),9000);
}
async function nextStory() { if (story < 3) { story++; renderStory(); } else await finishIntro(); }
async function finishIntro() {
  clearTimeout(timer);
  if (replay) { show('home'); return; }
  await command('new'); started = true;
  const result = await command('snapshot'); const error = autosave(result.snapshot);
  hide(); $('#save-status').textContent = error || 'New camp started';
}
$('#new-game').onclick = ()=>{
  const existing = saves.read('auto');
  if (started || !existing.empty) confirm('Start a new camp? The autosave will be replaced when you enter the valley. Your named saves will be kept.',async()=>beginIntro(false));
  else beginIntro(false);
};
$('#intro-next').onclick = ()=>run(nextStory);
$('#intro-back').onclick = ()=>{ if (busy) return; story=Math.max(0,story-1);renderStory(); };
$('#intro-skip').onclick = ()=>run(finishIntro);
$('#intro-autoplay').onchange = renderStory;
document.addEventListener('visibilitychange',()=>{ if (page === 'intro') { if(document.hidden) clearTimeout(timer); else renderStory(); } });
$('#replay-intro').onclick = ()=>beginIntro(true);
$('#resume-game').onclick = ()=>{window.orcbandsAudio?.startPreferred();run(async()=>{await command('resume');hide();});};
$('#continue-game').onclick = ()=>{
  window.orcbandsAudio?.startPreferred();
  run(async()=>{
    const rows=saves.list().filter(r=>r.value).sort((a,b)=>Date.parse(b.value.savedAt)-Date.parse(a.value.savedAt));
    for(const row of rows) {
      try { await command('validate',row.value.snapshot); await load(row.value); return; } catch(e) { status(e.message); }
    }
    throw Error('No readable camp found. Open Load Game to import a save or start a new game.');
  });
};
async function load(value) {
  const result = await command('load',value.snapshot); const error = autosave((await command('snapshot')).snapshot);
  hide(); $('#save-status').textContent = error || result.message;
}
async function pause() {
  if (!ready || !started || !live || busy) return;
  lastFocus = document.activeElement;
  await run(async()=>{ const result=await command('pause');live=false;show('home',autosave(result.snapshot) || 'Camp paused and saved.'); });
}
$('#menu-toggle').onclick = pause;
window.addEventListener('keydown',event=>{
  if (event.key === 'Escape') {
    event.preventDefault();event.stopImmediatePropagation();
    if (overlay.hidden) void pause();
    else if(page === 'intro') show('home','Introduction cancelled.');
    else if(page !== 'home') show('home');
    else if(started) $('#resume-game').click();
    return;
  }
  if (overlay.hidden) return;
  // Keep keyboard interaction in the DOM menu rather than the Unity canvas.
  if(event.key === 'Tab') {
    const items=[...overlay.querySelectorAll('button,input')].filter(el=>!el.disabled && el.getClientRects().length);
    items.push($('#music-toggle'));
    const i=items.indexOf(document.activeElement), next=event.shiftKey?(i<=0?items.length-1:i-1):(i+1)%items.length;
    event.preventDefault();event.stopImmediatePropagation();items[next]?.focus();
  } else if ((event.code === 'Enter' || event.code === 'Space') && document.activeElement?.tagName === 'BUTTON' && overlay.contains(document.activeElement)) {
    event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)document.activeElement.click();
  }
},true);
function download(value) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='orcbands-camp.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let saveMode=false;
function showSlots(saving=false) {
  saveMode=saving;show('load');$('#load-title').textContent=saving?'Keep this camp':'Your camps';
  $('#save-name-label').hidden=!saving; $('#export-current').hidden=!started;
  const list=$('#save-list');list.replaceChildren();
  for (const row of saves.list()) {
    const el=document.createElement('div');el.className='save-row';
    const info=document.createElement('div');info.className='save-info';
    const title=document.createElement('strong');title.textContent=row.value?.name || (row.error?'Unreadable save':'Empty camp');
    const detail=document.createElement('small');detail.textContent=`${row.slot==='auto'?'Autosave':`Camp ${SLOTS.indexOf(row.slot)}`} · `+(row.value?`${row.value.snapshot.wood} wood · ${new Date(row.value.savedAt).toLocaleString()}`:row.error || 'Ready for a new story');
    info.append(title,detail);el.append(info);
    const button=(label,click)=>{const b=document.createElement('button');b.textContent=label;b.onclick=click;el.append(b);return b;};
    if(saving && row.slot!=='auto') button('Save here',()=>{
      const commit=async()=>{const result=await command('snapshot');saves.write(row.slot,envelope(result.snapshot,$('#save-name').value));showSlots(true);status('Camp saved.');};
      if(!row.empty)confirm('Replace this saved camp? Other saves will be kept.',commit);else run(commit);
    });
    if(!saving && row.value) button('Load',()=>{window.orcbandsAudio?.startPreferred();run(()=>load(row.value));});
    if(row.value)button('Download',()=>download(row.value));
    if(!row.empty)button('Delete',()=>confirm('Delete this saved camp? This cannot be undone.',async()=>{saves.remove(row.slot);showSlots(saveMode);}));
    list.append(el);
  }
}
$('#load-game').onclick=()=>showSlots();$('#save-game').onclick=()=>showSlots(true);
$('#load-back').onclick=()=>show('home');$('#settings-back').onclick=()=>show('home');
$('#export-current').onclick=()=>run(async()=>download(envelope((await command('snapshot')).snapshot,$('#save-name').value)));
$('#import-save').onclick=()=>$('#import-file').click();
$('#import-file').onchange=()=>run(async()=>{
  const file=$('#import-file').files[0];$('#import-file').value='';if(!file)return;
  if(file.size>131072)throw Error('The save file is too large.');
  const value=decode(await file.text());await command('validate',value.snapshot);
  const empty=saves.list().find(row=>row.empty && row.slot!=='auto');
  const slot=empty?.slot || 'slot1';
  const commit=async()=>{saves.write(slot,value);showSlots();status('Save imported. Choose Load to enter this camp.');};
  if(empty)await commit();else confirm('All camps are occupied. Replace Camp 1 with this imported save?',commit);
});
$('#settings-game').onclick=()=>{
  show('settings');$('#music-enabled').checked=window.orcbandsAudio?.enabled ?? true;
  $('#music-volume').value=Math.round($('#background-music').volume*100);
};
$('#music-enabled').onchange=event=>window.orcbandsAudio?.setEnabled(event.target.checked);
$('#music-volume').oninput=event=>window.orcbandsAudio?.setVolume(Number(event.target.value)/100);
show('home','Preparing the valley…');
