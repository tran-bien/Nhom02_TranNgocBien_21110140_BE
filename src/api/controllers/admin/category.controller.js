const asyncHandler = require("express-async-handler");
const categoryService = require("@services/category.service");

const categoryController = {
  /**
   * @route GET /api/admin/categories
   * @desc Lấy danh sách danh mục (kể cả không active)
   * @access Staff/Admin
   */
  getAllCategories: asyncHandler(async (req, res) => {
    const result = await categoryService.getAdminAllCategories(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/categories/:id
   * @desc Lấy chi tiết danh mục theo ID
   * @access Staff/Admin
   */
  getCategoryById: asyncHandler(async (req, res) => {
    const result = await categoryService.getAdminCategoryById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route POST /api/admin/categories
   * @desc Tạo mới danh mục
   * @access Staff/Admin
   */
  createCategory: asyncHandler(async (req, res) => {
    const result = await categoryService.createCategory(req.body);
    return res.status(201).json(result);
  }),

  /**
   * @route PUT /api/admin/categories/:id
   * @desc Cập nhật danh mục
   * @access Staff/Admin
   */
  updateCategory: asyncHandler(async (req, res) => {
    const result = await categoryService.updateCategory(
      req.params.id,
      req.body
    );
    return res.json(result);
  }),

  /**
   * @route DELETE /api/admin/categories/:id
   * @desc Xóa mềm danh mục hoặc vô hiệu hóa nếu có sản phẩm liên quan
   * @access Staff/Admin
   */
  deleteCategory: asyncHandler(async (req, res) => {
    const result = await categoryService.deleteCategory(
      req.params.id,
      req.user._id
    );
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/categories/deleted
   * @desc Lấy danh sách danh mục đã xóa
   * @access Staff/Admin
   */
  getDeletedCategories: asyncHandler(async (req, res) => {
    const result = await categoryService.getDeletedCategories(req.query);
    return res.json(result);
  }),

  /**
   * @route PUT /api/admin/categories/:id/restore
   * @desc Khôi phục danh mục đã xóa kèm sản phẩm liên quan
   * @access Staff/Admin
   */
  restoreCategory: asyncHandler(async (req, res) => {
    const { cascade = true } = req.body;
    const result = await categoryService.restoreCategory(
      req.params.id,
      cascade
    );
    return res.json(result);
  }),

  /**
   * @route PATCH /api/admin/categories/:id/status
   * @desc Cập nhật trạng thái active của danh mục
   * @access Staff/Admin
   */
  updateCategoryStatus: asyncHandler(async (req, res) => {
    const { isActive, cascade = true } = req.body;
    const result = await categoryService.updateCategoryStatus(
      req.params.id,
      isActive,
      cascade
    );
    return res.json(result);
  }),
};

module.exports = categoryController;
