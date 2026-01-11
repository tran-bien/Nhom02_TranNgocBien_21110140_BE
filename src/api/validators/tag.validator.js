const { body, param, query } = require("express-validator");
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

// Validation chung cho cả admin và public
const commonValidators = {
  /**
   * Validator cho ID tag
   */
  validateTagId: [
    param("id").custom(isValidObjectId).withMessage("ID tag không hợp lệ"),
  ],

  /**
   * Validator cho type tag
   */
  validateTagType: [
    param("type")
      .notEmpty()
      .withMessage("Type không được để trống")
      .isIn(["MATERIAL", "USECASE", "CUSTOM"])
      .withMessage("Type phải là MATERIAL, USECASE hoặc CUSTOM")
      .toUpperCase(),
  ],
};

// Validation chỉ dành cho admin
const adminValidators = {
  /**
   * Validator cho tạo/cập nhật tag (Admin)
   */
  validateTagData: [
    body("name")
      .notEmpty()
      .withMessage("Tên tag là bắt buộc")
      .isLength({ min: 1, max: 100 })
      .withMessage("Tên tag phải từ 1-100 ký tự")
      .trim(),

    body("type")
      .optional()
      .isIn(["MATERIAL", "USECASE", "CUSTOM"])
      .withMessage("Type phải là MATERIAL, USECASE hoặc CUSTOM")
      .toUpperCase(),

    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Mô tả không được vượt quá 500 ký tự")
      .trim(),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái hoạt động phải là true hoặc false"),
  ],

  /**
   * Validator cho các tham số truy vấn admin (bao gồm isActive)
   */
  validateTagQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương")
      .toInt(),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Số lượng mỗi trang phải từ 1-100")
      .toInt(),

    query("sort")
      .optional()
      .isIn([
        "created_at_asc",
        "created_at_desc",
        "name_asc",
        "name_desc",
        "type_asc",
        "type_desc",
      ])
      .withMessage("Sort không hợp lệ"),

    query("name")
      .optional()
      .isString()
      .withMessage("Tên tìm kiếm phải là chuỗi")
      .trim(),

    query("type")
      .optional({ values: "falsy" })
      .isIn(["MATERIAL", "USECASE", "CUSTOM"])
      .withMessage("Type phải là MATERIAL, USECASE hoặc CUSTOM")
      .toUpperCase(),

    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái phải là true hoặc false")
      .toBoolean(),
  ],

  /**
   * Validator cho cập nhật trạng thái
   */
  validateStatusUpdate: [
    param("id").custom(isValidObjectId).withMessage("ID tag không hợp lệ"),

    body("isActive")
      .exists()
      .withMessage("Thiếu thông tin trạng thái")
      .isBoolean()
      .withMessage("Trạng thái phải là true hoặc false"),
  ],
};

module.exports = {
  ...commonValidators,
  ...adminValidators,
};
