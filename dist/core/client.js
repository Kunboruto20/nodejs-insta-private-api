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
const Utils = require('./utils'); // ✅ Added utils for retry logic

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

    // Create dm object for easier access with retry logic
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
   * Wraps a DM function with retry logic
   * @param {Function} fn
   */
  _wrapDM(fn) {
    return async (...args) => {
      return Utils.retryOperation(() => fn(...args), 3, 1000);
    };
  }

  async login(credentials) {
    return await this.account.login(credentials);
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
    // Cleanup resources
    this.request.error$.complete();
    this.request.end$.complete();
  }
}

module.exports = IgApiClient;
