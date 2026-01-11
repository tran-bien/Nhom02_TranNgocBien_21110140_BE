const asyncHandler = require("express-async-handler");
const authService = require("@services/auth.service");

const authController = {
  /**
   * @desc    Admin: Lấy toàn bộ session của tất cả user
   * @route   GET /api/admin/auth/sessions
   * @access  Admin
   */
  getAllSessions: asyncHandler(async (req, res) => {
    const sessions = await authService.getAllSessions();
    res.json({
      success: true,
      data: { sessions },
      message: "Lấy danh sách session thành công",
    });
  }),

  /**
   * @desc    Admin: Đăng xuất user bất kỳ khỏi tất cả thiết bị
   * @route   DELETE /api/admin/auth/logout/:userId
   * @access  Admin
   */
  adminLogoutUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const count = await authService.logoutAll(userId);
    res.json({
      success: true,
      message: `Đã buộc đăng xuất ${count} phiên của user ${userId}`,
    });
  }),
};

module.exports = authController;
