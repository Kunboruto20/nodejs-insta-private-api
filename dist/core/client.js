const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

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

/**
 * IgApiClient
 *
 * - Păstrăm în totalitate funcționalitatea existentă (login/logout/isLoggedIn/saveSession/loadSession/isSessionValid/destroy)
 * - Am eliminat complet stratul Realtime (WebSocket). Orice cod dependent de realtime trebuie migrat separat.
 * - Am adăugat un helper generic `retryAsync(fn, opts)` pentru retry/backoff la operații asincrone (utile pentru request-uri).
 */
class IgApiClient extends EventEmitter {
  constructor() {
    super();

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

    // Create dm object for easier access (keeps backward compatibility)
    this.dm = {
      send: this.direct.send.bind(this.direct),
      sendToGroup: this.directThread.sendToGroup.bind(this.directThread),
      sendImage: this.direct.sendImage.bind(this.direct),
      sendVideo: this.direct.sendVideo.bind(this.direct),
      getInbox: this.direct.getInbox.bind(this.direct),
      getThread: this.directThread.getThread.bind(this.directThread)
    };

    // Proxy debug / verbose
    this.state.verbose = this.state.verbose || false;

    // Default retry policy for the new helper retryAsync
    this._defaultRetryPolicy = { retries: 3, delayMs: 500 };

  }

  /**
   * Login -> uses account.login. Returns whatever account.login returns.
   * NOTE: removed automatic realtime connection attempt.
   */
  async login(credentials) {
    const result = await this.account.login(credentials);
    return result;
  }

  async logout() {
    return await this.account.logout();
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
    const ret = await this.state.deserialize(session);
    return ret;
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
    // Cleanup resources - keep original behaviour for request streams if present
    try { this.request.error$.complete(); } catch (_) {}
    try { this.request.end$.complete(); } catch (_) {}
  }

  // -------------------------------
  // === UTILITY HELPER METHODS
  // -------------------------------

  /**
   * Generic retry helper for async functions.
   *
   * Usage:
   * await client.retryAsync(() => client.request.post(...), { retries: 5, delayMs: 1000 });
   *
   * Options:
   *  - retries: number (default from this._defaultRetryPolicy.retries)
   *  - delayMs: base delay in ms (default from this._defaultRetryPolicy.delayMs)
   *  - factor: multiplier for exponential backoff (default 1.5)
   *  - onRetry: optional callback (err, attempt) called before next retry
   */
  async retryAsync(fn, options = {}) {
    const retries = typeof options.retries === 'number' ? options.retries : this._defaultRetryPolicy.retries;
    const delayMs = typeof options.delayMs === 'number' ? options.delayMs : this._defaultRetryPolicy.delayMs;
    const factor = typeof options.factor === 'number' ? options.factor : 1.5;
    const onRetry = typeof options.onRetry === 'function' ? options.onRetry : null;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (this.state.verbose) {
          console.log(`[Retry] attempt ${attempt + 1}/${retries + 1}`);
        }
        const res = await fn();
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt === retries) break;
        if (onRetry) {
          try { onRetry(err, attempt + 1); } catch (_) {}
        }
        const backoff = Math.round(delayMs * Math.pow(factor, attempt));
        if (this.state.verbose) {
          console.warn(`[Retry] attempt ${attempt + 1} failed: ${err && err.message ? err.message : err}. Backoff ${backoff}ms`);
        }
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    throw lastErr || new Error('retryAsync failed without specific error');
  }

  /**
   * Set default retry policy for retryAsync.
   * Example: client.setDefaultRetryPolicy({ retries: 5, delayMs: 800 });
   */
  setDefaultRetryPolicy(policy = {}) {
    if (typeof policy.retries === 'number') this._defaultRetryPolicy.retries = policy.retries;
    if (typeof policy.delayMs === 'number') this._defaultRetryPolicy.delayMs = policy.delayMs;
    return this._defaultRetryPolicy;
  }

  /**
   * Save session object to a file. Path optional (defaults to ./session.json).
   * Will call this.saveSession() internally.
   */
  async saveSessionToFile(filePath) {
    const p = filePath || path.resolve(process.cwd(), 'session.json');
    const data = await this.saveSession();
    // Ensure JSON string
    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await fs.promises.writeFile(p, json, { mode: 0o600 });
    if (this.state.verbose) console.log('[Session] Saved session to', p);
    return p;
  }

  /**
   * Load session from file path (defaults to ./session.json). Returns true on success.
   */
  async loadSessionFromFile(filePath) {
    const p = filePath || path.resolve(process.cwd(), 'session.json');
    if (!fs.existsSync(p)) {
      if (this.state.verbose) console.warn('[Session] loadSessionFromFile: file not found', p);
      return false;
    }
    const raw = await fs.promises.readFile(p, 'utf8');
    let sessionObj;
    try {
      sessionObj = JSON.parse(raw);
    } catch (e) {
      if (this.state.verbose) console.warn('[Session] loadSessionFromFile: invalid JSON in', p);
      throw e;
    }
    await this.loadSession(sessionObj);
    if (this.state.verbose) console.log('[Session] Loaded session from', p);
    return true;
  }

  /**
   * Attempt to load session JSON if exists and valid, else false.
   * Wrapper helper for convenience.
   */
  async tryLoadSessionFileIfExists(filePath) {
    try {
      const loaded = await this.loadSessionFromFile(filePath);
      if (!loaded) return false;
      return await this.isSessionValid();
    } catch (e) {
      if (this.state.verbose) console.warn('[Session] tryLoadSessionFileIfExists failed:', e && e.message);
      return false;
    }
  }

  /**
   * Set verbose mode on/off.
   */
  setVerbose(flag) {
    this.state.verbose = !!flag;
    return this.state.verbose;
  }

  /**
   * safeDestroy: a slightly more robust destroy which attempts to stop requests, etc.
   */
  async safeDestroy() {
    try { if (this.request && this.request.error$ && typeof this.request.error$.complete === 'function') this.request.error$.complete(); } catch (_) {}
    try { if (this.request && this.request.end$ && typeof this.request.end$.complete === 'function') this.request.end$.complete(); } catch (_) {}
    
    
    // keep original destroy for backward compatibility
    try { this.destroy(); } catch (_) {}
  }
}

module.exports = IgApiClient;
