const mongoose = require("mongoose");

const SizeGuideSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true, // Mỗi sản phẩm chỉ có 1 size guide
    },

    // Bảng size (1 ảnh + mô tả)
    sizeChart: {
      image: {
        url: {
          type: String,
          required: false, // Upload sau khi tạo
        },
        public_id: {
          type: String,
          required: false, // Upload sau khi tạo
        },
      },
      description: {
        type: String,
        maxlength: 5000,
        trim: true,
      },
    },

    // Hướng dẫn đo chân (1 ảnh + mô tả)
    measurementGuide: {
      image: {
        url: {
          type: String,
          required: false, // Upload sau khi tạo
        },
        public_id: {
          type: String,
          required: false, // Upload sau khi tạo
        },
      },
      description: {
        type: String,
        maxlength: 5000,
        trim: true,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index
SizeGuideSchema.index({ isActive: 1 });

module.exports = SizeGuideSchema;

