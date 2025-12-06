const Repository = require('../core/repository');

class HashtagRepository extends Repository {
  async info(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/info/`,
    });
    
    return response.body;
  }

  async search(query) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/search/',
      qs: {
        q: query,
        count: 50,
        rank_token: this.client.state.uuid,
      }
    });
    
    return response.body;
  }

  async getFeed(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/tag/${hashtag}/`,
      qs
    });
    
    return response.body;
  }

  async getStories(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/story/`,
    });
    
    return response.body;
  }

  async follow(hashtag) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/tags/follow/${hashtag}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async unfollow(hashtag) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/tags/unfollow/${hashtag}/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getRelated(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/related/`,
    });
    
    return response.body;
  }

  async getFollowing() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/followed/',
    });
    
    return response.body;
  }
}

module.exports = HashtagRepository;