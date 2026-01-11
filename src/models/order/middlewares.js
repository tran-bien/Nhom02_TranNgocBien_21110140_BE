const mongoose = require("mongoose");
const inventoryService = require("@services/inventory.service");

/**
 * Cập nhật số lượng tồn kho từ đơn hàng (sử dụng InventoryItem)
 * @param {Object} orderItem Mặt hàng trong đơn hàng
 * @param {String} action 'decrement' hoặc 'increment'
 * @param {String} reason Lý do (return, cancelled, etc.)
 * @param {ObjectId} orderId ID đơn hàng
 * @param {ObjectId} performedBy Người thực hiện
 */
const updateInventory = async (orderItem, action, orderId, notes) => {
  const { variant, size, quantity } = orderItem;

  try {
    if (action === "restore") {
      // FIXED Bug #3: Extract product from variant
      const productId = variant?.product?._id || variant?.product;

      if (!productId) {
        throw new Error(
          `Cannot restore inventory: Missing product ID for variant ${
            variant?._id || "unknown"
          }`
        );
      }

      await inventoryService.stockIn(
        {
          product: productId,
          variant: variant._id || variant,
          size: size._id || size,
          quantity,
          costPrice: 0, // Will be handled by stockIn() with averageCostPrice
          reason: "return",
          reference: orderId, // ObjectId only
          notes: notes || "Hoàn trả tồn kho",
        },
        null
      );
    }
  } catch (error) {
    console.error("[updateInventory] Lỗi:", error.message);
    throw error;
  }
};

/**
 * Tạo mã đơn hàng không trùng (cải thiện để tránh race condition)
 * CRITICAL FIX Bug #12: Sử dụng atomic findOneAndUpdate thay vì findOne + create
 * @returns {String} Mã đơn hàng mới
 */
const generateOrderCode = async () => {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Tạo mã dựa trên timestamp để tránh trùng lặp
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // 2 số cuối của năm
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

      // Thêm random ngay từ đầu để tăng uniqueness
      const random = Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, "0");

      // Format: ORD + YY + MM + DD + HH + MM + SS + random (3 chữ số)
      const timeBasedCode = `ORD${year}${month}${day}${hours}${minutes}${seconds}${random}`;

      // ATOMIC CHECK: Sử dụng findOneAndUpdate với upsert để đảm bảo unique
      // Tạo một placeholder document tạm thời
      const OrderCounterModel =
        mongoose.models.OrderCounter ||
        mongoose.model(
          "OrderCounter",
          new mongoose.Schema({
            code: { type: String, unique: true, required: true },
            createdAt: { type: Date, default: Date.now },
          })
        );

      try {
        await OrderCounterModel.create({ code: timeBasedCode });
        // Nếu tạo thành công = code chưa tồn tại
        return timeBasedCode;
      } catch (err) {
        // Nếu duplicate key error = code đã tồn tại, thử lại
        if (err.code === 11000) {
          attempt++;
          // Chờ một chút trước khi thử lại
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 50)
          );
          continue;
        }
        throw err;
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      attempt++;

      if (attempt >= maxRetries) {
        // Phương án cuối cùng: sử dụng random bytes
        const crypto = require("crypto");
        const uuid = crypto.randomBytes(5).toString("hex"); // 10 hex chars
        return `ORD${Date.now().toString().slice(-6)}${uuid}`;
      }

      // Chờ trước khi thử lại
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 200));
    }
  }

  // Nếu tất cả attempts đều thất bại, tạo mã với random bytes
  const crypto = require("crypto");
  const uuid = crypto.randomBytes(4).toString("hex"); // 8 hex chars
  return `ORD${Date.now().toString().slice(-6)}${uuid}`;
};

/**
 * Kiểm tra xem đã có bản ghi tương tự trong lịch sử trạng thái gần đây chưa
 * @param {Array} statusHistory - Mảng lịch sử trạng thái
 * @param {String} status - Trạng thái cần kiểm tra
 * @param {Number} timeThresholdMs - Ngưỡng thời gian (mili giây)
 * @returns {Boolean} - true nếu đã có bản ghi tương tự gần đây
 */
const hasSimilarRecentEntry = (
  statusHistory,
  status,
  timeThresholdMs = 5000
) => {
  if (!statusHistory || !statusHistory.length) return false;

  const now = new Date();
  const recentEntries = statusHistory.filter((entry) => {
    if (entry.status !== status) return false;
    const entryTime = new Date(entry.updatedAt);
    const timeDiff = now - entryTime;
    return timeDiff < timeThresholdMs; // Trong khoảng 5 giây
  });

  return recentEntries.length > 0;
};

/**
 * Áp dụng middlewares cho Order schema
 * @param {Schema} schema - Mongoose Schema
 */
const applyMiddlewares = (schema) => {
  // FIX: Hook để capture original document trước khi save
  // Dùng init hook để lưu trạng thái gốc khi load từ DB
  schema.post("init", function () {
    this._original = this.toObject();
  });

  // Xử lý trước khi lưu Order
  schema.pre("save", async function (next) {
    try {
      // Tạo mã đơn hàng nếu là đơn hàng mới
      if (this.isNew && !this.code) {
        // Thử tạo mã đơn hàng với retry logic
        let codeGenerated = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!codeGenerated && retryCount < maxRetries) {
          try {
            this.code = await generateOrderCode();
            codeGenerated = true;
          } catch (error) {
            retryCount++;
            console.error(
              `Retry ${retryCount} for generating order code:`,
              error
            );

            if (retryCount >= maxRetries) {
              // Tạo mã dự phòng đơn giản
              const timestamp = Date.now();
              const random = Math.floor(Math.random() * 10000);
              this.code = `ORD${timestamp}${random}`;
              console.warn(`Used emergency code: ${this.code}`);
            } else {
              // Chờ một chút trước khi thử lại
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * retryCount)
              );
            }
          }
        }
      }

      // FIX: Lưu trạng thái cũ vào $locals thay vì dùng getOldValue (không tồn tại)
      if (this.isModified("status") && !this.isNew) {
        // $locals là cách đúng để truyền data giữa pre và post hooks
        this.$locals = this.$locals || {};
        this.$locals.previousStatus = this._original?.status || null;
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Xử lý sau khi lưu Order
  schema.post("save", async function (doc) {
    try {
      // FIX: Lấy previousStatus từ $locals thay vì _previousStatus
      const previousStatus = this.$locals?.previousStatus || null;
      const currentStatus = this.status;

      // ============================================================
      // EMAIL NOTIFICATIONS - Gửi email khi status thay đổi
      // ============================================================
      if (previousStatus && previousStatus !== currentStatus) {
        try {
          const emailService = require("@services/email.service");
          const notificationService = require("@services/notification.service");

          // Populate order để có đầy đủ thông tin cho email
          const Order = mongoose.model("Order");
          const populatedOrder = await Order.findById(this._id).populate([
            { path: "user", select: "name email preferences" },
            {
              path: "orderItems.variant",
              select: "product color images",
              populate: { path: "product", select: "name" },
            },
            { path: "orderItems.size", select: "value" },
          ]);

          // Check user preferences - có muốn nhận email không
          const userPreferences = populatedOrder.user.preferences || {};
          const emailEnabled =
            userPreferences.emailNotifications?.orderUpdates !== false;

          // Gửi email dựa trên status mới
          switch (currentStatus) {
            case "confirmed":
              // Đơn hàng được xác nhận
              if (emailEnabled) {
                await emailService.sendOrderConfirmationEmail(
                  populatedOrder.user._id,
                  populatedOrder
                );
                console.log(
                  `[EMAIL] Đã gửi email xác nhận đơn hàng ${this.code}`
                );
              } else {
                console.log(
                  `[EMAIL] User tắt email notification, skip email cho đơn ${this.code}`
                );
              }

              await notificationService.send(
                populatedOrder.user._id,
                "ORDER_CONFIRMED",
                {
                  orderCode: populatedOrder.code,
                  orderId: populatedOrder._id.toString(),
                },
                { channels: { inApp: true, email: false } } // Email đã gửi riêng
              );
              break;

            case "shipping":
            case "out_for_delivery":
              // Đơn hàng đang giao
              await notificationService.send(
                populatedOrder.user._id,
                "ORDER_SHIPPING",
                {
                  orderCode: populatedOrder.code,
                  orderId: populatedOrder._id.toString(),
                  shippingAddress: populatedOrder.shippingAddress,
                },
                { channels: { inApp: true, email: emailEnabled } }
              );
              console.log(
                `[EMAIL] ${
                  emailEnabled ? "Đã gửi" : "Skip"
                } thông báo đơn hàng đang giao ${this.code}`
              );
              break;

            case "delivered":
              // Đơn hàng đã giao thành công
              await notificationService.send(
                populatedOrder.user._id,
                "ORDER_DELIVERED",
                {
                  orderCode: populatedOrder.code,
                  orderId: populatedOrder._id.toString(),
                },
                { channels: { inApp: true, email: emailEnabled } }
              );
              console.log(
                `[EMAIL] ${
                  emailEnabled ? "Đã gửi" : "Skip"
                } thông báo giao hàng thành công ${this.code}`
              );
              break;

            case "cancelled":
              // Đơn hàng bị hủy
              await notificationService.send(
                populatedOrder.user._id,
                "ORDER_CANCELLED",
                {
                  orderCode: populatedOrder.code,
                  orderId: populatedOrder._id.toString(),
                  reason: this.cancelReason || "Không rõ lý do",
                },
                { channels: { inApp: true, email: emailEnabled } }
              );
              console.log(
                `[EMAIL] ${
                  emailEnabled ? "Đã gửi" : "Skip"
                } thông báo hủy đơn ${this.code}`
              );
              break;
          }
        } catch (emailError) {
          // Không throw error để không ảnh hưởng đến flow chính
          console.error(
            `[EMAIL] Lỗi gửi email cho đơn ${this.code}:`,
            emailError.message
          );
        }
      }

      // LOYALTY: Tự động cộng điểm khi đơn hàng delivered
      // Điểm được cộng NGAY sau khi delivered (đơn giản hóa logic)
      if (
        currentStatus === "delivered" &&
        previousStatus !== "delivered" &&
        this.payment.paymentStatus === "paid" &&
        !this.loyaltyPointsAwarded
      ) {
        try {
          const loyaltyService = require("@services/loyalty.service");
          const pointsToEarn = loyaltyService.calculatePointsFromOrder(
            this.totalAfterDiscountAndShipping
          );

          if (pointsToEarn > 0) {
            // Cộng điểm ngay lập tức
            await loyaltyService.addPoints(this.user, pointsToEarn, {
              source: "ORDER",
              order: this._id,
              description: `Tích điểm từ đơn hàng ${this.code}`,
            });

            // Đánh dấu đã cộng điểm
            await mongoose.model("Order").updateOne(
              { _id: this._id },
              {
                loyaltyPointsEarned: pointsToEarn,
                loyaltyPointsAwarded: true,
              }
            );

            console.log(
              `[LOYALTY] Đã cộng ${pointsToEarn} điểm cho đơn ${this.code}`
            );
          }
        } catch (error) {
          console.error("[LOYALTY] Lỗi khi tích điểm:", error);
        }
      }

      // Chỉ xử lý khi có sự thay đổi trạng thái thực sự
      if (previousStatus && previousStatus !== currentStatus) {
        // ============================================================
        // XỬ LÝ TỒN KHO KHI ĐƠN HÀNG THAY ĐỔI TRẠNG THÁI
        // ============================================================

        // CASE 1: ĐƠN HÀNG BỊ HỦY (cancelled)
        // → NHẬP KHO NGAY, không cần returnConfirmed
        // FIXED Bug #1-2-3-5: Correct params, populate product, add rollback
        // NOTE: 'refunded' không còn trong status enum, chỉ ở payment.paymentStatus
        if (
          currentStatus === "cancelled" &&
          this.inventoryDeducted &&
          !this.inventoryRestored
        ) {
          console.log(
            `[Order ${this.code}] Đơn hàng bị ${currentStatus}, hoàn trả tồn kho NGAY`
          );

          const restoredItems = [];

          try {
            // FIXED Bug #3: Populate variant.product before restore
            if (!this.populated("orderItems.variant")) {
              await this.populate({
                path: "orderItems.variant",
                select: "product",
                populate: { path: "product", select: "_id" },
              });
            }

            // Restore từng item với rollback tracking
            for (const item of this.orderItems) {
              // FIXED Bug #1-2: Correct parameters - action='restore', orderId, notes
              await updateInventory(
                item,
                "restore",
                this._id,
                `Hoàn kho do ${
                  currentStatus === "cancelled" ? "hủy đơn" : "hoàn tiền"
                }`
              );
              restoredItems.push(item);
            }

            // Đánh dấu đã hoàn kho
            await mongoose.model("Order").updateOne(
              { _id: this._id },
              {
                inventoryRestored: true,
                inventoryDeducted: false,
              }
            );

            console.log(`[Order ${this.code}] Đã hoàn trả tồn kho thành công`);
          } catch (inventoryError) {
            console.error(
              `[Order ${this.code}] LỖI khi restore inventory:`,
              inventoryError.message
            );

            // FIXED Bug #5: Rollback các items đã restore
            for (const item of restoredItems) {
              try {
                const productId =
                  item.variant?.product?._id || item.variant?.product;
                if (!productId) continue;

                await inventoryService.stockOut(
                  {
                    product: productId,
                    variant: item.variant._id || item.variant,
                    size: item.size._id || item.size,
                    quantity: item.quantity,
                    reason: "rollback",
                    reference: this._id,
                    notes: `[ROLLBACK] Trừ lại do lỗi restore: ${inventoryError.message}`,
                  },
                  null
                );

                console.log(`[Order ${this.code}] Rollback item thành công`);
              } catch (rollbackError) {
                console.error(
                  `[CRITICAL] [Order ${this.code}] Rollback FAILED:`,
                  rollbackError
                );
              }
            }

            throw inventoryError;
          }
        }

        // CASE 2: ĐƠN HÀNG TRẢ HÀNG (returned)
        // → CHỈ nhập kho KHI returnConfirmed = true (Staff đã xác nhận nhận hàng)
        // FIXED Bug #1-2-3-5: Correct params, populate product, add rollback
        else if (
          currentStatus === "returned" &&
          this.inventoryDeducted &&
          !this.inventoryRestored
        ) {
          if (!this.returnConfirmed) {
            console.log(
              `[Order ${this.code}] Trả hàng nhưng CHƯA xác nhận nhận hàng. Chờ staff xác nhận.`
            );
          } else {
            console.log(
              `[Order ${this.code}] Trả hàng và ĐÃ xác nhận nhận hàng. Hoàn trả tồn kho.`
            );

            const restoredItems = [];

            try {
              // FIXED Bug #3: Populate variant.product before restore
              if (!this.populated("orderItems.variant")) {
                await this.populate({
                  path: "orderItems.variant",
                  select: "product",
                  populate: { path: "product", select: "_id" },
                });
              }

              for (const item of this.orderItems) {
                // FIXED Bug #1-2: Correct parameters
                await updateInventory(
                  item,
                  "restore",
                  this._id,
                  "Hoàn kho do trả hàng"
                );
                restoredItems.push(item);
              }

              // Đánh dấu đã hoàn kho
              await mongoose.model("Order").updateOne(
                { _id: this._id },
                {
                  inventoryRestored: true,
                  inventoryDeducted: false,
                }
              );

              console.log(
                `[Order ${this.code}] Đã hoàn trả tồn kho thành công`
              );
            } catch (inventoryError) {
              console.error(
                `[Order ${this.code}] LỖI khi restore inventory:`,
                inventoryError.message
              );

              // FIXED Bug #5: Rollback
              for (const item of restoredItems) {
                try {
                  const productId =
                    item.variant?.product?._id || item.variant?.product;
                  if (!productId) continue;

                  await inventoryService.stockOut(
                    {
                      product: productId,
                      variant: item.variant._id || item.variant,
                      size: item.size._id || item.size,
                      quantity: item.quantity,
                      reason: "rollback",
                      reference: this._id,
                      notes: `[ROLLBACK] Trừ lại do lỗi restore: ${inventoryError.message}`,
                    },
                    null
                  );
                } catch (rollbackError) {
                  console.error(
                    `[CRITICAL] [Order ${this.code}] Rollback FAILED:`,
                    rollbackError
                  );
                }
              }

              throw inventoryError;
            }
          }
        }

        // CASE 3: HÀNG ĐANG TRẢ VỀ KHO (returning_to_warehouse)
        // → Không làm gì, chờ Staff xác nhận
        else if (currentStatus === "returning_to_warehouse") {
          console.log(
            `[Order ${this.code}] Hàng đang trả về kho, chờ Staff xác nhận nhận hàng`
          );
        }

        // Thêm statusHistory - giữ nguyên logic này
        if (
          !this._statusHistoryAdded &&
          !hasSimilarRecentEntry(this.statusHistory, currentStatus)
        ) {
          const statusEntry = {
            status: currentStatus,
            updatedAt: new Date(),
            note: `Trạng thái đơn hàng thay đổi từ ${previousStatus} sang ${currentStatus}`,
          };

          await mongoose
            .model("Order")
            .updateOne(
              { _id: this._id },
              { $push: { statusHistory: statusEntry } }
            );
        }
      }

      // Xóa marker nếu có
      if (this._statusHistoryAdded) {
        await mongoose
          .model("Order")
          .updateOne(
            { _id: this._id },
            { $unset: { _statusHistoryAdded: "" } }
          );
      }
    } catch (error) {
      console.error("[Order]: Lỗi trong middleware post-save:", error);
    }
  });

  // REMOVED: post('findOneAndUpdate') middleware to prevent duplicate restoration (Bug #4)
  // All inventory restoration is now handled by post('save') middleware only

  // Thiết lập virtual cho email người dùng
  schema.virtual("userEmail").get(function () {
    return this.user?.email || "Không có email";
  });
};

module.exports = { applyMiddlewares };
