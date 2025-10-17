const Chance = require('chance');
const { CookieJar } = require('tough-cookie');
const Constants = require('../constants');

class State {
  constructor() {
    this.constants = Constants;
    this.language = 'en_US';
    this.timezoneOffset = String(new Date().getTimezoneOffset() * -60);
    this.radioType = 'wifi-none';
    this.capabilitiesHeader = '3brTv10=';
    this.connectionTypeHeader = 'WIFI';
    this.isLayoutRTL = false;
    this.adsOptOut = false;
    this.thumbnailCacheBustingValue = 1000;
    this.proxyUrl = null;
    this.cookieStore = new CookieJar();
    this.checkpoint = null;
    this.challenge = null;
    this.clientSessionIdLifetime = 1200000;
    this.pigeonSessionIdLifetime = 1200000;
    this.parsedAuthorization = null;

    // Initialize device info
    this.generateDevice('instagram-private-api');
  }

  // === Getters ===

  get signatureKey() {
    return this.constants.SIGNATURE_KEY;
  }

  get signatureVersion() {
    return this.constants.SIGNATURE_VERSION;
  }

  get userBreadcrumbKey() {
    return this.constants.BREADCRUMB_KEY;
  }

  get appVersion() {
    return this.constants.APP_VERSION;
  }

  get appVersionCode() {
    return this.constants.APP_VERSION_CODE;
  }

  get fbAnalyticsApplicationId() {
    return this.constants.FACEBOOK_ANALYTICS_APPLICATION_ID;
  }

  get bloksVersionId() {
    return this.constants.BLOKS_VERSION_ID;
  }

  get clientSessionId() {
    return this.generateTemporaryGuid('clientSessionId', this.clientSessionIdLifetime);
  }

  get pigeonSessionId() {
    return this.generateTemporaryGuid('pigeonSessionId', this.pigeonSessionIdLifetime);
  }

  get appUserAgent() {
    return `Instagram ${this.appVersion} Android (${this.deviceString}; ${this.language}; ${this.appVersionCode})`;
  }

  get cookieCsrfToken() {
    try {
      return this.extractCookieValue('csrftoken');
    } catch {
      return 'missing';
    }
  }

  get cookieUserId() {
    const cookie = this.extractCookie('ds_user_id');
    if (cookie !== null) {
      return cookie.value;
    }
    this.updateAuthorization();
    if (!this.parsedAuthorization) {
      throw new Error('Could not find ds_user_id');
    }
    return this.parsedAuthorization.ds_user_id;
  }

  get cookieUsername() {
    return this.extractCookieValue('ds_user');
  }

  // === Cookie and Auth Utilities ===

  extractCookie(key) {
    const cookies = this.cookieStore.getCookiesSync(this.constants.HOST);
    return cookies.find(cookie => cookie.key === key) || null;
  }

  extractCookieValue(key) {
    const cookie = this.extractCookie(key);
    if (cookie === null) {
      throw new Error(`Could not find ${key}`);
    }
    return cookie.value;
  }

  // === Device Generation ===

  generateDevice(seed) {
    const chance = new Chance(seed);
    this.deviceString = '26/8.0.0; 480dpi; 1080x1920; samsung; SM-G930F; herolte; samsungexynos8890';
    const id = chance.string({
      pool: 'abcdef0123456789',
      length: 16,
    });
    this.deviceId = `android-${id}`;
    this.uuid = chance.guid();
    this.phoneId = chance.guid();
    this.adid = chance.guid();
    this.build = 'OPM7.181205.001';
  }

  // Regenerate device (optional helper)
  regenerateDevice(seed = 'instagram-private-api') {
    console.log('[DEBUG] Regenerating device information...');
    this.generateDevice(seed);
  }

  generateTemporaryGuid(seed, lifetime) {
    return new Chance(`${seed}${this.deviceId}${Math.round(Date.now() / lifetime)}`).guid();
  }

  // === Authorization ===

  hasValidAuthorization() {
    return this.parsedAuthorization && this.parsedAuthorization.authorizationTag === this.authorization;
  }

  updateAuthorization() {
    if (!this.hasValidAuthorization()) {
      if (this.authorization?.startsWith('Bearer IGT:2:')) {
        try {
          const authData = JSON.parse(
            Buffer.from(this.authorization.substring('Bearer IGT:2:'.length), 'base64').toString()
          );
          this.parsedAuthorization = {
            ...authData,
            authorizationTag: this.authorization,
          };
        } catch (e) {
          this.parsedAuthorization = null;
        }
      } else {
        this.parsedAuthorization = null;
      }
    }
  }

  // Refresh auth token if expired or invalid
  refreshAuthorization(newAuthToken) {
    if (!newAuthToken || typeof newAuthToken !== 'string') {
      console.warn('[WARN] Invalid new authorization token provided.');
      return false;
    }
    this.authorization = newAuthToken;
    this.updateAuthorization();
    console.log('[DEBUG] Authorization token refreshed.');
    return true;
  }

  // === Serialization / Deserialization ===

  async serialize() {
    return {
      constants: this.constants,
      cookies: JSON.stringify(this.cookieStore.toJSON()),
      deviceString: this.deviceString,
      deviceId: this.deviceId,
      uuid: this.uuid,
      phoneId: this.phoneId,
      adid: this.adid,
      build: this.build,
      authorization: this.authorization,
      igWWWClaim: this.igWWWClaim,
      passwordEncryptionKeyId: this.passwordEncryptionKeyId,
      passwordEncryptionPubKey: this.passwordEncryptionPubKey,
      language: this.language,
      timezoneOffset: this.timezoneOffset,
      radioType: this.radioType,
      capabilitiesHeader: this.capabilitiesHeader,
      connectionTypeHeader: this.connectionTypeHeader,
      isLayoutRTL: this.isLayoutRTL,
      adsOptOut: this.adsOptOut,
      thumbnailCacheBustingValue: this.thumbnailCacheBustingValue,
      proxyUrl: this.proxyUrl,
      checkpoint: this.checkpoint,
      challenge: this.challenge,
      clientSessionIdLifetime: this.clientSessionIdLifetime,
      pigeonSessionIdLifetime: this.pigeonSessionIdLifetime
    };
  }

  async deserialize(state) {
    const obj = typeof state === 'string' ? JSON.parse(state) : state;

    if (obj.cookies) {
      this.cookieStore = CookieJar.fromJSON(obj.cookies);
    }

    // Restore all properties
    Object.assign(this, obj);
    
    // Ensure parsedAuthorization is updated if authorization exists
    if (this.authorization) {
      this.updateAuthorization();
    }
  }

  // === Cookie and Debug Helpers ===

  clearCookies() {
    console.log('[DEBUG] Clearing all cookies...');
    this.cookieStore = new CookieJar();
  }

  listCookies() {
    const cookies = this.cookieStore.getCookiesSync(this.constants.HOST);
    console.log('[DEBUG] Current cookies:');
    cookies.forEach(c => console.log(`- ${c.key}=${c.value}`));
    return cookies;
  }

  logStateSummary() {
    console.log('--- State Summary ---');
    console.log(`Device ID: ${this.deviceId}`);
    console.log(`UUID: ${this.uuid}`);
    console.log(`User Agent: ${this.appUserAgent}`);
    console.log(`Language: ${this.language}`);
    console.log(`Timezone Offset: ${this.timezoneOffset}`);
    console.log(`Authorization: ${this.authorization ? 'Present' : 'Missing'}`);
    console.log(`CSRF Token: ${this.cookieCsrfToken}`);
    console.log(`User ID: ${this.cookieUserId || 'Not found'}`);
    console.log(`Username: ${this.cookieUsername || 'Not found'}`);
    console.log('----------------------');
  }

  // Check if we have essential session data
  hasValidSession() {
    try {
      const hasUserId = !!this.cookieUserId;
      const hasUsername = !!this.cookieUsername;
      const hasCsrfToken = !!this.cookieCsrfToken;
      const hasSessionId = !!this.extractCookie('sessionid');
      
      return hasUserId && hasUsername && hasCsrfToken && hasSessionId;
    } catch (error) {
      return false;
    }
  }
}

module.exports = State;
