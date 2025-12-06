"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceTypingMixin = void 0;
const presence_manager_1 = require("../features/presence.manager");
const skywalker_protocol_1 = require("../protocols/skywalker.protocol");
/**
 * Mixin for handling Presence and Typing Indicators
 */
class PresenceTypingMixin {
    apply(client) {
        // Initialize managers
        client.presenceManager = new presence_manager_1.PresenceManager(client);
        client.skywalkerProtocol = new skywalker_protocol_1.SkywalkerProtocol(client);
        
        // Add public methods
        client.sendTyping = async (threadId, isTyping = true) => {
            return client.skywalkerProtocol.sendTypingIndicator(threadId, isTyping);
        };
        
        client.sendReaction = async (messageId, threadId, emoji) => {
            return client.skywalkerProtocol.sendReaction(messageId, threadId, emoji);
        };
        
        client.broadcastPresence = async (status = 'online') => {
            return client.presenceManager.broadcastPresence(status);
        };
    }
    
    get name() {
        return 'Presence & Typing';
    }
}
exports.PresenceTypingMixin = PresenceTypingMixin;
