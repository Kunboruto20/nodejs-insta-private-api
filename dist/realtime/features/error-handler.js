"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const shared_1 = require("../../shared");
/**
 * MQTT Error Handler with recovery strategies
 */
class ErrorHandler {
    constructor(client) {
        this.errorDebug = (0, shared_1.debugChannel)('realtime', 'errors');
        this.errorCount = 0;
        this.maxRetries = 5;
        this.client = client;
    }
    /**
     * Handle MQTT connection error
     */
    handleConnectionError(error) {
        this.errorCount++;
        this.errorDebug(`Connection Error (${this.errorCount}/${this.maxRetries}): ${error.message}`);
        
        if (this.errorCount >= this.maxRetries) {
            this.client.emit('error', new Error('Max connection retries exceeded'));
            return false;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.errorCount - 1), 30000);
        this.errorDebug(`Retrying in ${delay}ms...`);
        
        setTimeout(() => {
            this.client.reconnect();
        }, delay);
        
        return true;
    }
    /**
     * Handle payload validation error
     */
    handlePayloadError(error, topic) {
        this.errorDebug(`Payload Error on topic ${topic}: ${error.message}`);
        this.client.emit('warning', {
            type: 'payload_error',
            topic,
            error: error.message,
        });
    }
    /**
     * Handle protocol error
     */
    handleProtocolError(error) {
        this.errorDebug(`Protocol Error: ${error.message}`);
        this.client.emit('error', new Error(`MQTT Protocol Error: ${error.message}`));
    }
    /**
     * Reset error counter on successful connection
     */
    resetErrorCounter() {
        this.errorCount = 0;
        this.errorDebug('Error counter reset');
    }
    /**
     * Get error stats
     */
    getErrorStats() {
        return {
            errorCount: this.errorCount,
            maxRetries: this.maxRetries,
            canRetry: this.errorCount < this.maxRetries,
        };
    }
}
exports.ErrorHandler = ErrorHandler;
