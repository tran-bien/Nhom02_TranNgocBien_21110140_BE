const { query, param } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("@utils/ApiError");

const loyaltyValidator = {
  // Validate get transactions query
  validateTransactionsQuery: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải là số nguyên từ 1-100"),

    query("type")
      .optional()
      .isIn(["EARN", "REDEEM", "EXPIRE", "ADJUST"])
      .withMessage("Loại giao dịch không hợp lệ"),

    query("source")
      .optional()
      .isIn(["ORDER", "MANUAL"])
      .withMessage("Nguồn giao dịch không hợp lệ"),

    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Ngày bắt đầu phải là định dạng ISO8601"),

    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("Ngày kết thúc phải là định dạng ISO8601"),
  ],

  // Validate userId param
  validateUserId: [
    param("userId")
      .notEmpty()
      .withMessage("ID người dùng không được để trống")
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new ApiError(400, "ID người dùng không hợp lệ");
        }
        return true;
      }),
  ],
};

module.exports = loyaltyValidator;
