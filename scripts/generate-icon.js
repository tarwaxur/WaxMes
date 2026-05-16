const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, '..', 'assets');
const src = path.join(outDir, 'app.ico');
const dst = path.join(outDir, 'icon.ico');
if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst);
  console.log('Icon files preserved from app.ico');
} else {
  console.log('app.ico not found, skipping icon generation');
}
