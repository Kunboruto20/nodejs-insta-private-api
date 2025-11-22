"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeConnectRequestPacket = void 0;
function writeConnectRequestPacket(stream, options) {
    stream.writeString('MQTToT').writeByte(3).writeByte(194).writeWord(options.keepAlive).write(options.payload);
    return {};
}
exports.writeConnectRequestPacket = writeConnectRequestPacket;
//# sourceMappingURL=mqttot.connect.request.packet.js.map