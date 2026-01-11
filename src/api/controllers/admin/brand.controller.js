const asyncHandler = require("express-async-handler");
const brandService = require("@services/brand.service");

const brandController = {
  /**
   * @route GET /api/admin/brands
   * @desc Lấy danh sách thương hiệu (kể cả không active)
   */
  getAllBrands: asyncHandler(async (req, res) => {
    const result = await brandService.getAdminAllBrands(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/brands/:id
   * @desc Lấy chi tiết thương hiệu theo ID
   */
  getBrandById: asyncHandler(async (req, res) => {
    const result = await brandService.getAdminBrandById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route POST /api/admin/brands
   * @desc Tạo mới thương hiệu
   */
  createBrand: asyncHandler(async (req, res) => {
    const brand = await brandService.createBrand(req.body);
    return res.status(201).json({
      success: true,
      message: "Tạo thương hiệu thành công",
      brand,
    });
  }),

  /**
   * @route PUT /api/admin/brands/:id
   * @desc Cập nhật thương hiệu
   */
  updateBrand: asyncHandler(async (req, res) => {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    return res.json({
      success: true,
      message: "Cập nhật thương hiệu thành công",
      brand,
    });
  }),

  /**
   * @route DELETE /api/admin/brands/:id
   * @desc Xóa mềm thương hiệu hoặc vô hiệu hóa nếu có sản phẩm liên quan
   */
  deleteBrand: asyncHandler(async (req, res) => {
    const result = await brandService.deleteBrand(req.params.id, req.user._id);

    return res.json(result);
  }),

  /**
   * @route GET /api/admin/brands/deleted
   * @desc Lấy danh sách thương hiệu đã xóa
   */
  getDeletedBrands: asyncHandler(async (req, res) => {
    const result = await brandService.getDeletedBrands(req.query);
    return res.json(result);
  }),

  /**
   * @route PUT /api/admin/brands/:id/restore
   * @desc Khôi phục thương hiệu đã xóa kèm sản phẩm liên quan
   */
  restoreBrand: asyncHandler(async (req, res) => {
    const result = await brandService.restoreBrand(req.params.id, true);

    return res.json(result);
  }),
  /**
   * @route PATCH /api/admin/brands/:id/status
   * @desc Cập nhật trạng thái active của thương hiệu
   */
  updateBrandStatus: asyncHandler(async (req, res) => {
    const { isActive, cascade = true } = req.body;
    const result = await brandService.updateBrandStatus(
      req.params.id,
      isActive,
      cascade
    );

    return res.json(result);
  }),
};

module.exports = brandController;
