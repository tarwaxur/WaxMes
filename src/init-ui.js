// ===== UI EVENT BINDINGS (replaces inline onclick/oninput/onkeydown/onblur/onchange in index.html) =====

document.addEventListener('DOMContentLoaded', function(){

  // --- Titlebar ---
  var tb=document.querySelectorAll('.titlebar-btn');
  if(tb.length>=3){
    tb[0].onclick=function(){electronAPI.minimize()};
    tb[1].onclick=function(){electronAPI.maximize()};
    tb[2].onclick=function(){electronAPI.close()}
  }

  // --- Welcome ---
  var wl=$('screen-welcome');
  if(wl){
    var wlBtns=wl.querySelectorAll('.welcome-btn,.welcome-links a');
    if(wlBtns[0])wlBtns[0].onclick=function(){goToLogin()};
    if(wlBtns[1])wlBtns[1].onclick=function(){goToRegister()};
    if(wlBtns[2])wlBtns[2].onclick=function(){showTos()}
  }

  // --- Login ---
  var le=$('login-email'),lp=$('login-pass'),lb=$('login-btn');
  if(le)le.oninput=function(){validateLogin()};
  if(lp)lp.oninput=function(){validateLogin()};
  if(lb)lb.onclick=function(){doLogin()};
  var loginBack=document.querySelector('.login-back');
  if(loginBack)loginBack.onclick=function(){goToWelcome()};
  var loginFooter=document.querySelector('.login-footer a');
  if(loginFooter)loginFooter.onclick=function(){goToRegister()};

  // --- Register ---
  var rsb=$('reg-step-back'),rn=$('reg-next');
  if(rsb)rsb.onclick=function(){regPrev()};
var regBtns=document.querySelectorAll('#screen-register .login-back');
if(regBtns.length>=2)regBtns[1].onclick=function(){goToWelcome()};
  var ap=$('avatar-picker');
  if(ap)ap.onclick=function(){pickAvatar()};
  var ru=$('reg-username'),rd=$('reg-display'),re=$('reg-email'),rp=$('reg-pass'),rp2=$('reg-pass2'),rt=$('reg-terms');
  if(ru)ru.oninput=function(){validateRegister()};
  if(rd)rd.oninput=function(){validateRegister()};
  if(re)re.oninput=function(){validateRegister()};
  if(rp)rp.oninput=function(){validateRegister()};
  if(rp2)rp2.oninput=function(){validateRegister()};
  if(rt)rt.onchange=function(){validateRegister()};
  if(rn)rn.onclick=function(){regNext()};
  var regFooter=document.querySelector('#screen-register .login-footer a');
  if(regFooter)regFooter.onclick=function(){goToLogin()};
  var regTosLink=document.querySelector('#reg-terms + .toggle-label a');
  if(regTosLink)regTosLink.onclick=function(e){e.stopPropagation();showTos()};

  // --- Sidebar ---
  var sub=$('sidebar-user-btn');
  if(sub)sub.onclick=function(){toggleAvatarMenu()};
  var adStatus=document.querySelector('.ad-status');
  if(adStatus)adStatus.onclick=function(){cycleStatus()};
  document.querySelectorAll('.ad-item').forEach(function(el){
    var txt=el.textContent.trim();
    if(txt.indexOf('Çevrimiçi')===0)el.onclick=function(){setStatus(STATUS.ONLINE);hideAvatarMenu()};
    else if(txt.indexOf('Boşta')===0)el.onclick=function(){setStatus(STATUS.IDLE);hideAvatarMenu()};
    else if(txt.indexOf('Rahatsız')===0)el.onclick=function(){setStatus(STATUS.DND);hideAvatarMenu()};
    else if(txt.indexOf('Grup')===0)el.onclick=function(){hideAvatarMenu();newGroup()};
    else if(txt.indexOf('Ayar')===0)el.onclick=function(){hideAvatarMenu();showSettings()};
    else if(txt.indexOf('Çıkış')===0)el.onclick=function(){doLogout()}
  });
  var af=$('sidebar-actions');if(af){
    var afBtn=af.querySelector('.sidebar-action-btn');
    if(afBtn)afBtn.onclick=function(){showFriendsPanel()}
  }
  var searchInp=document.querySelector('.sidebar-search input');
  if(searchInp)searchInp.oninput=function(){filterConversations(this.value)};
  var ab=$('archive-bar');
  if(ab)ab.onclick=function(){toggleArchiveView()};

  // --- Chat header ---
  var chb=$('chat-header-btn');
  if(chb)chb.onclick=function(){showProfilePanel()};
  var chActions=document.querySelectorAll('#chat-header-btn ~ div button');
  if(chActions.length>=4){
    chActions[0].onclick=function(e){e.stopPropagation();startCall()};
    chActions[1].onclick=function(e){e.stopPropagation();openSearch()};
    chActions[2].onclick=function(e){e.stopPropagation();showMediaGallery()};
    chActions[3].onclick=function(e){e.stopPropagation();showPinnedMessages()}
  }

  // --- Call bar ---
  var lv=$('call-local-video');
  if(lv)lv.onclick=function(){enlargeCallVideo()};
  var cm=$('call-mic-btn'),cc=$('call-cam-btn'),cs=$('call-screen-btn'),csp=$('call-speaker-btn'),ce=$('call-end-btn');
  if(cm)cm.onclick=function(){toggleCallMic()};
  if(cc)cc.onclick=function(){toggleCallCamera()};
  if(cs)cs.onclick=function(){toggleCallScreen()};
  if(csp)csp.onclick=function(){toggleCallSpeaker()};
  if(ce)ce.onclick=function(){endCall()};

  // --- Incoming call ---
  var ic=document.querySelectorAll('#incoming-call button');
  if(ic.length>=2){
    ic[0].onclick=function(){declineCall()};
    ic[1].onclick=function(){acceptCall()}
  }

  // --- Emoji picker ---
  var eb=$('emoji-btn');
  if(eb)eb.onclick=function(){toggleEmojiPicker()};
  document.querySelectorAll('.emoji-cat').forEach(function(el){
    el.onclick=function(){switchEmojiCat(this.dataset.cat)}
  });

  // --- Upload menu ---
  var ub=$('upload-btn');
  if(ub)ub.onclick=function(){toggleUploadMenu()};
  document.querySelectorAll('.um-item').forEach(function(el){
    var txt=el.textContent.trim();
    if(txt.indexOf('Görsel')===0)el.onclick=function(){sendMedia('image')};
    else if(txt.indexOf('Video')===0)el.onclick=function(){sendMedia('video')};
    else if(txt.indexOf('Döküman')===0)el.onclick=function(){sendMedia('document')}
  });

  // --- Voice ---
  var vb=$('voice-btn');
  if(vb)vb.onclick=function(){startVoice()};
  var vs=document.querySelector('.vr-send');
  if(vs)vs.onclick=function(){sendVoice()};
  var vc=document.querySelector('.vr-cancel');
  if(vc)vc.onclick=function(){cancelVoice()};

  // --- Reply bar ---
  var rbc=document.querySelector('#reply-bar button');
  if(rbc)rbc.onclick=function(){cancelReply()};

  // --- Chat input ---
  var ci=$('chat-input');
  if(ci){
    ci.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}};
    ci.onblur=function(){stopTyping()}
  }
  var csb=$('chat-send');
  if(csb)csb.onclick=function(){sendMessage()};
  var nmi=$('new-msg-indicator'),sbb=$('scroll-bottom-btn');
  if(nmi)nmi.onclick=function(){scrollToBottom()};
  if(sbb)sbb.onclick=function(){scrollToBottom()};

  // --- Profile panel ---
  var ppb=document.querySelector('.profile-panel-header button');
  if(ppb)ppb.onclick=function(){closeProfilePanel()};

  // --- Settings ---
  var sh=$('settings-content');
  if(sh){
    var sBack=document.querySelector('.settings-back');
    if(sBack)sBack.onclick=function(){hideSettings()};
    // Delegation for dynamic settings content
    sh.addEventListener('click',function(e){
      var t=e.target.closest('[data-action]');if(!t)return;
      switch(t.dataset.action){
        case 'pick-avatar':pickSettingsAvatar();break;
        case 'save-profile':saveProfileSettings();break;
        case 'delete-account':resetAllData();break;
        case 'select-theme':if(t.dataset.theme)selectTheme(t.dataset.theme);break;
        case 'save-email':saveEmail();break;
        case 'change-password':changePassword();break;
        case 'toggle-camera':toggleCamera();break;
        case 'toggle-mic-test':toggleMicTest();break;
        case 'test-speaker':testSpeaker();break;
        case 'test-screen':testScreenShare();break;
        case 'record-shortcut':recordShortcut(t.dataset.scId);break;
        case 'reset-shortcut':resetShortcut(t.dataset.scId);break;
        case 'check-update':checkUpdate();break
      }
    });
    sh.addEventListener('change',function(e){
      var t=e.target,a=t.dataset.action;
      if(a==='toggle-setting'&&t.dataset.key)ls(t.dataset.key,t.checked);
      else if(a==='toggle-autostart')toggleAutoStart(t.checked);
      else if(a==='toggle-background')toggleBackground(t.checked);
      else if(a==='toggle-noise')ls(STORAGE_KEYS.NOISE_SUPPRESSION,t.checked);
      else if(a==='set-noise-level')ls(STORAGE_KEYS.NOISE_LEVEL,t.value)
    });
    sh.addEventListener('input',function(e){
      var t=e.target;
      if(t.id==='set-email'){var b=$('save-email-btn');if(b)b.disabled=!t.value.trim()}
      else if(t.id==='new-pass'){var b=$('save-pass-btn'),p2=$('new-pass2');if(b)b.disabled=t.value.length<6||(p2&&p2.value!==t.value)}
      else if(t.id==='new-pass2'){var b=$('save-pass-btn'),p1=$('new-pass');if(b)b.disabled=!p1||p1.value.length<6||t.value!==p1.value}
      else if(t.dataset.action==='set-volume'){var v=$('vol-value');if(v)v.textContent=t.value+'%';ls(STORAGE_KEYS.VOLUME,t.value/100)}
    });
    sh.addEventListener('mouseover',function(e){
      var t=e.target.closest('[data-action="select-theme"]');
      if(t&&t.dataset.theme)previewTheme(t.dataset.theme)
    });
    sh.addEventListener('mouseout',function(e){
      var t=e.target.closest('[data-action="select-theme"]');
      if(t){var r=e.relatedTarget;if(!r||!t.contains(r))unpreviewTheme()}
    })
  }
  document.querySelectorAll('.settings-cat').forEach(function(el){
    el.onclick=function(){showSettingsCat(this.dataset.cat)}
  });

  // --- TOS modal ---
  var mt=$('modal-tos');
  if(mt){
    var mtClose=mt.querySelectorAll('.modal-close,.modal-btn-secondary');
    mtClose.forEach(function(el){el.onclick=function(){hideTos()}});
    var mtAccept=mt.querySelector('.modal-btn-primary');
    if(mtAccept)mtAccept.onclick=function(){acceptTos()}
  }

  // --- Pinned modal ---
  var mp=$('modal-pinned');
  if(mp){
    var mpClose=mp.querySelector('.modal-close');
    if(mpClose)mpClose.onclick=function(){$('modal-pinned').classList.remove('active')}
  }

  // --- Search modal ---
  var ms=$('modal-search');
  if(ms){
    var msClose=ms.querySelector('.modal-close');
    if(msClose)msClose.onclick=function(){$('modal-search').classList.remove('active')};
    var si=$('search-input');
    if(si)si.oninput=function(){searchMessages(this.value)}
  }

  // --- Gallery modal ---
  var mg=$('modal-gallery');
  if(mg){
    var mgClose=mg.querySelector('.modal-close');
    if(mgClose)mgClose.onclick=function(){$('modal-gallery').classList.remove('active')}
  }

  // --- Delete modal --- (confirm wired dynamically in JS, hide wired here)
  var dm=$('modal-delete');
  if(dm){
    var dmCancel=dm.querySelector('.modal-btn-secondary');
    if(dmCancel)dmCancel.onclick=function(){hideDeleteModal()}
  }

  // --- Media modal ---
  var mm=$('modal-media');
  if(mm){
    var mmClose=mm.querySelector('.modal-close');
    if(mmClose)mmClose.onclick=function(){hideMediaModal()};
    var mmPrev=$('media-prev-btn');
    if(mmPrev)mmPrev.onclick=function(){mediaPrev()};
    var mmNext=$('media-next-btn');
    if(mmNext)mmNext.onclick=function(){mediaNext()};
    var mmCancel=mm.querySelectorAll('.modal-footer .modal-btn-secondary');
    mmCancel.forEach(function(el){el.onclick=function(){hideMediaModal()}});
    var mmSend=mm.querySelector('.modal-btn-primary');
    if(mmSend)mmSend.onclick=function(){confirmSendMedia()}
  }

  // --- Group modal ---
  var mgr=$('modal-group');
  if(mgr){
    var mgrClose=mgr.querySelector('.modal-close');
    if(mgrClose)mgrClose.onclick=function(){hideGroupModal()};
    var ga=$('group-avatar-picker');
    if(ga)ga.onclick=function(){pickGroupAvatar()};
    var gn=$('group-name');
    if(gn)gn.oninput=function(){validateGroup()};
    var gs=$('group-search');
    if(gs)gs.oninput=function(){filterGroupMembers(this.value)};
    var mgrCancel=mgr.querySelectorAll('.modal-footer .modal-btn-secondary');
    mgrCancel.forEach(function(el){el.onclick=function(){hideGroupModal()}})
  }

  // --- Friends modal ---
  var mf=$('modal-friends');
  if(mf){
    var mfClose=mf.querySelector('.modal-close');
    if(mfClose)mfClose.onclick=function(){$('modal-friends').classList.remove('active')}
  }
  document.querySelectorAll('.friends-tab').forEach(function(el){
    el.onclick=function(){switchFriendsTab(this.dataset.tab)}
  });
  // Delegation: friends-content
  var fc=$('friends-content');
  if(fc){
    fc.addEventListener('click',function(e){
      var t=e.target.closest('[data-action]');if(!t)return;
      switch(t.dataset.action){
        case 'start-conv':startConvWith(t.dataset.friendName,t.dataset.friendId);break;
        case 'create-group':$('modal-friends').classList.remove('active');setTimeout(newGroup,300);break;
        case 'accept-friend':acceptFriendRequest(t.dataset.reqId);break;
        case 'decline-friend':declineFriendRequest(t.dataset.reqId);break;
        case 'withdraw-request':withdrawRequest(t.dataset.reqId);break;
        case 'send-friend-request':sendFriendRequest();break
      }
    });
    fc.addEventListener('contextmenu',function(e){
      var t=e.target.closest('[data-context="friend-menu"]');if(!t)return;
      e.preventDefault();showFriendMenu(e,t.dataset.friendName,t.dataset.friendId)
    });
    fc.addEventListener('keydown',function(e){
      if(e.target.id==='add-friend-input'&&e.key==='Enter'){e.preventDefault();sendFriendRequest()}
    })
  }

  // --- Forward modal ---
  var fs=$('forward-search');
  if(fs)fs.oninput=function(){filterForwardContacts(this.value)}

  // --- Saved accounts ---
  var sa=$('saved-accounts');
  if(sa){
    sa.addEventListener('click',function(e){
      var t=e.target.closest('[data-action="remove-account"]');if(!t)return;
      e.stopPropagation();removeAccount(t.dataset.accId)
    })
  }

  // --- Global img error fallback delegation (capture phase) ---
  document.addEventListener('error',function(e){
    var img=e.target;if(img.tagName!=='IMG')return;
    var bg=img.dataset.errBg,txt=img.dataset.errText,fs=img.dataset.errFs;
    var border=img.dataset.errBorder,clearKey=img.dataset.errClear,isAvatar=img.dataset.errAvatar;
    img.style.display='none';
    if(bg)img.parentElement.style.background=bg;
    if(txt)img.parentElement.textContent=txt;
    if(fs)img.parentElement.style.fontSize=fs;
    if(border)img.parentElement.style.border=border;
    if(clearKey)store[clearKey]=null;
    if(isAvatar)img.parentElement.style.fontWeight='700'
  },true);

});
