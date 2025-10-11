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
}

module.exports = UserRepository;