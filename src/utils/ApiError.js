/**
 * Lớp ApiError đại diện cho lỗi API
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Tạo một đối tượng ApiError mới
   * @param {number} statusCode - Mã trạng thái HTTP (mặc định: 500)
   * @param {string} message - Thông báo lỗi
   * @param {Object|Array} errors - Danh sách lỗi chi tiết (mặc định: null)
   * @param {boolean} isOperational - Đánh dấu lỗi là có thể dự đoán được (mặc định: true)
   * @param {string} stack - Stack trace (mặc định: '')
   */
  constructor(
    statusCode = 500,
    message,
    errors = null,
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    // Nếu stack không được cung cấp, sẽ tự động lấy stack trace
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
