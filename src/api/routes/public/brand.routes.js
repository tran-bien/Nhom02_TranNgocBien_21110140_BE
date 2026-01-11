const express = require("express");
const brandController = require("@controllers/public/brand.controller");
const brandValidator = require("@validators/brand.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

/**
 * @route   GET /api/v1/brands
 * @desc    Lấy tất cả thương hiệu đang active và chưa xóa
 * @access  Public
 */
router.get("/", brandController.getPublicAllBrands);

/**
 * @route   GET /api/v1/brands/slug/:slug
 * @desc    Lấy chi tiết thương hiệu theo slug
 * @access  Public
 */
router.get(
  "/slug/:slug",
  validate(brandValidator.validateBrandSlug),
  brandController.getBrandBySlug
);

/**
 * @route   GET /api/v1/brands/:id
 * @desc    Lấy chi tiết thương hiệu theo ID
 * @access  Public
 */
router.get(
  "/:id",
  validate(brandValidator.validateBrandId),
  brandController.getPublicBrandById
);

module.exports = router;
