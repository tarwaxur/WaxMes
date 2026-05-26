var firebaseConfig = {
  apiKey: "AIzaSyCkp1lxzL2j_3ClCe9i_DB7Ml037E-kxxM",
  authDomain: "waxmes.firebaseapp.com",
  projectId: "waxmes",
  storageBucket: "waxmes.firebasestorage.app",
  messagingSenderId: "753368719041",
  appId: "1:753368719041:web:283c11d81c4ee4b13b3e40"
};

var COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  FRIENDS: 'friends',
  FRIEND_REQUESTS: 'friendRequests',
  CALL_SIGNALS: 'call_signals',
  LIST: 'list'
};

var STORAGE_KEYS = {
  ACCOUNTS: 'accounts',
  GROUPS: 'groups',
  ACTIVE_ACCOUNT: 'activeAccount',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  PINNED: 'pinned',
  MUTED: 'muted',
  ARCHIVED: 'archived',
  STATUS: 'status_',
  ACCOUNT_PASSWORD: 'account_password_',
  ACCOUNT_PASSWORD_EMAIL: 'account_password_email_',
  THEME: 'theme',
  UNREAD: 'unreadCounts',
  SHORTCUTS: 'shortcuts',
  VERSION: 'version',
  FRIENDS_CACHE: 'friendsCache',
  OUTGOING_UNREAD: 'outgoingUnread',
  BACKGROUND_MODE: 'backgroundMode',
  CONV_BACKUP: 'conv_backup',
  NOISE_SUPPRESSION: 'noiseSuppression',
  NOISE_LEVEL: 'noiseLevel',
  VOLUME: 'volume',
  LAST_ACTIVITY: 'lastActivity',
  NOTIFICATIONS: 'notifications'
};

var STATUS = {
  ONLINE: 'online',
  IDLE: 'idle',
  DND: 'dnd',
  OFFLINE: 'offline'
};

var CSP_NONCE = 'waxmes2024';
