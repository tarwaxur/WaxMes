const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let braces = 0, parens = 0;
// Better filter: track strings, comments, template literals, regex
let inS = false, inD = false, inBT = false, inLC = false, inBC = false, inRX = false;
let prevCh = '';
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (inLC) { if (ch === '\n') inLC = false; continue; }
  if (inBC) { if (ch === '*' && js[i+1] === '/') { inBC = false; i++; } continue; }
  if (inS) { if (ch === "'" && prevCh !== '\\') inS = false; prevCh = ch; continue; }
  if (inD) { if (ch === '"' && prevCh !== '\\') inD = false; prevCh = ch; continue; }
  if (inBT) { if (ch === '`' && prevCh !== '\\') inBT = false; prevCh = ch; continue; }
  if (inRX) { if (ch === '/' && prevCh !== '\\') inRX = false; prevCh = ch; continue; }
  if (ch === '/' && js[i+1] === '/') { inLC = true; i++; continue; }
  if (ch === '/' && js[i+1] === '*') { inBC = true; i++; continue; }
  if (ch === "'") inS = true;
  else if (ch === '"') inD = true;
  else if (ch === '`') inBT = true;
  else if (ch === '/' && /[(,=!:&|?{;]\s*$/.test(js.substring(Math.max(0,i-5), i))) inRX = true;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
  else if (ch === '{') braces++;
  else if (ch === '}') braces--;
  prevCh = ch;
}
console.log('Braces:', braces, 'Parens:', parens);
