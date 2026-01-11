const mongoose = require("mongoose");

const ColorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    code: {
      type: String, // mã màu hex
      default: null,
    },
    colors: { type: [String], default: [] }, // Mảng chứa 2 màu nếu là half
    type: { type: String, enum: ["solid", "half"], required: true }, // solid hoặc half
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

// FIX: Thêm indexes cho các query thường dùng
ColorSchema.index({ type: 1, deletedAt: 1 });
ColorSchema.index({ createdAt: -1 });

module.exports = ColorSchema;
