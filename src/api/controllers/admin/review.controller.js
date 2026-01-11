const asyncHandler = require("express-async-handler");
const reviewService = require("@services/review.service");

/**
 * @desc    Lấy danh sách tất cả đánh giá
 * @route   GET /api/admin/reviews
 * @access  Staff/Admin
 */
const getAllReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.getAllReviews(req.query);
  
  res.status(200).json({
    success: true,
    message: "Lấy danh sách đánh giá thành công",
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Lấy chi tiết đánh giá (bao gồm cả đã xóa)
 * @route   GET /api/admin/reviews/:id
 * @access  Staff/Admin
 */
const getReviewById = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.getReviewById(req.params.id);
  
  res.status(200).json(result);
});

/**
 * @desc    Ẩn/hiện đánh giá
 * @route   PATCH /api/admin/reviews/:id/visibility
 * @access  Staff/Admin
 */
const toggleReviewVisibility = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.toggleReviewVisibility(
    req.params.id,
    req.body.isActive
  );
  
  res.status(200).json(result);
});

/**
 * @desc    Khôi phục đánh giá đã xóa
 * @route   PATCH /api/admin/reviews/:id/restore
 * @access  Staff/Admin
 */
const restoreReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Tìm đánh giá đã bị xóa mềm
  const Review = require("@models/review");
  const review = await Review.findById(id);
  
  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đánh giá"
    });
  }
  
  if (!review.deletedAt) {
    return res.status(400).json({
      success: false,
      message: "Đánh giá chưa bị xóa"
    });
  }
  
  // Khôi phục đánh giá
  review.deletedAt = null;
  review.deletedBy = null;
  await review.save();
  
  res.status(200).json({
    success: true,
    message: "Khôi phục đánh giá thành công",
    review
  });
});

/**
 * @desc    Lấy thống kê đánh giá của sản phẩm
 * @route   GET /api/admin/reviews/:productId/stats
 * @access  Staff/Admin
 */
const getProductReviewStats = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.getProductReviewStats(req.params.productId);
  
  res.status(200).json(result);
});

/**
 * @desc    Lấy danh sách tất cả đánh giá đã xóa
 * @route   GET /api/admin/reviews/deleted
 * @access  Staff/Admin
 */
const getAllReviewsDeleted = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.getAllReviewsDeleted(req.query);
  
  res.status(200).json(result);
});

/**
 * @desc    Trả lời đánh giá
 * @route   POST /api/admin/reviews/:id/reply
 * @access  Staff/Admin
 */
const replyToReview = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const result = await reviewService.adminReviewService.replyToReview(
    req.params.id,
    content,
    req.user._id
  );
  
  res.status(200).json(result);
});

/**
 * @desc    Sửa reply đánh giá
 * @route   PUT /api/admin/reviews/:id/reply
 * @access  Staff/Admin
 */
const updateReplyToReview = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const result = await reviewService.adminReviewService.updateReplyToReview(
    req.params.id,
    content,
    req.user._id
  );
  
  res.status(200).json(result);
});

/**
 * @desc    Xóa reply đánh giá
 * @route   DELETE /api/admin/reviews/:id/reply
 * @access  Staff/Admin
 */
const deleteReplyToReview = asyncHandler(async (req, res) => {
  const result = await reviewService.adminReviewService.deleteReplyToReview(
    req.params.id
  );
  
  res.status(200).json(result);
});

module.exports = {
  getAllReviews,
  getReviewById,
  toggleReviewVisibility,
  restoreReview,
  getProductReviewStats,
  getAllReviewsDeleted,
  replyToReview,
  updateReplyToReview,
  deleteReplyToReview,
};