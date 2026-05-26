// ===== TOS =====
function showTos(){$('modal-tos').classList.add('active')}
function hideTos(){$('modal-tos').classList.remove('active')}
function acceptTos(){$('reg-terms').checked=true;hideTos();validateRegister()}

// ===== STATUS =====

function updateStatusUI(s){store.currentStatus=s;
  var sidebar=$('sidebar-status');if(sidebar){var sd=sidebar.querySelector('.sd-dot');var st=$('sidebar-status-text');if(sd)sd.className='sd-dot';if(s===STATUS.ONLINE){if(sd)sd.classList.add('sd-online');if(st)st.textContent='Çevrimiçi'}else if(s===STATUS.IDLE){if(sd)sd.classList.add('sd-idle');if(st)st.textContent='Boşta'}else if(s===STATUS.DND){if(sd)sd.classList.add('sd-dnd');if(st)st.textContent='Rahatsız Etme'}}
  var ad=$('avatar-dropdown').querySelector('.ad-status');if(ad){var addot=ad.querySelector('.sd-dot');var adtxt=ad.querySelector('#ad-status-text')||ad.querySelector('span:last-child');if(addot)addot.className='sd-dot ad-dot';if(s===STATUS.ONLINE){if(addot)addot.classList.add('sd-online');if(adtxt)adtxt.textContent='Çevrimiçi'}else if(s===STATUS.IDLE){if(addot)addot.classList.add('sd-idle');if(adtxt)adtxt.textContent='Boşta'}else if(s===STATUS.DND){if(addot)addot.classList.add('sd-dnd');if(adtxt)adtxt.textContent='Rahatsız Etme'}}
}

function resetIdleTimer(){
  if(store.idleTimer){clearTimeout(store.idleTimer)}
  // Restore previous status on activity
  if(store.prevStatus&&store.currentStatus===STATUS.IDLE&&store.prevStatus!==STATUS.IDLE){setStatus(store.prevStatus,true)}
  store.prevStatus=null;
  // Start idle timer (15 minutes = 900000ms)
  store.idleTimer=setTimeout(function(){
    if(store.currentStatus!==STATUS.IDLE){
      store.prevStatus=store.currentStatus;
      setStatus(STATUS.IDLE,true)
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
  if(conv._status===STATUS.IDLE)return'Boşta';
  if(conv._status===STATUS.DND)return'Rahatsız Etme';
  return conv.online?'Çevrimiçi':'Çevrimdışı'
}
function cycleStatus(){var o=['online','idle','dnd'],i=o.indexOf(store.currentStatus);if(i===-1)i=0;setStatus(o[(i+1)%3])}
function setStatus(s,skipSave){updateStatusUI(s);if(!skipSave)ls(STORAGE_KEYS.STATUS+store.activeAccountId,s);hideAvatarMenu();fbUpdateOnlineStatus(true,s);if(window.db&&fbUserId()){db.collection(COLLECTIONS.USERS).doc(fbUserId()).update({status:s}).catch(console.error)}}

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
  setTimeout(function(){el.classList.remove('active','closing');store.contextMenuMsgId=null;store.contextMenuScrollPos=0},100)
}

// ===== FORWARD MESSAGE =====


function showForwardModal(items,e){
  store.forwardMsgData=e;
  var list=$('forward-contact-list');list.innerHTML='';
  for(var fci=0;fci<store.conversations.length;fci++){(function(c){
    var d=document.createElement('div');d.className='modal-member-item';
    d.innerHTML='<div class="mm-avatar" style="background:'+c.color+'">'+(c.isGroup?'G':c.avatar)+'</div><div class="mm-name">'+esc(c.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d._cid=c.id;
    d.onclick=function(){d.classList.toggle('selected')};
    list.appendChild(d)
  })(store.conversations[fci])}
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


async function sendFriendRequest(){
  if(Date.now()-store._frCooldown<10000){$('add-friend-result').textContent='⏳ 10 saniye bekleyin.';$('add-friend-result').style.color='#ef4444';return}
  var name=$('add-friend-input').value.trim();
  if(!name||!window.db){$('add-friend-result').textContent='Lütfen bir kullanıcı adı gir.';return}
  var fbUid=fbUserId();if(!fbUid)return;
  store._frCooldown=Date.now();
  var opTimer=setTimeout(function(){$('add-friend-result').textContent='Zaman aşımı. İnternet bağlantını kontrol et.';$('add-friend-result').style.color='#ef4444'},30000);
  function fail(msg){clearTimeout(opTimer);$('add-friend-result').textContent=msg;$('add-friend-result').style.color='#ef4444'}
  function ok(msg){clearTimeout(opTimer);$('add-friend-input').value='';$('add-friend-result').textContent=msg;$('add-friend-result').style.color='var(--accent)';setTimeout(function(){$('add-friend-result').textContent='';$('add-friend-result').style.color='var(--text4)'},2500)}
  function resetTimer(){clearTimeout(opTimer);opTimer=setTimeout(function(){$('add-friend-result').textContent='Zaman aşımı. İnternet bağlantını kontrol et.';$('add-friend-result').style.color='#ef4444'},30000)}
  function catchErr(label,err){
    clearTimeout(opTimer);
    console.error('[FriendReq] '+label+':', err&&err.code?err.code:'', err&&err.message?err.message:err);
    if(err&&err.code==='permission-denied'){fail('Yetki hatası. Lütfen tekrar giriş yap.');return}
    if(err&&err.code==='unavailable'){fail('Sunucuya bağlanılamadı.');return}
    fail('Hata ('+(err&&err.code?err.code:'?')+'): '+(err&&err.message?err.message:'Bilinmeyen hata'))
  }
  try {
    // Step 1: Search user
    resetTimer();
    var snap=await db.collection(COLLECTIONS.USERS).where('username','==',name).limit(1).get();
    if(snap.empty){fail('Bu kullanıcı adıyla kayıtlı hesap bulunamadı.');return}
    var targetUser=snap.docs[0];
    if(targetUser.id===fbUid){fail('Kendine istek gönderemezsin.');return}
    // Step 2: Check already friends
    resetTimer();
    var fs=await db.collection(COLLECTIONS.FRIENDS).doc(fbUid).collection(COLLECTIONS.LIST).where('id','==',targetUser.id).get();
    if(!fs.empty){fail('Bu kullanıcı zaten arkadaşlarında.');return}
    // Step 3: Check pending count + duplicate
    resetTimer();
    var allSent=await db.collection(COLLECTIONS.FRIEND_REQUESTS).where('from','==',fbUid).get();
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
    resetTimer();
    await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(reqId).set({
      from:fbUid,fromName:$('sidebar-username').textContent||'Sen',
      to:targetUser.id,toName:targetUser.data().displayName||name,
      fromAvatar:myAv,toAvatar:targetUser.data().avatar||null,status:'pending',createdAt:Date.now()
    });
    ok('✓ "'+name+'" için arkadaşlık isteği gönderildi.')
  }catch(err){catchErr('Gönderme',err)}
}
async function acceptFriendRequest(reqId){
  if(!window.db)return;
  var uid=fbUserId();if(!uid)return;
  try {
    var doc=await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(reqId).get();
    if(!doc.exists)return;
    var data=doc.data(),friendId=data.from===uid?data.to:data.from;
    var friendName=data.from===uid?data.toName:data.fromName;
    var friendAvatar=data.from===uid?data.toAvatar||null:data.fromAvatar||null;
    var myAccs=getAccounts(),myAv=null;
    for(var ai=0;ai<myAccs.length;ai++){if(myAccs[ai].id===uid){myAv=myAccs[ai].avatar||null;break}}
      await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(reqId).update({status:'accepted'});
await db.collection(COLLECTIONS.FRIENDS).doc(uid).collection(COLLECTIONS.LIST).doc(friendId).set({id:friendId,name:friendName,avatar:friendAvatar,accepted:Date.now()});
      await db.collection(COLLECTIONS.FRIENDS).doc(friendId).collection(COLLECTIONS.LIST).doc(uid).set({id:uid,name:$('sidebar-username').textContent||'Sen',avatar:myAv,accepted:Date.now()});
    switchFriendsTab('friends')
  }catch(e){switchFriendsTab('friends')}
}
async function withdrawRequest(reqId){
  if(!window.db)return;
  try{if(!window.db)return;await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(reqId).delete();switchFriendsTab('pending')}catch(e){switchFriendsTab('pending')}
}
async function declineFriendRequest(reqId){
  if(!window.db)return;
  try{if(!window.db)return;await db.collection(COLLECTIONS.FRIEND_REQUESTS).doc(reqId).delete();switchFriendsTab('pending')}catch(e){switchFriendsTab('pending')}
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

function startPendingListener(uid){
  if(store._pendingUnsub){store._pendingUnsub()}
  if(store._outgoingUnsub){store._outgoingUnsub()}
  if(!window.db)return;
  store._pendingUnsub=db.collection(COLLECTIONS.FRIEND_REQUESTS).where('to','==',uid).onSnapshot(function(snap){
    var count=0;
    snap.forEach(function(doc){if(doc.data().status==='pending')count++});
    updatePendingBadge(count)
  },function(err){
    if(err)console.error('pendingListener error:',err)
  });
  store._outgoingUnsub=db.collection(COLLECTIONS.FRIEND_REQUESTS).where('from','==',uid).onSnapshot(function(snap){
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
async function removeFriend(friendId,name){
  if(!window.db)return;
  var uid=fbUserId();if(!uid)return;
  function done(){switchFriendsTab('friends')}
  if(friendId){
    try {
      await db.collection(COLLECTIONS.FRIENDS).doc(uid).collection(COLLECTIONS.LIST).doc(friendId).delete();
      db.collection(COLLECTIONS.FRIENDS).doc(friendId).collection(COLLECTIONS.LIST).doc(uid).delete().catch(console.error);
      done()
    }catch(e){done()}
    return
  }
  try {
    var snap=await db.collection(COLLECTIONS.FRIENDS).doc(uid).collection(COLLECTIONS.LIST).where('name','==',name).get();
    snap.forEach(async function(doc){
      var fid=doc.id;
      try {
        await doc.ref.delete();
        db.collection(COLLECTIONS.FRIENDS).doc(fid).collection(COLLECTIONS.LIST).doc(uid).delete().catch(console.error);
        done()
      }catch(e){done()}
    })
  }catch(e){done()}
}

function showFriendsPanel(){
  $('modal-friends').classList.add('active');
  switchFriendsTab('friends')
}
function friendsCacheKey(){return 'friends_'+(fbUserId()||store.activeAccountId||'local')}
function getCachedFriends(){return ls(friendsCacheKey())||[]}
function setCachedFriends(friends){ls(friendsCacheKey(),friends||[])}
async function refreshFriendsCache(){
  var uid=fbUserId();
  if(!window.db||!uid)return getCachedFriends();
  try {
    var snap=await db.collection(COLLECTIONS.FRIENDS).doc(uid).collection(COLLECTIONS.LIST).get();
    var friends=snap.docs.map(function(d){return d.data()});
    setCachedFriends(friends);
    return friends
  }catch(e){return getCachedFriends()}
}


async function switchFriendsTab(tab){
  store._currentFriendsTab=tab;
  document.querySelectorAll('.friends-tab').forEach(function(t){t.style.color='var(--text4)';t.style.background='transparent'});
  var el=document.querySelector('.friends-tab[data-tab="'+tab+'"]');
  if(el){el.style.color='var(--accent)';el.style.background='rgba(129,140,248,.06)'}
  var content=$('friends-content');
  var uid=fbUserId();
  if(tab==='friends'){
    if(!window.db||!uid){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>';return}
    try {
var snap=await db.collection(COLLECTIONS.FRIENDS).doc(uid).collection(COLLECTIONS.LIST).get();
      if(store._currentFriendsTab!==tab)return;
      var friends=snap.docs.map(function(d){return d.data()});
      setCachedFriends(friends);
      if(friends.length===0){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>'}
      else{
        var html='<div style="font-size:11px;color:var(--text4);margin-bottom:8px">'+friends.length+' arkadaş</div>';
        friends.forEach(function(f){
          var fAv=f.avatar;var fAvHtml;if(fAv&&fAv.indexOf('data:')===0){fAvHtml='<img src="'+escJs(sanitizeUrl(fAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="var(--grad)" data-err-text="'+esc(f.name.charAt(0).toUpperCase())+'" data-err-avatar="1">'}else{fAvHtml=esc(f.name.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s" data-action="start-conv" data-friend-name="'+escJs(f.name)+'" data-friend-id="'+escJs(f.id)+'" data-context="friend-menu"><div style="width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;overflow:hidden">'+fAvHtml+'</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text2)">'+esc(f.name)+'</div><div style="font-size:10px;color:var(--text4)">Çevrimiçi</div></div></div>'
        });
        html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)"><button class="btn-primary" data-action="create-group" style="padding:8px 16px;font-size:11px;border-radius:8px;width:100%">Grup Oluştur</button></div>';
        content.innerHTML=html
      }
    }catch(e){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Henüz arkadaşın yok.</div>'}
  }else if(tab==='pending'){
    updatePendingBadge(0);
    if(!window.db||!uid){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>';return}
    try {
      var results=await Promise.all([
        db.collection(COLLECTIONS.FRIEND_REQUESTS).where('to','==',uid).get(),
        db.collection(COLLECTIONS.FRIEND_REQUESTS).where('from','==',uid).get()
      ]);
      if(store._currentFriendsTab!==tab)return;
      var incoming=[]; results[0].forEach(function(d){if(d.data().status==='pending')incoming.push({id:d.id,data:d.data()})});
      var sent=[]; results[1].forEach(function(d){if(d.data().status==='pending')sent.push({id:d.id,data:d.data()})});
      var html='';
      if(incoming.length>0){
        html+='<div style="font-size:11px;color:var(--text4);margin-bottom:6px">Gelen istekler</div>';
        incoming.forEach(function(r){
          var rAv=r.data.fromAvatar;var rAvHtml;if(rAv&&rAv.indexOf('data:')===0){rAvHtml='<img src="'+escJs(sanitizeUrl(rAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="var(--grad)" data-err-text="'+esc(r.data.fromName.charAt(0).toUpperCase())+'" data-err-avatar="1">'}else{rAvHtml=esc(r.data.fromName.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface);margin-bottom:4px"><div style="width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;overflow:hidden">'+rAvHtml+'</div><div style="flex:1;font-size:12px;color:var(--text2)">'+esc(r.data.fromName)+'</div><button data-action="accept-friend" data-req-id="'+escJs(r.id)+'" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(34,197,94,.15);color:#22c55e;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600">Kabul Et</button><button data-action="decline-friend" data-req-id="'+escJs(r.id)+'" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600">Reddet</button></div>'
        })
      }
      if(sent.length>0){
        if(html)html+='<div style="margin-top:10px"></div>';
        html+='<div style="font-size:11px;color:var(--text4);margin-bottom:6px">Bekleyen isteklerin</div>';
        sent.forEach(function(r){
          var sAv=r.data.toAvatar;var sAvHtml;if(sAv&&sAv.indexOf('data:')===0){sAvHtml='<img src="'+escJs(sanitizeUrl(sAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="var(--bg3)" data-err-text="'+esc(r.data.toName.charAt(0).toUpperCase())+'" data-err-avatar="1">'}else{sAvHtml=esc(r.data.toName.charAt(0).toUpperCase())}
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface);margin-bottom:4px"><div style="width:34px;height:34px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--text4);font-size:12px;overflow:hidden">'+sAvHtml+'</div><div style="flex:1;font-size:12px;color:var(--text2)">'+esc(r.data.toName)+'</div><button data-action="withdraw-request" data-req-id="'+escJs(r.id)+'" style="padding:4px 10px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-family:inherit;font-size:10px;font-weight:600">İsteği Geri Al</button></div>'
        })
      }
      if(!html)html='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>';
      content.innerHTML=html
    }catch(e){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text4);font-size:12px">Bekleyen istek yok.</div>'}
  }else if(tab==='add'){
    content.innerHTML='<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px">Kullanıcı Adıyla Ekle</label><input type="text" id="add-friend-input" placeholder="Örn: waxur" style="width:100%;padding:10px 14px;background:var(--input-bg);border:1px solid var(--border2);border-radius:10px;font-family:inherit;font-size:13px;color:var(--text2);outline:none;margin-bottom:8px"><button class="btn-primary" data-action="send-friend-request" style="padding:8px 16px;font-size:11px;border-radius:8px;width:100%">Arkadaşlık İsteği Gönder</button><div id="add-friend-result" style="margin-top:8px;font-size:11px;color:var(--text4)"></div></div>'
  }
}

function dmConvId(uid1,uid2){
  var s=[uid1,uid2].sort();return 'dm_'+s[0]+'_'+s[1]
}
function getConversationPeerId(conv){
  var uid=fbUserId()||store.activeAccountId;if(!conv||conv.isGroup)return null;
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
  for(var i=0;i<store.conversations.length;i++){
    var c=store.conversations[i];if(c.isGroup)continue;
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
  var selfId=fbUserId()||store.activeAccountId;
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
  for(var ci=0;ci<store.conversations.length;ci++){
    var conv=store.conversations[ci];
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
  (async function(){if(window.db&&friendId)try{var snap=await db.collection(COLLECTIONS.USERS).doc(friendId).get();if(snap.exists&&snap.data().avatar){newConv.avatar=snap.data().avatar;renderConversations()}}catch(e){console.error(e)}})();
  store.unshift('conversations', newConv);
  saveConversations();
  // Create/update Firestore conversation with members (idempotent)
  if(window.db&&uid)db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).set({type:'dm',memberIds:memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(console.error);
  renderConversations();
  $('modal-friends').classList.remove('active');
  selectConversation(convId)
}


async function pickGroupAvatar(){
  if(window.electronAPI&&electronAPI.selectFile){
    try{var r=await electronAPI.selectFile();
      if(r&&r.thumb){
        store.groupAvatarDataUrl=r.thumb;
        var picker=$('group-avatar-picker');
        if(picker){picker.innerHTML='<img src="'+escJs(sanitizeUrl(r.thumb))+'" style="width:100%;height:100%;object-fit:cover" data-err-clear="groupAvatarDataUrl">';picker.style.border='none';picker.style.background='transparent'}
        // If editing an existing group, update immediately
        if(store.activeConvId){
          var conv=findConv(store.activeConvId);
          if(conv&&conv.isGroup&&conv.creatorId===store.activeAccountId){
            conv.avatar=r.thumb;
            conv.avatarLetter=conv.name?conv.name.charAt(0).toUpperCase():'G';
            // Update saved groups in localStorage
            var gs=getGroups();
            for(var gi=0;gi<gs.length;gi++){if(gs[gi].id==store.activeConvId){gs[gi].avatar=r.thumb;saveGroups(gs);break}}
            // Update UI
            var headerAvatar=$('chat-header-avatar');
            if(headerAvatar&&store.activeConvId==conv.id)headerAvatar.innerHTML='<img src="'+escJs(sanitizeUrl(r.thumb))+'" style="width:100%;height:100%;object-fit:cover" data-err-avatar="1">';
            addGroupLog(conv.id,'👑 Grup fotoğrafı değiştirildi');
            fbSyncMembers(conv.id);
            if(store.activeConvId)renderMessages(store.activeConvId);
            renderConversations();
            if(store.profilePanelOpen)showProfilePanel()
          }
        }
      }
    }catch(e){console.error(e)}
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
  if(!store.forwardMsgData)return;
  var items=$('forward-contact-list').querySelectorAll('.modal-member-item.selected');
  var caption=$('forward-caption').value.trim();
  for(var fti=0;fti<items.length;fti++){
    var cid=items[fti]._cid;
    if(!cid)continue;
    var conv=findConv(cid);
    if(!conv)continue;
    var fwdTxt=store.forwardMsgData.text||'';
    // E2E encrypt forwarded text for target conversation
    if(store.e2eReady&&window.db&&fwdTxt){var pubKeys=await getRecipientPubKey(cid);if(pubKeys&&(Array.isArray(pubKeys)?pubKeys.length:1)){try{var enc=await e2eEncrypt(fwdTxt,pubKeys);if(enc&&enc.indexOf('🔒')===0){fwdTxt=enc}}catch(e){}}}
    var fwd={
      id:uid(),type:'sent',senderId:fbUserId(),text:fwdTxt,time:timeNow(),
      image:store.forwardMsgData.image||null,video:store.forwardMsgData.video||null,
      audio:store.forwardMsgData.audio||null,duration:store.forwardMsgData.duration||0,
      isForwarded:true,originalSender:store.forwardMsgData.originalSender||($('sidebar-username')&&$('sidebar-username').textContent||''),
      forwardComment:caption||null,sender:($('sidebar-username')&&$('sidebar-username').textContent||'')
    };
    if(fwdTxt!==(store.forwardMsgData.text||'')){fwd.e2e=true;conv.lastMsg='🔒 Mesaj'}else{conv.lastMsg=fwd.text||(fwd.image?'📷 Fotoğraf':(fwd.video?'🎬 Video':(fwd.audio?'🎤 Ses':'')))}if(!store.messages[cid])store.messages[cid]=[];
    store.messages[cid].push(fwd);store.emit('messages');
    conv.lastActivity=Date.now();conv.time=timeNow();
    fbSendMessage(cid,fwd)
  }
  $('modal-forward').classList.remove('active');
  store.forwardMsgData=null;store.forwardingLock=false;
  renderConversations();saveMessages();
  if(store.activeConvId)renderMessages(store.activeConvId)
}
// Forward modal buttons  
var fc=$('forward-close-btn'),fcan=$('forward-cancel-btn'),fsend=$('forward-send-btn');
if(fc)fc.onclick=function(){$('modal-forward').classList.remove('active');store.forwardMsgData=null;store.forwardingLock=false};
if(fcan)fcan.onclick=function(){$('modal-forward').classList.remove('active');store.forwardMsgData=null;store.forwardingLock=false};
if(fsend)fsend.onclick=function(){forwardToSelected()};
function validateGroup(){var n=$('group-name').value.trim(),items=$('group-member-list').querySelectorAll('.modal-member-item.selected');$('group-create-btn').disabled=!(n.length>=1&&items.length>=1)}
function createGroup(){
  var name=$('group-name').value.trim();if(name.length<1)return;
  var items=$('group-member-list').querySelectorAll('.modal-member-item.selected');if(items.length<1)return;
  var initials=name.split(' ').map(function(w){return w.charAt(0).toUpperCase()}).join('').slice(0,2)||'G';
  var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  var gid=uid(),ownerId=fbUserId()||store.activeAccountId;
  var group={id:gid,name:name,avatar:store.groupAvatarDataUrl||initials,avatarLetter:initials,color:colors[Math.floor(Math.random()*colors.length)],isGroup:true,online:true,lastMsg:'Grup oluşturuldu',time:timeNow(),lastActivity:Date.now(),unread:0,members:[],adminIds:[ownerId],creatorId:ownerId};
  var seen={};
  for(var i=0;i<items.length;i++){
    var member=items[i]._memberData||null;
    if(!member&&items[i]._convId)member=makeGroupMemberFromConversation(findConv(items[i]._convId));
    if(!member&&items[i]._memberId)member=makeGroupMemberFromFriend(findFriendByIdOrName(items[i]._memberId,null),colors[(i+1)%colors.length]);
    if(member&&member.id&&!seen[member.id]&&member.id!==ownerId){seen[member.id]=true;group.members.push(member)}
  }
  normalizeGroupMembers(group);
  group.memberIds=getGroupMemberIds(group);
  store.groupAvatarDataUrl=null;store.unshift('conversations', group);saveGroup(group);saveMessages();
  addGroupLog(gid,'Grup "'+name+'" oluşturuldu');
  if(window.db&&fbUserId())db.collection(COLLECTIONS.CONVERSATIONS).doc(gid).set({type:'group',name:group.name,avatar:group.avatar||null,avatarLetter:group.avatarLetter||null,color:group.color||null,creatorId:group.creatorId,adminIds:group.adminIds,memberIds:group.memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(console.error)
  renderConversations();selectConversation(gid);hideGroupModal()}

function renderGroupMembers(selectedIds){
  var ml=$('group-member-list');if(!ml)return;ml.innerHTML='';
  var addedIds={},selected=selectedIds||[],gColors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  function addItem(member,convId,color){
    if(!member||!member.id||member.id===fbUserId()||addedIds[member.id])return;
    addedIds[member.id]=true;
    var sel=selected.indexOf(member.id)>-1||(convId&&selected.indexOf(convId)>-1);
    var d=document.createElement('div');d.className='modal-member-item'+(sel?' selected':'');
    var av=member.avatar,html;if(av&&av.indexOf('data:')===0){html='<img src="'+escJs(sanitizeUrl(av))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+(member.color||color||'var(--grad)')+'" data-err-text="?" data-err-avatar="1">'}else{html='<span>'+esc(av||((member.name||'?').charAt(0).toUpperCase()))+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+(member.color||color||'var(--grad)')+'">'+html+'</div><div class="mm-name">'+esc(member.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');validateGroup()};
    d._memberId=member.id;d._convId=convId||null;d._memberData=member;ml.appendChild(d)
  }
  for(var i=0;i<store.conversations.length;i++){if(!store.conversations[i].isGroup)addItem(makeGroupMemberFromConversation(store.conversations[i]),store.conversations[i].id,store.conversations[i].color)}
  var gf=getCachedFriends();
  for(var fi=0;fi<gf.length;fi++)addItem(makeGroupMemberFromFriend(gf[fi],gColors[fi%gColors.length]),null,gColors[fi%gColors.length])
}

async function newGroup(){
  var curr=$('group-create-btn');
  if(curr)curr.textContent='Oluştur';
  var mh=$('modal-group').querySelector('.modal-header h3');
  if(mh)mh.textContent='Grup Oluştur';
  store.groupAvatarDataUrl=null;
  $('group-name').value='';
  var picker=$('avatar-picker');
  if(picker)picker.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  if(picker)picker.style.border='';
  store.editGroupState=null;
  renderGroupMembers([]);
  validateGroup();
  $('modal-group').classList.add('active');
  await refreshFriendsCache();
  if(!store.editGroupState&&$('modal-group').classList.contains('active')){renderGroupMembers([]);validateGroup()}
}
function hideGroupModal(){closeModal('modal-group')}

// ===== PIN CONVERSATIONS =====
function getPinned(){return ls(STORAGE_KEYS.PINNED)||[]}
function togglePin(id){
  var p=getPinned();
  var idx=p.indexOf(id);
  if(idx>-1)p.splice(idx,1);else p.push(id);
  ls(STORAGE_KEYS.PINNED,p);
  renderConversations()
}
function isPinned(id){var p=getPinned();return p.indexOf(id)>-1}
function saveUnreadCounts(){
  var counts={},lastActs={};
  for(var uci=0;uci<store.conversations.length;uci++){
    var c=store.conversations[uci];
    if(c.unread)counts[c.id]=c.unread;
    if(c.lastActivity)lastActs[c.id]=c.lastActivity
  }
  ls(STORAGE_KEYS.UNREAD,counts);
  ls('lastActivity',lastActs)
}

// ===== CLOSE HELPERS WITH ANIMATION =====

function closeModal(id,cb){
  if(store._closeTimers[id]){clearTimeout(store._closeTimers[id]);delete store._closeTimers[id]}
  var el=$(id);if(!el||!el.classList.contains('active'))return;
  el.classList.add('closing');
  store._closeTimers[id]=setTimeout(function(){el.classList.remove('active','closing');if(cb)cb();delete store._closeTimers[id]},150)
}
// Click outside modals to close
document.addEventListener('mousedown',function(e){
  var overlay=e.target.closest('.modal-overlay');
  if(overlay&&e.target===overlay){
    var id=overlay.id;
    if(id==='modal-delete'){closeModal('modal-delete',function(){hideDeleteModal()});return}
    if(id==='modal-media'){closeModal('modal-media',function(){store.pendingMediaFiles=[];store.mediaThumbCount=0});return}
    if(id==='modal-forward'){closeModal('modal-forward',function(){store.forwardMsgData=null;store.forwardingLock=false});return}
    if(id==='modal-group'){closeModal('modal-group');return}
    closeModal(id)
  }
});

// ===== MUTE / CLOSE =====
function getMuted(){return ls(STORAGE_KEYS.MUTED)||[]}
function isMuted(id){var m=getMuted();for(var i=0;i<m.length;i++){if(m[i]===id)return true}return false}
function toggleMute(id){var m=getMuted();var found=false;for(var i=0;i<m.length;i++){if(m[i]===id){m.splice(i,1);found=true;break}}if(!found)m.push(id);ls(STORAGE_KEYS.MUTED,m);renderConversations()}

function clearConversation(id){
  store.pendingClearConvId=id;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Sohbeti Temizle</h4>'+
    '<p style="color:var(--text4);font-size:12px">Tüm mesajlar kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Temizle';
  $('delete-confirm-btn').onclick=function(){confirmClearConversation()};
  $('modal-delete').classList.add('active')
}
function confirmClearConversation(){
  var id=store.pendingClearConvId;store.pendingClearConvId=null;
  if(!id)return;
  if(store.messages[id]){delete store.messages[id]}
  var conv=findConv(id);
  if(conv){conv.lastMsg='Sohbet temizlendi';conv.lastActivity=Date.now();conv.time=timeNow();conv.unread=0;conv._clearedAt=Date.now()}
  if(store.activeConvId===id){
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
async function fbClearConversationMessages(convId){
  if(!window.db||!fbUserId())return;
  var ts=Date.now();
  var conv=findConv(convId);
  if(conv)conv._clearedAt=ts;
  try {
    var snap=await db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).get();
    var batch=db.batch();
    var count=0;
    snap.forEach(function(doc){
      var cd=doc.data();
      if(cd.createdAt&&cd.createdAt.toMillis&&cd.createdAt.toMillis()<ts){return}
      batch.delete(doc.ref);count++
    });
    if(count>0)batch.commit().catch(console.error);
    db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).update({clearedAt:firebase.firestore.FieldValue.serverTimestamp(),lastMsg:'Sohbet temizlendi',lastActivity:Date.now()}).catch(console.error)
  }catch(e){console.error(e)}
}

function closeConversation(id){
  var conv=findConv(id);
  if(conv){conv.hidden=true}
  fbUnlistenMessages(id);
  fbStopTypingListener();
  stopTyping();
  if(store.activeConvId===id){$('chat-empty').style.display='flex';$('chat-active').style.display='none';store.activeConvId=null}
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
  store._authTransitioning=true;
  // Abort DOM event listeners
  if(store._ac){store._ac.abort();store._ac=new AbortController()}
  // Firebase listeners
  for(var kl in store._fbListeners){store._fbListeners[kl]();delete store._fbListeners[kl]}
  store._fbListeners={};
  store._fbMsgCache={};
  if(store._fbConversationUnsub){store._fbConversationUnsub();store._fbConversationUnsub=null}
  store._convListenerActive=false;
  fbStopTypingListener();

  // Friend request listeners
  if(store._pendingUnsub){store._pendingUnsub();store._pendingUnsub=null}
  if(store._outgoingUnsub){store._outgoingUnsub();store._outgoingUnsub=null}

  // Core data
  store.messages={};
  store.conversations=[];
  store.activeConvId=null;
  store.activeAccountId=null;
  store._convListAnimatedOnce=false;

  // E2E encryption state
  store.e2eReady=false;
  store.e2eKeys=null;
  store._pubKeyCache={};

  // Call state
  if(store.callState==='connected'||store.callState==='ringing'||store.callState==='calling'){endCall()}
  store.callState=null;store.callPeerConn=null;store.callLocalStream=null;
  if(store.callTimerInterval){clearInterval(store.callTimerInterval);store.callTimerInterval=null}
  store.callStartTime=0;store.callMicMuted=false;store.callSpeakerMuted=false;store.pendingCallMsgId=null;
  if(store.callPollTimer){clearInterval(store.callPollTimer);store.callPollTimer=null}
  store.pendingCallData=null;
  fbStopCallSignals();
  stopRingtone();

  // UI state
  store.pendingClearConvId=null;
  store.pendingMediaFiles=[];store.mediaIndex=0;store.mediaThumbCount=0;
  store.pendingCollageDelete=null;store.pendingDeleteMsgId=null;store.pendingSelfDeleteId=null;
  store.pendingDeleteGroupId=null;store.pendingRemoveMember=null;store.pendingRemoveGroup=null;
  store.pendingAlert=false;
  store.contextMenuMsgId=null;store.contextMenuScrollPos=0;store.contextMenuRelY=0;store.contextMenuRelX=0;
  store.editGroupState=null;store.groupAvatarDataUrl=null;
  store.forwardMsgData=null;store.forwardingLock=false;
  store.replyToMsgId=null;store.replyToMsgText='';
  store._frCooldown=0;
  store._searchQuery='';store._showArchived=false;
  store._forceScrollBottom=false;store._hasNewMsg=false;
  store.avatarDataUrl=null;
  if(store.idleTimer){clearTimeout(store.idleTimer);store.idleTimer=null}
  store.prevStatus=null;
  store.currentEmojiCat='face';

  // Typing indicators
  if(store.typingTimer){clearTimeout(store.typingTimer);store.typingTimer=null}
  if(store._typingRemoteUnsub){store._typingRemoteUnsub();store._typingRemoteUnsub=null}
  store._typingLocalUid=null;

  // Voice recording
  if(store.voiceTimer){clearTimeout(store.voiceTimer);store.voiceTimer=null}
  store.audioChunks=[];store.voiceStart=0;
  if(store.animFrame){cancelAnimationFrame(store.animFrame);store.animFrame=null}

  // Audio playback
  if(store.currentAudio){store.currentAudio.pause();store.currentAudio=null}
  store.currentAudioId=null;
  if(store.audioProgressTimer){clearInterval(store.audioProgressTimer);store.audioProgressTimer=null}
  store.seekCache={};

  // Call streams
  if(store.callCamStream){store.callCamStream.getTracks().forEach(function(t){t.stop()});store.callCamStream=null}
  if(store.callScreenStream){store.callScreenStream.getTracks().forEach(function(t){t.stop()});store.callScreenStream=null}

  // Call signals
  if(store._callSignalUnsub){store._callSignalUnsub();store._callSignalUnsub=null}
  store._callSigOfferId=null;
  if(store.vadTimer){clearInterval(store.vadTimer);store.vadTimer=null}

  // Audio test
  if(store.micTestInterval){clearInterval(store.micTestInterval);store.micTestInterval=null}
  if(store.testCamStream){store.testCamStream.getTracks().forEach(function(t){t.stop()});store.testCamStream=null}
  if(store.testMicStream){store.testMicStream.getTracks().forEach(function(t){t.stop()});store.testMicStream=null}

  // Hide all modals/panels
  closeProfilePanel();hideSettings();hideContextMenu();hideAvatarMenu();
  var md=document.querySelectorAll('.modal.active');
  for(var mi=0;mi<md.length;mi++)md[mi].classList.remove('active');

  // Reset chat view to empty state
  var ce=$('chat-empty');var ca=$('chat-active');
  if(ce)ce.style.display='flex';
  if(ca)ca.style.display='none';
  var cl=$('conv-list');if(cl){cl.innerHTML='';cl.classList.remove('no-anim')}
  // Re-init session-scoped listeners (new AbortController already created at top)
  if(typeof initSessionListeners==='function')initSessionListeners()
}

function doLogout(){resetSessionState();store._authTransitioning=false;store._pendingLoginPassword=null;if(window.auth)auth.signOut();goToWelcome()}
function leaveGroup(convId){
  var conv=findConv(convId);if(!conv||!conv.isGroup)return;
  if(window.db&&fbUserId()&&firebase&&firebase.firestore)db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).update({memberIds:firebase.firestore.FieldValue.arrayRemove(fbUserId()),adminIds:firebase.firestore.FieldValue.arrayRemove(fbUserId())}).catch(console.error);
  // Remove from conversations
  for(var lgi=0;lgi<store.conversations.length;lgi++){if(store.conversations[lgi].id===convId){store.conversations.splice(lgi,1);break}}
  var gs=getGroups();
  for(var sgi=gs.length-1;sgi>=0;sgi--){if(gs[sgi].id===convId)gs.splice(sgi,1)}
  saveGroups(gs);
  if(store.activeConvId===convId){store.activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
  closeProfilePanel();renderConversations()
}

function deleteGroup(convId){
  var conv=findConv(convId);if(!conv||!conv.isGroup)return;
  if(conv.creatorId!==store.activeAccountId&&conv.creatorId!==fbUserId()){leaveGroup(convId);return}
  if(window.db&&fbUserId()&&conv.creatorId===fbUserId())db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).delete().catch(console.error);
  // Remove from conversations
  for(var dgi=0;dgi<store.conversations.length;dgi++){if(store.conversations[dgi].id===convId){store.conversations.splice(dgi,1);break}}
  // Remove from saved groups
  var gs=getGroups();
  for(var dgi=0;dgi<gs.length;dgi++){if(gs[dgi].id===convId){gs.splice(dgi,1);break}}
  saveGroups(gs);
  // Clear messages
  delete store.messages[convId];
  if(store.activeConvId===convId){store.activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
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
    var isGroupAdmin=conv.adminIds&&conv.adminIds.indexOf(store.activeAccountId)!==-1;
    var isGroupCreator=conv.creatorId===store.activeAccountId;
    if(isGroupAdmin)items.push({label:'Grubu Düzenle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',action:function(){editGroup(convId)}});
    if(isGroupCreator)items.push({label:'Grubu Sil',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){showDeleteGroupConfirm(convId)}})
    else items.push({label:'Gruptan Ayrıl',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',action:function(){leaveGroup(convId)}})
  }else{
    items.push({label:'Sohbeti Kapat',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',action:function(){closeConversation(convId)}})
  }
  if(!conv.isGroup&&!archived){items.push({sep:true});var gs=[];for(var gi=0;gi<store.conversations.length;gi++){(function(gc){if(gc.isGroup)gs.push({label:gc.name,icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',action:function(){addToGroup(gc.id,convId)}})})(store.conversations[gi])}gs.push({sep:true});gs.push({label:'+ Yeni Grup',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',action:function(){newGroup()}});items.push({label:'Gruba Ekle',icon:'<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',action:function(){},sub:gs})}
  showContextMenu(x,y,items)}
function toggleArchiveView(){store._showArchived=!store._showArchived;renderConversations()}
var showScreen=function(id){document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});if(id){$(id).classList.add('active');store.currentScreen=id}};
var goToWelcome=function(){renderSavedAccounts();showScreen('screen-welcome')};
var goToLogin=function(){showScreen('screen-login');$('login-email').value='';$('login-pass').value='';store.avatarDataUrl=null;validateLogin()};
var goToRegister=function(){var accs=getAccounts();if(accs.length>=3){showAlert('En fazla 3 hesap bulundurabilirsin. Yeni hesap eklemek için önce kayıtlı bir hesabı sil.');return}store.regStep=0;updateRegStep();showScreen('screen-register')};
