const asyncHandler = require("express-async-handler");
const userService = require("@services/user.service");

const userController = {
  /**
   * @route   GET /api/admin/users
   * @desc    Lấy danh sách người dùng (phân trang)
   * @access  Admin
   */
  getAllUsers: asyncHandler(async (req, res) => {
    const result = await userService.adminUserService.getAllUsers(req.query);

    res.json({
      success: true,
      ...result,
    });
  }),

  /**
   * @route   GET /api/admin/users/:id
   * @desc    Lấy chi tiết người dùng
   * @access  Admin
   */
  getUserDetails: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await userService.adminUserService.getUserDetails(id);

    res.json({
      success: true,
      user: result.user,
    });
  }),

  /**
   * @route   PUT /api/admin/users/:id/block
   * @desc    Khóa/mở khóa tài khoản người dùng
   * @access  Admin
   */
  toggleUserBlock: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isBlock, reason } = req.body;

    const result = await userService.adminUserService.toggleUserBlock(
      id,
      isBlock,
      reason
    );

    res.json({
      success: true,
      message: result.message,
    });
  }),

  /**
   * @route   PUT /api/admin/users/:id/role
   * @desc    Chuyển đổi role người dùng (CHỈ ADMIN)
   * @access  Admin Only
   */
  changeUserRole: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user._id.toString();

    const result = await userService.adminUserService.changeUserRole(
      id,
      role,
      adminId
    );

    res.json(result);
  }),
};

module.exports = userController;
