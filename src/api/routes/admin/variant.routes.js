const express = require("express");
const router = express.Router();
const variantController = require("@controllers/admin/variant.controller");
const variantValidator = require("@validators/variant.validator");
const validate = require("@utils/validatehelper");
const {
  protect,
  requireStaff,
  requireStaffOrAdmin,
  requireStaffReadOnly,
} = require("@middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);
// Variant thuộc quản lý sản phẩm, staff có thể truy cập
// Riêng DELETE sẽ dùng requireStaffOrAdmin cho từng route

/**
 * @route   GET /api/v1/admin/variants
 * @desc    Lấy danh sách biến thể (có phân trang, filter)
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantQuery),
  variantController.getAllVariants
);

/**
 * @route   GET /api/v1/admin/variants/deleted
 * @desc    Lấy danh sách biến thể đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantQuery),
  variantController.getDeletedVariants
);

/**
 * @route   GET /api/v1/admin/variants/:id
 * @desc    Lấy chi tiết biến thể theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantId),
  variantController.getVariantById
);

/**
 * @route   POST /api/v1/admin/variants
 * @desc    Tạo biến thể mới
 * @access  Staff/Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantData),
  variantController.createVariant
);

/**
 * @route   PUT /api/v1/admin/variants/:id
 * @desc    Cập nhật thông tin biến thể
 * @access  Staff/Admin
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(variantValidator.validateUpdateVariant),
  variantController.updateVariant
);

/**
 * @route   DELETE /api/v1/admin/variants/:id
 * @desc    Xóa mềm biến thể
 * @access  Staff/Admin
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantId),
  variantController.deleteVariant
);

/**
 * @route   POST /api/v1/admin/variants/:id/restore
 * @desc    Khôi phục biến thể đã xóa
 * @access  Staff/Admin
 */
router.post(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantId),
  variantController.restoreVariant
);

/**
 * @route   PATCH /api/v1/admin/variants/:id/status
 * @desc    Cập nhật trạng thái active của biến thể
 * @access  Admin Only
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(variantValidator.validateStatusUpdate),
  variantController.updateVariantStatus
);

/**
 * @route   GET /api/v1/admin/variants/:id/size-constraints
 * @desc    Kiểm tra ràng buộc của các size trong variant (order, inventory)
 * @access  Staff/Admin
 */
router.get(
  "/:id/size-constraints",
  requireStaffOrAdmin,
  validate(variantValidator.validateVariantId),
  variantController.checkSizeConstraints
);

module.exports = router;
