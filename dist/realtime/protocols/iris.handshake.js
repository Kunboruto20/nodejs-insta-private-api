"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrisHandshake = void 0;
const uuid_1 = require("uuid");
const shared_1 = require("../../shared");
/**
 * IRIS Handshake - Instagram Real-time Iris Sync Protocol
 * Handles authentication and subscription to IRIS topics
 */
class IrisHandshake {
    constructor(client) {
        this.irisDebug = (0, shared_1.debugChannel)('realtime', 'iris');
        this.client = client;
    }
    /**
     * Create IRIS client payload for handshake
     */
    createClientPayload() {
        return {
            clientVersion: '311.0.0.0',
            clientUserID: this.client.ig.state.cookieUserId,
            clientContext: {
                clientContextVersion: '1',
                clientContextType: 'mobile',
                appVersion: '311.0.0.0',
                userAgent: this.client.ig.state.appUserAgent,
            },
            subscribeProtoMask: 0,
            capabilities: {
                supportsPresenceEvents: true,
                supportsTypingIndicators: true,
                supportsMessageReactions: true,
                supportsForegroundState: true,
            },
        };
    }
    /**
     * Generate IRIS subscription request
     */
    generateSubscriptionRequest(topics) {
        this.irisDebug(`Generating IRIS subscription for topics: ${topics.join(', ')}`);
        return {
            requestId: (0, uuid_1.v4)(),
            clientVersion: '311.0.0.0',
            subscriptions: topics.map(topic => ({
                topic,
                active: true,
                priority: 10,
            })),
        };
    }
    /**
     * Handle IRIS response
     */
    handleIrisResponse(data) {
        try {
            const response = typeof data === 'string' ? JSON.parse(data) : data;
            this.irisDebug(`IRIS Response: ${response.type || 'unknown'}`);
            
            if (response.type === 'heartbeat') {
                this.client.emit('iris_heartbeat', response);
            } else if (response.type === 'error') {
                this.client.emit('error', new Error(`IRIS Error: ${response.message}`));
            } else if (response.type === 'subscription_response') {
                this.client.emit('iris_subscription', response);
            }
            return response;
        } catch (err) {
            this.irisDebug(`Failed to parse IRIS response: ${err.message}`);
            return null;
        }
    }
}
exports.IrisHandshake = IrisHandshake;
