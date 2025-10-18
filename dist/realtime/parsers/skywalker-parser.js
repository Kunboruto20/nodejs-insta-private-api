/**
 * Skywalker Parser
 * 
 * Parses Skywalker messages from Instagram's realtime system.
 * Skywalker is Instagram's pub/sub system for real-time updates.
 */
class SkywalkerParser {
  /**
   * Parse a Skywalker message
   * @param {Buffer|string} data - The raw message data
   * @returns {Object} Parsed Skywalker data
   */
  parse(data) {
    try {
      const message = Buffer.isBuffer(data) ? data.toString() : data;
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(message);
        return {
          type: 'skywalker',
          data: parsed,
          raw: message
        };
      } catch (jsonError) {
        // If not JSON, treat as plain text
        return {
          type: 'skywalker',
          data: { message: message },
          raw: message
        };
      }
    } catch (error) {
      return {
        type: 'skywalker',
        data: { error: error.message },
        raw: data.toString()
      };
    }
  }
}

module.exports = SkywalkerParser;