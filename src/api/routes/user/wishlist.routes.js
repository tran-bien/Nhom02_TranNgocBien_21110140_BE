const express = require("express");
const { protect } = require("@middlewares/auth.middleware");
const wishlistController = require("@controllers/user/wishlist.controller");
const userValidator = require("@validators/user.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/users/wishlist
 * @desc    Lấy danh sách yêu thích
 * @access  Private
 */
router.get("/", wishlistController.getUserWishlist);

/**
 * @route   POST /api/v1/users/wishlist
 * @desc    Thêm sản phẩm vào danh sách yêu thích
 * @access  Private
 */
router.post(
  "/",
  validate(userValidator.validateAddToWishlist),
  wishlistController.addToWishlist
);

/**
 * @route   DELETE /api/v1/users/wishlist/:id
 * @desc    Xóa sản phẩm khỏi danh sách yêu thích
 * @access  Private
 */
router.delete("/:id", wishlistController.removeFromWishlist);

module.exports = router;
