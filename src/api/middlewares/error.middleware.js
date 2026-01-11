const ApiError = require("@utils/ApiError");

/**
 * Middleware xử lý lỗi chung
 * @param {Error|ApiError} err - Đối tượng lỗi
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Ưu tiên lấy status code từ đối tượng lỗi
  let statusCode = err.statusCode || 500;
  if (res.statusCode === 200) {
    statusCode = err.statusCode || 500;
  }

  // Log lỗi trong môi trường dev
  if (process.env.NODE_ENV === "development") {
    console.error("Error stack:", err.stack);
  }

  // FIX Issue #7: Chuẩn hóa phản hồi lỗi - chỉ expose stack trong development
  const response = {
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ",
    ...(err.errors && { errors: err.errors }),
    // Chỉ expose stack trace trong môi trường development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
