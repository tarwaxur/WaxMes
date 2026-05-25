const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
for (let pos = 2070; pos <= 2100; pos++) {
  try {
    new Function(js.substring(0, pos));
  } catch(e) {
    console.log('Error at pos', pos, ':', e.message);
    console.log('Context:', js.substring(Math.max(0,pos-30), pos+30));
    break;
  }
}
