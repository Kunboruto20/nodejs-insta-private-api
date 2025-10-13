const WebSocket = require('ws');

class RealtimeWS {
  constructor(url, client) {
    this.url = url;
    this.client = client;
    this.ws = null;
    this.listeners = [];
    this.heartbeatInterval = 30000; // 30 sec
  }

  connect() {
    this.ws = new WebSocket(this.url, {
      headers: {
        'User-Agent': 'Instagram 300.0.0.33.129 Android',
        'Cookie': `sessionid=${this.client.state.cookieSessionId || ''}; csrftoken=${this.client.state.cookieCsrfToken || ''}`
      }
    });

    this.ws.on('open', () => {
      console.log('[Realtime] Connected to Instagram Realtime Server');
      this._startHeartbeat();
    });

    this.ws.on('message', (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch { return; }
      this.listeners.forEach(cb => cb(data));
    });

    this.ws.on('close', () => {
      console.log('[Realtime] Disconnected. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => console.error('[Realtime] Error:', err));
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  onMessage(callback) {
    this.listeners.push(callback);
  }

  _startHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
    setTimeout(() => this._startHeartbeat(), this.heartbeatInterval);
  }
}

module.exports = RealtimeWS;
