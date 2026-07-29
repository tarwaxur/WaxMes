// ===== MOBILE LAYOUT INIT =====
(function() {
  var isMobile = window.Capacitor && Capacitor.isNativePlatform();
  if (!isMobile) return;
  document.body.classList.add('is-mobile');

  var backBtn = $('chat-back-btn');
  if (backBtn) {
    backBtn.onclick = function() {
      if (typeof goToHome === 'function') goToHome();
      else if (typeof closeProfilePanel === 'function') closeProfilePanel();
    };
  }

  var origGoToHome = window.goToHome;
  if (origGoToHome) {
    window.goToHome = function() {
      origGoToHome();
      if (backBtn) backBtn.style.display = 'none';
    };
  }

  var origSelectConv = window.selectConversation;
  if (origSelectConv) {
    window.selectConversation = function(id) {
      origSelectConv(id);
      if (backBtn) backBtn.style.display = 'flex';
    };
  }
})();
