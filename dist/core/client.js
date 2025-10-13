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
const Realtime = require('../realtime/index'); // conexiune WebSocket Instagram

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

    // WebSocket Realtime (Instagram)
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
  }

  /**
   * Wrap a DM method with automatic retries
   */
  _wrapDM(fn) {
    return async (...args) => {
      return Utils.retryOperation(() => fn(...args), 3, 1000);
    };
  }

  /**
   * Login și conectare automată la Realtime
   */
  async login(credentials) {
    const user = await this.account.login(credentials);

    // Conectare automat la Realtime după login
    if (!this.realtime) {
      this.realtime = new Realtime(this);
      await this.realtime.connect(); // poate fi async
    }

    return user;
  }

  async logout() {
    const result = await this.account.logout();
    if (this.realtime) {
      this.realtime.disconnect();
      this.realtime = null;
    }
    return result;
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

  /**
   * Curățare resurse
   */
  destroy() {
    this.request.error$.complete();
    this.request.end$.complete();
    if (this.realtime) {
      this.realtime.disconnect();
      this.realtime = null;
    }
  }
}

module.exports = IgApiClient;
