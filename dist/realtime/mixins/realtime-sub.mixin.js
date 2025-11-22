"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeSubMixin = void 0;
const mixin_1 = require("./mixin");
const constants_1 = require("../../constants");
const shared_1 = require("../../shared");
const subscriptions_1 = require("../subscriptions");
const mqtts_1 = require("mqtts");
class RealtimeSubMixin extends mixin_1.Mixin {
    apply(client) {
        (0, mixin_1.hook)(client, 'connect', {
            post: () => {
                if (!client.mqtt) {
                    throw new mqtts_1.IllegalStateError('No mqtt client created');
                }
                client.mqtt.listen({
                    topic: constants_1.Topics.REALTIME_SUB.id,
                    transformer: async ({ payload }) => constants_1.Topics.REALTIME_SUB.parser.parseMessage(constants_1.Topics.REALTIME_SUB, await (0, shared_1.tryUnzipAsync)(payload)),
                }, data => this.handleRealtimeSub(client, data));
            },
        });
    }
    handleRealtimeSub(client, { data, topic: messageTopic }) {
        const { message } = data;
        client.emit('realtimeSub', { data, topic: messageTopic });
        if (typeof message === 'string') {
            this.emitDirectEvent(client, JSON.parse(message));
        }
        else {
            const { topic, payload, json } = message;
            switch (topic) {
                case 'direct': {
                    this.emitDirectEvent(client, json);
                    break;
                }
                default: {
                    const entries = Object.entries(subscriptions_1.QueryIDs);
                    const query = entries.find(e => e[1] === topic);
                    if (query) {
                        client.emit(query[0], json || payload);
                    }
                }
            }
        }
    }
    emitDirectEvent(client, parsed) {
        parsed.data = parsed.data.map((e) => {
            if (typeof e.value === 'string') {
                e.value = JSON.parse(e.value);
            }
            return e;
        });
        parsed.data.forEach((data) => client.emit('direct', data));
    }
    get name() {
        return 'Realtime Sub';
    }
}
exports.RealtimeSubMixin = RealtimeSubMixin;
//# sourceMappingURL=realtime-sub.mixin.js.map