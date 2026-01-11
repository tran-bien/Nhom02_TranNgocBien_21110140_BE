const express = require("express");
const router = express.Router();
const blogCategoryController = require("@controllers/admin/blogCategory.controller");
const blogValidator = require("@validators/blog.validator");
const validate = require("@utils/validatehelper");
const {
  protect,
  requireStaffOrAdmin,
} = require("@middlewares/auth.middleware");

router.use(protect);
router.use(requireStaffOrAdmin);

/**
 * @route GET /api/v1/admin/blogs/categories
 * @desc [ADMIN] Lấy tất cả categories (kể cả inactive)
 * @access Admin/Staff
 */
router.get("/", blogCategoryController.getAdminCategories);

/**
 * @route GET /api/v1/admin/blogs/categories/:id
 * @desc [ADMIN] Lấy chi tiết category
 * @access Admin/Staff
 */
router.get("/:id", blogCategoryController.getCategoryById);

/**
 * @route POST /api/v1/admin/blogs/categories
 * @desc [ADMIN] Tạo category mới
 * @access Admin/Staff
 */
router.post(
  "/",
  validate(blogValidator.validateCreateBlogCategory),
  blogCategoryController.createCategory
);

/**
 * @route PUT /api/v1/admin/blogs/categories/:id
 * @desc [ADMIN] Cập nhật category
 * @access Admin/Staff
 */
router.put(
  "/:id",
  validate([
    blogValidator.validateBlogCategoryId,
    blogValidator.validateUpdateBlogCategory,
  ]),
  blogCategoryController.updateCategory
);

/**
 * @route DELETE /api/v1/admin/blogs/categories/:id
 * @desc [ADMIN] Xóa category (soft delete)
 * @access Admin/Staff
 */
router.delete("/:id", blogCategoryController.deleteCategory);

module.exports = router;
