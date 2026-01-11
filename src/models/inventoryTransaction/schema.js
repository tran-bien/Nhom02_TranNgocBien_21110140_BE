const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["IN", "OUT", "ADJUST"],
      required: true,
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    // Số lượng
    quantityBefore: {
      type: Number,
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    quantityAfter: {
      type: Number,
      required: true,
    },
    // Giá trị
    costPrice: {
      type: Number,
      required: true,
      min: 0,
      comment: "Giá vốn của lô hàng này",
    },
    // Tracking giá vốn trung bình (Weighted Average Cost)
    averageCostPriceBefore: {
      type: Number,
      default: 0,
      min: 0,
      comment: "Giá vốn trung bình TRƯỚC giao dịch",
    },
    averageCostPriceAfter: {
      type: Number,
      default: 0,
      min: 0,
      comment: "Giá vốn trung bình SAU giao dịch",
    },
    totalCost: {
      type: Number,
      required: true,
    },
    // Tính giá bán (chỉ cho IN transactions)
    targetProfitPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    percentDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    calculatedPrice: {
      type: Number,
      min: 0,
    },
    calculatedPriceFinal: {
      type: Number,
      min: 0,
    },
    profitPerItem: {
      type: Number,
    },
    margin: {
      type: Number,
    },
    markup: {
      type: Number,
    },
    // Tham chiếu
    reason: {
      type: String,
      enum: [
        "restock", // Nhập hàng thường
        "manual", // Xuất/Nhập thủ công
        "sale", // Bán hàng (qua order)
        "return", // Trả hàng (khách trả)
        "delivery_failed", // Giao thất bại, hàng trả về kho
        "cancelled", // Đơn hủy, hàng trả về kho
        "damage", // Hàng hư hỏng
        "lost", // Hàng mất
        "adjustment", // Điều chỉnh kiểm kê
        "other", // Khác
      ],
      default: "manual",
    },
    // FIX: Reference có thể là Order hoặc ReturnRequest
    // Sử dụng refPath để dynamic ref based on reason
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // Note: Có thể ref đến Order (reason: sale, return) hoặc ReturnRequest (reason: exchange)
      // Do không có refPath trong Mongoose cho single field, cần query manual
      // VD: const order = await Order.findById(transaction.reference)
    },
    // Người thực hiện - Optional cho system operations
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // FIX: Cho phép null cho system operations
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index
inventoryTransactionSchema.index({ inventoryItem: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ reference: 1 });
// FIXED Bug #25: Index cho performedBy - audit/tracking queries
inventoryTransactionSchema.index({ performedBy: 1, createdAt: -1 });
inventoryTransactionSchema.index({ reason: 1, type: 1 });

module.exports = inventoryTransactionSchema;
