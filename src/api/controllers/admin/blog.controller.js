const asyncHandler = require("express-async-handler");
const blogService = require("@services/blog.service");

const blogController = {
  /**
   * @route GET /api/admin/blogs
   * @desc Lấy danh sách blog posts (admin)
   * @access Staff/Admin
   */
  getAllPosts: asyncHandler(async (req, res) => {
    const result = await blogService.getAdminPosts(req.query);
    return res.json(result);
  }),

  /**
   * @route GET /api/admin/blogs/:id
   * @desc Lấy chi tiết blog post
   * @access Staff/Admin
   */
  getPostById: asyncHandler(async (req, res) => {
    const result = await blogService.getPostById(req.params.id);
    return res.json(result);
  }),

  /**
   * @route POST /api/admin/blogs
   * @desc Tạo blog post mới
   * @access Staff/Admin
   */
  createPost: asyncHandler(async (req, res) => {
    const result = await blogService.createPost(req.body, req.user._id);
    return res.status(201).json(result);
  }),

  /**
   * @route PUT /api/admin/blogs/:id
   * @desc Cập nhật blog post
   * @access Staff/Admin
   */
  updatePost: asyncHandler(async (req, res) => {
    const result = await blogService.updatePost(
      req.params.id,
      req.body,
      req.user._id
    );
    return res.json(result);
  }),

  /**
   * @route DELETE /api/admin/blogs/:id
   * @desc Xóa blog post
   * @access Staff/Admin
   */
  deletePost: asyncHandler(async (req, res) => {
    const result = await blogService.deletePost(req.params.id, req.user._id);
    return res.json(result);
  }),
};

module.exports = blogController;
