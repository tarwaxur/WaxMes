
var currentScreen='screen-welcome',regStep=0,avatarDataUrl=null;
var showScreen=function(id){document.querySelectorAll('.screen,.app-layout').forEach(function(s){s.classList.remove('active')});if(id){$(id).classList.add('active');currentScreen=id}};
var goToWelcome=function(){renderSavedAccounts();showScreen('screen-welcome')};
var goToLogin=function(){showScreen('screen-login');$('login-email').value='';$('login-pass').value='';avatarDataUrl=null;validateLogin()};
var goToRegister=function(){var accs=getAccounts();if(accs.length>=3){showAlert('En fazla 3 hesap bulundurabilirsin. Yeni hesap eklemek için önce kayıtlı bir hesabı sil.');return}regStep=0;updateRegStep();showScreen('screen-register')};
