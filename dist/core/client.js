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
const Utils = require('./utils'); // retry helpers
const Realtime = require('../realtime'); // dist/realtime/index.js

class IgApiClient {
  constructor() {
    this.state = new State();
    this.request = new Request(this);

    // repositories
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

    // services
    this.search = new SearchService(this);
    this.live = new LiveService(this);

    // realtime (initialized after login)
    this.realtime = null;

    // DM helpers with retry
    this.dm = {
      send: this._wrapDM(this.direct.send.bind(this.direct)),
      sendToGroup: this._wrapDM(this.directThread.sendToGroup.bind(this.directThread)),
      sendImage: this._wrapDM(this.direct.sendImage.bind(this.direct)),
      sendVideo: this._wrapDM(this.direct.sendVideo.bind(this.direct)),
      getInbox: this._wrapDM(this.direct.getInbox.bind(this.direct)),
      getThread: this._wrapDM(this.directThread.getThread.bind(this.directThread)),
    };

    // lightweight event registry
    this._events = {};
  }

  _wrapDM(fn) {
    return async (...args) => {
      // Ensure session is valid before making DM requests
      if (!await this.ensureValidSession()) {
        throw new Error('Invalid session - please login again');
      }
      return Utils.retryOperation(() => fn(...args), 3, 1000);
    };
  }

  /**
   * Login: starts realtime in background (non-blocking). Login will NOT fail if realtime fails.
   */
  async login(credentials) {
    const user = await this.account.login(credentials);

    // Log successful login
    console.log('[DEBUG] Login successful for user:', user.username);
    console.log('[DEBUG] Session data available:', this.state.hasValidSession());

    // init and try connect realtime but do not throw if it fails
    try {
      this._initRealtime();
      // connect (don't await long) — connect returns Promise; we catch rejections
      this.realtime.connect().catch(err => {
        console.warn('[Realtime] connect (background) failed (non-fatal):', err && err.message ? err.message : err);
      });
    } catch (e) {
      console.warn('[Realtime] initialization failed (non-fatal):', e && e.message ? e.message : e);
    }

    return user;
  }

  async logout() {
    try { await this.account.logout(); } catch (_) {}
    try { if (this.realtime) await this.realtime.disconnect(); } catch (_) {}
    this.realtime = null;
  }

  isLoggedIn() {
    try {
      return !!this.state.cookieUserId;
    } catch {
      return false;
    }
  }

  async saveSession() {
    if (!this.state.hasValidSession()) {
      throw new Error('No valid session to save');
    }
    
    const session = await this.state.serialize();
    console.log('[DEBUG] Session saved successfully');
    return session;
  }

  async loadSession(session) {
    await this.state.deserialize(session);
    
    // Verify the loaded session
    if (this.state.hasValidSession()) {
      console.log('[DEBUG] Session loaded successfully');
      return true;
    } else {
      console.log('[DEBUG] Loaded session is invalid');
      return false;
    }
  }

  async isSessionValid() {
    try {
      // First check if we have basic session data
      if (!this.state.hasValidSession()) {
        return false;
      }
      
      // Then verify with a real API call
      await this.account.currentUser();
      return true;
    } catch (error) {
      console.log('[DEBUG] Session validation failed:', error.message);
      return false;
    }
  }

  async refreshSession() {
    try {
      if (!this.state.hasValidSession()) {
        throw new Error('No valid session to refresh');
      }
      
      // Try to get current user to refresh session
      const user = await this.account.currentUser();
      console.log('[DEBUG] Session refreshed successfully');
      return user;
    } catch (error) {
      console.log('[DEBUG] Session refresh failed:', error.message);
      throw error;
    }
  }

  async ensureValidSession() {
    if (await this.isSessionValid()) {
      return true;
    }
    
    console.log('[DEBUG] Session is invalid, attempting to refresh...');
    try {
      await this.refreshSession();
      return true;
    } catch (error) {
      console.log('[DEBUG] Session refresh failed, need to login again');
      return false;
    }
  }

  destroy() {
    try { this.request.error$.complete(); } catch (_) {}
    try { this.request.end$.complete(); } catch (_) {}
    try { if (this.realtime) this.realtime.disconnect(); } catch (_) {}
    this.realtime = null;
  }

  // Wrapper for all API calls to ensure session validity
  async _ensureSessionAndCall(fn, ...args) {
    if (!await this.ensureValidSession()) {
      throw new Error('Invalid session - please login again');
    }
    return await fn(...args);
  }

  _initRealtime() {
    if (this.realtime) return;
    this.realtime = new Realtime(this);

    // forward events to client-level registry
    this.realtime.on('connected', () => {
      if (this._events['realtime_connected']) this._events['realtime_connected']();
    });
    this.realtime.on('disconnected', () => {
      if (this._events['realtime_disconnected']) this._events['realtime_disconnected']();
    });
    this.realtime.on('message', (msg) => {
      if (this._events['realtime_message']) this._events['realtime_message'](msg);
    });
    this.realtime.on('raw', (payload) => {
      if (this._events['realtime_raw']) this._events['realtime_raw'](payload);
    });
    this.realtime.on('error', (err) => {
      if (this._events['realtime_error']) this._events['realtime_error'](err);
    });
  }

  /**
   * Subscribe to client-level realtime events:
   * 'realtime_connected', 'realtime_disconnected', 'realtime_message', 'realtime_raw', 'realtime_error'
   */
  on(event, cb) {
    this._events[event] = cb;
  }

  off(event) {
    delete this._events[event];
  }
}

module.exports = IgApiClient;
