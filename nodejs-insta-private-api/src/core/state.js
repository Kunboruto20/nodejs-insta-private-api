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
    
    this.generateDevice('instagram-private-api');
  }

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

  generateTemporaryGuid(seed, lifetime) {
    return new Chance(`${seed}${this.deviceId}${Math.round(Date.now() / lifetime)}`).guid();
  }

  hasValidAuthorization() {
    return this.parsedAuthorization && this.parsedAuthorization.authorizationTag === this.authorization;
  }

  updateAuthorization() {
    if (!this.hasValidAuthorization()) {
      if (this.authorization?.startsWith('Bearer IGT:2:')) {
        try {
          const authData = JSON.parse(Buffer.from(this.authorization.substring('Bearer IGT:2:'.length), 'base64').toString());
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
      passwordEncryptionPubKey: this.passwordEncryptionPubKey
    };
  }

  async deserialize(state) {
    const obj = typeof state === 'string' ? JSON.parse(state) : state;
    
    if (obj.cookies) {
      this.cookieStore = CookieJar.fromJSON(obj.cookies);
    }
    
    Object.assign(this, obj);
  }
}

module.exports = State;
