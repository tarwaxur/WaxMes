const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
let braces = 0;
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '{') braces++;
  if (ch === '}') braces--;
}
// Now track forward to find where braces stay positive until end
console.log('Final braces:', braces);
// Track where each opened brace is closed
let stack = [];
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '{') stack.push(i);
  if (ch === '}') {
    if (stack.length > 0) stack.pop();
  }
}
// Remaining unclosed braces
if (stack.length > 0) {
  console.log('Unclosed braces at positions:', stack);
  stack.forEach(pos => {
    const lineNum = js.substring(0, pos).split('\n').length;
    console.log('  Position', pos, 'line', lineNum);
    console.log('  Context:', js.substring(Math.max(0,pos-30), pos+30));
  });
} else {
  console.log('No unclosed braces (but net count is', braces, ')');
  // This means there's a { that was counted but not in the stack tracking
  // Due to string literals containing braces
}
