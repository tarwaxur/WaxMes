const acorn = require('acorn');
const fs = require('fs');
const js = fs.readFileSync('extracted.js', 'utf8');
try {
  acorn.parse(js, { ecmaVersion: 2022 });
  console.log('Acorn: OK');
} catch(e) {
  console.log('Acorn error:', e.message);
  console.log('Line:', e.loc?.line, 'Col:', e.loc?.column);
}
