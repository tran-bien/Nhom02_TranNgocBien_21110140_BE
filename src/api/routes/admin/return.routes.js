const express = require("express");
const router = express.Router();
const returnController = require("@controllers/admin/return.controller");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const validate = require("@utils/validatehelper");
const {
  validateApproveReturn,
  validateRejectReturn,
  validateGetReturns,
  validateReturnId,
  validateAssignShipper,
  validateAdminConfirmTransfer,
} = require("@validators/return.validator");

/**
 * ADMIN RETURN ROUTES
 * Chỉ dành cho Admin/Staff quản lý yêu cầu trả hàng
 * (Đã loại bỏ logic đổi hàng - chỉ có trả hàng/hoàn tiền)
 */

router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route   GET /api/v1/admin/returns/stats/summary
 * @desc    Lấy thống kê trả hàng
 * @access  Staff/Admin
 */
router.get("/stats/summary", returnController.getReturnStats);

/**
 * @route   GET /api/v1/admin/returns
 * @desc    Lấy tất cả yêu cầu trả hàng (admin view)
 * @access  Staff/Admin
 */
router.get(
  "/",
  validate(validateGetReturns),
  returnController.getReturnRequests
);

/**
 * @route   GET /api/v1/admin/returns/:id
 * @desc    Lấy chi tiết yêu cầu trả hàng
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  validate(validateReturnId),
  returnController.getReturnRequestDetail
);

/**
 * @route   PATCH /api/v1/admin/returns/:id/approve
 * @desc    Phê duyệt yêu cầu trả hàng
 * @access  Staff/Admin
 */
router.patch(
  "/:id/approve",
  validate(validateApproveReturn),
  returnController.approveReturnRequest
);

/**
 * @route   PATCH /api/v1/admin/returns/:id/reject
 * @desc    Từ chối yêu cầu trả hàng
 * @access  Staff/Admin
 */
router.patch(
  "/:id/reject",
  validate(validateRejectReturn),
  returnController.rejectReturnRequest
);

/**
 * @route   PATCH /api/v1/admin/returns/:id/assign-shipper
 * @desc    Phân công shipper lấy hàng trả
 * @access  Staff/Admin
 */
router.patch(
  "/:id/assign-shipper",
  validate(validateAssignShipper),
  returnController.assignShipperForReturn
);

/**
 * @route   PATCH /api/v1/admin/returns/:id/confirm-transfer
 * @desc    Xác nhận đã chuyển khoản hoàn tiền (bank_transfer)
 * @access  Staff/Admin
 */
router.patch(
  "/:id/confirm-transfer",
  validate(validateAdminConfirmTransfer),
  returnController.confirmBankTransfer
);

/**
 * @route   PATCH /api/v1/admin/returns/:id/approve-cancel
 * @desc    Duyệt/từ chối yêu cầu hủy trả hàng từ khách
 * @access  Staff/Admin
 */
router.patch(
  "/:id/approve-cancel",
  validate(validateReturnId),
  returnController.approveCancelReturn
);

module.exports = router;
