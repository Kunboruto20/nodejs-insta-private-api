const Repository = require('../core/repository');
const Chance = require('chance');
const { random } = require('lodash');
const FormData = require('form-data');

class UploadRepository extends Repository {
  constructor(client) {
    super(client);
    this.chance = new Chance();
  }

  async photo(options) {
    const uploadId = options.uploadId || Date.now();
    const name = `${uploadId}_0_${random(1000000000, 9999999999)}`;
    const waterfallId = options.waterfallId || this.chance.guid();
    
    const ruploadParams = this.createPhotoRuploadParams(options, uploadId);
    
    const formData = new FormData();
    formData.append('photo', options.file, { filename: 'photo.jpg' });
    
    const response = await this.client.request.send({
      url: `/rupload_igphoto/${name}`,
      method: 'POST',
      headers: {
        'X-FB-Photo-Waterfall-ID': waterfallId,
        'X-Entity-Type': 'image/jpeg',
        'Offset': '0',
        'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
        'X-Entity-Name': name,
        'X-Entity-Length': options.file.length.toString(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': options.file.length.toString(),
        'Accept-Encoding': 'gzip',
        ...formData.getHeaders(),
      },
      data: options.file,
    });
    
    return response.body;
  }

  async video(options) {
    const uploadId = options.uploadId || Date.now();
    const name = options.uploadName || `${uploadId}_0_${random(1000000000, 9999999999)}`;
    const waterfallId = options.waterfallId || this.chance.guid();
    
    const ruploadParams = this.createVideoRuploadParams(options, uploadId);
    
    const response = await this.client.request.send({
      url: `/rupload_igvideo/${name}`,
      method: 'POST',
      headers: {
        'X-FB-Video-Waterfall-ID': waterfallId,
        'X-Entity-Type': 'video/mp4',
        'Offset': options.offset || '0',
        'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
        'X-Entity-Name': name,
        'X-Entity-Length': options.video.length.toString(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': options.video.length.toString(),
        'Accept-Encoding': 'gzip',
      },
      data: options.video,
    });
    
    return response.body;
  }

  createPhotoRuploadParams(options, uploadId) {
    return {
      retry_context: JSON.stringify({
        num_step_auto_retry: 0,
        num_reupload: 0,
        num_step_manual_retry: 0,
      }),
      media_type: '1',
      xsharing_user_ids: JSON.stringify([]),
      upload_id: uploadId.toString(),
      image_compression: JSON.stringify({
        lib_name: 'moz',
        lib_version: '3.1.m',
        quality: '95',
      }),
    };
  }

  createVideoRuploadParams(options, uploadId) {
    return {
      retry_context: JSON.stringify({
        num_step_auto_retry: 0,
        num_reupload: 0,
        num_step_manual_retry: 0,
      }),
      media_type: '2',
      xsharing_user_ids: JSON.stringify([]),
      upload_id: uploadId.toString(),
      upload_media_duration_ms: options.duration_ms || '0',
      upload_media_width: options.width || '720',
      upload_media_height: options.height || '1280',
      for_album: options.for_album || false,
    };
  }

  async configure(options) {
    const basePayload = {
      upload_id: options.uploadId,
      source_type: options.source_type || '4',
      camera_position: options.camera_position || 'back',
      _csrftoken: this.client.state.cookieCsrfToken,
      _uid: this.client.state.cookieUserId,
      _uuid: this.client.state.uuid,
      creation_logger_session_id: this.chance.guid(),
      device: {
        manufacturer: this.client.state.devicePayload.manufacturer,
        model: this.client.state.devicePayload.model,
        android_version: this.client.state.devicePayload.android_version,
        android_release: this.client.state.devicePayload.android_release,
      },
      length: options.length || 0,
      audio_muted: options.audio_muted || false,
      poster_frame_index: options.poster_frame_index || 0,
      filter_type: options.filter_type || '0',
      video_result: options.video_result || '',
      composition_id: this.chance.guid(),
      clips: options.clips || [
        {
          length: options.length || 0,
          source_type: '4',
          camera_position: 'back',
        },
      ],
    };

    if (options.caption) {
      basePayload.caption = options.caption;
    }

    if (options.location) {
      basePayload.location = JSON.stringify(options.location);
    }

    const response = await this.client.request.send({
      url: '/api/v1/media/configure/',
      method: 'POST',
      form: this.client.request.sign(basePayload),
    });

    return response.body;
  }

  async configureVideo(options) {
    return this.configure({
      ...options,
      video_result: 'deprecated',
    });
  }

  async configurePhoto(options) {
    return this.configure({
      ...options,
      source_type: '4',
    });
  }
}

module.exports = UploadRepository;