const debug = require('debug')('ig:parsers');
const ProtoParser = require('./proto-parser');

const protoParser = new ProtoParser();

/**
 * Advanced Topic-Specific Parsers
 */

// Parse Iris (Direct Messages)
function parseIris(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  if (result.success && result.messages) {
    return {
      type: 'iris',
      messages: result.messages.filter(m => m.type === 'message' || !m.type),
      threads: result.messages.filter(m => m.type === 'thread').map(m => m.thread),
      typing: result.messages.filter(m => m.type === 'typing').map(m => m.typing)
    };
  }
  
  return { type: 'iris', error: result.error, raw: result.raw };
}

// Parse GraphQL (Presence, Typing)
function parseGraphQL(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  if (result.success) {
    return {
      type: 'graphql',
      data: result.decoded,
      messages: result.messages
    };
  }
  
  return { type: 'graphql', error: result.error };
}

// Parse Delta (Sync updates)
function parseDelta(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  if (result.success && result.decoded) {
    return {
      type: 'delta',
      seqId: result.decoded.seq_id,
      action: result.decoded.action,
      items: result.messages,
      metadata: result.decoded.metadata
    };
  }
  
  return { type: 'delta', error: result.error };
}

// Parse Presence
function parsePresence(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  if (result.success) {
    return {
      type: 'presence',
      items: result.messages.map(m => ({
        userId: m.id,
        status: m.typing?.state || 'unknown',
        timestamp: m.timestamp
      }))
    };
  }
  
  return { type: 'presence', error: result.error };
}

// Parse Feed
function parseFeed(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  return {
    type: 'feed',
    decoded: result.decoded,
    items: result.messages,
    error: result.error
  };
}

// Parse Live
function parseLive(topicId, payload) {
  const result = protoParser.decode(topicId, payload);
  
  return {
    type: 'live',
    decoded: result.decoded,
    items: result.messages,
    error: result.error
  };
}

// Parse Region Hint
function parseRegionHint(topicId, payload) {
  try {
    const text = payload.toString('utf-8');
    const hint = JSON.parse(text);
    
    return {
      type: 'region-hint',
      region: hint.region,
      endpoint: hint.endpoint,
      data: hint
    };
  } catch (e) {
    return {
      type: 'region-hint',
      raw: payload.toString('utf-8', 0, 200),
      error: e.message
    };
  }
}

// Unified router
const PARSERS = {
  iris: parseIris,
  graphql: parseGraphQL,
  delta: parseDelta,
  presence: parsePresence,
  feed: parseFeed,
  live: parseLive,
  'region-hint': parseRegionHint
};

function parseByType(topicType, topicId, payload) {
  const parser = PARSERS[topicType];
  
  if (!parser) {
    debug(`⚠️  Unknown topic type: ${topicType}`);
    return { type: topicType, error: 'Unknown parser', raw: payload.toString('utf-8', 0, 200) };
  }
  
  try {
    return parser(topicId, payload);
  } catch (e) {
    debug(`Parse error for ${topicType}:`, e.message);
    return { type: topicType, error: e.message };
  }
}

module.exports = {
  parseIris,
  parseGraphQL,
  parseDelta,
  parsePresence,
  parseFeed,
  parseLive,
  parseRegionHint,
  parseByType,
  ProtoParser
};
