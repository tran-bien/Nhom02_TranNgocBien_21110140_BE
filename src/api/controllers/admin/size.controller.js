const asyncHandler = require("express-async-handler");
const sizeService = require("@services/size.service");

const sizeController = {
  /**
   * @desc    Lấy danh sách tất cả kích thước (admin)
   * @route   GET /api/admin/sizes
   * @access  Staff/Admin
   */
  getAllSizes: asyncHandler(async (req, res) => {
    const result = await sizeService.getAdminSizes(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách kích thước đã xóa
   * @route   GET /api/admin/sizes/deleted
   * @access  Staff/Admin
   */
  getDeletedSizes: asyncHandler(async (req, res) => {
    const result = await sizeService.getDeletedSizes(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy thông tin chi tiết kích thước theo ID
   * @route   GET /api/admin/sizes/:id
   * @access  Staff/Admin
   */
  getSizeById: asyncHandler(async (req, res) => {
    const result = await sizeService.getAdminSizeById(req.params.id);
    res.json(result);
  }),

  /**
   * @desc    Tạo kích thước mới
   * @route   POST /api/admin/sizes
   * @access  Staff/Admin
   */
  createSize: asyncHandler(async (req, res) => {
    const result = await sizeService.createSize(req.body);
    res.status(201).json(result);
  }),

  /**
   * @desc    Cập nhật kích thước
   * @route   PUT /api/admin/sizes/:id
   * @access  Staff/Admin
   */
  updateSize: asyncHandler(async (req, res) => {
    const result = await sizeService.updateSize(req.params.id, req.body);
    res.json(result);
  }),

  /**
   * @desc    Xóa kích thước (soft delete) nếu không có biến thể liên quan
   * @route   DELETE /api/admin/sizes/:id
   * @access  Staff/Admin
   */
  deleteSize: asyncHandler(async (req, res) => {
    const result = await sizeService.deleteSize(req.params.id, req.user._id);
    res.json(result);
  }),

  /**
   * @desc    Khôi phục kích thước đã xóa
   * @route   PUT /api/admin/sizes/:id/restore
   * @access  Staff/Admin
   */
  restoreSize: asyncHandler(async (req, res) => {
    const result = await sizeService.restoreSize(req.params.id);
    res.json(result);
  }),
};

module.exports = sizeController;
