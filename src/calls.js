// ===== VOICE CALL =====


// Simple ringtone using Web Audio API

function playRingtone(){
  try{
    store.ringtoneCtx=new(window.AudioContext||window.webkitAudioContext)();
    store.ringtoneOsc=store.ringtoneCtx.createOscillator();
    store.ringtoneGain=store.ringtoneCtx.createGain();
    store.ringtoneOsc.type='sine';store.ringtoneOsc.frequency.value=440;
    store.ringtoneGain.gain.value=0.15;
    store.ringtoneOsc.connect(store.ringtoneGain);store.ringtoneGain.connect(store.ringtoneCtx.destination);
    store.ringtoneOsc.start();
    // Vibrato effect
    if(store.ringtoneVibrato)clearInterval(store.ringtoneVibrato);
    store.ringtoneVibrato=setInterval(function(){
      if(store.ringtoneOsc)store.ringtoneOsc.frequency.value=store.ringtoneOsc.frequency.value===440?520:440
    },400)
  }catch(e){}
}
function stopRingtone(){
  if(store.ringtoneVibrato){clearInterval(store.ringtoneVibrato);store.ringtoneVibrato=null}
  try{if(store.ringtoneOsc){store.ringtoneOsc.stop();store.ringtoneOsc=null}if(store.ringtoneCtx){store.ringtoneCtx.close();store.ringtoneCtx=null}}catch(e){}
}

async function startCall(){
  if(!store.activeConvId){return}
  ensureCallPoll();
  var conv=findConv(store.activeConvId);if(!conv)return;
  if(store.callState){return}
  // Show inline call bar
  $('call-bar').style.display='flex';
  $('call-bar-name').textContent=conv.name;
  $('call-bar-status').textContent=tr('calling');
  $('call-bar-timer').style.display='none';
  // Helper: get avatar HTML for a user
  function makeCallAvatar(id, name, bgColor, avatarLetter, avatarUrl){
    var el=document.createElement('div');
    el.style.cssText='width:36px;height:36px;border-radius:50%;flex-shrink:0;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center';
    if(avatarUrl){
      el.style.background='transparent';
      el.innerHTML='<img src="'+escJs(sanitizeUrl(avatarUrl))+'" style="width:100%;height:100%;object-fit:cover">'
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
  for(var sai=0;sai<accs.length;sai++){if(accs[sai].id===store.activeAccountId){selfAcc=accs[sai];break}}
  // Self avatar
  var selfA=makeCallAvatar(store.activeAccountId,myName,'var(--grad)',myName.charAt(0).toUpperCase(),selfAcc?selfAcc.avatar:null);
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
            ma.innerHTML='<img src="'+escJs(sanitizeUrl(accs[mai].avatar))+'" style="width:100%;height:100%;object-fit:cover">';
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
  store.callStartTime=Date.now();
  store.callState='calling';
  playRingtone();
  
  // Send call offer as a special message
  var callId=uid();
  store.pendingCallMsgId=callId;
  if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];
  store.messages[store.activeConvId].push({id:callId,type:'call',action:'offer',time:timeNow(),sender:$('sidebar-username').textContent,status:'calling'});;
  saveMessages();
  
  // Start local stream and create offer
  await startLocalStream();
  createOffer(callId)
}


async function startLocalStream(){
  try {
    var stream=await navigator.mediaDevices.getUserMedia({audio:true});
    store.callLocalStream=stream;
    if(store.vadTimer){clearInterval(store.vadTimer)}
    try{
      var vCtx=new(window.AudioContext||window.webkitAudioContext)();
      var vSrc=vCtx.createMediaStreamSource(stream);
      var vAna=vCtx.createAnalyser();vAna.fftSize=128;
      vSrc.connect(vAna);
      var vData=new Uint8Array(vAna.frequencyBinCount);
      var vadNoiseFloor=0,vadCalibCount=0,vadSilenceFrames=0;
      var vadSpeaking=false;
      store.vadTimer=setInterval(function(){
        vAna.getByteFrequencyData(vData);
        var avg=0;for(var vi=0;vi<vData.length;vi++){avg+=vData[vi]}
        avg/=vData.length;
        if(vadCalibCount<20){vadNoiseFloor+=avg;vadCalibCount++;
          if(vadCalibCount===20)vadNoiseFloor/=20;
          return
        }
        var threshold=vadNoiseFloor+8;
        var selfEl=$('call-self-avatar');
        if(selfEl){
          if(avg>threshold){
            vadSpeaking=true;
            vadSilenceFrames=0;
            selfEl.style.outline='2.5px solid #22c55e';selfEl.style.outlineOffset='-2.5px'
          }else{
            vadSilenceFrames++;
            if(vadSilenceFrames>4&&vadSpeaking){
              vadSpeaking=false;
              selfEl.style.outline='';selfEl.style.outlineOffset=''
            }
          }
        }
        if(!vadSpeaking)vadNoiseFloor=vadNoiseFloor*0.95+avg*0.05
      },150)
    }catch(e){}
  }catch(e){alert(tr('mic_required'));endCall()}
}

async function createOffer(callId){
  var config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'}]};
  store.callPeerConn=new RTCPeerConnection(config);
  store.callLocalStream.getTracks().forEach(function(t){store.callPeerConn.addTrack(t,store.callLocalStream)});
  store.callPeerConn.onicecandidate=function(e){
    if(e.candidate&&callId&&store.activeConvId){
      fbSendCallSignal(store.activeConvId,{action:'ice',candidate:e.candidate,callId:callId})
    }
  };
  store.callPeerConn.oniceconnectionstatechange=function(){
    if(!store.callPeerConn)return;
    if(store.callPeerConn.iceConnectionState==='connected'||store.callPeerConn.iceConnectionState==='completed'){
      if(store.callState!=='connected'){
        store.callState='connected';store.callStartTime=Date.now();
        $('call-bar-status').textContent=tr('connected');
        $('call-bar-timer').style.display='inline';
        stopRingtone();
        if(store.callTimerInterval){clearInterval(store.callTimerInterval)}
        store.callTimerInterval=setInterval(function(){
          var sec=Math.floor((Date.now()-store.callStartTime)/1000);
          var m=Math.floor(sec/60),s=sec%60;
          $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
        },500)
      }
    }
    if(store.callPeerConn.iceConnectionState==='disconnected'||store.callPeerConn.iceConnectionState==='failed'){
      endCall()
    }
  };
  store.callPeerConn.ontrack=function(e){
    var audioEl=document.createElement('audio');
    audioEl.srcObject=e.streams[0];
    audioEl.autoplay=true;
    audioEl.playsinline=true;
    audioEl.style.display='none';
    document.body.appendChild(audioEl);
    audioEl.play().catch(console.error)
  };
  // Process any pending ICE candidates collected before PeerConnection was ready
  while(store.pendingIceCandidates.length>0){
    var c=store.pendingIceCandidates.shift();
    try{store.callPeerConn.addIceCandidate(new RTCIceCandidate(c))}catch(e){}
  }
  try {
    var offer=await store.callPeerConn.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:false});
    store.callPeerConn.setLocalDescription(offer);
    $('call-bar-status').textContent=tr('connecting');
    if(store.activeConvId)fbSendCallSignal(store.activeConvId,{action:'offer',sdp:offer,callId:callId,callerName:$('sidebar-username').textContent||tr('someone')})
  }catch(e){console.error(e)}
}

// ===== FIRESTORE CALL SIGNALING =====


async function fbSendCallSignal(convId,data){
  if(!window.db||!fbUserId()||!convId)return;
  data.from=fbUserId();
  data.timestamp=firebase.firestore.FieldValue.serverTimestamp();
  try {
    var ref=await db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.CALL_SIGNALS).add(data);
    return ref.id
  }catch(e){return null}
}

function fbListenCallSignals(convId){
  if(store._callSignalUnsub){store._callSignalUnsub();store._callSignalUnsub=null}
  if(!window.db||!convId||!fbUserId())return;
  var uid=fbUserId();
  store._callSigInit=true;
  store._callSignalUnsub=db.collection(COLLECTIONS.CONVERSATIONS).doc(convId).collection(COLLECTIONS.CALL_SIGNALS).orderBy('timestamp','asc').onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      if(change.type!=='added')return;
      var d=change.doc.data(),sid=change.doc.id;
      if(d.from===uid)return;
      // Skip signals older than 10 seconds
      if(d.timestamp){
        var st=d.timestamp.toMillis?d.timestamp.toMillis():Date.now();
        if(Date.now()-st>10000)return
      }
      if(!store.callState){
        // Incoming offer
        if(d.action==='offer'&&d.sdp){
          // Verify caller is a member of this conversation
          var conv=findConv(convId);
          if(!conv)return;
          if(conv.memberIds&&conv.memberIds.indexOf(d.from)===-1)return;
          // Skip if caller is offline (DM only)
          if(!conv.isGroup&&conv.online===false)return;
          store._callSigOfferId=sid;
          var callerName=d.callerName||tr('someone');
          $('incoming-caller-name').textContent=callerName;
          store.callState='ringing';
          store.pendingCallMsgId=sid;
          playRingtone();
          $('incoming-call').style.display='flex';
          // Auto-cleanup the offer
          setTimeout(function(){if(store.callState==='ringing'&&store.pendingCallMsgId===sid){$('incoming-call').style.display='none';stopRingtone();store.callState=null;store.pendingCallMsgId=null}},30000)
        }
      }
      // Handle ICE candidates regardless of callState (queue if no PeerConnection yet)
      if(d.action==='ice'&&d.candidate){
        if(store.callPeerConn){
          try{store.callPeerConn.addIceCandidate(new RTCIceCandidate(d.candidate))}catch(e){}
        }else{
          store.push('pendingIceCandidates', d.candidate)
        }
      }
      if(store.callState==='calling'||store.callState==='connected'){
        // Incoming answer (we are the caller)
        if(d.action==='answer'&&d.sdp&&store.callPeerConn&&store.callPeerConn.localDescription&&store.callPeerConn.localDescription.type==='offer'){
          (async function(){try{await store.callPeerConn.setRemoteDescription(new RTCSessionDescription(d.sdp));
            $('call-bar-status').textContent=tr('connected');
            $('call-bar-timer').style.display='inline';
            store.callState='connected';
            store.callStartTime=Date.now();
            stopRingtone();
            if(store.callTimerInterval){clearInterval(store.callTimerInterval)}
            store.callTimerInterval=setInterval(function(){
              var sec=Math.floor((Date.now()-store.callStartTime)/1000);
              var m=Math.floor(sec/60),s=sec%60;
              $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
            },500)
          }catch(e){console.error(e)}})()
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
  if(store._callSignalUnsub){store._callSignalUnsub();store._callSignalUnsub=null}
  store._callSigOfferId=null;
  store._callSigInit=false
}

function checkIncomingCalls(){} // Replaced by fbListenCallSignals

async function acceptCall(){
  if(store.callState!=='ringing'||!store.pendingCallMsgId)return;
  stopRingtone();$('incoming-call').style.display='none';
  $('call-bar').style.display='flex';
  var name=$('incoming-caller-name').textContent;
  var avatarContainer=$('call-member-avatars');avatarContainer.innerHTML='';
  var a=document.createElement('div');
  a.style.cssText='width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 0 0 2px var(--accent)';
  a.id='call-bar-avatar';a.textContent=name.charAt(0);
  avatarContainer.appendChild(a);
  $('call-bar-name').textContent=name;
  $('call-bar-status').textContent=tr('connecting');
  $('call-bar-timer').style.display='none';
  store.callState='calling';
  
  try {
    if(!window.db||!store.activeConvId||!store._callSigOfferId){endCall();return}
    var odoc=await db.collection(COLLECTIONS.CONVERSATIONS).doc(store.activeConvId).collection(COLLECTIONS.CALL_SIGNALS).doc(store._callSigOfferId).get();
    if(!odoc.exists){endCall();return}
    var offer=(odoc.data()).sdp,fcallId=(odoc.data()).callId;
    if(!offer){endCall();return}
    await startLocalStream();
    var config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'}]};
    store.callPeerConn=new RTCPeerConnection(config);
    store.callLocalStream.getTracks().forEach(function(t){store.callPeerConn.addTrack(t,store.callLocalStream)});
    store.callPeerConn.onicecandidate=function(e){
      if(e.candidate&&store.activeConvId) fbSendCallSignal(store.activeConvId,{action:'ice',candidate:e.candidate,callId:fcallId})
    };
    store.callPeerConn.oniceconnectionstatechange=function(){
      if(!store.callPeerConn)return;
      if(store.callPeerConn.iceConnectionState==='connected'||store.callPeerConn.iceConnectionState==='completed'){
        if(store.callState!=='connected'){
          store.callState='connected';store.callStartTime=Date.now();
          $('call-bar-status').textContent=tr('connected');
          $('call-bar-timer').style.display='inline';
          if(store.callTimerInterval){clearInterval(store.callTimerInterval)}
          store.callTimerInterval=setInterval(function(){
            var sec=Math.floor((Date.now()-store.callStartTime)/1000);
            var m=Math.floor(sec/60),s=sec%60;
            $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
          },500)
        }
      }
      if(store.callPeerConn.iceConnectionState==='disconnected'||store.callPeerConn.iceConnectionState==='failed'){endCall()}
    };
    store.callPeerConn.ontrack=function(e){
      var audioEl=document.createElement('audio');
      audioEl.srcObject=e.streams[0];
      audioEl.autoplay=true;audioEl.playsinline=true;
      audioEl.style.display='none';
      document.body.appendChild(audioEl);
      audioEl.play().catch(console.error)
    };
    while(store.pendingIceCandidates.length>0){
      var c=store.pendingIceCandidates.shift();
      try{store.callPeerConn.addIceCandidate(new RTCIceCandidate(c))}catch(e){}
    }
    await store.callPeerConn.setRemoteDescription(new RTCSessionDescription(offer));
    var answer=await store.callPeerConn.createAnswer({offerToReceiveAudio:true,offerToReceiveVideo:false});
    await store.callPeerConn.setLocalDescription(answer);
    store.callState='connected';store.callStartTime=Date.now();
    $('call-bar-status').textContent=tr('connected');
    $('call-bar-timer').style.display='inline';
    if(store.callTimerInterval){clearInterval(store.callTimerInterval)}
    store.callTimerInterval=setInterval(function(){
      var sec=Math.floor((Date.now()-store.callStartTime)/1000);
      var m=Math.floor(sec/60),s=sec%60;
      $('call-bar-timer').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s
    },500);
    if(store.activeConvId)fbSendCallSignal(store.activeConvId,{action:'answer',sdp:answer,callId:fcallId})
  }catch(e){endCall()}
}

function declineCall(){stopRingtone();$('incoming-call').style.display='none';if(store.pendingCallMsgId){store.pendingCallMsgId=null}store.callState=null}

function endCall(){
  stopRingtone();
  $('call-bar').style.display='none';
  $('incoming-call').style.display='none';
  if(store.callTimerInterval){clearInterval(store.callTimerInterval);store.callTimerInterval=null}
  if(store.callPeerConn){store.callPeerConn.close();store.callPeerConn=null}
  if(store.vadTimer){clearInterval(store.vadTimer);store.vadTimer=null}
  if(store.callLocalStream){store.callLocalStream.getTracks().forEach(function(t){t.stop()});store.callLocalStream=null}
  if(store.callCamStream){store.callCamStream.getTracks().forEach(function(t){t.stop()});store.callCamStream=null}
  if(store.callScreenStream){store.callScreenStream.getTracks().forEach(function(t){t.stop()});store.callScreenStream=null}
  var cv=$('call-local-video');if(cv){cv.style.display='none';var cve=$('call-local-video-el');if(cve)cve.srcObject=null}
  // Add call end log with duration
  if(store.activeConvId&&store.messages[store.activeConvId]&&store.callStartTime>0){
    var now=Date.now();
    var dur=Math.floor((now-store.callStartTime)/1000);
    var dm=Math.floor(dur/60),ds=dur%60;
    var startH=new Date(store.callStartTime).getHours(),startM=new Date(store.callStartTime).getMinutes();
    var endH=new Date(now).getHours(),endM=new Date(now).getMinutes();
    var startStr=('0'+startH).slice(-2)+':'+('0'+startM).slice(-2);
    var endStr=('0'+endH).slice(-2)+':'+('0'+endM).slice(-2);
    var durStr=(dm>0?dm+tr('dur_min')+' ':'')+ds+tr('dur_sec');
    var endLogTxt='📞 '+tr('voice_call')+' \u00B7 '+startStr+' \u2192 '+endStr+' ('+durStr+')';
    var endLogMsg={id:uid(),type:'log',text:endLogTxt,time:timeNow(),senderId:fbUserId()};
    store.messages[store.activeConvId].push(endLogMsg);;
    fbSendMessage(store.activeConvId,endLogMsg);
    var conv2=findConv(store.activeConvId);if(conv2){conv2.lastMsg=endLogTxt;conv2.lastActivity=Date.now();conv2.time=timeNow()}
    saveMessages();
    renderMessages(store.activeConvId);
    renderConversations()
  }
  store.pendingIceCandidates=[];
  store.callState=null;store.callMicMuted=false;store.callSpeakerMuted=false;
  if(store.activeConvId)fbSendCallSignal(store.activeConvId,{action:'end'});
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
  store.callMicMuted=!store.callMicMuted;
  if(store.callLocalStream){store.callLocalStream.getAudioTracks().forEach(function(t){t.enabled=!store.callMicMuted})}
  $('call-mic-btn').style.background=store.callMicMuted?'rgba(239,68,68,.2)':'rgba(255,255,255,.06)';
  $('call-mic-btn').style.color=store.callMicMuted?'#ef4444':'var(--text3)'
}

function enlargeCallVideo(){
  var el=$('call-local-video-el');
  if(!el||!el.srcObject)return;
  var overlay=document.createElement('div');
  overlay.id='call-video-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column;-webkit-app-region:no-drag';
  overlay.onclick=function(e){if(e.target===overlay)closeCallVideo()};
  var video=document.createElement('video');
  video.srcObject=el.srcObject;video.autoplay=true;video.muted=true;
  video.style.cssText='max-width:90vw;max-height:85vh;border-radius:12px;object-fit:contain';
  overlay.appendChild(video);video.play().catch(console.error);
  var closeBtn=document.createElement('button');
  closeBtn.innerHTML='✕';
  closeBtn.style.cssText='position:absolute;top:16px;right:16px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center';
  closeBtn.onclick=function(){closeCallVideo()};
  overlay.appendChild(closeBtn);document.body.appendChild(overlay)
}
function closeCallVideo(){
  var el=document.getElementById('call-video-overlay');
  if(el)document.body.removeChild(el)
}

async function toggleCallCamera(){
  if(!store.callState)return;
  var videoEl=$('call-local-video-el');
  var container=$('call-local-video');
  if(store.callCamStream){
    store.callCamStream.getTracks().forEach(function(t){t.stop()});store.callCamStream=null;
    videoEl.srcObject=null;container.style.display='none';
    $('call-cam-btn').style.background='rgba(255,255,255,.04)';$('call-cam-btn').style.color='var(--text3)';
    return
  }
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){console.log('[cam] getUserMedia not available');return}
    var stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    store.callCamStream=stream;videoEl.srcObject=stream;container.style.display='';
    videoEl.play().catch(console.error);
    $('call-cam-btn').style.background='rgba(34,197,94,.15)';$('call-cam-btn').style.color='#22c55e'
  }catch(e){console.error('Camera error:',e)}
}
async function toggleCallScreen(){
  if(!store.callState)return;
  var videoEl=$('call-local-video-el');
  var container=$('call-local-video');
  if(store.callScreenStream){
    store.callScreenStream.getTracks().forEach(function(t){t.stop()});store.callScreenStream=null;
    videoEl.srcObject=null;container.style.display='none';
    $('call-screen-btn').style.background='rgba(255,255,255,.04)';$('call-screen-btn').style.color='var(--text3)';
    return
  }
  try{
    // Try standard getDisplayMedia first (browser picker)
    if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia){
      try{
        var stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
        if(stream){applyScreenStream(stream);return}
      }catch(e){console.log('[screen] std failed')}
    }
    // Fallback: Electron desktopCapturer via IPC — show picker
    if(window.electronAPI&&window.electronAPI.getScreenStream){
      console.log('[screen] fetching sources via desktopCapturer');
      var result=await window.electronAPI.getScreenStream();
      console.log('[screen] got',result&&result.sources?result.sources.length:'0','sources, error:',result&&result.error);
      if(result&&result.sources&&result.sources.length>0){
        showScreenPicker(result.sources,function(sourceId){
          console.log('[screen] user selected source',sourceId);
          captureScreenById(sourceId,videoEl,container)
        });return
      }
    }
    console.log('[screen] all methods failed')
  }catch(e){console.error('[screen] error:',e.name,e.message,e.code)}
}
function applyScreenStream(stream){
  var videoEl=$('call-local-video-el');var container=$('call-local-video');
  store.callScreenStream=stream;videoEl.srcObject=stream;container.style.display='';
  videoEl.play().catch(console.error);
  $('call-screen-btn').style.background='rgba(34,197,94,.15)';$('call-screen-btn').style.color='#22c55e';
  stream.getVideoTracks()[0].onended=function(){
    store.callScreenStream=null;videoEl.srcObject=null;container.style.display='none';
    $('call-screen-btn').style.background='rgba(255,255,255,.04)';$('call-screen-btn').style.color='var(--text3)'
  }
}
async function captureScreenById(sourceId,videoEl,container){
  try{
    console.log('[screen] capturing source',sourceId);
    var stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'desktop',chromeMediaSourceId:sourceId}}});
    console.log('[screen] capture OK, applying stream');
    applyScreenStream(stream)
  }catch(e){console.log('[screen] capture failed',e.name,e.message)}
}
function showScreenPicker(sources,callback){
  console.log('[picker] creating overlay with',sources.length,'sources');
  var existing=document.getElementById('screen-picker-overlay');
  if(existing)existing.remove();
  var screens=sources.filter(function(s){return s.isScreen});
  if(screens.length===0){console.log('[picker] no screens found');return}
  // Sadece ekranları göster, window paylaşımını kaldır (Electron desktopCapturer sınırlı)
  var activeTab='screens';

  var overlay=document.createElement('div');
  overlay.id='screen-picker-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;-webkit-app-region:no-drag';
  document.body.appendChild(overlay);

  var card=document.createElement('div');
  card.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:600px;max-width:92vw;max-height:80vh;overflow:hidden;box-shadow:0 16px 64px rgba(0,0,0,.5);display:flex;flex-direction:column';
  overlay.appendChild(card);

  // Header
  var header=document.createElement('div');
  header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)';
  header.innerHTML='<span style="font-size:16px;font-weight:700;color:var(--text)">'+tr('screen_share')+'</span>'+
    '<button style="width:30px;height:30px;border:none;border-radius:7px;background:transparent;cursor:pointer;color:var(--text4);font-size:18px;display:flex;align-items:center;justify-content:center" onclick="this.closest(\'#screen-picker-overlay\').remove()">✕</button>';
  card.appendChild(header);

  // Grid: sadece ekranlar
  var listContainer=document.createElement('div');
  listContainer.style.cssText='flex:1;overflow-y:auto;padding:16px;min-height:120px';
  card.appendChild(listContainer);

  function renderScreens(){
    var items=screens;
    if(items.length===0){listContainer.innerHTML='<div style="text-align:center;padding:40px;color:var(--text4);font-size:13px">'+tr('no_screen_found')+'</div>';return}
    listContainer.innerHTML='';
    var grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px';
    items.forEach(function(s){
      var item=document.createElement('div');
      item.style.cssText='border:2px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;background:var(--bg3)';
      item.onmouseenter=function(){this.style.borderColor='var(--accent)'};
      item.onmouseleave=function(){this.style.borderColor='var(--border)'};
      var img=document.createElement('img');
      img.src=s.thumbnail;
      img.style.cssText='width:100%;height:90px;object-fit:cover;display:block';
      item.appendChild(img);
      var label=document.createElement('div');
      label.textContent=s.name;
      label.style.cssText='padding:7px 8px;font-size:10px;color:var(--text3);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      item.appendChild(label);
      item.onclick=function(){console.log('[picker] selected',s.id);overlay.remove();callback(s.id)};
      grid.appendChild(item)
    });
    listContainer.appendChild(grid)
  }
  renderScreens();
  console.log('[picker] ready');
}

function toggleCallSpeaker(){
  store.callSpeakerMuted=!store.callSpeakerMuted;
  $('call-speaker-btn').style.background=store.callSpeakerMuted?'rgba(239,68,68,.2)':'rgba(255,255,255,.06)';
  $('call-speaker-btn').style.color=store.callSpeakerMuted?'#ef4444':'var(--text3)';
  var els=document.querySelectorAll('audio[srcObject]');
  els.forEach(function(el){
    if(el.setSinkId){
      el.setSinkId(store.callSpeakerMuted?'default':'speaker').catch(function(){})
    }
    if(store.callSpeakerMuted){el.volume=0.3}else{el.volume=1}
  })
}

// Poll for incoming calls (fallback — primary signaling is via Firestore listener)
function ensureCallPoll(){
  if(store.callPollTimer)return;
  store.callPollTimer=setInterval(function(){
    if(!store.activeConvId)return;
    if(store.callState==='calling'&&store.callPeerConn){
      if(!store.messages[store.activeConvId])return;
      var msgs=store.messages[store.activeConvId];
      for(var ci=0;ci<msgs.length;ci++){
        if(msgs[ci].type==='call'&&msgs[ci].action==='ice'&&msgs[ci].candidate&&!msgs[ci]._processed){
          try{store.callPeerConn.addIceCandidate(new RTCIceCandidate(msgs[ci].candidate));msgs[ci]._processed=true}catch(e){}
        }
      }
    }
  },2000);
}
