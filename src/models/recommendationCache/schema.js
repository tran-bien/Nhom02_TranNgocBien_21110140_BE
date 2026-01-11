const mongoose = require("mongoose");

const RecommendationCacheSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    algorithm: {
      type: String,
      enum: ["PERSONALIZED"],
      default: "PERSONALIZED",
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    scores: [Number],

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// FIX BUG #13: Unique compound index to prevent duplicate cache entries
RecommendationCacheSchema.index({ user: 1, algorithm: 1 }, { unique: true });

// FIX BUG #11: Proper TTL index - cache expires in 24 hours
RecommendationCacheSchema.index(
  { generatedAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 }
);

module.exports = RecommendationCacheSchema;
