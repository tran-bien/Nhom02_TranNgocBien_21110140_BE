const express = require("express");
const router = express.Router();
const colorController = require("@controllers/admin/color.controller");
const colorValidator = require("@validators/color.validator");
const validate = require("@utils/validatehelper");
const {
  protect,
  requireStaff,
  requireStaffOrAdmin,
  requireStaffReadOnly,
} = require("@middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/admin/colors
 * @desc    Lấy danh sách tất cả màu sắc (admin)
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(colorValidator.validateListQuery),
  colorController.getAllColors
);

/**
 * @route   GET /api/v1/admin/colors/deleted
 * @desc    Lấy danh sách màu sắc đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(colorValidator.validateListQuery),
  colorController.getDeletedColors
);

/**
 * @route   GET /api/v1/admin/colors/:id
 * @desc    Lấy thông tin chi tiết màu sắc theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(colorValidator.validateColorId),
  colorController.getColorById
);

/**
 * @route   POST /api/v1/admin/colors
 * @desc    Tạo màu sắc mới
 * @access  Staff/Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(colorValidator.validateCreateColor),
  colorController.createColor
);

/**
 * @route   PUT /api/v1/admin/colors/:id
 * @desc    Cập nhật màu sắc
 * @access  Admin Only
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(colorValidator.validateUpdateColor),
  colorController.updateColor
);

/**
 * @route   DELETE /api/v1/admin/colors/:id
 * @desc    Xóa màu sắc (soft delete)
 * @access  Admin Only
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(colorValidator.validateColorId),
  colorController.deleteColor
);

/**
 * @route   PUT /api/v1/admin/colors/:id/restore
 * @desc    Khôi phục màu sắc đã xóa
 * @access  Admin Only
 */
router.put(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(colorValidator.validateColorId),
  colorController.restoreColor
);

module.exports = router;
