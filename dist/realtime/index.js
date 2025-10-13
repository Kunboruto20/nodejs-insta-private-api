const IgWebSocket = require('./websocket');

class Realtime {
  constructor(client) {
    this.client = client;
    this.ws = new IgWebSocket(client);

    this.ws.on('message', (msg) => {
      // Emit evenimente pe client
      if (msg.type === 'direct_message') {
        this.client.emit('direct_message', msg);
      }
      if (msg.type === 'thread_update') {
        this.client.emit('thread_update', msg);
      }
      if (msg.type === 'story_update') {
        this.client.emit('story_update', msg);
      }
    });

    this.ws.on('connected', () => {
      console.log('[Realtime] Connected to Instagram Realtime WebSocket');
    });

    this.ws.on('disconnected', () => {
      console.log('[Realtime] Disconnected from Instagram Realtime WebSocket, reconnecting...');
    });

    this.ws.on('error', (err) => {
      console.error('[Realtime] WebSocket error:', err);
    });
  }

  async connect() {
    await this.ws.connect();
  }

  async disconnect() {
    await this.ws.disconnect();
  }

  sendDirectMessage(threadId, text) {
    if (!this.ws.connected) throw new Error('WebSocket not connected');
    const payload = {
      type: 'direct_message',
      thread_id: threadId,
      text,
    };
    this.ws.send(payload);
  }

  sendReaction(threadId, reaction) {
    if (!this.ws.connected) throw new Error('WebSocket not connected');
    const payload = {
      type: 'reaction',
      thread_id: threadId,
      reaction,
    };
    this.ws.send(payload);
  }

  markThreadSeen(threadId) {
    if (!this.ws.connected) throw new Error('WebSocket not connected');
    const payload = {
      type: 'mark_seen',
      thread_id: threadId,
    };
    this.ws.send(payload);
  }
}

module.exports = Realtime;
