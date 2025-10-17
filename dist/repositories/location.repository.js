const Repository = require('../core/repository');

class LocationRepository extends Repository {
  async info(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/info/`,
    });
    
    return response.body;
  }

  async search(query, lat, lng) {
    const qs = {
      search_query: query,
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

  async searchByCoordinates(lat, lng) {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/location_search/',
      qs: {
        latitude: lat,
        longitude: lng,
        rank_token: this.client.state.uuid,
      }
    });
    
    return response.body;
  }

  async getFeed(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/location/${locationId}/`,
      qs
    });
    
    return response.body;
  }

  async getStories(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/story/`,
    });
    
    return response.body;
  }

  async getRelated(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/related/`,
    });
    
    return response.body;
  }

  async getMedia(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/media/`,
      qs
    });
    
    return response.body;
  }

  async getUsers(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/users/`,
      qs
    });
    
    return response.body;
  }

  async getStories(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/story/`,
    });
    
    return response.body;
  }

  async getHighlights(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/highlights/`,
    });
    
    return response.body;
  }

  async getReels(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/reels/`,
      qs
    });
    
    return response.body;
  }

  async getIGTV(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/igtv/`,
      qs
    });
    
    return response.body;
  }

  async getPlaces(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/places/`,
      qs
    });
    
    return response.body;
  }

  async getProducts(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/products/`,
      qs
    });
    
    return response.body;
  }

  async getSuggested(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/suggested/`,
    });
    
    return response.body;
  }

  async getTrending() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/trending/',
    });
    
    return response.body;
  }

  async getPopular() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/popular/',
    });
    
    return response.body;
  }

  async getRecentSearches() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/recent_searches/',
    });
    
    return response.body;
  }

  async clearRecentSearches() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/locations/clear_recent_searches/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getLocationInfo(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/info/`,
    });
    
    return response.body;
  }

  async getLocationMedia(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/media/`,
      qs
    });
    
    return response.body;
  }

  async getLocationStories(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/story/`,
    });
    
    return response.body;
  }

  async getLocationHighlights(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/highlights/`,
    });
    
    return response.body;
  }

  async getLocationReels(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/reels/`,
      qs
    });
    
    return response.body;
  }

  async getLocationIGTV(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/igtv/`,
      qs
    });
    
    return response.body;
  }

  async getLocationUsers(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/users/`,
      qs
    });
    
    return response.body;
  }

  async getLocationPlaces(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/places/`,
      qs
    });
    
    return response.body;
  }

  async getLocationProducts(locationId, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }

    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/products/`,
      qs
    });
    
    return response.body;
  }

  async getLocationSuggested(locationId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/locations/${locationId}/suggested/`,
    });
    
    return response.body;
  }

  async getLocationTrending() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/trending/',
    });
    
    return response.body;
  }

  async getLocationPopular() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/popular/',
    });
    
    return response.body;
  }

  async getLocationRecentSearches() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/locations/recent_searches/',
    });
    
    return response.body;
  }

  async getLocationClearRecentSearches() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/locations/clear_recent_searches/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }
}

module.exports = LocationRepository;