const crypto = require('crypto');
const { random } = require('lodash');

class Utils {
  // Generate a UUID v4 string
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Generate a random alphanumeric string of given length
  static generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Generate a fake device ID (Android style)
  static generateDeviceId() {
    return 'android-' + this.generateRandomString(16);
  }

  static generatePhoneId() {
    return this.generateUUID();
  }

  static generateAdId() {
    return this.generateUUID();
  }

  // Sleep for a given number of milliseconds
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sleep for a random time between min and max
  static randomDelay(min = 1000, max = 3000) {
    return this.sleep(random(min, max));
  }

  // Hash with MD5
  static md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // Hash with SHA256
  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // HMAC with SHA256
  static hmacSha256(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Encode a string in base64
  static base64Encode(data) {
    return Buffer.from(data).toString('base64');
  }

  // Decode a base64 string
  static base64Decode(data) {
    return Buffer.from(data, 'base64').toString();
  }

  // Return current timestamp in seconds
  static getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  // Return current timestamp in milliseconds
  static getTimestampMs() {
    return Date.now();
  }

  // Format Instagram User-Agent for API requests
  static formatUserAgent(appVersion, deviceString, language, appVersionCode) {
    return `Instagram ${appVersion} Android (${deviceString}; ${language}; ${appVersionCode})`;
  }

  // Format a WebView User-Agent
  static formatWebUserAgent(devicePayload, build, appUserAgent) {
    return `Mozilla/5.0 (Linux; Android ${devicePayload.android_release}; ${devicePayload.model} Build/${build}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36 ${appUserAgent}`;
  }

  // Parse a user ID or return null if it's a username
  static parseUserId(userIdOrUsername) {
    if (typeof userIdOrUsername === 'number' || /^\d+$/.test(userIdOrUsername)) {
      return userIdOrUsername.toString();
    }
    return null;
  }

  // Validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate Instagram username format
  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return usernameRegex.test(username);
  }

  // Clean captions from invalid characters
  static sanitizeCaption(caption) {
    if (!caption) return '';
    return caption.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }

  // Split an array into chunks
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Retry an async operation with exponential backoff
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

  // Validate file size
  static validateFileSize(filePath, maxSizeBytes) {
    const fs = require('fs');
    try {
      const stats = fs.statSync(filePath);
      return stats.size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

  // Get file extension
  static getFileExtension(filePath) {
    return filePath.split('.').pop().toLowerCase();
  }

  // Check if a file is an image
  static isImageFile(filePath) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = this.getFileExtension(filePath);
    return imageExtensions.includes(extension);
  }

  // Check if a file is a video
  static isVideoFile(filePath) {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'];
    const extension = this.getFileExtension(filePath);
    return videoExtensions.includes(extension);
  }

  // Map known Instagram error names to readable messages
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
    return errorMessages[error.name] || error.message || 'An unknown error occurred.';
  }

  // Calculate a delay for rate limiting
  static rateLimitDelay(retryAfter = null) {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    return random(5000, 15000);
  }

  // Generate user agent from device object
  static createUserAgentFromDevice(device) {
    return `Instagram 401.0.0.48.79 Android (${device.android_version}/${device.android_release}; ${device.dpi}dpi; ${device.resolution}; ${device.manufacturer}; ${device.model}; ${device.device}; ${device.cpu})`;
  }

  // Convert string to hex
  static toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
  }

  // Convert hex to string
  static fromHex(hex) {
    return Buffer.from(hex, 'hex').toString('utf8');
  }

  // Simple random integer between min and max
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = Utils;
