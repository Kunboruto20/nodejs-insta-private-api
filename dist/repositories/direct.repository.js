const Repository = require('../core/repository');
const fs = require('fs');

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
        const delay = 1000 * (retries + 1);
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

    return this.requestWithRetry(async () => {
      const imageBuffer = fs.readFileSync(imagePath);
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

    return this.requestWithRetry(async () => {
      const videoBuffer = fs.readFileSync(videoPath);
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
}

module.exports = DirectRepository;
