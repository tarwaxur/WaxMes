const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let braces = 0, parens = 0;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;

function isEscaped(idx) {
  let count = 0;
  for (let j = idx - 1; j >= 0 && js[j] === '\\'; j--) count++;
  return count % 2 === 1;
}

for (let i = 0; i < js.length; i++) {
  const ch = js[i], n = js[i+1];
  if (inLC) { if (ch === '\n') inLC = false; continue; }
  if (inBC) { if (ch === '*' && n === '/') { inBC = false; i++; } continue; }
  if (inS) { if (ch === "'" && !isEscaped(i)) inS = false; continue; }
  if (inD) { if (ch === '"' && !isEscaped(i)) inD = false; continue; }
  if (inBT) { if (ch === '`' && !isEscaped(i)) inBT = false; continue; }
  if (ch === '/' && n === '/') { inLC = true; i++; continue; }
  if (ch === '/' && n === '*') { inBC = true; i++; continue; }
  if (ch === "/" && /[(,=!:&|?{;]\s*$/.test(js.substring(Math.max(0,i-10), i))) { 
    // Could be regex start, skip till /
    for (let j = i+1; j < js.length; j++) {
      if (js[j] === '\\') { j++; continue; }
      if (js[j] === '/') { i = j; break; }
    }
    continue;
  }
  if (ch === "'") inS = true;
  else if (ch === '"') inD = true;
  else if (ch === '`') inBT = true;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
  else if (ch === '{') braces++;
  else if (ch === '}') braces--;
}
console.log('Braces: ' + braces + ', Parens: ' + parens + ' => ' + (braces === 0 && parens === 0 ? 'OK' : 'BROKEN'));
