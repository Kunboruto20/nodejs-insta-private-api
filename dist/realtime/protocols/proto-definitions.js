"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTO_DEFINITIONS = void 0;
/**
 * Protobuf Definitions for Instagram MQTT Protocol
 * These are the message schemas used in IRIS, Skywalker, and DirectMessage topics
 */
exports.PROTO_DEFINITIONS = {
    DirectRealtimePayload: {
        type: 'object',
        fields: {
            messageType: { type: 'uint32', id: 1 },
            payload: { type: 'bytes', id: 2 },
            timestamp: { type: 'uint64', id: 3 },
        }
    },
    IrisMessage: {
        type: 'object',
        fields: {
            messageId: { type: 'string', id: 1 },
            threadId: { type: 'string', id: 2 },
            userId: { type: 'uint64', id: 3 },
            text: { type: 'string', id: 4 },
            timestamp: { type: 'uint64', id: 5 },
            itemType: { type: 'string', id: 6 },
            mediaId: { type: 'string', id: 7 },
            isDelivered: { type: 'bool', id: 8 },
            isSeen: { type: 'bool', id: 9 },
        }
    },
    SkywalkerCommand: {
        type: 'object',
        fields: {
            action: { type: 'string', id: 1 },
            threadId: { type: 'string', id: 2 },
            data: { type: 'bytes', id: 3 },
            timestamp: { type: 'uint64', id: 4 },
            clientContext: { type: 'string', id: 5 },
        }
    },
    PresenceEvent: {
        type: 'object',
        fields: {
            userId: { type: 'uint64', id: 1 },
            status: { type: 'string', id: 2 }, // online, offline, away
            lastActivity: { type: 'uint64', id: 3 },
            device: { type: 'string', id: 4 }, // mobile, web, unknown
        }
    },
    TypingIndicator: {
        type: 'object',
        fields: {
            threadId: { type: 'string', id: 1 },
            userId: { type: 'uint64', id: 2 },
            isTyping: { type: 'bool', id: 3 },
            timestamp: { type: 'uint64', id: 4 },
        }
    },
    MessageReaction: {
        type: 'object',
        fields: {
            messageId: { type: 'string', id: 1 },
            threadId: { type: 'string', id: 2 },
            userId: { type: 'uint64', id: 3 },
            emoji: { type: 'string', id: 4 },
            timestamp: { type: 'uint64', id: 5 },
            operation: { type: 'string', id: 6 }, // add, remove
        }
    },
    ClientPayload: {
        type: 'object',
        fields: {
            clientVersion: { type: 'string', id: 1 },
            clientUserID: { type: 'uint64', id: 2 },
            clientContext: { type: 'object', id: 3 },
            capabilities: { type: 'object', id: 4 },
            subscribeProtoMask: { type: 'uint32', id: 5 },
        }
    },
};
