const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { Review } = require("@models");

const validateCreateReview = [
  body("orderId")
    .notEmpty()
    .withMessage("ID đơn hàng không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đơn hàng không hợp lệ"),
  body("orderItemId")
    .notEmpty()
    .withMessage("ID sản phẩm trong đơn hàng không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID sản phẩm trong đơn hàng không hợp lệ"),
  body("rating")
    .notEmpty()
    .withMessage("Điểm đánh giá không được để trống")
    .isInt({ min: 1, max: 5 })
    .withMessage("Điểm đánh giá phải là số nguyên từ 1-5"),
  body("content")
    .notEmpty()
    .withMessage("Nội dung đánh giá không được để trống")
    .isString()
    .withMessage("Nội dung đánh giá phải là chuỗi")
    .isLength({ min: 2, max: 1000 })
    .withMessage("Nội dung đánh giá phải từ 2-1000 ký tự"),
];

const validateUpdateReview = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Điểm đánh giá phải là số nguyên từ 1-5"),
  body("content")
    .optional()
    .isString()
    .withMessage("Nội dung đánh giá phải là chuỗi")
    .isLength({ min: 2, max: 1000 })
    .withMessage("Nội dung đánh giá phải từ 2-1000 ký tự"),
];

const validateGetProductReviews = [
  param("productId")
    .notEmpty()
    .withMessage("ID sản phẩm không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID sản phẩm không hợp lệ"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Số lượng mỗi trang phải từ 1-50"),
  query("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating phải từ 1-5"),
  query("sort")
    .optional()
    .isString()
    .withMessage("Tham số sắp xếp phải là chuỗi"),
];

const validateGetReviewDetail = [
  param("id")
    .notEmpty()
    .withMessage("ID đánh giá không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đánh giá không hợp lệ"),
];

const validateLikeReview = [
  param("reviewId")
    .notEmpty()
    .withMessage("ID đánh giá không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đánh giá không hợp lệ"),
];

const validateReviewId = async (req, res, next) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;
    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "ID đánh giá không hợp lệ",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const validateReviewOwnership = async (req, res, next) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;
    const userId = req.user._id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
      deletedAt: null,
    });

    if (!review) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thao tác với đánh giá này",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Admin validators
const validateGetAllReviews = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số trang phải là số nguyên dương"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Số lượng mỗi trang phải từ 1-50"),
  query("productId")
    .optional()
    .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID sản phẩm không hợp lệ"),
  query("userId")
    .optional()
    .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID người dùng không hợp lệ"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái kích hoạt phải là boolean"),
  query("showDeleted")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái hiển thị đã xóa phải là boolean"),
];

const validateToggleReviewVisibility = [
  param("id")
    .notEmpty()
    .withMessage("ID đánh giá không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đánh giá không hợp lệ"),
  body("isActive")
    .isBoolean()
    .withMessage("Trạng thái hiển thị phải là boolean"),
];

const validateRestoreReview = [
  param("id")
    .notEmpty()
    .withMessage("ID đánh giá không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đánh giá không hợp lệ"),
];

const validateReplyToReview = [
  param("id")
    .notEmpty()
    .withMessage("ID đánh giá không được để trống")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("ID đánh giá không hợp lệ"),
  body("content")
    .notEmpty()
    .withMessage("Nội dung trả lời không được để trống")
    .isString()
    .withMessage("Nội dung trả lời phải là chuỗi")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Nội dung trả lời phải có từ 1-1000 ký tự"),
];

module.exports = {
  validateCreateReview,
  validateUpdateReview,
  validateGetProductReviews,
  validateGetReviewDetail,
  validateLikeReview,
  validateReviewId,
  validateReviewOwnership,
  validateGetAllReviews,
  validateToggleReviewVisibility,
  validateRestoreReview,
  validateReplyToReview,
};
