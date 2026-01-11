const asyncHandler = require("express-async-handler");
const returnService = require("@services/return.service");

/**
 * ADMIN RETURN CONTROLLER
 * Chứa các endpoints dành cho Admin/Staff quản lý trả hàng/hoàn tiền
 * (Đã loại bỏ logic đổi hàng - chỉ có trả hàng/hoàn tiền)
 */

/**
 * LẤY DANH SÁCH YÊU CẦU TRẢ HÀNG (ADMIN)
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/returns?page=1&limit=20&status=pending
 */
const getReturnRequests = asyncHandler(async (req, res) => {
  const { page, limit, status, customerId } = req.query;

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  };

  if (status) {
    options.status = status;
  }

  if (customerId) {
    options.customerId = customerId;
  }

  const result = await returnService.getReturnRequests({}, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * LẤY CHI TIẾT YÊU CẦU TRẢ HÀNG (ADMIN)
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/returns/:id
 */
const getReturnRequestDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const isAdmin = true;

  const returnRequest = await returnService.getReturnRequestById(
    id,
    userId,
    isAdmin
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * DUYỆT YÊU CẦU TRẢ HÀNG
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   PATCH /api/v1/admin/returns/:id/approve
 */
const approveReturnRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const returnRequest = await returnService.approveReturnRequest(
    id,
    req.user._id,
    note
  );

  res.status(200).json({
    success: true,
    message: "Phê duyệt yêu cầu trả hàng thành công",
    data: returnRequest,
  });
});

/**
 * TỪ CHỐI YÊU CẦU TRẢ HÀNG
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   PATCH /api/v1/admin/returns/:id/reject
 */
const rejectReturnRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const returnRequest = await returnService.rejectReturnRequest(
    id,
    req.user._id,
    reason
  );

  res.status(200).json({
    success: true,
    message: "Từ chối yêu cầu trả hàng",
    data: returnRequest,
  });
});

/**
 * PHÂN CÔNG SHIPPER LẤY HÀNG TRẢ
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   PATCH /api/v1/admin/returns/:id/assign-shipper
 */
const assignShipperForReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { shipperId } = req.body;

  const result = await returnService.assignShipperForReturn(
    id,
    shipperId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Đã phân công shipper lấy hàng trả",
    data: result,
  });
});

/**
 * XÁC NHẬN ĐÃ CHUYỂN KHOẢN HOÀN TIỀN (BANK_TRANSFER)
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   PATCH /api/v1/admin/returns/:id/confirm-transfer
 */
const confirmBankTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const result = await returnService.adminConfirmBankTransfer(
    id,
    req.user._id,
    note
  );

  res.status(200).json({
    success: true,
    message: "Đã xác nhận chuyển khoản hoàn tiền",
    data: result,
  });
});

/**
 * LẤY THỐNG KÊ YÊU CẦU TRẢ HÀNG
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   GET /api/v1/admin/returns/stats/summary
 */
const getReturnStats = asyncHandler(async (req, res) => {
  const stats = await returnService.getReturnStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * DUYỆT YÊU CẦU HỦY TRẢ HÀNG
 * - Nếu duyệt: Order về "delivered", không cho trả lại nữa
 * - Shipper được hoàn thành đơn (không cần lấy nữa)
 * @access  Staff/Admin (requireStaffOrAdmin middleware)
 * @route   PATCH /api/v1/admin/returns/:id/approve-cancel
 */
const approveCancelReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, note } = req.body;

  const result = await returnService.adminApproveCancelReturn(
    id,
    req.user._id,
    approved,
    note
  );

  const message = approved
    ? "Duyệt hủy trả hàng thành công. Đơn hàng về trạng thái đã giao."
    : "Từ chối hủy trả hàng. Tiếp tục quy trình trả hàng.";

  res.status(200).json({
    success: true,
    message,
    data: result,
  });
});

module.exports = {
  getReturnRequests,
  getReturnRequestDetail,
  approveReturnRequest,
  rejectReturnRequest,
  assignShipperForReturn,
  confirmBankTransfer,
  getReturnStats,
  approveCancelReturn,
};
