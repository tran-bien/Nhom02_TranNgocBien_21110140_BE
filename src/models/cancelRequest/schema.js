const mongoose = require("mongoose");

const CancelRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminResponse: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// FIX: Thêm indexes cho các query thường dùng
CancelRequestSchema.index({ order: 1 }); // Tìm theo order
CancelRequestSchema.index({ user: 1, status: 1 }); // Tìm theo user và status
CancelRequestSchema.index({ status: 1, createdAt: -1 }); // Admin list pending requests

module.exports = CancelRequestSchema;
