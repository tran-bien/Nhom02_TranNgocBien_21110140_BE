const mongoose = require("mongoose");

// FIX Issue #10: Pre-define compound indexes for better query performance
const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    maxUses: {
      type: Number,
      min: 0,
    },
    currentUses: {
      type: Number,
      default: 0,
    },
    // Thay isActive bằng status chi tiết hơn
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "archived"],
      default: "active",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // REDEEM với điểm tích lũy
    isRedeemable: {
      type: Boolean,
      default: false,
      comment: "Có thể đổi bằng điểm tích lũy không",
    },

    pointCost: {
      type: Number,
      min: 0,
      default: 0,
      comment: "Chi phí điểm để đổi coupon (nếu isRedeemable = true)",
    },

    maxRedeemPerUser: {
      type: Number,
      min: 0,
      comment: "Giới hạn số lần đổi/user (optional)",
    },

    // COUPON NÂNG CAO - Áp dụng cho sản phẩm/danh mục cụ thể
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // Scope của coupon
    scope: {
      type: String,
      enum: ["ALL", "PRODUCTS", "CATEGORIES"],
      default: "ALL",
    },

    // Điều kiện nâng cao
    conditions: {
      minQuantity: {
        type: Number,
        min: 0,
        comment: "Số lượng sản phẩm tối thiểu",
      },

      maxUsagePerUser: {
        type: Number,
        min: 0,
        comment: "Giới hạn số lần dùng/user",
      },

      requiredTiers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LoyaltyTier",
        },
      ],

      firstOrderOnly: {
        type: Boolean,
        default: false,
        comment: "Chỉ cho đơn hàng đầu tiên",
      },
    },

    // Usage tracking per user
    userUsage: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usageCount: {
          type: Number,
          default: 0,
        },
        lastUsedAt: Date,
      },
    ],

    // FIXED: Thêm priority để sắp xếp coupon
    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
      comment: "Độ ưu tiên hiển thị (HIGH > MEDIUM > LOW)",
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

// FIXED Bug #33: Index cho priority sort performance
CouponSchema.index({ priority: 1, createdAt: -1 });
CouponSchema.index({ status: 1, isPublic: 1, startDate: 1, endDate: 1 });

module.exports = CouponSchema;
