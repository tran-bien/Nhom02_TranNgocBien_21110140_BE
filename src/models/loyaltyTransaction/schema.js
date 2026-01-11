const mongoose = require("mongoose");

const LoyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["EARN", "REDEEM", "EXPIRE", "ADJUST", "DEDUCT"],
      required: true,
      comment:
        "EARN: Tích điểm, REDEEM: Đổi điểm, EXPIRE: Hết hạn, ADJUST: Điều chỉnh, DEDUCT: Trừ điểm (trả hàng)",
    },

    points: {
      type: Number,
      required: true,
      comment: "Số điểm (dương cho EARN, âm cho REDEEM/EXPIRE)",
    },

    balanceBefore: {
      type: Number,
      required: true,
    },

    balanceAfter: {
      type: Number,
      required: true,
    },

    // Nguồn gốc điểm
    source: {
      type: String,
      enum: ["ORDER", "MANUAL", "RETURN", "REVIEW"],
      required: true,
      comment:
        "ORDER: Từ đơn hàng, MANUAL: Thủ công, RETURN: Trả hàng, REVIEW: Đánh giá",
    },

    // References
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },

    description: {
      type: String,
      maxlength: 500,
    },

    // TTL cho điểm
    expiresAt: {
      type: Date,
      comment: "Điểm hết hạn sau 1 năm",
    },

    isExpired: {
      type: Boolean,
      default: false,
    },

    // Admin thao tác
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index
LoyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ type: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ expiresAt: 1, isExpired: 1 }); // Cho cronjob
LoyaltyTransactionSchema.index({ order: 1 });

module.exports = LoyaltyTransactionSchema;
