const RealtimeService = require('./realtime.service');
const { Topics, RealtimeTopicsArray, REALTIME } = require('./topic');
const { RegionHintParser, GraphqlParser, IrisParser, JsonParser, SkywalkerParser } = require('./parsers');

module.exports = {
  RealtimeService,
  Topics,
  RealtimeTopicsArray,
  REALTIME,
  Parsers: {
    RegionHintParser,
    GraphqlParser,
    IrisParser,
    JsonParser,
    SkywalkerParser
  }
};