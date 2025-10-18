// state.js
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const { CookieJar } = require('tough-cookie');
const Chance = require('chance');
const Constants = require('../constants');
const EventEmitter = require('events');

const SESSION_FILE = path.resolve(process.cwd(), 'session.json');
const SESSION_BACKUP = path.resolve(process.cwd(), 'session_backup.json');

class State {
  constructor() {
    // public constants reference (kept as property for backwards compat)
    this.constants = Constants;

    // basic defaults
    this.language = 'en_US';
    this.timezoneOffset = String(new Date().getTimezoneOffset() * -60);
    this.radioType = 'wifi-none';
    this.capabilitiesHeader = '3brTv10=';
    this.connectionTypeHeader = 'WIFI';
    this.isLayoutRTL = false;
    this.adsOptOut = false;
    this.thumbnailCacheBustingValue = 1000;
    this.proxyUrl = null;
    this.checkpoint = null;
    this.challenge = null;
    this.clientSessionIdLifetime = 1200000;
    this.pigeonSessionIdLifetime = 1200000;
    this.parsedAuthorization = undefined;

    // cookie jar (tough-cookie)
    this.cookieJar = new CookieJar();

    // device defaults
    this.generateDevice('instagram-private-api');

    // internal event emitter (non-invasive - backward-compatible)
    this._emitter = new EventEmitter();

    // internal watcher handle for session file (if used)
    this._sessionFileWatcher = null;

    // Default values for added utilities
    this._saveRetries = 3;
    this._saveRetryDelayMs = 300;
    this._maxBackupCopies = 5; // rotate backups up to this many
  }

  // ===== getters mapping to constants (read-only) =====
  get appVersion() {
    return this.constants.APP_VERSION;
  }

  get appVersionCode() {
    return this.constants.APP_VERSION_CODE;
  }

  get signatureKey() {
    return this.constants.SIGNATURE_KEY;
  }

  get signatureVersion() {
    return this.constants.SIGNATURE_VERSION;
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

  // ===== cookies/auth helpers =====
  extractCookie(key) {
    // tough-cookie CookieJar returns array via getCookiesSync in some versions; use synchronous API if present
    try {
      const cookies = this.cookieJar.getCookiesSync
        ? this.cookieJar.getCookiesSync(this.constants.HOST)
        : this.cookieJar.getCookies(this.constants.HOST);
      // cookies might be an array or a Promise; if array, find
      if (Array.isArray(cookies)) {
        const found = cookies.find(c => c.key === key);
        return found || null;
      }
      return null;
    } catch (e) {
      // fallback: try jar serialized introspection (rare)
      return null;
    }
  }

  extractCookieValue(key) {
    const cookie = this.extractCookie(key);
    if (!cookie) {
      throw new Error(`Could not find cookie: ${key}`);
    }
    return cookie.value;
  }

  get cookieCsrfToken() {
    try {
      return this.extractCookieValue('csrftoken');
    } catch {
      return 'missing';
    }
  }

  get cookieUserId() {
    try {
      return this.extractCookieValue('ds_user_id');
    } catch {
      // fallback to parsed authorization if available
      this.updateAuthorization();
      if (!this.parsedAuthorization) throw new Error('Could not find ds_user_id');
      return this.parsedAuthorization.ds_user_id;
    }
  }

  get cookieUsername() {
    try {
      return this.extractCookieValue('ds_user');
    } catch {
      return null;
    }
  }

  hasValidAuthorization() {
    return this.parsedAuthorization && this.parsedAuthorization.authorizationTag === this.authorization;
  }

  updateAuthorization() {
    if (!this.authorization) {
      this.parsedAuthorization = undefined;
      return;
    }
    if (this.hasValidAuthorization()) return;
    if (typeof this.authorization === 'string' && this.authorization.startsWith('Bearer IGT:2:')) {
      try {
        const json = Buffer.from(this.authorization.substring('Bearer IGT:2:'.length), 'base64').toString();
        const parsed = JSON.parse(json);
        // keep an extra tag to detect equality later
        parsed.authorizationTag = this.authorization;
        this.parsedAuthorization = parsed;
      } catch (e) {
        this.parsedAuthorization = undefined;
      }
    } else {
      this.parsedAuthorization = undefined;
    }
  }

  refreshAuthorization(newAuthToken) {
    if (!newAuthToken || typeof newAuthToken !== 'string') return false;
    this.authorization = newAuthToken;
    this.updateAuthorization();
    return true;
  }

  // ===== serialization helpers for cookieJar =====
  async serializeCookieJar() {
    // CookieJar.serialize(cb) exists in tough-cookie; wrap it
    const serializeFn = util.promisify((cb) => {
      try {
        this.cookieJar.serialize(cb);
      } catch (err) {
        cb(err);
      }
    });
    const data = await serializeFn();
    // return an object safe to JSON.stringify
    return data;
  }

  async deserializeCookieJar(serialized) {
    // Accept serialized either as string (JSON) or object
    let obj = serialized;
    if (typeof serialized === 'string') {
      try {
        obj = JSON.parse(serialized);
      } catch (e) {
        obj = serialized;
      }
    }
    const deserializeFn = util.promisify((input, cb) => {
      try {
        CookieJar.deserialize(input, cb);
      } catch (err) {
        cb(err);
      }
    });
    // CookieJar.deserialize returns a CookieJar instance
    const jar = await deserializeFn(obj);
    if (jar && typeof jar === 'object') {
      this.cookieJar = jar;
    }
  }

  // ===== main serialize / deserialize for whole state =====
  /**
   * Return a plain-object ready to be JSON.stringify-ed and saved to disk.
   */
  async serialize() {
    const cookieData = await this.serializeCookieJar();
    const obj = {
      constants: this.constants,
      cookies: cookieData,
      // include selective state fields (device + auth + extra fields commonly expected)
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
      // keep other runtime fields that may be present
      language: this.language,
      timezoneOffset: this.timezoneOffset,
      connectionTypeHeader: this.connectionTypeHeader,
      capabilitiesHeader: this.capabilitiesHeader
    };
    return obj;
  }

  /**
   * Merge data from a saved session into this State instance.
   * Safe: does NOT overwrite prototype getters (like appVersion).
   */
  async deserialize(state) {
    const obj = typeof state === 'string' ? JSON.parse(state) : state;
    if (!obj || typeof obj !== 'object') {
      throw new TypeError("State isn't an object or serialized JSON");
    }

    // If constants present and looks like an object, restore it
    if (obj.constants) {
      this.constants = obj.constants;
      // don't delete - but won't assign later
    }

    // Restore cookieJar if present
    if (obj.cookies) {
      try {
        await this.deserializeCookieJar(obj.cookies);
      } catch (e) {
        // best-effort: ignore cookie restore failures
      }
    }

    // Assign every other top-level property carefully, skipping prototype getters
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'cookies' || key === 'constants') continue;
      // skip if prototype defines a getter for this key
      const desc = Object.getOwnPropertyDescriptor(State.prototype, key);
      if (desc && (typeof desc.get === 'function' || typeof desc.set === 'function')) {
        // skip assigning to avoid "Cannot set property X of #<State> which has only a getter"
        continue;
      }
      // otherwise set on this
      try {
        this[key] = value;
      } catch (e) {
        // ignore property set failures (non-critical)
      }
    }

    // refresh parsed authorization (if any)
    this.updateAuthorization();
  }

  // ===== file helpers: save/load to disk (session + backup) =====
  async saveSessionToFile(filePath = SESSION_FILE, backupPath = SESSION_BACKUP) {
    try {
      const data = await this.serialize();
      // Save cookies field as object (not string) — caller may JSON.stringify whole obj
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
      // Also write a backup
      try {
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), { mode: 0o600 });
      } catch (_) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  async loadSessionFromFile(filePath = SESSION_FILE, backupPath = SESSION_BACKUP) {
    try {
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf8');
      const obj = JSON.parse(raw);
      await this.deserialize(obj);
      return true;
    } catch (e) {
      // try backup
      try {
        if (fs.existsSync(backupPath)) {
          const rawb = fs.readFileSync(backupPath, 'utf8');
          const objb = JSON.parse(rawb);
          await this.deserialize(objb);
          return true;
        }
      } catch (_) {}
      return false;
    }
  }

  // old convenience names so library code that calls state.saveSession()/loadSession() still works
  async saveSession() {
    return await this.saveSessionToFile();
  }

  async loadSession() {
    return await this.loadSessionFromFile();
  }

  // ===== device / cookie utilities =====
  generateDevice(seed) {
    const chance = new Chance(seed);
    // fallback device string shape similar to original projects
    this.deviceString = `26/8.0.0; 480dpi; 1080x1920; samsung; SM-G930F; herolte; samsungexynos8890`;
    this.deviceId = `android-${chance.string({ pool: 'abcdef0123456789', length: 16 })}`;
    this.uuid = chance.guid();
    this.phoneId = chance.guid();
    this.adid = chance.guid();
    this.build = 'OPM7.181205.001';
  }

  regenerateDevice(seed = 'instagram-private-api') {
    this.generateDevice(seed);
  }

  generateTemporaryGuid(seed, lifetime) {
    return new Chance(`${seed}${this.deviceId}${Math.round(Date.now() / lifetime)}`).guid();
  }

  clearCookies() {
    this.cookieJar = new CookieJar();
  }

  listCookies() {
    try {
      const cookies = this.cookieJar.getCookiesSync
        ? this.cookieJar.getCookiesSync(this.constants.HOST)
        : this.cookieJar.getCookies(this.constants.HOST);
      if (Array.isArray(cookies)) {
        for (const c of cookies) {
          console.log(`- ${c.key}=${c.value}`);
        }
        return cookies;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  logStateSummary() {
    console.log('--- State Summary ---');
    console.log(`Device ID: ${this.deviceId}`);
    console.log(`UUID: ${this.uuid}`);
    console.log(`User Agent: ${this.appUserAgent}`);
    console.log(`Language: ${this.language}`);
    console.log(`Timezone Offset: ${this.timezoneOffset}`);
    console.log(`Authorization: ${this.authorization ? 'Present' : 'Missing'}`);
    console.log('----------------------');
  }

  //
  // === NEW UTILITIES ADDED BELOW (non-destructive; keep backwards compat)
  //

  /**
   * Subscribe to internal state events (non-invasive).
   * Events emitted:
   *  - 'session_saved' => (filePath)
   *  - 'session_save_failed' => (err)
   *  - 'session_loaded' => (filePath)
   *  - 'session_load_failed' => (err)
   *  - 'cookies_cleared'
   *  - 'device_regenerated'
   *  - 'session_file_changed' => (eventType, filename)
   */
  on(event, listener) {
    this._emitter.on(event, listener);
  }

  off(event, listener) {
    this._emitter.removeListener(event, listener);
  }

  once(event, listener) {
    this._emitter.once(event, listener);
  }

  /**
   * Atomic save with retries and backup rotation.
   * Attempts to write to a temp file, rename into place (atomic on most OSes),
   * and maintain up to `_maxBackupCopies` rotated backups.
   */
  async safeSaveSessionToFile(filePath = SESSION_FILE, backupPath = SESSION_BACKUP, opts = {}) {
    const retries = typeof opts.retries === 'number' ? opts.retries : this._saveRetries;
    const delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : this._saveRetryDelayMs;
    const maxBackups = typeof opts.maxBackups === 'number' ? opts.maxBackups : this._maxBackupCopies;

    const tempPath = `${filePath}.tmp`;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await this.serialize();
        // ensure parent dir exists
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        // write temp and rename (atomic on many systems)
        await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), { mode: 0o600 });
        await fs.promises.rename(tempPath, filePath);
        // maintain backup copy
        try {
          await this._rotateAndWriteBackup(filePath, backupPath, maxBackups);
        } catch (_) {
          // non-fatal for backup rotation
        }
        this._emitter.emit('session_saved', filePath);
        return true;
      } catch (err) {
        lastErr = err;
        // small backoff
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
    this._emitter.emit('session_save_failed', lastErr);
    throw lastErr || new Error('safeSaveSessionToFile failed');
  }

  // helper: rotate existing backups and write new backup copy
  async _rotateAndWriteBackup(filePath, backupPath, maxBackups) {
    try {
      // if no original file, just copy
      if (!fs.existsSync(filePath)) {
        const data = await this.serialize();
        await fs.promises.writeFile(backupPath, JSON.stringify(data, null, 2), { mode: 0o600 });
        return;
      }

      // rotate existing numeric backups (backupPath.1, backupPath.2, ...)
      for (let i = maxBackups - 1; i >= 1; i--) {
        const src = `${backupPath}.${i}`;
        const dst = `${backupPath}.${i + 1}`;
        if (fs.existsSync(src)) {
          try { await fs.promises.rename(src, dst); } catch (_) {}
        }
      }
      // move current backup to .1
      if (fs.existsSync(backupPath)) {
        try { await fs.promises.rename(backupPath, `${backupPath}.1`); } catch (_) {}
      }
      // write a new backup from current file
      const content = await fs.promises.readFile(filePath, 'utf8');
      await fs.promises.writeFile(backupPath, content, { mode: 0o600 });
    } catch (e) {
      // ignore backup rotation issues
    }
  }

  /**
   * Safe load with retries. Emits session_loaded/session_load_failed events.
   */
  async safeLoadSessionFromFile(filePath = SESSION_FILE, backupPath = SESSION_BACKUP, opts = {}) {
    const retries = typeof opts.retries === 'number' ? opts.retries : 2;
    const delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 200;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const ok = await this.loadSessionFromFile(filePath, backupPath);
        if (ok) {
          this._emitter.emit('session_loaded', filePath);
          return true;
        }
        // if not ok, wait and retry
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      } catch (err) {
        lastErr = err;
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
    this._emitter.emit('session_load_failed', lastErr);
    throw lastErr || new Error('safeLoadSessionFromFile failed');
  }

  /**
   * Validate minimal session integrity: ensure cookie jar has expected cookies or parsed authorization
   */
  validateSession() {
    try {
      // try to read ds_user_id or parsed authorization
      let ok = false;
      try {
        const uid = this.extractCookieValue('ds_user_id');
        ok = !!uid;
      } catch (_) {
        // fallback to parsed authorization
        this.updateAuthorization();
        ok = !!(this.parsedAuthorization && this.parsedAuthorization.ds_user_id);
      }
      return ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Merge cookies from another serialized jar or CookieJar instance into current cookieJar.
   * Accepts: serialized object/string (as used by serializeCookieJar) or CookieJar instance.
   */
  async mergeCookieJarFrom(other) {
    try {
      if (!other) return false;
      // if serialized string/object
      if (typeof other === 'string' || (typeof other === 'object' && !other.getCookieSync)) {
        // deserialize into a temporary jar
        const deserializeFn = util.promisify((input, cb) => {
          try {
            CookieJar.deserialize(input, cb);
          } catch (err) {
            cb(err);
          }
        });
        const tmpJar = await deserializeFn(typeof other === 'string' ? JSON.parse(other) : other);
        if (!tmpJar) return false;
        // merge: extract cookies for host and set into current jar
        const host = this.constants.HOST;
        const cookies = tmpJar.getCookiesSync ? tmpJar.getCookiesSync(host) : await tmpJar.getCookies(host);
        if (Array.isArray(cookies)) {
          for (const c of cookies) {
            try {
              // setCookieSync may not exist in some versions; fallback to async
              if (typeof this.cookieJar.setCookieSync === 'function') {
                this.cookieJar.setCookieSync(c, host);
              } else if (typeof this.cookieJar.setCookie === 'function') {
                // promisify setCookie
                await util.promisify(this.cookieJar.setCookie).call(this.cookieJar, c, host);
              }
            } catch (_) {}
          }
        }
        return true;
      } else if (typeof other.getCookiesSync === 'function' || typeof other.getCookies === 'function') {
        // assume CookieJar instance
        const host = this.constants.HOST;
        const cookies = other.getCookiesSync ? other.getCookiesSync(host) : await other.getCookies(host);
        if (Array.isArray(cookies)) {
          for (const c of cookies) {
            try {
              if (typeof this.cookieJar.setCookieSync === 'function') {
                this.cookieJar.setCookieSync(c, host);
              } else if (typeof this.cookieJar.setCookie === 'function') {
                await util.promisify(this.cookieJar.setCookie).call(this.cookieJar, c, host);
              }
            } catch (_) {}
          }
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  /**
   * Export a minimal session object (useful for sending to remote storage or IPC).
   */
  async exportMinimalSession() {
    const cookieData = await this.serializeCookieJar();
    return {
      deviceId: this.deviceId,
      deviceString: this.deviceString,
      uuid: this.uuid,
      phoneId: this.phoneId,
      adid: this.adid,
      build: this.build,
      authorization: this.authorization,
      cookies: cookieData
    };
  }

  /**
   * Import minimal session object (merges cookies if present and sets fields).
   */
  async importMinimalSession(minObj = {}) {
    if (!minObj || typeof minObj !== 'object') return false;
    try {
      if (minObj.cookies) {
        try { await this.mergeCookieJarFrom(minObj.cookies); } catch (_) {}
      }
      // set other fields cautiously
      const fields = ['deviceId', 'deviceString', 'uuid', 'phoneId', 'adid', 'build', 'authorization'];
      for (const k of fields) {
        if (typeof minObj[k] !== 'undefined') this[k] = minObj[k];
      }
      this.updateAuthorization();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Set proxy URL (persists only in-memory; use saveSessionToFile to persist).
   */
  setProxyUrl(url) {
    this.proxyUrl = url || null;
    return this.proxyUrl;
  }

  clearProxyUrl() {
    this.proxyUrl = null;
    return true;
  }

  /**
   * Mark checkpoint metadata object (stores arbitrary checkpoint info).
   */
  markCheckpoint(obj) {
    try {
      this.checkpoint = obj;
      return true;
    } catch (_) {
      return false;
    }
  }

  clearCheckpoint() {
    this.checkpoint = null;
    return true;
  }

  /**
   * Ensure session file has safe permissions (owner read/write only)
   */
  ensureFilePermissions(filePath = SESSION_FILE) {
    try {
      if (fs.existsSync(filePath)) {
        fs.chmodSync(filePath, 0o600);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Watch the session file for external changes and emit 'session_file_changed'.
   * Note: uses fs.watchFile which is more portable; call stopWatchingSessionFile() to stop.
   */
  watchSessionFile(filePath = SESSION_FILE, intervalMs = 1000) {
    try {
      if (this._sessionFileWatcher) {
        // already watching
        return true;
      }
      // use watchFile (polling) for reliability across platforms
      fs.watchFile(filePath, { interval: intervalMs }, (curr, prev) => {
        // ignore if size/time identical
        if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
          this._emitter.emit('session_file_changed', { filePath, curr, prev });
        }
      });
      this._sessionFileWatcher = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  stopWatchingSessionFile(filePath = SESSION_FILE) {
    try {
      if (!this._sessionFileWatcher) return true;
      fs.unwatchFile(filePath);
      this._sessionFileWatcher = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * If device looks missing or invalid, regenerate device fields.
   * Condition: deviceId missing or doesn't start with expected prefix.
   */
  refreshDeviceIfMissingOrOld(seed = 'instagram-private-api') {
    try {
      if (!this.deviceId || typeof this.deviceId !== 'string' || !this.deviceId.startsWith('android-')) {
        this.generateDevice(seed);
        this._emitter.emit('device_regenerated');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Refresh authorization state from cookies (useful after merging cookies).
   */
  refreshAuthFromCookies() {
    try {
      this.updateAuthorization();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safe load helper that tries to load, validate, and optionally attempt fallback to backup copies.
   * If `validate` is true, will call validateSession() and throw if invalid.
   */
  async loadAndValidateSession(filePath = SESSION_FILE, backupPath = SESSION_BACKUP, opts = {}) {
    const validate = opts.validate !== false; // default true
    try {
      const ok = await this.safeLoadSessionFromFile(filePath, backupPath, opts);
      if (!ok) throw new Error('load failed');
      if (validate && !this.validateSession()) {
        // try backup load
        const triedBackups = await this._tryLoadRotatedBackups(backupPath, opts);
        if (!triedBackups) throw new Error('session invalid and backups failed');
      }
      this._emitter.emit('session_loaded', filePath);
      return true;
    } catch (e) {
      this._emitter.emit('session_load_failed', e);
      throw e;
    }
  }

  // helper: try load rotated backups .1 .. .N
  async _tryLoadRotatedBackups(backupPath, opts = {}) {
    try {
      const max = typeof opts.maxBackups === 'number' ? opts.maxBackups : this._maxBackupCopies;
      for (let i = 1; i <= max; i++) {
        const p = `${backupPath}.${i}`;
        if (!fs.existsSync(p)) continue;
        try {
          const raw = await fs.promises.readFile(p, 'utf8');
          const obj = JSON.parse(raw);
          await this.deserialize(obj);
          if (this.validateSession()) return true;
        } catch (_) {
          // continue trying next
        }
      }
    } catch (_) {}
    return false;
  }

  /**
   * Clear all session data (cookies + auth + device optional).
   * If `preserveDevice` is true, device fields are kept.
   */
  clearAllSession(preserveDevice = true) {
    try {
      this.clearCookies();
      this.authorization = undefined;
      this.parsedAuthorization = undefined;
      this.igWWWClaim = undefined;
      this.passwordEncryptionKeyId = undefined;
      this.passwordEncryptionPubKey = undefined;
      if (!preserveDevice) {
        this.generateDevice('instagram-private-api');
      }
      this._emitter.emit('cookies_cleared');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Quick helper: get value of cookie if exists, or null (non-throwing).
   */
  getCookieValueSafe(key) {
    try {
      const c = this.extractCookie(key);
      return c ? c.value : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Convenience: set default save/retry options
   */
  setSaveRetryOptions({ retries, delayMs, maxBackups } = {}) {
    if (typeof retries === 'number') this._saveRetries = retries;
    if (typeof delayMs === 'number') this._saveRetryDelayMs = delayMs;
    if (typeof maxBackups === 'number') this._maxBackupCopies = maxBackups;
    return { retries: this._saveRetries, delayMs: this._saveRetryDelayMs, maxBackups: this._maxBackupCopies };
  }
}

module.exports = State;
