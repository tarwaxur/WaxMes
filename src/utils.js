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
function sanitizeUrl(url){
  if(!url)return '';
  var s=String(url);
  if(/^(https?:|blob:|data:)/i.test(s)||s.indexOf('/')===0)return s;
  return ''
}

function timeNow(){
  var d=new Date();
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')
}

function rebuildConvCache(){
  store._convCache={};for(var i=0;i<store.conversations.length;i++){store._convCache[store.conversations[i].id]=store.conversations[i]}
}
function findConv(id){
  if(!store._convCache)rebuildConvCache();
  if(store._convCache[id]!==undefined)return store._convCache[id];
  rebuildConvCache();return store._convCache[id]||null
}

function fbUserId(){
  return window.auth&&auth.currentUser?auth.currentUser.uid:(store.activeAccountId||null)
}
