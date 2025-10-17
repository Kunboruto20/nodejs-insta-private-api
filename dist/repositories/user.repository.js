const Repository = require('../core/repository');

class UserRepository extends Repository {
  async infoByUsername(username) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/users/${username}/usernameinfo/`,
    });
    
    return response.body.user;
  }

  async info(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/users/${userId}/info/`,
    });
    
    return response.body.user;
  }

  async search(query) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/users/search/',
      qs: {
        q: query,
        count: 50
      }
    });
    
    return response.body.users;
  }

  async follow(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/create/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async unfollow(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/destroy/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async getFollowers(userId, maxId = null) {
    const qs = {
      max_id: maxId
    };
    
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/friendships/${userId}/followers/`,
      qs
    });
    
    return response.body;
  }

  async getFollowing(userId, maxId = null) {
    const qs = {
      max_id: maxId
    };
    
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/friendships/${userId}/following/`,
      qs
    });
    
    return response.body;
  }

  async getFriendship(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/friendships/show/${userId}/`,
    });
    
    return response.body;
  }

  async block(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/block/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async unblock(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/unblock/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async report(userId, reason = 'spam') {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/users/${userId}/report/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        reason: reason,
      }),
    });
    
    return response.body;
  }

  async getBlockedList() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/blocked_list/',
    });
    
    return response.body;
  }

  async getSuggestedUsers() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/discover/chaining/',
    });
    
    return response.body;
  }

  async getRecentActivity() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/activity/',
    });
    
    return response.body;
  }

  async getAccountRecovery() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/account_recovery/',
    });
    
    return response.body;
  }
}

module.exports = UserRepository;