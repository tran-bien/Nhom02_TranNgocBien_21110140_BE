const express = require("express");
const router = express.Router();
const reportController = require("@controllers/admin/report.controller");
const { protect, requireAdminOnly } = require("@middlewares/auth.middleware");

/**
 * REPORT ROUTES - BÁO CÁO KHO HÀNG
 *
 * Module này focus vào báo cáo tồn kho chi tiết.
 *
 * Các API thống kê chung đã có ở Dashboard module:
 * - GET /api/v1/admin/dashboard - Thống kê tổng quan
 * - GET /api/v1/admin/dashboard/revenue/daily - Doanh thu theo ngày
 * - GET /api/v1/admin/dashboard/revenue/monthly - Doanh thu theo tháng
 * - GET /api/v1/admin/dashboard/top-selling-products - Sản phẩm bán chạy
 *
 * Thống kê kho hàng cơ bản đã có ở Inventory module:
 * - GET /api/v1/admin/inventory/stats - Thống kê tồn kho cơ bản
 * - GET /api/v1/admin/inventory/transactions - Lịch sử giao dịch kho
 */

// Áp dụng middleware xác thực cho tất cả các routes - CHỈ ADMIN
router.use(protect);
router.use(requireAdminOnly);

/**
 * @route   GET /api/v1/admin/reports/inventory
 * @desc    Báo cáo tồn kho chi tiết (sản phẩm sắp hết hàng, hết hàng)
 * @query   lowStock (number) - Ngưỡng cảnh báo hết hàng (mặc định: 5)
 * @query   category (ObjectId) - Lọc theo danh mục
 * @query   sortBy ('stock' | 'name') - Sắp xếp theo
 * @query   order ('asc' | 'desc') - Thứ tự sắp xếp
 * @query   includeInactive ('true' | 'false') - Bao gồm sản phẩm không active
 * @access  Admin
 */
router.get("/inventory", reportController.getInventoryReport);

module.exports = router;
