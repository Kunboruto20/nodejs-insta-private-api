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

  async createHighlight(options) {
    const { mediaIds, title, coverMediaId } = options;
    
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/highlights/create_highlight/',
      form: this.client.request.sign({
        media_ids: JSON.stringify(mediaIds),
        title: title,
        cover_media_id: coverMediaId || mediaIds[0],
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async editHighlight(highlightId, options) {
    const { title, coverMediaId } = options;
    
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/edit_highlight/`,
      form: this.client.request.sign({
        title: title,
        cover_media_id: coverMediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async deleteHighlight(highlightId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/delete_highlight/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async addToHighlight(highlightId, mediaId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/add_media/`,
      form: this.client.request.sign({
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async removeFromHighlight(highlightId, mediaId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/highlights/${highlightId}/remove_media/`,
      form: this.client.request.sign({
        media_id: mediaId,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getStoryPoll(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/story_poll/`,
    });
    
    return response.body;
  }

  async voteStoryPoll(storyId, pollId, vote) {
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

  async getStoryQuestion(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/story_question/`,
    });
    
    return response.body;
  }

  async answerStoryQuestion(storyId, questionId, answer) {
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

  async getStoryQuiz(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/story_quiz/`,
    });
    
    return response.body;
  }

  async answerStoryQuiz(storyId, quizId, answer) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/media/${storyId}/story_quiz_answer/`,
      form: this.client.request.sign({
        media_id: storyId,
        quiz_id: quizId,
        answer: answer,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }

  async getStoryCountdown(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/story_countdown/`,
    });
    
    return response.body;
  }

  async getStorySlider(storyId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/media/${storyId}/story_slider/`,
    });
    
    return response.body;
  }

  async voteStorySlider(storyId, sliderId, value) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/media/${storyId}/story_slider_vote/`,
      form: this.client.request.sign({
        media_id: storyId,
        slider_id: sliderId,
        value: value,
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        _uuid: this.client.state.uuid,
      }),
    });
    
    return response.body;
  }
}

module.exports = StoryRepository;