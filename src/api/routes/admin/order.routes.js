const express = require("express");
const router = express.Router();

const orderController = require("@controllers/admin/order.controller");
const orderValidator = require("@validators/order.validator");
const validate = require("@utils/validatehelper");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);
// Bỏ router.use(requireStaff) để phân quyền chi tiết cho từng route

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Lấy danh sách tất cả đơn hàng
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(orderValidator.validateGetOrders),
  orderController.getOrders
);

/**
 * @route   GET /api/v1/admin/orders/cancel-requests
 * @desc    Lấy danh sách yêu cầu hủy đơn hàng
 * @access  Staff/Admin
 */
router.get(
  "/cancel-requests",
  requireStaffOrAdmin,
  validate(orderValidator.validateGetCancelRequests),
  orderController.getCancelRequests
);

/**
 * @route   GET /api/v1/admin/orders/pending-refunds
 * @desc    Lấy danh sách đơn hàng cần hoàn tiền
 * @access  Staff/Admin
 */
router.get(
  "/pending-refunds",
  requireStaffOrAdmin,
  orderController.getPendingRefunds
);

/**
 * @route   PATCH /api/v1/admin/orders/cancel-requests/:id
 * @desc    Xử lý yêu cầu hủy đơn hàng
 * @access  Staff, Admin
 */
router.patch(
  "/cancel-requests/:id",
  requireStaffOrAdmin,
  orderController.processCancelRequest
);

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Lấy chi tiết đơn hàng
 * @access  Staff (read-only), Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(orderValidator.validateGetOrder),
  orderController.getOrderById
);

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @desc    Cập nhật trạng thái đơn hàng
 * @access  Staff, Admin
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(orderValidator.validateUpdateOrderStatus),
  orderController.updateOrderStatus
);

/**
 * @route   POST /api/v1/admin/orders/:id/confirm-return
 * @desc    Xác nhận nhận hàng trả về
 * @access  Staff/Admin
 */
router.post(
  "/:id/confirm-return",
  requireStaffOrAdmin,
  orderController.confirmReturn
);

/**
 * @route   POST /api/v1/admin/orders/:id/confirm-refund
 * @desc    Admin xác nhận đã hoàn tiền cho đơn hàng
 * @access  Admin Only
 */
router.post(
  "/:id/confirm-refund",
  requireStaffOrAdmin,
  orderController.confirmRefund
);

module.exports = router;
