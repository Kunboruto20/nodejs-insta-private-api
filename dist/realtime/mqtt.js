// dist/realtime/mqtt.js
const EventEmitter = require('events');
const url = require('url');

let mqtt = null;
try {
  mqtt = require('mqtt'); // must be installed with npm install mqtt
} catch (e) {
  mqtt = null;
}

const DEFAULT_BROKERS = [
  'wss://edge-mqtt.facebook.com:443/mqtt',      // common entry
  'wss://edge-mqtt.instagram.com:443/mqtt',     // variant
];

function buildCookieStringFromState(state) {
  const parts = [];
  try {
    // Try to extract cookies from cookieStore (tough-cookie CookieJar)
    if (state && state.cookieStore && typeof state.cookieStore.getCookiesSync === 'function') {
      const host = (state.constants && state.constants.HOST) ? state.constants.HOST : 'https://i.instagram.com';
      const cookies = state.cookieStore.getCookiesSync(host);
      if (Array.isArray(cookies)) {
        cookies.forEach(c => {
          if (c && c.key && c.value) parts.push(`${c.key}=${c.value}`);
        });
      }
    }
  } catch (e) {
    // ignore
  }

  // fallback to known fields on state (if present)
  try {
    if (state && state.cookieSessionId) parts.push(`sessionid=${state.cookieSessionId}`);
    if (state && state.sessionid) parts.push(`sessionid=${state.sessionid}`);
    if (state && state.cookieCsrfToken) parts.push(`csrftoken=${state.cookieCsrfToken}`);
    if (state && state.csrfToken) parts.push(`csrftoken=${state.csrfToken}`);
  } catch (e) {}

  return parts.join('; ');
}

function buildUserAgentFromState(state) {
  try {
    if (state && state.appUserAgent) return state.appUserAgent;
    if (state && state.appVersion) {
      return `Instagram ${state.appVersion} Android (${state.deviceString || 'Unknown'}; ${state.language || 'en_US'}; ${state.appVersionCode || '0'})`;
    }
  } catch (e) {}
  return 'Instagram 300.0.0.0 Android';
}

class MqttLayer extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this._mqttClient = null;
    this._connected = false;
    this._selectedBroker = null;
    this._heartbeatTimer = null;
    this._keepAlive = 30; // seconds
    this._subscribeTried = false;
  }

  isConnected() {
    return this._connected;
  }

  async connect() {
    if (!mqtt) throw new Error('mqtt package not installed. Run: npm install mqtt');

    const cookieHeader = buildCookieStringFromState(this.client.state);
    const userAgent = buildUserAgentFromState(this.client.state);

    // attempt brokers in order
    for (const broker of DEFAULT_BROKERS) {
      try {
        await this._connectToBroker(broker, { cookieHeader, userAgent });
        this._selectedBroker = broker;
        return;
      } catch (err) {
        // on failure try next
        try { await this.disconnect(); } catch (_) {}
        continue;
      }
    }
    throw new Error('All brokers failed to connect');
  }

  _connectToBroker(brokerUrl, { cookieHeader, userAgent }) {
    return new Promise((resolve, reject) => {
      const parsed = url.parse(brokerUrl);
      const opts = {
        protocol: 'wss',
        clientId: `ig_${(this.client.state && (this.client.state.uuid || this.client.state.deviceId)) || Date.now()}`,
        keepalive: this._keepAlive,
        clean: true,
        reconnectPeriod: 0, // we handle reconnect from upper layer
        connectTimeout: 10000,
        // MQTT over WebSocket options go inside wsOptions
        wsOptions: {
          headers: {
            'User-Agent': userAgent,
            'Cookie': cookieHeader,
            'Origin': 'https://www.instagram.com'
          },
          rejectUnauthorized: true
        },
        protocolId: 'MQTT',
        protocolVersion: 4
      };

      let settled = false;
      const client = mqtt.connect(brokerUrl, opts);

      const onConnect = () => {
        if (settled) return;
        settled = true;
        this._mqttClient = client;
        this._connected = true;
        this._startHeartbeat();
        this._attachHandlers();
        this.emit('connected');
        resolve();
      };

      const onError = (err) => {
        if (!settled) {
          settled = true;
          try { client.end(true); } catch (_) {}
          reject(err || new Error('mqtt connect error'));
        } else {
          this.emit('error', err);
        }
      };

      client.once('connect', onConnect);
      client.once('error', onError);

      // safety timeout
      const t = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { client.end(true); } catch (_) {}
          reject(new Error('mqtt connect timeout'));
        }
      }, 12000);

      // cleanup eventual
      client.once('close', () => {
        clearTimeout(t);
      });
    });
  }

  _attachHandlers() {
    if (!this._mqttClient) return;
    this._mqttClient.on('message', (topic, message) => {
      // emit raw + parsed if JSON
      this.emit('raw', { topic, message });
      let parsed = null;
      try { parsed = JSON.parse(message.toString()); } catch (e) {}
      this.emit('message', { topic, payload: message, json: parsed });
    });

    this._mqttClient.on('close', () => {
      this._connected = false;
      this._stopHeartbeat();
      this.emit('disconnected');
    });

    this._mqttClient.on('error', (err) => {
      this.emit('error', err);
    });

    // Try subscribing to generic topics — Instagram MQTT topics are internal and may differ.
    // We attempt '#' (all) as best-effort; broker may reject or ignore.
    if (!this._subscribeTried) {
      this._subscribeTried = true;
      try {
        this._mqttClient.subscribe('#', { qos: 0 }, (err) => {
          // ignore errors, but log
          if (err) this.emit('error', new Error('subscribe failed: ' + (err.message || err)));
        });
      } catch (e) {
        // ignore
      }
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      try {
        if (this._mqttClient && this._mqttClient.connected) {
          // mqtt client handles pingreq/pingresp internally — nothing needed here
        }
      } catch (e) {}
    }, (this._keepAlive - 5) * 1000);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  async disconnect() {
    this._stopHeartbeat();
    if (this._mqttClient) {
      try {
        await new Promise((res) => { this._mqttClient.end(true, {}, res); });
      } catch (e) {}
      try { this._mqttClient.removeAllListeners(); } catch (_) {}
      this._mqttClient = null;
    }
    this._connected = false;
    this.emit('disconnected');
  }

  /**
   * Best-effort send direct message via MQTT — Instagram uses internal topic/payload
   * This function publishes to a default topic; you likely need to adapt payload/topic to match server.
   */
  async sendDirectMessage(threadId, text) {
    if (!this._mqttClient || !this._connected) throw new Error('Not connected');

    const payload = JSON.stringify({
      type: 'direct_message',
      thread_id: threadId,
      text,
      ts: Date.now()
    });

    return new Promise((resolve, reject) => {
      try {
        this._mqttClient.publish('direct_v2', payload, { qos: 0 }, (err) => {
          if (err) return reject(err);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = MqttLayer;
