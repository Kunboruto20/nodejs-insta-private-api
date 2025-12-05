const Repository = require('../core/repository');

class MediaRepository extends Repository {
  async info(mediaId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/info/`,
      method: 'GET',
      form: this.client.request.sign({
        igtv_feed_preview: false,
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async like(mediaId, moduleInfo = { module_name: 'feed_timeline' }) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/like/`,
      method: 'POST',
      form: this.client.request.sign({
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        radio_type: this.client.state.radioType,
        module_name: moduleInfo.module_name,
      }),
    });
    
    return response.body;
  }

  async unlike(mediaId, moduleInfo = { module_name: 'feed_timeline' }) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/unlike/`,
      method: 'POST',
      form: this.client.request.sign({
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        radio_type: this.client.state.radioType,
        module_name: moduleInfo.module_name,
      }),
    });
    
    return response.body;
  }

  async comment(mediaId, commentText) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/comment/`,
      method: 'POST',
      form: this.client.request.sign({
        media_id: mediaId,
        comment_text: commentText,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        radio_type: this.client.state.radioType,
        module_name: 'feed_timeline',
      }),
    });
    
    return response.body;
  }

  async deleteComment(mediaId, commentId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/comment/${commentId}/delete/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async delete(mediaId, mediaType = 'PHOTO') {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/delete/`,
      method: 'POST',
      qs: {
        media_type: mediaType,
      },
      form: this.client.request.sign({
        igtv_feed_preview: false,
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async edit(mediaId, captionText) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/edit_media/`,
      method: 'POST',
      form: this.client.request.sign({
        igtv_feed_preview: false,
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        caption_text: captionText,
      }),
    });
    
    return response.body;
  }

  async seen(reels) {
    const response = await this.client.request.send({
      url: '/api/v1/media/seen/',
      method: 'POST',
      form: this.client.request.sign({
        reels: JSON.stringify(reels),
        live_vods: JSON.stringify([]),
        nf_token: '',
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        container_module: 'feed_short_url',
      }),
    });
    
    return response.body;
  }

  async likers(mediaId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/likers/`,
      method: 'GET',
    });
    
    return response.body;
  }

  async comments(mediaId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/comments/`,
      method: 'GET',
      qs
    });
    
    return response.body;
  }
}

module.exports = MediaRepository;