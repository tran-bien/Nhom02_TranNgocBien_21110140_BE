const asyncHandler = require("express-async-handler");
const authService = require("@services/auth.service");

const authController = {
  /**
   * @desc    Đăng ký tài khoản mới
   * @route   POST /api/auth/register
   * @access  Public
   */
  register: asyncHandler(async (req, res) => {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  }),

  /**
   * @desc    Xác thực OTP
   * @route   POST /api/auth/verify-otp
   * @access  Public
   */
  verifyOTP: asyncHandler(async (req, res) => {
    const result = await authService.verifyOTP({
      email: req.body.email,
      otp: req.body.otp,
      req,
    });
    res.json(result);
  }),

  /**
   * @desc    Đăng nhập tài khoản
   * @route   POST /api/auth/login
   * @access  Public
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password, req);
    res.json(result);
  }),

  /**
   * @desc    Làm mới access token bằng refresh token
   * @route   POST /api/auth/refresh-token
   * @access  Public
   */
  refreshToken: asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json(result);
  }),

  /**
   * @desc    Đăng xuất tài khoản
   * @route   POST /api/auth/logout
   * @access  Public
   */
  logout: asyncHandler(async (req, res) => {
    const result = await authService.logout(req.body.refreshToken);
    res.json(result);
  }),

  /**
   * @desc    Yêu cầu đặt lại mật khẩu
   * @route   POST /api/auth/forgot-password
   * @access  Public
   */
  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.json(result);
  }),

  /**
   * @desc    Đặt lại mật khẩu bằng token
   * @route   POST /api/auth/reset-password
   * @access  Public
   */
  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(
      req.body.resetToken,
      req.body.password
    );
    res.json(result);
  }),

  /**
   * @desc    Xác thực email
   * @route   GET /api/auth/verify-email
   * @access  Public
   */
  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.query.token);
    res.json(result);
  }),

  /**
   * @desc    Thay đổi mật khẩu
   * @route   POST /api/auth/change-password
   * @access  Private
   */
  changePassword: asyncHandler(async (req, res) => {
    const result = await authService.changePassword(
      req.user._id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json(result);
  }),

  /**
   * @desc    Lấy danh sách phiên đăng nhập
   * @route   GET /api/auth/sessions
   * @access  Private
   */
  getCurrentSessions: asyncHandler(async (req, res) => {
    const sessions = await authService.getCurrentSessions(
      req.user._id,
      req.token
    );
    res.json({
      success: true,
      message: "Lấy danh sách phiên thành công",
      data: sessions,
    });
  }),

  /**
   * @desc    Đăng xuất khỏi một phiên
   * @route   DELETE /api/auth/sessions/:sessionId
   * @access  Private
   */
  logoutSession: asyncHandler(async (req, res) => {
    const result = await authService.logoutSession(
      req.user._id,
      req.params.sessionId
    );
    res.json({
      success: true,
      message: "Đăng xuất khỏi phiên thành công",
      data: result,
    });
  }),

  /**
   * @desc    Đăng xuất khỏi tất cả phiên trừ phiên hiện tại
   * @route   DELETE /api/auth/sessions
   * @access  Private
   */
  logoutAllOtherSessions: asyncHandler(async (req, res) => {
    const result = await authService.logoutAllOtherSessions(
      req.user._id,
      req.token
    );
    res.json({
      success: true,
      message: `Đã đăng xuất khỏi ${result} phiên khác`,
    });
  }),

  /**
   * @desc    Đăng xuất khỏi tất cả phiên
   * @route   DELETE /api/auth/logout-all
   * @access  Private
   */
  logoutAll: asyncHandler(async (req, res) => {
    const count = await authService.logoutAll(req.user._id);
    res.json({
      success: true,
      message: `Đã đăng xuất khỏi tất cả ${count} phiên`,
    });
  }),
};

module.exports = authController;
