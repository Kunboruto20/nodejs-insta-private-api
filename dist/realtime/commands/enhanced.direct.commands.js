"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedDirectCommands = void 0;
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
const constants_1 = require("../../constants");

/**
 * Enhanced Direct Commands - sends MQTT directly with proper payload formatting
 */
class EnhancedDirectCommands {
    constructor(client) {
        this.realtimeClient = client;
        this.enhancedDebug = (0, shared_1.debugChannel)('realtime', 'enhanced-commands');
    }

    /**
     * Send text via MQTT with proper payload format
     */
    async sendTextViaRealtime(threadId, text) {
        this.enhancedDebug(`Sending text to ${threadId}: "${text}"`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            // Build proper command payload
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'text',
                text: text,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            // Compress JSON payload
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            // Send to MQTT
            this.enhancedDebug(`Publishing to MQTT topic ${constants_1.Topics.SEND_MESSAGE.id}`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Message sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Failed: ${err.message}`);
            throw err;
        }
    }
}
exports.EnhancedDirectCommands = EnhancedDirectCommands;
