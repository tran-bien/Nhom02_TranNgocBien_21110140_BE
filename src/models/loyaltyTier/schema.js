const mongoose = require("mongoose");

const LoyaltyTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
    },

    // FIXED: Tier tính theo doanh số 12 tháng, không phải điểm hiện tại
    minSpending: {
      type: Number,
      required: true,
      min: 0,
      comment: "Doanh số tối thiểu trong 12 tháng để đạt tier này",
    },

    maxSpending: {
      type: Number,
      min: 0,
      comment: "Doanh số tối đa (null = không giới hạn)",
    },

    benefits: {
      pointsMultiplier: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
        comment: "Hệ số nhân điểm (x1, x1.5, x2...)",
      },

      prioritySupport: {
        type: Boolean,
        default: false,
        comment: "Hỗ trợ ưu tiên",
      },
    },

    displayOrder: {
      type: Number,
      required: true,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index
LoyaltyTierSchema.index({ minSpending: 1 });
LoyaltyTierSchema.index({ displayOrder: 1 });

module.exports = LoyaltyTierSchema;
