const asyncHandler = require("express-async-handler");
const couponService = require("@services/coupon.service");

/**
 * @desc    Lấy danh sách coupon công khai
 * @route   GET /api/coupons
 * @access  Private - User
 */
const getPublicCoupons = asyncHandler(async (req, res) => {
  // Truyền userId để filter coupon đã đổi/hết lượt cho user cụ thể
  const result = await couponService.getPublicCoupons(req.query, req.user._id);
  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Lấy danh sách coupon đã thu thập của người dùng
 * @route   GET /api/coupons/collected
 * @access  Private - User
 */
const getUserCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getUserCoupons(req.user._id, req.query);
  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Thu thập coupon
 * @route   POST /api/coupons/:id/collect
 * @access  Private - User
 */
const collectCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.collectCoupon(req.user._id, req.params.id);
  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Xác thực mã giảm giá
 * @route   POST /api/v1/users/coupons/verify
 * @access  Private - User
 */
const verifyCoupon = asyncHandler(async (req, res) => {
  const { code, subTotal } = req.body;
  const result = await couponService.verifyCouponByCode(
    req.user._id,
    code,
    subTotal
  );
  return res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  getPublicCoupons,
  getUserCoupons,
  collectCoupon,
  verifyCoupon,
};
