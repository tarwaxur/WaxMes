// ===== TOS =====
function showTos(){$('modal-tos').classList.add('active')}
function hideTos(){$('modal-tos').classList.remove('active')}
function acceptTos(){$('reg-terms').checked=true;hideTos();validateRegister()}

// ===== STATUS =====

function updateStatusUI(s){currentStatus=s;
  var sidebar=$('sidebar-status');if(sidebar){var sd=sidebar.querySelector('.sd-dot');var st=$('sidebar-status-text');if(sd)sd.className='sd-dot';if(s==='online'){if(sd)sd.classList.add('sd-online');if(st)st.textContent='Çevrimiçi'}else if(s==='idle'){if(sd)sd.classList.add('sd-idle');if(st)st.textContent='Boşta'}else if(s==='dnd'){if(sd)sd.classList.add('sd-dnd');if(st)st.textContent='Rahatsız Etme'}}
  var ad=$('avatar-dropdown').querySelector('.ad-status');if(ad){var addot=ad.querySelector('.sd-dot');var adtxt=ad.querySelector('#ad-status-text')||ad.querySelector('span:last-child');if(addot)addot.className='sd-dot ad-dot';if(s==='online'){if(addot)addot.classList.add('sd-online');if(adtxt)adtxt.textContent='Çevrimiçi'}else if(s==='idle'){if(addot)addot.classList.add('sd-idle');if(adtxt)adtxt.textContent='Boşta'}else if(s==='dnd'){if(addot)addot.classList.add('sd-dnd');if(adtxt)adtxt.textContent='Rahatsız Etme'}}
}

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
function setStatus(s,skipSave){updateStatusUI(s);if(!skipSave)ls('status_'+activeAccountId,s);hideAvatarMenu();fbUpdateOnlineStatus(true,s);if(window.db&&fbUserId()){db.collection('users').doc(fbUserId()).update({status:s}).catch(console.error)}}

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
      db.collection('friends').doc(friendId).collection('list').doc(uid).delete().catch(console.error);
      done()
    }).catch(done);
    return
  }
  db.collection('friends').doc(uid).collection('list').where('name','==',name).get().then(function(snap){
    snap.forEach(function(doc){
      var fid=doc.id;
      doc.ref.delete().then(function(){
        db.collection('friends').doc(fid).collection('list').doc(uid).delete().catch(console.error);
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
  if(window.db&&friendId)db.collection('users').doc(friendId).get().then(function(snap){if(snap.exists&&snap.data().avatar){newConv.avatar=snap.data().avatar;renderConversations()}}).catch(console.error);
  conversations.unshift(newConv);
  saveConversations();
  // Create/update Firestore conversation with members (idempotent)
  if(window.db&&uid)db.collection('conversations').doc(convId).set({type:'dm',memberIds:memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(console.error);
  renderConversations();
  $('modal-friends').classList.remove('active');
  selectConversation(convId)
}


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
  if(window.db&&fbUserId())db.collection('conversations').doc(gid).set({type:'group',name:group.name,avatar:group.avatar||null,avatarLetter:group.avatarLetter||null,color:group.color||null,creatorId:group.creatorId,adminIds:group.adminIds,memberIds:group.memberIds,createdAt:Date.now(),lastActivity:Date.now()},{merge:true}).catch(console.error)
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
    if(count>0)batch.commit().catch(console.error);
    db.collection('conversations').doc(convId).update({clearedAt:firebase.firestore.FieldValue.serverTimestamp(),lastMsg:'Sohbet temizlendi',lastActivity:Date.now()}).catch(console.error)
  }).catch(console.error)
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
  if(window.db&&fbUserId()&&firebase&&firebase.firestore)db.collection('conversations').doc(convId).update({memberIds:firebase.firestore.FieldValue.arrayRemove(fbUserId()),adminIds:firebase.firestore.FieldValue.arrayRemove(fbUserId())}).catch(console.error);
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
  if(window.db&&fbUserId()&&conv.creatorId===fbUserId())db.collection('conversations').doc(convId).delete().catch(console.error);
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
var showScreen=function(id){document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});if(id){$(id).classList.add('active');currentScreen=id}};
var goToWelcome=function(){renderSavedAccounts();showScreen('screen-welcome')};
var goToLogin=function(){showScreen('screen-login');$('login-email').value='';$('login-pass').value='';avatarDataUrl=null;validateLogin()};
var goToRegister=function(){var accs=getAccounts();if(accs.length>=3){showAlert('En fazla 3 hesap bulundurabilirsin. Yeni hesap eklemek için önce kayıtlı bir hesabı sil.');return}regStep=0;updateRegStep();showScreen('screen-register')};
