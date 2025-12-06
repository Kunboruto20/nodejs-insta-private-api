// Utils.js
// Big, comprehensive utility module for nodejs-insta-private-api style libraries.
// CommonJS module.
//
// NOTE: Depends only on Node built-ins: crypto, fs, path, os, util, zlib
// If you want additional features (image resizing, filesystem vault, secure storage),
// tell me and I can add optional integration points.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const zlib = require('zlib');

const pipeline = util.promisify(require('stream').pipeline);
const pbkdf2 = util.promisify(crypto.pbkdf2);
const scrypt = util.promisify(crypto.scrypt);

const DEFAULT_ENCODING = 'utf8';

class Utils {
  /* -------------------------
     Basic randomness & ids
     ------------------------- */

  // Use crypto.randomUUID if available (Node 14.17+), else fallback
  static generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    // fallback RFC4122 v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (crypto.randomBytes(1)[0] & 0xf) >>> 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Cryptographically secure random string (alphanumeric)
  static generateRandomString(length = 32) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let str = '';
    for (let i = 0; i < length; i++) {
      str += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return str;
  }

  // Secure random hex
  static generateRandomHex(length = 16) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  static generateDeviceId() {
    // Android-like device id
    return 'android-' + this.generateRandomHex(16);
  }

  static generatePhoneId() {
    return this.generateUUID();
  }

  static generateAdId() {
    return this.generateUUID();
  }

  // Device fingerprint: lightweight deterministic fingerprint from device object
  static generateDeviceFingerprint(device = {}) {
    const fields = [
      device.manufacturer || '',
      device.model || '',
      device.android_release || '',
      device.cpu || '',
      device.resolution || '',
      device.dpi || ''
    ].join('|');
    return this.sha256(fields).substr(0, 32);
  }

  /* -------------------------
     Random ints and helpers
     ------------------------- */

  static secureRandomInt(min = 0, max = 1) {
    // inclusive
    if (min > max) [min, max] = [max, min];
    const range = max - min + 1;
    if (range <= 0) return min;
    const randBytes = crypto.randomBytes(4).readUInt32BE(0);
    return min + (randBytes % range);
  }

  static randomInt(min, max) {
    // non-crypto fallback (for performance), keep available
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* -------------------------
     Timing utilities
     ------------------------- */

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static randomDelay(min = 1000, max = 3000) {
    return this.sleep(this.secureRandomInt(min, max));
  }

  static getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  static getTimestampMs() {
    return Date.now();
  }

  /* -------------------------
     Hashing & HMAC
     ------------------------- */

  static md5(data) {
    return crypto.createHash('md5').update(String(data)).digest('hex');
  }

  static sha1(data) {
    return crypto.createHash('sha1').update(String(data)).digest('hex');
  }

  static sha256(data) {
    return crypto.createHash('sha256').update(String(data)).digest('hex');
  }

  static sha512(data) {
    return crypto.createHash('sha512').update(String(data)).digest('hex');
  }

  static hmacSha1(data, key, out = 'hex') {
    return crypto.createHmac('sha1', String(key)).update(String(data)).digest(out);
  }

  static hmacSha256(data, key, out = 'hex') {
    return crypto.createHmac('sha256', String(key)).update(String(data)).digest(out);
  }

  static hmacSha512(data, key, out = 'hex') {
    return crypto.createHmac('sha512', String(key)).update(String(data)).digest(out);
  }

  /* -------------------------
     Base64 helpers
     ------------------------- */

  static base64Encode(data) {
    if (Buffer.isBuffer(data)) return data.toString('base64');
    return Buffer.from(String(data), DEFAULT_ENCODING).toString('base64');
  }

  static base64Decode(data) {
    return Buffer.from(String(data), 'base64').toString(DEFAULT_ENCODING);
  }

  static base64UrlEncode(data) {
    return this.base64Encode(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static base64UrlDecode(data) {
    let s = String(data).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return this.base64Decode(s);
  }

  /* -------------------------
     Symmetric encryption (AES-GCM)
     ------------------------- */

  static aesGcmEncrypt(plainText, key) {
    // key: Buffer or hex string of 32 bytes (256 bit)
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plainText), DEFAULT_ENCODING), cipher.final()]);
    const tag = cipher.getAuthTag();
    // return iv + tag + ciphertext in base64
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  static aesGcmDecrypt(b64Payload, key) {
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'hex');
    const data = Buffer.from(String(b64Payload), 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString(DEFAULT_ENCODING);
  }

  // AES-CBC with PKCS#7 (for legacy)
  static aesCbcEncrypt(plainText, key, iv = null) {
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'hex');
    iv = iv ? (Buffer.isBuffer(iv) ? iv : Buffer.from(String(iv), 'hex')) : crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plainText), DEFAULT_ENCODING), cipher.final()]);
    return Buffer.concat([iv, ciphertext]).toString('base64');
  }

  static aesCbcDecrypt(b64Payload, key) {
    const data = Buffer.from(String(b64Payload), 'base64');
    const iv = data.slice(0, 16);
    const ciphertext = data.slice(16);
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString(DEFAULT_ENCODING);
  }

  /* -------------------------
     RSA helpers
     ------------------------- */

  static rsaGenerateKeyPairSync(modulusLength = 2048) {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength,
      publicExponent: 0x10001,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
  }

  static rsaEncrypt(publicKeyPem, text) {
    return crypto.publicEncrypt({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(String(text))).toString('base64');
  }

  static rsaDecrypt(privateKeyPem, b64payload) {
    const buf = Buffer.from(String(b64payload), 'base64');
    return crypto.privateDecrypt({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buf).toString(DEFAULT_ENCODING);
  }

  /* -------------------------
     Key derivation
     ------------------------- */

  static async pbkdf2Derive(password, salt, iterations = 100000, keylen = 32, digest = 'sha256') {
    const derived = await pbkdf2(String(password), String(salt), iterations, keylen, digest);
    return derived.toString('hex');
  }

  static async scryptDerive(password, salt, keylen = 32) {
    const derived = await scrypt(String(password), String(salt), keylen);
    return derived.toString('hex');
  }

  /* -------------------------
     JSON / file helpers (atomic)
     ------------------------- */

  static safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  static safeJsonStringify(obj, replacer = null, space = 2) {
    // scrub functions or Buffer
    return JSON.stringify(obj, replacer, space);
  }

  static ensureDirExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static readJsonFile(filePath, fallback = null) {
    try {
      const raw = fs.readFileSync(filePath, DEFAULT_ENCODING);
      return this.safeJsonParse(raw, fallback);
    } catch (e) {
      return fallback;
    }
  }

  static writeJsonFileAtomic(filePath, data, opt = {}) {
    const tmp = `${filePath}.${process.pid}.${this.generateRandomHex(6)}.tmp`;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const json = typeof data === 'string' ? data : this.safeJsonStringify(data, null, opt.space || 2);
    fs.writeFileSync(tmp, json, { encoding: DEFAULT_ENCODING, mode: 0o600 });
    fs.renameSync(tmp, filePath);
    return true;
  }

  /* -------------------------
     Session helpers (convenience)
     ------------------------- */

  static readSession(sessionFile) {
    return this.readJsonFile(sessionFile, {});
  }

  static saveSession(sessionFile, sessionObject) {
    return this.writeJsonFileAtomic(sessionFile, sessionObject, { space: 2 });
  }

  static removeSession(sessionFile) {
    try {
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* -------------------------
     Cookies & headers
     ------------------------- */

  static parseSetCookieHeader(setCookieHeader) {
    // Accept single header or array
    const arr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cookies = {};
    for (const hdr of arr) {
      if (!hdr) continue;
      const parts = hdr.split(';').map(s => s.trim());
      const [k, v] = parts[0].split('=');
      if (!k) continue;
      cookies[k] = decodeURIComponent(v || '');
    }
    return cookies;
  }

  static serializeCookie(name, value, options = {}) {
    let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (options.maxAge) s += `; Max-Age=${options.maxAge}`;
    if (options.domain) s += `; Domain=${options.domain}`;
    if (options.path) s += `; Path=${options.path}`;
    if (options.expires) s += `; Expires=${options.expires.toUTCString()}`;
    if (options.httpOnly) s += '; HttpOnly';
    if (options.secure) s += '; Secure';
    if (options.sameSite) s += `; SameSite=${options.sameSite}`;
    return s;
  }

  static mergeCookieObjects(...cookieObjs) {
    return Object.assign({}, ...cookieObjs);
  }

  static buildCookieHeader(cookieObj) {
    return Object.entries(cookieObj).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  }

  static buildHeaders({ userAgent, csrfToken, referer, extra = {} } = {}) {
    const base = {
      'User-Agent': userAgent || this.formatUserAgent('401.0.0.48.79', 'Pixel', 'en_US', '40104879'),
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      ...extra
    };
    if (csrfToken) base['X-CSRFToken'] = csrfToken;
    if (referer) base['Referer'] = referer;
    return base;
  }

  /* -------------------------
     User agent builders
     ------------------------- */

  static formatUserAgent(appVersion = '401.0.0.48.79', deviceString = 'Pixel 5', language = 'en_US', appVersionCode = '40104879') {
    return `Instagram ${appVersion} Android (${deviceString}; ${language}; ${appVersionCode})`;
  }

  static formatWebUserAgent(devicePayload = {}, build = 'OPM1', appUserAgent = '') {
    return `Mozilla/5.0 (Linux; Android ${devicePayload.android_release || '11'}; ${devicePayload.model || 'Pixel'}) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36 ${appUserAgent}`;
  }

  static createUserAgentFromDevice(device = {}) {
    return `Instagram ${device.appVersion || '401.0.0.48.79'} Android (${device.android_version || device.android_release || '11'}/${device.android_release || '11'}; ${device.dpi || ''}dpi; ${device.resolution || '1080x1920'}; ${device.manufacturer || 'Google'}; ${device.model || 'Pixel'}; ${device.device || 'walleye'}; ${device.cpu || 'arm64-v8a'})`;
  }

  /* -------------------------
     Error handling/humanize
     ------------------------- */

  static humanizeError(error) {
    if (!error) return 'Unknown error';
    const name = error.name || (error.code ? String(error.code) : null);
    const message = error.message || String(error);
    const map = {
      'IgLoginBadPasswordError': 'The password you entered is incorrect. Please check your password and try again.',
      'IgLoginInvalidUserError': "The username you entered doesn't appear to belong to an account. Please check your username and try again.",
      'IgLoginTwoFactorRequiredError': 'Two-factor authentication is required. Please enter the verification code.',
      'IgCheckpointError': 'Instagram requires additional verification. Please complete the security challenge.',
      'IgActionSpamError': 'This action has been blocked by Instagram\'s spam detection. Please try again later.',
      'IgNotFoundError': 'The requested content could not be found.',
      'IgPrivateUserError': 'This account is private. You must follow this user to see their content.',
      'IgUserHasLoggedOutError': 'Your session has expired. Please log in again.',
      'IgInactiveUserError': 'This account is inactive or has been suspended.',
      'IgSentryBlockError': 'This request has been blocked by Instagram\'s security system.',
      'IgNetworkError': 'A network error occurred. Please check your internet connection and try again.',
      'IgUploadError': 'Failed to upload the file. Please check the file format and size.',
      'IgConfigureMediaError': 'Failed to configure the media. Please try again.',
    };
    return map[name] || message;
  }

  static parseInstagramError(responseBody) {
    // safe parse for common Instagram error shapes
    try {
      const body = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      if (!body) return null;
      if (body.message && body.status) return { message: body.message, status: body.status, error: body.error || null };
      if (body.error_type || body.error_message) return { message: body.error_message || body.error_type, status: 'fail' };
      if (body.errors) return { message: JSON.stringify(body.errors), status: 'fail' };
      return { message: JSON.stringify(body), status: 'unknown' };
    } catch (e) {
      return { message: String(responseBody), status: 'unknown' };
    }
  }

  /* -------------------------
     File & media helpers
     ------------------------- */

  static validateFileSize(filePath, maxSizeBytes) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

  static getFileExtension(filePath) {
    return (filePath || '').split('.').pop().toLowerCase();
  }

  static isImageFile(filePath) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'];
    const extension = this.getFileExtension(filePath);
    return imageExtensions.includes(extension);
  }

  static isVideoFile(filePath) {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp', 'mpeg'];
    const extension = this.getFileExtension(filePath);
    return videoExtensions.includes(extension);
  }

  static mimeTypeForExtension(ext) {
    const m = (ext || '').toLowerCase();
    const map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html'
    };
    return map[m] || 'application/octet-stream';
  }

  /* -------------------------
     Arrays, chunking, flattening
     ------------------------- */

  static chunkArray(array, chunkSize) {
    if (!Array.isArray(array) || chunkSize <= 0) return [];
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static flattenArray(arr) {
    return arr.reduce((acc, v) => acc.concat(Array.isArray(v) ? this.flattenArray(v) : v), []);
  }

  /* -------------------------
     Retry/backoff utilities
     ------------------------- */

  static async retryOperation(operation, maxRetries = 5, baseDelay = 500, jitter = true, onRetry = null) {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) throw err;
        let delay = baseDelay * Math.pow(2, attempt - 1);
        if (jitter) {
          const jitterMs = this.secureRandomInt(0, Math.floor(delay * 0.5));
          delay = Math.max(0, delay - jitterMs);
        }
        if (typeof onRetry === 'function') {
          try { onRetry(attempt, err, delay); } catch (e) {}
        }
        await this.sleep(delay);
      }
    }
  }

  static backoffGenerator({ base = 500, factor = 2, max = 60000, jitter = true } = {}) {
    let attempt = 0;
    return () => {
      attempt++;
      let delay = Math.min(max, Math.floor(base * Math.pow(factor, attempt - 1)));
      if (jitter) delay = Math.floor(delay * (0.5 + Math.random() * 0.5));
      return delay;
    };
  }

  /* -------------------------
     Concurrency helpers: Promise pool, semaphore
     ------------------------- */

  static async promisePool(items = [], workerFn, concurrency = 5) {
    const results = [];
    let idx = 0;
    const next = async () => {
      while (idx < items.length) {
        const current = idx++;
        try {
          results[current] = await workerFn(items[current], current);
        } catch (err) {
          results[current] = { error: err };
        }
      }
    };
    const workers = [];
    for (let i = 0; i < Math.max(1, concurrency); i++) workers.push(next());
    await Promise.all(workers);
    return results;
  }

  static createSemaphore(max = 1) {
    let counter = max;
    const waiting = [];
    return {
      async acquire() {
        if (counter > 0) {
          counter -= 1;
          return () => {
            counter += 1;
            if (waiting.length > 0) {
              const next = waiting.shift();
              next();
            }
          };
        }
        return new Promise(resolve => {
          waiting.push(() => {
            counter -= 1;
            resolve(() => {
              counter += 1;
              if (waiting.length > 0) {
                const next = waiting.shift();
                next();
              }
            });
          });
        });
      },
      available() { return counter; }
    };
  }

  /* -------------------------
     Rate limiter: Token bucket
     ------------------------- */

  static createTokenBucket({ capacity = 10, refillRate = 1 } = {}) {
    // refillRate tokens per second
    let tokens = capacity;
    let last = Date.now();
    return {
      consume(amount = 1) {
        const now = Date.now();
        const elapsed = (now - last) / 1000;
        last = now;
        tokens = Math.min(capacity, tokens + elapsed * refillRate);
        if (tokens >= amount) {
          tokens -= amount;
          return true;
        }
        return false;
      },
      waitForToken(timeoutMs = 60000) {
        return new Promise((resolve, reject) => {
          const start = Date.now();
          const tryConsume = () => {
            if (this.consume()) {
              resolve(true);
            } else if (Date.now() - start >= timeoutMs) {
              reject(new Error('Timeout waiting for token'));
            } else {
              setTimeout(tryConsume, 100);
            }
          };
          tryConsume();
        });
      },
      getTokens() { return tokens; },
    };
  }

  /* -------------------------
     Debounce / Throttle
     ------------------------- */

  static debounce(fn, wait = 200) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  static throttle(fn, wait = 200) {
    let last = 0;
    let timer = null;
    return function(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer);
        timer = null;
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

  /* -------------------------
     Text / hex helpers
     ------------------------- */

  static toHex(str) {
    return Buffer.from(String(str), DEFAULT_ENCODING).toString('hex');
  }

  static fromHex(hex) {
    return Buffer.from(String(hex), 'hex').toString(DEFAULT_ENCODING);
  }

  /* -------------------------
     URL / querystring helpers
     ------------------------- */

  static parseQueryString(qs) {
    if (!qs) return {};
    return String(qs).split('&').reduce((acc, part) => {
      const [k, v] = part.split('=');
      if (!k) return acc;
      acc[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
      return acc;
    }, {});
  }

  static buildQueryString(obj = {}) {
    return Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(obj[k]))}`).join('&');
  }

  /* -------------------------
     Logging helpers (colored)
     ------------------------- */

  static colorize(text, color = 'reset') {
    const codes = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      grey: '\x1b[90m'
    };
    return (codes[color] || codes.reset) + text + codes.reset;
  }

  static logRed(...args) {
    console.log(this.colorize(args.map(String).join(' '), 'red'));
  }

  static logGreen(...args) {
    console.log(this.colorize(args.map(String).join(' '), 'green'));
  }

  /* -------------------------
     System / environment helpers
     ------------------------- */

  static detectProxyFromEnv() {
    const env = process.env;
    return env.HTTP_PROXY || env.http_proxy || env.HTTPS_PROXY || env.https_proxy || null;
  }

  static getDefaultSessionPath(fileName = 'session.json') {
    const home = process.env.HOME || process.cwd();
    return path.join(home, '.nodejs-insta-private-api', fileName);
  }

  /* -------------------------
     Utilities for request signing / payloads
     ------------------------- */

  static signPayloadHMAC(payload, key) {
    // payload assumed to be string or Buffer
    return this.hmacSha256(payload, key, 'hex');
  }

  static signJsonObject(obj, key) {
    const json = this.safeJsonStringify(obj);
    return this.hmacSha256(json, key, 'hex');
  }

  /* -------------------------
     Misc helpers
     ------------------------- */

  static ensureArray(val) {
    if (val == null) return [];
    return Array.isArray(val) ? val : [val];
  }

  static nowIso() {
    return new Date().toISOString();
  }

  /* -------------------------
     Compression helpers
     ------------------------- */

  static async gzipBuffer(buffer) {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
    });
  }

  static async gunzipBuffer(buffer) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
    });
  }

  /* -------------------------
     Utility: print summary of this utils (debug)
     ------------------------- */

  static describe() {
    return {
      version: 'utils-2025-10-14',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      now: this.nowIso()
    };
  }
}

module.exports = Utils;
