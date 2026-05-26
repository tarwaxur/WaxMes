// ===== E2E Encryption =====

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
  if(!store.activeAccountId||!window.crypto||!window.crypto.subtle)return;
  var saved=await safeLoad('e2e_private_'+store.activeAccountId);
  if(saved&&saved.length>0){
    try{
      var privKey=await crypto.subtle.importKey('pkcs8',new Uint8Array(saved),{name:'RSA-OAEP',hash:'SHA-256'},true,['decrypt']);
      store.e2eKeys={privateKey:privKey};store.e2eReady=true
    }catch(e){}
    return
  }
  try{
    var keyPair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
    var pubKey=await crypto.subtle.exportKey('spki',keyPair.publicKey);
    var privKey=await crypto.subtle.exportKey('pkcs8',keyPair.privateKey);
    await safeStore('e2e_private_'+store.activeAccountId,Array.from(new Uint8Array(privKey)));
    var pubB64=btoa(String.fromCharCode.apply(null,new Uint8Array(pubKey)));
    if(window.db){var fbUid=fbUserId();if(fbUid)db.collection(COLLECTIONS.USERS).doc(fbUid).update({publicKey:pubB64}).catch(console.error)};
    store.e2eKeys={privateKey:keyPair.privateKey};store.e2eReady=true
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
  if(!packed64||packed64.indexOf('🔒')!==0||!store.e2eKeys||!store.e2eKeys.privateKey)return null;
  try{
    var raw=Uint8Array.from(atob(packed64.slice(2)),function(c){return c.charCodeAt(0)});
    var ver=raw[0];
    if(ver===1){
      var iv=raw.slice(1,13);
      var keyLen=(raw[13]<<8)|raw[14];
      var encKey=raw.slice(15,15+keyLen);
      var encMsg=raw.slice(15+keyLen);
      var aesRaw=await crypto.subtle.decrypt({name:'RSA-OAEP'},store.e2eKeys.privateKey,encKey);
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
        if(!foundKey){try{var maybe=await crypto.subtle.decrypt({name:'RSA-OAEP'},store.e2eKeys.privateKey,ek);foundKey=new Uint8Array(maybe)}catch(e){}}
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
  ls(STORAGE_KEYS.THEME,t||'default')
}
function getTheme(){var t=ls(STORAGE_KEYS.THEME);return t&&validThemes.indexOf(t)!==-1?t:'default'}
function previewTheme(t){
  if(!t||t==='default'||validThemes.indexOf(t)===-1){unpreviewTheme();return}
  var pe=document.getElementById('theme-preview-style');
  if(!pe){pe=document.createElement('style');pe.id='theme-preview-style';document.head.appendChild(pe)}
  var w=$('app-window');
  if(w)validThemes.forEach(function(c){w.classList.remove('t-'+c,'l-'+c)});
  var b=document.body;
  validThemes.forEach(function(c){b.classList.remove('t-'+c,'l-'+c)});
  var p=lightThemes.indexOf(t)!==-1?'l-':'t-';
  var td=document.createElement('div');
  td.className=p+t;
  document.body.appendChild(td);
  var cs=getComputedStyle(td);
  var vars=['--bg','--bg2','--bg3','--accent','--text','--text2','--text3','--text4','--surface','--border','--border2','--grad','--input-bg','--msg-received','--hover','--sidebar-bg','--panel-bg'];
  var styles='';
  for(var vi=0;vi<vars.length;vi++){
    var val=cs.getPropertyValue(vars[vi]).trim();
    if(val)styles+=vars[vi]+':'+val+';'
  }
  document.body.removeChild(td);
  pe.textContent=':root,body{'+styles+'}'
}
function unpreviewTheme(){
  clearTimeout(_previewTimer);
  var pe=document.getElementById('theme-preview-style');
  if(pe)pe.textContent='';
  var w=$('app-window');
  if(w)validThemes.forEach(function(c){w.classList.remove('t-'+c,'l-'+c)});
  var b=document.body;
  validThemes.forEach(function(c){b.classList.remove('t-'+c,'l-'+c)});
  var t=getTheme();
  if(t&&t!=='default'&&validThemes.indexOf(t)!==-1){
    var p=lightThemes.indexOf(t)!==-1?'l-':'t-';
    if(w)w.classList.add(p+t);
    b.classList.add(p+t)
  }
}
function selectTheme(t){ls(STORAGE_KEYS.THEME,t);applyTheme(t);showSettingsCat('theme')}

function toggleAutoStart(val){
  if(window.electronAPI&&electronAPI.setAutoStart)electronAPI.setAutoStart(val)
}
function toggleBackground(val){
  ls(STORAGE_KEYS.BACKGROUND_MODE,val);
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
          db.collection(COLLECTIONS.USERS).doc(auth.currentUser.uid).delete().catch(console.error);
          await auth.currentUser.delete()
        }catch(e){$('delete-password-field').style.display='none';showAlert('Doğrulama başarısız. Hesap silinemedi.');return}
      }
      $('delete-password-field').style.display='none';
      $('delete-password-input').value='';
      localStorage.clear();
      store.conversations=[];store.messages={};store.activeConvId=null;store.activeAccountId=null;store.avatarDataUrl=null;
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
    var localId=store.activeAccountId,fbUid=fbUserId(),email=window.auth&&auth.currentUser?auth.currentUser.email:null;
    var acc=getAccountById(localId)||getAccountById(fbUid)||getAccountByEmail(email);
    if(window.auth&&auth.currentUser){
      try{
        var pass=$('delete-password-input').value;
        if(!pass){$('delete-password-field').style.display='none';showAlert('Hesap silme iptal edildi.');return}
        var cred=firebase.auth.EmailAuthProvider.credential(email,pass);
        await auth.currentUser.reauthenticateWithCredential(cred);
        if(window.db&&fbUid){
          // Clean up friend requests
          var reqSnap1=await db.collection(COLLECTIONS.FRIEND_REQUESTS).where('from','==',fbUid).get().catch(function(){return{forEach:function(){}}});
          reqSnap1.forEach(function(d){db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(d.id).delete().catch(console.error)});
          var reqSnap2=await db.collection(COLLECTIONS.FRIEND_REQUESTS).where('to','==',fbUid).get().catch(function(){return{forEach:function(){}}});
          reqSnap2.forEach(function(d){db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(d.id).delete().catch(console.error)});
          // Remove from friends lists
          var listSnap=await db.collection(COLLECTIONS.FRIENDS).doc(fbUid).collection(COLLECTIONS.LIST).get().catch(function(){return{forEach:function(){}}});
          listSnap.forEach(function(d){
            var otherId=d.data().id;
db.collection(COLLECTIONS.FRIENDS).doc(otherId).collection(COLLECTIONS.LIST).doc(fbUid).delete().catch(console.error);
      db.collection(COLLECTIONS.FRIENDS).doc(fbUid).collection(COLLECTIONS.LIST).doc(d.id).delete().catch(console.error);
          });
          // Remove from conversations
          var convSnap=await db.collection(COLLECTIONS.CONVERSATIONS).where('memberIds','array-contains',fbUid).get().catch(function(){return{forEach:function(){}}});
          convSnap.forEach(function(d){
            var mids=d.data().memberIds||[];
            var idx=mids.indexOf(fbUid);
            if(idx>-1){mids.splice(idx,1);db.collection(COLLECTIONS.CONVERSATIONS).doc(d.id).update({memberIds:mids}).catch(console.error)}
          });
          await db.collection(COLLECTIONS.USERS).doc(fbUid).delete().catch(console.error)
        }
        await auth.currentUser.delete()
      }catch(e){$('delete-password-field').style.display='none';showAlert('Doğrulama başarısız. Hesap silinemedi.');return}
    }
    $('delete-password-field').style.display='none';
    $('delete-password-input').value='';
    forgetAccountPassword(acc||{id:localId,email:email});
    var accs=getAccounts();
    for(var ri=accs.length-1;ri>=0;ri--){if(accs[ri].id===localId||accs[ri].id===fbUid||(email&&accs[ri].email===email)){accs.splice(ri,1)}}
    ls(STORAGE_KEYS.ACCOUNTS,accs);
    store.conversations=[];store.messages={};store.activeConvId=null;store.activeAccountId=null;store.avatarDataUrl=null;
    hideSettings();showScreen('screen-welcome');renderSavedAccounts()
  };
  $('modal-delete').classList.add('active')
}
