// ===== THEMES =====
var themes={
  'default':'Varsayılan','royal':'Kraliyet','forest':'Orman','wine':'Şarap','slate':'Taş','plum':'Erik','coffee':'Kahve','teal':'Deniz','ember':'Kor','navy':'Lacivert','emerald':'Zümrüt',
  'cloud':'Bulut','pearl':'İnci','mist':'Sis','cream':'Krem','sage':'Adaçayı','lilac':'Leylak','coral':'Mercan','sky':'Gök','linen':'Keten','frost':'Buz'};

// ===== SETTINGS =====
function showSettings(){hideAvatarMenu();$('chat-empty').style.display='none';$('chat-active').style.display='none';$('settings-page').classList.add('active');showSettingsCat('profile')}
function hideSettings(){$('settings-page').classList.remove('active');if(store.activeConvId){$('chat-empty').style.display='none';$('chat-active').style.display='flex'}else $('chat-empty').style.display='flex'}

async function showSettingsCat(cat){
  document.querySelectorAll('.settings-cat').forEach(function(c){c.classList.remove('active')});
  var el=document.querySelector('.settings-cat[data-cat="'+cat+'"]');if(el)el.classList.add('active');
  var content=$('settings-content');content.classList.remove('settings-content-anim');
  if(cat==='profile'){
    var accs=getAccounts(),acc=null;for(var i=0;i<accs.length;i++){if(accs[i].id===store.activeAccountId){acc=accs[i];break}}
    if(!acc){content.innerHTML='<div class="stitle">'+tr('profile')+'</div><p style="color:var(--text4)">Hesap bulunamadı.</p>';return}
    var accName=accountFallbackName(acc),accUser=accountFallbackUsername(acc);
    content.innerHTML='<div class="stitle">'+tr('profile_settings')+'</div><div style="display:flex;align-items:center;gap:16px;margin-bottom:20px"><div id="settings-avatar" style="width:64px;height:64px;border-radius:50%;background:'+(acc.avatar?'none':'linear-gradient(135deg,#2563eb,#6d28d9)')+';overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;border:1px dashed var(--border2);background-size:cover;background-position:center" data-action="pick-avatar">'+(acc.avatar?'<img src="'+esc(sanitizeUrl(acc.avatar))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="linear-gradient(135deg,#2563eb,#6d28d9)" data-err-fs="24px">':'<svg width="24" height="24" viewBox="0 0 24 24" stroke="rgba(255,255,255,.3)" fill="none" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>')+'</div><div><div style="font-size:13px;font-weight:600;color:var(--text2)">'+esc(accName)+'</div><div style="font-size:11px;color:var(--text4)">'+tr('click_change_photo')+'</div></div></div>'+
    '<div class="field-group"><label>'+tr('username')+'</label><input type="text" id="set-username" value="'+esc(accUser)+'" maxlength="20"></div>'+
    '<div class="field-group"><label>'+tr('display_name_label')+'</label><input type="text" id="set-display" value="'+esc(accName)+'" maxlength="30"></div>'+
    '<div class="field-group"><label>'+tr('bio')+'</label><textarea id="set-bio" maxlength="150" placeholder="'+tr('bio_placeholder')+'">'+esc(acc.bio||'')+'</textarea><div class="field-hint">'+tr('max_150')+'</div></div>'+
    '<button class="btn-primary" data-action="save-profile" style="padding:10px 24px;font-size:12px;border-radius:10px">'+tr('save')+'</button>'+
    '<div style="margin-top:24px;padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">'+tr('delete_account')+'</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">'+tr('delete_account_desc')+'</p><button data-action="delete-account" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" class="btn-danger-del">'+tr('delete_account')+'</button></div>'
  }else if(cat==='theme'){
    var cur=getTheme();
    content.innerHTML='<div class="stitle">'+tr('themes')+'</div><div class="stitle-sub">'+tr('choose_category')+'</div><div class="theme-grid">'+
      ['default','royal','forest','wine','slate','plum','coffee','teal','ember','navy','emerald','cloud','pearl','mist','cream','sage','lilac','coral','sky','linen','frost'].map(function(t){return '<div class="theme-card tp-'+t+(cur===t?' active':'')+'" data-theme="'+t+'" data-action="select-theme"><div class="theme-card-preview"><div class="tcp-dot"></div><div class="tcp-bar"><div></div><div></div><div></div></div></div><div class="theme-card-name">'+themes[t]+'</div></div>'}).join('')+
      '</div>'
  }else if(cat==='language'){
    var langs=getLanguages();
    var cur=getCurrentLang();
    var html='<div class="stitle">'+tr('select_language')+'</div>'+
      '<div class="stitle-sub">'+tr('available_languages')+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">';
    for(var li=0;li<langs.length;li++){
      var lg=langs[li];
      var isActive=(lg.code===cur)?'style="background:rgba(129,140,248,.08);border-color:var(--accent)"':'';
      html+='<button data-action="select-lang" data-lang="'+lg.code+'" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--border);cursor:pointer;font-family:inherit;font-size:13px;color:var(--text2);transition:all .15s" '+isActive+'>'+
        '<span style="font-size:20px">'+lg.flag+'</span><span style="flex:1;text-align:left">'+lg.name+'</span>'+
        (isActive?'<span style="color:var(--accent);font-size:12px">✓</span>':'')+
      '</button>'
    }
    html+='</div>'+
      '<div style="margin-top:16px"><button data-action="use-device-lang" style="padding:8px 16px;border:none;border-radius:8px;background:var(--bg3);color:var(--text3);font-family:inherit;font-size:12px;cursor:pointer">'+tr('use_device_lang')+'</button></div>';
    content.innerHTML=html
  }else if(cat==='privacy'){
    var notifChecked=ls(STORAGE_KEYS.NOTIFICATIONS)!==false?'checked':'';
    var autoStartChecked='';var bgChecked='';
    if(window.electronAPI&&electronAPI.getAutoStart){try{var as=await electronAPI.getAutoStart();$('autostart-toggle').checked=as}catch(e){}}
    if(window.electronAPI&&electronAPI.getBackgroundMode){try{var bg=await electronAPI.getBackgroundMode();$('background-toggle').checked=bg}catch(e){}}
    content.innerHTML='<div class="stitle">'+tr('privacy_security')+'</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="notif-toggle" '+notifChecked+' data-action="toggle-setting" data-key="notifications"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">'+tr('notifications')+'</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">'+tr('notifications_desc')+'</span>'+
      '</div>'+
      '<div class="stitle" style="margin-top:24px">'+tr('background_service')+'</div>'+
      '<div style="margin-bottom:10px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="autostart-toggle" data-action="toggle-autostart"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">'+tr('autostart')+'</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">'+tr('autostart_desc')+'</span>'+
      '</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="background-toggle" data-action="toggle-background"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">'+tr('background_run')+'</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">'+tr('background_desc')+'</span>'+
      '</div>'+
      '<div class="field-group"><label>'+tr('email')+' <span style="font-size:9px;color:var(--text4);font-weight:400">'+tr('email_disabled')+'</span></label><input type="email" id="set-email" value="'+(function(){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===store.activeAccountId)return esc(a[i].email)}return''})()+'"></div>'+
      '<div class="field-group" style="margin-top:6px"><button class="btn-primary" id="save-email-btn" data-action="save-email" style="opacity:.5;cursor:not-allowed">'+tr('email_save')+'</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">'+tr('change_password')+'</h4>'+
      '<div class="field-group"><label>'+tr('current_password')+'</label><input type="password" id="cur-pass" placeholder="••••••••"></div>'+
      '<div class="field-group"><label>'+tr('new_password')+'</label><input type="password" id="new-pass" placeholder="••••••••"></div>'+
      '<div class="field-group"><label>'+tr('new_password_re')+'</label><input type="password" id="new-pass2" placeholder="••••••••"></div>'+
      '<button class="btn-primary" id="save-pass-btn" disabled data-action="change-password">'+tr('change_password')+'</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">'+tr('e2e_encryption')+'</h4>'+
      '<p style="font-size:11px;color:var(--text4);margin-bottom:10px;line-height:1.5">'+tr('e2e_desc')+'</p>'+
      '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span id="e2e-status" style="font-size:11px;color:#22c55e">'+tr('e2e_active')+'</span></div></div>'
  }else if(cat==='media'){
    var micOptions='<option value="">'+tr('theme_default')+'</option>',spkOptions='<option value="">'+tr('theme_default')+'</option>';
    try{var devices=await navigator.mediaDevices.enumerateDevices();
      devices.forEach(function(d){
        if(d.kind==='audioinput')micOptions+='<option value="'+d.deviceId+'">'+esc(d.label||tr('microphone')+' '+(micOptions.match(/option value=/g)||[]).length)+'</option>';
        if(d.kind==='audiooutput')spkOptions+='<option value="'+d.deviceId+'">'+esc(d.label||tr('speaker')+' '+(spkOptions.match(/option value=/g)||[]).length)+'</option>'
      });
      var ms=$('media-mic-select');if(ms)ms.innerHTML=micOptions;
      var ss=$('media-spk-select');if(ss)ss.innerHTML=spkOptions
    }catch(e){console.error(e)}
    
    content.innerHTML='<div class="stitle">'+tr('media')+'</div>'+
      '<div class="stitle-sub" style="margin-bottom:18px">Mikrofon, hoparlör, kamera ve ekran ayarlarını yönet</div>'+
      '<div style="display:flex;flex-direction:column;gap:14px">'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🎥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">'+tr('camera')+'</h4>'+
          '<div id="camera-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span id="camera-placeholder" style="font-size:11px;color:var(--text4);opacity:.6">'+tr('camera_off')+'</span>'+
          '</div>'+
          '<button class="btn-primary" id="camera-toggle-btn" data-action="toggle-camera" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">'+tr('turn_on_camera')+'</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🎤</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">'+tr('microphone')+'</h4>'+
          '<select id="media-mic-select" style="width:100%;padding:7px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);margin-bottom:8px;outline:none">'+micOptions+'</select>'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
            '<div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">'+
              '<div id="mic-level" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent));border-radius:3px;transition:width .08s"></div>'+
            '</div>'+
            '<span id="mic-level-text" style="font-size:10px;color:var(--text4);min-width:35px;text-align:right;font-variant-numeric:tabular-nums">- dB</span>'+
          '</div>'+
          '<button class="btn-primary" id="mic-toggle-btn" data-action="toggle-mic-test" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">'+tr('test_mic')+'</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔊</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">'+tr('speaker')+'</h4>'+
          '<select id="media-spk-select" style="width:100%;padding:7px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);margin-bottom:8px;outline:none">'+spkOptions+'</select>'+
          '<div style="margin-bottom:8px">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--text4)">'+tr('volume')+'</span><span id="vol-value" style="font-size:11px;font-weight:600;color:var(--text2)">80%</span></div>'+
            '<input type="range" min="0" max="100" value="80" data-action="set-volume" style="width:100%;height:4px;-webkit-appearance:none;background:var(--bg3);border-radius:2px;outline:none;accent-color:var(--accent)">'+
          '</div>'+
          '<button class="btn-primary" data-action="test-speaker" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">'+tr('speaker_test')+'</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🖥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">'+tr('screen_share')+'</h4>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">'+tr('screen_share_desc')+'</div>'+
          '<button class="btn-primary" data-action="test-screen" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">'+tr('test')+'</button>'+
          '<div id="screen-share-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:none;align-items:center;justify-content:center;margin-top:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span style="font-size:11px;color:var(--text4);opacity:.6">Paylaşım kapalı</span>'+
          '</div>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔇</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">'+tr('noise_suppression')+'</h4>'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
            '<label class="toggle"><input type="checkbox" id="noise-toggle" '+(ls(STORAGE_KEYS.NOISE_SUPPRESSION)?'checked':'')+' data-action="toggle-noise"><span class="toggle-track"></span><span class="toggle-label" style="font-size:11px;color:var(--text4)">Arka plan gürültüsünü engelle</span></label>'+
          '</div>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">'+tr('noise_desc')+'</div>'+
          '<div style="display:flex;gap:8px;align-items:center">'+
            '<span style="font-size:10px;color:var(--text4)">'+tr('level')+'</span>'+
            '<select id="noise-level" style="flex:1;padding:6px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);outline:none" data-action="set-noise-level">'+
              '<option value="low" '+(ls(STORAGE_KEYS.NOISE_LEVEL)==='low'?'selected':'')+'>'+tr('low')+'</option>'+
              '<option value="medium" '+(ls(STORAGE_KEYS.NOISE_LEVEL)==='medium'?'selected':'')+'>'+tr('medium')+'</option>'+
              '<option value="high" '+(ls(STORAGE_KEYS.NOISE_LEVEL)==='high'?'selected':'')+'>'+tr('high')+'</option>'+
            '</select>'+
          '</div>'+
        '</div>'+
      '</div>'
  }else if(cat==='shortcuts'){
    var defaultShortcuts=[
      {id:'upload',label:tr('shortcut_upload'),key:'g',ctrl:false,alt:true},
      {id:'voiceMsg',label:tr('shortcut_voice'),key:'m',ctrl:false,alt:true},
      {id:'micToggle',label:tr('shortcut_mic'),key:'',ctrl:false,alt:false},
      {id:'speakerToggle',label:tr('shortcut_speaker'),key:'',ctrl:false,alt:false},
      {id:'statusCycle',label:tr('shortcut_status'),key:'',ctrl:false,alt:false},
      {id:'voiceCall',label:tr('shortcut_call'),key:'',ctrl:false,alt:false},
      {id:'editLast',label:tr('shortcut_edit'),key:'ArrowUp',ctrl:false,alt:false}
    ];
    var savedShortcuts=ls(STORAGE_KEYS.SHORTCUTS)||{};
    var html='<div class="stitle">'+tr('shortcuts')+'</div><div class="stitle-sub">'+tr('shortcuts_desc')+'</div><div style="display:flex;flex-direction:column;gap:6px">';
    for(var si=0;si<defaultShortcuts.length;si++){
      var sc=defaultShortcuts[si];
      var saved=savedShortcuts[sc.id];
      var displayKey=getShortcutDisplay(saved||sc);
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--border)">'+
        '<span style="font-size:12px;color:var(--text3)">'+sc.label+'</span>'+
        '<div style="display:flex;align-items:center;gap:6px" id="sc-group-'+sc.id+'">'+
          '<button data-action="record-shortcut" data-sc-id="'+sc.id+'" style="padding:4px 10px;border:none;border-radius:6px;background:var(--bg3);color:var(--text4);font-family:monospace;font-size:11px;cursor:pointer;min-width:70px;text-align:center;transition:all .15s" id="sc-'+sc.id+'" title="'+tr('click_assign')+'">'+(displayKey||tr('click_assign'))+'</button>'+
          (store.recordingShortcut?'':'<button data-action="reset-shortcut" data-sc-id="'+sc.id+'" style="width:24px;height:24px;border:none;border-radius:5px;background:transparent;cursor:pointer;color:var(--text4);font-size:12px;display:inline-flex;align-items:center;justify-content:center" title="'+tr('reset')+'">↺</button>')+
        '</div></div>'
    }
    html+='</div>';
    content.innerHTML=html
  }else if(cat==='danger'){
    content.innerHTML='<div class="stitle">'+tr('data_management')+'</div>'+
      '<div style="padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">'+tr('delete_account')+'</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">'+tr('delete_account_desc')+'</p><button data-action="delete-account" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" class="btn-danger-del">'+tr('delete_account')+'</button></div>'+
      '<div style="padding:18px;border-radius:12px;background:var(--surface);border:1px solid var(--border)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="var(--text4)" fill="none" stroke-width="1.5"><path d="M21 4H8l-1 2H3v2h18V4z"/><line x1="10" y1="12" x2="10" y2="18"/><line x1="14" y1="12" x2="14" y2="18"/><path d="M5 6v13a2 2 0 002 2h10a2 2 0 002-2V6"/></svg><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin:0">'+tr('clear_local_data')+'</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">'+tr('clear_local_desc')+'</p><button data-action="clear-local-data" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:var(--accent);color:#fff;transition:all .2s">'+tr('clear_local_data')+'</button></div>'
  }else if(cat==='about'){
    var updateBtn = '<button id="update-btn" data-action="check-update" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:var(--accent);color:#fff;transition:all .2s">'+tr('check_updates')+'</button>';
    var updateBar = '<div id="update-bar" style="display:none;margin-top:16px"></div>';
    content.innerHTML='<div class="stitle">'+tr('about')+'</div>'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px"><div style="width:48px;height:48px;border-radius:14px;background:var(--grad);display:flex;align-items:center;justify-content:center"><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.477 2 2 6.477 2 12c0 2.17.678 4.182 1.838 5.843L2.5 21.5l3.657-1.338A9.967 9.967 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></div><div><div style="font-size:16px;font-weight:700;color:var(--text)">WaxMes</div><div id="about-version" style="font-size:11px;color:var(--text4)">v0.1.0</div></div></div>'+
      '<p style="font-size:12px;color:var(--text3);line-height:1.7;margin-bottom:16px">'+tr('app_description')+'</p>'+
      '<div style="padding:12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);font-size:11px;color:var(--text4);line-height:1.6">'+
      '<b style="color:var(--text3)">'+tr('features')+':</b><br>• '+tr('realtime_messaging')+'<br>• '+tr('group_chats')+'<br>• '+tr('media_sharing')+'<br>• '+tr('edit_delete_msgs')+'<br>• '+tr('multi_theme')+'<br>• '+tr('status_presence')+'<br>• '+tr('account_mgmt')+'<br><br>'+
      '<b style="color:var(--text3)">'+tr('technologies')+':</b><br>• '+tr('electron')+' • '+tr('vanilla_js')+' • CSS3<br><br>'+
      '<b style="color:var(--text3)">'+tr('developer')+':</b><br>• '+tr('developed_by')+'</div>'+
      '<div style="margin-top:16px">'+updateBtn+'</div>'+updateBar;
    var appVer = 'v0.1.0';
    try{if(window.electronAPI && electronAPI.getAppVersion){var ver=await electronAPI.getAppVersion();appVer='v'+ver;var el=$('about-version');if(el)el.textContent=appVer;var wel=$('welcome-version');if(wel)wel.textContent=appVer}}catch(e){console.error(e)}
    var el=$('about-version');if(el)el.textContent=appVer;
  }
  requestAnimationFrame(function(){content.classList.add('settings-content-anim')})
}

// ===== AUTO-UPDATE =====
store._updateCheckLock = false;
async function checkUpdate(){
  if(store._updateCheckLock) return;
  var btn = $('update-btn');
  if(!btn) return;
  btn.textContent = tr('update_checking');
  btn.disabled = true;
  store._updateCheckLock = true;
  if(window.electronAPI && electronAPI.checkForUpdates){
    if(btn.dataset.downloaded === '1') {
      electronAPI.installUpdate();
      store._updateCheckLock = false;
      return;
    }
    showUpdateBar(tr('update_checking'), 'info');
    try {
      var result = await electronAPI.checkForUpdates();
      store._updateCheckLock = false;
      if(result && result.error){
        btn.textContent = tr('check_updates');
        btn.disabled = false;
        showUpdateBar(tr('error')+': '+result.error, 'error');
        return;
      }
      if(result && result.updateAvailable){
        btn.textContent = 'v'+result.version+' İndir';
        btn.dataset.found = '1';
        btn.disabled = false;
        showUpdateBar(tr('update_available')+': v'+result.version+'. '+tr('click_to_download')+'.', 'info');
        btn.onclick = async function(){
            btn.textContent = tr('updating');
            btn.disabled = true;
            try {
              var resp = await electronAPI.startDownload();
              if(!resp || !resp.success){
                btn.textContent = tr('check_updates');
                btn.disabled = false;
                showUpdateBar(tr('download_error')+': '+(resp&&resp.error?resp.error:tr('unknown')), 'error');
              }
            } catch(err) {
              btn.textContent = tr('check_updates');
              btn.disabled = false;
              showUpdateBar(tr('download_error')+': '+(err&&err.message?err.message:err), 'error');
            }
          };
        } else {
          btn.textContent = tr('check_updates');
          btn.disabled = false;
          showUpdateBar(tr('update_latest'), 'info');
        }
      } catch(err) {
        store._updateCheckLock = false;
        btn.textContent = tr('check_updates');
        btn.disabled = false;
        showUpdateBar(tr('check_failed')+': '+(err&&err.message?err.message:err), 'error');
      }
    } else {
      store._updateCheckLock = false;
      showUpdateBar(tr('desktop_only'), 'error');
      btn.textContent = tr('check_updates');
      btn.disabled = false;
    }
}
function showUpdateBar(msg, type){
  var bar = $('update-bar');
  if(!bar) return;
  var colors = {info: 'var(--accent)', success: '#22c55e', error: '#ef4444'};
  bar.style.display = 'block';
  bar.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:'+(colors[type]||colors.info)+'20;border:1px solid '+(colors[type]||colors.info)+'40;font-size:12px;color:var(--text3)">'+esc(msg)+'</div>';
}

function setAppVersion(ver){
  var v = ver ? 'v'+ver : 'v0.1.0';
  var el = $('about-version'); if(el) el.textContent = v;
  var wel = $('welcome-version'); if(wel) wel.textContent = v;
}

if(window.electronAPI){
  (async function(){try{var ver=await electronAPI.getAppVersion();setAppVersion(ver)}catch(e){console.error(e)}})();
  window.electronAPI.onUpdateAvailable(function(version){
    var btn = $('update-btn');
    if(btn && !btn.dataset.downloaded) { btn.textContent = 'v'+version+' İndir'; btn.dataset.found = '1'; btn.disabled = false; }
    showUpdateBar(tr('update_available')+': v'+version+'. '+tr('click_to_download')+'.', 'info');
    if(btn) btn.onclick = async function(){
      btn.textContent = tr('updating');
      btn.disabled = true;
      try {
        var resp = await electronAPI.startDownload();
        if(!resp || !resp.success){
          btn.textContent = tr('check_updates');
          btn.disabled = false;
          showUpdateBar(tr('download_error')+': '+(resp&&resp.error?resp.error:tr('unknown')), 'error');
        }
      } catch(err) {
        btn.textContent = tr('check_updates');
        btn.disabled = false;
        showUpdateBar(tr('download_error')+': '+(err&&err.message?err.message:err), 'error');
      }
    };
  });
  window.electronAPI.onUpdateProgress(function(percent){
    var bar = $('update-bar');
    if(bar) bar.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:var(--accent)20;border:1px solid var(--accent)40;font-size:12px;color:var(--text3)">'+tr('updating')+': '+percent+'%</div>';
  });
  window.electronAPI.onUpdateDownloaded(function(){
    var btn = $('update-btn');
    if(btn) { btn.textContent = tr('update_restart'); btn.dataset.downloaded = '1'; btn.disabled = false; }
    showUpdateBar(tr('update_downloaded'), 'success');
    if(btn) btn.onclick = function(){
      electronAPI.installUpdate();
    };
  });
  window.electronAPI.onUpdateError(function(msg){
    var btn = $('update-btn');
    if(btn) { btn.textContent = tr('check_updates'); btn.dataset.found = '0'; btn.disabled = false; }
    showUpdateBar(tr('update_error')+': '+msg, 'error');
  });
}

function clearLocalData(){
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="var(--text4)" fill="none" stroke-width="1.5" style="margin-bottom:12px"><path d="M21 4H8l-1 2H3v2h18V4z"/><line x1="10" y1="12" x2="10" y2="18"/><line x1="14" y1="12" x2="14" y2="18"/><path d="M5 6v13a2 2 0 002 2h10a2 2 0 002-2V6"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">'+tr('clear_data_title')+'</h4>'+
    '<p style="color:var(--text4);font-size:12px;line-height:1.6">'+tr('clear_data_desc')+'</p>'+
    '<input type="checkbox" id="clear-cloud-msgs" style="display:none" checked>'+
    '<label for="clear-cloud-msgs" style="display:flex;align-items:center;gap:8px;color:var(--text3);font-size:12px;margin-top:8px;cursor:pointer;user-select:none">'+
      '<span style="width:18px;height:18px;border-radius:5px;border:2px solid var(--text4);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;background:var(--input-bg)">'+
        '<svg width="11" height="11" viewBox="0 0 24 24" stroke="var(--accent)" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" id="clear-cloud-check"><polyline points="20 6 9 17 4 12"/></svg>'+
      '</span> <span>'+tr('clear_cloud_too')+'</span>'+
    '</label>';
  $('delete-confirm-btn').textContent=tr('clear');
  $('delete-confirm-btn').style.background='var(--accent)';
  $('delete-confirm-btn').onclick=async function(){
    var deleteCloud=$('clear-cloud-msgs')&&$('clear-cloud-msgs').checked;
    hideDeleteModal();
    if(window.db&&fbUserId()){
      var _proms=[];
      for(var _cli=0;_cli<store.conversations.length;_cli++){(function(_c){
        if(!_c.id)return;
        if(deleteCloud){
          var _ref=db.collection(COLLECTIONS.CONVERSATIONS).doc(_c.id);
          _proms.push(_ref.collection(COLLECTIONS.MESSAGES).get().then(function(snap){
            if(snap.size>0){var b=db.batch();snap.forEach(function(d){b.delete(d.ref)});return b.commit()}
          }).then(function(){return _ref.update({lastMsg:'',lastTime:''})}).catch(function(){}))
        }
      })(store.conversations[_cli])}
      await Promise.all(_proms)
    }
    localStorage.clear();
    showError(tr('data_cleared'));
    setTimeout(function(){location.reload()}, 1000)
  };
  $('modal-delete').classList.add('active')
}
