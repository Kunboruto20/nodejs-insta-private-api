"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeClient = void 0;
const constants_1 = require("../constants");
const commands_1 = require("./commands");
const shared_1 = require("../shared");
const mqttot_1 = require("../mqttot");
const mqtts_1 = require("mqtts");
const errors_1 = require("../errors");
const eventemitter3_1 = require("eventemitter3");
const mixins_1 = require("./mixins");
const iris_handshake_1 = require("./protocols/iris.handshake");
const skywalker_protocol_1 = require("./protocols/skywalker.protocol");
const presence_manager_1 = require("./features/presence.manager");
const dm_sender_1 = require("./features/dm-sender");
const error_handler_1 = require("./features/error-handler");
const gap_handler_1 = require("./features/gap-handler");
const enhanced_direct_commands_1 = require("./commands/enhanced.direct.commands");
const presence_typing_mixin_1 = require("./mixins/presence-typing.mixin");
class RealtimeClient extends eventemitter3_1.EventEmitter {
    get mqtt() {
        return this._mqtt;
    }
    /**
     *
     * @param {IgApiClient} ig
     * @param mixins - by default MessageSync and Realtime mixins are used
     */
    constructor(ig, mixins = [new mixins_1.MessageSyncMixin(), new mixins_1.RealtimeSubMixin(), new presence_typing_mixin_1.PresenceTypingMixin()]) {
        super();
        this.realtimeDebug = (0, shared_1.debugChannel)('realtime');
        this.messageDebug = this.realtimeDebug.extend('message');
        this.safeDisconnect = false;
        this.emitError = (e) => this.emit('error', e);
        this.emitWarning = (e) => this.emit('warning', e);
        this.ig = ig;
        this.threads = new Map();
        
        // Initialize v5.18+ features
        this.irisHandshake = new iris_handshake_1.IrisHandshake(this);
        this.skywalkerProtocol = new skywalker_protocol_1.SkywalkerProtocol(this);
        this.presenceManager = new presence_manager_1.PresenceManager(this);
        this.dmSender = new dm_sender_1.DMSender(this);
        this.errorHandler = new error_handler_1.ErrorHandler(this);
        this.gapHandler = new gap_handler_1.GapHandler(this);
        this.directCommands = new enhanced_direct_commands_1.EnhancedDirectCommands(this);
        
        this.realtimeDebug(`Applying mixins: ${mixins.map(m => m.name).join(', ')}`);
        (0, mixins_1.applyMixins)(mixins, this, this.ig);
    }

    /**
     * NEW METHOD: Start Real-Time Listener with Auto-Inbox Fetch + MQTT
     * Automatically fetches all conversations and connects to MQTT
     * @param options - Optional configuration
     */
    async startRealTimeListener(options = {}) {
        try {
            console.log('🚀 Starting Real-Time Listener...');
            
            // Fetch inbox data for IRIS subscription (THIS IS CRITICAL!)
            console.log('📋 Fetching inbox (IRIS data)...');
            const inboxData = await this.ig.feed.directInbox().request();
            
            console.log('📡 Connecting to MQTT with IRIS subscription...');
            await this.connect({
                graphQlSubs: [
                    'ig_sub_direct',
                    'ig_sub_direct_v2_message_create',
                ],
                skywalkerSubs: [
                    'presence_subscribe',
                    'typing_subscribe',
                ],
                irisData: inboxData
            });
            
            console.log('✅ MQTT Connected with IRIS\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ Real-Time Listener ACTIVE');
            console.log('📝 Trimite mesaj la @ydoska_199');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            // Setup message handlers
            this._setupMessageHandlers();
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed:', error.message);
            throw error;
        }
    }

    /**
     * Setup automatic message handlers
     */
    _setupMessageHandlers() {
        // Handle direct messages
        this.on('message', (data) => {
            const msg = this._parseMessage(data);
            if (msg) {
                this.emit('message_live', msg);
            }
        });

        // Handle iris messages
        this.on('iris', (data) => {
            const msg = this._parseIrisMessage(data);
            if (msg) {
                this.emit('message_live', msg);
            }
        });
    }

    /**
     * Parse direct message
     */
    _parseMessage(data) {
        try {
            const msg = data.message;
            if (!msg) return null;
            
            const threadInfo = this.threads.get(msg.thread_id);
            return {
                id: msg.id,
                from: msg.from_username || msg.from_user_id,
                text: msg.text || msg.body,
                thread: threadInfo?.title || `Thread ${msg.thread_id}`,
                thread_id: msg.thread_id,
                timestamp: msg.timestamp,
                isGroup: threadInfo?.isGroup
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Parse iris message
     */
    _parseIrisMessage(data) {
        try {
            if (data.event !== 'message_create' && !data.type?.includes('message')) {
                return null;
            }
            
            return {
                id: data.id,
                from: data.from_username || data.from_user_id,
                text: data.text,
                thread_id: data.thread_id,
                timestamp: data.timestamp
            };
        } catch (e) {
            return null;
        }
    }

    setInitOptions(initOptions) {
        if (Array.isArray(initOptions))
            initOptions = { graphQlSubs: initOptions };
        this.initOptions = {
            graphQlSubs: [],
            skywalkerSubs: [],
            ...(initOptions || {}),
            socksOptions: typeof initOptions === 'object' && !Array.isArray(initOptions) ? initOptions.socksOptions : undefined,
        };
    }
    extractSessionIdFromJWT() {
        try {
            const authHeader = this.ig.state.authorization;
            if (!authHeader) return null;
            // Extract base64 part from "Bearer IGT:2:{base64}"
            const base64Part = authHeader.replace('Bearer IGT:2:', '').replace('Bearer ', '');
            // Decode from base64
            const decoded = Buffer.from(base64Part, 'base64').toString();
            const payload = JSON.parse(decoded);
            // Get sessionid and URL-decode it
            let sessionid = payload.sessionid;
            if (sessionid) {
                sessionid = decodeURIComponent(sessionid);
            }
            return sessionid || null;
        } catch (e) {
            return null;
        }
    }
    constructConnection() {
        const userAgent = this.ig.state.appUserAgent;
        const deviceId = this.ig.state.phoneId;
        let sessionid;
        // First try: Extract from JWT authorization header (PRIMARY METHOD)
        sessionid = this.extractSessionIdFromJWT();
        if (sessionid) {
            this.realtimeDebug(`SessionID extracted from JWT: ${sessionid.substring(0, 20)}...`);
        }
        // Second try: Direct cookie lookup
        if (!sessionid) {
            try {
                sessionid = this.ig.state.extractCookieValue('sessionid');
            } catch (e) {
                sessionid = null;
            }
        }
        // Third try: Parsed authorization
        if (!sessionid) {
            try {
                sessionid = this.ig.state.parsedAuthorization?.sessionid;
            } catch (e2) {
                sessionid = null;
            }
        }
        // Fourth try: CookieJar introspection
        if (!sessionid) {
            try {
                const cookies = this.ig.state.cookieJar.getCookiesSync('https://i.instagram.com/');
                const sessionCookie = cookies.find(c => c.key === 'sessionid');
                sessionid = sessionCookie?.value;
            } catch (e) {
                sessionid = null;
            }
        }
        // Last resort: Generate from userId + timestamp
        if (!sessionid) {
            const userId = this.ig.state.cookieUserId;
            sessionid = userId + '_' + Date.now();
            this.realtimeDebug(`SessionID generated (fallback): ${sessionid}`);
        }
        const password = `sessionid=${sessionid}`;
        this.connection = new mqttot_1.MQTToTConnection({
            clientIdentifier: deviceId.substring(0, 20),
            clientInfo: {
                userId: BigInt(Number(this.ig.state.cookieUserId)),
                userAgent,
                clientCapabilities: 183,
                endpointCapabilities: 0,
                publishFormat: 1,
                noAutomaticForeground: false,
                makeUserAvailableInForeground: true,
                deviceId,
                isInitiallyForeground: true,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: BigInt(Date.now()) & BigInt(0xffffffff),
                subscribeTopics: [88, 135, 149, 150, 133, 146],
                clientType: 'cookie_auth',
                appId: BigInt(567067343352427),
                deviceSecret: '',
                clientStack: 3,
                ...(this.initOptions?.connectOverrides || {}),
            },
            password,
            appSpecificInfo: {
                app_version: this.ig.state.appVersion,
                'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
                everclear_subscriptions: JSON.stringify({
                    inapp_notification_subscribe_comment: '17899377895239777',
                    inapp_notification_subscribe_comment_mention_and_reply: '17899377895239777',
                    video_call_participant_state_delivery: '17977239895057311',
                    presence_subscribe: '17846944882223835',
                }),
                'User-Agent': userAgent,
                'Accept-Language': this.ig.state.language.replace('_', '-'),
            },
        });
    }
    async connect(options) {
        this.setInitOptions(options);
        console.log(`✅ [CONNECT] irisData: ${this.initOptions?.irisData ? 'YES' : 'NO'}`);
        this.constructConnection();
        const { MQTToTClient } = require("../mqttot");
        const { compressDeflate } = require("../shared");
        
        // Create MQTToTClient with proper payload provider
        this._mqtt = new MQTToTClient({
            url: 'edge-mqtt.facebook.com',
            payloadProvider: async () => {
                return await compressDeflate(this.connection.toThrift());
            },
            autoReconnect: true,
            requirePayload: true,
        });
        
        // Connect to MQTT broker
        await this._mqtt.connect();
        
        // CRITICAL: Initialize Commands BEFORE subscribe calls
        this.commands = new commands_1.Commands(this._mqtt);
        
        this.emit('connected');
        
        // MQTT handler with ALL TOPICS logging
        this._mqtt.on('message', async (msg) => {
            const topicMap = this.mqtt?.topicMap;
            const topic = topicMap?.get(msg.topic);
            
            console.log(`\n📡 [MQTT RECEIVED] Topic: ${msg.topic} (${topic?.path || 'UNKNOWN'})`);
            
            if (topic && topic.parser && !topic.noParse) {
                try {
                    const unzipped = await (0, shared_1.tryUnzipAsync)(msg.payload);
                    const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                    console.log(`   ✅ PARSED: ${topic.path}`);
                    this.emit('receive', topic, Array.isArray(parsedMessages) ? parsedMessages : [parsedMessages]);
                } catch(e) {
                    console.log(`   ⚠️ Parse error: ${e.message}`);
                }
            } else {
                try {
                    const unzipped = await (0, shared_1.tryUnzipAsync)(msg.payload);
                    console.log(`   📨 Raw message (${unzipped.length} bytes)`);
                    this.emit('receiveRaw', msg);
                } catch(e) {
                    console.log(`   ⚠️ Decompress error: ${e.message}`);
                }
            }
        });
        this._mqtt.on('error', this.emitError);
        await (0, shared_1.delay)(100);
        if (this.initOptions.graphQlSubs && this.initOptions.graphQlSubs.length > 0) {
            console.log('[SUBSCRIBE] GraphQL: ' + this.initOptions.graphQlSubs.join(', '));
            await this.graphQlSubscribe(this.initOptions.graphQlSubs);
        }
        if (this.initOptions.irisData) {
            await this.irisSubscribe(this.initOptions.irisData);
        } else {
            console.log('[SUBSCRIBE] Skipping Iris (not needed for real-time DMs)');
        }
        if ((this.initOptions.skywalkerSubs ?? []).length > 0) {
            console.log('[SUBSCRIBE] Skywalker: ' + this.initOptions.skywalkerSubs.join(', '));
            await this.skywalkerSubscribe(this.initOptions.skywalkerSubs);
        }
        console.log('[SUBSCRIBED] ✅ All subscriptions sent to Instagram');
        console.log('\n⏳ [SYNC] Waiting for MESSAGE_SYNC listener to activate...');
        await (0, shared_1.delay)(100);
        console.log(`🔔 [TRIGGER] Calling getInbox() to activate MESSAGE_SYNC on MQTT...`);
        try {
            const inbox = await this.ig.direct.getInbox();
            console.log(`\n✅ [TRIGGER] SUCCESS! Instagram now sending DMs through MQTT (topic 146)`);
            console.log(`   Inbox threads: ${inbox?.inbox?.threads?.length || 0}`);
            console.log(`\n📡 [MQTT READY] Listening for DM messages on MESSAGE_SYNC topic...`);
            
            // FORCE SUBSCRIBE TO TOPIC 146 EXPLICITLY
            console.log('\n🔥 [FORCE] Subscribing to topic 146 explicitly...');
            try {
                await this.ig.request.send({
                    url: '/api/v1/direct_v2/threads/get_most_recent_message/',
                    method: 'POST',
                });
                console.log('✅ Force fetch complete - Messages should now stream on topic 146');
            } catch(e) {
                console.log(`⚠️ Force fetch error: ${e.message}`);
            }
        } catch (error) {
            console.log(`⚠️  [TRIGGER] Inbox fetch failed: ${error.message}`);
            console.log(`   MQTT still listening - try sending a DM anyway`);
        }
        // Setup message event handlers to emit 'message_live' events
        this._setupMessageHandlers();
    }
    /**
     * Connect from saved session using MultiFileAuthState
     * @param {Object} authStateHelper - Result from useMultiFileAuthState()
     * @param {Object} options - Additional connect options
     */
    async connectFromSavedSession(authStateHelper, options = {}) {
        if (!authStateHelper) {
            throw new Error('authStateHelper is required - use useMultiFileAuthState()');
        }

        console.log('[RealtimeClient] Connecting from saved session...');

        const savedOptions = authStateHelper.getMqttConnectOptions?.();
        
        const connectOptions = {
            graphQlSubs: options.graphQlSubs || savedOptions?.graphQlSubs || ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
            skywalkerSubs: options.skywalkerSubs || savedOptions?.skywalkerSubs || ['presence_subscribe', 'typing_subscribe'],
            irisData: options.irisData || savedOptions?.irisData || null,
            ...options
        };

        console.log('[RealtimeClient] Using saved subscriptions:', {
            graphQlSubs: connectOptions.graphQlSubs,
            skywalkerSubs: connectOptions.skywalkerSubs,
            hasIrisData: !!connectOptions.irisData
        });

        await this.connect(connectOptions);

        if (authStateHelper.saveMqttSession) {
            try {
                await authStateHelper.saveMqttSession(this);
                console.log('[RealtimeClient] MQTT session saved after connect');
            } catch (e) {
                console.warn('[RealtimeClient] Failed to save MQTT session:', e.message);
            }
        }

        return this;
    }
    /**
     * Save current MQTT session state
     * @param {Object} authStateHelper - Result from useMultiFileAuthState()
     */
    async saveSession(authStateHelper) {
        if (!authStateHelper || !authStateHelper.saveMqttSession) {
            console.warn('[RealtimeClient] No authStateHelper provided');
            return false;
        }
        await authStateHelper.saveMqttSession(this);
        return true;
    }
    disconnect() {
        this.safeDisconnect = true;
        return this.mqtt?.disconnect() ?? Promise.resolve();
    }
    graphQlSubscribe(sub) {
        sub = typeof sub === 'string' ? [sub] : sub;
        if (!this.commands) {
            throw new mqtts_1.IllegalStateError('connect() must be called before graphQlSubscribe()');
        }
        this.realtimeDebug(`Subscribing with GraphQL to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: constants_1.Topics.REALTIME_SUB,
            data: {
                sub,
            },
        });
    }
    skywalkerSubscribe(sub) {
        sub = typeof sub === 'string' ? [sub] : sub;
        if (!this.commands) {
            throw new mqtts_1.IllegalStateError('connect() must be called before skywalkerSubscribe()');
        }
        this.realtimeDebug(`Subscribing with Skywalker to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: constants_1.Topics.PUBSUB,
            data: {
                sub,
            },
        });
    }
    irisSubscribe({ seq_id, snapshot_at_ms, }) {
        if (!this.commands) {
            throw new mqtts_1.IllegalStateError('connect() must be called before irisSubscribe()');
        }
        this.realtimeDebug(`Iris Sub to: seqId: ${seq_id}, snapshot: ${snapshot_at_ms}`);
        return this.commands.updateSubscriptions({
            topic: constants_1.Topics.IRIS_SUB,
            data: {
                seq_id,
                snapshot_at_ms,
                snapshot_app_version: this.ig.state.appVersion,
            },
        });
    }
}
exports.RealtimeClient = RealtimeClient;
//# sourceMappingURL=realtime.client.js.map
