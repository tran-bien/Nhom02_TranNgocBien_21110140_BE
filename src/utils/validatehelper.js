const validateRequest = require("@middlewares/validateRequest");

/**
 * Gom nhóm validators + validateRequest để code ngắn gọn
 * @param {Array|Object} validators - Một validator đơn lẻ hoặc mảng validators
 * @returns {Array} - Mảng middleware bao gồm validators và validateRequest
 */
const validate = (validators) => [
  ...(Array.isArray(validators) ? validators : [validators]),
  validateRequest,
];

module.exports = validate;
