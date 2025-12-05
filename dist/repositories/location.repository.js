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
}

module.exports = LocationRepository;