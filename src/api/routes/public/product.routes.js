const express = require("express");
const router = express.Router();
const productController = require("@controllers/public/product.controller");
const productValidator = require("@validators/product.validator");
const validate = require("@utils/validatehelper");

/**
 * @route   GET /api/v1/products
 * @desc    Lấy danh sách sản phẩm với bộ lọc phức tạp
 * @access  Public
 */
router.get(
  "/",
  validate(productValidator.validatePublicProductQuery),
  productController.getProducts
);

/**
 * @route   GET /api/v1/products/featured
 * @desc    Lấy danh sách sản phẩm nổi bật
 * @access  Public
 */
router.get("/featured", productController.getFeaturedProducts);

/**
 * @route   GET /api/v1/products/slug/:slug
 * @desc    Lấy chi tiết sản phẩm theo slug
 * @access  Public
 */
router.get(
  "/slug/:slug",
  validate(productValidator.validateProductSlug),
  productController.getProductBySlug
);

/**
 * @route   GET /api/v1/products/new-arrivals
 * @desc    Lấy danh sách sản phẩm mới nhất
 * @access  Public
 */
router.get("/new-arrivals", productController.getNewArrivals);

/**
 * @route   GET /api/v1/products/best-sellers
 * @desc    Lấy danh sách sản phẩm bán chạy
 * @access  Public
 */
router.get("/best-sellers", productController.getBestSellers);

/**
 * @route   GET /api/v1/products/related/:id
 * @desc    Lấy danh sách sản phẩm liên quan
 * @access  Public
 */
router.get(
  "/related/:id",
  validate(productValidator.validateProductId),
  productController.getRelatedProducts
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Lấy chi tiết sản phẩm theo ID
 * @access  Public
 */
router.get(
  "/:id",
  validate(productValidator.validateProductId),
  productController.getProductById
);

module.exports = router;
