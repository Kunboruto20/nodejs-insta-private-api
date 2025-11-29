"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceManager = void 0;
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
/**
 * Presence Manager - Handle online/offline status
 */
class PresenceManager {
    constructor(client) {
        this.presenceDebug = (0, shared_1.debugChannel)('realtime', 'presence');
        this.userPresence = new Map();
        this.client = client;
    }
    /**
     * Update user presence
     */
    updatePresence(userId, status, lastActivity = Date.now()) {
        this.presenceDebug(`User ${userId} is ${status}`);
        this.userPresence.set(userId, { status, lastActivity });
        this.client.emit('presence', {
            user_id: userId,
            status,
            last_activity: lastActivity,
        });
    }
    /**
     * Get user presence
     */
    getPresence(userId) {
        return this.userPresence.get(userId) || { status: 'offline', lastActivity: null };
    }
    /**
     * Broadcast user's own presence
     */
    async broadcastPresence(status = 'online') {
        this.presenceDebug(`Broadcasting presence: ${status}`);
        const payload = {
            action: 'presence_status',
            status,
            timestamp: Date.now(),
            client_context: (0, uuid_1.v4)(),
        };
        return this.client.directCommands?.sendCommand({
            action: 'send_presence',
            data: payload,
            threadId: '',
        });
    }
    /**
     * Handle presence update
     */
    handlePresenceUpdate(data) {
        try {
            const update = typeof data === 'string' ? JSON.parse(data) : data;
            if (update.user_id && update.status) {
                this.updatePresence(update.user_id, update.status, update.last_activity);
            }
            return update;
        } catch (err) {
            this.presenceDebug(`Failed to parse presence update: ${err.message}`);
            return null;
        }
    }
}
exports.PresenceManager = PresenceManager;
