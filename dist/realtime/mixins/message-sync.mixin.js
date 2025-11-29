"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSyncMixin = void 0;
const mixin_1 = require("./mixin");
const constants_1 = require("../../constants");
const shared_1 = require("../../shared");
const mqtts_1 = require("mqtts");
class MessageSyncMixin extends mixin_1.Mixin {
    apply(client) {
        console.log(`\n🔧 [MESSAGE_SYNC MIXIN] Applying mixin...`);
        // Hook into the main message handler to process MESSAGE_SYNC topic
        (0, mixin_1.hook)(client, 'connect', {
            post: async () => {
                console.log(`🔧 [MESSAGE_SYNC] Post-connect hook called`);
                // Wait for MQTT client to be ready
                let retries = 0;
                while (!client.mqtt && retries < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    retries++;
                }
                if (!client.mqtt) {
                    throw new mqtts_1.IllegalStateError('No mqtt client created after retries');
                }
                console.log(`✅ [MESSAGE_SYNC] MQTT ready, registering listen() on topic 146 (MESSAGE_SYNC)`);
                // Use the .listen() method like instagram_mqtt does
                if (client.mqtt.listen) {
                    console.log(`🎧 [MESSAGE_SYNC] mqtt.listen() method found, registering callback...`);
                    client.mqtt.listen({
                        topic: constants_1.Topics.MESSAGE_SYNC.id,
                        transformer: async ({ payload }) => {
                            console.log(`   📥 [MESSAGE_SYNC] Transformer called for topic 146`);
                            const parsed = constants_1.Topics.MESSAGE_SYNC.parser
                                .parseMessage(constants_1.Topics.MESSAGE_SYNC, await (0, shared_1.tryUnzipAsync)(payload))
                                .map(msg => msg.data);
                            console.log(`   ✅ Parsed ${parsed.length} items`);
                            return parsed;
                        },
                    }, data => {
                        console.log(`🎯 [MESSAGE_SYNC] Callback FIRED with ${data?.length || 0} data items`);
                        this.handleMessageSync(client, data);
                    });
                } else {
                    console.log(`❌ [MESSAGE_SYNC] mqtt.listen() NOT FOUND - trying fallback to 'receive' event`);
                    client.on('receive', (topic, messages) => {
                        if (topic.id === constants_1.Topics.MESSAGE_SYNC.id) {
                            console.log(`🎯 [MESSAGE_SYNC FALLBACK] Received on topic 146`);
                            const data = messages.map(m => m.data);
                            this.handleMessageSync(client, data);
                        }
                    });
                }
            },
        });
    }
    handleMessageSync(client, syncData) {
        console.log(`\n🎯 [MESSAGE_SYNC HANDLER] Processing ${syncData?.length || 0} sync items`);
        for (const element of syncData) {
            const data = element.data;
            if (!data) {
                console.log(`  📡 Iris sync (no data)`);
                client.emit('iris', element);
                continue;
            }
            delete element.data;
            data.forEach(e => {
                if (!e.path) {
                    console.log(`  📡 Iris sync item`);
                    client.emit('iris', { ...element, ...e });
                }
                if (e.path.startsWith('/direct_v2/threads') && e.value) {
                    console.log(`\n💬 [DM MESSAGE] Path: ${e.path}`);
                    try {
                        const msgValue = JSON.parse(e.value);
                        console.log(`   💬 TEXT: "${msgValue.text?.substring(0, 80) || 'no text'}"`);
                        console.log(`   👤 USER: ${msgValue.from_user_id || msgValue.user_id || msgValue.sender_id || 'unknown'}`);
                        console.log(`   🧵 THREAD: ${MessageSyncMixin.getThreadIdFromPath(e.path)}`);
                    } catch(err) {
                        console.log(`   ⚠️ Parse error: ${err.message}`);
                    }
                    const parsedMessage = {
                        ...element,
                        message: {
                            path: e.path,
                            op: e.op,
                            thread_id: MessageSyncMixin.getThreadIdFromPath(e.path),
                            ...JSON.parse(e.value),
                        },
                    };
                    console.log(`   ✅ Emitting 'message' event with data:`, JSON.stringify(parsedMessage.message, null, 2).substring(0, 200));
                    client.emit('message', parsedMessage);
                }
                else {
                    client.emit('threadUpdate', {
                        ...element,
                        meta: {
                            path: e.path,
                            op: e.op,
                            thread_id: MessageSyncMixin.getThreadIdFromPath(e.path),
                        },
                        update: {
                            ...JSON.parse(e.value),
                        },
                    });
                }
            });
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
//# sourceMappingURL=message-sync.mixin.js.map
