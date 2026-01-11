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

// Validation chung cho Banner
const commonValidators = {
  /**
   * Validator cho ID banner
   */
  validateBannerId: [
    param("id").custom(isValidObjectId).withMessage("ID banner không hợp lệ"),
  ],

  /**
   * Validator cho title banner
   */
  validateTitle: body("title")
    .notEmpty()
    .withMessage("Vui lòng nhập tiêu đề banner")
    .isString()
    .withMessage("Tiêu đề banner phải là văn bản")
    .isLength({ min: 2, max: 1000 })
    .withMessage("Tiêu đề banner phải có từ 2-1000 ký tự")
    .trim(),

  /**
   * Validator cho displayOrder
   */
  validateDisplayOrder: body("displayOrder")
    .notEmpty()
    .withMessage("Vui lòng chọn vị trí hiển thị")
    .isInt({ min: 1 })
    .withMessage("Vị trí hiển thị phải > 0")
    .toInt(),

  /**
   * Validator cho link (optional)
   */
  validateLink: body("link")
    .optional()
    .isString()
    .withMessage("Đường dẫn phải là văn bản")
    .isLength({ max: 1000 })
    .withMessage("Đường dẫn không được quá 1000 ký tự")
    .trim(),

  /**
   * Validator cho isActive
   */
  validateIsActive: body("isActive")
    .optional()
    .isBoolean()
    .withMessage("Trạng thái kích hoạt phải là đúng hoặc sai")
    .toBoolean(),
};

// Validation cho các operations cụ thể
const bannerValidator = {
  /**
   * Validation khi tạo banner mới
   */
  validateCreateBanner: [
    commonValidators.validateTitle,
    commonValidators.validateDisplayOrder,
    commonValidators.validateLink,
    commonValidators.validateIsActive,
  ],

  /**
   * Validation khi cập nhật banner
   */
  validateUpdateBanner: [
    // Tất cả fields đều optional khi update
    body("title")
      .optional()
      .isString()
      .withMessage("Tiêu đề banner phải là văn bản")
      .isLength({ min: 2, max: 200 })
      .withMessage("Tiêu đề banner phải có từ 2-200 ký tự")
      .trim(),

    body("displayOrder")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Vị trí hiển thị phải lớn hơn 0")
      .toInt(),

    commonValidators.validateLink,
    commonValidators.validateIsActive,
  ],

  /**
   * Validation cho ID banner
   */
  validateBannerId: commonValidators.validateBannerId,

  /**
   * Validation cho query parameters
   */
  validateQueryParams: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Số trang phải là số nguyên dương")
      .toInt(),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải từ 1 đến 100")
      .toInt(),

    query("search")
      .optional()
      .isString()
      .withMessage("Từ khóa tìm kiếm phải là văn bản")
      .isLength({ max: 100 })
      .withMessage("Từ khóa tìm kiếm không được quá 100 ký tự")
      .trim(),

    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái kích hoạt phải là đúng hoặc sai")
      .toBoolean(),

    query("includeDeleted")
      .optional()
      .isBoolean()
      .withMessage("Tùy chọn bao gồm đã xóa phải là đúng hoặc sai")
      .toBoolean(),

    query("sort")
      .optional()
      .isString()
      .withMessage("Tùy chọn sắp xếp phải là văn bản")
      .isIn([
        "created_at_asc",
        "created_at_desc",
        "title_asc",
        "title_desc",
        "display_order_asc",
        "display_order_desc",
      ])
      .withMessage(
        "Tùy chọn sắp xếp không hợp lệ. Chọn: created_at_asc, created_at_desc, title_asc, title_desc, display_order_asc, display_order_desc"
      ),
  ],
};

module.exports = bannerValidator;
