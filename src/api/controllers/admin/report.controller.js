const asyncHandler = require("express-async-handler");
const reportService = require("@services/report.service");

/**
 * REPORT CONTROLLER
 *
 * Module này focus vào BÁO CÁO KHO HÀNG (Inventory Reports)
 *
 * Các API thống kê chung (doanh thu, sản phẩm bán chạy) đã có ở:
 * - Dashboard: /api/v1/admin/dashboard/*
 */

/**
 * Lấy báo cáo tồn kho chi tiết
 * Hiển thị sản phẩm sắp hết hàng, hết hàng với filter
 * @access Admin (requireAdminOnly middleware)
 * @route GET /api/v1/admin/reports/inventory
 */
const getInventoryReport = asyncHandler(async (req, res) => {
  const {
    lowStock = 5,
    category,
    sortBy = "stock",
    order = "asc",
    includeInactive = "false",
  } = req.query;

  const result = await reportService.getInventoryReport({
    lowStock,
    category,
    sortBy,
    order,
    includeInactive,
  });

  res.status(200).json(result);
});

module.exports = {
  getInventoryReport,
};
