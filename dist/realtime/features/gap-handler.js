"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GapHandler = void 0;
const shared_1 = require("../../shared");
/**
 * Gap Handler - Handle message gaps and synchronization
 */
class GapHandler {
    constructor(client) {
        this.gapDebug = (0, shared_1.debugChannel)('realtime', 'gap');
        this.threadGaps = new Map();
        this.client = client;
    }
    /**
     * Detect message gap in thread
     */
    detectGap(threadId, lastMessageId, newMessageId) {
        const lastId = parseInt(lastMessageId, 10);
        const newId = parseInt(newMessageId, 10);
        const gap = Math.abs(newId - lastId) > 1;
        
        if (gap) {
            this.gapDebug(`Gap detected in thread ${threadId}: ${lastMessageId} -> ${newMessageId}`);
            this.threadGaps.set(threadId, { from: lastMessageId, to: newMessageId });
            this.client.emit('gap', {
                thread_id: threadId,
                gap_from: lastMessageId,
                gap_to: newMessageId,
            });
        }
        return gap;
    }
    /**
     * Handle gap by requesting missing messages
     */
    async handleGap(threadId, gapFrom, gapTo) {
        this.gapDebug(`Handling gap in ${threadId}: fetching messages ${gapFrom}-${gapTo}`);
        try {
            // Request missing messages from REST API
            const thread = await this.client.ig.direct.getThread(threadId);
            const messages = await thread.getMessages({ limit: 50 });
            
            this.client.emit('gap_filled', {
                thread_id: threadId,
                messages_count: messages.length,
            });
            return messages;
        } catch (err) {
            this.gapDebug(`Failed to handle gap: ${err.message}`);
            this.client.emit('error', new Error(`Gap handling failed for thread ${threadId}`));
            return [];
        }
    }
    /**
     * Clear gap tracking for thread
     */
    clearGap(threadId) {
        this.threadGaps.delete(threadId);
    }
}
exports.GapHandler = GapHandler;
