// ===== SHORTCUTS =====

var defaultShortcutsMap={
  upload:{key:'g',ctrl:false,alt:true},voiceMsg:{key:'m',ctrl:false,alt:true},
  micToggle:{key:'',ctrl:false,alt:false},speakerToggle:{key:'',ctrl:false,alt:false},
  statusCycle:{key:'',ctrl:false,alt:false},voiceCall:{key:'',ctrl:false,alt:false},
  editLast:{key:'ArrowUp',ctrl:false,alt:false}
};
function cancelRecord(){store.recordingShortcut=null;store._recKeys=null;renderSettingsShortcuts()}
function finishRecord(id){
  store.recordingShortcut=null;
  var keys=store._recKeys;store._recKeys=null;
  var btn=$('sc-'+id);if(!btn)return;
  if(!keys||(!keys.key&&!keys.ctrl&&!keys.alt)){renderSettingsShortcuts();return}
  var saved=ls('shortcuts')||{};
  saved[id]=keys;
  ls('shortcuts',saved);
  renderSettingsShortcuts()
}
function getShortcutDisplay(keys){
  if(!keys||(!keys.key&&!keys.ctrl&&!keys.alt))return '—';
  var d='';if(keys.ctrl)d+='CTRL+';if(keys.alt)d+='ALT+';if(keys.shift)d+='SHIFT+';if(keys.meta)d+='META+';
  if(keys.key&&keys.key.indexOf('Arrow')===0)d+=keys.key.replace('Arrow','↑');
  else if(keys.key)d+=keys.key.toUpperCase();
  return d||'—'
}
function recordShortcut(id){
  if(store.recordingShortcut)return;
  // Clean up any leftover confirm buttons from previous incomplete sessions
  document.querySelectorAll('[id^="sc-save-"],[id^="sc-cancel-"]').forEach(function(el){el.remove()});
  store._recKeys={key:'',ctrl:false,alt:false,shift:false,meta:false};
  store.recordingShortcut=id;
  var btn=$('sc-'+id);if(!btn)return;
  btn.textContent='…';btn.style.background='rgba(129,140,248,.2)';btn.style.color='var(--accent)';
  var parent=btn.parentElement;
  var saveBtn=document.createElement('button');
  saveBtn.textContent='✓';saveBtn.style.cssText='padding:2px 8px;border:none;border-radius:5px;background:rgba(34,197,94,.2);color:#22c55e;cursor:pointer;font-size:12px;margin-left:3px';
  saveBtn.onclick=function(e){e.stopPropagation();finishRecord(id)};
  saveBtn.id='sc-save-'+id;
  var cancelBtn=document.createElement('button');
  cancelBtn.textContent='✗';cancelBtn.style.cssText='padding:2px 6px;border:none;border-radius:5px;background:rgba(239,68,68,.15);color:#ef4444;cursor:pointer;font-size:12px;margin-left:2px';
  cancelBtn.onclick=function(e){e.stopPropagation();cancelRecord()};
  cancelBtn.id='sc-cancel-'+id;
  parent.appendChild(saveBtn);
  parent.appendChild(cancelBtn)
}
document.addEventListener('keydown',function(e){
  if(!store.recordingShortcut)return;
  e.preventDefault();
  var key=e.key;
  if(key==='Escape'){cancelRecord();return}
  if(key==='Enter'){finishRecord(store.recordingShortcut);return}
  store._recKeys.ctrl=e.ctrlKey;store._recKeys.alt=e.altKey;store._recKeys.shift=e.shiftKey;store._recKeys.meta=e.metaKey;
  if(key!=='Control'&&key!=='Alt'&&key!=='Shift'&&key!=='Meta')store._recKeys.key=key;
  var btn=$('sc-'+store.recordingShortcut);if(btn)btn.textContent=getShortcutDisplay(store._recKeys)
});
document.addEventListener('keyup',function(e){
  if(!store.recordingShortcut)return;
  e.preventDefault();
  var btn=$('sc-'+store.recordingShortcut);if(btn)btn.textContent=getShortcutDisplay(store._recKeys)
});
function resetShortcut(id){
  if(store.recordingShortcut){store.recordingShortcut=null;store._recKeys=null}
  var def=defaultShortcutsMap[id];if(!def)return;
  var saved=ls('shortcuts')||{};
  delete saved[id];ls('shortcuts',saved);
  renderSettingsShortcuts()
}
function renderSettingsShortcuts(){showSettingsCat('shortcuts')}
