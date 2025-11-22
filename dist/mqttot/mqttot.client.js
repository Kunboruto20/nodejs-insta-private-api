"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttotConnectFlow = exports.MQTToTClient = void 0;
const shared_1 = require("../shared");
const mqttot_connect_request_packet_1 = require("./mqttot.connect.request.packet");
const mqtts_1 = require("mqtts");
const errors_1 = require("../errors");
const mqttot_connect_response_packet_1 = require("./mqttot.connect.response.packet");
class MQTToTClient extends mqtts_1.MqttClient {
    constructor(options) {
        super({
            autoReconnect: options.autoReconnect,
            readMap: {
                ...mqtts_1.DefaultPacketReadMap,
                [mqtts_1.PacketType.ConnAck]: mqttot_connect_response_packet_1.readConnectResponsePacket,
            },
            writeMap: {
                ...mqtts_1.DefaultPacketWriteMap,
                [mqtts_1.PacketType.Connect]: mqttot_connect_request_packet_1.writeConnectRequestPacket,
            },
            transport: options.socksOptions
                ? new mqtts_1.SocksTlsTransport({
                    host: options.url,
                    port: 443,
                    proxyOptions: options.socksOptions,
                    additionalOptions: options.additionalOptions,
                })
                : new mqtts_1.TlsTransport({
                    host: options.url,
                    port: 443,
                    additionalOptions: options.additionalOptions,
                }),
        });
        this.mqttotDebug = (msg, ...args) => (0, shared_1.debugChannel)('mqttot')(`${options.url}: ${msg}`, ...args);
        this.connectPayloadProvider = options.payloadProvider;
        this.mqttotDebug(`Creating client`);
        this.registerListeners();
        this.requirePayload = options.requirePayload;
    }
    registerListeners() {
        const printErrorOrWarning = (type) => (e) => {
            if (typeof e === 'string') {
                this.mqttotDebug(`${type}: ${e}`);
            }
            else {
                this.mqttotDebug(`${type}: ${e.message}\n\tStack: ${e.stack}`);
            }
        };
        this.on('error', printErrorOrWarning('Error'));
        this.on('warning', printErrorOrWarning('Warning'));
        this.on('disconnect', e => this.mqttotDebug(`Disconnected. ${e}`));
    }
    async connect(options) {
        this.connectPayload = await this.connectPayloadProvider();
        return super.connect(options);
    }
    getConnectFlow() {
        if (!this.connectPayload) {
            throw new mqtts_1.IllegalStateError('Called getConnectFlow() before calling connect()');
        }
        return mqttotConnectFlow(this.connectPayload, this.requirePayload);
    }
    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<MqttMessageOutgoing>}
     */
    async mqttotPublish(message) {
        this.mqttotDebug(`Publishing ${message.payload.byteLength}bytes to topic ${message.topic}`);
        return await this.publish({
            topic: message.topic,
            payload: await (0, shared_1.compressDeflate)(message.payload),
            qosLevel: message.qosLevel,
        });
    }
}
exports.MQTToTClient = MQTToTClient;
function mqttotConnectFlow(payload, requirePayload) {
    return (success, error) => ({
        start: () => ({
            type: mqtts_1.PacketType.Connect,
            options: {
                payload,
                keepAlive: 60,
            },
        }),
        accept: mqtts_1.isConnAck,
        next: (packet) => {
            if (packet.isSuccess) {
                if (packet.payload?.length || !requirePayload)
                    success(packet);
                else
                    error(new errors_1.EmptyPacketError(`CONNACK: no payload (payloadExpected): ${packet.payload}`));
            }
            else
                error(new errors_1.ConnectionFailedError(`CONNACK returnCode: ${packet.returnCode} errorName: ${packet.errorName}`));
        },
    });
}
exports.mqttotConnectFlow = mqttotConnectFlow;
//# sourceMappingURL=mqttot.client.js.map