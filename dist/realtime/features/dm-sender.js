"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DMSender = void 0;
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
/**
 * Direct Message Sender via MQTT
 */
class DMSender {
    constructor(client) {
        this.dmDebug = (0, shared_1.debugChannel)('realtime', 'dm-sender');
        this.client = client;
    }
    /**
     * Send text message via MQTT
     */
    async sendTextMessage(threadId, text, clientContext = null) {
        this.dmDebug(`Sending text message to thread ${threadId}: "${text.substring(0, 50)}..."`);
        const command = {
            action: 'send_item',
            thread_id: threadId,
            item_type: 'text',
            text,
            timestamp: Date.now(),
            client_context: clientContext || (0, uuid_1.v4)(),
        };
        try {
            return await this.client.directCommands?.sendCommand({
                action: 'send_item',
                data: command,
                threadId,
            });
        } catch (err) {
            this.dmDebug(`Failed to send message: ${err.message}`);
            throw err;
        }
    }
    /**
     * Send media message via MQTT (photo/video)
     */
    async sendMediaMessage(threadId, mediaId, mediaType = 'photo', clientContext = null) {
        this.dmDebug(`Sending ${mediaType} to thread ${threadId}`);
        const command = {
            action: 'send_item',
            thread_id: threadId,
            item_type: mediaType,
            media_id: mediaId,
            timestamp: Date.now(),
            client_context: clientContext || (0, uuid_1.v4)(),
        };
        try {
            return await this.client.directCommands?.sendCommand({
                action: 'send_item',
                data: command,
                threadId,
            });
        } catch (err) {
            this.dmDebug(`Failed to send media: ${err.message}`);
            throw err;
        }
    }
    /**
     * Send link message
     */
    async sendLinkMessage(threadId, url, title = null, clientContext = null) {
        this.dmDebug(`Sending link to thread ${threadId}: ${url}`);
        const command = {
            action: 'send_item',
            thread_id: threadId,
            item_type: 'link',
            url,
            title: title || url,
            timestamp: Date.now(),
            client_context: clientContext || (0, uuid_1.v4)(),
        };
        try {
            return await this.client.directCommands?.sendCommand({
                action: 'send_item',
                data: command,
                threadId,
            });
        } catch (err) {
            this.dmDebug(`Failed to send link: ${err.message}`);
            throw err;
        }
    }
}
exports.DMSender = DMSender;
