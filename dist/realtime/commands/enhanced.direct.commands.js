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

    /**
     * Delete message via MQTT
     */
    async deleteMessage(threadId, itemId) {
        this.enhancedDebug(`Deleting message ${itemId} from thread ${threadId}`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'delete_item',
                thread_id: threadId,
                item_id: itemId,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing delete command to MQTT topic ${constants_1.Topics.SEND_MESSAGE.id}`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Message deleted via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Delete failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Edit message via MQTT
     */
    async editMessage(threadId, itemId, newText) {
        this.enhancedDebug(`Editing message ${itemId}: "${newText}"`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'edit_item',
                thread_id: threadId,
                item_id: itemId,
                text: newText,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing edit command to MQTT topic ${constants_1.Topics.SEND_MESSAGE.id}`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Message edited via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Edit failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Reply to message via MQTT (Quote Reply)
     */
    async replyToMessage(threadId, messageId, replyText) {
        this.enhancedDebug(`Replying to ${messageId} in thread ${threadId}: "${replyText}"`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'text',
                text: replyText,
                replying_to_item_id: messageId,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing reply command to MQTT topic ${constants_1.Topics.SEND_MESSAGE.id}`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Reply sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Reply failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Subscribe to follow notifications via MQTT
     */
    async subscribeToFollowNotifications() {
        this.enhancedDebug(`Subscribing to follow notifications via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'subscribe',
                subscription_type: 'follow_notifications',
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing follow subscription to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Follow notifications subscribed via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Follow subscription failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Subscribe to mention notifications via MQTT
     */
    async subscribeToMentionNotifications() {
        this.enhancedDebug(`Subscribing to mention notifications via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'subscribe',
                subscription_type: 'mention_notifications',
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing mention subscription to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Mention notifications subscribed via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Mention subscription failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Subscribe to call notifications via MQTT
     */
    async subscribeToCallNotifications() {
        this.enhancedDebug(`Subscribing to call notifications via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'subscribe',
                subscription_type: 'call_notifications',
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing call subscription to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Call notifications subscribed via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Call subscription failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Add member to thread via MQTT
     */
    async addMemberToThread(threadId, userId) {
        this.enhancedDebug(`Adding user ${userId} to thread ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'add_member',
                thread_id: threadId,
                user_id: userId,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing add member command to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Member added to thread via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Add member failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Remove member from thread via MQTT
     */
    async removeMemberFromThread(threadId, userId) {
        this.enhancedDebug(`Removing user ${userId} from thread ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'remove_member',
                thread_id: threadId,
                user_id: userId,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing remove member command to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Member removed from thread via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Remove member failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send reaction (emoji) via MQTT
     */
    async sendReaction({ itemId, reactionType = 'like', clientContext, threadId, reactionStatus = 'created', emoji }) {
        this.enhancedDebug(`Sending ${reactionType} reaction to message ${itemId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_reaction',
                thread_id: threadId,
                item_id: itemId,
                reaction_type: reactionType,
                reaction_status: reactionStatus,
                emoji: emoji || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing reaction to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Reaction sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Reaction failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Mark message as seen via MQTT
     */
    async markAsSeen({ threadId, itemId }) {
        this.enhancedDebug(`Marking message ${itemId} as seen in thread ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const clientContext = (0, uuid_1.v4)();
            const command = {
                action: 'mark_as_seen',
                thread_id: threadId,
                item_id: itemId,
                timestamp: Date.now(),
                client_context: clientContext,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing mark as seen to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Message marked as seen via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Mark as seen failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Indicate activity (typing) via MQTT
     */
    async indicateActivity({ threadId, isActive = true, clientContext }) {
        this.enhancedDebug(`Indicating ${isActive ? 'typing' : 'stopped'} in thread ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'indicate_activity',
                thread_id: threadId,
                is_active: isActive,
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing activity indicator to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Activity indicator sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Activity indicator failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send media (image/video) via MQTT
     */
    async sendMedia({ text, mediaId, threadId, clientContext }) {
        this.enhancedDebug(`Sending media ${mediaId} to ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'media',
                media_id: mediaId,
                text: text || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing media to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Media sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Media send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send location via MQTT
     */
    async sendLocation({ text, locationId, threadId, clientContext }) {
        this.enhancedDebug(`Sending location ${locationId} to ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'location',
                location_id: locationId,
                text: text || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing location to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Location sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Location send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send profile via MQTT
     */
    async sendProfile({ text, userId, threadId, clientContext }) {
        this.enhancedDebug(`Sending profile ${userId} to ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'profile',
                user_id: userId,
                text: text || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing profile to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Profile sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Profile send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send hashtag via MQTT
     */
    async sendHashtag({ text, hashtag, threadId, clientContext }) {
        this.enhancedDebug(`Sending hashtag ${hashtag} to ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'hashtag',
                hashtag: hashtag,
                text: text || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing hashtag to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Hashtag sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Hashtag send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send like via MQTT
     */
    async sendLike({ threadId, clientContext }) {
        this.enhancedDebug(`Sending like in thread ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'like',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing like to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Like sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Like send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send user story via MQTT
     */
    async sendUserStory({ text, storyId, threadId, clientContext }) {
        this.enhancedDebug(`Sending story ${storyId} to ${threadId} via MQTT`);
        
        try {
            const mqtt = this.realtimeClient.mqtt || this.realtimeClient._mqtt;
            if (!mqtt || typeof mqtt.publish !== 'function') {
                throw new Error('MQTT client not available');
            }
            
            const ctx = clientContext || (0, uuid_1.v4)();
            const command = {
                action: 'send_item',
                thread_id: threadId,
                item_type: 'story',
                story_id: storyId,
                text: text || '',
                timestamp: Date.now(),
                client_context: ctx,
            };
            
            const json = JSON.stringify(command);
            const { compressDeflate } = shared_1;
            const payload = await compressDeflate(json);
            
            this.enhancedDebug(`Publishing story to MQTT`);
            const result = await mqtt.publish({
                topic: constants_1.Topics.SEND_MESSAGE.id,
                qosLevel: 1,
                payload: payload,
            });
            
            this.enhancedDebug(`✅ Story sent via MQTT!`);
            return result;
        } catch (err) {
            this.enhancedDebug(`Story send failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send photo via Realtime (Upload + Broadcast)
     * This method uploads the photo first, then broadcasts it to the thread
     * 
     * @param {Object} options - Photo sending options
     * @param {Buffer} options.photoBuffer - Image buffer (JPEG/PNG)
     * @param {string} options.threadId - Thread ID to send to
     * @param {string} [options.caption] - Optional caption
     * @param {string} [options.mimeType='image/jpeg'] - MIME type
     * @param {string} [options.clientContext] - Optional client context
     */
    async sendPhotoViaRealtime({ photoBuffer, threadId, caption = '', mimeType = 'image/jpeg', clientContext }) {
        this.enhancedDebug(`Sending photo to thread ${threadId} via Realtime`);
        
        try {
            // Validate inputs
            if (!photoBuffer || !Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
                throw new Error('photoBuffer must be a non-empty Buffer');
            }
            if (!threadId) {
                throw new Error('threadId is required');
            }

            // Get the ig client from realtime client
            const ig = this.realtimeClient.ig;
            if (!ig || !ig.request) {
                throw new Error('Instagram client not available. Make sure you are logged in.');
            }

            // Step 1: Upload photo using rupload endpoint
            this.enhancedDebug(`Step 1: Uploading photo (${photoBuffer.length} bytes)...`);
            
            const uploadId = Date.now().toString();
            const objectName = `${(0, uuid_1.v4)()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;
            
            const isJpeg = mimeType === 'image/jpeg' || mimeType === 'image/jpg';
            const compression = isJpeg
                ? '{"lib_name":"moz","lib_version":"3.1.m","quality":"80"}'
                : '{"lib_name":"png","lib_version":"1.0","quality":"100"}';

            const ruploadParams = {
                upload_id: uploadId,
                media_type: 1,
                image_compression: compression,
                xsharing_user_ids: JSON.stringify([]),
                is_clips_media: false,
            };

            const uploadHeaders = {
                'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
                'Content-Type': mimeType,
                'X_FB_PHOTO_WATERFALL_ID': (0, uuid_1.v4)(),
                'X-Entity-Type': mimeType,
                'X-Entity-Length': String(photoBuffer.length),
                'Content-Length': String(photoBuffer.length),
            };

            const uploadUrl = `/rupload_igphoto/${objectName}`;

            let serverUploadId = uploadId;
            try {
                const uploadResponse = await ig.request.send({
                    url: uploadUrl,
                    method: 'POST',
                    headers: uploadHeaders,
                    body: photoBuffer,
                });

                if (uploadResponse && typeof uploadResponse === 'object' && uploadResponse.upload_id) {
                    serverUploadId = uploadResponse.upload_id;
                }
                this.enhancedDebug(`✅ Photo uploaded! upload_id: ${serverUploadId}`);
            } catch (uploadErr) {
                this.enhancedDebug(`Upload error: ${uploadErr.message}`);
                throw new Error(`Photo upload failed: ${uploadErr.message}`);
            }

            // Step 2: Broadcast the uploaded photo to the thread
            this.enhancedDebug(`Step 2: Broadcasting photo to thread ${threadId}...`);
            
            const broadcastForm = {
                upload_id: serverUploadId,
                action: 'send_item',
                thread_ids: JSON.stringify([String(threadId)]),
            };

            if (caption) {
                broadcastForm.caption = caption;
            }

            try {
                const broadcastResponse = await ig.request.send({
                    url: '/direct_v2/threads/broadcast/upload_photo/',
                    method: 'POST',
                    form: broadcastForm,
                });

                this.enhancedDebug(`✅ Photo sent successfully to thread ${threadId}!`);
                return broadcastResponse;
            } catch (broadcastErr) {
                this.enhancedDebug(`Broadcast error: ${broadcastErr.message}`);
                throw new Error(`Photo broadcast failed: ${broadcastErr.message}`);
            }

        } catch (err) {
            this.enhancedDebug(`sendPhotoViaRealtime failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Alias for sendPhotoViaRealtime (for compatibility)
     */
    async sendPhoto(options) {
        return this.sendPhotoViaRealtime(options);
    }

    /**
     * Send video via Realtime (Upload + Broadcast)
     * 
     * @param {Object} options - Video sending options
     * @param {Buffer} options.videoBuffer - Video buffer (MP4)
     * @param {string} options.threadId - Thread ID to send to
     * @param {string} [options.caption] - Optional caption
     * @param {number} [options.duration] - Video duration in seconds
     * @param {number} [options.width] - Video width
     * @param {number} [options.height] - Video height
     * @param {string} [options.clientContext] - Optional client context
     */
    async sendVideoViaRealtime({ videoBuffer, threadId, caption = '', duration = 0, width = 720, height = 1280, clientContext }) {
        this.enhancedDebug(`Sending video to thread ${threadId} via Realtime`);
        
        try {
            // Validate inputs
            if (!videoBuffer || !Buffer.isBuffer(videoBuffer) || videoBuffer.length === 0) {
                throw new Error('videoBuffer must be a non-empty Buffer');
            }
            if (!threadId) {
                throw new Error('threadId is required');
            }

            // Get the ig client from realtime client
            const ig = this.realtimeClient.ig;
            if (!ig || !ig.request) {
                throw new Error('Instagram client not available. Make sure you are logged in.');
            }

            // Step 1: Upload video using rupload endpoint
            this.enhancedDebug(`Step 1: Uploading video (${videoBuffer.length} bytes)...`);
            
            const uploadId = Date.now().toString();
            const objectName = `${(0, uuid_1.v4)()}.mp4`;
            
            const ruploadParams = {
                upload_id: uploadId,
                media_type: 2, // 2 = video
                xsharing_user_ids: JSON.stringify([]),
                upload_media_duration_ms: Math.round(duration * 1000),
                upload_media_width: width,
                upload_media_height: height,
            };

            const uploadHeaders = {
                'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
                'Content-Type': 'video/mp4',
                'X_FB_VIDEO_WATERFALL_ID': (0, uuid_1.v4)(),
                'X-Entity-Type': 'video/mp4',
                'X-Entity-Length': String(videoBuffer.length),
                'Content-Length': String(videoBuffer.length),
                'Offset': '0',
            };

            const uploadUrl = `/rupload_igvideo/${objectName}`;

            let serverUploadId = uploadId;
            try {
                const uploadResponse = await ig.request.send({
                    url: uploadUrl,
                    method: 'POST',
                    headers: uploadHeaders,
                    body: videoBuffer,
                });

                if (uploadResponse && typeof uploadResponse === 'object' && uploadResponse.upload_id) {
                    serverUploadId = uploadResponse.upload_id;
                }
                this.enhancedDebug(`✅ Video uploaded! upload_id: ${serverUploadId}`);
            } catch (uploadErr) {
                this.enhancedDebug(`Video upload error: ${uploadErr.message}`);
                throw new Error(`Video upload failed: ${uploadErr.message}`);
            }

            // Step 2: Broadcast the uploaded video to the thread
            this.enhancedDebug(`Step 2: Broadcasting video to thread ${threadId}...`);
            
            const broadcastForm = {
                upload_id: serverUploadId,
                action: 'send_item',
                thread_ids: JSON.stringify([String(threadId)]),
                video_result: '',
            };

            if (caption) {
                broadcastForm.caption = caption;
            }

            try {
                const broadcastResponse = await ig.request.send({
                    url: '/direct_v2/threads/broadcast/upload_video/',
                    method: 'POST',
                    form: broadcastForm,
                });

                this.enhancedDebug(`✅ Video sent successfully to thread ${threadId}!`);
                return broadcastResponse;
            } catch (broadcastErr) {
                this.enhancedDebug(`Video broadcast error: ${broadcastErr.message}`);
                throw new Error(`Video broadcast failed: ${broadcastErr.message}`);
            }

        } catch (err) {
            this.enhancedDebug(`sendVideoViaRealtime failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Alias for sendVideoViaRealtime (for compatibility)
     */
    async sendVideo(options) {
        return this.sendVideoViaRealtime(options);
    }
}
exports.EnhancedDirectCommands = EnhancedDirectCommands;
