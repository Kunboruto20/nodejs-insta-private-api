// dist/realtime/index.js
const EventEmitter = require('events');
const WebsocketLayer = require('./websocket');

class Realtime extends EventEmitter {
  /**
   * client = instance of IgApiClient (has state, request, etc)
   */
  constructor(client) {
    super();
    this.client = client;
    this.wsLayer = null;
    this._connecting = false;
    this._shouldConnect = true;
    this._retries = 0;
    this._maxRetries = 8;
  }

  /**
   * Expose on/emit from EventEmitter (inherited)
   */

  /**
   * Build options and connect.
   * Returns a Promise that resolves when connected, rejects on fatal error.
   */
  async connect() {
    if (this.wsLayer && this.wsLayer.isConnected()) return;
    if (this._connecting) return; // concurrent connect prevented
    this._connecting = true;

    // create new layer
    this.wsLayer = new WebsocketLayer(this.client);

    // forward events
    this.wsLayer.on('connected', () => {
      this._retries = 0;
      this.emit('connected');
    });

    this.wsLayer.on('disconnected', (info) => {
      this.emit('disconnected', info);
      // auto-reconnect with backoff
      if (this._shouldConnect) {
        const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(this._retries, 6)));
        this._retries++;
        setTimeout(() => {
          this.connect().catch(err => {
            // log non-fatal
            console.warn('[Realtime] reconnect attempt failed:', err && err.message ? err.message : err);
          });
        }, delay);
      }
    });

    this.wsLayer.on('error', (err) => {
      this.emit('error', err);
    });

    this.wsLayer.on('message', (msg) => {
      // normalized message -> emit
      this.emit('message', msg);
    });

    this.wsLayer.on('raw', (payload) => {
      this.emit('raw', payload);
    });

    try {
      await this.wsLayer.connect();
      this._connecting = false;
      return;
    } catch (err) {
      this._connecting = false;
      // fail silently to caller (caller decides)
      throw err;
    }
  }

  async disconnect() {
    this._shouldConnect = false;
    if (this.wsLayer) {
      try { await this.wsLayer.disconnect(); } catch (_) {}
      this.wsLayer = null;
    }
  }

  isConnected() {
    return this.wsLayer && this.wsLayer.isConnected();
  }

  /**
   * Send a direct message via realtime layer (if supported)
   */
  async sendDirectMessage(threadId, text) {
    if (!this.wsLayer || !this.wsLayer.isConnected()) {
      throw new Error('Realtime not connected');
    }
    return this.wsLayer.sendDirectMessage(threadId, text);
  }
}

module.exports = Realtime;
