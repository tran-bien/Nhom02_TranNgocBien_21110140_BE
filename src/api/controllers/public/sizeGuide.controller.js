const asyncHandler = require("express-async-handler");
const sizeGuideService = require("@services/sizeGuide.service");

const sizeGuideController = {
  /**
   * @route GET /api/products/:productId/size-guide
   * @desc Lấy size guide của sản phẩm
   * @access Public
   */
  getProductSizeGuide: asyncHandler(async (req, res) => {
    const result = await sizeGuideService.getProductSizeGuide(
      req.params.productId
    );

    return res.json(result);
  }),
};

module.exports = sizeGuideController;

