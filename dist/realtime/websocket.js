const WebSocket = require('ws');
const EventEmitter = require('events');

class IgWebSocket extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.ws = null;
    this.connected = false;
  }

  /**
   * Build WebSocket URL for Instagram realtime API
   */
  getWebSocketUrl() {
    const userId = this.client.state.cookieUserId;
    const sessionId = this.client.state.cookieSessionId; // or sessionid
    return `wss://edge-mqtt.facebook.com:443/mqtt?userid=${userId}&sessionid=${sessionId}&clientid=IG_NODEJS`;
  }

  async connect() {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      const url = this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.emit('message', msg);
        } catch (err) {
          this.emit('error', err);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.ws.on('error', (err) => {
        this.connected = false;
        this.emit('error', err);
        reject(err);
      });
    });
  }

  async disconnect() {
    if (!this.connected || !this.ws) return;
    this.ws.close();
    this.connected = false;
  }

  send(data) {
    if (!this.connected || !this.ws) throw new Error('WebSocket not connected');
    const json = JSON.stringify(data);
    this.ws.send(json);
  }
}

module.exports = IgWebSocket;
