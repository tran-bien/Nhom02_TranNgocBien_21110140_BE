const asyncHandler = require("express-async-handler");
const blogCategoryService = require("@services/blogCategory.service");

const adminBlogCategoryController = {
  /**
   * @desc    Lấy tất cả danh mục blog (bao gồm inactive)
   * @route   GET /api/v1/admin/blogs/categories
   * @access  Staff/Admin
   */
  getAdminCategories: asyncHandler(async (req, res) => {
    const result = await blogCategoryService.getAdminCategories(req.query);
    res.status(200).json(result);
  }),

  /**
   * @desc    Lấy chi tiết danh mục blog theo ID
   * @route   GET /api/v1/admin/blogs/categories/:id
   * @access  Staff/Admin
   */
  getCategoryById: asyncHandler(async (req, res) => {
    const category = await blogCategoryService.getCategoryById(req.params.id);
    res.status(200).json(category);
  }),

  /**
   * @desc    Tạo danh mục blog mới
   * @route   POST /api/v1/admin/blogs/categories
   * @access  Staff/Admin
   */
  createCategory: asyncHandler(async (req, res) => {
    const category = await blogCategoryService.createCategory(req.body);
    res.status(201).json(category);
  }),

  /**
   * @desc    Cập nhật danh mục blog
   * @route   PUT /api/v1/admin/blogs/categories/:id
   * @access  Staff/Admin
   */
  updateCategory: asyncHandler(async (req, res) => {
    const category = await blogCategoryService.updateCategory(
      req.params.id,
      req.body
    );
    res.status(200).json(category);
  }),

  /**
   * @desc    Xóa mềm danh mục blog
   * @route   DELETE /api/v1/admin/blogs/categories/:id
   * @access  Staff/Admin
   */
  deleteCategory: asyncHandler(async (req, res) => {
    const result = await blogCategoryService.deleteCategory(req.params.id);
    res.status(200).json(result);
  }),
};

module.exports = adminBlogCategoryController;
