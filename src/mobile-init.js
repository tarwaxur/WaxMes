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

  document.body.classList.add('is-mobile', 'show-chats');
  if (window.innerWidth <= 380) document.body.classList.add('is-compact');

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.mobile-nav-item'));
  var backBtn = $('chat-back-btn');
  var appChat = $('app-chat');
  var settingsPage = $('settings-page');
  var chatInput = $('chat-input');

  function setActiveTab(name) {
    tabs.forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.mtab === name);
    });
  }

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
    setActiveTab('chats');
  }

  function showChatsTab() {
    document.body.classList.remove('show-status', 'show-settings');
    document.body.classList.add('show-chats');
    if (settingsPage) settingsPage.classList.remove('active');
    closeChatPanel();
    setActiveTab('chats');
  }

  function showStatusTab() {
    document.body.classList.remove('show-chats', 'show-settings');
    document.body.classList.add('show-status');
    if (settingsPage) settingsPage.classList.remove('active');
    closeChatPanel();
    if (typeof renderStoryBar === 'function') renderStoryBar();
    setActiveTab('status');
  }

  function showSettingsTab() {
    closeChatPanel();
    document.body.classList.remove('show-chats', 'show-status');
    document.body.classList.add('show-settings');
    setActiveTab('settings');
    if (typeof showSettings === 'function') showSettings();
  }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var mtab = tab.dataset.mtab;
      if (mtab === 'chats') showChatsTab();
      else if (mtab === 'status') showStatusTab();
      else if (mtab === 'settings') showSettingsTab();
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof goToHome === 'function') goToHome();
      closeChatPanel();
      setActiveTab('chats');
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
    setActiveTab('chats');
  });

  wrapGlobal('selectConversation', function() {
    openChatPanel();
    if (chatInput) setTimeout(function() { chatInput.blur(); }, 0);
  });

  wrapGlobal('showSettings', function() {
    if (!document.body.classList.contains('mobile-chat-open')) {
      document.body.classList.remove('show-chats', 'show-status');
      document.body.classList.add('show-settings');
      setActiveTab('settings');
    }
  });

  wrapGlobal('hideSettings', function() {
    if (!document.body.classList.contains('mobile-chat-open')) {
      document.body.classList.remove('show-settings');
      document.body.classList.add('show-chats');
      setActiveTab('chats');
    }
  });

  function updateUnreadBadge() {
    var total = 0;
    if (window.store && store.conversations) {
      for (var i = 0; i < store.conversations.length; i++) {
        total += store.conversations[i].unread || 0;
      }
    }
    var wrap = document.querySelector('.mobile-nav-item[data-mtab="chats"] .mobile-nav-item-wrap');
    var badge = wrap ? wrap.querySelector('.badge') : null;
    if (total > 0) {
      if (!badge && wrap) {
        badge = document.createElement('span');
        badge.className = 'badge';
        wrap.appendChild(badge);
      }
      if (badge) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'flex';
      }
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  wrapGlobal('renderConversations', updateUnreadBadge);
  updateUnreadBadge();

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
