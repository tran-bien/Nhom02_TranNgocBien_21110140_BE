const asyncHandler = require("express-async-handler");
const userService = require("@services/user.service");

const wishlistController = {
  /**
   * @route   GET /api/users/wishlist
   * @desc    Lấy danh sách yêu thích
   * @access  Private
   */
  getUserWishlist: asyncHandler(async (req, res) => {
    const { user } = req;
    const result = await userService.getUserWishlist(user._id);

    res.json({
      success: true,
      wishlist: result.wishlist,
    });
  }),

  /**
   * @route   POST /api/users/wishlist
   * @desc    Thêm sản phẩm vào danh sách yêu thích
   * @access  Private
   */
  addToWishlist: asyncHandler(async (req, res) => {
    const { user } = req;
    const { productId, variantId } = req.body;

    const result = await userService.addToWishlist(
      user._id,
      productId,
      variantId
    );

    res.json({
      success: true,
      message: result.message,
      isExisting: result.isExisting || false,
    });
  }),

  /**
   * @route   DELETE /api/users/wishlist/:id
   * @desc    Xóa sản phẩm khỏi danh sách yêu thích
   * @access  Private
   */
  removeFromWishlist: asyncHandler(async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    const result = await userService.removeFromWishlist(user._id, id);

    res.json({
      success: true,
      message: result.message,
    });
  }),
};

module.exports = wishlistController;
