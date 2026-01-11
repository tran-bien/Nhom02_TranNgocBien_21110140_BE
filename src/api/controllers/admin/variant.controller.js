const asyncHandler = require("express-async-handler");
const variantService = require("@services/variant.service");

const variantController = {
  /**
   * @desc    Lấy danh sách biến thể (có phân trang, filter)
   * @route   GET /api/admin/variants
   * @access  Staff/Admin
   */
  getAllVariants: asyncHandler(async (req, res) => {
    const result = await variantService.getAdminVariants(req.query);
    res.json(result);
  }),

  /**
   * @desc    Lấy chi tiết biến thể theo ID
   * @route   GET /api/admin/variants/:id
   * @access  Staff/Admin
   */
  getVariantById: asyncHandler(async (req, res) => {
    const result = await variantService.getAdminVariantById(req.params.id);
    res.json(result);
  }),

  /**
   * @desc    Tạo biến thể mới
   * @route   POST /api/admin/variants
   * @access  Staff/Admin
   */
  createVariant: asyncHandler(async (req, res) => {
    const result = await variantService.createVariant(req.body);
    res.status(201).json(result);
  }),

  /**
   * @desc    Cập nhật thông tin biến thể
   * @route   PUT /api/admin/variants/:id
   * @access  Staff/Admin
   */
  updateVariant: asyncHandler(async (req, res) => {
    const result = await variantService.updateVariant(req.params.id, req.body);
    res.json(result);
  }),

  /**
   * @route DELETE /api/admin/variants/:id
   * @desc Xóa mềm biến thể hoặc vô hiệu hóa nếu có đơn hàng liên quan
   */
  deleteVariant: asyncHandler(async (req, res) => {
    const result = await variantService.deleteVariant(
      req.params.id,
      req.user._id
    );
    return res.json(result);
  }),

  /**
   * @desc    Khôi phục biến thể đã xóa
   * @route   POST /api/admin/variants/:id/restore
   * @access  Staff/Admin
   */
  restoreVariant: asyncHandler(async (req, res) => {
    try {
      const result = await variantService.restoreVariant(req.params.id);
      return res.json(result);
    } catch (error) {
      // Đối với các lỗi khác, middleware xử lý lỗi sẽ tiếp quản
      throw error;
    }
  }),

  /**
   * @desc    Cập nhật trạng thái active của biến thể
   * @route   PATCH /api/admin/variants/:id/status
   * @access  Staff/Admin
   */
  updateVariantStatus: asyncHandler(async (req, res) => {
    const result = await variantService.updateVariantStatus(
      req.params.id,
      req.body.isActive
    );
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách biến thể đã xóa
   * @route   GET /api/admin/variants/deleted
   * @access  Staff/Admin
   */
  getDeletedVariants: asyncHandler(async (req, res) => {
    const result = await variantService.getAdminDeletedVariants(req.query);
    res.json(result);
  }),

  /**
   * @desc    Kiểm tra ràng buộc của các size trong variant
   * @route   GET /api/admin/variants/:id/size-constraints
   * @access  Staff/Admin
   */
  checkSizeConstraints: asyncHandler(async (req, res) => {
    const result = await variantService.checkSizeConstraints(req.params.id);
    res.json(result);
  }),
};

module.exports = variantController;
