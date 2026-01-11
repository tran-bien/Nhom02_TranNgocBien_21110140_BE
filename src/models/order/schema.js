const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Mã đơn hàng tự động sinh
    code: {
      type: String,
      unique: true,
    },

    // Thông tin người dùng
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Chi tiết các sản phẩm trong đơn hàng
    orderItems: [
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
        // Lưu tên sản phẩm để tránh reference khi sản phẩm thay đổi
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        // FIX Bug #57: Lưu giá vốn tại thời điểm đặt hàng để tính profit chính xác
        costPrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        // Lưu ảnh sản phẩm
        image: {
          type: String,
          default: "",
        },
      },
    ],

    // Thông tin địa chỉ giao hàng
    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
        // FIX: Regex số điện thoại VN đúng format
        // Chấp nhận: 0xxx (10 số) hoặc 84xxx (11 số) hoặc +84xxx (12 ký tự)
        match: /^(0[35789][0-9]{8}|84[35789][0-9]{8}|\+84[35789][0-9]{8})$/,
      },
      province: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      ward: {
        type: String,
        required: true,
      },
      detail: {
        type: String,
        required: true,
      },
    },

    // Ghi chú đơn hàng
    note: {
      type: String,
      default: "",
    },

    // Tổng tiền hàng (chưa tính giảm giá và phí ship)
    subTotal: {
      type: Number,
      required: true,
    },

    // Trạng thái đơn hàng
    status: {
      type: String,
      default: "pending",
      enum: {
        values: [
          "pending",
          "confirmed",
          "assigned_to_shipper",
          "out_for_delivery",
          "delivered",
          "delivery_failed",
          "returning_to_warehouse", // Đang trả về kho - trả khi shipper giao thất bại và trả hàng
          "cancelled", // Đã hủy - Huy hàng không cần trả về kho
          "returned", // Đã trả hàng
        ],
        message: "Trạng thái đơn hàng không hợp lệ",
      },
    },

    // Đánh dấu nếu là COD thì trừ hàng, VNPAY thì không trừ đợi thanh toán
    inventoryDeducted: {
      type: Boolean,
      default: false,
    },

    // Đánh dấu đã hoàn trả inventory khi cancelled/returned
    inventoryRestored: {
      type: Boolean,
      default: false,
    },

    // Đánh dấu đã hủy yêu cầu trả hàng - không cho trả lại nữa
    returnCanceled: {
      type: Boolean,
      default: false,
      comment: "Khách đã hủy yêu cầu trả hàng, không cho trả lại",
    },

    // Tracking loyalty points
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
      comment: "Số điểm đã tích cho đơn hàng này",
    },
    loyaltyPointsAwarded: {
      type: Boolean,
      default: false,
      comment: "Đã tích điểm chưa (tránh tích 2 lần)",
    },

    // Lịch sử trạng thái
    // FIX Issue #9: Giới hạn số lượng statusHistory entries để tránh unbounded growth
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: [
              "pending", //đang chờ xử lý
              "confirmed", // đã xác nhận
              "assigned_to_shipper", // đã gán shipper
              "out_for_delivery", // đang giao hàng
              "delivered", // đã giao hàng
              "delivery_failed", // giao hàng thất bại
              "returning_to_warehouse", // đang trả về kho
              "cancelled", // đã hủy
              "returned", // đã trả hàng
            ],
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
          updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          note: String,
        },
      ],
      validate: [
        {
          validator: function (v) {
            return v.length <= 100; // Max 100 status history entries
          },
          message:
            "Lịch sử trạng thái đơn hàng đã đạt giới hạn tối đa (100 entries)",
        },
      ],
    },

    // Thông tin thanh toán
    payment: {
      method: {
        type: String,
        required: true,
        enum: ["COD", "VNPAY"],
        uppercase: true,
      },
      paymentStatus: {
        type: String,
        enum: {
          values: ["pending", "paid", "failed", "refunded"],
          message: "Trạng thái thanh toán không hợp lệ",
        },
        default: "pending",
      },
      transactionId: {
        type: String,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      // VNPAY IDEMPOTENCY - Tránh xử lý callback/IPN nhiều lần
      vnpayTransactionNo: {
        type: String,
        sparse: true,
        index: true,
        comment: "Mã giao dịch từ VNPAY để đảm bảo idempotency",
      },
      vnpayCallbackProcessed: {
        type: Boolean,
        default: false,
        comment: "Đã xử lý callback từ VNPAY chưa",
      },
      vnpayCallbackProcessedAt: {
        type: Date,
        comment: "Thời điểm xử lý callback",
      },
      vnpayIpnProcessed: {
        type: Boolean,
        default: false,
        comment: "Đã xử lý IPN từ VNPAY chưa",
      },
      vnpayIpnProcessedAt: {
        type: Date,
        comment: "Thời điểm xử lý IPN",
      },
    },

    // Lịch sử thanh toán
    paymentHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "paid", "failed"],
        },
        transactionId: String,
        amount: Number,
        method: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        responseData: Object, // Dữ liệu phản hồi từ VNPAY
      },
    ],

    // Thông tin mã giảm giá
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },

    // Chi tiết mã giảm giá
    couponDetail: {
      code: String,
      type: {
        type: String,
        enum: ["percent", "fixed"],
      },
      value: Number,
      maxDiscount: Number,
    },

    // Phí ship
    shippingFee: {
      type: Number,
      default: 0,
    },

    // Giảm giá
    discount: {
      type: Number,
      default: 0,
    },

    // Tổng tiền sau khi tính giảm giá và phí ship
    totalAfterDiscountAndShipping: {
      type: Number,
      required: true,
    },

    // Tham chiếu đến yêu cầu hủy đơn
    cancelRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CancelRequest",
      default: null,
    },

    // Đánh dấu đơn hàng có yêu cầu hủy đang chờ xử lý
    hasCancelRequest: {
      type: Boolean,
      default: false,
    },

    // Lý do hủy đơn (từ yêu cầu hủy được duyệt)
    cancelReason: {
      type: String,
      default: "",
    },

    // Thời điểm đơn hàng bị hủy
    cancelledAt: {
      type: Date,
      default: null,
    },

    // Xác nhận hàng trả về (Manual confirmation for return/cancel)
    returnConfirmed: {
      type: Boolean,
      default: false,
    },
    returnConfirmedAt: {
      type: Date,
      default: null,
    },
    returnConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Thông tin hoàn tiền (Manual refund ONLY - Admin xác nhận thủ công)
    // Không hỗ trợ hoàn tiền tự động từ VNPAY
    refund: {
      // Số tiền hoàn lại
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Phương thức hoàn tiền - CHỈ 2 PHƯƠNG THỨC THỦ CÔNG
      // cash: Tiền mặt tại cửa hàng
      // bank_transfer: Chuyển khoản (yêu cầu nhập bankInfo)
      method: {
        type: String,
        enum: ["cash", "bank_transfer"],
        default: null,
      },
      // Trạng thái hoàn tiền
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: null,
      },
      // Thông tin ngân hàng (nếu refund qua bank_transfer)
      bankInfo: {
        bankName: String,
        accountNumber: String,
        accountName: String,
      },
      // Mã giao dịch hoàn tiền (nếu có)
      transactionId: {
        type: String,
        default: null,
      },
      // Ghi chú hoàn tiền
      notes: {
        type: String,
        default: "",
      },
      // Người thực hiện hoàn tiền
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      // Thời gian yêu cầu hoàn tiền
      requestedAt: {
        type: Date,
        default: null,
      },
      // Thời gian hoàn tiền thành công
      completedAt: {
        type: Date,
        default: null,
      },
    },

    // Thời gian giao hàng
    deliveredAt: {
      type: Date,
      default: null,
    },

    // Các mốc thời gian sự kiện
    confirmedAt: {
      type: Date,
      default: null,
    },
    shippingAt: {
      type: Date,
      default: null,
    },

    // Thông tin shipper
    assignedShipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignmentTime: {
      type: Date,
    },

    // Lịch sử giao hàng
    deliveryAttempts: [
      {
        time: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["success", "failed", "out_for_delivery"],
        },
        note: String,
        shipper: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        images: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// INDEXES - Tối ưu hiệu suất truy vấn

// Index cho user - query orders by user
OrderSchema.index({ user: 1, createdAt: -1 });

// Index cho status - filter by status
OrderSchema.index({ status: 1, createdAt: -1 });

// Index cho assignedShipper - query orders by shipper
OrderSchema.index({ assignedShipper: 1, status: 1 });

// Index cho payment status - query unpaid orders
OrderSchema.index({ "payment.paymentStatus": 1, createdAt: -1 });

// Index cho deletedAt - soft delete queries
OrderSchema.index({ deletedAt: 1 });

// Compound index cho user + status + deletedAt
OrderSchema.index({ user: 1, status: 1, deletedAt: 1 });

// Index cho hasCancelRequest - query orders with cancel requests
OrderSchema.index({ hasCancelRequest: 1, status: 1 });

// FIXED Bug #24: Index cho inventory flags - tối ưu query khi xử lý inventory restoration
OrderSchema.index({ inventoryDeducted: 1, status: 1 });
OrderSchema.index({ inventoryRestored: 1, status: 1 });

module.exports = OrderSchema;
