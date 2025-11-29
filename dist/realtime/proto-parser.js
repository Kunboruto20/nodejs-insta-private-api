const protobuf = require('protobufjs');
const pako = require('pako');
const debug = require('debug')('ig:proto');

/**
 * Protobuf Parser - Instagram MQTT messages
 * Simplified embedded proto without external file dependencies
 */
class ProtoParser {
  constructor() {
    this.root = null;
    this.loadedTypes = {};
    this.init();
  }

  init() {
    try {
      // Inline proto definitions - no file dependencies
      const proto = `
syntax = "proto3";

package ig.iris;

message IrisPayload {
  string action = 1;
  int64 seq_id = 2;
  repeated IrisItem items = 3;
}

message IrisItem {
  string id = 1;
  string type = 2;
  int64 timestamp = 3;
  string op = 4;
  string path = 5;
  MessageSyncMessage message = 6;
  ThreadUpdate thread = 7;
  TypingIndicator typing = 8;
  PresenceIndicator presence = 9;
}

message MessageSyncMessage {
  string item_id = 1;
  int64 user_id = 2;
  int64 timestamp = 3;
  string thread_id = 4;
  string thread_v2_id = 5;
  string item_type = 6;
  string text = 7;
  bool is_sent = 8;
  bool is_delivered = 9;
  bool is_read = 10;
  string emoji_reaction = 11;
}

message ThreadUpdate {
  string thread_id = 1;
  string thread_v2_id = 2;
  repeated int64 user_ids = 3;
  string thread_title = 4;
  int64 last_activity_at = 5;
  bool is_group = 6;
  bool is_archived = 7;
  bool is_muted = 8;
  string thread_type = 9;
}

message TypingIndicator {
  int64 thread_id = 1;
  int64 from_user_id = 2;
  string state = 3;
  int64 timestamp = 4;
}

message PresenceIndicator {
  int64 user_id = 1;
  string status = 2;
  int64 last_seen_at = 3;
}
      `;

      // Parse proto definition
      this.root = protobuf.parse(proto).root;
      
      // Load types
      this.loadedTypes = {
        IrisPayload: this.root.lookupType('ig.iris.IrisPayload'),
        IrisItem: this.root.lookupType('ig.iris.IrisItem'),
        MessageSyncMessage: this.root.lookupType('ig.iris.MessageSyncMessage'),
        ThreadUpdate: this.root.lookupType('ig.iris.ThreadUpdate'),
        TypingIndicator: this.root.lookupType('ig.iris.TypingIndicator'),
        PresenceIndicator: this.root.lookupType('ig.iris.PresenceIndicator')
      };

      debug('✓ Proto parser initialized with', Object.keys(this.loadedTypes).length, 'types');
    } catch (e) {
      debug('❌ Proto init failed:', e.message);
      this.root = null;
    }
  }

  decompress(buffer) {
    try {
      return pako.inflate(buffer);
    } catch (e) {
      try {
        return pako.ungzip(buffer);
      } catch (e2) {
        return buffer;
      }
    }
  }

  parsePayload(topicId, rawPayload) {
    try {
      if (!rawPayload || rawPayload.length === 0) {
        return { error: 'Empty', decoded: null };
      }

      const payload = this.decompress(rawPayload);
      debug(`📦 Topic ${topicId}: ${payload.length} bytes`);

      if (this.loadedTypes.IrisPayload) {
        try {
          const decoded = this.loadedTypes.IrisPayload.decode(payload);
          const message = this.loadedTypes.IrisPayload.toObject(decoded, {
            longs: String,
            enums: String,
            bytes: String
          });
          
          debug(`✓ Decoded ${message.items?.length || 0} items`);
          return { decoded: message, format: 'protobuf' };
        } catch (e) {
          debug(`Proto decode failed, trying JSON`);
          try {
            const json = JSON.parse(payload.toString('utf-8'));
            return { decoded: json, format: 'json' };
          } catch (e2) {
            return { error: 'Parse failed', decoded: null };
          }
        }
      }

      return { error: 'Proto not ready', decoded: null };
    } catch (e) {
      debug('Parse error:', e.message);
      return { error: e.message, decoded: null };
    }
  }

  extractMessages(payload) {
    if (!payload || !payload.items) return [];
    
    const messages = [];
    payload.items.forEach(item => {
      if (item.message) {
        messages.push({
          id: item.id,
          type: 'message',
          message: item.message
        });
      }
      if (item.thread) {
        messages.push({
          id: item.id,
          type: 'thread',
          thread: item.thread
        });
      }
      if (item.typing) {
        messages.push({
          id: item.id,
          type: 'typing',
          typing: item.typing
        });
      }
    });

    return messages;
  }

  isReady() {
    return this.root !== null && Object.keys(this.loadedTypes).length > 0;
  }

  getStats() {
    return {
      ready: this.isReady(),
      types: Object.keys(this.loadedTypes).length
    };
  }
}

module.exports = ProtoParser;
