const Redis = require("ioredis");
const ApiError = require("@utils/ApiError");

/**
 * Redis-based Rate Limiter
 * Persistent, work với multiple servers (load balancer)
 */
class RateLimiter {
  constructor() {
    // Chỉ khởi tạo Redis nếu có config
    if (process.env.REDIS_HOST) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true, // Không tự động connect
      });

      this.redis.on("error", (err) => {
        console.warn("[REDIS] Connection error:", err.message);
      });

      this.redis.on("connect", () => {
        console.log("Redis connected for rate limiting");
      });

      // Connect explicitly
      this.redis.connect().catch((err) => {
        console.warn("[REDIS] Failed to connect, using in-memory fallback");
        this.redis = null;
      });
    } else {
      console.log(
        "Redis not configured, using in-memory rate limiting (not recommended for production)"
      );
      this.redis = null;
    }

    // In-memory fallback
    this.memoryStore = new Map();

    // FIX Issue #5: Periodic cleanup để tránh memory leak
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      let deletedCount = 0;
      for (const [k, v] of this.memoryStore.entries()) {
        if (now > v.resetTime) {
          this.memoryStore.delete(k);
          deletedCount++;
        }
      }
      // Log nếu có nhiều entries bị xóa (để monitor)
      if (deletedCount > 100) {
        console.log(
          `[RATE_LIMITER] Cleaned up ${deletedCount} expired entries`
        );
      }
    }, 60000); // Cleanup mỗi 60 giây
  }

  /**
   * Check rate limit
   * @param {string} key - Unique key (user ID, IP, etc.)
   * @param {number} maxRequests - Max requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<boolean>} - true nếu OK, false nếu exceed limit
   */
  async checkLimit(key, maxRequests = 10, windowMs = 60000) {
    try {
      // Nếu có Redis, dùng Redis
      if (this.redis && this.redis.status === "ready") {
        const redisKey = `ratelimit:${key}`;
        const windowSeconds = Math.ceil(windowMs / 1000);

        const count = await this.redis.incr(redisKey);

        if (count === 1) {
          await this.redis.expire(redisKey, windowSeconds);
        }

        return count <= maxRequests;
      }

      // Fallback to in-memory
      return this.checkLimitMemory(key, maxRequests, windowMs);
    } catch (error) {
      console.warn(
        "[RATE_LIMITER] Error, using memory fallback:",
        error.message
      );
      return this.checkLimitMemory(key, maxRequests, windowMs);
    }
  }

  /**
   * In-memory rate limiting (fallback)
   */
  checkLimitMemory(key, maxRequests, windowMs) {
    const now = Date.now();
    const record = this.memoryStore.get(key) || {
      count: 0,
      resetTime: now + windowMs,
    };

    // Reset nếu hết window
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    this.memoryStore.set(key, record);

    // Cleanup old entries
    if (this.memoryStore.size > 10000) {
      const keysToDelete = [];
      for (const [k, v] of this.memoryStore.entries()) {
        if (now > v.resetTime) keysToDelete.push(k);
      }
      keysToDelete.forEach((k) => this.memoryStore.delete(k));
    }

    return record.count <= maxRequests;
  }

  /**
   * Get remaining requests
   */
  async getRemaining(key, maxRequests = 10) {
    try {
      if (this.redis && this.redis.status === "ready") {
        const redisKey = `ratelimit:${key}`;
        const count = await this.redis.get(redisKey);
        const current = parseInt(count) || 0;
        return Math.max(0, maxRequests - current);
      }

      // Memory fallback
      const record = this.memoryStore.get(key);
      if (!record) return maxRequests;
      return Math.max(0, maxRequests - record.count);
    } catch (error) {
      return maxRequests;
    }
  }

  /**
   * Get TTL (seconds còn lại)
   */
  async getTTL(key) {
    try {
      if (this.redis && this.redis.status === "ready") {
        const redisKey = `ratelimit:${key}`;
        return await this.redis.ttl(redisKey);
      }

      // Memory fallback
      const record = this.memoryStore.get(key);
      if (!record) return -1;
      const remaining = Math.ceil((record.resetTime - Date.now()) / 1000);
      return Math.max(0, remaining);
    } catch (error) {
      return -1;
    }
  }

  /**
   * Reset rate limit cho key
   */
  async reset(key) {
    try {
      if (this.redis && this.redis.status === "ready") {
        const redisKey = `ratelimit:${key}`;
        await this.redis.del(redisKey);
      }
      this.memoryStore.delete(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Disconnect Redis
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 */
const rateLimitMiddleware = (maxRequests = 10, windowMs = 60000) => {
  return async (req, res, next) => {
    const userId = req.user?._id;
    const key = userId ? `user_${userId}` : `ip_${req.ip}`;

    const allowed = await rateLimiter.checkLimit(key, maxRequests, windowMs);

    if (!allowed) {
      const ttl = await rateLimiter.getTTL(key);
      const retryAfter = ttl > 0 ? ttl : Math.ceil(windowMs / 1000);

      res.set("Retry-After", retryAfter);
      return next(
        new ApiError(
          429,
          `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.`
        )
      );
    }

    // Thêm rate limit info vào header
    const remaining = await rateLimiter.getRemaining(key, maxRequests);
    res.set("X-RateLimit-Limit", maxRequests);
    res.set("X-RateLimit-Remaining", remaining);

    next();
  };
};

module.exports = {
  rateLimiter,
  rateLimitMiddleware,
};
