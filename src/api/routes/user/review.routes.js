const express = require("express");
const { protect } = require("@middlewares/auth.middleware");
const reviewController = require("@controllers/user/review.controller");
const reviewValidator = require("@validators/review.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/users/reviews/my-reviews
 * @desc    Lấy danh sách đánh giá của người dùng hiện tại
 * @access  Private
 */
router.get("/my-reviews", reviewController.getUserReviews);

/**
 * @route   POST /api/v1/users/reviews
 * @desc    Tạo đánh giá mới
 * @access  Private
 */
router.post(
  "/",
  validate(reviewValidator.validateCreateReview),
  reviewController.createReview
);

/**
 * @route   GET /api/v1/users/reviews/reviewable-products
 * @desc    Lấy danh sách sản phẩm có thể đánh giá từ đơn hàng đã giao
 * @access  Private
 */
router.get("/reviewable-products", reviewController.getReviewableProducts);

/**
 * @route   PUT /api/v1/users/reviews/:reviewId
 * @desc    Cập nhật đánh giá
 * @access  Private
 */
router.put(
  "/:reviewId",
  reviewValidator.validateReviewId,
  reviewValidator.validateReviewOwnership,
  validate(reviewValidator.validateUpdateReview),
  reviewController.updateReview
);

/**
 * @route   DELETE /api/v1/users/reviews/:reviewId
 * @desc    Xóa đánh giá (xóa mềm)
 * @access  Private
 */
router.delete(
  "/:reviewId",
  reviewValidator.validateReviewId,
  reviewValidator.validateReviewOwnership,
  reviewController.deleteReview
);

/**
 * @route   POST /api/v1/users/reviews/:reviewId/like
 * @desc    Thích đánh giá
 * @access  Private
 */
router.post(
  "/:reviewId/like",
  validate(reviewValidator.validateLikeReview),
  reviewController.likeReview
);

/**
 * @route   DELETE /api/v1/users/reviews/:reviewId/like
 * @desc    Bỏ thích đánh giá
 * @access  Private
 */
router.delete(
  "/:reviewId/like",
  validate(reviewValidator.validateLikeReview),
  reviewController.unlikeReview
);

module.exports = router;
