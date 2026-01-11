const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// ============================================================
// INDEXES - Tối ưu hiệu suất truy vấn
// ============================================================

// Compound index cho filter isActive + deletedAt (thường xuyên query)
CategorySchema.index({ isActive: 1, deletedAt: 1 });

// Index cho sort by createdAt
CategorySchema.index({ createdAt: -1 });

module.exports = CategorySchema;
