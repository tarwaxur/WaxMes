// ===== CAPACITOR / ANDROID BRIDGE =====
// Provides fallback implementations for electronAPI calls on Android

(function() {
  if (typeof window === 'undefined') return;
  if (window.electronAPI) return; // already set by Electron preload

  var Capacitor = window.Capacitor;
  if (!Capacitor) {
    // Not running in Capacitor either — this is a plain browser
    window.electronAPI = {
      selectMedia: function() { return null; },
      safeEncrypt: null, safeDecrypt: null,
      getAppVersion: function() { return Promise.resolve('0.1.0'); },
      checkForUpdates: null,
      startDownload: null,
      installUpdate: null,
      onUpdateAvailable: null,
      onUpdateDownloaded: null,
      onUpdateError: null,
      setBadgeCount: null,
      setBackgroundMode: null,
      openLink: function(url) { window.open(url, '_blank'); }
    };
    return;
  }

  var Prefs = Capacitor.Preferences;
  var FS = Capacitor.Filesystem;
  var Notif = Capacitor.LocalNotifications;

  // Shared state
  var _updateAvailable = null;
  var _updateDownloaded = false;
  var _version = '0.1.0';

  function getVersion() {
    try {
      var root = document.querySelector('meta[name="version"]');
      if (root && root.content) _version = root.content;
    } catch(e) {}
    return _version;
  }

  window.electronAPI = {
    // File picker
    selectMedia: async function(type) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'all' ? 'image/*,video/*' : (type === 'image' ? 'image/*' : 'video/*');
      return new Promise(function(resolve) {
        input.onchange = function() {
          var file = input.files[0];
          if (!file) { resolve(null); return; }
          var reader = new FileReader();
          reader.onload = function(e) {
            resolve([{
              name: file.name,
              path: file.name,
              size: file.size,
              type: file.type.indexOf('image') === 0 ? 'image' : 'video',
              dataUrl: e.target.result,
              lastModified: file.lastModified
            }]);
          };
          reader.onerror = function() { resolve(null); };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    // Secure storage (fallback to Preferences + simple encryption)
    safeEncrypt: async function(data) {
      try {
        var enc = btoa(unescape(encodeURIComponent(data)));
        return enc;
      } catch(e) { return null; }
    },
    safeDecrypt: async function(enc) {
      try {
        var dec = decodeURIComponent(escape(atob(enc)));
        return dec;
      } catch(e) { return null; }
    },

    // Version
    getAppVersion: function() { return Promise.resolve(getVersion()); },

    // Update checking — uses GitHub API directly
    checkForUpdates: async function() {
      try {
        var currentVer = getVersion();
        var resp = await fetch('https://api.github.com/repos/tarwaxur/WaxMes/releases/latest');
        if (!resp.ok) return { error: 'HTTP ' + resp.status };
        var data = await resp.json();
        var latestVer = (data.tag_name || '').replace(/^v/, '');
        var cur = currentVer.replace(/^v/, '');
        if (latestVer > cur) {
          _updateAvailable = { version: latestVer, url: data.html_url, assets: data.assets };
          return { updateAvailable: true, version: latestVer, currentVersion: currentVer };
        }
        return { updateAvailable: false, currentVersion: currentVer };
      } catch(e) {
        return { error: e.message };
      }
    },

    startDownload: async function() {
      if (!_updateAvailable || !_updateAvailable.assets || _updateAvailable.assets.length === 0) {
        return { success: false, error: 'No download assets found' };
      }
      try {
        // Find APK asset
        var asset = null;
        for (var ai = 0; ai < _updateAvailable.assets.length; ai++) {
          if (_updateAvailable.assets[ai].name.indexOf('.apk') > -1) { asset = _updateAvailable.assets[ai]; break; }
        }
        if (!asset) return { success: false, error: 'No APK found in release' };
        // Trigger download
        var a = document.createElement('a');
        a.href = asset.browser_download_url;
        a.download = asset.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        _updateDownloaded = true;
        return { success: true };
      } catch(e) {
        return { success: false, error: e.message };
      }
    },

    installUpdate: function() {
      if (_updateDownloaded) {
        alert('APK indirildi. Lütfen dosyaya tıklayarak manuel olarak kurun.');
      }
    },

    // Event registrations (stubs for Android)
    onUpdateAvailable: function(cb) {
      // Will be called manually from checkForUpdates flow
      window._onUpdateAvailable = cb;
    },
    onUpdateDownloaded: function(cb) {
      window._onUpdateDownloaded = cb;
    },
    onUpdateError: function(cb) {
      window._onUpdateError = cb;
    },

    setBadgeCount: function(count) {
      if (Capacitor.isNativePlatform() && Notif) {
        try { Notif.removeAllListeners(); } catch(e) {}
      }
    },

    setBackgroundMode: function(enabled) {
      // No-op on Android
    },

    openLink: function(url) {
      window.open(url, '_blank');
    }
  };

  // Trigger update check result via the registered callback
  var origCheckUpdate = window.checkUpdate;
  if (origCheckUpdate) {
    var _origCheck = origCheckUpdate;
    window.checkUpdate = async function() {
      var result = await window.electronAPI.checkForUpdates();
      if (result && result.updateAvailable && window._onUpdateAvailable) {
        window._onUpdateAvailable(result.version);
      }
    };
  }
})();<｜end▁of▁thinking｜>Now I can copy and sync again. First let me update the `www` directory with all the latest source files, then sync with Capacitor:<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="bash">
<｜｜DSML｜｜parameter name="command" string="true">Copy-Item src\* www\src\ -Recurse -Force; Copy-Item assets\* www\assets\ -Recurse -Force; Copy-Item index.html,package.json,firestore.rules www\ -Force