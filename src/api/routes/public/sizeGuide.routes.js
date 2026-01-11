const express = require("express");
const router = express.Router();
const sizeGuideController = require("@controllers/public/sizeGuide.controller");
const sizeGuideValidator = require("@validators/sizeGuide.validator");
const validate = require("@utils/validatehelper");

/**
 * @route GET /api/products/:productId/size-guide
 * @desc Lấy size guide của sản phẩm
 * @access Public
 */
router.get(
  "/:productId/size-guide",
  validate(sizeGuideValidator.validateProductId),
  sizeGuideController.getProductSizeGuide
);

module.exports = router;
