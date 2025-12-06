const crypto = require('crypto');
const { random } = require('lodash');

class Utils {
  // ========================
  // ORIGINAL FUNCTIONS
  // ========================

  static generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  static generateDeviceId() {
    return 'android-' + this.generateRandomString(16);
  }

  static generatePhoneId() {
    return this.generateUUID();
  }

  static generateAdId() {
    return this.generateUUID();
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static randomDelay(min = 1000, max = 3000) {
    return this.sleep(random(min, max));
  }

  static md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static hmacSha256(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  static base64Encode(data) {
    return Buffer.from(data).toString('base64');
  }

  static base64Decode(data) {
    return Buffer.from(data, 'base64').toString();
  }

  static getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  static getTimestampMs() {
    return Date.now();
  }

  static formatUserAgent(appVersion, deviceString, language, appVersionCode) {
    return `Instagram ${appVersion} Android (${deviceString}; ${language}; ${appVersionCode})`;
  }

  static formatWebUserAgent(devicePayload, build, appUserAgent) {
    return `Mozilla/5.0 (Linux; Android ${devicePayload.android_release}; ${devicePayload.model} Build/${build}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36 ${appUserAgent}`;
  }

  static parseUserId(userIdOrUsername) {
    if (typeof userIdOrUsername === 'number' || /^\d+$/.test(userIdOrUsername)) {
      return userIdOrUsername.toString();
    }
    return null;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return usernameRegex.test(username);
  }

  static sanitizeCaption(caption) {
    if (!caption) return '';
    return caption.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }

  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static retryOperation(operation, maxRetries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      let retries = 0;

      const attempt = async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            reject(error);
          } else {
            setTimeout(attempt, delay * retries);
          }
        }
      };

      attempt();
    });
  }

  static validateFileSize(filePath, maxSizeBytes) {
    const fs = require('fs');
    try {
      const stats = fs.statSync(filePath);
      return stats.size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

  static getFileExtension(filePath) {
    return filePath.split('.').pop().toLowerCase();
  }

  static isImageFile(filePath) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = this.getFileExtension(filePath);
    return imageExtensions.includes(extension);
  }

  static isVideoFile(filePath) {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'];
    const extension = this.getFileExtension(filePath);
    return videoExtensions.includes(extension);
  }

  static humanizeError(error) {
    const errorMessages = {
      'IgLoginBadPasswordError': 'The password you entered is incorrect. Please check your password and try again.',
      'IgLoginInvalidUserError': 'The username you entered doesn\'t appear to belong to an account. Please check your username and try again.',
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

    if (error.response && error.response.status) {
      return `Request failed with status ${error.response.status}: ${error.response.statusText || ''}`;
    }

    return errorMessages[error.name] || error.message || 'An unknown error occurred.';
  }

  static rateLimitDelay(retryAfter = null) {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    return random(5000, 15000);
  }

  static createUserAgentFromDevice(device) {
    return `Instagram 401.0.0.48.79 Android (${device.android_version}/${device.android_release}; ${device.dpi}dpi; ${device.resolution}; ${device.manufacturer}; ${device.model}; ${device.device}; ${device.cpu})`;
  }

  // ========================
  // NEW ENHANCEMENTS
  // ========================

  static generateSecureRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters[randomBytes[i] % characters.length];
    }
    return result;
  }

  static fileHash(filePath, algorithm = 'sha256') {
    const fs = require('fs');
    const data = fs.readFileSync(filePath);
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static prettyBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
  }

  static async retryWithBackoff(operation, maxRetries = 5, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
        await this.sleep(delay);
      }
    }
  }

  static logError(error, context = '') {
    console.error(`[${new Date().toISOString()}] ❌ ${context}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
  }

  static debugLog(message) {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  }

  static generateAndroidDevice() {
    const versions = ['11', '12', '13', '14'];
    const models = ['Pixel 6', 'SM-G991B', 'Redmi Note 10', 'OnePlus 9'];
    const manufacturer = ['Google', 'Samsung', 'Xiaomi', 'OnePlus'];
    const randomIndex = Math.floor(Math.random() * models.length);
    return {
      android_release: versions[randomIndex],
      model: models[randomIndex],
      manufacturer: manufacturer[randomIndex],
      dpi: 480,
      resolution: '1080x2400',
      device: models[randomIndex].replace(/\s+/g, '_').toLowerCase(),
      cpu: 'arm64-v8a',
      android_version: versions[randomIndex]
    };
  }

  static generateHeaders(userAgent) {
    return {
      'User-Agent': userAgent,
      'Accept': '*/*',
      'Accept-Language': 'en-US',
      'X-Requested-With': 'com.instagram.android',
      'Connection': 'keep-alive'
    };
  }
}

module.exports = Utils;
