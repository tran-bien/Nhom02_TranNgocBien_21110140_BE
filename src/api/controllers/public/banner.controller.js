const asyncHandler = require("express-async-handler");
const bannerService = require("@services/banner.service");

const bannerController = {
  /**
   * @route GET /api/banners
   * @desc Lấy danh sách banner công khai (chỉ active)
   */
  getPublicBanners: asyncHandler(async (req, res) => {
    const banners = await bannerService.getPublicBanners();

    return res.json({
      success: true,
      banners,
    });
  }),
};

module.exports = bannerController;
