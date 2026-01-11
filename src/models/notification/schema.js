const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "ORDER_CONFIRMED",
        "ORDER_SHIPPING",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
        "RETURN_APPROVED",
        "RETURN_REJECTED",
        "RETURN_COMPLETED",
        "LOYALTY_TIER_UP",
        "REVIEW_REPLY",
        // FIX: Thêm các notification types còn thiếu
        "COUPON_EXPIRING", // Coupon sắp hết hạn
        "ORDER_PENDING", // Đơn hàng mới chờ xác nhận
        "RETURN_REQUESTED", // Yêu cầu trả hàng mới
        "CANCEL_REQUESTED", // Yêu cầu hủy đơn
        "CANCEL_APPROVED", // Đã hủy đơn hàng
        "PROMOTION", // Khuyến mãi
        "SYSTEM", // Thông báo hệ thống
        "REFUND_REQUEST", // Yêu cầu hoàn tiền
        "REFUND_COMPLETED", // Hoàn tiền thành công
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Data động cho template
    data: mongoose.Schema.Types.Mixed,

    // Link hành động
    actionUrl: {
      type: String,
      maxlength: 500,
    },

    actionText: {
      type: String,
      maxlength: 100,
    },

    // Trạng thái
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    // Channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },

    // Email tracking
    emailSent: {
      type: Boolean,
      default: false,
    },

    emailSentAt: {
      type: Date,
    },

    emailError: {
      type: String,
    },

    // Idempotency key để tránh tạo trùng
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    // References
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    returnRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
    },
  },
  {
    timestamps: true,
  }
);

// Index
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// FIX BUG #12: Proper TTL index - auto delete after 90 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = NotificationSchema;
