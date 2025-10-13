// dist/core/client.js
const State = require('./state');
const Request = require('./request');
const AccountRepository = require('../repositories/account.repository');
const UserRepository = require('../repositories/user.repository');
const DirectRepository = require('../repositories/direct.repository');
const DirectThreadRepository = require('../repositories/direct-thread.repository');
const MediaRepository = require('../repositories/media.repository');
const UploadRepository = require('../repositories/upload.repository');
const StoryRepository = require('../repositories/story.repository');
const FeedRepository = require('../repositories/feed.repository');
const FriendshipRepository = require('../repositories/friendship.repository');
const LocationRepository = require('../repositories/location.repository');
const HashtagRepository = require('../repositories/hashtag.repository');
const SearchService = require('../services/search.service');
const LiveService = require('../services/live.service');
const Utils = require('./utils'); // retry logic
const Realtime = require('../realtime'); // <-- realtime folder is sibling to core

class IgApiClient {
  constructor() {
    this.state = new State();
    this.request = new Request(this);

    // Initialize repositories
    this.account = new AccountRepository(this);
    this.user = new UserRepository(this);
    this.direct = new DirectRepository(this);
    this.directThread = new DirectThreadRepository(this);
    this.media = new MediaRepository(this);
    this.upload = new UploadRepository(this);
    this.story = new StoryRepository(this);
    this.feed = new FeedRepository(this);
    this.friendship = new FriendshipRepository(this);
    this.location = new LocationRepository(this);
    this.hashtag = new HashtagRepository(this);

    // Initialize services
    this.search = new SearchService(this);
    this.live = new LiveService(this);

    // Realtime instance (created after login)
    this.realtime = null;

    // DM helper with retry logic
    this.dm = {
      send: this._wrapDM(this.direct.send.bind(this.direct)),
      sendToGroup: this._wrapDM(this.directThread.sendToGroup.bind(this.directThread)),
      sendImage: this._wrapDM(this.direct.sendImage.bind(this.direct)),
      sendVideo: this._wrapDM(this.direct.sendVideo.bind(this.direct)),
      getInbox: this._wrapDM(this.direct.getInbox.bind(this.direct)),
      getThread: this._wrapDM(this.directThread.getThread.bind(this.directThread)),
    };

    // Simple event registry (for realtime)
    this._events = {};
  }

  _wrapDM(fn) {
    return async (...args) => {
      return Utils.retryOperation(() => fn(...args), 3, 1000);
    };
  }

  /**
   * Login — DOES NOT fail if realtime cannot connect.
   * Realtime will be started in background; errors are logged but do NOT break login.
   */
  async login(credentials) {
    const user = await this.account.login(credentials);

    // Start realtime in background — but don't block/throw if it fails
    try {
      this._initRealtime(); // create instance if needed
      // connect but don't await forever — limit wait time
      this.realtime.connect().catch(err => {
        // connection errors should be logged but not break login
        console.warn('[Realtime] connect() failed (non-fatal):', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[Realtime] init failed (non-fatal):', err && err.message ? err.message : err);
    }

    return user;
  }

  async logout() {
    try {
      await this.account.logout();
    } catch (e) {
      // ignore
    }
    if (this.realtime) {
      try { await this.realtime.disconnect(); } catch (_) {}
      this.realtime = null;
    }
  }

  isLoggedIn() {
    try {
      return !!this.state.cookieUserId;
    } catch {
      return false;
    }
  }

  async saveSession() {
    return await this.state.serialize();
  }

  async loadSession(session) {
    return await this.state.deserialize(session);
  }

  async isSessionValid() {
    try {
      await this.account.currentUser();
      return true;
    } catch {
      return false;
    }
  }

  destroy() {
    try { this.request.error$.complete(); } catch (_) {}
    try { this.request.end$.complete(); } catch (_) {}
    if (this.realtime) {
      try { this.realtime.disconnect(); } catch (_) {}
      this.realtime = null;
    }
  }

  /**
   * Initialize realtime instance (if not already)
   */
  _initRealtime() {
    if (this.realtime) return;
    this.realtime = new Realtime(this);

    // hook events from realtime to client-level emitters
    this.realtime.on('connected', () => {
      console.log('[Realtime] connected');
      if (this._events['realtime_connected']) this._events['realtime_connected']();
    });

    this.realtime.on('disconnected', () => {
      console.log('[Realtime] disconnected');
      if (this._events['realtime_disconnected']) this._events['realtime_disconnected']();
    });

    this.realtime.on('message', (msg) => {
      if (this._events['realtime_message']) this._events['realtime_message'](msg);
    });

    // optional: other event types
    this.realtime.on('raw', (payload) => {
      if (this._events['realtime_raw']) this._events['realtime_raw'](payload);
    });
  }

  /**
   * Register event handler for realtime events:
   * 'realtime_message', 'realtime_connected', 'realtime_disconnected', 'realtime_raw'
   */
  on(event, cb) {
    this._events[event] = cb;
  }

  off(event) {
    delete this._events[event];
  }
}

module.exports = IgApiClient;
