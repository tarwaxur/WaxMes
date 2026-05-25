const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let parens = 0;
// Track when parens is highest - that might indicate where a ( is missing its )
let maxParens = 0;
let maxPos = 0;
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
  else if (ch === '(') {
    parens++;
    if (parens > maxParens) {
      maxParens = parens;
      maxPos = i;
    }
  }
  else if (ch === ')') parens--;
  prevCh = ch;
}
console.log('Final parens:', parens, 'max was:', maxParens, 'at pos', maxPos);
console.log('Context at max:', js.substring(Math.max(0,maxPos-40), maxPos+80));

// Now track when parens goes up and never comes back down
let depthHistory = [];
parens = 0;
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '(') parens++;
  else if (ch === ')') parens--;
  depthHistory.push(parens);
}
// Find where parens stays high at the end
console.log('Last 10 parens depths:', depthHistory.slice(-10));
