const Repository = require('../core/repository');
const Chance = require('chance');

class DirectThreadRepository extends Repository {
  async sendToGroup(options) {
    const { threadId, message } = options;
    
    return await this.broadcast({
      threadIds: [threadId],
      item: 'text',
      form: {
        text: message
      }
    });
  }

  async getThread(threadId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/direct_v2/threads/${threadId}/`,
    });
    
    return response.body;
  }

  async getByParticipants(recipientUsers) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/direct_v2/threads/get_by_participants/',
      qs: {
        recipient_users: JSON.stringify(recipientUsers),
      },
    });
    
    return response.body;
  }

  async broadcast(options) {
    const mutationToken = new Chance().guid();
    const recipients = options.threadIds || options.userIds;
    const recipientsType = options.threadIds ? 'thread_ids' : 'recipient_users';
    const recipientsIds = recipients instanceof Array ? recipients : [recipients];

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

    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/broadcast/${options.item}/`,
      method: 'POST',
      form: options.signed ? this.client.request.sign(form) : form,
      qs: options.qs,
    });
    
    return response.body;
  }

  async markItemSeen(threadId, threadItemId) {
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
  }

  async deleteItem(threadId, itemId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async approve(threadId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/approve/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async decline(threadId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/decline/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async mute(threadId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/mute/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async unmute(threadId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/unmute/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async addUser(threadId, userIds) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/add_user/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        user_ids: JSON.stringify(userIds),
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async leave(threadId) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/leave/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      },
    });
    
    return response.body;
  }

  async updateTitle(threadId, title) {
    const response = await this.client.request.send({
      url: `/api/v1/direct_v2/threads/${threadId}/update_title/`,
      method: 'POST',
      form: {
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        title,
      },
    });
    
    return response.body;
  }
}

module.exports = DirectThreadRepository;