const { RegionHintParser, GraphqlParser, IrisParser, JsonParser, SkywalkerParser } = require('./parsers');

/**
 * Instagram Realtime Topics Configuration
 * 
 * Defines all available topics for Instagram's realtime MQTT system
 * using the correct endpoint: edge-mqtt.facebook.com
 */
const Topics = {
  GRAPHQL: { 
    id: '9', 
    path: '/graphql', 
    parser: new GraphqlParser() 
  },
  PUBSUB: { 
    id: '88', 
    path: '/pubsub', 
    parser: new SkywalkerParser() 
  },
  SEND_MESSAGE_RESPONSE: { 
    id: '133', 
    path: '/ig_send_message_response', 
    parser: new JsonParser() 
  },
  IRIS_SUB: { 
    id: '134', 
    path: '/ig_sub_iris', 
    parser: null 
  },
  IRIS_SUB_RESPONSE: { 
    id: '135', 
    path: '/ig_sub_iris_response', 
    parser: new JsonParser() 
  },
  MESSAGE_SYNC: { 
    id: '146', 
    path: '/ig_message_sync', 
    parser: new IrisParser(), 
    noParse: true 
  },
  REALTIME_SUB: { 
    id: '149', 
    path: '/ig_realtime_sub', 
    parser: new GraphqlParser(), 
    noParse: true 
  },
  REGION_HINT: { 
    id: '150', 
    path: '/t_region_hint', 
    parser: new RegionHintParser() 
  },
  FOREGROUND_STATE: { 
    id: '102', 
    path: '/t_fs', 
    parser: null 
  },
  SEND_MESSAGE: { 
    id: '132', 
    path: '/ig_send_message', 
    parser: null 
  }
};

/**
 * Array of all topics for easy iteration
 */
const RealtimeTopicsArray = Object.values(Topics);

/**
 * Realtime configuration
 */
const REALTIME = {
  HOST_NAME_V6: 'edge-mqtt.facebook.com' // Main realtime endpoint
};

module.exports = {
  Topics,
  RealtimeTopicsArray,
  REALTIME
};