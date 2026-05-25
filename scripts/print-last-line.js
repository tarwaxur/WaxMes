const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
// Find the last line of startLocalStream
const start = js.indexOf('function startLocalStream');
const end = js.indexOf('function createOffer', start);
const func = js.substring(start, end);
const lines = func.split('\n');
const lastLine = lines[lines.length-1];
console.log('Last line:', JSON.stringify(lastLine));
console.log('Last line length:', lastLine.length);

// Print each character
let line = lastLine;
for (let i = 0; i < line.length; i++) {
  console.log(`  ${i}: '${line[i]}' (${line.charCodeAt(i)})`);
}
