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
    if(!acc){content.innerHTML='<div class="stitle">Profil</div><p style="color:var(--text4)">Hesap bulunamadı.</p>';return}
    var accName=accountFallbackName(acc),accUser=accountFallbackUsername(acc);
    content.innerHTML='<div class="stitle">Profil Ayarları</div><div style="display:flex;align-items:center;gap:16px;margin-bottom:20px"><div id="settings-avatar" style="width:64px;height:64px;border-radius:50%;background:'+(acc.avatar?'none':'linear-gradient(135deg,#2563eb,#6d28d9)')+';overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;border:1px dashed var(--border2);background-size:cover;background-position:center" data-action="pick-avatar">'+(acc.avatar?'<img src="'+esc(acc.avatar)+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="linear-gradient(135deg,#2563eb,#6d28d9)" data-err-fs="24px">':'<svg width="24" height="24" viewBox="0 0 24 24" stroke="rgba(255,255,255,.3)" fill="none" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>')+'</div><div><div style="font-size:13px;font-weight:600;color:var(--text2)">'+esc(accName)+'</div><div style="font-size:11px;color:var(--text4)">Fotoğrafı değiştirmek için tıkla</div></div></div>'+
    '<div class="field-group"><label>Kullanıcı Adı</label><input type="text" id="set-username" value="'+esc(accUser)+'" maxlength="20"></div>'+
    '<div class="field-group"><label>Görünen Ad</label><input type="text" id="set-display" value="'+esc(accName)+'" maxlength="30"></div>'+
    '<div class="field-group"><label>Biyografi</label><textarea id="set-bio" maxlength="150" placeholder="Kendinden bahset...">'+esc(acc.bio||'')+'</textarea><div class="field-hint">En fazla 150 karakter</div></div>'+
    '<button class="btn-primary" data-action="save-profile" style="padding:10px 24px;font-size:12px;border-radius:10px">Kaydet</button>'+
    '<div style="margin-top:24px;padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">Hesabı Sil</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">Bu hesabı ve tüm mesajlarını kalıcı olarak siler. Diğer hesapların etkilenmez.</p><button data-action="delete-account" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" class="btn-danger-del">Hesabı Sil</button></div>'
  }else if(cat==='theme'){
    var cur=getTheme();
    content.innerHTML='<div class="stitle">Tema Ayarları</div><div class="stitle-sub">Fareyi tema üzerine getirerek önizle, tıklayarak aktif et</div><div class="theme-grid">'+
      ['default','royal','forest','wine','slate','plum','coffee','teal','ember','navy','emerald','cloud','pearl','mist','cream','sage','lilac','coral','sky','linen','frost'].map(function(t){return '<div class="theme-card tp-'+t+(cur===t?' active':'')+'" data-theme="'+t+'" data-action="select-theme"><div class="theme-card-preview"><div class="tcp-dot"></div><div class="tcp-bar"><div></div><div></div><div></div></div></div><div class="theme-card-name">'+themes[t]+'</div></div>'}).join('')+
      '</div>'
  }else if(cat==='privacy'){
    var notifChecked=ls('notifications')!==false?'checked':'';
    var autoStartChecked='';var bgChecked='';
    if(window.electronAPI&&electronAPI.getAutoStart){try{var as=await electronAPI.getAutoStart();$('autostart-toggle').checked=as}catch(e){}}
    if(window.electronAPI&&electronAPI.getBackgroundMode){try{var bg=await electronAPI.getBackgroundMode();$('background-toggle').checked=bg}catch(e){}}
    content.innerHTML='<div class="stitle">Gizlilik & Güvenlik</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="notif-toggle" '+notifChecked+' data-action="toggle-setting" data-key="notifications"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Bildirimler</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Masaüstü bildirimlerini aç/kapat</span>'+
      '</div>'+
      '<div class="stitle" style="margin-top:24px">Arka Plan Servisi</div>'+
      '<div style="margin-bottom:10px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="autostart-toggle" data-action="toggle-autostart"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Başlangıçta Aç</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Windows başlatıldığında otomatik açılsın</span>'+
      '</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="background-toggle" data-action="toggle-background"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Arka Planda Çalıştır</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Kapatınca tepsiye küçülsün, bildirimler devam etsin</span>'+
      '</div>'+
      '<div class="field-group"><label>E-posta Adresi <span style="font-size:9px;color:var(--text4);font-weight:400">(şu anlık devre dışı)</span></label><input type="email" id="set-email" value="'+(function(){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===store.activeAccountId)return esc(a[i].email)}return''})()+'"></div>'+
      '<div class="field-group" style="margin-top:6px"><button class="btn-primary" id="save-email-btn" data-action="save-email" style="opacity:.5;cursor:not-allowed">E-postayı Kaydet</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">Şifre Değiştir</h4>'+
      '<div class="field-group"><label>Mevcut Şifre</label><input type="password" id="cur-pass" placeholder="••••••••"></div>'+
      '<div class="field-group"><label>Yeni Şifre</label><input type="password" id="new-pass" placeholder="••••••••"></div>'+
      '<div class="field-group"><label>Yeni Şifre (Tekrar)</label><input type="password" id="new-pass2" placeholder="••••••••"></div>'+
      '<button class="btn-primary" id="save-pass-btn" disabled data-action="change-password">Şifreyi Değiştir</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">🔐 Uçtan Uca Şifreleme</h4>'+
      '<p style="font-size:11px;color:var(--text4);margin-bottom:10px;line-height:1.5">Tüm mesajlar RSA-2048 ile şifrelenir. Anahtarların cihazında saklanır, Firebase dahil hiçbir sunucu mesajlarını okuyamaz.</p>'+
      '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span id="e2e-status" style="font-size:11px;color:#22c55e">✓ Aktif</span></div></div>'
  }else if(cat==='media'){
    var micOptions='<option value="">Varsayılan</option>',spkOptions='<option value="">Varsayılan</option>';
    try{var devices=await navigator.mediaDevices.enumerateDevices();
      devices.forEach(function(d){
        if(d.kind==='audioinput')micOptions+='<option value="'+d.deviceId+'">'+esc(d.label||'Mikrofon '+(micOptions.match(/option value=/g)||[]).length)+'</option>';
        if(d.kind==='audiooutput')spkOptions+='<option value="'+d.deviceId+'">'+esc(d.label||'Hoparlör '+(spkOptions.match(/option value=/g)||[]).length)+'</option>'
      });
      var ms=$('media-mic-select');if(ms)ms.innerHTML=micOptions;
      var ss=$('media-spk-select');if(ss)ss.innerHTML=spkOptions
    }catch(e){console.error(e)}}catch(e){}
    
    content.innerHTML='<div class="stitle">Ses ve Görüntü</div>'+
      '<div class="stitle-sub" style="margin-bottom:18px">Mikrofon, hoparlör, kamera ve ekran ayarlarını yönet</div>'+
      '<div style="display:flex;flex-direction:column;gap:14px">'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🎥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Kamera</h4>'+
          '<div id="camera-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span id="camera-placeholder" style="font-size:11px;color:var(--text4);opacity:.6">Kamera kapalı</span>'+
          '</div>'+
          '<button class="btn-primary" id="camera-toggle-btn" data-action="toggle-camera" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Kamerayı Aç</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🎤</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Mikrofon</h4>'+
          '<select id="media-mic-select" style="width:100%;padding:7px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);margin-bottom:8px;outline:none">'+micOptions+'</select>'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
            '<div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">'+
              '<div id="mic-level" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent));border-radius:3px;transition:width .08s"></div>'+
            '</div>'+
            '<span id="mic-level-text" style="font-size:10px;color:var(--text4);min-width:35px;text-align:right;font-variant-numeric:tabular-nums">- dB</span>'+
          '</div>'+
          '<button class="btn-primary" id="mic-toggle-btn" data-action="toggle-mic-test" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Mikrofonu Test Et</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔊</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Hoparlör</h4>'+
          '<select id="media-spk-select" style="width:100%;padding:7px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);margin-bottom:8px;outline:none">'+spkOptions+'</select>'+
          '<div style="margin-bottom:8px">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--text4)">Ses Seviyesi</span><span id="vol-value" style="font-size:11px;font-weight:600;color:var(--text2)">80%</span></div>'+
            '<input type="range" min="0" max="100" value="80" data-action="set-volume" style="width:100%;height:4px;-webkit-appearance:none;background:var(--bg3);border-radius:2px;outline:none;accent-color:var(--accent)">'+
          '</div>'+
          '<button class="btn-primary" data-action="test-speaker" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Hoparlörü Test Et</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🖥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">Ekran Paylaşımı</h4>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">Görüşme sırasında call bar\'daki 🖥 butonunu kullan.</div>'+
          '<button class="btn-primary" data-action="test-screen" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Test Et</button>'+
          '<div id="screen-share-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:none;align-items:center;justify-content:center;margin-top:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span style="font-size:11px;color:var(--text4);opacity:.6">Paylaşım kapalı</span>'+
          '</div>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔇</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">Gürültü Engelleme</h4>'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
            '<label class="toggle"><input type="checkbox" id="noise-toggle" '+(ls('noiseSuppression')?'checked':'')+' data-action="toggle-noise"><span class="toggle-track"></span><span class="toggle-label" style="font-size:11px;color:var(--text4)">Arka plan gürültüsünü engelle</span></label>'+
          '</div>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">Mikrofonunuzdaki arka plan seslerini (fan, klavye, trafik vb.) otomatik olarak azaltır.</div>'+
          '<div style="display:flex;gap:8px;align-items:center">'+
            '<span style="font-size:10px;color:var(--text4)">Seviye:</span>'+
            '<select id="noise-level" style="flex:1;padding:6px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);outline:none" data-action="set-noise-level">'+
              '<option value="low" '+(ls('noiseLevel')==='low'?'selected':'')+'>Düşük</option>'+
              '<option value="medium" '+(ls('noiseLevel')==='medium'?'selected':'')+'>Orta</option>'+
              '<option value="high" '+(ls('noiseLevel')==='high'?'selected':'')+'>Yüksek</option>'+
            '</select>'+
          '</div>'+
        '</div>'+
      '</div>'
  }else if(cat==='shortcuts'){
    var defaultShortcuts=[
      {id:'upload',label:'Dosya yükleme menüsü',key:'g',ctrl:false,alt:true},
      {id:'voiceMsg',label:'Sesli mesaj',key:'m',ctrl:false,alt:true},
      {id:'micToggle',label:'Mikrofon aç/kapa',key:'',ctrl:false,alt:false},
      {id:'speakerToggle',label:'Kulaklık aç/kapa',key:'',ctrl:false,alt:false},
      {id:'statusCycle',label:'Durum değiştir',key:'',ctrl:false,alt:false},
      {id:'voiceCall',label:'Sesli arama',key:'',ctrl:false,alt:false},
      {id:'editLast',label:'Son mesajı düzenle',key:'ArrowUp',ctrl:false,alt:false}
    ];
    var savedShortcuts=ls('shortcuts')||{};
    var html='<div class="stitle">Kısayollar</div><div class="stitle-sub">Klavye kısayollarını özelleştir</div><div style="display:flex;flex-direction:column;gap:6px">';
    for(var si=0;si<defaultShortcuts.length;si++){
      var sc=defaultShortcuts[si];
      var saved=savedShortcuts[sc.id];
      var displayKey=getShortcutDisplay(saved||sc);
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--border)">'+
        '<span style="font-size:12px;color:var(--text3)">'+sc.label+'</span>'+
        '<div style="display:flex;align-items:center;gap:6px" id="sc-group-'+sc.id+'">'+
          '<button data-action="record-shortcut" data-sc-id="'+sc.id+'" style="padding:4px 10px;border:none;border-radius:6px;background:var(--bg3);color:var(--text4);font-family:monospace;font-size:11px;cursor:pointer;min-width:70px;text-align:center;transition:all .15s" id="sc-'+sc.id+'" title="Atamak için tıkla">'+(displayKey||'Atama')+'</button>'+
          (store.recordingShortcut?'':'<button data-action="reset-shortcut" data-sc-id="'+sc.id+'" style="width:24px;height:24px;border:none;border-radius:5px;background:transparent;cursor:pointer;color:var(--text4);font-size:12px;display:inline-flex;align-items:center;justify-content:center" title="Sıfırla">↺</button>')+
        '</div></div>'
    }
    html+='</div>';
    content.innerHTML=html
  }else if(cat==='danger'){
    content.innerHTML='<div class="stitle">Veri Yönetimi</div>'+
      '<div style="padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">Hesabı Sil</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">Bu hesabı ve tüm mesajlarını kalıcı olarak siler. Diğer hesapların etkilenmez.</p><button data-action="delete-account" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" class="btn-danger-del">Hesabı Sil</button></div>'
  }else if(cat==='about'){
    var updateBtn = '<button id="update-btn" data-action="check-update" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:var(--accent);color:#fff;transition:all .2s">Güncellemeleri Kontrol Et</button>';
    var updateBar = '<div id="update-bar" style="display:none;margin-top:16px"></div>';
    content.innerHTML='<div class="stitle">Hakkında</div>'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px"><div style="width:48px;height:48px;border-radius:14px;background:var(--grad);display:flex;align-items:center;justify-content:center"><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.477 2 2 6.477 2 12c0 2.17.678 4.182 1.838 5.843L2.5 21.5l3.657-1.338A9.967 9.967 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></div><div><div style="font-size:16px;font-weight:700;color:var(--text)">WaxMes</div><div id="about-version" style="font-size:11px;color:var(--text4)">v0.1.0</div></div></div>'+
      '<p style="font-size:12px;color:var(--text3);line-height:1.7;margin-bottom:16px">WaxMes, arkadaş grupları için tasarlanmış modern bir mesajlaşma uygulamasıdır. Hızlı, güvenli ve kullanımı kolaydır.</p>'+
      '<div style="padding:12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);font-size:11px;color:var(--text4);line-height:1.6">'+
      '<b style="color:var(--text3)">Özellikler:</b><br>• Gerçek zamanlı mesajlaşma<br>• Grup sohbetleri<br>• Medya paylaşımı (görsel, GIF)<br>• Mesaj düzenleme ve silme<br>• Çoklu tema desteği<br>• Çevrimiçi/Boşta/Rahatsız Etme durumları<br>• Hesap yönetimi ve oturum hatırlama<br><br>'+
      '<b style="color:var(--text3)">Teknolojiler:</b><br>• Electron • Vanilla JS • CSS3<br><br>'+
      '<b style="color:var(--text3)">Geliştirici:</b><br>• Waxur tarafından geliştiriliyor</div>'+
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
  btn.textContent = 'Kontrol ediliyor...';
  btn.disabled = true;
  store._updateCheckLock = true;
  if(window.electronAPI && electronAPI.checkForUpdates){
    if(btn.dataset.downloaded === '1') {
      electronAPI.installUpdate();
      store._updateCheckLock = false;
      return;
    }
    showUpdateBar('Güncelleme kontrol ediliyor...', 'info');
    try {
      var result = await electronAPI.checkForUpdates();
      store._updateCheckLock = false;
      if(result && result.error){
        btn.textContent = 'Güncellemeleri Kontrol Et';
        btn.disabled = false;
        showUpdateBar('Hata: '+result.error, 'error');
        return;
      }
      if(result && result.updateAvailable){
        btn.textContent = 'v'+result.version+' İndir';
        btn.dataset.found = '1';
        btn.disabled = false;
        showUpdateBar('Yeni sürüm v'+result.version+' mevcut (mevcut: v'+result.currentVersion+'). İndirmek için tıkla.', 'info');
        btn.onclick = async function(){
          btn.textContent = 'İndiriliyor...';
          btn.disabled = true;
          try {
            var resp = await electronAPI.startDownload();
            if(!resp || !resp.success){
              btn.textContent = 'Güncellemeleri Kontrol Et';
              btn.disabled = false;
              showUpdateBar('İndirme hatası: '+(resp&&resp.error?resp.error:'Bilinmeyen hata'), 'error');
            }
          } catch(err) {
            btn.textContent = 'Güncellemeleri Kontrol Et';
            btn.disabled = false;
            showUpdateBar('İndirme başarısız: '+(err&&err.message?err.message:err), 'error');
          }
        };
      } else {
        btn.textContent = 'Güncellemeleri Kontrol Et';
        btn.disabled = false;
        showUpdateBar('Zaten en son sürümü kullanıyorsun.', 'info');
      }
    } catch(err) {
      store._updateCheckLock = false;
      btn.textContent = 'Güncellemeleri Kontrol Et';
      btn.disabled = false;
      showUpdateBar('Kontrol başarısız: '+(err&&err.message?err.message:err), 'error');
    }
  } else {
    store._updateCheckLock = false;
    showUpdateBar('Güncelleme kontrolü sadece masaüstü uygulamasında çalışır.', 'error');
    btn.textContent = 'Güncellemeleri Kontrol Et';
    btn.disabled = false;
  }
}
function showUpdateBar(msg, type){
  var bar = $('update-bar');
  if(!bar) return;
  var colors = {info: 'var(--accent)', success: '#22c55e', error: '#ef4444'};
  bar.style.display = 'block';
  bar.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:'+(colors[type]||colors.info)+'20;border:1px solid '+(colors[type]||colors.info)+'40;font-size:12px;color:var(--text3)">'+msg+'</div>';
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
    showUpdateBar('Yeni sürüm v'+version+' mevcut. İndirmek için tıkla.', 'info');
    if(btn) btn.onclick = async function(){
      btn.textContent = 'İndiriliyor...';
      btn.disabled = true;
      try {
        var resp = await electronAPI.startDownload();
        if(!resp || !resp.success){
          btn.textContent = 'Güncellemeleri Kontrol Et';
          btn.disabled = false;
          showUpdateBar('İndirme hatası: '+(resp&&resp.error?resp.error:'Bilinmeyen hata'), 'error');
        }
      } catch(err) {
        btn.textContent = 'Güncellemeleri Kontrol Et';
        btn.disabled = false;
        showUpdateBar('İndirme başarısız: '+(err&&err.message?err.message:err), 'error');
      }
    };
  });
  window.electronAPI.onUpdateProgress(function(percent){
    var bar = $('update-bar');
    if(bar) bar.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:var(--accent)20;border:1px solid var(--accent)40;font-size:12px;color:var(--text3)">İndiriliyor: %'+percent+'</div>';
  });
  window.electronAPI.onUpdateDownloaded(function(){
    var btn = $('update-btn');
    if(btn) { btn.textContent = 'Yeniden Başlat'; btn.dataset.downloaded = '1'; btn.disabled = false; }
    showUpdateBar('Güncelleme indirildi. Kurulum için "Yeniden Başlat" butonuna tıkla.', 'success');
    if(btn) btn.onclick = function(){
      electronAPI.installUpdate();
    };
  });
  window.electronAPI.onUpdateError(function(msg){
    var btn = $('update-btn');
    if(btn) { btn.textContent = 'Güncellemeleri Kontrol Et'; btn.dataset.found = '0'; btn.disabled = false; }
    showUpdateBar('Güncelleme hatası: '+msg, 'error');
  });
}
