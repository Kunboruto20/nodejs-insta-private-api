const Repository = require('../core/repository');

class HighlightsRepository extends Repository {
  async getHighlightsTray(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/highlights/${userId}/highlights_tray/`,
    });
    
    return response.body;
  }

  async getHighlight(highlightId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/reels_media/`,
      qs: {
        reel_ids: highlightId
      }
    });
    
    return response.body;
  }

  async create(title, storyIds, coverMediaId = null) {
    const form = {
      _csrftoken: this.client.state.cookieCsrfToken,
      _uuid: this.client.state.uuid,
      title: title,
      media_ids: JSON.stringify(storyIds),
      source: 'story_viewer',
    };

    if (coverMediaId) {
      form.cover_media_id = coverMediaId;
    }

    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/highlights/create_reel/',
      form: this.client.request.sign(form),
    });
    
    return response.body;
  }

  async edit(highlightId, title, storyIds, coverMediaId = null) {
    const form = {
      _csrftoken: this.client.state.cookieCsrfToken,
      _uuid: this.client.state.uuid,
      title: title,
      added_media_ids: JSON.stringify(storyIds),
      source: 'story_viewer',
    };

    if (coverMediaId) {
      form.cover_media_id = coverMediaId;
    }

    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/edit_reel/`,
      form: this.client.request.sign(form),
    });
    
    return response.body;
  }

  async delete(highlightId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/delete_reel/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async addStories(highlightId, storyIds) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/add_highlight/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        added_media_ids: JSON.stringify(storyIds),
        source: 'story_viewer',
      }),
    });
    
    return response.body;
  }

  async removeStories(highlightId, storyIds) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/remove_highlight/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        removed_media_ids: JSON.stringify(storyIds),
      }),
    });
    
    return response.body;
  }

  async updateCover(highlightId, coverMediaId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/edit_reel/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        cover_media_id: coverMediaId,
        source: 'story_viewer',
      }),
    });
    
    return response.body;
  }
}

module.exports = HighlightsRepository;