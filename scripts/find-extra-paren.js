const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let parens = 0;
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
  else if (ch === ')') {
    parens--;
    if (parens < 0) {
      const lineNum = js.substring(0, i).split('\n').length;
      console.log('Extra ) at position', i, 'line', lineNum);
      console.log('Context:', js.substring(Math.max(0,i-60), i+60));
      process.exit(0);
    }
  }
  prevCh = ch;
}
console.log('Final parens:', parens);
