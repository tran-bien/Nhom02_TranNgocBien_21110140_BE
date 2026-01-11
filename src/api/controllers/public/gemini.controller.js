const asyncHandler = require("express-async-handler");
const GeminiService = require("@services/gemini.service");

const geminiController = {
  /**
   * @route POST /api/v1/public/ai-chat
   * @desc Chat với Gemini AI (Public)
   * @note Rate limiting được xử lý bởi middleware trong routes
   *
   * LOGIC:
   * - trained=false: AI chưa được train, trả lời bất cứ gì
   * - trained=true: AI đã được train, chỉ trả lời trong phạm vi KB
   */
  chatWithAI: asyncHandler(async (req, res) => {
    const { message, sessionId: clientSessionId, history = [] } = req.body;
    const clientIp = req.ip;

    // Service xử lý toàn bộ logic: session validation, chat, response
    const result = await GeminiService.chatWithValidation(message, {
      clientSessionId,
      clientIp,
      history: history.slice(-10), // Chỉ lấy 10 tin nhắn gần nhất
    });

    return res.json({
      success: !result.error,
      data: {
        response: result.response,
        sessionId: result.sessionId,
        // Training status
        trained: result.trained || false, // AI đã được train chưa
        hasContext: result.hasContext || false, // Có tìm thấy context từ KB không
        // Error flags
        outOfScope: result.outOfScope || false, // Câu hỏi ngoài phạm vi (chỉ khi trained=true)
        noContext: result.noContext || false, // Không tìm thấy context liên quan
        cached: result.cached || false,
        rateLimited: result.rateLimited || false,
        quotaExhausted: result.quotaExhausted || false,
      },
    });
  }),

  /**
   * @route GET /api/v1/public/ai-chat/status
   * @desc Lấy trạng thái training của AI
   */
  getTrainingStatus: asyncHandler(async (req, res) => {
    const status = await GeminiService.getTrainingStatus();

    return res.json({
      success: true,
      data: status,
    });
  }),
};

module.exports = geminiController;
