const Repository = require('../core/repository');
const Chance = require('chance');

class DirectThreadRepository extends Repository {
  constructor(client) {
    super(client);
    this.maxRetries = 3; // default max retries for requests
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
   * Send a text message to a group thread
   * @param {Object} options - { threadId, message }
   */
  async sendToGroup(options) {
    const { threadId, message } = options;
    if (!threadId || !message) throw new Error('threadId and message are required');

    return this.broadcast({
      threadIds: [threadId],
      item: 'text',
      form: { text: message },
    });
  }

  /**
   * Fetch a specific thread by its ID
   * @param {string} threadId
   */
  async getThread(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/`,
      });
      return response.body;
    });
  }

  /**
   * Fetch threads by participants
   * @param {Array} recipientUsers
   */
  async getByParticipants(recipientUsers) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: '/api/v1/direct_v2/threads/get_by_participants/',
        qs: { recipient_users: JSON.stringify(recipientUsers) },
      });
      return response.body;
    });
  }

  /**
   * Broadcast a message to multiple threads or users
   */
  async broadcast(options) {
    const mutationToken = new Chance().guid();
    const recipients = options.threadIds || options.userIds;
    const recipientsType = options.threadIds ? 'thread_ids' : 'recipient_users';
    const recipientsIds = Array.isArray(recipients) ? recipients : [recipients];

    const form = {
      action: 'send_item',
      [recipientsType]: JSON.stringify(recipientsIds),
      client_context: mutationToken,
      _csrftoken: this.client.state.cookieCsrfToken,
      device_id: this.client.state.deviceId,
      mutation_token: mutationToken,
      _uuid: this.client.state.uuid,
      ...options.form,
    };

    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/broadcast/${options.item}/`,
        method: 'POST',
        form: options.signed ? this.client.request.sign(form) : form,
        qs: options.qs,
      });
      return response.body;
    });
  }

  /**
   * Mark a specific item in a thread as seen
   */
  async markItemSeen(threadId, threadItemId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/items/${threadItemId}/seen/`,
        method: 'POST',
        form: {
          _csrftoken: this.client.state.cookieCsrfToken,
          _uuid: this.client.state.uuid,
          use_unified_inbox: true,
          action: 'mark_seen',
          thread_id: threadId,
          item_id: threadItemId,
        },
      });
      return response.body;
    });
  }

  /**
   * Delete an item from a thread
   */
  async deleteItem(threadId, itemId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Approve a pending thread
   */
  async approve(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/approve/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Decline a pending thread
   */
  async decline(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/decline/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Mute a thread
   */
  async mute(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/mute/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Unmute a thread
   */
  async unmute(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/unmute/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Add users to a thread
   */
  async addUser(threadId, userIds) {
    if (!Array.isArray(userIds)) throw new Error('userIds must be an array');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/add_user/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, user_ids: JSON.stringify(userIds), _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Leave a thread
   */
  async leave(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/leave/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Update thread title
   */
  async updateTitle(threadId, title) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_title/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid, title },
      });
      return response.body;
    });
  }
}

module.exports = DirectThreadRepository;
