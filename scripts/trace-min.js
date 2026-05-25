const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let braces = 0, parens = 0, minBraces = 9999, minParens = 9999;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;
const lines = js.split('\n');

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], n = line[i+1];
    if (inLC) break;
    if (inBC) { if (ch === '*' && n === '/') { inBC = false; i++; } continue; }
    if (inS) { if (ch === "'" && line[i-1] !== '\\') inS = false; continue; }
    if (inD) { if (ch === '"' && line[i-1] !== '\\') inD = false; continue; }
    if (inBT) { if (ch === '`' && line[i-1] !== '\\') inBT = false; continue; }
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
  if (braces < minBraces) { minBraces = braces; console.log(`MIN braces=${braces} at line ${li+1}: ${line.substring(0,100)}`); }
  if (parens < minParens) { minParens = parens; console.log(`MIN parens=${parens} at line ${li+1}: ${line.substring(0,100)}`); }
}
console.log(`\nFinal - braces: ${braces}, parens: ${parens}`);
console.log(`Min braces: ${minBraces}, min parens: ${minParens}`);
