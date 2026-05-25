const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');

// Only check the startLocalStream function
const start = js.indexOf('function startLocalStream');
const end = js.indexOf('function createOffer', start);
const func = js.substring(start, end);

console.log('Function length:', func.length);

function countBraces(code) {
  let braces = 0, parens = 0;
  let inS = false, inD = false, inBT = false, inLC = false, inBC = false;

  function isEscaped(idx) {
    let count = 0;
    for (let j = idx - 1; j >= 0 && code[j] === '\\'; j--) count++;
    return count % 2 === 1;
  }

  for (let i = 0; i < code.length; i++) {
    const ch = code[i], n = code[i+1];
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
    else if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }
  return { braces, parens };
}

console.log('startLocalStream:', countBraces(func));
console.log('First 200 chars:', func.substring(0, 200));
console.log('Last 200 chars:', func.substring(func.length - 200));
