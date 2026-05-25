const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
// Binary search for error
function testSlice(end) {
  try {
    new Function(js.substring(0, end));
    return true;
  } catch(e) {
    return false;
  }
}
// Find first bad position
let lo = 0, hi = js.length;
while (lo < hi - 1) {
  const mid = Math.floor((lo + hi) / 2);
  if (testSlice(mid)) {
    lo = mid;
  } else {
    hi = mid;
  }
}
const lineNum = js.substring(0, lo).split('\n').length;
console.log('Error near char', lo, 'line', lineNum);
console.log('Context:', js.substring(Math.max(0, lo - 80), lo + 80));
