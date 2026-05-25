// ===== VOICE CALL =====


// Simple ringtone using Web Audio API

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
  }).catch(function(){alert('Mikrofon erişimi gerekli');endCall()})}catch(e){endCall()}}

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
callPollTimer=setInterval(function(){
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
