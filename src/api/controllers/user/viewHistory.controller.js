const asyncHandler = require("express-async-handler");
const viewHistoryService = require("@services/viewHistory.service");

const viewHistoryController = {
  /**
   * @route POST /api/users/view-history
   * @desc Track product view
   * @access Public (có thể không cần login)
   */
  trackView: asyncHandler(async (req, res) => {
    const { productId, variantId, viewDuration, source, sessionId } = req.body;

    const userId = req.user?._id; // Optional nếu không login
    const deviceInfo = req.headers["user-agent"];

    // Không cần validate userId hoặc sessionId - cho phép khách vãng lai xem sản phẩm

    const result = await viewHistoryService.trackView({
      productId,
      variantId,
      viewDuration,
      source,
      userId,
      sessionId,
      deviceInfo,
    });

    return res.json(result);
  }),

  /**
   * @route GET /api/users/view-history
   * @desc Lấy lịch sử xem
   * @access Private
   */
  getHistory: asyncHandler(async (req, res) => {
    const result = await viewHistoryService.getUserViewHistory(
      req.user._id,
      req.query
    );

    return res.json({
      success: true,
      message: "Lấy lịch sử xem thành công",
      data: {
        history: result.history,
        pagination: result.pagination,
      },
    });
  }),

  /**
   * @route DELETE /api/users/view-history
   * @desc Xóa toàn bộ lịch sử
   * @access Private
   */
  clearHistory: asyncHandler(async (req, res) => {
    const result = await viewHistoryService.clearHistory(req.user._id);

    return res.json(result);
  }),
};

module.exports = viewHistoryController;
