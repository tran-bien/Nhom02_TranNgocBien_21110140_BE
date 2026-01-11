const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    images: [
      {
        url: {
          type: String,
        },
        public_id: {
          type: String,
        },
        isMain: {
          type: Boolean,
          default: false,
        },
        displayOrder: {
          type: Number,
          default: 0,
        },
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    variants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
      },
    ],
    // Cached values từ InventoryItem - Tự động cập nhật khi stock in/out
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "out_of_stock",
    },
    // XÓA rating và numReviews - sẽ tính toán động từ Review
    // rating và numReviews được tính on-demand từ Review model
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

// Text index cho full-text search trên name và description
ProductSchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    weights: {
      name: 10, // Name có trọng số cao hơn
      description: 5, // Description có trọng số thấp hơn
    },
    name: "product_text_search",
  }
);

// Compound index cho filter thường dùng: category + isActive + deletedAt
ProductSchema.index(
  {
    category: 1,
    isActive: 1,
    deletedAt: 1,
  },
  { name: "category_active_deleted" }
);

// Compound index cho filter thường dùng: brand + isActive + deletedAt
ProductSchema.index(
  {
    brand: 1,
    isActive: 1,
    deletedAt: 1,
  },
  { name: "brand_active_deleted" }
);

// Index cho soft delete - REMOVED: deletedAt already in compound indexes above
// ProductSchema.index({ deletedAt: 1 });

// Index cho tags filter (many-to-many relationship)
ProductSchema.index({ tags: 1 });

// Compound index cho sort by createdAt + filter isActive
ProductSchema.index(
  {
    isActive: 1,
    createdAt: -1,
  },
  { name: "active_newest" }
);

module.exports = ProductSchema;
