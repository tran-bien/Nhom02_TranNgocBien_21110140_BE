const asyncHandler = require("express-async-handler");
const blogService = require("@services/blog.service");

const blogController = {
  /**
   * @route GET /api/blogs
   * @desc Lấy danh sách blog posts (public)
   * @access Public
   */
  getPublicPosts: asyncHandler(async (req, res) => {
    const result = await blogService.getPublicPosts(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/blogs/:slug
   * @desc Lấy chi tiết blog post theo slug
   * @access Public
   */
  getPostBySlug: asyncHandler(async (req, res) => {
    const result = await blogService.getPostBySlug(req.params.slug);
    return res.json(result);
  }),
};

module.exports = blogController;
