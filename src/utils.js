function $(id){return document.getElementById(id)}

function ls(k,v){
  if(v!==undefined){
    localStorage.setItem('wm_'+k,JSON.stringify(v));
    return v
  }
  try{return JSON.parse(localStorage.getItem('wm_'+k))}
  catch{return null}
}

function uid(){
  return Date.now().toString(36)+Math.random().toString(36).slice(2,6)
}

function esc(t){
  var d=document.createElement('div');
  d.textContent=t;
  return d.innerHTML
}

function escJs(s){
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\x27").replace(/"/g,"\\x22")
}

function timeNow(){
  var d=new Date();
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')
}

function findConv(id){
  for(var i=0;i<store.conversations.length;i++){
    if(store.conversations[i].id===id)return store.conversations[i]
  }
  return null
}

function fbUserId(){
  return window.auth&&auth.currentUser?auth.currentUser.uid:(store.activeAccountId||null)
}
