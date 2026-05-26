// ===== MAIN APP =====
async function showApp(profileOrUsername,display,email,avatar,status,bio,password){
  var profile=(profileOrUsername&&typeof profileOrUsername==='object')?profileOrUsername:{username:profileOrUsername,displayName:display,email:email,avatar:avatar,status:status,bio:bio,password:password};
  resetSessionState();
  status=profile.status||STATUS.ONLINE;store.currentStatus=status;
  try{
    var acc=mergeAccountProfile(profile);
    status=acc.status||status||STATUS.ONLINE;store.currentStatus=status;
    showScreen(null);
    var appMain=$('app-main');if(appMain)appMain.classList.add('active');
    syncSidebarProfile(acc,status);
    await loadMessages();
    var savedStatus=ls(STORAGE_KEYS.STATUS+store.activeAccountId);if(savedStatus)updateStatusUI(savedStatus);
    // Load conversations: merge encrypted + localStorage data
    var localConvs=loadConversations();
    if(localConvs&&localConvs.length>0){
      for(var lci=0;lci<localConvs.length;lci++){
        var exists=false;
        for(var eci=0;eci<store.conversations.length;eci++){if(store.conversations[eci].id===localConvs[lci].id){exists=true;break}}
        if(!exists)store.push('conversations', localConvs[lci])
      }
    }
    var savedGroups=getGroups();
    for(var i=0;i<savedGroups.length;i++){
      normalizeGroupMembers(savedGroups[i]);savedGroups[i].memberIds=getGroupMemberIds(savedGroups[i]);
      var exists=false;
      for(var gci=0;gci<store.conversations.length;gci++){if(store.conversations[gci].id===savedGroups[i].id){exists=true;break}}
      if(!exists)store.unshift('conversations', savedGroups[i])
    }
    if(savedGroups.length)saveGroups(savedGroups);
    // Restore unread counts and last activity
    var savedUnread=ls(STORAGE_KEYS.UNREAD)||{};
    var savedActivity=ls('lastActivity')||{};
    for(var uci=0;uci<store.conversations.length;uci++){
      var cid=store.conversations[uci].id;
      if(savedUnread[cid]!==undefined)store.conversations[uci].unread=savedUnread[cid];
      if(savedActivity[cid]!==undefined)store.conversations[uci].lastActivity=savedActivity[cid]
    }
    // Initialize lastActivity for conversations that don't have it
    for(var lai=0;lai<store.conversations.length;lai++){
      if(!store.conversations[lai].lastActivity){store.conversations[lai].lastActivity=Date.now()-store.conversations.length*1000+lai*100}
    }
    // Recalculate conversation previews from actual messages
    for(var sci=0;sci<store.conversations.length;sci++){
      updateConvPreview(store.conversations[sci].id)
    }
    store.activeConvId=null;
    // Start listening to conversation updates from Firestore
    var currentFbUid=fbUserId();
    if(window.db&&currentFbUid){fbListenConversations(currentFbUid);startPendingListener(currentFbUid)}
    // Init background mode
    if(ls('backgroundMode')&&window.electronAPI&&electronAPI.setBackgroundMode)electronAPI.setBackgroundMode(true);
    initE2E();
  }catch(e){console.error('[showApp] Error:',e)}
  // Always render and finalize, even on error
  store._pendingLoginPassword=null;
  store._authTransitioning=false;
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
  var el=$('conv-list');if(!el)return;var data=(list||store.conversations).slice();
  var animateList=!store._convListAnimatedOnce&&!list;
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
  if(!store._searchQuery)data=data.filter(function(c){return store._showArchived?isArchived(c.id):!isArchived(c.id)});
  // Hide closed conversations from sidebar
  if(!store._searchQuery)data=data.filter(function(c){return !c.hidden});
  // Update archive bar
  var ab=$('archive-label');
  if(ab)ab.textContent=store._showArchived?'Arşiv (gizle)':'Arşiv';
  // Archive badge: total unread from archived conversations
  var archUnread=0;
  for(var ai=0;ai<store.conversations.length;ai++){if(isArchived(store.conversations[ai].id))archUnread+=store.conversations[ai].unread||0}
  var archBadge=$('archive-badge');
  if(archBadge){
    if(archUnread>0){archBadge.style.display='flex';archBadge.textContent=archUnread>99?'99+':archUnread}
    else archBadge.style.display='none'
  }
  el.innerHTML='';
  if(store._showArchived&&data.length===0){el.innerHTML='<div style="text-align:center;padding:40px 10px;font-size:11px;color:var(--text4)">📦 Arşiv boş.</div>';store._convListAnimatedOnce=true;return}
  for(var i=0;i<data.length;i++){(function(c){
    var muted=isMuted(c.id);var pinned=isPinned(c.id);
    var div=document.createElement('div');div.className='conv-item'+(c.id===store.activeConvId?' active':'')+(muted?' muted':'');
    var avHtml='<div class="conv-avatar'+(c.online?' online':'')+'" style="background:'+c.color+'">';
    if(c.isGroup){
      if(c.avatar&&c.avatar.indexOf('data:')===0)avHtml+='<img src="'+escJs(sanitizeUrl(c.avatar))+'" style="width:100%;height:100%;object-fit:cover">';
      else avHtml+='G';
      avHtml+='<div class="group-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg></div>'
    }else{
      if(c.avatar&&c.avatar.indexOf('data:')===0)avHtml+='<img src="'+escJs(sanitizeUrl(c.avatar))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+c.color+'" data-err-text="?" data-err-avatar="1">';
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
  store._convListAnimatedOnce=true;
}

function filterConversations(q){store._searchQuery=q;renderConversations()}

function memberCount(g){return(g&&g.members?g.members.length:0)+(g&&g.creatorId?1:0)}
function parseTime(t){
  if(!t)return 0;
  // "12:30" format → minutes since midnight
  var p=t.split(':');if(p.length>=2)return parseInt(p[0])*60+parseInt(p[1]);
  // "Dün" or other text
  if(t==='Dün')return -1440;
  return -9999
}

function selectConversation(id){hideContextMenu();hideAvatarMenu();hideSettings();$('settings-page').classList.remove('active');closeProfilePanel();store._hasNewMsg=false;if(store.activeConvId&&store.activeConvId!==id)fbUnlistenMessages(store.activeConvId);fbStopTypingListener();fbStopCallSignals();stopTyping();store.activeConvId=id;var conv=findConv(id);if(!conv)return;conv.unread=0;saveUnreadCounts();saveConversations();renderConversations();$('chat-empty').style.display='none';$('chat-active').style.display='flex';var ca=$('chat-header-avatar');ca.style.background=conv.color||'var(--grad)';if(conv.avatar&&conv.avatar.indexOf('data:')===0){ca.innerHTML='<img src="'+escJs(sanitizeUrl(conv.avatar))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+(conv.color||'var(--grad)')+'" data-err-text="'+(conv.isGroup?'G':'?')+'" data-err-avatar="1">';ca.style.background='transparent'}else{ca.textContent=conv.isGroup?'G':(conv.avatar||'?')}$('chat-header-name').textContent=conv.name;$('chat-header-status').textContent=conv.isGroup?memberCount(conv)+' üye':statusText(conv);store._forceScrollBottom=true;renderMessages(id);fbListenMessages(id);fbSyncOnlineStatus(id);var inp=$('chat-input');if(inp)inp.focus();
if(!conv.isGroup&&window.db&&fbUserId()){var otherId=null;for(var ti=0;ti<(conv.memberIds||[]).length;ti++){if(conv.memberIds[ti]!==fbUserId()){otherId=conv.memberIds[ti];break}}if(otherId)fbListenTyping(id,otherId)}
fbListenCallSignals(id)}

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
    if(store._pubKeyCache[recId])return store._pubKeyCache[recId];
    try{
      var snap=await db.collection(COLLECTIONS.USERS).doc(recId).get();
      if(snap.exists&&snap.data().publicKey){store._pubKeyCache[recId]=snap.data().publicKey;return {keys:[store._pubKeyCache[recId]],missing:[]}}
    }catch(e){}
    return {keys:[],missing:[recId]}
  }
  // Group: get all non-self member public keys
  var memberIds=conv.memberIds||[];
  if(!memberIds.length&&conv.members)memberIds=conv.members.map(function(m){return m.id}).filter(function(id){return id&&id.indexOf('gf_')!==0&&id.indexOf('friend_')!==0&&id.indexOf('dm_')!==0});
  var keys=[],missing=[];
  for(var gmi=0;gmi<memberIds.length;gmi++){
    if(memberIds[gmi]===curId)continue;
    if(store._pubKeyCache[memberIds[gmi]]){keys.push(store._pubKeyCache[memberIds[gmi]]);continue}
    try{
      var snap=await db.collection(COLLECTIONS.USERS).doc(memberIds[gmi]).get();
      if(snap.exists&&snap.data().publicKey){store._pubKeyCache[memberIds[gmi]]=snap.data().publicKey;keys.push(snap.data().publicKey)}
      else{missing.push(memberIds[gmi])}
    }catch(e){missing.push(memberIds[gmi])}
  }
  return keys.length?{keys:keys,missing:missing}:{keys:[],missing:missing}
}

async function sendMessage(){var inp=$('chat-input'),txt=inp.value.trim();if(!txt||!store.activeConvId)return;var conv=findConv(store.activeConvId);
  var finalText=txt;
  if(conv&&store.e2eReady&&window.db){var pubKeyResult=await getRecipientPubKey(store.activeConvId);if(pubKeyResult&&pubKeyResult.keys&&pubKeyResult.keys.length>0){if(pubKeyResult.missing&&pubKeyResult.missing.length>0){showAlert(pubKeyResult.missing.length+' kullanıcı henüz E2E\'yi etkinleştirmemiş. Mesaj E2E şifrelenmeden gönderiliyor.')}else{try{var enc=await e2eEncrypt(txt,pubKeyResult.keys);if(enc&&enc.indexOf('🔒')===0)finalText=enc}catch(e){}}}}
  var myId=fbUserId();
  var id=uid(),msg={id:id,type:'sent',senderId:myId,text:finalText,time:timeNow(),edited:false,deleted:false};if(store.replyToMsgId){msg.replyTo=store.replyToMsgId;msg.replyText=store.replyToMsgText&&store.replyToMsgText.indexOf('🔒')===0?'🔒 [Şifreli]':store.replyToMsgText;cancelReply()}if(conv&&finalText!==txt){msg.e2e=true;msg._decrypted=txt}if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];store.messages[store.activeConvId].push(msg);store.emit('messages');renderMessages(store.activeConvId);inp.value='';$('chat-send').disabled=true;if(conv){conv.lastMsg=msg._decrypted||txt;conv.lastActivity=Date.now();conv.time=timeNow()}renderConversations();saveMessages();fbSendMessage(store.activeConvId,msg);stopTyping();setTimeout(function(){var fi=$('chat-input');if(fi){fi.focus();var fl=fi.value.length;fi.setSelectionRange(fl,fl)}},30)}

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
  if(store.activeConvId==groupId){var se=$('chat-header-status');if(se)se.textContent=memberCount(group)+' üye'}
  selectConversation(groupId)
}

// Global edit state

function editGroup(groupId){closeProfilePanel();var conv=findConv(groupId);if(!conv||!conv.isGroup)return;
  normalizeGroupMembers(conv);
  store.editGroupState={groupId:groupId,originalName:conv.name,addedIds:[],removedIds:[]};
  var ml=$('group-member-list');ml.innerHTML='';
  // Add existing members
  for(var i=0;i<conv.members.length;i++){(function(m){
    var d=document.createElement('div');d.className='modal-member-item selected';
    var eAv=m.avatar;var eAvHtml;if(eAv&&eAv.indexOf('data:')===0){eAvHtml='<img src="'+escJs(sanitizeUrl(eAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+m.color+'" data-err-text="?" data-err-avatar="1">'}else{eAvHtml='<span>'+esc(eAv||'?')+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+m.color+'">'+eAvHtml+'</div><div class="mm-name">'+esc(m.name)+'</div><div class="mm-check mm-remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(!d.classList.contains('selected')){store.push('editGroupState.removedIds', ci)}else{var idx=store.editGroupState.removedIds.indexOf(ci);if(idx>-1)store.splice('editGroupState.removedIds', idx, 1)}validateGroup()};
    d._cid=m.id;ml.appendChild(d)
  })(conv.members[i])}
  // Add non-member contacts (including friends not in conversations)
  var addedNames={};for(var mi=0;mi<conv.members.length;mi++)addedNames[conv.members[mi].id]=true;
  for(var i=0;i<store.conversations.length;i++){(function(c){
    if(c.isGroup||c.id===groupId)return;
    var member=makeGroupMemberFromConversation(c);if(!member||addedNames[member.id])return;
    addedNames[member.id]=true;
    var d=document.createElement('div');d.className='modal-member-item';
    var cAv=c.avatar;var cAvHtml;if(cAv&&cAv.indexOf('data:')===0){cAvHtml='<img src="'+escJs(sanitizeUrl(cAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+c.color+'" data-err-text="?" data-err-avatar="1">'}else{cAvHtml='<span>'+esc(cAv||'?')+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+c.color+'">'+cAvHtml+'</div><div class="mm-name">'+esc(c.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(d.classList.contains('selected')){store.push('editGroupState.addedIds', ci)}else{var idx=store.editGroupState.addedIds.indexOf(ci);if(idx>-1)store.splice('editGroupState.addedIds', idx, 1)}validateGroup()};
    d._cid=member.id;d._memberData=member;ml.appendChild(d)
  })(store.conversations[i])}
  // Also add friends not in conversations
  var editFriends=getCachedFriends();var eColors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
  for(var efi=0;efi<editFriends.length;efi++){(function(f){
    var fm=makeGroupMemberFromFriend(f,eColors[efi%eColors.length]);if(!fm||addedNames[fm.id])return;
    addedNames[fm.id]=true;
    var fid=fm.id;
    var d=document.createElement('div');d.className='modal-member-item';
    var fAv=f.avatar;var fAvHtml;if(fAv&&fAv.indexOf('data:')===0){fAvHtml='<img src="'+escJs(sanitizeUrl(fAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+eColors[efi%eColors.length]+'" data-err-text="?" data-err-avatar="1">'}else{fAvHtml='<span>'+esc(f.name.charAt(0).toUpperCase())+'</span>'}
    d.innerHTML='<div class="mm-avatar" style="background:'+eColors[efi%eColors.length]+'">'+fAvHtml+'</div><div class="mm-name">'+esc(f.name)+'</div><div class="mm-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
    d.onclick=function(){d.classList.toggle('selected');var ci=d._cid;if(d.classList.contains('selected')){store.push('editGroupState.addedIds', ci)}else{var idx=store.editGroupState.addedIds.indexOf(ci);if(idx>-1)store.splice('editGroupState.addedIds', idx, 1)}validateGroup()};
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
    if(!store.editGroupState||_saving)return;_saving=true;
    var nn=$('group-name').value.trim();if(!nn)return;
    var logs=[];
    
    if(conv.creatorId===store.activeAccountId){conv.name=nn}
    if(nn!==store.editGroupState.originalName)logs.push('Grup adı "'+nn+'" olarak değiştirildi');
    
    for(var ri=0;ri<store.editGroupState.removedIds.length;ri++){
      for(var x=0;x<conv.members.length;x++){
        if(conv.members[x].id==store.editGroupState.removedIds[ri]){
          logs.push(conv.members[x].name+' gruptan çıkarıldı');
          conv.members.splice(x,1);
          break
        }
      }
      if(conv.adminIds){var rai=conv.adminIds.indexOf(store.editGroupState.removedIds[ri]);if(rai>-1)conv.adminIds.splice(rai,1)}
    }
    
    for(var ai=0;ai<store.editGroupState.addedIds.length;ai++){
      var added=false;
      var cm=makeGroupMemberFromConversation(findConversationByPeerId(store.editGroupState.addedIds[ai]));
      if(cm){
        conv.members.push(cm);
        logs.push(cm.name+' gruba eklendi');
        added=true
      }
      if(!added){
        var colors=['#818cf8','#6d28d9','#0891b2','#16a34a','#ca8a04','#ea580c','#db2777'];
        var fm=makeGroupMemberFromFriend(findFriendByIdOrName(store.editGroupState.addedIds[ai],null),colors[ai%colors.length]);
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
    store.editGroupState=null;
    $('group-create-btn').textContent='Oluştur';
    $('group-create-btn').onclick=function(){createGroup()}
  };
  validateGroup()
}

// ===== MEDIA =====
function toggleUploadMenu(){$('upload-menu').classList.toggle('active')}
function hideUploadMenu(){$('upload-menu').classList.remove('active')}

async function sendMedia(type){hideUploadMenu();if(!store.activeConvId)return;
  try{if(window.electronAPI&&electronAPI.selectMedia){
    var files=await electronAPI.selectMedia(type||'all');
    if(files&&files.length>0){
      store.pendingMediaFiles=files;store.mediaIndex=0;
      showMediaPreview()
    }
  }}catch(e){console.error(e)}
}

function showMediaPreview(){
  if(store.pendingMediaFiles.length===0){hideMediaModal();return}
  $('modal-media').classList.add('active');
  store.mediaIndex=Math.min(store.mediaIndex,store.pendingMediaFiles.length-1);
  var file=store.pendingMediaFiles[store.mediaIndex];
  
  // Update counter & nav
  $('media-counter').textContent=(store.mediaIndex+1)+' / '+store.pendingMediaFiles.length;
  $('media-prev-btn').style.display=store.mediaIndex>0?'':'none';
  $('media-next-btn').style.display=store.mediaIndex<store.pendingMediaFiles.length-1?'':'none';
  $('media-caption-label').textContent='Açıklama ('+(store.mediaIndex+1)+'. dosya için)';
  $('media-caption').value=file.caption||'';
  $('media-caption').oninput=function(){store.pendingMediaFiles[store.mediaIndex].caption=this.value};
  
  // Update main preview
  var area=$('media-preview-area');
  if(file.type==='image'){
    area.innerHTML='<img src="'+escJs(sanitizeUrl(file.dataUrl))+'" style="max-width:100%;max-height:220px;border-radius:10px">'
  }else if(file.type==='video'){
    area.innerHTML='<video src="'+escJs(sanitizeUrl(file.dataUrl))+'" controls style="max-width:100%;max-height:220px;border-radius:10px"></video>'
  }else{
    area.innerHTML='<div style="padding:30px;font-size:40px;opacity:.4">📎</div><div style="font-size:12px;color:var(--text4)">'+esc(file.name)+'</div>'
  }
  
  // Rebuild thumbnails if count changed
  if(store.mediaThumbCount!==store.pendingMediaFiles.length){
    store.mediaThumbCount=store.pendingMediaFiles.length;
    var list=$('media-files-list');
    var container=document.createElement('div');
    container.className='media-files-list-inner';
    container.style.cssText='display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;padding:6px 2px;flex-wrap:nowrap';
    for(var i=0;i<store.pendingMediaFiles.length;i++){
      (function(fi,f){
        var thumb=document.createElement('div');
        thumb.className='media-thumb';
        thumb.dataset.idx=fi;
        thumb.style.cssText='width:56px;height:56px;border-radius:10px;overflow:hidden;cursor:pointer;flex-shrink:0;border:2px solid '+(fi===store.mediaIndex?'var(--accent)':'transparent');
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
      })(i,store.pendingMediaFiles[i])
    }
    list.innerHTML='';list.appendChild(container)
  }else{
    // Just update active border on thumbs
    var thumbs=document.querySelectorAll('.media-thumb');
    for(var i=0;i<thumbs.length;i++){
      thumbs[i].style.borderColor=i===store.mediaIndex?'var(--accent)':'transparent'
    }
  }
}

function mediaPrev(){if(store.mediaIndex>0){store.mediaIndex--;showMediaPreview()}}
function mediaNext(){if(store.mediaIndex<store.pendingMediaFiles.length-1){store.mediaIndex++;showMediaPreview()}}
function mediaGoTo(i){store.mediaIndex=i;showMediaPreview()}

// ===== IMAGE VIEWER =====
function showImage(src){
  // Find all image messages in current conversation for navigation
  store.imageViewerMsgs=[];store.imageViewerIdx=0;
  if(store.activeConvId&&store.messages[store.activeConvId]){
    for(var vi=0;vi<store.messages[store.activeConvId].length;vi++){
      if(store.messages[store.activeConvId][vi].image){
        store.push('imageViewerMsgs', store.messages[store.activeConvId][vi].image);
        if(store.messages[store.activeConvId][vi].image===src)store.imageViewerIdx=store.imageViewerMsgs.length-1
      }
    }
  }
  store.imageViewerOpen=true;
  renderImageViewer()
}
function renderImageViewer(){
  if(!store.imageViewerOpen||store.imageViewerMsgs.length===0){store.imageViewerOpen=false;return}
  var overlay=document.createElement('div');
  overlay.id='image-viewer';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column';
  overlay.addEventListener('click',function(e){
    if(e.target===overlay){closeImageViewer();return}
    var btn=e.target.closest('[data-action]');if(!btn)return;
    if(btn.dataset.action==='prev-image'){e.stopPropagation();store.imageViewerIdx=Math.max(0,store.imageViewerIdx-1);document.body.removeChild(overlay);renderImageViewer()}
    else if(btn.dataset.action==='next-image'){e.stopPropagation();store.imageViewerIdx=Math.min(store.imageViewerMsgs.length-1,store.imageViewerIdx+1);document.body.removeChild(overlay);renderImageViewer()}
    else if(btn.dataset.action==='save-image'){e.stopPropagation();saveImage(store.imageViewerMsgs[store.imageViewerIdx])}
    else if(btn.dataset.action==='copy-image'){e.stopPropagation();copyImage(store.imageViewerMsgs[store.imageViewerIdx])}
  });
  overlay.innerHTML='<div style="position:relative;display:flex;align-items:center;gap:12px">'+
    (store.imageViewerMsgs.length>1?'<button data-action="prev-image" style="width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">‹</button>':'')+
    '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="'+escJs(sanitizeUrl(store.imageViewerMsgs[store.imageViewerIdx]))+'" style="max-width:85vw;max-height:75vh;border-radius:12px;object-fit:contain;cursor:default">'+
    '<div style="display:flex;gap:6px"><button data-action="save-image" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:11px">💾 Kaydet</button><button data-action="copy-image" style="padding:5px 12px;border:none;border-radius:6px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:11px">📋 Kopyala</button></div></div>'+
    (store.imageViewerMsgs.length>1?'<button data-action="next-image" style="width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">›</button>':'')+
  '</div>'+
  (store.imageViewerMsgs.length>1?'<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.4)">'+(store.imageViewerIdx+1)+' / '+store.imageViewerMsgs.length+'</div>':'');
  document.body.appendChild(overlay)
}
function closeImageViewer(){
  store.imageViewerOpen=false;
  var el=document.getElementById('image-viewer');
  if(el)document.body.removeChild(el)
}

// Keyboard nav for image viewer
document.addEventListener('keydown',function(e){
  if(!store.imageViewerOpen)return;
  if(e.key==='ArrowLeft'&&store.imageViewerIdx>0){
    e.preventDefault();
    store.imageViewerIdx--;
    var el=document.getElementById('image-viewer');if(el)document.body.removeChild(el);
    renderImageViewer()
  }else if(e.key==='ArrowRight'&&store.imageViewerIdx<store.imageViewerMsgs.length-1){
    e.preventDefault();
    store.imageViewerIdx++;
    var el=document.getElementById('image-viewer');if(el)document.body.removeChild(el);
    renderImageViewer()
  }else if(e.key==='Escape'){
    e.preventDefault();
    closeImageViewer()
  }
});

function hideMediaModal(){store.pendingMediaFiles=[];store.mediaThumbCount=0;$('modal-media').classList.remove('active')}

async function confirmSendMedia(){
  if(store.pendingMediaFiles.length===0||!store.activeConvId||store.sendingMediaLock)return;
  store.sendingMediaLock=true;
  async function e2eMediaText(text,convId){
    if(!text||!store.e2eReady||!window.db)return text;
    var conv=findConv(convId);if(!conv)return text;
    var pubKeys=await getRecipientPubKey(convId);
    if(!pubKeys||!(Array.isArray(pubKeys)?pubKeys.length:1))return text;
    try{var enc=await e2eEncrypt(text,pubKeys);if(enc&&enc.indexOf('🔒')===0)return enc}catch(e){}
    return text
  }
  (async function processMedia(idx){
    if(idx>=store.pendingMediaFiles.length){
      renderMessages(store.activeConvId);renderConversations();
      saveMessages();
      store.pendingMediaFiles=[];store.mediaThumbCount=0;
      hideMediaModal();store.sendingMediaLock=false;
      return
    }
    var file=store.pendingMediaFiles[idx];
    var caption=(file.caption||'').trim();
    var ext=file.name?file.name.split('.').pop():'png';
    var path='media/'+store.activeConvId+'/'+Date.now()+'_'+idx+'.'+ext;
    var dataUrl=file.dataUrl;
    if(dataUrl&&dataUrl.indexOf('data:')===0&&window.storage){
      try {
        var url=await fbUploadFile(dataUrl,path);
        var id=uid();
        if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];
        var txt=file.type==='image'||file.type==='video'?caption:'📎 '+file.name+(caption?' — '+caption:'');
        var encTxt=await e2eMediaText(txt,store.activeConvId);
        var msg={id:id,type:'sent',senderId:fbUserId(),text:encTxt,time:timeNow(),edited:false,deleted:false};
        if(file.type==='image')msg.image=url;
        else if(file.type==='video')msg.video=url;
        if(encTxt!==txt)msg.e2e=true;
        store.messages[store.activeConvId].push(msg);store.emit('messages');
        var conv=findConv(store.activeConvId);
        if(conv){conv.lastMsg=encTxt!==txt?'🔒 Mesaj':(file.type==='image'?'📷 '+(caption||file.name):(file.type==='video'?'🎬 '+(caption||file.name):'📎 '+file.name));conv.lastActivity=Date.now();conv.time=timeNow()}
        fbSendMessage(store.activeConvId,msg);
        processMedia(idx+1)
      }catch(e){
        var id=uid();
        if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];
        var msg={id:id,type:'sent',senderId:fbUserId(),text:caption,time:timeNow(),edited:false,deleted:false,image:dataUrl};
        store.messages[store.activeConvId].push(msg);store.emit('messages');
        processMedia(idx+1)
      }
    }else{
      var id=uid();
      if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];
      (async function(){
        var txt=file.type==='document'?'📎 '+file.name+(caption?' — '+caption:''):caption;
        var encTxt=await e2eMediaText(txt,store.activeConvId);
        var msg={id:id,type:'sent',senderId:fbUserId(),text:encTxt,time:timeNow(),edited:false,deleted:false};
        if(file.type==='image')msg.image=dataUrl;
        else if(file.type==='video')msg.video=dataUrl;
        if(encTxt!==txt)msg.e2e=true;
        store.messages[store.activeConvId].push(msg);store.emit('messages');
        var conv=findConv(store.activeConvId);
        if(conv){conv.lastMsg=encTxt!==txt?'🔒 Mesaj':(file.type==='image'?'📷 '+(caption||file.name):(file.type==='video'?'🎬 '+(caption||file.name):'📎 '+file.name));conv.lastActivity=Date.now();conv.time=timeNow()}
        fbSendMessage(store.activeConvId,msg);
        processMedia(idx+1)
      })()
    }
  })(0)
}

function showProfilePanel(){if(!store.activeConvId)return;
  if(store.profilePanelOpen){closeProfilePanel();return}
  var conv=findConv(store.activeConvId);if(!conv)return;
  var body=$('profile-panel-body');store.profilePanelOpen=true;
  var avatarHtml='<div class="pp-avatar" style="background:'+conv.color+'">';
  if(conv.avatar&&conv.avatar.indexOf('data:')===0)avatarHtml+='<img src="'+escJs(sanitizeUrl(conv.avatar))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+conv.color+'" data-err-text="'+(conv.isGroup?'G':'?')+'" data-err-avatar="1">';
  else avatarHtml+='<span>'+(conv.isGroup?'G':(conv.avatar||'?'))+'</span>';
  avatarHtml+='</div>';
  body.innerHTML=avatarHtml+'<div class="pp-name">'+esc(conv.name)+'</div>';
  if(!conv.isGroup){
    body.innerHTML+='<div class="pp-uname">@'+esc((conv.name||'').toLowerCase().replace(/\s/g,''))+'</div>';
    if(conv.bio)body.innerHTML+='<div class="pp-bio">'+esc(conv.bio)+'</div>';
    body.innerHTML+='<div class="pp-row"><div><div class="pp-row-label">Durum</div><div class="pp-row-val" style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="sd-dot '+(conv.online?'sd-online':'')+'" style="display:inline-block"></span>'+(conv.online?'Çevrimiçi':'Çevrimdışı')+'</div></div></div>'
  }else{
    var isCreator=conv.creatorId===store.activeAccountId;
    var isAdmin=conv.adminIds&&conv.adminIds.indexOf(store.activeAccountId)!==-1;
    body.innerHTML+='<div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap">'+
      (isAdmin?'<button class="btn-primary" data-action="edit-group" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Grubu Düzenle</button>':'')+
      (isCreator?'<button class="btn-primary" data-action="pick-group-avatar" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> Fotoğraf</button>':'')+
      (isCreator?'<button class="btn-danger" data-action="delete-group" style="padding:8px 18px;font-size:11px;border-radius:8px;display:flex;align-items:center;gap:6px;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Grubu Sil</button>':'')+
    '</div>';
    body.innerHTML+='<div class="pp-bio" style="text-align:left;font-size:11px">'+memberCount(conv)+' üye</div>';
    for(var mi=0;mi<conv.members.length;mi++){(function(m){
      var mAv=m.avatar;var mAvHtml;if(mAv&&mAv.indexOf('data:')===0){mAvHtml='<img src="'+escJs(sanitizeUrl(mAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+m.color+'" data-err-text="?" data-err-avatar="1">'}else{mAvHtml='<span>'+esc(mAv||'?')+'</span>'}
      body.innerHTML+='<div class="pp-row member-row" style="gap:10px;cursor:pointer" data-action="member-profile" data-context="member-menu" data-member-id="'+m.id+'" data-conv-id="'+conv.id+'"><div style="width:36px;height:36px;border-radius:50%;background:'+m.color+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">'+mAvHtml+'</div><div style="flex:1;min-width:0;text-align:left"><div style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(conv.adminIds&&conv.adminIds.indexOf(m.id)!==-1?'👑 ':'')+esc(m.name)+'</div><div style="font-size:10px;color:var(--text4)">'+(conv.adminIds&&conv.adminIds.indexOf(m.id)!==-1?'Yönetici':(conv.creatorId===m.id?'Kurucu':'Üye'))+'</div></div></div>'
    })(conv.members[mi])}
  }
  $('profile-panel').classList.add('open')
}
function closeProfilePanel(){$('profile-panel').classList.remove('open');store.profilePanelOpen=false;delete $('profile-panel-body').dataset.backConv}

function showMemberProfile(memberId,convId){
  if(!memberId){closeProfilePanel();showProfilePanel();return}
  for(var ci=0;ci<store.conversations.length;ci++){
    if(store.conversations[ci].id==memberId){
      var member=store.conversations[ci];
      var body=$('profile-panel-body');body.dataset.backConv=convId;
      var mAv=member.avatar;var mAvHtml;if(mAv&&mAv.indexOf('data:')===0){mAvHtml='<img src="'+escJs(sanitizeUrl(mAv))+'" style="width:100%;height:100%;object-fit:cover" data-err-bg="'+member.color+'" data-err-text="?" data-err-avatar="1">'}else{mAvHtml='<span>'+esc(mAv||'?')+'</span>'}
      body.innerHTML='<div class="pp-avatar" style="background:'+member.color+'">'+mAvHtml+'</div><div class="pp-name">'+esc(member.name)+'</div>'+
        '<div class="pp-uname">@'+esc((member.name||'').toLowerCase().replace(/\s/g,''))+'</div>'+
        (member.bio?'<div class="pp-bio">'+esc(member.bio)+'</div>':'')+
        '<div class="pp-row"><div><div class="pp-row-label">Durum</div><div class="pp-row-val" style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="sd-dot '+(member.online?'sd-online':'')+'" style="display:inline-block;flex-shrink:0"></span>'+(member.online?'Çevrimiçi':'Çevrimdışı')+'</div></div></div>'+
        '<div style="margin-top:16px"><button class="btn-back" data-action="back-profile" style="padding:8px 20px;font-size:11px;border-radius:8px;display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Geri</button></div>';
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
      if(blob){try{navigator.clipboard.write([new ClipboardItem({'image/png':blob})]).catch(console.error)}catch(e){}}
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

function switchEmojiCat(cat){
  store.currentEmojiCat=cat;
  document.querySelectorAll('.emoji-cat').forEach(function(c){c.style.background='transparent'});
  var el=document.querySelector('.emoji-cat[data-cat="'+cat+'"]');
  if(el)el.style.background='rgba(129,140,248,.1)';
  renderEmojis()
}

function renderEmojis(){
  var list=$('emoji-list');if(!list)return;
  list.innerHTML='';
  var emojis=emojiCats[store.currentEmojiCat]||[];
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
function toggleEmojiPicker(){
  var p=$('emoji-picker');if(!p)return;
  store.emojiPickerVisible=!store.emojiPickerVisible;
  if(store.emojiPickerVisible){
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
  if(!ep.contains(e.target)&&e.target!==$('emoji-btn')){ep.style.display='none';store.emojiPickerVisible=false}
});

// ===== REPLY TO MESSAGE =====

function setReply(msgId){
  var convId=store.activeConvId;
  var msgs=store.messages[convId]||[];
  for(var ri=0;ri<msgs.length;ri++){
    if(msgs[ri].id===msgId){
      store.replyToMsgId=msgId;
      var rt=msgs[ri]._decrypted||msgs[ri].text;
      store.replyToMsgText=rt&&rt.indexOf('🔒')===0?'🔒 [Şifreli]':(rt||(msgs[ri].image?'📷 Fotoğraf':(msgs[ri].video?'🎬 Video':(msgs[ri].audio?'🎤 Ses':''))));
      updateReplyBar();
      break
    }
  }
}
function cancelReply(){store.replyToMsgId=null;store.replyToMsgText='';updateReplyBar()}
function updateReplyBar(){
  var bar=$('reply-bar');
  if(!bar)return;
  if(store.replyToMsgId){
    bar.style.display='flex';
    $('reply-text').textContent='⤴ '+store.replyToMsgText
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
  if(!q||!store.activeConvId||!store.messages[store.activeConvId]){results.innerHTML='<div style="text-align:center;padding:20px;color:var(--text4)">Sonuç yok</div>';return}
  var found=[];
  for(var si=0;si<store.messages[store.activeConvId].length;si++){
    var m=store.messages[store.activeConvId][si];
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
      if(store.activeConvId){
        var targetConvId=store.activeConvId;
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
  if(store.currentStatus===STATUS.DND)return;
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

function startTyping(){
  if(!store.activeConvId||!window.db||!fbUserId())return;
  var h=$('chat-header-status');
  if(!h)return;
  db.collection(COLLECTIONS.CONVERSATIONS).doc(store.activeConvId).update({typing:fbUserId(),typingAt:Date.now()}).catch(console.error);
  if(store.typingTimer)clearTimeout(store.typingTimer);
  store.typingTimer=setTimeout(stopTyping,2500)
}
function stopTyping(){
  if(!store.activeConvId||!window.db||!fbUserId())return;
  db.collection(COLLECTIONS.CONVERSATIONS).doc(store.activeConvId).update({typing:firebase.firestore.FieldValue.delete(),typingAt:firebase.firestore.FieldValue.delete()}).catch(console.error);
  if(store.typingTimer){clearTimeout(store.typingTimer);store.typingTimer=null}
}
function fbListenTyping(convId,otherUserId){
  if(store._typingRemoteUnsub){store._typingRemoteUnsub()}
  if(!window.db||!convId||!otherUserId)return;
  store._typingLocalUid=otherUserId;
  store._typingRemoteUnsub=db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).onSnapshot(function(doc){
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
function fbStopTypingListener(){
  if(store._typingRemoteUnsub){store._typingRemoteUnsub();store._typingRemoteUnsub=null}
  store._typingLocalUid=null;
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
  var convId=store.activeConvId;if(!convId)return;
  var pinned=ls('pinnedMsg_'+convId)||[];
  var idx=pinned.indexOf(msgId);
  var msgs=store.messages[convId]||[],msgText='';
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
  if(store.activeConvId===convId)renderMessages(convId)
}
function isMsgPinned(msgId){
  if(!store.activeConvId)return false;
  var pinned=ls('pinnedMsg_'+store.activeConvId)||[];
  return pinned.indexOf(msgId)>-1
}
function showPinnedMessages(event){
  if(event)event.stopPropagation();
  if(!store.activeConvId)return;
  var list=$('pinned-msg-list');if(!list)return;
  var pinned=ls('pinnedMsg_'+store.activeConvId)||[];
  var msgs=store.messages[store.activeConvId]||[];
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
      if(m.image)mediaHtml='<img src="'+escJs(sanitizeUrl(m.image))+'" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0">';
      else if(m.video)mediaHtml='<div style="width:36px;height:36px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">🎬</div>';
      else if(m.audio)mediaHtml='<div style="width:36px;height:36px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">🎤</div>';
      d.innerHTML=mediaHtml+'<span style="flex:1;font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+content+'</span><span style="font-size:10px;color:var(--text4)">'+esc(m.time)+'</span><button data-action="unpin-msg" data-msg-id="'+m.id+'" style="padding:3px 8px;border:none;border-radius:5px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-size:10px;flex-shrink:0">Kaldır</button>';
      d.onclick=function(){
        $('modal-pinned').classList.remove('active');
        selectConversation(store.activeConvId);
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
  if(!store.activeConvId)return;
  var grid=$('gallery-grid');if(!grid)return;
  var msgs=store.messages[store.activeConvId]||[];
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
        div.innerHTML='<img src="'+escJs(sanitizeUrl(m.image))+'" style="width:100%;height:100%;object-fit:cover">'
      }else if(m.video){
        div.innerHTML='<video src="'+escJs(sanitizeUrl(m.video))+'" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'
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
          selectConversation(store.activeConvId);
          setTimeout(function(){
            var targetId=m.id;
            // If in a collage group, find the first image in same consecutive group
            if(store.activeConvId&&store.messages[store.activeConvId]){
              var msgs=store.messages[store.activeConvId];
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
  ov.innerHTML='<video src="'+escJs(sanitizeUrl(src))+'" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:12px"></video>';
  document.body.appendChild(ov)
}

function addReaction(msgId,emoji){
  var convId=store.activeConvId;
  var msgs=store.messages[convId]||[];
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
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId]||[];
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
  if(!store.activeConvId||!store.messages[store.activeConvId])return;
  for(var eli=store.messages[store.activeConvId].length-1;eli>=0;eli--){
    if(store.messages[store.activeConvId][eli].type==='sent'&&!store.messages[store.activeConvId][eli].deleted){
      editMessage(store.messages[store.activeConvId][eli].id);return
    }
  }
}



function confirmCollageDelete(){
  var imgs=store.pendingCollageDelete;store.pendingCollageDelete=null;
  hideDeleteModal();
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  if(!imgs||!store.activeConvId)return;
  // Keep only the first image marked as deleted (shows one "Bu mesaj silindi"), remove the rest
  var firstId=imgs[0].id;
  var kept=[];
  for(var di=0;di<store.messages[store.activeConvId].length;di++){
    var m=store.messages[store.activeConvId][di];
    var match=false;
    for(var dj=0;dj<imgs.length;dj++){
      if(m.id===imgs[dj].id){match=true;break}
    }
    if(match&&m.id===firstId){m.deleted=true;m.deletedByMe=false;m.image=null;m.text='';kept.push(m)}
    else if(!match){kept.push(m)}
    // else: skip other images in the collage
  }
  store.messages[store.activeConvId]=kept;
  updateConvPreview(store.activeConvId);
  renderMessages(store.activeConvId);renderConversations();saveMessages()
}

function editMessage(msgId){
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId],msg=null;
  for(var ei=0;ei<msgs.length;ei++){if(msgs[ei].id===msgId){msg=msgs[ei];break}}
  if(!msg||msg.type!=='sent'||msg.deleted)return;
  var el=$('msg-'+msgId);if(!el)return;
  var oldT=msg._decrypted||msg.text||'';
  if(oldT.indexOf('🔒')===0)oldT='';
  el.innerHTML='<textarea class="edit-input thin-scrollbar" id="ei-'+msgId+'" rows="3" style="resize:none">'+esc(oldT)+'</textarea><div class="edit-actions"><button class="edit-save" data-action="save-edit" data-msg-id="'+msgId+'">Kaydet</button><button class="edit-cancel" data-action="cancel-edit" data-msg-id="'+msgId+'">İptal</button></div>';
  var inp=document.getElementById('ei-'+msgId);
  if(inp){inp.focus();inp.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit(msgId)}else if(e.key==='Escape')cancelEdit(msgId)}}
}
async function saveEdit(msgId){
  var inp=document.getElementById('ei-'+msgId);if(!inp)return;
  var t=inp.value.trim();if(!t)return;
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId];
  for(var si=0;si<msgs.length;si++){if(msgs[si].id===msgId){
    if(msgs[si].text===t){renderMessages(convId);return}
    // Re-encrypt if original was E2E
    var newTxt=t;
    if(msgs[si].e2e||(msgs[si].text&&msgs[si].text.indexOf('🔒')===0)){var conv=findConv(convId);if(conv&&store.e2eReady&&window.db){var pubKeys=await getRecipientPubKey(convId);if(pubKeys&&(Array.isArray(pubKeys)?pubKeys.length:1)){try{var enc=await e2eEncrypt(t,pubKeys);if(enc&&enc.indexOf('🔒')===0)newTxt=enc}catch(e){}}}}
    msgs[si].text=newTxt;msgs[si].edited=true;msgs[si].editedTime=timeNow();msgs[si]._decrypted=null;break
  }}
  renderMessages(convId);saveMessages()
}
function cancelEdit(msgId){renderMessages(store.activeConvId)}

function deleteMessage(msgId){
  store.pendingDeleteMsgId=msgId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  $('modal-delete').classList.add('active')
}

function selfDeleteMessage(msgId){
  store.pendingSelfDeleteId=msgId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj sadece senin tarafında silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmSelfDelete()};
  $('modal-delete').classList.add('active')
}
function confirmSelfDelete(){
  var msgId=store.pendingSelfDeleteId;store.pendingSelfDeleteId=null;
  hideDeleteModal();if(!msgId)return;
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId];
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msgs[i].deleted=true;msgs[i].deletedByMe=true;break}}
  updateConvPreview(convId);
  renderMessages(convId);renderConversations();saveMessages()
}

function hideDeleteModal(){
  store.pendingDeleteMsgId=null;store.pendingRemoveMember=null;store.pendingRemoveGroup=null;store.pendingCollageDelete=null;store.pendingClearConvId=null;store.pendingAlert=false;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Mesajı Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu mesaj kalıcı olarak silinsin mi?</p>';
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  $('modal-delete').classList.remove('active')
}
function confirmDelete(){
  var msgId=store.pendingDeleteMsgId;store.pendingDeleteMsgId=null;
  hideDeleteModal();if(!msgId)return;
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId];
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msgs[i].deleted=true;msgs[i].text='';break}}
  // Update sidebar with last non-deleted message
  updateConvPreview(convId);
  renderMessages(convId);renderConversations();saveMessages()
}

function updateConvPreview(convId){
  var conv=findConv(convId);if(!conv)return;
  if(!store.messages[convId]||store.messages[convId].length===0){conv.lastMsg='Sohbet temizlendi';conv.time='';return}
  var last=store.messages[convId][store.messages[convId].length-1];
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


function showDeleteGroupConfirm(convId){
  store.pendingDeleteGroupId=convId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Grubu Sil</h4>'+
    '<p style="color:var(--text4);font-size:12px">Grup kalıcı olarak silinsin mi? Bu işlem geri alınamaz.</p>';
  $('delete-confirm-btn').textContent='Grubu Sil';
  $('delete-confirm-btn').onclick=function(){confirmDeleteGroup()};
  $('modal-delete').classList.add('active')
}
function confirmDeleteGroup(){
  var cid=store.pendingDeleteGroupId;store.pendingDeleteGroupId=null;
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
  var isCreator=conv.creatorId===store.activeAccountId;
  var isAdmin=conv.adminIds.indexOf(store.activeAccountId)!==-1;
  var isSelf=memberId===store.activeAccountId;
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
  for(var tai=0;tai<store.conversations.length;tai++){
    if(store.conversations[tai].id==convId&&store.conversations[tai].isGroup){
      var g=store.conversations[tai];
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
      if(store.profilePanelOpen)showProfilePanel();
      return
    }
  }
}


function removeFromGroup(memberId,convId){
  store.pendingRemoveMember=memberId;store.pendingRemoveGroup=convId;
  var body=$('modal-delete').querySelector('.modal-body');
  body.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'+
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">Gruptan Çıkar</h4>'+
    '<p style="color:var(--text4);font-size:12px">Bu kişi gruptan çıkarılsın mı?</p>';
  $('delete-confirm-btn').textContent='Çıkar';
  $('delete-confirm-btn').onclick=function(){removeFromGroupConfirm()};
  $('modal-delete').classList.add('active')
}
function addGroupLog(convId,text){
  if(!store.messages[convId])store.messages[convId]=[];
  store.messages[convId].push({id:uid(),type:'log',text:text,time:timeNow()});store.emit('messages');
  var conv=findConv(convId);
  if(conv){conv.lastMsg=text;conv.lastActivity=Date.now();conv.time=timeNow()}
  saveMessages();
  if(store.activeConvId===convId)renderMessages(convId);
  renderConversations()
}

function removeFromGroupConfirm(){
  var memberId=store.pendingRemoveMember,convId=store.pendingRemoveGroup;
  store.pendingRemoveMember=null;store.pendingRemoveGroup=null;
  hideDeleteModal();
  $('delete-confirm-btn').textContent='Sil';
  $('delete-confirm-btn').onclick=function(){confirmDelete()};
  if(!memberId||!convId)return;
  // Find member name
  var memberName='';
  for(var ci=0;ci<store.conversations.length;ci++){if(store.conversations[ci].id==memberId){memberName=store.conversations[ci].name;break}}
  if(!memberName){for(var mi=0;mi<store.conversations.length;mi++){if(store.conversations[mi].isGroup&&store.conversations[mi].id==convId){var gm=store.conversations[mi].members;for(var mm=0;mm<gm.length;mm++){if(gm[mm].id==memberId){memberName=gm[mm].name;break}}}if(memberName)break}}
  
  for(var gi=0;gi<store.conversations.length;gi++){
    if(store.conversations[gi].id==convId&&store.conversations[gi].isGroup){
      var g=store.conversations[gi];
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
      if(hs&&store.activeConvId==convId)hs.textContent=memberCount(g)+' üye';
      // Re-render profile panel without closing/reopening
      if(store.profilePanelOpen){store.profilePanelOpen=false;showProfilePanel()}
    }
  }
}

// ===== RENDER MESSAGES =====
renderMessages=function(convId){
  var el=$('chat-messages');if(!el)return;var raw=store.messages[convId]||[];el.innerHTML='';
  var conv=findConv(convId);var isGroupChat=conv&&conv.isGroup;
  for(var di=0;di<raw.length;di++){if(raw[di].text&&raw[di].text.indexOf('🔒')===0&&!raw[di]._decrypted&&!raw[di]._decrypting){raw[di]._decrypting=true;(async function(m){try{var d=await e2eDecrypt(m.text);if(d){m._decrypted=d;m._decrypting=false}else{m._decrypting=false;m._decrypted='🔒 [Çözülemedi]'}if(store.activeConvId===convId)renderMessages(convId)}catch(e){m._decrypting=false;m._decrypted='🔒 [Çözülemedi]';if(store.activeConvId===convId)renderMessages(convId)}})(raw[di])}}
  var groups=[];var ci=0;
  while(ci<raw.length){
    var msg=raw[ci];
    if(msg.image&&!msg.text&&!msg.video&&!msg.audio&&!msg.deleted){
      var images=[];
      while(ci<raw.length&&raw[ci].image&&!raw[ci].text&&!raw[ci].video&&!raw[ci].audio&&!raw[ci].deleted){
        images.push(raw[ci]);ci++
      }
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
    div.oncontextmenu=function(e){
      e.preventDefault();
      var id=this.dataset.msgId;
      var type=this.dataset.msgType;
      var img=this.dataset.msgImg;
      var items=[];
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
      store.contextMenuMsgId=id;
      if(chatMsgs)store.contextMenuScrollPos=chatMsgs.scrollTop;
      showContextMenu(e.clientX+2,e.clientY-2,items)
    }
  }
  for(var gi=0;gi<groups.length;gi++){
    var g=groups[gi];
    if(g.type==='single'){
      var m=g.msg;
      if(m.type==='call'){continue}
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
        if(m.image)txt+='<img class="msg-image" src="'+escJs(sanitizeUrl(m.image))+'" alt="" data-action="show-image" data-url="'+escJs(sanitizeUrl(m.image))+'">';
        if(m.video)txt+='<video class="msg-image" src="'+escJs(sanitizeUrl(m.video))+'" controls style="max-width:280px;border-radius:12px;display:block;cursor:pointer" data-action="show-video" data-url="'+escJs(sanitizeUrl(m.video))+'"></video>';
        if(m.audio){var mins=Math.floor((m.duration||0)/60),secs=(m.duration||0)%60;txt+='<div class="msg-audio"><button class="ma-play" data-action="play-audio" data-msg-id="'+m.id+'"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></button><div class="ma-body"><div class="ma-seek" data-action="seek-audio" data-msg-id="'+m.id+'"><div class="ma-progress"></div></div></div><span class="ma-dur">'+mins+':'+(secs<10?'0':'')+secs+'</span></div>'}
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
      if(n===1){
        var m=imgs[0];
        var div=document.createElement('div');div.className='msg sent';div.id='msg-'+m.id;
        div.innerHTML='<div class="msg-text"><img class="msg-image" src="'+escJs(sanitizeUrl(m.image))+'" alt="" data-action="show-image" data-url="'+escJs(sanitizeUrl(m.image))+'"></div><div class="msg-time" style="padding-top:2px">'+esc(m.time)+'</div>';
        addMsgActions(div,m);el.appendChild(div)
      }else{
        var div=document.createElement('div');div.className='msg sent';div.id=g.id;
        var first=imgs[0];
        var extra=n-1;
        var _fi=escJs(sanitizeUrl(first.image));
        div.innerHTML='<div style="position:relative;display:inline-block;max-width:280px">'+
          '<img class="msg-image" src="'+_fi+'" alt="" data-action="show-image" data-url="'+_fi+'" style="max-width:280px;width:100%;border-radius:12px;display:block;cursor:pointer">'+
          (extra>0?'<div data-action="show-image" data-url="'+_fi+'" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.65);color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">+'+extra+'</div>':'')+
        (g.isForwarded?'<div style="font-size:9px;opacity:.4;margin-top:4px;font-style:italic">📤 İletildi</div>':'')+
        (g.forwardComment?'<div style="font-size:11px;opacity:.7;margin:2px 0">💬 '+esc(g.forwardComment)+'</div>':'')+
        '</div><div class="msg-time" style="padding-top:2px;text-align:right">'+esc(g.time)+(g.time!==g.time2?' · '+esc(g.time2):'')+'</div>';
        div.oncontextmenu=function(e){
          e.preventDefault();
          store.contextMenuMsgId='collage';
          if(chatMsgs)store.contextMenuScrollPos=chatMsgs.scrollTop;
          var items=[];
          items.push({label:'Medyaları Düzenle',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',action:function(){
            store.pendingMediaFiles=[];
            for(var ci=0;ci<imgs.length;ci++){
              store.push('pendingMediaFiles', {path:'',dataUrl:imgs[ci].image,name:'image '+(ci+1),type:'image',caption:imgs[ci].text||'',_editId:imgs[ci].id})
            }
            store.mediaIndex=0;store.mediaThumbCount=0;
            showMediaPreview()
          }});
          if(imgs.length>1)items.push({label:'Tümünü İlet',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',action:function(){
            var fwdData={text:imgs.length+' görsel',images:imgs.map(function(x){return x.image}),originalSender:$('sidebar-username').textContent};
            showForwardModal(null,fwdData)
          }});
          items.push({label:'Tümünü Sil',icon:'<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',action:function(){
            store.pendingCollageDelete=imgs;
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
    if(nearBottom||store._forceScrollBottom){store._forceScrollBottom=false;el.scrollTop=el.scrollHeight}
    updateNewMsgIndicator(el)
  },50)
}

function updateNewMsgIndicator(el){
  el=el||$('chat-messages');if(!el)return;
  var ni=$('new-msg-indicator');var sb=$('scroll-bottom-btn');
  var nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<150;
  if(nearBottom){store._hasNewMsg=false;var cv=findConv(store.activeConvId);if(cv&&cv.unread>0){cv.unread=0;saveUnreadCounts();renderConversations()}}
  if(store._hasNewMsg&&!nearBottom){
    if(ni)ni.style.display='flex';
    if(sb)sb.style.display='none'
  }else if(!nearBottom&&!store._hasNewMsg){
    if(ni)ni.style.display='none';
    if(sb)sb.style.display='flex'
  }else{
    if(ni)ni.style.display='none';
    if(sb)sb.style.display='none'
  }
}

var _chatMsgsEl=$('chat-messages');
if(_chatMsgsEl)_chatMsgsEl.addEventListener('scroll',function(){updateNewMsgIndicator(this)});
// Delegation: chat-messages (images, videos, audio, edit, pinned nav)
if(_chatMsgsEl){
  _chatMsgsEl.addEventListener('click',function(e){
    var t=e.target.closest('[data-action]');if(!t)return;
    var a=t.dataset.action,url=t.dataset.url,mid=t.dataset.msgId;
    if(a==='show-image'&&url){e.stopPropagation();showImage(url)}
    else if(a==='show-video'&&url){e.stopPropagation();showVideoPreview(url)}
    else if(a==='play-audio'&&mid){playAudio(mid)}
    else if(a==='seek-audio'&&mid){seekAudio(e,mid)}
    else if(a==='save-edit'&&mid){saveEdit(mid)}
    else if(a==='cancel-edit'&&mid){cancelEdit(mid)}
  })
}
// Delegation: profile-panel-body
var _ppb=$('profile-panel-body');
if(_ppb){
  _ppb.addEventListener('click',function(e){
    var t=e.target.closest('[data-action]');if(!t)return;
    var a=t.dataset.action,convId=t.dataset.convId,mid=t.dataset.memberId;
    if(a==='edit-group'&&convId){editGroup(convId)}
    else if(a==='pick-group-avatar'){pickGroupAvatar()}
    else if(a==='delete-group'&&convId){showDeleteGroupConfirm(convId)}
    else if(a==='member-profile'&&mid&&convId){showMemberProfile(mid,convId)}
    else if(a==='back-profile'){showMemberProfile(null,this.dataset.backConv)}
  });
  _ppb.addEventListener('contextmenu',function(e){
    var t=e.target.closest('[data-context="member-menu"]');if(!t)return;
    e.preventDefault();showMemberMenu(e,t.dataset.memberId,t.dataset.convId)
  })
}
// Delegation: modal-pinned (unpin button)
var _mp=$('modal-pinned');
if(_mp){
  _mp.addEventListener('click',function(e){
    var t=e.target.closest('[data-action="unpin-msg"]');if(!t)return;
    e.stopPropagation();togglePinMessage(t.dataset.msgId);showPinnedMessages()
  })
}
