// ===== SAVED ACCOUNTS =====
function getAccounts(){return ls('accounts')||[]}
function groupsStorageKey(){return store.activeAccountId?'groups_'+store.activeAccountId:'groups'}
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
  var accountId=fbUserId()||store.activeAccountId;
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
function getActiveAccount(){return getAccountById(store.activeAccountId)}
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
  updateStatusUI(status||store.currentStatus||'online')
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
  store.activeAccountId=acc.id;
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
  store._explicitLogin=true;
  store._authTransitioning=true;
  $('loading-screen').style.display='flex';
  document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});
  auth.signInWithEmailAndPassword(acc.email,password).then(function(cred){
    var u=cred.user;
    store._authTransitioning=false;
    hideLoading(function(){doLoginWith({id:u.uid,username:acc.username||u.email.split('@')[0],displayName:acc.displayName||u.displayName||u.email.split('@')[0],email:u.email,avatar:acc.avatar||null,status:'online',bio:acc.bio||'',password:password})})
  }).catch(function(){
    store._explicitLogin=false;
    store._authTransitioning=false;
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
  $('login-btn').disabled=true;
  store._pendingLoginPassword=p;
  auth.signInWithEmailAndPassword(e,p).then(function(cred){
  }).catch(function(err){
    store._pendingLoginPassword=null;
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
function updateRegStep(){document.querySelectorAll('.register-step').forEach(function(s){s.classList.remove('active')});var el=document.querySelector('.register-step[data-step="'+store.regStep+'"]');if(el)el.classList.add('active');document.querySelectorAll('.register-dot').forEach(function(d,i){d.className='register-dot';if(i===store.regStep)d.classList.add('active');else if(i<store.regStep)d.classList.add('done')});var sb=$('reg-step-back');if(sb)sb.style.display=store.regStep===0?'none':'flex';var n=$('reg-next');if(n)n.textContent=store.regStep===2?'Kayıt Ol':'İleri';validateRegister()}
function regNext(){
  if(!validateRegister())return;
  var btn=$('reg-next');
  function advance(){store.regStep++;updateRegStep();if(btn)btn.disabled=false}
  function dbError(label){if(btn)btn.disabled=false;showAlert(label+' kontrolü yapılamadı: servis şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.')}
  function dbTimeout(label){if(btn)btn.disabled=false;showAlert(label+' kontrolü zaman aşımına uğradı. İnternet bağlantını kontrol et.')}
  if(store.regStep===0){
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
    }).catch(function(err){clearTimeout(timer);if(!timedOut){dbError('Kullanıcı adı')}})
  }else if(store.regStep===1){
    advance()
  }else if(store.regStep<2){advance()}
  else completeRegistration()
}
function regPrev(){if(store.regStep>0){store.regStep--;updateRegStep()}}
function validateRegister(){var u=$('reg-username').value.trim(),d=$('reg-display').value.trim(),uOk=u.length>=3&&/^[a-zA-Z0-9_]+$/.test(u),dOk=d.length>=1;$('fg-username').classList.toggle('invalid',u.length>0&&!uOk);$('fg-display').classList.toggle('invalid',d.length>0&&!dOk);var e=$('reg-email').value.trim().toLowerCase(),eOk=e.endsWith('@gmail.com');$('fg-email').classList.toggle('invalid',e.length>0&&!eOk);var p=$('reg-pass').value,p2=$('reg-pass2').value,pOk=p.length>=6,p2Ok=p===p2&&p.length>0,t=$('reg-terms').checked;$('fg-pass').classList.toggle('invalid',p.length>0&&!pOk);$('fg-pass2').classList.toggle('invalid',p2.length>0&&!p2Ok);var steps=[uOk&&dOk,eOk,pOk&&p2Ok&&t];var btn=$('reg-next');if(btn)btn.disabled=!steps[store.regStep];return steps[store.regStep]}
function showAlert(msg){
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="var(--accent)" fill="none" stroke-width="1.5" style="margin-bottom:12px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Bilgi</h4>'+
    '<p style="color:var(--text4);font-size:12px">'+esc(msg)+'</p>';
  $('delete-confirm-btn').textContent='Tamam';
  $('delete-confirm-btn').onclick=function(){closeModal('modal-delete',function(){hideDeleteModal()})};
  $('modal-delete').classList.add('active');
  store.pendingAlert=true
}
async function completeRegistration(){
  var u=$('reg-username').value.trim(),d=$('reg-display').value.trim()||u,e=$('reg-email').value.trim().toLowerCase(),p=$('reg-pass').value;
  if(!window.auth||!p)return;
  var btn=$('reg-next');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor...'}
  function finishReg(errMsg){
    if(btn){btn.disabled=false;btn.textContent='Kayıt Ol'}
    if(errMsg)showAlert(errMsg)
  }
  if(!window.db){finishReg('Veritabanı bağlantısı yok.');return}
  var timedOut=false, timer=setTimeout(function(){timedOut=true;finishReg('Sunucu yanıt vermiyor. Lütfen tekrar dene.')},15000);
  store._explicitLogin=true;
  store._pendingLoginPassword=p;
  try {
    var cred=await auth.createUserWithEmailAndPassword(e,p);
    clearTimeout(timer);
    var uid=cred.user.uid;
    async function cancelCreatedAccount(msg){
      store._explicitLogin=false;store._pendingLoginPassword=null;
      if(auth.currentUser) try{await auth.currentUser.delete()}catch(e){}
      finishReg(msg)
    }
    try {
      var snap=await db.collection('users').where('username','==',u).limit(1).get();
      if(!snap.empty){cancelCreatedAccount('Bu kullanıcı adı zaten alınmış. Lütfen farklı bir kullanıcı adı dene.');return}
      await db.collection('users').doc(uid).set({username:u,displayName:d,email:e,avatar:store.avatarDataUrl||null,bio:'',status:'online',createdAt:Date.now()});
      store._explicitLogin=false;
      finishReg();
      showApp({id:uid,username:u,displayName:d,email:e,avatar:store.avatarDataUrl||null,status:'online',bio:'',password:p})
    }catch(err){cancelCreatedAccount('Profil oluşturulamadı. Lütfen tekrar dene.')}
  }catch(err){
    clearTimeout(timer);
    if(timedOut)return;
    var msg='';
    if(err.code==='auth/email-already-in-use')msg='Bu e-posta adresi zaten kayıtlı.';
    else if(err.code==='auth/weak-password')msg='Şifre çok zayıf. En az 6 karakter kullan.';
    else if(err.code==='auth/network-request-failed')msg='Ağ hatası. İnternet bağlantını kontrol et.';
    else if(err.code==='auth/invalid-email')msg='Geçersiz e-posta adresi.';
    else msg='Kayıt olunamadı: '+err.message;
    store._explicitLogin=false;store._pendingLoginPassword=null;
    finishReg(msg)
  }
}
async function pickAvatar(){try{if(window.electronAPI&&electronAPI.selectFile){var r=await electronAPI.selectFile();if(r&&r.thumb){store.avatarDataUrl=r.thumb;var p=$('avatar-picker');p.innerHTML='<img src="'+r.thumb+'" alt="" onerror="this.style.display=\'none\';this.parentElement.style.border=\'1px dashed rgba(129,140,248,.2)\';store.avatarDataUrl=null">';p.style.border='none'}}}catch(e){}}
