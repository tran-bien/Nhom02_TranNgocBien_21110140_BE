const { body, param, query } = require("express-validator");

/**
 * Validator cho API chat với AI (Public)
 */
const validateChatWithAI = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Tin nhắn không được để trống")
    .isLength({ max: 500 })
    .withMessage("Tin nhắn không được quá 500 ký tự"),

  body("sessionId")
    .optional()
    .isString()
    .withMessage("Session ID phải là chuỗi"),

  body("history")
    .optional()
    .isArray()
    .withMessage("History phải là mảng")
    .custom((value) => {
      if (value.length > 20) {
        throw new Error("History không được quá 20 tin nhắn");
      }
      // Validate each history item has required fields
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (!item || typeof item !== "object") {
          throw new Error(`History item ${i + 1} phải là object`);
        }
        if (!item.role || !["user", "model", "assistant"].includes(item.role)) {
          throw new Error(
            `History item ${
              i + 1
            }: role phải là 'user', 'model' hoặc 'assistant'`
          );
        }
        if (!item.text || typeof item.text !== "string") {
          throw new Error(
            `History item ${i + 1}: text là bắt buộc và phải là chuỗi`
          );
        }
        if (item.text.length > 2000) {
          throw new Error(
            `History item ${i + 1}: text không được quá 2000 ký tự`
          );
        }
      }
      return true;
    }),
];

/**
 * Validator cho API toggle demo mode (Admin)
 */
const validateToggleDemoMode = [
  body("enabled")
    .notEmpty()
    .withMessage("enabled không được để trống")
    .isBoolean()
    .withMessage("enabled phải là boolean (true/false)"),
];

module.exports = {
  validateChatWithAI,
  validateToggleDemoMode,
};
