const Repository = require('../core/repository');

class SearchService extends Repository {
  async search(query, options = {}) {
    const {
      searchType = 'blended',
      count = 30,
      rankToken = this.client.state.uuid
    } = options;

    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/fbsearch/topsearch/',
      qs: {
        query,
        search_surface: 'top_search_page',
        timezone_offset: this.client.state.timezoneOffset,
        count,
        rank_token: rankToken,
      }
    });
    
    return response.body;
  }

  async searchUsers(query, count = 30) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/users/search/',
      qs: {
        q: query,
        count,
        rank_token: this.client.state.uuid,
      }
    });
    
    return response.body;
  }

  async searchHashtags(query, count = 30) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/search/',
      qs: {
        q: query,
        count,
        rank_token: this.client.state.uuid,
      }
    });
    
    return response.body;
  }

  async searchLocations(query, lat = null, lng = null, count = 30) {
    const qs = {
      search_query: query,
      count,
      rank_token: this.client.state.uuid,
    };

    if (lat && lng) {
      qs.latitude = lat;
      qs.longitude = lng;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/location_search/',
      qs
    });
    
    return response.body;
  }

  async getRecentSearches() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/fbsearch/recent_searches/',
    });
    
    return response.body;
  }

  async clearRecentSearches() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/fbsearch/clear_search_history/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getSuggestedUsers() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/discover/ayml/',
    });
    
    return response.body;
  }

  async getSuggestedHashtags() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/tags/suggested/',
    });
    
    return response.body;
  }
}

module.exports = SearchService;