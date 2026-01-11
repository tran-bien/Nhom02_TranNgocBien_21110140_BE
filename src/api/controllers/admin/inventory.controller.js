const asyncHandler = require("express-async-handler");
const inventoryService = require("@services/inventory.service");

/**
 * Nhập hàng vào kho (manual)
 * Tính weighted average cost, generate SKU, update pricing
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route POST /api/v1/admin/inventory/stock-in
 */
const stockIn = asyncHandler(async (req, res) => {
  const {
    productId,
    variantId,
    sizeId,
    quantity,
    costPrice,
    targetProfitPercent,
    percentDiscount,
    note,
  } = req.body;

  const result = await inventoryService.stockIn(
    {
      product: productId,
      variant: variantId,
      size: sizeId,
      quantity,
      costPrice,
      targetProfitPercent,
      percentDiscount,
      notes: note,
    },
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: "Nhập hàng thành công",
    data: result,
  });
});

/**
 * Xuất hàng khỏi kho (manual)
 * Kiểm tra tồn kho, trừ số lượng
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route POST /api/v1/admin/inventory/stock-out
 */
const stockOut = asyncHandler(async (req, res) => {
  const { productId, variantId, sizeId, quantity, note, reason } = req.body;

  const result = await inventoryService.stockOut(
    {
      product: productId,
      variant: variantId,
      size: sizeId,
      quantity,
      reason: reason || "manual",
      notes: note,
    },
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Xuất hàng thành công",
    data: result,
  });
});

/**
 * Điều chỉnh số lượng tồn kho (kiểm kê)
 * Đặt số lượng mới trực tiếp
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route POST /api/v1/admin/inventory/adjust
 */
const adjustStock = asyncHandler(async (req, res) => {
  const { productId, variantId, sizeId, newQuantity, reason, note } = req.body;

  const result = await inventoryService.adjustStock(
    {
      product: productId,
      variant: variantId,
      size: sizeId,
      newQuantity,
      reason: reason || "adjustment",
      notes: note,
    },
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Điều chỉnh tồn kho thành công",
    data: result,
  });
});

/**
 * Lấy danh sách tồn kho với filter
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route GET /api/v1/admin/inventory?page=1&limit=20&productId=...&variantId=...&lowStock=true
 */
const getInventoryList = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    productId,
    variantId,
    lowStock,
    outOfStock,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await inventoryService.getInventoryList(
    {},
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      product: productId,
      variant: variantId,
      lowStock: lowStock === "true",
      outOfStock: outOfStock === "true",
      sortBy,
      sortOrder,
    }
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Lấy chi tiết một InventoryItem
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route GET /api/v1/admin/inventory/:id
 */
const getInventoryDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const inventory = await inventoryService.getInventoryById(id);

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

/**
 * Lấy lịch sử giao dịch kho với filter chi tiết
 * Filter: type (IN/OUT/ADJUST), productId, variantId, sizeId, startDate, endDate
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route GET /api/v1/admin/inventory/transactions?type=IN&productId=...
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    productId,
    variantId,
    sizeId,
    type,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await inventoryService.getTransactionHistory({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    productId,
    variantId,
    sizeId,
    type,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Lấy thống kê kho hàng cho dashboard
 * Returns: totalItems, lowStockItems, outOfStockItems, totalValue
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route GET /api/v1/admin/inventory/stats
 */
const getInventoryStats = asyncHandler(async (req, res) => {
  const stats = await inventoryService.getInventoryStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * Helper API - Tính giá bán từ giá vốn (không lưu DB)
 * Returns: calculatedPrice, calculatedPriceFinal, profitPerItem, margin, markup
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route POST /api/v1/admin/inventory/calculate-price
 */
const calculatePrice = asyncHandler(async (req, res) => {
  const { costPrice, targetProfitPercent, percentDiscount } = req.body;

  const priceInfo = inventoryService.calculatePrice(
    costPrice,
    targetProfitPercent,
    percentDiscount
  );

  res.status(200).json({
    success: true,
    data: priceInfo,
  });
});

/**
 * Cập nhật ngưỡng cảnh báo tồn kho thấp
 * @access Staff/Admin (requireStaffOrAdmin middleware)
 * @route PATCH /api/v1/admin/inventory/:id/low-stock-threshold
 */
const updateLowStockThreshold = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lowStockThreshold } = req.body;

  const inventory = await inventoryService.updateLowStockThreshold(
    id,
    lowStockThreshold
  );

  res.status(200).json({
    success: true,
    message: "Cập nhật ngưỡng cảnh báo thành công",
    data: inventory,
  });
});

module.exports = {
  stockIn,
  stockOut,
  adjustStock,
  getInventoryList,
  getInventoryDetail,
  getTransactionHistory,
  getInventoryStats,
  calculatePrice,
  updateLowStockThreshold,
};
