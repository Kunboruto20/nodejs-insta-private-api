/**
 * Region Hint Parser
 * 
 * Parses region hint messages from Instagram's realtime system.
 * These messages contain information about the user's region/location.
 */
class RegionHintParser {
  /**
   * Parse a region hint message
   * @param {Buffer|string} data - The raw message data
   * @returns {Object} Parsed region hint data
   */
  parse(data) {
    try {
      const message = Buffer.isBuffer(data) ? data.toString() : data;
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(message);
        return {
          type: 'region_hint',
          data: parsed,
          raw: message
        };
      } catch (jsonError) {
        // If not JSON, treat as plain text
        return {
          type: 'region_hint',
          data: { hint: message },
          raw: message
        };
      }
    } catch (error) {
      return {
        type: 'region_hint',
        data: { error: error.message },
        raw: data.toString()
      };
    }
  }
}

module.exports = RegionHintParser;