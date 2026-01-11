const mongoose = require("mongoose");
const { Schema } = mongoose;

// Định nghĩa schema cho đánh giá (review)
const ReviewSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // FIX: Thêm comment giải thích - orderItem là subdocument ID trong Order.orderItems
    // Không thể ref vì nó là subdocument, không phải standalone document
    orderItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Note: Đây là _id của subdocument trong Order.orderItems[], không phải standalone collection
      // Để query, cần dùng Order.aggregate() hoặc Order.findOne({'orderItems._id': orderItem})
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    numberOfLikes: {
      type: Number,
      default: 0,
    },
    // FIXED Bug #37: Track users đã like để ngăn spam like
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Trả lời từ admin/staff (1-1 relationship)
    reply: {
      content: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      repliedAt: {
        type: Date,
      },
      updatedAt: {
        type: Date,
      },
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

// Tạo chỉ mục mới trên cặp khóa user và orderItem
ReviewSchema.index({ user: 1, orderItem: 1 }, { unique: true });

// FIX: Thêm indexes cho các query thường dùng
ReviewSchema.index({ product: 1, isActive: 1, deletedAt: 1 }); // Lấy reviews theo product
ReviewSchema.index({ user: 1, deletedAt: 1 }); // Lấy reviews của user
ReviewSchema.index({ createdAt: -1 }); // Sort by newest
ReviewSchema.index({ rating: 1, product: 1 }); // Filter theo rating

module.exports = ReviewSchema;
