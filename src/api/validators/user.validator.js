const { body, param } = require("express-validator");
const ApiError = require("@utils/ApiError");

/**
 * Validator cho API cập nhật thông tin cá nhân
 */
const validateUpdateProfile = [
  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tên không được để trống")
    .isLength({ min: 2, max: 100 })
    .withMessage("Tên phải có độ dài từ 2-100 ký tự"),

  body("phone")
    .optional()
    .isString()
    .trim()
    .matches(/^(0[3|5|7|8|9])+([0-9]{8})\b/)
    .withMessage("Số điện thoại không hợp lệ"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Giới tính không hợp lệ"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Ngày sinh không hợp lệ")
    .custom((value) => {
      const dob = new Date(value);
      const now = new Date();
      if (dob > now) {
        throw new ApiError(400, "Ngày sinh không thể lớn hơn ngày hiện tại");
      }
      return true;
    }),
];

/**
 * Validator cho API thêm địa chỉ mới
 */
const validateAddAddress = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tên người nhận không được để trống")
    .isLength({ min: 2, max: 100 })
    .withMessage("Tên người nhận phải có độ dài từ 2-100 ký tự"),

  body("phone")
    .isString()
    .trim()
    .matches(/^(0[35789])([0-9]{8})$/)
    .withMessage("Số điện thoại không hợp lệ (VD: 0912345678)"),

  body("province")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tỉnh/Thành phố không được để trống"),

  body("district")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Quận/Huyện không được để trống"),

  body("ward")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Phường/Xã không được để trống"),

  body("detail")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Địa chỉ chi tiết không được để trống"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái mặc định phải là boolean"),
];

/**
 * Validator cho API cập nhật địa chỉ
 */
const validateUpdateAddress = [
  param("id").isMongoId().withMessage("ID địa chỉ không hợp lệ"),

  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tên người nhận không được để trống")
    .isLength({ min: 2, max: 100 })
    .withMessage("Tên người nhận phải có độ dài từ 2-100 ký tự"),

  body("phone")
    .optional()
    .isString()
    .trim()
    .matches(/^(0[35789])([0-9]{8})$/)
    .withMessage("Số điện thoại không hợp lệ (VD: 0912345678)"),

  body("province")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tỉnh/Thành phố không được để trống"),

  body("district")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Quận/Huyện không được để trống"),

  body("ward")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Phường/Xã không được để trống"),

  body("detail")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Địa chỉ chi tiết không được để trống"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái mặc định phải là boolean"),
];

/**
 * Validator cho API thêm sản phẩm vào danh sách yêu thích
 */
const validateAddToWishlist = [
  body("productId").isMongoId().withMessage("ID sản phẩm không hợp lệ"),

  body("variantId")
    .optional()
    .isMongoId()
    .withMessage("ID biến thể không hợp lệ"),
];

/**
 * Validator cho API thu thập mã giảm giá
 */
const validateCollectCoupon = [
  body("couponCode")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Mã giảm giá không được để trống"),
];

/**
 * Validator cho API admin khóa tài khoản người dùng
 */
const validateToggleUserBlock = [
  param("id").isMongoId().withMessage("ID người dùng không hợp lệ"),

  body("isBlock").isBoolean().withMessage("Trạng thái khóa phải là boolean"),

  body("reason")
    .if(body("isBlock").equals("true"))
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Lý do khóa tài khoản không được để trống")
    .isLength({ min: 5, max: 200 })
    .withMessage("Lý do khóa tài khoản phải có độ dài từ 5-200 ký tự"),
];

/**
 * Validator cho API cập nhật tùy chọn thông báo
 */
const validateUpdateNotificationPreferences = [
  body("emailNotifications")
    .optional()
    .isObject()
    .withMessage("emailNotifications phải là object"),

  body("emailNotifications.orderUpdates")
    .optional()
    .isBoolean()
    .withMessage("orderUpdates phải là boolean"),

  body("inAppNotifications")
    .optional()
    .isBoolean()
    .withMessage("inAppNotifications phải là boolean"),
];

/**
 * Validator cho API chuyển đổi role người dùng
 */
const validateChangeUserRole = [
  param("id").isMongoId().withMessage("ID người dùng không hợp lệ"),

  body("role")
    .notEmpty()
    .withMessage("Role không được để trống")
    .isIn(["user", "staff", "shipper"])
    .withMessage("Role không hợp lệ. Chỉ hỗ trợ: user, staff, shipper"),
];

module.exports = {
  validateUpdateProfile,
  validateAddAddress,
  validateUpdateAddress,
  validateAddToWishlist,
  validateCollectCoupon,
  validateToggleUserBlock,
  validateUpdateNotificationPreferences,
  validateChangeUserRole,
};
