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
class RealtimeClient extends eventemitter3_1.EventEmitter {
    get mqtt() {
        return this._mqtt;
    }
    /**
     *
     * @param {IgApiClient} ig
     * @param mixins - by default MessageSync and Realtime mixins are used
     */
    constructor(ig, mixins = [new mixins_1.MessageSyncMixin(), new mixins_1.RealtimeSubMixin()]) {
        super();
        this.realtimeDebug = (0, shared_1.debugChannel)('realtime');
        this.messageDebug = this.realtimeDebug.extend('message');
        this.safeDisconnect = false;
        this.emitError = (e) => this.emit('error', e);
        this.emitWarning = (e) => this.emit('warning', e);
        this.ig = ig;
        this.realtimeDebug(`Applying mixins: ${mixins.map(m => m.name).join(', ')}`);
        (0, mixins_1.applyMixins)(mixins, this, this.ig);
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
                platform: 'android',
                ig_mqtt_route: 'django',
                pubsub_msg_type_blacklist: 'direct, typing_type',
                auth_cache_enabled: '0',
            },
        });
    }
    async connect(initOptions) {
        this.realtimeDebug('Connecting to realtime-broker...');
        this.setInitOptions(initOptions);
        this.realtimeDebug(`Overriding: ${Object.keys(this.initOptions?.connectOverrides || {}).join(', ')}`);
        this._mqtt = new mqttot_1.MQTToTClient({
            url: constants_1.REALTIME.HOST_NAME_V6,
            payloadProvider: () => {
                this.constructConnection();
                if (!this.connection) {
                    throw new mqtts_1.IllegalStateError("constructConnection() didn't create a connection");
                }
                return (0, shared_1.compressDeflate)(this.connection.toThrift());
            },
            enableTrace: this.initOptions?.enableTrace,
            autoReconnect: this.initOptions?.autoReconnect ?? true,
            requirePayload: false,
            socksOptions: this.initOptions?.socksOptions,
            additionalOptions: this.initOptions?.additionalTlsOptions,
        });
        this.commands = new commands_1.Commands(this.mqtt);
        this.direct = new commands_1.DirectCommands(this.mqtt);
        this.mqtt.on('message', async (msg) => {
            const topicNum = msg.topic;
            const byteCount = msg.payload?.length || 0;
            
            const unzipped = await (0, shared_1.tryUnzipAsync)(msg.payload);
            const topic = constants_1.RealtimeTopicsArray.find(t => t.id === msg.topic);
            
            // LOG ALL INCOMING MESSAGES
            console.log(`\n📥 [INCOMING] Topic ID: ${topicNum} (${topic?.path || 'UNKNOWN'}) | Size: ${byteCount} bytes`);
            
            // SPECIAL HANDLING FOR MESSAGE_SYNC (Topic 146) - MOST IMPORTANT FOR DMs
            if (topicNum === '146') {
                console.log('\n💬 [MESSAGE_SYNC] PARSING DM MESSAGE!');
                try {
                    const irisParser = topic.parser;
                    const parsed = irisParser.parseMessage(topic, unzipped);
                    
                    console.log(`   ✅ Parsed ${Array.isArray(parsed) ? parsed.length : 1} items`);
                    
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item, idx) => {
                            const data = item.data;
                            if (data) {
                                console.log(`\n   📨 Item ${idx + 1}:`);
                                if (data.data && Array.isArray(data.data)) {
                                    data.data.forEach((d, didx) => {
                                        console.log(`      Data ${didx + 1}: Path=${d.path}`);
                                        if (d.path && d.path.startsWith('/direct_v2/threads')) {
                                            try {
                                                const msgValue = JSON.parse(d.value);
                                                console.log(`      💬 TEXT: "${msgValue.text || 'no text'}" | From: ${msgValue.user_id || 'unknown'}`);
                                                const threadId = d.path.match(/\/direct_v2\/(inbox\/)?threads\/(\d+)/)?.[2];
                                                this.emit('message', {
                                                    message: {
                                                        ...msgValue,
                                                        thread_id: threadId,
                                                        path: d.path,
                                                    },
                                                });
                                            } catch(e) {
                                                console.log(`      ⚠️ Parse JSON error: ${e.message}`);
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.log(`   ⚠️ MESSAGE_SYNC Parse Error: ${e.message}`);
                }
            }
            
            if (topic && topic.parser && !topic.noParse) {
                try {
                    const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                    
                    console.log(`   ✅ PARSED [${topic.path}]`);
                    if (Array.isArray(parsedMessages)) {
                        parsedMessages.forEach((pm, idx) => {
                            console.log(`      [${idx + 1}] ${JSON.stringify(pm.data).substring(0, 100)}`);
                        });
                    } else {
                        console.log(`      ${JSON.stringify(parsedMessages.data).substring(0, 100)}`);
                    }
                    
                    this.messageDebug(`Received on ${topic.path}: ${JSON.stringify(Array.isArray(parsedMessages) ? parsedMessages.map((x) => x.data) : parsedMessages.data)}`);
                    this.emit('receive', topic, Array.isArray(parsedMessages) ? parsedMessages : [parsedMessages]);
                } catch (e) {
                    console.log(`   ⚠️ PARSE ERROR: ${e.message}`);
                }
            }
            else {
                console.log(`   📡 RAW DATA (no parser)`);
                this.messageDebug(`Received raw on ${topic?.path ?? msg.topic}: (${unzipped.byteLength} bytes)`);
                this.emit('receiveRaw', msg);
            }
        });
        this.mqtt.on('error', e => this.emitError(e));
        this.mqtt.on('warning', w => this.emitWarning(w));
        this.mqtt.on('disconnect', () => this.safeDisconnect
            ? this.emit('disconnect')
            : this.emitError(new errors_1.ClientDisconnectedError('MQTToTClient got disconnected.')));
        return new Promise((resolve, reject) => {
            this.mqtt.on('connect', async () => {
                if (!this.initOptions) {
                    throw new mqtts_1.IllegalStateError('No initi options given');
                }
                this.realtimeDebug('Connected to MQTT broker');
                // Emit connected immediately - don't wait for subscriptions
                this.emit('connected');
                resolve();
                
                // Run subscriptions in background (non-blocking)
                try {
                    const { graphQlSubs, skywalkerSubs, irisData } = this.initOptions;
                    this.realtimeDebug('Initializing subscriptions...');
                    
                    console.log(`[SUBSCRIBE] GraphQL: ${graphQlSubs?.join(', ')}`);
                    await Promise.all([
                        graphQlSubs && graphQlSubs.length > 0 ? this.graphQlSubscribe(graphQlSubs) : null,
                        skywalkerSubs && skywalkerSubs.length > 0 ? this.skywalkerSubscribe(skywalkerSubs) : null,
                    ]);
                    
                    // Only subscribe to Iris if explicitly provided and valid
                    if (irisData && irisData.seq_id !== undefined) {
                        console.log(`[SUBSCRIBE] Iris: seq_id=${irisData.seq_id}`);
                        await this.irisSubscribe(irisData);
                    } else {
                        console.log(`[SUBSCRIBE] Skipping Iris (not needed for real-time DMs)`);
                    }
                    
                    console.log(`[SUBSCRIBED] ✅ All subscriptions sent to Instagram`);
                    
                    // CRITICAL: Wait for MESSAGE_SYNC listener to be fully active (100ms buffer)
                    // This ensures the listener is ready BEFORE we tell Instagram to send DMs
                    console.log(`\n⏳ [SYNC] Waiting for MESSAGE_SYNC listener to activate...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // TRIGGER: Fetch inbox to tell Instagram we want DM messages on MQTT
                    // This activates the MESSAGE_SYNC topic (146) which sends all DMs through MQTT
                    console.log(`🔔 [TRIGGER] Calling getInbox() to activate MESSAGE_SYNC on MQTT...`);
                    try {
                        const inboxResponse = await this.ig.direct.getInbox();
                        console.log(`✅ [TRIGGER] SUCCESS! Instagram now sending DMs through MQTT (topic 146)`);
                        console.log(`   Inbox threads: ${inboxResponse.threads?.length || 0}`);
                        console.log(`\n📡 [MQTT READY] Listening for DM messages on MESSAGE_SYNC topic...`);
                    } catch (e) {
                        console.log(`⚠️  [TRIGGER] Inbox fetch failed: ${e.message}`);
                        console.log(`   MQTT still listening - try sending a DM anyway`);
                    }
                    
                    this.realtimeDebug('Subscriptions initialized successfully');
                } catch (e) {
                    console.error(`[SUBSCRIBE ERROR] ${e.message}`);
                    this.realtimeDebug(`Subscription error: ${e.message}`);
                }
            });
            this.mqtt.connect({
                keepAlive: 20,
                protocolLevel: 3,
                clean: true,
                connectDelay: 60 * 1000,
            }).catch(e => {
                this.emitError(e);
                reject(e);
            });
        });
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