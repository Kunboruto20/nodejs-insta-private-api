const Repository = require('../core/repository');
const fs = require('fs');

class StoryRepository extends Repository {
  async react(options) {
    const { storyId, reaction } = options;
    
    const response = await this.client.request.send({
      url: `/api/v1/media/${storyId}/story_react/`,
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
        reaction_type: 'like',
        emoji: reaction || '❤️',
      }),
    });
    
    return response.body;
  }

  async getFeed() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/feed/reels_tray/',
    });
    
    return response.body;
  }

  async getUser(userId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/feed/user/${userId}/reel_media/`,
    });
    
    return response.body;
  }

  async upload(options) {
    const { imagePath, caption } = options;
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Upload image first
    const uploadResult = await this.client.upload.photo({
      file: imageBuffer,
      uploadId: Date.now()
    });
    
    // Configure as story
    const configureResult = await this.client.upload.configure({
      uploadId: uploadResult.upload_id,
      source_type: '4',
      configure_mode: 1, // Story mode
      caption: caption || '',
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
    
    // Configure as story
    const configureResult = await this.client.upload.configureVideo({
      uploadId: uploadResult.upload_id,
      source_type: '4',
      configure_mode: 1, // Story mode
      caption: caption || '',
      length: options.duration_ms || 15000,
    });
    
    return configureResult;
  }

  async seen(input, sourceId = null) {
    let items = [];
    
    if (Array.isArray(input)) {
      items = input;
    } else {
      // Flatten reels object to items array
      items = Object.values(input).reduce((acc, reel) => acc.concat(reel.items), []);
    }
    
    const reels = {};
    const maxSeenAt = Math.floor(Date.now() / 1000);
    let seenAt = maxSeenAt - items.length;
    
    for (const item of items) {
      const itemTakenAt = item.taken_at;
      
      if (seenAt < itemTakenAt) {
        seenAt = itemTakenAt + 1;
      }
      if (seenAt > maxSeenAt) {
        seenAt = maxSeenAt;
      }
      
      const itemSourceId = sourceId === null ? item.user.pk : sourceId;
      const reelId = `${item.id}_${itemSourceId}`;
      reels[reelId] = [`${itemTakenAt}_${seenAt}`];
      
      seenAt += 1;
    }
    
    return this.client.media.seen(reels);
  }

  async getHighlights(userId) {
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

  async viewers(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/list_reel_media_viewer/`,
    });
    
    return response.body;
  }
}

module.exports = StoryRepository;