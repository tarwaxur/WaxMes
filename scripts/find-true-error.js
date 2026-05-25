const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];

// Find the first position where parsing fails
// But we need to account for truncation - so we test each character
// and track the last OK position and first FAIL position
let lastOk = 0;
let firstFail = js.length - 1;

// Check if full parse actually works
try {
  new Function(js);
  console.log('Full JS parses OK');
  process.exit(0);
} catch(e) {
  // Binary search for error position
  let lo = 0;
  let hi = js.length - 1;
  let lastGood = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    try {
      new Function(js.substring(0, mid));
      lastGood = mid;
      lo = mid + 1;
    } catch(e2) {
      hi = mid - 1;
    }
  }
  // Character at lastGood is the last OK position
  // Character at lastGood+1 is the start of the error
  const errPos = lastGood;
  const lineNum = js.substring(0, errPos).split('\n').length;
  console.log('Last OK position:', errPos, 'line', lineNum);
  console.log('Character at errPos:', JSON.stringify(js[errPos]));
  console.log('Context before:', js.substring(Math.max(0, errPos - 60), errPos));
  console.log('Context after:', js.substring(errPos, errPos + 60));
}
