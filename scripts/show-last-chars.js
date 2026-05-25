const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
console.log('Last 50 chars of 2078 slice:');
console.log(JSON.stringify(js.substring(2028, 2078)));
console.log('---');
console.log('First 20 chars starting at 2078:');
console.log(JSON.stringify(js.substring(2078, 2098)));
