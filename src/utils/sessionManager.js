const crypto = require("crypto");

/**
 * Session ID Generator & Validator
 * Format: {prefix}_{userId/ip}_{timestamp}_{random}
 */
class SessionManager {
  /**
   * Generate secure session ID
   * @param {string} userId - User ID (hoặc IP nếu anonymous)
   * @param {string} prefix - Session prefix (default: "session")
   * @returns {string} - Session ID
   */
  static generateSessionId(userId, prefix = "session") {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${userId}_${timestamp}_${random}`)
      .digest("hex")
      .substring(0, 16);

    return `${prefix}_${hash}_${timestamp}`;
  }

  /**
   * Validate session ID format
   * @param {string} sessionId - Session ID cần validate
   * @returns {boolean} - true nếu valid
   */
  static validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== "string") {
      return false;
    }

    // Format: prefix_hash_timestamp
    const pattern = /^[a-z]+_[a-f0-9]{16}_\d{13}$/;
    return pattern.test(sessionId);
  }

  /**
   * Extract timestamp từ session ID
   * @param {string} sessionId
   * @returns {number|null} - Timestamp hoặc null nếu invalid
   */
  static extractTimestamp(sessionId) {
    if (!this.validateSessionId(sessionId)) {
      return null;
    }

    const parts = sessionId.split("_");
    return parseInt(parts[2]);
  }

  /**
   * Check session đã expired chưa
   * @param {string} sessionId
   * @param {number} maxAge - Max age in milliseconds (default: 24 hours)
   * @returns {boolean} - true nếu expired
   */
  static isExpired(sessionId, maxAge = 24 * 60 * 60 * 1000) {
    const timestamp = this.extractTimestamp(sessionId);
    if (!timestamp) return true;

    const age = Date.now() - timestamp;
    return age > maxAge;
  }

  /**
   * Sanitize session ID (remove dangerous characters)
   * @param {string} sessionId
   * @returns {string} - Cleaned session ID
   */
  static sanitize(sessionId) {
    if (!sessionId) return "";
    
    // Chỉ giữ alphanumeric và underscore
    return sessionId.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 64);
  }
}

module.exports = SessionManager;
