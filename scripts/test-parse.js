const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
// Try to find the issue by checking if individual function definitions parse
const lines = js.split('\n');
let buf = '';
for (let i = 0; i < lines.length; i++) {
  buf += lines[i] + '\n';
  try {
    new Function(buf);
  } catch(e) {
    console.log('Error after line', (i+1), ':', e.message);
    console.log('Line content:', lines[i]);
    break;
  }
}
