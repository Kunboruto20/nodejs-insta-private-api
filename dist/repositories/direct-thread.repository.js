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
        const delay = 500 * 2 ** retries; // exponential backoff
        if (process.env.DEBUG) console.log(`[DEBUG] Retrying after ${delay}ms due to ${error.data?.error_type}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(requestFn, retries + 1);
      }

      throw error;
    }
  }

  /**
   * Send a text message to a group thread
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
      [recipientsType]: JSON.stringify(recipientsType === 'thread_ids' ? recipientsIds : [recipientsIds]),
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

  /** ---------------- NEW FEATURES ---------------- */

  /**
   * React to a message
   */
  async reactToMessage(threadId, itemId, reaction) {
    if (!threadId || !itemId || !reaction) throw new Error('threadId, itemId, and reaction are required');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/items/${itemId}/like/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid, reaction },
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
        url: '/api/v1/direct_v2/threads/broadcast/text/',
        method: 'POST',
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
   * Send messages to multiple threads at once
   */
  async sendBulk(threadIds, message) {
    if (!Array.isArray(threadIds) || !message) throw new Error('threadIds array and message are required');
    return Promise.all(threadIds.map(id => this.sendToGroup({ threadId: id, message })));
  }

  /**
   * Send a scheduled message
   */
  async sendScheduled(options, date) {
    if (!options || !date) throw new Error('options and date are required');
    const delay = date - Date.now();
    if (delay <= 0) throw new Error('Scheduled date must be in the future');
    setTimeout(() => this.sendToGroup(options), delay);
  }

  /**
   * Typing indicator
   */
  async sendTyping(threadId, duration = 3000) {
    if (!threadId) throw new Error('threadId is required');
    await this.client.request.send({
      method: 'POST',
      url: '/api/v1/direct_v2/threads/typing_indicator/',
      form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid, thread_id: threadId, action: 'typing_on' },
    });
    setTimeout(async () => {
      await this.client.request.send({
        method: 'POST',
        url: '/api/v1/direct_v2/threads/typing_indicator/',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid, thread_id: threadId, action: 'typing_off' },
      });
    }, duration);
  }

  /**
   * Pin a thread
   */
  async pin(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/pin/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Unpin a thread
   */
  async unpin(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/unpin/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Mark all items in a thread as seen
   */
  async markAllSeen(threadId) {
    const thread = await this.getThread(threadId);
    const items = thread.items || [];
    return Promise.all(items.map(item => this.markItemSeen(threadId, item.item_id)));
  }

  /**
   * Get thread participants
   */
  async getParticipants(threadId) {
    const thread = await this.getThread(threadId);
    return thread.users || [];
  }

  /**
   * Update thread theme
   */
  async updateTheme(threadId, theme) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_theme/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          theme: theme
        },
      });
      return response.body;
    });
  }

  /**
   * Update thread emoji
   */
  async updateEmoji(threadId, emoji) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_emoji/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          emoji: emoji
        },
      });
      return response.body;
    });
  }

  /**
   * Update thread admin
   */
  async updateAdmin(threadId, userId, isAdmin) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_admin/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          user_id: userId,
          is_admin: isAdmin ? '1' : '0'
        },
      });
      return response.body;
    });
  }

  /**
   * Get thread settings
   */
  async getSettings(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/settings/`,
      });
      return response.body;
    });
  }

  /**
   * Update thread settings
   */
  async updateSettings(threadId, settings) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_settings/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          ...settings
        },
      });
      return response.body;
    });
  }

  /**
   * Get thread activity
   */
  async getActivity(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/activity/`,
      });
      return response.body;
    });
  }

  /**
   * Get thread media
   */
  async getMedia(threadId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/media/`,
        qs
      });
      return response.body;
    });
  }

  /**
   * Get thread files
   */
  async getFiles(threadId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/files/`,
        qs
      });
      return response.body;
    });
  }

  /**
   * Get thread links
   */
  async getLinks(threadId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/links/`,
        qs
      });
      return response.body;
    });
  }

  /**
   * Get thread reactions
   */
  async getReactions(threadId, itemId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/items/${itemId}/reactions/`,
      });
      return response.body;
    });
  }

  /**
   * Get thread mentions
   */
  async getMentions(threadId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/mentions/`,
        qs
      });
      return response.body;
    });
  }

  /**
   * Get thread search results
   */
  async search(threadId, query) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/search/`,
        qs: { query }
      });
      return response.body;
    });
  }

  /**
   * Get thread archive
   */
  async getArchive(threadId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/archive/`,
        qs
      });
      return response.body;
    });
  }

  /**
   * Archive a thread
   */
  async archive(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/archive/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Unarchive a thread
   */
  async unarchive(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/unarchive/`,
        method: 'POST',
        form: { _csrftoken: this.client.state.cookieCsrfToken, _uuid: this.client.state.uuid },
      });
      return response.body;
    });
  }

  /**
   * Get thread info
   */
  async getInfo(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/info/`,
      });
      return response.body;
    });
  }

  /**
   * Update thread info
   */
  async updateInfo(threadId, info) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_info/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          ...info
        },
      });
      return response.body;
    });
  }

  /**
   * Get thread members
   */
  async getMembers(threadId) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: `/api/v1/direct_v2/threads/${threadId}/members/`,
      });
      return response.body;
    });
  }

  /**
   * Update thread members
   */
  async updateMembers(threadId, userIds) {
    if (!Array.isArray(userIds)) throw new Error('userIds must be an array');
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: `/api/v1/direct_v2/threads/${threadId}/update_members/`,
        method: 'POST',
        form: { 
          _csrftoken: this.client.state.cookieCsrfToken, 
          _uuid: this.client.state.uuid,
          user_ids: JSON.stringify(userIds)
        },
      });
      return response.body;
    });
  }
}

module.exports = DirectThreadRepository;
