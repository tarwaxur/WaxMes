const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');

// Remove sections between line START and END to isolate the error
// We'll use a divide and conquer: try removing first half, then second half
const lines = js.split('\n');

function checkSyntax(code) {
  fs.writeFileSync('__partial.js', code);
  try {
    require('child_process').execSync('node --check __partial.js 2>&1', { stdio: 'pipe' });
    fs.unlinkSync('__partial.js');
    return true;
  } catch(e) {
    fs.unlinkSync('__partial.js');
    return false;
  }
}

// Find the problematic portion by removing chunks
let totalLines = lines.length;
console.log(`Total: ${totalLines} lines`);

// Try removing first half
let mid = Math.floor(totalLines / 2);
let secondHalf = lines.slice(mid).join('\n');
console.log(`Second half (${mid}-${totalLines}): ${checkSyntax(secondHalf) ? 'OK' : 'FAIL'}`);

let firstHalf = lines.slice(0, mid).join('\n');
console.log(`First half (1-${mid}): ${checkSyntax(firstHalf) ? 'OK' : 'FAIL'}`);

// Find the smallest self-contained valid portion
// Check chunks of increasing size
let chunkSize = 50;
for (let start = 0; start < totalLines; start += chunkSize) {
  let end = Math.min(start + chunkSize, totalLines);
  let chunk = lines.slice(start, end).join('\n');
  let ok = checkSyntax(chunk);
  if (!ok) {
    // Narrow down within this chunk
    console.log(`\nFailed chunk lines ${start+1}-${end}:`);
    console.log(`  ${lines[start].substring(0, 100)}`);
    console.log(`  ...`);
    console.log(`  ${lines[end-1].substring(0, 100)}`);
    
    // Binary search within chunk
    let lo = start, hi = end;
    while (lo < hi) {
      let m = Math.floor((lo + hi) / 2);
      let sub = lines.slice(start, m).join('\n');
      if (!checkSyntax(sub)) {
        hi = m;
      } else {
        lo = m + 1;
      }
    }
    console.log(`\n  ~ Offending prefix ends at line ${lo}`);
    console.log(`  ~ Content: ${lines[lo-1].substring(0, 120)}`);
    console.log(`  ~ Previous: ${lo > 1 ? lines[lo-2].substring(0, 120) : 'N/A'}`);
    break;
  }
}

// Also check if the issue is an unclosed block in the last few lines
console.log(`\nLast 5 lines alone:`);
let last5 = lines.slice(-5).join('\n');
console.log(`  ${checkSyntax(last5) ? 'OK' : 'FAIL'}`);
console.log(`  Content: ${last5}`);
