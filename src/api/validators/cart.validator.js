const { body, param } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

/**
 * Kiểm tra ID có phải là MongoDB ObjectId hợp lệ không
 */
const isValidObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, "ID không hợp lệ");
  }
  return true;
};

/**
 * Validator cho thêm sản phẩm vào giỏ hàng
 */
const validateAddToCart = [
  body("variantId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp ID biến thể")
    .custom(isValidObjectId)
    .withMessage("ID biến thể không hợp lệ"),

  body("sizeId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp ID kích thước")
    .custom(isValidObjectId)
    .withMessage("ID kích thước không hợp lệ"),

  body("quantity")
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage("Số lượng phải là số nguyên từ 1-99"),
];

/**
 * Validator cho cập nhật số lượng sản phẩm trong giỏ hàng
 */
const validateUpdateCartItem = [
  param("itemId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp ID sản phẩm trong giỏ hàng")
    .custom(isValidObjectId)
    .withMessage("ID sản phẩm không hợp lệ"),

  body("quantity")
    .notEmpty()
    .withMessage("Vui lòng cung cấp số lượng")
    .isInt({ min: 1, max: 99 })
    .withMessage("Số lượng phải là số nguyên từ 1-99"),
];

/**
 * Validator cho xóa sản phẩm khỏi giỏ hàng
 */
const validateRemoveFromCart = [
  param("itemId")
    .notEmpty()
    .withMessage("Vui lòng cung cấp ID sản phẩm trong giỏ hàng")
    .custom(isValidObjectId)
    .withMessage("ID sản phẩm không hợp lệ"),
];

/**
 * Validator cho chọn/bỏ chọn sản phẩm
 */
const validateToggleSelectItems = [
  body("itemIds")
    .isArray({ min: 1 })
    .withMessage("Danh sách sản phẩm phải là mảng và có ít nhất một phần tử"),

  body("itemIds.*")
    .custom(isValidObjectId)
    .withMessage("ID sản phẩm không hợp lệ"),

  body("selected")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái chọn phải là boolean"),
];

/**
 * Validator cho xem trước kết quả tính toán đơn hàng trước khi tạo đơn hàng
 */
const validatePreviewBeforeOrder = [
  body("couponCode")
    .optional()
    .isString()
    .withMessage("Mã giảm giá phải là chuỗi")
    .isLength({ min: 3, max: 20 })
    .withMessage("Mã giảm giá phải có độ dài từ 3-20 ký tự"),
];

module.exports = {
  validateAddToCart,
  validateUpdateCartItem,
  validateRemoveFromCart,
  validateToggleSelectItems,
  validatePreviewBeforeOrder,
};
