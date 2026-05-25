const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');

function isEscaped(idx) {
  let count = 0;
  for (let j = idx - 1; j >= 0 && js[j] === '\\'; j--) count++;
  return count % 2 === 1;
}

let inS = false, inD = false, inBT = false, inLC = false, inBC = false;
let stack = []; // tracks positions of unclosed `{`
let braces = 0, parens = 0;

for (let i = 0; i < js.length; i++) {
  const ch = js[i], n = js[i+1];
  if (inLC) { if (ch === '\n') inLC = false; continue; }
  if (inBC) { if (ch === '*' && n === '/') { inBC = false; i++; } continue; }
  if (inS) { if (ch === "'" && !isEscaped(i)) inS = false; continue; }
  if (inD) { if (ch === '"' && !isEscaped(i)) inD = false; continue; }
  if (inBT) { if (ch === '`' && !isEscaped(i)) inBT = false; continue; }
  if (ch === '/' && n === '/') { inLC = true; i++; continue; }
  if (ch === '/' && n === '*') { inBC = true; i++; continue; }
  if (ch === "'") inS = true;
  else if (ch === '"') inD = true;
  else if (ch === '`') inBT = true;
  else if (ch === '/') {
    // Check if this starts a regex
    // Heuristic: look back for operator context
    let ctx = js.substring(Math.max(0,i-20), i).trim();
    if (/[(,=\?:!|&+\-*\/%^<>{};]\s*$/.test(ctx) || !ctx) {
      // This is likely a regex, skip to closing /
      for (let j = i+1; j < js.length; j++) {
        if (isEscaped(j)) continue;
        if (js[j] === '/') { i = j; break; }
        if (js[j] === '\n') break; // regex can't span lines
      }
      continue;
    }
  }
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
  else if (ch === '{') { braces++; stack.push({pos: i, braceNum: braces, parenCount: parens}); }
  else if (ch === '}') { braces--; if (stack.length > 0) stack.pop(); }
}

console.log('Final - Braces:', braces, 'Parens:', parens);
if (stack.length > 0) {
  console.log('Unclosed braces at ' + stack.length + ' positions:');
  for (const entry of stack) {
    const lineNum = js.substring(0, entry.pos).split('\n').length;
    console.log('  Pos', entry.pos, 'Line', lineNum, 'ctx:', js.substring(entry.pos, entry.pos+60).replace(/\n/g, '\\n'));
  }
}
