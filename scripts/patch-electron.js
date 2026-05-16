const rceditModule = require('rcedit');
const path = require('path');
const fs = require('fs');

const rcedit = rceditModule.rcedit || rceditModule;
const pkg = require('../package.json');
const appName = 'WaxMes';
const rootDir = path.join(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const exe = path.join(electronDistDir, 'electron.exe');
const defaultAppSource = path.join(__dirname, 'electron-default-app');
const defaultAppAsar = path.join(electronDistDir, 'resources', 'default_app.asar');
const defaultAppBackup = path.join(electronDistDir, 'resources', 'default_app.electron.asar');
const iconCandidates = [
  path.join(rootDir, 'assets', 'app.ico'),
  path.join(rootDir, 'assets', 'icon.ico'),
];
const ico = iconCandidates.find((candidate) => fs.existsSync(candidate));

if (!fs.existsSync(exe)) {
  console.log('Electron exe not found, skipping branding');
  process.exit(0);
}

if (!ico) {
  console.log('App icon not found, skipping Electron exe branding');
  process.exit(0);
}

async function patchDefaultApp() {
  const asar = require('@electron/asar');

  if (!fs.existsSync(defaultAppSource)) {
    throw new Error(`Default app source not found: ${defaultAppSource}`);
  }

  if (fs.existsSync(defaultAppAsar) && !fs.existsSync(defaultAppBackup)) {
    fs.copyFileSync(defaultAppAsar, defaultAppBackup);
  }

  await asar.createPackage(defaultAppSource, defaultAppAsar);
  console.log('Electron default app now launches WaxMes');
}

async function patchExecutable() {
  await rcedit(exe, {
    icon: ico,
    'file-version': pkg.version,
    'product-version': pkg.version,
    'version-string': {
      CompanyName: appName,
      FileDescription: appName,
      ProductName: appName,
      OriginalFilename: `${appName}.exe`,
      InternalName: appName,
    }
  });
  console.log('Electron exe branded as WaxMes');
}

Promise.all([patchDefaultApp(), patchExecutable()]).catch(e => {
  console.error(e.message || e);
  process.exitCode = 1;
});
