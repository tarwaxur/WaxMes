const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
// Track brace depth and find what's open at position 2079
let braces = 0;
let funcStarts = [];
for (let i = 0; i < 2079; i++) {
  const ch = js[i];
  const n = js[i+1];
  // Simple string/comment skipping
  if (ch === '/' && n === '/') { while (i < 2079 && js[i] !== '\n') i++; continue; }
  if (ch === '/' && n === '*') { i+=2; while (i < 2079 && !(js[i] === '*' && js[i+1] === '/')) i++; i++; continue; }
  if (ch === "'") { i++; while (i < 2079 && js[i] !== "'") { if (js[i] === '\\') i++; i++; } continue; }
  if (ch === '"') { i++; while (i < 2079 && js[i] !== '"') { if (js[i] === '\\') i++; i++; } continue; }
  if (ch === '{') {
    braces++;
    // Check if this opens a function
    const before = js.substring(Math.max(0,i-20), i).trim();
    if (before.endsWith('function') || /\bfunction\b/.test(before)) {
      funcStarts.push({pos: i, name: js.substring(i-20, i+10)});
    }
  }
  if (ch === '}') braces--;
}
console.log('Braces at 2079:', braces);
console.log('Open functions:', funcStarts.length ? funcStarts.map(f => f.name).join('\n') : 'none');
