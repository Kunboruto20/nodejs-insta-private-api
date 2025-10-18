/**
 * JSON Parser
 * 
 * Parses JSON messages from Instagram's realtime system.
 * This is a general-purpose parser for JSON-formatted messages.
 */
class JsonParser {
  /**
   * Parse a JSON message
   * @param {Buffer|string} data - The raw message data
   * @returns {Object} Parsed JSON data
   */
  parse(data) {
    try {
      const message = Buffer.isBuffer(data) ? data.toString() : data;
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(message);
        return {
          type: 'json',
          data: parsed,
          raw: message
        };
      } catch (jsonError) {
        // If not valid JSON, return as plain text
        return {
          type: 'json',
          data: { text: message },
          raw: message
        };
      }
    } catch (error) {
      return {
        type: 'json',
        data: { error: error.message },
        raw: data.toString()
      };
    }
  }
}

module.exports = JsonParser;