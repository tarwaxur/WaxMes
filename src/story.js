// ===== STORIES / 24h DURUM =====

var _showError = function(m,d){
  if(typeof showError==='function')showError(m,d);
  else if(typeof window.showError==='function')window.showError(m,d);
  try{
    var _et=$('toast');if(_et){_et.textContent=m;_et.style.display='flex';clearTimeout(_et._hide);_et._hide=setTimeout(function(){_et.style.display='none'},5000)}
  }catch(e){}
  console.error('[story]',m,d)
};
var STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
var STORY_SEGMENT_MS = 5000;            // 5 sn / segment (text/image)

var STORY_BG_COLORS = [
  '#818cf8', '#6d28d9', '#0891b2', '#16a34a', '#ca8a04',
  '#ea580c', '#db2777', '#dc2626', '#0ea5e9', '#7c3aed',
  '#14b8a6', '#f59e0b'
];

var STORY_FONTS = [
  { id: 'sans', name: 'Modern', stack: "'Inter', sans-serif" },
  { id: 'serif', name: 'Klasik', stack: "Georgia, serif" },
  { id: 'mono', name: 'Teknik', stack: "'Courier New', monospace" },
  { id: 'rounded', name: 'Yuvarlak', stack: "'Segoe UI', sans-serif" }
];

function storyNow() { return Date.now(); }

function isStoryActive(story) {
  if (!story || !story.expiresAt) return false;
  var exp = story.expiresAt;
  // Firestore Timestamp objesi veya millis sayı olabilir
  var expMs = (exp && typeof exp.toMillis === 'function') ? exp.toMillis() : (typeof exp === 'number' ? exp : 0);
  return expMs > storyNow();
}

function storyTimeAgo(story) {
  if (!story || !story.createdAt) return '';
  var c = story.createdAt;
  var cMs = (c && typeof c.toMillis === 'function') ? c.toMillis() : (typeof c === 'number' ? c : storyNow());
  var diff = Math.max(0, storyNow() - cMs);
  var min = Math.floor(diff / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return min + ' dk önce';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' sa önce';
  return Math.floor(hr / 24) + ' gün önce';
}

// ===== FIRESTORE LİSTENER =====

function fbListenStories() {
  if (store._storyUnsub) { try { store._storyUnsub(); } catch(e){} store._storyUnsub = null; }
  if (!window.db || !window.fbUserId || !fbUserId()) return;
  var myUid = fbUserId();
  console.log('[st] fbListenStories start');

  // Sadece kullanıcının kendi + arkadaşlarının story'lerini çek (rules uyumu)
  var friendIds = [myUid];
  var cached = typeof getCachedFriends === 'function' ? getCachedFriends() : [];
  for (var fi = 0; fi < cached.length; fi++) {
    if (cached[fi].id && friendIds.indexOf(cached[fi].id) === -1) friendIds.push(cached[fi].id);
  }

  // Firestore 'in' operatoru en fazla 10 deger destekler — batch halinde sorgula
  var unsubs = [];
  var allItems = [];
  var viewed = ls(STORAGE_KEYS.STORY_VIEWED) || {};
  var pendingQueries = 0;

  function onBatchResults() {
    allItems.sort(function(a, b) {
      var at = a.expiresAt ? (a.expiresAt.toMillis ? a.expiresAt.toMillis() : a.expiresAt) : 0;
      var bt = b.expiresAt ? (b.expiresAt.toMillis ? b.expiresAt.toMillis() : b.expiresAt) : 0;
      return bt - at;
    });
    store.storyViewed = viewed;
    store.storyFeed = groupStoriesByAuthor(allItems);
    renderStoryBar();
  }

  for (var bi = 0; bi < friendIds.length; bi += 10) {
    var batch = friendIds.slice(bi, bi + 10);
    pendingQueries++;
    (function(batchIds) {
      var unsub = db.collection(COLLECTIONS.STORIES)
        .where('authorId', 'in', batchIds)
        .where('expiresAt', '>', firebase.firestore.Timestamp.fromMillis(storyNow()))
        .onSnapshot(function(snap) {
          snap.docChanges().forEach(function(change) {
            if (change.type === 'added' || change.type === 'modified') {
              var data = change.doc.data();
              data.id = change.doc.id;
              var existingIdx = -1;
              for (var ei = 0; ei < allItems.length; ei++) {
                if (allItems[ei].id === data.id) { existingIdx = ei; break; }
              }
              if (existingIdx > -1) allItems[existingIdx] = data;
              else if (isStoryActive(data)) allItems.push(data);
            } else if (change.type === 'removed') {
              for (var ri = allItems.length - 1; ri >= 0; ri--) {
                if (allItems[ri].id === change.doc.id) allItems.splice(ri, 1);
              }
            }
          });
          onBatchResults();
        }, function(err) {
          console.error('story batch error:', err);
        });
      unsubs.push(unsub);
    })(batch);
  }

  store._storyUnsub = function() {
    for (var ui = 0; ui < unsubs.length; ui++) {
      try { unsubs[ui](); } catch(e) {}
    }
  };
}

function fbStopStories() {
  if (store._storyUnsub) { try { store._storyUnsub(); } catch(e){} store._storyUnsub = null; }
  store.storyFeed = [];
}

function groupStoriesByAuthor(items) {
  var byAuthor = {};
  var myUid = fbUserId();
  items.forEach(function(s) {
    if (!byAuthor[s.authorId]) {
      byAuthor[s.authorId] = {
        authorId: s.authorId,
        authorName: s.authorName || 'Kullanıcı',
        authorAvatar: s.authorAvatar || '?',
        authorColor: s.authorColor || '#818cf8',
        items: [],
        latestAt: 0,
        isMine: s.authorId === myUid,
        hasUnseen: false
      };
    }
    byAuthor[s.authorId].items.push(s);
    var cMs = s.createdAt && s.createdAt.toMillis ? s.createdAt.toMillis() : (s.createdAt || 0);
    if (cMs > byAuthor[s.authorId].latestAt) byAuthor[s.authorId].latestAt = cMs;
  });
  // Items'ı createdAt asc sırala (izleme sırası)
  Object.keys(byAuthor).forEach(function(k) {
    byAuthor[k].items.sort(function(a, b) {
      var aMs = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      var bMs = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return aMs - bMs;
    });
    byAuthor[k].hasUnseen = byAuthor[k].items.some(function(it) { return !store.storyViewed[it.id]; });
  });
  // Liste: önce görülmemiş (en yeni üstte), sonra görülmüş, en sonda kendi durumun
  var list = Object.values(byAuthor);
  list.sort(function(a, b) {
    if (a.isMine !== b.isMine) return a.isMine ? 1 : -1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return b.latestAt - a.latestAt;
  });
  return list;
}

// ===== CRUD =====

async function fbCreateStory(type, payload) {
  if (!window.db || !fbUserId()) return null;
  var myUid = fbUserId();
  var me = findConvByUid(myUid) || {};
  // Üye olmayan kullanıcılar için profile'dan çek
  if (!me.displayName) {
    try {
      var uDoc = await db.collection(COLLECTIONS.USERS).doc(myUid).get();
      if (uDoc.exists) me = Object.assign(me, uDoc.data());
    } catch(e) {}
  }
  var authorName = me.displayName || me.username || 'Kullanıcı';
  var authorAvatar = me.avatar || (authorName || '?').charAt(0).toUpperCase();
  var authorColor = me.color || STORY_BG_COLORS[Math.floor(Math.random() * STORY_BG_COLORS.length)];

  var storyData = {
    authorId: myUid,
    authorName: authorName,
    authorAvatar: authorAvatar,
    authorColor: authorColor,
    type: type,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromMillis(storyNow() + STORY_TTL_MS),
    viewers: []
  };
  if (type === 'text') {
    storyData.text = (payload.text || '').substring(0, 500);
    storyData.bgColor = payload.bgColor || '#818cf8';
    storyData.fontFamily = payload.font || 'sans';
  } else if (type === 'image' || type === 'video') {
    storyData.mediaUrl = payload.mediaUrl || '';
    storyData.caption = (payload.caption || '').substring(0, 200);
    storyData.fontFamily = payload.font || 'sans';
  }
  try {
    var _addPromise = db.collection(COLLECTIONS.STORIES).add(storyData);
    var _timeoutPromise = new Promise(function(_,rej){setTimeout(function(){rej(new Error('Firestore timeout (30s)'))},30000)});
    var ref = await Promise.race([_addPromise,_timeoutPromise]);
    return ref.id;
  } catch (e) {
    console.error('createStory error:', e);
    return null;
  }
}

async function fbDeleteStory(storyId) {
  if (!window.db || !fbUserId()) return false;
  try {
    await db.collection(COLLECTIONS.STORIES).doc(storyId).delete();
    return true;
  } catch (e) {
    console.error('deleteStory error:', e);
    return false;
  }
}

async function fbViewStory(storyId) {
  if (!window.db || !fbUserId()) return;
  console.log('[story] view',storyId);
  var myUid = fbUserId();
  // Local cache: gördüm
  var viewed = ls(STORAGE_KEYS.STORY_VIEWED) || {};
  if (viewed[storyId]) return; // zaten gördüm
  viewed[storyId] = storyNow();
  ls(STORAGE_KEYS.STORY_VIEWED, viewed);
  store.storyViewed = viewed;
  renderStoryBar();
  // Server-side: viewers array'ine ekle
  try {
    await db.collection(COLLECTIONS.STORIES).doc(storyId).update({
      viewers: firebase.firestore.FieldValue.arrayUnion(myUid)
    });
  } catch (e) { /* sessiz — local cache yeterli */ }
}

// ===== SIDEBAR STORY BAR =====

var _ringIdCounter = 0;
function makeStoryRingSvg(total, viewed, isOwn) {
  if (total <= 0) return '';
  var uid = 'sg' + (++_ringIdCounter);
  var size = 56, cx = 28, cy = 28, r = 25, sw = 3;
  var circ = 2 * Math.PI * r;
  var gapAngle = total <= 1 ? 0 : 8;
  var gapArc = circ * gapAngle / 360;
  var segLen = total > 0 ? (circ - total * gapArc) / total : circ;
  viewed = Math.min(viewed, total);
  var unviewed = total - viewed;
  var allSegs = [];
  for (var i = 0; i < total; i++) allSegs.push(segLen, gapArc);
  // Blue overlay covers only unviewed segments
  var blueParts = [];
  if (unviewed > 0) {
    if (viewed > 0) blueParts.push(0, viewed * (segLen + gapArc));
    for (var j = 0; j < unviewed; j++) blueParts.push(segLen, gapArc);
  }
  var hasBlue = blueParts.length > 0;
  return '<svg class="story-ring" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<g transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#6b7280" stroke-width="' + sw + '" stroke-dasharray="' + allSegs.join(' ') + '" />' +
    (hasBlue ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#3b82f6" stroke-width="' + sw + '" stroke-dasharray="' + blueParts.join(' ') + '" />' : '') +
    '</g></svg>';
}

function renderStoryBar() {
  try{console.log('RENDER_STORY_BAR_CALLED')}catch(e){}
  var el = $('story-bar');
  if (!el) {try{console.log('SB_EL_NULL')}catch(e){};return}
  var feed = store.storyFeed || [];
  var myUid = fbUserId();
  var myEntry = null;
  var others = [];
  for (var i = 0; i < feed.length; i++) {
    if (feed[i].isMine) myEntry = feed[i];
    else others.push(feed[i]);
  }
  // Benim durumum yoksa bile + butonu göster
  var myHasStory = myEntry && myEntry.items.length > 0;
  var html = '';

  // Kendi durumum
  html += '<div class="story-item story-item-mine" data-action="'+(myHasStory?'open-my-story':'open-create-story')+'">';
  html += '<div class="story-avatar-wrap ' + (myHasStory ? 'has-story' : 'add-new') + '">';
  if (myHasStory) {
    html += makeStoryRingSvg(myEntry.items.length, myEntry.items.filter(function(it){return store.storyViewed[it.id]}).length, true);
    html += renderStoryAvatar(myEntry, 0);
  } else {
    html += '<div class="story-avatar-add">+</div>';
  }
  html += '</div>';
  html += '<div class="story-name">' + esc((myEntry && myEntry.authorName) || 'Sen') + '</div>';
  html += '</div>';

  // Arkadaş durumları
  if (others.length === 0 && !myHasStory) {
    html += '<div class="story-empty">Henüz durum yok. İlk sen paylaş!</div>';
  } else {
    for (var j = 0; j < others.length; j++) {
      var e = others[j];
      var viewedCount = e.items.filter(function(it){return store.storyViewed[it.id]}).length;
      var hasUnseen = e.items.some(function(it){return !store.storyViewed[it.id]});
      if(!store._sbLog){store._sbLog={};console.log('[sb] bar rendering',e.authorName,'vc:',viewedCount,'/',e.items.length)}
      html += '<div class="story-item" data-action="open-story" data-author-id="' + esc(e.authorId) + '">';
      html += '<div class="story-avatar-wrap ' + (hasUnseen ? 'unseen' : 'seen') + '">';
      html += makeStoryRingSvg(e.items.length, viewedCount, false);
      html += renderStoryAvatar(e, e.items.length - 1);
      html += '</div>';
      html += '<div class="story-name">' + esc(e.authorName) + '</div>';
      html += '</div>';
    }
  }
  el.innerHTML = html;
  if(typeof _origLog==='function'){try{_origLog('[sb] rendered','users:',others.length,'viewed:',others.map(function(e){return e.items.filter(function(it){return store.storyViewed[it.id]}).length+'/'+e.items.length}).join(', '))}catch(e){}}
}

function renderStoryAvatar(entry, itemIdx) {
  var it = entry.items[itemIdx] || {};
  var inner = '';
  if (it.type === 'image' && it.mediaUrl) {
    inner = '<img src="' + escJs(sanitizeUrl(it.mediaUrl)) + '" class="story-avatar-img" data-err-bg="' + esc(entry.authorColor) + '" data-err-text="?" data-err-avatar="1">';
  } else if (it.type === 'video' && it.mediaUrl) {
    inner = '<div class="story-avatar-img" style="background:' + esc(entry.authorColor) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">▶</div>';
  } else if (it.type === 'text') {
    inner = '<div class="story-avatar-img" style="background:' + esc(it.bgColor || entry.authorColor) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">' + esc((it.text || '?').charAt(0).toUpperCase()) + '</div>';
  } else {
    var av = entry.authorAvatar;
    if (av && av.length > 2) {
      inner = '<img src="' + escJs(sanitizeUrl(av)) + '" class="story-avatar-img" data-err-bg="' + esc(entry.authorColor) + '" data-err-text="' + esc((entry.authorName||'?').charAt(0).toUpperCase()) + '" data-err-avatar="1">';
    } else {
      inner = '<div class="story-avatar-img" style="background:' + esc(entry.authorColor) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">' + esc(av || (entry.authorName||'?').charAt(0).toUpperCase()) + '</div>';
    }
  }
  return inner;
}

// ===== STORY VIEWER =====

function openStoryViewer(authorId) {
  if (!store.storyFeed || store.storyFeed.length === 0) return;
  var entry = null;
  for (var i = 0; i < store.storyFeed.length; i++) {
    if (store.storyFeed[i].authorId === authorId) { entry = store.storyFeed[i]; break; }
  }
  if (!entry || entry.items.length === 0) return;
  // Süresi dolmamış item'ları filtrele
  var items = entry.items.filter(isStoryActive);
  if (items.length === 0) return;
  // İlk görülmemiş item'dan başla
  var startIdx = 0;
  for (var j = 0; j < items.length; j++) {
    if (!store.storyViewed[items[j].id]) { startIdx = j; break; }
  }
  store.storyViewerAuthor = entry;
  store.storyViewerItems = items;
  store.storyViewerIdx = startIdx;
  store.storyViewerOpen = true;
  renderStoryViewer();
}

function openMyStoryViewer() {
  if (!fbUserId()) return;
  openStoryViewer(fbUserId());
}

function closeStoryViewer() {
  store.storyViewerOpen = false;
  store.storyViewerAuthor = null;
  store.storyViewerItems = [];
  store.storyViewerIdx = 0;
  store.storyViewerPaused = false;
  if (store.storyStoryTimer) { clearInterval(store.storyStoryTimer); store.storyStoryTimer = null; }
  var ov = $('story-viewer');
  if (ov) ov.remove();
}

function nextStorySegment() {
  if (!store.storyViewerOpen) return;
  if (store.storyViewerIdx < store.storyViewerItems.length - 1) {
    store.storyViewerIdx++;
    renderStoryViewer();
  } else {
    // Bu yazarın tüm durumları bitti, sonraki yazara geç
    var feed = store.storyFeed || [];
    var curAuthor = store.storyViewerAuthor && store.storyViewerAuthor.authorId;
    var nextAuthor = null;
    for (var i = 0; i < feed.length; i++) {
      if (feed[i].authorId === curAuthor) {
        if (i + 1 < feed.length) nextAuthor = feed[i + 1].authorId;
        break;
      }
    }
    if (nextAuthor) {
      openStoryViewer(nextAuthor);
    } else {
      closeStoryViewer();
    }
  }
}

function prevStorySegment() {
  if (!store.storyViewerOpen) return;
  if (store.storyViewerIdx > 0) {
    store.storyViewerIdx--;
    renderStoryViewer();
  } else {
    // Önceki yazara dön
    var feed = store.storyFeed || [];
    var curAuthor = store.storyViewerAuthor && store.storyViewerAuthor.authorId;
    var prevAuthor = null;
    for (var i = 0; i < feed.length; i++) {
      if (feed[i].authorId === curAuthor) {
        if (i > 0) prevAuthor = feed[i - 1].authorId;
        break;
      }
    }
    if (prevAuthor) {
      var lastItems = null;
      for (var k = 0; k < feed.length; k++) {
        if (feed[k].authorId === prevAuthor) { lastItems = feed[k].items.filter(isStoryActive); break; }
      }
      if (lastItems && lastItems.length) {
        store.storyViewerAuthor = feed.filter(function(e){return e.authorId===prevAuthor})[0];
        store.storyViewerItems = lastItems;
        store.storyViewerIdx = lastItems.length - 1;
        renderStoryViewer();
      }
    }
  }
}

function pauseStoryViewer() {
  store.storyViewerPaused = true;
}

function resumeStoryViewer() {
  store.storyViewerPaused = false;
  if (store.storyStoryTimer) {
    clearInterval(store.storyStoryTimer);
    startStoryTimer();
  }
}

function startStoryTimer(durationMs) {
  if (store.storyStoryTimer) { clearInterval(store.storyStoryTimer); store.storyStoryTimer = null; }
  var dur = durationMs || STORY_SEGMENT_MS;
  var startTs = performance.now();
  var startProgress = store.storyViewerProgress || 0;
  var interval = 50;
  store.storyStoryTimer = setInterval(function() {
    if (store.storyViewerPaused) {
      startTs = performance.now() - (store.storyViewerProgress * dur);
      return;
    }
    var elapsed = performance.now() - startTs;
    var progress = startProgress + (elapsed / dur);
    if (progress >= 1) {
      progress = 1;
      updateStoryProgressBar(progress);
      clearInterval(store.storyStoryTimer);
      store.storyStoryTimer = null;
      nextStorySegment();
      return;
    }
    store.storyViewerProgress = progress;
    updateStoryProgressBar(progress);
  }, interval);
}

function updateStoryProgressBar(progress) {
  var p = $('story-progress-current');
  if (p) p.style.width = (progress * 100) + '%';
}

function renderStoryViewer() {
  if (!store.storyViewerOpen) return;
  store.storyViewerProgress = 0;
  if (store.storyStoryTimer) { clearInterval(store.storyStoryTimer); store.storyStoryTimer = null; }

  // Eski viewer'ı kaldır
  var old = $('story-viewer');
  if (old) old.remove();

  var item = store.storyViewerItems[store.storyViewerIdx];
  var author = store.storyViewerAuthor;
  if (!item || !author) { closeStoryViewer(); return; }

  // Görüntüleme kaydı
  fbViewStory(item.id);

  // Container
  var ov = document.createElement('div');
  ov.id = 'story-viewer';
  ov.className = 'story-viewer';

  // Progress barlar
  var progressHtml = '<div class="story-progress-row">';
  for (var i = 0; i < store.storyViewerItems.length; i++) {
    var segClass = i < store.storyViewerIdx ? 'done' : (i === store.storyViewerIdx ? 'current' : 'pending');
    progressHtml += '<div class="story-progress-seg ' + segClass + '">';
    if (i === store.storyViewerIdx) progressHtml += '<div class="story-progress-fill" id="story-progress-current"></div>';
    else if (i < store.storyViewerIdx) progressHtml += '<div class="story-progress-fill" style="width:100%"></div>';
    progressHtml += '</div>';
  }
  progressHtml += '</div>';

  // İçerik
  var contentHtml = '';
  if (item.type === 'text') {
    var fontStack = STORY_FONTS.filter(function(f){return f.id===item.fontFamily;})[0] || STORY_FONTS[0];
    contentHtml = '<div class="story-text-content" style="position:absolute;inset:0;background:' + esc(item.bgColor || '#818cf8') + ';font-family:' + fontStack.stack + '">' +
      '<div class="story-text-inner">' + esc(item.text || '') + '</div>' +
    '</div>';
  } else if (item.type === 'image' && item.mediaUrl) {
    var _fontForCaption = item.fontFamily ? (STORY_FONTS.filter(function(f){return f.id===item.fontFamily})[0]||STORY_FONTS[0]).stack : '';
    contentHtml = '<div class="story-media-content" style="position:absolute;inset:0"><img src="' + escJs(sanitizeUrl(item.mediaUrl)) + '" class="story-media-img"></div>' +
      (item.caption ? '<div class="story-caption" style="font-family:' + _fontForCaption + '">' + esc(item.caption) + '</div>' : '');
  } else if (item.type === 'video' && item.mediaUrl) {
    var _fontForCaption2 = item.fontFamily ? (STORY_FONTS.filter(function(f){return f.id===item.fontFamily})[0]||STORY_FONTS[0]).stack : '';
    contentHtml = '<div class="story-media-content" style="position:absolute;inset:0"><video src="' + escJs(sanitizeUrl(item.mediaUrl)) + '" class="story-media-img" autoplay playsinline></video></div>' +
      (item.caption ? '<div class="story-caption" style="font-family:' + _fontForCaption2 + '">' + esc(item.caption) + '</div>' : '');
  } else {
    contentHtml = '<div class="story-text-content" style="position:absolute;inset:0;background:var(--bg3)"><div class="story-text-inner">Desteklenmeyen içerik</div></div>';
  }

  // Header
  var headerHtml = '<div class="story-viewer-header">' +
    '<div class="story-viewer-author">' +
      '<div class="story-avatar-tiny" style="background:' + esc(author.authorColor) + '">' +
        (author.authorAvatar && author.authorAvatar.length > 2
          ? '<img src="' + escJs(sanitizeUrl(author.authorAvatar)) + '" data-err-bg="' + esc(author.authorColor) + '" data-err-text="' + esc((author.authorName||'?').charAt(0).toUpperCase()) + '" data-err-avatar="1">'
          : esc(author.authorAvatar || (author.authorName||'?').charAt(0).toUpperCase())) +
      '</div>' +
      '<div class="story-viewer-meta">' +
        '<div class="story-viewer-name">' + esc(author.authorName) + (author.isMine ? ' (Sen)' : '') + '</div>' +
        '<div class="story-viewer-time">' + esc(storyTimeAgo(item)) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="story-viewer-actions">' +
      (author.isMine ? '<button class="story-viewer-btn" data-action="delete-my-story" data-id="' + esc(item.id) + '" style="font-size:11px;padding:6px 14px;border-radius:8px;width:auto;background:rgba(255,255,255,.1)">Durumu Kald\u0131r</button>' : '') +
      '<button class="story-viewer-btn" data-action="close-story" style="background:rgba(255,255,255,.1)" title="Kapat">✕</button>' +
    '</div>' +
  '</div>';

  // Tap zones (content area içinde, header'dan tamamen ayrı)
  var tapHtml = '<div class="story-tap story-tap-left" data-action="prev-story"></div>' +
                '<div class="story-tap story-tap-right" data-action="next-story"></div>';

  ov.innerHTML = progressHtml + headerHtml + '<div class="story-content-area">' + contentHtml + tapHtml + '</div>';
  document.body.appendChild(ov);

  // Video ise duration'ı bekle
  if (item.type === 'video') {
    var v = ov.querySelector('video');
    if (v) {
      v.addEventListener('loadedmetadata', function() {
        var dur = (v.duration && v.duration < 30 ? v.duration * 1000 : STORY_SEGMENT_MS);
        startStoryTimer(dur);
      });
      v.addEventListener('ended', function() { nextStorySegment(); });
      v.addEventListener('pause', function() { pauseStoryViewer(); });
      v.addEventListener('play', function() { resumeStoryViewer(); });
      return;
    }
  }
  startStoryTimer(STORY_SEGMENT_MS);
}

// ===== CREATE STORY MODAL =====

function showCreateStoryModal(type) {
  if (!fbUserId()) return;
  store.storyDraft = { type: type || 'text', text: '', bgColor: STORY_BG_COLORS[0], font: 'sans', media: null, caption: '' };
  store.storyCreateOpen = true;
  renderCreateStoryModal();
}

function hideCreateStoryModal() {
  store.storyCreateOpen = false;
  store.storyPublishing=false;
  var m = $('story-create-modal');
  if (m) m.remove();
}

function renderCreateStoryModal() {
  var old = $('story-create-modal');
  if (old) old.remove();
  var m = document.createElement('div');
  m.id = 'story-create-modal';
  m.className = 'modal-overlay active';

  var activeTab = store.storyDraft.type === 'text' ? 'text' : 'media';
  var tabsHtml = '<div class="story-create-tabs">' +
    '<button class="story-tab' + (activeTab === 'text' ? ' active' : '') + '" data-action="switch-story-tab" data-tab="text">✍ Yazı</button>' +
    '<button class="story-tab' + (activeTab === 'media' ? ' active' : '') + '" data-action="switch-story-tab" data-tab="media">📷 Medya</button>' +
    '</div>';

  var bodyHtml = '';
  if (activeTab === 'text') {
    var colorsHtml = '<div class="story-color-picker">';
    for (var i = 0; i < STORY_BG_COLORS.length; i++) {
      colorsHtml += '<div class="story-color-dot ' + (STORY_BG_COLORS[i] === store.storyDraft.bgColor ? 'active' : '') + '" data-action="set-story-bg" data-color="' + STORY_BG_COLORS[i] + '" style="background:' + STORY_BG_COLORS[i] + '"></div>';
    }
    colorsHtml += '</div>';
    var fontsHtml = '<div class="story-font-picker">';
    for (var f = 0; f < STORY_FONTS.length; f++) {
      fontsHtml += '<button class="story-font-btn ' + (STORY_FONTS[f].id === store.storyDraft.font ? 'active' : '') + '" data-action="set-story-font" data-font="' + STORY_FONTS[f].id + '" style="font-family:' + STORY_FONTS[f].stack + '">' + STORY_FONTS[f].name + '</button>';
    }
    fontsHtml += '</div>';
    var _currFontStack=STORY_FONTS[0].stack;for(var _ff=0;_ff<STORY_FONTS.length;_ff++){if(STORY_FONTS[_ff].id===store.storyDraft.font){_currFontStack=STORY_FONTS[_ff].stack;break}}
    bodyHtml = '<textarea id="story-text-input" class="story-text-input" placeholder="Ne düşünüyorsun?" maxlength="500">' + esc(store.storyDraft.text || '') + '</textarea>' +
      colorsHtml +
      '<div style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:8px;text-align:center;font-size:22px;color:var(--text2);font-family:' + _currFontStack + '" id="story-font-preview">' + esc(store.storyDraft.text || 'Aa') + '</div>' +
      fontsHtml;
  } else {
    var mediaBtn = '<div class="story-pick-media" data-action="pick-story-media" style="cursor:pointer">📁 Medya Seç<br><span style="font-size:10px;color:var(--text4)">Fotoğraf veya video</span></div>'+
      '<div style="font-size:9px;color:var(--text4);margin-top:6px;text-align:center;line-height:1.4">⚠ Görsel boyutu en fazla <strong>700KB</strong> olabilir<br>(Firestore 1MB sınırı)</div>';
    if (store.storyDraft.media) {
      var previewUrl = store.storyDraft.media.dataUrl || store.storyDraft.media.path || '';
      var isVideo = store.storyDraft.media.type === 'video';
      mediaBtn = '<div class="story-media-preview-wrap">' +
        (isVideo
          ? '<video src="' + escJs(sanitizeUrl(previewUrl)) + '" class="story-media-preview" autoplay muted></video>'
          : '<img src="' + escJs(sanitizeUrl(previewUrl)) + '" class="story-media-preview">') +
        '</div>' +
        '<div style="text-align:center;margin-top:6px"><button class="modal-btn modal-btn-secondary" data-action="remove-story-media">Medyayı Kaldır</button></div>';
    }
    var _mediaCurrFont=STORY_FONTS[0];for(var _mf=0;_mf<STORY_FONTS.length;_mf++){if(STORY_FONTS[_mf].id===store.storyDraft.font){_mediaCurrFont=STORY_FONTS[_mf];break}}
    var mediaFontsHtml = '<div class="story-font-picker" style="margin-top:10px">';
    for (var f2 = 0; f2 < STORY_FONTS.length; f2++) {
      mediaFontsHtml += '<button class="story-font-btn ' + (STORY_FONTS[f2].id === store.storyDraft.font ? 'active' : '') + '" data-action="set-story-font" data-font="' + STORY_FONTS[f2].id + '" style="font-family:' + STORY_FONTS[f2].stack + '">' + STORY_FONTS[f2].name + '</button>';
    }
    mediaFontsHtml += '</div>';
    bodyHtml = mediaBtn +
      '<input type="text" id="story-caption-input" class="story-caption-input" placeholder="Altyazı yaz (isteğe bağlı)" maxlength="200" value="' + esc(store.storyDraft.caption || '') + '">' +
      '<div id="story-font-preview" style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:8px;text-align:center;font-size:22px;color:var(--text2);font-family:' + _mediaCurrFont.stack + '">' + esc(store.storyDraft.caption || 'Aa') + '</div>' +
      '<div style="margin-top:6px"><label style="font-size:10px;color:var(--text4)">Yazı Fontu:</label>' + mediaFontsHtml + '</div>';
  }

  m.innerHTML = '<div class="modal story-create-card">' +
      '<div class="modal-header"><h3>Yeni Durum</h3><button class="modal-close" data-action="close-create-story">✕</button></div>' +
      '<div class="modal-body">' + tabsHtml + bodyHtml + '</div>' +
      '<div class="modal-footer">' +
        '<button class="modal-btn modal-btn-secondary" data-action="close-create-story">İptal</button>' +
        '<button class="btn-primary" data-action="confirm-create-story" id="story-confirm-btn">Paylaş</button>' +
      '</div>' +
    '</div>';

  m.addEventListener('click',function(e){if(e.target===m)hideCreateStoryModal()});

  document.body.appendChild(m);

  // Tab switching — only handle in-modal, global handler doesn't interfere
  m.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="switch-story-tab"]');
    if (btn) {
      var tab = btn.dataset.tab;
      store.storyDraft.type = tab;
      renderCreateStoryModal();
    }
  });

  // Remove media
  m.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="remove-story-media"]');
    if (btn) {
      store.storyDraft.media = null;
      renderCreateStoryModal();
    }
  });

  // Text input dinle + canlı önizleme
  var ti = $('story-text-input');
  if (ti) {
    ti.addEventListener('input', function() {
      store.storyDraft.text = ti.value;
      var sp = $('story-font-preview');
      if (sp) sp.textContent = ti.value || 'Aa';
    });
    setTimeout(function(){ if (ti) {ti.focus();ti.selectionStart=ti.value.length;ti.selectionEnd=ti.value.length} }, 100);
  }
  var ci = $('story-caption-input');
  if (ci) {
    ci.addEventListener('input', function() {
      store.storyDraft.caption = ci.value;
      var sp = $('story-font-preview');
      if (sp) sp.textContent = ci.value || 'Aa';
    });
    setTimeout(function(){ if (ci) ci.focus() }, 100);
  }
}

async function pickStoryMedia() {
  if (!window.electronAPI || !electronAPI.selectMedia) {
    _showError('Medya seçimi sadece masaüstü uygulamada çalışır.', 'story.js:572');
    return;
  }
  try {
    var files = await electronAPI.selectMedia('all');
    if (files && files.length > 0) {
      var f = files[0];
      if (f.type !== 'image' && f.type !== 'video') {
        _showError('Lütfen bir fotoğraf veya video seç.', 'story.js:580');
        return;
      }
      if (f.size && f.size > 500 * 1024) {
        _showError('Görsel boyutu 500KB\'dan büyük. Lütfen daha küçük bir dosya seç.', 'story.js:size');
        return;
      }
      store.storyDraft.media = f;
      renderCreateStoryModal();
    }
  } catch (e) {
    console.error('pickStoryMedia error:', e);
  }
}

async function confirmCreateStory() {
  if(store.storyPublishing)return;
  var draft = store.storyDraft;
  if (!draft) return;
  store.storyPublishing=true;
  var btn = $('story-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Paylaşılıyor...'; }

  try {
    if (draft.type === 'text') {
      if (!draft.text || !draft.text.trim()) {
        _showError('Lütfen bir metin yaz.', 'story.js:605');
        if (btn) { btn.disabled = false; btn.textContent = 'Paylaş'; }
        store.storyPublishing=false;return;
      }
      var payload = {
        text: draft.text.trim(),
        bgColor: draft.bgColor,
        font: draft.font
      };
      var id = await fbCreateStory('text', payload);
      console.log('[story] text created',id?'ok':'fail');
      if (id) { hideCreateStoryModal(); }
      else { throw new Error('fbCreateStory falsy'); }
    } else {
      if (!draft.media) {
        _showError('Lütfen bir medya seç.', 'story.js:media');
        if (btn) { btn.disabled = false; btn.textContent = 'Paylaş'; }
        store.storyPublishing=false;return;
      }
      var file = draft.media;
      var dataUrl = file.dataUrl;
      if (!dataUrl) {
        _showError('Medya dosyası okunamadı.', 'story.js:media');
        if (btn) { btn.disabled = false; btn.textContent = 'Paylaş'; }
        store.storyPublishing=false;return;
      }
      var mediaUrl = dataUrl;
      if (dataUrl.length > 1048000) {
        showSimpleAlert(
          'G\u00F6rsel \u00E7ok b\u00FCy\u00FCk ('+Math.round(dataUrl.length/1024)+'KB)',
          'L\u00FCtfen 700KB alt\u0131 bir g\u00F6rsel se\u00E7in.\nB\u00FCy\u00FCk dosyalar Firestore s\u0131n\u0131r\u0131n\u0131 a\u015F\u0131yor.'
        );
        if (btn) { btn.disabled = false; btn.textContent = 'Payla\u015F'; }
        store.storyPublishing=false;return;
      }
      var payload = {
        mediaUrl: mediaUrl,
        caption: (draft.caption || '').trim().substring(0, 200),
        font: draft.font
      };
      var id = await fbCreateStory(file.type === 'video' ? 'video' : 'image', payload);
      console.log('[story] media created',id?'ok':'fail','size:',Math.round(dataUrl.length/1024)+'KB');
      if (id) { hideCreateStoryModal(); }
      else { throw new Error('fbCreateStory falsy'); }
    }
  } catch (e) {
    console.error('confirmCreateStory error:', e);
    _showError('Durum paylaşılamadı: ' + (e.message || e), 'story.js:637');
    if (btn) { btn.disabled = false; btn.textContent = 'Paylaş'; }
    store.storyPublishing=false;
  }
}

// ===== HELPERS =====

function findConvByUid(uid) {
  if (!uid) return null;
  for(var fci=0;fci<store.conversations.length;fci++){var fc=store.conversations[fci];if(fc.memberIds&&fc.memberIds.indexOf(uid)!==-1&&!fc.isGroup)return fc}
  return null;
}

// Yardımcı: keyboard handler (story viewer açıkken)
// Signal kullanır böylece session reset'te otomatik temizlenir
var _storySignal = (typeof store !== 'undefined' && store._ac) ? { signal: store._ac.signal } : undefined;
document.addEventListener('keydown', function(e) {
  if (!store.storyViewerOpen) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextStorySegment(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStorySegment(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeStoryViewer(); }
}, _storySignal);

function showConfirmModal(title, desc, confirmText, confirmBg, onConfirm) {
  var m = $('modal-delete');
  if (!m) return;
  m.style.zIndex = '950';
  var body = m.querySelector('.modal-body');
  body.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" stroke="#ef4444" fill="none" stroke-width="1.5" style="margin-bottom:12px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
    '<h4 style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:6px">' + esc(title) + '</h4>' +
    '<p style="color:var(--text4);font-size:12px">' + esc(desc) + '</p>';
  store._pendingConfirm = onConfirm;
  var btn = $('delete-confirm-btn');
  btn.textContent = confirmText;
  btn.style.background = confirmBg || '#ef4444';
  btn.onclick = function() {
    var cb = store._pendingConfirm;
    hideDeleteModal();
    if (typeof cb === 'function') cb();
  };
  m.classList.add('active');
}

// ===== DEVTOOLS PANEL (Ctrl+Shift+I) =====
var _devLogs = [];
var _devLogCounts = {}; // "level:msg" -> count
var _devLogOrder = [];  // ordered list of keys for dedup display

function _pushDevLog(level, args) {
  var msg = args.map(function(a) { return typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a) || String(a); }).join(' ');
  var key = level + ':' + msg;
  var now = new Date();
  if (_devLogCounts[key]) {
    _devLogCounts[key].count++;
    _devLogCounts[key].time = now;
  } else {
    _devLogCounts[key] = { level: level, msg: msg, count: 1, time: now, firstTime: now };
    _devLogOrder.push(key);
    if (_devLogOrder.length > 200) {
      var oldKey = _devLogOrder.shift();
      delete _devLogCounts[oldKey];
    }
  }
  var el = $('dev-console-area');
  if (el) { renderDevConsole(el); }
}
var _origLog = console.log;
var _origWarn = console.warn;
var _origError = console.error;
console.log = function() { _pushDevLog('log', Array.prototype.slice.call(arguments)); return _origLog.apply(console, arguments); };
console.warn = function() { _pushDevLog('warn', Array.prototype.slice.call(arguments)); return _origWarn.apply(console, arguments); };
console.error = function() { _pushDevLog('error', Array.prototype.slice.call(arguments)); return _origError.apply(console, arguments); };
console.log('[devtools] console interception active');

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    if ($('devtools-overlay')) { closeDevtools(); return; }
    document.body.classList.add('devtools-mode');
    var ov = document.createElement('div');
    ov.id = 'devtools-overlay';
    ov.className = 'devtools-overlay';
    ov.innerHTML =
      '<div class="dev-header">' +
        '<div class="dev-title"><span class="dev-symbol">&gt;_</span> developer terminal <span class="dev-blink">\u258C</span></div>' +
        '<button class="dev-close">\u2715</button>' +
      '</div>' +
      '<div class="dev-body">' +
        '<div class="dev-sidebar">' +
          '<div class="dev-sidebar-item active" data-devtab="console"><span class="dev-sidicon">\u251C\u2500\u2500</span> console</div>' +
          '<div class="dev-sidebar-item" data-devtab="actions"><span class="dev-sidicon">\u2514\u2500\u2500</span> commands</div>' +
        '</div>' +
        '<div class="dev-content">' +
          '<div class="dev-section active" id="devtab-console">' +
            '<div class="dev-console-box" id="dev-console-area"></div>' +
            '<button class="dev-cmd" id="dev-clear-console" style="margin-top:8px"><span class="dev-cmd-sym">\u25B8</span> clear console</button>' +
          '</div>' +
          '<div class="dev-section" id="devtab-actions">' +
            '<div class="dev-actions" id="dev-actions-container"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('active'); });

    // Sidebar nav
    ov.querySelectorAll('.dev-sidebar-item').forEach(function(item) {
      item.onclick = function() {
        ov.querySelectorAll('.dev-sidebar-item').forEach(function(si) { si.classList.remove('active'); });
        item.classList.add('active');
        ov.querySelectorAll('.dev-section').forEach(function(s) { s.classList.remove('active'); });
        var tab = ov.querySelector('#devtab-' + item.dataset.devtab);
        if (tab) tab.classList.add('active');
      };
    });

    ov.querySelector('.dev-close').onclick = closeDevtools;
    ov.onclick = function(ev) { if (ev.target === ov) closeDevtools(); };

    // Build command buttons
    var actionsEl = $('dev-actions-container');
    if (actionsEl) {
      var cmds = [
        {label:'reload messages',fn:function(){
          var id=store.activeConvId;
          if(!id||typeof fbUnlistenMessages!=='function'||typeof fbListenMessages!=='function'){showDevConfirm('ERROR','No active conversation','OK','#ff3355',function(){});return}
          fbUnlistenMessages(id);fbListenMessages(id);
          if(typeof renderMessages==='function')renderMessages(id);
          showDevConfirm('OK','Messages reloaded for active conversation','OK','#00ff41',function(){})
        }},
        {label:'clear local data',fn:function(){
          showDevConfirm('Wipe Data','Clear ALL local data? Messages stay in cloud. App will restart.','WIPE','#ff3355',function(){
            localStorage.clear();
            showDevConfirm('Restart','Data cleared. Restart now?','RESTART','#00ff41',function(){
              location.reload();
            })
          })
        }},
        {label:'reload conversations',fn:function(){
          if(typeof fbListenConversations!=='function'||typeof fbUserId!=='function'){showDevConfirm('ERROR','Not available','OK','#ff3355',function(){});return}
          var uid=fbUserId();if(uid){fbListenConversations(uid);showDevConfirm('OK','Conversation list reloaded','OK','#00ff41',function(){})}
        }},
        {label:'reload stories',fn:function(){
          if(typeof fbListenStories==='function'){fbListenStories();showDevConfirm('OK','Stories reloaded','OK','#00ff41',function(){})}
        }}
      ];
      var html = '';
      for (var ci = 0; ci < cmds.length; ci++) {
        html += '<button class="dev-cmd" data-cmd="' + ci + '"><span class="dev-cmd-sym">\u25B8</span> ' + cmds[ci].label + '</button>';
      }
      actionsEl.innerHTML = html;
      actionsEl.querySelectorAll('.dev-cmd').forEach(function(btn, idx) {
        btn.onclick = function() { cmds[idx].fn(); };
      });
    }

    // Console
    var consoleEl = $('dev-console-area');
    if (consoleEl) { renderDevConsole(consoleEl);
      consoleEl.onclick = function() { copyDevConsole(consoleEl); };
    }
    // Clear console button
    var clearBtn = $('dev-clear-console');
    if (clearBtn) clearBtn.onclick = function() {
      if (!_devLogs || _devLogs.length === 0) {
        showDevConfirm('ALREADY CLEAR', 'Console is already empty.', 'OK', '#00ff41', function() {});
        return;
      }
      showDevConfirm('CLEAR CONSOLE', 'All logs will be permanently deleted. Proceed?', 'CLEAR', '#ff3355', function() {
        _devLogs = [];
        var el = $('dev-console-area');
        if (el) { renderDevConsole(el); }
        showDevToast('CONSOLE CLEARED', _devLogs.length + ' logs remaining', '#00ff41');
      });
    };
  }
  if (e.key === 'Escape' && $('devtools-overlay')) { closeDevtools(); }
});

function copyDevConsole(el) {
  if (!el) return;
  var rows = el.querySelectorAll('.log-row');
  if (!rows || rows.length === 0) { showDevToast('NOTHING TO COPY', 'console is empty', '#ffaa00'); return; }
  var lines = [];
  for (var ri = 0; ri < rows.length; ri++) {
    var time = rows[ri].querySelector('.log-time');
    var lvl = rows[ri].querySelector('.log-lvl');
    var msg = rows[ri].querySelector('.log-msg');
    var t = time ? time.textContent.trim() : '';
    var l = lvl ? lvl.textContent.trim() : '';
    var m = msg ? msg.textContent.trim() : '';
    lines.push(t + ' ' + l + ' ' + m);
  }
  var text = lines.join('\n');
  if (!text.trim()) { showDevToast('NOTHING TO COPY', 'console is empty', '#ffaa00'); return; }
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
    document.body.appendChild(ta); ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) { showDevToast('CONSOLE COPIED', lines.length + ' lines captured', '#00ff41'); }
    else { showDevToast('COPY FAILED', 'clipboard access denied', '#ff3355'); }
  } catch(e) {
    showDevToast('COPY ERROR', e.message, '#ff3355');
  }
}

function showDevToast(title, msg, color) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:200000;background:#0d120d;border:1px solid ' + (color||'#00ff41') + ';padding:14px 18px;max-width:360px;font-family:Consolas,Courier New,monospace;animation:devToastIn .25s ease;transform-origin:bottom right';
  t.innerHTML = '<div style="color:' + (color||'#00ff41') + ';font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">' + esc(title) + '</div>' +
    '<div style="color:#008f29;font-size:10px;line-height:1.4">' + esc(msg) + '</div>' +
    '<button style="position:absolute;top:-10px;right:-10px;width:22px;height:22px;border:1px solid ' + (color||'#00ff41') + ';background:#0a0e0a;color:' + (color||'#00ff41') + ';font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit">✕</button>';
  document.body.appendChild(t);
  t.querySelector('button').onclick = function() {
    t.style.transition = 'opacity .2s ease,transform .2s ease';
    t.style.opacity = '0'; t.style.transform = 'scale(.8) translateY(10px)';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 250);
  };
  setTimeout(function() {
    t.style.transition = 'opacity .2s ease,transform .2s ease';
    t.style.opacity = '0'; t.style.transform = 'scale(.9)';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 250);
  }, 3000);
}

function renderDevConsole(el) {
  var html = '';
  var start = Math.max(0, _devLogOrder.length - 100);
  for (var i = start; i < _devLogOrder.length; i++) {
    var key = _devLogOrder[i];
    var l = _devLogCounts[key];
    if (!l) continue;
    var t = ('0' + l.time.getHours()).slice(-2) + ':' + ('0' + l.time.getMinutes()).slice(-2) + ':' + ('0' + l.time.getSeconds()).slice(-2);
    var countLabel = l.count > 1 ? ' <span style="color:var(--text4)">(x' + l.count + ')</span>' : '';
    html += '<div class="log-row"><span class="log-time">' + t + '</span><span class="log-lvl log-' + l.level + '">[' + l.level.toUpperCase() + ']</span><span class="log-msg">' + esc(l.msg) + countLabel + '</span></div>';
  }
  el.innerHTML = html || '<div style="color:#005a1a;text-align:center;padding:30px">// no console output yet</div>';
  el.scrollTop = el.scrollHeight;
}

function showDevConfirm(title, desc, btnText, btnColor, onOk) {
  var ov = $('devtools-overlay');
  if (!ov) { if (typeof onOk === 'function') onOk(); return; }
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease';
  bg.innerHTML = '<div style="background:#0d120d;border:1px solid ' + (btnColor||'#00ff41') + ';padding:24px 28px;max-width:380px;font-family:Consolas,Courier New,monospace">' +
    '<div style="color:#00ff41;font-size:13px;font-weight:600;margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase">' + esc(title) + '</div>' +
    '<div style="color:#008f29;font-size:11px;margin-bottom:18px;line-height:1.5">' + esc(desc) + '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
      '<button class="dev-cmd-ok" style="padding:8px 20px;border:1px solid ' + (btnColor||'#00ff41') + ';background:' + (btnColor||'#00ff41') + ';color:#0a0e0a;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;letter-spacing:.5px">' + esc(btnText) + '</button>' +
    '</div></div>';
  document.body.appendChild(bg);
  bg.querySelector('.dev-cmd-ok').onclick = function() { bg.remove(); if (typeof onOk === 'function') onOk(); };
  bg.onclick = function(ev) { if (ev.target === bg) { bg.remove(); } };
}

function showSimpleAlert(title, desc) {
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease';
  bg.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:28px 32px;max-width:380px;text-align:center;box-shadow:0 16px 64px rgba(0,0,0,.5)">' +
    '<div style="color:var(--text2);font-size:15px;font-weight:600;margin-bottom:8px">' + esc(title) + '</div>' +
    '<div style="color:var(--text4);font-size:12px;line-height:1.5;margin-bottom:20px">' + esc(desc) + '</div>' +
    '<button class="modal-btn btn-primary" style="padding:9px 28px;border:none;border-radius:10px;background:var(--grad);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Tamam</button>' +
  '</div>';
  document.body.appendChild(bg);
  bg.querySelector('button').onclick = function() { bg.remove(); };
  bg.onclick = function(ev) { if (ev.target === bg) bg.remove(); };
}

function closeDevtools() {
  var ov = $('devtools-overlay');
  if (ov) {
    ov.style.transition = 'opacity .2s ease';
    ov.style.opacity = '0';
    setTimeout(function() { if (ov.parentNode) ov.remove(); }, 250);
  }
  document.body.classList.remove('devtools-mode');
}
