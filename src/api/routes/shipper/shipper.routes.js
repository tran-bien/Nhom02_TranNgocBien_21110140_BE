const express = require("express");
const router = express.Router();
const shipperController = require("@controllers/shipper/shipper.controller");
const { protect, requireShipper } = require("@middlewares/auth.middleware");
const validate = require("@utils/validatehelper");
const {
  validateUpdateDeliveryStatus,
  validateUpdateAvailability,
  validateGetShipperOrders,
} = require("@validators/shipper.validator");
const {
  validateReturnId,
  validateShipperConfirm,
} = require("@validators/return.validator");

/**
 * SHIPPER ROUTES
 * Cho shipper quản lý đơn hàng được gán và cập nhật trạng thái giao hàng
 * + Quản lý trả hàng/hoàn tiền
 */

router.use(protect);
router.use(requireShipper);

// ==================== ORDER DELIVERY ====================

/**
 * @route   GET /api/v1/shipper/my-orders
 * @desc    Lấy danh sách đơn hàng của shipper
 * @access  Shipper
 */
router.get(
  "/my-orders",
  validate(validateGetShipperOrders),
  shipperController.getShipperOrders
);

/**
 * @route   PATCH /api/v1/shipper/delivery-status/:orderId
 * @desc    Cập nhật trạng thái giao hàng
 * @access  Shipper
 */
router.patch(
  "/delivery-status/:orderId",
  validate(validateUpdateDeliveryStatus),
  shipperController.updateDeliveryStatus
);

/**
 * @route   PATCH /api/v1/shipper/availability
 * @desc    Cập nhật trạng thái sẵn sàng
 * @access  Shipper
 */
router.patch(
  "/availability",
  validate(validateUpdateAvailability),
  shipperController.updateAvailability
);

/**
 * @route   GET /api/v1/shipper/stats
 * @desc    Lấy thống kê của shipper (chính mình)
 * @access  Shipper
 */
router.get("/stats", shipperController.getMyStats);

// ==================== RETURN HANDLING ====================

/**
 * @route   GET /api/v1/shipper/returns
 * @desc    Lấy danh sách yêu cầu trả hàng được giao cho shipper
 * @access  Shipper
 */
router.get("/returns", shipperController.getShipperReturns);

/**
 * @route   GET /api/v1/shipper/returns/:id
 * @desc    Lấy chi tiết yêu cầu trả hàng
 * @access  Shipper
 */
router.get(
  "/returns/:id",
  validate(validateReturnId),
  shipperController.getReturnDetail
);

/**
 * @route   PATCH /api/v1/shipper/returns/:id/confirm-received
 * @desc    Xác nhận đã nhận hàng trả từ khách
 * @access  Shipper
 */
router.patch(
  "/returns/:id/confirm-received",
  validate(validateShipperConfirm),
  shipperController.confirmReturnReceived
);

/**
 * @route   PATCH /api/v1/shipper/returns/:id/confirm-refund-delivered
 * @desc    Xác nhận đã giao tiền hoàn cho khách (cash refund)
 * @access  Shipper
 */
router.patch(
  "/returns/:id/confirm-refund-delivered",
  validate(validateShipperConfirm),
  shipperController.confirmRefundDelivered
);

module.exports = router;
