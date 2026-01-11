const nodemailer = require("nodemailer");
const ApiError = require("@utils/ApiError");
const { baseStyles } = require("@utils/emailTemplates");

require("dotenv").config();

/**
 * ================================================================================================
 * EMAIL TEMPLATES MAPPING - COMPREHENSIVE LIST
 * ================================================================================================
 *
 * NOTIFICATION TYPES (10 types trong notification schema):
 * ✅ ORDER_CONFIRMED      → orderConfirmedEmailTemplate (Template 3A)
 * ✅ ORDER_SHIPPING       → orderShippingEmailTemplate (Template 3B)
 * ✅ ORDER_DELIVERED      → orderDeliveredEmailTemplate (Template 3C)
 * ✅ ORDER_CANCELLED      → orderCancelledEmailTemplate (Template 3D)
 * ✅ RETURN_APPROVED      → returnApprovedEmailTemplate (Template 3H)
 * ✅ RETURN_REJECTED      → returnRejectedEmailTemplate (Template 3I)
 * ✅ RETURN_COMPLETED     → returnCompletedEmailTemplate (Template 3J)
 * ✅ LOYALTY_TIER_UP      → loyaltyTierUpEmailTemplate (Template 3E)
 *
 * OTHER EMAIL TYPES:
 * ✅ Verification OTP     → verificationEmailTemplate (Template 1)
 * ✅ Reset Password       → resetPasswordEmailTemplate (Template 2)
 * ✅ Order Confirmation   → orderConfirmationEmailTemplate (Template 4) - Không dùng qua notification
 * ✅ Return Request       → returnRequestEmailTemplate (Template 5) - Không dùng qua notification
 *
 * USAGE:
 * - Tất cả notification emails được gửi qua email.service.sendNotificationEmail()
 * - Switch case trong sendNotificationEmail() map notification.type → template tương ứng
 *
 * ================================================================================================
 */

// ============================================================
// FIX Bug #10: Helper function để escape HTML tránh XSS
// ============================================================
const escapeHtml = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Export helper function
module.exports.escapeHtml = escapeHtml;

// Kiểm tra biến môi trường
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error(
    "CRITICAL: EMAIL_USER hoặc EMAIL_PASSWORD chưa được cấu hình trong .env"
  );
  throw new Error("Missing email configuration in .env file");
}

// Loại bỏ dấu ngoặc kép và khoảng trắng thừa (nếu có)
const emailPassword = process.env.EMAIL_PASSWORD.replace(/['"]/g, "").trim();
// console.log("Cleaned password length:", emailPassword.length);

// Khởi tạo transporter (sẽ được shared giữa utils và service)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPassword, // Sử dụng password đã được clean
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter verification failed:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Export transporter để tái sử dụng
module.exports.transporter = transporter;

// Helper: Tạo wrapper chung cho email
const createEmailWrapper = (content) => `
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      <h1 style="${baseStyles.headerTitle}">SHOE SHOP</h1>
      <p style="${baseStyles.headerSubtitle}">Premium Sneakers</p>
    </div>
    ${content}
    <div style="${baseStyles.footer}">
      <p style="${
        baseStyles.footerText
      }"><strong>SHOE SHOP</strong><br>Premium Sneakers Collection</p>
      <p style="${
        baseStyles.footerText
      }">© ${new Date().getFullYear()} Shoe Shop. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * Template 1: Email xác nhận OTP
 * FIX Bug #10: Sử dụng escapeHtml để tránh XSS
 */
exports.verificationEmailTemplate = (name, otp) => {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">Xác nhận tài khoản</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${safeName}</strong>,</p>
      <p style="${baseStyles.text}">
        Cảm ơn bạn đã đăng ký tài khoản tại Shoe Shop. Để hoàn tất quá trình đăng ký, 
        vui lòng sử dụng mã OTP bên dưới:
      </p>
      <div style="${baseStyles.codeBox}">
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #2C2C2C; letter-spacing: 2px; text-transform: uppercase;">Mã xác nhận</p>
        <div style="${baseStyles.code}">${safeOtp}</div>
      </div>
      <p style="${baseStyles.text}">Mã OTP này sẽ <strong>hết hạn sau 10 phút</strong>.</p>
      <p style="${baseStyles.text}">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 2: Email đặt lại mật khẩu
 * FIX Bug #10: Sử dụng escapeHtml để tránh XSS
 */
exports.resetPasswordEmailTemplate = (name, resetUrl) => {
  const safeName = escapeHtml(name);
  // URL không cần escape trong attribute href
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">Đặt lại mật khẩu</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${safeName}</strong>,</p>
      <p style="${baseStyles.text}">
        Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại Shoe Shop. 
        Vui lòng nhấp vào nút bên dưới để thiết lập mật khẩu mới:
      </p>
      <div style="${baseStyles.buttonWrapper}">
        <a href="${resetUrl}" style="${baseStyles.button}">Đặt lại mật khẩu</a>
      </div>
      <p style="${baseStyles.text}">Liên kết này sẽ <strong>hết hạn sau 10 phút</strong>.</p>
      <p style="${baseStyles.text}">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. 
        Mật khẩu của bạn sẽ không thay đổi.
      </p>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3A: Email xác nhận đơn hàng (ORDER_CONFIRMED)
 * FIX Bug #10: Sử dụng escapeHtml để tránh XSS
 */
exports.orderConfirmedEmailTemplate = (userName, order, frontendUrl) => {
  const safeUserName = escapeHtml(userName);
  const orderCode = escapeHtml(order?.orderCode || order?.code || "N/A");
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">✅ Đơn hàng đã được xác nhận</h2>
      <p style="${
        baseStyles.text
      }">Xin chào <strong>${safeUserName}</strong>,</p>
      <p style="${baseStyles.text}">
        Đơn hàng <strong>${orderCode}</strong> của bạn đã được xác nhận và đang được chuẩn bị.
      </p>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #000000; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Thông tin đơn hàng</p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Mã đơn: <strong>${orderCode}</strong></p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Tổng tiền: <strong>${
          order.totalAfterDiscountAndShipping?.toLocaleString("vi-VN") || "N/A"
        }đ</strong></p>
      </div>
      
      <p style="${
        baseStyles.text
      }">Chúng tôi sẽ thông báo cho bạn khi đơn hàng được giao.</p>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/user-order/${order._id}" style="${
    baseStyles.button
  }">Xem đơn hàng</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3B: Email đơn hàng đang giao (ORDER_SHIPPING)
 */
exports.orderShippingEmailTemplate = (userName, order, frontendUrl) => {
  const orderCode = escapeHtml(order?.orderCode || order?.code || "N/A");
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">🚚 Đơn hàng đang được giao</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Đơn hàng <strong>${orderCode}</strong> của bạn đang trên đường giao đến. 
        Shipper sẽ liên hệ bạn trong thời gian sớm nhất.
      </p>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #000000; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Thông tin giao hàng</p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">
          Địa chỉ: ${order?.shippingAddress?.detail || "N/A"}${
    order?.shippingAddress?.ward ? ", " + order.shippingAddress.ward : ""
  }${
    order?.shippingAddress?.district
      ? ", " + order.shippingAddress.district
      : ""
  }${
    order?.shippingAddress?.province
      ? ", " + order.shippingAddress.province
      : ""
  }
        </p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">SĐT: ${
          order?.shippingAddress?.phone || "N/A"
        }</p>
      </div>
      
      <p style="${baseStyles.text}">Vui lòng chú ý điện thoại để nhận hàng!</p>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/user-order/${order._id}" style="${
    baseStyles.button
  }">Theo dõi đơn hàng</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3C: Email đơn hàng đã giao (ORDER_DELIVERED)
 */
exports.orderDeliveredEmailTemplate = (
  userName,
  order,
  pointsEarned,
  frontendUrl
) => {
  const orderCode = escapeHtml(order?.orderCode || order?.code || "N/A");
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">✅ Đơn hàng đã giao thành công</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Đơn hàng <strong>${orderCode}</strong> đã được giao thành công. 
        Cảm ơn bạn đã mua hàng tại Shoe Shop!
      </p>
      
      ${
        pointsEarned
          ? `
      <div style="background-color: #000000; color: #FFFFFF; padding: 25px; text-align: center; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Bạn đã nhận được</p>
        <p style="margin: 0; font-size: 36px; font-weight: 700;">${pointsEarned} điểm</p>
        <p style="margin: 10px 0 0 0; font-size: 13px;">Loyalty Points</p>
      </div>
      `
          : ""
      }
      
      <p style="${baseStyles.text}">
        Đánh giá sản phẩm để nhận thêm <strong>50 điểm</strong> và giúp người mua khác!
      </p>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/user-reviews" style="${
    baseStyles.button
  }">Đánh giá ngay</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3D: Email đơn hàng bị hủy (ORDER_CANCELLED)
 */
exports.orderCancelledEmailTemplate = (
  userName,
  order,
  reason,
  frontendUrl
) => {
  const orderCode = escapeHtml(order?.orderCode || order?.code || "N/A");
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">❌ Đơn hàng đã bị hủy</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Rất tiếc, đơn hàng <strong>${orderCode}</strong> đã bị hủy.
      </p>
      
      ${
        reason
          ? `
      <div style="background-color: #F5F5F5; border-left: 4px solid #2C2C2C; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Lý do hủy:</p>
        <p style="margin: 0; color: #2C2C2C; font-size: 14px;">${reason}</p>
      </div>
      `
          : ""
      }
      
      <p style="${baseStyles.text}">
        ${
          order.payment?.method === "VNPAY"
            ? "Số tiền sẽ được hoàn lại vào tài khoản của bạn trong 5-7 ngày làm việc."
            : "Nếu bạn đã thanh toán, vui lòng liên hệ bộ phận hỗ trợ."
        }
      </p>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/products" style="${
    baseStyles.button
  }">Tiếp tục mua sắm</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3E: Email thông báo lên hạng loyalty (LOYALTY_TIER_UP)
 */
exports.loyaltyTierUpEmailTemplate = (userName, tierInfo, frontendUrl) => {
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">🎉 Chúc mừng lên hạng ${
    tierInfo.tierName
  }!</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Chúc mừng! Bạn đã được nâng cấp lên hạng thành viên <strong>${
          tierInfo.tierName
        }</strong>.
      </p>
      
      <div style="background-color: #000000; color: #FFFFFF; padding: 30px; text-align: center; margin: 25px 0;">
        <p style="margin: 0 0 15px 0; font-size: 16px; letter-spacing: 3px; text-transform: uppercase;">Hạng của bạn</p>
        <p style="margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 2px;">${
          tierInfo.tierName
        }</p>
      </div>
      
      <h3 style="color: #000000; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0;">Ưu đãi của bạn:</h3>
      <ul style="color: #2C2C2C; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        <li>Tích điểm <strong>x${tierInfo.multiplier || 1}</strong></li>
        ${tierInfo.prioritySupport ? "<li>Hỗ trợ ưu tiên</li>" : ""}
        <li>Điểm hiện tại: <strong>${tierInfo.currentPoints}</strong></li>
      </ul>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/loyalty" style="${
    baseStyles.button
  }">Xem ưu đãi</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3H: Email yêu cầu đổi/trả được chấp nhận (RETURN_APPROVED)
 */
exports.returnApprovedEmailTemplate = (userName, returnInfo, frontendUrl) => {
  const typeText = returnInfo.type === "RETURN" ? "trả hàng" : "đổi hàng";
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">✅ Yêu cầu ${typeText} được chấp nhận</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Yêu cầu ${typeText} <strong>${returnInfo.returnRequestCode}</strong> của bạn đã được chấp nhận.
      </p>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #000000; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Thông tin yêu cầu</p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Mã yêu cầu: <strong>${returnInfo.returnRequestCode}</strong></p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Đơn hàng: <strong>${returnInfo.orderCode}</strong></p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Loại: <strong>${typeText}</strong></p>
      </div>
      
      <p style="${baseStyles.text}">
        Chúng tôi sẽ liên hệ với bạn để hướng dẫn các bước tiếp theo.
      </p>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3I: Email yêu cầu đổi/trả bị từ chối (RETURN_REJECTED)
 */
exports.returnRejectedEmailTemplate = (userName, returnInfo, frontendUrl) => {
  const typeText = returnInfo.type === "RETURN" ? "trả hàng" : "đổi hàng";
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">❌ Yêu cầu ${typeText} bị từ chối</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Rất tiếc, yêu cầu ${typeText} <strong>${
    returnInfo.returnRequestCode
  }</strong> của bạn không được chấp nhận.
      </p>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #2C2C2C; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Thông tin yêu cầu</p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Mã yêu cầu: <strong>${
          returnInfo.returnRequestCode
        }</strong></p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Đơn hàng: <strong>${
          returnInfo.orderCode
        }</strong></p>
        ${
          returnInfo.rejectionReason
            ? `<p style="margin: 15px 0 5px 0; color: #000000; font-size: 14px; font-weight: 600;">Lý do từ chối:</p>
        <p style="margin: 0; color: #2C2C2C; font-size: 14px;">${returnInfo.rejectionReason}</p>`
            : ""
        }
      </div>
      
      <p style="${baseStyles.text}">
        Nếu có thắc mắc, vui lòng liên hệ bộ phận chăm sóc khách hàng.
      </p>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 3J: Email yêu cầu đổi/trả hoàn tất (RETURN_COMPLETED)
 */
exports.returnCompletedEmailTemplate = (userName, returnInfo, frontendUrl) => {
  const typeText = returnInfo.type === "RETURN" ? "trả hàng" : "đổi hàng";
  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">✅ ${
    typeText === "trả hàng" ? "Hoàn tiền" : "Đổi hàng"
  } hoàn tất</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${baseStyles.text}">
        Yêu cầu ${typeText} <strong>${
    returnInfo.returnRequestCode
  }</strong> đã được xử lý thành công.
      </p>
      
      <div style="background-color: #000000; color: #FFFFFF; padding: 25px; text-align: center; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Trạng thái</p>
        <p style="margin: 0; font-size: 36px; font-weight: 700;">Hoàn tất</p>
      </div>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #000000; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600;">Thông tin yêu cầu</p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Mã yêu cầu: <strong>${
          returnInfo.returnRequestCode
        }</strong></p>
        <p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Đơn hàng: <strong>${
          returnInfo.orderCode
        }</strong></p>
        ${
          returnInfo.refundAmount
            ? `<p style="margin: 5px 0; color: #2C2C2C; font-size: 14px;">Số tiền hoàn: <strong>${returnInfo.refundAmount.toLocaleString(
                "vi-VN"
              )}đ</strong></p>`
            : ""
        }
      </div>
      
      <p style="${baseStyles.text}">
        Cảm ơn bạn đã tin tưởng Shoe Shop!
      </p>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/products" style="${
    baseStyles.button
  }">Tiếp tục mua sắm</a>
      </div>
    </div>
  `;
  return createEmailWrapper(content);
};

/**
 * Template 4: Email xác nhận đơn hàng
 */
exports.orderConfirmationEmailTemplate = (userName, order, frontendUrl) => {
  const orderItemsHtml = order.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #F5F5F5; color: #2C2C2C;">${
          item.productName
        }</td>
        <td style="padding: 15px; border-bottom: 1px solid #F5F5F5; text-align: center; color: #2C2C2C; font-weight: 600;">×${
          item.quantity
        }</td>
        <td style="padding: 15px; border-bottom: 1px solid #F5F5F5; text-align: right; color: #000000; font-weight: 600;">${item.price.toLocaleString(
          "vi-VN"
        )}đ</td>
      </tr>
    `
    )
    .join("");

  const content = `
    <div style="${baseStyles.content}">
      <h2 style="${baseStyles.title}">Đơn hàng ${order.code}</h2>
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      <p style="${
        baseStyles.text
      }">Cảm ơn bạn đã đặt hàng tại Shoe Shop. Đơn hàng của bạn đang được chuẩn bị.</p>
      
      <hr style="${baseStyles.divider}">
      
      <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin: 30px 0 20px 0; letter-spacing: 1px; text-transform: uppercase;">Sản phẩm</h3>
      <table style="width: 100%; border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #F5F5F5;">
        <thead>
          <tr style="background-color: #000000;">
            <th style="padding: 15px; text-align: left; color: #FFFFFF; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Tên sản phẩm</th>
            <th style="padding: 15px; text-align: center; color: #FFFFFF; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Số lượng</th>
            <th style="padding: 15px; text-align: right; color: #FFFFFF; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Giá</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml}</tbody>
      </table>
      
      <div style="margin-top: 30px; padding: 25px; background-color: #F5F5F5; border: 2px solid #E0E0E0;">
        <table style="width: 100%;">
          <tr><td style="color: #2C2C2C; font-size: 15px;">Tổng tiền hàng:</td><td style="text-align: right; color: #2C2C2C; font-size: 15px; font-weight: 600;">${order.subTotal.toLocaleString(
            "vi-VN"
          )}đ</td></tr>
          <tr><td style="color: #2C2C2C; font-size: 15px; padding-top: 10px;">Giảm giá:</td><td style="text-align: right; color: #2C2C2C; font-size: 15px; font-weight: 600; padding-top: 10px;">-${order.discount.toLocaleString(
            "vi-VN"
          )}đ</td></tr>
          <tr><td style="color: #2C2C2C; font-size: 15px; padding-top: 10px;">Phí vận chuyển:</td><td style="text-align: right; color: #2C2C2C; font-size: 15px; font-weight: 600; padding-top: 10px;">${order.shippingFee.toLocaleString(
            "vi-VN"
          )}đ</td></tr>
        </table>
        <hr style="margin: 20px 0; border: none; border-top: 2px solid #2C2C2C;">
        <table style="width: 100%;">
          <tr><td style="color: #000000; font-size: 18px; font-weight: 700; letter-spacing: 1px;">TỔNG THANH TOÁN:</td><td style="text-align: right; color: #000000; font-size: 20px; font-weight: 700;">${order.totalAfterDiscountAndShipping.toLocaleString(
            "vi-VN"
          )}đ</td></tr>
        </table>
      </div>
      
      <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin: 40px 0 20px 0; letter-spacing: 1px; text-transform: uppercase;">Địa chỉ giao hàng</h3>
      <div style="padding: 20px; background-color: #F5F5F5; border-left: 4px solid #000000;">
        <p style="margin: 5px 0; color: #000000; font-weight: 600;">${
          order.shippingAddress.name
        } • ${order.shippingAddress.phone}</p>
        <p style="margin: 5px 0; color: #2C2C2C;">${
          order.shippingAddress.detail
        }</p>
        <p style="margin: 5px 0; color: #2C2C2C;">${
          order.shippingAddress.ward
        }, ${order.shippingAddress.district}, ${
    order.shippingAddress.province
  }</p>
      </div>
      
      <div style="${baseStyles.buttonWrapper}">
        <a href="${frontendUrl}/user-order/${order._id}" style="${
    baseStyles.button
  }">Xem đơn hàng</a>
      </div>
    </div>
  `;

  const footer = `
    <div style="${baseStyles.footer}">
      <p style="${baseStyles.footerText}">
        Nếu bạn có câu hỏi, vui lòng liên hệ: <a href="mailto:${
          process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
        }" style="${baseStyles.footerLink}">${
    process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
  }</a>
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #E0E0E0;">
      <p style="${
        baseStyles.footerText
      }"><strong>SHOE SHOP</strong><br>Premium Sneakers Collection</p>
      <p style="${
        baseStyles.footerText
      }">© ${new Date().getFullYear()} Shoe Shop. All rights reserved.</p>
    </div>
  `;

  return `<div style="${baseStyles.container}"><div style="${baseStyles.header}"><h1 style="${baseStyles.headerTitle}">SHOE SHOP</h1><p style="${baseStyles.headerSubtitle}">Premium Sneakers</p></div>${content}${footer}</div>`;
};

/**
 * Template 5: Email yêu cầu trả hàng/hoàn tiền
 */
exports.returnRequestEmailTemplate = (userName, returnRequest, frontendUrl) => {
  // Thông tin status
  const statusMessages = {
    pending: {
      title: "Đã nhận yêu cầu trả hàng/hoàn tiền",
      message:
        "Chúng tôi đã nhận được yêu cầu trả hàng/hoàn tiền của bạn và đang xem xét.",
      color: "#2C2C2C",
    },
    approved: {
      title: "Yêu cầu đã được chấp nhận",
      message:
        "Yêu cầu trả hàng/hoàn tiền của bạn đã được chấp nhận. Vui lòng làm theo hướng dẫn bên dưới.",
      color: "#000000",
    },
    processing: {
      title: "Đang xử lý yêu cầu",
      message: "Chúng tôi đang xử lý yêu cầu trả hàng/hoàn tiền của bạn.",
      color: "#2C2C2C",
    },
    completed: {
      title: "Hoàn tất trả hàng/hoàn tiền",
      message: "Yêu cầu trả hàng/hoàn tiền của bạn đã được xử lý thành công.",
      color: "#000000",
    },
    rejected: {
      title: "Yêu cầu bị từ chối",
      message:
        "Rất tiếc, yêu cầu trả hàng/hoàn tiền của bạn không được chấp nhận.",
      color: "#2C2C2C",
    },
    canceled: {
      title: "Yêu cầu đã bị hủy",
      message: "Yêu cầu trả hàng/hoàn tiền của bạn đã bị hủy.",
      color: "#2C2C2C",
    },
  };

  const statusInfo =
    statusMessages[returnRequest.status] || statusMessages.pending;
  const typeText = returnRequest.type === "RETURN" ? "Trả hàng" : "Hoàn tiền";

  const content = `
    <div style="${baseStyles.content}">
      <h2 style="color: ${
        statusInfo.color
      }; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; letter-spacing: -0.5px;">${
    statusInfo.title
  }</h2>
      
      <p style="${baseStyles.text}">Xin chào <strong>${userName}</strong>,</p>
      
      <p style="${baseStyles.text}">${statusInfo.message}</p>
      
      <div style="background-color: #F5F5F5; border-left: 4px solid #000000; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #2C2C2C; font-size: 14px;"><strong style="color: #000000;">Mã yêu cầu:</strong> ${
          returnRequest.code
        }</p>
        <p style="margin: 0 0 10px 0; color: #2C2C2C; font-size: 14px;"><strong style="color: #000000;">Loại:</strong> ${typeText}</p>
        <p style="margin: 0 0 10px 0; color: #2C2C2C; font-size: 14px;"><strong style="color: #000000;">Đơn hàng:</strong> ${
          returnRequest.order?.code || returnRequest.orderCode || "N/A"
        }</p>
        <p style="margin: 0; color: #2C2C2C; font-size: 14px;"><strong style="color: #000000;">Trạng thái:</strong> ${
          statusInfo.title
        }</p>
      </div>
      
      ${
        returnRequest.adminNote
          ? `
        <div style="background-color: #FFFFFF; border: 2px solid #F5F5F5; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0; color: #000000; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Ghi chú từ cửa hàng:</p>
          <p style="margin: 0; color: #2C2C2C; font-size: 14px; line-height: 1.7;">${returnRequest.adminNote}</p>
        </div>
      `
          : ""
      }
      
      <p style="color: #2C2C2C; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0;">
        Nếu có thắc mắc, vui lòng liên hệ bộ phận chăm sóc khách hàng.
      </p>
    </div>
  `;

  const footer = `
    <div style="${baseStyles.footer}">
      <p style="${baseStyles.footerText}">
        Nếu bạn có câu hỏi, vui lòng liên hệ: <a href="mailto:${
          process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
        }" style="${baseStyles.footerLink}">${
    process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
  }</a>
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #E0E0E0;">
      <p style="${
        baseStyles.footerText
      }"><strong>SHOE SHOP</strong><br>Premium Sneakers Collection</p>
      <p style="${
        baseStyles.footerText
      }">© ${new Date().getFullYear()} Shoe Shop. All rights reserved.</p>
    </div>
  `;

  return `<div style="${baseStyles.container}"><div style="${baseStyles.header}"><h1 style="${baseStyles.headerTitle}">SHOE SHOP</h1><p style="${baseStyles.headerSubtitle}">Premium Sneakers</p></div>${content}${footer}</div>`;
};

/**
 * Helper function: Gửi email xác nhận OTP
 */
exports.sendVerificationEmail = async (email, name, otp) => {
  console.log(`📧 Attempting to send verification email to: ${email}`);
  console.log(`📧 OTP: ${otp}`);

  const mailOptions = {
    from: `"Shoe Shop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Xác nhận tài khoản Shoe Shop",
    html: exports.verificationEmailTemplate(name, otp),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Response:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending verification email:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Kiểm tra lỗi cụ thể
    if (error.code === "EAUTH") {
      throw new ApiError(
        500,
        "Lỗi xác thực email. Vui lòng kiểm tra cấu hình EMAIL_USER và EMAIL_PASSWORD trong file .env"
      );
    }

    throw new ApiError(500, "Không thể gửi email xác nhận. Vui lòng thử lại!");
  }
};

/**
 * Helper function: Gửi email đặt lại mật khẩu
 */
exports.sendResetPasswordEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Shoe Shop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Đặt lại mật khẩu Shoe Shop",
    html: exports.resetPasswordEmailTemplate(name, resetUrl),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw new ApiError(
      500,
      "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại!"
    );
  }
};
