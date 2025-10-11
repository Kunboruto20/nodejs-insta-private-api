const Repository = require('../core/repository');
const fs = require('fs').promises;
const path = require('path');

class DirectRepository extends Repository {
  constructor(client) {
    super(client);
    this.maxRetries = 3; // maximum retries for failed requests
  }

  /**
   * Generic request wrapper with retry and debug logging
   * @param {Function} requestFn - async function performing request
   * @param {number} retries - current retry count
   */
  async requestWithRetry(requestFn, retries = 0) {
    try {
      if (process.env.DEBUG) console.log(`[DEBUG] Attempt #${retries + 1}`);
      const result = await requestFn();
      return result;
    } catch (error) {
      const shouldRetry =
        (error.data?.error_type === 'server_error' ||
          error.data?.error_type === 'rate_limited') &&
        retries < this.maxRetries;

      if (shouldRetry) {
        const delay = 500 * 2 ** retries; // exponential backoff
        if (process.env.DEBUG) console.log(`[DEBUG] Retrying after ${delay}ms due to ${error.data?.error_type}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(requestFn, retries + 1);
      }

      throw error;
    }
  }

  /**
   * Send a text message to a user
   */
  async send(options) {
    const { to, message } = options;
    if (!to || !message) throw new Error('Recipient (to) and message are required');

    return this.requestWithRetry(async () => {
      const user = await this.client.user.infoByUsername(to);
      const thread = await this.client.directThread.getByParticipants([user.pk]);
      return this.client.directThread.broadcast({
        threadIds: [thread.thread_id],
        item: 'text',
        form: { text: message },
      });
    });
  }

  /**
   * Send an image to a user
   */
  async sendImage(options) {
    const { to, imagePath } = options;
    if (!to || !imagePath) throw new Error('Recipient (to) and imagePath are required');

    const resolvedPath = path.resolve(imagePath);
    return this.requestWithRetry(async () => {
      const imageBuffer = await fs.readFile(resolvedPath);
      const uploadResult = await this.client.upload.photo({ file: imageBuffer, uploadId: Date.now() });
      const user = await this.client.user.infoByUsername(to);
      const thread = await this.client.directThread.getByParticipants([user.pk]);
      return this.client.directThread.broadcast({
        threadIds: [thread.thread_id],
        item: 'configure_photo',
        form: { upload_id: uploadResult.upload_id, allow_full_aspect_ratio: true },
      });
    });
  }

  /**
   * Send a video to a user
   */
  async sendVideo(options) {
    const { to, videoPath } = options;
    if (!to || !videoPath) throw new Error('Recipient (to) and videoPath are required');

    const resolvedPath = path.resolve(videoPath);
    return this.requestWithRetry(async () => {
      const videoBuffer = await fs.readFile(resolvedPath);
      const uploadResult = await this.client.upload.video({ video: videoBuffer, uploadId: Date.now() });
      const user = await this.client.user.infoByUsername(to);
      const thread = await this.client.directThread.getByParticipants([user.pk]);
      return this.client.directThread.broadcast({
        threadIds: [thread.thread_id],
        item: 'configure_video',
        form: { upload_id: uploadResult.upload_id, video_result: 'deprecated' },
      });
    });
  }

  /**
   * Get inbox threads with optional pagination cursor
   */
  async getInbox(cursor = null) {
    return this.requestWithRetry(async () => {
      const qs = cursor ? { cursor } : {};
      const response = await this.client.request.send({ method: 'GET', url: '/api/v1/direct_v2/inbox/', qs });
      return response.body;
    });
  }

  /**
   * Create a group thread
   */
  async createGroupThread(recipientUsers, threadTitle) {
    if (!Array.isArray(recipientUsers) || !threadTitle) throw new Error('recipientUsers must be array and threadTitle required');

    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/direct_v2/create_group_thread/',
        form: this.client.request.sign({
          _csrftoken: this.client.state.cookieCsrfToken,
          _uuid: this.client.state.uuid,
          _uid: this.client.state.cookieUserId,
          recipient_users: JSON.stringify(recipientUsers),
          thread_title: threadTitle,
        }),
      });
      return response.body;
    });
  }

  /**
   * Get ranked recipients (suggested users to send DMs)
   */
  async rankedRecipients(mode = 'raven', query = '') {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: '/api/v1/direct_v2/ranked_recipients/',
        qs: { mode, query, show_threads: true },
      });
      return response.body;
    });
  }

  /**
   * Get online presence
   */
  async getPresence() {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({ method: 'GET', url: '/api/v1/direct_v2/get_presence/' });
      return response.body;
    });
  }

  /**
   * React to a message
   */
  async reactToMessage(threadId, itemId, reaction) {
    if (!threadId || !itemId || !reaction) throw new Error('threadId, itemId, and reaction are required');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: `/api/v1/direct_v2/threads/${threadId}/items/${itemId}/like/`,
        form: this.client.request.sign({ reaction }),
      });
      return response.body;
    });
  }

  /**
   * Forward a message to another thread
   */
  async forwardMessage(threadId, itemId, recipientThreadId) {
    if (!threadId || !itemId || !recipientThreadId) throw new Error('threadId, itemId, and recipientThreadId are required');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/direct_v2/threads/broadcast/text/',
        form: this.client.request.sign({
          text: '',
          thread_ids: JSON.stringify([recipientThreadId]),
          item_id: itemId,
        }),
      });
      return response.body;
    });
  }

  /**
   * Send messages to multiple users at once
   */
  async sendBulk(users, message) {
    if (!Array.isArray(users) || !message) throw new Error('users array and message are required');
    return Promise.all(users.map(u => this.send({ to: u, message })));
  }

  /**
   * Send a scheduled message
   */
  async sendScheduled(options, date) {
    if (!options || !date) throw new Error('options and date are required');
    const delay = date - Date.now();
    if (delay <= 0) throw new Error('Scheduled date must be in the future');
    setTimeout(() => this.send(options), delay);
  }

  /**
   * Mark a message as seen
   */
  async markAsSeen(threadId, itemId) {
    if (!threadId || !itemId) throw new Error('threadId and itemId are required');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/direct_v2/threads/seen/',
        form: this.client.request.sign({ thread_id: threadId, item_id: itemId }),
      });
      return response.body;
    });
  }

  /**
   * Simulate typing indicator
   */
  async sendTyping(threadId, duration = 3000) {
    if (!threadId) throw new Error('threadId is required');
    await this.client.request.send({
      method: 'POST',
      url: '/api/v1/direct_v2/threads/typing_indicator/',
      form: this.client.request.sign({ thread_id: threadId, action: 'typing_on' }),
    });
    setTimeout(async () => {
      await this.client.request.send({
        method: 'POST',
        url: '/api/v1/direct_v2/threads/typing_indicator/',
        form: this.client.request.sign({ thread_id: threadId, action: 'typing_off' }),
      });
    }, duration);
  }
}

module.exports = DirectRepository;
