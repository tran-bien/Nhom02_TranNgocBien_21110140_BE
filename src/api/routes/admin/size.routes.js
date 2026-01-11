const express = require("express");
const router = express.Router();
const sizeController = require("@controllers/admin/size.controller");
const sizeValidator = require("@validators/size.validator");
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
 * @route   GET /api/v1/admin/sizes
 * @desc    Lấy danh sách tất cả kích thước (admin)
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(sizeValidator.validateListQuery),
  sizeController.getAllSizes
);

/**
 * @route   GET /api/v1/admin/sizes/deleted
 * @desc    Lấy danh sách kích thước đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(sizeValidator.validateListQuery),
  sizeController.getDeletedSizes
);

/**
 * @route   GET /api/v1/admin/sizes/:id
 * @desc    Lấy thông tin chi tiết kích thước theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(sizeValidator.validateSizeId),
  sizeController.getSizeById
);

/**
 * @route   POST /api/v1/admin/sizes
 * @desc    Tạo kích thước mới
 * @access  Staff/Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(sizeValidator.validateCreateSize),
  sizeController.createSize
);

/**
 * @route   PUT /api/v1/admin/sizes/:id
 * @desc    Cập nhật kích thước
 * @access  Admin Only
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(sizeValidator.validateUpdateSize),
  sizeController.updateSize
);

/**
 * @route   DELETE /api/v1/admin/sizes/:id
 * @desc    Xóa kích thước (soft delete)
 * @access  Admin Only
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(sizeValidator.validateSizeId),
  sizeController.deleteSize
);

/**
 * @route   PUT /api/v1/admin/sizes/:id/restore
 * @desc    Khôi phục kích thước đã xóa
 * @access  Admin Only
 */
router.put(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(sizeValidator.validateSizeId),
  sizeController.restoreSize
);

module.exports = router;
