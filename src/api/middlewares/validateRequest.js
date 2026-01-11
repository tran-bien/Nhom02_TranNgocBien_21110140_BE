const { validationResult } = require("express-validator");
const ApiError = require("@utils/ApiError");

/**
 * Middleware kiểm tra kết quả validation từ express-validator
 * Nếu có lỗi, sẽ ném ApiError để được xử lý bởi middleware errorHandler
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array();
    throw new ApiError(400, errorMessages[0].msg, errorMessages);
  }
  next();
};

module.exports = validateRequest;
