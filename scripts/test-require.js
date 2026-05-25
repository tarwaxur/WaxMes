// Try to require the extracted JS
try {
  const m = require('../extracted.js');
  console.log('Module loaded OK');
} catch(e) {
  console.log('Require error:', e.message);
  // Print stack trace
  console.log(e.stack?.split('\n').slice(0,5).join('\n'));
}
