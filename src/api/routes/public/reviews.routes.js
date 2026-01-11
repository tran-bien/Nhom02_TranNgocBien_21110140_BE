const express = require("express");
const reviewController = require("@controllers/public/review.controller");
const reviewValidator = require("@validators/review.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Lấy chi tiết đánh giá
 * @access  Public
 */
router.get(
  "/:id",
  validate(reviewValidator.validateGetReviewDetail),
  reviewController.getReviewDetail
);

/**
 * @route   GET /api/v1/products/:productId/reviews
 * @desc    Lấy danh sách đánh giá của sản phẩm
 * @access  Public
 */
router.get(
  "/products/:productId",
  validate(reviewValidator.validateGetProductReviews),
  reviewController.getProductReviews
);

module.exports = router;
