const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cartItems: [
      {
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
          required: true,
        },
        size: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Size",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        // Thông tin bổ sung để hiển thị - chỉ cache name và image
        productName: {
          type: String,
          required: true,
        },
        image: {
          type: String,
          default: "",
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
        // Thêm trường đánh dấu item được chọn
        isSelected: {
          type: Boolean,
          default: false,
        },
        // Lý do nếu sản phẩm không khả dụng
        unavailableReason: {
          type: String,
          default: "",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Tổng số sản phẩm trong giỏ hàng
    totalItems: {
      type: Number,
      default: 0,
    },
    // Tổng giá trị sản phẩm
    subTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// FIXED Bug #19: Unique index on user field to prevent duplicate carts per user
CartSchema.index({ user: 1 }, { unique: true });

module.exports = CartSchema;
