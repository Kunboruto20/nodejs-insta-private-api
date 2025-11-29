const debug = require('debug')('ig:reconnect');

/**
 * Reconnect Manager - Exponential backoff untuk MQTT reconnection
 */
class ReconnectManager {
  constructor(options = {}) {
    this.initialDelay = options.initialDelay || 1000; // 1s
    this.maxDelay = options.maxDelay || 30000; // 30s
    this.multiplier = options.multiplier || 2;
    this.maxAttempts = options.maxAttempts || 0; // 0 = unlimited
    
    this.currentAttempt = 0;
    this.currentDelay = this.initialDelay;
    this.timerId = null;
  }

  /**
   * Get next delay using exponential backoff
   * 1s -> 2s -> 4s -> 8s -> 16s -> 30s (max)
   */
  getNextDelay() {
    if (this.currentAttempt === 0) {
      this.currentDelay = this.initialDelay;
    } else {
      this.currentDelay = Math.min(
        this.currentDelay * this.multiplier,
        this.maxDelay
      );
    }
    
    this.currentAttempt++;
    
    debug(`Reconnect attempt #${this.currentAttempt}, next delay: ${this.currentDelay}ms`);
    
    return this.currentDelay;
  }

  /**
   * Schedule reconnection after calculated delay
   */
  scheduleReconnect(callback) {
    if (this.maxAttempts > 0 && this.currentAttempt >= this.maxAttempts) {
      debug('❌ Max reconnection attempts reached');
      return false;
    }

    const delay = this.getNextDelay();
    
    this.timerId = setTimeout(() => {
      debug(`🔄 Reconnecting... (attempt ${this.currentAttempt})`);
      callback();
    }, delay);

    return true;
  }

  /**
   * Reset on successful connection
   */
  reset() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentAttempt = 0;
    this.currentDelay = this.initialDelay;
    debug('✓ Reconnect manager reset');
  }

  /**
   * Cancel pending reconnection
   */
  cancel() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      currentAttempt: this.currentAttempt,
      currentDelay: this.currentDelay,
      maxAttempts: this.maxAttempts,
      pending: !!this.timerId
    };
  }
}

module.exports = ReconnectManager;
