const express = require("express");
const {
  protect,
  requireStaff,
  requireStaffOrAdmin,
  requireStaffReadOnly,
} = require("@middlewares/auth.middleware");
const categoryController = require("@controllers/admin/category.controller");
const categoryValidator = require("@validators/category.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/admin/categories
 * @desc    Lấy tất cả danh mục (có phân trang, filter)
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryQuery),
  categoryController.getAllCategories
);

/**
 * @route   GET /api/v1/admin/categories/deleted
 * @desc    Lấy danh sách danh mục đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryQuery),
  categoryController.getDeletedCategories
);

/**
 * @route   GET /api/v1/admin/categories/:id
 * @desc    Lấy chi tiết danh mục theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryId),
  categoryController.getCategoryById
);

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Tạo mới danh mục
 * @access  Staff/Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryData),
  categoryController.createCategory
);

/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Cập nhật danh mục
 * @access  Staff/Admin
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate([
    ...categoryValidator.validateCategoryId,
    ...categoryValidator.validateCategoryData,
  ]),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Xóa mềm danh mục
 * @access  Staff/Admin
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryId),
  categoryController.deleteCategory
);

/**
 * @route   PUT /api/v1/admin/categories/:id/restore
 * @desc    Khôi phục danh mục đã xóa
 * @access  Staff/Admin
 */
router.put(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(categoryValidator.validateCategoryId),
  categoryController.restoreCategory
);

/**
 * @route   PATCH /api/v1/admin/categories/:id/status
 * @desc    Cập nhật trạng thái active của danh mục
 * @access  Staff/Admin
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(categoryValidator.validateStatusUpdate),
  categoryController.updateCategoryStatus
);

module.exports = router;
