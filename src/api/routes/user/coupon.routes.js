const express = require("express");
const { protect } = require("@middlewares/auth.middleware");
const couponController = require("@controllers/user/coupon.controller");
const validate = require("@utils/validatehelper");
const { validateCollectCoupon } = require("@validators/coupon.validator");

const router = express.Router();
// Middleware kiểm tra xác thực
router.use(protect);
/**
 * @route   GET /api/v1/users/coupons
 * @desc    Lấy danh sách mã giảm giá công khai
 * @access  Private - User
 */
router.get("/", couponController.getPublicCoupons);

/**
 * @route   GET /api/v1/users/coupons/collected
 * @desc    Lấy danh sách mã giảm giá đã thu thập của người dùng
 * @access  Private - User
 */
router.get("/collected", couponController.getUserCoupons);

/**
 * @route   POST /api/v1/users/coupons/verify
 * @desc    Xác thực mã giảm giá cho giỏ hàng
 * @access  Private - User
 */
router.post("/verify", couponController.verifyCoupon);

/**
 * @route   POST /api/v1/users/coupons/:id/collect
 * @desc    Thu thập mã giảm giá
 * @access  Private - User
 */
router.post(
  "/:id/collect",
  validate(validateCollectCoupon),
  couponController.collectCoupon
);

module.exports = router;
