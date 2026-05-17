exports.default = async function(context) {
  const path = require('path');
  const fs = require('fs');
  const pkg = require('../package.json');
  const appName = context.packager.appInfo.productName;
  const exePath = path.join(context.appOutDir, appName + '.exe');
  if (!fs.existsSync(exePath)) return;
  const rcedit = require('rcedit');
  const rceditFn = rcedit.rcedit || rcedit;
  const ico = path.join(__dirname, '..', 'assets', 'app.ico');
  if (!fs.existsSync(ico)) return;
  await new Promise(function(r){setTimeout(r,500)});
  for(var attempt=0;attempt<3;attempt++){
    try {
      await rceditFn(exePath, {
        icon: ico,
        'file-version': pkg.version,
        'product-version': pkg.version,
        'version-string': {
          CompanyName: appName,
          FileDescription: appName,
          ProductName: appName,
          OriginalFilename: appName + '.exe',
          InternalName: appName,
        }
      });
      console.log('Icon + version applied via afterPack:', exePath);
      return;
    } catch(e) {
      if(attempt<2)await new Promise(function(r){setTimeout(r,1000)});
      else console.error('afterPack failed after 3 attempts:', e.message);
    }
  }
};
