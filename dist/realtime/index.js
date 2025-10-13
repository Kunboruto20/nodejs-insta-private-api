// dist/realtime/index.js
const EventEmitter = require('events');
const MqttLayer = require('./mqtt');

class Realtime extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.layer = null;
    this._connecting = false;
    this._shouldConnect = true;
    this._retries = 0;
    this._maxRetries = 10;
  }

  async connect() {
    if (this.layer && this.layer.isConnected()) return;
    if (this._connecting) return;
    this._connecting = true;

    this.layer = new MqttLayer(this.client);

    // forward low-level events
    this.layer.on('connected', () => {
      this._retries = 0;
      this.emit('connected');
    });

    this.layer.on('disconnected', (info) => {
      this.emit('disconnected', info);
      if (this._shouldConnect) {
        const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(this._retries, 6)));
        this._retries++;
        setTimeout(() => {
          this.connect().catch(err => {
            console.warn('[Realtime] reconnect attempt failed:', err && err.message ? err.message : err);
          });
        }, delay);
      }
    });

    this.layer.on('message', (msg) => {
      this.emit('message', msg);
    });

    this.layer.on('raw', (payload) => {
      this.emit('raw', payload);
    });

    this.layer.on('error', (err) => {
      this.emit('error', err);
    });

    try {
      await this.layer.connect();
      this._connecting = false;
    } catch (err) {
      this._connecting = false;
      throw err;
    }
  }

  async disconnect() {
    this._shouldConnect = false;
    if (this.layer) {
      try { await this.layer.disconnect(); } catch (_) {}
      this.layer = null;
    }
  }

  isConnected() {
    return this.layer && this.layer.isConnected();
  }

  async sendDirectMessage(threadId, text) {
    if (!this.layer || !this.layer.isConnected()) throw new Error('Realtime not connected');
    return this.layer.sendDirectMessage(threadId, text);
  }
}

module.exports = Realtime;
