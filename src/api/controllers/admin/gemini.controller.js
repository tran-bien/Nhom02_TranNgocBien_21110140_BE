const asyncHandler = require("express-async-handler");
const GeminiService = require("@services/gemini.service");

const geminiController = {
  /**
   * @route POST /api/v1/admin/gemini/demo-mode
   * @desc Toggle Demo Mode (Admin only)
   */
  toggleDemoMode: asyncHandler(async (req, res) => {
    const { enabled } = req.body;

    GeminiService.setDemoMode(enabled);
    const status = GeminiService.getDemoMode();

    return res.json({
      success: true,
      data: status,
      message: `Demo Mode đã ${enabled ? "BẬT" : "TẮT"}`,
      warning: enabled
        ? "CẢNH BÁO: AI có thể trả lời SAI khi không có KB. Chỉ dùng để demo!"
        : "Production mode: AI từ chối trả lời khi không có KB",
    });
  }),

  /**
   * @route GET /api/v1/admin/gemini/demo-mode
   * @desc Get Demo Mode status (Admin only)
   */
  getDemoMode: asyncHandler(async (req, res) => {
    const status = GeminiService.getDemoMode();

    return res.json({
      success: true,
      data: status,
    });
  }),
};

module.exports = geminiController;
