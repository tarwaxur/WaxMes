const fs = require('fs');
const t = fs.readFileSync('index.html', 'utf8');
const s = t.indexOf('<script>');
const e = t.indexOf('</script>', s);
const js = t.slice(s + 8, e);
const half = Math.floor(js.length / 2);
const first = js.slice(0, half);
const second = js.slice(half);
let b1 = 0, p1 = 0;
for (let c of first) { if (c === '{') b1++; if (c === '}') b1--; if (c === '(') p1++; if (c === ')') p1--; }
let b2 = 0, p2 = 0;
for (let c of second) { if (c === '{') b2++; if (c === '}') b2--; if (c === '(') p2++; if (c === ')') p2--; }
console.log('First half:', b1, p1);
console.log('Second half:', b2, p2);
console.log('Total:', b1 + b2, p1 + p2);
