const asyncHandler = require("express-async-handler");
const compareService = require("@services/compare.service");

const compareController = {
  /**
   * @route GET /api/v1/compare/variants
   * @desc So sánh các biến thể (tối đa 4)
   * @access Public
   */
  compareVariants: asyncHandler(async (req, res) => {
    const { variantIds } = req.query;

    // Parse variant IDs
    const ids = variantIds.split(",").filter((id) => id.trim());

    // Gọi service để xử lý nghiệp vụ
    const compareData = await compareService.compareVariants(ids);

    res.json({
      success: true,
      data: compareData,
    });
  }),

  /**
   * @route GET /api/v1/compare/products
   * @desc So sánh các sản phẩm (tối đa 4)
   * @access Public
   */
  compareProducts: asyncHandler(async (req, res) => {
    const { productIds } = req.query;

    // Parse product IDs
    const ids = productIds.split(",").filter((id) => id.trim());

    // Gọi service để xử lý nghiệp vụ
    const compareData = await compareService.compareProducts(ids);

    res.json({
      success: true,
      data: compareData,
    });
  }),
};

module.exports = compareController;
