## Goal
- Monolitik JS/CSS temizliği (T1 ✅), global state store refactor (T2 ✅), callback hell async/await dönüşümü (T5 ✅)

## Constraints & Preferences
- Adım adım ilerle, arayüzü bozmamaya dikkat et
- `dist\win-unpacked` ve `dist\WaxMesSetup.exe` her düzeltmede güncellendi
- fix.txt'deki her madde sırayla çözülecek
- `git checkout -- src/*.js` ile tüm kaynak dosyalar HEAD'e döndü

## Progress
### Done
- **T1: Monolitik yapı temizliği** — CSS 5 dosyaya ayrıldı, navigation.js ui-core.js'e birleştirildi, hideLoading cleanup, build + test
- **T2: Global state store (tam)** — `store.js` IIFE + `Object.defineProperty` ile tüm property'lerde getter/setter; `store.set/get/emit/on/off` API; `store.push/unshift/splice` dot-notation helper; tüm `var` bildirimleri kaldırıldı; tüm `.push()`'lar `store.push()`'a migrate edildi; kaçak globaller temizlendi; `store.on('conversations', renderConversations)`, `store.on('messages', renderMessages)` aboneleri eklendi
- **T3: Sıfır hata yönetimi** — 42 adet `.catch(function(){})` → `.catch(console.error)` (eskiden yapıldı)
- **T4: CSP daraltma** — `'unsafe-inline'` default-src'den style-src'e taşındı, script-src 'self' eklendi (eskiden yapıldı)
- **T5: Callback hell → async/await (tam)** — 0 adet `.then()` kaldı. Tüm derin Promise chain'ler ve 35 tek-katlı `.then()` dönüştürüldü: `sendFriendRequest`, `acceptFriendRequest`, `startCall`, `startLocalStream`, `acceptCall`, `completeRegistration`, `changePassword`, `checkUpdate`, `fbUploadFile`, `createOffer`, `fbSendCallSignal`, `toggleCallCamera`, `toggleCallScreen`, `doLogin`, `autoLogin`, `regNext`, `initWelcome`, `showSettingsCat`, `switchFriendsTab`, `removeFriend`, `refreshFriendsCache`, `withdrawRequest`, `declineFriendRequest`, `startVoice`, `sendVoice`, `fbSendMessage`, `applyFirestoreGroupConversation`, `fbClearConversationMessages`, `newGroup`, `pickGroupAvatar`, `confirmSendMedia`, `renderMessages` (e2eDecrypt IIFE) — 47 `async function` dönüşümü toplam
- **Build her adımda başarılı**, app test edildi

### In Progress
- **T6: Inline Event Handler'lar** — `index.html`'deki ~50 onclick/oninput attribute'ları JS'e taşınacak

### Blocked
- (none)

## Key Decisions
- `store.js` IIFE + `Object.defineProperty` ile yazıldı — `store.x = val` direkt atamaları otomatik `emit()` tetikler, `store.set('x', val)` de çalışır
- `store.push/unshift/splice` dot-notation path destekler — nested array mutasyonlarında emit garantisi
- Kalan 31 `.then()` opsiyoneldi (fix.txt'ye göre callback hell çözülmüştü) ama temizlik için hepsi dönüştürüldü
- `async/await` desteklenen ortam: Electron 42 (Chrome 128+) — tüm modern JS özellikleri mevcut
- Top-level `.then()`'ler için IIFE `(async function(){...})()` deseni kullanıldı
- Event callback içindeki `.then()`'ler için ya IIFE ya da callback'in kendisi `async` yapıldı (onSnapshot, forEach, reader.onloadend)
- `Promise.all(...).then(...)` deseni `var results=await Promise.all(...)` şeklinde sadeleştirildi

## Next Steps
1. **T6**: `index.html`'deki inline event handler'ları (`onclick`, `oninput`, `onkeydown`, `onchange`, `oncontextmenu`) JS dosyalarına taşı
2. Tüm inline `onclick`'leri `addEventListener` veya `$('id').onclick = fn` ile değiştir
3. `npm run build` + test + commit

## Critical Context
- **Son commit:** `c0e6278 T5: tum .then() -> async/await, kalan 31+ tek-katli donusum tamamlandi`
- **Yükleme sırası (15 script):** `constants → store → utils → accounts → shortcuts → ui-core → e2e → messaging → firebase-data → settings → media → voice → calls → app-init`
- **Fix.txt son durum:** T1✅ T2✅ T3✅ T4✅ T5✅ — sıradaki T6: Inline Event Handler'lar

## Relevant Files
- `src/ui-core.js` — en büyük dosya (~826 satır), sendFriendRequest, acceptFriendRequest, switchFriendsTab, removeFriend, refreshFriendsCache, newGroup, pickGroupAvatar, fbClearConversationMessages artık async
- `src/calls.js` — startCall, startLocalStream, createOffer, fbSendCallSignal, acceptCall, toggleCallCamera, toggleCallScreen artık async
- `src/accounts.js` — autoLogin, doLogin, regNext, completeRegistration, pickAvatar artık async
- `src/messaging.js` — confirmSendMedia, renderMessages(e2eDecrypt), saveEdit artık async
- `src/firebase-data.js` — fbSendMessage, applyFirestoreGroupConversation, fbUploadFile, saveMessages, loadMessages artık async
- `src/settings.js` — showSettingsCat, checkUpdate artık async
- `src/voice.js` — startVoice, sendVoice artık async
- `src/app-init.js` — initWelcome artık async
- `index.html` — ~50 inline event handler (T6 hedefi)
