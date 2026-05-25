const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
let braces = 0, parens = 0;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;
let firstExtraBrace = -1, firstExtraParen = -1;
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
  else if (ch === ')') {
    parens--;
    if (parens < 0 && firstExtraParen < 0) {
      firstExtraParen = i;
      const lineNum = js.substring(0, i).split('\n').length;
      console.log('Extra ) at line', lineNum, 'pos', i);
      console.log('Context:', js.substring(Math.max(0,i-60), i+60));
      console.log('---');
    }
  }
  else if (ch === '{') braces++;
  else if (ch === '}') {
    braces--;
    if (braces < 0 && firstExtraBrace < 0) {
      firstExtraBrace = i;
      const lineNum = js.substring(0, i).split('\n').length;
      console.log('Extra } at line', lineNum, 'pos', i);
      console.log('Context:', js.substring(Math.max(0,i-60), i+60));
      console.log('---');
    }
  }
}
console.log('Final braces:', braces, 'parens:', parens);
