const mongoose = require("mongoose");

const SizeSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["EU", "US", "UK", "VN"],
      default: "EU",
      uppercase: true, // Tự động chuyển thành chữ hoa
    },
    description: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tối ưu query
SizeSchema.index({ type: 1, value: 1 });
SizeSchema.index({ type: 1, deletedAt: 1 });

module.exports = SizeSchema;
