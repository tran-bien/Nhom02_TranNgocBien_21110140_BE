const asyncHandler = require("express-async-handler");
const orderService = require("@services/order.service");
const paymentService = require("@services/payment.service");

/**
 * LẤY DANH SÁCH ĐƠN HÀNG CỦA USER
 *
 * Business Logic:
 * - User chỉ xem được đơn hàng của chính mình
 * - Filter: status (pending/confirmed/shipping/delivered/cancelled), search (code, name, phone)
 * - Pagination: page, limit
 * - Trả về statistics: số đơn theo từng trạng thái
 * - Populate: user info, variant (color, product), size
 *
 * @access  Authenticated User (Auto filter by req.user.id)
 * @route   GET /api/user/orders?page=1&limit=20&status=pending&search=ĐH001
 * @query   { page, limit, status, search }
 * @flow    order.route.js (user) → order.controller.js → order.service.js → getUserOrders()
 */
const getOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await orderService.getUserOrders(userId, req.query);

  res.status(200).json({
    success: true,
    message: "Lấy danh sách đơn hàng thành công",
    ...result,
  });
});

/**
 * LẤY CHI TIẾT ĐƠN HÀNG
 *
 * Business Logic:
 * - User CHỈ xem được đơn hàng của chính mình (kiểm tra order.user === req.user.id)
 * - Populate đầy đủ: user, orderItems (variant, size, color, product), coupon, cancelRequestId
 * - 403 Forbidden nếu không phải chủ đơn hàng
 *
 * @access  Authenticated User (với ownership check)
 * @route   GET /api/user/orders/:id
 * @params  { id: orderId }
 * @flow    order.route.js (user) → order.controller.js → order.service.js → getOrderById()
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Lấy chi tiết đơn hàng thành công",
    data: order,
  });
});

/**
 * TẠO ĐƠN HÀNG MỚI TỪ GIỎ HÀNG
 *
 * Business Logic:
 * - Lấy sản phẩm đã chọn (isSelected = true) từ giỏ hàng
 * - Kiểm tra tồn kho cho TỪNG sản phẩm (variant + size)
 * - Áp dụng coupon nếu có: kiểm tra hợp lệ, minOrderValue, maxUses
 * - Tính discount: percent (có maxDiscount) hoặc fixed
 * - Tính shippingFee: FREE nếu >= 1,000,000đ, còn lại 30,000đ
 * - PaymentMethod: COD hoặc VNPAY
 * - COD: Tự động trừ tồn kho ngay (inventoryDeducted = true)
 * - VNPAY: Chưa trừ stock, trả về paymentUrl để redirect
 * - Xóa các items đã chọn khỏi giỏ hàng sau khi tạo đơn thành công
 *
 * @access  Authenticated User
 * @route   POST /api/user/orders
 * @body    { addressId, paymentMethod: COD|VNPAY, note, couponCode }
 * @flow    order.route.js (user) → order.controller.js → order.service.js → createOrder()
 */
const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod, note, couponCode } = req.body;

  const order = await orderService.createOrder({
    userId: req.user._id,
    addressId,
    paymentMethod,
    note,
    couponCode,
  });

  // Nếu thanh toán qua VNPAY, tạo URL thanh toán
  if (paymentMethod === "VNPAY") {
    try {
      console.log("Creating VNPAY payment for order:", {
        id: order._id,
        code: order.code,
        amount: order.totalAfterDiscountAndShipping,
      });

      const paymentUrl = await paymentService.createVnpayPaymentUrl({
        orderId: order._id,
        amount: order.totalAfterDiscountAndShipping,
        orderInfo: `Thanh toan don hang ${order.code || order._id}`,
        ipAddr: req.ip || req.connection.remoteAddress || "127.0.0.1",
        returnUrl: process.env.VNPAY_RETURN_URL,
      });

      return res.status(200).json({
        success: true,
        message: "Đơn hàng đã được tạo, vui lòng thanh toán",
        data: {
          order: {
            _id: order._id,
            code: order.code,
            totalAmount: order.totalAfterDiscountAndShipping,
          },
          paymentUrl,
        },
      });
    } catch (error) {
      console.error("VNPAY payment URL creation failed:", error);

      // Nếu lỗi tạo URL thanh toán, vẫn trả về đơn hàng đã tạo
      return res.status(201).json({
        success: true,
        message:
          "Đơn hàng đã tạo thành công, nhưng có lỗi khi tạo URL thanh toán",
        error: error.message,
        data: order,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: "Đơn hàng đã được tạo thành công",
    data: order,
  });
});

/**
 * GỬI YÊU CẦU HUỶ ĐƠN HÀNG
 *
 * Business Logic:
 * - Chỉ chủ đơn hàng mới được gửi yêu cầu huỷ (order.user === req.user.id)
 * - Chỉ huỷ được đơn hàng ở trạng thái: pending hoặc confirmed
 * - PENDING: Tự động duyệt huỷ ngay, hoàn tồn kho nếu đã trừ (COD)
 * - CONFIRMED: Tạo CancelRequest với status = pending, chờ admin xử lý
 * - REQUIRED: Phải có lý do huỷ (reason)
 * - Sau huỷ: xóa items khỏi giỏ hàng
 *
 * @access  Authenticated User (với ownership check)
 * @route   POST /api/user/orders/:id/cancel
 * @params  { id: orderId }
 * @body    { reason: string (required) }
 * @flow    order.route.js (user) → order.controller.js → order.service.js → cancelOrder()
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const result = await orderService.cancelOrder(req.params.id, req.user._id, {
    reason,
  });

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.cancelRequest,
  });
});

/**
 * THANH TOÁN LẠI ĐƠN HÀNG VNPAY
 *
 * Business Logic:
 * - Chỉ cho phép thanh toán lại đơn hàng VNPAY chưa thanh toán
 * - Kiểm tra: payment.method === "VNPAY" && payment.paymentStatus !== "paid"
 * - Tạo URL thanh toán mới với orderId và amount
 * - Trả về paymentUrl để redirect tới VNPay gateway
 *
 * @access  Authenticated User
 * @route   POST /api/user/orders/:id/repay
 * @params  { id: orderId }
 * @flow    order.route.js (user) → order.controller.js → payment.service.js → createRepaymentUrl()
 */
const repayOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createRepaymentUrl(
    req.params.id,
    req.ip,
    process.env.VNPAY_RETURN_URL
  );

  res.status(200).json({
    success: true,
    message: "Đã tạo URL thanh toán lại cho đơn hàng",
    data: result.data,
  });
});

/**
 * VNPAY CALLBACK - XỬ LÝ KẾT QUẢ THANH TOÁN
 *
 * Business Logic:
 * - VNPay redirect về sau khi user thanh toán
 * - Nhận query params từ VNPay: vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash...
 * - Xác thực chữ ký (SecureHash) để đảm bảo dữ liệu hợp lệ
 * - Nếu thành công (vnp_ResponseCode = "00"): Cập nhật order status, trừ tồn kho
 * - Redirect về frontend với kết quả: /payment/result?orderId=xxx&status=success|failed
 *
 * @access  Public (VNPay callback)
 * @route   GET /api/user/orders/vnpay/callback
 * @query   { vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash, ... }
 * @flow    VNPay → order.route.js → order.controller.js → payment.service.js → processVnpayReturn()
 */
const vnpayCallback = asyncHandler(async (req, res) => {
  const vnpParams = req.query;

  // Xử lý kết quả thanh toán
  const paymentResult = await paymentService.processVnpayReturn(vnpParams);

  // Chuyển hướng tới trang kết quả ở frontend
  res.redirect(
    `${process.env.FRONTEND_URL}/payment/result?${new URLSearchParams({
      orderId: paymentResult.orderId,
      status: paymentResult.success ? "success" : "failed",
      message: paymentResult.message,
    }).toString()}`
  );
});

/**
 * VNPAY IPN (INSTANT PAYMENT NOTIFICATION)
 *
 * Business Logic:
 * - VNPay gọi webhook này để thông báo kết quả thanh toán (server-to-server)
 * - Hỗ trợ cả GET và POST method (VNPay có thể gửi bất kỳ)
 * - Xác thực chữ ký SecureHash
 * - Cập nhật trạng thái thanh toán đơn hàng
 * - LUÔN trả về status code 200 (theo yêu cầu VNPay)
 * - Response format: { RspCode: "00"|"99", Message: "..." }
 *
 * @access  Public (VNPay IPN webhook)
 * @route   POST|GET /api/orders/vnpay/ipn
 * @query   { vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash, ... }
 * @flow    VNPay → order.route.js → order.controller.js → payment.service.js → processVnpayIpn()
 */
const vnpayIpn = asyncHandler(async (req, res) => {
  // Kiểm tra và lấy tham số từ cả query và body
  let vnpParams = {};

  if (req.method === "GET") {
    // Nếu là GET request, lấy từ query string
    vnpParams = req.query;
  } else {
    // Nếu là POST request, kiểm tra cả body và query
    // TH VNPAY gửi POST nhưng tham số nằm trong URL
    if (Object.keys(req.body).length > 0) {
      vnpParams = req.body;
    } else if (Object.keys(req.query).length > 0) {
      vnpParams = req.query;
    }
  }

  console.log(`VNPAY IPN ${req.method} Request:`, JSON.stringify(vnpParams));

  // Xử lý thông báo thanh toán
  try {
    const result = await paymentService.processVnpayIpn(vnpParams);

    // VNPAY yêu cầu luôn trả về status code 200 cho IPN
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi xử lý IPN:", error);
    // Vẫn trả về 200 nhưng với thông báo lỗi theo định dạng VNPAY
    return res.status(200).json({
      RspCode: "99",
      Message: "Error Processing",
    });
  }
});

/**
 * TEST VNPAY CALLBACK (DEVELOPMENT ONLY)
 *
 * Business Logic:
 * - API test để kiểm tra xử lý callback từ VNPay trong môi trường dev
 * - Nhận query params giống như vnpayCallback
 * - Xử lý và trả về JSON response thay vì redirect
 * - Dùng để debug và test payment flow
 *
 * @access  Public (Testing purpose)
 * @route   GET /api/user/orders/vnpay/test-callback
 * @query   { vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash, ... }
 * @flow    Test tool → order.route.js → order.controller.js → payment.service.js → processPaymentResult()
 */
const testVnpayCallback = asyncHandler(async (req, res) => {
  const vnpParams = req.query;

  console.log("Xử lý VNPAY test callback:", JSON.stringify(vnpParams));

  // Xử lý kết quả thanh toán
  const paymentResult = await paymentService.processPaymentResult(vnpParams);

  res.status(200).json({
    success: true,
    message: "Đã xử lý callback VNPAY test",
    data: paymentResult,
  });
});

/**
 * LẤY DANH SÁCH YÊU CẦU HUỶ ĐƠN CỦA USER
 *
 * Business Logic:
 * - User chỉ xem được yêu cầu huỷ của chính mình (auto filter by req.user.id)
 * - Filter: status (pending/approved/rejected)
 * - Pagination: page, limit
 * - Populate: order (code, status, payment, totalAmount, createdAt)
 * - Hiển thị trạng thái xử lý: pending (chờ duyệt), approved (đã chấp nhận), rejected (từ chối)
 *
 * @access  Authenticated User (Auto filter by userId)
 * @route   GET /api/user/orders/cancel-requests?page=1&limit=20&status=pending
 * @query   { page, limit, status }
 * @flow    order.route.js (user) → order.controller.js → order.service.js → getUserCancelRequests()
 */
const getUserCancelRequests = asyncHandler(async (req, res) => {
  const result = await orderService.getUserCancelRequests(
    req.user._id,
    req.query
  );

  res.status(200).json({
    success: true,
    message: "Lấy danh sách yêu cầu hủy đơn hàng thành công",
    data: result,
  });
});

/**
 * USER GỬI THÔNG TIN NGÂN HÀNG ĐỂ NHẬN HOÀN TIỀN
 *
 * Business Logic:
 * - Khi đơn hàng giao thất bại 3 lần → returning_to_warehouse
 * - Nếu user đã thanh toán (VNPAY) → cần hoàn tiền
 * - User điền thông tin ngân hàng để admin chuyển khoản hoàn tiền
 *
 * @access  Authenticated User
 * @route   POST /api/user/orders/:id/refund-bank-info
 * @body    { bankName, accountNumber, accountName }
 */
const submitRefundBankInfo = asyncHandler(async (req, res) => {
  const { bankName, accountNumber, accountName } = req.body;

  const result = await orderService.submitRefundBankInfo(
    req.params.id,
    req.user._id,
    { bankName, accountNumber, accountName }
  );

  res.status(200).json(result);
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  repayOrder,
  vnpayCallback,
  vnpayIpn,
  testVnpayCallback,
  getUserCancelRequests,
  submitRefundBankInfo,
};
