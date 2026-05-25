const { app, BrowserWindow, ipcMain, nativeImage, Notification, Tray, Menu, safeStorage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'WaxMes';
let mainWindow;
const winStatePath = path.join(app.getPath('userData'), 'window-state.json');
function loadWinState() {
  try { return JSON.parse(fs.readFileSync(winStatePath, 'utf8')) } catch(e) { return null }
}
function saveWinState() {
  if (!mainWindow) return;
  try {
    var tmp = winStatePath + '.tmp';
    var bounds = mainWindow.getBounds();
    fs.writeFileSync(tmp, JSON.stringify({ width: bounds.width, height: bounds.height }));
    fs.renameSync(tmp, winStatePath);
  } catch(e) {}
}
var _saveWinStateTimer = null;
function saveWinStateDebounced() {
  if (_saveWinStateTimer) clearTimeout(_saveWinStateTimer);
  _saveWinStateTimer = setTimeout(saveWinState, 500);
}

// Single instance lock
var gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', function() {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
let tray = null;
let backgroundMode = false;
let forceQuit = false;

app.setName(APP_NAME);

const iconCandidates = [
  path.join(__dirname, 'assets', 'app.ico'),
  path.join(__dirname, 'assets', 'app.png'),
  path.join(__dirname, 'assets', 'icon.png'),
  path.join(__dirname, 'assets', 'icon.ico'),
  path.join(process.resourcesPath || __dirname, 'assets', 'app.ico'),
  path.join(process.resourcesPath || __dirname, 'assets', 'app.png'),
  path.join(process.resourcesPath || __dirname, 'assets', 'icon.png'),
  path.join(process.resourcesPath || __dirname, 'assets', 'icon.ico'),
];
const appIconPath = iconCandidates.find(c => fs.existsSync(c));
const appIcon = appIconPath ? nativeImage.createFromPath(appIconPath) : undefined;
const notificationIcon = appIcon && !appIcon.isEmpty() ? appIcon : appIconPath;
const trayIcon = appIcon || nativeImage.createEmpty();

function createTray() {
  tray = new Tray(trayIcon);
  tray.setToolTip(APP_NAME);
  const ctx = Menu.buildFromTemplate([
    { label: APP_NAME + ' Aç', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createWindow() } },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { forceQuit = true; app.quit() } },
  ]);
  tray.setContextMenu(ctx);
  tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } });
}

function createWindow() {
  var saved = loadWinState();
  mainWindow = new BrowserWindow({
    width: saved ? saved.width : 1100, height: saved ? saved.height : 680, minWidth: 900, minHeight: 600,
    frame: false, fullscreenable: true, backgroundColor: '#0b101f',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    show: false, title: APP_NAME,
  });
  if (appIconPath && process.platform !== 'darwin') mainWindow.setIcon(appIconPath);
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebasestorage.app https://www.gstatic.com blob: data: mediastream:; style-src 'self' 'unsafe-inline'; script-src 'self'"]
    }});
  });

  // Auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({ provider: 'github', owner: 'tarwaxur', repo: 'WaxMes' });
  autoUpdater.checkForUpdates().catch(() => {});
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents?.send('update-available', info.version);
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents?.send('update-not-available');
  });
  autoUpdater.on('download-progress', (p) => {
    mainWindow?.webContents?.send('update-progress', Math.round(p.percent));
  });
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents?.send('update-downloaded');
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents?.send('update-error', err.message || err);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.show() });
  mainWindow.on('maximize', () => mainWindow?.webContents?.send('window-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents?.send('window-maximized', false));
  mainWindow.on('resize', () => saveWinStateDebounced());
  mainWindow.on('close', (e) => {
    saveWinState();
    if (!forceQuit && backgroundMode) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null });

  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(['media', 'mediaKeySystem', 'fullscreen'].includes(permission));
  });
  ses.setPermissionCheckHandler((webContents, permission) => {
    return ['media', 'fullscreen'].includes(permission);
  });
}

function getAutoStart() { return app.getLoginItemSettings().openAtLogin }
function setAutoStart(val) {
  app.setLoginItemSettings({ openAtLogin: !!val, path: process.execPath });
}

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => {
  if (backgroundMode) { mainWindow?.hide() }
  else { forceQuit = true; mainWindow?.close() }
});
ipcMain.handle('get-background-mode', () => backgroundMode);
ipcMain.handle('set-background-mode', (_e, val) => {
  backgroundMode = !!val;
  if (backgroundMode && !tray) createTray();
  if (!backgroundMode && tray) { tray.destroy(); tray = null }
});
ipcMain.handle('get-auto-start', () => getAutoStart());
ipcMain.handle('set-auto-start', (_e, val) => setAutoStart(val));

ipcMain.handle('select-file', async () => {
  const { dialog } = require('electron');
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  });
  if (r.canceled || r.filePaths.length === 0) return null;
  const img = nativeImage.createFromPath(r.filePaths[0]);
  return { path: r.filePaths[0], thumb: img.toDataURL({ width: 128, height: 128 }), full: img.toDataURL({ width: 800, height: 800 }) };
});
ipcMain.handle('select-media', async (_e, type) => {
  const { dialog } = require('electron');
  const filters = {
    image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    video: [{ name: 'Videos', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] }],
    document: [{ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'] }],
    all: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      { name: 'Videos', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'] },
    ]
  };
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: filters[type] || filters.all });
  if (r.canceled || r.filePaths.length === 0) return [];
  return r.filePaths.map(fp => {
    const ext = path.extname(fp).toLowerCase();
    const isImg = ['.png','.jpg','.jpeg','.gif','.webp','.bmp'].includes(ext);
    const isVid = ['.mp4','.webm','.avi','.mov','.mkv'].includes(ext);
    let dataUrl = null;
    if (isImg) { const img = nativeImage.createFromPath(fp); dataUrl = img.toDataURL({ width: 800, height: 800 }) }
    else if (isVid) dataUrl = 'file://' + fp.replace(/\\/g, '/');
    return { path: fp, dataUrl, name: path.basename(fp), type: isImg ? 'image' : (isVid ? 'video' : 'document') };
  });
});
ipcMain.handle('show-notification', (_e, title, body) => {
  if (mainWindow) {
    mainWindow.flashFrame(true);
    try {
      const notif = new Notification({
        title: (title || APP_NAME).substring(0,50),
        body: (body || '').substring(0,120),
        icon: notificationIcon, silent: true,
      });
      notif.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } });
      notif.show();
    } catch(e) {}
  }
  return true;
});
ipcMain.handle('copy-image', (_e, dataUrl) => {
  try {
    const { clipboard, nativeImage } = require('electron');
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
  } catch(e) {}
  return true;
});

ipcMain.handle('safe-encrypt', (_e, plaintext) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const buf = safeStorage.encryptString(plaintext);
    return buf.toString('base64');
  } catch(e) { return null }
});
ipcMain.handle('safe-decrypt', (_e, encryptedB64) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const buf = Buffer.from(encryptedB64, 'base64');
    return safeStorage.decryptString(buf);
  } catch(e) { return null }
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version) {
      var current = app.getVersion();
      var latest = result.updateInfo.version;
      // Semantic version compare: current < latest ?
      var curParts = current.split('.').map(Number);
      var latParts = latest.split('.').map(Number);
      var isNewer = false;
      for (var i = 0; i < 3; i++) {
        if ((latParts[i] || 0) > (curParts[i] || 0)) { isNewer = true; break; }
        if ((latParts[i] || 0) < (curParts[i] || 0)) { break; }
      }
      if (isNewer) return { updateAvailable: true, version: latest, currentVersion: current };
      return { updateAvailable: false, currentVersion: current };
    }
    return { updateAvailable: false, currentVersion: app.getVersion() };
  } catch (e) {
    return { error: e.message || e || 'Güncelleme kontrolü başarısız', currentVersion: app.getVersion() };
  }
});

ipcMain.handle('start-download', () => {
  try {
    autoUpdater.downloadUpdate();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || e || 'İndirme başlatılamadı' };
  }
});
ipcMain.handle('install-update', () => {
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
});

app.whenReady().then(() => {
  if (backgroundMode) createTray();
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() });
app.on('before-quit', () => { forceQuit = true });
