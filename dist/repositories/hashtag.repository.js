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

  async getTop(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/top/`,
    });
    
    return response.body;
  }

  async getRecent(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/recent/`,
      qs
    });
    
    return response.body;
  }

  async getMedia(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/media/`,
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

  async getHighlights(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/highlights/`,
    });
    
    return response.body;
  }

  async getReels(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/reels/`,
      qs
    });
    
    return response.body;
  }

  async getIGTV(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/igtv/`,
      qs
    });
    
    return response.body;
  }

  async getUsers(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/users/`,
      qs
    });
    
    return response.body;
  }

  async getPlaces(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/places/`,
      qs
    });
    
    return response.body;
  }

  async getProducts(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/products/`,
      qs
    });
    
    return response.body;
  }

  async getSuggested(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/suggested/`,
    });
    
    return response.body;
  }

  async getTrending() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/trending/',
    });
    
    return response.body;
  }

  async getPopular() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/popular/',
    });
    
    return response.body;
  }

  async getRecentSearches() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/recent_searches/',
    });
    
    return response.body;
  }

  async clearRecentSearches() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/tags/clear_recent_searches/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getHashtagInfo(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/info/`,
    });
    
    return response.body;
  }

  async getHashtagMedia(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/media/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagStories(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/story/`,
    });
    
    return response.body;
  }

  async getHashtagHighlights(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/highlights/`,
    });
    
    return response.body;
  }

  async getHashtagReels(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/reels/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagIGTV(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/igtv/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagUsers(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/users/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagPlaces(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/places/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagProducts(hashtag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/products/`,
      qs
    });
    
    return response.body;
  }

  async getHashtagSuggested(hashtag) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/tags/${hashtag}/suggested/`,
    });
    
    return response.body;
  }

  async getHashtagTrending() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/trending/',
    });
    
    return response.body;
  }

  async getHashtagPopular() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/popular/',
    });
    
    return response.body;
  }

  async getHashtagRecentSearches() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/recent_searches/',
    });
    
    return response.body;
  }

  async getHashtagClearRecentSearches() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/tags/clear_recent_searches/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }
}

module.exports = HashtagRepository;