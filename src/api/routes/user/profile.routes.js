const express = require("express");
const { protect } = require("@middlewares/auth.middleware");
const profileController = require("@controllers/user/profile.controller");
const userValidator = require("@validators/user.validator");
const validate = require("@utils/validatehelper");

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Lấy thông tin cá nhân
 * @access  Private
 */
router.get("/", profileController.getUserProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Cập nhật thông tin cá nhân
 * @access  Private
 */
router.put(
  "/",
  validate(userValidator.validateUpdateProfile),
  profileController.updateUserProfile
);

/**
 * @route   GET /api/v1/users/addresses
 * @desc    Lấy danh sách địa chỉ
 * @access  Private
 */
router.get("/addresses", profileController.getUserAddresses);

/**
 * @route   POST /api/v1/users/addresses
 * @desc    Thêm địa chỉ mới
 * @access  Private
 */
router.post(
  "/addresses",
  validate(userValidator.validateAddAddress),
  profileController.addUserAddress
);

/**
 * @route   PUT /api/v1/users/addresses/:id
 * @desc    Cập nhật địa chỉ
 * @access  Private
 */
router.put(
  "/addresses/:id",
  validate(userValidator.validateUpdateAddress),
  profileController.updateUserAddress
);

/**
 * @route   DELETE /api/v1/users/addresses/:id
 * @desc    Xóa địa chỉ
 * @access  Private
 */
router.delete("/addresses/:id", profileController.deleteUserAddress);

/**
 * @route   PUT /api/v1/users/addresses/:id/default
 * @desc    Đặt địa chỉ mặc định
 * @access  Private
 */
router.put("/addresses/:id/default", profileController.setDefaultAddress);

/**
 * @route   GET /api/v1/users/preferences/notifications
 * @desc    Lấy tùy chọn thông báo
 * @access  Private
 */
router.get(
  "/preferences/notifications",
  profileController.getNotificationPreferences
);

/**
 * @route   PUT /api/v1/users/preferences/notifications
 * @desc    Cập nhật tùy chọn thông báo
 * @access  Private
 */
router.put(
  "/preferences/notifications",
  validate(userValidator.validateUpdateNotificationPreferences),
  profileController.updateNotificationPreferences
);

module.exports = router;
