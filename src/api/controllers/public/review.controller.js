const asyncHandler = require("express-async-handler");
const reviewService = require("@services/review.service");

const reviewController = {
  /**
   * @route   GET /api/products/:productId/reviews
   * @desc    Lấy danh sách đánh giá của sản phẩm
   * @access  Public
   */
  getProductReviews: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const result = await reviewService.getProductReviews(productId, req.query);

    res.json({
      success: true,
      ...result,
    });
  }),

  /**
   * @route   GET /api/reviews/:id
   * @desc    Lấy chi tiết đánh giá
   * @access  Public
   */
  getReviewDetail: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await reviewService.getReviewDetail(id);

    res.json({
      success: true,
      review: result.review,
    });
  }),
};

module.exports = reviewController;
