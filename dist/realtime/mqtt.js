const EventEmitter = require('events');
const url = require('url');
const mqtt = require('mqtt');

const BROKER = 'wss://edge-mqtt.instagram.com:443/mqtt';

function buildCookieString(state) {
  const parts = [];
  if (state.cookieStore && state.cookieStore.getCookiesSync) {
    const cookies = state.cookieStore.getCookiesSync(state.constants.HOST);
    cookies.forEach(c => parts.push(`${c.key}=${c.value}`));
  }
  if (state.cookieCsrfToken) parts.push(`csrftoken=${state.cookieCsrfToken}`);
  return parts.join('; ');
}

function buildUserAgent(state) {
  return state.appUserAgent || 'Instagram 401.0.0.48.79 Android';
}

class MqttLayer extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this._connected = false;
    this._mqttClient = null;
  }

  async connect() {
    const cookieHeader = buildCookieString(this.client.state);
    const userAgent = buildUserAgent(this.client.state);

    return new Promise((resolve, reject) => {
      const clientId = `ig_${this.client.state.uuid}`;
      this._mqttClient = mqtt.connect(BROKER, {
        protocol: 'wss',
        clientId,
        keepalive: 30,
        clean: true,
        wsOptions: { headers: { 'User-Agent': userAgent, 'Cookie': cookieHeader, 'Origin': 'https://www.instagram.com' }, rejectUnauthorized: true },
      });

      this._mqttClient.once('connect', () => {
        this._connected = true;
        this._mqttClient.subscribe('#', { qos: 0 });
        this._attachHandlers();
        resolve();
      });

      this._mqttClient.once('error', reject);
    });
  }

  _attachHandlers() {
    if (!this._mqttClient) return;
    this._mqttClient.on('message', (topic, message) => this.emit('message', { topic, payload: message.toString() }));
    this._mqttClient.on('close', () => (this._connected = false));
  }

  async sendDirectMessage(threadId, text) {
    if (!this._connected) throw new Error('MQTT not connected');
    const payload = JSON.stringify({ type: 'direct_message', thread_id: threadId, text, ts: Date.now() });
    return new Promise((res, rej) => this._mqttClient.publish('direct_v2', payload, { qos: 0 }, err => (err ? rej(err) : res())));
  }
}

module.exports = MqttLayer;
