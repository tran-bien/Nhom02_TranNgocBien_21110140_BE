const express = require("express");
const router = express.Router();
const chatController = require("@controllers/user/chat.controller");
const { protect } = require("@middlewares/auth.middleware");
const validateRequest = require("@middlewares/validateRequest");
const {
  validateGetConversations,
  validateCreateConversation,
  validateGetMessages,
  validateSendMessage,
  validateMarkAsRead,
  validateCloseConversation,
} = require("@validators/chat.validator");

/**
 * Tất cả routes cần authentication
 */
router.use(protect);

/**
 * @route   GET /api/v1/user/chat/users
 * @desc    Lấy danh sách users có thể chat (cho admin/staff)
 * @access  Private (Admin/Staff)
 */
router.get("/users", chatController.getAvailableUsers);

/**
 * @route   GET /api/v1/user/chat/conversations
 * @desc    Lấy danh sách conversations của user
 * @access  Private (User/Staff/Admin/Shipper)
 */
router.get(
  "/conversations",
  validateGetConversations,
  validateRequest,
  chatController.getConversations
);

/**
 * @route   POST /api/v1/user/chat/conversations
 * @desc    Tạo conversation mới với staff/admin
 * @access  Private (User/Shipper)
 */
router.post(
  "/conversations",
  validateCreateConversation,
  validateRequest,
  chatController.createConversation
);

/**
 * @route   GET /api/v1/user/chat/conversations/:conversationId/messages
 * @desc    Lấy tin nhắn trong conversation
 * @access  Private (Participant only)
 */
router.get(
  "/conversations/:conversationId/messages",
  validateGetMessages,
  validateRequest,
  chatController.getMessages
);

/**
 * @route   POST /api/v1/user/chat/conversations/:conversationId/messages
 * @desc    Gửi tin nhắn (HTTP fallback nếu Socket.IO không dùng được)
 * @access  Private (Participant only)
 */
router.post(
  "/conversations/:conversationId/messages",
  validateSendMessage,
  validateRequest,
  chatController.sendMessage
);

/**
 * @route   PUT /api/v1/user/chat/conversations/:conversationId/read
 * @desc    Đánh dấu đã đọc
 * @access  Private (Participant only)
 */
router.put(
  "/conversations/:conversationId/read",
  validateMarkAsRead,
  validateRequest,
  chatController.markAsRead
);

/**
 * @route   PUT /api/v1/user/chat/conversations/:conversationId/close
 * @desc    Đóng conversation
 * @access  Private (Participant only)
 */
router.put(
  "/conversations/:conversationId/close",
  validateCloseConversation,
  validateRequest,
  chatController.closeConversation
);

/**
 * @route   PUT /api/v1/user/chat/conversations/:conversationId/reopen
 * @desc    Mở lại conversation đã đóng
 * @access  Private (Participant only)
 */
router.put(
  "/conversations/:conversationId/reopen",
  chatController.reopenConversation
);

module.exports = router;
