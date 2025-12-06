const debug = require('debug')('ig:delta');

/**
 * Delta Sync Manager - Apply real Instagram delta updates to local state
 * Based on MessageSync format from reverse-engineered instagram_mqtt
 */
class DeltaSyncManager {
  constructor() {
    this.state = {
      threads: {},     // thread_id → ThreadUpdate
      messages: {},    // item_id → MessageSyncMessage
      typing: {},      // thread_id → TypingIndicator
      presence: {}     // user_id → PresenceIndicator
    };
    this.listeners = [];
    this.operations = { add: 0, update: 0, delete: 0 };
  }

  /**
   * Apply delta operations (add/update/delete) to local state
   */
  applyDelta(delta) {
    if (!delta || !delta.items || delta.items.length === 0) {
      return { applied: 0, errors: [], stats: this.operations };
    }

    let applied = 0;
    const errors = [];

    delta.items.forEach(item => {
      try {
        const result = this.applyItem(item);
        if (result) applied++;
      } catch (e) {
        errors.push({ 
          itemId: item.id || item.item_id, 
          error: e.message,
          operation: item.op || item.type
        });
        debug(`❌ Error applying item:`, e.message);
      }
    });

    // Notify listeners
    if (applied > 0) {
      this.notifyListeners(delta);
    }

    return { 
      applied, 
      errors, 
      total: delta.items.length,
      stats: this.operations
    };
  }

  /**
   * Apply single item (message, thread, typing, presence)
   */
  applyItem(item) {
    if (!item) return false;

    // Get operation type from IrisItem
    const operation = item.op || item.type || 'add'; // add, replace, delete

    // Extract data from 'data' oneof field
    if (item.data?.message) {
      return this.applyMessage(operation, item.data.message);
    }

    if (item.data?.thread) {
      return this.applyThread(operation, item.data.thread);
    }

    if (item.data?.typing) {
      return this.applyTyping(operation, item.data.typing);
    }

    if (item.data?.presence) {
      return this.applyPresence(operation, item.data.presence);
    }

    // Fallback for direct objects
    if (item.message) {
      return this.applyMessage(operation, item.message);
    }
    if (item.thread) {
      return this.applyThread(operation, item.thread);
    }
    if (item.typing) {
      return this.applyTyping(operation, item.typing);
    }
    if (item.presence) {
      return this.applyPresence(operation, item.presence);
    }

    return false;
  }

  /**
   * Apply message delta (real Instagram MessageSyncMessage format)
   */
  applyMessage(operation, message) {
    const msgId = message.item_id;

    if (operation === 'delete' || operation === 'deletion') {
      delete this.state.messages[msgId];
      this.operations.delete++;
      debug(`🗑️  Deleted message ${msgId}`);
      return true;
    }

    if (operation === 'replace' || operation === 'update') {
      if (!this.state.messages[msgId]) {
        debug(`⚠️  Message ${msgId} not found for update`);
        return false;
      }
      Object.assign(this.state.messages[msgId], message);
      this.operations.update++;
      debug(`✏️  Updated message ${msgId}: "${message.text?.substring(0, 30)}"`);
      return true;
    }

    // add/default
    this.state.messages[msgId] = message;
    this.operations.add++;
    debug(`➕ Added message ${msgId}: "${message.text?.substring(0, 30) || 'media'}"`);
    return true;
  }

  /**
   * Apply thread delta (real Instagram ThreadUpdate format)
   */
  applyThread(operation, thread) {
    const threadId = thread.thread_id || thread.thread_v2_id;

    if (operation === 'delete') {
      delete this.state.threads[threadId];
      this.operations.delete++;
      debug(`🗑️  Deleted thread ${threadId}`);
      return true;
    }

    if (operation === 'replace' || operation === 'update') {
      if (!this.state.threads[threadId]) {
        // Create new thread on update if doesn't exist
        this.state.threads[threadId] = thread;
        this.operations.add++;
        debug(`➕ Created thread from update: ${thread.thread_title}`);
        return true;
      }
      Object.assign(this.state.threads[threadId], thread);
      this.operations.update++;
      debug(`✏️  Updated thread ${threadId}: "${thread.thread_title}"`);
      return true;
    }

    // add/default
    this.state.threads[threadId] = thread;
    this.operations.add++;
    debug(`➕ Added thread: "${thread.thread_title}" (${thread.user_ids?.length || 1} members)`);
    return true;
  }

  /**
   * Apply typing indicator delta
   */
  applyTyping(operation, typing) {
    const threadId = typing.thread_id;

    if (operation === 'delete' || typing.state === 'stopped') {
      delete this.state.typing[threadId];
      this.operations.delete++;
      debug(`⌨️  User ${typing.from_user_id} stopped typing in ${threadId}`);
      return true;
    }

    this.state.typing[threadId] = typing;
    this.operations.add++;
    debug(`⌨️  User ${typing.from_user_id} typing in ${threadId}`);
    return true;
  }

  /**
   * Apply presence indicator delta
   */
  applyPresence(operation, presence) {
    const userId = presence.user_id;

    if (operation === 'delete' || presence.status === 'inactive') {
      delete this.state.presence[userId];
      this.operations.delete++;
      debug(`🔴 User ${userId} offline`);
      return true;
    }

    this.state.presence[userId] = presence;
    this.operations.add++;
    debug(`🟢 User ${userId} ${presence.status}`);
    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify listeners of changes
   */
  notifyListeners(delta) {
    this.listeners.forEach(callback => {
      try {
        callback(delta, this.getState());
      } catch (e) {
        debug('Listener error:', e.message);
      }
    });
  }

  /**
   * Get current synchronized state
   */
  getState() {
    return {
      threads: JSON.parse(JSON.stringify(this.state.threads)),
      messages: JSON.parse(JSON.stringify(this.state.messages)),
      typing: JSON.parse(JSON.stringify(this.state.typing)),
      presence: JSON.parse(JSON.stringify(this.state.presence))
    };
  }

  /**
   * Query methods
   */
  getThread(threadId) {
    return this.state.threads[threadId] || null;
  }

  getThreadMessages(threadId) {
    return Object.values(this.state.messages).filter(m => m.thread_id === threadId || m.thread_v2_id === threadId);
  }

  getThreads() {
    return Object.values(this.state.threads);
  }

  getAllMessages() {
    return Object.values(this.state.messages);
  }

  getTypingInThread(threadId) {
    return this.state.typing[threadId] || null;
  }

  getUserPresence(userId) {
    return this.state.presence[userId] || null;
  }

  /**
   * Stats
   */
  getStats() {
    return {
      threads: Object.keys(this.state.threads).length,
      messages: Object.keys(this.state.messages).length,
      typing: Object.keys(this.state.typing).length,
      presence: Object.keys(this.state.presence).length,
      operations: this.operations
    };
  }

  /**
   * Clear all state
   */
  clear() {
    this.state = {
      threads: {},
      messages: {},
      typing: {},
      presence: {}
    };
    this.operations = { add: 0, update: 0, delete: 0 };
    debug('✓ State cleared');
  }
}

module.exports = DeltaSyncManager;
