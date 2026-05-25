const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
const lines = js.split('\n');
const total = lines.length;

// Binary search to find the problematic line
function testSyntax(upToLine) {
  const partial = lines.slice(0, upToLine).join('\n');
  fs.writeFileSync('ext_partial.js', partial);
  try {
    require('child_process').execSync('node --check ext_partial.js', { stdio: 'pipe' });
    return true;
  } catch(e) {
    return false;
  }
}

// Check whole file first
console.log('Total lines:', total);
console.log('Full file syntax check:', testSyntax(total) ? 'OK' : 'FAIL');

// Find the smallest prefix that fails
let lo = 1, hi = total;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  if (!testSyntax(mid)) {
    hi = mid;
  } else {
    lo = mid + 1;
  }
}

console.log('First failing line:', lo);
console.log('Line content:', lines[lo-1]);

// Show context around the failing line
const start = Math.max(0, lo - 5);
const end = Math.min(total, lo + 2);
console.log('\nContext:');
for (let i = start; i < end; i++) {
  const marker = i === lo - 1 ? ' >>> ' : '     ';
  console.log(`${marker}${i+1}: ${lines[i].substring(0, 120)}`);
}

// Clean up
fs.unlinkSync('ext_partial.js');
