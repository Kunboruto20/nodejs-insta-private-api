const crypto = require('crypto');
const { random } = require('lodash');

class Utils {
  static generateUUID() {
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
    // If it's already a number or numeric string, return it
    if (typeof userIdOrUsername === 'number' || /^\d+$/.test(userIdOrUsername)) {
      return userIdOrUsername.toString();
    }
    // Otherwise, assume it's a username and return null (needs to be resolved)
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
    // Remove or replace potentially problematic characters
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

    return errorMessages[error.name] || error.message || 'An unknown error occurred.';
  }

  static rateLimitDelay(retryAfter = null) {
    // If Instagram provides a Retry-After header, use it
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    // Otherwise, use exponential backoff starting from 5 seconds
    return random(5000, 15000);
  }

  static createUserAgentFromDevice(device) {
    return `Instagram 222.0.0.13.114 Android (${device.android_version}/${device.android_release}; ${device.dpi}dpi; ${device.resolution}; ${device.manufacturer}; ${device.model}; ${device.device}; ${device.cpu})`;
  }
}

module.exports = Utils;