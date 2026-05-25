// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown',function(e){
  if(recordingShortcut)return;
  if($('settings-page').classList.contains('active')&&e.key!=='Escape'&&e.key!=='Enter')return;
  if(e.key==='Escape'){
    e.preventDefault();
    if(document.activeElement)document.activeElement.blur();
    if($('modal-tos').classList.contains('active')){closeModal('modal-tos')}
    else if($('modal-group').classList.contains('active')){closeModal('modal-group')}
    else if($('modal-delete').classList.contains('active')){closeModal('modal-delete',function(){hideDeleteModal()})}
    else if($('modal-media').classList.contains('active')){closeModal('modal-media',function(){pendingMediaFiles=[];mediaThumbCount=0})}
    else if($('modal-forward').classList.contains('active')){closeModal('modal-forward',function(){forwardMsgData=null;forwardingLock=false})}
    else if($('modal-search').classList.contains('active')){closeModal('modal-search')}
    else if($('modal-pinned').classList.contains('active')){closeModal('modal-pinned')}
    else if($('modal-gallery').classList.contains('active')){closeModal('modal-gallery')}
    else if($('modal-friends').classList.contains('active')){closeModal('modal-friends')}
    else if($('upload-menu').classList.contains('active')){hideUploadMenu()}
    else if(emojiPickerVisible){$('emoji-picker').style.display='none';emojiPickerVisible=false}
    else if(profilePanelOpen){closeProfilePanel()}
    else if($('settings-page').classList.contains('active')){hideSettings()}
    else if($('avatar-dropdown').classList.contains('active')){hideAvatarMenu()}
    else if($('context-menu').classList.contains('active')){hideContextMenu()}
  }
  if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){
    e.preventDefault();
    if(document.activeElement)document.activeElement.blur();
    if($('modal-delete').classList.contains('active')){
      e.preventDefault();
      if(pendingAlert){closeModal('modal-delete',function(){hideDeleteModal()})}
      else if(pendingRemoveMember)removeFromGroupConfirm();
      else if(pendingDeleteGroupId)confirmDeleteGroup();
      else if(pendingClearConvId)confirmClearConversation();
      else confirmDelete()
    }
    else if($('modal-media').classList.contains('active')){e.preventDefault();confirmSendMedia()}
    else if($('modal-group').classList.contains('active')){if(!$('group-create-btn').disabled){e.preventDefault();$('group-create-btn').onclick()}}
    else if($('modal-forward').classList.contains('active')){e.preventDefault();forwardToSelected()}
  }
  var tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||e.target.isContentEditable)return;
  var saved=ls('shortcuts')||{};
  for(var sid in saved){
    var s=saved[sid];
    if(s.key&&e.key===s.key&&e.ctrlKey===!!s.ctrl&&e.altKey===!!s.alt&&e.shiftKey===!!s.shift&&e.metaKey===!!s.meta){
      e.preventDefault();
      if(sid==='upload')toggleUploadMenu();
      else if(sid==='voiceMsg')startVoice();
      else if(sid==='micToggle')toggleCallMic();
      else if(sid==='speakerToggle')toggleCallSpeaker();
      else if(sid==='statusCycle')cycleStatus();
      else if(sid==='voiceCall'&&activeConvId)startCall();
      else if(sid==='editLast'&&activeConvId)editLastMessage();
      return
    }
  }
  var _s=ls('shortcuts')||{};
  if(e.altKey&&e.key==='g'&&!_s['upload']){e.preventDefault();toggleUploadMenu()}
  if(e.altKey&&e.key==='m'&&!_s['voiceMsg']){e.preventDefault();startVoice()}
  if(e.key==='Escape'&&document.getElementById('call-video-overlay')){closeCallVideo();e.preventDefault()}
  if(e.ctrlKey&&e.key==='f'&&!_s['search']){e.preventDefault();openSearch()}
});

document.addEventListener('paste',function(e){
  var items=e.clipboardData&&e.clipboardData.items;
  if(!items||!activeConvId)return;
  var imageBlobs=[];
  for(var pi=0;pi<items.length;pi++){
    if(items[pi].type.indexOf('image')!==-1){
      e.preventDefault();
      var blob=items[pi].getAsFile();
      if(blob)imageBlobs.push(blob)
    }
  }
  if(imageBlobs.length>0){
    var loaded=0;
    imageBlobs.forEach(function(blob){
      var reader=new FileReader();
      reader.onload=function(ev){
        pendingMediaFiles.push({path:'Pasted image',dataUrl:ev.target.result,name:'Pasted image '+loaded,type:'image'});
        loaded++;
        if(loaded===imageBlobs.length){
          mediaIndex=0;
          showMediaPreview()
        }
      };
      reader.readAsDataURL(blob)
    })
  }
});

// ===== INPUT HANDLER =====
var chatInput=$('chat-input');if(chatInput)chatInput.addEventListener('input',function(){$('chat-send').disabled=this.value.trim().length===0});$('chat-send').disabled=true;

// ===== MAXIMIZE =====
if(window.electronAPI&&electronAPI.onMaximized){electronAPI.onMaximized(function(v){$('app-window').classList.toggle('maximized',v)})}

// ===== SCROLL HANDLING =====
document.addEventListener('wheel',function(e){
  var t=e.target;
  var mediaList=t.closest('.media-files-list-inner');
  if(mediaList){
    e.preventDefault();
    mediaList.scrollLeft+=e.deltaY
  }else if(!t.closest('.chat-messages')&&!t.closest('.conversations')&&!t.closest('.modal-body')&&!t.closest('.auth-inner')&&!t.closest('.settings-content')&&!t.closest('.profile-panel-body')&&!t.closest('#emoji-body')&&!t.closest('#emoji-cats')){
    e.preventDefault()
  }
},{passive:false});

// ===== CLOSE MENUS =====
document.addEventListener('click',function(e){
  if(!e.target.closest('.context-menu')&&!e.target.closest('.conv-item')&&!e.target.closest('.msg'))hideContextMenu();
  if(e.target.classList.contains('modal-overlay')){hideTos();hideDeleteModal();hideMediaModal();$('modal-forward').classList.remove('active');forwardMsgData=null;forwardingLock=false}
  if(!e.target.closest('.upload-menu')&&!e.target.closest('#upload-btn'))hideUploadMenu()
});
document.addEventListener('mousedown',function(e){if(!e.target.closest('.sidebar-user')&&!e.target.closest('.avatar-dropdown'))hideAvatarMenu()});

var contextMenuMsgId=null;
document.getElementById('context-menu').addEventListener('mouseenter',function(){});
var contextMenuRelY=0,contextMenuRelX=0;
var chatMsgs=$('chat-messages');
if(chatMsgs)chatMsgs.addEventListener('scroll',function(){
  if(contextMenuMsgId)hideContextMenu()
},{passive:true});

// ===== INIT =====
if(!ls('version')){localStorage.clear();ls('version','0.5.0')}
applyTheme(getTheme());
if(window.electronAPI&&electronAPI.getAppVersion)electronAPI.getAppVersion().then(function(v){setAppVersion(v)}).catch(function(){});

function hideLoading(cb){
  var ls=$('loading-screen');
  if(ls&&ls.style.display!=='none'){
    showScreen(null);
    ls.style.animation='loadFadeOut .3s ease forwards';
    setTimeout(function(){ls.style.display='none';ls.style.animation='';if(cb)cb()},300)
  }else{if(cb)cb()}
}

function initWelcome(){
  hideLoading(function(){
    migratePlainAccountPasswords().then(function(){
      var accs=getAccounts();
      if(accs.length===1){showScreen('screen-login');$('login-email').value=accs[0].email;validateLogin();$('login-pass').focus()}
      else{renderSavedAccounts();showScreen('screen-welcome');setTimeout(renderSavedAccounts,100)}
    })
  })
}

$('loading-screen').style.display='flex';

function loadFirebase(cb){
  var scripts=['https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js','https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'];
  var loaded=0;
  scripts.forEach(function(src){
    var s=document.createElement('script');s.src=src;
    s.onload=s.onerror=function(){loaded++;if(loaded===scripts.length&&cb)cb()};
    document.head.appendChild(s);
  });
  setTimeout(function(){if(loaded<scripts.length&&cb)cb()},8000);
}

loadFirebase(function(){
  try{firebase.initializeApp(firebaseConfig);window.db=firebase.firestore();window.auth=firebase.auth();window.storage=firebase.storage()}catch(e){}
  if(window.auth){
    auth.onAuthStateChanged(function(user){
      var authSeq=++_authStateSeq;
      function staleAuthEvent(){return authSeq!==_authStateSeq||!auth.currentUser||auth.currentUser.uid!==user.uid}
      if(user){
        if(_explicitLogin){_explicitLogin=false;return}
        var accs=getAccounts(),acc=null;
        var loginEmail=(user.email||'').toLowerCase();for(var ai=0;ai<accs.length;ai++){if(accs[ai].email&&accs[ai].email.toLowerCase()===loginEmail){acc=accs[ai];break}}
        var pendingPassword=_pendingLoginPassword;
        if(acc){
          if(acc.password)rememberAccountPassword(acc,acc.password);
          _pendingLoginPassword=null;hideLoading(function(){if(staleAuthEvent())return;doLoginWith({id:user.uid,username:acc.username||user.email.split('@')[0],displayName:acc.displayName||user.displayName||user.email.split('@')[0],email:user.email,avatar:acc.avatar||null,status:acc.status||'online',bio:acc.bio||'',password:pendingPassword||null})})
        }else{
          db.collection('users').doc(user.uid).get().then(function(doc){
            if(staleAuthEvent())return;
            if(doc.exists){var d=doc.data();_pendingLoginPassword=null;hideLoading(function(){if(staleAuthEvent())return;doLoginWith({id:user.uid,username:d.username,displayName:d.displayName,email:user.email,avatar:d.avatar,status:d.status||'online',bio:d.bio||'',password:pendingPassword||null})})}
            else{_pendingLoginPassword=null;initWelcome()}
          }).catch(function(){if(!staleAuthEvent()){_pendingLoginPassword=null;initWelcome()}})
        }
      }else{
        if(_authTransitioning)return;
        resetSessionState();
        _authTransitioning=false;
        _pendingLoginPassword=null;
        initWelcome()
      }
    })
  }else{initWelcome()}
});