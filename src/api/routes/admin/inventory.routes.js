const express = require("express");
const router = express.Router();
const inventoryController = require("@controllers/admin/inventory.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const validate = require("@utils/validatehelper");
const {
  validateStockIn,
  validateStockOut,
  validateAdjustStock,
  validateCalculatePrice,
  validateUpdateThreshold,
  validateGetInventory,
  validateGetTransactions,
  validateInventoryId,
} = require("@validators/inventory.validator");

/**
 * ADMIN/STAFF INVENTORY ROUTES
 * Quản lý kho hàng, nhập/xuất/điều chỉnh tồn kho
 */

// Tất cả routes yêu cầu đăng nhập và quyền Staff/Admin
router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route   GET /api/v1/admin/inventory/stats
 * @desc    Lấy thống kê tổng quan kho hàng cho dashboard
 * @access  Staff/Admin
 */
router.get("/stats", inventoryController.getInventoryStats);

/**
 * @route   GET /api/v1/admin/inventory/transactions
 * @desc    Lấy lịch sử giao dịch kho (IN/OUT/ADJUST) với filter chi tiết
 * @query   page, limit, type (IN|OUT|ADJUST), productId, variantId, sizeId, startDate, endDate
 * @access  Staff/Admin
 */
router.get(
  "/transactions",
  validate(validateGetTransactions),
  inventoryController.getTransactionHistory
);

/**
 * @route   GET /api/v1/admin/inventory
 * @desc    Lấy danh sách tồn kho với phân trang và filter
 * @query   page, limit, productId, lowStock, outOfStock, sortBy, sortOrder
 * @access  Staff/Admin
 */
router.get(
  "/",
  validate(validateGetInventory),
  inventoryController.getInventoryList
);

/**
 * @route   GET /api/v1/admin/inventory/:id
 * @desc    Lấy chi tiết một mục tồn kho cụ thể
 * @params  id - InventoryItem ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  validate(validateInventoryId),
  inventoryController.getInventoryDetail
);

/**
 * @route   POST /api/v1/admin/inventory/stock-in
 * @desc    Nhập hàng vào kho (manual) - Tính weighted average cost, tạo SKU, cập nhật giá
 * @body    productId, variantId, sizeId, quantity, costPrice, targetProfitPercent, percentDiscount, note
 * @access  Staff/Admin
 */
router.post(
  "/stock-in",
  validate(validateStockIn),
  inventoryController.stockIn
);

/**
 * @route   POST /api/v1/admin/inventory/stock-out
 * @desc    Xuất hàng khỏi kho thủ công (không qua order)
 * @body    productId, variantId, sizeId, quantity, note, orderId (optional)
 * @access  Staff/Admin
 */
router.post(
  "/stock-out",
  validate(validateStockOut),
  inventoryController.stockOut
);

/**
 * @route   POST /api/v1/admin/inventory/adjust
 * @desc    Điều chỉnh số lượng tồn kho thủ công (kiểm kê, sửa sai số liệu)
 * @body    productId, variantId, sizeId, newQuantity, reason
 * @access  Staff/Admin
 */
router.post(
  "/adjust",
  validate(validateAdjustStock),
  inventoryController.adjustStock
);

/**
 * @route   POST /api/v1/admin/inventory/calculate-price
 * @desc    Helper API - Tính giá bán từ giá vốn (không lưu DB)
 * @body    costPrice, targetProfitPercent, percentDiscount
 * @return  calculatedPrice, calculatedPriceFinal, profitPerItem, margin, markup
 * @access  Staff/Admin
 */
router.post(
  "/calculate-price",
  validate(validateCalculatePrice),
  inventoryController.calculatePrice
);

/**
 * @route   PATCH /api/v1/admin/inventory/:id/low-stock-threshold
 * @desc    Cập nhật ngưỡng cảnh báo tồn kho thấp
 * @params  id - InventoryItem ID
 * @body    lowStockThreshold (number)
 * @access  Staff/Admin
 */
router.patch(
  "/:id/low-stock-threshold",
  validate(validateUpdateThreshold),
  inventoryController.updateLowStockThreshold
);

module.exports = router;
