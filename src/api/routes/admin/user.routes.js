const express = require("express");
const { protect, requireAdminOnly } = require("@middlewares/auth.middleware");
const userController = require("@controllers/admin/user.controller");
const userValidator = require("@validators/user.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes - CHỈ ADMIN
router.use(protect);
router.use(requireAdminOnly);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Lấy danh sách người dùng (phân trang)
 * @access  Admin
 */
router.get("/", userController.getAllUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Lấy chi tiết người dùng
 * @access  Admin
 */
router.get("/:id", userController.getUserDetails);

/**
 * @route   PUT /api/v1/admin/users/:id/block
 * @desc    Khóa/mở khóa tài khoản người dùng
 * @access  Admin
 */
router.put(
  "/:id/block",
  validate(userValidator.validateToggleUserBlock),
  userController.toggleUserBlock
);

/**
 * @route   PUT /api/v1/admin/users/:id/role
 * @desc    Chuyển đổi role người dùng
 * @access  Admin Only
 */
router.put(
  "/:id/role",
  validate(userValidator.validateChangeUserRole),
  userController.changeUserRole
);

module.exports = router;
