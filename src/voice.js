// ===== VOICE RECORDER =====

async function startVoice(){
  if(!store.activeConvId)return;
  if(store.mediaRecorder&&store.mediaRecorder.state==='recording'){stopVoice();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Ses kaydı desteklenmiyor.');return}
  try {
    var stream=await navigator.mediaDevices.getUserMedia({audio:true});
    store.audioChunks=[];store.voiceStart=Date.now();
    try{store.mediaRecorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'})}catch(e){store.mediaRecorder=new MediaRecorder(stream)}
    store.mediaRecorder.ondataavailable=function(e){if(e.data.size>0)store.push('audioChunks', e.data)};
    store.mediaRecorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop()})};
    store.mediaRecorder.start(100);
    
    // Audio analysis for waveform
    try{
      store.audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      store.sourceNode=store.audioCtx.createMediaStreamSource(stream);
      store.analyser=store.audioCtx.createAnalyser();store.analyser.fftSize=64;
      store.sourceNode.connect(store.analyser);
      var dataArray=new Uint8Array(store.analyser.frequencyBinCount);
      var wave=$('vr-wave');
      function drawWave(){
        if(!store.analyser)return;
        store.analyser.getByteFrequencyData(dataArray);
        wave.innerHTML='';
        for(var i=0;i<20;i++){
          var idx=Math.floor(i*dataArray.length/20);
          var val=dataArray[idx]/255;
          var h=4+val*24;
          var bar=document.createElement('div');bar.className='vr-bar';bar.style.height=h+'px';
          wave.appendChild(bar)
        }
        store.animFrame=requestAnimationFrame(drawWave)
      }
      drawWave()
    }catch(e){}
    
    $('chat-input').style.display='none';$('chat-send').style.display='none';$('voice-btn').style.display='none';
    $('voice-recorder').style.display='flex';
    if(store.voiceTimer)clearInterval(store.voiceTimer);
    store.voiceTimer=setInterval(function(){
      var elapsed=Math.floor((Date.now()-store.voiceStart)/1000);
      var m=Math.floor(elapsed/60),s=elapsed%60;
      $('vr-time').textContent=m+':'+(s<10?'0':'')+s
    },200)
  }catch(e){alert('Mikrofon erişimi reddedildi.')}
}

function stopVoice(){
  if(store.mediaRecorder&&store.mediaRecorder.state==='recording'){store.mediaRecorder.stop()}
  if(store.voiceTimer){clearInterval(store.voiceTimer);store.voiceTimer=null}
  if(store.animFrame){cancelAnimationFrame(store.animFrame);store.animFrame=null}
  if(store.audioCtx){store.audioCtx.close();store.audioCtx=null;store.analyser=null}
}

function cancelVoice(){
  stopVoice();store.audioChunks=[];
  $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display=''
}

function sendVoice(){
  stopVoice();
  if(store.audioChunks.length===0){cancelVoice();return}
  var dur=Math.floor((Date.now()-store.voiceStart)/1000);
  var blob=new Blob(store.audioChunks,{type:'audio/webm'});
  var reader=new FileReader();
  reader.onloadend=async function(){
    var dataUrl=reader.result;
    var id=uid();
    if(!store.messages[store.activeConvId])store.messages[store.activeConvId]=[];
    var msg={id:id,type:'sent',senderId:fbUserId(),text:'',time:timeNow(),edited:false,deleted:false,audio:dataUrl,duration:dur};
    store.messages[store.activeConvId].push(msg);store.emit('messages');
    renderMessages(store.activeConvId);
    var conv=findConv(store.activeConvId);
    if(conv){conv.lastMsg='🎤 Sesli mesaj';conv.lastActivity=Date.now();conv.time=timeNow();renderConversations()}
    saveMessages();
    // Upload to Firebase Storage and sync via Firestore
    if(window.storage&&dataUrl&&dataUrl.indexOf('data:')===0){
      var path='voice/'+store.activeConvId+'/'+Date.now()+'_'+id+'.webm';
      try{var url=await fbUploadFile(dataUrl,path);msg.audio=url;fbSendMessage(store.activeConvId,msg);saveMessages()}catch(e){console.error(e)}
    }else{fbSendMessage(store.activeConvId,msg)}
    $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display='';
  };
  reader.readAsDataURL(blob)
}

// ===== AUDIO PLAYBACK =====

function playAudio(msgId){
  var convId=store.activeConvId;if(!convId)return;
  var msgs=store.messages[convId]||[],msg=null;
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msg=msgs[i];break}}
  if(!msg||!msg.audio)return;
  
  // Pause if already playing this message
  if(store.currentAudioId===msgId&&store.currentAudio&&!store.currentAudio.paused){
    store.currentAudio.pause();
    if(store.audioProgressTimer){clearInterval(store.audioProgressTimer);store.audioProgressTimer=null}
    updateAudioUI(msgId,'paused');
    return
  }
  
  // Resume if paused same message
  if(store.currentAudioId===msgId&&store.currentAudio&&store.currentAudio.paused){
    store.currentAudio.play().catch(console.error);
    updateAudioUI(msgId,'playing');
    startAudioProgress(msgId,msg);
    return
  }
  
  // Start new audio
  if(store.currentAudio){store.currentAudio.pause();store.currentAudio=null}
  if(store.audioProgressTimer){clearInterval(store.audioProgressTimer);store.audioProgressTimer=null}
  
  var audio=new Audio(msg.audio);
  store.currentAudio=audio;store.currentAudioId=msgId;
  
  // Handle seeking before play
  var hasSeek=store.seekCache[msgId]!==undefined&&store.seekCache[msgId]<0.98;
  var seekPct=hasSeek?Math.min(1,Math.max(0,store.seekCache[msgId])):0;
  if(hasSeek){delete store.seekCache[msgId]}
  
  updateAudioUI(msgId,'playing');
  
  audio.addEventListener('canplay',function(){
    if(hasSeek)audio.currentTime=seekPct*audio.duration;
    audio.play().catch(console.error);
    startAudioProgress(msgId,msg)
  },{once:true});
  
  audio.onended=function(){if(store.audioProgressTimer){clearInterval(store.audioProgressTimer);store.audioProgressTimer=null}updateAudioUI(msgId,'ended');store.currentAudio=null;store.currentAudioId=null}
}

function startAudioProgress(msgId,msg){
  if(store.audioProgressTimer){clearInterval(store.audioProgressTimer)}
  store.audioProgressTimer=setInterval(function(){
    if(!store.currentAudio||store.currentAudio.paused){
      if(store.currentAudio&&store.currentAudio.ended){clearInterval(store.audioProgressTimer);store.audioProgressTimer=null;updateAudioUI(msgId,'ended');store.currentAudio=null;store.currentAudioId=null}
      return
    }
    var pct=store.currentAudio.currentTime/store.currentAudio.duration;
    var el=$('msg-'+msgId);
    if(el){
      var prog=el.querySelector('.ma-progress');if(prog)prog.style.width=(pct*100)+'%';
      var durEl=el.querySelector('.ma-dur');if(durEl){
        var ct=Math.floor(store.currentAudio.currentTime),dt=Math.floor(msg.duration||store.currentAudio.duration);
        var cm=Math.floor(ct/60),cs=ct%60,dm=Math.floor(dt/60),ds=dt%60;
        durEl.textContent=cm+':'+(cs<10?'0':'')+cs+' / '+dm+':'+(ds<10?'0':'')+ds
      }
    }
  },100)
}

function seekAudio(e,msgId){
  var bar=e.currentTarget;
  var rect=bar.getBoundingClientRect();
  var pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  
  // Save seek position for later playback
  store.seekCache[msgId]=pct;
  
  // Update visual progress bar immediately
  var prog=bar.querySelector('.ma-progress');
  if(prog)prog.style.width=(pct*100)+'%';
  
  // Update duration display
  var msg=null;
  if(store.activeConvId&&store.messages[store.activeConvId]){
    for(var si=0;si<store.messages[store.activeConvId].length;si++){
      if(store.messages[store.activeConvId][si].id===msgId){msg=store.messages[store.activeConvId][si];break}
    }
  }
  var durEl=bar.parentNode?bar.parentNode.querySelector('.ma-dur'):null;
  if(msg&&msg.audio&&msg.duration&&durEl){
    var total=msg.duration,current=Math.round(pct*total);
    var cm=Math.floor(current/60),cs=current%60,dm=Math.floor(total/60),ds=total%60;
    durEl.textContent=cm+':'+(cs<10?'0':'')+cs+' / '+dm+':'+(ds<10?'0':'')+ds
  }
  
  // Seek audio if playing
  if(store.currentAudioId===msgId&&store.currentAudio){
    store.currentAudio.currentTime=pct*store.currentAudio.duration
  }
}

function updateAudioUI(msgId,state){
  var el=$('msg-'+msgId);if(!el)return;
  var btn=el.querySelector('.ma-play');
  if(btn){
    if(state==='playing')btn.innerHTML='<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    else btn.innerHTML='<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  }
  var wave=el.querySelector('.ma-wave');
  if(wave){
    if(state==='playing')wave.style.opacity='1';
    else wave.style.opacity='.5'
  }
}

// scrollToBottom referenced from renderMessages (now in messaging.js)
function scrollToBottom(){var el=$('chat-messages');if(el){el.scrollTo({top:el.scrollHeight,behavior:'smooth'});store._hasNewMsg=false;var ni=$('new-msg-indicator');if(ni)ni.style.display='none';var sb=$('scroll-bottom-btn');if(sb)sb.style.display='none';var cv=findConv(store.activeConvId);if(cv&&cv.unread>0){cv.unread=0;saveUnreadCounts();renderConversations()}}
}
