const asyncHandler = require("express-async-handler");
const userService = require("@services/user.service");

const profileController = {
  /**
   * @route   GET /api/users/profile
   * @desc    Lấy thông tin cá nhân
   * @access  Private
   */
  getUserProfile: asyncHandler(async (req, res) => {
    const { user } = req;
    const result = await userService.getUserProfile(user._id);

    res.json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: result.user,
    });
  }),

  /**
   * @route   PUT /api/users/profile
   * @desc    Cập nhật thông tin cá nhân
   * @access  Private
   */
  updateUserProfile: asyncHandler(async (req, res) => {
    const { user } = req;
    const userData = req.body;

    const result = await userService.updateUserProfile(user._id, userData);

    res.json({
      success: true,
      message: result.message,
      data: result.user,
    });
  }),

  /**
   * @route   GET /api/users/addresses
   * @desc    Lấy danh sách địa chỉ
   * @access  Private
   */
  getUserAddresses: asyncHandler(async (req, res) => {
    const { user } = req;
    const result = await userService.getUserAddresses(user._id);

    res.json({
      success: true,
      message: "Lấy danh sách địa chỉ thành công",
      data: result.addresses,
    });
  }),

  /**
   * @route   POST /api/users/addresses
   * @desc    Thêm địa chỉ mới
   * @access  Private
   */
  addUserAddress: asyncHandler(async (req, res) => {
    const { user } = req;
    const addressData = req.body;

    const result = await userService.addUserAddress(user._id, addressData);

    res.status(201).json({
      success: true,
      message: result.message,
      data: { address: result.address },
    });
  }),

  /**
   * @route   PUT /api/users/addresses/:id
   * @desc    Cập nhật địa chỉ
   * @access  Private
   */
  updateUserAddress: asyncHandler(async (req, res) => {
    const { user } = req;
    const { id } = req.params;
    const addressData = req.body;

    const result = await userService.updateUserAddress(
      user._id,
      id,
      addressData
    );

    res.json({
      success: true,
      message: result.message,
      data: { address: result.address },
    });
  }),

  /**
   * @route   DELETE /api/users/addresses/:id
   * @desc    Xóa địa chỉ
   * @access  Private
   */
  deleteUserAddress: asyncHandler(async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    const result = await userService.deleteUserAddress(user._id, id);

    res.json({
      success: true,
      message: result.message,
    });
  }),

  /**
   * @route   PUT /api/users/addresses/:id/default
   * @desc    Đặt địa chỉ mặc định
   * @access  Private
   */
  setDefaultAddress: asyncHandler(async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    const result = await userService.setDefaultAddress(user._id, id);

    res.json({
      success: true,
      message: result.message,
    });
  }),

  /**
   * @route   GET /api/users/preferences/notifications
   * @desc    Lấy tùy chọn thông báo
   * @access  Private
   */
  getNotificationPreferences: asyncHandler(async (req, res) => {
    const { user } = req;
    const result = await userService.getNotificationPreferences(user._id);

    res.json({
      success: true,
      message: "Lấy tùy chọn thông báo thành công",
      data: result.preferences,
    });
  }),

  /**
   * @route   PUT /api/users/preferences/notifications
   * @desc    Cập nhật tùy chọn thông báo
   * @access  Private
   */
  updateNotificationPreferences: asyncHandler(async (req, res) => {
    const { user } = req;
    const preferences = req.body;

    const result = await userService.updateNotificationPreferences(
      user._id,
      preferences
    );

    res.json({
      success: true,
      message: result.message,
      data: result.preferences,
    });
  }),
};

module.exports = profileController;
