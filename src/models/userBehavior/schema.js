const mongoose = require("mongoose");

const UserBehaviorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Sở thích theo category
    favoriteCategories: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Sở thích theo brand
    favoriteBrands: [
      {
        brand: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Brand",
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Price range preference
    avgPriceRange: {
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 1000000,
      },
    },

    // Sản phẩm đã xem (top N gần nhất)
    viewedProducts: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        viewCount: {
          type: Number,
          default: 0,
        },
        lastViewed: Date,
      },
    ],

    // Từ khóa tìm kiếm
    searchKeywords: [
      {
        keyword: String,
        count: Number,
        lastSearched: Date,
      },
    ],

    // Purchase patterns
    purchaseFrequency: {
      type: Number,
      default: 0,
      comment: "Số đơn hàng đã mua",
    },

    avgOrderValue: {
      type: Number,
      default: 0,
    },

    preferredGender: {
      type: String,
      enum: ["male", "female", "unisex"],
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index
UserBehaviorSchema.index({ lastUpdated: 1 });

module.exports = UserBehaviorSchema;

