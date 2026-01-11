const asyncHandler = require("express-async-handler");
const reviewService = require("@services/review.service");

/**
 * @desc    Lấy danh sách đánh giá của người dùng hiện tại
 * @route   GET /api/users/reviews/my-reviews
 * @access  Private
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getUserReviews(req.user._id, req.query);

  res.status(200).json({
    success: true,
    message: "Lấy danh sách đánh giá thành công",
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @desc    Tạo đánh giá mới
 * @route   POST /api/users/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  const result = await reviewService.createReview(req.user._id, req.body);

  res.status(201).json(result);
});

/**
 * @desc    Cập nhật đánh giá
 * @route   PUT /api/users/reviews/:reviewId
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const result = await reviewService.updateReview(
    req.user._id,
    req.params.reviewId,
    req.body
  );

  res.status(200).json(result);
});

/**
 * @desc    Xóa đánh giá
 * @route   DELETE /api/users/reviews/:reviewId
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReview(
    req.user._id,
    req.params.reviewId
  );

  res.status(200).json(result);
});

/**
 * @desc    Thích đánh giá
 * @route   POST /api/users/reviews/:reviewId/like
 * @access  Private
 */
const likeReview = asyncHandler(async (req, res) => {
  const result = await reviewService.likeReview(
    req.user._id,
    req.params.reviewId
  );

  res.status(200).json(result);
});

/**
 * @desc    Bỏ thích đánh giá
 * @route   DELETE /api/users/reviews/:reviewId/like
 * @access  Private
 */
const unlikeReview = asyncHandler(async (req, res) => {
  const result = await reviewService.unlikeReview(
    req.user._id,
    req.params.reviewId
  );

  res.status(200).json(result);
});

/**
 * @desc    Lấy danh sách sản phẩm có thể đánh giá
 * @route   GET /api/users/reviews/reviewable-products
 * @access  Private
 */
const getReviewableProducts = asyncHandler(async (req, res) => {
  const result = await reviewService.getReviewableProducts(
    req.user._id,
    req.query
  );

  res.status(200).json({
    success: true,
    message: "Lấy danh sách sản phẩm có thể đánh giá thành công",
    data: result.data,
    pagination: result.pagination,
  });
});

module.exports = {
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  unlikeReview,
  getReviewableProducts,
};
