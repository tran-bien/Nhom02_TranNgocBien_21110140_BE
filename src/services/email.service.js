const { User } = require("@models");
const ApiError = require("@utils/ApiError");
const emailTemplates = require("@utils/email");

// Import transporter từ utils/email.js (shared instance)
const { transporter } = emailTemplates;

/**
 * FIX BUG #13: Helper function để retry email với exponential backoff
 */
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      if (attempt > 1) {
        console.log(
          `[EMAIL RETRY] Gửi thành công sau ${attempt} lần thử - To: ${mailOptions.to}`
        );
      }
      return { success: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      console.error(
        `[EMAIL RETRY] Lần thử ${attempt}/${maxRetries} thất bại:`,
        error.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`[EMAIL RETRY] Đợi ${waitTime}ms trước khi thử lại...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // Tất cả retry đều thất bại
  throw new ApiError(
    500,
    `Không thể gửi email sau ${maxRetries} lần thử: ${lastError.message}`
  );
};

const emailService = {
  /**
   * Gửi email notification chung (với template chuyên biệt)
   * Mapping đầy đủ cho 12 notification types trong schema
   */
  sendNotificationEmail: async (userId, notification) => {
    const user = await User.findById(userId);

    if (!user || !user.email) {
      throw new ApiError(404, "Không tìm thấy email người dùng");
    }

    let htmlContent;
    let subject = notification.title;

    // Chọn template phù hợp với notification type
    switch (notification.type) {
      case "ORDER_CONFIRMED":
        htmlContent = emailTemplates.orderConfirmedEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Đơn hàng ${notification.data.orderCode} đã được xác nhận`;
        break;

      case "ORDER_SHIPPING":
        htmlContent = emailTemplates.orderShippingEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Đơn hàng ${notification.data.orderCode} đang được giao`;
        break;

      case "ORDER_DELIVERED":
        htmlContent = emailTemplates.orderDeliveredEmailTemplate(
          user.name,
          notification.data,
          notification.data.pointsEarned || null,
          process.env.FRONTEND_URL
        );
        subject = `Đơn hàng ${notification.data.orderCode} đã giao thành công`;
        break;

      case "ORDER_CANCELLED":
        htmlContent = emailTemplates.orderCancelledEmailTemplate(
          user.name,
          notification.data,
          notification.data.reason || "",
          process.env.FRONTEND_URL
        );
        subject = `Đơn hàng ${notification.data.orderCode} đã bị hủy`;
        break;

      case "RETURN_APPROVED":
        htmlContent = emailTemplates.returnApprovedEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Yêu cầu ${notification.data.type} được chấp nhận`;
        break;

      case "RETURN_REJECTED":
        htmlContent = emailTemplates.returnRejectedEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Yêu cầu ${notification.data.type} bị từ chối`;
        break;

      case "RETURN_COMPLETED":
        htmlContent = emailTemplates.returnCompletedEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Yêu cầu ${notification.data.type} đã hoàn tất`;
        break;

      case "LOYALTY_TIER_UP":
        htmlContent = emailTemplates.loyaltyTierUpEmailTemplate(
          user.name,
          notification.data,
          process.env.FRONTEND_URL
        );
        subject = `Chúc mừng! Bạn đã lên hạng ${notification.data.tierName}`;
        break;
        
      default:
        // Fallback: Log lỗi nếu type không hợp lệ
        console.error(
          `[Email] Unknown notification type: ${notification.type}`
        );
        throw new ApiError(
          400,
          `Loại thông báo không được hỗ trợ: ${notification.type}`
        );
    }

    const mailOptions = {
      from: `"Shoe Shop" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: subject,
      html: htmlContent,
    };

    try {
      // FIX BUG #13: Sử dụng retry logic
      const result = await sendEmailWithRetry(mailOptions);
      return result;
    } catch (error) {
      console.error("Lỗi gửi email sau khi retry:", error);
      throw error; // Re-throw error để notification service xử lý
    }
  },

  /**
   * Gửi email xác nhận đơn hàng
   */
  sendOrderConfirmationEmail: async (userId, order) => {
    const user = await User.findById(userId);

    if (!user || !user.email) {
      throw new ApiError(404, "Không tìm thấy email người dùng");
    }

    const mailOptions = {
      from: `"Shoe Shop" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Xác nhận đơn hàng ${order.code}`,
      html: emailTemplates.orderConfirmationEmailTemplate(
        user.name,
        order,
        process.env.FRONTEND_URL
      ),
    };

    try {
      // FIX BUG #13: Sử dụng retry logic
      const result = await sendEmailWithRetry(mailOptions);
      return result;
    } catch (error) {
      console.error("Lỗi gửi email xác nhận đơn hàng sau khi retry:", error);
      throw new ApiError(500, "Không thể gửi email");
    }
  },

  /**
   * Gửi email thông báo yêu cầu đổi/trả hàng
   */
  sendReturnRequestEmail: async (userId, returnRequest) => {
    const User = require("@models/user");
    const user = await User.findById(userId).select("name email preferences");

    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Check user preferences
    const emailEnabled =
      user.preferences?.emailNotifications?.orderUpdates !== false;

    if (!emailEnabled) {
      console.log(
        `[EMAIL] User ${user.email} đã tắt email notification, skip email trả hàng/hoàn tiền`
      );
      return { success: false, reason: "User disabled email notifications" };
    }

    const mailOptions = {
      from: `"Shoe Shop - Trả Hàng/Hoàn Tiền" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `[Shoe Shop] Cập nhật yêu cầu trả hàng/hoàn tiền #${returnRequest.code}`,
      html: emailTemplates.returnRequestEmailTemplate(
        user.name,
        returnRequest,
        process.env.FRONTEND_URL
      ),
    };

    try {
      // FIX BUG #13: Sử dụng retry logic
      const result = await sendEmailWithRetry(mailOptions);
      console.log(
        `[EMAIL] Đã gửi email trả hàng/hoàn tiền cho ${user.email} - Mã: ${returnRequest.code}`
      );
      return result;
    } catch (error) {
      console.error("Lỗi gửi email trả hàng/hoàn tiền sau khi retry:", error);
      throw new ApiError(500, "Không thể gửi email trả hàng/hoàn tiền");
    }
  },
};

module.exports = emailService;
