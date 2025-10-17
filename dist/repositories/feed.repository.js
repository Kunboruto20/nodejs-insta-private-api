const Repository = require('../core/repository');
const fs = require('fs');

class FeedRepository extends Repository {
  async upload(options) {
    const { imagePath, caption } = options;
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Upload image first
    const uploadResult = await this.client.upload.photo({
      file: imageBuffer,
      uploadId: Date.now()
    });
    
    // Configure as feed post
    const configureResult = await this.client.upload.configurePhoto({
      uploadId: uploadResult.upload_id,
      caption: caption || '',
      source_type: '4',
    });
    
    return configureResult;
  }

  async uploadVideo(options) {
    const { videoPath, caption } = options;
    
    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    
    // Upload video first
    const uploadResult = await this.client.upload.video({
      video: videoBuffer,
      uploadId: Date.now(),
      duration_ms: options.duration_ms || 15000,
      width: options.width || 720,
      height: options.height || 1280,
    });
    
    // Configure as feed post
    const configureResult = await this.client.upload.configureVideo({
      uploadId: uploadResult.upload_id,
      caption: caption || '',
      source_type: '4',
      length: options.duration_ms || 15000,
    });
    
    return configureResult;
  }

  async getFeed(maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/feed/timeline/',
      qs
    });
    
    return response.body;
  }

  async getUserFeed(userId, maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/user/${userId}/`,
      qs
    });
    
    return response.body;
  }

  async getTag(tag, maxId = null) {
    const qs = {
      rank_token: this.client.state.uuid
    };
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/tag/${tag}/`,
      qs
    });
    
    return response.body;
  }

  async getLiked(maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/feed/liked/',
      qs
    });
    
    return response.body;
  }

  async getSaved(maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/feed/saved/',
      qs
    });
    
    return response.body;
  }

  async getLocation(locationId, maxId = null) {
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

  async getExploreFeed(maxId = null) {
    const qs = {
      is_prefetch: false,
      is_from_promote: false,
      timezone_offset: this.client.state.timezoneOffset,
      session_id: this.client.state.clientSessionId,
    };
    
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/discover/explore/',
      qs
    });
    
    return response.body;
  }

  async getReelsFeed(maxId = null) {
    const qs = {};
    if (maxId) {
      qs.max_id = maxId;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/clips/browse/',
      qs
    });
    
    return response.body;
  }

  async uploadCarousel(options) {
    const { items, caption } = options;
    const uploadIds = [];
    
    // Upload all items first
    for (const item of items) {
      if (item.type === 'photo') {
        const imageBuffer = fs.readFileSync(item.path);
        const uploadResult = await this.client.upload.photo({
          file: imageBuffer,
          uploadId: Date.now() + Math.random() * 1000
        });
        uploadIds.push({
          upload_id: uploadResult.upload_id,
          source_type: '4'
        });
      } else if (item.type === 'video') {
        const videoBuffer = fs.readFileSync(item.path);
        const uploadResult = await this.client.upload.video({
          video: videoBuffer,
          uploadId: Date.now() + Math.random() * 1000,
          duration_ms: item.duration_ms || 15000,
          width: item.width || 720,
          height: item.height || 1280,
        });
        uploadIds.push({
          upload_id: uploadResult.upload_id,
          source_type: '4'
        });
      }
    }
    
    // Configure carousel
    const response = await this.client.request.send({
      url: '/api/v1/media/configure_sidecar/',
      method: 'POST',
      form: this.client.request.sign({
        caption: caption || '',
        client_sidecar_id: Date.now(),
        children_metadata: uploadIds,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getStoryFeed() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/feed/reels_tray/',
    });
    
    return response.body;
  }

  async getStoryViewers(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/list_reel_media_viewer/`,
    });
    
    return response.body;
  }

  async getStoryHighlights(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/highlights/${userId}/highlights_tray/`,
    });
    
    return response.body;
  }

  async getStoryHighlightsById(highlightId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/highlights/${highlightId}/highlights_tray/`,
    });
    
    return response.body;
  }

  async getStoryByUser(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/user/${userId}/story/`,
    });
    
    return response.body;
  }

  async getStoryByReelId(reelId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/reels_media/`,
      qs: {
        reel_ids: JSON.stringify([reelId])
      }
    });
    
    return response.body;
  }

  async getStorySeen(reels) {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/media/seen/',
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

  async getStoryReaction(storyId, reaction) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/media/${storyId}/story_interaction/`,
      form: this.client.request.sign({
        media_id: storyId,
        reaction_type: reaction,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getStoryPollVote(storyId, pollId, vote) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/media/${storyId}/story_poll_vote/`,
      form: this.client.request.sign({
        media_id: storyId,
        poll_id: pollId,
        vote: vote,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getStoryQuestionAnswer(storyId, questionId, answer) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/media/${storyId}/story_question_response/`,
      form: this.client.request.sign({
        media_id: storyId,
        question_id: questionId,
        response: answer,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }
}

module.exports = FeedRepository;