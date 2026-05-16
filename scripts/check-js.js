const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) process.exit(1);
const js = m[1];
let braces = 0, parens = 0;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;
for (let i = 0; i < js.length; i++) {
  const ch = js[i], n = js[i+1];
  if (inLC) { if (ch === '\n') inLC = false; continue; }
  if (inBC) { if (ch === '*' && n === '/') { inBC = false; i++; } continue; }
  if (inS) { if (ch === "'" && js[i-1] !== '\\') inS = false; continue; }
  if (inD) { if (ch === '"' && js[i-1] !== '\\') inD = false; continue; }
  if (inBT) { if (ch === '`' && js[i-1] !== '\\') inBT = false; continue; }
  if (ch === '/' && n === '/') { inLC = true; i++; continue; }
  if (ch === '/' && n === '*') { inBC = true; i++; continue; }
  if (ch === "'") inS = true;
  else if (ch === '"') inD = true;
  else if (ch === '`') inBT = true;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
  else if (ch === '{') braces++;
  else if (ch === '}') braces--;
}
console.log('Braces: ' + braces + ', Parens: ' + parens + ' => ' + (braces === 0 && parens === 0 ? 'OK' : 'BROKEN'));
