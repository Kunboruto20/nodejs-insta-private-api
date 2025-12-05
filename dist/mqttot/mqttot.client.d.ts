/// <reference types="node" />
/// <reference types="node" />
import { MQTToTConnectPacketOptions } from './mqttot.connect.request.packet';
import { ConnectRequestOptions, DefaultPacketReadResultMap, DefaultPacketWriteOptions, MqttClient, MqttMessage, MqttMessageOutgoing, PacketFlowFunc, PacketType } from 'mqtts';
import { MQTToTConnectResponsePacket } from './mqttot.connect.response.packet';
import { SocksProxy } from 'socks';
import { ConnectionOptions } from 'tls';
type MQTToTReadMap = Omit<DefaultPacketReadResultMap, PacketType.ConnAck> & {
    [PacketType.ConnAck]: MQTToTConnectResponsePacket;
};
type MQTToTWriteMap = Omit<DefaultPacketWriteOptions, PacketType.Connect> & {
    [PacketType.Connect]: MQTToTConnectPacketOptions;
};
export declare class MQTToTClient extends MqttClient<MQTToTReadMap, MQTToTWriteMap> {
    protected connectPayloadProvider: () => Promise<Buffer>;
    protected connectPayload?: Buffer;
    protected requirePayload: boolean;
    protected mqttotDebug: (msg: string) => void;
    constructor(options: {
        url: string;
        payloadProvider: () => Promise<Buffer>;
        enableTrace?: boolean;
        autoReconnect: boolean;
        requirePayload: boolean;
        socksOptions?: SocksProxy;
        additionalOptions?: ConnectionOptions;
    });
    protected registerListeners(): void;
    connect(options?: ConnectRequestOptions): Promise<any>;
    protected getConnectFlow(): PacketFlowFunc<MQTToTReadMap, MQTToTWriteMap, any>;
    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<MqttMessageOutgoing>}
     */
    mqttotPublish(message: MqttMessage): Promise<MqttMessageOutgoing>;
}
export declare function mqttotConnectFlow(payload: Buffer, requirePayload: boolean): PacketFlowFunc<MQTToTReadMap, MQTToTWriteMap, MQTToTConnectResponsePacket>;
export {};
