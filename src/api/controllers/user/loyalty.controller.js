const asyncHandler = require("express-async-handler");
const loyaltyService = require("@services/loyalty.service");

const loyaltyController = {
  /**
   * @route GET /api/users/loyalty/stats
   * @desc Lấy thống kê loyalty của user
   * @access Private
   */
  getLoyaltyStats: asyncHandler(async (req, res) => {
    const result = await loyaltyService.getUserLoyaltyStats(req.user._id);

    // Transform response to match FE expected format
    return res.json({
      success: result.success,
      message: "Lấy thông tin điểm thưởng thành công",
      data: result.loyalty,
    });
  }),

  /**
   * @route GET /api/users/loyalty/tiers
   * @desc Lấy danh sách các tier (cho user xem)
   * @access Private
   */
  getTiers: asyncHandler(async (req, res) => {
    const result = await loyaltyService.getAllTiers({ isActive: true });

    return res.json({
      success: result.success,
      message: "Lấy danh sách cấp độ thành viên thành công",
      data: result.tiers,
    });
  }),

  /**
   * @route GET /api/users/loyalty/transactions
   * @desc Lấy lịch sử giao dịch điểm
   * @access Private
   */
  getTransactions: asyncHandler(async (req, res) => {
    const result = await loyaltyService.getUserTransactions(
      req.user._id,
      req.query
    );

    return res.json({
      success: result.success,
      message: "Lấy lịch sử giao dịch thành công",
      data: {
        transactions: result.transactions,
        pagination: result.pagination,
      },
    });
  }),
};

module.exports = loyaltyController;
