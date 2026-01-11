const mongoose = require("mongoose");

const ViewHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    sessionId: {
      type: String,
      comment: "Cho anonymous users chưa đăng nhập",
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
    },

    // Denormalized data cho performance
    productName: String,
    productImage: String,
    productPrice: Number,

    viewDuration: {
      type: Number,
      default: 0,
      comment: "Thời gian xem (giây)",
    },

    source: {
      type: String,
      enum: ["SEARCH", "CATEGORY", "RECOMMENDATION", "DIRECT", "RELATED"],
      default: "DIRECT",
    },

    deviceInfo: {
      type: String,
      comment: "Browser/device info",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for query performance
ViewHistorySchema.index({ user: 1, product: 1, createdAt: -1 });
ViewHistorySchema.index({ sessionId: 1, createdAt: -1 });

// FIX BUG #7: Proper TTL index - auto delete after 30 days
ViewHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days in seconds
);

// FIX BUG #8: Removed overly strict unique index
// Allow multiple views of same product within same second
// Duplicate prevention is handled by mergeAnonymousHistory with bulkWrite upsert logic

module.exports = ViewHistorySchema;
