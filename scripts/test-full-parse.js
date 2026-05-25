const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.log('Script not found'); process.exit(1); }
const js = m[1];
try {
  new Function(js);
  console.log('Full JS: OK');
} catch(e) {
  console.log('Full JS Error:', e.message);
  // Find position
  for (let i = js.length - 1; i >= 0; i--) {
    try {
      new Function(js.substring(0, i));
      console.log('Error starts near pos', i);
      console.log('Context:', js.substring(Math.max(0,i-50), i+50));
      break;
    } catch(e2) {}
  }
}
