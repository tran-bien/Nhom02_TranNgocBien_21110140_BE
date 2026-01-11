const { body, param, query } = require("express-validator");

/**
 * Validator cho lấy danh sách conversations
 */
const validateGetConversations = [
  query("status")
    .optional()
    .isIn(["active", "closed"])
    .withMessage("Status phải là 'active' hoặc 'closed'"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit phải từ 1-50"),
];

/**
 * Validator cho tạo conversation
 */
const validateCreateConversation = [
  body("targetUserId")
    .optional()
    .isMongoId()
    .withMessage("Target User ID không hợp lệ"),

  body("orderId").optional().isMongoId().withMessage("Order ID không hợp lệ"),

  body("message")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Tin nhắn đầu tiên không được quá 2000 ký tự"),
];

/**
 * Validator cho lấy tin nhắn
 */
const validateGetMessages = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation ID không hợp lệ"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page phải là số nguyên dương"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit phải từ 1-100"),
];

/**
 * Validator cho gửi tin nhắn
 * FIX: Validate text required khi type="text"
 */
const validateSendMessage = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation ID không hợp lệ"),

  body("type")
    .isIn(["text", "image"])
    .withMessage("Type phải là 'text' hoặc 'image'"),

  body("text")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Text không được quá 2000 ký tự")
    .custom((value, { req }) => {
      // FIX: text bắt buộc khi type="text"
      if (req.body.type === "text" && (!value || value.trim().length === 0)) {
        throw new Error("Text là bắt buộc khi type là 'text'");
      }
      return true;
    }),

  body("images")
    .optional()
    .isArray()
    .withMessage("Images phải là mảng")
    .custom((value, { req }) => {
      if (value.length > 5) {
        throw new Error("Không được gửi quá 5 ảnh");
      }
      // FIX: images bắt buộc khi type="image"
      if (req.body.type === "image" && (!value || value.length === 0)) {
        throw new Error("Images là bắt buộc khi type là 'image'");
      }
      return true;
    }),
];

/**
 * Validator cho đánh dấu đã đọc
 */
const validateMarkAsRead = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation ID không hợp lệ"),
];

/**
 * Validator cho đóng conversation
 */
const validateCloseConversation = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation ID không hợp lệ"),
];

module.exports = {
  validateGetConversations,
  validateCreateConversation,
  validateGetMessages,
  validateSendMessage,
  validateMarkAsRead,
  validateCloseConversation,
};
