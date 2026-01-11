const asyncHandler = require("express-async-handler");
const tagService = require("@services/tag.service");

const tagController = {
  /**
   * @desc    Lấy tất cả tags
   * @route   GET /api/v1/admin/tags
   * @access  Staff/Admin
   */
  getAllTags: asyncHandler(async (req, res) => {
    const result = await tagService.getAllTags(req.query);
    res.status(200).json(result);
  }),

  /**
   * @desc    Lấy danh sách tags đã xóa
   * @route   GET /api/v1/admin/tags/deleted
   * @access  Staff/Admin
   */
  getDeletedTags: asyncHandler(async (req, res) => {
    const result = await tagService.getDeletedTags(req.query);
    res.status(200).json(result);
  }),

  /**
   * @desc    Lấy chi tiết tag theo ID
   * @route   GET /api/v1/admin/tags/:id
   * @access  Staff/Admin
   */
  getTagById: asyncHandler(async (req, res) => {
    const result = await tagService.getTagById(req.params.id);
    res.status(200).json(result);
  }),

  /**
   * @desc    Tạo tag mới
   * @route   POST /api/v1/admin/tags
   * @access  Staff/Admin
   */
  createTag: asyncHandler(async (req, res) => {
    const result = await tagService.createTag(req.body);
    res.status(201).json(result);
  }),

  /**
   * @desc    Cập nhật tag
   * @route   PUT /api/v1/admin/tags/:id
   * @access  Staff/Admin
   */
  updateTag: asyncHandler(async (req, res) => {
    const result = await tagService.updateTag(req.params.id, req.body);
    res.status(200).json(result);
  }),

  /**
   * @desc    Xóa mềm tag
   * @route   DELETE /api/v1/admin/tags/:id
   * @access  Staff/Admin
   */
  deleteTag: asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const result = await tagService.deleteTag(req.params.id, userId);
    res.status(200).json(result);
  }),

  /**
   * @desc    Khôi phục tag đã xóa
   * @route   PATCH /api/v1/admin/tags/:id/restore
   * @access  Staff/Admin
   */
  restoreTag: asyncHandler(async (req, res) => {
    const result = await tagService.restoreTag(req.params.id);
    res.status(200).json(result);
  }),

  /**
   * @desc    Cập nhật trạng thái active/inactive
   * @route   PATCH /api/v1/admin/tags/:id/status
   * @access  Staff/Admin
   */
  updateTagStatus: asyncHandler(async (req, res) => {
    const result = await tagService.updateTagStatus(
      req.params.id,
      req.body.isActive
    );
    res.status(200).json(result);
  }),
};

module.exports = tagController;
