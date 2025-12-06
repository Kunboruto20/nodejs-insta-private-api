'use strict';

const fs = require('fs');
const path = require('path');
const { CookieJar } = require('tough-cookie');
const util = require('util');
const EventEmitter = require('events');

const FILE_NAMES = {
  creds: 'creds.json',
  device: 'device.json', 
  cookies: 'cookies.json',
  mqttSession: 'mqtt-session.json',
  subscriptions: 'subscriptions.json',
  seqIds: 'seq-ids.json',
  appState: 'app-state.json'
};

class MultiFileAuthState extends EventEmitter {
  constructor(folder) {
    super();
    this.folder = folder;
    this._saveDebounceTimer = null;
    this._saveDebounceMs = 500;
    this._dirty = new Set();
    
    this.data = {
      creds: null,
      device: null,
      cookies: null,
      mqttSession: null,
      subscriptions: null,
      seqIds: null,
      appState: null
    };
  }

  _getFilePath(key) {
    return path.join(this.folder, FILE_NAMES[key]);
  }

  _ensureFolder() {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder, { recursive: true, mode: 0o700 });
    }
  }

  async _writeFileAtomic(filePath, data) {
    const tempPath = filePath + '.tmp';
    const jsonData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tempPath, jsonData, { mode: 0o600 });
    await fs.promises.rename(tempPath, filePath);
  }

  async _readFile(key) {
    const filePath = this._getFilePath(key);
    try {
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[MultiFileAuthState] Error reading ${key}:`, e.message);
    }
    return null;
  }

  async _writeFile(key, data) {
    this._ensureFolder();
    const filePath = this._getFilePath(key);
    try {
      await this._writeFileAtomic(filePath, data);
      return true;
    } catch (e) {
      console.error(`[MultiFileAuthState] Error writing ${key}:`, e.message);
      return false;
    }
  }

  async loadAll() {
    this._ensureFolder();
    
    const loadPromises = Object.keys(FILE_NAMES).map(async (key) => {
      this.data[key] = await this._readFile(key);
    });
    
    await Promise.all(loadPromises);
    
    return {
      creds: this.data.creds,
      device: this.data.device,
      cookies: this.data.cookies,
      mqttSession: this.data.mqttSession,
      subscriptions: this.data.subscriptions,
      seqIds: this.data.seqIds,
      appState: this.data.appState,
      hasSession: !!(this.data.creds && this.data.cookies)
    };
  }

  async saveAll() {
    const savePromises = Object.keys(FILE_NAMES).map(async (key) => {
      if (this.data[key] !== null && this.data[key] !== undefined) {
        await this._writeFile(key, this.data[key]);
      }
    });
    await Promise.all(savePromises);
  }

  async saveCreds() {
    const promises = [];
    if (this.data.creds) promises.push(this._writeFile('creds', this.data.creds));
    if (this.data.device) promises.push(this._writeFile('device', this.data.device));
    if (this.data.cookies) promises.push(this._writeFile('cookies', this.data.cookies));
    await Promise.all(promises);
    this.emit('creds-saved');
  }

  async saveMqttState() {
    const promises = [];
    if (this.data.mqttSession) promises.push(this._writeFile('mqttSession', this.data.mqttSession));
    if (this.data.subscriptions) promises.push(this._writeFile('subscriptions', this.data.subscriptions));
    if (this.data.seqIds) promises.push(this._writeFile('seqIds', this.data.seqIds));
    await Promise.all(promises);
    this.emit('mqtt-state-saved');
  }

  async saveAppState() {
    if (this.data.appState) {
      await this._writeFile('appState', this.data.appState);
    }
  }

  _debouncedSave(keys) {
    keys.forEach(k => this._dirty.add(k));
    
    if (this._saveDebounceTimer) {
      clearTimeout(this._saveDebounceTimer);
    }
    
    this._saveDebounceTimer = setTimeout(async () => {
      const toSave = Array.from(this._dirty);
      this._dirty.clear();
      
      for (const key of toSave) {
        if (this.data[key] !== null && this.data[key] !== undefined) {
          await this._writeFile(key, this.data[key]);
        }
      }
    }, this._saveDebounceMs);
  }

  setCreds(creds) {
    this.data.creds = creds;
    this._debouncedSave(['creds']);
  }

  setDevice(device) {
    this.data.device = device;
    this._debouncedSave(['device']);
  }

  setCookies(cookies) {
    this.data.cookies = cookies;
    this._debouncedSave(['cookies']);
  }

  setMqttSession(session) {
    this.data.mqttSession = session;
    this._debouncedSave(['mqttSession']);
  }

  setSubscriptions(subs) {
    this.data.subscriptions = subs;
    this._debouncedSave(['subscriptions']);
  }

  setSeqIds(seqIds) {
    this.data.seqIds = seqIds;
    this._debouncedSave(['seqIds']);
  }

  setAppState(state) {
    this.data.appState = state;
    this._debouncedSave(['appState']);
  }

  getCreds() { return this.data.creds; }
  getDevice() { return this.data.device; }
  getCookies() { return this.data.cookies; }
  getMqttSession() { return this.data.mqttSession; }
  getSubscriptions() { return this.data.subscriptions; }
  getSeqIds() { return this.data.seqIds; }
  getAppState() { return this.data.appState; }

  hasValidSession() {
    return !!(this.data.creds && this.data.cookies && this.data.creds.authorization);
  }

  hasMqttSession() {
    return !!(this.data.mqttSession && this.data.mqttSession.sessionId);
  }

  async clearAll() {
    for (const key of Object.keys(FILE_NAMES)) {
      const filePath = this._getFilePath(key);
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (e) {}
      this.data[key] = null;
    }
  }
}

async function extractStateData(igState) {
  const creds = {
    authorization: igState.authorization || null,
    igWWWClaim: igState.igWWWClaim || null,
    passwordEncryptionKeyId: igState.passwordEncryptionKeyId || null,
    passwordEncryptionPubKey: igState.passwordEncryptionPubKey || null
  };

  const device = {
    deviceString: igState.deviceString || null,
    deviceId: igState.deviceId || null,
    uuid: igState.uuid || null,
    phoneId: igState.phoneId || null,
    adid: igState.adid || null,
    build: igState.build || null
  };

  let cookies = null;
  try {
    if (igState.cookieJar && typeof igState.serializeCookieJar === 'function') {
      cookies = await igState.serializeCookieJar();
    }
  } catch (e) {
    console.warn('[MultiFileAuthState] Could not serialize cookies:', e.message);
  }

  const appState = {
    language: igState.language || 'en_US',
    timezoneOffset: igState.timezoneOffset || null,
    connectionTypeHeader: igState.connectionTypeHeader || 'WIFI',
    capabilitiesHeader: igState.capabilitiesHeader || null,
    checkpoint: igState.checkpoint || null,
    challenge: igState.challenge || null
  };

  return { creds, device, cookies, appState };
}

async function applyStateData(igState, authState) {
  const { creds, device, cookies, appState } = authState.data;

  if (creds) {
    if (creds.authorization) igState.authorization = creds.authorization;
    if (creds.igWWWClaim) igState.igWWWClaim = creds.igWWWClaim;
    if (creds.passwordEncryptionKeyId) igState.passwordEncryptionKeyId = creds.passwordEncryptionKeyId;
    if (creds.passwordEncryptionPubKey) igState.passwordEncryptionPubKey = creds.passwordEncryptionPubKey;
    igState.updateAuthorization();
  }

  if (device) {
    if (device.deviceString) igState.deviceString = device.deviceString;
    if (device.deviceId) igState.deviceId = device.deviceId;
    if (device.uuid) igState.uuid = device.uuid;
    if (device.phoneId) igState.phoneId = device.phoneId;
    if (device.adid) igState.adid = device.adid;
    if (device.build) igState.build = device.build;
  }

  if (cookies) {
    try {
      await igState.deserializeCookieJar(cookies);
    } catch (e) {
      console.warn('[MultiFileAuthState] Could not deserialize cookies:', e.message);
    }
  }

  if (appState) {
    if (appState.language) igState.language = appState.language;
    if (appState.timezoneOffset) igState.timezoneOffset = appState.timezoneOffset;
    if (appState.connectionTypeHeader) igState.connectionTypeHeader = appState.connectionTypeHeader;
    if (appState.capabilitiesHeader) igState.capabilitiesHeader = appState.capabilitiesHeader;
    if (appState.checkpoint) igState.checkpoint = appState.checkpoint;
    if (appState.challenge) igState.challenge = appState.challenge;
  }
}

async function useMultiFileAuthState(folder) {
  const authState = new MultiFileAuthState(folder);
  await authState.loadAll();

  const saveCreds = async (igClient) => {
    if (!igClient || !igClient.state) {
      console.warn('[useMultiFileAuthState] No igClient provided to saveCreds');
      return;
    }

    const { creds, device, cookies, appState } = await extractStateData(igClient.state);
    
    authState.data.creds = creds;
    authState.data.device = device;
    authState.data.cookies = cookies;
    authState.data.appState = appState;
    
    await authState.saveCreds();
    await authState.saveAppState();
    
    console.log('[useMultiFileAuthState] Credentials saved to', folder);
  };

  const saveMqttSession = async (realtimeClient) => {
    if (!realtimeClient) {
      console.warn('[useMultiFileAuthState] No realtimeClient provided');
      return;
    }

    const mqttSession = {
      sessionId: null,
      mqttSessionId: null,
      lastConnected: new Date().toISOString(),
      userId: null
    };

    try {
      if (realtimeClient.ig && realtimeClient.ig.state) {
        mqttSession.userId = realtimeClient.ig.state.cookieUserId;
        mqttSession.sessionId = realtimeClient.extractSessionIdFromJWT?.() || null;
      }
      if (realtimeClient.connection) {
        mqttSession.mqttSessionId = realtimeClient.connection?.clientInfo?.clientMqttSessionId?.toString() || null;
      }
    } catch (e) {}

    const subscriptions = {
      graphQlSubs: realtimeClient.initOptions?.graphQlSubs || [],
      skywalkerSubs: realtimeClient.initOptions?.skywalkerSubs || [],
      subscribedAt: new Date().toISOString()
    };

    const seqIds = {};
    if (realtimeClient.initOptions?.irisData) {
      seqIds.seq_id = realtimeClient.initOptions.irisData.seq_id || null;
      seqIds.snapshot_at_ms = realtimeClient.initOptions.irisData.snapshot_at_ms || null;
    }

    authState.data.mqttSession = mqttSession;
    authState.data.subscriptions = subscriptions;
    authState.data.seqIds = seqIds;

    await authState.saveMqttState();
    console.log('[useMultiFileAuthState] MQTT session saved to', folder);
  };

  const loadCreds = async (igClient) => {
    if (!igClient || !igClient.state) {
      console.warn('[useMultiFileAuthState] No igClient provided to loadCreds');
      return false;
    }

    if (!authState.hasValidSession()) {
      console.log('[useMultiFileAuthState] No valid session found');
      return false;
    }

    await applyStateData(igClient.state, authState);
    console.log('[useMultiFileAuthState] Credentials loaded from', folder);
    return true;
  };

  const getMqttConnectOptions = () => {
    if (!authState.hasMqttSession()) {
      return null;
    }

    const subs = authState.getSubscriptions() || {};
    const seqIds = authState.getSeqIds() || {};

    return {
      graphQlSubs: subs.graphQlSubs || ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
      skywalkerSubs: subs.skywalkerSubs || ['presence_subscribe', 'typing_subscribe'],
      irisData: seqIds.seq_id ? {
        seq_id: seqIds.seq_id,
        snapshot_at_ms: seqIds.snapshot_at_ms
      } : null
    };
  };

  const clearSession = async () => {
    await authState.clearAll();
    console.log('[useMultiFileAuthState] Session cleared');
  };

  const isSessionValid = async (igClient) => {
    if (!authState.hasValidSession()) return false;
    if (!igClient) return true;

    try {
      await igClient.account.currentUser();
      return true;
    } catch (e) {
      console.warn('[useMultiFileAuthState] Session validation failed:', e.message);
      return false;
    }
  };

  return {
    state: authState,
    
    saveCreds,
    loadCreds,
    
    saveMqttSession,
    getMqttConnectOptions,
    
    clearSession,
    isSessionValid,

    hasSession: () => authState.hasValidSession(),
    hasMqttSession: () => authState.hasMqttSession(),
    
    folder,
    
    getData: () => authState.data
  };
}

module.exports = {
  useMultiFileAuthState,
  MultiFileAuthState,
  extractStateData,
  applyStateData
};
