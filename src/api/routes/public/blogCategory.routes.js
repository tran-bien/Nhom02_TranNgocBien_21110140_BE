const express = require("express");
const router = express.Router();
const blogCategoryController = require("@controllers/public/blogCategory.controller");

/**
 * @route GET /api/v1/blogs/categories
 * @desc Lấy danh sách categories (chỉ active)
 * @access Public
 */
router.get("/", blogCategoryController.getAllCategories);

/**
 * @route GET /api/v1/blogs/categories/:id
 * @desc Lấy chi tiết category
 * @access Public
 */
router.get("/:id", blogCategoryController.getCategoryById);

module.exports = router;
