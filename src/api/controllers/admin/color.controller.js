const asyncHandler = require("express-async-handler");
const colorService = require("@services/color.service");

const colorController = {
  /**
   * @desc    Lấy danh sách tất cả màu sắc (admin)
   * @route   GET /api/admin/colors
   * @access  Staff/Admin
   */
  getAllColors: asyncHandler(async (req, res) => {
    const result = await colorService.getAdminColors(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách màu sắc đã xóa
   * @route   GET /api/admin/colors/deleted
   * @access  Staff/Admin
   */
  getDeletedColors: asyncHandler(async (req, res) => {
    const result = await colorService.getDeletedColors(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy thông tin chi tiết màu sắc theo ID
   * @route   GET /api/admin/colors/:id
   * @access  Staff/Admin
   */
  getColorById: asyncHandler(async (req, res) => {
    const result = await colorService.getAdminColorById(req.params.id);
    res.json(result);
  }),

  /**
   * @desc    Tạo màu sắc mới
   * @route   POST /api/admin/colors
   * @access  Staff/Admin
   */
  createColor: asyncHandler(async (req, res) => {
    const result = await colorService.createColor(req.body);
    res.status(201).json(result);
  }),

  /**
   * @desc    Cập nhật màu sắc
   * @route   PUT /api/admin/colors/:id
   * @access  Staff/Admin
   */
  updateColor: asyncHandler(async (req, res) => {
    const result = await colorService.updateColor(req.params.id, req.body);
    res.json(result);
  }),

  /**
   * @desc    Xóa màu sắc (soft delete) nếu không có biến thể liên quan
   * @route   DELETE /api/admin/colors/:id
   * @access  Staff/Admin
   */
  deleteColor: asyncHandler(async (req, res) => {
    const result = await colorService.deleteColor(req.params.id, req.user._id);
    res.json(result);
  }),

  /**
   * @desc    Khôi phục màu sắc đã xóa
   * @route   PUT /api/admin/colors/:id/restore
   * @access  Staff/Admin
   */
  restoreColor: asyncHandler(async (req, res) => {
    const result = await colorService.restoreColor(req.params.id);
    res.json(result);
  }),
};

module.exports = colorController;
