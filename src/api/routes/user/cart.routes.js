const express = require("express");
const router = express.Router();
const cartController = require("@controllers/user/cart.controller");
const cartValidator = require("@validators/cart.validator");
const validate = require("@utils/validatehelper");
const { protect } = require("@middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/cart
 * @desc    Lấy giỏ hàng hiện tại
 * @access  Private
 */
router.get("/", cartController.getCart);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Thêm sản phẩm vào giỏ hàng
 * @access  Private
 */
router.post(
  "/items",
  validate(cartValidator.validateAddToCart),
  cartController.addToCart
);

/**
 * @route   PUT /api/v1/cart/items/:itemId
 * @desc    Cập nhật số lượng sản phẩm
 * @access  Private
 */
router.put(
  "/items/:itemId",
  validate(cartValidator.validateUpdateCartItem),
  cartController.updateCartItem
);

/**
 * @route   DELETE /api/v1/cart/items
 * @desc    Xóa sản phẩm đã chọn khỏi giỏ hàng
 * @access  Private
 * @note    Endpoint này xóa các items có isSelected = true, không cần body
 */
router.delete("/items", cartController.removeCartItems);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Xóa toàn bộ giỏ hàng
 * @access  Private
 */
router.delete("/", cartController.clearCart);

/**
 * @route   PATCH /api/v1/cart/items/:itemId/toggle
 * @desc    Chuyển đổi trạng thái chọn sản phẩm trong giỏ hàng
 * @access  Private
 */
router.patch("/items/:itemId/toggle", cartController.toggleSelectCartItem);

/**
 * @route   POST /api/v1/cart/preview-before-order
 * @desc    Xem trước kết quả tính toán đơn hàng trước khi tạo đơn hàng
 * @access  Private
 */
router.post(
  "/preview-before-order",
  validate(cartValidator.validatePreviewBeforeOrder),
  cartController.previewBeforeOrder
);

module.exports = router;
