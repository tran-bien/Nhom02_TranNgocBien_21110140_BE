const asyncHandler = require("express-async-handler");
const shipperService = require("@services/shipper.service");
const returnService = require("@services/return.service");

/**
 * SHIPPER CONTROLLER
 * Chứa các endpoints dành cho Shipper quản lý đơn hàng và trạng thái giao hàng
 * + Quản lý trả hàng/hoàn tiền
 */

/**
 * Cập nhật trạng thái giao hàng
 * @access  Shipper (requireShipper middleware)
 * @route   PATCH /api/v1/shipper/delivery-status/:orderId
 */
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, note, images, location } = req.body;
  const shipperId = req.user._id;

  const result = await shipperService.updateDeliveryStatus(orderId, shipperId, {
    status,
    note,
    images,
    location,
  });

  res.status(200).json({
    success: true,
    message: "Cập nhật trạng thái giao hàng thành công",
    data: result,
  });
});

/**
 * Lấy danh sách đơn hàng của shipper
 * @access  Shipper (requireShipper middleware)
 * @route   GET /api/v1/shipper/my-orders
 */
const getShipperOrders = asyncHandler(async (req, res) => {
  const shipperId = req.user._id;

  const result = await shipperService.getShipperOrders(shipperId, req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Cập nhật trạng thái sẵn sàng của shipper
 * @access  Shipper (requireShipper middleware)
 * @route   PATCH /api/v1/shipper/availability
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const shipperId = req.user._id;
  const { isAvailable } = req.body;

  const result = await shipperService.updateShipperAvailability(
    shipperId,
    isAvailable
  );

  res.status(200).json({
    success: true,
    message: `Đã ${isAvailable ? "bật" : "tắt"} trạng thái sẵn sàng`,
    data: result,
  });
});

/**
 * Lấy thống kê của shipper (chính mình)
 * @access  Shipper (requireShipper middleware)
 * @route   GET /api/v1/shipper/stats
 */
const getMyStats = asyncHandler(async (req, res) => {
  const shipperId = req.user._id;

  const stats = await shipperService.getShipperStats(shipperId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// ==================== RETURN HANDLING ====================

/**
 * Lấy danh sách yêu cầu trả hàng được giao cho shipper
 * @access  Shipper (requireShipper middleware)
 * @route   GET /api/v1/shipper/returns
 */
const getShipperReturns = asyncHandler(async (req, res) => {
  const shipperId = req.user._id;
  const { page, limit, status } = req.query;

  const result = await returnService.getShipperReturnRequests(shipperId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Lấy chi tiết yêu cầu trả hàng
 * @access  Shipper (requireShipper middleware)
 * @route   GET /api/v1/shipper/returns/:id
 */
const getReturnDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipperId = req.user._id;

  // Get return and verify shipper has access
  const returnRequest = await returnService.getReturnRequestById(
    id,
    shipperId,
    false // not admin
  );

  // Verify this return is assigned to this shipper
  if (
    !returnRequest.assignedShipper ||
    returnRequest.assignedShipper._id.toString() !== shipperId.toString()
  ) {
    const error = new Error("Không có quyền truy cập yêu cầu trả hàng này");
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * Xác nhận đã nhận hàng trả từ khách
 * @access  Shipper (requireShipper middleware)
 * @route   PATCH /api/v1/shipper/returns/:id/confirm-received
 */
const confirmReturnReceived = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const shipperId = req.user._id;

  const result = await returnService.shipperConfirmReceived(
    id,
    shipperId,
    note
  );

  res.status(200).json({
    success: true,
    message: "Đã xác nhận nhận hàng trả từ khách",
    data: result,
  });
});

/**
 * Xác nhận đã giao tiền hoàn cho khách (cash refund)
 * @access  Shipper (requireShipper middleware)
 * @route   PATCH /api/v1/shipper/returns/:id/confirm-refund-delivered
 */
const confirmRefundDelivered = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const shipperId = req.user._id;

  const result = await returnService.shipperConfirmRefundDelivered(
    id,
    shipperId,
    note
  );

  res.status(200).json({
    success: true,
    message: "Đã xác nhận giao tiền hoàn cho khách",
    data: result,
  });
});

module.exports = {
  updateDeliveryStatus,
  getShipperOrders,
  updateAvailability,
  getMyStats,
  // Return handling
  getShipperReturns,
  getReturnDetail,
  confirmReturnReceived,
  confirmRefundDelivered,
};
