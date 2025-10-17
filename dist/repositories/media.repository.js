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

  async likeComment(commentId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${commentId}/comment_like/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async unlikeComment(commentId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${commentId}/comment_unlike/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async save(mediaId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/save/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async unsave(mediaId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/unsave/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async report(mediaId, reason = 'spam') {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/report/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        reason: reason,
      }),
    });
    
    return response.body;
  }

  async getPermalink(mediaId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/permalink/`,
      method: 'GET',
    });
    
    return response.body;
  }

  async getLikers(mediaId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      url: `/api/v1/media/${mediaId}/likers/`,
      method: 'GET',
      qs
    });
    
    return response.body;
  }

  async getCommentLikers(commentId) {
    const response = await this.client.request.send({
      url: `/api/v1/media/${commentId}/comment_likers/`,
      method: 'GET',
    });
    
    return response.body;
  }

  async getMediaByHashtag(hashtag, maxId = null) {
    const qs = {
      tag_name: hashtag,
      count: 12
    };
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      url: '/api/v1/tags/media/recent/',
      method: 'GET',
      qs
    });
    
    return response.body;
  }

  async getMediaByLocation(locationId, maxId = null) {
    const qs = {
      location_id: locationId,
      count: 12
    };
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      url: '/api/v1/locations/media/recent/',
      method: 'GET',
      qs
    });
    
    return response.body;
  }
}

module.exports = MediaRepository;