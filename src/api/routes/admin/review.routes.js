const express = require("express");
const {
  protect,
  requireStaff,
  requireStaffOrAdmin,
  requireStaffReadOnly,
} = require("@middlewares/auth.middleware");
const reviewController = require("@controllers/admin/review.controller");
const reviewValidator = require("@validators/review.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Lấy danh sách tất cả đánh giá
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(reviewValidator.validateGetAllReviews),
  reviewController.getAllReviews
);

/**
 * @route   GET /api/v1/admin/reviews/:productId/stats
 * @desc    Lấy thống kê đánh giá của sản phẩm
 * @access  Staff/Admin
 */
router.get(
  "/:productId/stats",
  requireStaffOrAdmin,
  validate(reviewValidator.validateGetProductReviews),
  reviewController.getProductReviewStats
);

/**
 * @route   GET /api/v1/admin/reviews/:id
 * @desc    Lấy chi tiết đánh giá theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(reviewValidator.validateGetReviewDetail),
  reviewController.getReviewById
);

/**
 * @route   POST /api/v1/admin/reviews/:id/reply
 * @desc    Trả lời đánh giá
 * @access  Staff/Admin
 */
router.post(
  "/:id/reply",
  requireStaffOrAdmin,
  validate(reviewValidator.validateReplyToReview),
  reviewController.replyToReview
);

/**
 * @route   PUT /api/v1/admin/reviews/:id/reply
 * @desc    Sửa trả lời đánh giá
 * @access  Staff/Admin
 */
router.put(
  "/:id/reply",
  requireStaffOrAdmin,
  validate(reviewValidator.validateReplyToReview),
  reviewController.updateReplyToReview
);

/**
 * @route   DELETE /api/v1/admin/reviews/:id/reply
 * @desc    Xóa trả lời đánh giá
 * @access  Staff/Admin
 */
router.delete(
  "/:id/reply",
  requireStaffOrAdmin,
  validate(reviewValidator.validateReviewId),
  reviewController.deleteReplyToReview
);

module.exports = router;
