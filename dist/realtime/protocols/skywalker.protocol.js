"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkywalkerProtocol = void 0;
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
/**
 * Skywalker Protocol - Real-time presence, typing, and reactions
 */
class SkywalkerProtocol {
    constructor(client) {
        this.skyDebug = (0, shared_1.debugChannel)('realtime', 'skywalker');
        this.client = client;
    }
    /**
     * Send typing indicator
     */
    async sendTypingIndicator(threadId, isTyping = true) {
        this.skyDebug(`${isTyping ? 'Starting' : 'Stopping'} typing in thread ${threadId}`);
        const command = {
            action: isTyping ? 'typing_on' : 'typing_off',
            thread_id: threadId,
            timestamp: Date.now(),
            client_context: (0, uuid_1.v4)(),
        };
        return this.client.directCommands?.sendCommand({
            action: 'send_typing',
            data: command,
            threadId,
        });
    }
    /**
     * Send message reaction
     */
    async sendReaction(messageId, threadId, reactionEmoji) {
        this.skyDebug(`Sending reaction ${reactionEmoji} to message ${messageId}`);
        const command = {
            action: 'reaction',
            message_id: messageId,
            thread_id: threadId,
            emoji: reactionEmoji,
            timestamp: Date.now(),
            client_context: (0, uuid_1.v4)(),
        };
        return this.client.directCommands?.sendCommand({
            action: 'send_reaction',
            data: command,
            threadId,
        });
    }
    /**
     * Handle Skywalker event
     */
    handleSkywalkerEvent(data) {
        try {
            const event = typeof data === 'string' ? JSON.parse(data) : data;
            this.skyDebug(`Skywalker Event: ${event.type || 'unknown'}`);
            
            if (event.type === 'typing_on') {
                this.client.emit('typing', {
                    user_id: event.from_user_id,
                    thread_id: event.thread_id,
                    is_typing: true,
                });
            } else if (event.type === 'typing_off') {
                this.client.emit('typing', {
                    user_id: event.from_user_id,
                    thread_id: event.thread_id,
                    is_typing: false,
                });
            } else if (event.type === 'reaction') {
                this.client.emit('reaction', {
                    message_id: event.message_id,
                    user_id: event.from_user_id,
                    emoji: event.emoji,
                    thread_id: event.thread_id,
                });
            } else if (event.type === 'presence') {
                this.client.emit('presence', {
                    user_id: event.user_id,
                    status: event.status, // online, offline, away
                    last_activity: event.last_activity,
                });
            }
            return event;
        } catch (err) {
            this.skyDebug(`Failed to parse Skywalker event: ${err.message}`);
            return null;
        }
    }
}
exports.SkywalkerProtocol = SkywalkerProtocol;
