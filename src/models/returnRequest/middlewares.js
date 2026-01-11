const mongoose = require("mongoose");

/**
 * Middleware cho ReturnRequest model
 * Xử lý auto-generate code, expiresAt và email notifications
 */
module.exports = (schema) => {
  // ============================================================
  // PRE-SAVE: Auto set expiresAt và code khi tạo request
  // AUTO-REJECT nếu quá hạn
  // ============================================================
  schema.pre("save", async function (next) {
    try {
      // Nếu là document mới
      if (this.isNew) {
        // Auto set expiresAt = 7 ngày từ bây giờ
        if (!this.expiresAt) {
          this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }

        // Auto generate code
        if (!this.code) {
          const prefix = this.type === "RETURN" ? "RET" : "EXC";
          const count = await mongoose.model("ReturnRequest").countDocuments();
          this.code = `${prefix}-${String(count + 1).padStart(5, "0")}`;
        }
      }

      // AUTO-REJECT logic: Tự động reject nếu pending và quá hạn
      if (this.status === "pending" && this.expiresAt) {
        const now = new Date();
        if (now > this.expiresAt) {
          this.status = "rejected";
          this.rejectionReason =
            "Tự động từ chối do quá thời hạn xử lý (7 ngày kể từ khi tạo)";
          this.autoRejectedAt = now;
          console.log(
            `[AUTO-REJECT] Return request ${this.code} đã quá hạn, tự động reject`
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // ============================================================
  // PRE-SAVE: Lưu status cũ để so sánh
  // ============================================================
  schema.pre("save", function (next) {
    if (this.isModified("status")) {
      this._previousStatus = this.isNew ? null : this.$locals.previousStatus;
    }
    next();
  });

  // ============================================================
  // PRE-SAVE: Lưu status cũ vào $locals
  // ============================================================
  schema.pre("save", async function (next) {
    if (this.isNew) {
      next();
      return;
    }

    try {
      const ReturnRequest = mongoose.model("ReturnRequest");
      const original = await ReturnRequest.findById(this._id).select("status");

      if (original) {
        this.$locals.previousStatus = original.status;
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // ============================================================
  // POST-SAVE: Gửi email và xử lý loyalty khi status thay đổi
  // ============================================================
  schema.post("save", async function (doc) {
    try {
      const previousStatus = this._previousStatus;
      const currentStatus = this.status;

      // Chỉ gửi email khi status thay đổi
      if (previousStatus && previousStatus !== currentStatus) {
        try {
          const emailService = require("@services/email.service");
          const notificationService = require("@services/notification.service");
          const loyaltyService = require("@services/loyalty.service");

          // Populate để có đầy đủ thông tin
          const ReturnRequest = mongoose.model("ReturnRequest");
          const populatedRequest = await ReturnRequest.findById(
            this._id
          ).populate([
            { path: "customer", select: "name email preferences loyalty" },
            { path: "order", select: "code totalAfterDiscountAndShipping" },
          ]);

          if (!populatedRequest || !populatedRequest.customer) {
            console.log(
              `[RETURN EMAIL] Không tìm thấy customer cho return request ${this.code}`
            );
            return;
          }

          // Check user preferences
          const userPreferences = populatedRequest.customer.preferences || {};
          const emailEnabled =
            userPreferences.emailNotifications?.orderUpdates !== false;

          // Gửi email theo status
          const statusToSendEmail = [
            "approved",
            "processing",
            "completed",
            "rejected",
            "canceled",
          ];

          if (statusToSendEmail.includes(currentStatus)) {
            if (emailEnabled) {
              await emailService.sendReturnRequestEmail(
                populatedRequest.customer._id,
                populatedRequest
              );
              console.log(
                `[RETURN EMAIL] Đã gửi email cho yêu cầu ${this.code} - Status: ${currentStatus}`
              );
            } else {
              console.log(
                `[RETURN EMAIL] User tắt email notification, skip email cho ${this.code}`
              );
            }

            // Gửi in-app notification
            const notificationTypes = {
              approved: "RETURN_REQUEST_APPROVED",
              processing: "RETURN_REQUEST_PROCESSING",
              completed: "RETURN_REQUEST_COMPLETED",
              rejected: "RETURN_REQUEST_REJECTED",
              canceled: "RETURN_REQUEST_CANCELED",
            };

            const notificationType = notificationTypes[currentStatus];

            if (notificationType) {
              await notificationService.send(
                populatedRequest.customer._id,
                notificationType,
                {
                  returnRequestCode: populatedRequest.code,
                  returnRequestId: populatedRequest._id.toString(),
                  type:
                    populatedRequest.type === "RETURN"
                      ? "Trả hàng"
                      : "Đổi hàng",
                },
                { channels: { inApp: true, email: false } } // Email đã gửi riêng
              );
            }
          }

          // ============================================================
          // LOYALTY: TRỪ ĐIỂM KHI TRẢ HÀNG HOÀN TẤT (COMPLETED)
          // FIXED Bug #5: Thêm proper error handling
          // ============================================================
          if (
            currentStatus === "completed" &&
            previousStatus !== "completed" &&
            populatedRequest.type === "RETURN"
          ) {
            try {
              const Order = mongoose.model("Order");
              const order = await Order.findById(
                populatedRequest.order._id
              ).select("code loyaltyPointsEarned loyaltyPointsAwarded");

              if (
                order &&
                order.loyaltyPointsAwarded &&
                order.loyaltyPointsEarned > 0
              ) {
                // Lấy số điểm đã tích từ đơn hàng
                const pointsEarned = order.loyaltyPointsEarned;

                // Kiểm tra user có đủ điểm không
                const currentPoints =
                  populatedRequest.customer.loyalty?.points || 0;

                // Chỉ trừ nếu user có điểm (nếu không đủ thì trừ số có)
                const pointsToDeduct = Math.min(pointsEarned, currentPoints);

                if (pointsToDeduct > 0) {
                  try {
                    await loyaltyService.deductPoints(
                      populatedRequest.customer._id,
                      pointsToDeduct,
                      {
                        type: "DEDUCT",
                        source: "RETURN",
                        description: `Trừ điểm do trả hàng đơn ${order.code} (Yêu cầu: ${this.code})`,
                        processedBy: populatedRequest.processedBy,
                      }
                    );
                  } catch (deductError) {
                    console.error(
                      `[LOYALTY] LỖI khi trừ điểm cho return request ${this.code}:`,
                      deductError.message
                    );
                    // Không throw để không block flow chính
                  }

                  console.log(
                    `[LOYALTY] Đã trừ ${pointsToDeduct}/${pointsEarned} điểm từ user ${populatedRequest.customer._id} do trả hàng ${this.code}`
                  );
                } else {
                  console.log(
                    `[LOYALTY] User ${populatedRequest.customer._id} không có điểm để trừ (yêu cầu: ${pointsEarned}, hiện có: ${currentPoints})`
                  );
                }
              } else {
                console.log(
                  `[LOYALTY] Đơn hàng ${
                    order?.code || "N/A"
                  } chưa tích điểm hoặc không có điểm, skip trừ điểm`
                );
              }
            } catch (loyaltyError) {
              console.error(
                `[LOYALTY] Lỗi trừ điểm cho return request ${this.code}:`,
                loyaltyError.message
              );
            }
          }
        } catch (emailError) {
          // Không throw error để không ảnh hưởng flow chính
          console.error(
            `[RETURN EMAIL] Lỗi gửi email cho return request ${this.code}:`,
            emailError.message
          );
        }
      }
    } catch (error) {
      console.error(
        `[RETURN EMAIL] Lỗi trong post-save middleware:`,
        error.message
      );
    }
  });
};
