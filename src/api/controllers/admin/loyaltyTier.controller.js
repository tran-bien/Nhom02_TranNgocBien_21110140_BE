const asyncHandler = require("express-async-handler");
const { adminLoyaltyTierService } = require("@services/loyalty.service");

const loyaltyTierController = {
  /**
   * @route GET /api/admin/loyalty-tiers
   * @desc Lấy danh sách loyalty tiers
   * @access Admin/Staff
   */
  getAllTiers: asyncHandler(async (req, res) => {
    const result = await adminLoyaltyTierService.getAllTiers(req.query);

    res.json({
      success: true,
      ...result,
    });
  }),

  /**
   * @route GET /api/admin/loyalty-tiers/:id
   * @desc Lấy chi tiết loyalty tier
   * @access Admin/Staff
   */
  getTierById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await adminLoyaltyTierService.getTierById(id);

    res.json(result);
  }),

  /**
   * @route POST /api/admin/loyalty-tiers
   * @desc Tạo loyalty tier mới
   * @access Admin
   */
  createTier: asyncHandler(async (req, res) => {
    const result = await adminLoyaltyTierService.createTier(req.body);

    res.status(201).json(result);
  }),

  /**
   * @route PUT /api/admin/loyalty-tiers/:id
   * @desc Cập nhật loyalty tier
   * @access Admin
   */
  updateTier: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await adminLoyaltyTierService.updateTier(id, req.body);

    res.json(result);
  }),

  /**
   * @route DELETE /api/admin/loyalty-tiers/:id
   * @desc Xóa loyalty tier
   * @access Admin
   */
  deleteTier: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await adminLoyaltyTierService.deleteTier(id);

    res.json(result);
  }),
};

module.exports = loyaltyTierController;
