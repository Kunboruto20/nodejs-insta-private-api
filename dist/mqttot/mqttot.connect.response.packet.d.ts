/// <reference types="node" />
import { ConnectResponsePacket, PacketStream, ConnectReturnCode } from 'mqtts';
export declare class MQTToTConnectResponsePacket extends ConnectResponsePacket {
    readonly payload: Buffer;
    constructor(ackFlags: number, returnCode: ConnectReturnCode, payload: Buffer);
}
export declare function readConnectResponsePacket(stream: PacketStream, remaining: number): MQTToTConnectResponsePacket;
