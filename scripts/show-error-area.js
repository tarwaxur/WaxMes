const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
// Show from 2000 to 2200
console.log(js.substring(2000, 2200));
// Also try parse around the area
try {
  new Function(js.substring(0, 2100));
  console.log('--- ok up to 2100 ---');
} catch(e) {
  console.log('Error at 2100:', e.message);
}
try {
  new Function(js.substring(0, 2070));
  console.log('--- ok up to 2070 ---');
} catch(e) {
  console.log('Error at 2070:', e.message);
}
