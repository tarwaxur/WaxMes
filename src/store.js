// ===== GLOBAL STATE — merkezi store =====
// Core chat
var conversations=[],activeConvId=null,activeAccountId=null;
var messages={};
var _forceScrollBottom=false;
var _hasNewMsg=false;
var _searchQuery='';
var _showArchived=false;
var _convListAnimatedOnce=false;

// Auth state
var _authTransitioning=false;
var _explicitLogin=false;
var _pendingLoginPassword=null;
var _authStateSeq=0;

// Firestore listeners
var _fbListeners={};
var _fbMsgCache={};
var _fbConvUnsub=null;
var _convListenerActive=false;
var _onlineStatusListeners={};

// E2E
var e2eKeys=null;
var e2eReady=false;
var _pubKeyCache={};

// Group editing
var editGroupState=null;
var groupAvatarDataUrl=null;

// Media preview
var pendingMediaFiles=[],mediaIndex=0;
var mediaThumbCount=0;
var sendingMediaLock=false;

// Image viewer
var imageViewerOpen=false,imageViewerMsgs=[],imageViewerIdx=0;

// UI panels
var profilePanelOpen=false;
var currentEmojiCat='face';
var emojiPickerVisible=false;
var currentScreen='screen-welcome',regStep=0,avatarDataUrl=null;

// Reply
var replyToMsgId=null,replyToMsgText='';

// Typing indicators
var typingTimer=null;
var _typingRemoteUnsub=null;
var _typingLocalUid=null;

// Delete modals
var pendingDeleteMsgId=null, pendingSelfDeleteId=null, pendingCollageDelete=null, pendingAlert=false;
var pendingDeleteGroupId=null;
var pendingRemoveMember=null,pendingRemoveGroup=null;

// Voice recording
var mediaRecorder=null,audioChunks=[],voiceTimer=null,voiceStart=0;
var audioCtx=null,analyser=null,sourceNode=null,animFrame=null;

// Audio playback
var currentAudio=null,currentAudioId=null,audioProgressTimer=null,seekCache={};

// Call state
var callState=null;
var callPeerConn=null, callLocalStream=null, callTimerInterval=null, pendingIceCandidates=[];
var callStartTime=0,callMicMuted=false,callSpeakerMuted=false;
var pendingCallMsgId=null;
var ringtoneCtx=null, ringtoneOsc=null, ringtoneGain=null, ringtoneVibrato=null;
var vadTimer=null;
var _callSignalUnsub=null;
var _callSigOfferId=null;
var callCamStream=null, callScreenStream=null;
var callPollTimer=null;

// User status
var currentStatus='online';
var prevStatus=null,idleTimer=null;

// Forward modal
var forwardMsgData=null, forwardingLock=false;

// Friend requests
var _frCooldown=0;
var _pendingUnsub=null;
var _outgoingUnsub=null;
var _currentFriendsTab='friends';

// Modal/UI
var _closeTimers={};
var pendingClearConvId=null;

// Shortcut recording
var recordingShortcut=null;
var _recKeys=null;

// Settings / media test
var _updateCheckLock = false;
var testCamStream=null, testMicStream=null, micTestInterval=null;
