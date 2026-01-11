const express = require("express");
const router = express.Router();
const tagController = require("@controllers/admin/tag.controller");
const tagValidator = require("@validators/tag.validator");
const validate = require("@utils/validatehelper");
const {
  protect,
  requireStaffOrAdmin,
  requireStaffReadOnly,
} = require("@middlewares/auth.middleware");

// Tất cả routes đều yêu cầu authentication
router.use(protect);

/**
 * @route   GET /api/v1/admin/tags
 * @desc    Lấy tất cả tags (có phân trang, filter)
 * @access  Staff/Admin
 */
router.get(
  "/",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagQuery),
  tagController.getAllTags
);

/**
 * @route   GET /api/v1/admin/tags/deleted
 * @desc    Lấy danh sách tags đã xóa
 * @access  Staff/Admin
 */
router.get(
  "/deleted",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagQuery),
  tagController.getDeletedTags
);

/**
 * @route   GET /api/v1/admin/tags/:id
 * @desc    Lấy chi tiết tag theo ID
 * @access  Staff/Admin
 */
router.get(
  "/:id",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagId),
  tagController.getTagById
);

/**
 * @route   POST /api/v1/admin/tags
 * @desc    Tạo tag mới
 * @access  Staff/Admin
 */
router.post(
  "/",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagData),
  tagController.createTag
);

/**
 * @route   PUT /api/v1/admin/tags/:id
 * @desc    Cập nhật tag
 * @access  Staff/Admin
 */
router.put(
  "/:id",
  requireStaffOrAdmin,
  validate([...tagValidator.validateTagId, ...tagValidator.validateTagData]),
  tagController.updateTag
);

/**
 * @route   DELETE /api/v1/admin/tags/:id
 * @desc    Xóa mềm tag
 * @access  Staff/Admin
 */
router.delete(
  "/:id",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagId),
  tagController.deleteTag
);

/**
 * @route   PATCH /api/v1/admin/tags/:id/restore
 * @desc    Khôi phục tag đã xóa
 * @access  Staff/Admin
 */
router.patch(
  "/:id/restore",
  requireStaffOrAdmin,
  validate(tagValidator.validateTagId),
  tagController.restoreTag
);

/**
 * @route   PATCH /api/v1/admin/tags/:id/status
 * @desc    Cập nhật trạng thái active/inactive
 * @access  Staff/Admin
 */
router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  validate(tagValidator.validateStatusUpdate),
  tagController.updateTagStatus
);

module.exports = router;
