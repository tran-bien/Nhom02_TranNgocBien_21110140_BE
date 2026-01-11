const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Sản phẩm là bắt buộc"],
    },
    imagesvariant: [
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
    // XÓA: price, costPrice, percentDiscount, priceFinal, profit, profitPercentage
    // Các thông tin giá và lợi nhuận giờ được quản lý qua InventoryItem và InventoryTransaction
    gender: {
      type: String,
      enum: ["male", "female", "unisex"],
      default: "unisex",
    },
    color: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      required: [true, "Màu sắc là bắt buộc"],
    },
    sizes: [
      {
        size: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Size",
          required: true,
        },
        sku: {
          type: String,
          // KHÔNG required ở schema - sẽ được tạo TỰ ĐỘNG bởi variant/middlewares.js (pre-save hook)
          // Format: XXX-XXX-X-XXX-XXXX (e.g., NIK-BLA-M-40-A1B2)
          // Note: sparse & unique được định nghĩa ở index bên dưới, không khai báo ở đây để tránh duplicate warning
        },
        // sku để tracking và quản lý kho
        // ĐÃ XÓA: quantity, isSizeAvailable
        // Số lượng giờ được quản lý qua InventoryItem
      },
    ],
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

// FIX: Index cho query variants theo product - rất phổ biến
VariantSchema.index({ product: 1 });

// Index cho filter active variants
VariantSchema.index({ product: 1, isActive: 1, deletedAt: 1 });

// Index cho color lookup
VariantSchema.index({ color: 1 });

// Unique index cho SKU - sparse để cho phép null/undefined
VariantSchema.index({ "sizes.sku": 1 }, { unique: true, sparse: true });

module.exports = VariantSchema;
