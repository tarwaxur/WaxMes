// ===== FIREBASE DATA LAYER =====

function fbListenConversations(uid){
  if(store._fbConversationUnsub){store._fbConversationUnsub();store._fbConversationUnsub=null}
  if(!window.db)return;
  store._convListenerActive=true;
  store._fbConversationUnsub=db.collection(COLLECTIONS.CONVERSATIONS).where('memberIds','array-contains',uid).onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      var d=change.doc.data(),cid=change.doc.id;
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
            (async function(oid,cid2){
              try {
                var uDoc=await db.collection(COLLECTIONS.USERS).doc(oid).get();
                if(!uDoc.exists)return;
                var ud=uDoc.data();
                var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
                var color=colors[Math.floor(Math.random()*colors.length)];
                var newConv={id:cid2,name:ud.displayName||ud.username||'Kullanıcı',avatar:ud.avatar||(ud.displayName||'?').charAt(0).toUpperCase(),color:color,online:ud.online||false,lastMsg:'',time:'',unread:0,isGroup:false,memberIds:[uid,oid]};
                convListenerAddConv(newConv)
              }catch(e){console.error(e)}
            })(otherId,cid)
            }
          }
        }
      }
    })
  },function(err){if(err)console.error('convListener error:',err)})
}

function convListenerAddConv(newConv){
  for(var ci=0;ci<store.conversations.length;ci++){if(store.conversations[ci].id===newConv.id)return}
  store.push('conversations', newConv);
  saveConversations();
  renderConversations();
  fbListenMessages(newConv.id)
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
    var group={id:gid,name:gd.name||'Grup',avatar:gd.avatar||initials,avatarLetter:gd.avatarLetter||initials,color:gd.color||'var(--grad)',isGroup:true,online:true,lastMsg:gd.lastMsg||'',time:gd.lastTime||'',lastActivity:gd.lastActivity||Date.now(),unread:0,members:members.filter(Boolean),memberIds:mids,adminIds:gd.adminIds||[gd.creatorId].filter(Boolean),creatorId:gd.creatorId||mids[0]};
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
  try {
    var docRef=await db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).add(sendData);
    if(docRef&&docRef.id&&msg._fbId===undefined){
      msg._fbId=docRef.id;
      saveMessages()
    }
  }catch(e){console.error(e)}
  db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).set({lastActivity:Date.now(),lastMsg:displayMsg,lastTime:msg.time},{merge:true}).catch(console.error);
  fbSyncMembers(convId)
}

function fbListenMessages(convId){
  if(!window.db||store._fbListeners[convId])return;
  // Capture the Firebase UID at listener setup time to prevent cross-account contamination
  var _setupFirebaseUid=fbUserId();
  if(!_setupFirebaseUid)return;
  // Check for clearedAt to skip old messages on restart
  var _clearTime=null;
  var conv=findConv(convId);
  if(conv&&conv._clearedAt)_clearTime=conv._clearedAt;
  store._fbListeners[convId]=db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.MESSAGES).orderBy('createdAt','asc').onSnapshot(function(snapshot){
    // Skip if account has changed since listener was set up
    if(store._authTransitioning)return;
    var curUid=fbUserId();
    if(!curUid||curUid!==_setupFirebaseUid)return;
    snapshot.docChanges().forEach(function(change){
      if(change.type==='added'){
        var d=change.doc.data();var mid=change.doc.id;
        // Skip messages that were cleared
        if(_clearTime&&d.createdAt&&d.createdAt.toMillis&&d.createdAt.toMillis()<_clearTime){return}
        if(!store.messages[convId])store.messages[convId]=[];
        var exists=false;
        for(var fi=0;fi<store.messages[convId].length;fi++){if(store.messages[convId][fi]._fbId===mid){exists=true;break}}
        if(!exists){
          var linked=false;
          for(var li=0;li<store.messages[convId].length;li++){
            var lm=store.messages[convId][li];
            if(!lm._fbId&&lm.text===d.text&&lm.time===d.time&&lm.type==='sent'&&lm.senderId===curUid){
              lm._fbId=mid;linked=true;break
            }
          }
          if(!linked){
          var msgType=d.senderId!==undefined?(d.senderId===curUid?'sent':'received'):'received';
          var m={id:uid(),type:msgType,senderId:d.senderId||null,text:d.text||'',time:d.time||timeNow(),edited:!!d.edited,deleted:!!d.deleted,sender:d.sender||null,image:d.image||null,video:d.video||null,audio:d.audio||null,duration:d.duration||0,replyTo:d.replyTo||null,replyText:d.replyText||null,isForwarded:!!d.isForwarded,forwardComment:d.forwardComment||null,originalSender:d.originalSender||null,_fbId:mid};
          if(d.e2e||(d.text&&d.text.indexOf('🔒')===0))m.e2e=true;
          store.messages[convId].push(m);store.emit('messages');
          if(store.activeConvId===convId){
            var el=$('chat-messages'),nearBottom=el&&el.scrollHeight-el.scrollTop-el.clientHeight<200;
            if(!nearBottom&&m.type==='received'){store._hasNewMsg=true;var cv=findConv(convId);if(cv){cv.unread=(cv.unread||0)+1;saveUnreadCounts()}}
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
  if(store._fbListeners[convId]){store._fbListeners[convId]();delete store._fbListeners[convId]}
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
  // Unsubscribe previous listener for this conv
  if(store._onlineStatusListeners[convId]){store._onlineStatusListeners[convId]();delete store._onlineStatusListeners[convId]}
  for(var mi=0;mi<(conv.memberIds||[]).length;mi++){
    if(conv.memberIds[mi]!==fbUserId()){
      (function(oid){
        store._onlineStatusListeners[convId]=db.collection(COLLECTIONS.USERS).doc(oid).onSnapshot(function(udoc){
          if(!udoc.exists)return;
          var uData=udoc.data();
          conv.online=!!uData.online;
          conv._status=uData.status||STATUS.ONLINE;
          var statusEl=$('chat-header-status');
          if(statusEl)statusEl.textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv);
          renderConversations()
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
async function saveMessages(){
  if(!store.activeAccountId)return;
  ls(STORAGE_KEYS.MESSAGES+'_'+store.activeAccountId,store.messages);
  saveConversations();
  if(window.electronAPI&&electronAPI.safeEncrypt){
    var data=JSON.stringify(store.messages);
    if(typeof data==='string'&&data.length<5000000){
      var enc=await electronAPI.safeEncrypt(data);
      if(enc)localStorage.setItem('wm_messages_'+store.activeAccountId,enc)
    }
    var cdata=JSON.stringify(store.conversations);
    if(typeof cdata==='string'&&cdata.length<5000000){
      var cenc=await electronAPI.safeEncrypt(cdata);
      if(cenc)localStorage.setItem('wm_conversations_'+store.activeAccountId,cenc)
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
  // Also save to global backup
  ls(STORAGE_KEYS.CONV_BACKUP,{id:store.activeAccountId,convs:store.conversations})
}
function loadConversations(){
  if(store.activeAccountId){
    var c=ls(STORAGE_KEYS.CONVERSATIONS+'_'+store.activeAccountId);
    if(c&&c.length>0)return c;
    // Try backup
    var bk=ls(STORAGE_KEYS.CONV_BACKUP);
    if(bk&&bk.id===store.activeAccountId&&bk.convs&&bk.convs.length>0)return bk.convs
  }
  return null
}

// Init
(function initMsgs(){
  if(store.activeAccountId){var saved=ls(STORAGE_KEYS.MESSAGES+'_'+store.activeAccountId);if(saved)store.messages=saved}
})();

// Save on close
window.addEventListener('beforeunload',function(){
  if(store.activeAccountId){saveConversations();saveMessages()}
  fbUpdateOnlineStatus(false)
});
