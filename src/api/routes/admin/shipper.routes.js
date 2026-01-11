const express = require("express");
const router = express.Router();
const shipperController = require("@controllers/admin/shipper.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const validate = require("@utils/validatehelper");
const {
  validateAssignOrder,
  validateGetShippers,
  validateShipperId,
} = require("@validators/shipper.validator");

/**
 * ADMIN/STAFF SHIPPER MANAGEMENT ROUTES
 * Quản lý shipper, gán đơn hàng, xem thống kê
 */

router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route   GET /api/v1/admin/shippers
 * @desc    Lấy danh sách shipper
 * @access  Staff/Admin
 */
router.get("/", validate(validateGetShippers), shipperController.getShippers);

/**
 * @route   GET /api/v1/admin/shippers/:shipperId
 * @desc    Lấy thông tin chi tiết shipper
 * @access  Staff/Admin
 */
router.get(
  "/:shipperId",
  validate(validateShipperId),
  shipperController.getShipperDetail
);

/**
 * @route   GET /api/v1/admin/shippers/:shipperId/stats
 * @desc    Lấy thống kê của shipper
 * @access  Staff/Admin
 */
router.get(
  "/:shipperId/stats",
  validate(validateShipperId),
  shipperController.getShipperStats
);

/**
 * @route   POST /api/v1/admin/shippers/assign/:orderId
 * @desc    Gán đơn hàng cho shipper
 * @access  Staff/Admin
 */
router.post(
  "/assign/:orderId",
  validate(validateAssignOrder),
  shipperController.assignOrderToShipper
);

module.exports = router;
