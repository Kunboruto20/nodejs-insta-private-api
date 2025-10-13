const RealtimeWS = require('./websocket');

class RealtimeRepository {
  constructor(client) {
    this.client = client;
    this.ws = new RealtimeWS('wss://edge-mqtt.facebook.com', client);
  }

  start() {
    this.ws.connect();
  }

  sendMessage(toUserId, message) {
    const payload = {
      type: 'direct_message',
      recipient_id: toUserId,
      text: message,
      timestamp: Date.now(),
    };
    this.ws.send(payload);
  }

  onMessage(callback) {
    this.ws.onMessage(callback);
  }
}

module.exports = RealtimeRepository;
