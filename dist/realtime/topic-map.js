/**
 * Topic Mapping - Maps Instagram MQTT topics to handlers
 * Topic IDs from Instagram MQTT broker
 */

const TOPICS = {
  // Direct Messages
  IRIS: { id: 88, path: '/ig/u/v1', type: 'iris', qos: 1 },
  
  // Typing Indicators & Presence
  GRAPHQL: { id: 135, path: '/ig/gqls', type: 'graphql', qos: 1 },
  
  // Message Sync Deltas
  MESSAGE_SYNC: { id: 149, path: '/ig/s/delta', type: 'delta', qos: 1 },
  
  // Presence Status
  PRESENCE: { id: 150, path: '/ig/s/presence', type: 'presence', qos: 1 },
  
  // Feed Updates
  FEED: { id: 133, path: '/ig/s/feed', type: 'feed', qos: 1 },
  
  // Live Events
  LIVE: { id: 146, path: '/ig/s/live', type: 'live', qos: 1 },
  
  // Region Hint
  REGION_HINT: { id: 202, path: '/t_region_hint', type: 'region', qos: 0 }
};

// For quick ID lookup
const ID_TO_TOPIC = {};
Object.values(TOPICS).forEach(topic => {
  ID_TO_TOPIC[topic.id] = topic;
});

// Parser mapping
const TOPIC_PARSERS = {
  iris: 'parseIris',
  graphql: 'parseGraphQL',
  delta: 'parseDelta',
  presence: 'parsePresence',
  feed: 'parseFeed',
  live: 'parseLive',
  region: 'parseRegionHint'
};

function getTopicById(id) {
  return ID_TO_TOPIC[id];
}

function getTopicByPath(path) {
  return Object.values(TOPICS).find(t => t.path === path);
}

function getParserForTopic(topicType) {
  return TOPIC_PARSERS[topicType] || null;
}

function getSubscriptionList() {
  // Return IDs for MQTT subscription
  return Object.values(TOPICS).map(t => t.id);
}

module.exports = {
  TOPICS,
  ID_TO_TOPIC,
  TOPIC_PARSERS,
  getTopicById,
  getTopicByPath,
  getParserForTopic,
  getSubscriptionList
};
