const asyncHandler = require("express-async-handler");
const notificationService = require("@services/notification.service");

const notificationController = {
  /**
   * @route GET /api/users/notifications
   * @desc Lấy danh sách thông báo
   * @access Private
   */
  getNotifications: asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(
      req.user._id,
      req.query
    );

    return res.json(result);
  }),

  /**
   * @route PATCH /api/users/notifications/:id/read
   * @desc Đánh dấu đã đọc
   * @access Private
   */
  markAsRead: asyncHandler(async (req, res) => {
    const result = await notificationService.markAsRead(
      req.user._id,
      req.params.id
    );

    return res.json(result);
  }),

  /**
   * @route PATCH /api/users/notifications/read-all
   * @desc Đánh dấu tất cả đã đọc
   * @access Private
   */
  markAllAsRead: asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user._id);

    return res.json(result);
  }),

  /**
   * @route DELETE /api/users/notifications/:id
   * @desc Xóa thông báo
   * @access Private
   */
  deleteNotification: asyncHandler(async (req, res) => {
    const result = await notificationService.deleteNotification(
      req.user._id,
      req.params.id
    );

    return res.json(result);
  }),
};

module.exports = notificationController;

