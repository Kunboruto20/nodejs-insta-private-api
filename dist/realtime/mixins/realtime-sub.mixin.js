"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeSubMixin = void 0;
const mixin_1 = require("./mixin");
const constants_1 = require("../../constants");
const shared_1 = require("../../shared");
const mqtts_1 = require("mqtts");
class RealtimeSubMixin extends mixin_1.Mixin {
    apply(client) {
        (0, mixin_1.hook)(client, 'connect', {
            post: async () => {
                // Wait for MQTT client to be ready
                let retries = 0;
                while (!client.mqtt && retries < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    retries++;
                }
                if (!client.mqtt) {
                    throw new mqtts_1.IllegalStateError('No mqtt client created after retries');
                }
                client.mqtt.on('message', async (msg) => {
                    const topicMap = client.mqtt?.topicMap;
                    const topic = topicMap?.get(msg.topic);
                    if (topic && topic.parser && !topic.noParse) {
                        try {
                            const unzipped = await (0, shared_1.tryUnzipAsync)(msg.payload);
                            const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                            if (Array.isArray(parsedMessages)) {
                                parsedMessages.forEach(m => {
                                    this.handleRealtimeSub(client, topic, m.data);
                                });
                            } else {
                                this.handleRealtimeSub(client, topic, parsedMessages.data);
                            }
                        } catch (e) {
                            console.error(`RealtimeSub parse error on ${topic.path}:`, e.message);
                        }
                    }
                });
            },
        });
    }
    handleRealtimeSub(client, topic, data) {
        client.emit('subscription', {
            query: topic.path,
            data: data,
            topic: topic,
        });
    }
    get name() {
        return 'Realtime Sub';
    }
}
exports.RealtimeSubMixin = RealtimeSubMixin;
//# sourceMappingURL=realtime-sub.mixin.js.map
