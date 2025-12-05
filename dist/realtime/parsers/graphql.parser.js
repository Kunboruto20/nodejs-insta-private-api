"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphqlParser = void 0;
const thrift_1 = require("../../thrift");
const shared_1 = require("../../shared");
class GraphqlParser {
    parseMessage(topic, payload) {
        const message = (0, shared_1.isJson)(payload)
            ? payload.toString()
            : (0, thrift_1.thriftReadToObject)(payload, GraphqlParser.descriptors) ?? '';
        if (message.payload) {
            message.json = JSON.parse(message.payload);
        }
        return { topic, data: { message } };
    }
}
exports.GraphqlParser = GraphqlParser;
GraphqlParser.descriptors = [
    thrift_1.ThriftDescriptors.binary('topic', 1),
    thrift_1.ThriftDescriptors.binary('payload', 2),
];
//# sourceMappingURL=graphql.parser.js.map