const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["MATERIAL", "USECASE", "CUSTOM"],
      default: "CUSTOM",
      uppercase: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
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

// Index để tìm kiếm nhanh
TagSchema.index({ name: 1, type: 1 });
TagSchema.index({ type: 1, isActive: 1 });

module.exports = TagSchema;
