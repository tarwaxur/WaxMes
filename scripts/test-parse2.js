const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
const lines = js.split('\n');
// Test line by line, building a function
let testCode = '';
for (let i = 0; i < 25; i++) {
  testCode += lines[i] + '\n';
}
console.log('Testing code up to line 25:');
console.log(testCode);
try {
  new Function(testCode);
  console.log('OK');
} catch(e) {
  console.log('Error:', e.message);
}
// Try wrapping differently
testCode = '"use strict";\n' + lines.slice(0, 18).join('\n');
try {
  new Function(testCode);
  console.log('With strict OK');
} catch(e) {
  console.log('With strict Error:', e.message);
}
