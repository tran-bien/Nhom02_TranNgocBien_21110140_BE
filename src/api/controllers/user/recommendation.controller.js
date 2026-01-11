const asyncHandler = require("express-async-handler");
const recommendationService = require("@services/recommendation.service");

const recommendationController = {
  /**
   * @route GET /api/users/recommendations
   * @desc Lấy sản phẩm gợi ý cá nhân hóa
   * @access Private
   */
  getRecommendations: asyncHandler(async (req, res) => {
    // Chỉ có một thuật toán PERSONALIZED duy nhất
    const limit = parseInt(req.query.limit) || 12; // Mặc định 12 sản phẩm
    const result = await recommendationService.getRecommendations(
      req.user._id,
      limit
    );

    // Transform products to Recommendation format for FE
    const recommendations = (result.products || []).map((product, index) => ({
      product,
      score: 10 - index,
      reason: "Dành riêng cho bạn",
      type: "personalized",
    }));

    // Return in format that FE expects (both formats for compatibility)
    return res.json({
      success: true,
      message: "Lấy gợi ý sản phẩm thành công",
      data: {
        recommendations,
        products: result.products || [],
      },
      fromCache: result.fromCache || false,
    });
  }),
};

module.exports = recommendationController;
