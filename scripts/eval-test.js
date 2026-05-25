const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
try {
  // Wrap in a function and try to parse
  new Function(js);
  console.log('Function constructor: OK');
} catch(e) {
  console.log('Function constructor ERROR:', e.message);
}
