const asyncHandler = require("express-async-handler");
const couponService = require("@services/coupon.service");

const couponController = {
  /**
   * @route   GET /api/admin/coupons
   * @desc    Lấy danh sách mã giảm giá
   * @access  Staff/Admin
   */
  getAllCoupons: asyncHandler(async (req, res) => {
    const result = await couponService.adminCouponService.getAllCoupons(
      req.query
    );

    res.json({
      success: true,
      ...result,
    });
  }),

  /**
   * @route   GET /api/admin/coupons/:id
   * @desc    Lấy chi tiết mã giảm giá
   * @access  Staff/Admin
   */
  getCouponById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await couponService.adminCouponService.getCouponById(id);

    res.json({
      success: true,
      coupon: result.coupon,
    });
  }),

  /**
   * @route   POST /api/admin/coupons
   * @desc    Tạo mã giảm giá mới
   * @access  Staff/Admin
   */
  createCoupon: asyncHandler(async (req, res) => {
    const { user } = req;
    const result = await couponService.adminCouponService.createCoupon(
      req.body,
      user._id
    );

    res.status(201).json({
      success: true,
      message: result.message,
      coupon: result.coupon,
    });
  }),

  /**
   * @route   PUT /api/admin/coupons/:id
   * @desc    Cập nhật mã giảm giá
   * @access  Staff/Admin
   */
  updateCoupon: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { user } = req;
    const result = await couponService.adminCouponService.updateCoupon(
      id,
      req.body,
      user._id
    );

    res.json({
      success: true,
      message: result.message,
      coupon: result.coupon,
    });
  }),

  /**
   * @route   DELETE /api/admin/coupons/:id
   * @desc    Xóa mã giảm giá
   * @access  Staff/Admin
   */
  deleteCoupon: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await couponService.adminCouponService.deleteCoupon(id);

    res.json({
      success: true,
      message: result.message,
    });
  }),

  /**
   * @route   PATCH /api/admin/coupons/:id/status
   * @desc    Cập nhật trạng thái mã giảm giá
   * @access  Staff/Admin
   */
  updateCouponStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { user } = req;
    const result = await couponService.adminCouponService.updateCouponStatus(
      id,
      status,
      user._id
    );

    res.json({
      success: true,
      message: result.message,
      coupon: result.coupon,
    });
  }),
};

module.exports = couponController;
