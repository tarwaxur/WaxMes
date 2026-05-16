const rceditModule = require('rcedit');
const path = require('path');
const fs = require('fs');

const rcedit = rceditModule.rcedit || rceditModule;
const pkg = require('../package.json');
const appName = 'WaxMes';
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const iconCandidates = [
  path.join(rootDir, 'assets', 'app.ico'),
  path.join(rootDir, 'assets', 'icon.ico'),
];
const ico = iconCandidates.find((candidate) => fs.existsSync(candidate));

if (!ico) {
  console.log('App icon not found, skipping icon apply');
  process.exit(0);
}

const exeTargets = [
  path.join(distDir, 'win-unpacked', `${appName}.exe`),
];

const existingTargets = [...new Set(exeTargets)].filter((target) => fs.existsSync(target));

if (existingTargets.length === 0) {
  console.log('EXE not found, skipping icon apply');
  process.exit(0);
}

const options = {
  icon: ico,
  'file-version': pkg.version,
  'product-version': pkg.version,
  'version-string': {
    CompanyName: appName,
    FileDescription: appName,
    ProductName: appName,
    OriginalFilename: `${appName}.exe`,
    InternalName: appName,
  },
};

Promise.all(existingTargets.map((target) => rcedit(target, options).then(() => {
  console.log(`Icon applied: ${target}`);
}))).catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
