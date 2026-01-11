const { body, param, query } = require("express-validator");
const ApiError = require("@utils/ApiError");

const sizeValidator = {
  validateSizeId: [
    param("id").isMongoId().withMessage("ID kích thước không hợp lệ"),
  ],

  validateCreateSize: [
    body("value")
      .notEmpty()
      .withMessage("Giá trị kích thước là bắt buộc")
      .isNumeric()
      .withMessage("Giá trị kích thước phải là số")
      .custom((value) => {
        if (parseFloat(value) <= 0) {
          throw new ApiError(400, "Giá trị kích thước phải lớn hơn 0");
        }
        return true;
      }),

    body("type")
      .notEmpty()
      .withMessage("Loại kích thước là bắt buộc")
      .isString()
      .withMessage("Loại kích thước phải là chuỗi")
      .toUpperCase()
      .isIn(["EU", "US", "UK", "VN"])
      .withMessage("Loại kích thước phải là: EU, US, UK, VN"),

    body("description")
      .notEmpty()
      .withMessage("Mô tả kích thước là bắt buộc")
      .isString()
      .withMessage("Mô tả kích thước phải là chuỗi")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Mô tả kích thước phải từ 1 đến 100 ký tự"),
  ],

  validateUpdateSize: [
    param("id").isMongoId().withMessage("ID kích thước không hợp lệ"),

    body("value")
      .optional()
      .isNumeric()
      .withMessage("Giá trị kích thước phải là số")
      .custom((value) => {
        if (parseFloat(value) <= 0) {
          throw new ApiError(400, "Giá trị kích thước phải lớn hơn 0");
        }
        return true;
      }),

    body("type")
      .optional()
      .isString()
      .withMessage("Loại kích thước phải là chuỗi")
      .toUpperCase()
      .isIn(["EU", "US", "UK", "VN"])
      .withMessage("Loại kích thước phải là: EU, US, UK, VN"),

    body("description")
      .optional()
      .isString()
      .withMessage("Mô tả kích thước phải là chuỗi")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Mô tả kích thước phải từ 1 đến 100 ký tự"),
  ],

  validateListQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Số trang phải là số nguyên dương")
      .toInt(),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Số lượng hiển thị phải từ 1 đến 100")
      .toInt(),

    query("value")
      .optional()
      .isNumeric()
      .withMessage("Giá trị kích thước tìm kiếm phải là số"),

    query("type")
      .optional()
      .isString()
      .withMessage("Loại kích thước phải là chuỗi")
      .toUpperCase()
      .isIn(["EU", "US", "UK", "VN"])
      .withMessage("Loại kích thước phải là: EU, US, UK, VN"),

    query("sort")
      .optional()
      .isIn([
        "created_at_asc",
        "created_at_desc",
        "value_asc",
        "value_desc",
        "type_asc",
        "type_desc",
      ])
      .withMessage("Tham số sắp xếp không hợp lệ"),
  ],
};

module.exports = sizeValidator;
