const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];

// Write the first 2500 chars to a temp file for analysis
fs.writeFileSync('tmp_js_snippet.js', js.substring(0, 2500));
console.log('Wrote tmp_js_snippet.js');
console.log('Total JS length:', js.length);
// Check for non-printable chars
for (let i = 2000; i < 2100; i++) {
  const code = js.charCodeAt(i);
  if (code < 32 && code !== 10 && code !== 13 && code !== 9) {
    console.log('Non-printable char at', i, ':', code);
  }
}
