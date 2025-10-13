const WebSocket = require('ws');
const EventEmitter = require('events');

class IgWebSocket extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.ws = null;
    this.connected = false;
    this.reconnectDelay = 5000; // initial reconnect delay
    this.pingInterval = null;
  }

  getWebSocketUrl() {
    const userId = this.client.state.cookieUserId;
    const sessionId = this.client.state.cookieSessionId; // sessionid
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
        this._startPing();
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
        this._stopPing();
        this._reconnect();
      });

      this.ws.on('error', (err) => {
        this.connected = false;
        this.emit('error', err);
        this._stopPing();
        this._reconnect();
        reject(err);
      });
    });
  }

  _startPing() {
    this.pingInterval = setInterval(() => {
      if (this.connected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // ping la fiecare 30 secunde
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _reconnect() {
    setTimeout(() => {
      this.connect().catch(err => {
        console.error('[Realtime] Reconnect failed:', err.message);
      });
    }, this.reconnectDelay);
  }

  async disconnect() {
    if (!this.connected || !this.ws) return;
    this._stopPing();
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
