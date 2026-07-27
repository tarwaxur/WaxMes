// ===== GLOBAL STATE STORE =====
var store = (function(){
  var _data = {
    // Core chat
    conversations: [],
    activeConvId: null,
    activeAccountId: null,
    messages: {},
    _forceScrollBottom: false,
    _savedScrollTop: null,
    _preserveScrollBottom: false,
    _nearBottom: true,
    _convScrollPositions: {},
    _hasNewMsg: false,
    _searchQuery: '',
    _showArchived: false,
    _showClosed: false,
    _convListAnimatedOnce: false,

    // Auth state
    _authTransitioning: false,
    _explicitLogin: false,
    _pendingLoginPassword: null,
    _authStateSeq: 0,

    // Firestore listeners
    _fbListeners: {},
    _fbLoaded: {},
    _fbMsgCache: {},
    _msgPage: {},         // {convId: {oldestDoc, hasMore, loading, initDone}}
    _fbConversationUnsub: null,
    _convListenerActive: false,
    _onlineStatusListeners: {},
    _msgScrollHandler: null,

    // Profile
    _usernameCache: {},

    // E2E
    e2eKeys: null,
    e2eReady: false,
    _pubKeyCache: {},

    // Group editing
    editGroupState: null,
    groupAvatarDataUrl: null,

    // Media preview
    pendingMediaFiles: [],
    mediaIndex: 0,
    mediaThumbCount: 0,
    sendingMediaLock: false,

    // Image viewer
    imageViewerOpen: false,
    imageViewerMsgs: [],
    imageViewerIdx: 0,

    // UI panels
    profilePanelOpen: false,
    currentEmojiCat: 'face',
    emojiPickerVisible: false,
    currentScreen: 'screen-welcome',
    regStep: 0,
    avatarDataUrl: null,

    // Reply
    replyToMsgId: null,
    replyToMsgText: '',

    // Typing indicators
    typingTimer: null,
    _typingRemoteUnsub: null,
    _typingLocalUid: null,

    // Delete modals
    pendingDeleteMsgId: null,
    pendingSelfDeleteId: null,
    pendingCollageDelete: null,
    pendingAlert: false,
    pendingDeleteGroupId: null,
    pendingRemoveMember: null,
    pendingRemoveGroup: null,

    // Voice recording
    mediaRecorder: null,
    audioChunks: [],
    voiceTimer: null,
    voiceStart: 0,
    audioCtx: null,
    analyser: null,
    sourceNode: null,
    animFrame: null,

    // Audio playback
    currentAudio: null,
    currentAudioId: null,
    audioProgressTimer: null,
    seekCache: {},

    // Call state
    callState: null,
    callCamStream: null,
    callScreenStream: null,
    callPeerConn: null,
    callLocalStream: null,
    callTimerInterval: null,
    pendingIceCandidates: [],
    callStartTime: 0,
    callMicMuted: false,
    callSpeakerMuted: false,
    pendingCallMsgId: null,
    ringtoneCtx: null,
    ringtoneOsc: null,
    ringtoneGain: null,
    ringtoneVibrato: null,
    vadTimer: null,
    _callSignalUnsub: null,
    _callSigOfferId: null,
    _callSigInit: false,
    pendingCallData: null,

    callPollTimer: null,

    // User status
    currentStatus: STATUS.ONLINE,
    prevStatus: null,
    idleTimer: null,

    // Forward modal
    forwardMsgData: null,
    forwardingLock: false,

    // Friend requests
    _frCooldown: 0,
    _pendingUnsub: null,
    _outgoingUnsub: null,
    _currentFriendsTab: 'friends',

    // Modal/UI
    _closeTimers: {},
    pendingClearConvId: null,

    // Shortcut recording
    recordingShortcut: null,
    _recKeys: null,

    // Settings / media test
    _updateCheckLock: false,
    testCamStream: null,
    testMicStream: null,
    micTestInterval: null,

    // Context menu
    contextMenuMsgId: null,
    contextMenuScrollPos: 0,
    contextMenuRelY: 0,
    contextMenuRelX: 0,

    // Stories / 24h Durum
    storyFeed: [],             // Aktif durumlar (gruplanmış: [{author, items: [story...]}])
    storyViewerOpen: false,
    storyViewerAuthor: null,   // {id, name, avatar, color}
    storyViewerItems: [],      // Şu an izlenen yazarın durumları
    storyViewerIdx: 0,
    storyViewerProgress: 0,    // 0..1 ilerleme
    storyViewerPaused: false,
    storyStoryTimer: null,
    storyCreateOpen: false,
    storyDraft: { type: 'text', text: '', bgColor: '#818cf8', font: 'sans', media: null },
    storyViewed: {},           // {storyId: timestamp} local cache

  };
  var _listeners = {};
  var api = { _listeners: _listeners };

  api.get = function(k){ return _data[k]; };
  api.set = function(k, v){
    _data[k] = v;
    var arr = api._listeners[k];
    if(arr) for(var i=0;i<arr.length;i++) arr[i](v);
  };
  api.on = function(k, fn){
    if(!api._listeners[k]) api._listeners[k] = [];
    api._listeners[k].push(fn);
    return function(){ api.off(k, fn); };
  };
  api.off = function(k, fn){
    var arr = api._listeners[k];
    if(!arr) return;
    for(var i=0;i<arr.length;i++) if(arr[i]===fn){ arr.splice(i,1); break; }
  };
  api.emit = function(k){
    var arr = api._listeners[k];
    if(arr) for(var i=0;i<arr.length;i++) arr[i](_data[k]);
  };

  // Resolve dot-notation paths (e.g. 'editGroupState.removedIds')
  function _resolve(key){
    var parts = key.split('.');
    var obj = _data[parts[0]];
    for(var i=1;i<parts.length;i++) obj = obj[parts[i]];
    return obj;
  }

  // Array mutation helpers — mutate + emit
  api.push = function(key){
    var a = _resolve(key);
    if(!a || !a.push) return 0;
    var r = Array.prototype.push.apply(a, Array.prototype.slice.call(arguments, 1));
    api.emit(key.split('.')[0]);
    if(key==='conversations'||key.indexOf('conversations.')===0)store._convCache=null;
    return r;
  };
  api.unshift = function(key){
    var a = _resolve(key);
    if(!a || !a.unshift) return 0;
    var r = Array.prototype.unshift.apply(a, Array.prototype.slice.call(arguments, 1));
    api.emit(key.split('.')[0]);
    if(key==='conversations'||key.indexOf('conversations.')===0)store._convCache=null;
    return r;
  };
  api.splice = function(key, start, delCount){
    var a = _resolve(key);
    if(!a || !a.splice) return [];
    var args = [start, delCount].concat(Array.prototype.slice.call(arguments, 3));
    var r = Array.prototype.splice.apply(a, args);
    api.emit(key.split('.')[0]);
    if(key==='conversations'||key.indexOf('conversations.')===0)store._convCache=null;
    return r;
  };

  // Define getter/setter for every property
  Object.keys(_data).forEach(function(k){
    (function(key){
      Object.defineProperty(api, key, {
        get: function(){ return _data[key]; },
        set: function(v){ _data[key] = v; api.emit(key); if(key==='conversations')store._convCache=null; }
      });
    })(k);
  });

  return api;
})();

store._ac = new AbortController();
