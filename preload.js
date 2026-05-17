const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectMedia: (type) => ipcRenderer.invoke('select-media', type || 'all'),
  onMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (_event, val) => callback(val));
  },
  notify: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  copyImage: (dataUrl) => ipcRenderer.invoke('copy-image', dataUrl),
  getBackgroundMode: () => ipcRenderer.invoke('get-background-mode'),
  setBackgroundMode: (val) => ipcRenderer.invoke('set-background-mode', val),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (val) => ipcRenderer.invoke('set-auto-start', val),
  safeEncrypt: (plaintext) => ipcRenderer.invoke('safe-encrypt', plaintext),
  safeDecrypt: (encryptedB64) => ipcRenderer.invoke('safe-decrypt', encryptedB64),
  startDownload: () => ipcRenderer.invoke('start-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateAvailable: (cb) => { ipcRenderer.on('update-available', (_e, v) => cb(v)) },
  onUpdateProgress: (cb) => { ipcRenderer.on('update-progress', (_e, p) => cb(p)) },
  onUpdateDownloaded: (cb) => { ipcRenderer.on('update-downloaded', () => cb()) },
  onUpdateError: (cb) => { ipcRenderer.on('update-error', (_e, msg) => cb(msg)) },
});
