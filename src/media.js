// ===== CAMERA / MIC / SCREEN =====

async function toggleCamera(){
  if(testCamStream){
    testCamStream.getTracks().forEach(function(t){t.stop()});
    testCamStream=null;
    $('camera-preview').innerHTML='<span style="font-size:12px;color:var(--text4)">Kamera kapalı</span>';
    $('camera-toggle-btn').textContent='Kamerayı Aç';
    return
  }
  try{
    var stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
    testCamStream=stream;
    var video=document.createElement('video');
    video.srcObject=stream;
    video.autoplay=true;
    video.muted=true;
    video.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:10px';
    $('camera-preview').innerHTML='';
    $('camera-preview').appendChild(video);
    video.play();
    $('camera-toggle-btn').textContent='Kamerayı Kapat'
  }catch(e){alert('Kamera hatası: '+e.message+'\n\nKameranın başka bir uygulamada açık olmadığından emin ol.');console.error('Camera error:',e)}
}

async function testCamera(){
  if(testCamStream){toggleCamera()}
  await toggleCamera()
}

async function toggleMicTest(){
  if(testMicStream){
    testMicStream.getTracks().forEach(function(t){t.stop()});
    testMicStream=null;
    if(micTestInterval){clearInterval(micTestInterval);micTestInterval=null}
    $('mic-level').style.width='0%';
    $('mic-level-text').textContent='- dB';
    $('mic-toggle-btn').textContent='Mikrofonu Test Et';
    return
  }
  try{
    var stream=await navigator.mediaDevices.getUserMedia({audio:true});
    testMicStream=stream;
    var audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var source=audioCtx.createMediaStreamSource(stream);
    var analyser=audioCtx.createAnalyser();analyser.fftSize=256;
    source.connect(analyser);
    var data=new Uint8Array(analyser.frequencyBinCount);
    $('mic-toggle-btn').textContent='Durdur';
    if(micTestInterval){clearInterval(micTestInterval)}
    micTestInterval=setInterval(function(){
      analyser.getByteFrequencyData(data);
      var avg=0;
      for(var mi=0;mi<data.length;mi++){avg+=data[mi]}
      avg/=data.length;
      var pct=Math.min(100,avg/2.55);
      $('mic-level').style.width=pct+'%';
      $('mic-level-text').textContent=Math.round(avg)+' dB'
    },100)
  }catch(e){alert('Mikrofon erişimi reddedildi')}
}

function testSpeaker(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.type='sine';osc.frequency.value=440;gain.gain.value=0.15;
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();setTimeout(function(){osc.stop();ctx.close()},500)
  }catch(e){}
}

async function testScreenShare(){
  try{
    var stream=await navigator.mediaDevices.getDisplayMedia({video:true});
    var preview=$('screen-share-preview');
    preview.style.display='flex';
    preview.innerHTML='<span style="font-size:11px;color:var(--text4);opacity:.6">Yükleniyor...</span>';
    var video=document.createElement('video');
    video.srcObject=stream;
    video.autoplay=true;
    video.muted=true;
    video.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:10px';
    preview.innerHTML='';
    preview.appendChild(video);
    video.play().catch(function(){});
    stream.getVideoTracks()[0].onended=function(){
      preview.innerHTML='<span style="font-size:11px;color:var(--text4);opacity:.6">Paylaşım durduruldu</span>'
    }
  }catch(e){
    var preview=$('screen-share-preview');
    preview.style.display='flex';
    preview.innerHTML='<span style="font-size:11px;color:#ef4444">Hata: '+(e.message||'Erişim reddedildi')+'</span>'
  }
}

async function pickSettingsAvatar(){
  try{
    if(window.electronAPI&&electronAPI.selectFile){
      var r=await electronAPI.selectFile();
      if(r&&r.thumb){
        var a=getAccounts();
        for(var i=0;i<a.length;i++){
          if(a[i].id===activeAccountId){
            a[i].avatar=r.thumb;ls('accounts',a);
            syncSidebarProfile(a[i],currentStatus);
            showSettingsCat('profile');
            var fbUid=fbUserId();if(window.db&&fbUid)db.collection('users').doc(fbUid).update({avatar:r.thumb});
            break
          }
        }
      }
    }
  }catch(e){}
}
function saveProfileSettings(){
  var d=$('set-display').value.trim(),u=$('set-username').value.trim(),b=$('set-bio').value.trim();if(!d||!u)return;
  var accs=getAccounts();
  for(var i=0;i<accs.length;i++){
    if(accs[i].id===activeAccountId){
      accs[i].displayName=d;accs[i].username=u;accs[i].bio=b;
      var av=accs[i].avatar||null;ls('accounts',accs);
      var fbUid=fbUserId();if(window.db&&fbUid)db.collection('users').doc(fbUid).update({displayName:d,username:u,bio:b,avatar:av});
      syncSidebarProfile(accs[i],currentStatus);
      showSettingsCat('profile');
      break
    }
  }
}
function saveEmail(){showAlert('E-posta değiştirme şu anlık devre dışı. Yakında kullanıma sunulacak.')}
function changePassword(){var cur=$('cur-pass').value,nu=$('new-pass').value,nu2=$('new-pass2').value;if(!cur||nu.length<6||nu!==nu2)return;if(!window.auth||!auth.currentUser){showAlert('Oturum bulunamadı.');return}if(cur===nu){showAlert('Yeni şifre, mevcut şifrenle aynı olamaz.');return}var email=auth.currentUser.email;var cred=firebase.auth.EmailAuthProvider.credential(email,cur);auth.currentUser.reauthenticateWithCredential(cred).then(function(){auth.currentUser.updatePassword(nu).then(function(){rememberAccountPassword(getActiveAccount()||{id:activeAccountId,email:email},nu);$('save-pass-btn').textContent='✓ Değiştirildi';setTimeout(function(){$('save-pass-btn').textContent='Şifreyi Değiştir';$('cur-pass').value='';$('new-pass').value='';$('new-pass2').value='';$('save-pass-btn').disabled=true},2000)}).catch(function(e){showAlert('Şifre değiştirilemedi: '+e.message)})}).catch(function(){showAlert('Mevcut şifren yanlış.')})}
