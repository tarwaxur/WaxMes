// E2E Encryption/Decryption Test Suite
// Replicates the exact logic from index.html for verification

globalThis.crypto = require('crypto').webcrypto;

var passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  \x1b[32mPASS\x1b[0m ' + msg) }
  else { failed++; console.log('  \x1b[31mFAIL\x1b[0m ' + msg) }
}

// Replicate the E2E functions from index.html (same logic)
var e2eKeys = null;

async function e2eEncrypt(text, recipientPubKeyB64) {
  var keys = recipientPubKeyB64.map ? recipientPubKeyB64 : [recipientPubKeyB64];
  if (!text || !keys.length || !globalThis.crypto) throw new Error('E2E: missing key');
  var aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  var aesRaw = await crypto.subtle.exportKey('raw', aesKey);
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var encMsg = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, new TextEncoder().encode(text));
  var encMsgArr = new Uint8Array(encMsg);
  var encKeys = [];
  for (var ei = 0; ei < keys.length; ei++) {
    var pubBin = Uint8Array.from(atob(keys[ei]), function (c) { return c.charCodeAt(0) });
    var pubKey = await crypto.subtle.importKey('spki', pubBin, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
    var ek = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, aesRaw);
    encKeys.push(new Uint8Array(ek));
  }
  if (keys.length === 1) {
    var packed = new Uint8Array(1 + 12 + 2 + encKeys[0].length + encMsgArr.length);
    packed[0] = 1;
    packed.set(iv, 1);
    packed.set([encKeys[0].length >> 8, encKeys[0].length & 255], 13);
    packed.set(encKeys[0], 15);
    packed.set(encMsgArr, 15 + encKeys[0].length);
    return '\u{1F512}' + btoa(String.fromCharCode.apply(null, packed));
  } else {
    var total = 1 + 2 + 12 + encMsgArr.length;
    for (var ei = 0; ei < encKeys.length; ei++) total += 2 + encKeys[ei].length;
    var packed = new Uint8Array(total);
    packed[0] = 2;
    packed.set([encKeys.length >> 8, encKeys.length & 255], 1);
    var off = 3;
    for (var ei = 0; ei < encKeys.length; ei++) {
      packed.set([encKeys[ei].length >> 8, encKeys[ei].length & 255], off);
      packed.set(encKeys[ei], off + 2);
      off += 2 + encKeys[ei].length;
    }
    packed.set(iv, off); off += 12;
    packed.set(encMsgArr, off);
    return '\u{1F512}' + btoa(String.fromCharCode.apply(null, packed));
  }
}

async function e2eDecrypt(packed64) {
  if (!packed64 || packed64.indexOf('\u{1F512}') !== 0 || !e2eKeys || !e2eKeys.privateKey) return null;
  try {
    var raw = Uint8Array.from(atob(packed64.slice(2)), function (c) { return c.charCodeAt(0) });
    var ver = raw[0];
    if (ver === 1) {
      var iv = raw.slice(1, 13);
      var keyLen = (raw[13] << 8) | raw[14];
      var encKey = raw.slice(15, 15 + keyLen);
      var encMsg = raw.slice(15 + keyLen);
      var aesRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, e2eKeys.privateKey, encKey);
      var aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, encMsg);
      return new TextDecoder().decode(dec);
    } else if (ver === 2) {
      var numKeys = (raw[1] << 8) | raw[2];
      var off = 3, foundKey = null;
      for (var ki = 0; ki < numKeys; ki++) {
        var kl = (raw[off] << 8) | raw[off + 1];
        var ek = raw.slice(off + 2, off + 2 + kl);
        off += 2 + kl;
        if (!foundKey) { try { var maybe = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, e2eKeys.privateKey, ek); foundKey = new Uint8Array(maybe); } catch (e) { } }
      }
      if (!foundKey) return null;
      var iv = raw.slice(off, off + 12);
      var encMsg = raw.slice(off + 12);
      var aesKey = await crypto.subtle.importKey('raw', foundKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, encMsg);
      return new TextDecoder().decode(dec);
    }
    return null;
  } catch (e) { return null }
}

// ---- Tests ----
async function runTests() {
  console.log('\n=== E2E Encryption Test Suite ===\n');

  // Generate key pairs
  console.log('[Setup] Generating RSA key pairs...');
  var alice = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  var bob = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  var charlie = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  var alicePubB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(await crypto.subtle.exportKey('spki', alice.publicKey))));
  var bobPubB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(await crypto.subtle.exportKey('spki', bob.publicKey))));
  var charliePubB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(await crypto.subtle.exportKey('spki', charlie.publicKey))));
  console.log('  3 key pairs generated\n');

  // ---- v1 (1-on-1) Tests ----
  console.log('--- v1: Single Recipient (1-on-1) ---');

  // Set Alice as decryptor
  e2eKeys = { privateKey: alice.privateKey };
  var msg = 'Merhaba D\u00fcnya! 123 \ud83d\ude00';

  var enc = await e2eEncrypt(msg, alicePubB64);
  assert(enc.indexOf('\u{1F512}') === 0, 'Encrypted message starts with \u{1F512} prefix');

  var dec = await e2eDecrypt(enc);
  assert(dec === msg, 'Alice can decrypt her own message');

  // Bob tries to decrypt Alice's message (should fail)
  e2eKeys = { privateKey: bob.privateKey };
  var dec2 = await e2eDecrypt(enc);
  assert(dec2 === null, 'Bob cannot decrypt Alice\'s message (returns null)');

  // Bob encrypts for himself, Alice can't read
  var msg2 = 'Bob\'s secret message';
  var enc2 = await e2eEncrypt(msg2, bobPubB64);
  e2eKeys = { privateKey: alice.privateKey };
  var dec3 = await e2eDecrypt(enc2);
  assert(dec3 === null, 'Alice cannot decrypt Bob\'s message');

  // Bob decrypts his own
  e2eKeys = { privateKey: bob.privateKey };
  var dec4 = await e2eDecrypt(enc2);
  assert(dec4 === msg2, 'Bob can decrypt his own message');

  // Edge cases
  var dec5 = await e2eDecrypt(null);
  assert(dec5 === null, 'Decrypt null returns null');

  var dec6 = await e2eDecrypt('');
  assert(dec6 === null, 'Decrypt empty string returns null');

  var dec7 = await e2eDecrypt('hello plaintext');
  assert(dec7 === null, 'Decrypt plaintext (no \u{1F512}) returns null');

  // Tampered data
  var tampered = enc.slice(0, 5) + 'X' + enc.slice(6);
  var dec8 = await e2eDecrypt(tampered);
  assert(dec8 === null, 'Tampered ciphertext returns null');

  // ---- v2 (Group) Tests ----
  console.log('\n--- v2: Multi-Recipient (Group) ---');

  var groupMsg = 'Grup mesaj\u0131!';
  e2eKeys = { privateKey: alice.privateKey };
  var groupEnc = await e2eEncrypt(groupMsg, [bobPubB64, charliePubB64]);

  assert(groupEnc.indexOf('\u{1F512}') === 0, 'Group encrypted message starts with \u{1F512}');

  // Bob should be able to decrypt
  e2eKeys = { privateKey: bob.privateKey };
  var groupDec1 = await e2eDecrypt(groupEnc);
  assert(groupDec1 === groupMsg, 'Bob can decrypt group message');

  // Charlie should be able to decrypt
  e2eKeys = { privateKey: charlie.privateKey };
  var groupDec2 = await e2eDecrypt(groupEnc);
  assert(groupDec2 === groupMsg, 'Charlie can decrypt group message');

  // Alice (non-recipient) should NOT be able to decrypt
  e2eKeys = { privateKey: alice.privateKey };
  var groupDec3 = await e2eDecrypt(groupEnc);
  assert(groupDec3 === null, 'Alice (non-member) cannot decrypt group message');

  // Single member in array still works (v2 with 1 key)
  e2eKeys = { privateKey: alice.privateKey };
  var singleArrEnc = await e2eEncrypt('single array', [alicePubB64]);
  var singleArrDec = await e2eDecrypt(singleArrEnc);
  assert(singleArrDec === 'single array', 'Array with 1 key works');

  // ---- Long message test ----
  console.log('\n--- Long Messages ---');

  var longMsg = 'A'.repeat(10000); // 10KB message
  e2eKeys = { privateKey: alice.privateKey };
  var longEnc = await e2eEncrypt(longMsg, alicePubB64);
  var longDec = await e2eDecrypt(longEnc);
  assert(longDec === longMsg, '10KB message encrypts and decrypts correctly');
  assert(longEnc.length < 30000, 'Encrypted overhead is reasonable (' + longEnc.length + ' bytes vs ' + longMsg.length + ' plaintext)');

  // ---- Unicode test ----
  console.log('\n--- Unicode ---');

  var unicodeMsg = 'T\u00fcrk\u00e7e \u0130\u015faretler: \u00fc\u011fi\u015f\u00e7\u00f6\u00fcz \ud83c\udf0d \ud83d\ude80 \u2764\ufe0f \u{1F469}\u200d\u{1F4BB}';
  e2eKeys = { privateKey: alice.privateKey };
  var unicodeEnc = await e2eEncrypt(unicodeMsg, alicePubB64);
  var unicodeDec = await e2eDecrypt(unicodeEnc);
  assert(unicodeDec === unicodeMsg, 'Unicode text (emoji, Turkish chars) works');

  // ---- Summary ----
  var total = passed + failed;
  console.log('\n=== Results: ' + passed + '/' + total + ' passed' + (failed ? ', ' + failed + ' FAILED' : '') + ' ===\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(function (e) {
  console.error('\n\x1b[31mTest suite crashed:\x1b[0m', e.message);
  process.exit(1);
});
