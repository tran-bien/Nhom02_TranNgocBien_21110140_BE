const express = require("express");
const router = express.Router();
const compareController = require("@controllers/public/compare.controller");
const compareValidator = require("@validators/compare.validator");
const validate = require("@utils/validatehelper");

/**
 * @route GET /api/compare/variants
 * @desc So sánh các biến thể (tối đa 3)
 * @access Public
 */
router.get(
  "/variants",
  validate(compareValidator.validateCompareVariants),
  compareController.compareVariants
);

/**
 * @route GET /api/compare/products
 * @desc So sánh các sản phẩm (tối đa 3)
 * @access Public
 */
router.get(
  "/products",
  validate(compareValidator.validateCompareProducts),
  compareController.compareProducts
);

module.exports = router;

