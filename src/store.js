// ===== GLOBAL STATE STORE =====
var store = {
  // Core chat
  conversations: [],
  activeConvId: null,
  activeAccountId: null,
  messages: {},
  _forceScrollBottom: false,
  _hasNewMsg: false,
  _searchQuery: '',
  _showArchived: false,
  _convListAnimatedOnce: false,

  // Auth state
  _authTransitioning: false,
  _explicitLogin: false,
  _pendingLoginPassword: null,
  _authStateSeq: 0,

  // Firestore listeners
  _fbListeners: {},
  _fbMsgCache: {},
  _fbConvUnsub: null,
  _convListenerActive: false,
  _onlineStatusListeners: {},

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
  pendingCallData: null,
  callCamStream: null,
  callScreenStream: null,
  callPollTimer: null,

  // User status
  currentStatus: 'online',
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

  // Context menu
  contextMenuMsgId: null,
  contextMenuScrollPos: 0,
  contextMenuRelY: 0,
  contextMenuRelX: 0,

  // Settings / media test
  _updateCheckLock: false,
  testCamStream: null,
  testMicStream: null,
  micTestInterval: null,

  // --- Event system ---
  _listeners: {},

  on: function(key, fn) {
    if (!store._listeners[key]) store._listeners[key] = [];
    store._listeners[key].push(fn);
    return function() { store.off(key, fn); };
  },

  off: function(key, fn) {
    var arr = store._listeners[key];
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === fn) { arr.splice(i, 1); break; }
    }
  },

  emit: function(key) {
    var arr = store._listeners[key];
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) arr[i](store[key]);
  },

  set: function(key, val) {
    store[key] = val;
    store.emit(key);
  },

  get: function(key) {
    return store[key];
  }
};
