const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema(
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
      maxlength: 1000,
    },
    logo: {
      url: String,
      public_id: String,
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
BrandSchema.index({ isActive: 1, deletedAt: 1 });

// Index cho sort by createdAt
BrandSchema.index({ createdAt: -1 });

module.exports = BrandSchema;
