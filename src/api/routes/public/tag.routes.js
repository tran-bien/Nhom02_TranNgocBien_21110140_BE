const express = require("express");
const router = express.Router();
const tagController = require("@controllers/public/tag.controller");
const tagValidator = require("@validators/tag.validator");
const validate = require("@utils/validatehelper");

/**
 * @route   GET /api/v1/tags
 * @desc    Lấy tất cả tags đang active và chưa xóa
 * @access  Public
 */
router.get("/", tagController.getPublicAllTags);

/**
 * @route   GET /api/v1/tags/type/:type
 * @desc    Lấy tags theo type (MATERIAL/USECASE/CUSTOM)
 * @access  Public
 */
router.get(
  "/type/:type",
  validate(tagValidator.validateTagType),
  tagController.getPublicTagsByType
);

/**
 * @route   GET /api/v1/tags/:id
 * @desc    Lấy chi tiết tag theo ID
 * @access  Public
 */
router.get(
  "/:id",
  validate(tagValidator.validateTagId),
  tagController.getPublicTagById
);

module.exports = router;
