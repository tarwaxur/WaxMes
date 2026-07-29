// ===== MOBILE LAYOUT INIT =====
(function() {
  function isNativeMobile() {
    return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function isNarrowScreen() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  }

  function shouldUseMobileShell() {
    return isNativeMobile() || isNarrowScreen();
  }

  if (!shouldUseMobileShell()) return;

  document.body.classList.add('is-mobile');
  if (window.innerWidth <= 380) document.body.classList.add('is-compact');

  var backBtn = $('chat-back-btn');
  var appChat = $('app-chat');
  var settingsPage = $('settings-page');
  var chatInput = $('chat-input');

  function closeChatPanel() {
    document.body.classList.remove('mobile-chat-open');
    if (appChat) appChat.classList.remove('open');
    if (backBtn) backBtn.style.display = 'none';
  }

  function openChatPanel() {
    document.body.classList.remove('show-settings');
    document.body.classList.add('show-chats', 'mobile-chat-open');
    if (settingsPage) settingsPage.classList.remove('active');
    if (appChat) appChat.classList.add('open');
    if (backBtn) backBtn.style.display = 'flex';
  }

  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof goToHome === 'function') goToHome();
      closeChatPanel();
    });
  }

  function wrapGlobal(name, after) {
    var original = window[name];
    if (typeof original !== 'function' || original._mobileWrapped) return;
    window[name] = function() {
      var result = original.apply(this, arguments);
      after.apply(this, arguments);
      return result;
    };
    window[name]._mobileWrapped = true;
  }

  wrapGlobal('goToHome', function() {
    closeChatPanel();
  });

  wrapGlobal('selectConversation', function() {
    openChatPanel();
    if (chatInput) setTimeout(function() { chatInput.blur(); }, 0);
  });

  wrapGlobal('showSettings', function() {
    if (!document.body.classList.contains('mobile-chat-open')) {
      document.body.classList.remove('show-chats', 'show-status');
      document.body.classList.add('show-settings');
    }
  });

  wrapGlobal('hideSettings', function() {
    if (!document.body.classList.contains('mobile-chat-open')) {
      document.body.classList.remove('show-settings');
      document.body.classList.add('show-chats');
    }
  });

  function updateKeyboardState() {
    if (!window.visualViewport) return;
    var keyboardOpen = window.visualViewport.height < window.innerHeight - 120;
    document.body.classList.toggle('mobile-keyboard-open', keyboardOpen);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateKeyboardState);
    window.visualViewport.addEventListener('scroll', updateKeyboardState);
    updateKeyboardState();
  }

  window.addEventListener('resize', function() {
    document.body.classList.toggle('is-compact', window.innerWidth <= 380);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-chat-open')) {
      e.preventDefault();
      if (typeof goToHome === 'function') goToHome();
      closeChatPanel();
    }
  });
})();
