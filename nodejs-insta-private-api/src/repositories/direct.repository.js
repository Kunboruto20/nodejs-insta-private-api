const Repository = require('../core/repository');
const fs = require('fs');

class DirectRepository extends Repository {
  async send(options) {
    const { to, message } = options;
    
    // First get user ID from username
    const user = await this.client.user.infoByUsername(to);
    
    // Create or get thread
    const thread = await this.client.directThread.getByParticipants([user.pk]);
    
    // Send message
    return await this.client.directThread.broadcast({
      threadIds: [thread.thread_id],
      item: 'text',
      form: {
        text: message
      }
    });
  }

  async sendImage(options) {
    const { to, imagePath } = options;
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Upload image first
    const uploadResult = await this.client.upload.photo({
      file: imageBuffer,
      uploadId: Date.now()
    });
    
    // Get user and thread
    const user = await this.client.user.infoByUsername(to);
    const thread = await this.client.directThread.getByParticipants([user.pk]);
    
    // Send image
    return await this.client.directThread.broadcast({
      threadIds: [thread.thread_id],
      item: 'configure_photo',
      form: {
        upload_id: uploadResult.upload_id,
        allow_full_aspect_ratio: true,
      }
    });
  }

  async sendVideo(options) {
    const { to, videoPath } = options;
    
    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    
    // Upload video first
    const uploadResult = await this.client.upload.video({
      video: videoBuffer,
      uploadId: Date.now()
    });
    
    // Get user and thread
    const user = await this.client.user.infoByUsername(to);
    const thread = await this.client.directThread.getByParticipants([user.pk]);
    
    // Send video
    return await this.client.directThread.broadcast({
      threadIds: [thread.thread_id],
      item: 'configure_video',
      form: {
        upload_id: uploadResult.upload_id,
        video_result: 'deprecated'
      }
    });
  }

  async getInbox(cursor = null) {
    const qs = {};
    if (cursor) {
      qs.cursor = cursor;
    }
    
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/direct_v2/inbox/',
      qs
    });
    
    return response.body;
  }

  async createGroupThread(recipientUsers, threadTitle) {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/direct_v2/create_group_thread/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        _uid: this.client.state.cookieUserId,
        recipient_users: JSON.stringify(recipientUsers),
        thread_title: threadTitle,
      }),
    });
    
    return response.body;
  }

  async rankedRecipients(mode = 'raven', query = '') {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/direct_v2/ranked_recipients/',
      qs: {
        mode,
        query,
        show_threads: true,
      }
    });
    
    return response.body;
  }

  async getPresence() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/direct_v2/get_presence/',
    });
    
    return response.body;
  }
}

module.exports = DirectRepository;