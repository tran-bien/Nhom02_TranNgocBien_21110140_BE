const asyncHandler = require("express-async-handler");
const productService = require("@services/product.service");

const productController = {
  /**
   * @desc    Lấy danh sách sản phẩm với bộ lọc phức tạp
   * @route   GET /api/products
   * @access  Public
   */
  getProducts: asyncHandler(async (req, res) => {
    const result = await productService.getPublicProducts(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy chi tiết sản phẩm theo ID
   * @route   GET /api/products/:id
   * @access  Public
   */
  getProductById: asyncHandler(async (req, res) => {
    const result = await productService.getPublicProductById(req.params.id);
    res.json(result);
  }),

  /**
   * @desc    Lấy chi tiết sản phẩm theo slug
   * @route   GET /api/products/slug/:slug
   * @access  Public
   */
  getProductBySlug: asyncHandler(async (req, res) => {
    const result = await productService.getPublicProductBySlug(req.params.slug);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách sản phẩm nổi bật
   * @route   GET /api/products/featured
   * @access  Public
   */
  getFeaturedProducts: asyncHandler(async (req, res) => {
    const limit = req.query.limit || 20;
    const result = await productService.getFeaturedProducts(limit);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách sản phẩm bán chạy
   * @route   GET /api/products/best-sellers
   * @access  Public
   */
  getBestSellers: asyncHandler(async (req, res) => {
    const limit = req.query.limit || 20;
    const result = await productService.getBestSellers(limit);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách sản phẩm mới nhất
   * @route   GET /api/products/new-arrivals
   * @access  Public
   */
  getNewArrivals: asyncHandler(async (req, res) => {
    const limit = req.query.limit || 20;
    const result = await productService.getNewArrivals(limit);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách sản phẩm liên quan
   * @route   GET /api/products/related/:id
   * @access  Public
   */
  getRelatedProducts: asyncHandler(async (req, res) => {
    const limit = req.query.limit || 20;
    const result = await productService.getRelatedProducts(
      req.params.id,
      limit
    );
    res.json(result);
  }),
};

module.exports = productController;
