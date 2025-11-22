/**
 * sendFile.js
 * High-level helper to send uploaded video/audio/image files to Instagram Direct (DM or existing thread).
 *
 * Requires:
 *  - uploadFile(session, fileBuffer, options) from ./uploadFile
 *
 * Supports:
 *  - Send to a single user by userId (recipient_users)
 *  - Send to an existing thread (group or DM) by threadId
 *  - Optional caption
 *  - Optional mentions (array of userIds) embedded in caption
 *  - Custom mimeType/fileName/chunkSize/isClipsMedia forwarded to uploadFile
 *
 * Usage:
 *   const sendFile = require('./sendFile');
 *   await sendFile(session, {
 *     fileBuffer: fs.readFileSync('./clip.mp4'),
 *     mimeType: 'video/mp4',
 *     fileName: 'clip.mp4',
 *     userId: '123456789',            // or threadId: '340282366841710300949128123456789'
 *     caption: 'Uite clipul!',
 *   });
 *
 * Notes:
 *  - Exactly one of { userId, threadId } must be provided.
 *  - For photos (JPEG/PNG), you can still use this with mimeType 'image/jpeg' or 'image/png',
 *    but uploadPhoto.js + sendPhoto.js is preferred for image-specific flows.
 */

const uploadFile = require('./uploadfFile');

/**
 * @typedef {Object} SendFileOptions
 * @property {Buffer} fileBuffer - Required Buffer data
 * @property {string} [mimeType='video/mp4'] - e.g., 'video/mp4', 'audio/mpeg', 'image/jpeg'
 * @property {string} [fileName] - Optional file name; sanitized based on mime
 * @property {number} [chunkSize] - Optional chunk size for uploadFile
 * @property {boolean} [isClipsMedia=false] - Hint for reels-like uploads (if your flow supports it)
 * @property {string} [caption] - Optional caption text
 * @property {string} [userId] - Send to user (DM) — exactly one of userId or threadId
 * @property {string} [threadId] - Send to existing thread (group or DM) — exactly one of userId or threadId
 * @property {string[]} [mentions] - Optional array of userIds mentioned in caption
 * @property {AbortSignal} [signal] - Optional AbortSignal to cancel
 */

/**
 * Send a file (video/audio/image) to Instagram Direct.
 * Internally:
 *  - Uploads via rupload to get upload_id
 *  - Broadcasts the uploaded media to either a user (DM) or an existing thread
 *
 * @param {object} session - Authenticated session (with request.send)
 * @param {SendFileOptions} opts - Options
 * @returns {Promise<object>} Instagram response object
 */
async function sendFile(session, opts = {}) {
  const {
    fileBuffer,
    mimeType = 'video/mp4',
    fileName,
    chunkSize,
    isClipsMedia = false,
    caption = '',
    userId,
    threadId,
    mentions = [],
    signal,
  } = opts;

  // Validate destination
  if (!userId && !threadId) {
    throw new Error('sendFile: You must provide either userId (DM) or threadId (existing thread).');
  }
  if (userId && threadId) {
    throw new Error('sendFile: Provide only one destination — userId OR threadId, not both.');
  }
  // Validate buffer
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('sendFile: fileBuffer must be a non-empty Buffer.');
  }
  if (typeof mimeType !== 'string' || mimeType.length === 0) {
    throw new Error('sendFile: mimeType must be a non-empty string (e.g., "video/mp4").');
  }

  // 1) Upload file to get upload_id
  const upload_id = await uploadFile(session, fileBuffer, {
    mimeType,
    fileName,
    chunkSize,
    isClipsMedia,
    signal,
  });

  // 2) Build base form payload
  const form = {
    upload_id,
    action: 'send_item',
    caption,
  };

  // 3) Mentions (optional)
  if (Array.isArray(mentions) && mentions.length > 0) {
    form.entities = JSON.stringify(
      mentions.map((uid) => ({
        user_id: String(uid),
        type: 'mention',
      }))
    );
  }

  // 4) Destination-specific fields
  // For video/audio/image via this flow, IG uses the "upload_video" broadcast endpoint.
  // Images can also be sent via upload_photo (recommended via sendPhoto.js).
  const url = '/direct_v2/threads/broadcast/upload_video/';
  if (userId) {
    form.recipient_users = JSON.stringify([[String(userId)]]);
  } else {
    form.thread_ids = JSON.stringify([String(threadId)]);
  }

  // 5) Send broadcast request
  try {
    const response = await session.request.send({
      url,
      method: 'POST',
      form,
      signal,
    });

    if (!response) {
      throw new Error('sendFile: Empty response from Instagram broadcast endpoint.');
    }
    return response;
  } catch (err) {
    throw new Error(`sendFile: Broadcast failed — ${normalizeError(err)}`);
  }
}

/**
 * Normalize error shapes to readable text.
 */
function normalizeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unserializable error';
  }
}

module.exports = sendFile;
