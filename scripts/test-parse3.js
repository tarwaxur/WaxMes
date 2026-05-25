const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = m[1];
// Test parsing at exact boundaries
console.log('Testing at 2070:');
try { new Function(js.substring(0, 2070)); console.log('OK'); } catch(e) { console.log('Error:', e.message); }

console.log('Testing at 2075:');
try { new Function(js.substring(0, 2075)); console.log('OK'); } catch(e) { console.log('Error:', e.message); }

console.log('Testing at 2078:');
try { new Function(js.substring(0, 2078)); console.log('OK'); } catch(e) { console.log('Error:', e.message); }

console.log('Testing at 2079:');
try { new Function(js.substring(0, 2079)); console.log('OK'); } catch(e) { console.log('Error:', e.message); }

console.log('Testing at 2080:');
try { new Function(js.substring(0, 2080)); console.log('OK'); } catch(e) { console.log('Error:', e.message); }

// Output exactly position 2070-2085
console.log('Chars 2070-2085:', JSON.stringify(js.substring(2070, 2085)));
