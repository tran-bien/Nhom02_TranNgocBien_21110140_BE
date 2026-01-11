const express = require("express");
const router = express.Router();
const blogController = require("@controllers/public/blog.controller");
const blogValidator = require("@validators/blog.validator");
const validate = require("@utils/validatehelper");

/**
 * @route GET /api/blogs
 * @desc Lấy danh sách blog posts (public)
 * @access Public
 */
router.get(
  "/",
  validate(blogValidator.validateBlogPostQuery),
  blogController.getPublicPosts
);

/**
 * @route GET /api/blogs/:slug
 * @desc Lấy chi tiết blog post theo slug
 * @access Public
 */
router.get(
  "/:slug",
  validate(blogValidator.validateSlug),
  blogController.getPostBySlug
);

module.exports = router;
