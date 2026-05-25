const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
fs.writeFileSync('extracted.js', js);
console.log('Wrote extracted.js (' + js.length + ' bytes)');
