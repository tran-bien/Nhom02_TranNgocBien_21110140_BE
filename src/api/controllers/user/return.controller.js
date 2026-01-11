const asyncHandler = require("express-async-handler");
const returnService = require("@services/return.service");

/**
 * USER RETURN CONTROLLER
 * Chứa các endpoints dành cho User/Customer quản lý trả hàng/hoàn tiền
 * (Đã loại bỏ logic đổi hàng - chỉ có trả hàng/hoàn tiền toàn bộ đơn)
 */

/**
 * TẠO YÊU CẦU TRẢ HÀNG/HOÀN TIỀN
 * @access  Authenticated User
 * @route   POST /api/v1/returns
 */
const createReturnRequest = asyncHandler(async (req, res) => {
  const {
    orderId,
    reason,
    reasonDetail,
    refundMethod,
    bankInfo,
    pickupAddressId,
  } = req.body;
  const customerId = req.user._id;

  // Validate images - bắt buộc phải có từ 1-5 ảnh
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng tải lên ít nhất 1 ảnh minh chứng lý do trả hàng",
    });
  }

  if (req.files.length > 5) {
    return res.status(400).json({
      success: false,
      message: "Chỉ được tải lên tối đa 5 ảnh",
    });
  }

  const returnRequest = await returnService.createReturnRequest(
    {
      orderId,
      reason,
      reasonDetail,
      refundMethod,
      bankInfo,
      pickupAddressId, // Thêm địa chỉ lấy hàng trả
    },
    customerId,
    req.files // Truyền files từ multer
  );

  res.status(201).json({
    success: true,
    message: "Tạo yêu cầu trả hàng thành công",
    data: returnRequest,
  });
});

/**
 * LẤY DANH SÁCH YÊU CẦU TRẢ HÀNG CỦA USER
 * @access  Authenticated User (isAuthenticated middleware)
 * @route   GET /api/v1/returns?page=1&limit=20&status=pending
 */
const getReturnRequests = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;

  const filters = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
    customerId: req.user._id, // Only get user's own requests
  };

  const result = await returnService.getReturnRequests(filters);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * LẤY CHI TIẾT YÊU CẦU TRẢ HÀNG
 * @access  Authenticated User (isAuthenticated middleware)
 * @route   GET /api/v1/returns/:id
 */
const getReturnRequestDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const isAdmin = false;

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
 * YÊU CẦU HỦY TRẢ HÀNG (ĐỔI Ý)
 * - Cho phép hủy khi: pending, approved, shipping
 * - Chuyển sang "cancel_pending" chờ admin duyệt
 * @access  Authenticated User (isAuthenticated middleware)
 * @route   PATCH /api/v1/users/returns/:id/cancel
 */
const cancelReturnRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const returnRequest = await returnService.cancelReturnRequest(
    id,
    req.user._id,
    reason
  );

  res.status(200).json({
    success: true,
    message: "Yêu cầu hủy trả hàng đã được gửi. Chờ admin duyệt.",
    data: returnRequest,
  });
});

module.exports = {
  createReturnRequest,
  getReturnRequests,
  getReturnRequestDetail,
  cancelReturnRequest,
};
