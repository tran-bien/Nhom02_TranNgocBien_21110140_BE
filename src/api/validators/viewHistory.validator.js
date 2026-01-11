const { body, query } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const viewHistoryValidator = {
  // Validate track view body
  validateTrackView: [
    body("productId")
      .notEmpty()
      .withMessage("ID sản phẩm không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID sản phẩm không hợp lệ");
        }
        return true;
      }),

    body("variantId")
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID biến thể không hợp lệ");
        }
        return true;
      }),

    body("viewDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Thời gian xem phải là số nguyên không âm"),

    body("source")
      .optional()
      .isIn(["SEARCH", "CATEGORY", "RELATED", "DIRECT", "RECOMMENDATION"])
      .withMessage("Nguồn truy cập không hợp lệ"),

    body("sessionId")
      .optional()
      .isString()
      .withMessage("Session ID phải là chuỗi")
      .isLength({ max: 100 })
      .withMessage("Session ID không được vượt quá 100 ký tự"),
  ],

  // Validate get history query
  validateHistoryQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("source")
      .optional()
      .isIn(["SEARCH", "CATEGORY", "RELATED", "DIRECT", "RECOMMENDATION"])
      .withMessage("Nguồn truy cập không hợp lệ"),
  ],
};

module.exports = viewHistoryValidator;

