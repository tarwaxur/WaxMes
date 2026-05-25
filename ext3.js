
function $(id){return document.getElementById(id)}
function ls(k,v){if(v!==undefined){localStorage.setItem('wm_'+k,JSON.stringify(v));return v}try{return JSON.parse(localStorage.getItem('wm_'+k))}catch{return null}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function escJs(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\x27").replace(/"/g,"\\x22")}
function timeNow(){var d=new Date();return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}

var currentScreen='screen-welcome',regStep=0,avatarDataUrl=null;
var showScreen=function(id){document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});if(id){$(id).classList.add('active');currentScreen=id}};
var goToWelcome=function(){renderSavedAccounts();showScreen('screen-welcome')};
var goToLogin=function(){showScreen('screen-login');$('login-email').value='';$('login-pass').value='';avatarDataUrl=null;validateLogin()};
var goToRegister=function(){var accs=getAccounts();if(accs.length>=3){showAlert('En fazla 3 hesap bulundurabilirsin. Yeni hesap eklemek için önce kayıtlı bir hesabı sil.');return}regStep=0;updateRegStep();showScreen('screen-register')};

// ===== SAVED ACCOUNTS =====
function getAccounts(){return ls('accounts')||[]}
function groupsStorageKey(){return activeAccountId?'groups_'+activeAccountId:'groups'}
function groupBelongsToAccount(g,accountId){
  if(!accountId||!g)return true;
  if(g.creatorId===accountId)return true;
  if(g.adminIds&&g.adminIds.indexOf(accountId)!==-1)return true;
  if(g.memberIds&&g.memberIds.indexOf(accountId)!==-1)return true;
  return !g.memberIds||g.memberIds.length===0
}
function getGroups(){
  var scoped=ls(groupsStorageKey());
  if(scoped)return scoped;
  var legacy=ls('groups')||[];
  var accountId=fbUserId()||activeAccountId;
  if(accountId)legacy=legacy.filter(function(g){return groupBelongsToAccount(g,accountId)});
  return legacy
}
function saveGroups(groups){ls(groupsStorageKey(),groups||[]);return groups||[]}
function saveAccount(acc){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===acc.id){for(var k in acc){if(k!=='password'&&acc[k]!==undefined&&acc[k]!==null)a[i][k]=acc[k]}a[i].lastLogin=acc.lastLogin||a[i].lastLogin;if(a[i].password!==undefined)delete a[i].password;ls('accounts',a);return}}for(var i=0;i<a.length;i++){if(a[i].email===acc.email){for(var k in acc){if(k!=='password'&&acc[k]!==undefined&&acc[k]!==null)a[i][k]=acc[k]}a[i].lastLogin=acc.lastLogin||a[i].lastLogin;if(a[i].password!==undefined)delete a[i].password;ls('accounts',a);return}}if(acc.password!==undefined)delete acc.password;a.unshift(acc);ls('accounts',a)}
function saveGroup(g){var grps=getGroups();for(var i=0;i<grps.length;i++){if(grps[i].id===g.id){grps[i]=g;saveGroups(grps);return}}grps.push(g);saveGroups(grps)}
function removeAccount(id){var accs=getAccounts();var acc=null;for(var i=0;i<accs.length;i++){if(accs[i].id===id){acc=accs[i];break}}if(!acc)return;var body=$('modal-delete').querySelector('.modal-body');body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'+
  '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Hesabı Kaldır</h4>'+
  '<p style="color:var(--text4);font-size:12px">"'+esc(accountFallbackName(acc))+'" hesabı silinsin mi? Bu işlem geri alınamaz.</p>';
$('delete-confirm-btn').textContent='Kaldır';
$('delete-confirm-btn').onclick=function(){closeModal('modal-delete',function(){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===id){forgetAccountPassword(a[i]);a.splice(i,1);break}}ls('accounts',a);renderSavedAccounts();hideDeleteModal()})};
$('modal-delete').classList.add('active')}
function setActiveAccount(id){ls('activeAccount',id)}
function cleanAccountText(v){return (v===undefined||v===null?'':String(v)).trim()}
function getAccountById(id){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===id)return a[i]}return null}
function getAccountByEmail(email){email=cleanAccountText(email).toLowerCase();if(!email)return null;var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].email&&a[i].email.toLowerCase()===email)return a[i]}return null}
function accountFallbackName(acc){var email=cleanAccountText(acc&&acc.email);return cleanAccountText(acc&&(acc.displayName||acc.username))||(email?email.split('@')[0]:'Kullanıcı')}
function accountFallbackUsername(acc){var email=cleanAccountText(acc&&acc.email);return cleanAccountText(acc&&acc.username)||(email?email.split('@')[0]:accountFallbackName(acc))}
function getActiveAccount(){return getAccountById(activeAccountId)}
function accountPasswordKey(acc){return 'account_password_'+cleanAccountText(acc&&acc.id)}
function accountPasswordEmailKey(email){return 'account_password_email_'+cleanAccountText(email).toLowerCase()}
async function storeAccountSecret(key,password){
  if(window.electronAPI&&electronAPI.safeEncrypt){
    var enc=await electronAPI.safeEncrypt(JSON.stringify(password));
    if(enc){localStorage.setItem('wm_'+key,enc);return true}
  }
  localStorage.removeItem('wm_'+key);
  return false
}
async function loadAccountSecret(key){
  var raw=localStorage.getItem('wm_'+key);if(!raw)return null;
  if(window.electronAPI&&electronAPI.safeDecrypt){
    var dec=await electronAPI.safeDecrypt(raw);
    if(dec){try{return JSON.parse(dec)}catch(e){return dec}}
  }
  try{return JSON.parse(raw)}catch(e){return null}
}
function stripPlainPassword(acc){
  if(!acc||acc.password===undefined)return;
  var accs=getAccounts(),changed=false;
  for(var i=0;i<accs.length;i++){
    if((acc.id&&accs[i].id===acc.id)||(acc.email&&accs[i].email===acc.email)){
      if(accs[i].password!==undefined){delete accs[i].password;changed=true}
    }
  }
  if(changed)ls('accounts',accs);
  delete acc.password
}
async function rememberAccountPassword(acc,password){
  if(!acc||!password)return;
  if(acc.id)await storeAccountSecret(accountPasswordKey(acc),password);
  if(acc.email)await storeAccountSecret(accountPasswordEmailKey(acc.email),password);
  stripPlainPassword(acc)
}
async function loadAccountPassword(acc){
  if(!acc)return null;
  var p=null;
  if(acc.id)p=await loadAccountSecret(accountPasswordKey(acc));
  if(!p&&acc.email)p=await loadAccountSecret(accountPasswordEmailKey(acc.email));
  if(!p&&acc.password){p=acc.password;await rememberAccountPassword(acc,p)}
  return p
}
async function migratePlainAccountPasswords(){
  var accs=getAccounts();
  for(var i=0;i<accs.length;i++){
    var p=accs[i].password||await loadAccountPassword(accs[i]);
    if(p)await rememberAccountPassword(accs[i],p)
  }
}
function forgetAccountPassword(acc){
  if(!acc)return;
  if(acc.id)localStorage.removeItem('wm_'+accountPasswordKey(acc));
  if(acc.email)localStorage.removeItem('wm_'+accountPasswordEmailKey(acc.email));
  stripPlainPassword(acc)
}
function migrateAccountScopedStorage(oldId,newId){
  if(!oldId||!newId||oldId===newId)return;
  ['messages_','conversations_','status_','e2e_private_','friends_','groups_'].forEach(function(prefix){
    var oldKey='wm_'+prefix+oldId,newKey='wm_'+prefix+newId;
    if(localStorage.getItem(oldKey)!==null&&localStorage.getItem(newKey)===null)localStorage.setItem(newKey,localStorage.getItem(oldKey))
  });
  var oldPw='wm_'+accountPasswordKey({id:oldId}),newPw='wm_'+accountPasswordKey({id:newId});
  if(localStorage.getItem(oldPw)!==null&&localStorage.getItem(newPw)===null)localStorage.setItem(newPw,localStorage.getItem(oldPw));
  localStorage.removeItem(oldPw);
  migrateGroupsOwnerIds(oldId,newId);
  migrateConversationIdentity(oldId,newId)
}
function replaceIdInArray(arr,oldId,newId){
  if(!arr)return arr;
  for(var i=0;i<arr.length;i++){if(arr[i]===oldId)arr[i]=newId}
  return arr
}
function migrateGroupIdentity(group,oldId,newId){
  if(!group||!oldId||!newId||oldId===newId)return group;
  if(group.creatorId===oldId)group.creatorId=newId;
  replaceIdInArray(group.adminIds,oldId,newId);
  replaceIdInArray(group.memberIds,oldId,newId);
  normalizeGroupMembers(group);
  group.memberIds=getGroupMemberIds(group);
  return group
}
function migrateGroupsOwnerIds(oldId,newId){
  var groups=getGroups(),changed=false;
  for(var i=0;i<groups.length;i++){
    var before=JSON.stringify(groups[i]);
    migrateGroupIdentity(groups[i],oldId,newId);
    if(JSON.stringify(groups[i])!==before)changed=true
  }
  if(changed)saveGroups(groups)
}
function migrateConversationIdentity(oldId,newId){
  var key='conversations_'+newId,convs=ls(key),changed=false;
  if(!convs)return;
  for(var i=0;i<convs.length;i++){
    if(convs[i].isGroup){
      var before=JSON.stringify(convs[i]);
      migrateGroupIdentity(convs[i],oldId,newId);
      if(JSON.stringify(convs[i])!==before)changed=true
    }else{
      var beforeIds=JSON.stringify(convs[i].memberIds||[]);
      replaceIdInArray(convs[i].memberIds,oldId,newId);
      if(JSON.stringify(convs[i].memberIds||[])!==beforeIds)changed=true
    }
  }
  if(changed)ls(key,convs)
}
function syncSidebarProfile(acc,status){
  acc=acc||getActiveAccount();if(!acc)return;
  var display=accountFallbackName(acc),initial=display.charAt(0).toUpperCase();
  var nameEl=$('sidebar-username');if(nameEl)nameEl.textContent=display;
  var avEl=$('sidebar-avatar');
  if(avEl){
    if(acc.avatar){
      avEl.style.background='transparent';
      avEl.innerHTML='<img src="'+esc(acc.avatar)+'" alt="" onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,#2563eb,#6d28d9)\';this.parentElement.textContent=\''+escJs(initial)+'\'">';
    }else{
      avEl.style.background='linear-gradient(135deg,#2563eb,#6d28d9)';
      avEl.textContent=initial
    }
  }
  updateStatusUI(status||currentStatus||'online')
}
function mergeAccountProfile(incoming){
  incoming=incoming||{};
  var email=cleanAccountText(incoming.email).toLowerCase();
  var existing=incoming.id?getAccountById(incoming.id):null;
  if(!existing&&email)existing=getAccountByEmail(email);
  var acc=existing||{};
  var oldId=acc.id||null;
  if(incoming.id&&acc.id!==incoming.id){acc.id=incoming.id}
  if(!acc.id)acc.id=uid();
  if(oldId&&oldId!==acc.id)migrateAccountScopedStorage(oldId,acc.id);
  if(email)acc.email=email;
  var display=cleanAccountText(incoming.displayName||incoming.display||incoming.name)||accountFallbackName(acc)||accountFallbackName(incoming);
  var username=cleanAccountText(incoming.username)||accountFallbackUsername(acc)||accountFallbackUsername(incoming);
  acc.displayName=display;
  acc.username=username;
  if(incoming.avatar!==undefined)acc.avatar=incoming.avatar||null;
  else if(acc.avatar===undefined)acc.avatar=null;
  if(incoming.bio!==undefined)acc.bio=incoming.bio||'';
  else if(acc.bio===undefined)acc.bio='';
  if(incoming.status)acc.status=incoming.status;
  acc.lastLogin=new Date().toISOString();
  saveAccount(acc);
  acc=getAccountById(acc.id)||getAccountByEmail(acc.email)||acc;
  if(incoming.password)rememberAccountPassword(acc,incoming.password);
  else stripPlainPassword(acc);
  activeAccountId=acc.id;
  setActiveAccount(acc.id);
  return acc
}

function renderSavedAccounts(){
  var el=$('saved-accounts');if(!el)return;
  var a=getAccounts(),changed=false;for(var ai=0;ai<a.length;ai++){if(!a[ai].id){a[ai].id=uid();changed=true}}if(changed)ls('accounts',a);el.innerHTML='';
  for(var i=0;i<a.length;i++){(function(acc){
    var d=document.createElement('div');d.className='saved-account';
    var display=accountFallbackName(acc),initial=display.charAt(0).toUpperCase();
    d.innerHTML='<div class="sa-avatar"'+(acc.avatar?' style="background:none"':'')+'>'+(acc.avatar?'<img src="'+esc(acc.avatar)+'" alt="" onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,#2563eb,#6d28d9)\';this.parentElement.textContent=\''+escJs(initial)+'\'">':esc(initial))+'</div><div class="sa-info"><div class="sa-name">'+esc(display)+'</div><div class="sa-email" title="'+esc(acc.email||'')+'">'+esc(acc.email||'')+'</div></div><button class="sa-remove" onclick="event.stopPropagation();removeAccount(\''+escJs(acc.id)+'\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    d.onclick=function(){autoLogin(acc)};
    el.appendChild(d)
  })(a[i])}
}

async function autoLogin(acc){
  if(!window.auth)return;
  var password=await loadAccountPassword(acc);
  if(!password){
    goToLogin();$('login-email').value=acc.email;validateLogin();$('login-pass').focus();
    showAlert('Bu hesap için kayıtlı güvenli oturum bulunamadı. Lütfen şifreni gir.');
    return
  }
  _explicitLogin=true;
  _authTransitioning=true;
  $('loading-screen').style.display='flex';
  document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});
  auth.signInWithEmailAndPassword(acc.email,password).then(function(cred){
    var u=cred.user;
    _authTransitioning=false;
    // Use LOCAL account data (always up-to-date from settings saves)
    hideLoading(function(){doLoginWith({id:u.uid,username:acc.username||u.email.split('@')[0],displayName:acc.displayName||u.displayName||u.email.split('@')[0],email:u.email,avatar:acc.avatar||null,status:'online',bio:acc.bio||'',password:password})})
  }).catch(function(){
    _explicitLogin=false;
    _authTransitioning=false;
    hideLoading(function(){
      goToLogin();$('login-email').value=acc.email;validateLogin();$('login-pass').focus();
      showAlert('Otomatik giriş başarısız. Lütfen şifreni gir.')
    })
  })
}

function doLoginWith(acc){showApp(acc)}

// ===== LOGIN =====
function validateLogin(){var e=$('login-email').value.trim().toLowerCase(),p=$('login-pass').value,ok=e.length>0&&p.length>0;$('fg-login-email').classList.toggle('invalid',e.length>0&&!e.endsWith('@gmail.com'));$('fg-login-pass').classList.toggle('invalid',p.length>0&&p.length<6);$('login-btn').disabled=!ok;return ok}
function doLogin(){
  var e=$('login-email').value.trim().toLowerCase(),p=$('login-pass').value;
  if(!e||!p||!window.auth)return;
  if(!e.endsWith('@gmail.com')){$('fg-login-email').classList.add('invalid');$('fg-login-email').querySelector('.field-error').textContent='Sadece @gmail.com hesapları kabul edilir';return}
  console.log('[Auth] Login started for', e);
  $('login-btn').disabled=true;
  _pendingLoginPassword=p;
  auth.signInWithEmailAndPassword(e,p).then(function(cred){
    console.log('[Auth] Login success, uid:', cred.user.uid);
  }).catch(function(err){
    _pendingLoginPassword=null;
    console.error('[Auth] Login error:', err.code, err.message);
    $('login-btn').disabled=false;
    var msg='',field=$('fg-login-email');
    if(err.code==='auth/user-not-found'){msg='Bu e-posta ile kayıtlı hesap bulunamadı.';field=$('fg-login-email');field.classList.add('invalid');field.querySelector('.field-error').textContent=msg}
    else if(err.code==='auth/wrong-password'){msg='Hatalı şifre.';field=$('fg-login-pass');field.classList.add('invalid');field.querySelector('.field-error').textContent=msg}
    else if(err.code==='auth/too-many-requests'){msg='Çok fazla başarısız giriş. Hesabın geçici olarak kilitlendi. Birkaç dakika sonra tekrar dene.'}
    else if(err.code==='auth/network-request-failed'){msg='Ağ hatası. İnternet bağlantını kontrol et.'}
    else if(err.code==='auth/invalid-email'){msg='Geçersiz e-posta adresi.'}
    else if(err.code==='auth/user-disabled'){msg='Bu hesap devre dışı bırakılmış.'}
    else{msg='Giriş yapılamadı: '+err.message}
    showAlert(msg)
  })
}

// ===== REGISTER =====
function updateRegStep(){document.querySelectorAll('.register-step').forEach(function(s){s.classList.remove('active')});var el=document.querySelector('.register-step[data-step="'+regStep+'"]');if(el)el.classList.add('active');document.querySelectorAll('.register-dot').forEach(function(d,i){d.className='register-dot';if(i===regStep)d.classList.add('active');else if(i<regStep)d.classList.add('done')});var sb=$('reg-step-back');if(sb)sb.style.display=regStep===0?'none':'flex';var n=$('reg-next');if(n)n.textContent=regStep===2?'Kayıt Ol':'İleri';validateRegister()}
function regNext(){
  if(!validateRegister())return;
  var btn=$('reg-next');
  function advance(){regStep++;updateRegStep();if(btn)btn.disabled=false}
  function dbError(label){if(btn)btn.disabled=false;showAlert(label+' kontrolü yapılamadı: servis şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.')}
  function dbTimeout(label){if(btn)btn.disabled=false;showAlert(label+' kontrolü zaman aşımına uğradı. İnternet bağlantını kontrol et.')}
  if(regStep===0){
    var u=$('reg-username').value.trim();
    if(!/^[a-zA-Z0-9_]+$/.test(u)){$('fg-username').classList.add('invalid');$('fg-username').querySelector('.field-error').textContent='Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir';showAlert('Kullanıcı adı yalnızca harf, rakam ve alt çizgi (_) içerebilir.');return}
    if(u.length<3){$('fg-username').classList.add('invalid');$('fg-username').querySelector('.field-error').textContent='Kullanıcı adı en az 3 karakter olmalı';return}
    if(!window.auth||!auth.currentUser){advance();return}
    if(!window.db){showAlert('Veritabanı bağlantısı yok.');return}
    if(btn)btn.disabled=true;
    var timedOut=false,timer=setTimeout(function(){timedOut=true;dbTimeout('Kullanıcı adı')},15000);
    db.collection('users').where('username','==',u).get().then(function(snap){
      clearTimeout(timer);if(timedOut)return;
      if(!snap.empty){$('fg-username').classList.add('invalid');$('fg-username').querySelector('.field-error').textContent='Bu kullanıcı adı zaten alınmış';showAlert('Bu kullanıcı adı zaten alınmış. Lütfen farklı bir kullanıcı adı dene.');if(btn)btn.disabled=false;return}
      advance()
    }).catch(function(err){clearTimeout(timer);if(!timedOut){console.error('[Reg] Username check error:', err&&err.code?err.code:'', err&&err.message?err.message:err);dbError('Kullanıcı adı')}})
  }else if(regStep===1){
    advance()
  }else if(regStep<2){advance()}
  else completeRegistration()
}
function regPrev(){if(regStep>0){regStep--;updateRegStep()}}
function validateRegister(){var u=$('reg-username').value.trim(),d=$('reg-display').value.trim(),uOk=u.length>=3&&/^[a-zA-Z0-9_]+$/.test(u),dOk=d.length>=1;$('fg-username').classList.toggle('invalid',u.length>0&&!uOk);$('fg-display').classList.toggle('invalid',d.length>0&&!dOk);var e=$('reg-email').value.trim().toLowerCase(),eOk=e.endsWith('@gmail.com');$('fg-email').classList.toggle('invalid',e.length>0&&!eOk);var p=$('reg-pass').value,p2=$('reg-pass2').value,pOk=p.length>=6,p2Ok=p===p2&&p.length>0,t=$('reg-terms').checked;$('fg-pass').classList.toggle('invalid',p.length>0&&!pOk);$('fg-pass2').classList.toggle('invalid',p2.length>0&&!p2Ok);var steps=[uOk&&dOk,eOk,pOk&&p2Ok&&t];var btn=$('reg-next');if(btn)btn.disabled=!steps[regStep];return steps[regStep]}
function showAlert(msg){
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="var(--accent)" fill="none" stroke-width="1.5" style="margin-bottom:12px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Bilgi</h4>'+
    '<p style="color:var(--text4);font-size:12px">'+esc(msg)+'</p>';
  $('delete-confirm-btn').textContent='Tamam';
  $('delete-confirm-btn').onclick=function(){closeModal('modal-delete',function(){hideDeleteModal()})};
  $('modal-delete').classList.add('active');
  pendingAlert=true
}
function completeRegistration(){
  var u=$('reg-username').value.trim(),d=$('reg-display').value.trim()||u,e=$('reg-email').value.trim().toLowerCase(),p=$('reg-pass').value;
  if(!window.auth||!p)return;
  var btn=$('reg-next');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor...'}
  console.log('[Auth] Signup started for', e);
  function finishReg(errMsg){
    if(btn){btn.disabled=false;btn.textContent='Kayıt Ol'}
    if(errMsg)showAlert(errMsg)
  }
  if(!window.db){finishReg('Veritabanı bağlantısı yok.');return}
  var timedOut=false, timer=setTimeout(function(){timedOut=true;finishReg('Sunucu yanıt vermiyor. Lütfen tekrar dene.')},15000);
  _explicitLogin=true;
  _pendingLoginPassword=p;
  auth.createUserWithEmailAndPassword(e,p).then(function(cred){
    clearTimeout(timer);
    console.log('[Auth] Signup success, uid:', cred.user.uid);
    var uid=cred.user.uid;
    function cancelCreatedAccount(msg){
      _explicitLogin=false;
      _pendingLoginPassword=null;
      var deletePromise=auth.currentUser?auth.currentUser.delete().catch(function(){return null}):Promise.resolve();
      deletePromise.then(function(){finishReg(msg)})
    }
    function writeUserDoc(){
      db.collection('users').doc(uid).set({username:u,displayName:d,email:e,avatar:avatarDataUrl||null,bio:'',status:'online',createdAt:Date.now()}).then(function(){
        console.log('[Auth] User doc created');
        _explicitLogin=false;
        finishReg();
        showApp({id:uid,username:u,displayName:d,email:e,avatar:avatarDataUrl||null,status:'online',bio:'',password:p})
      }).catch(function(){
        console.warn('[Auth] User doc write failed, rolling back auth account');
        cancelCreatedAccount('Profil oluşturulamadı. Lütfen tekrar dene.')
      })
    }
    db.collection('users').where('username','==',u).limit(1).get().then(function(snap){
      if(!snap.empty){cancelCreatedAccount('Bu kullanıcı adı zaten alınmış. Lütfen farklı bir kullanıcı adı dene.');return}
      writeUserDoc()
    }).catch(function(err){
      console.error('[Reg] Username final check error:', err&&err.code?err.code:'', err&&err.message?err.message:err);
      cancelCreatedAccount('Kullanıcı adı kontrolü yapılamadı. Lütfen tekrar dene.')
    })
  }).catch(function(err){
    clearTimeout(timer);
    console.error('[Auth] Signup error:', err.code, err.message);
    if(timedOut)return;
    var msg='';
    if(err.code==='auth/email-already-in-use')msg='Bu e-posta adresi zaten kayıtlı.';
    else if(err.code==='auth/weak-password')msg='Şifre çok zayıf. En az 6 karakter kullan.';
    else if(err.code==='auth/network-request-failed')msg='Ağ hatası. İnternet bağlantını kontrol et.';
    else if(err.code==='auth/invalid-email')msg='Geçersiz e-posta adresi.';
    else msg='Kayıt olunamadı: '+err.message;
    _explicitLogin=false;
    _pendingLoginPassword=null;
    finishReg(msg)
  })
}

async function pickAvatar(){try{if(window.electronAPI&&electronAPI.selectFile){var r=await electronAPI.selectFile();if(r&&r.thumb){avatarDataUrl=r.thumb;var p=$('avatar-picker');p.innerHTML='<img src="'+r.thumb+'" alt="" onerror="this.style.display=\'none\';this.parentElement.style.border=\'1px dashed rgba(129,140,248,.2)\';avatarDataUrl=null">';p.style.border='none'}}}catch(e){}}

// ===== SHORTCUTS =====
var recordingShortcut=null;
var _recKeys=null;
var defaultShortcutsMap={
  upload:{key:'g',ctrl:false,alt:true},voiceMsg:{key:'m',ctrl:false,alt:true},
  micToggle:{key:'',ctrl:false,alt:false},speakerToggle:{key:'',ctrl:false,alt:false},
  statusCycle:{key:'',ctrl:false,alt:false},voiceCall:{key:'',ctrl:false,alt:false},
  editLast:{key:'ArrowUp',ctrl:false,alt:false}
};
function cancelRecord(){recordingShortcut=null;_recKeys=null;renderSettingsShortcuts()}
function finishRecord(id){
  recordingShortcut=null;
  var keys=_recKeys;_recKeys=null;
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
  if(recordingShortcut)return;
  // Clean up any leftover confirm buttons from previous incomplete sessions
  document.querySelectorAll('[id^="sc-save-"],[id^="sc-cancel-"]').forEach(function(el){el.remove()});
  _recKeys={key:'',ctrl:false,alt:false,shift:false,meta:false};
  recordingShortcut=id;
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
  if(!recordingShortcut)return;
  e.preventDefault();
  var key=e.key;
  if(key==='Escape'){cancelRecord();return}
  if(key==='Enter'){finishRecord(recordingShortcut);return}
  _recKeys.ctrl=e.ctrlKey;_recKeys.alt=e.altKey;_recKeys.shift=e.shiftKey;_recKeys.meta=e.metaKey;
  if(key!=='Control'&&key!=='Alt'&&key!=='Shift'&&key!=='Meta')_recKeys.key=key;
  var btn=$('sc-'+recordingShortcut);if(btn)btn.textContent=getShortcutDisplay(_recKeys)
});
document.addEventListener('keyup',function(e){
  if(!recordingShortcut)return;
  e.preventDefault();
  var btn=$('sc-'+recordingShortcut);if(btn)btn.textContent=getShortcutDisplay(_recKeys)
});
function resetShortcut(id){
  if(recordingShortcut){recordingShortcut=null;_recKeys=null}
  var def=defaultShortcutsMap[id];if(!def)return;
  var saved=ls('shortcuts')||{};
  delete saved[id];ls('shortcuts',saved);
  renderSettingsShortcuts()
}
function renderSettingsShortcuts(){showSettingsCat('shortcuts')}

// ===== TOS =====
function showTos(){$('modal-tos').classList.add('active')}
function hideTos(){$('modal-tos').classList.remove('active')}
function acceptTos(){$('reg-terms').checked=true;hideTos();validateRegister()}

// ===== STATUS =====
var currentStatus='online';
function updateStatusUI(s){currentStatus=s;
  var sidebar=$('sidebar-status');if(sidebar){var sd=sidebar.querySelector('.sd-dot');var st=$('sidebar-status-text');if(sd)sd.className='sd-dot';if(s==='online'){if(sd)sd.classList.add('sd-online');if(st)st.textContent='Çevrimiçi'}else if(s==='idle'){if(sd)sd.classList.add('sd-idle');if(st)st.textContent='Boşta'}else if(s==='dnd'){if(sd)sd.classList.add('sd-dnd');if(st)st.textContent='Rahatsız Etme'}}
  var ad=$('avatar-dropdown').querySelector('.ad-status');if(ad){var addot=ad.querySelector('.sd-dot');var adtxt=ad.querySelector('#ad-status-text')||ad.querySelector('span:last-child');if(addot)addot.className='sd-dot ad-dot';if(s==='online'){if(addot)addot.classList.add('sd-online');if(adtxt)adtxt.textContent='Çevrimiçi'}else if(s==='idle'){if(addot)addot.classList.add('sd-idle');if(adtxt)adtxt.textContent='Boşta'}else if(s==='dnd'){if(addot)addot.classList.add('sd-dnd');if(adtxt)adtxt.textContent='Rahatsız Etme'}}
}
var prevStatus=null,idleTimer=null;
function resetIdleTimer(){
  if(idleTimer){clearTimeout(idleTimer)}
  // Restore previous status on activity
  if(prevStatus&&currentStatus==='idle'&&prevStatus!=='idle'){setStatus(prevStatus,true)}
  prevStatus=null;
  // Start idle timer (15 minutes = 900000ms)
  idleTimer=setTimeout(function(){
    if(currentStatus!=='idle'){
      prevStatus=currentStatus;
      setStatus('idle',true)
    }
  },900000)
}
// Listen for activity events
['mousedown','keydown','mousemove','touchstart','scroll'].forEach(function(ev){
  document.addEventListener(ev,resetIdleTimer,{passive:true})
});
// Start timer on load
setTimeout(resetIdleTimer,1000);

function statusText(conv){
  if(!conv||conv.isGroup)return'';
  if(conv._status==='idle')return'Boşta';
  if(conv._status==='dnd')return'Rahatsız Etme';
  return conv.online?'Çevrimiçi':'Çevrimdışı'
}
function cycleStatus(){var o=['online','idle','dnd'],i=o.indexOf(currentStatus);if(i===-1)i=0;setStatus(o[(i+1)%3])}
function setStatus(s,skipSave){updateStatusUI(s);if(!skipSave)ls('status_'+activeAccountId,s);hideAvatarMenu();fbUpdateOnlineStatus(true,s);if(window.db&&fbUserId()){db.collection('users').doc(fbUserId()).update({status:s}).catch(function(){})}}

// ===== AVATAR DROPDOWN =====
function toggleAvatarMenu(){
  var el=$('avatar-dropdown');
  if(el.classList.contains('active')){hideAvatarMenu();return}
  el.classList.remove('closing');el.classList.add('active')
}
function hideAvatarMenu(){
  var el=$('avatar-dropdown');if(!el||!el.classList.contains('active'))return;
  el.classList.add('closing');
  setTimeout(function(){el.classList.remove('active','closing')},100)
}
function hideContextMenu(){
  var el=$('context-menu');if(!el||!el.classList.contains('active'))return;
  el.classList.add('closing');
  setTimeout(function(){el.classList.remove('active','closing');contextMenuMsgId=null;contextMenuScrollPos=0},100)
}

// ===== FORWARD MESSAGE =====
var forwardMsgData=null, forwardingLock=false;

function showForwardModal(items,e){
  forwardMsgData=e;
  var list=$('forward-contact-list');list.innerHTML='';
  for(var fci=0;fci<conversations.length;fci++){(function(c){
    var d=document.createElement('div');d.className='modal-member-item';
    d.innerHTML='<div class="mm-avatar" style="background:'+c.color+'">'+(c.isGroup?'G':c.avatar)+'</div><div class="mm-name">'+esc(c.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d._cid=c.id;
    d.onclick=function(){d.classList.toggle('selected')};
    list.appendChild(d)
  })(conversations[fci])}
  $('forward-caption').value='';
  $('modal-forward').classList.add('active')
}

function filterForwardContacts(q){
  q=q.toLowerCase();
  var items=$('forward-contact-list').querySelectorAll('.modal-member-item');
  for(var fi=0;fi<items.length;fi++){
    var name=items[fi].querySelector('.mm-name').textContent.toLowerCase();
    items[fi].style.display=name.indexOf(q)!==-1?'':'none'
  }
}

var _frCooldown=0;
function sendFriendRequest(){
  if(Date.now()-_frCooldown<10000){$('add-friend-result').textContent='⏳ 10 saniye bekleyin.';$('add-friend-result').style.color='#ef4444';return}
  var name=$('add-friend-input').value.trim();
  if(!name||!window.db){$('add-friend-result').textContent='Lütfen bir kullanıcı adı gir.';return}
  var fbUid=fbUserId();if(!fbUid)return;
  _frCooldown=Date.now();
  var opTimer=setTimeout(function(){$('add-friend-result').textContent='Zaman aşımı. İnternet bağlantını kontrol et.';$('add-friend-result').style.color='#ef4444'},30000);
  function fail(msg){clearTimeout(opTimer);$('add-friend-result').textContent=msg;$('add-friend-result').style.color='#ef4444'}
  function ok(msg){clearTimeout(opTimer);$('add-friend-input').value='';$('add-friend-result').textContent=msg;$('add-friend-result').style.color='var(--accent)';setTimeout(function(){$('add-friend-result').textContent='';$('add-friend-result').style.color='var(--text4)'},2500)}
  function step(next){clearTimeout(opTimer);opTimer=setTimeout(function(){$('add-friend-result').textContent='Zaman aşımı. İnternet bağlantını kontrol et.';$('add-friend-result').style.color='#ef4444'},30000);next()}
  function catchErr(label,err){
    clearTimeout(opTimer);
    console.error('[FriendReq] '+label+':', err&&err.code?err.code:'', err&&err.message?err.message:err);
    if(err&&err.code==='permission-denied'){fail('Yetki hatası. Lütfen tekrar giriş yap.');return}
    if(err&&err.code==='unavailable'){fail('Sunucuya bağlanılamadı.');return}
    fail('Hata ('+(err&&err.code?err.code:'?')+'): '+(err&&err.message?err.message:'Bilinmeyen hata'))
  }
  // Step 1: Search user
  db.collection('users').where('username','==',name).limit(1).get().then(function(snap){
    if(snap.empty){fail('Bu kullanıcı adıyla kayıtlı hesap bulunamadı.');return}
    var targetUser=snap.docs[0];
    if(targetUser.id===fbUid){fail('Kendine istek gönderemezsin.');return}
    // Step 2: Check already friends
    step(function(){
      db.collection('friends').doc(fbUid).collection('list').where('id','==',targetUser.id).get().then(function(fs){
        if(!fs.empty){fail('Bu kullanıcı zaten arkadaşlarında.');return}
        // Step 3: Check pending count + duplicate (single-field query, in-memory filter)
        step(function(){
          db.collection('friendRequests').where('from','==',fbUid).get().then(function(allSent){
            var pendingCount=0, alreadySent=false;
            allSent.forEach(function(doc){
              var d=doc.data();
              if(d.status==='pending'){pendingCount++;if(d.to===targetUser.id)alreadySent=true}
            });
            if(pendingCount>=5){fail('Çok fazla bekleyen isteğin var.');return}
            if(alreadySent){fail('Bu kullanıcıya zaten istek göndermişsin.');return}
            // Step 4: Send request
            var reqId=uid();
            var myAccs=getAccounts(),myAv=null;
            for(var ai=0;ai<myAccs.length;ai++){if(myAccs[ai].id===fbUid){myAv=myAccs[ai].avatar||null;break}}
            db.collection('friendRequests').doc(reqId).set({
              from:fbUid,fromName:$('sidebar-username').textContent||'Sen',
              to:targetUser.id,toName:targetUser.data().displayName||name,
              fromAvatar:myAv,toAvatar:targetUser.data().avatar||null,status:'pending',createdAt:Date.now()
            }).then(function(){ok('✓ "'+name+'" için arkadaşlık isteği gönderildi.')})
            .catch(function(err){catchErr('Gönderme',err)})
          }).catch(function(err){catchErr('İstek sorgusu',err)})
        })
      }).catch(function(err){catchErr('Arkadaş sorgusu',err)})
    })
  }).catch(function(err){catchErr('Kullanıcı arama',err)})
}
function acceptFriendRequest(reqId){
  if(!window.db)return;
  var uid=fbUserId();if(!uid)return;
  db.collection('friendRequests').doc(reqId).get().then(function(doc){
    if(!doc.exists)return;
    var data=doc.data();
    var friendId=data.from===uid?data.to:data.from;
    var friendName=data.from===uid?data.toName:data.fromName;
    var friendAvatar=data.from===uid?data.toAvatar||null:data.fromAvatar||null;
    var myAccs=getAccounts(),myAv=null;
    for(var ai=0;ai<myAccs.length;ai++){if(myAccs[ai].id===uid){myAv=myAccs[ai].avatar||null;break}}
    db.collection('friendRequests').doc(reqId).update({status:'accepted'}).then(function(){
      db.collection('friends').doc(uid).collection('list').doc(friendId).set({id:friendId,name:friendName,avatar:friendAvatar,accepted:Date.now()}).then(function(){
        db.collection('friends').doc(friendId).collection('list').doc(uid).set({id:uid,name:$('sidebar-username').textContent||'Sen',avatar:myAv,accepted:Date.now()}).then(function(){switchFriendsTab('friends')}).catch(function(){switchFriendsTab('friends')})
      }).catch(function(){switchFriendsTab('friends')})
    }).catch(function(){switchFriendsTab('friends')})
  }).catch(function(){switchFriendsTab('pending')})
}
function withdrawRequest(reqId){
  if(!window.db)return;
  db.collection('friendRequests').doc(reqId).delete().then(function(){switchFriendsTab('pending')}).catch(function(){switchFriendsTab('pending')})
}
function declineFriendRequest(reqId){
  if(!window.db)return;
  db.collection('friendRequests').doc(reqId).delete().then(function(){switchFriendsTab('pending')}).catch(function(){switchFriendsTab('pending')})
}
function updatePendingBadge(count){
  if(count<0)count=0;
  var sidebar=$('badge-pending-sidebar');
  var tab=$('badge-pending-tab');
  if(count>0){
    var c=count>99?'99+':''+count;
    [sidebar,tab].forEach(function(el){el.textContent=c;el.style.display='inline-flex'})
  }else{
    [sidebar,tab].forEach(function(el){el.style.display='none'})
  }
}
var _pendingUnsub=null;
var _outgoingUnsub=null;
function startPendingListener(uid){
  if(_pendingUnsub){_pendingUnsub()}
  if(_outgoingUnsub){_outgoingUnsub()}
  if(!window.db)return;
  _pendingUnsub=db.collection('friendRequests').where('to','==',uid).onSnapshot(function(snap){
    var count=0;
    snap.forEach(function(doc){if(doc.data().status==='pending')count++});
    updatePendingBadge(count)
  },function(err){
    if(err)console.error('pendingListener error:',err)
  });
  _outgoingUnsub=db.collection('friendRequests').where('from','==',uid).onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      if(change.type==='modified'){
        var d=change.doc.data();
        if(d.status==='accepted'){
          var friendsContent=$('friends-content');
          if(friendsContent&&friendsContent.closest('.modal.active')){
            switchFriendsTab('friends')
          }
        }
      }
      if(change.type==='removed'){
        var friendsContent=$('friends-content');
        if(friendsContent&&friendsContent.closest('.modal.active')){
          switchFriendsTab('pending')
        }
      }
    })
  },function(err){
    if(err)console.error('outgoingListener error:',err)
  })
}
function showFriendMenu(e,name,friendId){
  e.preventDefault();
  showContextMenu(e.clientX,e.clientY,[
    {label:'Sohbet Aç',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',action:function(){startConvWith(name,friendId)}},
    {label:'Arkadaşlıktan Çıkar',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',action:function(){removeFriend(friendId,name)}},
  ])
}
function removeFriend(friendId,name){
  if(!window.db)return;
  var uid=fbUserId();if(!uid)return;
  function done(){switchFriendsTab('friends')}
  if(friendId){
    db.collection('friends').doc(uid).collection('list').doc(friendId).delete().then(function(){
      db.collection('friends').doc(friendId).collection('list').doc(uid).delete().catch(function(){});
      done()
    }).catch(done);
    return
  }
  db.collection('friends').doc(uid).collection('list').where('name','==',name).get().then(function(snap){
    snap.forEach(function(doc){
      var fid=doc.id;
      doc.ref.delete().then(function(){
        db.collection('friends').doc(fid).collection('list').doc(uid).delete().catch(function(){});
        done()
      }).catch(done)
    })
  }).catch(done)
}

function showFriendsPanel(){
  $('modal-friends').classList.add('active');
  switchFriendsTab('friends')
}
function friendsCacheKey(){return 'friends_'+(fbUserId()||activeAccountId||'local')}
function getCachedFriends(){return ls(friendsCacheKey())||[]}
function setCachedFriends(friends){ls(friendsCacheKey(),friends||[])}
function refreshFriendsCache(){
  var uid=fbUserId();
  if(!window.db||!uid)return Promise.resolve(getCachedFriends());
  return db.collection('friends').doc(uid).collection('list').get().then(function(snap){
    var friends=snap.docs.map(function(d){return d.data()});
    setCachedFriends(friends);
    return friends
  }).catch(function(){return getCachedFriends()})
}

var _currentFriendsTab='friends';
function switchFriendsTab(tab){
  _currentFriendsTab=tab;
  document.querySelectorAll('.friends-tab').forEach(function(t){t.style.color='var(--text4)';t.style.background='transparent'});
  var el=document.querySelector('.friends-tab[data-tab="'+tab+'"]');
  if(el){el.style.color='var(--accent)';el.style.background='rgba(129,140,248,.06)'}
  var content=$('friends-content');
  var uid=fbUserId();
  if(tab==='friends'){
    if(!window.db||!uid){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>';return}
    db.collection('friends').doc(uid).collection('list').get().then(function(snap){
      if(_currentFriendsTab!==tab)return;
      var friends=snap.docs.map(function(d){return d.data()});
      setCachedFriends(friends);
      if(friends.length===0){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>'}
      else{
        var html='<div style="font-size:11px;color:var(--text4);margin-bottom:8px">'+friends.length+' arkadaş</div>';
        friends.forEach(function(f){
          var fAv=f.avatar;var fAvHtml;if(fAv&&fAv.indexOf('data:')===0){fAvHtml='<img src="'+fAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\'var(--grad)\';this.parentElement.textContent=\''+esc(f.name.charAt(0).toUpperCase())+'\'">'}else{fAvHtml=esc(f.name.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s" onclick="startConvWith(\''+escJs(f.name)+'\',\''+escJs(f.id)+'\')" oncontextmenu="showFriendMenu(event,\''+escJs(f.name)+'\',\''+escJs(f.id)+'\')" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'transparent\'"><div style="width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;overflow:hidden">'+fAvHtml+'</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text2)">'+esc(f.name)+'</div><div style="font-size:10px;color:var(--text4)">Çevrimiçi</div></div></div>'
        });
        html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)"><button class="btn-primary" onclick="$(\'modal-friends\').classList.remove(\'active\');setTimeout(newGroup,300)" style="padding:8px 16px;font-size:11px;border-radius:8px;width:100%">Grup Oluştur</button></div>';
        content.innerHTML=html
      }
    }).catch(function(){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>'})
  }else if(tab==='pending'){
    updatePendingBadge(0);
    if(!window.db||!uid){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>';return}
    Promise.all([
      db.collection('friendRequests').where('to','==',uid).get(),
      db.collection('friendRequests').where('from','==',uid).get()
    ]).then(function(results){
      if(_currentFriendsTab!==tab)return;
      var incoming=[]; results[0].forEach(function(d){if(d.data().status==='pending')incoming.push({id:d.id,data:d.data()})});
      var sent=[]; results[1].forEach(function(d){if(d.data().status==='pending')sent.push({id:d.id,data:d.data()})});
      var html='';
      if(incoming.length>0){
        html+='<div style="font-size:11px;color:var(--text4);margin-bottom:6px">Gelen istekler</div>';
        incoming.forEach(function(r){
          var rAv=r.data.fromAvatar;var rAvHtml;if(rAv&&rAv.indexOf('data:')===0){rAvHtml='<img src="'+rAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\'var(--grad)\';this.parentElement.textContent=\''+esc(r.data.fromName.charAt(0).toUpperCase())+'\'">'}else{rAvHtml=esc(r.data.fromName.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface);margin-bottom:4px"><div style="width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;overflow:hidden">'+rAvHtml+'</div><div style="flex:1;font-size:12px;color:var(--text2)">'+esc(r.data.fromName)+'</div><button onclick="acceptFriendRequest(\''+escJs(r.id)+'\')" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(34,197,94,.15);color:#22c55e;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600">Kabul Et</button><button onclick="declineFriendRequest(\''+escJs(r.id)+'\')" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600">Reddet</button></div>'
        })
      }
      if(sent.length>0){
        if(html)html+='<div style="margin-top:10px"></div>';
        html+='<div style="font-size:11px;color:var(--text4);margin-bottom:6px">Bekleyen isteklerin</div>';
        sent.forEach(function(r){
          var sAv=r.data.toAvatar;var sAvHtml;if(sAv&&sAv.indexOf('data:')===0){sAvHtml='<img src="'+sAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\'var(--bg3)\';this.parentElement.textContent=\''+esc(r.data.toName.charAt(0).toUpperCase())+'\'">'}else{sAvHtml=esc(r.data.toName.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface);margin-bottom:4px"><div style="width:34px;height:34px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--text4);font-size:12px;overflow:hidden">'+sAvHtml+'</div><div style="flex:1;font-size:12px;color:var(--text2)">'+esc(r.data.toName)+'</div><button onclick="withdrawRequest(\''+escJs(r.id)+'\')" style="padding:4px 10px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-family:inherit;font-size:10px;font-weight:600">İsteği Geri Al</button></div>'
        })
      }
      if(!html)html='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>';
      content.innerHTML=html
    }).catch(function(){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>'})
  }else if(tab==='add'){
    content.innerHTML='<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px">Kullanıcı Adıyla Ekle</label><input type="text" id="add-friend-input" placeholder="Örn: waxur" style="width:100%;padding:10px 14px;background:var(--input-bg);border:1px solid var(--border2);border-radius:10px;font-family:inherit;font-size:13px;color:var(--text2);outline:none;margin-bottom:8px" onkeydown="if(event.key===\'Enter\')sendFriendRequest()"><button class="btn-primary" onclick="sendFriendRequest()" style="padding:8px 16px;font-size:11px;border-radius:8px;width:100%">Arkadaşlık İsteği Gönder</button><div id="add-friend-result" style="margin-top:8px;font-size:11px;color:var(--text4)"></div></div>'
  }
}

function dmConvId(uid1,uid2){
  var s=[uid1,uid2].sort();return 'dm_'+s[0]+'_'+s[1]
}
function getConversationPeerId(conv){
  var uid=fbUserId()||activeAccountId;if(!conv||conv.isGroup)return null;
  var mids=conv.memberIds||[];
  for(var i=0;i<mids.length;i++){if(mids[i]&&mids[i]!==uid)return mids[i]}
  if(conv.id&&conv.id.indexOf('dm_')===0){
    var p=conv.id.slice(3).split('_');
    for(var j=0;j<p.length;j++){if(p[j]&&p[j]!==uid)return p[j]}
  }
  return conv.userId||conv.friendId||null
}
function makeGroupMemberFromConversation(conv){
  var mid=getConversationPeerId(conv);if(!mid)return null;
  return {id:mid,name:conv.name,avatar:conv.avatar||((conv.name||'?').charAt(0).toUpperCase()),color:conv.color||'var(--grad)',online:!!conv.online,isGroup:false}
}
function makeGroupMemberFromFriend(f,color){
  if(!f||!f.id)return null;
  return {id:f.id,name:f.name,avatar:f.avatar||((f.name||'?').charAt(0).toUpperCase()),color:color||'var(--grad)',online:true,isGroup:false}
}
function findFriendByIdOrName(id,name){
  var fs=getCachedFriends();
  for(var i=0;i<fs.length;i++){if((id&&fs[i].id===id)||(!id&&name&&fs[i].name===name))return fs[i]}
  return null
}
function findConversationByPeerId(memberId){
  for(var i=0;i<conversations.length;i++){
    var c=conversations[i];if(c.isGroup)continue;
    if(c.id===memberId||getConversationPeerId(c)===memberId)return c
  }
  return null
}
function normalizeGroupMembers(group){
  if(!group||!group.isGroup)return group;
  if(!group.members)group.members=[];
  var seen={},clean=[];
  for(var i=0;i<group.members.length;i++){
    var m=group.members[i];if(!m)continue;
    if(m.id&&m.id.indexOf('dm_')===0){var c=findConv(m.id);var cm=makeGroupMemberFromConversation(c);if(cm)m=cm}
    if(m.id&&m.id.indexOf('gf_')===0){var f=findFriendByIdOrName(null,m.name);var fm=makeGroupMemberFromFriend(f,m.color);if(fm)m=fm}
    if(!m.id||m.id.indexOf('friend_')===0){var f2=findFriendByIdOrName(m.id,m.name);var fm2=makeGroupMemberFromFriend(f2,m.color);if(fm2)m=fm2}
    if(!m.id||seen[m.id])continue;
    seen[m.id]=true;
    m.avatar=m.avatar||((m.name||'?').charAt(0).toUpperCase());
    m.color=m.color||'var(--grad)';
    clean.push(m)
  }
  group.members=clean;
  return group
}
function getGroupMemberIds(group){
  normalizeGroupMembers(group);
  var ids=[],seen={};
  function add(id){if(id&&id.indexOf('dm_')!==0&&id.indexOf('gf_')!==0&&id.indexOf('friend_')!==0&&!seen[id]){seen[id]=true;ids.push(id)}}
  var selfId=fbUserId()||activeAccountId;
  add(group.creatorId||selfId);
  add(selfId);
  for(var i=0;i<(group.members||[]).length;i++)add(group.members[i].id);
  return ids
}
function startConvWith(name,friendId){
  var uid=fbUserId();
  // Use deterministic conversation ID from sorted member UIDs
  var convId=dmConvId(uid,friendId||'');
  // Check if conversation already exists locally
  for(var ci=0;ci<conversations.length;ci++){
    var conv=conversations[ci];
    if(conv.id===convId||(!conv.isGroup&&conv.memberIds&&conv.memberIds.length===2&&conv.memberIds.indexOf(uid)!==-1&&conv.memberIds.indexOf(friendId)!==-1)){
      conv.hidden=false;
      conv.lastMsg=conv.lastMsg||'';
      $('modal-friends').classList.remove('active');
      selectConversation(conv.id);
      return
    }
  }
  // Create new conversation (or re-use existing Firestore doc)
  var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  var color=colors[Math.floor(Math.random()*colors.length)];
  var memberIds=[uid,friendId];
  var newConv={id:convId,name:name,avatar:name.charAt(0).toUpperCase(),color:color,online:true,lastMsg:'',time:'',unread:0,isGroup:false,memberIds:memberIds};
  if(window.db&&friendId)db.collection('users').doc(friendId).get().then(function(snap){if(snap.exists&&snap.data().avatar){newConv.avatar=snap.data().avatar;renderConversations()}}).catch(function(){});
  conversations.unshift(newConv);
  saveConversations();
  // Create/update Firestore conversation with members (idempotent)
  if(window.db&&uid)db.collection('conversations').doc(convId).set({type:'dm',memberIds:memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(function(){});
  renderConversations();
  $('modal-friends').classList.remove('active');
  selectConversation(convId)
}

var groupAvatarDataUrl=null;
function pickGroupAvatar(){
  if(window.electronAPI&&electronAPI.selectFile){
    electronAPI.selectFile().then(function(r){
      if(r&&r.thumb){
        groupAvatarDataUrl=r.thumb;
        var picker=$('group-avatar-picker');
        if(picker){picker.innerHTML='<img src="'+r.thumb+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';groupAvatarDataUrl=null">';picker.style.border='none';picker.style.background='transparent'}
        // If editing an existing group, update immediately
        if(activeConvId){
          var conv=findConv(activeConvId);
          if(conv&&conv.isGroup&&conv.creatorId===activeAccountId){
            conv.avatar=r.thumb;
            conv.avatarLetter=conv.name?conv.name.charAt(0).toUpperCase():'G';
            // Update saved groups in localStorage
            var gs=getGroups();
            for(var gi=0;gi<gs.length;gi++){if(gs[gi].id==activeConvId){gs[gi].avatar=r.thumb;saveGroups(gs);break}}
            // Update UI
            var headerAvatar=$('chat-header-avatar');
            if(headerAvatar&&activeConvId==conv.id)headerAvatar.innerHTML='<img src="'+r.thumb+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">';
            addGroupLog(conv.id,'👑 Grup fotoğrafı değiştirildi');
            fbSyncMembers(conv.id);
            if(activeConvId)renderMessages(activeConvId);
            renderConversations();
            if(profilePanelOpen)showProfilePanel()
          }
        }
      }
    })
  }
}

function filterGroupMembers(q){
  q=q.toLowerCase();
  var items=$('group-member-list').querySelectorAll('.modal-member-item');
  for(var fi=0;fi<items.length;fi++){
    var name=items[fi].querySelector('.mm-name').textContent.toLowerCase();
    items[fi].style.display=name.indexOf(q)!==-1?'':'none'
  }
}

async function forwardToSelected(){
  hiding=false;
  if(!forwardMsgData)return;
  var items=$('forward-contact-list').querySelectorAll('.modal-member-item.selected');
  var caption=$('forward-caption').value.trim();
  for(var fti=0;fti<items.length;fti++){
    var cid=items[fti]._cid;
    if(!cid)continue;
    var conv=findConv(cid);
    if(!conv)continue;
    var fwdTxt=forwardMsgData.text||'';
    // E2E encrypt forwarded text for target conversation
    if(e2eReady&&window.db&&fwdTxt){var pubKeys=await getRecipientPubKey(cid);if(pubKeys&&(Array.isArray(pubKeys)?pubKeys.length:1)){try{var enc=await e2eEncrypt(fwdTxt,pubKeys);if(enc&&enc.indexOf('🔒')===0){fwdTxt=enc}}catch(e){}}}
    var fwd={
      id:uid(),type:'sent',senderId:fbUserId(),text:fwdTxt,time:timeNow(),
      image:forwardMsgData.image||null,video:forwardMsgData.video||null,
      audio:forwardMsgData.audio||null,duration:forwardMsgData.duration||0,
      isForwarded:true,originalSender:forwardMsgData.originalSender||($('sidebar-username')&&$('sidebar-username').textContent||''),
      forwardComment:caption||null,sender:($('sidebar-username')&&$('sidebar-username').textContent||'')
    };
    if(fwdTxt!==(forwardMsgData.text||'')){fwd.e2e=true;conv.lastMsg='🔒 Mesaj'}else{conv.lastMsg=fwd.text||(fwd.image?'📷 Fotoğraf':(fwd.video?'🎬 Video':(fwd.audio?'🎤 Ses':'')))}if(!messages[cid])messages[cid]=[];
    messages[cid].push(fwd);
    conv.lastActivity=Date.now();conv.time=timeNow();
    fbSendMessage(cid,fwd)
  }
  $('modal-forward').classList.remove('active');
  forwardMsgData=null;forwardingLock=false;
  renderConversations();saveMessages();
  if(activeConvId)renderMessages(activeConvId)
}
// Forward modal buttons  
var fc=$('forward-close-btn'),fcan=$('forward-cancel-btn'),fsend=$('forward-send-btn');
if(fc)fc.onclick=function(){$('modal-forward').classList.remove('active');forwardMsgData=null;forwardingLock=false};
if(fcan)fcan.onclick=function(){$('modal-forward').classList.remove('active');forwardMsgData=null;forwardingLock=false};
if(fsend)fsend.onclick=function(){forwardToSelected()};
function validateGroup(){var n=$('group-name').value.trim(),items=$('group-member-list').querySelectorAll('.modal-member-item.selected');$('group-create-btn').disabled=!(n.length>=1&&items.length>=1)}
function createGroup(){
  var name=$('group-name').value.trim();if(name.length<1)return;
  var items=$('group-member-list').querySelectorAll('.modal-member-item.selected');if(items.length<1)return;
  var initials=name.split(' ').map(function(w){return w.charAt(0).toUpperCase()}).join('').slice(0,2)||'G';
  var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  var gid=uid(),ownerId=fbUserId()||activeAccountId;
  var group={id:gid,name:name,avatar:groupAvatarDataUrl||initials,avatarLetter:initials,color:colors[Math.floor(Math.random()*colors.length)],isGroup:true,online:true,lastMsg:'Grup oluşturuldu',time:timeNow(),lastActivity:Date.now(),unread:0,members:[],adminIds:[ownerId],creatorId:ownerId};
  var seen={};
  for(var i=0;i<items.length;i++){
    var member=items[i]._memberData||null;
    if(!member&&items[i]._convId)member=makeGroupMemberFromConversation(findConv(items[i]._convId));
    if(!member&&items[i]._memberId)member=makeGroupMemberFromFriend(findFriendByIdOrName(items[i]._memberId,null),colors[(i+1)%colors.length]);
    if(member&&member.id&&!seen[member.id]&&member.id!==ownerId){seen[member.id]=true;group.members.push(member)}
  }
  normalizeGroupMembers(group);
  group.memberIds=getGroupMemberIds(group);
  groupAvatarDataUrl=null;conversations.unshift(group);saveGroup(group);saveMessages();
  addGroupLog(gid,'Grup "'+name+'" oluşturuldu');
  if(window.db&&fbUserId())db.collection('conversations').doc(gid).set({type:'group',name:group.name,avatar:group.avatar||null,avatarLetter:group.avatarLetter||null,color:group.color||null,creatorId:group.creatorId,adminIds:group.adminIds,memberIds:group.memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(function(){})
  renderConversations();selectConversation(gid);hideGroupModal()}

function renderGroupMembers(selectedIds){
  var ml=$('group-member-list');if(!ml)return;ml.innerHTML='';
  var addedIds={},selected=selectedIds||[],gColors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  function addItem(member,convId,color){
    if(!member||!member.id||member.id===fbUserId()||addedIds[member.id])return;
    addedIds[member.id]=true;
    var sel=selected.indexOf(member.id)>-1||(convId&&selected.indexOf(convId)>-1);
    var d=document.createElement('div');d.className='modal-member-item'+(sel?' selected':'');
    var av=member.avatar,html;if(av&&av.indexOf('data:')===0){html='<img src="'+av+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+(member.color||color||'var(--grad)')+'\';this.parentElement.textContent=\'?\'">'}else{html='<span>'+esc(av||((member.name||'?').charAt(0).toUpperCase()))+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+(member.color||color||'var(--grad)')+'">'+html+'</div><div class="mm-name">'+esc(member.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');validateGroup()};
    d._memberId=member.id;d._convId=convId||null;d._memberData=member;ml.appendChild(d)
  }
  for(var i=0;i<conversations.length;i++){if(!conversations[i].isGroup)addItem(makeGroupMemberFromConversation(conversations[i]),conversations[i].id,conversations[i].color)}
  var gf=getCachedFriends();
  for(var fi=0;fi<gf.length;fi++)addItem(makeGroupMemberFromFriend(gf[fi],gColors[fi%gColors.length]),null,gColors[fi%gColors.length])
}

function newGroup(){
  var curr=$('group-create-btn');
  if(curr)curr.textContent='Oluştur';
  var mh=$('modal-group').querySelector('.modal-header h3');
  if(mh)mh.textContent='Grup Oluştur';
  groupAvatarDataUrl=null;
  $('group-name').value='';
  var picker=$('avatar-picker');
  if(picker)picker.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  if(picker)picker.style.border='';
  editGroupState=null;
  renderGroupMembers([]);
  validateGroup();
  $('modal-group').classList.add('active');
  refreshFriendsCache().then(function(){if(!editGroupState&&$('modal-group').classList.contains('active')){renderGroupMembers([]);validateGroup()}})
}
function hideGroupModal(){closeModal('modal-group')}

// ===== PIN CONVERSATIONS =====
function getPinned(){return ls('pinned')||[]}
function togglePin(id){
  var p=getPinned();
  var idx=p.indexOf(id);
  if(idx>-1)p.splice(idx,1);else p.push(id);
  ls('pinned',p);
  renderConversations()
}
function isPinned(id){var p=getPinned();return p.indexOf(id)>-1}
function saveUnreadCounts(){
  var counts={},lastActs={};
  for(var uci=0;uci<conversations.length;uci++){
    var c=conversations[uci];
    if(c.unread)counts[c.id]=c.unread;
    if(c.lastActivity)lastActs[c.id]=c.lastActivity
  }
  ls('unreadCounts',counts);
  ls('lastActivity',lastActs)
}

// ===== CLOSE HELPERS WITH ANIMATION =====
var _closeTimers={};
function closeModal(id,cb){
  if(_closeTimers[id]){clearTimeout(_closeTimers[id]);delete _closeTimers[id]}
  var el=$(id);if(!el||!el.classList.contains('active'))return;
  el.classList.add('closing');
  _closeTimers[id]=setTimeout(function(){el.classList.remove('active','closing');if(cb)cb();delete _closeTimers[id]},150)
}
// Click outside modals to close
document.addEventListener('mousedown',function(e){
  var overlay=e.target.closest('.modal-overlay');
  if(overlay&&e.target===overlay){
    var id=overlay.id;
    if(id==='modal-delete'){closeModal('modal-delete',function(){hideDeleteModal()});return}
    if(id==='modal-media'){closeModal('modal-media',function(){pendingMediaFiles=[];mediaThumbCount=0});return}
    if(id==='modal-forward'){closeModal('modal-forward',function(){forwardMsgData=null;forwardingLock=false});return}
    if(id==='modal-group'){closeModal('modal-group');return}
    closeModal(id)
  }
});

// ===== MUTE / CLOSE =====
function getMuted(){return ls('muted')||[]}
function isMuted(id){var m=getMuted();for(var i=0;i<m.length;i++){if(m[i]===id)return true}return false}
function toggleMute(id){var m=getMuted();var found=false;for(var i=0;i<m.length;i++){if(m[i]===id){m.splice(i,1);found=true;break}}if(!found)m.push(id);ls('muted',m);renderConversations()}
var pendingClearConvId=null;
function clearConversation(id){
  pendingClearConvId=id;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Sohbeti Temizle</h4>'+
    '<p style="color:var(--text4);font-size:12px">Tüm mesajlar kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Temizle';
  $('delete-confirm-btn').onclick=function(){confirmClearConversation()};
  $('modal-delete').classList.add('active')
}
function confirmClearConversation(){
  var id=pendingClearConvId;pendingClearConvId=null;
  if(!id)return;
  if(messages[id]){delete messages[id]}
  var conv=findConv(id);
  if(conv){conv.lastMsg='Sohbet temizlendi';conv.lastActivity=Date.now();conv.time=timeNow();conv.unread=0;conv._clearedAt=Date.now()}
  if(activeConvId===id){
    if(chatMsgs)chatMsgs.innerHTML='';
    renderMessages(id)
  }
  saveUnreadCounts();
  renderConversations();
  saveMessages();
  hideDeleteModal();
  // Delete Firestore messages permanently
  fbClearConversationMessages(id)
}
function fbClearConversationMessages(convId){
  if(!window.db||!fbUserId())return;
  var ts=Date.now();
  var conv=findConv(convId);
  if(conv)conv._clearedAt=ts;
  db.collection('conversations').doc(convId).collection('messages').get().then(function(snap){
    var batch=db.batch();
    var count=0;
    snap.forEach(function(doc){
      var cd=doc.data();
      if(cd.createdAt&&cd.createdAt.toMillis&&cd.createdAt.toMillis()<ts){return}
      batch.delete(doc.ref);count++
    });
    if(count>0)batch.commit().catch(function(){});
    db.collection('conversations').doc(convId).update({clearedAt:firebase.firestore.FieldValue.serverTimestamp(),lastMsg:'Sohbet temizlendi',lastActivity:Date.now()}).catch(function(){})
  }).catch(function(){})
}

function closeConversation(id){
  var conv=findConv(id);
  if(conv){conv.hidden=true}
  fbUnlistenMessages(id);
  fbUnlistenTyping();
  stopTyping();
  if(activeConvId===id){$('chat-empty').style.display='flex';$('chat-active').style.display='none';activeConvId=null}
  saveConversations();
  renderConversations()
}

// ===== CONTEXT MENU =====
function showContextMenu(x,y,items){
  var m=$('context-menu');m.innerHTML='';
  for(var i=0;i<items.length;i++){(function(it){
    if(it.sep){var d=document.createElement('div');d.className='cm-sep';m.appendChild(d)}else{
    var d=document.createElement('div');d.className='cm-item'+(it.danger?' danger':'');
    d.innerHTML=(it.icon||'')+' '+esc(it.label);
    if(it.sub){
      d.className+=' cm-sub';var sm=document.createElement('div');sm.className='cm-submenu';
      for(var j=0;j<it.sub.length;j++){(function(s){
        var sd=document.createElement('div');sd.className='cm-item';
        sd.innerHTML=(s.icon||'')+' '+esc(s.label);
        sd.onclick=function(e){e.stopPropagation();s.action();hideContextMenu()};
        sm.appendChild(sd)
      })(it.sub[j])}d.appendChild(sm)
    }
    d.onclick=function(){it.action();hideContextMenu()};
    m.appendChild(d)
    }})(items[i])}
  var mw=m.offsetWidth||Math.min(220,window.innerWidth*0.4);
  var mh=m.offsetHeight||Math.min(items.length*36,400);
  if(x+mw+8>window.innerWidth)x=Math.max(4,window.innerWidth-mw-8);
  if(y+mh+8>window.innerHeight)y=Math.max(4,window.innerHeight-mh-8);
  m.style.left=Math.max(4,x)+'px';m.style.top=Math.max(4,y)+'px';
  m.classList.remove('active');
  void m.offsetHeight;
  m.classList.add('active')
}

// ===== SESSION STATE MANAGEMENT =====
// All session-specific state that MUST be reset on account switch
function resetSessionState(){
  _authTransitioning=true;
  // Firebase listeners
  for(var kl in _fbListeners){_fbListeners[kl]();delete _fbListeners[kl]}
  _fbListeners={};
  _fbMsgCache={};
  if(_fbConvUnsub){_fbConvUnsub();_fbConvUnsub=null}
  _convListenerActive=false;
  fbUnlistenTyping();

  // Friend request listeners
  if(_pendingUnsub){_pendingUnsub();_pendingUnsub=null}
  if(_outgoingUnsub){_outgoingUnsub();_outgoingUnsub=null}

  // Core data
  messages={};
  conversations=[];
  activeConvId=null;
  activeAccountId=null;
  _convListAnimatedOnce=false;

  // E2E encryption state
  e2eReady=false;
  e2eKeys=null;
  _pubKeyCache={};

  // Call state
  if(callState==='connected'||callState==='ringing'||callState==='calling'){endCall()}
  callState=null;callPeerConn=null;callLocalStream=null;
  if(callTimerInterval){clearInterval(callTimerInterval);callTimerInterval=null}
  callStartTime=0;callMicMuted=false;callSpeakerMuted=false;pendingCallMsgId=null;
  if(callPollTimer){clearInterval(callPollTimer);callPollTimer=null}
  pendingCallData=null;
  fbStopCallSignals();
  stopRingtone();

  // UI state
  pendingClearConvId=null;
  pendingMediaFiles=[];mediaIndex=0;mediaThumbCount=0;
  pendingCollageDelete=null;pendingDeleteMsgId=null;pendingSelfDeleteId=null;
  pendingDeleteGroupId=null;pendingRemoveMember=null;pendingRemoveGroup=null;
  pendingAlert=false;
  contextMenuMsgId=null;contextMenuScrollPos=0;contextMenuRelY=0;contextMenuRelX=0;
  editGroupState=null;groupAvatarDataUrl=null;
  forwardMsgData=null;forwardingLock=false;
  replyToMsgId=null;replyToMsgText='';
  _frCooldown=0;
  _searchQuery='';_showArchived=false;
  _forceScrollBottom=false;_hasNewMsg=false;
  avatarDataUrl=null;
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null}
  prevStatus=null;
  currentEmojiCat='face';

  // Typing indicators
  if(typingTimer){clearTimeout(typingTimer);typingTimer=null}
  if(_typingRemoteUnsub){_typingRemoteUnsub();_typingRemoteUnsub=null}
  _typingLocalUid=null;

  // Voice recording
  if(voiceTimer){clearTimeout(voiceTimer);voiceTimer=null}
  audioChunks=[];voiceStart=0;
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null}

  // Audio playback
  if(currentAudio){currentAudio.pause();currentAudio=null}
  currentAudioId=null;
  if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}
  seekCache={};

  // Call streams
  if(callCamStream){callCamStream.getTracks().forEach(function(t){t.stop()});callCamStream=null}
  if(callScreenStream){callScreenStream.getTracks().forEach(function(t){t.stop()});callScreenStream=null}

  // Call signals
  if(_callSignalUnsub){_callSignalUnsub();_callSignalUnsub=null}
  _callSigOfferId=null;
  if(vadTimer){clearInterval(vadTimer);vadTimer=null}

  // Audio test
  if(micTestInterval){clearInterval(micTestInterval);micTestInterval=null}
  if(testCamStream){testCamStream.getTracks().forEach(function(t){t.stop()});testCamStream=null}
  if(testMicStream){testMicStream.getTracks().forEach(function(t){t.stop()});testMicStream=null}

  // Hide all modals/panels
  closeProfilePanel();hideSettings();hideContextMenu();hideAvatarMenu();
  var md=document.querySelectorAll('.modal.active');
  for(var mi=0;mi<md.length;mi++)md[mi].classList.remove('active');

  // Reset chat view to empty state
  var ce=$('chat-empty');var ca=$('chat-active');
  if(ce)ce.style.display='flex';
  if(ca)ca.style.display='none';
  var cl=$('conv-list');if(cl){cl.innerHTML='';cl.classList.remove('no-anim')}
}

function doLogout(){resetSessionState();_authTransitioning=false;_pendingLoginPassword=null;if(window.auth)auth.signOut();goToWelcome()}
function leaveGroup(convId){
  var conv=findConv(convId);if(!conv||!conv.isGroup)return;
  if(window.db&&fbUserId()&&firebase&&firebase.firestore)db.collection('conversations').doc(convId).update({memberIds:firebase.firestore.FieldValue.arrayRemove(fbUserId()),adminIds:firebase.firestore.FieldValue.arrayRemove(fbUserId())}).catch(function(){});
  // Remove from conversations
  for(var lgi=0;lgi<conversations.length;lgi++){if(conversations[lgi].id===convId){conversations.splice(lgi,1);break}}
  var gs=getGroups();
  for(var sgi=gs.length-1;sgi>=0;sgi--){if(gs[sgi].id===convId)gs.splice(sgi,1)}
  saveGroups(gs);
  if(activeConvId===convId){activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
  closeProfilePanel();renderConversations()
}

function deleteGroup(convId){
  var conv=findConv(convId);if(!conv||!conv.isGroup)return;
  if(conv.creatorId!==activeAccountId&&conv.creatorId!==fbUserId()){leaveGroup(convId);return}
  if(window.db&&fbUserId()&&conv.creatorId===fbUserId())db.collection('conversations').doc(convId).delete().catch(function(){});
  // Remove from conversations
  for(var dgi=0;dgi<conversations.length;dgi++){if(conversations[dgi].id===convId){conversations.splice(dgi,1);break}}
  // Remove from saved groups
  var gs=getGroups();
  for(var dgi=0;dgi<gs.length;dgi++){if(gs[dgi].id===convId){gs.splice(dgi,1);break}}
  saveGroups(gs);
  // Clear messages
  delete messages[convId];
  if(activeConvId===convId){activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
  closeProfilePanel();
  renderConversations();
  saveMessages()
}

function showConvContext(x,y,convId){var conv=findConv(convId);if(!conv)return;var muted=isMuted(convId);var pinned=isPinned(convId);var archived=isArchived(convId);
  var items=[{label:muted?'Susturmayı Kaldır':'Sustur',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>',action:function(){toggleMute(convId)}}];
  items.push({label:pinned?'Sabitlemeyi Kaldır':'Sabitle',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>',action:function(){togglePin(convId)}});
  items.push({sep:true});
  items.push({label:archived?'Arşivden Çıkar':'Arşivle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',action:function(){toggleArchive(convId)}});
  items.push({sep:true});
  items.push({label:'Sohbeti Temizle',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){clearConversation(convId)}});
  if(conv.isGroup){
    var isGroupAdmin=conv.adminIds&&conv.adminIds.indexOf(activeAccountId)!==-1;
    var isGroupCreator=conv.creatorId===activeAccountId;
    if(isGroupAdmin)items.push({label:'Grubu Düzenle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',action:function(){editGroup(convId)}});
    if(isGroupCreator)items.push({label:'Grubu Sil',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){showDeleteGroupConfirm(convId)}})
    else items.push({label:'Gruptan Ayrıl',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',action:function(){leaveGroup(convId)}})
  }else{
    items.push({label:'Sohbeti Kapat',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',action:function(){closeConversation(convId)}})
  }
  if(!conv.isGroup&&!archived){items.push({sep:true});var gs=[];for(var gi=0;gi<conversations.length;gi++){(function(gc){if(gc.isGroup)gs.push({label:gc.name,icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',action:function(){addToGroup(gc.id,convId)}})})(conversations[gi])}gs.push({sep:true});gs.push({label:'+ Yeni Grup',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',action:function(){newGroup()}});items.push({label:'Gruba Ekle',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',action:function(){},sub:gs})}
  showContextMenu(x,y,items)}
function toggleArchiveView(){_showArchived=!_showArchived;renderConversations()}

// ===== APP DATA =====
// ===== FIREBASE INIT =====
var firebaseConfig={
  apiKey: "AIzaSyCkp1lxzL2j_3ClCe9i_DB7Ml037E-kxxM",
  authDomain: "waxmes.firebaseapp.com",
  projectId: "waxmes",
  storageBucket: "waxmes.firebasestorage.app",
  messagingSenderId: "753368719041",
  appId: "1:753368719041:web:283c11d81c4ee4b13b3e40"
};
// ===== FIREBASE DATA LAYER =====
var _fbListeners={};
var _fbMsgCache={};
var _fbConvUnsub=null;
var _convListenerActive=false;
var _authTransitioning=false; // Prevents processing stale auth state changes
var _explicitLogin=false; // Prevents onAuthStateChanged from double-calling showApp during autoLogin
var _pendingLoginPassword=null;
var _authStateSeq=0;

function fbListenConversations(uid){
  if(_fbConvUnsub){_fbConvUnsub();_fbConvUnsub=null}
  if(!window.db)return;
  _convListenerActive=true;
  _fbConvUnsub=db.collection('conversations').where('memberIds','array-contains',uid).onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      var d=change.doc.data(),cid=change.doc.id;
      if(change.type==='removed'){
        for(var rci=conversations.length-1;rci>=0;rci--){if(conversations[rci].id===cid)conversations.splice(rci,1)}
        var rgs=getGroups();for(var rgi=rgs.length-1;rgi>=0;rgi--){if(rgs[rgi].id===cid)rgs.splice(rgi,1)}saveGroups(rgs);
        if(activeConvId===cid){activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
        renderConversations();
        return
      }
      if(change.type==='added'||change.type==='modified'){
        if(d.type==='group'){applyFirestoreGroupConversation(cid,d,uid);return}
        var exists=false;
        for(var ci=0;ci<conversations.length;ci++){if(conversations[ci].id===cid){exists=true;break}}
        if(!exists){
          var otherId=null;
          for(var mi=0;mi<(d.memberIds||[]).length;mi++){if(d.memberIds[mi]!==uid){otherId=d.memberIds[mi];break}}
          if(otherId){
            // Check if a conversation with same member pair already exists (different ID)
            var alreadyHas=false;
            for(var ci=0;ci<conversations.length;ci++){
              var cv=conversations[ci];
              if(!cv.isGroup&&cv.memberIds&&cv.memberIds.length===2&&cv.memberIds.indexOf(uid)!==-1&&cv.memberIds.indexOf(otherId)!==-1){alreadyHas=true;break}
            }
            if(!alreadyHas){
            (function(oid,cid2){
              db.collection('users').doc(oid).get().then(function(uDoc){
                if(!uDoc.exists)return;
                var ud=uDoc.data();
                var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
                var color=colors[Math.floor(Math.random()*colors.length)];
                var newConv={id:cid2,name:ud.displayName||ud.username||'Kullanıcı',avatar:ud.avatar||(ud.displayName||'?').charAt(0).toUpperCase(),color:color,online:ud.online||false,lastMsg:'',time:'',unread:0,isGroup:false,memberIds:[uid,oid]};
                convListenerAddConv(newConv)
              }).catch(function(){})
            })(otherId,cid)
            }
          }
        }
      }
    })
  },function(err){if(err)console.error('convListener error:',err)})
}

function convListenerAddConv(newConv){
  for(var ci=0;ci<conversations.length;ci++){if(conversations[ci].id===newConv.id)return}
  conversations.push(newConv);
  saveConversations();
  renderConversations();
  fbListenMessages(newConv.id)
}

function fbStopConversations(){
  if(_fbConvUnsub){_fbConvUnsub();_fbConvUnsub=null}
  _convListenerActive=false;
}

function fbUserId(){return auth&&auth.currentUser?auth.currentUser.uid:null}

function applyFirestoreGroupConversation(gid,gd,uid){
  var mids=gd.memberIds||[];
  var memberFetches=mids.filter(function(mid){return mid!==uid}).map(function(mid){
    return db.collection('users').doc(mid).get().then(function(uDoc){
      var ud=uDoc.exists?uDoc.data():{};
      var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
      var nm=ud.displayName||ud.username||'Kullanıcı';
      return {id:mid,name:nm,avatar:ud.avatar||nm.charAt(0).toUpperCase(),color:colors[Math.floor(Math.random()*colors.length)],online:!!ud.online,isGroup:false}
    }).catch(function(){return null})
  });
  Promise.all(memberFetches).then(function(members){
    var initials=(gd.name||'G').split(' ').map(function(w){return w.charAt(0).toUpperCase()}).join('').slice(0,2)||'G';
    var group={id:gid,name:gd.name||'Grup',avatar:gd.avatar||initials,avatarLetter:gd.avatarLetter||initials,color:gd.color||'var(--grad)',isGroup:true,online:true,lastMsg:gd.lastMsg||'',time:gd.lastTime||'',lastActivity:gd.lastActivity||Date.now(),unread:0,members:members.filter(Boolean),memberIds:mids,adminIds:gd.adminIds||[gd.creatorId].filter(Boolean),creatorId:gd.creatorId||mids[0]};
    normalizeGroupMembers(group);
    var existing=findConv(gid);
    if(existing){
      existing.name=group.name;existing.avatar=group.avatar;existing.avatarLetter=group.avatarLetter;existing.color=group.color;existing.members=group.members;existing.memberIds=group.memberIds;existing.adminIds=group.adminIds;existing.creatorId=group.creatorId;existing.lastActivity=group.lastActivity;
      saveGroup(existing);renderConversations();if(activeConvId===gid)renderMessages(gid)
    }else{
      convListenerAddConv(group);saveGroup(group)
    }
  })
}

function fbSyncMembers(convId){
  var conv=findConv(convId);if(!conv||!window.db||!fbUserId())return;
  var mids=conv.isGroup?getGroupMemberIds(conv):(conv.memberIds&&conv.memberIds.length>0?conv.memberIds:[fbUserId()]);
  conv.memberIds=mids;
  if(conv.isGroup)saveGroup(conv);
  var data={memberIds:mids};
  if(conv.isGroup){data.type='group';data.name=conv.name;data.avatar=conv.avatar||null;data.avatarLetter=conv.avatarLetter||null;data.color=conv.color||null;data.creatorId=conv.creatorId||fbUserId();data.adminIds=conv.adminIds||[data.creatorId]}
  db.collection('conversations').doc(convId).set(data,{merge:true}).catch(function(){})
}
function fbSendMessage(convId,msg){
  if(!window.db||!fbUserId())return;
  var sendData={
    type:msg.type,text:msg.text||'',time:msg.time,edited:!!msg.edited,deleted:!!msg.deleted,
    senderId:msg.senderId||fbUserId(),sender:msg.sender||null,image:msg.image||null,video:msg.video||null,audio:msg.audio||null,
    duration:msg.duration||0,replyTo:msg.replyTo||null,replyText:msg.replyText||null,
    isForwarded:!!msg.isForwarded,forwardComment:msg.forwardComment||null,originalSender:msg.originalSender||null,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(!sendData.text&&!sendData.image&&!sendData.video&&!sendData.audio)sendData.text=' ';
  var displayMsg=msg.text;
  if(msg.e2e||(displayMsg&&displayMsg.indexOf('🔒')===0))displayMsg='🔒 Mesaj';
  else if(msg.image)displayMsg='📷 Fotoğraf';
  else if(msg.video)displayMsg='🎬 Video';
  else if(msg.audio)displayMsg='🎤 Ses';
  else displayMsg=msg.text||'';
  db.collection('conversations').doc(convId).collection('messages').add(sendData).then(function(docRef){
    if(docRef&&docRef.id&&msg._fbId===undefined){
      msg._fbId=docRef.id;
      saveMessages()
    }
  }).catch(function(){});
  db.collection('conversations').doc(convId).set({lastActivity:Date.now(),lastMsg:displayMsg,lastTime:msg.time},{merge:true}).catch(function(){});
  fbSyncMembers(convId)
}

function fbListenMessages(convId){
  if(!window.db||_fbListeners[convId])return;
  // Capture the Firebase UID at listener setup time to prevent cross-account contamination
  var _setupFirebaseUid=fbUserId();
  if(!_setupFirebaseUid)return;
  // Check for clearedAt to skip old messages on restart
  var _clearTime=null;
  var conv=findConv(convId);
  if(conv&&conv._clearedAt)_clearTime=conv._clearedAt;
  _fbListeners[convId]=db.collection('conversations').doc(convId).collection('messages').orderBy('createdAt','asc').onSnapshot(function(snapshot){
    // Skip if account has changed since listener was set up
    if(_authTransitioning)return;
    var curUid=fbUserId();
    if(!curUid||curUid!==_setupFirebaseUid)return;
    snapshot.docChanges().forEach(function(change){
      if(change.type==='added'){
        var d=change.doc.data();var mid=change.doc.id;
        // Skip messages that were cleared
        if(_clearTime&&d.createdAt&&d.createdAt.toMillis&&d.createdAt.toMillis()<_clearTime){return}
        if(!messages[convId])messages[convId]=[];
        var exists=false;
        for(var fi=0;fi<messages[convId].length;fi++){if(messages[convId][fi]._fbId===mid){exists=true;break}}
        if(!exists){
          var linked=false;
          for(var li=0;li<messages[convId].length;li++){
            var lm=messages[convId][li];
            if(!lm._fbId&&lm.text===d.text&&lm.time===d.time&&lm.type==='sent'&&lm.senderId===curUid){
              lm._fbId=mid;linked=true;break
            }
          }
          if(!linked){
          var msgType=d.senderId!==undefined?(d.senderId===curUid?'sent':'received'):'received';
          var m={id:uid(),type:msgType,senderId:d.senderId||null,text:d.text||'',time:d.time||timeNow(),edited:!!d.edited,deleted:!!d.deleted,sender:d.sender||null,image:d.image||null,video:d.video||null,audio:d.audio||null,duration:d.duration||0,replyTo:d.replyTo||null,replyText:d.replyText||null,isForwarded:!!d.isForwarded,forwardComment:d.forwardComment||null,originalSender:d.originalSender||null,_fbId:mid};
          if(d.e2e||(d.text&&d.text.indexOf('🔒')===0))m.e2e=true;
          messages[convId].push(m);
          if(activeConvId===convId){
            var el=$('chat-messages'),nearBottom=el&&el.scrollHeight-el.scrollTop-el.clientHeight<200;
            if(!nearBottom&&m.type==='received'){_hasNewMsg=true;var cv=findConv(convId);if(cv){cv.unread=(cv.unread||0)+1;saveUnreadCounts()}}
            renderMessages(convId)
          }else{
            var cv=findConv(convId);
            if(cv&&m.type==='received'){cv.unread=(cv.unread||0)+1;saveUnreadCounts()}
          }
          var conv=findConv(convId);
          if(conv){
            var localLastMsg=conv.lastMsg;
            var preview=d.lastMsg||d.text||'';
            if(d.image)preview='📷 Fotoğraf';
            else if(d.video)preview='🎬 Video';
            else if(d.audio)preview='🎤 Ses';
            else if(preview.indexOf('🔒')===0){
              if(localLastMsg&&localLastMsg.indexOf('🔒')!==0&&localLastMsg.indexOf('📷')!==0&&localLastMsg.indexOf('🎬')!==0&&localLastMsg.indexOf('🎤')!==0){
                preview=localLastMsg
              }else{preview='🔒 Mesaj'}
            }
            conv.lastMsg=preview;
            conv.lastActivity=d.lastActivity||Date.now();
            conv.time=d.lastTime||d.time||timeNow()
          }
          renderConversations();saveMessages()
          }
        }
      }
    })
  },function(err){if(err)console.error('onSnapshot error:',err)})
}

function fbUnlistenMessages(convId){
  if(_fbListeners[convId]){_fbListeners[convId]();delete _fbListeners[convId]}
}

function fbUpdateOnlineStatus(online,status){
  if(!window.db||!fbUserId())return;
  var data={online:online,lastSeen:Date.now()};
  if(status!==undefined)data.status=status;
  db.collection('users').doc(fbUserId()).update(data).catch(function(){})
}
var _onlineStatusListeners={};
function fbSyncOnlineStatus(convId){
  if(!window.db||!fbUserId())return;
  var conv=findConv(convId);if(!conv||conv.isGroup)return;
  // Unsubscribe previous listener for this conv
  if(_onlineStatusListeners[convId]){_onlineStatusListeners[convId]();delete _onlineStatusListeners[convId]}
  for(var mi=0;mi<(conv.memberIds||[]).length;mi++){
    if(conv.memberIds[mi]!==fbUserId()){
      (function(oid){
        _onlineStatusListeners[convId]=db.collection('users').doc(oid).onSnapshot(function(udoc){
          if(!udoc.exists)return;
          var uData=udoc.data();
          conv.online=!!uData.online;
          conv._status=uData.status||'online';
          var statusEl=$('chat-header-status');
          if(statusEl)statusEl.textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv);
          renderConversations()
        },function(){})
      })(conv.memberIds[mi])
    }
  }
}

function fbUploadFile(dataUrl,path){
  return new Promise(function(resolve,reject){
    if(!window.storage){resolve(dataUrl);return}
    var ref=storage.ref(path);
    ref.putString(dataUrl,'data_url').then(function(snapshot){
      ref.getDownloadURL().then(function(url){resolve(url)}).catch(function(){resolve(dataUrl)})
    }).catch(function(){resolve(dataUrl)})
  })
}

// Update online status on app focus/blur (only on actual close, not tab switch)
if(window.db){
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      fbUpdateOnlineStatus(true,'idle')
    }
  })
}

var conversations=[],activeConvId=null,activeAccountId=null;
var _convListAnimatedOnce=false;
var messages={};
var _forceScrollBottom=false;
var _hasNewMsg=false;
var _searchQuery='';
var _showArchived=false;
function getArchived(){return ls('archived')||[]}
function isArchived(id){var a=getArchived();return a.indexOf(id)>-1}
function toggleArchive(id){
  var a=getArchived();var i=a.indexOf(id);
  if(i>-1)a.splice(i,1);else a.push(id);
  ls('archived',a);renderConversations()
}



// ===== MESSAGE & CONVERSATION PERSISTENCE =====
async function saveMessages(){
  if(!activeAccountId)return;
  ls('messages_'+activeAccountId,messages);
  saveConversations();
  if(window.electronAPI&&electronAPI.safeEncrypt){
    var data=JSON.stringify(messages);
    if(typeof data==='string'&&data.length<5000000){
      var enc=await electronAPI.safeEncrypt(data);
      if(enc)localStorage.setItem('wm_messages_'+activeAccountId,enc)
    }
    var cdata=JSON.stringify(conversations);
    if(typeof cdata==='string'&&cdata.length<5000000){
      var cenc=await electronAPI.safeEncrypt(cdata);
      if(cenc)localStorage.setItem('wm_conversations_'+activeAccountId,cenc)
    }
  }
}
async function loadMessages(){
  if(!activeAccountId)return;
  messages={};
  var loaded=false;
  if(window.electronAPI&&electronAPI.safeDecrypt){
    var enc=localStorage.getItem('wm_messages_'+activeAccountId);
    if(enc){var dec=await electronAPI.safeDecrypt(enc);if(dec){try{messages=JSON.parse(dec);loaded=true}catch(e){}}}
    var cenc=localStorage.getItem('wm_conversations_'+activeAccountId);
    if(cenc){var cdec=await electronAPI.safeDecrypt(cenc);if(cdec){try{conversations=JSON.parse(cdec)}catch(e){}}}
  }
  if(!loaded){var m=ls('messages_'+activeAccountId);if(m)messages=m}
}
function saveConversations(){
  if(!activeAccountId)return;
  ls('conversations_'+activeAccountId,conversations);
  // Also save to global backup
  ls('conv_backup',{id:activeAccountId,convs:conversations})
}
function loadConversations(){
  if(activeAccountId){
    var c=ls('conversations_'+activeAccountId);
    if(c&&c.length>0)return c;
    // Try backup
    var bk=ls('conv_backup');
    if(bk&&bk.id===activeAccountId&&bk.convs&&bk.convs.length>0)return bk.convs
  }
  return null
}

// Init
(function initMsgs(){
  if(activeAccountId){var saved=ls('messages_'+activeAccountId);if(saved)messages=saved}
})();

// Save on close
window.addEventListener('beforeunload',function(){
  if(activeAccountId){saveConversations();saveMessages()}
  fbUpdateOnlineStatus(false)
});

// ===== THEMES =====
var themes={
  'default':'Varsayılan','royal':'Kraliyet','forest':'Orman','wine':'Şarap','slate':'Taş','plum':'Erik','coffee':'Kahve','teal':'Deniz','ember':'Kor','navy':'Lacivert','emerald':'Zümrüt',
  'cloud':'Bulut','pearl':'İnci','mist':'Sis','cream':'Krem','sage':'Adaçayı','lilac':'Leylak','coral':'Mercan','sky':'Gök','linen':'Keten','frost':'Buz'};

// ===== SETTINGS =====
function showSettings(){hideAvatarMenu();$('chat-empty').style.display='none';$('chat-active').style.display='none';$('settings-page').classList.add('active');showSettingsCat('profile')}
function hideSettings(){$('settings-page').classList.remove('active');if(activeConvId){$('chat-empty').style.display='none';$('chat-active').style.display='flex'}else $('chat-empty').style.display='flex'}

function showSettingsCat(cat){
  document.querySelectorAll('.settings-cat').forEach(function(c){c.classList.remove('active')});
  var el=document.querySelector('.settings-cat[data-cat="'+cat+'"]');if(el)el.classList.add('active');
  var content=$('settings-content');content.classList.remove('settings-content-anim');
  if(cat==='profile'){
    var accs=getAccounts(),acc=null;for(var i=0;i<accs.length;i++){if(accs[i].id===activeAccountId){acc=accs[i];break}}
    if(!acc){content.innerHTML='<div class="stitle">Profil</div><p style="color:var(--text4)">Hesap bulunamadı.</p>';return}
    var accName=accountFallbackName(acc),accUser=accountFallbackUsername(acc);
    content.innerHTML='<div class="stitle">Profil Ayarları</div><div style="display:flex;align-items:center;gap:16px;margin-bottom:20px"><div id="settings-avatar" style="width:64px;height:64px;border-radius:50%;background:'+(acc.avatar?'none':'linear-gradient(135deg,#2563eb,#6d28d9)')+';overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;border:1px dashed var(--border2);background-size:cover;background-position:center" onclick="pickSettingsAvatar()">'+(acc.avatar?'<img src="'+esc(acc.avatar)+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,#2563eb,#6d28d9)\';this.parentElement.style.fontSize=\'24px\'">':'<svg width="24" height="24" viewBox="0 0 24 24" stroke="rgba(255,255,255,.3)" fill="none" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>')+'</div><div><div style="font-size:13px;font-weight:600;color:var(--text2)">'+esc(accName)+'</div><div style="font-size:11px;color:var(--text4)">Fotoğrafı değiştirmek için tıkla</div></div></div>'+
    '<div class="field-group"><label>Kullanıcı Adı</label><input type="text" id="set-username" value="'+esc(accUser)+'" maxlength="20"></div>'+
    '<div class="field-group"><label>Görünen Ad</label><input type="text" id="set-display" value="'+esc(accName)+'" maxlength="30"></div>'+
    '<div class="field-group"><label>Biyografi</label><textarea id="set-bio" maxlength="150" placeholder="Kendinden bahset...">'+esc(acc.bio||'')+'</textarea><div class="field-hint">En fazla 150 karakter</div></div>'+
    '<button class="btn-primary" onclick="saveProfileSettings()" style="padding:10px 24px;font-size:12px;border-radius:10px">Kaydet</button>'+
    '<div style="margin-top:24px;padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">Hesabı Sil</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">Bu hesabı ve tüm mesajlarını kalıcı olarak siler. Diğer hesapların etkilenmez.</p><button onclick="resetAllData()" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">Hesabı Sil</button></div>'
  }else if(cat==='theme'){
    var cur=getTheme();
    content.innerHTML='<div class="stitle">Tema Ayarları</div><div class="stitle-sub">Fareyi tema üzerine getirerek önizle, tıklayarak aktif et</div><div class="theme-grid">'+
      ['default','royal','forest','wine','slate','plum','coffee','teal','ember','navy','emerald','cloud','pearl','mist','cream','sage','lilac','coral','sky','linen','frost'].map(function(t){return '<div class="theme-card tp-'+t+(cur===t?' active':'')+'" data-theme="'+t+'" onmouseenter="previewTheme(\''+t+'\')" onmouseleave="unpreviewTheme()" onclick="selectTheme(\''+t+'\')"><div class="theme-card-preview"><div class="tcp-dot"></div><div class="tcp-bar"><div></div><div></div><div></div></div></div><div class="theme-card-name">'+themes[t]+'</div></div>'}).join('')+
      '</div>'
  }else if(cat==='privacy'){
    var notifChecked=ls('notifications')!==false?'checked':'';
    var autoStartChecked='';var bgChecked='';
    if(window.electronAPI&&electronAPI.getAutoStart){electronAPI.getAutoStart().then(function(v){$('autostart-toggle').checked=v})}
    if(window.electronAPI&&electronAPI.getBackgroundMode){electronAPI.getBackgroundMode().then(function(v){$('background-toggle').checked=v})}
    content.innerHTML='<div class="stitle">Gizlilik & Güvenlik</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="notif-toggle" '+notifChecked+' onchange="ls(\'notifications\',this.checked)"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Bildirimler</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Masaüstü bildirimlerini aç/kapat</span>'+
      '</div>'+
      '<div class="stitle" style="margin-top:24px">Arka Plan Servisi</div>'+
      '<div style="margin-bottom:10px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="autostart-toggle" onchange="toggleAutoStart(this.checked)"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Başlangıçta Aç</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Windows başlatıldığında otomatik açılsın</span>'+
      '</div>'+
      '<div style="margin-bottom:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;gap:12px">'+
        '<label class="toggle"><input type="checkbox" id="background-toggle" onchange="toggleBackground(this.checked)"><span class="toggle-track"></span><span class="toggle-label" style="font-size:12px;color:var(--text2)">Arka Planda Çalıştır</span></label>'+
        '<span style="font-size:10px;color:var(--text4)">Kapatınca tepsiye küçülsün, bildirimler devam etsin</span>'+
      '</div>'+
      '<div class="field-group"><label>E-posta Adresi <span style="font-size:9px;color:var(--text4);font-weight:400">(şu anlık devre dışı)</span></label><input type="email" id="set-email" value="'+(function(){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===activeAccountId)return esc(a[i].email)}return''})()+'" oninput="document.getElementById(\'save-email-btn\').disabled=!this.value.trim()"></div>'+
      '<div class="field-group" style="margin-top:6px"><button class="btn-primary" id="save-email-btn" onclick="saveEmail()" style="opacity:.5;cursor:not-allowed">E-postayı Kaydet</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">Şifre Değiştir</h4>'+
      '<div class="field-group"><label>Mevcut Şifre</label><input type="password" id="cur-pass" placeholder="••••••••"></div>'+
      '<div class="field-group"><label>Yeni Şifre</label><input type="password" id="new-pass" placeholder="••••••••" oninput="document.getElementById(\'save-pass-btn\').disabled=this.value.length<6"></div>'+
      '<div class="field-group"><label>Yeni Şifre (Tekrar)</label><input type="password" id="new-pass2" placeholder="••••••••" oninput="document.getElementById(\'save-pass-btn\').disabled=document.getElementById(\'new-pass\').value.length<6||this.value!==document.getElementById(\'new-pass\').value"></div>'+
      '<button class="btn-primary" id="save-pass-btn" disabled onclick="changePassword()">Şifreyi Değiştir</button></div>'+
      '<div style="margin-top:20px;padding:16px;border-radius:10px;background:var(--surface);border:1px solid var(--border)"><h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px">🔐 Uçtan Uca Şifreleme</h4>'+
      '<p style="font-size:11px;color:var(--text4);margin-bottom:10px;line-height:1.5">Tüm mesajlar RSA-2048 ile şifrelenir. Anahtarların cihazında saklanır, Firebase dahil hiçbir sunucu mesajlarını okuyamaz.</p>'+
      '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span id="e2e-status" style="font-size:11px;color:#22c55e">✓ Aktif</span></div></div>'
  }else if(cat==='media'){
    var micOptions='<option value="">Varsayılan</option>',spkOptions='<option value="">Varsayılan</option>';
    try{navigator.mediaDevices.enumerateDevices().then(function(devices){
      devices.forEach(function(d){
        if(d.kind==='audioinput')micOptions+='<option value="'+d.deviceId+'">'+esc(d.label||'Mikrofon '+(micOptions.match(/option value=/g)||[]).length)+'</option>';
        if(d.kind==='audiooutput')spkOptions+='<option value="'+d.deviceId+'">'+esc(d.label||'Hoparlör '+(spkOptions.match(/option value=/g)||[]).length)+'</option>'
      });
      var ms=$('media-mic-select');if(ms)ms.innerHTML=micOptions;
      var ss=$('media-spk-select');if(ss)ss.innerHTML=spkOptions
    }).catch(function(){})}catch(e){}
    
    content.innerHTML='<div class="stitle">Ses ve Görüntü</div>'+
      '<div class="stitle-sub" style="margin-bottom:18px">Mikrofon, hoparlör, kamera ve ekran ayarlarını yönet</div>'+
      '<div style="display:flex;flex-direction:column;gap:14px">'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🎥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Kamera</h4>'+
          '<div id="camera-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span id="camera-placeholder" style="font-size:11px;color:var(--text4);opacity:.6">Kamera kapalı</span>'+
          '</div>'+
          '<button class="btn-primary" id="camera-toggle-btn" onclick="toggleCamera()" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Kamerayı Aç</button>'+
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
          '<button class="btn-primary" id="mic-toggle-btn" onclick="toggleMicTest()" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Mikrofonu Test Et</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔊</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Hoparlör</h4>'+
          '<select id="media-spk-select" style="width:100%;padding:7px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);margin-bottom:8px;outline:none">'+spkOptions+'</select>'+
          '<div style="margin-bottom:8px">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--text4)">Ses Seviyesi</span><span id="vol-value" style="font-size:11px;font-weight:600;color:var(--text2)">80%</span></div>'+
            '<input type="range" min="0" max="100" value="80" oninput="document.getElementById(\'vol-value\').textContent=this.value+\'%\';ls(\'volume\',this.value/100)" style="width:100%;height:4px;-webkit-appearance:none;background:var(--bg3);border-radius:2px;outline:none;accent-color:var(--accent)">'+
          '</div>'+
          '<button class="btn-primary" onclick="testSpeaker()" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Hoparlörü Test Et</button>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🖥</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">Ekran Paylaşımı</h4>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">Görüşme sırasında call bar\'daki 🖥 butonunu kullan.</div>'+
          '<button class="btn-primary" onclick="testScreenShare()" style="padding:7px 14px;font-size:11px;border-radius:8px;width:100%">Test Et</button>'+
          '<div id="screen-share-preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--bg3);display:none;align-items:center;justify-content:center;margin-top:10px;overflow:hidden;border:1px solid var(--border2)">'+
            '<span style="font-size:11px;color:var(--text4);opacity:.6">Paylaşım kapalı</span>'+
          '</div>'+
        '</div>'+
        '<div style="padding:18px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:all .2s">'+
          '<div style="font-size:22px;margin-bottom:8px">🔇</div>'+
          '<h4 style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px">Gürültü Engelleme</h4>'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
            '<label class="toggle"><input type="checkbox" id="noise-toggle" '+(ls('noiseSuppression')?'checked':'')+' onchange="ls(\'noiseSuppression\',this.checked)"><span class="toggle-track"></span><span class="toggle-label" style="font-size:11px;color:var(--text4)">Arka plan gürültüsünü engelle</span></label>'+
          '</div>'+
          '<div style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:10px">Mikrofonunuzdaki arka plan seslerini (fan, klavye, trafik vb.) otomatik olarak azaltır.</div>'+
          '<div style="display:flex;gap:8px;align-items:center">'+
            '<span style="font-size:10px;color:var(--text4)">Seviye:</span>'+
            '<select id="noise-level" style="flex:1;padding:6px 10px;font-size:11px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;color:var(--text2);outline:none" onchange="ls(\'noiseLevel\',this.value)">'+
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
          '<button onclick="recordShortcut(\''+sc.id+'\')" style="padding:4px 10px;border:none;border-radius:6px;background:var(--bg3);color:var(--text4);font-family:monospace;font-size:11px;cursor:pointer;min-width:70px;text-align:center;transition:all .15s" id="sc-'+sc.id+'" title="Atamak için tıkla">'+(displayKey||'Atama')+'</button>'+
          (recordingShortcut?'':'<button onclick="resetShortcut(\''+sc.id+'\')" style="width:24px;height:24px;border:none;border-radius:5px;background:transparent;cursor:pointer;color:var(--text4);font-size:12px;display:inline-flex;align-items:center;justify-content:center" title="Sıfırla">↺</button>')+
        '</div></div>'
    }
    html+='</div>';
    content.innerHTML=html
  }else if(cat==='danger'){
    content.innerHTML='<div class="stitle">Veri Yönetimi</div>'+
      '<div style="padding:18px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><h4 style="font-size:13px;font-weight:600;color:#ef4444;margin:0">Hesabı Sil</h4></div><p style="font-size:11px;color:var(--text4);line-height:1.5;margin-bottom:12px">Bu hesabı ve tüm mesajlarını kalıcı olarak siler. Diğer hesapların etkilenmez.</p><button onclick="resetAllData()" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;transition:all .2s;box-shadow:0 3px 12px rgba(239,68,68,.25)" onmouseover="this.style.background=\'#dc2626\'" onmouseout="this.style.background=\'#ef4444\'">Hesabı Sil</button></div>'
  }else if(cat==='about'){
    var updateBtn = '<button id="update-btn" onclick="checkUpdate()" style="padding:9px 20px;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:var(--accent);color:#fff;transition:all .2s">Güncellemeleri Kontrol Et</button>';
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
    if(window.electronAPI && electronAPI.getAppVersion) electronAPI.getAppVersion().then(function(v){appVer='v'+v;var el=$('about-version');if(el)el.textContent=appVer;var wel=$('welcome-version');if(wel)wel.textContent=appVer}).catch(function(){});
    var el=$('about-version');if(el)el.textContent=appVer;
  }
  requestAnimationFrame(function(){content.classList.add('settings-content-anim')})
}

// ===== AUTO-UPDATE =====
var _updateCheckLock = false;
function checkUpdate(){
  if(_updateCheckLock) return;
  var btn = $('update-btn');
  if(!btn) return;
  btn.textContent = 'Kontrol ediliyor...';
  btn.disabled = true;
  _updateCheckLock = true;
  if(window.electronAPI && electronAPI.checkForUpdates){
    if(btn.dataset.downloaded === '1') {
      electronAPI.installUpdate();
      _updateCheckLock = false;
      return;
    }
    showUpdateBar('Güncelleme kontrol ediliyor...', 'info');
    electronAPI.checkForUpdates().then(function(result){
      _updateCheckLock = false;
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
        btn.onclick = function(){
          btn.textContent = 'İndiriliyor...';
          btn.disabled = true;
          electronAPI.startDownload().then(function(resp){
            if(!resp || !resp.success){
              btn.textContent = 'Güncellemeleri Kontrol Et';
              btn.disabled = false;
              showUpdateBar('İndirme hatası: '+(resp&&resp.error?resp.error:'Bilinmeyen hata'), 'error');
            }
          }).catch(function(err){
            btn.textContent = 'Güncellemeleri Kontrol Et';
            btn.disabled = false;
            showUpdateBar('İndirme başarısız: '+(err&&err.message?err.message:err), 'error');
          });
        };
      } else {
        btn.textContent = 'Güncellemeleri Kontrol Et';
        btn.disabled = false;
        showUpdateBar('Zaten en son sürümü kullanıyorsun.', 'info');
      }
    }).catch(function(err){
      _updateCheckLock = false;
      btn.textContent = 'Güncellemeleri Kontrol Et';
      btn.disabled = false;
      showUpdateBar('Kontrol başarısız: '+(err&&err.message?err.message:err), 'error');
    });
  } else {
    _updateCheckLock = false;
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
  electronAPI.getAppVersion().then(function(v){setAppVersion(v)}).catch(function(){});
  window.electronAPI.onUpdateAvailable(function(version){
    var btn = $('update-btn');
    if(btn && !btn.dataset.downloaded) { btn.textContent = 'v'+version+' İndir'; btn.dataset.found = '1'; btn.disabled = false; }
    showUpdateBar('Yeni sürüm v'+version+' mevcut. İndirmek için tıkla.', 'info');
    if(btn) btn.onclick = function(){
      btn.textContent = 'İndiriliyor...';
      btn.disabled = true;
      electronAPI.startDownload().then(function(resp){
        if(!resp || !resp.success){
          btn.textContent = 'Güncellemeleri Kontrol Et';
          btn.disabled = false;
          showUpdateBar('İndirme hatası: '+(resp&&resp.error?resp.error:'Bilinmeyen hata'), 'error');
        }
      }).catch(function(err){
        btn.textContent = 'Güncellemeleri Kontrol Et';
        btn.disabled = false;
        showUpdateBar('İndirme başarısız: '+(err&&err.message?err.message:err), 'error');
      });
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

// ===== CAMERA / MIC / SCREEN =====
var testCamStream=null, testMicStream=null, micTestInterval=null;

async function toggleCamera(){
  if(testCamStream){
    testCamStream.getTracks().forEach(function(t){t.stop()});
    testCamStream=null;
    $('camera-preview').innerHTML='<span style="font-size:12px;color:var(--text4)">Kamera kapalı</span>';
    $('camera-toggle-btn').textContent='Kamerayı Aç';
    return
  }
  try{
    var stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
    testCamStream=stream;
    var video=document.createElement('video');
    video.srcObject=stream;
    video.autoplay=true;
    video.muted=true;
    video.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:10px';
    $('camera-preview').innerHTML='';
    $('camera-preview').appendChild(video);
    video.play();
    $('camera-toggle-btn').textContent='Kamerayı Kapat'
  }catch(e){alert('Kamera hatası: '+e.message+'\n\nKameranın başka bir uygulamada açık olmadığından emin ol.');console.error('Camera error:',e)}
}

async function testCamera(){
  if(testCamStream){toggleCamera()}
  await toggleCamera()
}

async function toggleMicTest(){
  if(testMicStream){
    testMicStream.getTracks().forEach(function(t){t.stop()});
    testMicStream=null;
    if(micTestInterval){clearInterval(micTestInterval);micTestInterval=null}
    $('mic-level').style.width='0%';
    $('mic-level-text').textContent='- dB';
    $('mic-toggle-btn').textContent='Mikrofonu Test Et';
    return
  }
  try{
    var stream=await navigator.mediaDevices.getUserMedia({audio:true});
    testMicStream=stream;
    var audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var source=audioCtx.createMediaStreamSource(stream);
    var analyser=audioCtx.createAnalyser();analyser.fftSize=256;
    source.connect(analyser);
    var data=new Uint8Array(analyser.frequencyBinCount);
    $('mic-toggle-btn').textContent='Durdur';
    if(micTestInterval){clearInterval(micTestInterval)}
    micTestInterval=setInterval(function(){
      analyser.getByteFrequencyData(data);
      var avg=0;
      for(var mi=0;mi<data.length;mi++){avg+=data[mi]}
      avg/=data.length;
      var pct=Math.min(100,avg/2.55);
      $('mic-level').style.width=pct+'%';
      $('mic-level-text').textContent=Math.round(avg)+' dB'
    },100)
  }catch(e){alert('Mikrofon erişimi reddedildi')}
}

function testSpeaker(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=440;gain.gain.value=0.15;
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();setTimeout(function(){osc.stop();ctx.close()},500)
  }catch(e){}
}

async function testScreenShare(){
  try{
    var stream=await navigator.mediaDevices.getDisplayMedia({video:true});
    var preview=$('screen-share-preview');
    preview.style.display='flex';
    preview.innerHTML='<span style="font-size:11px;color:var(--text4);opacity:.6">Yükleniyor...</span>';
    var video=document.createElement('video');
    video.srcObject=stream;
    video.autoplay=true;
    video.muted=true;
    video.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:10px';
    preview.innerHTML='';
    preview.appendChild(video);
    video.play().catch(function(){});
    stream.getVideoTracks()[0].onended=function(){
      preview.innerHTML='<span style="font-size:11px;color:var(--text4);opacity:.6">Paylaşım durduruldu</span>'
    }
  }catch(e){
    var preview=$('screen-share-preview');
    preview.style.display='flex';
    preview.innerHTML='<span style="font-size:11px;color:#ef4444">Hata: '+(e.message||'Erişim reddedildi')+'</span>'
  }
}

async function pickSettingsAvatar(){
  try{
    if(window.electronAPI&&electronAPI.selectFile){
      var r=await electronAPI.selectFile();
      if(r&&r.thumb){
        var a=getAccounts();
        for(var i=0;i<a.length;i++){
          if(a[i].id===activeAccountId){
            a[i].avatar=r.thumb;ls('accounts',a);
            syncSidebarProfile(a[i],currentStatus);
            showSettingsCat('profile');
            var fbUid=fbUserId();if(window.db&&fbUid)db.collection('users').doc(fbUid).update({avatar:r.thumb});
            break
          }
        }
      }
    }
  }catch(e){}
}
function saveProfileSettings(){
  var d=$('set-display').value.trim(),u=$('set-username').value.trim(),b=$('set-bio').value.trim();if(!d||!u)return;
  var accs=getAccounts();
  for(var i=0;i<accs.length;i++){
    if(accs[i].id===activeAccountId){
      accs[i].displayName=d;accs[i].username=u;accs[i].bio=b;
      var av=accs[i].avatar||null;ls('accounts',accs);
      var fbUid=fbUserId();if(window.db&&fbUid)db.collection('users').doc(fbUid).update({displayName:d,username:u,bio:b,avatar:av});
      syncSidebarProfile(accs[i],currentStatus);
      showSettingsCat('profile');
      break
    }
  }
}
function saveEmail(){showAlert('E-posta değiştirme şu anlık devre dışı. Yakında kullanıma sunulacak.')}
function changePassword(){var cur=$('cur-pass').value,nu=$('new-pass').value,nu2=$('new-pass2').value;if(!cur||nu.length<6||nu!==nu2)return;if(!window.auth||!auth.currentUser){showAlert('Oturum bulunamadı.');return}if(cur===nu){showAlert('Yeni şifre, mevcut şifrenle aynı olamaz.');return}var email=auth.currentUser.email;var cred=firebase.auth.EmailAuthProvider.credential(email,cur);auth.currentUser.reauthenticateWithCredential(cred).then(function(){auth.currentUser.updatePassword(nu).then(function(){rememberAccountPassword(getActiveAccount()||{id:activeAccountId,email:email},nu);$('save-pass-btn').textContent='✓ Değiştirildi';setTimeout(function(){$('save-pass-btn').textContent='Şifreyi Değiştir';$('cur-pass').value='';$('new-pass').value='';$('new-pass2').value='';$('save-pass-btn').disabled=true},2000)}).catch(function(e){showAlert('Şifre değiştirilemedi: '+e.message)})}).catch(function(){showAlert('Mevcut şifren yanlış.')})}

// ===== E2E Encryption =====
var e2eKeys=null;
var e2eReady=false;

async function safeStore(key,val){
  if(window.electronAPI&&electronAPI.safeEncrypt){
    var enc=await electronAPI.safeEncrypt(JSON.stringify(val));
    if(enc){localStorage.setItem('wm_'+key,enc);return true}
  }
  ls(key,val);return true
}
async function safeLoad(key){
  if(window.electronAPI&&electronAPI.safeDecrypt){
    var enc=localStorage.getItem('wm_'+key);
    if(enc){var dec=await electronAPI.safeDecrypt(enc);if(dec)return JSON.parse(dec)}
  }
  return ls(key)
}

async function initE2E(){
  if(!activeAccountId||!window.crypto||!window.crypto.subtle)return;
  var saved=await safeLoad('e2e_private_'+activeAccountId);
  if(saved&&saved.length>0){
    try{
      var privKey=await crypto.subtle.importKey('pkcs8',new Uint8Array(saved),{name:'RSA-OAEP',hash:'SHA-256'},true,['decrypt']);
      e2eKeys={privateKey:privKey};e2eReady=true
    }catch(e){}
    return
  }
  try{
    var keyPair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
    var pubKey=await crypto.subtle.exportKey('spki',keyPair.publicKey);
    var privKey=await crypto.subtle.exportKey('pkcs8',keyPair.privateKey);
    await safeStore('e2e_private_'+activeAccountId,Array.from(new Uint8Array(privKey)));
    var pubB64=btoa(String.fromCharCode.apply(null,new Uint8Array(pubKey)));
    if(window.db){var fbUid=fbUserId();if(fbUid)db.collection('users').doc(fbUid).update({publicKey:pubB64}).catch(function(){})};
    e2eKeys={privateKey:keyPair.privateKey};e2eReady=true
  }catch(e){}
}

// Hybrid E2E: AES-GCM for message, RSA-OAEP to encrypt the AES key
// v1 = single recipient, v2 = multi-recipient (group)
async function e2eEncrypt(text,recipientPubKeyB64){
  var keys=recipientPubKeyB64.map?recipientPubKeyB64:[recipientPubKeyB64];
  if(!text||!keys.length||!window.crypto)throw new Error('E2E: missing key');
  var aesKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  var aesRaw=await crypto.subtle.exportKey('raw',aesKey);
  var iv=crypto.getRandomValues(new Uint8Array(12));
  var encMsg=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},aesKey,new TextEncoder().encode(text));
  var encMsgArr=new Uint8Array(encMsg);
  // Encrypt AES key for each recipient
  var encKeys=[];
  for(var ei=0;ei<keys.length;ei++){
    var pubBin=Uint8Array.from(atob(keys[ei]),function(c){return c.charCodeAt(0)});
    var pubKey=await crypto.subtle.importKey('spki',pubBin,{name:'RSA-OAEP',hash:'SHA-256'},true,['encrypt']);
    var ek=await crypto.subtle.encrypt({name:'RSA-OAEP'},pubKey,aesRaw);
    encKeys.push(new Uint8Array(ek))
  }
  if(keys.length===1){
    // v1: single recipient
    var packed=new Uint8Array(1+12+2+encKeys[0].length+encMsgArr.length);
    packed[0]=1;
    packed.set(iv,1);
    packed.set([encKeys[0].length>>8,encKeys[0].length&255],13);
    packed.set(encKeys[0],15);
    packed.set(encMsgArr,15+encKeys[0].length);
    return '🔒'+btoa(String.fromCharCode.apply(null,packed))
  }else{
    // v2: multi-recipient (group)
    var total=1+2+12+encMsgArr.length;
    for(var ei=0;ei<encKeys.length;ei++)total+=2+encKeys[ei].length;
    var packed=new Uint8Array(total);
    packed[0]=2; // version 2 = multi
    packed.set([encKeys.length>>8,encKeys.length&255],1);
    var off=3;
    for(var ei=0;ei<encKeys.length;ei++){
      packed.set([encKeys[ei].length>>8,encKeys[ei].length&255],off);
      packed.set(encKeys[ei],off+2);
      off+=2+encKeys[ei].length
    }
    packed.set(iv,off);off+=12;
    packed.set(encMsgArr,off);
    return '🔒'+btoa(String.fromCharCode.apply(null,packed))
  }
}

async function e2eDecrypt(packed64){
  if(!packed64||packed64.indexOf('🔒')!==0||!e2eKeys||!e2eKeys.privateKey)return null;
  try{
    var raw=Uint8Array.from(atob(packed64.slice(2)),function(c){return c.charCodeAt(0)});
    var ver=raw[0];
    if(ver===1){
      var iv=raw.slice(1,13);
      var keyLen=(raw[13]<<8)|raw[14];
      var encKey=raw.slice(15,15+keyLen);
      var encMsg=raw.slice(15+keyLen);
      var aesRaw=await crypto.subtle.decrypt({name:'RSA-OAEP'},e2eKeys.privateKey,encKey);
      var aesKey=await crypto.subtle.importKey('raw',aesRaw,{name:'AES-GCM',length:256},false,['decrypt']);
      var dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},aesKey,encMsg);
      return new TextDecoder().decode(dec)
    }else if(ver===2){
      var numKeys=(raw[1]<<8)|raw[2];
      var off=3,foundKey=null;
      for(var ki=0;ki<numKeys;ki++){
        var kl=(raw[off]<<8)|raw[off+1];
        var ek=raw.slice(off+2,off+2+kl);
        off+=2+kl;
        if(!foundKey){try{var maybe=await crypto.subtle.decrypt({name:'RSA-OAEP'},e2eKeys.privateKey,ek);foundKey=new Uint8Array(maybe)}catch(e){}}
      }
      if(!foundKey)return null;
      var iv=raw.slice(off,off+12);
      var encMsg=raw.slice(off+12);
      var aesKey=await crypto.subtle.importKey('raw',foundKey,{name:'AES-GCM',length:256},false,['decrypt']);
      var dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},aesKey,encMsg);
      return new TextDecoder().decode(dec)
    }
    return null
  }catch(e){return null}
}

var validThemes=['royal','forest','wine','slate','plum','coffee','teal','ember','navy','emerald','cloud','pearl','mist','cream','sage','lilac','coral','sky','linen','frost'];
var lightThemes=['cloud','pearl','mist','cream','sage','lilac','coral','sky','linen','frost'];
function clearThemes(w){
  validThemes.forEach(function(c){w.classList.remove('t-'+c,'l-'+c)})
}
function applyThemeToBody(t){
  var b=document.body;
  validThemes.forEach(function(c){b.classList.remove('t-'+c,'l-'+c)});
  if(t&&t!=='default'&&validThemes.indexOf(t)!==-1){
    var p=lightThemes.indexOf(t)!==-1?'l-':'t-';b.classList.add(p+t)
  }
}
function applyTheme(t){
  var w=$('app-window');if(!w)return;
  clearThemes(w);
  if(t&&t!=='default'&&validThemes.indexOf(t)!==-1){
    var p=lightThemes.indexOf(t)!==-1?'l-':'t-';w.classList.add(p+t)
  }else{t='default'}
  applyThemeToBody(t);
  ls('theme',t||'default')
}
function getTheme(){var t=ls('theme');return t&&validThemes.indexOf(t)!==-1?t:'default'}
var _previewTimer=null;
function previewTheme(t){
  var w=$('app-window');if(!w)return;
  if(t&&(t==='default'||validThemes.indexOf(t)!==-1)){
    var pe=document.getElementById('theme-preview-style');
    if(!pe){pe=document.createElement('style');pe.id='theme-preview-style';document.head.appendChild(pe)}
    clearThemes(w);
    applyThemeToBody(t);
    if(t!=='default'){
      var p=lightThemes.indexOf(t)!==-1?'l-':'t-';
      w.classList.add(p+t);
    }
    clearTimeout(_previewTimer);
    _previewTimer=setTimeout(function(){
      var cs=getComputedStyle(w);
      var vars=['--bg','--bg2','--bg3','--accent','--text','--text2','--text3','--text4','--surface','--border','--border2','--grad','--input-bg','--msg-received','--hover','--sidebar-bg','--panel-bg'];
      var styles='';
      for(var vi=0;vi<vars.length;vi++){
        var val=cs.getPropertyValue(vars[vi]).trim();
        if(val)styles+=vars[vi]+':'+val+';'
      }
      pe.textContent=':root{'+styles+'}'
    },10)
  }else{unpreviewTheme()}
}
function unpreviewTheme(){
  clearTimeout(_previewTimer);
  var pe=document.getElementById('theme-preview-style');
  if(pe)pe.textContent='';
  applyTheme(getTheme())
}
function selectTheme(t){unpreviewTheme();ls('theme',t);applyTheme(t);showSettingsCat('theme')}

function toggleAutoStart(val){
  if(window.electronAPI&&electronAPI.setAutoStart)electronAPI.setAutoStart(val)
}
function toggleBackground(val){
  ls('backgroundMode',val);
  if(window.electronAPI&&electronAPI.setBackgroundMode)electronAPI.setBackgroundMode(val)
}
function resetFirebaseAll(){
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Tüm Verileri Sıfırla</h4>'+
    '<p style="color:var(--text4);font-size:12px">Tüm hesaplar, mesajlar ve ayarlar silinsin mi? Firebase hesabın da silinir. Bu işlem geri alınamaz.</p>';
  $('delete-password-field').style.display='block';
  $('delete-password-input').value='';
  $('delete-password-input').focus();
  $('delete-confirm-btn').textContent='Tümünü Sıfırla';
  $('delete-confirm-btn').onclick=function(){
    closeModal('modal-delete',async function(){
      if(window.auth&&auth.currentUser){
        try{
          var email=auth.currentUser.email;
          var pass=$('delete-password-input').value;
          if(!pass){showAlert('Şifre gerekli.');$('delete-password-field').style.display='none';return}
          var cred=firebase.auth.EmailAuthProvider.credential(email,pass);
          await auth.currentUser.reauthenticateWithCredential(cred);
          db.collection('users').doc(auth.currentUser.uid).delete().catch(function(){});
          await auth.currentUser.delete()
        }catch(e){$('delete-password-field').style.display='none';showAlert('Doğrulama başarısız. Hesap silinemedi.');return}
      }
      $('delete-password-field').style.display='none';
      $('delete-password-input').value='';
      localStorage.clear();
      conversations=[];messages={};activeConvId=null;activeAccountId=null;avatarDataUrl=null;
      hideSettings();showScreen('screen-welcome');renderSavedAccounts();
      hideDeleteModal()
    })
  };
  $('modal-delete').classList.add('active')
}
function resetAllData(){
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Hesabı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu hesap kalıcı olarak silinsin mi? Diğer hesapların etkilenmez.</p>';
  $('delete-password-field').style.display='block';
  $('delete-password-input').value='';
  $('delete-password-input').focus();
  $('delete-confirm-btn').textContent='Hesabı Sil';
  $('delete-confirm-btn').onclick=async function(){
    hideDeleteModal();
    var localId=activeAccountId,fbUid=fbUserId(),email=window.auth&&auth.currentUser?auth.currentUser.email:null;
    var acc=getAccountById(localId)||getAccountById(fbUid)||getAccountByEmail(email);
    if(window.auth&&auth.currentUser){
      try{
        var pass=$('delete-password-input').value;
        if(!pass){$('delete-password-field').style.display='none';showAlert('Hesap silme iptal edildi.');return}
        var cred=firebase.auth.EmailAuthProvider.credential(email,pass);
        await auth.currentUser.reauthenticateWithCredential(cred);
        if(window.db&&fbUid){
          // Clean up friend requests
          var reqSnap1=await db.collection('friendRequests').where('from','==',fbUid).get().catch(function(){return{forEach:function(){}}});
          reqSnap1.forEach(function(d){db.collection('friendRequests').doc(d.id).delete().catch(function(){})});
          var reqSnap2=await db.collection('friendRequests').where('to','==',fbUid).get().catch(function(){return{forEach:function(){}}});
          reqSnap2.forEach(function(d){db.collection('friendRequests').doc(d.id).delete().catch(function(){})});
          // Remove from friends lists
          var listSnap=await db.collection('friends').doc(fbUid).collection('list').get().catch(function(){return{forEach:function(){}}});
          listSnap.forEach(function(d){
            var otherId=d.data().id;
            db.collection('friends').doc(otherId).collection('list').doc(fbUid).delete().catch(function(){});
            db.collection('friends').doc(fbUid).collection('list').doc(d.id).delete().catch(function(){});
          });
          // Remove from conversations
          var convSnap=await db.collection('conversations').where('memberIds','array-contains',fbUid).get().catch(function(){return{forEach:function(){}}});
          convSnap.forEach(function(d){
            var mids=d.data().memberIds||[];
            var idx=mids.indexOf(fbUid);
            if(idx>-1){mids.splice(idx,1);db.collection('conversations').doc(d.id).update({memberIds:mids}).catch(function(){})}
          });
          await db.collection('users').doc(fbUid).delete().catch(function(){})
        }
        await auth.currentUser.delete()
      }catch(e){$('delete-password-field').style.display='none';showAlert('Doğrulama başarısız. Hesap silinemedi.');return}
    }
    $('delete-password-field').style.display='none';
    $('delete-password-input').value='';
    forgetAccountPassword(acc||{id:localId,email:email});
    var accs=getAccounts();
    for(var ri=accs.length-1;ri>=0;ri--){if(accs[ri].id===localId||accs[ri].id===fbUid||(email&&accs[ri].email===email)){accs.splice(ri,1)}}
    ls('accounts',accs);
    conversations=[];messages={};activeConvId=null;activeAccountId=null;avatarDataUrl=null;
    hideSettings();showScreen('screen-welcome');renderSavedAccounts()
  };
  $('modal-delete').classList.add('active')
}

// ===== MAIN APP =====
async function showApp(profileOrUsername,display,email,avatar,status,bio,password){
  var profile=(profileOrUsername&&typeof profileOrUsername==='object')?profileOrUsername:{username:profileOrUsername,displayName:display,email:email,avatar:avatar,status:status,bio:bio,password:password};
  resetSessionState();
  status=profile.status||'online';currentStatus=status;
  try{
    var acc=mergeAccountProfile(profile);
    status=acc.status||status||'online';currentStatus=status;
    showScreen(null);
    var appMain=$('app-main');if(appMain)appMain.classList.add('active');
    syncSidebarProfile(acc,status);
    await loadMessages();
    var savedStatus=ls('status_'+activeAccountId);if(savedStatus)updateStatusUI(savedStatus);
    // Load conversations: merge encrypted + localStorage data
    var localConvs=loadConversations();
    if(localConvs&&localConvs.length>0){
      for(var lci=0;lci<localConvs.length;lci++){
        var exists=false;
        for(var eci=0;eci<conversations.length;eci++){if(conversations[eci].id===localConvs[lci].id){exists=true;break}}
        if(!exists)conversations.push(localConvs[lci])
      }
    }
    var savedGroups=getGroups();
    for(var i=0;i<savedGroups.length;i++){
      normalizeGroupMembers(savedGroups[i]);savedGroups[i].memberIds=getGroupMemberIds(savedGroups[i]);
      var exists=false;
      for(var gci=0;gci<conversations.length;gci++){if(conversations[gci].id===savedGroups[i].id){exists=true;break}}
      if(!exists)conversations.unshift(savedGroups[i])
    }
    if(savedGroups.length)saveGroups(savedGroups);
    // Restore unread counts and last activity
    var savedUnread=ls('unreadCounts')||{};
    var savedActivity=ls('lastActivity')||{};
    for(var uci=0;uci<conversations.length;uci++){
      var cid=conversations[uci].id;
      if(savedUnread[cid]!==undefined)conversations[uci].unread=savedUnread[cid];
      if(savedActivity[cid]!==undefined)conversations[uci].lastActivity=savedActivity[cid]
    }
    // Initialize lastActivity for conversations that don't have it
    for(var lai=0;lai<conversations.length;lai++){
      if(!conversations[lai].lastActivity){conversations[lai].lastActivity=Date.now()-conversations.length*1000+lai*100}
    }
    // Recalculate conversation previews from actual messages
    for(var sci=0;sci<conversations.length;sci++){
      updateConvPreview(conversations[sci].id)
    }
    activeConvId=null;
    // Start listening to conversation updates from Firestore
    var currentFbUid=fbUserId();
    if(window.db&&currentFbUid){fbListenConversations(currentFbUid);startPendingListener(currentFbUid)}
    // Init background mode
    if(ls('backgroundMode')&&window.electronAPI&&electronAPI.setBackgroundMode)electronAPI.setBackgroundMode(true);
    initE2E();
  }catch(e){console.error('[showApp] Error:',e)}
  // Always render and finalize, even on error
  _pendingLoginPassword=null;
  _authTransitioning=false;
  function tryRender(){
    var el=$('conv-list');
    var layout=document.querySelector('.app-layout');
    if(el&&layout&&layout.classList.contains('active')){
      renderConversations();
    }else{
      setTimeout(tryRender,150)
    }
  }
  tryRender();
}

function renderConversations(list){
  var el=$('conv-list');if(!el)return;var data=(list||conversations).slice();
  var animateList=!_convListAnimatedOnce&&!list;
  el.classList.toggle('no-anim',!animateList);
  // Sort: pinned first (alphabetically), then by most recent activity
  data.sort(function(a,b){
    if(isPinned(a.id)&&!isPinned(b.id))return -1;
    if(!isPinned(a.id)&&isPinned(b.id))return 1;
    if(isPinned(a.id)&&isPinned(b.id)){
      var an=a.name.toLowerCase(),bn=b.name.toLowerCase();
      return an<bn?-1:(an>bn?1:0)
    }
    var aTime=a.lastActivity||0,bTime=b.lastActivity||0;
    if(bTime!==aTime)return bTime-aTime;
    // Tiebreaker: by name
    var an=a.name.toLowerCase(),bn=b.name.toLowerCase();
    return an<bn?-1:(an>bn?1:0)
  });
  // Apply archive filter (skip if searching)
  if(!_searchQuery)data=data.filter(function(c){return _showArchived?isArchived(c.id):!isArchived(c.id)});
  // Hide closed conversations from sidebar
  if(!_searchQuery)data=data.filter(function(c){return !c.hidden});
  // Update archive bar
  var ab=$('archive-label');
  if(ab)ab.textContent=_showArchived?'Arşiv (gizle)':'Arşiv';
  // Archive badge: total unread from archived conversations
  var archUnread=0;
  for(var ai=0;ai<conversations.length;ai++){if(isArchived(conversations[ai].id))archUnread+=conversations[ai].unread||0}
  var archBadge=$('archive-badge');
  if(archBadge){
    if(archUnread>0){archBadge.style.display='flex';archBadge.textContent=archUnread>99?'99+':archUnread}
    else archBadge.style.display='none'
  }
  el.innerHTML='';
  if(_showArchived&&data.length===0){el.innerHTML='<div style="text-align:center;padding:40px 10px;font-size:11px;color:var(--text4)">📦 Arşiv boş.</div>';_convListAnimatedOnce=true;return}
  for(var i=0;i<data.length;i++){(function(c){
    var muted=isMuted(c.id);var pinned=isPinned(c.id);
    var div=document.createElement('div');div.className='conv-item'+(c.id===activeConvId?' active':'')+(muted?' muted':'');
    var avHtml='<div class="conv-avatar'+(c.online?' online':'')+'" style="background:'+c.color+'">';
    if(c.isGroup){
      if(c.avatar&&c.avatar.indexOf('data:')===0)avHtml+='<img src="'+c.avatar+'" style="width:100%;height:100%;object-fit:cover">';
      else avHtml+='G';
      avHtml+='<div class="group-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg></div>'
    }else{
      if(c.avatar&&c.avatar.indexOf('data:')===0)avHtml+='<img src="'+c.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+c.color+'\';this.parentElement.textContent=\'?\'">';
      else avHtml+=esc(c.avatar||'?')
    }
    avHtml+='</div>';
    div.innerHTML=avHtml+
    '</div><div class="conv-info"><div class="conv-name"><span>'+(pinned?'📌 ':'')+(muted?'🔇 ':'')+esc(c.name)+'</span><span class="conv-time">'+esc(c.time||'')+'</span></div><div class="conv-preview">'+esc(c.lastMsg||'')+'</div></div>'+
    (c.unread>0?'<div class="conv-badge">'+c.unread+'</div>':'');
    div.onclick=function(){selectConversation(c.id)};
    div.oncontextmenu=function(e){e.preventDefault();showConvContext(e.clientX,e.clientY,c.id)};
    el.appendChild(div)
  })(data[i])}
  _convListAnimatedOnce=true;
}

function filterConversations(q){_searchQuery=q;renderConversations()}
function findConv(id){for(var i=0;i<conversations.length;i++){if(conversations[i].id==id)return conversations[i]}return null}
function memberCount(g){return(g&&g.members?g.members.length:0)+(g&&g.creatorId?1:0)}
function parseTime(t){
  if(!t)return 0;
  // "12:30" format → minutes since midnight
  var p=t.split(':');if(p.length>=2)return parseInt(p[0])*60+parseInt(p[1]);
  // "Dün" or other text
  if(t==='Dün')return -1440;
  return -9999
}

function selectConversation(id){hideContextMenu();hideAvatarMenu();hideSettings();$('settings-page').classList.remove('active');closeProfilePanel();_hasNewMsg=false;if(activeConvId&&activeConvId!==id)fbUnlistenMessages(activeConvId);fbUnlistenTyping();fbStopCallSignals();stopTyping();activeConvId=id;var conv=findConv(id);if(!conv)return;conv.unread=0;saveUnreadCounts();saveConversations();renderConversations();$('chat-empty').style.display='none';$('chat-active').style.display='flex';var ca=$('chat-header-avatar');ca.style.background=conv.color||'var(--grad)';if(conv.avatar&&conv.avatar.indexOf('data:')===0){ca.innerHTML='<img src="'+conv.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+(conv.color||'var(--grad)')+'\';this.parentElement.textContent=\''+(conv.isGroup?'G':'?')+'\'">';ca.style.background='transparent'}else{ca.textContent=conv.isGroup?'G':(conv.avatar||'?')}$('chat-header-name').textContent=conv.name;$('chat-header-status').textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv);_forceScrollBottom=true;renderMessages(id);fbListenMessages(id);fbSyncOnlineStatus(id);var inp=$('chat-input');if(inp)inp.focus();
if(!conv.isGroup&&window.db&&fbUserId()){var otherId=null;for(var ti=0;ti<(conv.memberIds||[]).length;ti++){if(conv.memberIds[ti]!==fbUserId()){otherId=conv.memberIds[ti];break}}if(otherId)fbListenTyping(id,otherId)}
fbListenCallSignals(id)}

var _pubKeyCache={};
async function getRecipientPubKey(convId){
  var conv=findConv(convId);if(!conv)return null;
  var curId=fbUserId();if(!curId)return null;
  // 1-on-1
  if(!conv.isGroup){
    var memberIds=conv.memberIds||[];
    if(conv.members)memberIds=conv.members.map(function(m){return m.id}).filter(function(id){return id&&id.indexOf('gf_')!==0&&id.indexOf('friend_')!==0&&id.indexOf('dm_')!==0});
    if(memberIds.length<1)return null;
    var recId=memberIds[0]===curId?memberIds[1]:memberIds[0];
    if(!recId)return null;
    if(_pubKeyCache[recId])return _pubKeyCache[recId];
    try{
      var snap=await db.collection('users').doc(recId).get();
      if(snap.exists&&snap.data().publicKey){_pubKeyCache[recId]=snap.data().publicKey;return {keys:[_pubKeyCache[recId]],missing:[]}}
    }catch(e){}
    return {keys:[],missing:[recId]}
  }
  // Group: get all non-self member public keys
  var memberIds=conv.memberIds||[];
  if(!memberIds.length&&conv.members)memberIds=conv.members.map(function(m){return m.id}).filter(function(id){return id&&id.indexOf('gf_')!==0&&id.indexOf('friend_')!==0&&id.indexOf('dm_')!==0});
  var keys=[],missing=[];
  for(var gmi=0;gmi<memberIds.length;gmi++){
    if(memberIds[gmi]===curId)continue;
    if(_pubKeyCache[memberIds[gmi]]){keys.push(_pubKeyCache[memberIds[gmi]]);continue}
    try{
      var snap=await db.collection('users').doc(memberIds[gmi]).get();
      if(snap.exists&&snap.data().publicKey){_pubKeyCache[memberIds[gmi]]=snap.data().publicKey;keys.push(snap.data().publicKey)}
      else{missing.push(memberIds[gmi])}
    }catch(e){missing.push(memberIds[gmi])}
  }
  return keys.length?{keys:keys,missing:missing}:{keys:[],missing:missing}
}

async function sendMessage(){var inp=$('chat-input'),txt=inp.value.trim();if(!txt||!activeConvId)return;var conv=findConv(activeConvId);
  var finalText=txt;
  if(conv&&e2eReady&&window.db){var pubKeyResult=await getRecipientPubKey(activeConvId);if(pubKeyResult&&pubKeyResult.keys&&pubKeyResult.keys.length>0){if(pubKeyResult.missing&&pubKeyResult.missing.length>0){showAlert(pubKeyResult.missing.length+' kullanıcı henüz E2E\'yi etkinleştirmemiş. Mesaj E2E şifrelenmeden gönderiliyor.')}else{try{var enc=await e2eEncrypt(txt,pubKeyResult.keys);if(enc&&enc.indexOf('🔒')===0)finalText=enc}catch(e){}}}}
  var myId=fbUserId();
  var id=uid(),msg={id:id,type:'sent',senderId:myId,text:finalText,time:timeNow(),edited:false,deleted:false};if(replyToMsgId){msg.replyTo=replyToMsgId;msg.replyText=replyToMsgText&&replyToMsgText.indexOf('🔒')===0?'🔒 [Şifreli]':replyToMsgText;cancelReply()}if(conv&&finalText!==txt){msg.e2e=true;msg._decrypted=txt}if(!messages[activeConvId])messages[activeConvId]=[];messages[activeConvId].push(msg);renderMessages(activeConvId);inp.value='';$('chat-send').disabled=true;if(conv){conv.lastMsg=msg._decrypted||txt;conv.lastActivity=Date.now();conv.time=timeNow()}renderConversations();saveMessages();fbSendMessage(activeConvId,msg);stopTyping();setTimeout(function(){var fi=$('chat-input');if(fi){fi.focus();var fl=fi.value.length;fi.setSelectionRange(fl,fl)}},30)}





function addToGroup(groupId,userId){
  hideContextMenu();
  var group=findConv(groupId);if(!group||!group.isGroup)return;
  normalizeGroupMembers(group);
  var conv=findConv(userId),member=makeGroupMemberFromConversation(conv)||makeGroupMemberFromFriend(findFriendByIdOrName(userId,null),null);
  if(!member)return;
  for(var mj=0;mj<group.members.length;mj++){if(group.members[mj].id===member.id){selectConversation(groupId);return}}
  group.members.push(member);group.memberIds=getGroupMemberIds(group);
  saveGroup(group);addGroupLog(groupId,member.name+' gruba eklendi');
  saveMessages();fbSyncMembers(groupId);
  if(activeConvId==groupId){var se=$('chat-header-status');if(se)se.textContent=memberCount(group)+' üye'}
  selectConversation(groupId)
}

// Global edit state
var editGroupState=null; // {groupId, originalName, addedIds:[], removedIds:[]}

function editGroup(groupId){closeProfilePanel();var conv=findConv(groupId);if(!conv||!conv.isGroup)return;
  normalizeGroupMembers(conv);
  editGroupState={groupId:groupId,originalName:conv.name,addedIds:[],removedIds:[]};
  var ml=$('group-member-list');ml.innerHTML='';
  // Add existing members
  for(var i=0;i<conv.members.length;i++){(function(m){
    var d=document.createElement('div');d.className='modal-member-item selected';
    var eAv=m.avatar;var eAvHtml;if(eAv&&eAv.indexOf('data:')===0){eAvHtml='<img src="'+eAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+m.color+'\';this.parentElement.textContent=\'?\'">'}else{eAvHtml='<span>'+(eAv||'?')+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+m.color+'">'+eAvHtml+'</div><div class="mm-name">'+esc(m.name)+'</div><div class="mm-check mm-remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(!d.classList.contains('selected')){editGroupState.removedIds.push(ci)}else{var idx=editGroupState.removedIds.indexOf(ci);if(idx>-1)editGroupState.removedIds.splice(idx,1)}validateGroup()};
    d._cid=m.id;ml.appendChild(d)
  })(conv.members[i])}
  // Add non-member contacts (including friends not in conversations)
  var addedNames={};for(var mi=0;mi<conv.members.length;mi++)addedNames[conv.members[mi].id]=true;
  for(var i=0;i<conversations.length;i++){(function(c){
    if(c.isGroup||c.id===groupId)return;
    var member=makeGroupMemberFromConversation(c);if(!member||addedNames[member.id])return;
    addedNames[member.id]=true;
    var d=document.createElement('div');d.className='modal-member-item';
    var cAv=c.avatar;var cAvHtml;if(cAv&&cAv.indexOf('data:')===0){cAvHtml='<img src="'+cAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+c.color+'\';this.parentElement.textContent=\'?\'">'}else{cAvHtml='<span>'+(cAv||'?')+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+c.color+'">'+cAvHtml+'</div><div class="mm-name">'+esc(c.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(d.classList.contains('selected')){editGroupState.addedIds.push(ci)}else{var idx=editGroupState.addedIds.indexOf(ci);if(idx>-1)editGroupState.addedIds.splice(idx,1)}validateGroup()};
    d._cid=member.id;d._memberData=member;ml.appendChild(d)
  })(conversations[i])}
  // Also add friends not in conversations
  var editFriends=getCachedFriends();var eColors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  for(var efi=0;efi<editFriends.length;efi++){(function(f){
    var fm=makeGroupMemberFromFriend(f,eColors[efi%eColors.length]);if(!fm||addedNames[fm.id])return;
    addedNames[fm.id]=true;
    var fid=fm.id;
    var d=document.createElement('div');d.className='modal-member-item';
    var fAv=f.avatar;var fAvHtml;if(fAv&&fAv.indexOf('data:')===0){fAvHtml='<img src="'+fAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+eColors[efi%eColors.length]+'\';this.parentElement.textContent=\'?\'">'}else{fAvHtml='<span>'+esc(f.name.charAt(0).toUpperCase())+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+eColors[efi%eColors.length]+'">'+fAvHtml+'</div><div class="mm-name">'+esc(f.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(d.classList.contains('selected')){editGroupState.addedIds.push(ci)}else{var idx=editGroupState.addedIds.indexOf(ci);if(idx>-1)editGroupState.addedIds.splice(idx,1)}validateGroup()};
    d._cid=fid;d._memberData=fm;ml.appendChild(d)
  })(editFriends[efi])}
  $('group-name').value=conv.name;
  // Change modal header to "Grubu Düzenle"
  var mh=$('modal-group').querySelector('.modal-header h3');
  if(mh)mh.textContent='Grubu Düzenle';
  validateGroup();
  $('modal-group').classList.add('active');
  $('group-create-btn').textContent='Kaydet';
  var _saving=false;
  $('group-create-btn').onclick=function(){
    if(!editGroupState||_saving)return;_saving=true;
    var nn=$('group-name').value.trim();if(!nn)return;
    var logs=[];
    
    if(conv.creatorId===activeAccountId){conv.name=nn}
    if(nn!==editGroupState.originalName)logs.push('Grup adı "'+nn+'" olarak değiştirildi');
    
    for(var ri=0;ri<editGroupState.removedIds.length;ri++){
      for(var x=0;x<conv.members.length;x++){
        if(conv.members[x].id==editGroupState.removedIds[ri]){
          logs.push(conv.members[x].name+' gruptan çıkarıldı');
          conv.members.splice(x,1);
          break
        }
      }
      if(conv.adminIds){var rai=conv.adminIds.indexOf(editGroupState.removedIds[ri]);if(rai>-1)conv.adminIds.splice(rai,1)}
    }
    
    for(var ai=0;ai<editGroupState.addedIds.length;ai++){
      var added=false;
      var cm=makeGroupMemberFromConversation(findConversationByPeerId(editGroupState.addedIds[ai]));
      if(cm){
        conv.members.push(cm);
        logs.push(cm.name+' gruba eklendi');
        added=true
      }
      if(!added){
        var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
        var fm=makeGroupMemberFromFriend(findFriendByIdOrName(editGroupState.addedIds[ai],null),colors[ai%colors.length]);
        if(fm){conv.members.push(fm);logs.push(fm.name+' gruba eklendi');added=true}
      }
    }
    
    conv.lastMsg='Grup güncellendi';
    normalizeGroupMembers(conv);conv.memberIds=getGroupMemberIds(conv);
    var gs=getGroups();
    for(var i=0;i<gs.length;i++){if(gs[i].id===groupId){gs[i].members=conv.members;gs[i].memberIds=conv.memberIds;gs[i].adminIds=conv.adminIds;saveGroups(gs);break}}
    
    for(var li=0;li<logs.length;li++){addGroupLog(groupId,logs[li])}
    
    renderConversations();selectConversation(groupId);hideGroupModal();
    fbSyncMembers(groupId);
    editGroupState=null;
    $('group-create-btn').textContent='Oluştur';
    $('group-create-btn').onclick=function(){createGroup()}
  };
  validateGroup()
}

// ===== MEDIA =====
var pendingMediaFiles=[],mediaIndex=0;
function toggleUploadMenu(){$('upload-menu').classList.toggle('active')}
function hideUploadMenu(){$('upload-menu').classList.remove('active')}

async function sendMedia(type){hideUploadMenu();if(!activeConvId)return;
  try{if(window.electronAPI&&electronAPI.selectMedia){
    var files=await electronAPI.selectMedia(type||'all');
    if(files&&files.length>0){
      pendingMediaFiles=files;mediaIndex=0;
      showMediaPreview()
    }
  }}catch(e){console.error(e)}
}

var mediaThumbCount=0;
function showMediaPreview(){
  if(pendingMediaFiles.length===0){hideMediaModal();return}
  $('modal-media').classList.add('active');
  mediaIndex=Math.min(mediaIndex,pendingMediaFiles.length-1);
  var file=pendingMediaFiles[mediaIndex];
  
  // Update counter & nav
  $('media-counter').textContent=(mediaIndex+1)+' / '+pendingMediaFiles.length;
  $('media-prev-btn').style.display=mediaIndex>0?'':'none';
  $('media-next-btn').style.display=mediaIndex<pendingMediaFiles.length-1?'':'none';
  $('media-caption-label').textContent='Açıklama ('+(mediaIndex+1)+'. dosya için)';
  $('media-caption').value=file.caption||'';
  $('media-caption').oninput=function(){pendingMediaFiles[mediaIndex].caption=this.value};
  
  // Update main preview
  var area=$('media-preview-area');
  if(file.type==='image'){
    area.innerHTML='<img src="'+file.dataUrl+'" style="max-width:100%;max-height:220px;border-radius:10px">'
  }else if(file.type==='video'){
    area.innerHTML='<video src="'+file.dataUrl+'" controls style="max-width:100%;max-height:220px;border-radius:10px"></video>'
  }else{
    area.innerHTML='<div style="padding:30px;font-size:40px;opacity:.4">📎</div><div style="font-size:12px;color:var(--text4)">'+esc(file.name)+'</div>'
  }
  
  // Rebuild thumbnails if count changed
  if(mediaThumbCount!==pendingMediaFiles.length){
    mediaThumbCount=pendingMediaFiles.length;
    var list=$('media-files-list');
    var container=document.createElement('div');
    container.className='media-files-list-inner';
    container.style.cssText='display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;padding:6px 2px;flex-wrap:nowrap';
    for(var i=0;i<pendingMediaFiles.length;i++){
      (function(fi,f){
        var thumb=document.createElement('div');
        thumb.className='media-thumb';
        thumb.dataset.idx=fi;
        thumb.style.cssText='width:56px;height:56px;border-radius:10px;overflow:hidden;cursor:pointer;flex-shrink:0;border:2px solid '+(fi===mediaIndex?'var(--accent)':'transparent');
        thumb.onclick=function(){mediaGoTo(fi)};
        if(f.type==='image'){
          thumb.style.backgroundImage='url('+f.dataUrl+')';
          thumb.style.backgroundSize='cover';
          thumb.style.backgroundPosition='center'
        }else{
          thumb.style.cssText+=';background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px';
          thumb.textContent=f.type==='video'?'🎬':'📎'
        }
        container.appendChild(thumb)
      })(i,pendingMediaFiles[i])
    }
    list.innerHTML='';list.appendChild(container)
  }else{
    // Just update active border on thumbs
    var thumbs=document.querySelectorAll('.media-thumb');
    for(var i=0;i<thumbs.length;i++){
      thumbs[i].style.borderColor=i===mediaIndex?'var(--accent)':'transparent'
    }
  }
}

function mediaPrev(){if(mediaIndex>0){mediaIndex--;showMediaPreview()}}
function mediaNext(){if(mediaIndex<pendingMediaFiles.length-1){mediaIndex++;showMediaPreview()}}
function mediaGoTo(i){mediaIndex=i;showMediaPreview()}

// ===== IMAGE VIEWER =====
var imageViewerOpen=false,imageViewerMsgs=[],imageViewerIdx=0;
function showImage(src){
  // Find all image messages in current conversation for navigation
  imageViewerMsgs=[];imageViewerIdx=0;
  if(activeConvId&&messages[activeConvId]){
    for(var vi=0;vi<messages[activeConvId].length;vi++){
      if(messages[activeConvId][vi].image){
        imageViewerMsgs.push(messages[activeConvId][vi].image);
        if(messages[activeConvId][vi].image===src)imageViewerIdx=imageViewerMsgs.length-1
      }
    }
  }
  imageViewerOpen=true;
  renderImageViewer()
}
function renderImageViewer(){
  if(!imageViewerOpen||imageViewerMsgs.length===0){imageViewerOpen=false;return}
  var overlay=document.createElement('div');
  overlay.id='image-viewer';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column';
  overlay.onclick=function(e){if(e.target===overlay)closeImageViewer()};
  overlay.innerHTML='<div style="position:relative;display:flex;align-items:center;gap:12px">'+
    (imageViewerMsgs.length>1?'<button onclick="event.stopPropagation();imageViewerIdx=Math.max(0,imageViewerIdx-1);document.body.removeChild(document.getElementById(\'image-viewer\'));renderImageViewer()" style="width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px" onmouseover="this.style.background=\'rgba(255,255,255,.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,.1)\'">‹</button>':'')+
    '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="'+imageViewerMsgs[imageViewerIdx]+'" style="max-width:85vw;max-height:75vh;border-radius:12px;object-fit:contain;cursor:default">'+
    '<div style="display:flex;gap:6px"><button onclick="event.stopPropagation();saveImage(imageViewerMsgs[imageViewerIdx])" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:11px">💾 Kaydet</button><button onclick="event.stopPropagation();copyImage(imageViewerMsgs[imageViewerIdx])" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:11px">📋 Kopyala</button></div></div>'+
    (imageViewerMsgs.length>1?'<button onclick="event.stopPropagation();imageViewerIdx=Math.min(imageViewerMsgs.length-1,imageViewerIdx+1);document.body.removeChild(document.getElementById(\'image-viewer\'));renderImageViewer()" style="width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px" onmouseover="this.style.background=\'rgba(255,255,255,.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,.1)\'">›</button>':'')+
  '</div>'+
  (imageViewerMsgs.length>1?'<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.4)">'+(imageViewerIdx+1)+' / '+imageViewerMsgs.length+'</div>':'');
  document.body.appendChild(overlay)
}
function closeImageViewer(){
  imageViewerOpen=false;
  var el=document.getElementById('image-viewer');
  if(el)document.body.removeChild(el)
}

// Keyboard nav for image viewer
document.addEventListener('keydown',function(e){
  if(!imageViewerOpen)return;
  if(e.key==='ArrowLeft'&&imageViewerIdx>0){
    e.preventDefault();
    imageViewerIdx--;
    var el=document.getElementById('image-viewer');if(el)document.body.removeChild(el);
    renderImageViewer()
  }else if(e.key==='ArrowRight'&&imageViewerIdx<imageViewerMsgs.length-1){
    e.preventDefault();
    imageViewerIdx++;
    var el=document.getElementById('image-viewer');if(el)document.body.removeChild(el);
    renderImageViewer()
  }else if(e.key==='Escape'){
    e.preventDefault();
    closeImageViewer()
  }
});

function hideMediaModal(){pendingMediaFiles=[];mediaThumbCount=0;$('modal-media').classList.remove('active')}

var sendingMediaLock=false;
async function confirmSendMedia(){
  if(pendingMediaFiles.length===0||!activeConvId||sendingMediaLock)return;
  sendingMediaLock=true;
  async function e2eMediaText(text,convId){
    if(!text||!e2eReady||!window.db)return text;
    var conv=findConv(convId);if(!conv)return text;
    var pubKeys=await getRecipientPubKey(convId);
    if(!pubKeys||!(Array.isArray(pubKeys)?pubKeys.length:1))return text;
    try{var enc=await e2eEncrypt(text,pubKeys);if(enc&&enc.indexOf('🔒')===0)return enc}catch(e){}
    return text
  }
  (function processMedia(idx){
    if(idx>=pendingMediaFiles.length){
      renderMessages(activeConvId);renderConversations();
      saveMessages();
      pendingMediaFiles=[];mediaThumbCount=0;
      hideMediaModal();sendingMediaLock=false;
      return
    }
    var file=pendingMediaFiles[idx];
    var caption=(file.caption||'').trim();
    var ext=file.name?file.name.split('.').pop():'png';
    var path='media/'+activeConvId+'/'+Date.now()+'_'+idx+'.'+ext;
    var dataUrl=file.dataUrl;
    if(dataUrl&&dataUrl.indexOf('data:')===0&&window.storage){
      fbUploadFile(dataUrl,path).then(async function(url){
        var id=uid();
        if(!messages[activeConvId])messages[activeConvId]=[];
        var txt=file.type==='image'||file.type==='video'?caption:'📎 '+file.name+(caption?' — '+caption:'');
        var encTxt=await e2eMediaText(txt,activeConvId);
        var msg={id:id,type:'sent',senderId:fbUserId(),text:encTxt,time:timeNow(),edited:false,deleted:false};
        if(file.type==='image')msg.image=url;
        else if(file.type==='video')msg.video=url;
        if(encTxt!==txt)msg.e2e=true;
        messages[activeConvId].push(msg);
        var conv=findConv(activeConvId);
        if(conv){conv.lastMsg=encTxt!==txt?'🔒 Mesaj':(file.type==='image'?'📷 '+(caption||file.name):(file.type==='video'?'🎬 '+(caption||file.name):'📎 '+file.name));conv.lastActivity=Date.now();conv.time=timeNow()}
        fbSendMessage(activeConvId,msg);
        processMedia(idx+1)
      }).catch(function(){
        var id=uid();
        if(!messages[activeConvId])messages[activeConvId]=[];
        var msg={id:id,type:'sent',senderId:fbUserId(),text:caption,time:timeNow(),edited:false,deleted:false,image:dataUrl};
        messages[activeConvId].push(msg);
        processMedia(idx+1)
      })
    }else{
      var id=uid();
      if(!messages[activeConvId])messages[activeConvId]=[];
      (async function(){
        var txt=file.type==='document'?'📎 '+file.name+(caption?' — '+caption:''):caption;
        var encTxt=await e2eMediaText(txt,activeConvId);
        var msg={id:id,type:'sent',senderId:fbUserId(),text:encTxt,time:timeNow(),edited:false,deleted:false};
        if(file.type==='image')msg.image=dataUrl;
        else if(file.type==='video')msg.video=dataUrl;
        if(encTxt!==txt)msg.e2e=true;
        messages[activeConvId].push(msg);
        var conv=findConv(activeConvId);
        if(conv){conv.lastMsg=encTxt!==txt?'🔒 Mesaj':(file.type==='image'?'📷 '+(caption||file.name):(file.type==='video'?'🎬 '+(caption||file.name):'📎 '+file.name));conv.lastActivity=Date.now();conv.time=timeNow()}
        fbSendMessage(activeConvId,msg);
        processMedia(idx+1)
      })()
    }
  })(0)
}

var profilePanelOpen=false;
function showProfilePanel(){if(!activeConvId)return;
  if(profilePanelOpen){closeProfilePanel();return}
  var conv=findConv(activeConvId);if(!conv)return;
  var body=$('profile-panel-body');profilePanelOpen=true;
  var avatarHtml='<div class="pp-avatar" style="background:'+conv.color+'">';
  if(conv.avatar&&conv.avatar.indexOf('data:')===0)avatarHtml+='<img src="'+conv.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+conv.color+'\';this.parentElement.textContent=\''+(conv.isGroup?'G':'?')+'\'">';
  else avatarHtml+='<span>'+(conv.isGroup?'G':(conv.avatar||'?'))+'</span>';
  avatarHtml+='</div>';
  body.innerHTML=avatarHtml+'<div class="pp-name">'+esc(conv.name)+'</div>';
  if(!conv.isGroup){
    body.innerHTML+='<div class="pp-uname">@'+esc((conv.name||'').toLowerCase().replace(/\s/g,''))+'</div>';
    if(conv.bio)body.innerHTML+='<div class="pp-bio">'+esc(conv.bio)+'</div>';
    body.innerHTML+='<div class="pp-row"><div><div class="pp-row-label">Durum</div><div class="pp-row-val" style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="sd-dot '+(conv.online?'sd-online':'')+'" style="display:inline-block"></span>'+(conv.online?'Çevrimiçi':'Çevrimdışı')+'</div></div></div>'
  }else{
    var isCreator=conv.creatorId===activeAccountId;
    var isAdmin=conv.adminIds&&conv.adminIds.indexOf(activeAccountId)!==-1;
    body.innerHTML+='<div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap">'+
      (isAdmin?'<button class="btn-primary" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer" onclick="editGroup(\''+conv.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Grubu Düzenle</button>':'')+
      (isCreator?'<button class="btn-primary" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer" onclick="pickGroupAvatar()"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> Fotoğraf</button>':'')+
      (isCreator?'<button class="btn-danger" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer" onclick="showDeleteGroupConfirm(\''+conv.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Grubu Sil</button>':'')+
    '</div>';
    body.innerHTML+='<div class="pp-bio" style="text-align:left;font-size:11px">'+memberCount(conv)+' üye</div>';
    for(var mi=0;mi<conv.members.length;mi++){(function(m){
      var mAv=m.avatar;var mAvHtml;if(mAv&&mAv.indexOf('data:')===0){mAvHtml='<img src="'+mAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+m.color+'\';this.parentElement.textContent=\'?\'">'}else{mAvHtml='<span>'+(mAv||'?')+'</span>'}
      body.innerHTML+='<div class="pp-row member-row" style="gap:10px;cursor:pointer" onclick="showMemberProfile(\''+m.id+'\',\''+conv.id+'\')" oncontextmenu="showMemberMenu(event,\''+m.id+'\',\''+conv.id+'\')"><div style="width:36px;height:36px;border-radius:50%;background:'+m.color+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">'+mAvHtml+'</div><div style="flex:1;min-width:0;text-align:left"><div style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(conv.adminIds&&conv.adminIds.indexOf(m.id)!==-1?'👑 ':'')+esc(m.name)+'</div><div style="font-size:10px;color:var(--text4)">'+(conv.adminIds&&conv.adminIds.indexOf(m.id)!==-1?'Yönetici':(conv.creatorId===m.id?'Kurucu':'Üye'))+'</div></div></div>'
    })(conv.members[mi])}
  }
  $('profile-panel').classList.add('open')
}
function closeProfilePanel(){$('profile-panel').classList.remove('open');profilePanelOpen=false;delete $('profile-panel-body').dataset.backConv}

function showMemberProfile(memberId,convId){
  if(!memberId){closeProfilePanel();showProfilePanel();return}
  for(var ci=0;ci<conversations.length;ci++){
    if(conversations[ci].id==memberId){
      var member=conversations[ci];
      var body=$('profile-panel-body');body.dataset.backConv=convId;
      var mAv=member.avatar;var mAvHtml;if(mAv&&mAv.indexOf('data:')===0){mAvHtml='<img src="'+mAv+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.style.background=\''+member.color+'\';this.parentElement.textContent=\'?\'">'}else{mAvHtml='<span>'+(mAv||'?')+'</span>'}
      body.innerHTML='<div class="pp-avatar" style="background:'+member.color+'">'+mAvHtml+'</div><div class="pp-name">'+esc(member.name)+'</div>'+
        '<div class="pp-uname">@'+esc((member.name||'').toLowerCase().replace(/\s/g,''))+'</div>'+
        (member.bio?'<div class="pp-bio">'+esc(member.bio)+'</div>':'')+
        '<div class="pp-row"><div><div class="pp-row-label">Durum</div><div class="pp-row-val" style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="sd-dot '+(member.online?'sd-online':'')+'" style="display:inline-block;flex-shrink:0"></span>'+(member.online?'Çevrimiçi':'Çevrimdışı')+'</div></div></div>'+
        '<div style="margin-top:16px"><button class="btn-back" style="padding:8px 20px;font-size:11px;border-radius:8px;display:inline-flex;align-items:center;gap:6px" onclick="showMemberProfile(null,\''+convId+'\')"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Geri</button></div>';
      return
    }
  }
}

function saveImage(dataUrl){
  var a=document.createElement('a');a.href=dataUrl;a.download='waxmes_image_'+Date.now()+'.png';
  document.body.appendChild(a);a.click();a.remove()
}
function copyImage(dataUrl){
  if(window.electronAPI&&electronAPI.copyImage){electronAPI.copyImage(dataUrl);return}
  var img=new Image();
  img.onload=function(){
    var canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    canvas.toBlob(function(blob){
      if(blob){try{navigator.clipboard.write([new ClipboardItem({'image/png':blob})]).catch(function(){})}catch(e){}}
    })
  };
  img.src=dataUrl
}

// ===== EMOJI PICKER =====
var emojiCats={
  face:['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬'],
  hand:['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','👀','👁','👅','👄'],
  heart:['❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💗','💖','💘','💝','💟','❣','💌','💋','💌','💑','👩‍❤️‍👨','👨‍❤️‍👨','👩‍❤️‍👩','💏','👩‍❤️‍💋‍👨'],
  object:['📱','💻','⌨','🖥','🖨','🖱','📷','📹','🎥','📽','📺','📻','🔦','🕯','💡','🔋','🪫','💻','⌚','📀','💿','📀','🎁','🎀','🪄','🎯','🎲','🎸','🎵','🎶','🎤','🎧','🎹','🎺','🎻','🥁','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶'],
  food:['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','☕','🍵','🫖','🥤','🧃','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊'],
  nature:['🌍','🌎','🌏','🌐','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛','🌜','☀','🌝','🌞','⭐','🌟','🌠','☁','⛅','🌈','🌤','🌥','🌦','🌧','🌨','🌩','🌪','🌫','🌬','☂','☔','⚡','❄','☃','⛄','🔥','💧','🌊','🌈','🌸','🌺','🌻','🌹','🌷','🌼','🌿','🍀','🍁','🍂','🍃','🌵','🌲','🌳','🌴','🌾','🌱','☘','🌿','🍄','🌻','🌞'],
  activity:['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋','🤼','🤸','🤺','⛹','🤾','🏌','🏇','🧘','🏄','🏊','🤽','🚣','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟','🎯','🎳','🎮','🕹']
};
var currentEmojiCat='face';

function switchEmojiCat(cat){
  currentEmojiCat=cat;
  document.querySelectorAll('.emoji-cat').forEach(function(c){c.style.background='transparent'});
  var el=document.querySelector('.emoji-cat[data-cat="'+cat+'"]');
  if(el)el.style.background='rgba(129,140,248,.1)';
  renderEmojis()
}

function renderEmojis(){
  var list=$('emoji-list');if(!list)return;
  list.innerHTML='';
  var emojis=emojiCats[currentEmojiCat]||[];
  emojis.forEach(function(e){
    var d=document.createElement('span');
    d.textContent=e;
    d.style.cssText='cursor:pointer;font-size:24px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .15s';
    d.onmouseover=function(){this.style.background='var(--hover)'};
    d.onmouseout=function(){this.style.background='transparent'};
    d.onclick=function(){
      var inp=$('chat-input');
      if(inp){var start=inp.selectionStart||0,val=inp.value;inp.value=val.slice(0,start)+this.textContent+val.slice(start);inp.focus();inp.selectionStart=inp.selectionEnd=start+this.textContent.length}
      toggleEmojiPicker()
    };
    list.appendChild(d)
  })
}
var emojiPickerVisible=false;
function toggleEmojiPicker(){
  var p=$('emoji-picker');if(!p)return;
  emojiPickerVisible=!emojiPickerVisible;
  if(emojiPickerVisible){
    requestAnimationFrame(function(){
      p.style.display='block';
      p.classList.add('emoji-open');
      renderEmojis()
    })
  }else{p.style.display='none';p.classList.remove('emoji-open')}
}
// Close emoji picker on click outside
document.addEventListener('click',function(e){
  var ep=$('emoji-picker');if(!ep)return;
  if(!ep.contains(e.target)&&e.target!==$('emoji-btn')){ep.style.display='none';emojiPickerVisible=false}
});

// ===== REPLY TO MESSAGE =====
var replyToMsgId=null,replyToMsgText='';
function setReply(msgId){
  var convId=activeConvId;
  var msgs=messages[convId]||[];
  for(var ri=0;ri<msgs.length;ri++){
    if(msgs[ri].id===msgId){
      replyToMsgId=msgId;
      var rt=msgs[ri]._decrypted||msgs[ri].text;
      replyToMsgText=rt&&rt.indexOf('🔒')===0?'🔒 [Şifreli]':(rt||(msgs[ri].image?'📷 Fotoğraf':(msgs[ri].video?'🎬 Video':(msgs[ri].audio?'🎤 Ses':''))));
      updateReplyBar();
      break
    }
  }
}
function cancelReply(){replyToMsgId=null;replyToMsgText='';updateReplyBar()}
function updateReplyBar(){
  var bar=$('reply-bar');
  if(!bar)return;
  if(replyToMsgId){
    bar.style.display='flex';
    $('reply-text').textContent='⤴ '+replyToMsgText
  }else{bar.style.display='none'}
}

// ===== SEARCH =====
function openSearch(){
  $('search-input').value='';
  $('search-results').innerHTML='<div style="text-align:center;padding:20px;color:var(--text4)">Mesajlarda aramak için yaz...</div>';
  $('modal-search').classList.add('active')
}
function searchMessages(q){
  var results=$('search-results');q=q.toLowerCase();
  if(!q||!activeConvId||!messages[activeConvId]){results.innerHTML='<div style="text-align:center;padding:20px;color:var(--text4)">Sonuç yok</div>';return}
  var found=[];
  for(var si=0;si<messages[activeConvId].length;si++){
    var m=messages[activeConvId][si];
    if(m.text&&m.text.toLowerCase().indexOf(q)!==-1&&!m.deleted)found.push(m)
  }
  if(found.length===0){results.innerHTML='<div style="text-align:center;padding:20px;color:var(--text4)">Sonuç bulunamadı</div>';return}
  results.innerHTML='<div style="font-size:11px;color:var(--text4);margin-bottom:6px">'+found.length+' sonuç</div>';
  found.forEach(function(m){
    var d=document.createElement('div');
    d.style.cssText='padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;font-size:12px;color:var(--text3);margin-bottom:2px';
    d.onmouseover=function(){this.style.background='var(--hover)'};
    d.onmouseout=function(){this.style.background='transparent'};
    d.onclick=function(){
      $('modal-search').classList.remove('active');
      // Navigate to the conversation
      if(activeConvId){
        var targetConvId=activeConvId;
        selectConversation(targetConvId);
        // Wait for render, then scroll and highlight
        setTimeout(function(){
          var msgEl=$('msg-'+m.id);
          if(msgEl){
            msgEl.scrollIntoView({block:'center',behavior:'smooth'});
            msgEl.style.transition='box-shadow .5s, outline .5s';
            msgEl.style.outline='2px solid var(--accent)';
            msgEl.style.outlineOffset='2px';
            setTimeout(function(){
              if(msgEl){msgEl.style.outline='';msgEl.style.outlineOffset=''}
            },2000)
          }
        },100)
      }
    };
    // Highlight search term
    var idx=m.text.toLowerCase().indexOf(q);
    if(idx>-1){
      var before=m.text.slice(0,idx);
      var match=m.text.slice(idx,idx+q.length);
      var after=m.text.slice(idx+q.length);
      d.innerHTML=esc(before)+'<b style="color:var(--accent)">'+esc(match)+'</b>'+esc(after)
    }else{d.textContent=m.text}
    results.appendChild(d)
  })
}

// ===== NOTIFICATIONS =====
function requestNotify(){Notification.requestPermission()}
function showNotification(title,body,convId){
  if(!ls('notifications')&&ls('notifications')!==false){ls('notifications',true)}
  if(ls('notifications')===false)return;
  if(currentStatus==='dnd')return;
  if(convId&&isMuted(convId))return;
  if(convId&&isArchived(convId))return;
  if(window.electronAPI&&electronAPI.notify){electronAPI.notify(title,body)}
  playNotifySound()
}
function playNotifySound(){
  try{
    var ctx=new (window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();
    var gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=800;
    gain.gain.setValueAtTime(0.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+0.15)
  }catch(e){}
}
// Request permission on load
if(typeof Notification!=='undefined'&&Notification.permission==='default'){Notification.requestPermission()}

// ===== TYPING INDICATOR =====
var typingTimer=null;
var _typingRemoteUnsub=null;
var _typingLocalUid=null;
function startTyping(){
  if(!activeConvId||!window.db||!fbUserId())return;
  var h=$('chat-header-status');
  if(!h)return;
  db.collection('conversations').doc(activeConvId).update({typing:fbUserId(),typingAt:Date.now()}).catch(function(){});
  if(typingTimer)clearTimeout(typingTimer);
  typingTimer=setTimeout(stopTyping,2500)
}
function stopTyping(){
  if(!activeConvId||!window.db||!fbUserId())return;
  db.collection('conversations').doc(activeConvId).update({typing:firebase.firestore.FieldValue.delete(),typingAt:firebase.firestore.FieldValue.delete()}).catch(function(){});
  if(typingTimer){clearTimeout(typingTimer);typingTimer=null}
}
function fbListenTyping(convId,otherUserId){
  if(_typingRemoteUnsub){_typingRemoteUnsub()}
  if(!window.db||!convId||!otherUserId)return;
  _typingLocalUid=otherUserId;
  _typingRemoteUnsub=db.collection('conversations').doc(convId).onSnapshot(function(doc){
    if(!doc.exists)return;
    var d=doc.data();
    var h=$('chat-header-status');
    var conv=findConv(convId);
    if(!h||!conv)return;
    if(d.typing&&d.typing===otherUserId&&d.typing!==fbUserId()&&d.typingAt&&Date.now()-d.typingAt<5000){
      h.textContent='Yazıyor...';
    }else{
      h.textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv)
    }
  },function(){})
}
function fbUnlistenTyping(){
  if(_typingRemoteUnsub){_typingRemoteUnsub();_typingRemoteUnsub=null}
  _typingLocalUid=null;
}
document.addEventListener('input',function(e){
  if(e.target&&e.target.id==='chat-input')startTyping()
});

// ===== READ RECEIPTS =====
// Mark messages as read when they're rendered
// renderMessages already handles this - read receipts shown as ✓✓
// Enhanced in renderMessages with read status

// ===== EMOJI REACTIONS =====
// ===== PINNED MESSAGES =====
function togglePinMessage(msgId){
  var convId=activeConvId;if(!convId)return;
  var pinned=ls('pinnedMsg_'+convId)||[];
  var idx=pinned.indexOf(msgId);
  var msgs=messages[convId]||[],msgText='';
  for(var pi=0;pi<msgs.length;pi++){if(msgs[pi].id===msgId){msgText=msgs[pi].text||(msgs[pi].image?'Fotoğraf':(msgs[pi].video?'Video':(msgs[pi].audio?'Ses':'Mesaj')));break}}
  var label=msgText.substring(0,50);
  if(idx>-1){
    pinned.splice(idx,1);
    addGroupLog(convId,'📌 "'+label+'" mesajının sabitlemesi kaldırıldı')
  }else{
    pinned.push(msgId);
    addGroupLog(convId,'📌 "'+label+'" mesajı sabitlendi')
  }
  ls('pinnedMsg_'+convId,pinned);
  if(activeConvId===convId)renderMessages(convId)
}
function isMsgPinned(msgId){
  if(!activeConvId)return false;
  var pinned=ls('pinnedMsg_'+activeConvId)||[];
  return pinned.indexOf(msgId)>-1
}
function showPinnedMessages(event){
  if(event)event.stopPropagation();
  if(!activeConvId)return;
  var list=$('pinned-msg-list');if(!list)return;
  var pinned=ls('pinnedMsg_'+activeConvId)||[];
  var msgs=messages[activeConvId]||[];
  var found=msgs.filter(function(m){return pinned.indexOf(m.id)>-1&&!m.deleted});
  if(found.length===0){
    list.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4)">📌 Sabitlenmiş mesaj yok.</div>'
  }else{
    list.innerHTML='<div style="font-size:11px;color:var(--text4);margin-bottom:8px">'+found.length+' mesaj</div>';
    found.forEach(function(m){
      var content='';
      if(m.text)content=esc(m.text).substring(0,120);
      else if(m.audio)content='🎤 '+Math.floor((m.duration||0)/60)+':'+((m.duration||0)%60<10?'0':'')+((m.duration||0)%60);
      else if(m.video)content='🎬 Video';
      else if(m.image)content='📷 Fotoğraf';
      else content='Mesaj';
      var hasMedia=m.image||m.video;
      var d=document.createElement('div');
      d.style.cssText='padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;margin-bottom:4px;border-left:2px solid var(--accent);display:flex;align-items:center;gap:8px';
      d.onmouseover=function(){this.style.background='var(--hover)'};
      d.onmouseout=function(){this.style.background='transparent'};
      var mediaHtml='';
      if(m.image)mediaHtml='<img src="'+m.image+'" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0">';
      else if(m.video)mediaHtml='<div style="width:36px;height:36px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">🎬</div>';
      else if(m.audio)mediaHtml='<div style="width:36px;height:36px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">🎤</div>';
      d.innerHTML=mediaHtml+'<span style="flex:1;font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+content+'</span><span style="font-size:10px;color:var(--text4)">'+esc(m.time)+'</span><button onclick="event.stopPropagation();togglePinMessage(\''+m.id+'\');showPinnedMessages()" style="padding:3px 8px;border:none;border-radius:5px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-size:10px;flex-shrink:0">Kaldır</button>';
      d.onclick=function(){
        $('modal-pinned').classList.remove('active');
        selectConversation(activeConvId);
        setTimeout(function(){
          var msgEl=$('msg-'+m.id);
          if(msgEl){
            msgEl.scrollIntoView({block:'center',behavior:'smooth'});
            msgEl.style.transition='outline .5s';
            msgEl.style.outline='2px solid var(--accent)';
            msgEl.style.outlineOffset='2px';
            setTimeout(function(){if(msgEl)msgEl.style.outline='none'},1500)
          }
        },300)
      };
      list.appendChild(d)
    })
  }
  $('modal-pinned').classList.add('active')
}

function showMediaGallery(){
  if(!activeConvId)return;
  var grid=$('gallery-grid');if(!grid)return;
  var msgs=messages[activeConvId]||[];
  var media=msgs.filter(function(m){return !m.deleted&&(m.image||m.video)});
  if(media.length===0){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text4)">📷 Medya bulunamadı.</div>'
  }else{
    grid.innerHTML='';
    media.forEach(function(m){
      var div=document.createElement('div');
      div.style.cssText='aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;background:var(--bg3);position:relative;transition:transform .15s';
      div.onmouseover=function(){this.style.transform='scale(1.05)'};
      div.onmouseout=function(){this.style.transform='scale(1)'};
      if(m.image){
        div.innerHTML='<img src="'+m.image+'" style="width:100%;height:100%;object-fit:cover">'
      }else if(m.video){
        div.innerHTML='<video src="'+m.video+'" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'
      }
      div.onclick=function(){
        if(m.image)showImage(m.image);
        else if(m.video)showVideoPreview(m.video)
      };
      div.oncontextmenu=function(e){
        e.preventDefault();
        var items=[];
        if(m.image){
          items.push({label:'Resmi Kaydet',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',action:function(){saveImage(m.image)}});
          items.push({label:'Resmi Kopyala',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',action:function(){copyImage(m.image)}})
        }else{
          items.push({label:'Videoyu İndir',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',action:function(){var a=document.createElement('a');a.href=m.video;a.download='waxmes_video_'+Date.now()+'.mp4';document.body.appendChild(a);a.click();a.remove()}})
        }
        items.push({sep:true});
        items.push({label:'Mesaja Git',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',action:function(){
          $('modal-gallery').classList.remove('active');
          selectConversation(activeConvId);
          setTimeout(function(){
            var targetId=m.id;
            // If in a collage group, find the first image in same consecutive group
            if(activeConvId&&messages[activeConvId]){
              var msgs=messages[activeConvId];
              for(var ci=0;ci<msgs.length;ci++){
                if(msgs[ci].id===m.id){
                  // Walk backwards to find first image in this consecutive group
                  var firstIdx=ci;
                  while(firstIdx>0&&msgs[firstIdx-1].image&&!msgs[firstIdx-1].text&&!msgs[firstIdx-1].deleted)firstIdx--;
                  targetId=msgs[firstIdx].id;
                  break
                }
              }
            }
            var msgEl=$('msg-'+targetId)||$('collage-'+targetId);
            if(msgEl){
              msgEl.scrollIntoView({block:'center',behavior:'smooth'});
              msgEl.style.transition='outline .5s';
              msgEl.style.outline='2px solid var(--accent)';
              msgEl.style.outlineOffset='2px';
              setTimeout(function(){if(msgEl)msgEl.style.outline='none'},1500)
            }
          },300)
        }});
        showContextMenu(e.clientX,e.clientY,items)
      };
      grid.appendChild(div)
    })
  }
  $('modal-gallery').classList.add('active')
}

function showVideoPreview(src){
  var ov=document.getElementById('video-overlay');
  if(ov){document.body.removeChild(ov)}
  ov=document.createElement('div');ov.id='video-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center';
  ov.onclick=function(e){if(e.target===ov){document.body.removeChild(ov)}};
  ov.innerHTML='<video src="'+src+'" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:12px"></video>';
  document.body.appendChild(ov)
}

function addReaction(msgId,emoji){
  var convId=activeConvId;
  var msgs=messages[convId]||[];
  for(var ri=0;ri<msgs.length;ri++){
    if(msgs[ri].id===msgId){
      if(!msgs[ri].reactions)msgs[ri].reactions=[];
      msgs[ri].reactions.push(emoji);
      renderMessages(convId);saveMessages();
      break
    }
  }
}

function copyMessageText(msgId){
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId]||[];
  for(var cmi=0;cmi<msgs.length;cmi++){if(msgs[cmi].id===msgId){
    var txt=msgs[cmi]._decrypted||msgs[cmi].text||(msgs[cmi].image?'📷 Fotoğraf':(msgs[cmi].video?'🎬 Video':(msgs[cmi].audio?'🎤 Ses':'')));
    if(txt&&txt.indexOf('🔒')===0)txt='🔒 [Şifreli mesaj]';
    if(txt){
      try{navigator.clipboard.writeText(txt).catch(function(){
        var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.left='-9999px';
        document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)
      })}catch(e){console.error(e)}
    }
    break
  }}
}

function editLastMessage(){
  if(!activeConvId||!messages[activeConvId])return;
  for(var eli=messages[activeConvId].length-1;eli>=0;eli--){
    if(messages[activeConvId][eli].type==='sent'&&!messages[activeConvId][eli].deleted){
      editMessage(messages[activeConvId][eli].id);return
    }
  }
}

var pendingDeleteMsgId=null, pendingSelfDeleteId=null, pendingCollageDelete=null, pendingAlert=false;

function confirmCollageDelete(){
  var imgs=pendingCollageDelete;pendingCollageDelete=null;
  hideDeleteModal();
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  if(!imgs||!activeConvId)return;
  // Keep only the first image marked as deleted (shows one "Bu mesaj silindi"), remove the rest
  var firstId=imgs[0].id;
  var kept=[];
  for(var di=0;di<messages[activeConvId].length;di++){
    var m=messages[activeConvId][di];
    var match=false;
    for(var dj=0;dj<imgs.length;dj++){
      if(m.id===imgs[dj].id){match=true;break}
    }
    if(match&&m.id===firstId){m.deleted=true;m.deletedByMe=false;m.image=null;m.text='';kept.push(m)}
    else if(!match){kept.push(m)}
    // else: skip other images in the collage
  }
  messages[activeConvId]=kept;
  updateConvPreview(activeConvId);
  renderMessages(activeConvId);renderConversations();saveMessages()
}

function editMessage(msgId){
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId],msg=null;
  for(var ei=0;ei<msgs.length;ei++){if(msgs[ei].id===msgId){msg=msgs[ei];break}}
  if(!msg||msg.type!=='sent'||msg.deleted)return;
  var el=$('msg-'+msgId);if(!el)return;
  var oldT=msg._decrypted||msg.text||'';
  if(oldT.indexOf('🔒')===0)oldT='';
  el.innerHTML='<textarea class="edit-input" id="ei-'+msgId+'" rows="3" style="resize:none">'+esc(oldT)+'</textarea><div class="edit-actions"><button class="edit-save" onclick="saveEdit(\''+msgId+'\')">Kaydet</button><button class="edit-cancel" onclick="cancelEdit(\''+msgId+'\')">İptal</button></div>';
  var inp=document.getElementById('ei-'+msgId);
  if(inp){inp.focus();inp.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit(msgId)}else if(e.key==='Escape')cancelEdit(msgId)}}
}
async function saveEdit(msgId){
  var inp=document.getElementById('ei-'+msgId);if(!inp)return;
  var t=inp.value.trim();if(!t)return;
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId];
  for(var si=0;si<msgs.length;si++){if(msgs[si].id===msgId){
    if(msgs[si].text===t){renderMessages(convId);return}
    // Re-encrypt if original was E2E
    var newTxt=t;
    if(msgs[si].e2e||(msgs[si].text&&msgs[si].text.indexOf('🔒')===0)){var conv=findConv(convId);if(conv&&e2eReady&&window.db){var pubKeys=await getRecipientPubKey(convId);if(pubKeys&&(Array.isArray(pubKeys)?pubKeys.length:1)){try{var enc=await e2eEncrypt(t,pubKeys);if(enc&&enc.indexOf('🔒')===0)newTxt=enc}catch(e){}}}}
    msgs[si].text=newTxt;msgs[si].edited=true;msgs[si].editedTime=timeNow();msgs[si]._decrypted=null;break
  }}
  renderMessages(convId);saveMessages()
}
function cancelEdit(msgId){renderMessages(activeConvId)}

function deleteMessage(msgId){
  pendingDeleteMsgId=msgId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  $('modal-delete').classList.add('active')
}

function selfDeleteMessage(msgId){
  pendingSelfDeleteId=msgId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj sadece senin tarafında silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmSelfDelete()};
  $('modal-delete').classList.add('active')
}
function confirmSelfDelete(){
  var msgId=pendingSelfDeleteId;pendingSelfDeleteId=null;
  hideDeleteModal();if(!msgId)return;
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId];
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msgs[i].deleted=true;msgs[i].deletedByMe=true;break}}
  updateConvPreview(convId);
  renderMessages(convId);renderConversations();saveMessages()
}

function hideDeleteModal(){
  pendingDeleteMsgId=null;pendingRemoveMember=null;pendingRemoveGroup=null;pendingCollageDelete=null;pendingClearConvId=null;pendingAlert=false;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  $('modal-delete').classList.remove('active')
}
function confirmDelete(){
  var msgId=pendingDeleteMsgId;pendingDeleteMsgId=null;
  hideDeleteModal();if(!msgId)return;
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId];
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msgs[i].deleted=true;msgs[i].text='';break}}
  // Update sidebar with last non-deleted message
  updateConvPreview(convId);
  renderMessages(convId);renderConversations();saveMessages()
}

function updateConvPreview(convId){
  var conv=findConv(convId);if(!conv)return;
  if(!messages[convId]||messages[convId].length===0){conv.lastMsg='Sohbet temizlendi';conv.time='';return}
  var last=messages[convId][messages[convId].length-1];
  if(last.deleted){
    conv.lastMsg=last.deletedByMe?'Bu mesajı sildiniz':'Bu mesaj silindi';
    conv.time=last.time
  }else{
    var ltxt=last._decrypted||last.text||'';
    if(ltxt.indexOf('🔒')===0)ltxt='🔒 Mesaj';
    else if(last.image)ltxt='📷 Fotoğraf';
    else if(last.video)ltxt='🎬 Video';
    else if(last.audio)ltxt='🎤 Ses';
    conv.lastMsg=ltxt;
    conv.time=last.time
  }
}

var pendingDeleteGroupId=null;
function showDeleteGroupConfirm(convId){
  pendingDeleteGroupId=convId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Grubu Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Grup kalıcı olarak silinsin mi? Bu işlem geri alınamaz.</p>';
  $('delete-confirm-btn').textContent='Grubu Sil';
  $('delete-confirm-btn').onclick=function(){confirmDeleteGroup()};
  $('modal-delete').classList.add('active')
}
function confirmDeleteGroup(){
  var cid=pendingDeleteGroupId;pendingDeleteGroupId=null;
  hideDeleteModal();if(!cid)return;
  deleteGroup(cid)
}

function showMemberMenu(e,memberId,convId){
  e.preventDefault();
  showMemberContextMenu(e.clientX,e.clientY,memberId,convId)
}

function showMemberContextMenu(x,y,memberId,convId){
  var conv=findConv(convId);if(!conv||!conv.isGroup)return;
  if(!conv.adminIds)conv.adminIds=[];
  var isCreator=conv.creatorId===activeAccountId;
  var isAdmin=conv.adminIds.indexOf(activeAccountId)!==-1;
  var isSelf=memberId===activeAccountId;
  var items=[];
  // Creator can promote/demote admins AND member management
  if(isCreator&&!isSelf){
    items.push({label:'Gruptan Çıkar',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>',action:function(){removeFromGroup(memberId,convId)}});
    var memIsAdmin=conv.adminIds.indexOf(memberId)!==-1;
    if(memberId!==conv.creatorId)items.push({label:memIsAdmin?'Yöneticiliği Kaldır':'Yönetici Yap',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',action:function(){toggleAdmin(memberId,convId)}})
  }
  // Admin can remove members but not promote/demote
  if(isAdmin&&!isCreator&&!isSelf){
    items.push({label:'Gruptan Çıkar',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>',action:function(){removeFromGroup(memberId,convId)}})
  }
  if(isSelf){
    items.push({label:'Gruptan Ayrıl',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',action:function(){leaveGroup(convId)}})
  }
  if(items.length>0)showContextMenu(x,y,items)
}

function toggleAdmin(memberId,convId){
  for(var tai=0;tai<conversations.length;tai++){
    if(conversations[tai].id==convId&&conversations[tai].isGroup){
      var g=conversations[tai];
      if(!g.adminIds)g.adminIds=[];
      var idx=g.adminIds.indexOf(memberId);
      var memberName='';
      for(var tmi=0;tmi<g.members.length;tmi++){if(g.members[tmi].id==memberId){memberName=g.members[tmi].name;break}}
      if(idx>-1){g.adminIds.splice(idx,1);addGroupLog(convId,memberName+' yöneticilikten alındı')}
      else{g.adminIds.push(memberId);addGroupLog(convId,'👑 '+memberName+' yönetici yapıldı')}
      var gs=getGroups();
      for(var tgi=0;tgi<gs.length;tgi++){if(gs[tgi].id==convId){gs[tgi].adminIds=g.adminIds;saveGroups(gs);break}}
      fbSyncMembers(convId);
      renderMessages(convId);
      if(profilePanelOpen)showProfilePanel();
      return
    }
  }
}

var pendingRemoveMember=null,pendingRemoveGroup=null;
function removeFromGroup(memberId,convId){
  pendingRemoveMember=memberId;pendingRemoveGroup=convId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Gruptan Çıkar</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu kişi gruptan çıkarılsın mı?</p>';
  $('delete-confirm-btn').textContent='Çıkar';
  $('delete-confirm-btn').onclick=function(){removeFromGroupConfirm()};
  $('modal-delete').classList.add('active')
}
function addGroupLog(convId,text){
  if(!messages[convId])messages[convId]=[];
  messages[convId].push({id:uid(),type:'log',text:text,time:timeNow()});
  var conv=findConv(convId);
  if(conv){conv.lastMsg=text;conv.lastActivity=Date.now();conv.time=timeNow()}
  saveMessages();
  if(activeConvId===convId)renderMessages(convId);
  renderConversations()
}

function removeFromGroupConfirm(){
  var memberId=pendingRemoveMember,convId=pendingRemoveGroup;
  pendingRemoveMember=null;pendingRemoveGroup=null;
  hideDeleteModal();
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  if(!memberId||!convId)return;
  // Find member name
  var memberName='';
  for(var ci=0;ci<conversations.length;ci++){if(conversations[ci].id==memberId){memberName=conversations[ci].name;break}}
  if(!memberName){for(var mi=0;mi<conversations.length;mi++){if(conversations[mi].isGroup&&conversations[mi].id==convId){var gm=conversations[mi].members;for(var mm=0;mm<gm.length;mm++){if(gm[mm].id==memberId){memberName=gm[mm].name;break}}}if(memberName)break}}
  
  for(var gi=0;gi<conversations.length;gi++){
    if(conversations[gi].id==convId&&conversations[gi].isGroup){
      var g=conversations[gi];
      for(var mi=0;mi<g.members.length;mi++){
        if(g.members[mi].id==memberId){
          var removedName=g.members[mi].name;
          g.members.splice(mi,1);break
        }
      }
      if(g.adminIds){var ai=g.adminIds.indexOf(memberId);if(ai>-1)g.adminIds.splice(ai,1)}
      g.memberIds=getGroupMemberIds(g);
      var gs=getGroups();
      for(var i=0;i<gs.length;i++){if(gs[i].id==convId){gs[i].members=g.members;gs[i].memberIds=g.memberIds;gs[i].adminIds=g.adminIds;saveGroups(gs);break}}
      // Add group log
      addGroupLog(convId,removedName+' gruptan çıkarıldı');
      fbSyncMembers(convId);
      renderMessages(convId);
      // Update chat header member count
      var hs=$('chat-header-status');
      if(hs&&activeConvId==convId)hs.textContent=memberCount(g)+' üye';
      // Re-render profile panel without closing/reopening
      if(profilePanelOpen){profilePanelOpen=false;showProfilePanel()}
    }
  }
}

// ===== VOICE RECORDER =====
var mediaRecorder=null,audioChunks=[],voiceTimer=null,voiceStart=0;
var audioCtx=null,analyser=null,sourceNode=null,animFrame=null;
function startVoice(){
  if(!activeConvId)return;
  if(mediaRecorder&&mediaRecorder.state==='recording'){stopVoice();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Ses kaydı desteklenmiyor.');return}
  try{navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    audioChunks=[];voiceStart=Date.now();
    try{mediaRecorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'})}catch(e){mediaRecorder=new MediaRecorder(stream)}
    mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data)};
    mediaRecorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop()})};
    mediaRecorder.start(100);
    
    // Audio analysis for waveform
    try{
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      sourceNode=audioCtx.createMediaStreamSource(stream);
      analyser=audioCtx.createAnalyser();analyser.fftSize=64;
      sourceNode.connect(analyser);
      var dataArray=new Uint8Array(analyser.frequencyBinCount);
      var wave=$('vr-wave');
      function drawWave(){
        if(!analyser)return;
        analyser.getByteFrequencyData(dataArray);
        wave.innerHTML='';
        for(var i=0;i<20;i++){
          var idx=Math.floor(i*dataArray.length/20);
          var val=dataArray[idx]/255;
          var h=4+val*24;
          var bar=document.createElement('div');bar.className='vr-bar';bar.style.height=h+'px';
          wave.appendChild(bar)
        }
        animFrame=requestAnimationFrame(drawWave)
      }
      drawWave()
    }catch(e){}
    
    $('chat-input').style.display='none';$('chat-send').style.display='none';$('voice-btn').style.display='none';
    $('voice-recorder').style.display='flex';
    if(voiceTimer)clearInterval(voiceTimer);
    voiceTimer=setInterval(function(){
      var elapsed=Math.floor((Date.now()-voiceStart)/1000);
      var m=Math.floor(elapsed/60),s=elapsed%60;
      $('vr-time').textContent=m+':'+(s<10?'0':'')+s
    },200)
  }).catch(function(){alert('Mikrofon erişimi reddedildi.')})}catch(e){alert('Ses kaydı başlatılamadı.')}
}

function stopVoice(){
  if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop()}
  if(voiceTimer){clearInterval(voiceTimer);voiceTimer=null}
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null}
  if(audioCtx){audioCtx.close();audioCtx=null;analyser=null}
}

function cancelVoice(){
  stopVoice();audioChunks=[];
  $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display=''
}

function sendVoice(){
  stopVoice();
  if(audioChunks.length===0){cancelVoice();return}
  var dur=Math.floor((Date.now()-voiceStart)/1000);
  var blob=new Blob(audioChunks,{type:'audio/webm'});
  var reader=new FileReader();
  reader.onloadend=function(){
    var dataUrl=reader.result;
    var id=uid();
    if(!messages[activeConvId])messages[activeConvId]=[];
    var msg={id:id,type:'sent',senderId:fbUserId(),text:'',time:timeNow(),edited:false,deleted:false,audio:dataUrl,duration:dur};
    messages[activeConvId].push(msg);
    renderMessages(activeConvId);
    var conv=findConv(activeConvId);
    if(conv){conv.lastMsg='🎤 Sesli mesaj';conv.lastActivity=Date.now();conv.time=timeNow();renderConversations()}
    saveMessages();
    // Upload to Firebase Storage and sync via Firestore
    if(window.storage&&dataUrl&&dataUrl.indexOf('data:')===0){
      var path='voice/'+activeConvId+'/'+Date.now()+'_'+id+'.webm';
      fbUploadFile(dataUrl,path).then(function(url){
        msg.audio=url;fbSendMessage(activeConvId,msg);saveMessages()
      }).catch(function(){})
    }else{fbSendMessage(activeConvId,msg)}
    $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display='';
  };
  reader.readAsDataURL(blob)
}

// ===== AUDIO PLAYBACK =====
var currentAudio=null,currentAudioId=null,audioProgressTimer=null,seekCache={};
function playAudio(msgId){
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId]||[],msg=null;
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msg=msgs[i];break}}
  if(!msg||!msg.audio)return;
  
  // Pause if already playing this message
  if(currentAudioId===msgId&&currentAudio&&!currentAudio.paused){
    currentAudio.pause();
    if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}
    updateAudioUI(msgId,'paused');
    return
  }
  
  // Resume if paused same message
  if(currentAudioId===msgId&&currentAudio&&currentAudio.paused){
    currentAudio.play().catch(function(){});
    updateAudioUI(msgId,'playing');
    startAudioProgress(msgId,msg);
    return
  }
  
  // Start new audio
  if(currentAudio){currentAudio.pause();currentAudio=null}
  if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}
  
  var audio=new Audio(msg.audio);
  currentAudio=audio;currentAudioId=msgId;
  
  // Handle seeking before play
  var hasSeek=seekCache[msgId]!==undefined&&seekCache[msgId]<0.98;
  var seekPct=hasSeek?Math.min(1,Math.max(0,seekCache[msgId])):0;
  if(hasSeek){delete seekCache[msgId]}
  
  updateAudioUI(msgId,'playing');
  
  audio.addEventListener('canplay',function(){
    if(hasSeek)audio.currentTime=seekPct*audio.duration;
    audio.play().catch(function(){});
    startAudioProgress(msgId,msg)
  },{once:true});
  
  audio.onended=function(){if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}updateAudioUI(msgId,'ended');currentAudio=null;currentAudioId=null}
}

function startAudioProgress(msgId,msg){
  if(audioProgressTimer){clearInterval(audioProgressTimer)}
  audioProgressTimer=setInterval(function(){
    if(!currentAudio||currentAudio.paused){
      if(currentAudio&&currentAudio.ended){clearInterval(audioProgressTimer);audioProgressTimer=null;updateAudioUI(msgId,'ended');currentAudio=null;currentAudioId=null}
      return
    }
    var pct=currentAudio.currentTime/currentAudio.duration;
    var el=$('msg-'+msgId);
    if(el){
      var prog=el.querySelector('.ma-progress');if(prog)prog.style.width=(pct*100)+'%';
      var durEl=el.querySelector('.ma-dur');if(durEl){
        var ct=Math.floor(currentAudio.currentTime),dt=Math.floor(msg.duration||currentAudio.duration);
        var cm=Math.floor(ct/60),cs=ct%60,dm=Math.floor(dt/60),ds=dt%60;
        durEl.textContent=cm+':'+(cs<10?'0':'')+cs+' / '+dm+':'+(ds<10?'0':'')+ds
      }
    }
  },100)
}

function seekAudio(e,msgId){
  var bar=e.currentTarget;
  var rect=bar.getBoundingClientRect();
  var pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  
  // Save seek position for later playback
  seekCache[msgId]=pct;
  
  // Update visual progress bar immediately
  var prog=bar.querySelector('.ma-progress');
  if(prog)prog.style.width=(pct*100)+'%';
  
  // Update duration display
  var msg=null;
  if(activeConvId&&messages[activeConvId]){
    for(var si=0;si<messages[activeConvId].length;si++){
      if(messages[activeConvId][si].id===msgId){msg=messages[activeConvId][si];break}
    }
  }
  var durEl=bar.parentNode?bar.parentNode.querySelector('.ma-dur'):null;
  if(msg&&msg.audio&&msg.duration&&durEl){
    var total=msg.duration,current=Math.round(pct*total);
    var cm=Math.floor(current/60),cs=current%60,dm=Math.floor(total/60),ds=total%60;
    durEl.textContent=cm+':'+(cs<10?'0':'')+cs+' / '+dm+':'+(ds<10?'0':'')+ds
  }
  
  // Seek audio if playing
  if(currentAudioId===msgId&&currentAudio){
    currentAudio.currentTime=pct*currentAudio.duration
  }
}

function updateAudioUI(msgId,state){
  var el=$('msg-'+msgId);if(!el)return;
  var btn=el.querySelector('.ma-play');
  if(btn){
    if(state==='playing')btn.innerHTML='<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    else btn.innerHTML='<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  }
  var wave=el.querySelector('.ma-wave');
  if(wave){
    if(state==='playing')wave.style.opacity='1';
    else wave.style.opacity='.5'
  }
}

// ===== RENDER MESSAGE EXTENSIONS =====
// Patch renderMessages to handle audio/video
renderMessages=function(convId){
  var el=$('chat-messages');if(!el)return;var raw=messages[convId]||[];el.innerHTML='';
  var conv=findConv(convId);var isGroupChat=conv&&conv.isGroup;
  // Decrypt E2E messages
  for(var di=0;di<raw.length;di++){if(raw[di].text&&raw[di].text.indexOf('🔒')===0&&!raw[di]._decrypted&&!raw[di]._decrypting){raw[di]._decrypting=true;(function(m){e2eDecrypt(m.text).then(function(d){if(d){m._decrypted=d;m._decrypting=false}else{m._decrypting=false;m._decrypted='🔒 [Çözülemedi]'}if(activeConvId===convId)renderMessages(convId)}).catch(function(){m._decrypting=false;m._decrypted='🔒 [Çözülemedi]';if(activeConvId===convId)renderMessages(convId)})})(raw[di])}}
  
  // Group consecutive image-only messages into collage groups
  var groups=[];var ci=0;
  while(ci<raw.length){
    var msg=raw[ci];
    // Check if this is an image-only message (image, no text/video/audio, not deleted)
    if(msg.image&&!msg.text&&!msg.video&&!msg.audio&&!msg.deleted){
      var images=[];
      while(ci<raw.length&&raw[ci].image&&!raw[ci].text&&!raw[ci].video&&!raw[ci].audio&&!raw[ci].deleted){
        images.push(raw[ci]);ci++
      }
      // Create a collage message (carry forward comment from first image)
      var fwdComment=images[0].forwardComment||'';
      groups.push({type:'collage',id:'collage-'+images[0].id,time:images[0].time,time2:images[images.length-1].time,images:images,forwardComment:fwdComment,isForwarded:images[0].isForwarded})
    }else{
      groups.push({type:'single',msg:msg});ci++
    }
  }
  
  function addMsgActions(div,m){
    div.dataset.msgId=m.id;
    div.dataset.msgType=m.type;
    if(m.image)div.dataset.msgImg=m.image;
    if(m.video)div.dataset.msgVid=m.video;
    // Right-click context menu for all non-deleted messages  
    div.oncontextmenu=function(e){
      e.preventDefault();
      var id=this.dataset.msgId;
      var type=this.dataset.msgType;
      var img=this.dataset.msgImg;
      var items=[];
      // Image-specific options
      if(img){
        items.push({label:'Resmi Kaydet',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',action:function(){saveImage(img)}});
        items.push({label:'Resmi Kopyala',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',action:function(){copyImage(img)}})
      }
      if(m.text){items.push({label:'Metin Kopyala',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',action:function(){copyMessageText(id)}})}
      items.push({label:'Yanıtla',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>',action:function(){setReply(id)}});
      items.push({label:isMsgPinned(id)?'Sabitlemeyi Kaldır':'Mesajı Sabitle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>',action:function(){togglePinMessage(id)}});
      items.push({label:'İlet',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',action:function(){
        var fwdTxt=m._decrypted||m.text||'';if(fwdTxt.indexOf('🔒')===0)fwdTxt='🔒 [Şifreli]';
        var fwdData={text:fwdTxt,image:m.image||null,images:m.image?[m.image]:null,video:m.video||null,audio:m.audio||null,duration:m.duration||0,originalSender:m.sender||($('sidebar-username').textContent)};
        showForwardModal(null,fwdData)
      }});
      if(img||m.text)items.push({sep:true});
      if(type==='sent'){
        items.push({label:'Düzenle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',action:function(){editMessage(id)}});
        items.push({label:'Sil',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){deleteMessage(id)}})
      }else{
        items.push({label:'Mesajı Sil',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){selfDeleteMessage(id)}})
      }
      contextMenuMsgId=id;
      if(chatMsgs)contextMenuScrollPos=chatMsgs.scrollTop;
      // Position at cursor top-right corner (+2px right, -2px up from cursor)
      showContextMenu(e.clientX+2,e.clientY-2,items)
    }
  }
  
  for(var gi=0;gi<groups.length;gi++){
    var g=groups[gi];
    if(g.type==='single'){
      var m=g.msg;
      // Skip call signaling messages
      if(m.type==='call'){continue}
      // Log messages (group events)
      if(m.type==='log'){
        var logDiv=document.createElement('div');
        logDiv.style.cssText='text-align:center;font-size:10.5px;color:var(--text4);padding:6px 0;flex-shrink:0';
        logDiv.textContent=m.text;
        el.appendChild(logDiv);
        continue
      }
      var div=document.createElement('div');div.className='msg '+m.type;div.id='msg-'+m.id;
      if(m.deleted){
        if(m.deletedByMe){div.innerHTML='<div class="msg-deleted">Bu mesajı sildiniz</div>'}
        else{div.innerHTML='<div class="msg-deleted">'+(m.sender&&isGroupChat?'<span style="opacity:.6">'+esc(m.sender)+'</span> — ':'')+'Bu mesaj silindi</div>'}
      }
      else{var txt='<div class="msg-text">';
        if(isGroupChat&&m.sender&&m.type==='received'){if(conv&&conv.members){for(var mi=0;mi<conv.members.length;mi++){if(conv.members[mi].name===m.sender){txt+='<span class="msg-sender"><span class="msg-sender-avatar" style="background:'+conv.members[mi].color+'">'+conv.members[mi].avatar+'</span>'+esc(m.sender)+'</span>';break}}}}
        if(m.image)txt+='<img class="msg-image" src="'+escJs(m.image)+'" alt="" onclick="showImage(\''+escJs(m.image)+'\')">';
        if(m.video)txt+='<video class="msg-image" src="'+escJs(m.video)+'" controls style="max-width:280px;border-radius:12px;display:block;cursor:pointer" onclick="event.stopPropagation();showVideoPreview(\''+escJs(m.video)+'\')"></video>';
        if(m.audio){var mins=Math.floor((m.duration||0)/60),secs=(m.duration||0)%60;txt+='<div class="msg-audio"><button class="ma-play" onclick="playAudio(\''+m.id+'\')"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></button><div class="ma-body"><div class="ma-seek" onclick="seekAudio(event,\''+m.id+'\')"><div class="ma-progress"></div></div></div><span class="ma-dur">'+mins+':'+(secs<10?'0':'')+secs+'</span></div>'}
        if(m.isForwarded)txt+='<div style="font-size:9px;opacity:.4;margin-bottom:2px;font-style:italic">📤 İletildi</div>';
        if(m.forwardComment)txt+='<div style="font-size:11px;opacity:.7;margin-bottom:2px">💬 '+esc(m.forwardComment)+'</div>';
        if(m.replyTo&&m.replyText){
          txt+='<div style="font-size:10px;padding:4px 8px;margin-bottom:4px;border-left:2px solid var(--accent);background:rgba(129,140,248,.04);border-radius:4px;color:var(--text4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⤴ '+esc(m.replyText)+'</div>'
        }
        if(m._decrypting)txt+='<span style="opacity:.4">🔒 [Çözülüyor...]</span>';else txt+=esc(m._decrypted||m.text||'')
        if(m.edited)txt+='<span class="msg-edited">(düzenlendi)</span>';
        txt+='</div><div class="msg-time">'+esc(m.time)+(m.editedTime?' · '+esc(m.editedTime):'')+(m.type==='sent'&&!m.deleted?' <span style="font-size:8px;color:var(--text4)">✓✓</span>':'')+'</div>';
        div.innerHTML=txt;
        addMsgActions(div,m)
      }
      el.appendChild(div)
    }else if(g.type==='collage'){
      (function(imgs){
      var n=imgs.length;
      // Single image should render normally
      if(n===1){
        var m=imgs[0];
        var div=document.createElement('div');div.className='msg sent';div.id='msg-'+m.id;
        div.innerHTML='<div class="msg-text"><img class="msg-image" src="'+m.image+'" alt="" onclick="showImage(\''+m.image+'\')"></div><div class="msg-time" style="padding-top:2px">'+esc(m.time)+'</div>';
        addMsgActions(div,m);el.appendChild(div)
      }else{
        var div=document.createElement('div');div.className='msg sent';div.id=g.id;
        var first=imgs[0];
        var extra=n-1;
        div.innerHTML='<div style="position:relative;display:inline-block;max-width:280px">'+
          '<img class="msg-image" src="'+first.image+'" alt="" onclick="showImage(\''+first.image+'\')" style="max-width:280px;width:100%;border-radius:12px;display:block;cursor:pointer">'+
          (extra>0?'<div onclick="showImage(\''+first.image+'\')" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.65);color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">+'+extra+'</div>':'')+
        (g.isForwarded?'<div style="font-size:9px;opacity:.4;margin-top:4px;font-style:italic">📤 İletildi</div>':'')+
        (g.forwardComment?'<div style="font-size:11px;opacity:.7;margin:2px 0">💬 '+esc(g.forwardComment)+'</div>':'')+
        '</div><div class="msg-time" style="padding-top:2px;text-align:right">'+esc(g.time)+(g.time!==g.time2?' · '+esc(g.time2):'')+'</div>';
        // Right-click handler for collage
        div.oncontextmenu=function(e){
          e.preventDefault();
          contextMenuMsgId='collage';
          if(chatMsgs)contextMenuScrollPos=chatMsgs.scrollTop;
          var items=[];
          items.push({label:'Medyaları Düzenle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',action:function(){
            pendingMediaFiles=[];
            for(var ci=0;ci<imgs.length;ci++){
              pendingMediaFiles.push({path:'',dataUrl:imgs[ci].image,name:'image '+(ci+1),type:'image',caption:imgs[ci].text||'',_editId:imgs[ci].id})
            }
            mediaIndex=0;mediaThumbCount=0;
            showMediaPreview()
          }});
          if(imgs.length>1)items.push({label:'Tümünü İlet',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',action:function(){
            var fwdData={text:imgs.length+' görsel',images:imgs.map(function(x){return x.image}),originalSender:$('sidebar-username').textContent};
            showForwardModal(null,fwdData)
          }});
          items.push({label:'Tümünü Sil',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){
            pendingCollageDelete=imgs;
            var body=$('modal-delete').querySelector('.modal-body');
            body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
              '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Tümünü Sil</h4>'+
              '<p style="color:var(--text4);font-size:12px">'+imgs.length+' medya kalıcı olarak silinsin mi?</p>';
            $('delete-confirm-btn').textContent='Tümünü Sil';
            $('delete-confirm-btn').onclick=function(){confirmCollageDelete()};
            $('modal-delete').classList.add('active')
          }});
          var cr=this.getBoundingClientRect();
          var cz=items.length*36;
          var mx=cr.right+8,my=cr.top+cr.height/2-cz/2;
          if(mx+200>window.innerWidth)mx=Math.max(4,cr.left-208);
          showContextMenu(mx,my,items)
        };
        el.appendChild(div)
      }
      })(g.images)
    }
  }
  setTimeout(function(){
    if(!el)return;
    var nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<150;
    if(nearBottom||_forceScrollBottom){_forceScrollBottom=false;el.scrollTop=el.scrollHeight}
    updateNewMsgIndicator(el)
  },50)
}

function updateNewMsgIndicator(el){
  el=el||$('chat-messages');if(!el)return;
  var ni=$('new-msg-indicator');var sb=$('scroll-bottom-btn');
  var nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<150;
  if(nearBottom){_hasNewMsg=false;var cv=findConv(activeConvId);if(cv&&cv.unread>0){cv.unread=0;saveUnreadCounts();renderConversations()}}
  if(_hasNewMsg&&!nearBottom){
    if(ni)ni.style.display='flex';
    if(sb)sb.style.display='none'
  }else if(!nearBottom&&!_hasNewMsg){
    if(ni)ni.style.display='none';
    if(sb)sb.style.display='flex'
  }else{
    if(ni)ni.style.display='none';
    if(sb)sb.style.display='none'
  }
}

// Attach scroll listener once to chat messages
var _chatMsgsEl=$('chat-messages');
if(_chatMsgsEl)_chatMsgsEl.addEventListener('scroll',function(){updateNewMsgIndicator(this)});

function scrollToBottom(){var el=$('chat-messages');if(el){el.scrollTo({top:el.scrollHeight,behavior:'smooth'});_hasNewMsg=false;var ni=$('new-msg-indicator');if(ni)ni.style.display='none';var sb=$('scroll-bottom-btn');if(sb)sb.style.display='none';var cv=findConv(activeConvId);if(cv&&cv.unread>0){cv.unread=0;saveUnreadCounts();renderConversations()}}
}

// ===== VOICE CALL =====
var callState=null; // null, 'calling', 'ringing', 'connected'
var callPeerConn=null, callLocalStream=null, callTimerInterval=null, pendingIceCandidates=[];
var callStartTime=0,callMicMuted=false,callSpeakerMuted=false;
var pendingCallMsgId=null;

// Simple ringtone using Web Audio API
var ringtoneCtx=null, ringtoneOsc=null, ringtoneGain=null, ringtoneVibrato=null;
function playRingtone(){
  try{
    ringtoneCtx=new(window.AudioContext||window.webkitAudioContext)();
    ringtoneOsc=ringtoneCtx.createOscillator();
    ringtoneGain=ringtoneCtx.createGain();
    ringtoneOsc.type='sine';ringtoneOsc.frequency.value=440;
    ringtoneGain.gain.value=0.15;
    ringtoneOsc.connect(ringtoneGain);ringtoneGain.connect(ringtoneCtx.destination);
    ringtoneOsc.start();
    // Vibrato effect
    if(ringtoneVibrato)clearInterval(ringtoneVibrato);
    ringtoneVibrato=setInterval(function(){
      if(ringtoneOsc)ringtoneOsc.frequency.value=ringtoneOsc.frequency.value===440?520:440
    },400)
  }catch(e){}
}
function stopRingtone(){
  if(ringtoneVibrato){clearInterval(ringtoneVibrato);ringtoneVibrato=null}
  try{if(ringtoneOsc){ringtoneOsc.stop();ringtoneOsc=null}if(ringtoneCtx){ringtoneCtx.close();ringtoneCtx=null}}catch(e){}
}

function startCall(){
  if(!activeConvId){return}
  var conv=findConv(activeConvId);if(!conv)return;
  if(callState){return}
  // Show inline call bar
  $('call-bar').style.display='flex';
  $('call-bar-name').textContent=conv.name;
  $('call-bar-status').textContent='Çağrı başlatılıyor...';
  $('call-bar-timer').style.display='none';
  // Helper: get avatar HTML for a user
  function makeCallAvatar(id, name, bgColor, avatarLetter, avatarUrl){
    var el=document.createElement('div');
    el.style.cssText='width:36px;height:36px;border-radius:50%;flex-shrink:0;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center';
    if(avatarUrl){
      el.style.background='transparent';
      el.innerHTML='<img src="'+avatarUrl+'" style="width:100%;height:100%;object-fit:cover">'
    }else{
      el.style.background=bgColor||'var(--grad)';
      el.style.color='#fff';
      el.style.fontSize='12px';
      el.style.fontWeight='700';
      el.textContent=avatarLetter||'?'
    }
    return el
  }
  // Build member avatars
  var avatarContainer=$('call-member-avatars');
  avatarContainer.innerHTML='';
  var myName=$('sidebar-username').textContent;
  var accs=getAccounts();
  var selfAcc=null;
  for(var sai=0;sai<accs.length;sai++){if(accs[sai].id===activeAccountId){selfAcc=accs[sai];break}}
  // Self avatar
  var selfA=makeCallAvatar(activeAccountId,myName,'var(--grad)',myName.charAt(0).toUpperCase(),selfAcc?selfAcc.avatar:null);
  selfA.id='call-self-avatar';
  avatarContainer.appendChild(selfA);
  // Other members
  if(conv.isGroup&&conv.members){
    conv.members.forEach(function(m){
      var ma=makeCallAvatar(m.id,m.name,m.color||'var(--grad)',m.avatar?m.avatar.charAt(0):'?',null);
      ma.className='call-member-avatar';
      ma.dataset.name=m.name;
      // Try to find profile pic for this member from accounts
      for(var mai=0;mai<accs.length;mai++){
        if(accs[mai].id==m.id||accs[mai].displayName===m.name){
          if(accs[mai].avatar){
            ma.innerHTML='<img src="'+accs[mai].avatar+'" style="width:100%;height:100%;object-fit:cover">';
            ma.style.background='transparent'
          }
          break
        }
      }
      avatarContainer.appendChild(ma)
    })
  }else if(!conv.isGroup){
    var a=makeCallAvatar(conv.id,conv.name,'var(--grad)',conv.avatar||'?',null);
    a.id='call-bar-avatar';
    avatarContainer.appendChild(a)
  }
  // Add call log
  if(messages[activeConvId]){var logTxt='📞 '+(conv.isGroup?'Grup araması':'Sesli arama')+' başlatıldı';var logMsg={id:uid(),type:'log',text:logTxt,time:timeNow(),senderId:fbUserId()};messages[activeConvId].push(logMsg);conv.lastMsg=logTxt;conv.lastActivity=Date.now();conv.time=timeNow();fbSendMessage(activeConvId,logMsg);saveMessages();renderMessages(activeConvId);renderConversations()}
  callState='calling';
  playRingtone();
  
  // Send call offer as a special message
  var callId=uid();
  pendingCallMsgId=callId;
  if(!messages[activeConvId])messages[activeConvId]=[];
  messages[activeConvId].push({id:callId,type:'call',action:'offer',time:timeNow(),sender:$('sidebar-username').textContent,status:'calling'});
  saveMessages();
  
  // Start local stream and create offer
  startLocalStream(function(){
    createOffer(callId)
  })
}

var vadTimer=null;
function startLocalStream(cb){
  try{navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){
    callLocalStream=stream;
    // Voice activity detection for self avatar
    if(vadTimer){clearInterval(vadTimer)}
    try{
      var vCtx=new(window.AudioContext||window.webkitAudioContext)();
      var vSrc=vCtx.createMediaStreamSource(stream);
      var vAna=vCtx.createAnalyser();vAna.fftSize=128;
      vSrc.connect(vAna);
      var vData=new Uint8Array(vAna.frequencyBinCount);
      // Auto-calibrate noise floor
      var vadNoiseFloor=0,vadCalibCount=0,vadSilenceFrames=0;
      var vadSpeaking=false;
      vadTimer=setInterval(function(){
        vAna.getByteFrequencyData(vData);
        var avg=0;for(var vi=0;vi<vData.length;vi++){avg+=vData[vi]}
        avg/=vData.length;
        // Calibrate noise floor (first 20 frames of silence)
        if(vadCalibCount<20){vadNoiseFloor+=avg;vadCalibCount++;
          if(vadCalibCount===20)vadNoiseFloor/=20;
          return
        }
        var threshold=vadNoiseFloor+8; // 8dB above noise floor
        var selfEl=$('call-self-avatar');
        if(selfEl){
          if(avg>threshold){
            vadSpeaking=true;
            vadSilenceFrames=0;
            selfEl.style.outline='2.5px solid #22c55e';selfEl.style.outlineOffset='-2.5px'
          }else{
            vadSilenceFrames++;
            // Require 4 consecutive silence frames (~600ms) before turning off
            if(vadSilenceFrames>4&&vadSpeaking){
              vadSpeaking=false;
              selfEl.style.outline='';selfEl.style.outlineOffset=''
            }
          }
        }
        // Adaptive threshold: slowly track noise floor
        if(!vadSpeaking)vadNoiseFloor=vadNoiseFloor*0.95+avg*0.05
      },150)
    }catch(e){}
    if(cb)cb()
  }).catch(function(){alert('Mikrofon erişimi gerekli');endCall()})}catch(e){endCall()}

function createOffer(callId){
  var config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'}]};
  callPeerConn=new RTCPeerConnection(config);
  callLocalStream.getTracks().forEach(function(t){callPeerConn.addTrack(t,callLocalStream)});
  callPeerConn.onicecandidate=function(e){
    if(e.candidate&&callId&&activeConvId){
      fbSendCallSignal(activeConvId,{action:'ice',candidate:e.candidate,callId:callId})
    }
  };
  callPeerConn.oniceconnectionstatechange=function(){
    if(!callPeerConn)return;
    if(callPeerConn.iceConnectionState==='connected'||callPeerConn.iceConnectionState==='completed'){
      if(callState!=='connected'){
        callState='connected';callStartTime=Date.now();
        $('call-bar-status').textContent='Bağlandı';
        $('call-bar-timer').style.display='inline';
        stopRingtone();
        if(callTimerInterval){clearInterval(callTimerInterval)}
        callTimerInterval=setInterval(function(){
          var sec=Math.floor((Date.now()-callStartTime)/1000);
          var m=Math.floor(sec/60),s=sec%60;
          $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
        },500)
      }
    }
    if(callPeerConn.iceConnectionState==='disconnected'||callPeerConn.iceConnectionState==='failed'){
      endCall()
    }
  };
  callPeerConn.ontrack=function(e){
    var audioEl=document.createElement('audio');
    audioEl.srcObject=e.streams[0];
    audioEl.autoplay=true;
    audioEl.playsinline=true;
    audioEl.style.display='none';
    document.body.appendChild(audioEl);
    audioEl.play().catch(function(){})
  };
  // Process any pending ICE candidates collected before PeerConnection was ready
  while(pendingIceCandidates.length>0){
    var c=pendingIceCandidates.shift();
    try{callPeerConn.addIceCandidate(new RTCIceCandidate(c))}catch(e){}
  }
  callPeerConn.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:false}).then(function(offer){
    callPeerConn.setLocalDescription(offer);
    $('call-bar-status').textContent='Bağlanıyor...';
    if(activeConvId)fbSendCallSignal(activeConvId,{action:'offer',sdp:offer,callId:callId,callerName:$('sidebar-username').textContent||'Birisi'})
  }).catch(function(){})
}

// ===== FIRESTORE CALL SIGNALING =====
var _callSignalUnsub=null;
var _callSigOfferId=null;

function fbSendCallSignal(convId,data){
  if(!window.db||!fbUserId()||!convId)return;
  data.from=fbUserId();
  data.timestamp=firebase.firestore.FieldValue.serverTimestamp();
  return db.collection('conversations').doc(convId).collection('call_signals').add(data).then(function(ref){return ref.id}).catch(function(){return null})
}

function fbListenCallSignals(convId){
  if(_callSignalUnsub){_callSignalUnsub();_callSignalUnsub=null}
  if(!window.db||!convId||!fbUserId())return;
  var uid=fbUserId();
  _callSignalUnsub=db.collection('conversations').doc(convId).collection('call_signals').orderBy('timestamp','asc').onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      if(change.type!=='added')return;
      var d=change.doc.data(),sid=change.doc.id;
      if(d.from===uid)return;
      if(!callState||callState==='idle'){
        // Incoming offer
        if(d.action==='offer'&&d.sdp){
          _callSigOfferId=sid;
          var callerName=d.callerName||'Birisi';
          $('incoming-caller-name').textContent=callerName;
          callState='ringing';
          pendingCallMsgId=sid;
          playRingtone();
          $('incoming-call').style.display='flex';
          // Auto-cleanup the offer
          setTimeout(function(){if(callState==='ringing'&&pendingCallMsgId===sid){$('incoming-call').style.display='none';stopRingtone();callState=null;pendingCallMsgId=null}},30000)
        }
      }
      // Handle ICE candidates regardless of callState (queue if no PeerConnection yet)
      if(d.action==='ice'&&d.candidate){
        if(callPeerConn){
          try{callPeerConn.addIceCandidate(new RTCIceCandidate(d.candidate))}catch(e){}
        }else{
          pendingIceCandidates.push(d.candidate)
        }
      }
      if(callState==='calling'||callState==='connected'){
        // Incoming answer (we are the caller)
        if(d.action==='answer'&&d.sdp&&callPeerConn&&callPeerConn.localDescription&&callPeerConn.localDescription.type==='offer'){
          callPeerConn.setRemoteDescription(new RTCSessionDescription(d.sdp)).then(function(){
            $('call-bar-status').textContent='Bağlandı';
            $('call-bar-timer').style.display='inline';
            callState='connected';
            callStartTime=Date.now();
            stopRingtone();
            if(callTimerInterval){clearInterval(callTimerInterval)}
            callTimerInterval=setInterval(function(){
              var sec=Math.floor((Date.now()-callStartTime)/1000);
              var m=Math.floor(sec/60),s=sec%60;
              $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
            },500)
          }).catch(function(){})
        }
        // Incoming call end
        if(d.action==='end'){
          endCall()
        }
      }
    })
  },function(){})
}

function fbStopCallSignals(){
  if(_callSignalUnsub){_callSignalUnsub();_callSignalUnsub=null}
  _callSigOfferId=null
}

function checkIncomingCalls(){} // Replaced by fbListenCallSignals

function acceptCall(){
  if(callState!=='ringing'||!pendingCallMsgId)return;
  stopRingtone();$('incoming-call').style.display='none';
  $('call-bar').style.display='flex';
  var name=$('incoming-caller-name').textContent;
  var avatarContainer=$('call-member-avatars');avatarContainer.innerHTML='';
  var a=document.createElement('div');
  a.style.cssText='width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 0 0 2px var(--accent)';
  a.id='call-bar-avatar';a.textContent=name.charAt(0);
  avatarContainer.appendChild(a);
  $('call-bar-name').textContent=name;
  $('call-bar-status').textContent='Bağlanıyor...';
  $('call-bar-timer').style.display='none';
  callState='calling';
  
  // Add call accepted log
  if(activeConvId&&messages[activeConvId]){
    var acceptLogTxt='📞 Arama kabul edildi';
    messages[activeConvId].push({id:uid(),type:'log',text:acceptLogTxt,time:timeNow()});
    fbSendMessage(activeConvId,{id:uid(),type:'log',text:acceptLogTxt,time:timeNow(),senderId:fbUserId()});
    saveMessages();
    renderMessages(activeConvId);
    renderConversations()
  }
  
  // Get offer from Firestore
  var offer=null,fcallId=null;
  if(window.db&&activeConvId&&_callSigOfferId){
    db.collection('conversations').doc(activeConvId).collection('call_signals').doc(_callSigOfferId).get().then(function(odoc){
      if(odoc.exists){var od=odoc.data();offer=od.sdp;fcallId=od.callId}
      if(!offer){endCall();return}
      startLocalStream(function(){
        var config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'}]};
        callPeerConn=new RTCPeerConnection(config);
        callLocalStream.getTracks().forEach(function(t){callPeerConn.addTrack(t,callLocalStream)});
        callPeerConn.onicecandidate=function(e){
          if(e.candidate&&activeConvId){
            fbSendCallSignal(activeConvId,{action:'ice',candidate:e.candidate,callId:fcallId})
          }
        };
        callPeerConn.oniceconnectionstatechange=function(){
          if(!callPeerConn)return;
          if(callPeerConn.iceConnectionState==='connected'||callPeerConn.iceConnectionState==='completed'){
            if(callState!=='connected'){
              callState='connected';callStartTime=Date.now();
              $('call-bar-status').textContent='Bağlandı';
              $('call-bar-timer').style.display='inline';
              if(callTimerInterval){clearInterval(callTimerInterval)}
              callTimerInterval=setInterval(function(){
                var sec=Math.floor((Date.now()-callStartTime)/1000);
                var m=Math.floor(sec/60),s=sec%60;
                $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
              },500)
            }
          }
          if(callPeerConn.iceConnectionState==='disconnected'||callPeerConn.iceConnectionState==='failed'){endCall()}
        };
        callPeerConn.ontrack=function(e){
          var audioEl=document.createElement('audio');
          audioEl.srcObject=e.streams[0];
          audioEl.autoplay=true;audioEl.playsinline=true;
          audioEl.style.display='none';
          document.body.appendChild(audioEl);
          audioEl.play().catch(function(){})
        };
        // Process pending ICE candidates collected before PeerConnection was ready
        while(pendingIceCandidates.length>0){
          var c=pendingIceCandidates.shift();
          try{callPeerConn.addIceCandidate(new RTCIceCandidate(c))}catch(e){}
        }
        callPeerConn.setRemoteDescription(new RTCSessionDescription(offer)).then(function(){
          return callPeerConn.createAnswer({offerToReceiveAudio:true,offerToReceiveVideo:false})
        }).then(function(answer){
          return callPeerConn.setLocalDescription(answer).then(function(){
            callState='connected';callStartTime=Date.now();
            $('call-bar-status').textContent='Bağlandı';
            $('call-bar-timer').style.display='inline';
            if(callTimerInterval){clearInterval(callTimerInterval)}
            callTimerInterval=setInterval(function(){
              var sec=Math.floor((Date.now()-callStartTime)/1000);
              var m=Math.floor(sec/60),s=sec%60;
              $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
            },500);
            if(activeConvId)fbSendCallSignal(activeConvId,{action:'answer',sdp:answer,callId:fcallId})
          })
        }).catch(function(){endCall()})
      })
    }).catch(function(){endCall()})
  }else{endCall()}
}

function declineCall(){stopRingtone();$('incoming-call').style.display='none';if(pendingCallMsgId){pendingCallMsgId=null}callState=null}

function endCall(){
  stopRingtone();
  $('call-bar').style.display='none';
  $('incoming-call').style.display='none';
  if(callTimerInterval){clearInterval(callTimerInterval);callTimerInterval=null}
  if(callPeerConn){callPeerConn.close();callPeerConn=null}
  if(vadTimer){clearInterval(vadTimer);vadTimer=null}
  if(callLocalStream){callLocalStream.getTracks().forEach(function(t){t.stop()});callLocalStream=null}
  if(callCamStream){callCamStream.getTracks().forEach(function(t){t.stop()});callCamStream=null}
  if(callScreenStream){callScreenStream.getTracks().forEach(function(t){t.stop()});callScreenStream=null}
  var cv=$('call-local-video');if(cv){cv.style.display='none';var cve=$('call-local-video-el');if(cve)cve.srcObject=null}
  // Add call end log with duration
  if(activeConvId&&messages[activeConvId]&&callStartTime>0){
    var dur=Math.floor((Date.now()-callStartTime)/1000);
    var dm=Math.floor(dur/60),ds=dur%60;
    var endLogTxt='📞 Arama sonlandı · '+(dm<10?'0':'')+dm+':'+(ds<10?'0':'')+ds;
    var endLogMsg={id:uid(),type:'log',text:endLogTxt,time:timeNow(),senderId:fbUserId()};
    messages[activeConvId].push(endLogMsg);
    fbSendMessage(activeConvId,endLogMsg);
    var conv2=findConv(activeConvId);if(conv2){conv2.lastMsg=endLogTxt;conv2.lastActivity=Date.now();conv2.time=timeNow()}
    saveMessages();
    renderMessages(activeConvId);
    renderConversations()
  }
  pendingIceCandidates=[];
  callState=null;callMicMuted=false;callSpeakerMuted=false;
  if(activeConvId)fbSendCallSignal(activeConvId,{action:'end'});
  $('call-mic-btn').style.background='rgba(255,255,255,.04)';
  $('call-mic-btn').style.color='var(--text3)';
  $('call-cam-btn').style.background='rgba(255,255,255,.04)';
  $('call-cam-btn').style.color='var(--text3)';
  $('call-screen-btn').style.background='rgba(255,255,255,.04)';
  $('call-screen-btn').style.color='var(--text3)';
  $('call-speaker-btn').style.background='rgba(255,255,255,.04)';
  $('call-speaker-btn').style.color='var(--text3)';
  $('call-bar-timer').style.display='none';
  var audioEls=document.querySelectorAll('audio[srcObject]');
  audioEls.forEach(function(el){el.remove()})
}

function toggleCallMic(){
  callMicMuted=!callMicMuted;
  if(callLocalStream){callLocalStream.getAudioTracks().forEach(function(t){t.enabled=!callMicMuted})}
  $('call-mic-btn').style.background=callMicMuted?'rgba(239,68,68,.2)':'rgba(255,255,255,.06)';
  $('call-mic-btn').style.color=callMicMuted?'#ef4444':'var(--text3)'
}
var callCamStream=null, callScreenStream=null;

function enlargeCallVideo(){
  var el=$('call-local-video-el');
  if(!el||!el.srcObject)return;
  var overlay=document.createElement('div');
  overlay.id='call-video-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column';
  overlay.onclick=function(e){if(e.target===overlay)closeCallVideo()};
  var video=document.createElement('video');
  video.srcObject=el.srcObject;
  video.autoplay=true;video.muted=true;
  video.style.cssText='max-width:90vw;max-height:85vh;border-radius:12px;object-fit:contain';
  overlay.appendChild(video);
  video.play().catch(function(){});
  var closeBtn=document.createElement('button');
  closeBtn.innerHTML='✕';
  closeBtn.style.cssText='position:absolute;top:16px;right:16px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center';
  closeBtn.onclick=function(){closeCallVideo()};
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay)
}
function closeCallVideo(){
  var el=document.getElementById('call-video-overlay');
  if(el)document.body.removeChild(el)
}

function toggleCallCamera(){
  if(!callState)return;
  var videoEl=$('call-local-video-el');
  var container=$('call-local-video');
  if(callCamStream){
    callCamStream.getTracks().forEach(function(t){t.stop()});
    callCamStream=null;
    videoEl.srcObject=null;
    container.style.display='none';
    $('call-cam-btn').style.background='rgba(255,255,255,.04)';
    $('call-cam-btn').style.color='var(--text3)';
    return
  }
  try{navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(function(stream){
    callCamStream=stream;
    videoEl.srcObject=stream;
    container.style.display='block';
    videoEl.play().catch(function(){});
    $('call-cam-btn').style.background='rgba(34,197,94,.15)';
    $('call-cam-btn').style.color='#22c55e'
  }).catch(function(e){console.error('Camera error:',e)})}catch(e){console.error('Camera error:',e)}
}

function toggleCallScreen(){
  if(!callState)return;
  var videoEl=$('call-local-video-el');
  var container=$('call-local-video');
  if(callScreenStream){
    callScreenStream.getTracks().forEach(function(t){t.stop()});
    callScreenStream=null;
    videoEl.srcObject=null;
    container.style.display='none';
    $('call-screen-btn').style.background='rgba(255,255,255,.04)';
    $('call-screen-btn').style.color='var(--text3)';
    return
  }
  // Native picker shows window/screen/tab options automatically
  try{navigator.mediaDevices.getDisplayMedia({video:true,audio:false}).then(function(stream){
    callScreenStream=stream;
    videoEl.srcObject=stream;
    container.style.display='';
    videoEl.play().catch(function(){});
    $('call-screen-btn').style.background='rgba(34,197,94,.15)';
    $('call-screen-btn').style.color='#22c55e';
    stream.getVideoTracks()[0].onended=function(){
      callScreenStream=null;
      videoEl.srcObject=null;
      container.style.display='none';
      $('call-screen-btn').style.background='rgba(255,255,255,.04)';
      $('call-screen-btn').style.color='var(--text3)'
    }
  }).catch(function(e){console.error('Screen share error:',e)})}catch(e){console.error('Screen share error:',e)}
}

function toggleCallSpeaker(){
  callSpeakerMuted=!callSpeakerMuted;
  $('call-speaker-btn').style.background=callSpeakerMuted?'rgba(239,68,68,.2)':'rgba(255,255,255,.06)';
  $('call-speaker-btn').style.color=callSpeakerMuted?'#ef4444':'var(--text3)'
}

// Poll for incoming calls (fallback — primary signaling is via Firestore listener)
var callPollTimer=setInterval(function(){
  if(!activeConvId)return;
  if(callState==='calling'&&callPeerConn){
    // Fallback: process any remaining local-message based signals (legacy)
    if(!messages[activeConvId])return;
    var msgs=messages[activeConvId];
    for(var ci=0;ci<msgs.length;ci++){
      if(msgs[ci].type==='call'&&msgs[ci].action==='ice'&&msgs[ci].candidate&&!msgs[ci]._processed){
        try{callPeerConn.addIceCandidate(new RTCIceCandidate(msgs[ci].candidate));msgs[ci]._processed=true}catch(e){}
      }
    }
  }
},2000);

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown',function(e){
  // Don't process app shortcuts while recording a new shortcut
  if(recordingShortcut)return;
  // Don't process app shortcuts while settings is open (except ESC and Enter)
  if($('settings-page').classList.contains('active')&&e.key!=='Escape'&&e.key!=='Enter')return;
  // ESC close modals first, then settings
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
  // Enter to confirm in modals
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
  // Custom shortcuts from settings — skip if user is typing in an input
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
  // Hardcoded defaults — only fire if user hasn't customized that shortcut
  var _s=ls('shortcuts')||{};
  if(e.altKey&&e.key==='g'&&!_s['upload']){e.preventDefault();toggleUploadMenu()}
  if(e.altKey&&e.key==='m'&&!_s['voiceMsg']){e.preventDefault();startVoice()}
  if(e.key==='Escape'&&document.getElementById('call-video-overlay')){closeCallVideo();e.preventDefault()}
  if(e.ctrlKey&&e.key==='f'&&!_s['search']){e.preventDefault();openSearch()}
  // CTRL+V = paste (handled by paste event)
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
// Horizontal scroll for media thumbnails with mouse wheel
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
// Close menus on click outside
document.addEventListener('click',function(e){
  if(!e.target.closest('.context-menu')&&!e.target.closest('.conv-item')&&!e.target.closest('.msg'))hideContextMenu();
  if(e.target.classList.contains('modal-overlay')){hideTos();hideDeleteModal();hideMediaModal();$('modal-forward').classList.remove('active');forwardMsgData=null;forwardingLock=false}
  if(!e.target.closest('.upload-menu')&&!e.target.closest('#upload-btn'))hideUploadMenu()
});
document.addEventListener('mousedown',function(e){if(!e.target.closest('.sidebar-user')&&!e.target.closest('.avatar-dropdown'))hideAvatarMenu()});

// Close context menu on scroll (message out of view)
var contextMenuMsgId=null;
document.getElementById('context-menu').addEventListener('mouseenter',function(){});
// Track context menu position relative to the message element
var contextMenuRelY=0,contextMenuRelX=0;
// When positioned, the menu sits absolute inside .app-main and scrolls with it
// Close context menu when the message scrolls out of view
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
    // Hide all screens before fade to prevent flash
    document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});
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

// Show loading screen immediately
$('loading-screen').style.display='flex';

// Load Firebase dynamically
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
        // Skip if autoLogin is handling this login (prevents double showApp call)
        if(_explicitLogin){_explicitLogin=false;return}
        // Find local account by email - use LOCAL data (always up-to-date from settings saves)
        var accs=getAccounts(),acc=null;
        var loginEmail=(user.email||'').toLowerCase();for(var ai=0;ai<accs.length;ai++){if(accs[ai].email&&accs[ai].email.toLowerCase()===loginEmail){acc=accs[ai];break}}
        var pendingPassword=_pendingLoginPassword;
        if(acc){
          if(acc.password)rememberAccountPassword(acc,acc.password);
          _pendingLoginPassword=null;hideLoading(function(){if(staleAuthEvent())return;doLoginWith({id:user.uid,username:acc.username||user.email.split('@')[0],displayName:acc.displayName||user.displayName||user.email.split('@')[0],email:user.email,avatar:acc.avatar||null,status:acc.status||'online',bio:acc.bio||'',password:pendingPassword||null})})
        }else{
          // No local account found, fall back to Firestore
          db.collection('users').doc(user.uid).get().then(function(doc){
            if(staleAuthEvent())return;
            if(doc.exists){var d=doc.data();_pendingLoginPassword=null;hideLoading(function(){if(staleAuthEvent())return;doLoginWith({id:user.uid,username:d.username,displayName:d.displayName,email:user.email,avatar:d.avatar,status:d.status||'online',bio:d.bio||'',password:pendingPassword||null})})}
            else{_pendingLoginPassword=null;initWelcome()}
          }).catch(function(){if(!staleAuthEvent()){_pendingLoginPassword=null;initWelcome()}})
        }
      }else{
        // Only reset if not in the middle of an account switch
        // (account switch triggers null -> newUser in quick succession)
        if(_authTransitioning)return;
        resetSessionState();
        _authTransitioning=false;
        _pendingLoginPassword=null;
        initWelcome()
      }
    })
  }else{initWelcome()}
});

//end