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
