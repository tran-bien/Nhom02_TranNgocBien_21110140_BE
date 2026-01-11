const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "Unknown",
    },
    ip: {
      type: String,
      default: "Unknown",
    },
    device: {
      type: Object,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// HYBRID CLEANUP STRATEGY: TTL Index + Manual Cleanup
//  TTL INDEX: MongoDB automatically deletes expired sessions every 60 seconds
// This handles 90% of cleanup work with ZERO app overhead
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// COMPOUND INDEX: Optimize inactive session queries (for manual cleanup)
// TTL can't handle compound conditions (isActive + updatedAt), so we need manual cleanup
SessionSchema.index({ isActive: 1, updatedAt: 1 });

// EXISTING INDEXES: Keep for query performance
SessionSchema.index({ user: 1, token: 1 });
SessionSchema.index({ user: 1, isActive: 1 });
SessionSchema.index({ token: 1 });

// FIXED Bug #20: Unique compound index to prevent duplicate active sessions
// Only enforce uniqueness for active sessions (prevents duplicate logins from same device)
SessionSchema.index(
  { user: 1, userAgent: 1, ip: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "unique_active_session_per_device",
  }
);

module.exports = SessionSchema;
