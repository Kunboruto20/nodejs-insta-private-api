"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSyncMixin = void 0;
const mixin_1 = require("./mixin");
const constants_1 = require("../../constants");
const shared_1 = require("../../shared");
const mqtts_1 = require("mqtts");

class MessageSyncMixin extends mixin_1.Mixin {
    constructor() {
        super();
        this.userCache = new Map();
        this.pendingUserFetches = new Map();
    }

    apply(client) {
        console.log(`\n[MESSAGE_SYNC MIXIN] Applying mixin...`);
        
        (0, mixin_1.hook)(client, 'connect', {
            post: async () => {
                console.log(`[MESSAGE_SYNC] Post-connect hook called`);
                
                let retries = 0;
                while (!client.mqtt && retries < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    retries++;
                }
                if (!client.mqtt) {
                    throw new mqtts_1.IllegalStateError('No mqtt client created after retries');
                }
                
                console.log(`[MESSAGE_SYNC] MQTT ready, registering listen() on topic 146 (MESSAGE_SYNC)`);
                
                if (client.mqtt.listen) {
                    console.log(`[MESSAGE_SYNC] mqtt.listen() method found, registering callback...`);
                    client.mqtt.listen({
                        topic: constants_1.Topics.MESSAGE_SYNC.id,
                        transformer: async ({ payload }) => {
                            const parsed = constants_1.Topics.MESSAGE_SYNC.parser
                                .parseMessage(constants_1.Topics.MESSAGE_SYNC, await (0, shared_1.tryUnzipAsync)(payload))
                                .map(msg => msg.data);
                            return parsed;
                        },
                    }, data => {
                        this.handleMessageSync(client, data);
                    });
                } else {
                    console.log(`[MESSAGE_SYNC] mqtt.listen() NOT FOUND - using fallback 'receive' event`);
                    client.on('receive', (topic, messages) => {
                        if (topic.id === constants_1.Topics.MESSAGE_SYNC.id) {
                            const data = messages.map(m => m.data);
                            this.handleMessageSync(client, data);
                        }
                    });
                }
            },
        });
    }

    async getUsernameFromId(client, userId) {
        if (!userId) return null;
        
        const userIdStr = String(userId);
        
        if (this.userCache.has(userIdStr)) {
            return this.userCache.get(userIdStr);
        }
        
        if (this.pendingUserFetches.has(userIdStr)) {
            return await this.pendingUserFetches.get(userIdStr);
        }
        
        const fetchPromise = (async () => {
            try {
                if (client.ig && client.ig.user && client.ig.user.info) {
                    const userInfo = await client.ig.user.info(userIdStr);
                    if (userInfo && userInfo.username) {
                        this.userCache.set(userIdStr, userInfo.username);
                        return userInfo.username;
                    }
                }
            } catch (err) {
                // Silently fail - will use ID instead
            }
            return null;
        })();
        
        this.pendingUserFetches.set(userIdStr, fetchPromise);
        const result = await fetchPromise;
        this.pendingUserFetches.delete(userIdStr);
        
        return result;
    }

    extractMessageContent(msgValue, itemType) {
        let content = '';
        let mediaInfo = '';
        
        switch (itemType) {
            case 'text':
                content = msgValue.text || '';
                break;
                
            case 'media':
            case 'raven_media':
                content = '[PHOTO/VIDEO]';
                if (msgValue.media) {
                    const media = msgValue.media;
                    if (media.image_versions2) {
                        content = '[PHOTO]';
                        mediaInfo = ` URL: ${media.image_versions2?.candidates?.[0]?.url || 'N/A'}`;
                    } else if (media.video_versions) {
                        content = '[VIDEO]';
                        mediaInfo = ` Duration: ${media.video_duration || 'N/A'}s`;
                    }
                }
                if (msgValue.visual_media) {
                    content = '[DISAPPEARING MEDIA]';
                }
                break;
                
            case 'voice_media':
                content = '[VOICE MESSAGE]';
                if (msgValue.voice_media?.media?.audio) {
                    const duration = msgValue.voice_media.media.audio.duration || 0;
                    content = `[VOICE MESSAGE] Duration: ${duration}ms`;
                }
                break;
                
            case 'animated_media':
                content = '[GIF]';
                if (msgValue.animated_media?.images?.fixed_height?.url) {
                    mediaInfo = ` URL: ${msgValue.animated_media.images.fixed_height.url}`;
                }
                break;
                
            case 'media_share':
                content = '[SHARED POST]';
                if (msgValue.media_share) {
                    const share = msgValue.media_share;
                    content = `[SHARED POST] From: @${share.user?.username || 'unknown'}`;
                    if (share.caption?.text) {
                        content += ` Caption: "${share.caption.text.substring(0, 50)}..."`;
                    }
                }
                break;
                
            case 'reel_share':
                content = '[SHARED REEL]';
                if (msgValue.reel_share) {
                    const reel = msgValue.reel_share;
                    content = `[SHARED REEL] From: @${reel.media?.user?.username || 'unknown'}`;
                    if (reel.text) {
                        content += ` Text: "${reel.text}"`;
                    }
                }
                break;
                
            case 'story_share':
                content = '[SHARED STORY]';
                if (msgValue.story_share) {
                    const story = msgValue.story_share;
                    content = `[SHARED STORY] From: @${story.media?.user?.username || 'unknown'}`;
                    if (story.message) {
                        content += ` Message: "${story.message}"`;
                    }
                }
                break;
                
            case 'felix_share':
                content = '[SHARED IGTV/VIDEO]';
                if (msgValue.felix_share?.video) {
                    content = `[SHARED IGTV] Title: "${msgValue.felix_share.video.title || 'N/A'}"`;
                }
                break;
                
            case 'clip':
                content = '[SHARED CLIP]';
                if (msgValue.clip?.clip) {
                    content = `[SHARED CLIP] From: @${msgValue.clip.clip.user?.username || 'unknown'}`;
                }
                break;
                
            case 'profile':
                content = '[SHARED PROFILE]';
                if (msgValue.profile) {
                    content = `[SHARED PROFILE] @${msgValue.profile.username || 'unknown'}`;
                }
                break;
                
            case 'location':
                content = '[LOCATION]';
                if (msgValue.location) {
                    content = `[LOCATION] ${msgValue.location.name || msgValue.location.address || 'Unknown location'}`;
                }
                break;
                
            case 'hashtag':
                content = '[HASHTAG]';
                if (msgValue.hashtag) {
                    content = `[HASHTAG] #${msgValue.hashtag.name || 'unknown'}`;
                }
                break;
                
            case 'like':
                content = '[LIKE]';
                break;
                
            case 'link':
                content = '[LINK]';
                if (msgValue.link) {
                    content = `[LINK] ${msgValue.link.text || msgValue.link.link_url || 'N/A'}`;
                }
                break;
                
            case 'action_log':
                content = '[ACTION]';
                if (msgValue.action_log) {
                    content = `[ACTION] ${msgValue.action_log.description || 'N/A'}`;
                }
                break;
                
            case 'placeholder':
                content = '[PLACEHOLDER]';
                if (msgValue.placeholder?.message) {
                    content = `[PLACEHOLDER] ${msgValue.placeholder.message}`;
                }
                break;
                
            case 'xma':
            case 'xma_media_share':
                content = '[XMA SHARE]';
                if (msgValue.xma_link_url) {
                    content = `[XMA SHARE] ${msgValue.xma_link_url}`;
                }
                break;
                
            case 'video_call_event':
                content = '[VIDEO CALL EVENT]';
                if (msgValue.video_call_event) {
                    content = `[VIDEO CALL] ${msgValue.video_call_event.action || 'event'}`;
                }
                break;
                
            default:
                if (msgValue.text) {
                    content = msgValue.text;
                } else {
                    content = `[${(itemType || 'UNKNOWN').toUpperCase()}]`;
                }
        }
        
        return content + mediaInfo;
    }

    formatMessageForConsole(msgData) {
        const separator = '----------------------------------------';
        const lines = [
            '',
            separator,
            '[NEW MESSAGE]',
            separator,
            `Username: ${msgData.username || 'unknown'}`,
            `ID: ${msgData.userId || 'unknown'}`,
            `Text: ${msgData.text || 'N/A'}`,
            `Type: ${msgData.itemType || 'text'}`,
            `Thread: ${msgData.threadId || 'unknown'}`,
            `Message ID: ${msgData.messageId || 'unknown'}`,
            `Timestamp: ${msgData.timestamp ? new Date(parseInt(msgData.timestamp) / 1000).toISOString() : 'N/A'}`,
            `Status: ${msgData.status || 'good'}`,
            separator,
            ''
        ];
        return lines.join('\n');
    }

    async handleMessageSync(client, syncData) {
        if (!syncData || !Array.isArray(syncData)) {
            console.log(`[MESSAGE_SYNC] No sync data received`);
            return;
        }

        for (const element of syncData) {
            const data = element.data;
            
            if (!data) {
                client.emit('iris', element);
                continue;
            }
            
            delete element.data;
            
            for (const e of data) {
                if (!e.path) {
                    client.emit('iris', { ...element, ...e });
                    continue;
                }
                
                if (e.path.startsWith('/direct_v2/threads') && e.value) {
                    try {
                        const msgValue = JSON.parse(e.value);
                        const threadId = MessageSyncMixin.getThreadIdFromPath(e.path);
                        
                        const userId = msgValue.user_id || msgValue.from_user_id || msgValue.sender_id;
                        const itemType = msgValue.item_type || 'text';
                        
                        let username = msgValue.username || null;
                        if (!username && userId) {
                            username = await this.getUsernameFromId(client, userId);
                        }
                        if (!username) {
                            username = `user_${userId || 'unknown'}`;
                        }
                        
                        const textContent = this.extractMessageContent(msgValue, itemType);
                        
                        const msgData = {
                            username: username,
                            userId: userId,
                            text: textContent,
                            itemType: itemType,
                            threadId: threadId,
                            messageId: msgValue.item_id || msgValue.id,
                            timestamp: msgValue.timestamp,
                            status: 'good',
                            rawData: msgValue
                        };
                        
                        console.log(this.formatMessageForConsole(msgData));
                        
                        const parsedMessage = {
                            ...element,
                            message: {
                                path: e.path,
                                op: e.op,
                                thread_id: threadId,
                                ...msgValue,
                            },
                            parsed: msgData
                        };
                        
                        client.emit('message', parsedMessage);
                        
                    } catch (err) {
                        console.log(`[MESSAGE_SYNC] Parse error: ${err.message}`);
                    }
                } else {
                    try {
                        const updateValue = e.value ? JSON.parse(e.value) : {};
                        client.emit('threadUpdate', {
                            ...element,
                            meta: {
                                path: e.path,
                                op: e.op,
                                thread_id: MessageSyncMixin.getThreadIdFromPath(e.path),
                            },
                            update: updateValue,
                        });
                    } catch (err) {
                        console.log(`[MESSAGE_SYNC] Thread update parse error: ${err.message}`);
                    }
                }
            }
        }
    }

    static getThreadIdFromPath(path) {
        const itemMatch = path.match(/^\/direct_v2\/threads\/(\d+)/);
        if (itemMatch)
            return itemMatch[1];
        const inboxMatch = path.match(/^\/direct_v2\/inbox\/threads\/(\d+)/);
        if (inboxMatch)
            return inboxMatch[1];
        return undefined;
    }
    
    get name() {
        return 'Message Sync';
    }
}
exports.MessageSyncMixin = MessageSyncMixin;
