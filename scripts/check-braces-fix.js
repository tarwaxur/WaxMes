const fs = require('fs');
const t = fs.readFileSync('index.html', 'utf8');
const s = t.indexOf('<script');
const e = t.indexOf('</script>', s);
const js = t.slice(s + 8, e);
let b = 0;
for (let c of js) {
  if (c === '{') b++;
  if (c === '}') b--;
}
console.log('Braces:', b);
