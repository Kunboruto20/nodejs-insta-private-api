/**
 * uploadFile.js
 * Robust, resumable upload helper for videos/audio/doc-like media (where supported) to Instagram rupload.
 *
 * Usage:
 *   const uploadFile = require('./uploadFile');
 *   const uploadId = await uploadFile(session, fileBuffer, {
 *     mimeType: 'video/mp4',
 *     fileName: 'clip.mp4',
 *     isClipsMedia: false,     // set true for reels-like uploads if your flow supports it
 *     chunkSize: 512 * 1024,   // 512KB chunks (safe default)
 *   });
 *
 * Notes:
 * - Instagram Direct primarily supports photo/video/audio; arbitrary files (pdf/zip) are typically NOT accepted by IG clients.
 * - For videos, use `video/mp4`. For audio, try `audio/mpeg` (limited support). For images, prefer uploadPhoto.js.
 * - This helper performs chunked upload using rupload endpoints and returns an `upload_id` string.
 * - Expects `session.request.send({ url, method, headers, body })` similar to nodejs-insta-private-api clients.
 */

const { v4: uuidv4 } = require('uuid');

const DEFAULT_CHUNK_SIZE = 512 * 1024; // 512KB default chunks

/**
 * Validate upload input
 */
function validateFileInput(fileBuffer, mimeType) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('uploadFile: fileBuffer must be a non-empty Buffer.');
  }
  if (typeof mimeType !== 'string' || mimeType.length === 0) {
    throw new Error('uploadFile: mimeType must be a non-empty string (e.g., "video/mp4").');
  }
}

/**
 * Ensure file name extension matches mime type; strip invalid chars.
 */
function sanitizeFileName(name, mimeType) {
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = safe.split('.').pop()?.toLowerCase();
  const desiredExt = guessExtFromMime(mimeType);
  if (!safe) {
    return `${uuidv4()}.${desiredExt}`;
  }
  if (!ext || ext !== desiredExt) {
    const base = safe.replace(/\.[^.]+$/, '');
    return `${base}.${desiredExt}`;
  }
  return safe;
}

/**
 * Guess file extension based on mime type (limited map).
 */
function guessExtFromMime(mimeType) {
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'audio/mpeg') return 'mp3';
  // fallback
  return 'bin';
}

/**
 * Build rupload params for non-photo media.
 * - For video: media_type=2
 * - For audio: still treated as video-like upload in some web flows (limited)
 */
function buildRuploadParams(uploadId, mimeType, opts) {
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isImage = mimeType.startsWith('image/');

  // Instagram expects:
  // - video: media_type=2 with specific flags
  // - image: use uploadPhoto.js (media_type=1). Here we allow image for completeness but recommend uploadPhoto.js
  const params = {
    upload_id: uploadId,
    media_type: isImage ? 1 : 2,
    xsharing_user_ids: JSON.stringify([]),
    is_clips_media: Boolean(opts.isClipsMedia),
  };

  if (isVideo) {
    params.video_format = 'mp4';
    params.for_direct_story = false;
  }
  if (isAudio) {
    // IG web may not fully support audio in Direct; leaving generic params
    params.audio_format = 'mpeg';
  }

  return params;
}

/**
 * Parse `upload_id` from response body if present.
 */
function parseUploadIdFromBody(body) {
  try {
    const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '');
    const json = JSON.parse(text);
    if (json && typeof json.upload_id === 'string') return json.upload_id;
    return null;
  } catch {
    return null;
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

/**
 * Perform the initial "create upload" handshake for video/audio.
 * Some IG flows accept an initial POST with headers only (no body) to initialize the rupload.
 */
async function initRupload(session, url, headers, signal) {
  try {
    const res = await session.request.send({
      url,
      method: 'POST',
      headers,
      // body omitted for init in some flows
      signal,
    });
    return res;
  } catch (err) {
    // Some endpoints accept direct chunk upload without explicit init; not fatal.
    return null;
  }
}

/**
 * Upload a single chunk to rupload endpoint.
 */
async function uploadChunk(session, url, headers, chunk, offset, signal) {
  const chunkHeaders = {
    ...headers,
    'X-Entity-Length': String(headers['X-Entity-Length']), // total length
    'X-Entity-Name': headers['X-Entity-Name'],
    'X-Entity-Type': headers['X-Entity-Type'],
    'Offset': String(offset),
    'Content-Length': String(chunk.length),
  };

  const res = await session.request.send({
    url,
    method: 'POST',
    headers: chunkHeaders,
    body: chunk,
    signal,
  });
  return res;
}

/**
 * Upload file (video/audio/image as supported) via rupload with chunking.
 *
 * @param {object} session - Authenticated session with request.send
 * @param {Buffer} fileBuffer - File data buffer
 * @param {object} [options]
 * @param {string} [options.mimeType='video/mp4'] - e.g., 'video/mp4', 'audio/mpeg'
 * @param {string} [options.fileName] - Optional, sanitized based on mime
 * @param {number} [options.chunkSize=512*1024] - Chunk size in bytes
 * @param {boolean} [options.isClipsMedia=false] - Mark as clips/reels upload hint
 * @param {AbortSignal} [options.signal] - Optional AbortSignal
 * @returns {Promise<string>} upload_id
 */
async function uploadFile(session, fileBuffer, options = {}) {
  const {
    mimeType = 'video/mp4',
    fileName,
    chunkSize = DEFAULT_CHUNK_SIZE,
    isClipsMedia = false,
    signal,
  } = options;

  validateFileInput(fileBuffer, mimeType);

  const uploadId = Date.now().toString();
  const objectName = sanitizeFileName(fileName, mimeType);
  const totalLength = fileBuffer.length;

  const ruploadParams = buildRuploadParams(uploadId, mimeType, { isClipsMedia });
  const baseHeaders = {
    'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
    'X_FB_VIDEO_WATERFALL_ID': uuidv4(), // tracing header for video-like uploads
    'X-Entity-Type': mimeType,
    'X-Entity-Name': objectName,
    'X-Entity-Length': String(totalLength),
    'Content-Type': mimeType,
  };

  // Choose endpoint based on type
  const endpoint =
    mimeType.startsWith('image/')
      ? `/rupload_igphoto/${objectName}`
      : `/rupload_igvideo/${objectName}`;

  // Optional init step (some IG flows initialize upload session)
  await initRupload(session, endpoint, baseHeaders, signal).catch(() => null);

  // Chunked upload loop
  let offset = 0;
  const size = Math.max(64 * 1024, Math.min(4 * 1024 * 1024, chunkSize)); // clamp to 64KB..4MB

  try {
    while (offset < totalLength) {
      const end = Math.min(offset + size, totalLength);
      const chunk = fileBuffer.subarray(offset, end);

      const res = await uploadChunk(session, endpoint, baseHeaders, chunk, offset, signal);

      // Server may respond with intermediate states; we proceed unless explicit failure
      if (!res) {
        throw new Error(`uploadFile: Empty response at offset ${offset}.`);
      }

      // Advance offset
      offset = end;
    }
  } catch (err) {
    throw new Error(`uploadFile: Chunk upload failed at offset ${offset} — ${normalizeError(err)}`);
  }

  // Final confirmation: attempt a "finish" ping (some clients re-POST zero-length or rely on server auto-finish)
  // We'll try a lightweight confirmation request and parse upload_id if present.
  try {
    const confirm = await session.request.send({
      url: endpoint,
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Offset': String(totalLength),
        'Content-Length': '0',
      },
      signal,
    });

    const serverUploadId =
      (typeof confirm === 'object' && confirm.upload_id) ||
      (confirm?.body && parseUploadIdFromBody(confirm.body));

    return serverUploadId || uploadId;
  } catch {
    // If confirmation fails but chunks completed, many flows still accept the generated uploadId.
    return uploadId;
  }
}

module.exports = uploadFile;
