const Repository = require('../core/repository');

class LiveService extends Repository {
  async create(options = {}) {
    const {
      previewWidth = 720,
      previewHeight = 1280,
      broadcastMessage = '',
    } = options;

    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/live/create/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        preview_width: previewWidth,
        preview_height: previewHeight,
        broadcast_message: broadcastMessage,
      }),
    });
    
    return response.body;
  }

  async start(broadcastId, shouldSendNotifications = false) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/start/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        should_send_notifications: shouldSendNotifications ? '1' : '0',
      }),
    });
    
    return response.body;
  }

  async end(broadcastId, endAfterCopyrightWarning = false) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/end_broadcast/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        end_after_copyright_warning: endAfterCopyrightWarning ? '1' : '0',
      }),
    });
    
    return response.body;
  }

  async info(broadcastId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/live/${broadcastId}/info/`,
    });
    
    return response.body;
  }

  async getViewerList(broadcastId) {
    const response = await this.client.request.send({
      method: 'GET',
      url: `/api/v1/live/${broadcastId}/get_viewer_list/`,
    });
    
    return response.body;
  }

  async comment(broadcastId, message) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/comment/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        user_breadcrumb: this.client.request.userBreadcrumb(message.length),
        idempotence_token: Date.now(),
        comment_text: message,
        live_or_vod: '1',
        offset: '0',
      }),
    });
    
    return response.body;
  }

  async like(broadcastId, likeCount = 1) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/like/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        user_like_count: likeCount,
      }),
    });
    
    return response.body;
  }

  async getHeartbeatAndViewerCount(broadcastId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/heartbeat_and_get_viewer_count/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        offset_to_video_start: '0',
      }),
    });
    
    return response.body;
  }

  async muteComment(broadcastId, userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/mute_comment/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }

  async unmuteComment(broadcastId, userId) {
    const response = await this.client.request.send({
      method: 'POST',
      url: `/api/v1/live/${broadcastId}/unmute_comment/`,
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        user_id: userId,
      }),
    });
    
    return response.body;
  }
}

module.exports = LiveService;