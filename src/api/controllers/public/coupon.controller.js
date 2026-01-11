const asyncHandler = require("express-async-handler");
const couponService = require("@services/coupon.service");

const couponController = {
  /**
   * @route   GET /api/coupons/public
   * @desc    Lấy danh sách mã giảm giá công khai
   * @access  Public
   */
  getPublicCoupons: asyncHandler(async (req, res) => {
    const result = await couponService.getPublicCoupons(req.query);

    res.json({
      success: true,
      ...result,
    });
  }),
};

module.exports = couponController;
