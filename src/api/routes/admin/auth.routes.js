const express = require("express");
const { protect, admin } = require("@middlewares/auth.middleware");
const authController = require("@controllers/admin/auth.controller");
const authValidator = require("@validators/auth.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);
router.use(admin);

/**
 * @route   GET /api/v1/admin/sessions
 * @desc    Lấy toàn bộ session
 * @access  Admin
 */
router.get("/sessions", authController.getAllSessions);

/**
 * @route   DELETE /api/v1/admin/logout/:userId
 * @desc    Đăng xuất user bất kỳ
 * @access  Admin
 */
router.delete(
  "/logout/:userId",
  validate(authValidator.validateAdminLogoutUser),
  authController.adminLogoutUser
);

module.exports = router;
