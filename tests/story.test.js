// Story / 24h Durum — pure logic tests (Firestore olmadan)
// Test eder: isStoryActive, storyTimeAgo, groupStoriesByAuthor, STORY_TTL_MS

// Mock store + localStorage
var _store = {};
var _lsData = {};
global.localStorage = {
  getItem: function(k) { return _lsData[k] || null; },
  setItem: function(k, v) { _lsData[k] = String(v); },
  removeItem: function(k) { delete _lsData[k]; }
};
global.ls = function(k, v) {
  if (v === undefined) return _store[k] !== undefined ? _store[k] : (_lsData[k] ? JSON.parse(_lsData[k]) : null);
  _store[k] = v;
  _lsData[k] = JSON.stringify(v);
};
global.STORAGE_KEYS = { STORY_VIEWED: 'storyViewed' };
global.STATUS = { ONLINE: 'online' };
global.fbUserId = function() { return 'me-uid'; };
global.window = { fbUserId: global.fbUserId };
global.firebase = {
  firestore: {
    Timestamp: {
      fromMillis: function(ms) { return { toMillis: function() { return ms; } }; }
    },
    FieldValue: {
      arrayUnion: function() { return 'arrayUnionOp'; }
    }
  }
};
// Mock document for keyboard listener
global.document = {
  addEventListener: function() { /* no-op for tests */ },
  body: { appendChild: function() {} },
  createElement: function() { return { style: {}, classList: { add: function(){}, remove: function(){} } }; },
  getElementById: function() { return null; }
};
global.performance = { now: function() { return Date.now(); } };
global.clearInterval = function() {};
global.setInterval = function() {};

// Load story.js (use eval to get var declarations in scope)
var fs = require('fs');
var storyCode = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'story.js'), 'utf8');
// Strip the trailing document.addEventListener call for clean test scope
storyCode = storyCode.replace(/document\.addEventListener\([\s\S]*?\}\);[\s]*$/, '');
eval(storyCode);

var pass = 0, fail = 0;
function assert(cond, name) {
  if (cond) { console.log('  PASS ' + name); pass++; }
  else { console.log('  FAIL ' + name); fail++; }
}

console.log('=== Story Tests ===\n');

// ===== isStoryActive =====
console.log('--- isStoryActive ---');
var now = Date.now();
assert(isStoryActive({ expiresAt: { toMillis: function() { return now + 60000; } } }) === true, 'Future expiry is active');
assert(isStoryActive({ expiresAt: { toMillis: function() { return now - 1000; } } }) === false, 'Past expiry is not active');
assert(isStoryActive({ expiresAt: now + 60000 }) === true, 'Numeric expiry is active');
assert(isStoryActive(null) === false, 'Null is not active');
assert(isStoryActive({}) === false, 'Empty is not active');
assert(isStoryActive({ expiresAt: 0 }) === false, 'Zero expiry is not active');

// ===== STORY_TTL_MS =====
console.log('\n--- TTL Configuration ---');
assert(STORY_TTL_MS === 24 * 60 * 60 * 1000, 'TTL is 24 hours');
assert(STORY_SEGMENT_MS === 5000, 'Segment duration is 5s');

// ===== storyTimeAgo =====
console.log('\n--- storyTimeAgo ---');
assert(storyTimeAgo({ createdAt: { toMillis: function() { return now - 30000; } } }) === 'şimdi', '30s ago = şimdi');
assert(storyTimeAgo({ createdAt: { toMillis: function() { return now - 5 * 60000; } } }) === '5 dk önce', '5 min ago = 5 dk önce');
assert(storyTimeAgo({ createdAt: { toMillis: function() { return now - 2 * 60 * 60000; } } }) === '2 sa önce', '2 hours ago = 2 sa önce');
assert(storyTimeAgo({ createdAt: { toMillis: function() { return now - 26 * 60 * 60000; } } }) === '1 gün önce', '26 hours ago = 1 gün önce');
assert(storyTimeAgo(null) === '', 'null = empty');

// ===== groupStoriesByAuthor =====
console.log('\n--- groupStoriesByAuthor ---');

// Mock store
global.store = { storyViewed: {} };

var stories = [
  { id: 's1', authorId: 'a', authorName: 'Alice', authorAvatar: 'A', type: 'text', text: 'Hi', createdAt: { toMillis: function() { return now - 30000; } }, expiresAt: { toMillis: function() { return now + 60000; } } },
  { id: 's2', authorId: 'b', authorName: 'Bob', authorAvatar: 'B', type: 'image', mediaUrl: 'x', createdAt: { toMillis: function() { return now - 60000; } }, expiresAt: { toMillis: function() { return now + 60000; } } },
  { id: 's3', authorId: 'a', authorName: 'Alice', authorAvatar: 'A', type: 'text', text: 'Yo', createdAt: { toMillis: function() { return now - 10000; } }, expiresAt: { toMillis: function() { return now + 60000; } } },
  { id: 's4', authorId: 'me-uid', authorName: 'Me', authorAvatar: 'M', type: 'text', text: 'My story', createdAt: { toMillis: function() { return now - 5000; } }, expiresAt: { toMillis: function() { return now + 60000; } } }
];

var groups = groupStoriesByAuthor(stories);
assert(groups.length === 3, '3 unique authors (Alice, Bob, Me)');
assert(groups[groups.length - 1].authorId === 'me-uid', 'My own story is last');
// Görülmemiş olanlar önce: Alice (has unseen) + Bob (has unseen), sonra Me
var aGroup = groups.filter(function(g){return g.authorId==='a';})[0];
assert(aGroup && aGroup.items.length === 2, 'Alice has 2 stories');
assert(aGroup.items[0].id === 's1' && aGroup.items[1].id === 's3', 'Alice items sorted by createdAt asc');
assert(aGroup.hasUnseen === true, 'Alice has unseen (none viewed)');
var bGroup = groups.filter(function(g){return g.authorId==='b';})[0];
assert(bGroup && bGroup.hasUnseen === true, 'Bob has unseen');

// Tüm Alice'leri gördüm
store.storyViewed = { s1: now, s3: now };
var groups2 = groupStoriesByAuthor(stories);
var a2 = groups2.filter(function(g){return g.authorId==='a';})[0];
assert(a2.hasUnseen === false, 'Alice all viewed = no unseen');

// Süresi dolmuş story'leri filtrele (isStoryActive false döner)
var expiredStories = [
  { id: 'x1', authorId: 'x', authorName: 'X', authorAvatar: 'X', type: 'text', text: 'old', createdAt: { toMillis: function() { return now - 100000; } }, expiresAt: { toMillis: function() { return now - 1000; } } }
];
var expGroups = groupStoriesByAuthor(expiredStories);
assert(expGroups[0].items.length === 1, 'Expired story still in array (Firestore query should have pre-filtered)');

// ===== Story segments ordering =====
console.log('\n--- Segment ordering ---');
var segGroups = groupStoriesByAuthor(stories);
var aSegs = segGroups.filter(function(g){return g.authorId==='a';})[0];
assert(aSegs.items[0].id === 's1' && aSegs.items[1].id === 's3', 'Segments are ascending by time');

// ===== STORY_BG_COLORS =====
console.log('\n--- Story config ---');
assert(Array.isArray(STORY_BG_COLORS) && STORY_BG_COLORS.length >= 8, 'Has background color palette');
assert(Array.isArray(STORY_FONTS) && STORY_FONTS.length >= 3, 'Has font options');
assert(STORY_FONTS.every(function(f){return f.id && f.name && f.stack}), 'Fonts have id/name/stack');

console.log('\n=== Results: ' + pass + '/' + (pass + fail) + ' passed ===');
process.exit(fail === 0 ? 0 : 1);
