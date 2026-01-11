const asyncHandler = require("express-async-handler");
const shipperService = require("@services/shipper.service");

/**
 * ADMIN SHIPPER CONTROLLER
 * Chứa các endpoints dành cho Admin/Staff quản lý shipper
 */

/**
 * Lấy danh sách shipper
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/shippers
 */
const getShippers = asyncHandler(async (req, res) => {
  const result = await shipperService.getShippers(req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Gán đơn hàng cho shipper
 * - AUTO XUẤT KHO khi gán shipper thành công
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   POST /api/v1/admin/shippers/assign/:orderId
 */
const assignOrderToShipper = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { shipperId } = req.body;
  const assignedBy = req.user._id;

  const result = await shipperService.assignOrderToShipper(
    orderId,
    shipperId,
    assignedBy
  );

  res.status(200).json({
    success: true,
    message: "Gán đơn hàng cho shipper thành công",
    data: result,
  });
});

/**
 * Lấy thống kê của shipper
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/shippers/:shipperId/stats
 */
const getShipperStats = asyncHandler(async (req, res) => {
  const { shipperId } = req.params;

  const stats = await shipperService.getShipperStats(shipperId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * Lấy thông tin chi tiết shipper
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/shippers/:shipperId
 */
const getShipperDetail = asyncHandler(async (req, res) => {
  const { shipperId } = req.params;

  const shipper = await shipperService.getShipperById(shipperId);

  res.status(200).json({
    success: true,
    data: shipper,
  });
});

module.exports = {
  getShippers,
  assignOrderToShipper,
  getShipperStats,
  getShipperDetail,
};
