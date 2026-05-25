const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');

const start = js.indexOf('function startLocalStream');
const end = js.indexOf('function createOffer', start);
const func = js.substring(start, end);
const lines = func.split('\n');

let braces = 0, parens = 0;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;

function isEscaped(idx, code) {
  let count = 0;
  for (let j = idx - 1; j >= 0 && code[j] === '\\'; j--) count++;
  return count % 2 === 1;
}

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  let lineBraces = 0, lineParens = 0;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], n = line[i+1];
    if (inLC) break;
    if (inBC) { if (ch === '*' && n === '/') { inBC = false; i++; } continue; }
    if (inS) { if (ch === "'" && !isEscaped(i, line)) inS = false; continue; }
    if (inD) { if (ch === '"' && !isEscaped(i, line)) inD = false; continue; }
    if (inBT) { if (ch === '`' && !isEscaped(i, line)) inBT = false; continue; }
    if (ch === '/' && n === '/') { inLC = true; i++; continue; }
    if (ch === '/' && n === '*') { inBC = true; i++; continue; }
    if (ch === "'") inS = true;
    else if (ch === '"') inD = true;
    else if (ch === '`') inBT = true;
    else if (ch === '(') { parens++; lineParens++; }
    else if (ch === ')') { parens--; lineParens--; }
    else if (ch === '{') { braces++; lineBraces++; }
    else if (ch === '}') { braces--; lineBraces--; }
  }
  console.log(`L${li+1} (+${lineBraces}/${lineParens}) cum=${braces}/${parens}: ${line}`);
}
console.log(`\nFinal: braces=${braces}, parens=${parens}`);
