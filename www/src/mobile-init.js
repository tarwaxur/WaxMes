// ===== MOBILE LAYOUT INIT =====
(function() {
  var isMobile = window.Capacitor && Capacitor.isNativePlatform();
  if (!isMobile) return;
  document.body.classList.add('is-mobile');

  var tabs = document.querySelectorAll('.mobile-nav-item');
  tabs.forEach(function(tab) {
    tab.onclick = function() {
      var mtab = tab.dataset.mtab;
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      if (mtab === 'chats') {
        document.body.classList.remove('show-status', 'show-settings');
        document.body.classList.add('show-chats');
        $('settings-page').classList.remove('active');
      } else if (mtab === 'status') {
        document.body.classList.remove('show-chats', 'show-settings');
        document.body.classList.add('show-status');
        $('settings-page').classList.remove('active');
      } else if (mtab === 'settings') {
        document.body.classList.remove('show-chats', 'show-status');
        document.body.classList.add('show-settings');
        if (typeof showSettings === 'function') showSettings();
      }
    };
  });

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

  var origRenderConv = window.renderConversations;
  if (origRenderConv) {
    window.renderConversations = function(list) {
      origRenderConv(list);
      var total = 0;
      if (store && store.conversations) {
        for (var i = 0; i < store.conversations.length; i++) {
          total += store.conversations[i].unread || 0;
        }
      }
      var wrap = document.querySelector('.mobile-nav-item[data-mtab="chats"] .mobile-nav-item-wrap');
      var b = wrap ? wrap.querySelector('.badge') : null;
      if (total > 0) {
        if (!b) {
          b = document.createElement('span');
          b.className = 'badge';
          if (wrap) wrap.appendChild(b);
        }
        b.textContent = total > 99 ? '99+' : total;
        b.style.display = 'flex';
      } else if (b) {
        b.style.display = 'none';
      }
    };
  }
})();