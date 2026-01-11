const asyncHandler = require("express-async-handler");
const brandService = require("@services/brand.service");

const brandController = {
  /**
   * @route GET /api/brands
   * @desc Lấy danh sách thương hiệu (chỉ lấy active và không xóa)
   */
  getPublicAllBrands: asyncHandler(async (req, res) => {
    const result = await brandService.getPublicAllBrands();
    return res.json({
      success: true,
      brands: result,
    });
  }),

  /**
   * @route GET /api/brands/:id
   * @desc Lấy chi tiết thương hiệu theo ID
   */
  getPublicBrandById: asyncHandler(async (req, res) => {
    const brand = await brandService.getPublicBrandById(req.params.id);
    return res.json({
      success: true,
      brand,
    });
  }),

  /**
   * @route GET /api/brands/slug/:slug
   * @desc Lấy chi tiết thương hiệu theo slug
   */
  getBrandBySlug: asyncHandler(async (req, res) => {
    const brand = await brandService.getBrandBySlug(req.params.slug);
    return res.json({
      success: true,
      brand,
    });
  }),
};

module.exports = brandController;
