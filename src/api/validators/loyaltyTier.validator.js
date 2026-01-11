const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const loyaltyTierValidator = {
  /**
   * Validator cho API lấy danh sách loyalty tiers
   */
  validateGetTiers: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive phải là boolean"),
  ],

  /**
   * Validator cho API lấy chi tiết tier
   */
  validateTierId: [
    param("id")
      .notEmpty()
      .withMessage("ID tier không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID tier không hợp lệ");
        }
        return true;
      }),
  ],

  /**
   * Validator cho API tạo loyalty tier
   */
  validateCreateTier: [
    body("name")
      .notEmpty()
      .withMessage("Tên tier không được để trống")
      .isString()
      .withMessage("Tên tier phải là chuỗi")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tên tier phải từ 2-50 ký tự"),

    // FIXED: Thay đổi từ minPoints sang minSpending
    body("minSpending")
      .notEmpty()
      .withMessage("Doanh số tối thiểu không được để trống")
      .isInt({ min: 0 })
      .withMessage("Doanh số tối thiểu phải là số nguyên không âm"),

    body("maxSpending")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Doanh số tối đa phải là số nguyên không âm")
      .custom((value, { req }) => {
        if (value && req.body.minSpending && value <= req.body.minSpending) {
          throw new ApiError(
            400,
            "Doanh số tối đa phải lớn hơn doanh số tối thiểu"
          );
        }
        return true;
      }),

    body("benefits.pointsMultiplier")
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage("Hệ số nhân điểm phải từ 1-5"),

    body("benefits.prioritySupport")
      .optional()
      .isBoolean()
      .withMessage("prioritySupport phải là boolean"),

    body("displayOrder")
      .notEmpty()
      .withMessage("Thứ tự hiển thị không được để trống")
      .isInt({ min: 0 })
      .withMessage("Thứ tự hiển thị phải là số nguyên không âm"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive phải là boolean"),
  ],

  /**
   * Validator cho API cập nhật loyalty tier
   */
  validateUpdateTier: [
    param("id")
      .notEmpty()
      .withMessage("ID tier không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID tier không hợp lệ");
        }
        return true;
      }),

    body("name")
      .optional()
      .isString()
      .withMessage("Tên tier phải là chuỗi")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tên tier phải từ 2-50 ký tự"),

    // FIXED: Cho phép cập nhật minSpending/maxSpending
    body("minSpending")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Doanh số tối thiểu phải là số nguyên không âm"),

    body("maxSpending")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Doanh số tối đa phải là số nguyên không âm"),

    body("benefits.pointsMultiplier")
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage("Hệ số nhân điểm phải từ 1-5"),

    body("benefits.prioritySupport")
      .optional()
      .isBoolean()
      .withMessage("prioritySupport phải là boolean"),

    body("displayOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Thứ tự hiển thị phải là số nguyên không âm"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive phải là boolean"),
  ],
};

module.exports = loyaltyTierValidator;
