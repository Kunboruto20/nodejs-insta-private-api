/**
 * GraphQL Parser
 * 
 * Parses GraphQL messages from Instagram's realtime system.
 * These messages contain GraphQL queries, mutations, and subscriptions.
 */
class GraphqlParser {
  /**
   * Parse a GraphQL message
   * @param {Buffer|string} data - The raw message data
   * @returns {Object} Parsed GraphQL data
   */
  parse(data) {
    try {
      const message = Buffer.isBuffer(data) ? data.toString() : data;
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(message);
        return {
          type: 'graphql',
          data: parsed,
          raw: message
        };
      } catch (jsonError) {
        // If not JSON, treat as GraphQL query string
        return {
          type: 'graphql',
          data: { query: message },
          raw: message
        };
      }
    } catch (error) {
      return {
        type: 'graphql',
        data: { error: error.message },
        raw: data.toString()
      };
    }
  }
}

module.exports = GraphqlParser;