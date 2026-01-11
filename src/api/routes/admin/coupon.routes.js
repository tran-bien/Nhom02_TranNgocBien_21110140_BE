const express = require("express");
const {
  protect,
  admin,
  requireStaffReadOnly,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");
const couponController = require("@controllers/admin/coupon.controller");
const couponValidator = require("@validators/coupon.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);
// Bỏ router.use(admin) để phân quyền chi tiết cho từng route

/**
 * @route   GET /api/v1/admin/coupons
 * @desc    Lấy danh sách mã giảm giá
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(couponValidator.validateGetCoupons),
  couponController.getAllCoupons
);

/**
 * @route   GET /api/v1/admin/coupons/:id
 * @desc    Lấy chi tiết mã giảm giá
 * @access  Staff/Admin
 */
router.get("/:id", requireStaffReadOnly, couponController.getCouponById);

/**
 * @route   POST /api/v1/admin/coupons
 * @desc    Tạo mã giảm giá mới
 * @access  Admin Only
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(couponValidator.validateCreateCoupon),
  couponController.createCoupon
);

/**
 * @route   PUT /api/v1/admin/coupons/:id
 * @desc    Cập nhật mã giảm giá
 * @access  Admin Only
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate(couponValidator.validateUpdateCoupon),
  couponController.updateCoupon
);

/**
 * @route   DELETE /api/v1/admin/coupons/:id
 * @desc    Xóa mã giảm giá
 * @access  Admin Only
 */
router.delete("/:id", requireStaffOrAdmin, couponController.deleteCoupon);

/**
 * @route   PATCH /api/v1/admin/coupons/:id/status
 * @desc    Cập nhật trạng thái mã giảm giá
 * @access  Admin Only
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(couponValidator.validateUpdateCouponStatus),
  couponController.updateCouponStatus
);

module.exports = router;
