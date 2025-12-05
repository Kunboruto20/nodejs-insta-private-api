const fs = require('fs');
const path = require('path');
const debug = require('debug')('ig:session');

/**
 * Session Manager - Persistence pentru MQTT sessions
 * Saves: sessionid, mqtt_session_id, subscription state, seq-ids
 */
class SessionManager {
  constructor(storageFile = '.ig-mqtt-session.json') {
    this.storageFile = storageFile;
    this.data = {
      sessionId: null,
      mqttSessionId: null,
      subscriptions: {},
      seqIds: {},
      topicAcks: {},
      lastConnected: null,
      reconnectAttempts: 0
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        this.data = JSON.parse(raw);
        debug('✓ Session loaded from disk');
      }
    } catch (e) {
      debug('Session load error (first run?):', e.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.data, null, 2));
      debug('✓ Session saved');
    } catch (e) {
      debug('Session save error:', e.message);
    }
  }

  setSessionId(sessionId) {
    this.data.sessionId = sessionId;
    this.save();
  }

  getSessionId() {
    return this.data.sessionId;
  }

  setMqttSessionId(mqttSessionId) {
    this.data.mqttSessionId = mqttSessionId;
    this.data.lastConnected = new Date().toISOString();
    this.save();
  }

  getMqttSessionId() {
    return this.data.mqttSessionId;
  }

  recordSubscription(topic, qos = 1) {
    this.data.subscriptions[topic] = {
      qos,
      subscribedAt: new Date().toISOString()
    };
    this.save();
  }

  getSubscriptions() {
    return Object.keys(this.data.subscriptions);
  }

  recordSeqId(topic, seqId) {
    this.data.seqIds[topic] = seqId;
    this.save();
  }

  getSeqId(topic) {
    return this.data.seqIds[topic] || 0;
  }

  recordAck(topic, msgId) {
    this.data.topicAcks[topic] = {
      msgId,
      ackedAt: new Date().toISOString()
    };
    this.save();
  }

  recordReconnectAttempt() {
    this.data.reconnectAttempts++;
    this.save();
  }

  resetReconnectAttempts() {
    this.data.reconnectAttempts = 0;
    this.save();
  }

  getReconnectAttempts() {
    return this.data.reconnectAttempts;
  }

  clear() {
    this.data = {
      sessionId: null,
      mqttSessionId: null,
      subscriptions: {},
      seqIds: {},
      topicAcks: {},
      lastConnected: null,
      reconnectAttempts: 0
    };
    this.save();
  }
}

module.exports = SessionManager;
