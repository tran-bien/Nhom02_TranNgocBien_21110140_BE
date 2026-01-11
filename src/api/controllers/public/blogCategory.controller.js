const asyncHandler = require("express-async-handler");
const blogCategoryService = require("@services/blogCategory.service");

const publicBlogCategoryController = {
  /**
   * @desc    Lấy tất cả danh mục blog (chỉ active)
   * @route   GET /api/v1/blogs/categories
   * @access  Public
   */
  getAllCategories: asyncHandler(async (req, res) => {
    const result = await blogCategoryService.getAllCategories(req.query);
    res.status(200).json(result);
  }),

  /**
   * @desc    Lấy chi tiết danh mục blog theo ID
   * @route   GET /api/v1/blogs/categories/:id
   * @access  Public
   */
  getCategoryById: asyncHandler(async (req, res) => {
    const category = await blogCategoryService.getCategoryById(req.params.id);
    res.status(200).json(category);
  }),
};

module.exports = publicBlogCategoryController;
