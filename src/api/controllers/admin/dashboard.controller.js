const dashboardService = require("@services/dashboard.service");
const asyncHandler = require("express-async-handler");

const dashboardController = {
    /**
     * @route   GET /api/admin/dashboard
     * @desc    Lấy dữ liệu dashboard
     * @access  Admin
     */
    getDashboardData: asyncHandler(async (req, res) => {
        const result = await dashboardService.getDashboardData();
        res.status(200).json(result);
    }),

    /**
     * @route   GET /api/admin/dashboard/revenue
     * @desc    Lấy dữ liệu doanh thu
     * @access  Admin
     */
    getDailyRevenue: asyncHandler(async (req, res) => {
        const result = await dashboardService.getDailyRevenue(req.query);
        res.status(200).json(result);
    }),

    /**
     * @route   GET /api/admin/dashboard/revenue
     * @desc    Lấy dữ liệu doanh thu
     * @access  Admin
     */
    getMonthlyRevenue: asyncHandler(async (req, res) => {
        const result = await dashboardService.getMonthlyRevenue(req.query);
        res.status(200).json(result);
    }),

    /**
     * @route   GET /api/admin/dashboard/top-selling-products
     * @desc    Lấy dữ liệu sản phẩm bán chạy nhất với các tham số truy vấn (period: 'week', 'month', 'year')
     * @access  Admin
     */
    getTopSellingProducts: asyncHandler(async (req, res) => {
        const result = await dashboardService.getTopSellingProducts(req.query);
        res.status(200).json(result);
    }),
}

module.exports = dashboardController;
