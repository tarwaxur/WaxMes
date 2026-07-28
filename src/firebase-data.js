// ===== FIREBASE DATA LAYER =====
function _tsToMs(v){return v&&typeof v.toMillis==='function'?v.toMillis():typeof v==='number'?v:0}

function fbListenConversations(uid){
  if(store._fbConversationUnsub){store._fbConversationUnsub();store._fbConversationUnsub=null}
  if(!window.db)return;
  store._convListenerActive=true;
  var _firstSnapshot=true;
  store._fbConversationUnsub=db.collection(COLLECTIONS.CONVERSATIONS).where('memberIds','array-contains',uid).onSnapshot(function(snap){
    var confirmedIds={};
    snap.docChanges().forEach(function(change){
      var d=change.doc.data(),cid=change.doc.id;
      console.log('[conv]',change.type,cid,d.type||'dm',d.lastMsg?'lastMsg:'+d.lastMsg.substring(0,20):'');
      confirmedIds[cid]=true;
      if(change.type==='removed'){
        for(var rci=store.conversations.length-1;rci>=0;rci--){if(store.conversations[rci].id===cid)store.conversations.splice(rci,1)}
        var rgs=getGroups();for(var rgi=rgs.length-1;rgi>=0;rgi--){if(rgs[rgi].id===cid)rgs.splice(rgi,1)}saveGroups(rgs);
        if(store.activeConvId===cid){store.activeConvId=null;$('chat-empty').style.display='flex';$('chat-active').style.display='none'}
        renderConversations();
        return
      }
      if(change.type==='added'||change.type==='modified'){
        if(d.type==='group'){applyFirestoreGroupConversation(cid,d,uid);return}
        var exists=false;
        for(var ci=0;ci<store.conversations.length;ci++){if(store.conversations[ci].id===cid){exists=true;break}}
        if(!exists){
          var otherId=null;
          for(var mi=0;mi<(d.memberIds||[]).length;mi++){if(d.memberIds[mi]!==uid){otherId=d.memberIds[mi];break}}
          if(otherId){
            // Check if a conversation with same member pair already exists (different ID)
            var alreadyHas=false;
            for(var ci=0;ci<store.conversations.length;ci++){
              var cv=store.conversations[ci];
              if(!cv.isGroup&&cv.memberIds&&cv.memberIds.length===2&&cv.memberIds.indexOf(uid)!==-1&&cv.memberIds.indexOf(otherId)!==-1){alreadyHas=true;break}
            }
            if(!alreadyHas){
              // Deferred: users toplu okuma için sıraya ekle
              if(!store._pendingPeerFetches)store._pendingPeerFetches=[];
              store._pendingPeerFetches.push(otherId,cid,d.lastActivity,d.lastMsg||'',d.lastTime||'');
              // 300ms içinde gelen diğer DM'lerle birleştir, toplu oku
              if(store._pendingPeerTimer)clearTimeout(store._pendingPeerTimer);
              store._pendingPeerTimer=setTimeout(function(){
                var fetches=store._pendingPeerFetches||[];store._pendingPeerFetches=null;store._pendingPeerTimer=null;
                if(fetches.length===0)return;
                var seen={};
                for(var fi=0;fi<fetches.length;fi+=5){
                  var oid=fetches[fi],cid2=fetches[fi+1],la=fetches[fi+2],lm=fetches[fi+3],lt=fetches[fi+4];
                  if(seen[oid])continue;seen[oid]=true;
                  (function(oid2,cid22,la2,lm2,lt2){
                    db.collection(COLLECTIONS.USERS).doc(oid2).get().then(function(uDoc){
                      if(!uDoc.exists)return;
                      var ud=uDoc.data();
                      var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
                      var color=colors[Math.floor(Math.random()*colors.length)];
                      convListenerAddConv({id:cid22,name:ud.displayName||ud.username||'Kullanıcı',avatar:ud.avatar||(ud.displayName||'?').charAt(0).toUpperCase(),color:color,online:ud.online||false,lastMsg:lm2,time:lt2,lastActivity:_tsToMs(la2),unread:0,isGroup:false,memberIds:[uid,oid2]})
                    }).catch(console.error)
                  })(oid,cid2,la,lm,lt)
                }
              },300)
            }
          }
        }else if(change.type==='modified'){
          for(var uci=0;uci<store.conversations.length;uci++){
            if(store.conversations[uci].id===cid){
              store.conversations[uci].lastMsg=d.lastMsg||store.conversations[uci].lastMsg||'';
              store.conversations[uci].lastActivity=_tsToMs(d.lastActivity)||store.conversations[uci].lastActivity||0;
              store.conversations[uci].time=d.lastTime||store.conversations[uci].time||'';
              break
            }
          }
        }
      }
    })
    // İlk snapshot'ta Firestore'da olmayan local konuşmaları temizle
    if(_firstSnapshot){
      _firstSnapshot=false;
      for(var sci=store.conversations.length-1;sci>=0;sci--){
        var sc=store.conversations[sci];
        if(!sc._fromLocal)continue;
        if(!confirmedIds[sc.id]){
          // Bu konuşma localStorage'dan geldi ama Firestore'da yok → temizle
          store.conversations.splice(sci,1)
        }else{
          delete sc._fromLocal
        }
      }
    }
    // Snapshot sonrası dedup: aynı kullanıcıya ait duplicate DM'leri temizle
    deduplicateConversations();
    // Batch-fetch online status for all conversation peers
    fbFetchAllPeerStatuses();
    // Set up realtime online listeners for all conversations
    setTimeout(function(){
      for(var _osi=0;_osi<store.conversations.length;_osi++){
        var _osc=store.conversations[_osi];
        if(!_osc.isGroup&&_osc.id&&!_osc._onlineListenerActive){_osc._onlineListenerActive=true;fbSyncOnlineStatus(_osc.id)}
      }
    },500);
  },function(err){console.error('convListener error:',err);if(typeof showError==='function')showError('Konuşmalar yüklenemedi: '+err.message)})
}

function deduplicateConversations(){
  var uid=fbUserId();if(!uid)return;
  if(store._skipDedup)return;
  var seen={};
  for(var di=store.conversations.length-1;di>=0;di--){
    var dc=store.conversations[di];
    if(dc.isGroup)continue;
    var peerId=null;
    if(dc.memberIds&&dc.memberIds.length===2){
      for(var mi=0;mi<dc.memberIds.length;mi++){if(dc.memberIds[mi]!==uid){peerId=dc.memberIds[mi];break}}
    }
    if(!peerId)continue;
    if(seen[peerId]!==undefined){
      // Duplicate — daha eski/az aktiviteli olanı sil
      var existing=store.conversations[seen[peerId]];
      var keep=existing,remove=dc;
      if((dc.lastActivity||0)>(existing.lastActivity||0)){keep=dc;remove=existing;seen[peerId]=di}
      var ri=store.conversations.indexOf(remove);
      if(ri>-1)store.conversations.splice(ri,1)
    }else{
      seen[peerId]=di
    }
  }
}

function convListenerAddConv(newConv){
  for(var ci=0;ci<store.conversations.length;ci++){if(store.conversations[ci].id===newConv.id)return}
  console.log('[conv] addConv',newConv.name,'act:',newConv.lastActivity);
  newConv.lastMsg='';newConv.time='';
  store.push('conversations', newConv);
  saveConversations();
  fbListenMessages(newConv.id);
  // Render after messages load — updateConvPreview will call renderConversations
  if(!store._newConvRenderTimer)store._newConvRenderTimer=setTimeout(function(){store._newConvRenderTimer=null;renderConversations()},500)
}

function fbStopConversations(){
  if(store._fbConversationUnsub){store._fbConversationUnsub();store._fbConversationUnsub=null}
  store._convListenerActive=false;
}



async function applyFirestoreGroupConversation(gid,gd,uid){
  var mids=gd.memberIds||[];
  var memberFetches=mids.filter(function(mid){return mid!==uid}).map(async function(mid){
    try {
      var uDoc=await db.collection(COLLECTIONS.USERS).doc(mid).get();
      var ud=uDoc.exists?uDoc.data():{};
      var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
      var nm=ud.displayName||ud.username||'Kullanıcı';
      return {id:mid,name:nm,avatar:ud.avatar||nm.charAt(0).toUpperCase(),color:colors[Math.floor(Math.random()*colors.length)],online:!!ud.online,isGroup:false}
    }catch(e){return null}
  });
  try {
    var members=await Promise.all(memberFetches);
    var initials=(gd.name||'G').split(' ').map(function(w){return w.charAt(0).toUpperCase()}).join('').slice(0,2)||'G';
    var group={id:gid,name:gd.name||'Grup',avatar:gd.avatar||initials,avatarLetter:gd.avatarLetter||initials,color:gd.color||'var(--grad)',isGroup:true,online:true,lastMsg:gd.lastMsg||'',time:gd.lastTime||'',lastActivity:gd.lastActivity||Date.now(),unread:0,members:members.filter(Boolean),memberIds:mids,adminIds:gd.adminIds||(gd.creatorId?[gd.creatorId]:mids.length>0?[mids[0]]:[]),creatorId:gd.creatorId||mids[0]};
    normalizeGroupMembers(group);
    var existing=findConv(gid);
    if(existing){
      existing.name=group.name;existing.avatar=group.avatar;existing.avatarLetter=group.avatarLetter;existing.color=group.color;existing.members=group.members;existing.memberIds=group.memberIds;existing.adminIds=group.adminIds;existing.creatorId=group.creatorId;existing.lastActivity=group.lastActivity;
      saveGroup(existing);renderConversations();if(store.activeConvId===gid)renderMessages(gid)
    }else{
      convListenerAddConv(group);saveGroup(group)
    }
  }catch(e){console.error(e)}
}

function fbSyncMembers(convId){
  var conv=findConv(convId);if(!conv||!window.db||!fbUserId())return;
  var mids=conv.isGroup?getGroupMemberIds(conv):(conv.memberIds&&conv.memberIds.length>0?conv.memberIds:[fbUserId()]);
  conv.memberIds=mids;
  if(conv.isGroup)saveGroup(conv);
  var data={memberIds:mids};
  if(conv.isGroup){data.type='group';data.name=conv.name;data.avatar=conv.avatar||null;data.avatarLetter=conv.avatarLetter||null;data.color=conv.color||null;data.creatorId=conv.creatorId||fbUserId();data.adminIds=conv.adminIds||[data.creatorId]}
  db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).set(data,{merge:true}).catch(console.error)
}
async function fbSendMessage(convId,msg){
  if(!window.db||!fbUserId())return;
  var sendData={
    type:msg.type||'text',text:msg.text||'',time:msg.time,edited:!!msg.edited,deleted:!!msg.deleted,
    senderId:msg.senderId||fbUserId(),sender:msg.sender||null,image:msg.image||null,video:msg.video||null,audio:msg.audio||null,
    duration:msg.duration||0,replyTo:msg.replyTo||null,replyText:msg.replyText||null,
    isForwarded:!!msg.isForwarded,forwardComment:msg.forwardComment||null,originalSender:msg.originalSender||null,
    clientId:msg.id,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(!sendData.text&&!sendData.image&&!sendData.video&&!sendData.audio)sendData.text=' ';
  var displayMsg=msg.text;
  if(msg.e2e||(displayMsg&&displayMsg.indexOf('🔒')===0))displayMsg='🔒 Mesaj';
  else if(msg.image)displayMsg='📷 Fotoğraf';
  else if(msg.video)displayMsg='🎬 Video';
  else if(msg.audio)displayMsg='🎤 Ses';
  else displayMsg=msg.text||'';
  try {
    var docRef=await db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).add(sendData);
    if(docRef&&docRef.id&&msg._fbId===undefined){
      msg._fbId=docRef.id;
      saveMessages()
    }
  }catch(e){console.error(e)}
  try{await db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).set({lastActivity:Date.now(),lastMsg:displayMsg,lastTime:msg.time},{merge:true})}catch(e){console.error('[fsm] set fail',e)}
  console.log('[fsm] sent',convId,'msg:',displayMsg.substring(0,30),'act:',Date.now());
  fbSyncMembers(convId)
}

var MSGS_PER_PAGE=50;
function fbListenMessages(convId){
  if(!window.db)return;
  if(store._fbLoaded[convId])return;
  if(store._fbListeners[convId])return;
  var _setupFirebaseUid=fbUserId();
  if(!_setupFirebaseUid)return;
  var conv=findConv(convId);
  var _clearTime=conv&&conv._clearedAt?conv._clearedAt:null;
  if(!store.messages[convId])store.messages[convId]=[];
  // If messages are already cached (from a previous load), restart forward listener
  if(store.messages[convId]&&store.messages[convId].length>0){
    var fwdUnsub=null;
    store._fbListeners[convId]=function(){if(fwdUnsub)fwdUnsub()};
    store._fbLoaded[convId]=true;
    console.log('[msg] cache-loaded',convId,(store.messages[convId]||[]).length,'msgs');
    if(store.activeConvId===convId){renderMessages(convId)}
    var page=store._msgPage[convId];
    if(page&&page.lastTs){startFwdListener(page.lastTs)}else{startFwdListener(null)}
    return
  }
  var page=store._msgPage[convId];
  if(!page){page={oldestDoc:null,hasMore:true,loading:false,initDone:false,lastTs:null};store._msgPage[convId]=page}
  var fwdUnsub=null;
  store._fbListeners[convId]=function(){if(fwdUnsub)fwdUnsub()};
  if(store.activeConvId===convId){renderMessages(convId)}
  // Helper: start forward listener
  function startFwdListener(cursor){
    if(fwdUnsub)return;
    var q=db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).orderBy('createdAt','asc');
    if(cursor)q=q.startAfter(cursor);
    fwdUnsub=q.onSnapshot(function(snapshot){
      if(store._authTransitioning)return;
      var curUid=fbUserId();
      if(!curUid||curUid!==_setupFirebaseUid)return;
      snapshot.docChanges().forEach(function(change){
        if(change.type==='added'){
          var d=change.doc.data();var mid=change.doc.id;
          if(_clearTime&&d.createdAt&&d.createdAt.toMillis&&d.createdAt.toMillis()<_clearTime)return;
          if(!store.messages[convId])store.messages[convId]=[];
          var exists=false;
          for(var fi=0;fi<store.messages[convId].length;fi++){if(store.messages[convId][fi]._fbId===mid){exists=true;break}}
          if(!exists){
            var linked=false;
            var clientId=d.clientId||d.client_id||null;
            for(var li=0;li<store.messages[convId].length;li++){
              var lm=store.messages[convId][li];
              if(!lm._fbId){
                if(clientId&&lm.id===clientId){lm._fbId=mid;linked=true;break}
                if(!clientId&&lm.text===d.text&&lm.time===d.time&&lm.type==='sent'&&lm.senderId===curUid){lm._fbId=mid;linked=true;break}
              }
            }
            if(!linked){
            var msgType=d.senderId!==undefined?(d.senderId===curUid?'sent':'received'):'received';
            if(d.type==='log')msgType='log';
            var m={id:uid(),type:msgType,senderId:d.senderId||null,text:d.text||'',time:d.time||timeNow(),edited:!!d.edited,deleted:!!d.deleted,sender:d.sender||null,image:d.image||null,video:d.video||null,audio:d.audio||null,duration:d.duration||0,replyTo:d.replyTo||null,replyText:d.replyText||null,isForwarded:!!d.isForwarded,forwardComment:d.forwardComment||null,originalSender:d.originalSender||null,_fbId:mid};
            if(d.e2e||(d.text&&d.text.indexOf('🔒')===0))m.e2e=true;
            store.messages[convId].push(m);;
            if(store.activeConvId===convId){
              var el=$('chat-messages'),nearBottom=el&&el.scrollHeight-el.scrollTop-el.clientHeight<200;
              if(!nearBottom&&m.type==='received'){store._hasNewMsg=true;var cv=findConv(convId);if(cv){cv.unread=(cv.unread||0)+1;saveUnreadCounts()}}
              if(m.image||m.video||m.audio||m.deleted||m.type==='log'){renderMessages(convId)}else{appendSingleMessage(convId,m)}
            }else{
              var cv=findConv(convId);
              if(cv&&m.type==='received'){cv.unread=(cv.unread||0)+1;saveUnreadCounts()}
            }
            updateConvPreview(convId,d,curUid)
            }
          }
        }else if(change.type==='modified'){
          var d=change.doc.data();var mid=change.doc.id;
          if(d.deleted){
            for(var _mi=0;_mi<store.messages[convId].length;_mi++){
              if(store.messages[convId][_mi]._fbId===mid){
                store.messages[convId][_mi].deleted=true;store.messages[convId][_mi].deletedByMe=d.deletedByMe||false;
                store.messages[convId][_mi].text='';store.messages[convId][_mi].audio='';store.messages[convId][_mi].image='';store.messages[convId][_mi].video='';
                if(store.activeConvId===convId)renderMessages(convId);
                updateConvPreview(convId,d,curUid);
                break
              }
            }
          }
        }
      })
    },function(err){if(err)console.error('onSnapshot error:',err)})
  }
  // Load initial batch from Firestore
  db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).orderBy('createdAt','desc').limit(MSGS_PER_PAGE).get().then(function(snap){
    if(store._authTransitioning||fbUserId()!==_setupFirebaseUid)return;
    page.initDone=true;
    var docs=snap.docs,loaded=docs.length;
    if(loaded<MSGS_PER_PAGE)page.hasMore=false;
    if(loaded>0)page.oldestDoc=docs[loaded-1];
    var newMsgs=[];
    for(var di=docs.length-1;di>=0;di--){
      var d=docs[di].data(),mid=docs[di].id;
      if(_clearTime&&d.createdAt&&d.createdAt.toMillis&&d.createdAt.toMillis()<_clearTime)continue;
      if(d.createdAt&&(!page.lastTs||d.createdAt.toMillis()>page.lastTs.toMillis()))page.lastTs=d.createdAt;
      var exists=false;
      for(var fi=0;fi<store.messages[convId].length;fi++){if(store.messages[convId][fi]._fbId===mid){exists=true;break}}
      if(exists)continue;
      var linked=false;
      var clientId=d.clientId||null;
      for(var li=0;li<store.messages[convId].length;li++){
        var lm=store.messages[convId][li];
        if(!lm._fbId){
          if(clientId&&lm.id===clientId){lm._fbId=mid;linked=true;break}
          if(!clientId&&lm.text===d.text&&lm.time===d.time&&lm.type==='sent'&&lm.senderId===_setupFirebaseUid){lm._fbId=mid;linked=true;break}
        }
      }
      if(!linked){
        var msgType=d.senderId!==undefined?(d.senderId===_setupFirebaseUid?'sent':'received'):'received';
        if(d.type==='log')msgType='log';
        var m={id:uid(),type:msgType,senderId:d.senderId||null,text:d.text||'',time:d.time||timeNow(),edited:!!d.edited,deleted:!!d.deleted,sender:d.sender||null,image:d.image||null,video:d.video||null,audio:d.audio||null,duration:d.duration||0,replyTo:d.replyTo||null,replyText:d.replyText||null,isForwarded:!!d.isForwarded,forwardComment:d.forwardComment||null,originalSender:d.originalSender||null,_fbId:mid};
        if(d.e2e||(d.text&&d.text.indexOf('🔒')===0))m.e2e=true;
        newMsgs.push(m)
      }
    }
    if(newMsgs.length>0){
      var curLen=store.messages[convId].length;
      if(curLen===0){store.messages[convId]=newMsgs;if(store.activeConvId===convId){renderMessages(convId)}}else{store.messages[convId]=newMsgs.concat(store.messages[convId])}
      
    }
    if(loaded>0&&docs[0].data())updateConvPreview(convId,docs[0].data(),_setupFirebaseUid);
    else if(loaded===0){
      var conv=findConv(convId);
      if(conv&&!conv.lastMsg){
        conv.lastMsg='Sohbet temizlendi';conv.time='';
        db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).update({lastMsg:'Sohbet temizlendi',lastTime:''}).catch(function(){})
      }
    }
    store._fbLoaded[convId]=true;
    console.log('[msg] batch-loaded',convId,loaded,'docs');
    startFwdListener(page.lastTs)
  }).catch(function(e){console.error('fbListenMessages init error:',e);page.initDone=true;startFwdListener(null)});
}

function updateConvPreview(convId,d,curUid){
  var conv=findConv(convId);if(!conv||!d)return;
  // Check local messages for a decrypted version
  var localDecrypted=null;
  var msgs=store.messages[convId];
  if(msgs){for(var upi=msgs.length-1;upi>=0;upi--){if(msgs[upi]._decrypted&&msgs[upi]._fbId){localDecrypted=msgs[upi]._decrypted;break}}}
  var preview=d.lastMsg||d.text||'';
  if(d.deleted)preview=d.deletedByMe?'Bu mesajı sildiniz':'Bu mesaj silindi';
  else if(d.image)preview='📷 Fotoğraf';
  else if(d.video)preview='🎬 Video';
  else if(d.audio)preview='🎤 Ses';
  else if(localDecrypted)preview=localDecrypted;
  else if(preview.indexOf('🔒')===0){preview=''}
  conv.lastMsg=preview;
  var _act=_tsToMs(d.lastActivity);
  if(_act>0)conv.lastActivity=_act;
  conv.time=d.lastTime||d.time||timeNow();
  saveMessages();
  console.log('[upd] preview',conv.name,'=',preview.substring(0,30),'act:',conv.lastActivity);
  if(!store._reorderTimer){store._reorderTimer=setTimeout(function(){store._reorderTimer=null;renderConversations()},300)}
}

function loadMoreMessages(convId){
  var page=store._msgPage[convId];
  if(!page||!page.hasMore||page.loading||!page.oldestDoc)return;
  page.loading=true;
  var curUid=fbUserId();
  db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).orderBy('createdAt','desc').startAfter(page.oldestDoc).limit(MSGS_PER_PAGE).get().then(function(snap){
    if(store._authTransitioning||fbUserId()!==curUid){page.loading=false;return}
    var docs=snap.docs;
    if(docs.length<MSGS_PER_PAGE)page.hasMore=false;
    if(docs.length>0)page.oldestDoc=docs[docs.length-1];
    var oldMsgs=[];
    for(var di=docs.length-1;di>=0;di--){
      var d=docs[di].data(),mid=docs[di].id;
      var exists=false;
      for(var fi=0;fi<store.messages[convId].length;fi++){if(store.messages[convId][fi]._fbId===mid){exists=true;break}}
      if(exists)continue;
      var msgType=d.senderId!==undefined?(d.senderId===curUid?'sent':'received'):'received';
      var m={id:uid(),type:msgType,senderId:d.senderId||null,text:d.text||'',time:d.time||timeNow(),edited:!!d.edited,deleted:!!d.deleted,sender:d.sender||null,image:d.image||null,video:d.video||null,audio:d.audio||null,duration:d.duration||0,replyTo:d.replyTo||null,replyText:d.replyText||null,isForwarded:!!d.isForwarded,forwardComment:d.forwardComment||null,originalSender:d.originalSender||null,_fbId:mid};
      if(d.e2e||(d.text&&d.text.indexOf('🔒')===0))m.e2e=true;
      oldMsgs.push(m)
    }
    if(oldMsgs.length>0){
      store.messages[convId]=oldMsgs.concat(store.messages[convId]);
    }
    page.loading=false;
    if(store.activeConvId===convId){
      store._preserveScrollBottom=true;
      renderMessages(convId)
    }
    var loadMoreEl=$('load-more');
    if(loadMoreEl)loadMoreEl.style.display=page.hasMore?'flex':'none'
  }).catch(function(e){console.error('loadMoreMessages error:',e);page.loading=false})
}

function fbFetchAllPeerStatuses(){
  if(!window.db||!fbUserId())return;
  var peerIds={};
  for(var fci=0;fci<store.conversations.length;fci++){
    var c=store.conversations[fci];
    if(c.isGroup)continue;
    for(var fmi=0;fmi<(c.memberIds||[]).length;fmi++){
      if(c.memberIds[fmi]!==fbUserId())peerIds[c.memberIds[fmi]]=true
    }
  }
  var ids=Object.keys(peerIds);
  if(!ids.length)return;
  // Batch fetch in chunks of 10 (Firestore 'in' limit)
  var chunks=[];for(var fci=0;fci<ids.length;fci+=10)chunks.push(ids.slice(fci,fci+10));
  Promise.all(chunks.map(function(chunk){
    return db.collection(COLLECTIONS.USERS).where('__name__','in',chunk).get().then(function(snap){
      snap.forEach(function(doc){
        var d=doc.data();
        var uid=doc.id;
        peerIds[uid]=d.online?true:false;
        for(var ci=0;ci<store.conversations.length;ci++){
          var c=store.conversations[ci];
          if(!c.isGroup&&c.memberIds&&c.memberIds.indexOf(uid)!==-1&&c.memberIds.indexOf(fbUserId())!==-1){
            c.online=!!d.online;
            c._status=d.status||STATUS.ONLINE;
            c._lastSeen=d.lastSeen?d.lastSeen.toMillis?d.lastSeen.toMillis():d.lastSeen:null
          }
        }
      })
    }).catch(function(){})
  })).then(function(){
    var cl=$('conv-list');
    if(cl){
      var items=cl.querySelectorAll('.conv-item');
      for(var _fi=0;_fi<items.length;_fi++){
        var ci=items[_fi];var cid=ci.dataset.id;var c=findConv(cid);if(!cid||!c)continue;
        var av=ci.querySelector('.conv-avatar');if(!av)continue;
        var _online=isConvOnline(c);
        av.classList.toggle('online',_online);av.classList.toggle('offline',!_online)
      }
    }
  }).catch(function(){})
}

function fbUnlistenMessages(convId){
  if(!convId)return;
  if(store._fbListeners[convId]){store._fbListeners[convId]();delete store._fbListeners[convId]}
  delete store._fbLoaded[convId]
}

function fbUpdateOnlineStatus(online,status,uid){
  if(!window.db)return;
  var targetUid=uid||fbUserId();
  if(!targetUid)return;
  var data={online:online,lastSeen:Date.now()};
  if(status!==undefined)data.status=status;
  db.collection(COLLECTIONS.USERS).doc(targetUid).update(data).catch(console.error)
}
function fbSyncOnlineStatus(convId){
  if(!window.db||!fbUserId())return;
  var conv=findConv(convId);if(!conv||conv.isGroup)return;
  if(store._onlineStatusListeners[convId]){store._onlineStatusListeners[convId]();delete store._onlineStatusListeners[convId]}
  for(var mi=0;mi<(conv.memberIds||[]).length;mi++){
    if(conv.memberIds[mi]!==fbUserId()){
      (function(oid){
        store._onlineStatusListeners[convId]=db.collection(COLLECTIONS.USERS).doc(oid).onSnapshot(function(udoc){
          if(!udoc.exists)return;
          var uData=udoc.data();
          conv.online=!!uData.online;
          conv._status=uData.status||STATUS.ONLINE;
          conv._lastSeen=uData.lastSeen?uData.lastSeen.toMillis?uData.lastSeen.toMillis():uData.lastSeen:null;
          var statusEl=$('chat-header-status');
          if(statusEl)statusEl.textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv);
          var cl=$('conv-list');
          if(cl){
            var item=cl.querySelector('.conv-item[data-id="'+escJs(convId)+'"]');
            if(item){
              var av=item.querySelector('.conv-avatar');
              if(av){
                var _online=isConvOnline(conv);
                av.classList.toggle('online',_online);
                av.classList.toggle('offline',!_online)
              }
            }
          }
        },function(){})
      })(conv.memberIds[mi])
    }
  }
}

async function fbUploadFile(dataUrl,path){
  if(!window.storage) return dataUrl;
  try {
    var ref=storage.ref(path);
    await ref.putString(dataUrl,'data_url');
    return await ref.getDownloadURL()
  }catch(e){return dataUrl}
}

// Update online status on visibility change
document.addEventListener('visibilitychange',function(){
  if(!window.db)return;
  if(document.hidden){
    fbUpdateOnlineStatus(false)
  }else{
    fbUpdateOnlineStatus(true,store.currentStatus||STATUS.ONLINE)
  }
})


function getArchived(){return ls(STORAGE_KEYS.ARCHIVED)||[]}
function isArchived(id){var a=getArchived();return a.indexOf(id)>-1}
function toggleArchive(id){
  var a=getArchived();var i=a.indexOf(id);
  if(i>-1)a.splice(i,1);else a.push(id);
  ls(STORAGE_KEYS.ARCHIVED,a);renderConversations()
}

// ===== MESSAGE & CONVERSATION PERSISTENCE =====
var _saveTimer=null;
function saveMessages(){
  if(!store.activeAccountId)return;
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null}
  _saveTimer=setTimeout(function(){_saveTimer=null;flushSave()},800)
}
function flushSave(){
  if(!store.activeAccountId)return;
  ls(STORAGE_KEYS.MESSAGES+'_'+store.activeAccountId,store.messages);
  saveConversations();
  if(window.electronAPI&&electronAPI.safeEncrypt){
    var data=JSON.stringify(store.messages);
    if(typeof data==='string'&&data.length<5000000){
      electronAPI.safeEncrypt(data).then(function(enc){if(enc)localStorage.setItem('wm_messages_'+store.activeAccountId,enc)}).catch(console.error)
    }
    var cdata=JSON.stringify(store.conversations);
    if(typeof cdata==='string'&&cdata.length<5000000){
      electronAPI.safeEncrypt(cdata).then(function(cenc){if(cenc)localStorage.setItem('wm_conversations_'+store.activeAccountId,cenc)}).catch(console.error)
    }
  }
}
async function loadMessages(){
  if(!store.activeAccountId)return;
  store.messages={};
  var loaded=false;
  if(window.electronAPI&&electronAPI.safeDecrypt){
    var enc=localStorage.getItem('wm_messages_'+store.activeAccountId);
    if(enc){var dec=await electronAPI.safeDecrypt(enc);if(dec){try{store.messages=JSON.parse(dec);loaded=true}catch(e){}}}
    var cenc=localStorage.getItem('wm_conversations_'+store.activeAccountId);
    if(cenc){var cdec=await electronAPI.safeDecrypt(cenc);if(cdec){try{store.conversations=JSON.parse(cdec)}catch(e){}}}
  }
  if(!loaded){var m=ls(STORAGE_KEYS.MESSAGES+'_'+store.activeAccountId);if(m)store.messages=m}
}
function saveConversations(){
  if(!store.activeAccountId)return;
  ls(STORAGE_KEYS.CONVERSATIONS+'_'+store.activeAccountId,store.conversations);
  // Also save to per-account backup
  ls(STORAGE_KEYS.CONV_BACKUP+'_'+store.activeAccountId,{convs:store.conversations});
  // Sync LAST_ACTIVITY so loadConversations doesn't override with stale data
  var lastActs={};
  for(var _sci=0;_sci<store.conversations.length;_sci++){var _sc=store.conversations[_sci];if(_sc.lastActivity)lastActs[_sc.id]=_sc.lastActivity}
  ls(STORAGE_KEYS.LAST_ACTIVITY,lastActs)
}
function loadConversations(){
  if(store.activeAccountId){
    var c=ls(STORAGE_KEYS.CONVERSATIONS+'_'+store.activeAccountId);
    if(c&&c.length>0)return c;
    // Try backup
    var bk=ls(STORAGE_KEYS.CONV_BACKUP+'_'+store.activeAccountId);
    if(bk&&bk.convs&&bk.convs.length>0)return bk.convs
  }
  return null
}

// Init
(function initMsgs(){
  if(store.activeAccountId){var saved=ls(STORAGE_KEYS.MESSAGES+'_'+store.activeAccountId);if(saved)store.messages=saved}
})();

// Save on close
window.addEventListener('beforeunload',function(){
  if(typeof flushRenderConversations==='function')flushRenderConversations();
  if(store.activeAccountId){saveConversations();flushSave()}
  fbUpdateOnlineStatus(false)
});
