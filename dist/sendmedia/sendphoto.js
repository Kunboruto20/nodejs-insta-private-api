/**
 * sendPhoto.js
 * High-level helper to send a previously uploaded photo to Instagram Direct (DM or Group).
 *
 * Requires:
 *  - uploadPhoto(session, photoBuffer, options) from ./uploadPhoto
 *
 * Supports:
 *  - Send to a single user by userId (recipient_users)
 *  - Send to an existing thread (group) by threadId
 *  - Optional caption
 *  - Optional mentions (array of userIds) embedded in caption
 *
 * Usage:
 *   const sendPhoto = require('./sendPhoto');
 *   await sendPhoto(session, {
 *     photoBuffer: fs.readFileSync('./image.jpg'),
 *     userId: '123456789',            // or threadId: '340282366841710300949128123456789'
 *     caption: 'Salut! 👋',
 *   });
 *
 * Notes:
 *  - If you pass userId, it broadcasts to that user (DM).
 *  - If you pass threadId, it broadcasts into that existing thread (group or DM thread).
 *  - Exactly one of { userId, threadId } must be provided.
 */

const uploadPhoto = require('./uploadPhoto');

/**
 * @typedef {Object} SendPhotoOptions
 * @property {Buffer} photoBuffer - Required image buffer (JPEG/PNG)
 * @property {string} [mimeType='image/jpeg'] - 'image/jpeg' | 'image/png'
 * @property {string} [fileName] - Optional file name (will be sanitized)
 * @property {string} [caption] - Optional caption text
 * @property {string} [userId] - Send to user (DM) — exactly one of userId or threadId
 * @property {string} [threadId] - Send to existing thread (group or DM) — exactly one of userId or threadId
 * @property {string[]} [mentions] - Optional array of userIds mentioned in caption
 * @property {AbortSignal} [signal] - Optional AbortSignal to cancel
 */

/**
 * Send a photo to Instagram Direct.
 * Internally:
 *  - Uploads photo via rupload to get upload_id
 *  - Broadcasts the uploaded photo to either a user (DM) or an existing thread
 *
 * @param {object} session - Authenticated session (with request.send)
 * @param {SendPhotoOptions} opts - Options
 * @returns {Promise<object>} Instagram response object
 */
async function sendPhoto(session, opts = {}) {
  const {
    photoBuffer,
    mimeType = 'image/jpeg',
    fileName,
    caption = '',
    userId,
    threadId,
    mentions = [],
    signal,
  } = opts;

  // Validate destination
  if (!userId && !threadId) {
    throw new Error('sendPhoto: You must provide either userId (DM) or threadId (existing thread).');
  }
  if (userId && threadId) {
    throw new Error('sendPhoto: Provide only one destination — userId OR threadId, not both.');
  }
  // Validate photo buffer
  if (!photoBuffer || !Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
    throw new Error('sendPhoto: photoBuffer must be a non-empty Buffer.');
  }

  // 1) Upload photo to get upload_id
  const upload_id = await uploadPhoto(session, photoBuffer, { mimeType, fileName, signal });

  // 2) Build base form payload
  const form = {
    upload_id,
    action: 'send_item',
    // Optional caption field
    caption,
  };

  // 3) Mentions (optional): IG expects entities when caption includes mentions
  // This is a basic structure; adjust offsets if you programmatically embed @handles into caption.
  if (Array.isArray(mentions) && mentions.length > 0) {
    form.entities = JSON.stringify(
      mentions.map((uid) => ({
        // Simple entity type for user mention; offsets require matching caption positions
        // If you don't compute offsets, IG may still accept the payload without entities.
        // Providing user_id can help IG recognize mentions linked to caption text.
        user_id: String(uid),
        type: 'mention',
      }))
    );
  }

  // 4) Destination-specific fields
  let url;
  if (userId) {
    // DM to user: recipient_users is an array-of-arrays of userIds as strings
    url = '/direct_v2/threads/broadcast/upload_photo/';
    form.recipient_users = JSON.stringify([[String(userId)]]);
  } else {
    // Existing thread: use thread id
    url = '/direct_v2/threads/broadcast/upload_photo/';
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
      throw new Error('sendPhoto: Empty response from Instagram broadcast endpoint.');
    }
    return response;
  } catch (err) {
    throw new Error(`sendPhoto: Broadcast failed — ${normalizeError(err)}`);
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

module.exports = sendPhoto;
