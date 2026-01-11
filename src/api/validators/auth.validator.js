const { body, param } = require("express-validator");
const mongoose = require("mongoose");
const User = require("@models/user");
const ApiError = require("@utils/ApiError");

// Validator cho đăng ký user
const validateRegisterInput = [
  body("name").trim().notEmpty().withMessage("Tên không được để trống"),
  body("email")
    .notEmpty()
    .withMessage("Vui lòng cung cấp email")
    .isEmail()
    .withMessage("Email không hợp lệ"),
];

// Validator cho mật khẩu (để dùng trong đăng ký hoặc đổi mật khẩu)
const validatePassword = [
  body("password")
    .notEmpty()
    .withMessage("Vui lòng cung cấp mật khẩu")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/[A-Za-z]/)
    .withMessage("Mật khẩu phải có ít nhất 1 chữ cái")
    .matches(/\d/)
    .withMessage("Mật khẩu phải có ít nhất 1 số")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Mật khẩu phải có ít nhất 1 ký tự đặc biệt"),
];

// Validator cho quên mật khẩu
const validateForgotPassword = [
  body("email")
    .notEmpty()
    .withMessage("Vui lòng cung cấp email")
    .isEmail()
    .withMessage("Email không hợp lệ"),
];

// Validator cho đặt lại mật khẩu
const validateResetPassword = [
  body("resetToken")
    .notEmpty()
    .withMessage("Vui lòng cung cấp token đặt lại mật khẩu"),
  body("password")
    .notEmpty()
    .withMessage("Vui lòng cung cấp mật khẩu mới và xác nhận mật khẩu")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/[A-Za-z]/)
    .withMessage("Mật khẩu phải có ít nhất 1 chữ cái")
    .matches(/\d/)
    .withMessage("Mật khẩu phải có ít nhất 1 số")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Mật khẩu phải có ít nhất 1 ký tự đặc biệt"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new ApiError(400, "Mật khẩu mới và xác nhận mật khẩu không khớp");
    }
    return true;
  }),
];

// Validator cho thay đổi mật khẩu
const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Vui lòng cung cấp mật khẩu hiện tại"),
  body("newPassword")
    .notEmpty()
    .withMessage("Vui lòng cung cấp mật khẩu mới")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu mới phải có ít nhất 8 ký tự")
    .matches(/[A-Za-z]/)
    .withMessage("Mật khẩu mới phải có ít nhất 1 chữ cái")
    .matches(/\d/)
    .withMessage("Mật khẩu mới phải có ít nhất 1 số")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new ApiError(400, "Mật khẩu mới phải khác mật khẩu hiện tại");
      }
      return true;
    }),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Vui lòng xác nhận mật khẩu")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new ApiError(400, "Mật khẩu mới và xác nhận mật khẩu không khớp");
      }
      return true;
    }),
];

// Validator cho đăng nhập
const validateLoginInput = [
  body("email")
    .notEmpty()
    .withMessage("Vui lòng cung cấp email")
    .isEmail()
    .withMessage("Email không hợp lệ"),
  body("password").notEmpty().withMessage("Vui lòng cung cấp mật khẩu"),
];

// Validator cho admin logout user
// FIX Bug #6: Loại bỏ async database query trong validator
// Việc check user tồn tại nên được thực hiện trong service/controller
const validateAdminLogoutUser = [
  param("userId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp userId")
    .isMongoId()
    .withMessage("User ID không hợp lệ"),
];

// Validator cho xác thực OTP
const validateVerifyOTP = [
  body("otp")
    .notEmpty()
    .withMessage("Vui lòng cung cấp mã OTP")
    .isLength({ min: 6, max: 6 })
    .withMessage("Mã OTP phải có 6 ký tự")
    .isNumeric()
    .withMessage("Mã OTP phải là số"),
  body().custom((_, { req }) => {
    if (!req.body.userId && !req.body.email) {
      throw new ApiError(400, "Vui lòng cung cấp userId hoặc email");
    }
    if (req.body.email && !req.body.email.match(/^\S+@\S+\.\S+$/)) {
      throw new ApiError(400, "Email không hợp lệ");
    }
    if (req.body.userId && !mongoose.Types.ObjectId.isValid(req.body.userId)) {
      throw new ApiError(400, "User ID không hợp lệ");
    }
    return true;
  }),
];

// Validator cho refresh token
const validateRefreshToken = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Vui lòng cung cấp refresh token"),
];

// Validator cho logout session
const validateLogoutSession = [
  param("sessionId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp sessionId")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new ApiError(400, "Session ID không hợp lệ");
      }
      return true;
    }),
];

module.exports = {
  validateRegisterInput,
  validatePassword,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateLoginInput,
  validateAdminLogoutUser,
  validateVerifyOTP,
  validateRefreshToken,
  validateLogoutSession,
};
