const express = require("express");
const router = express.Router();
const dashboardController = require("@controllers/admin/dashboard.controller");
const {
  protect,
  requireStaff,
  requireAdminOnly,
} = require("@middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Lấy dữ liệu dashboard (chỉ dành cho Admin)
 * @access  Admin Only
 */
router.get("/", requireAdminOnly, dashboardController.getDashboardData);

/**
 * @route   GET /api/v1/admin/dashboard/revenue/daily
 * @desc    Lấy dữ liệu doanh thu theo ngày
 * @access  Admin Only
 */
router.get(
  "/revenue/daily",
  requireAdminOnly,
  dashboardController.getDailyRevenue
);

/**
 * @route   GET /api/v1/admin/dashboard/revenue/monthly
 * @desc    Lấy dữ liệu doanh thu theo tháng
 * @access  Admin Only
 */
router.get(
  "/revenue/monthly",
  requireAdminOnly,
  dashboardController.getMonthlyRevenue
);

/**
 * @route   GET /api/v1/admin/dashboard/top-selling-products
 * @desc    Lấy dữ liệu sản phẩm bán chạy nhất với các tham số truy vấn (period: 'week', 'month', 'year')
 * @access  Admin Only
 */
router.get(
  "/top-selling-products",
  requireAdminOnly,
  dashboardController.getTopSellingProducts
);

module.exports = router;
