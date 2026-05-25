// ===== VOICE RECORDER =====

function startVoice(){
  if(!activeConvId)return;
  if(mediaRecorder&&mediaRecorder.state==='recording'){stopVoice();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Ses kaydı desteklenmiyor.');return}
  try{navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    audioChunks=[];voiceStart=Date.now();
    try{mediaRecorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'})}catch(e){mediaRecorder=new MediaRecorder(stream)}
    mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data)};
    mediaRecorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop()})};
    mediaRecorder.start(100);
    
    // Audio analysis for waveform
    try{
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      sourceNode=audioCtx.createMediaStreamSource(stream);
      analyser=audioCtx.createAnalyser();analyser.fftSize=64;
      sourceNode.connect(analyser);
      var dataArray=new Uint8Array(analyser.frequencyBinCount);
      var wave=$('vr-wave');
      function drawWave(){
        if(!analyser)return;
        analyser.getByteFrequencyData(dataArray);
        wave.innerHTML='';
        for(var i=0;i<20;i++){
          var idx=Math.floor(i*dataArray.length/20);
          var val=dataArray[idx]/255;
          var h=4+val*24;
          var bar=document.createElement('div');bar.className='vr-bar';bar.style.height=h+'px';
          wave.appendChild(bar)
        }
        animFrame=requestAnimationFrame(drawWave)
      }
      drawWave()
    }catch(e){}
    
    $('chat-input').style.display='none';$('chat-send').style.display='none';$('voice-btn').style.display='none';
    $('voice-recorder').style.display='flex';
    if(voiceTimer)clearInterval(voiceTimer);
    voiceTimer=setInterval(function(){
      var elapsed=Math.floor((Date.now()-voiceStart)/1000);
      var m=Math.floor(elapsed/60),s=elapsed%60;
      $('vr-time').textContent=m+':'+(s<10?'0':'')+s
    },200)
  }).catch(function(){alert('Mikrofon erişimi reddedildi.')})}catch(e){alert('Ses kaydı başlatılamadı.')}
}

function stopVoice(){
  if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop()}
  if(voiceTimer){clearInterval(voiceTimer);voiceTimer=null}
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null}
  if(audioCtx){audioCtx.close();audioCtx=null;analyser=null}
}

function cancelVoice(){
  stopVoice();audioChunks=[];
  $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display=''
}

function sendVoice(){
  stopVoice();
  if(audioChunks.length===0){cancelVoice();return}
  var dur=Math.floor((Date.now()-voiceStart)/1000);
  var blob=new Blob(audioChunks,{type:'audio/webm'});
  var reader=new FileReader();
  reader.onloadend=function(){
    var dataUrl=reader.result;
    var id=uid();
    if(!messages[activeConvId])messages[activeConvId]=[];
    var msg={id:id,type:'sent',senderId:fbUserId(),text:'',time:timeNow(),edited:false,deleted:false,audio:dataUrl,duration:dur};
    messages[activeConvId].push(msg);
    renderMessages(activeConvId);
    var conv=findConv(activeConvId);
    if(conv){conv.lastMsg='🎤 Sesli mesaj';conv.lastActivity=Date.now();conv.time=timeNow();renderConversations()}
    saveMessages();
    // Upload to Firebase Storage and sync via Firestore
    if(window.storage&&dataUrl&&dataUrl.indexOf('data:')===0){
      var path='voice/'+activeConvId+'/'+Date.now()+'_'+id+'.webm';
      fbUploadFile(dataUrl,path).then(function(url){
        msg.audio=url;fbSendMessage(activeConvId,msg);saveMessages()
      }).catch(console.error)
    }else{fbSendMessage(activeConvId,msg)}
    $('voice-recorder').style.display='none';$('chat-input').style.display='';$('chat-send').style.display='';$('voice-btn').style.display='';
  };
  reader.readAsDataURL(blob)
}

// ===== AUDIO PLAYBACK =====

function playAudio(msgId){
  var convId=activeConvId;if(!convId)return;
  var msgs=messages[convId]||[],msg=null;
  for(var i=0;i<msgs.length;i++){if(msgs[i].id===msgId){msg=msgs[i];break}}
  if(!msg||!msg.audio)return;
  
  // Pause if already playing this message
  if(currentAudioId===msgId&&currentAudio&&!currentAudio.paused){
    currentAudio.pause();
    if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}
    updateAudioUI(msgId,'paused');
    return
  }
  
  // Resume if paused same message
  if(currentAudioId===msgId&&currentAudio&&currentAudio.paused){
    currentAudio.play().catch(console.error);
    updateAudioUI(msgId,'playing');
    startAudioProgress(msgId,msg);
    return
  }
  
  // Start new audio
  if(currentAudio){currentAudio.pause();currentAudio=null}
  if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}
  
  var audio=new Audio(msg.audio);
  currentAudio=audio;currentAudioId=msgId;
  
  // Handle seeking before play
  var hasSeek=seekCache[msgId]!==undefined&&seekCache[msgId]<0.98;
  var seekPct=hasSeek?Math.min(1,Math.max(0,seekCache[msgId])):0;
  if(hasSeek){delete seekCache[msgId]}
  
  updateAudioUI(msgId,'playing');
  
  audio.addEventListener('canplay',function(){
    if(hasSeek)audio.currentTime=seekPct*audio.duration;
    audio.play().catch(console.error);
    startAudioProgress(msgId,msg)
  },{once:true});
  
  audio.onended=function(){if(audioProgressTimer){clearInterval(audioProgressTimer);audioProgressTimer=null}updateAudioUI(msgId,'ended');currentAudio=null;currentAudioId=null}
}

function startAudioProgress(msgId,msg){
  if(audioProgressTimer){clearInterval(audioProgressTimer)}
  audioProgressTimer=setInterval(function(){
    if(!currentAudio||currentAudio.paused){
      if(currentAudio&&currentAudio.ended){clearInterval(audioProgressTimer);audioProgressTimer=null;updateAudioUI(msgId,'ended');currentAudio=null;currentAudioId=null}
      return
    }
    var pct=currentAudio.currentTime/currentAudio.duration;
    var el=$('msg-'+msgId);
    if(el){
      var prog=el.querySelector('.ma-progress');if(prog)prog.style.width=(pct*100)+'%';
      var durEl=el.querySelector('.ma-dur');if(durEl){
        var ct=Math.floor(currentAudio.currentTime),dt=Math.floor(msg.duration||currentAudio.duration);
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
  seekCache[msgId]=pct;
  
  // Update visual progress bar immediately
  var prog=bar.querySelector('.ma-progress');
  if(prog)prog.style.width=(pct*100)+'%';
  
  // Update duration display
  var msg=null;
  if(activeConvId&&messages[activeConvId]){
    for(var si=0;si<messages[activeConvId].length;si++){
      if(messages[activeConvId][si].id===msgId){msg=messages[activeConvId][si];break}
    }
  }
  var durEl=bar.parentNode?bar.parentNode.querySelector('.ma-dur'):null;
  if(msg&&msg.audio&&msg.duration&&durEl){
    var total=msg.duration,current=Math.round(pct*total);
    var cm=Math.floor(current/60),cs=current%60,dm=Math.floor(total/60),ds=total%60;
    durEl.textContent=cm+':'+(cs<10?'0':'')+cs+' / '+dm+':'+(ds<10?'0':'')+ds
  }
  
  // Seek audio if playing
  if(currentAudioId===msgId&&currentAudio){
    currentAudio.currentTime=pct*currentAudio.duration
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
function scrollToBottom(){var el=$('chat-messages');if(el){el.scrollTo({top:el.scrollHeight,behavior:'smooth'});_hasNewMsg=false;var ni=$('new-msg-indicator');if(ni)ni.style.display='none';var sb=$('scroll-bottom-btn');if(sb)sb.style.display='none';var cv=findConv(activeConvId);if(cv&&cv.unread>0){cv.unread=0;saveUnreadCounts();renderConversations()}}
}
