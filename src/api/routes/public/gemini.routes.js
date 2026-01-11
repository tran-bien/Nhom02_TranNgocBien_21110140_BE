const express = require("express");
const router = express.Router();
const geminiController = require("@controllers/public/gemini.controller");
const validateRequest = require("@middlewares/validateRequest");
const { optionalAuth } = require("@middlewares/auth.middleware");
const { rateLimitMiddleware } = require("@utils/rateLimiter");
const { validateChatWithAI } = require("@validators/gemini.validator");

/**
 * @route   GET /api/v1/public/ai-chat/status
 * @desc    Lấy trạng thái training của AI (trained hay chưa)
 * @access  Public
 */
router.get("/ai-chat/status", geminiController.getTrainingStatus);

/**
 * @route   POST /api/v1/public/ai-chat
 * @desc    Chat với Gemini AI (Public)
 * @access  Public
 *
 * LOGIC:
 * - trained=false: AI chưa được train, trả lời bất cứ gì (demo mode)
 * - trained=true: AI đã được train, chỉ trả lời trong phạm vi KB
 */
router.post(
  "/ai-chat",
  optionalAuth,
  rateLimitMiddleware(10, 60000), // 10 requests per minute
  validateChatWithAI,
  validateRequest,
  geminiController.chatWithAI
);

module.exports = router;
