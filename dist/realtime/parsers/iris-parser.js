/**
 * Iris Parser
 * 
 * Parses Iris messages from Instagram's realtime system.
 * Iris is Instagram's internal messaging system for real-time updates.
 */
class IrisParser {
  /**
   * Parse an Iris message
   * @param {Buffer|string} data - The raw message data
   * @returns {Object} Parsed Iris data
   */
  parse(data) {
    try {
      const message = Buffer.isBuffer(data) ? data.toString() : data;
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(message);
        return {
          type: 'iris',
          data: parsed,
          raw: message
        };
      } catch (jsonError) {
        // If not JSON, treat as plain text
        return {
          type: 'iris',
          data: { message: message },
          raw: message
        };
      }
    } catch (error) {
      return {
        type: 'iris',
        data: { error: error.message },
        raw: data.toString()
      };
    }
  }
}

module.exports = IrisParser;