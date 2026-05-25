const fs = require('fs');

// Extract current JS
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];

// Simple brace/paren tracking with line numbers
let braces = 0, parens = 0;
let inS = false, inD = false, inBT = false, inLC = false, inBC = false;
let lines = js.split('\n');
let lineBp = [];

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  let lineBraces = 0, lineParens = 0;
  let prevChErr = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], n = line[i+1];
    if (inLC) break;
    if (inBC) {
      if (ch === '*' && n === '/') { inBC = false; i++; }
      continue;
    }
    if (inS) { if (ch === "'" && line[i-1] !== '\\') inS = false; continue; }
    if (inD) { if (ch === '"' && line[i-1] !== '\\') inD = false; continue; }
    if (inBT) { if (ch === '`' && line[i-1] !== '\\') inBT = false; continue; }
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
  lineBp.push({line: li+1, braces: lineBraces, parens: lineParens, cumBraces: braces, cumParens: parens});
}

// Find lines where cumulative count goes negative (likely error location)
console.log('Final cumBraces:', braces, 'cumParens:', parens);
console.log('Lines with potential errors:');
for (const lb of lineBp) {
  if (lb.cumBraces < 0 || lb.cumParens < 0) {
    console.log(`  Line ${lb.line}: braces=${lb.braces}, parens=${lb.parens}, cumBraces=${lb.cumBraces}, cumParens=${lb.cumParens}`);
  }
}

// Also find lines where cumulative is positive at end
// Find the last line where cumBraces or cumParens is positive
let lastPosBrace = null, lastPosParen = null;
for (const lb of lineBp) {
  if (lb.cumBraces > 0) lastPosBrace = lb;
  if (lb.cumParens > 0) lastPosParen = lb;
}
console.log('Last line with positive cumBraces:', lastPosBrace ? `line ${lastPosBrace.line} (cum=${lastPosBrace.cumBraces})` : 'none');
console.log('Last line with positive cumParens:', lastPosParen ? `line ${lastPosParen.line} (cum=${lastPosParen.cumParens})` : 'none');

// Also show final 5 lines
console.log('\nLast 3 lines cumulative:');
for (let i = lineBp.length - 3; i < lineBp.length; i++) {
  if (i >= 0) {
    const lb = lineBp[i];
    console.log(`  Line ${lb.line}: cumBraces=${lb.cumBraces}, cumParens=${lb.cumParens}`);
    console.log(`    Content: ${lines[lb.line-1].substring(0,100)}`);
  }
}
