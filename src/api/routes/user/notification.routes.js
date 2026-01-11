const express = require("express");
const router = express.Router();
const notificationController = require("@controllers/user/notification.controller");
const { protect } = require("@middlewares/auth.middleware");
const validateRequest = require("@middlewares/validateRequest");
const {
  validateNotificationsQuery,
  validateNotificationId,
} = require("@validators/notification.validator");

router.use(protect);

/**
 * @route GET /api/users/notifications
 * @desc Lấy danh sách thông báo
 */
router.get(
  "/",
  validateNotificationsQuery,
  validateRequest,
  notificationController.getNotifications
);

/**
 * @route PATCH /api/users/notifications/read-all
 * @desc Đánh dấu tất cả đã đọc
 */
router.patch("/read-all", notificationController.markAllAsRead);

/**
 * @route PATCH /api/users/notifications/:id/read
 * @desc Đánh dấu đã đọc
 */
router.patch(
  "/:id/read",
  validateNotificationId,
  validateRequest,
  notificationController.markAsRead
);

/**
 * @route DELETE /api/users/notifications/:id
 * @desc Xóa thông báo
 */
router.delete(
  "/:id",
  validateNotificationId,
  validateRequest,
  notificationController.deleteNotification
);

module.exports = router;
