const asyncHandler = require("express-async-handler");
const bannerService = require("@services/banner.service");

const bannerController = {
  /**
   * @route GET /api/admin/banners
   * @desc Lấy danh sách banner cho admin (có phân trang và filter)
   * @access Staff/Admin
   */
  getAllBanners: asyncHandler(async (req, res) => {
    const result = await bannerService.getAllBanners(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/banners/:id
   * @desc Lấy chi tiết banner theo ID
   * @access Staff/Admin
   */
  getBannerById: asyncHandler(async (req, res) => {
    const result = await bannerService.getBannerById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route PUT /api/admin/banners/:id
   * @desc Cập nhật banner (không bao gồm ảnh)
   * @access Staff/Admin
   */
  updateBanner: asyncHandler(async (req, res) => {
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.displayOrder !== undefined)
      updateData.displayOrder = parseInt(req.body.displayOrder);
    if (req.body.link !== undefined) updateData.link = req.body.link;
    if (req.body.isActive !== undefined)
      updateData.isActive =
        req.body.isActive === "true" || req.body.isActive === true;

    const result = await bannerService.updateBanner(req.params.id, updateData);
    return res.json(result);
  }),

  /**
   * @route PUT /api/admin/banners/:id/restore
   * @desc Khôi phục banner đã xóa
   * @access Staff/Admin
   */
  restoreBanner: asyncHandler(async (req, res) => {
    const newDisplayOrder = req.body.newDisplayOrder
      ? parseInt(req.body.newDisplayOrder)
      : null;

    const result = await bannerService.restoreBanner(
      req.params.id,
      newDisplayOrder
    );
    return res.json(result);
  }),

  /**
   * @route PUT /api/admin/banners/:id/toggle-status
   * @desc Toggle trạng thái active của banner
   * @access Staff/Admin
   */
  toggleBannerStatus: asyncHandler(async (req, res) => {
    const result = await bannerService.toggleBannerStatus(req.params.id);
    return res.json(result);
  }),
};

module.exports = bannerController;
