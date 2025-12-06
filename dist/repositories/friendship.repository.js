const Repository = require('../core/repository');

class FriendshipRepository extends Repository {
  async create(userId) {
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

  async destroy(userId) {
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

  async show(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/friendships/show/${userId}/`,
    });
    
    return response.body;
  }

  async showMany(userIds) {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/friendships/show_many/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        user_ids: userIds.join(','),
      }),
    });
    
    return response.body;
  }

  async approve(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/approve/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async ignore(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/ignore/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async removeFollower(userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/remove_follower/${userId}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
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

  async mute(userId, options = {}) {
    const form = {
      _csrftoken: this.client.state.cookieCsrfToken,
      _uid: this.client.state.cookieUserId,
      _uuid: this.client.state.uuid,
      user_id: userId,
    };

    if (options.muteStories !== undefined) {
      form.target_reel_author_id = userId;
    }
    if (options.mutePosts !== undefined) {
      form.target_posts_author_id = userId;
    }

    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/mute_posts_or_story_from_follow/`,
      form: this.client.request.sign(form),
    });
    
    return response.body;
  }

  async unmute(userId, options = {}) {
    const form = {
      _csrftoken: this.client.state.cookieCsrfToken,
      _uid: this.client.state.cookieUserId,
      _uuid: this.client.state.uuid,
      user_id: userId,
    };

    if (options.unmuteStories !== undefined) {
      form.target_reel_author_id = userId;
    }
    if (options.unmutePosts !== undefined) {
      form.target_posts_author_id = userId;
    }

    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/friendships/unmute_posts_or_story_from_follow/`,
      form: this.client.request.sign(form),
    });
    
    return response.body;
  }

  async getPendingRequests() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/friendships/pending/',
    });
    
    return response.body;
  }
}

module.exports = FriendshipRepository;