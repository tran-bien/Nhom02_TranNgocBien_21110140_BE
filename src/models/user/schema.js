const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["user", "staff", "admin", "shipper"],
      default: "user",
    },
    avatar: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },
    wishlist: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    coupons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
    ],
    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        ward: { type: String, required: true },
        detail: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
    },
    blockedAt: {
      type: Date,
    },
    otp: {
      code: { type: String },
      expiredAt: { type: Date },
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Thông tin shipper
    shipper: {
      isAvailable: {
        type: Boolean,
        default: false,
      },
      activeOrders: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxOrders: {
        type: Number,
        default: 50,
        min: 1,
      },
      deliveryStats: {
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
        successful: {
          type: Number,
          default: 0,
          min: 0,
        },
        failed: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Hệ thống tích điểm & phân hạng
    loyalty: {
      points: {
        type: Number,
        default: 0,
        min: 0,
        // FIX: Thêm validation để đảm bảo points không âm khi decrement
        validate: {
          validator: function (v) {
            return v >= 0;
          },
          message: "Điểm loyalty không thể âm",
        },
      },
      tier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoyaltyTier",
      },
      tierName: {
        type: String,
        default: "Đồng",
      },
      totalEarned: {
        type: Number,
        default: 0,
        comment: "Tổng điểm đã tích lũy từ trước đến nay",
      },
      totalRedeemed: {
        type: Number,
        default: 0,
        comment: "Tổng điểm đã sử dụng",
      },
      lastTierUpdate: {
        type: Date,
      },
    },

    // Tùy chọn thông báo
    preferences: {
      emailNotifications: {
        orderUpdates: {
          type: Boolean,
          default: true,
          comment:
            "Nhận email khi đơn hàng có thay đổi (xác nhận, đang giao, đã giao, hủy, trả hàng)",
        },
      },
      inAppNotifications: {
        type: Boolean,
        default: true,
        comment: "Nhận thông báo trong app",
      },
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES - Tối ưu hiệu suất truy vấn cho Shipper
// ============================================================

// Index cho query shipper khả dụng (Admin assign order)
UserSchema.index({ role: 1, "shipper.isAvailable": 1 });

// Index cho sort theo số đơn đang giao
UserSchema.index({ role: 1, "shipper.activeOrders": 1 });

// Index cho stats queries (Admin dashboard)
UserSchema.index({ role: 1, "shipper.deliveryStats.successful": -1 });

// Index cho email lookup (login) - UNIQUE
// FIXED Bug #21: Case-insensitive email index to prevent duplicate accounts
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }, // Case-insensitive
  }
);

module.exports = UserSchema;
