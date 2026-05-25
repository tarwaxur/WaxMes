const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let braces = 0, parens = 0;
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '{') braces++;
  if (ch === '}') braces--;
  if (ch === '(') parens++;
  if (ch === ')') parens--;
}
console.log('Raw - Braces:', braces, 'Parens:', parens);
