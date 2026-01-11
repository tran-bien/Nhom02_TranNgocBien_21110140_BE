const express = require("express");
const router = express.Router();
const filterController = require("@controllers/public/filter.controller");
const filterValidator = require("@validators/filter.validator");
const validate = require("@utils/validatehelper");

/**
 * @route   GET /api/v1/filters/attributes
 * @desc    Lấy tất cả thuộc tính lọc cho sản phẩm
 * @access  Public
 */
router.get("/attributes", filterController.getFilterAttributes);

/**
 * @route   GET /api/v1/filters/attributes/search
 * @desc    Lấy thuộc tính lọc động dựa trên kết quả tìm kiếm
 * @access  Public
 * @query   name - Tên sản phẩm (optional)
 * @query   category - ID danh mục (optional)
 * @query   brand - ID thương hiệu (optional)
 */
router.get("/attributes/search", filterController.getFilterAttributesBySearch);

/**
 * @route   GET /api/v1/filters/suggestions
 * @desc    Lấy gợi ý tìm kiếm
 * @access  Public
 */
router.get("/suggestions", filterController.getSuggestions);

module.exports = router;
