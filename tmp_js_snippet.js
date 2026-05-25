
function $(id){return document.getElementById(id)}
function ls(k,v){if(v!==undefined){localStorage.setItem('wm_'+k,JSON.stringify(v));return v}try{return JSON.parse(localStorage.getItem('wm_'+k))}catch{return null}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function escJs(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\x27").replace(/"/g,"\\x22")}
function timeNow(){var d=new Date();return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}

var currentScreen='screen-welcome',regStep=0,avatarDataUrl=null;
var showScreen=function(id){document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});if(id){$(id).classList.add('active');currentScreen=id}};
var goToWelcome=function(){renderSavedAccounts();showScreen('screen-welcome')};
var goToLogin=function(){showScreen('screen-login');$('login-email').value='';$('login-pass').value='';avatarDataUrl=null;validateLogin()};
var goToRegister=function(){var accs=getAccounts();if(accs.length>=3){showAlert('En fazla 3 hesap bulundurabilirsin. Yeni hesap eklemek için önce kayıtlı bir hesabı sil.');return}regStep=0;updateRegStep();showScreen('screen-register')};

// ===== SAVED ACCOUNTS =====
function getAccounts(){return ls('accounts')||[]}
function groupsStorageKey(){return activeAccountId?'groups_'+activeAccountId:'groups'}
function groupBelongsToAccount(g,accountId){
  if(!accountId||!g)return true;
  if(g.creatorId===accountId)return true;
  if(g.adminIds&&g.adminIds.indexOf(accountId)!==-1)return true;
  if(g.memberIds&&g.memberIds.indexOf(accountId)!==-1)return true;
  return !g.memberIds||g.memberIds.length===0
}
function getGroups(){
  var scoped=ls(groupsStorageKey());
  if(scoped)return scoped;
  var legacy=ls('groups')||[];
  var accountId=fbUserId()||activeAccountId;
  if(accountId)legacy=legacy.filter(function(g){return groupBelongsToAccount(g,accountId)});
  return legacy
}
function saveGroups(groups){ls(groupsStorageKey(),groups||[]);return groups||[]}
function saveAccount(acc){var a=getAccounts();for(var i=0;i<a.length;i++){if(a[i].id===acc.id){for(var k in acc){if(k!=='password'&&acc[k]!==undefined&&acc[k]!==null)a[i][k]=acc[k]}a[i].lastLogin=acc.lastLogin||a[i].lastLogin;if(a[i].password!==undefined)delete a[i].password;ls('accounts',a);return}}for(var i=0;i<a.length;i++){if(a[i].email===acc