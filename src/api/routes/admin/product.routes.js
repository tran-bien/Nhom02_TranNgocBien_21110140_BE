const express = require("express");
const router = express.Router();
const productController = require("@controllers/admin/product.controller");
const productValidator = require("@validators/product.validator");
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
 * @route   GET /api/v1/admin/products
 * @desc    Lấy danh sách tất cả sản phẩm
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(productValidator.validateAdminProductQuery),
  productController.getAllProducts
);

/**
 * @route   GET /api/v1/admin/products/deleted
 * @desc    Lấy danh sách sản phẩm đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(productValidator.validateAdminProductQuery),
  productController.getDeletedProducts
);

/**
 * @route   GET /api/v1/admin/products/:id
 * @desc    Lấy chi tiết sản phẩm theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(productValidator.validateProductId),
  productController.getProductById
);

/**
 * @route   POST /api/v1/admin/products
 * @desc    Tạo sản phẩm mới
 * @access  Admin Only
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(productValidator.validateCreateProduct),
  productController.createProduct
);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Cập nhật thông tin sản phẩm
 * @access  Admin Only
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(productValidator.validateUpdateProduct),
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Xóa mềm sản phẩm
 * @access  Admin Only
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(productValidator.validateProductId),
  productController.deleteProduct
);

/**
 * @route   PUT /api/v1/admin/products/:id/restore
 * @desc    Khôi phục sản phẩm đã xóa
 * @access  Admin Only
 */
router.put(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(productValidator.validateProductId),
  productController.restoreProduct
);

/**
 * @route   PATCH /api/v1/admin/products/:id/status
 * @desc    Cập nhật trạng thái active của sản phẩm
 * @access  Admin Only
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(productValidator.validateStatusUpdate),
  productController.updateProductStatus
);

/**
 * @route   POST /api/v1/admin/products/:id/update-stock-status
 * @desc    Cập nhật trạng thái tồn kho sản phẩm
 * @access  Admin Only
 */
router.post(
  "/:id/update-stock-status",
  requireStaffOrAdmin,
  validate(productValidator.validateProductId),
  productController.updateProductStockStatus
);

module.exports = router;
