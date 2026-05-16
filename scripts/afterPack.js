exports.default = async function(context) {
  const path = require('path');
  const fs = require('fs');
  const appName = context.packager.appInfo.productName;
  const exePath = path.join(context.appOutDir, appName + '.exe');
  if (!fs.existsSync(exePath)) return;
  const rcedit = require('rcedit');
  const rceditFn = rcedit.rcedit || rcedit;
  const ico = path.join(__dirname, '..', 'assets', 'app.ico');
  if (!fs.existsSync(ico)) return;
  try {
    await rceditFn(exePath, { icon: ico });
    console.log('Icon applied via afterPack:', exePath);
  } catch(e) {
    console.error('Icon apply failed:', e.message);
  }
};
