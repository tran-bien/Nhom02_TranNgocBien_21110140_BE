const express = require("express");
const categoryController = require("@controllers/public/category.controller");
const categoryValidator = require("@validators/category.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

/**
 * @route   GET /api/v1/categories
 * @desc    Lấy tất cả danh mục đang active và chưa xóa
 * @access  Public
 */
router.get("/", categoryController.getPublicAllCategories);

/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Lấy chi tiết danh mục theo slug
 * @access  Public
 */
router.get(
  "/slug/:slug",
  validate(categoryValidator.validateCategorySlug),
  categoryController.getCategoryBySlug
);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Lấy chi tiết danh mục theo ID
 * @access  Public
 */
router.get(
  "/:id",
  validate(categoryValidator.validateCategoryId),
  categoryController.getPublicCategoryById
);

module.exports = router;
