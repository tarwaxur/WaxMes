const fs = require('fs');
const t = fs.readFileSync('index.html', 'utf8');
const s = t.indexOf('<script>');
const e = t.indexOf('</script>', s);
const js = t.slice(s + 8, e);
const half = Math.floor(js.length / 2);
const second = js.slice(half);
const half2 = Math.floor(second.length / 2);
const first = second.slice(0, half2);
const last = second.slice(half2);
let b1 = 0, p1 = 0;
for (let c of first) { if (c === '{') b1++; if (c === '}') b1--; if (c === '(') p1++; if (c === ')') p1--; }
let b2 = 0, p2 = 0;
for (let c of last) { if (c === '{') b2++; if (c === '}') b2--; if (c === '(') p2++; if (c === ')') p2--; }
console.log('Q3:', b1, p1);
console.log('Q4:', b2, p2);
