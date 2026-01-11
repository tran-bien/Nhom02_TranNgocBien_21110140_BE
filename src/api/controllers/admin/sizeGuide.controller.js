const asyncHandler = require("express-async-handler");
const sizeGuideService = require("@services/sizeGuide.service");

const sizeGuideController = {
  /**
   * @route GET /api/admin/size-guides
   * @desc Lấy danh sách size guides
   * @access Staff/Admin
   */
  getAllSizeGuides: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.getAllSizeGuides(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/size-guides/:id
   * @desc Lấy chi tiết size guide
   * @access Staff/Admin
   */
  getSizeGuideById: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.getSizeGuideById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route POST /api/admin/size-guides
   * @desc Tạo size guide cho sản phẩm
   * @access Staff/Admin
   */
  createSizeGuide: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.createSizeGuide(
      req.body.productId,
      req.body,
      req.user._id
    );

    return res.status(201).json(result);
  }),

  /**
   * @route PUT /api/admin/size-guides/:id
   * @desc Cập nhật size guide
   * @access Staff/Admin
   */
  updateSizeGuide: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.updateSizeGuide(
      req.params.id,
      req.body,
      req.user._id
    );

    return res.json(result);
  }),

  /**
   * @route DELETE /api/admin/size-guides/:id
   * @desc Xóa size guide
   * @access Staff/Admin
   */
  deleteSizeGuide: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.deleteSizeGuide(
      req.params.id,
      req.user._id
    );

    return res.json(result);
  }),
};

module.exports = sizeGuideController;
