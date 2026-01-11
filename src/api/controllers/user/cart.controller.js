const asyncHandler = require("express-async-handler");
const cartService = require("@services/cart.service");

/**
 * @desc    Lấy giỏ hàng hiện tại
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await cartService.getCartByUser(userId);

  res.status(200).json(result);
});

/**
 * @desc    Thêm sản phẩm vào giỏ hàng
 * @route   POST /api/cart/items
 * @access  Private
 */
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const itemData = req.body;
  const result = await cartService.addToCart(userId, itemData);

  res.status(201).json(result);
});

/**
 * @desc    Cập nhật số lượng sản phẩm trong giỏ hàng
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;
  const { quantity } = req.body;
  const result = await cartService.updateCartItem(userId, itemId, quantity);

  res.status(200).json(result);
});

/**
 * @desc    Xóa sản phẩm đã chọn khỏi giỏ hàng
 * @route   DELETE /api/cart/items
 * @access  Private
 */
const removeCartItems = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await cartService.removeCartItem(userId);

  res.status(200).json(result);
});

/**
 * @desc    Xóa toàn bộ giỏ hàng
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await cartService.clearCart(userId);

  res.status(200).json(result);
});

/**
 * @desc    Chọn/bỏ chọn sản phẩm trong giỏ hàng
 * @route   PATCH /api/cart/items/:itemId/toggle
 * @access  Private
 */
const toggleSelectCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;
  const result = await cartService.toggleSelectCartItem(userId, itemId);

  res.status(200).json(result);
});

/**
 * @desc    Xem trước kết quả áp dụng mã giảm giá trước khi tạo đơn hàng
 * @route   POST /api/cart/preview-before-order
 * @access  Private
 */
const previewBeforeOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await cartService.previewBeforeOrder(userId, req.body);

  res.status(200).json(result);
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItems,
  clearCart,
  toggleSelectCartItem,
  previewBeforeOrder,
};
