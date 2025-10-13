// dist/realtime/websocket.js
const EventEmitter = require('events');

let mqttLib = null;
let WebSocket = null;
try {
  mqttLib = require('mqtt'); // optional: preferat
} catch (e) {
  mqttLib = null;
}
try {
  WebSocket = require('ws');
} catch (e) {
  WebSocket = null;
}

/**
 * Helper: returns cookie string with sessionid and csrftoken (if available)
 */
function buildCookieString(clientState) {
  const parts = [];
  try {
    if (clientState && clientState.authorization) {
      // do not leak sensitive tokens; prefer session cookie
    }
    if (clientState && clientState.cookieStore) {
      // cookieStore may not be easy to extract; try known cookies
      try {
        const cs = clientState.cookieStore.getCookiesSync?.(clientState.constants?.HOST || 'https://i.instagram.com') || [];
        for (const c of cs) {
          if (c && c.key && c.value) parts.push(`${c.key}=${c.value}`);
        }
      } catch (e) {
        // ignore
      }
    }
    // fallback to session fields if set on state
    if (clientState.sessionid) parts.push(`sessionid=${clientState.sessionid}`);
    if (clientState.cookieSessionId) parts.push(`sessionid=${clientState.cookieSessionId}`);
    if (clientState.cookieCsrfToken) parts.push(`csrftoken=${clientState.cookieCsrfToken}`);
    if (clientState.password) {
      // never include raw password
    }
  } catch (e) {
    // ignore
  }
  return parts.join('; ');
}

/**
 * Websocket / MQTT layer that:
 * - prefers mqtt over ws
 * - handles ping/heartbeat
 * - emits events: connected, disconnected, error, message, raw
 */
class WebsocketLayer extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this._connected = false;
    this._mqttClient = null;
    this._ws = null;
    this._heartbeatTimer = null;
    this._pingInterval = 30000; // 30s
    this._brokerCandidates = [
      'wss://edge-mqtt.facebook.com:443/mqtt',
      'wss://edge-mqtt.instagram.com:443/mqtt',
      'wss://edge-mqtt.facebook.com:443/ws', // variants
    ];
    this._selectedBroker = null;
  }

  isConnected() {
    return this._connected;
  }

  async connect() {
    // choose first working broker
    for (const broker of this._brokerCandidates) {
      try {
        await this._tryConnectBroker(broker);
        this._selectedBroker = broker;
        return;
      } catch (err) {
        // log and try next
        // console.warn('[Realtime] broker failed', broker, err && err.message ? err.message : err);
        await this._cleanup();
        continue;
      }
    }
    // none worked
    throw new Error('No MQTT/WebSocket broker could be connected (all candidates failed)');
  }

  async _tryConnectBroker(brokerUrl) {
    // If mqtt lib available, try mqtt.connect with cookies in wsOptions
    const cookieStr = buildCookieString(this.client.state);
    if (mqttLib) {
      return new Promise((resolve, reject) => {
        const opts = {
          protocol: 'wss',
          wsOptions: {
            headers: {
              'User-Agent': this._buildUserAgent(),
              'Cookie': cookieStr,
            },
            rejectUnauthorized: true,
          },
          connectTimeout: 10000,
          reconnectPeriod: 0, // we handle reconnect ourselves
        };

        // add clientId if available (helps server)
        try {
          const clientId = `IG_${this.client.state.deviceId || this.client.state.uuid || Date.now()}`;
          opts.clientId = clientId;
        } catch (e) {}

        const mqttClient = mqttLib.connect(brokerUrl, opts);

        let settled = false;
        const onConnect = () => {
          settled = true;
          this._mqttClient = mqttClient;
          this._connected = true;
          this._attachMqttHandlers(mqttClient);
          this.emit('connected');
          resolve();
        };
        const onError = (err) => {
          if (!settled) {
            settled = true;
            try { mqttClient.end(true); } catch (_) {}
            reject(err || new Error('mqtt connect error'));
          } else {
            this.emit('error', err);
          }
        };

        mqttClient.once('connect', onConnect);
        mqttClient.once('error', onError);

        // safety timeout
        setTimeout(() => {
          if (!settled) {
            settled = true;
            try { mqttClient.end(true); } catch (_) {}
            reject(new Error('mqtt connect timeout'));
          }
        }, 12000);
      });
    }

    // fallback: try plain websocket connect (will likely be closed if server expects mqtt)
    if (!WebSocket) {
      throw new Error('No mqtt or ws library available');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(brokerUrl, {
        headers: {
          'User-Agent': this._buildUserAgent(),
          'Cookie': cookieStr,
          'Origin': 'https://www.instagram.com',
        },
      });

      let opened = false;
      const onOpen = () => {
        opened = true;
        this._ws = ws;
        this._connected = true;
        this._startHeartbeat();
        this._attachWsHandlers(ws);
        this.emit('connected');
        resolve();
      };

      const onError = (err) => {
        if (!opened) {
          try { ws.terminate(); } catch (_) {}
          reject(err || new Error('ws connect error'));
        } else {
          this.emit('error', err);
        }
      };

      ws.once('open', onOpen);
      ws.once('error', onError);

      // safety timeout
      setTimeout(() => {
        if (!opened) {
          try { ws.terminate(); } catch (_) {}
          reject(new Error('ws connect timeout'));
        }
      }, 10000);
    });
  }

  _attachMqttHandlers(mqttClient) {
    mqttClient.on('message', (topic, message) => {
      // emit raw then parsed if possible
      this.emit('raw', { topic, message });
      let parsed = null;
      try {
        parsed = JSON.parse(message.toString());
      } catch (e) {}
      this.emit('message', { topic, payload: message, json: parsed });
    });

    mqttClient.on('close', () => {
      this._connected = false;
      this.emit('disconnected');
    });

    mqttClient.on('error', (err) => {
      this.emit('error', err);
    });

    // auto-subscribe to interestingtopics if exists — non-intrusive default
    try {
      // try to subscribe to '#' if broker allows (some brokers may reject)
      mqttClient.subscribe('#', { qos: 0 }, (err) => {
        if (err) {
          // ignore subscribe errors
        }
      });
    } catch (e) {}
  }

  _attachWsHandlers(ws) {
    ws.on('message', (data) => {
      this.emit('raw', data);
      // try parse JSON if applicable
      try {
        const s = data.toString();
        const json = JSON.parse(s);
        this.emit('message', json);
      } catch (e) {
        // not JSON — emit raw
        this.emit('message', data);
      }
    });

    ws.on('close', () => {
      this._connected = false;
      this._stopHeartbeat();
      this.emit('disconnected');
    });

    ws.on('error', (err) => {
      this._connected = false;
      this._stopHeartbeat();
      this.emit('error', err);
    });
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    if (!this._pingInterval) this._pingInterval = 30000;
    this._heartbeatTimer = setInterval(() => {
      try {
        if (this._mqttClient && this._mqttClient.connected) {
          // mqtt ping is handled internally by library
        } else if (this._ws && this._ws.readyState === this._ws.OPEN) {
          try { this._ws.ping(); } catch (e) {}
        }
      } catch (e) {}
    }, this._pingInterval);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  async disconnect() {
    this._stopHeartbeat();
    try {
      if (this._mqttClient) {
        await new Promise((res) => { this._mqttClient.end(true, {}, res); });
      }
    } catch (e) {}
    try {
      if (this._ws) {
        this._ws.close();
      }
    } catch (e) {}
    this._connected = false;
    this.emit('disconnected');
    await this._cleanup();
  }

  async _cleanup() {
    try {
      if (this._mqttClient) {
        try { this._mqttClient.removeAllListeners(); } catch (_) {}
        try { this._mqttClient.end(true); } catch (_) {}
        this._mqttClient = null;
      }
    } catch (e) {}
    try {
      if (this._ws) {
        try { this._ws.removeAllListeners(); } catch (_) {}
        try { this._ws.terminate(); } catch (_) {}
        this._ws = null;
      }
    } catch (e) {}
    this._stopHeartbeat();
    this._connected = false;
  }

  _buildUserAgent() {
    // try to use appUserAgent from state or fallback
    try {
      if (this.client && this.client.state && this.client.state.appUserAgent) return this.client.state.appUserAgent;
      if (this.client && this.client.state && this.client.state.appVersion) {
        return `Instagram ${this.client.state.appVersion} Android (${this.client.state.deviceString || 'Unknown'}; ${this.client.state.language || 'en_US'}; ${this.client.state.appVersionCode || '0'})`;
      }
    } catch (e) {}
    return 'Instagram 300.0.0.0 Android';
  }

  /**
   * Optional helper: send direct message via mqtt/ws layer (best-effort).
   * Implementation is generic: emits 'pub' for mqtt or sends on ws.
   * NOTE: Instagram server expects specific topic/payload formats — you may need to adapt.
   */
  async sendDirectMessage(threadId, text) {
    if (!this._connected) throw new Error('Not connected');

    const payload = {
      type: 'direct_message',
      thread_id: threadId,
      text,
      ts: Date.now(),
    };

    if (this._mqttClient && this._mqttClient.connected) {
      // best-effort publish to topic — topic name may be incorrect for Instagram; adapt if you know it
      try {
        this._mqttClient.publish('direct_v2', JSON.stringify(payload), { qos: 0 }, (err) => {
          if (err) this.emit('error', err);
        });
        return;
      } catch (e) {
        throw e;
      }
    } else if (this._ws && this._ws.readyState === this._ws.OPEN) {
      try {
        this._ws.send(JSON.stringify(payload));
        return;
      } catch (e) {
        throw e;
      }
    } else {
      throw new Error('No transport available to send message');
    }
  }
}

module.exports = WebsocketLayer;
