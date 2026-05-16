const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

function hasWaxMesApp(root) {
  return fs.existsSync(path.join(root, 'main.js')) &&
    fs.existsSync(path.join(root, 'index.html')) &&
    fs.existsSync(path.join(root, 'package.json'));
}

function findProjectRoot() {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.resolve(exeDir, '..', '..', '..'),
    process.cwd(),
  ];

  return candidates.find(hasWaxMesApp);
}

const projectRoot = findProjectRoot();

if (!projectRoot) {
  dialog.showErrorBox(
    'WaxMes',
    'WaxMes dosyalari bulunamadi. electron.exe dosyasini WaxMes klasorunun icindeki node_modules\\electron\\dist konumundan calistirin.'
  );
  app.quit();
} else {
  process.chdir(projectRoot);
  require(path.join(projectRoot, 'main.js'));
}
